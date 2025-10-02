// Simple API client for calling the FastAPI backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://gm6cgy8uoa.execute-api.us-east-1.amazonaws.com/prod'

type FetchOptions = RequestInit & { skipAuth?: boolean }

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (!options.skipAuth) {
    const token = getToken()
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(url, { ...options, headers })

  let data: unknown = null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null)
  } else {
    data = await res.text().catch(() => null)
  }

  if (!res.ok) {
    const err = (data ?? {}) as Record<string, unknown>
    const message = (typeof err.detail === 'string' && err.detail)
      || (typeof err.message === 'string' && err.message)
      || (typeof err.error === 'string' && err.error)
      || `Request failed with ${res.status}`
    throw new Error(message)
  }

  return data as T
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token)
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
  }
}

export function getStoredToken(): string | null {
  return getToken()
}
