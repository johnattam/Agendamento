'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { EventType, FormField, FieldType, TimeWindow, Weekday } from '@scheduling/types'

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const FIELD_TYPES: FieldType[] = ['text','email','tel','select','textarea','file']
const FIELD_TYPE_LABELS: Record<FieldType, string> = { text:'Texto', email:'E-mail', tel:'Telefone', select:'Lista', textarea:'Texto longo', file:'Arquivo' }

const DEFAULT_EVENT: Partial<EventType> = {
  name: '', slug: '', description: '', duration_minutes: 30, buffer_minutes: 0,
  timezone: 'America/Sao_Paulo', available_weekdays: [1,2,3,4,5] as Weekday[],
  time_windows: [{ start: '09:00', end: '18:00' }],
  is_active: true, max_future_days: 30,
  partner_name: '', partner_logo_url: '', date_start: null, date_end: null,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
}
const sectionStyle: React.CSSProperties = {
  background: 'white', borderRadius: 12, padding: 24,
  border: '1.5px solid var(--border)', marginBottom: 20,
}

export default function EventFormPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === 'new'
  const [event, setEvent] = useState<Partial<EventType>>(DEFAULT_EVENT)
  const [fields, setFields] = useState<FormField[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isNew) {
      api.get<EventType>(`/admin/event-types/${params.id}`).then(setEvent)
      api.get<FormField[]>(`/admin/event-types/${params.id}/fields`).then(setFields)
    }
  }, [params.id, isNew])

  function set<K extends keyof EventType>(key: K, value: EventType[K]) {
    setEvent((e) => ({ ...e, [key]: value }))
  }

  function toggleWeekday(day: Weekday) {
    const current = event.available_weekdays ?? []
    set('available_weekdays', (current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)) as Weekday[])
  }

  function updateWindow(idx: number, key: keyof TimeWindow, value: string) {
    const windows = [...(event.time_windows ?? [])]
    windows[idx] = { ...windows[idx], [key]: value }
    set('time_windows', windows)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (isNew) {
        const created = await api.post<EventType>('/admin/event-types', event)
        router.push(`/admin/events/${created.id}`)
        return
      }
      await api.put(`/admin/event-types/${params.id}`, event)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      alert('Erro ao salvar evento: ' + (err.message || 'Erro desconhecido'))
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function addField() {
    const newField = await api.post<FormField>(
      `/admin/event-types/${params.id}/fields`,
      { label: 'Novo campo', field_type: 'text', is_required: true, display_order: fields.length, placeholder: '' }
    )
    setFields((f) => [...f, newField])
  }

  async function updateField(fieldId: string, updates: Partial<FormField>) {
    await api.put(`/admin/fields/${fieldId}`, updates)
    setFields((fs) => fs.map((f) => f.id === fieldId ? { ...f, ...updates } : f))
  }

  async function deleteField(fieldId: string) {
    await api.delete(`/admin/fields/${fieldId}`)
    setFields((fs) => fs.filter((f) => f.id !== fieldId))
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', fontSize: 14, fontFamily: 'inherit' }}>
          ← Voltar
        </button>
        <h1 style={{ color: 'var(--blue)', fontSize: 20 }}>{isNew ? 'Novo Tipo de Evento' : 'Editar Evento'}</h1>
      </div>

      {/* Basic Info */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Informações Básicas</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Nome do Evento</label>
          <input value={event.name ?? ''} onChange={(e) => set('name', e.target.value)} style={inputStyle} placeholder="ex: Consulta 30min" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Slug (URL pública)</label>
          <input value={event.slug ?? ''} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} style={inputStyle} placeholder="ex: consulta-30min" />
          {event.slug && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>URL: /agendar/{event.slug}</p>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Descrição (exibida na página pública)</label>
          <textarea value={event.description ?? ''} onChange={(e) => set('description', e.target.value)} style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Duração (minutos)</label>
            <input type="number" min={5} value={event.duration_minutes ?? 30} onChange={(e) => set('duration_minutes', Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Intervalo entre slots (min)</label>
            <input type="number" min={0} value={event.buffer_minutes ?? 0} onChange={(e) => set('buffer_minutes', Number(e.target.value))} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Partner */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Empresa Parceira <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 400 }}>(opcional)</span></h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Nome da empresa parceira</label>
            <input value={event.partner_name ?? ''} onChange={(e) => set('partner_name', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>URL do logo parceiro</label>
            <input value={event.partner_logo_url ?? ''} onChange={(e) => set('partner_logo_url', e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Disponibilidade</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Dias da semana disponíveis</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((name, idx) => {
              const active = event.available_weekdays?.includes(idx as Weekday)
              return (
                <button key={idx} type="button" onClick={() => toggleWeekday(idx as Weekday)} style={{
                  padding: '6px 13px', borderRadius: 8, border: '1.5px solid var(--border)',
                  background: active ? 'var(--blue)' : 'white', color: active ? 'white' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                }}>
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Janelas de horário</label>
          {(event.time_windows ?? []).map((w, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
              <input type="time" value={w.start} onChange={(e) => updateWindow(idx, 'start', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>até</span>
              <input type="time" value={w.end} onChange={(e) => updateWindow(idx, 'end', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
              {(event.time_windows?.length ?? 0) > 1 && (
                <button type="button" onClick={() => set('time_windows', (event.time_windows ?? []).filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 16 }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => set('time_windows', [...(event.time_windows ?? []), { start: '09:00', end: '18:00' }])} style={{ fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Adicionar janela
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Data início</label>
            <input type="date" value={event.date_start ?? ''} onChange={(e) => set('date_start', e.target.value || null)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Data fim</label>
            <input type="date" value={event.date_end ?? ''} onChange={(e) => set('date_end', e.target.value || null)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Máx. dias futuros</label>
            <input type="number" min={1} value={event.max_future_days ?? ''} onChange={(e) => set('max_future_days', e.target.value ? Number(e.target.value) : null)} style={inputStyle} placeholder="ex: 30" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Fuso horário</label>
          <input value={event.timezone ?? ''} onChange={(e) => set('timezone', e.target.value)} style={inputStyle} placeholder="America/Sao_Paulo" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} style={{
        padding: '12px 28px', background: 'var(--blue)', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', marginBottom: 24, fontFamily: 'inherit',
      }}>
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : isNew ? 'Criar Evento' : 'Salvar Alterações'}
      </button>

      {/* Form Fields Builder — shown only when editing */}
      {!isNew && (
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15 }}>Campos do Formulário</h3>
            <button onClick={addField} style={{ padding: '8px 16px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              + Adicionar Campo
            </button>
          </div>
          {fields.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhum campo configurado.</p>}
          {fields.map((field) => (
            <div key={field.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Label</label>
                  <input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Tipo</label>
                  <select value={field.field_type} onChange={(e) => updateField(field.id, { field_type: e.target.value as FieldType })} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <button onClick={() => deleteField(field.id)} style={{ marginTop: 20, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={field.is_required} onChange={(e) => updateField(field.id, { is_required: e.target.checked })} />
                  Obrigatório
                </label>
                <input placeholder="Placeholder (opcional)" value={field.placeholder ?? ''} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} style={{ ...inputStyle, padding: '6px 12px', fontSize: 13, flex: 1 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
