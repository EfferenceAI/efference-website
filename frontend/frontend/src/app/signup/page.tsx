'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [profession, setProfession] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Determine which registration endpoint to use based on invitation code
      const hasInvitationCode = invitationCode && invitationCode.trim()
      let registrationEndpoint = '/auth/register'
      const registrationData: {
        name: string
        email: string
        password: string
        invitation_code?: string
        phone_number?: string
        age?: number
        sex?: string
        profession?: string
      } = {
        name,
        email,
        password,
      }

      if (hasInvitationCode) {
        // Use invitation-based registration
        registrationEndpoint = '/auth/register_invite_code'
        registrationData.invitation_code = invitationCode.trim()
      }

      // Add optional fields if they have values
      if (phoneNumber && phoneNumber.trim()) {
        registrationData.phone_number = phoneNumber.trim()
      }
      if (age && age.trim()) {
        registrationData.age = parseInt(age, 10)
      }
      if (sex && sex.trim()) {
        registrationData.sex = sex
      }
      if (profession && profession.trim()) {
        registrationData.profession = profession.trim()
      }

      // Debug: Log what we're sending
      console.log('Registration endpoint:', registrationEndpoint)
      console.log('Registration data:', JSON.stringify(registrationData, null, 2))

      // Register the user
      await apiFetch(registrationEndpoint, {
        method: 'POST',
        body: JSON.stringify(registrationData),
        skipAuth: true,
      })

      // Log in the user through Next.js API to set httpOnly cookie
      const loginApiResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      if (!loginApiResponse.ok) {
        throw new Error('Auto-login failed after registration')
      }

      // Also get token for localStorage (client-side API usage)
      const loginData = await apiFetch<{access_token: string, token_type: string}>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          password
        }),
        skipAuth: true,
      })
      
      // Save the token
      localStorage.setItem('token', loginData.access_token)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Registration error:', err)
      if (err instanceof Error) {
        // Handle specific validation errors
        if (err.message.includes('password') && err.message.includes('8')) {
          setError('Password must be at least 8 characters long')
        } else if (err.message.includes('Email already registered')) {
          setError('An account with this email already exists')
        } else {
          setError(err.message)
        }
      } else {
        setError('Registration failed. Please try again.')
      }
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
                minLength={8}
                required
              />
              {password && password.length < 8 && (
                <p className="text-sm text-red-600 mt-1">Password must be at least 8 characters long</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Phone Number (optional)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="+1 (555) 123-4567"
                maxLength={32}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Age (optional)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="Enter your age"
                min="0"
                max="150"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Gender (optional)</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent bg-white"
              >
                <option value="">Select gender (optional)</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1">Profession (optional)</label>
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="e.g., Software Engineer, Teacher, Student"
                maxLength={100}
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
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[#666]">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-[#A2AF9B] hover:text-[#8fa085] font-medium underline"
              >
                Log in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
