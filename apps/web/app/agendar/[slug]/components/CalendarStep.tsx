'use client'
import { useState } from 'react'
import type { EventType } from '@scheduling/types'

type EventConfig = Pick<EventType, 'available_weekdays' | 'date_start' | 'date_end' | 'max_future_days' | 'timezone'>

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export function CalendarStep({ event, onSelect }: { event: EventConfig; onSelect: (date: string) => void }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  function isAvailable(day: number): boolean {
    const date = new Date(year, month, day)
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0)
    if (date < todayMidnight) return false
    const dow = date.getDay()
    if (!event.available_weekdays.includes(dow as 0|1|2|3|4|5|6)) return false
    if (event.date_start && date < new Date(event.date_start + 'T00:00:00')) return false
    if (event.date_end && date > new Date(event.date_end + 'T00:00:00')) return false
    if (event.max_future_days) {
      const maxDate = new Date(todayMidnight)
      maxDate.setDate(maxDate.getDate() + event.max_future_days)
      if (date > maxDate) return false
    }
    return true
  }

  function toISO(day: number) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <button aria-label="prev-month" onClick={() => changeMonth(-1)} style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #D0DCE8', background:'white', cursor:'pointer', fontSize:16, color:'#003F7D' }}>←</button>
        <h3 style={{ fontFamily:'serif', fontSize:20, color:'#003F7D', textTransform:'capitalize' }}>{MONTH_NAMES[month]} de {year}</h3>
        <button aria-label="next-month" onClick={() => changeMonth(1)} style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #D0DCE8', background:'white', cursor:'pointer', fontSize:16, color:'#003F7D' }}>→</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:20 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'#6B7A8D', padding:'6px 0', textTransform:'uppercase' }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_,i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_,i) => i+1).map((day) => {
          const avail = isAvailable(day)
          const iso = toISO(day)
          const sel = selected === iso
          return (
            <div key={day}
              data-available={avail ? 'true' : undefined}
              onClick={() => { if (!avail) return; setSelected(iso); onSelect(iso) }}
              style={{
                aspectRatio:'1', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:500, cursor: avail ? 'pointer' : 'default',
                background: sel ? '#003F7D' : avail ? '#E8F4F8' : 'transparent',
                color: sel ? 'white' : avail ? '#003F7D' : '#D0DCE8',
                transition:'all 0.2s',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex', gap:20, padding:'14px 16px', background:'#F5F3EE', borderRadius:10, fontSize:12, color:'#6B7A8D' }}>
        {[['#E8F4F8','Disponível'],['#003F7D','Selecionado'],['#D0DCE8','Indisponível']].map(([color, label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />{label}
          </div>
        ))}
      </div>
    </div>
  )
}
