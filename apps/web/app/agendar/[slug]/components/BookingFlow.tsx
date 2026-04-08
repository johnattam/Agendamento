'use client'
import { useState } from 'react'
import { CalendarStep } from './CalendarStep'
import { SlotsStep } from './SlotsStep'
import { FormStep } from './FormStep'
import { SuccessStep } from './SuccessStep'
import type { PublicEventInfo, SlotResult } from '@scheduling/types'

type Step = 'calendar' | 'slots' | 'form' | 'success'
const STEPS: Step[] = ['calendar','slots','form','success']
const LABELS: Record<Step, string> = { calendar:'Data', slots:'Horário', form:'Dados', success:'Confirmado' }

export function BookingFlow({ info }: { info: PublicEventInfo }) {
  const [step, setStep] = useState<Step>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotResult | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleFormSubmit(data: Record<string, string>) {
    if (!selectedDate || !selectedSlot) return
    setSubmitting(true); setFormData(data)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type_id: info.event.id,
          date: selectedDate,
          slot_start: selectedSlot.start,
          slot_end: selectedSlot.end,
          form_data: data,
        }),
      })
      if (res.ok) setStep('success')
    } finally {
      setSubmitting(false)
    }
  }

  const idx = STEPS.indexOf(step)

  return (
    <>
      {/* Progress Bar */}
      <div style={{ background:'white', borderBottom:'1px solid #D0DCE8', padding:'0 32px' }}>
        <div style={{ display:'flex', maxWidth:700, margin:'0 auto' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 8px', gap:6, position:'relative' }}>
              {i < STEPS.length - 1 && (
                <div style={{ position:'absolute', top:27, left:'calc(50% + 20px)', width:'calc(100% - 40px)', height:2, background: i < idx ? '#00A99D' : '#D0DCE8', transition:'background 0.4s' }} />
              )}
              <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, zIndex:1, background: i < idx ? '#00A99D' : i === idx ? '#003F7D' : '#D0DCE8', color: i <= idx ? 'white' : '#6B7A8D' }}>
                {i < idx ? '✓' : i + 1}
              </div>
              <div style={{ fontSize:11, color: i === idx ? '#003F7D' : '#6B7A8D', fontWeight: i === idx ? 600 : 400 }}>{LABELS[s]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <main style={{ flex:1, display:'flex', justifyContent:'center', padding:'40px 16px 60px' }}>
        <div style={{ background:'white', borderRadius:20, boxShadow:'0 20px 60px rgba(0,63,125,0.16)', width:'100%', maxWidth:720, overflow:'hidden' }}>
          <div style={{ background:'linear-gradient(135deg, #003F7D 0%, #007A8C 100%)', padding:'32px 36px', position:'relative', overflow:'hidden' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', padding:'5px 12px', borderRadius:100, marginBottom:14 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#4DFFB4', display:'inline-block' }} />
              <span style={{ color:'white', fontSize:12 }}>Agenda disponível</span>
            </div>
            <h2 style={{ fontFamily:'serif', fontSize:26, color:'white', lineHeight:1.3, marginBottom: info.event.description ? 10 : 0 }}>
              {info.event.name}
            </h2>
            {info.event.description && (
              <p style={{ color:'rgba(255,255,255,0.8)', fontSize:14, lineHeight:1.6, maxWidth:500 }}>{info.event.description}</p>
            )}
          </div>

          <div style={{ padding:36 }}>
            {step === 'calendar' && <CalendarStep event={info.event} onSelect={(date) => { setSelectedDate(date); setStep('slots') }} />}
            {step === 'slots' && selectedDate && <SlotsStep slug={info.event.slug} date={selectedDate} onSelect={(slot) => { setSelectedSlot(slot); setStep('form') }} onBack={() => setStep('calendar')} />}
            {step === 'form' && <FormStep fields={info.fields} onSubmit={handleFormSubmit} onBack={() => setStep('slots')} submitting={submitting} />}
            {step === 'success' && selectedDate && selectedSlot && <SuccessStep date={selectedDate} slotStart={selectedSlot.start} eventName={info.event.name} formData={formData} />}
          </div>
        </div>
      </main>
    </>
  )
}
