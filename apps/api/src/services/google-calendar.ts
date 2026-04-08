import { google } from 'googleapis'
import { config } from '../config.js'
import { supabase } from '../db/client.js'

function createOAuth2Client() {
  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(): string {
  const oauth2 = createOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  })
}

export async function exchangeCode(code: string) {
  const oauth2 = createOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  return tokens
}

export async function listCalendars(accessToken: string, refreshToken: string) {
  const oauth2 = createOAuth2Client()
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2 })
  const res = await calendar.calendarList.list()
  return res.data.items ?? []
}

async function getAuthenticatedClient() {
  const { data, error } = await supabase
    .from('google_integration')
    .select('*')
    .single()
  if (error || !data) throw new Error('Google not connected')

  const oauth2 = createOAuth2Client()
  oauth2.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })

  oauth2.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from('google_integration')
        .update({
          access_token: tokens.access_token,
          expires_at: new Date(tokens.expiry_date!).toISOString(),
        })
        .eq('id', data.id)
    }
  })

  return { oauth2, calendarId: data.calendar_id }
}

export async function listEventsForDay(date: string): Promise<{ start: string; end: string }[]> {
  const { oauth2, calendarId } = await getAuthenticatedClient()
  const calendar = google.calendar({ version: 'v3', auth: oauth2 })

  const timeMin = `${date}T00:00:00Z`
  const timeMax = `${date}T23:59:59Z`

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (res.data.items ?? []).map((e: any) => ({
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end: e.end?.dateTime ?? e.end?.date ?? '',
  }))
}

export async function createCalendarEvent(params: {
  summary: string
  description: string
  startDateTime: string
  endDateTime: string
  timezone: string
  attendeeEmail: string
}): Promise<string> {
  const { oauth2, calendarId } = await getAuthenticatedClient()
  const calendar = google.calendar({ version: 'v3', auth: oauth2 })

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: `${params.startDateTime}:00`, timeZone: params.timezone },
      end: { dateTime: `${params.endDateTime}:00`, timeZone: params.timezone },
      attendees: [{ email: params.attendeeEmail }],
    },
  })

  return res.data.id ?? ''
}
