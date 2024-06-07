import { ITransport } from './interfaces'

export class ServerTransport implements ITransport {
  constructor(
    private serverUrl: string,
    private token: string,
    private streamId: string,
  ) {}

  async SaveObject(map: Map<string, unknown>): Promise<void> {
    const query = `mutation objectCreate ($object: ObjectCreateInput!) {objectCreate(objectInput: $object)}`

    await fetch(`${this.serverUrl}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: {
          object: {
            streamId: this.streamId,
            objects: [Object.fromEntries(map)],
          },
        },
      }),
    })

    // const data = (await response.json()) as any
  }

  async CreateCommit(branchName: string, objectId: string, message: string | null) {
    const query = `mutation commitCreate($myCommit: CommitCreateInput!){ commitCreate(commit: $myCommit)}`

    await fetch(`${this.serverUrl}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        variables: {
          myCommit: {
            streamId: this.streamId,
            branchName: branchName,
            objectId: objectId,
            message: message ? message : 'Data from Dandas',
            sourceApplication: 'Dandas',
          },
        },
      }),
    })

    // const data = (await response.json()) as any
  }
}
