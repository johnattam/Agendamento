'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { EventType } from '@scheduling/types'

export default function EventsPage() {
  const [events, setEvents] = useState<EventType[]>([])
  const router = useRouter()

  useEffect(() => { api.get<EventType[]>('/admin/event-types').then(setEvents) }, [])

  async function toggleActive(event: EventType) {
    await api.put(`/admin/event-types/${event.id}`, { is_active: !event.is_active })
    setEvents((es) => es.map((e) => e.id === event.id ? { ...e, is_active: !e.is_active } : e))
  }

  async function deleteEvent(id: string) {
    if (!confirm('Excluir este tipo de evento? Esta ação não pode ser desfeita.')) return
    await api.delete(`/admin/event-types/${id}`)
    setEvents((es) => es.filter((e) => e.id !== id))
  }

  const btn: React.CSSProperties = {
    padding: '6px 14px', background: 'var(--light)', border: '1px solid var(--border)',
    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: 'var(--blue)', fontSize: 22 }}>Tipos de Evento</h1>
        <button onClick={() => router.push('/admin/events/new')} style={{
          padding: '10px 20px', background: 'var(--blue)', color: 'white',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
        }}>
          + Novo Evento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map((event) => (
          <div key={event.id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ display: 'block', marginBottom: 3, fontSize: 15 }}>{event.name}</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                /agendar/{event.slug} · {event.duration_minutes} min · {event.timezone}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: event.is_active ? '#E8F5E9' : '#FFF3E0', color: event.is_active ? '#2E7D51' : '#E65100' }}>
                {event.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <button onClick={() => toggleActive(event)} style={btn}>{event.is_active ? 'Desativar' : 'Ativar'}</button>
              <Link href={`/admin/events/${event.id}`} style={{ ...btn, textDecoration: 'none', color: 'var(--text)' }}>Editar</Link>
              <button onClick={() => deleteEvent(event.id)} style={{ ...btn, color: 'var(--error)' }}>Excluir</button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ background: 'white', borderRadius: 12, padding: 48, textAlign: 'center', border: '1.5px solid var(--border)' }}>
            <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Nenhum tipo de evento criado ainda.</p>
            <button onClick={() => router.push('/admin/events/new')} style={{ padding: '10px 20px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              Criar primeiro evento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
