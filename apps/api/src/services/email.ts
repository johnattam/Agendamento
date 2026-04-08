import nodemailer from 'nodemailer'
import { supabase } from '../db/client.js'

async function getTransporter() {
  const { data: cfg } = await supabase
    .from('admin_config')
    .select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, company_name')
    .single()

  if (!cfg?.smtp_host || !cfg?.smtp_user) throw new Error('SMTP not configured')

  return {
    transport: nodemailer.createTransport({
      host: cfg.smtp_host,
      port: cfg.smtp_port ?? 587,
      secure: cfg.smtp_port === 465,
      auth: { user: cfg.smtp_user, pass: cfg.smtp_password ?? '' },
    }),
    from: `"${cfg.smtp_from_name ?? cfg.company_name}" <${cfg.smtp_from_email}>`,
  }
}

export async function sendBookingConfirmation(params: {
  to: string
  eventName: string
  date: string
  time: string
  companyName: string
}) {
  const { transport, from } = await getTransporter()

  await transport.sendMail({
    from,
    to: params.to,
    subject: `Agendamento confirmado — ${params.eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#003F7D">Agendamento Confirmado ✓</h2>
        <p>Seu agendamento foi confirmado com sucesso.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:8px;color:#666">Evento</td><td style="padding:8px;font-weight:bold">${params.eventName}</td></tr>
          <tr><td style="padding:8px;color:#666">Data</td><td style="padding:8px">${params.date}</td></tr>
          <tr><td style="padding:8px;color:#666">Horário</td><td style="padding:8px">${params.time}</td></tr>
        </table>
        <p style="color:#999;font-size:12px">E-mail automático de ${params.companyName}.</p>
      </div>
    `,
  })
}
