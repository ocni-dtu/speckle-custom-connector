export interface SpeckleObject extends IBase {
  id: string
}

export interface IBase {
  readonly speckle_type: string
}

export interface ITransport {
  SaveObject(object: Map<string, unknown>): Promise<void>
}

export interface Mesh {
  id: string
  vertices: number[]
  faces: number[]
  colors?: number[] | null
  texture_coords?: number[] | null
  units: 'M'
  speckle_type: 'Objects.Geometry.Mesh'
}
