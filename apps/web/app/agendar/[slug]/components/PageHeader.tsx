import type { PublicEventInfo } from '@scheduling/types'

interface Props {
  company: PublicEventInfo['company']
  partner_name: string | null
  partner_logo_url: string | null
}

export function PageHeader({ company, partner_name, partner_logo_url }: Props) {
  const logoBox = (initial: string): React.CSSProperties => ({
    width: 40, height: 40, background: 'white', borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#003F7D', fontWeight: 700, fontSize: 18, flexShrink: 0,
  })

  return (
    <header style={{ background: '#003F7D', padding: '18px 32px', display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {company.company_logo_url
          ? <img src={company.company_logo_url} alt={company.company_name} style={{ height: 40, borderRadius: 8 }} />
          : <div style={logoBox(company.company_name)}>{company.company_name.charAt(0).toUpperCase()}</div>
        }
        <span style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>{company.company_name}</span>
      </div>

      {partner_name && (
        <>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.3)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {partner_logo_url
              ? <img src={partner_logo_url} alt={partner_name} style={{ height: 40, borderRadius: 8 }} />
              : <div style={{ ...logoBox(partner_name), background: 'rgba(255,255,255,0.15)', color: 'white' }}>{partner_name.charAt(0).toUpperCase()}</div>
            }
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: 15 }}>{partner_name}</span>
          </div>
        </>
      )}
    </header>
  )
}
