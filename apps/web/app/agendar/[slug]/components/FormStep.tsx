'use client'
import { useState } from 'react'
import type { FormField } from '@scheduling/types'

export function FormStep({ fields, onSubmit, onBack, submitting }: {
  fields: FormField[]
  onSubmit: (data: Record<string, string>) => void
  onBack: () => void
  submitting: boolean
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (f.is_required && !values[f.id]?.trim()) errs[f.id] = `${f.label} é obrigatório`
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const data: Record<string, string> = {}
    for (const f of fields) {
      data[f.label.toLowerCase()] = values[f.id] ?? ''
    }
    onSubmit(data)
  }

  const sorted = [...fields].sort((a, b) => a.display_order - b.display_order)
  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width:'100%', padding:'11px 14px', borderRadius:10, fontFamily:'inherit',
    border:`1.5px solid ${hasError ? '#C0392B' : '#D0DCE8'}`, fontSize:14, outline:'none',
  })

  return (
    <div>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#007A8C', cursor:'pointer', fontSize:13, marginBottom:24, fontFamily:'inherit' }}>
        ← Voltar para horários
      </button>
      <form onSubmit={handleSubmit}>
        {sorted.map((field) => (
          <div key={field.id} style={{ marginBottom:16 }}>
            <label htmlFor={field.id} style={{ display:'block', fontSize:13, fontWeight:500, marginBottom:6 }}>
              {field.label}
              {field.is_required
                ? <span data-required="true" style={{ color:'#C0392B', marginLeft:3 }}>*</span>
                : <span style={{ color:'#6B7A8D', fontSize:11, marginLeft:6 }}>(opcional)</span>
              }
            </label>
            {field.field_type === 'textarea' ? (
              <textarea id={field.id} value={values[field.id] ?? ''} onChange={(e) => setValues((v) => ({...v,[field.id]:e.target.value}))} placeholder={field.placeholder ?? ''} style={{...inputStyle(!!errors[field.id]), resize:'vertical', minHeight:80}} />
            ) : field.field_type === 'select' ? (
              <select id={field.id} value={values[field.id] ?? ''} onChange={(e) => setValues((v) => ({...v,[field.id]:e.target.value}))} style={inputStyle(!!errors[field.id])}>
                <option value="">Selecione...</option>
                {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input id={field.id} type={field.field_type} value={values[field.id] ?? ''} onChange={(e) => setValues((v) => ({...v,[field.id]:e.target.value}))} placeholder={field.placeholder ?? ''} style={inputStyle(!!errors[field.id])} />
            )}
            {errors[field.id] && <p style={{ color:'#C0392B', fontSize:11, marginTop:4 }}>{errors[field.id]}</p>}
          </div>
        ))}

        <button type="submit" disabled={submitting} style={{
          width:'100%', padding:15, background:'#003F7D', color:'white',
          border:'none', borderRadius:12, fontSize:15, fontWeight:600,
          cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
          marginTop:8, fontFamily:'inherit',
        }}>
          {submitting ? 'Confirmando...' : '✅ Confirmar Agendamento'}
        </button>
        <button type="button" onClick={onBack} style={{
          width:'100%', padding:13, background:'transparent', color:'#003F7D',
          border:'1.5px solid #D0DCE8', borderRadius:12, fontSize:14,
          cursor:'pointer', marginTop:10, fontFamily:'inherit',
        }}>
          Voltar
        </button>
      </form>
    </div>
  )
}
