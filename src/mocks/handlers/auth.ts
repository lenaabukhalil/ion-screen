import { delay, http, HttpResponse } from 'msw'
import { getDb, persistDb, type MockUser } from '../db'
import { apiPath } from '../utils'

function parseUserId(request: Request): number | null {
  const h = request.headers.get('Authorization')
  if (!h?.startsWith('Bearer mock.jwt.')) return null
  const id = Number(h.slice('Bearer mock.jwt.'.length))
  return Number.isFinite(id) ? id : null
}

export function getAuthUser(request: Request): MockUser | null {
  const id = parseUserId(request)
  if (id == null) return null
  const db = getDb()
  return db.users.find((u) => u.user_id === id) ?? null
}

export const authHandlers = [
  http.post(apiPath('/api/v4/auth/login'), async ({ request }) => {
    const body = (await request.json()) as { identifier?: string; password?: string }
    const id = String(body.identifier ?? '').trim().toLowerCase()
    if (!id) {
      return HttpResponse.json({ success: false, message: 'identifier مطلوب' }, { status: 400 })
    }
    const db = getDb()
    const user = db.users.find(
      (u) => u.email.toLowerCase() === id || u.mobile.replace(/\s/g, '') === id.replace(/\s/g, ''),
    )
    if (!user) {
      return HttpResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 401 })
    }
    const token = `mock.jwt.${user.user_id}`
    return HttpResponse.json({
      success: true,
      data: {
        token,
        user,
        permissions: {},
      },
    })
  }),

  http.get(apiPath('/api/v4/auth/me'), ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 })
    }
    return HttpResponse.json({
      success: true,
      data: { user, permissions: {} },
    })
  }),

  http.post(apiPath('/api/v4/auth/logout'), () => {
    return HttpResponse.json({ success: true, data: {} })
  }),

  http.put(apiPath('/api/v4/auth/profile'), async ({ request }) => {
    const user = getAuthUser(request)
    if (!user) {
      return HttpResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 })
    }
    const body = (await request.json()) as {
      f_name?: string
      l_name?: string
      email?: string
      mobile?: string
    }
    const db = getDb()
    const idx = db.users.findIndex((u) => u.user_id === user.user_id)
    if (idx === -1) {
      return HttpResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 })
    }
    const updated: MockUser = {
      ...db.users[idx],
      f_name: body.f_name ?? db.users[idx].f_name,
      l_name: body.l_name ?? db.users[idx].l_name,
      email: body.email ?? db.users[idx].email,
      mobile: body.mobile ?? db.users[idx].mobile,
    }
    db.users[idx] = updated
    persistDb()
    await delay(50)
    return HttpResponse.json({ success: true, data: updated })
  }),
]
