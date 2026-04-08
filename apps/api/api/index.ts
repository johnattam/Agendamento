import { buildServer } from '../src/index.js'

let app: any = null

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildServer()
    await app.ready()
  }

  const response = await app.inject({
    method: req.method,
    url: req.url,
    headers: req.headers,
    payload: req,
  })

  res.status(response.statusCode)

  for (const [key, value] of Object.entries(response.headers)) {
    if (value !== undefined) res.setHeader(key, value)
  }

  res.send(response.payload)
}
