'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import type { AdminConfig } from '@scheduling/types'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
}

export default function ConfigPage() {
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { api.get<AdminConfig>('/admin/config').then(setConfig) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    await api.put('/admin/config', config)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function field(label: string, key: keyof AdminConfig, type = 'text') {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
        <input type={type} value={(config?.[key] as string) ?? ''} style={inputStyle}
          onChange={(e) => setConfig((c) => c ? { ...c, [key]: type === 'number' ? Number(e.target.value) : e.target.value } : c)} />
      </div>
    )
  }

  if (!config) return <p style={{ color: 'var(--muted)' }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ marginBottom: 24, color: 'var(--blue)' }}>Configurações</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1.5px solid var(--border)', marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Dados da Empresa</h3>
          {field('Nome da Empresa', 'company_name')}
          {field('URL do Logo', 'company_logo_url')}
          {field('Endereço', 'address')}
          {field('Telefone', 'phone')}
          {field('Fuso Horário Padrão', 'default_timezone')}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1.5px solid var(--border)', marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>E-mail (SMTP)</h3>
          {field('Servidor SMTP', 'smtp_host')}
          {field('Porta', 'smtp_port', 'number')}
          {field('Usuário', 'smtp_user')}
          {field('Senha', 'smtp_password', 'password')}
          {field('E-mail Remetente', 'smtp_from_email', 'email')}
          {field('Nome Remetente', 'smtp_from_name')}
        </div>

        <button type="submit" disabled={saving} style={{
          padding: '12px 28px', background: 'var(--blue)', color: 'white',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}
