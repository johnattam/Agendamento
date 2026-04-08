import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminBookingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get<{ Querystring: { event_type_id?: string } }>(
    '/admin/bookings',
    async (req, reply) => {
      let query = supabase
        .from('bookings')
        .select('*, event_types(name, slug)')
        .order('start_at', { ascending: false })

      if (req.query.event_type_id) {
        query = query.eq('event_type_id', req.query.event_type_id)
      }

      const { data, error } = await query
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )
}
