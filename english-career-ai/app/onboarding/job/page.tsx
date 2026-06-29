'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { analyzeJobPosting } from '@/lib/mock-ai'
import { ArrowRight, FileText, Link as LinkIcon, Upload, CheckCircle, Sparkles, Code, Users, MessageSquare } from 'lucide-react'

type InputMode = 'text' | 'link'

export default function JobUploadPage() {
  const [mode, setMode] = useState<InputMode>('text')
  const [jobText, setJobText] = useState(`Software Engineer — Backend (Remote, US)

We're looking for a Backend Engineer to join our distributed team across the US and Europe.

Requirements:
- 3+ years with Node.js or Python
- Experience with REST APIs and microservices
- Strong English communication skills (B2+)
- Comfortable in async, remote-first environments
- Experience with Docker, AWS or GCP
- Familiarity with PostgreSQL and Redis

Nice to have:
- Experience with TypeScript
- Knowledge of CI/CD pipelines
- Previous experience working with international teams

What we offer:
- Competitive USD salary
- Fully remote, async culture
- Daily standups in English
- Code reviews with senior engineers`)
  const [link, setLink] = useState('https://linkedin.com/jobs/...')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof analyzeJobPosting>> | null>(null)
  const { setJobAnalysis } = useStore()
  const router = useRouter()

  const handleAnalyze = async () => {
    setLoading(true)
    const text = mode === 'link' ? `Job posting from: ${link}` : jobText
    const result = await analyzeJobPosting(text)
    setAnalysis(result)
    setJobAnalysis(result)
    setLoading(false)
  }

  const handleContinue = () => {
    router.push('/onboarding/assessment')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: 24 }}>
      <div style={{ maxWidth: 680, margin: '0 auto', paddingTop: 40 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em' }}>
            What job are you aiming for?
          </h1>
          <p style={{ fontSize: 16, color: 'var(--muted)' }}>
            Paste the job description and our AI will extract exactly what English skills you need.
          </p>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: 'flex', background: 'var(--card)', borderRadius: 10,
          border: '1px solid var(--card-border)', padding: 4, marginBottom: 20,
        }}>
          {[
            { id: 'text', icon: FileText, label: 'Paste text' },
            { id: 'link', icon: LinkIcon, label: 'LinkedIn link' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setMode(id as InputMode)} style={{
              flex: 1, padding: '9px', borderRadius: 8, border: 'none',
              background: mode === id ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: mode === id ? '#818cf8' : 'var(--muted)',
              fontSize: 14, fontWeight: mode === id ? 600 : 400, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.2s',
            }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Input */}
        {mode === 'text' ? (
          <textarea
            value={jobText}
            onChange={e => setJobText(e.target.value)}
            rows={12}
            placeholder="Paste the full job description here..."
            style={{
              width: '100%', padding: '16px', borderRadius: 12,
              border: '1px solid var(--card-border)', background: 'var(--card)',
              color: 'var(--foreground)', fontSize: 14, lineHeight: 1.6,
              outline: 'none', resize: 'vertical', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
          />
        ) : (
          <div>
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/..."
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12,
                border: '1px solid var(--card-border)', background: 'var(--card)',
                color: 'var(--foreground)', fontSize: 15, outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              <Upload size={12} style={{ display: 'inline', marginRight: 4 }} />
              PDF upload also supported (drag & drop coming soon)
            </p>
          </div>
        )}

        {/* Analyze button */}
        {!analysis && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              width: '100%', marginTop: 16, padding: '14px', borderRadius: 12,
              background: loading ? '#3f3f46' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 16, fontWeight: 700, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                AI is analyzing the job posting...
              </>
            ) : (
              <><Sparkles size={18} /> Analyze with AI</>
            )}
          </button>
        )}

        {/* Analysis Result */}
        {analysis && (
          <div className="animate-fade-in" style={{ marginTop: 24 }}>
            <div style={{
              padding: 20, borderRadius: 12, marginBottom: 16,
              background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle size={18} color="#22c55e" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#22c55e' }}>Analysis complete!</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {analysis.title} · Expected level: <strong>{analysis.expectedLevel}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {[
                {
                  icon: Code, title: 'Technologies Detected',
                  items: analysis.technologies,
                  color: '#6366f1',
                },
                {
                  icon: Users, title: 'Soft Skills Required',
                  items: analysis.softSkills,
                  color: '#8b5cf6',
                },
                {
                  icon: MessageSquare, title: 'Technical Terms',
                  items: analysis.technicalTerms.slice(0, 5),
                  color: '#06b6d4',
                },
                {
                  icon: MessageSquare, title: 'Common Expressions',
                  items: analysis.commonExpressions.slice(0, 4),
                  color: '#f59e0b',
                },
              ].map(({ icon: Icon, title, items, color }) => (
                <div key={title} style={{
                  padding: 16, borderRadius: 12, background: 'var(--card)',
                  border: '1px solid var(--card-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Icon size={15} color={color} />
                    <span style={{ fontSize: 13, fontWeight: 600, color }}>{title}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map(item => (
                      <span key={item} style={{
                        fontSize: 12, padding: '3px 8px', borderRadius: 6,
                        background: `${color}15`, color, border: `1px solid ${color}30`,
                      }}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 16, padding: 16, borderRadius: 12,
              background: 'var(--card)', border: '1px solid var(--card-border)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Expected Profile</div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)', fontStyle: 'italic' }}>
                &ldquo;{analysis.profileExpected}&rdquo;
              </p>
            </div>

            <button onClick={handleContinue} style={{
              width: '100%', marginTop: 20, padding: '14px', borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 16, fontWeight: 700, border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              boxShadow: '0 0 20px rgba(99,102,241,0.3)',
            }}>
              Continue to Initial Assessment <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
