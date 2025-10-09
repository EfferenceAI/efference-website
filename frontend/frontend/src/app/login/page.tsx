'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Login failed')
      }
      await login({ email, password })
      router.push('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-md w-full border-2 border-white bg-white p-10">
        <h1
          className="text-center text-4xl font-black uppercase tracking-tight"
          style={{
            WebkitTextStrokeWidth: '1.2px',
            WebkitTextStrokeColor: '#000000ff',
            color: 'transparent',
            fontFamily: "'Space Grotesk','Montserrat','Poppins',ui-sans-serif,system-ui'",
            transform: 'scaleY(0.85) scaleX(1.1)',
            letterSpacing: '-0.02em',
          }}
        >
          EFFERENCE
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-black uppercase mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-black px-3 py-2 bg-transparent text-black focus:outline-none focus:bg-black focus:text-white transition-all"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-black uppercase mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-black px-3 py-2 bg-transparent text-black focus:outline-none focus:bg-black focus:text-white transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-black bg-black text-white py-3 font-bold uppercase tracking-wide hover:bg-white hover:text-black transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {error && (
            <p className="text-sm text-red-600 text-center font-mono mt-2">
              {error}
            </p>
          )}
        </form>

        <div className="border-t-2 border-black mt-8 pt-6 text-center">
          <p className="text-xs uppercase text-black">
            Don’t have an account?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="underline font-bold hover:bg-black hover:text-white px-1"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
