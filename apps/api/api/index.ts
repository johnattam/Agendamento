import { buildServer } from '../src/index.js'

let app: any = null

export default async function (req: any, res: any) {
  if (!app) {
    app = await buildServer()
    await app.ready()
  }
  app.server.emit('request', req, res)
}
