import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminFormFieldRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get<{ Params: { id: string } }>(
    '/admin/event-types/:id/fields',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('event_type_id', req.params.id)
        .order('display_order')
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/admin/event-types/:id/fields',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('form_fields')
        .insert({ ...req.body, event_type_id: req.params.id })
        .select()
        .single()
      if (error) return reply.status(500).send({ error: error.message })
      return reply.status(201).send(data)
    }
  )

  app.put<{ Params: { fieldId: string }; Body: Record<string, unknown> }>(
    '/admin/fields/:fieldId',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('form_fields')
        .update(req.body)
        .eq('id', req.params.fieldId)
        .select()
        .single()
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )

  app.delete<{ Params: { fieldId: string } }>(
    '/admin/fields/:fieldId',
    async (req, reply) => {
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', req.params.fieldId)
      if (error) return reply.status(500).send({ error: error.message })
      return reply.status(204).send()
    }
  )
}
