'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import type { Booking, EventType } from '@scheduling/types'

type BookingWithEvent = Booking & { event_types: Pick<EventType, 'name' | 'slug'> }

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithEvent[]>([])

  useEffect(() => { api.get<BookingWithEvent[]>('/admin/bookings').then(setBookings) }, [])

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' }
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 }

  return (
    <div>
      <h1 style={{ marginBottom: 24, color: 'var(--blue)', fontSize: 22 }}>Agendamentos</h1>
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: 12, border: '1.5px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--light)' }}>
              <th style={th}>Data/Hora</th>
              <th style={th}>Evento</th>
              <th style={th}>Nome</th>
              <th style={th}>E-mail</th>
              <th style={th}>WhatsApp</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={td}>{formatDateTime(b.start_at)}</td>
                <td style={td}>{b.event_types?.name ?? '—'}</td>
                <td style={td}>{b.form_data['nome'] ?? b.form_data['name'] ?? '—'}</td>
                <td style={td}>{b.form_data['e-mail'] ?? b.form_data['email'] ?? '—'}</td>
                <td style={td}>{b.form_data['whatsapp'] ?? b.form_data['celular'] ?? '—'}</td>
                <td style={td}>
                  <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: '#E8F5E9', color: '#2E7D51' }}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--muted)', padding: 48 }}>Nenhum agendamento ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
