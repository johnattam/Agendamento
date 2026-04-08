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
