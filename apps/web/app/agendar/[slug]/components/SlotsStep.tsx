'use client'
import { useState, useEffect } from 'react'
import type { SlotResult } from '@scheduling/types'

export function SlotsStep({ slug, date, onSelect, onBack }: {
  slug: string; date: string
  onSelect: (slot: SlotResult) => void; onBack: () => void
}) {
  const [slots, setSlots] = useState<SlotResult[]>([])
  const [selected, setSelected] = useState<SlotResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    fetch(`${apiUrl}/events/${slug}/slots?date=${date}`)
      .then((r) => r.json())
      .then((data) => { setSlots(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug, date])

  const d = new Date(date + 'T12:00:00Z')
  const formattedDate = d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })

  return (
    <div>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#007A8C', cursor:'pointer', fontSize:13, marginBottom:24, fontFamily:'inherit' }}>
        ← Voltar ao calendário
      </button>

      <div style={{ background:'#E8F4F8', border:'1.5px solid #D0DCE8', borderRadius:10, padding:'12px 18px', display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <div style={{ width:40, height:40, background:'#003F7D', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📅</div>
        <div>
          <strong style={{ display:'block', color:'#003F7D', textTransform:'capitalize' }}>{formattedDate}</strong>
          <span style={{ fontSize:12, color:'#6B7A8D' }}>Selecione um horário disponível</span>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'#6B7A8D', textAlign:'center', padding:32 }}>Carregando horários...</p>
      ) : slots.length === 0 ? (
        <p style={{ color:'#6B7A8D', textAlign:'center', padding:32 }}>Nenhum horário disponível para este dia.</p>
      ) : (
        <>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', color:'#6B7A8D', marginBottom:14 }}>Horários disponíveis</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:28 }}>
            {slots.map((slot) => {
              const sel = selected?.start === slot.start
              return (
                <div key={slot.start} onClick={() => setSelected(slot)} style={{
                  border:`1.5px solid ${sel ? '#003F7D' : '#D0DCE8'}`,
                  borderRadius:10, padding:'12px 8px', textAlign:'center',
                  cursor:'pointer', fontWeight:500, fontSize:15,
                  background: sel ? '#003F7D' : 'white', color: sel ? 'white' : '#003F7D',
                  boxShadow: sel ? '0 4px 16px rgba(0,63,125,0.25)' : 'none', transition:'all 0.2s',
                }}>
                  {slot.start}
                </div>
              )
            })}
          </div>
          <button disabled={!selected} onClick={() => selected && onSelect(selected)} style={{
            width:'100%', padding:15, background:'#003F7D', color:'white',
            border:'none', borderRadius:12, fontSize:15, fontWeight:600,
            cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, fontFamily:'inherit',
          }}>
            Avançar →
          </button>
        </>
      )}
    </div>
  )
}
