# Sistema de Agendamento com Google Calendar — Design Spec

**Data:** 2026-04-08  
**Status:** Aprovado

---

## Visão Geral

Sistema de agendamento conectado ao Google Calendar API. Composto por uma página pública para convidados agendarem horários e um painel CMS para o administrador configurar eventos, disponibilidade, formulários e integrações.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend público + CMS | Next.js 14 (App Router) |
| Backend API | Fastify |
| Banco de dados | Supabase (PostgreSQL) |
| Auth admin | Supabase Auth (email/senha) |
| Google Calendar | googleapis (OAuth 2.0) |
| E-mail | Nodemailer (SMTP configurável) |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Vercel (web) + Railway (api) |

---

## Estrutura do Projeto

```
/
├── apps/
│   ├── web/          → Next.js 14 (App Router)
│   │   ├── /agendar/[slug]   → Página pública de agendamento
│   │   └── /admin            → Painel CMS (rota protegida)
│   └── api/          → Fastify
└── packages/
    └── types/        → Tipos TypeScript compartilhados
```

---

## Painel CMS — Módulos

### 1. Configurações Gerais
- Nome da empresa, logo, endereço, telefone
- Configuração SMTP: host, porta, usuário, senha, e-mail remetente, nome remetente
- Fuso horário padrão

### 2. Integração Google
- Botão "Conectar com Google" (OAuth 2.0)
- Seleção da agenda a usar após conectar
- Status da conexão (conectado/desconectado)

### 3. Tipos de Evento
Cada evento configura:
- Nome e slug da URL pública (ex: `consulta-30min`)
- Duração padrão em minutos
- Empresa parceira: nome + logo (opcional, um por evento)
- Descrição exibida na página pública
- Intervalo de datas (data início e fim)
- Limite de dias futuros (ex: máximo 30 dias a partir de hoje)
- Dias da semana disponíveis (checkboxes seg–dom)
- Janela de horários por dia (ex: 08:00–12:00 e 13:00–17:00)
- Fuso horário do evento
- Campos do formulário dinâmicos
- Status (ativo/inativo)

### 4. Campos do Formulário por Evento
- Adicionar/remover campos
- Tipos: texto, e-mail, telefone, select, textarea, upload de arquivo
- Configurar: label, placeholder, obrigatório/opcional, ordem de exibição
- Campos padrão: nome, e-mail, WhatsApp, comentário (opcional)

### 5. Agendamentos (leitura)
- Lista de todos os agendamentos por evento
- Dados do convidado + data/horário agendado

---

## Banco de Dados (Supabase/PostgreSQL)

```sql
admin_config
  id, company_name, company_logo_url, address, phone
  smtp_host, smtp_port, smtp_user, smtp_password (criptografado)
  smtp_from_email, smtp_from_name
  default_timezone, updated_at

google_integration
  id, access_token, refresh_token, calendar_id, calendar_name
  connected_at, expires_at

event_types
  id, name, slug (único), description
  duration_minutes, buffer_minutes
  partner_name, partner_logo_url
  date_start, date_end
  max_future_days
  timezone
  available_weekdays (int[]: [1,2,3,4,5])
  time_windows (jsonb: [{start:"08:00", end:"12:00"}, ...])
  is_active, created_at, updated_at

form_fields
  id, event_type_id (fk), label, placeholder
  field_type (text|email|tel|select|textarea|file)
  options (jsonb — para campos tipo select)
  is_required, display_order

bookings
  id, event_type_id (fk)
  google_event_id
  start_at (timestamptz), end_at (timestamptz)
  status (confirmed)
  form_data (jsonb — respostas do convidado)
  created_at
```

---

## Fluxos Principais

### Fluxo do Convidado (página pública)

1. Acessa `/agendar/[slug]`
2. Vê cabeçalho com logo da empresa admin + empresa parceira do evento
3. Seleciona data no calendário (dias disponíveis vindos da API)
4. Seleciona horário (slots gerados pela config do evento, cruzados com Google Calendar)
5. Preenche formulário dinâmico configurado no CMS
6. Submete:
   - API cria evento no Google Calendar
   - Envia e-mail de confirmação via SMTP
   - Salva booking no Supabase
7. Vê tela de sucesso com resumo do agendamento

### Fluxo do Admin (CMS)

1. Login em `/admin` com e-mail + senha (Supabase Auth)
2. Conecta Google Calendar via OAuth 2.0 (uma vez)
3. Seleciona qual agenda recebe os eventos
4. Cria tipos de evento com todas as configurações
5. Compartilha URL pública `/agendar/[slug]` com convidados
6. Consulta agendamentos na listagem

### Geração de Slots Disponíveis (lógica central da API)

```
API recebe: event_type_id + data escolhida
1. Busca config do evento (duração, janela de horários, fuso)
2. Gera todos os slots possíveis para aquela data
3. Busca eventos existentes no Google Calendar para o dia
4. Remove slots ocupados ou com conflito de horário
5. Retorna slots livres ao frontend
```

---

## Página Pública — Design de Referência

Base visual: `agendamento-sarah.html` (fornecido pelo cliente)

- Paleta: azul `#003F7D`, teal `#007A8C`, warm `#F5F3EE`, accent `#00A99D`
- Fontes: DM Serif Display (títulos) + DM Sans (corpo)
- Layout: card central com sombra, progress bar de 4 etapas
- Etapas: Data → Horário → Formulário → Confirmação
- Responsivo (mobile-first)

O cabeçalho exibe: logo + nome da empresa do admin + logo + nome da empresa parceira (configurado por evento).

---

## Decisões de Escopo

- Admin único (sem multi-tenant por enquanto)
- Agendamento definitivo — sem cancelamento/reagendamento pelo convidado
- Confirmação por e-mail ao convidado (sem link de reagendamento)
- Sem geração de link de videoconferência por enquanto
- Suporte a presencial e remoto (campo no evento, sem automação de link)
