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
      // Always use invitation code endpoint (mandatory)
      const registrationEndpoint = '/auth/register_invite_code'
      const registrationData: {
        name: string
        email: string
        password: string
        invitation_code: string
        phone_number?: string
        age?: number
        sex?: string
        profession?: string
      } = { name, email, password, invitation_code: invitationCode.trim() }
      if (phoneNumber.trim()) registrationData.phone_number = phoneNumber.trim()
      if (age.trim()) registrationData.age = parseInt(age, 10)
      if (sex.trim()) registrationData.sex = sex
      if (profession.trim()) registrationData.profession = profession.trim()

      await apiFetch(registrationEndpoint, {
        method: 'POST',
        body: JSON.stringify(registrationData),
        skipAuth: true,
      })

      const loginApiResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!loginApiResponse.ok) throw new Error('Auto-login failed after registration')

      const loginData = await apiFetch<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      })

      localStorage.setItem('token', loginData.access_token)
      router.push('/dashboard')
    } catch (err) {
      console.error('Registration error:', err)
      if (err instanceof Error) {
        if (err.message.includes('password') && err.message.includes('8'))
          setError('Password must be at least 8 characters long')
        else if (err.message.includes('Email already registered'))
          setError('An account with this email already exists')
        else setError(err.message)
      } else setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8 text-black">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 text-white">
          <h1
            className="text-4xl font-black uppercase tracking-tight"
            style={{
              WebkitTextStrokeWidth: '1.2px',
              WebkitTextStrokeColor: '#fff',
              color: 'transparent',
              fontFamily: "'Space Grotesk','Montserrat','Poppins',ui-sans-serif,system-ui'",
              transform: 'scaleY(0.85) scaleX(1.1)',
              letterSpacing: '-0.02em',
            }}
          >
            EFFERENCE
          </h1>
          <p className="text-xs mt-2 uppercase tracking-widest">Create your account</p>
        </div>

        {/* White Signup Box */}
        <div className="bg-white border-2 border-white p-8 shadow-none">
          <h2 className="text-xl font-black uppercase text-center mb-6 text-black">Sign up</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full name', type: 'text', value: name, set: setName, req: true, ph: 'Jane Doe' },
              { label: 'Email', type: 'email', value: email, set: setEmail, req: true, ph: 'you@example.com' },
              { label: 'Password', type: 'password', value: password, set: setPassword, req: true, ph: '••••••••' },
              { label: 'Invitation code', type: 'text', value: invitationCode, set: setInvitationCode, req: true, ph: 'Enter invitation code' },
              { label: 'Phone Number (optional)', type: 'tel', value: phoneNumber, set: setPhoneNumber, req: false, ph: '+1 (555) 123-4567' },
              { label: 'Age (optional)', type: 'number', value: age, set: setAge, req: false, ph: 'Enter your age' },
              { label: 'Profession (optional)', type: 'text', value: profession, set: setProfession, req: false, ph: 'e.g., Software Engineer, Student' },
            ].map(({ label, type, value, set, req, ph }) => (
              <div key={label}>
                <label className="block text-xs font-bold uppercase mb-1 text-black">{label}</label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  required={req}
                  placeholder={ph}
                  className="w-full px-3 py-2 border-2 border-black bg-white text-black focus:bg-black focus:text-white outline-none transition-colors"
                />
              </div>
            ))}

            {/* Gender Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-black">Gender (optional)</label>
              <div className="relative">
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black bg-white text-black focus:bg-black focus:text-white outline-none appearance-none transition-colors"
                >
                  <option value="">Select gender (optional)</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-black">
                  ▼
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full border-2 border-black bg-black text-white py-3 font-bold uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {error && <p className="text-xs text-red-600 text-center mt-4">{error}</p>}

          <div className="mt-6 text-center text-black">
            <p className="text-xs">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="underline font-bold hover:bg-black hover:text-white px-1"
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
