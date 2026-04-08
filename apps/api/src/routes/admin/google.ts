import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'
import { config } from '../../config.js'
import { getAuthUrl, exchangeCode, listCalendars } from '../../services/google-calendar.js'

// Public — Google redirects the browser here with no auth header
export async function googleCallbackRoute(app: FastifyInstance) {
  app.get<{ Querystring: { code: string } }>(
    '/admin/google/callback',
    async (req, reply) => {
      const { code } = req.query
      const tokens = await exchangeCode(code)

      await supabase.from('google_integration').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      await supabase.from('google_integration').insert({
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        calendar_id: 'primary',
        calendar_name: 'Primary',
        expires_at: new Date(tokens.expiry_date!).toISOString(),
      })

      return reply.redirect(`${config.WEB_URL}/admin/integration?connected=true`)
    }
  )
}

export async function adminGoogleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/admin/google/auth-url', async () => {
    return { url: getAuthUrl() }
  })

  app.get('/admin/google/calendars', async (_req, reply) => {
    const { data, error } = await supabase
      .from('google_integration')
      .select('access_token, refresh_token')
      .single()
    if (error || !data) return reply.status(404).send({ error: 'Not connected' })

    const calendars = await listCalendars(data.access_token, data.refresh_token)
    return calendars.map((c) => ({ id: c.id, name: c.summary }))
  })

  app.put<{ Body: { calendar_id: string; calendar_name: string } }>(
    '/admin/google/calendar',
    async (req) => {
      const { calendar_id, calendar_name } = req.body
      await supabase
        .from('google_integration')
        .update({ calendar_id, calendar_name })
        .neq('id', '00000000-0000-0000-0000-000000000000')
      return { success: true }
    }
  )

  app.get('/admin/google/status', async () => {
    const { data } = await supabase
      .from('google_integration')
      .select('calendar_name, connected_at')
      .single()
    return {
      connected: !!data,
      calendar_name: data?.calendar_name ?? null,
      connected_at: data?.connected_at ?? null,
    }
  })

  app.delete('/admin/google', async () => {
    await supabase.from('google_integration').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return { success: true }
  })
}
