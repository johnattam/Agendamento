import { FastifyInstance } from 'fastify'
import { supabase } from '../../db/client.js'
import { generateSlots, filterAvailableSlots } from '../../services/slots.js'
import { listEventsForDay } from '../../services/google-calendar.js'
import type { PublicEventInfo } from '@scheduling/types'

export async function publicEventRoutes(app: FastifyInstance) {
  app.get<{ Params: { slug: string } }>('/events/:slug', async (req, reply) => {
    const { data: event, error } = await supabase
      .from('event_types')
      .select('id, name, slug, description, duration_minutes, timezone, available_weekdays, time_windows, date_start, date_end, max_future_days, partner_name, partner_logo_url')
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single()

    if (error || !event) return reply.status(404).send({ error: 'Event not found' })

    const { data: config } = await supabase
      .from('admin_config')
      .select('company_name, company_logo_url')
      .single()

    const { data: fields } = await supabase
      .from('form_fields')
      .select('*')
      .eq('event_type_id', event.id)
      .order('display_order')

    const response: PublicEventInfo = {
      event,
      company: config ?? { company_name: '', company_logo_url: null },
      fields: fields ?? [],
    }

    return response
  })

  app.get<{ Params: { slug: string }; Querystring: { date: string } }>(
    '/events/:slug/slots',
    async (req, reply) => {
      const { slug } = req.params
      const { date } = req.query

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: 'Invalid date. Use YYYY-MM-DD' })
      }

      const { data: event, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error || !event) return reply.status(404).send({ error: 'Event not found' })

      const requestedDate = new Date(date + 'T12:00:00Z')
      const dayOfWeek = requestedDate.getUTCDay()
      if (!event.available_weekdays.includes(dayOfWeek)) return []

      const todayMidnight = new Date()
      todayMidnight.setUTCHours(0, 0, 0, 0)

      if (requestedDate < todayMidnight) return []
      if (event.date_start && requestedDate < new Date(event.date_start + 'T00:00:00Z')) return []
      if (event.date_end && requestedDate > new Date(event.date_end + 'T00:00:00Z')) return []
      if (event.max_future_days) {
        const maxDate = new Date(todayMidnight)
        maxDate.setUTCDate(maxDate.getUTCDate() + event.max_future_days)
        if (requestedDate > maxDate) return []
      }

      const allSlots = generateSlots(event.time_windows, event.duration_minutes, event.buffer_minutes)

      let busyTimes: { start: string; end: string }[] = []
      try {
        busyTimes = await listEventsForDay(date)
      } catch {
        // Google Calendar not connected — return all slots as available
      }

      return filterAvailableSlots(allSlots, busyTimes, date, event.timezone)
    }
  )
}
