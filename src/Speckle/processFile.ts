import X2JS from 'x2js'
import { CylinderGeometry } from 'three'
import { Mesh } from './interfaces.ts'
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid'
import {ServerTransport} from "./serverTransport.ts";
import {BaseObjectSerializer} from "./baseObjectSerializer.ts";

interface ProcessFileProps {
  file: File
  token: string
  streamId: string
  branchName: string
  message: string | null
}

export const processFile = async ({ file, token, streamId, branchName, message }: ProcessFileProps) => {
  const geometry = await parseFileObjects({ content: await file.text() })
  const serverTransport = new ServerTransport(import.meta.env.VITE_SPECKLE_SERVER_URL, token, streamId)
  const serializer = new BaseObjectSerializer([serverTransport])
  const serialized = await serializer.SerializeBase(geometry)

  await serverTransport.CreateCommit(branchName, serialized.id, message)
}

interface DandasNode {
  _Knudenavn: string
  KnudeKode: string
  FormKode: string
  DiameterBredde: number
  Terraenkote: number
  Bundkote: number
  XKoordinat: number
  YKoordinat: number
}

export const parseFileObjects = async ({ content }: { content: string }) => {
  const x2js = new X2JS()
  // @ts-expect-error - x2js types are incorrect
  const nodes: DandasNode[] = x2js.xml2js(content).KnudeGroup.Knude
  return {
    speckle_type: 'Speckle.Core.Models.Collection',
    name: 'Dandas Nodes',
    id: uuidv4(),
    collectionType: 'Dandas Nodes',
    '@elements': nodes
      .filter((node) => ['1', '4', '7'].indexOf(node.KnudeKode) >= 0 && node.FormKode === '1')
      .map((node) => ({
        ...node,
        name: node._Knudenavn,
        id: uuidv5(node._Knudenavn, uuidv5.URL),
        parameters: generateParameters(node),
        speckle_type: 'Objects.BuiltElements.DandasNode',
        displayValue: [generateGeometry(node)],
      })),
  }
}

const generateParameters = (node: DandasNode) => {
  const radius = node.DiameterBredde / 2 / 1000
  const height = node.Terraenkote - node.Bundkote
  const speckle_type = 'Objects.BuiltElements.DandasNode.Parameters'
  return {
    id: uuidv4(),
    speckle_type: 'Base',
    area: {
      name: 'Area',
      id: uuidv4(),
      speckle_type,
      value: Math.PI * radius * radius,
      units: 'm2',
    },
    volume: {
      volume: 'Volume',
      id: uuidv4(),
      speckle_type,
      value: Math.PI * radius * radius * height,
      units: 'm3',
    },
    height: {
      name: 'Height',
      id: uuidv4(),
      speckle_type,
      value: height,
      units: 'm',
    },
    radius: {
      name: 'Radius',
      id: uuidv4(),
      speckle_type,
      value: radius,
      units: 'm',
    },
  }
}

const generateGeometry = (node: DandasNode): Mesh => {
  const radius = node.DiameterBredde / 2 / 1000
  const height = node.Terraenkote - node.Bundkote

  const cylinder = new CylinderGeometry(radius, radius, height, 24)
  cylinder.rotateX(Math.PI / 2)
  cylinder.translate(Number(node.XKoordinat), Number(node.YKoordinat), Number(node.Terraenkote))
  const vertices = Array.from(cylinder.attributes.position.array)
  const indices = cylinder.index?.array as unknown as number[]
  const faces = []
  for (let k = 0; k < indices.length; k += 3) {
    faces.push(3)
    faces.push(indices[k], indices[k + 1], indices[k + 2])
  }
  return {
    id: uuidv4(),
    vertices: vertices,
    faces: faces,
    units: 'M',
    speckle_type: 'Objects.Geometry.Mesh',
  }
}
