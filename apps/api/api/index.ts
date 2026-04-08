import type { VercelRequest, VercelResponse } from '@vercel/node'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { adminConfigRoutes } from '../src/routes/admin/config.js'
import { adminGoogleRoutes } from '../src/routes/admin/google.js'
import { adminEventTypeRoutes } from '../src/routes/admin/event-types.js'
import { adminFormFieldRoutes } from '../src/routes/admin/form-fields.js'
import { adminBookingRoutes } from '../src/routes/admin/bookings.js'
import { publicEventRoutes } from '../src/routes/public/events.js'
import { publicBookingRoutes } from '../src/routes/public/bookings.js'

let app: ReturnType<typeof Fastify> | null = null

async function getApp() {
  if (app) return app

  app = Fastify({ logger: false })
  await app.register(cors, { origin: true, credentials: true })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(adminConfigRoutes)
  await app.register(adminGoogleRoutes)
  await app.register(adminEventTypeRoutes)
  await app.register(adminFormFieldRoutes)
  await app.register(adminBookingRoutes)
  await app.register(publicEventRoutes)
  await app.register(publicBookingRoutes)

  await app.ready()
  return app
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const fastify = await getApp()

    const response = await fastify.inject({
      method: req.method as any,
      url: req.url,
      headers: req.headers as any,
      payload: req.body ? JSON.stringify(req.body) : undefined,
    })

    res.status(response.statusCode)

    const headers = response.headers
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) res.setHeader(key, String(value))
    }

    res.send(response.payload)
  } catch (err: any) {
    console.error('Handler error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
