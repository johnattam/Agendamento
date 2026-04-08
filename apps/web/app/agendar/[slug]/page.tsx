import { notFound } from 'next/navigation'
import type { PublicEventInfo } from '@scheduling/types'
import { BookingFlow } from './components/BookingFlow'
import { PageHeader } from './components/PageHeader'

async function getEventInfo(slug: string): Promise<PublicEventInfo | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
  try {
    const res = await fetch(`${apiUrl}/events/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function BookingPage({ params }: { params: { slug: string } }) {
  const info = await getEventInfo(params.slug)
  if (!info) notFound()

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#F5F3EE' }}>
      <PageHeader company={info.company} partner_name={info.event.partner_name} partner_logo_url={info.event.partner_logo_url} />
      <BookingFlow info={info} />
    </div>
  )
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const info = await getEventInfo(params.slug)
  return {
    title: info ? `${info.event.name} — ${info.company.company_name}` : 'Agendamento',
  }
}
