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
