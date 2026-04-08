'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'

interface GoogleStatus { connected: boolean; calendar_name: string | null; connected_at: string | null }
interface Calendar { id: string; name: string }

function IntegrationContent() {
  const searchParams = useSearchParams()
  const justConnected = searchParams.get('connected') === 'true'
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    const s = await api.get<GoogleStatus>('/admin/google/status')
    setStatus(s)
    if (s.connected) {
      const cals = await api.get<Calendar[]>('/admin/google/calendars')
      setCalendars(cals)
    }
  }

  async function handleConnect() {
    const { url } = await api.get<{ url: string }>('/admin/google/auth-url')
    window.location.href = url
  }

  async function handleDisconnect() {
    await api.delete('/admin/google')
    setStatus(null); setCalendars([])
    loadStatus()
  }

  async function handleSaveCalendar() {
    const cal = calendars.find((c) => c.id === selectedCalendar)
    if (!cal) return
    setSaving(true)
    await api.put('/admin/google/calendar', { calendar_id: cal.id, calendar_name: cal.name })
    setSaving(false); loadStatus()
  }

  const sectionStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 24, border: '1.5px solid var(--border)', marginBottom: 20 }
  const btnStyle = (color: string): React.CSSProperties => ({
    padding: '10px 20px', background: color, color: 'white',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
  })

  if (!status) return <p style={{ color: 'var(--muted)' }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 580 }}>
      <h1 style={{ marginBottom: 24, color: 'var(--blue)' }}>Google Calendar</h1>

      {justConnected && (
        <div style={{ background: '#E8F5E9', border: '1px solid #2E7D51', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: '#2E7D51', fontSize: 14 }}>
          ✓ Google Calendar conectado com sucesso!
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: status.connected ? '#2E7D51' : '#C0392B' }} />
          <strong style={{ fontSize: 15 }}>{status.connected ? 'Conectado' : 'Desconectado'}</strong>
        </div>
        {status.connected && status.calendar_name && (
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
            Agenda ativa: <strong>{status.calendar_name}</strong>
          </p>
        )}
        {status.connected
          ? <button onClick={handleDisconnect} style={btnStyle('var(--error)')}>Desconectar Google</button>
          : <button onClick={handleConnect} style={btnStyle('var(--blue)')}>Conectar com Google</button>
        }
      </div>

      {status.connected && calendars.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: 14, fontSize: 15 }}>Selecionar Agenda</h3>
          <select value={selectedCalendar} onChange={(e) => setSelectedCalendar(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, marginBottom: 14, fontFamily: 'inherit' }}>
            <option value="">Selecione uma agenda...</option>
            {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleSaveCalendar} disabled={!selectedCalendar || saving} style={btnStyle('var(--blue)')}>
            {saving ? 'Salvando...' : 'Salvar Agenda'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function IntegrationPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--muted)' }}>Carregando...</p>}>
      <IntegrationContent />
    </Suspense>
  )
}
