'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ArrowRight, Zap, Target, Mic, BarChart3, CheckCircle, Star } from 'lucide-react'

const features = [
  { icon: Target, title: 'Job-Focused Learning', desc: 'Paste a job description and get a personalized English plan built around that exact role.' },
  { icon: Zap, title: 'AI-Powered Assessment', desc: 'Know your exact level in Speaking, Listening, Grammar, and Vocabulary in 10 minutes.' },
  { icon: Mic, title: 'Voice Conversations', desc: 'Practice speaking with AI. Get real-time pronunciation, fluency and confidence scores.' },
  { icon: BarChart3, title: 'Job Readiness Score', desc: 'Not "B2 level" but "72% ready for your target job." Clear, actionable, motivating.' },
]

const testimonials = [
  { name: 'Lucas M.', role: 'Backend Dev at Stripe', flag: 'BR', quote: 'Got my first US offer 6 months after starting. The interview simulations were the key.', score: 94 },
  { name: 'Ana P.', role: 'Frontend Dev at Shopify', flag: 'BR', quote: 'I went from 23% to 88% readiness in 4 months. The vocabulary was exactly what I needed.', score: 88 },
  { name: 'Rafael K.', role: 'Fullstack at Vercel', flag: 'BR', quote: 'The daily standup simulations made my first English interview feel like practice.', score: 91 },
]

const stats = [
  { value: '2,400+', label: 'Developers trained' },
  { value: '87%', label: 'Got interviews in 6 months' },
  { value: '4.2x', label: 'Average salary increase' },
  { value: '34', label: 'Hiring countries' },
]

export default function LandingPage() {
  const { isAuthenticated } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard')
  }, [isAuthenticated, router])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--card-border)',
        position: 'sticky', top: 0, background: 'rgba(9,9,11,0.9)',
        backdropFilter: 'blur(12px)', zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>E</div>
          <span style={{ fontWeight: 700, fontSize: 17 }}>English Career AI</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" style={{
            padding: '8px 20px', borderRadius: 8, border: '1px solid var(--card-border)',
            color: 'var(--foreground)', fontSize: 14, fontWeight: 500, textDecoration: 'none',
          }}>Sign in</Link>
          <Link href="/register" style={{
            padding: '8px 20px', borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 40px 80px', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
        <div className="animate-fade-in" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
          borderRadius: 100, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
          marginBottom: 28, fontSize: 13, color: '#818cf8',
        }}>
          New: Interview Readiness Score -- know exactly when you are ready
        </div>
        <h1 className="animate-fade-in stagger-1" style={{
          fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.1,
          marginBottom: 24, letterSpacing: '-0.03em',
        }}>
          Learn English for{' '}
          <span className="gradient-text">your next</span>
          <br />international dev job
        </h1>
        <p className="animate-fade-in stagger-2" style={{
          fontSize: 20, color: 'var(--muted)', lineHeight: 1.6,
          maxWidth: 580, margin: '0 auto 40px',
        }}>
          Paste a job description. Get a personalized AI study plan, daily conversations,
          mock interviews, and a real-time score showing how ready you are.
        </p>
        <div className="animate-fade-in stagger-3" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 0 30px rgba(99,102,241,0.4)',
          }}>
            Start for free <ArrowRight size={18} />
          </Link>
          <Link href="/login" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 12,
            border: '1px solid var(--card-border)', color: 'var(--foreground)',
            fontSize: 16, fontWeight: 600, textDecoration: 'none',
          }}>
            Sign in
          </Link>
        </div>
        <p className="animate-fade-in stagger-4" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>
          No credit card required -- Takes 5 minutes to set up
        </p>
      </section>

      {/* Stats */}
      <section style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1, background: 'var(--card-border)', margin: '0 40px',
        border: '1px solid var(--card-border)', borderRadius: 16, overflow: 'hidden',
      }}>
        {stats.map(({ value, label }) => (
          <div key={label} style={{ padding: '32px 24px', textAlign: 'center', background: 'var(--card)' }}>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }} className="gradient-text">{value}</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Everything you need to get the job
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 48, fontSize: 17 }}>
          Not generic English. English for your specific job.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-hover" style={{
              padding: 28, borderRadius: 16, border: '1px solid var(--card-border)',
              background: 'var(--card)', cursor: 'default',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Icon size={22} color="#818cf8" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{
        padding: '60px 40px', background: 'var(--card)',
        borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 48, letterSpacing: '-0.02em' }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[
              { step: '01', title: 'Paste your job', desc: 'Drop the job description, PDF or LinkedIn link' },
              { step: '02', title: 'AI analyzes it', desc: 'Extracts vocabulary, skills, and English level required' },
              { step: '03', title: 'Get your plan', desc: 'A personalized month-by-month study roadmap' },
              { step: '04', title: 'Track readiness', desc: 'Live score showing % ready to ace the interview' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
                  background: 'rgba(99,102,241,0.1)', border: '2px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 800, color: '#818cf8',
                }}>{step}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 48, letterSpacing: '-0.02em' }}>
          Developers who got the job
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {testimonials.map(({ name, role, flag, quote, score }) => (
            <div key={name} className="card-hover" style={{
              padding: 28, borderRadius: 16, border: '1px solid var(--card-border)',
              background: 'var(--card)',
            }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="#eab308" color="#eab308" />)}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--foreground)', marginBottom: 20, fontStyle: 'italic' }}>
                &ldquo;{quote}&rdquo;
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>[{flag}] {name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{role}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 100,
                  background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  fontSize: 13, fontWeight: 700, color: '#22c55e',
                }}>
                  {score}% ready
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 40px', textAlign: 'center',
        background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.05))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {['No credit card', 'Cancel anytime', 'Start in 5 min'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted)' }}>
              <CheckCircle size={15} color="#22c55e" /> {t}
            </div>
          ))}
        </div>
        <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>
          Ready to get your international job?
        </h2>
        <p style={{ fontSize: 18, color: 'var(--muted)', marginBottom: 36 }}>
          Join 2,400+ Brazilian developers who already landed international roles.
        </p>
        <Link href="/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '16px 36px', borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', fontSize: 18, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 0 40px rgba(99,102,241,0.4)',
        }}>
          Start learning today <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 40px', borderTop: '1px solid var(--card-border)',
        textAlign: 'center', color: 'var(--muted)', fontSize: 13,
      }}>
        2026 English Career AI -- Built for Brazilian developers going global
      </footer>
    </div>
  )
}
