import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminConfigRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/admin/config', async (_req, reply) => {
    const { data, error } = await supabase
      .from('admin_config')
      .select('*')
      .single()
    if (error) return reply.status(500).send({ error: error.message })
    return data
  })

  app.put<{ Body: Record<string, unknown> }>('/admin/config', async (req, reply) => {
    const { data, error } = await supabase
      .from('admin_config')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select()
      .single()
    if (error) return reply.status(500).send({ error: error.message })
    return data
  })
}
