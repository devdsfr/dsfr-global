'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { ArrowRight, Target, Globe, Briefcase, GraduationCap, Plane } from 'lucide-react'

const objectives = [
  {
    id: 'dev-job',
    icon: Briefcase,
    title: 'International Dev Job',
    desc: 'Get hired by a US/EU/remote tech company',
    available: true,
    badge: 'MVP',
  },
  {
    id: 'exchange',
    icon: GraduationCap,
    title: 'Exchange Program',
    desc: 'Study abroad at a university',
    available: false,
  },
  {
    id: 'travel',
    icon: Plane,
    title: 'Travel & Living Abroad',
    desc: 'Move and live in another country',
    available: false,
  },
  {
    id: 'business',
    icon: Globe,
    title: 'Business English',
    desc: 'Lead international meetings and deals',
    available: false,
  },
]

export default function OnboardingPage() {
  const [selected, setSelected] = useState('dev-job')
  const router = useRouter()
  const { completeOnboarding, user } = useStore()

  const handleContinue = () => {
    completeOnboarding()
    router.push('/onboarding/job')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--background)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 20px',
          }}>🎯</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em' }}>
            Welcome, {user?.name?.split(' ')[0] || 'Developer'}! 👋
          </h1>
          <p style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.6 }}>
            What&apos;s your main goal? We&apos;ll build your entire English journey around it.
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 28 }}>
          {objectives.map(({ id, icon: Icon, title, desc, available, badge }) => (
            <button
              key={id}
              onClick={() => available && setSelected(id)}
              disabled={!available}
              style={{
                padding: '20px', borderRadius: 14, textAlign: 'left',
                border: selected === id ? '2px solid #6366f1' : '1px solid var(--card-border)',
                background: selected === id ? 'rgba(99,102,241,0.1)' : 'var(--card)',
                cursor: available ? 'pointer' : 'not-allowed',
                opacity: available ? 1 : 0.5,
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {badge && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  fontSize: 10, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 100, background: 'rgba(99,102,241,0.2)',
                  color: '#818cf8', letterSpacing: '0.05em',
                }}>{badge}</span>
              )}
              {!available && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  fontSize: 10, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 100, background: 'rgba(113,113,122,0.2)',
                  color: 'var(--muted)',
                }}>Coming soon</span>
              )}
              <div style={{
                width: 40, height: 40, borderRadius: 10, marginBottom: 12,
                background: selected === id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={selected === id ? '#818cf8' : 'var(--muted)'} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: selected === id ? '#818cf8' : 'var(--foreground)' }}>
                {title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button onClick={handleContinue} style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', fontSize: 16, fontWeight: 700, border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8,
          boxShadow: '0 0 20px rgba(99,102,241,0.3)',
        }}>
          Continue <ArrowRight size={18} />
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>
          <Target size={12} style={{ display: 'inline', marginRight: 4 }} />
          You can change your goal later in settings
        </p>
      </div>
    </div>
  )
}
