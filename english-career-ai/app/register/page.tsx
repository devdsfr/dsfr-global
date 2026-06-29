'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { ArrowRight, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useStore()
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    login({ id: '1', name: name || 'Developer', email, createdAt: new Date().toISOString() })
    router.push('/onboarding')
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid var(--card-border)', background: 'var(--background)',
    color: 'var(--foreground)', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
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
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>Create your account</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 28 }}>Start your journey to an international dev job</p>

          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Your name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Daniel Silva" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'} />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: 10,
              background: loading ? '#3f3f46' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? (
                <><span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Creating account...</>
              ) : (
                <>Create account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Free to start — no credit card required', 'Personalized plan in under 5 minutes', 'AI-powered daily lessons and conversations'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
              <CheckCircle size={14} color="#22c55e" /> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
