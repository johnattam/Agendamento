export function SuccessStep({ date, slotStart, eventName, formData }: {
  date: string; slotStart: string; eventName: string; formData: Record<string, string>
}) {
  const formattedDate = new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric', timeZone:'UTC',
  })

  const summaryRows = [
    ['Evento', eventName],
    ['Data', formattedDate],
    ['Horário', slotStart],
    ...Object.entries(formData).filter(([,v]) => v).slice(0, 3),
  ]

  return (
    <div style={{ textAlign:'center', padding:'20px 0' }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg, #2E7D51, #27AE60)', margin:'0 auto 24px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, boxShadow:'0 8px 32px rgba(46,125,81,0.3)' }}>
        ✓
      </div>
      <h3 style={{ fontFamily:'serif', fontSize:24, color:'#003F7D', marginBottom:10 }}>Agendamento confirmado!</h3>
      <p style={{ color:'#6B7A8D', fontSize:14, lineHeight:1.7, maxWidth:380, margin:'0 auto 28px' }}>
        Seu agendamento foi realizado com sucesso. Um e-mail de confirmação foi enviado.
      </p>

      <div style={{ background:'#F5F3EE', borderRadius:14, padding:22, textAlign:'left', marginBottom:24 }}>
        <h4 style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.8px', color:'#6B7A8D', marginBottom:14 }}>Resumo do agendamento</h4>
        {summaryRows.map(([label, value]) => (
          <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #D0DCE8', fontSize:13 }}>
            <span style={{ color:'#6B7A8D', textTransform:'capitalize' }}>{label}</span>
            <strong style={{ color:'#1A2332', textTransform:'capitalize' }}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
