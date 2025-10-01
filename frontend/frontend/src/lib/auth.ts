import { apiFetch, setToken, clearToken, getStoredToken } from './api'
import 'server-only';

export interface LoginForm {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface User {
  user_id: string
  name: string
  email: string
  role: 'ADMIN' | 'WORKER' | 'REVIEWER' | 'CLIENT'
  is_invited: boolean
  created_at: string
}

export async function login({ email, password }: LoginForm): Promise<User> {
  const token = await apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  })
  setToken(token.access_token)
  // fetch user profile
  const me = await apiFetch<User>('/auth/me')
  return me
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout')
  } catch {
    // ignore errors on logout since it's stateless server-side
  }
  clearToken()
}

export async function getMe(): Promise<User | null> {
  const token = getStoredToken()
  if (!token) return null
  try {
    const me = await apiFetch<User>('/auth/me')
    return me
  } catch {
    clearToken()
    return null
  }
}
