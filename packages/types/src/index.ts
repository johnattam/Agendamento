export interface AdminConfig {
  id: string
  company_name: string
  company_logo_url: string | null
  address: string | null
  phone: string | null
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_password: string | null
  smtp_from_email: string | null
  smtp_from_name: string | null
  default_timezone: string
  updated_at: string
}

export interface GoogleIntegration {
  id: string
  access_token: string
  refresh_token: string
  calendar_id: string
  calendar_name: string
  connected_at: string
  expires_at: string
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sunday

export interface TimeWindow {
  start: string // "HH:MM"
  end: string   // "HH:MM"
}

export interface EventType {
  id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  buffer_minutes: number
  partner_name: string | null
  partner_logo_url: string | null
  date_start: string | null  // "YYYY-MM-DD"
  date_end: string | null
  max_future_days: number | null
  timezone: string
  available_weekdays: Weekday[]
  time_windows: TimeWindow[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FieldType = 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'file'

export interface FormField {
  id: string
  event_type_id: string
  label: string
  placeholder: string | null
  field_type: FieldType
  options: string[] | null
  is_required: boolean
  display_order: number
}

export interface Booking {
  id: string
  event_type_id: string
  google_event_id: string | null
  start_at: string
  end_at: string
  status: 'confirmed'
  form_data: Record<string, string>
  created_at: string
}

export interface SlotResult {
  start: string  // "HH:MM"
  end: string    // "HH:MM"
}

export interface PublicEventInfo {
  event: Pick<EventType, 'id' | 'name' | 'slug' | 'description' | 'duration_minutes' | 'timezone' | 'available_weekdays' | 'time_windows' | 'date_start' | 'date_end' | 'max_future_days' | 'partner_name' | 'partner_logo_url'>
  company: Pick<AdminConfig, 'company_name' | 'company_logo_url'>
  fields: FormField[]
}
