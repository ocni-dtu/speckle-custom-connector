import { v4 as uuidv4 } from 'uuid'
import md5 from 'md5'

// NOTE: this is a mess - but it works. I didn't clean up anything
class BaseObjectSerializer {
  constructor(defaultChunkSize = 1000) {
    this.defaultChunkSize = defaultChunkSize
    this._resetWriter()
  }

  _resetWriter() {
    this.detachLineage = []
    this.lineage = []
    this.familyTree = {}
    this.closureTable = {}
    this.objects = {}
  }

  writeJson(base) {
    this._resetWriter()
    self.detachLineage = [true]
    let { hash, traversed } = this.traverseBase(base)
    this.objects[hash] = traversed
    let serialized = traversed
    return { hash, serialized }
  }

  traverseBase(base) {
    this.lineage.push(uuidv4())

    let traversed = { id: '', speckle_type: base.speckle_type, totalChildrenCount: 0 }
    for (let prop in base) {
      const val = base[prop]
      // ignore nulls and don't pre-populate the id
      if (val === null || prop.startsWith('_') || prop == 'id') continue
      // don't need to process primitives
      if (typeof val !== 'object') {
        traversed[prop] = val
        continue
      }

      // determine prop is detached or not as flag.
      const isDetach = prop.startsWith('@')

      // 1. chunked arrays
      let chunkedDetachMatch = prop.match(/^@\((\d*)\)/) // chunk syntax
      if (Array.isArray(val) && chunkedDetachMatch) {
        const chunkSize = chunkedDetachMatch[1] !== '' ? parseInt(chunkedDetachMatch[1]) : this.defaultChunkSize
        let chunks = []
        // create data chuck base object
        let chunk = {
          // eslint-disable-next-line camelcase
          speckle_type: 'Speckle.Core.Models.DataChunk',
          data: []
        }
        val.forEach((el, count) => {
          if (count && count % chunkSize == 0) {
            // push chunk to chunks because we will start to fill next chunk
            chunks.push(chunk)
            // Reset the chunk for next elements
            chunk = {
              // eslint-disable-next-line camelcase
              speckle_type: 'Speckle.Core.Models.DataChunk',
              data: []
            }
          }

          chunk.data.push(el)
        })
        // push last chunk to chunks also
        if (chunk.data.length !== 0) chunks.push(chunk)

        let chunkRefs = []
        chunks.forEach((chunk) => {
          this.detachLineage.push(isDetach) // true
          let { hash } = this.traverseBase(chunk)
          chunkRefs.push(this.detachHelper(hash))
        })

        traversed[prop.replace(chunkedDetachMatch[0], '')] = chunkRefs // strip chunk syntax
        continue
      }

      // strip leading '@' for detach (to be removed in the future when we have a way
      // to keep track of detachable props to be consistent with sharp and py)
      // if (detach) prop = prop.substring(1)
      // 2. base object
      if (val.speckle_type) { // for example -> when line have bbox, start, end as speckle objects
        let child = this.traverseValue({ value: val, detach: isDetach })
        traversed[prop] = isDetach ? this.detachHelper(child.id) : child
      } else {
        // 3. anything else (dicts, lists)
        traversed[prop] = this.traverseValue({ value: val, detach: isDetach })
      }
    } // this is where all props are done

    const detached = this.detachLineage.pop()

    // add closures and total children count
    let closure = {}
    const parent = this.lineage.pop()
    if (this.familyTree[parent]) {
      Object.entries(this.familyTree[parent]).forEach(([ref, depth]) => {
        closure[ref] = depth - this.detachLineage.length
      })
    }

    traversed['totalChildrenCount'] = Object.keys(closure).length

    const hash = this.getId(traversed)
    traversed.id = hash

    if (traversed['totalChildrenCount']) {
      traversed['__closure'] = this.closureTable[hash] = closure
    }

    // save obj string if detached
    if (detached) this.objects[hash] = traversed
    return { hash, traversed }
  }

  traverseValue({ value, detach = false }) {
    // 1. primitives
    if (typeof value !== 'object') return value

    // 2. arrays
    if (Array.isArray(value)) {
      if (!detach) return value.map((el) => this.traverseValue({ value: el }))

      let detachedList = []
      value.forEach((el) => {
        if (typeof el === 'object' && el.speckle_type) {
          this.detachLineage.push(detach)
          let { hash } = this.traverseBase(el)
          detachedList.push(this.detachHelper(hash))
        } else {
          detachedList.push(this.traverseValue({ value: el, detach: detach }))
        }
      })
      return detachedList
    }

    // 3. dicts
    if (!value.speckle_type) return value

    // 4. base objects
    if (value.speckle_type) {
      this.detachLineage.push(detach)
      return this.traverseBase(value).traversed
    }

    throw `Unsupported type '${typeof value}': ${value}`
  }

  detachHelper(refHash) {
    this.lineage.forEach((parent) => {
      if (!this.familyTree[parent]) this.familyTree[parent] = {}

      if (!this.familyTree[parent][refHash] || this.familyTree[parent][refHash] > this.detachLineage.length) {
        this.familyTree[parent][refHash] = this.detachLineage.length
      }
    })
    return {
      referencedId: refHash,
      // eslint-disable-next-line camelcase
      speckle_type: 'reference'
    }
  }

  getId(obj) {
    return md5(JSON.stringify(obj))
  }

  batchObjects(maxBatchSizeMb = 1) {
    const maxSize = maxBatchSizeMb * 1000 * 1000
    let batches = []
    let batch = '['
    let batchSize = 0
    let objects = Object.values(this.objects)
    objects.forEach((obj) => {
      let objString = JSON.stringify(obj)
      if (batchSize + objString.length < maxSize) {
        batch += objString + ','
        batchSize += objString.length
      } else {
        batches.push(batch.slice(0, -1) + ']')
        batch = '[' + objString + ','
        batchSize = objString.length
      }
    })
    batches.push(batch.slice(0, -1) + ']')

    return batches
  }
}

export async function serializeAndSend(data, token, projectId) {
  const s = new BaseObjectSerializer()
  const { hash, serialized } = s.writeJson(data)
  const batches = s.batchObjects()
  const totBatches = batches.length
  console.log(`>>> Speckle old school: ${totBatches} batches ready for sending`)
  let batchesSent = 0
  for (const batch of batches) {
    let res = await sendBatch(batch, token, projectId)
    if (res.status !== 201) throw `Upload request failed: ${res.status}`
    batchesSent++
    console.log(`>>> batch ${batchesSent} sent`)
  }
  console.log(`>>> Object id: ${hash}`)
  return hash
}

async function sendBatch(batch, token, projectId) {
  let formData = new FormData()
  formData.append(`batch-1`, new Blob([batch], { type: 'application/json' }))
  let res = await fetch(`${import.meta.env.VITE_SPECKLE_SERVER_URL}/objects/${projectId}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: formData
  })
  return res
}