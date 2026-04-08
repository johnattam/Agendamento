'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/admin/events', label: 'Tipos de Evento' },
  { href: '/admin/bookings', label: 'Agendamentos' },
  { href: '/admin/integration', label: 'Google Calendar' },
  { href: '/admin/config', label: 'Configurações' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/admin/login') return <>{children}</>

  async function logout() {
    await supabase.auth.signOut()
    document.cookie = `sb-1-auth-token=; path=/; max-age=0; SameSite=Lax`
    document.cookie = `sb--1-auth-token=; path=/; max-age=0; SameSite=Lax`
    router.push('/admin/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, background: 'var(--blue)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', color: 'white', fontWeight: 700, fontSize: 17, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Painel Admin
        </div>
        <div style={{ flex: 1, paddingTop: 8 }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: 'block', padding: '11px 20px', fontSize: 14,
              color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
              background: pathname.startsWith(item.href) ? 'rgba(255,255,255,0.12)' : 'transparent',
              borderLeft: pathname.startsWith(item.href) ? '3px solid #00A99D' : '3px solid transparent',
            }}>
              {item.label}
            </Link>
          ))}
        </div>
        <button onClick={logout} style={{
          margin: 16, padding: '10px', background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, cursor: 'pointer', fontSize: 13,
        }}>
          Sair
        </button>
      </nav>
      <main style={{ flex: 1, padding: '32px 36px', overflow: 'auto', background: '#F8F9FB' }}>
        {children}
      </main>
    </div>
  )
}
