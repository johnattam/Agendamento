import { FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../db/client.js'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}
