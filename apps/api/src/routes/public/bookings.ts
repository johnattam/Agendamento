import { FastifyInstance } from 'fastify'
import { supabase } from '../../db/client.js'
import { createCalendarEvent } from '../../services/google-calendar.js'
import { sendBookingConfirmation } from '../../services/email.js'

interface BookingBody {
  event_type_id: string
  date: string        // "YYYY-MM-DD"
  slot_start: string  // "HH:MM"
  slot_end: string    // "HH:MM"
  form_data: Record<string, string>
}

export async function publicBookingRoutes(app: FastifyInstance) {
  app.post<{ Body: BookingBody }>('/bookings', async (req, reply) => {
    const { event_type_id, date, slot_start, slot_end, form_data } = req.body

    const { data: event, error: eventError } = await supabase
      .from('event_types')
      .select('*')
      .eq('id', event_type_id)
      .eq('is_active', true)
      .single()

    if (eventError || !event) return reply.status(404).send({ error: 'Event not found' })

    const { data: cfg } = await supabase
      .from('admin_config')
      .select('company_name')
      .single()

    let googleEventId: string | null = null
    try {
      const attendeeEmail = form_data['e-mail'] ?? form_data['email'] ?? ''
      googleEventId = await createCalendarEvent({
        summary: event.partner_name
          ? `${event.name} — ${event.partner_name}`
          : event.name,
        description: Object.entries(form_data).map(([k, v]) => `${k}: ${v}`).join('\n'),
        startDateTime: `${date}T${slot_start}`,
        endDateTime: `${date}T${slot_end}`,
        timezone: event.timezone,
        attendeeEmail,
      })
    } catch {
      // Google Calendar not connected — continue
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        event_type_id,
        google_event_id: googleEventId,
        start_at: new Date(`${date}T${slot_start}:00`).toISOString(),
        end_at: new Date(`${date}T${slot_end}:00`).toISOString(),
        status: 'confirmed',
        form_data,
      })
      .select()
      .single()

    if (bookingError) return reply.status(500).send({ error: 'Failed to save booking' })

    const attendeeEmail = form_data['e-mail'] ?? form_data['email']
    if (attendeeEmail) {
      sendBookingConfirmation({
        to: attendeeEmail,
        eventName: event.name,
        date,
        time: slot_start,
        companyName: cfg?.company_name ?? '',
      }).catch(() => {})
    }

    return reply.status(201).send(booking)
  })
}
