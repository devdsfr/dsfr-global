'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('daniel@example.com')
  const [password, setPassword] = useState('password')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useStore()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    if (!email || !password) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }
    login({ id: '1', name: 'Daniel', email, createdAt: new Date().toISOString() })
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🌊</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--foreground)' }}>English Career AI</span>
        </Link>

        <div className="animate-fade-in" style={{
          background: 'var(--card)', border: '1px solid var(--card-border)',
          borderRadius: 20, padding: 36,
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>Welcome back</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 28 }}>Continue your journey to an international job</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--foreground)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1px solid var(--card-border)', background: 'var(--background)',
                  color: 'var(--foreground)', fontSize: 15, outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--foreground)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '10px 44px 10px 14px', borderRadius: 10,
                    border: '1px solid var(--card-border)', background: 'var(--background)',
                    color: 'var(--foreground)', fontSize: 15, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444', fontSize: 14,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: loading ? '#3f3f46' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.2s',
            }}>
              {loading ? (
                <><span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Signing in...</>
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Sign up free</Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          💡 Demo: just click Sign in with the pre-filled credentials
        </p>
      </div>
    </div>
  )
}
