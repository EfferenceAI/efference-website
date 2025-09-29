'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { login } from '@/lib/auth'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (invitationCode.trim()) {
        await apiFetch('/auth/register_invite_code', {
          method: 'POST',
          skipAuth: true,
          body: JSON.stringify({ name, email, password, invitation_code: invitationCode.trim() }),
        })
      } else {
        await apiFetch('/auth/register', {
          method: 'POST',
          skipAuth: true,
          body: JSON.stringify({ name, email, password }),
        })
      }

      // Set httpOnly cookie via Next API and localStorage token for client calls
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        throw new Error('Signup succeeded, but auto-login failed')
      }
      await login({ email, password })
      router.push('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9EE] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">Efference</h1>
          <p className="text-[#666] text-lg">Create your account</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-8">
          <h2 className="text-xl font-semibold text-[#111111] mb-6 text-center">
            Sign up
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Invitation code (optional)</label>
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="Enter invitation code if you have one"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md hover:bg-[#8fa085] transition-colors font-medium disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {error && (
            <p className="text-sm text-red-600 text-center mt-4">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
