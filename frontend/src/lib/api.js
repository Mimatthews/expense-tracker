const BASE = import.meta.env.VITE_API_URL || ''

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (res.status === 204) return null

  let body = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    // FastAPI validation errors arrive as { detail: [{ msg, loc }] }
    let message = 'Something went wrong.'
    if (typeof body?.detail === 'string') message = body.detail
    else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
      message = body.detail[0].msg.replace(/^Value error, /, '')
    }
    throw new ApiError(message, res.status, body?.detail)
  }

  return body
}

const qs = (params) => {
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  })
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const api = {
  health: () => request('/api/health'),

  listTransactions: (params) => request(`/api/transactions${qs(params)}`),
  createTransaction: (payload) =>
    request('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) =>
    request(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),

  listCategories: (params) => request(`/api/categories${qs(params)}`),
  createCategory: (payload) =>
    request('/api/categories', { method: 'POST', body: JSON.stringify(payload) }),
  updateCategory: (id, payload) =>
    request(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  summary: (month, months = 6) =>
    request(`/api/summary${qs({ month, trend_months: months })}`),
}

export { ApiError }
