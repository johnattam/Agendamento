import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminEventTypeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/admin/event-types', async (_req, reply) => {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return reply.status(500).send({ error: error.message })
    return data
  })

  app.post<{ Body: Record<string, unknown> }>('/admin/event-types', async (req, reply) => {
    const { data, error } = await supabase
      .from('event_types')
      .insert(req.body)
      .select()
      .single()
    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(201).send(data)
  })

  app.get<{ Params: { id: string } }>('/admin/event-types/:id', async (req, reply) => {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/admin/event-types/:id',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('event_types')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single()
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )

  app.delete<{ Params: { id: string } }>('/admin/event-types/:id', async (req, reply) => {
    const { error } = await supabase
      .from('event_types')
      .delete()
      .eq('id', req.params.id)
    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(204).send()
  })
}
