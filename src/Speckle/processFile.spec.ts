import { parseFileObjects } from './processFile'
import * as fs from 'node:fs'

export { expect, test, suite } from 'vitest'

test('parseFileObjects', async () => {
  const file = fs.readFileSync(`${__dirname}/dandas.xml`, { encoding: 'latin1' }).toString()
  const geometry = await parseFileObjects({ content: file })
  expect(geometry).toBeTruthy()
  geometry['@elements'].forEach((node) => {
    expect(node.id).toBeTruthy()
    expect(node['displayValue'][0].id).toBeTruthy()
  })
})
