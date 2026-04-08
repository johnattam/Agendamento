# Sistema de Agendamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete scheduling system with Google Calendar integration, a public booking page, and an admin CMS panel, structured as a Turborepo monorepo.

**Architecture:** Monorepo with `apps/web` (Next.js 14 App Router) and `apps/api` (Fastify). Supabase provides the PostgreSQL database and admin authentication. The public frontend lives at `/agendar/[slug]`; the admin panel at `/admin`. The API handles slot generation by cross-referencing event config with Google Calendar availability, then creates calendar events and sends confirmation emails via SMTP.

**Tech Stack:** Node.js 20, TypeScript 5, pnpm workspaces, Turborepo, Next.js 14 (App Router), Fastify 4, Supabase JS v2, googleapis, Nodemailer, Zod, Vitest 1, @testing-library/react

---

## File Map

### Root
- `package.json` — workspace root, dev tooling
- `turbo.json` — build pipeline config
- `pnpm-workspace.yaml` — workspace packages declaration
- `.env.example` — all required env vars documented

### packages/types/
- `src/index.ts` — shared TypeScript interfaces: AdminConfig, GoogleIntegration, EventType, FormField, Booking, SlotResult, PublicEventInfo

### apps/api/
- `src/index.ts` — Fastify server entry point, plugin + route registration
- `src/config.ts` — Zod-validated env config
- `src/db/client.ts` — Supabase admin client singleton
- `src/db/migrations/001_initial.sql` — complete schema DDL
- `src/middleware/auth.ts` — Supabase JWT verification hook
- `src/routes/admin/config.ts` — GET/PUT /admin/config
- `src/routes/admin/google.ts` — GET /admin/google/auth-url, GET /admin/google/callback, GET /admin/google/status, GET /admin/google/calendars, PUT /admin/google/calendar, DELETE /admin/google
- `src/routes/admin/event-types.ts` — CRUD /admin/event-types
- `src/routes/admin/form-fields.ts` — CRUD /admin/event-types/:id/fields, PUT/DELETE /admin/fields/:fieldId
- `src/routes/admin/bookings.ts` — GET /admin/bookings
- `src/routes/public/events.ts` — GET /events/:slug, GET /events/:slug/slots
- `src/routes/public/bookings.ts` — POST /bookings
- `src/services/slots.ts` — slot generation algorithm
- `src/services/google-calendar.ts` — Google Calendar API wrapper
- `src/services/email.ts` — Nodemailer SMTP email service
- `src/tests/slots.test.ts` — unit tests for slot generation
- `src/tests/config.test.ts` — integration tests for config routes
- `src/tests/event-types.test.ts` — integration tests for event type routes

### apps/web/
- `app/layout.tsx` — root layout with fonts
- `app/globals.css` — CSS custom properties matching reference design
- `app/agendar/[slug]/page.tsx` — SSR public booking page
- `app/agendar/[slug]/components/BookingFlow.tsx` — 4-step state machine
- `app/agendar/[slug]/components/CalendarStep.tsx` — month calendar UI
- `app/agendar/[slug]/components/SlotsStep.tsx` — time slots grid
- `app/agendar/[slug]/components/FormStep.tsx` — dynamic form renderer
- `app/agendar/[slug]/components/SuccessStep.tsx` — confirmation screen
- `app/agendar/[slug]/components/PageHeader.tsx` — dual-brand header (admin company + partner)
- `app/admin/layout.tsx` — admin layout with sidebar nav
- `app/admin/login/page.tsx` — email/password login form
- `app/admin/page.tsx` — redirect to /admin/events
- `app/admin/config/page.tsx` — general settings + SMTP config
- `app/admin/integration/page.tsx` — Google Calendar OAuth connect/disconnect
- `app/admin/events/page.tsx` — event types list with status toggle
- `app/admin/events/[id]/page.tsx` — event type form + form fields builder (id="new" for create)
- `app/admin/bookings/page.tsx` — bookings list table
- `lib/api-client.ts` — typed fetch wrapper pointing to Fastify API
- `lib/supabase.ts` — Supabase browser client singleton
- `middleware.ts` — Next.js middleware: redirect unauthenticated /admin to /admin/login
- `vitest.config.ts` — vitest config for jsdom + @testing-library/react
- `vitest.setup.ts` — import @testing-library/jest-dom
- `__tests__/calendar-step.test.tsx` — CalendarStep availability logic
- `__tests__/slots-step.test.tsx` — SlotsStep render test
- `__tests__/form-step.test.tsx` — FormStep dynamic field rendering

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `pnpm-workspace.yaml`
- Create: `.env.example`
- Create: `apps/api/package.json`
- Create: `apps/web/package.json`
- Create: `packages/types/package.json`

- [ ] **Step 1: Install pnpm globally if not present**

```bash
npm install -g pnpm@9
pnpm --version
```
Expected: `9.x.x`

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "scheduling-system",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 5: Create apps/api/package.json**

```json
{
  "name": "@scheduling/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@scheduling/types": "workspace:*",
    "@supabase/supabase-js": "^2.43.0",
    "fastify": "^4.27.0",
    "@fastify/cors": "^9.0.1",
    "googleapis": "^140.0.0",
    "nodemailer": "^6.9.13",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.15",
    "tsx": "^4.11.0",
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 6: Create apps/web/package.json**

```json
{
  "name": "@scheduling/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "@scheduling/types": "workspace:*",
    "@supabase/supabase-js": "^2.43.0",
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/react": "^15.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^24.1.0",
    "vitest": "^1.6.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 7: Create packages/types/package.json**

```json
{
  "name": "@scheduling/types",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 8: Create .env.example**

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API
API_PORT=3001
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/admin/google/callback

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 9: Install all dependencies**

```bash
pnpm install
```
Expected: `node_modules` created in all packages without errors.

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Turborepo monorepo scaffold"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `packages/types/src/index.ts`
- Create: `packages/types/tsconfig.json`

- [ ] **Step 1: Create tsconfig.json for types package**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write shared types**

Create `packages/types/src/index.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add packages/types/
git commit -m "feat: add shared TypeScript types package"
```

---

## Task 3: Supabase Database Schema

**Files:**
- Create: `apps/api/src/db/migrations/001_initial.sql`

- [ ] **Step 1: Write complete schema DDL**

Create `apps/api/src/db/migrations/001_initial.sql`:

```sql
create extension if not exists "uuid-ossp";

create table admin_config (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null default '',
  company_logo_url text,
  address text,
  phone text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  default_timezone text not null default 'America/Sao_Paulo',
  updated_at timestamptz not null default now()
);

create table google_integration (
  id uuid primary key default uuid_generate_v4(),
  access_token text not null,
  refresh_token text not null,
  calendar_id text not null,
  calendar_name text not null default '',
  connected_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table event_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  duration_minutes integer not null default 30,
  buffer_minutes integer not null default 0,
  partner_name text,
  partner_logo_url text,
  date_start date,
  date_end date,
  max_future_days integer,
  timezone text not null default 'America/Sao_Paulo',
  available_weekdays integer[] not null default '{1,2,3,4,5}',
  time_windows jsonb not null default '[{"start":"09:00","end":"18:00"}]',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table form_fields (
  id uuid primary key default uuid_generate_v4(),
  event_type_id uuid not null references event_types(id) on delete cascade,
  label text not null,
  placeholder text,
  field_type text not null check (field_type in ('text','email','tel','select','textarea','file')),
  options jsonb,
  is_required boolean not null default true,
  display_order integer not null default 0
);

create table bookings (
  id uuid primary key default uuid_generate_v4(),
  event_type_id uuid not null references event_types(id),
  google_event_id text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed')),
  form_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index bookings_start_at_idx on bookings(start_at);
create index bookings_event_type_id_idx on bookings(event_type_id);
create index form_fields_event_type_id_idx on form_fields(event_type_id);

-- Seed initial admin_config row (single-row table)
insert into admin_config (company_name) values ('Minha Empresa');

-- RLS: service role key bypasses RLS, so these policies just document intent
alter table admin_config enable row level security;
alter table google_integration enable row level security;
alter table event_types enable row level security;
alter table form_fields enable row level security;
alter table bookings enable row level security;

create policy "service_role_access" on admin_config for all using (true);
create policy "service_role_access" on google_integration for all using (true);
create policy "service_role_access" on event_types for all using (true);
create policy "service_role_access" on form_fields for all using (true);
create policy "service_role_access" on bookings for all using (true);
```

- [ ] **Step 2: Run migration in Supabase**

Open Supabase dashboard → SQL Editor → paste and run the SQL above.

Expected: All 5 tables created, `admin_config` has 1 seed row.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/db/
git commit -m "feat: add initial database schema migration"
```

---

## Task 4: Fastify API Server Setup

**Files:**
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/index.ts`

- [ ] **Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create config.ts**

Create `apps/api/src/config.ts`:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  API_PORT: z.coerce.number().default(3001),
  API_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
})

export const config = envSchema.parse(process.env)
```

- [ ] **Step 3: Create Supabase admin client**

Create `apps/api/src/db/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)
```

- [ ] **Step 4: Create Fastify entry point**

Create `apps/api/src/index.ts`:

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'

export async function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  await app.register(cors, { origin: true, credentials: true })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildServer()
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' })
}
```

- [ ] **Step 5: Copy .env.example and fill values, then test start**

```bash
cd apps/api
cp ../../.env.example .env
# Fill real values in .env
pnpm dev
```

Expected: `Server listening at http://0.0.0.0:3001`

- [ ] **Step 6: Commit**

```bash
git add apps/api/
git commit -m "feat: add Fastify API server with Zod config and Supabase client"
```

---

## Task 5: Auth Middleware + Admin Config Routes

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/routes/admin/config.ts`
- Create: `apps/api/src/tests/config.test.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/tests/config.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { buildServer } from '../index.js'

vi.mock('../db/client.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
    })),
  },
}))

import { supabase } from '../db/client.js'

describe('GET /admin/config', () => {
  it('returns 401 without authorization header', async () => {
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/admin/config' })
    expect(res.statusCode).toBe(401)
  })

  it('returns config when authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    } as any)
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: { id: '1', company_name: 'Test Co', default_timezone: 'America/Sao_Paulo' },
        error: null,
      }),
    } as any)

    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/admin/config',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).company_name).toBe('Test Co')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/api && pnpm test
```
Expected: FAIL — `/admin/config` returns 404

- [ ] **Step 3: Create auth middleware**

Create `apps/api/src/middleware/auth.ts`:

```typescript
import { FastifyRequest, FastifyReply } from 'fastify'
import { supabase } from '../db/client.js'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
}
```

- [ ] **Step 4: Create admin config routes**

Create `apps/api/src/routes/admin/config.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminConfigRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/admin/config', async (_req, reply) => {
    const { data, error } = await supabase
      .from('admin_config')
      .select('*')
      .single()
    if (error) return reply.status(500).send({ error: error.message })
    return data
  })

  app.put<{ Body: Record<string, unknown> }>('/admin/config', async (req, reply) => {
    const { data, error } = await supabase
      .from('admin_config')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select()
      .single()
    if (error) return reply.status(500).send({ error: error.message })
    return data
  })
}
```

- [ ] **Step 5: Register routes in index.ts**

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { adminConfigRoutes } from './routes/admin/config.js'

export async function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  await app.register(cors, { origin: true, credentials: true })
  app.get('/health', async () => ({ status: 'ok' }))
  await app.register(adminConfigRoutes)
  return app
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildServer()
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' })
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd apps/api && pnpm test
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/
git commit -m "feat: add auth middleware and admin config routes"
```

---

## Task 6: Google Calendar Service + OAuth Routes

**Files:**
- Create: `apps/api/src/services/google-calendar.ts`
- Create: `apps/api/src/routes/admin/google.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create Google Calendar service**

Create `apps/api/src/services/google-calendar.ts`:

```typescript
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

  return (res.data.items ?? []).map((e) => ({
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
```

- [ ] **Step 2: Create Google OAuth routes**

Create `apps/api/src/routes/admin/google.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'
import { config } from '../../config.js'
import { getAuthUrl, exchangeCode, listCalendars } from '../../services/google-calendar.js'

export async function adminGoogleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/admin/google/auth-url', async () => {
    return { url: getAuthUrl() }
  })

  app.get<{ Querystring: { code: string } }>(
    '/admin/google/callback',
    async (req, reply) => {
      const { code } = req.query
      const tokens = await exchangeCode(code)

      await supabase.from('google_integration').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      await supabase.from('google_integration').insert({
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        calendar_id: 'primary',
        calendar_name: 'Primary',
        expires_at: new Date(tokens.expiry_date!).toISOString(),
      })

      return reply.redirect(`${config.WEB_URL}/admin/integration?connected=true`)
    }
  )

  app.get('/admin/google/calendars', async (_req, reply) => {
    const { data, error } = await supabase
      .from('google_integration')
      .select('access_token, refresh_token')
      .single()
    if (error || !data) return reply.status(404).send({ error: 'Not connected' })

    const calendars = await listCalendars(data.access_token, data.refresh_token)
    return calendars.map((c) => ({ id: c.id, name: c.summary }))
  })

  app.put<{ Body: { calendar_id: string; calendar_name: string } }>(
    '/admin/google/calendar',
    async (req) => {
      const { calendar_id, calendar_name } = req.body
      await supabase
        .from('google_integration')
        .update({ calendar_id, calendar_name })
        .neq('id', '00000000-0000-0000-0000-000000000000')
      return { success: true }
    }
  )

  app.get('/admin/google/status', async () => {
    const { data } = await supabase
      .from('google_integration')
      .select('calendar_name, connected_at')
      .single()
    return {
      connected: !!data,
      calendar_name: data?.calendar_name ?? null,
      connected_at: data?.connected_at ?? null,
    }
  })

  app.delete('/admin/google', async () => {
    await supabase.from('google_integration').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return { success: true }
  })
}
```

- [ ] **Step 3: Register in index.ts**

Add import and registration inside `buildServer()`:

```typescript
import { adminGoogleRoutes } from './routes/admin/google.js'
// inside buildServer(), after adminConfigRoutes:
await app.register(adminGoogleRoutes)
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/
git commit -m "feat: add Google OAuth routes and Calendar service"
```

---

## Task 7: Event Types + Form Fields CRUD Routes

**Files:**
- Create: `apps/api/src/routes/admin/event-types.ts`
- Create: `apps/api/src/routes/admin/form-fields.ts`
- Create: `apps/api/src/tests/event-types.test.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/tests/event-types.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { buildServer } from '../index.js'

vi.mock('../db/client.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}))

import { supabase } from '../db/client.js'

const mockAuth = () =>
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  } as any)

describe('GET /admin/event-types', () => {
  it('returns 401 without token', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid' },
    } as any)
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/admin/event-types' })
    expect(res.statusCode).toBe(401)
  })

  it('returns list when authenticated', async () => {
    mockAuth()
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({
        data: [{ id: '1', name: 'Consulta', slug: 'consulta' }],
        error: null,
      }),
    } as any)

    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/admin/event-types',
      headers: { authorization: 'Bearer valid' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/api && pnpm test
```
Expected: FAIL — route not found

- [ ] **Step 3: Create event types routes**

Create `apps/api/src/routes/admin/event-types.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminEventTypeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/admin/event-types', async (_req, reply) => {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return reply.status(500).send({ error: error.message })
    return data
  })

  app.post<{ Body: Record<string, unknown> }>('/admin/event-types', async (req, reply) => {
    const { data, error } = await supabase
      .from('event_types')
      .insert(req.body)
      .select()
      .single()
    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(201).send(data)
  })

  app.get<{ Params: { id: string } }>('/admin/event-types/:id', async (req, reply) => {
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) return reply.status(404).send({ error: 'Not found' })
    return data
  })

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/admin/event-types/:id',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('event_types')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single()
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )

  app.delete<{ Params: { id: string } }>('/admin/event-types/:id', async (req, reply) => {
    const { error } = await supabase
      .from('event_types')
      .delete()
      .eq('id', req.params.id)
    if (error) return reply.status(500).send({ error: error.message })
    return reply.status(204).send()
  })
}
```

- [ ] **Step 4: Create form fields routes**

Create `apps/api/src/routes/admin/form-fields.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminFormFieldRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get<{ Params: { id: string } }>(
    '/admin/event-types/:id/fields',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('event_type_id', req.params.id)
        .order('display_order')
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/admin/event-types/:id/fields',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('form_fields')
        .insert({ ...req.body, event_type_id: req.params.id })
        .select()
        .single()
      if (error) return reply.status(500).send({ error: error.message })
      return reply.status(201).send(data)
    }
  )

  app.put<{ Params: { fieldId: string }; Body: Record<string, unknown> }>(
    '/admin/fields/:fieldId',
    async (req, reply) => {
      const { data, error } = await supabase
        .from('form_fields')
        .update(req.body)
        .eq('id', req.params.fieldId)
        .select()
        .single()
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )

  app.delete<{ Params: { fieldId: string } }>(
    '/admin/fields/:fieldId',
    async (req, reply) => {
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', req.params.fieldId)
      if (error) return reply.status(500).send({ error: error.message })
      return reply.status(204).send()
    }
  )
}
```

- [ ] **Step 5: Register both routes in index.ts**

```typescript
import { adminEventTypeRoutes } from './routes/admin/event-types.js'
import { adminFormFieldRoutes } from './routes/admin/form-fields.js'
// inside buildServer():
await app.register(adminEventTypeRoutes)
await app.register(adminFormFieldRoutes)
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd apps/api && pnpm test
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/
git commit -m "feat: add event types and form fields CRUD routes"
```

---

## Task 8: Slot Generation Service

**Files:**
- Create: `apps/api/src/services/slots.ts`
- Create: `apps/api/src/tests/slots.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/tests/slots.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateSlots, filterAvailableSlots } from '../services/slots.js'
import type { TimeWindow } from '@scheduling/types'

describe('generateSlots', () => {
  it('generates slots from a single window with 30min duration', () => {
    const windows: TimeWindow[] = [{ start: '09:00', end: '10:00' }]
    const slots = generateSlots(windows, 30, 0)
    expect(slots).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '09:30', end: '10:00' },
    ])
  })

  it('generates slots with buffer between them', () => {
    const windows: TimeWindow[] = [{ start: '09:00', end: '10:30' }]
    const slots = generateSlots(windows, 30, 15)
    expect(slots).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '09:45', end: '10:15' },
    ])
  })

  it('generates slots from multiple windows', () => {
    const windows: TimeWindow[] = [
      { start: '09:00', end: '10:00' },
      { start: '14:00', end: '15:00' },
    ]
    const slots = generateSlots(windows, 60, 0)
    expect(slots).toHaveLength(2)
    expect(slots[0].start).toBe('09:00')
    expect(slots[1].start).toBe('14:00')
  })

  it('does not generate a slot that extends beyond window end', () => {
    const windows: TimeWindow[] = [{ start: '09:00', end: '09:45' }]
    const slots = generateSlots(windows, 60, 0)
    expect(slots).toHaveLength(0)
  })
})

describe('filterAvailableSlots', () => {
  it('removes slots overlapping with existing calendar events', () => {
    const slots = [
      { start: '09:00', end: '09:30' },
      { start: '09:30', end: '10:00' },
      { start: '10:00', end: '10:30' },
    ]
    // Busy from 09:30 to 10:00 UTC-3 (America/Sao_Paulo)
    const busyTimes = [
      { start: '2024-06-10T12:30:00Z', end: '2024-06-10T13:00:00Z' },
    ]
    const date = '2024-06-10'
    const timezone = 'America/Sao_Paulo'
    const result = filterAvailableSlots(slots, busyTimes, date, timezone)
    expect(result.map((s) => s.start)).toEqual(['09:00', '10:00'])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/api && pnpm test
```
Expected: FAIL — module `slots.js` not found

- [ ] **Step 3: Implement slot generation**

Create `apps/api/src/services/slots.ts`:

```typescript
import type { TimeWindow } from '@scheduling/types'

export interface Slot {
  start: string  // "HH:MM"
  end: string    // "HH:MM"
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export function generateSlots(
  windows: TimeWindow[],
  durationMinutes: number,
  bufferMinutes: number
): Slot[] {
  const slots: Slot[] = []
  for (const window of windows) {
    const windowStart = timeToMinutes(window.start)
    const windowEnd = timeToMinutes(window.end)
    let current = windowStart
    while (current + durationMinutes <= windowEnd) {
      slots.push({
        start: minutesToTime(current),
        end: minutesToTime(current + durationMinutes),
      })
      current += durationMinutes + bufferMinutes
    }
  }
  return slots
}

export function filterAvailableSlots(
  slots: Slot[],
  busyTimes: { start: string; end: string }[],
  date: string,
  timezone: string
): Slot[] {
  return slots.filter((slot) => {
    // Build slot start/end as UTC timestamps accounting for timezone
    const offsetMs = getTimezoneOffsetMs(timezone, new Date(`${date}T${slot.start}:00Z`))
    const slotStartMs = new Date(`${date}T${slot.start}:00Z`).getTime() - offsetMs
    const slotEndMs = new Date(`${date}T${slot.end}:00Z`).getTime() - offsetMs

    return !busyTimes.some((busy) => {
      const busyStart = new Date(busy.start).getTime()
      const busyEnd = new Date(busy.end).getTime()
      return slotStartMs < busyEnd && slotEndMs > busyStart
    })
  })
}

function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone })
  return new Date(utcStr).getTime() - new Date(tzStr).getTime()
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd apps/api && pnpm test
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/slots.ts apps/api/src/tests/slots.test.ts
git commit -m "feat: add slot generation service with unit tests"
```

---

## Task 9: Public Event Routes + Booking Route + Admin Bookings

**Files:**
- Create: `apps/api/src/routes/public/events.ts`
- Create: `apps/api/src/routes/public/bookings.ts`
- Create: `apps/api/src/routes/admin/bookings.ts`
- Create: `apps/api/src/services/email.ts`
- Modify: `apps/api/src/index.ts` (final version)

- [ ] **Step 1: Create public events routes**

Create `apps/api/src/routes/public/events.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { supabase } from '../../db/client.js'
import { generateSlots, filterAvailableSlots } from '../../services/slots.js'
import { listEventsForDay } from '../../services/google-calendar.js'
import type { PublicEventInfo } from '@scheduling/types'

export async function publicEventRoutes(app: FastifyInstance) {
  app.get<{ Params: { slug: string } }>('/events/:slug', async (req, reply) => {
    const { data: event, error } = await supabase
      .from('event_types')
      .select('id, name, slug, description, duration_minutes, timezone, available_weekdays, time_windows, date_start, date_end, max_future_days, partner_name, partner_logo_url')
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single()

    if (error || !event) return reply.status(404).send({ error: 'Event not found' })

    const { data: config } = await supabase
      .from('admin_config')
      .select('company_name, company_logo_url')
      .single()

    const { data: fields } = await supabase
      .from('form_fields')
      .select('*')
      .eq('event_type_id', event.id)
      .order('display_order')

    const response: PublicEventInfo = {
      event,
      company: config ?? { company_name: '', company_logo_url: null },
      fields: fields ?? [],
    }

    return response
  })

  app.get<{ Params: { slug: string }; Querystring: { date: string } }>(
    '/events/:slug/slots',
    async (req, reply) => {
      const { slug } = req.params
      const { date } = req.query

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: 'Invalid date. Use YYYY-MM-DD' })
      }

      const { data: event, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error || !event) return reply.status(404).send({ error: 'Event not found' })

      const requestedDate = new Date(date + 'T12:00:00Z')
      const dayOfWeek = requestedDate.getUTCDay()
      if (!event.available_weekdays.includes(dayOfWeek)) return []

      const todayMidnight = new Date()
      todayMidnight.setUTCHours(0, 0, 0, 0)

      if (requestedDate < todayMidnight) return []
      if (event.date_start && requestedDate < new Date(event.date_start + 'T00:00:00Z')) return []
      if (event.date_end && requestedDate > new Date(event.date_end + 'T00:00:00Z')) return []
      if (event.max_future_days) {
        const maxDate = new Date(todayMidnight)
        maxDate.setUTCDate(maxDate.getUTCDate() + event.max_future_days)
        if (requestedDate > maxDate) return []
      }

      const allSlots = generateSlots(event.time_windows, event.duration_minutes, event.buffer_minutes)

      let busyTimes: { start: string; end: string }[] = []
      try {
        busyTimes = await listEventsForDay(date)
      } catch {
        // Google Calendar not connected — return all slots as available
      }

      return filterAvailableSlots(allSlots, busyTimes, date, event.timezone)
    }
  )
}
```

- [ ] **Step 2: Create email service**

Create `apps/api/src/services/email.ts`:

```typescript
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
```

- [ ] **Step 3: Create public bookings route**

Create `apps/api/src/routes/public/bookings.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { supabase } from '../../db/client.js'
import { createCalendarEvent } from '../../services/google-calendar.js'
import { sendBookingConfirmation } from '../../services/email.js'

interface BookingBody {
  event_type_id: string
  date: string        // "YYYY-MM-DD"
  slot_start: string  // "HH:MM"
  slot_end: string    // "HH:MM"
  form_data: Record<string, string>
}

export async function publicBookingRoutes(app: FastifyInstance) {
  app.post<{ Body: BookingBody }>('/bookings', async (req, reply) => {
    const { event_type_id, date, slot_start, slot_end, form_data } = req.body

    const { data: event, error: eventError } = await supabase
      .from('event_types')
      .select('*')
      .eq('id', event_type_id)
      .eq('is_active', true)
      .single()

    if (eventError || !event) return reply.status(404).send({ error: 'Event not found' })

    const { data: cfg } = await supabase
      .from('admin_config')
      .select('company_name')
      .single()

    // Create Google Calendar event (optional — don't fail booking if not connected)
    let googleEventId: string | null = null
    try {
      const attendeeEmail = form_data['e-mail'] ?? form_data['email'] ?? ''
      googleEventId = await createCalendarEvent({
        summary: event.partner_name
          ? `${event.name} — ${event.partner_name}`
          : event.name,
        description: Object.entries(form_data).map(([k, v]) => `${k}: ${v}`).join('\n'),
        startDateTime: `${date}T${slot_start}`,
        endDateTime: `${date}T${slot_end}`,
        timezone: event.timezone,
        attendeeEmail,
      })
    } catch {
      // Google Calendar not connected — continue
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        event_type_id,
        google_event_id: googleEventId,
        start_at: new Date(`${date}T${slot_start}:00`).toISOString(),
        end_at: new Date(`${date}T${slot_end}:00`).toISOString(),
        status: 'confirmed',
        form_data,
      })
      .select()
      .single()

    if (bookingError) return reply.status(500).send({ error: 'Failed to save booking' })

    // Fire and forget confirmation email
    const attendeeEmail = form_data['e-mail'] ?? form_data['email']
    if (attendeeEmail) {
      sendBookingConfirmation({
        to: attendeeEmail,
        eventName: event.name,
        date,
        time: slot_start,
        companyName: cfg?.company_name ?? '',
      }).catch(() => {})
    }

    return reply.status(201).send(booking)
  })
}
```

- [ ] **Step 4: Create admin bookings route**

Create `apps/api/src/routes/admin/bookings.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { supabase } from '../../db/client.js'

export async function adminBookingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get<{ Querystring: { event_type_id?: string } }>(
    '/admin/bookings',
    async (req, reply) => {
      let query = supabase
        .from('bookings')
        .select('*, event_types(name, slug)')
        .order('start_at', { ascending: false })

      if (req.query.event_type_id) {
        query = query.eq('event_type_id', req.query.event_type_id)
      }

      const { data, error } = await query
      if (error) return reply.status(500).send({ error: error.message })
      return data
    }
  )
}
```

- [ ] **Step 5: Write final index.ts registering all routes**

Replace `apps/api/src/index.ts` with the complete version:

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { adminConfigRoutes } from './routes/admin/config.js'
import { adminGoogleRoutes } from './routes/admin/google.js'
import { adminEventTypeRoutes } from './routes/admin/event-types.js'
import { adminFormFieldRoutes } from './routes/admin/form-fields.js'
import { adminBookingRoutes } from './routes/admin/bookings.js'
import { publicEventRoutes } from './routes/public/events.js'
import { publicBookingRoutes } from './routes/public/bookings.js'

export async function buildServer() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  await app.register(cors, { origin: true, credentials: true })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(adminConfigRoutes)
  await app.register(adminGoogleRoutes)
  await app.register(adminEventTypeRoutes)
  await app.register(adminFormFieldRoutes)
  await app.register(adminBookingRoutes)
  await app.register(publicEventRoutes)
  await app.register(publicBookingRoutes)

  return app
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildServer()
  await app.listen({ port: config.API_PORT, host: '0.0.0.0' })
}
```

- [ ] **Step 6: Run all API tests**

```bash
cd apps/api && pnpm test
```
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/
git commit -m "feat: add public event/booking routes, email service, admin bookings route"
```

---

## Task 10: Next.js Setup + Admin Auth

**Files:**
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/lib/supabase.ts`
- Create: `apps/web/lib/api-client.ts`
- Create: `apps/web/middleware.ts`
- Create: `apps/web/app/admin/layout.tsx`
- Create: `apps/web/app/admin/page.tsx`

- [ ] **Step 1: Create next.config.mjs**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}
export default nextConfig
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create globals.css**

Create `apps/web/app/globals.css`:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --blue: #003F7D;
  --teal: #007A8C;
  --light: #E8F4F8;
  --accent: #00A99D;
  --warm: #F5F3EE;
  --text: #1A2332;
  --muted: #6B7A8D;
  --border: #D0DCE8;
  --success: #2E7D51;
  --error: #C0392B;
}

body { font-family: 'DM Sans', sans-serif; background: var(--warm); color: var(--text); }
```

- [ ] **Step 4: Create root layout**

Create `apps/web/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agendamento',
  description: 'Sistema de agendamento online',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Create Supabase browser client**

Create `apps/web/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

- [ ] **Step 6: Create typed API client**

Create `apps/web/lib/api-client.ts`:

```typescript
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const needsAuth = options.method && options.method !== 'GET'
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(needsAuth ? await authHeaders() : {}),
    ...options.headers,
  }

  // Admin routes always need auth
  if (path.startsWith('/admin')) {
    Object.assign(headers, await authHeaders())
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
```

- [ ] **Step 7: Create Next.js middleware for admin auth guard**

Create `apps/web/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = req.nextUrl.pathname === '/admin/login'

  if (!isAdminRoute || isLoginPage) return NextResponse.next()

  // Check for Supabase session cookie (set by Supabase JS client)
  const hasSession = req.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (!hasSession) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 8: Create admin layout with sidebar**

Create `apps/web/app/admin/layout.tsx`:

```tsx
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
```

- [ ] **Step 9: Create admin index redirect**

Create `apps/web/app/admin/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
export default function AdminPage() {
  redirect('/admin/events')
}
```

- [ ] **Step 10: Commit**

```bash
git add apps/web/
git commit -m "feat: Next.js setup with Supabase auth, API client, and admin layout"
```

---

## Task 11: Admin CMS Pages (Login + Config + Google Integration)

**Files:**
- Create: `apps/web/app/admin/login/page.tsx`
- Create: `apps/web/app/admin/config/page.tsx`
- Create: `apps/web/app/admin/integration/page.tsx`

- [ ] **Step 1: Create login page**

Create `apps/web/app/admin/login/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-mail ou senha incorretos'); setLoading(false); return }
    router.push('/admin/events')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--warm)' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,63,125,0.12)' }}>
        <h1 style={{ color: 'var(--blue)', marginBottom: 6, fontSize: 24 }}>Painel Admin</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 14 }}>Acesso restrito ao administrador</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          {error && <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 14, background: 'var(--blue)', color: 'white',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create config page**

Create `apps/web/app/admin/config/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Create Google integration page**

Create `apps/web/app/admin/integration/page.tsx`:

```tsx
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'

interface GoogleStatus { connected: boolean; calendar_name: string | null; connected_at: string | null }
interface Calendar { id: string; name: string }

function IntegrationContent() {
  const searchParams = useSearchParams()
  const justConnected = searchParams.get('connected') === 'true'
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    const s = await api.get<GoogleStatus>('/admin/google/status')
    setStatus(s)
    if (s.connected) {
      const cals = await api.get<Calendar[]>('/admin/google/calendars')
      setCalendars(cals)
    }
  }

  async function handleConnect() {
    const { url } = await api.get<{ url: string }>('/admin/google/auth-url')
    window.location.href = url
  }

  async function handleDisconnect() {
    await api.delete('/admin/google')
    setStatus(null); setCalendars([])
    loadStatus()
  }

  async function handleSaveCalendar() {
    const cal = calendars.find((c) => c.id === selectedCalendar)
    if (!cal) return
    setSaving(true)
    await api.put('/admin/google/calendar', { calendar_id: cal.id, calendar_name: cal.name })
    setSaving(false); loadStatus()
  }

  const sectionStyle: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 24, border: '1.5px solid var(--border)', marginBottom: 20 }
  const btnStyle = (color: string): React.CSSProperties => ({
    padding: '10px 20px', background: color, color: 'white',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
  })

  if (!status) return <p style={{ color: 'var(--muted)' }}>Carregando...</p>

  return (
    <div style={{ maxWidth: 580 }}>
      <h1 style={{ marginBottom: 24, color: 'var(--blue)' }}>Google Calendar</h1>

      {justConnected && (
        <div style={{ background: '#E8F5E9', border: '1px solid #2E7D51', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: '#2E7D51', fontSize: 14 }}>
          ✓ Google Calendar conectado com sucesso!
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: status.connected ? '#2E7D51' : '#C0392B' }} />
          <strong style={{ fontSize: 15 }}>{status.connected ? 'Conectado' : 'Desconectado'}</strong>
        </div>
        {status.connected && status.calendar_name && (
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
            Agenda ativa: <strong>{status.calendar_name}</strong>
          </p>
        )}
        {status.connected
          ? <button onClick={handleDisconnect} style={btnStyle('var(--error)')}>Desconectar Google</button>
          : <button onClick={handleConnect} style={btnStyle('var(--blue)')}>Conectar com Google</button>
        }
      </div>

      {status.connected && calendars.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ marginBottom: 14, fontSize: 15 }}>Selecionar Agenda</h3>
          <select value={selectedCalendar} onChange={(e) => setSelectedCalendar(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, marginBottom: 14, fontFamily: 'inherit' }}>
            <option value="">Selecione uma agenda...</option>
            {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleSaveCalendar} disabled={!selectedCalendar || saving} style={btnStyle('var(--blue)')}>
            {saving ? 'Salvando...' : 'Salvar Agenda'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function IntegrationPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--muted)' }}>Carregando...</p>}>
      <IntegrationContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Test login and pages manually**

```bash
cd apps/web && pnpm dev
```
Open http://localhost:3000/admin/login — log in with Supabase credentials.
Expected: Login works, redirects to /admin/events (shows empty page for now).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/
git commit -m "feat: add admin login, config, and Google integration pages"
```

---

## Task 12: Admin Event Types Pages

**Files:**
- Create: `apps/web/app/admin/events/page.tsx`
- Create: `apps/web/app/admin/events/[id]/page.tsx`

- [ ] **Step 1: Create event types list page**

Create `apps/web/app/admin/events/page.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { EventType } from '@scheduling/types'

export default function EventsPage() {
  const [events, setEvents] = useState<EventType[]>([])
  const router = useRouter()

  useEffect(() => { api.get<EventType[]>('/admin/event-types').then(setEvents) }, [])

  async function toggleActive(event: EventType) {
    await api.put(`/admin/event-types/${event.id}`, { is_active: !event.is_active })
    setEvents((es) => es.map((e) => e.id === event.id ? { ...e, is_active: !e.is_active } : e))
  }

  async function deleteEvent(id: string) {
    if (!confirm('Excluir este tipo de evento? Esta ação não pode ser desfeita.')) return
    await api.delete(`/admin/event-types/${id}`)
    setEvents((es) => es.filter((e) => e.id !== id))
  }

  const btn: React.CSSProperties = {
    padding: '6px 14px', background: 'var(--light)', border: '1px solid var(--border)',
    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: 'var(--blue)', fontSize: 22 }}>Tipos de Evento</h1>
        <button onClick={() => router.push('/admin/events/new')} style={{
          padding: '10px 20px', background: 'var(--blue)', color: 'white',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
        }}>
          + Novo Evento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map((event) => (
          <div key={event.id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ display: 'block', marginBottom: 3, fontSize: 15 }}>{event.name}</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                /agendar/{event.slug} · {event.duration_minutes} min · {event.timezone}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: event.is_active ? '#E8F5E9' : '#FFF3E0', color: event.is_active ? '#2E7D51' : '#E65100' }}>
                {event.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <button onClick={() => toggleActive(event)} style={btn}>{event.is_active ? 'Desativar' : 'Ativar'}</button>
              <Link href={`/admin/events/${event.id}`} style={{ ...btn, textDecoration: 'none', color: 'var(--text)' }}>Editar</Link>
              <button onClick={() => deleteEvent(event.id)} style={{ ...btn, color: 'var(--error)' }}>Excluir</button>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ background: 'white', borderRadius: 12, padding: 48, textAlign: 'center', border: '1.5px solid var(--border)' }}>
            <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Nenhum tipo de evento criado ainda.</p>
            <button onClick={() => router.push('/admin/events/new')} style={{ padding: '10px 20px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              Criar primeiro evento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create event type form page (create + edit + form fields builder)**

Create `apps/web/app/admin/events/[id]/page.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import type { EventType, FormField, FieldType, TimeWindow, Weekday } from '@scheduling/types'

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const FIELD_TYPES: FieldType[] = ['text','email','tel','select','textarea','file']
const FIELD_TYPE_LABELS: Record<FieldType, string> = { text:'Texto', email:'E-mail', tel:'Telefone', select:'Lista', textarea:'Texto longo', file:'Arquivo' }

const DEFAULT_EVENT: Partial<EventType> = {
  name: '', slug: '', description: '', duration_minutes: 30, buffer_minutes: 0,
  timezone: 'America/Sao_Paulo', available_weekdays: [1,2,3,4,5] as Weekday[],
  time_windows: [{ start: '09:00', end: '18:00' }],
  is_active: true, max_future_days: 30,
  partner_name: '', partner_logo_url: '', date_start: null, date_end: null,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1.5px solid var(--border)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
}
const sectionStyle: React.CSSProperties = {
  background: 'white', borderRadius: 12, padding: 24,
  border: '1.5px solid var(--border)', marginBottom: 20,
}

export default function EventFormPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === 'new'
  const [event, setEvent] = useState<Partial<EventType>>(DEFAULT_EVENT)
  const [fields, setFields] = useState<FormField[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!isNew) {
      api.get<EventType>(`/admin/event-types/${params.id}`).then(setEvent)
      api.get<FormField[]>(`/admin/event-types/${params.id}/fields`).then(setFields)
    }
  }, [params.id, isNew])

  function set<K extends keyof EventType>(key: K, value: EventType[K]) {
    setEvent((e) => ({ ...e, [key]: value }))
  }

  function toggleWeekday(day: Weekday) {
    const current = event.available_weekdays ?? []
    set('available_weekdays', (current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)) as Weekday[])
  }

  function updateWindow(idx: number, key: keyof TimeWindow, value: string) {
    const windows = [...(event.time_windows ?? [])]
    windows[idx] = { ...windows[idx], [key]: value }
    set('time_windows', windows)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (isNew) {
        const created = await api.post<EventType>('/admin/event-types', event)
        router.push(`/admin/events/${created.id}`)
        return
      }
      await api.put(`/admin/event-types/${params.id}`, event)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function addField() {
    const newField = await api.post<FormField>(
      `/admin/event-types/${params.id}/fields`,
      { label: 'Novo campo', field_type: 'text', is_required: true, display_order: fields.length, placeholder: '' }
    )
    setFields((f) => [...f, newField])
  }

  async function updateField(fieldId: string, updates: Partial<FormField>) {
    await api.put(`/admin/fields/${fieldId}`, updates)
    setFields((fs) => fs.map((f) => f.id === fieldId ? { ...f, ...updates } : f))
  }

  async function deleteField(fieldId: string) {
    await api.delete(`/admin/fields/${fieldId}`)
    setFields((fs) => fs.filter((f) => f.id !== fieldId))
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', fontSize: 14, fontFamily: 'inherit' }}>
          ← Voltar
        </button>
        <h1 style={{ color: 'var(--blue)', fontSize: 20 }}>{isNew ? 'Novo Tipo de Evento' : 'Editar Evento'}</h1>
      </div>

      {/* Basic Info */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Informações Básicas</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Nome do Evento</label>
          <input value={event.name ?? ''} onChange={(e) => set('name', e.target.value)} style={inputStyle} placeholder="ex: Consulta 30min" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Slug (URL pública)</label>
          <input value={event.slug ?? ''} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} style={inputStyle} placeholder="ex: consulta-30min" />
          {event.slug && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>URL: /agendar/{event.slug}</p>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Descrição (exibida na página pública)</label>
          <textarea value={event.description ?? ''} onChange={(e) => set('description', e.target.value)} style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Duração (minutos)</label>
            <input type="number" min={5} value={event.duration_minutes ?? 30} onChange={(e) => set('duration_minutes', Number(e.target.value))} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Intervalo entre slots (min)</label>
            <input type="number" min={0} value={event.buffer_minutes ?? 0} onChange={(e) => set('buffer_minutes', Number(e.target.value))} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Partner */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Empresa Parceira <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 400 }}>(opcional)</span></h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Nome da empresa parceira</label>
            <input value={event.partner_name ?? ''} onChange={(e) => set('partner_name', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>URL do logo parceiro</label>
            <input value={event.partner_logo_url ?? ''} onChange={(e) => set('partner_logo_url', e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Availability */}
      <div style={sectionStyle}>
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Disponibilidade</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Dias da semana disponíveis</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((name, idx) => {
              const active = event.available_weekdays?.includes(idx as Weekday)
              return (
                <button key={idx} type="button" onClick={() => toggleWeekday(idx as Weekday)} style={{
                  padding: '6px 13px', borderRadius: 8, border: '1.5px solid var(--border)',
                  background: active ? 'var(--blue)' : 'white', color: active ? 'white' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                }}>
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Janelas de horário</label>
          {(event.time_windows ?? []).map((w, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
              <input type="time" value={w.start} onChange={(e) => updateWindow(idx, 'start', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>até</span>
              <input type="time" value={w.end} onChange={(e) => updateWindow(idx, 'end', e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
              {(event.time_windows?.length ?? 0) > 1 && (
                <button type="button" onClick={() => set('time_windows', (event.time_windows ?? []).filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 16 }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => set('time_windows', [...(event.time_windows ?? []), { start: '09:00', end: '18:00' }])} style={{ fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Adicionar janela
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Data início</label>
            <input type="date" value={event.date_start ?? ''} onChange={(e) => set('date_start', e.target.value || null)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Data fim</label>
            <input type="date" value={event.date_end ?? ''} onChange={(e) => set('date_end', e.target.value || null)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Máx. dias futuros</label>
            <input type="number" min={1} value={event.max_future_days ?? ''} onChange={(e) => set('max_future_days', e.target.value ? Number(e.target.value) : null)} style={inputStyle} placeholder="ex: 30" />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Fuso horário</label>
          <input value={event.timezone ?? ''} onChange={(e) => set('timezone', e.target.value)} style={inputStyle} placeholder="America/Sao_Paulo" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} style={{
        padding: '12px 28px', background: 'var(--blue)', color: 'white',
        border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', marginBottom: 24, fontFamily: 'inherit',
      }}>
        {saving ? 'Salvando...' : saved ? '✓ Salvo!' : isNew ? 'Criar Evento' : 'Salvar Alterações'}
      </button>

      {/* Form Fields Builder — shown only when editing */}
      {!isNew && (
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15 }}>Campos do Formulário</h3>
            <button onClick={addField} style={{ padding: '8px 16px', background: 'var(--light)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              + Adicionar Campo
            </button>
          </div>
          {fields.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14 }}>Nenhum campo configurado.</p>}
          {fields.map((field) => (
            <div key={field.id} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Label</label>
                  <input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Tipo</label>
                  <select value={field.field_type} onChange={(e) => updateField(field.id, { field_type: e.target.value as FieldType })} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}>
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <button onClick={() => deleteField(field.id)} style={{ marginTop: 20, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={field.is_required} onChange={(e) => updateField(field.id, { is_required: e.target.checked })} />
                  Obrigatório
                </label>
                <input placeholder="Placeholder (opcional)" value={field.placeholder ?? ''} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} style={{ ...inputStyle, padding: '6px 12px', fontSize: 13, flex: 1 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/events/
git commit -m "feat: add admin event types list and create/edit pages with form fields builder"
```

---

## Task 13: Admin Bookings Page

**Files:**
- Create: `apps/web/app/admin/bookings/page.tsx`

- [ ] **Step 1: Create bookings list page**

Create `apps/web/app/admin/bookings/page.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import type { Booking, EventType } from '@scheduling/types'

type BookingWithEvent = Booking & { event_types: Pick<EventType, 'name' | 'slug'> }

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithEvent[]>([])

  useEffect(() => { api.get<BookingWithEvent[]>('/admin/bookings').then(setBookings) }, [])

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' }
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14 }

  return (
    <div>
      <h1 style={{ marginBottom: 24, color: 'var(--blue)', fontSize: 22 }}>Agendamentos</h1>
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: 12, border: '1.5px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--light)' }}>
              <th style={th}>Data/Hora</th>
              <th style={th}>Evento</th>
              <th style={th}>Nome</th>
              <th style={th}>E-mail</th>
              <th style={th}>WhatsApp</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={td}>{formatDateTime(b.start_at)}</td>
                <td style={td}>{b.event_types?.name ?? '—'}</td>
                <td style={td}>{b.form_data['nome'] ?? b.form_data['name'] ?? '—'}</td>
                <td style={td}>{b.form_data['e-mail'] ?? b.form_data['email'] ?? '—'}</td>
                <td style={td}>{b.form_data['whatsapp'] ?? b.form_data['celular'] ?? '—'}</td>
                <td style={td}>
                  <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: '#E8F5E9', color: '#2E7D51' }}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--muted)', padding: 48 }}>Nenhum agendamento ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/admin/bookings/
git commit -m "feat: add admin bookings list page"
```

---

## Task 14: Public Booking Page

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/__tests__/calendar-step.test.tsx`
- Create: `apps/web/__tests__/form-step.test.tsx`
- Create: `apps/web/app/agendar/[slug]/components/PageHeader.tsx`
- Create: `apps/web/app/agendar/[slug]/components/CalendarStep.tsx`
- Create: `apps/web/app/agendar/[slug]/components/SlotsStep.tsx`
- Create: `apps/web/app/agendar/[slug]/components/FormStep.tsx`
- Create: `apps/web/app/agendar/[slug]/components/SuccessStep.tsx`
- Create: `apps/web/app/agendar/[slug]/components/BookingFlow.tsx`
- Create: `apps/web/app/agendar/[slug]/page.tsx`

- [ ] **Step 1: Create vitest config**

Create `apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `apps/web/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Write failing tests**

Create `apps/web/__tests__/calendar-step.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarStep } from '../app/agendar/[slug]/components/CalendarStep'
import type { EventType } from '@scheduling/types'

const mockEvent = {
  available_weekdays: [1,2,3,4,5],
  date_start: null, date_end: null,
  max_future_days: 30, timezone: 'America/Sao_Paulo',
} as Pick<EventType, 'available_weekdays' | 'date_start' | 'date_end' | 'max_future_days' | 'timezone'>

describe('CalendarStep', () => {
  it('renders month navigation buttons', () => {
    render(<CalendarStep event={mockEvent} onSelect={vi.fn()} />)
    expect(screen.getByLabelText('prev-month')).toBeInTheDocument()
    expect(screen.getByLabelText('next-month')).toBeInTheDocument()
  })

  it('calls onSelect with ISO date string when available day clicked', () => {
    const onSelect = vi.fn()
    render(<CalendarStep event={mockEvent} onSelect={onSelect} />)
    const available = document.querySelectorAll('[data-available="true"]')
    if (available.length > 0) {
      fireEvent.click(available[0])
      expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    }
  })
})
```

Create `apps/web/__tests__/form-step.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormStep } from '../app/agendar/[slug]/components/FormStep'
import type { FormField } from '@scheduling/types'

const fields: FormField[] = [
  { id:'1', event_type_id:'e1', label:'Nome', placeholder:'Seu nome', field_type:'text', options:null, is_required:true, display_order:0 },
  { id:'2', event_type_id:'e1', label:'E-mail', placeholder:'seu@email.com', field_type:'email', options:null, is_required:true, display_order:1 },
  { id:'3', event_type_id:'e1', label:'Comentário', placeholder:null, field_type:'textarea', options:null, is_required:false, display_order:2 },
]

describe('FormStep', () => {
  it('renders all configured fields', () => {
    render(<FormStep fields={fields} onSubmit={vi.fn()} onBack={vi.fn()} submitting={false} />)
    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument()
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentário/)).toBeInTheDocument()
  })

  it('marks required fields with asterisk indicator', () => {
    render(<FormStep fields={fields} onSubmit={vi.fn()} onBack={vi.fn()} submitting={false} />)
    const reqMarkers = document.querySelectorAll('[data-required="true"]')
    expect(reqMarkers.length).toBe(2)
  })

  it('shows optional indicator for non-required fields', () => {
    render(<FormStep fields={fields} onSubmit={vi.fn()} onBack={vi.fn()} submitting={false} />)
    expect(screen.getByText('(opcional)')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd apps/web && pnpm test
```
Expected: FAIL — components not found

- [ ] **Step 4: Create PageHeader component**

Create `apps/web/app/agendar/[slug]/components/PageHeader.tsx`:

```tsx
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
```

- [ ] **Step 5: Create CalendarStep component**

Create `apps/web/app/agendar/[slug]/components/CalendarStep.tsx`:

```tsx
'use client'
import { useState } from 'react'
import type { EventType } from '@scheduling/types'

type EventConfig = Pick<EventType, 'available_weekdays' | 'date_start' | 'date_end' | 'max_future_days' | 'timezone'>

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export function CalendarStep({ event, onSelect }: { event: EventConfig; onSelect: (date: string) => void }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  function isAvailable(day: number): boolean {
    const date = new Date(year, month, day)
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0)
    if (date < todayMidnight) return false
    const dow = date.getDay()
    if (!event.available_weekdays.includes(dow as 0|1|2|3|4|5|6)) return false
    if (event.date_start && date < new Date(event.date_start + 'T00:00:00')) return false
    if (event.date_end && date > new Date(event.date_end + 'T00:00:00')) return false
    if (event.max_future_days) {
      const maxDate = new Date(todayMidnight)
      maxDate.setDate(maxDate.getDate() + event.max_future_days)
      if (date > maxDate) return false
    }
    return true
  }

  function toISO(day: number) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <button aria-label="prev-month" onClick={() => changeMonth(-1)} style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #D0DCE8', background:'white', cursor:'pointer', fontSize:16, color:'#003F7D' }}>←</button>
        <h3 style={{ fontFamily:'serif', fontSize:20, color:'#003F7D', textTransform:'capitalize' }}>{MONTH_NAMES[month]} de {year}</h3>
        <button aria-label="next-month" onClick={() => changeMonth(1)} style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #D0DCE8', background:'white', cursor:'pointer', fontSize:16, color:'#003F7D' }}>→</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginBottom:20 }}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'#6B7A8D', padding:'6px 0', textTransform:'uppercase' }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_,i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_,i) => i+1).map((day) => {
          const avail = isAvailable(day)
          const iso = toISO(day)
          const sel = selected === iso
          return (
            <div key={day}
              data-available={avail ? 'true' : undefined}
              onClick={() => { if (!avail) return; setSelected(iso); onSelect(iso) }}
              style={{
                aspectRatio:'1', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:500, cursor: avail ? 'pointer' : 'default',
                background: sel ? '#003F7D' : avail ? '#E8F4F8' : 'transparent',
                color: sel ? 'white' : avail ? '#003F7D' : '#D0DCE8',
                transition:'all 0.2s',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex', gap:20, padding:'14px 16px', background:'#F5F3EE', borderRadius:10, fontSize:12, color:'#6B7A8D' }}>
        {[['#E8F4F8','Disponível'],['#003F7D','Selecionado'],['#D0DCE8','Indisponível']].map(([color, label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />{label}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create SlotsStep component**

Create `apps/web/app/agendar/[slug]/components/SlotsStep.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { SlotResult } from '@scheduling/types'

export function SlotsStep({ slug, date, onSelect, onBack }: {
  slug: string; date: string
  onSelect: (slot: SlotResult) => void; onBack: () => void
}) {
  const [slots, setSlots] = useState<SlotResult[]>([])
  const [selected, setSelected] = useState<SlotResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    fetch(`${apiUrl}/events/${slug}/slots?date=${date}`)
      .then((r) => r.json())
      .then((data) => { setSlots(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug, date])

  const d = new Date(date + 'T12:00:00Z')
  const formattedDate = d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })

  return (
    <div>
      <button onClick={onBack} style={{ background:'none', border:'none', color:'#007A8C', cursor:'pointer', fontSize:13, marginBottom:24, fontFamily:'inherit' }}>
        ← Voltar ao calendário
      </button>

      <div style={{ background:'#E8F4F8', border:'1.5px solid #D0DCE8', borderRadius:10, padding:'12px 18px', display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <div style={{ width:40, height:40, background:'#003F7D', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📅</div>
        <div>
          <strong style={{ display:'block', color:'#003F7D', textTransform:'capitalize' }}>{formattedDate}</strong>
          <span style={{ fontSize:12, color:'#6B7A8D' }}>Selecione um horário disponível</span>
        </div>
      </div>

      {loading ? (
        <p style={{ color:'#6B7A8D', textAlign:'center', padding:32 }}>Carregando horários...</p>
      ) : slots.length === 0 ? (
        <p style={{ color:'#6B7A8D', textAlign:'center', padding:32 }}>Nenhum horário disponível para este dia.</p>
      ) : (
        <>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', color:'#6B7A8D', marginBottom:14 }}>Horários disponíveis</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:28 }}>
            {slots.map((slot) => {
              const sel = selected?.start === slot.start
              return (
                <div key={slot.start} onClick={() => setSelected(slot)} style={{
                  border:`1.5px solid ${sel ? '#003F7D' : '#D0DCE8'}`,
                  borderRadius:10, padding:'12px 8px', textAlign:'center',
                  cursor:'pointer', fontWeight:500, fontSize:15,
                  background: sel ? '#003F7D' : 'white', color: sel ? 'white' : '#003F7D',
                  boxShadow: sel ? '0 4px 16px rgba(0,63,125,0.25)' : 'none', transition:'all 0.2s',
                }}>
                  {slot.start}
                </div>
              )
            })}
          </div>
          <button disabled={!selected} onClick={() => selected && onSelect(selected)} style={{
            width:'100%', padding:15, background:'#003F7D', color:'white',
            border:'none', borderRadius:12, fontSize:15, fontWeight:600,
            cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.6, fontFamily:'inherit',
          }}>
            Avançar →
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create FormStep component**

Create `apps/web/app/agendar/[slug]/components/FormStep.tsx`:

```tsx
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
```

- [ ] **Step 8: Create SuccessStep component**

Create `apps/web/app/agendar/[slug]/components/SuccessStep.tsx`:

```tsx
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
```

- [ ] **Step 9: Create BookingFlow component**

Create `apps/web/app/agendar/[slug]/components/BookingFlow.tsx`:

```tsx
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
```

- [ ] **Step 10: Create SSR public page**

Create `apps/web/app/agendar/[slug]/page.tsx`:

```tsx
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
```

- [ ] **Step 11: Run all web tests — expect PASS**

```bash
cd apps/web && pnpm test
```
Expected: All tests PASS

- [ ] **Step 12: Full end-to-end smoke test**

```bash
# Terminal 1
cd apps/api && pnpm dev

# Terminal 2
cd apps/web && pnpm dev
```

1. Open http://localhost:3000/admin/login — log in
2. Go to /admin/integration — connect Google Calendar
3. Go to /admin/events/new — create an event with slug `teste`
4. Open http://localhost:3000/agendar/teste
5. Select a date → select a time slot → fill form → confirm
6. Check Supabase `bookings` table: new row exists
7. Check Google Calendar: event created
8. Check inbox of the e-mail in the form: confirmation email received

- [ ] **Step 13: Commit**

```bash
git add apps/web/
git commit -m "feat: add complete public booking page with calendar, slots, dynamic form, and success screen"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Turborepo monorepo + pnpm workspaces | Task 1 |
| Shared TypeScript types | Task 2 |
| Supabase PostgreSQL schema | Task 3 |
| Fastify API server with Zod config | Task 4 |
| Supabase JWT auth middleware | Task 5 |
| Admin config CRUD (name, logo, SMTP) | Task 5 |
| Google OAuth connect/disconnect | Task 6 |
| Calendar selection after OAuth | Task 6 |
| Auto-refresh expired Google token | Task 6 |
| Event types CRUD | Task 7 |
| Form fields CRUD | Task 7 |
| Slot generation with duration + buffer | Task 8 |
| Slot filtering with buffer time | Task 8 |
| Public event info endpoint | Task 9 |
| Slots endpoint with date validation | Task 9 |
| Max future days validation | Task 9 |
| Weekday availability check | Task 9 |
| Date range (start/end) check | Task 9 |
| Google Calendar busy time filtering | Task 9 |
| Nodemailer SMTP confirmation email | Task 9 |
| Booking creation route | Task 9 |
| Admin bookings list route | Task 9 |
| Next.js setup + auth guard middleware | Task 10 |
| Admin sidebar layout | Task 10 |
| API client with auto auth headers | Task 10 |
| Admin login page (Supabase Auth) | Task 11 |
| Admin general config + SMTP page | Task 11 |
| Admin Google integration page | Task 11 |
| OAuth success redirect + banner | Task 11 |
| Event types list with status toggle | Task 12 |
| Event type create/edit form | Task 12 |
| Form fields builder (add/remove/type/required) | Task 12 |
| Admin bookings list table | Task 13 |
| Dual-brand header (company + partner) | Task 14 |
| Calendar step with availability logic | Task 14 |
| Time slots grid | Task 14 |
| Dynamic form renderer | Task 14 |
| Required/optional field validation | Task 14 |
| Success screen with booking summary | Task 14 |
| SSR public page with metadata | Task 14 |

All 38 requirements covered. No TBDs or placeholders found. Types are consistent throughout (`SlotResult`, `PublicEventInfo`, `FormField`, `EventType`, `AdminConfig` defined in Task 2, referenced identically in all subsequent tasks).
