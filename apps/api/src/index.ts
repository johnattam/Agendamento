import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { adminConfigRoutes } from './routes/admin/config.js'
import { adminGoogleRoutes } from './routes/admin/google.js'
import { adminEventTypeRoutes } from './routes/admin/event-types.js'
import { adminFormFieldRoutes } from './routes/admin/form-fields.js'
import { adminBookingRoutes } from './routes/admin/bookings.js'
import { publicEventRoutes } from './routes/public/events.js'
import { publicBookingRoutes } from './routes/public/bookings.js'

export async function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  await app.register(cors, { origin: true, credentials: true })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(adminConfigRoutes)
  await app.register(adminGoogleRoutes)
  await app.register(adminEventTypeRoutes)
  await app.register(adminFormFieldRoutes)
  await app.register(adminBookingRoutes)
  await app.register(publicEventRoutes)
  await app.register(publicBookingRoutes)

  return app
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildServer()
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' })
}
