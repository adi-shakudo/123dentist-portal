import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  onLogin: (role: string, clinicId: string | null) => void
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotError, setForgotError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      })
      if (r.ok) {
        const data = await r.json()
        onLogin(data.role, data.clinic_id)
      } else {
        const body = await r.json().catch(() => ({}))
        setError(body.detail || 'Invalid username or password')
      }
    } catch {
      setError('Network error — could not reach the server')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')
    setForgotMsg('')
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername.trim().toLowerCase() }),
      })
      const body = await r.json().catch(() => ({}))
      if (r.ok) {
        setForgotMsg('Password reset. Check your email for your new credentials.')
      } else {
        setForgotError(body.detail || 'Could not reset password. Check your username.')
      }
    } catch {
      setForgotError('Network error — please try again')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[#1e3a4f] mb-4">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTyAGrj-_mCPA_rC69bx9PkCJ4hD-gPcuNI0Q&s"
              alt="123Dentist"
              className="h-10 w-10 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-[#1a2a38] tracking-tight">123Dentist Onboarding</h1>
          <p className="text-sm text-[#6b7a8d] mt-1">Partner Portal</p>
        </div>

        {view === 'login' ? (
          <div className="bg-white rounded-2xl border border-[#dde4ed] shadow-sm p-8">
            <h2 className="text-lg font-semibold text-[#1a2a38] mb-6">Sign in to your account</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide block mb-1.5">
                  Username
                </label>
                <input
                  className="w-full border border-[#dde4ed] rounded-lg px-3 py-2.5 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5] focus:border-transparent transition-colors"
                  placeholder="your-clinic-name"
                  value={username}
                  autoComplete="username"
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="w-full border border-[#dde4ed] rounded-lg px-3 py-2.5 pr-10 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5] focus:border-transparent transition-colors"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    autoComplete="current-password"
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7a8d] hover:text-[#1a2a38]"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-[#1e3a4f] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#284d65] transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => { setView('forgot'); setError('') }}
                className="text-sm text-[#2e8fb5] hover:text-[#1e3a4f] transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#dde4ed] shadow-sm p-8">
            <button
              onClick={() => { setView('login'); setForgotMsg(''); setForgotError('') }}
              className="text-sm text-[#6b7a8d] hover:text-[#1a2a38] transition-colors mb-5 flex items-center gap-1"
            >
              ← Back to sign in
            </button>
            <h2 className="text-lg font-semibold text-[#1a2a38] mb-2">Reset your password</h2>
            <p className="text-sm text-[#6b7a8d] mb-6">
              Enter your username. We'll send new credentials to your registered email address.
            </p>

            {forgotMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="text-sm text-emerald-700 font-medium">{forgotMsg}</p>
                <button
                  onClick={() => { setView('login'); setForgotMsg(''); setForgotUsername('') }}
                  className="text-sm text-[#2e8fb5] mt-3 hover:underline"
                >
                  Back to sign in →
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#6b7a8d] uppercase tracking-wide block mb-1.5">
                    Username
                  </label>
                  <input
                    className="w-full border border-[#dde4ed] rounded-lg px-3 py-2.5 text-sm text-[#1a2a38] focus:outline-none focus:ring-2 focus:ring-[#2e8fb5] focus:border-transparent"
                    placeholder="your-clinic-name"
                    value={forgotUsername}
                    onChange={e => setForgotUsername(e.target.value)}
                    required
                  />
                </div>
                {forgotError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{forgotError}</p>
                )}
                <button
                  type="submit"
                  disabled={forgotLoading || !forgotUsername}
                  className="w-full bg-[#1e3a4f] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#284d65] transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-xs text-[#6b7a8d] mt-6">
          Credentials are sent to your clinic's contact email when your account is created.
        </p>
      </div>
    </div>
  )
}
