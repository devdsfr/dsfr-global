'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useStore } from '@/lib/store'
import { interviewQuestions, evaluateInterviewAnswer } from '@/lib/mock-ai'
import { Mic, MicOff, ChevronRight, CheckCircle, TrendingUp, Award, ArrowRight, Clock } from 'lucide-react'

type Phase = 'intro' | 'question' | 'loading' | 'feedback' | 'done'

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [feedback, setFeedback] = useState<Awaited<ReturnType<typeof evaluateInterviewAnswer>> | null>(null)
  const [allFeedback, setAllFeedback] = useState<(typeof feedback)[]>([])
  const [timer, setTimer] = useState(0)
  const { addXP, addHistoryEntry, updateSkillScore } = useStore()

  const q = interviewQuestions[currentQ]
  const totalQ = Math.min(interviewQuestions.length, 5)

  const handleAnswer = async () => {
    if (!answer.trim()) return
    setPhase('loading')
    const result = await evaluateInterviewAnswer(q.question, answer)
    setFeedback(result)
    setAllFeedback(p => [...p, result])
    setPhase('feedback')
  }

  const handleNext = () => {
    if (currentQ < totalQ - 1) {
      setCurrentQ(p => p + 1)
      setAnswer('')
      setFeedback(null)
      setPhase('question')
    } else {
      // Done
      const avgScore = allFeedback.reduce((a, b) => a + (b?.score || 0), 0) / allFeedback.length
      addXP(500)
      updateSkillScore('speaking', 48)
      addHistoryEntry({
        date: 'Today',
        type: 'interview',
        title: 'Mock Interview — Software Engineer',
        xpGained: 500,
        improvements: { speaking: 5 },
        wordsLearned: 12,
      })
      setPhase('done')
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false)
      return
    }
    setIsRecording(true)
    // Simulate voice input
    setTimeout(() => {
      const sampleAnswers = [
        "I'm a backend developer with 4 years of experience, mainly working with Node.js and PostgreSQL. I've built several REST APIs for fintech companies and I'm passionate about clean, maintainable code.",
        "My greatest strength is probably problem solving. I love breaking down complex technical challenges into smaller pieces and finding elegant solutions. For example, in my last job I reduced our API response time by 40% by optimizing our database queries.",
        "In my previous role, we had a major production incident where our payment service went down during Black Friday. I was the on-call engineer and had to coordinate with multiple teams while under pressure. I learned a lot about communication and staying calm under pressure.",
      ]
      setAnswer(sampleAnswers[currentQ % sampleAnswers.length])
      setIsRecording(false)
    }, 2000)
  }

  if (phase === 'intro') {
    return (
      <AppLayout>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎯</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
              Mock Interview
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.6, marginBottom: 36 }}>
              Simulate a real English interview for a software engineer position.
              The AI will evaluate your answers and give detailed feedback.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 36, textAlign: 'left' }}>
              {[
                { icon: '💬', label: `${totalQ} questions`, sub: 'Behavioral + Technical' },
                { icon: '🧠', label: 'AI Feedback', sub: 'Score, strengths, improvements' },
                { icon: '⏱️', label: '~15 minutes', sub: 'Real interview pace' },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={{
                  padding: '16px', borderRadius: 12, background: 'var(--card)',
                  border: '1px solid var(--card-border)',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '14px 20px', borderRadius: 12, marginBottom: 28,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
              fontSize: 14, color: '#818cf8', textAlign: 'left', lineHeight: 1.5,
            }}>
              💡 <strong>Tip:</strong> Use the STAR method (Situation, Task, Action, Result) for behavioral questions.
              Speak clearly, use specific examples, and don&apos;t rush.
            </div>

            <button onClick={() => setPhase('question')} style={{
              padding: '14px 36px', borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 0 20px rgba(99,102,241,0.3)',
            }}>
              Start Interview <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (phase === 'done') {
    const avgScore = Math.round(allFeedback.reduce((a, b) => a + (b?.score || 0), 0) / allFeedback.length)
    const topStrengths = allFeedback.flatMap(f => f?.strengths || []).slice(0, 3)
    const topImprovements = allFeedback.flatMap(f => f?.improvements || []).slice(0, 3)

    return (
      <AppLayout>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '40px 0' }}>
          <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {avgScore >= 80 ? '🏆' : avgScore >= 60 ? '🎯' : '📈'}
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Interview Complete!</h1>
            <div style={{ fontSize: 56, fontWeight: 900, color: avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#eab308' : '#f97316', lineHeight: 1 }}>
              {avgScore}<span style={{ fontSize: 28 }}>/100</span>
            </div>
            <p style={{ color: 'var(--muted)', marginTop: 8 }}>Overall Interview Score</p>
          </div>

          <div className="animate-fade-in stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
            <div style={{ padding: 20, borderRadius: 14, background: 'var(--card)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={16} color="#22c55e" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Strengths</span>
              </div>
              {topStrengths.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--foreground)', marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid #22c55e' }}>
                  {s}
                </div>
              ))}
            </div>
            <div style={{ padding: 20, borderRadius: 14, background: 'var(--card)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={16} color="#f97316" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f97316' }}>Improve next time</span>
              </div>
              {topImprovements.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--foreground)', marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid #f97316' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-in stagger-2" style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 24,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#818cf8',
          }}>
            <Award size={16} />
            +500 XP earned · Speaking +5% · 12 new words
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setPhase('intro'); setCurrentQ(0); setAllFeedback([]); setAnswer('') }} style={{
              flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--card-border)',
              background: 'var(--card)', color: 'var(--foreground)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Try again
            </button>
            <button onClick={() => window.location.href = '/dashboard'} style={{
              flex: 1, padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 660, margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Question {currentQ + 1} of {totalQ}</span>
          <span style={{
            padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600,
            background: q.type === 'behavioral' ? 'rgba(99,102,241,0.1)' : q.type === 'technical' ? 'rgba(6,182,212,0.1)' : 'rgba(139,92,246,0.1)',
            color: q.type === 'behavioral' ? '#818cf8' : q.type === 'technical' ? '#06b6d4' : '#8b5cf6',
          }}>{q.type}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: '#27272a', overflow: 'hidden', marginBottom: 28 }}>
          <div style={{
            height: '100%', borderRadius: 2, width: `${((currentQ + 1) / totalQ) * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Question card */}
        <div className="animate-fade-in" style={{
          padding: 24, borderRadius: 16, background: 'var(--card)',
          border: '1px solid var(--card-border)', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>🤖</div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: 'var(--foreground)' }}>
                &ldquo;{q.question}&rdquo;
              </p>
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#818cf8',
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              }}>
                💡 {q.hint}
              </div>
            </div>
          </div>
        </div>

        {/* Answer area */}
        {phase !== 'feedback' && (
          <div className="animate-fade-in">
            <div style={{ position: 'relative', marginBottom: 14 }}>
              {isRecording && (
                <div style={{
                  position: 'absolute', top: -28, left: 0, right: 0,
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef4444',
                }}>
                  <div className="recording-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                  Listening... speak your answer
                </div>
              )}
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder='Type your answer in English (or use the mic)... e.g. "In my previous role, I was responsible for..."'
                rows={5}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  border: '1px solid var(--card-border)', background: 'var(--card)',
                  color: 'var(--foreground)', fontSize: 14, lineHeight: 1.6,
                  resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={toggleRecording} style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: isRecording ? '#ef4444' : 'rgba(99,102,241,0.15)',
                color: isRecording ? '#fff' : '#818cf8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
              }} className={isRecording ? 'voice-active' : ''}>
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={handleAnswer}
                disabled={!answer.trim() || phase === 'loading'}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                  background: answer.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#27272a',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: answer.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {phase === 'loading' ? (
                  <><span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Evaluating...</>
                ) : (
                  <>Submit answer <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* CA006 — Feedback */}
        {phase === 'feedback' && feedback && (
          <div className="animate-fade-in">
            {/* Score */}
            <div style={{
              padding: 20, borderRadius: 14, background: 'var(--card)',
              border: '1px solid var(--card-border)', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Answer Score</div>
                  <div style={{ fontSize: 40, fontWeight: 900, color: feedback.score >= 70 ? '#22c55e' : feedback.score >= 50 ? '#eab308' : '#f97316' }}>
                    {feedback.score}<span style={{ fontSize: 20 }}>/100</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 8, borderRadius: 4, background: '#27272a', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${feedback.score}%`, borderRadius: 4,
                      background: feedback.score >= 70 ? '#22c55e' : feedback.score >= 50 ? '#eab308' : '#f97316',
                      transition: 'width 1s ease',
                    }} />
                  </div>
                </div>
              </div>

              {/* Your answer */}
              <div style={{ padding: '12px', borderRadius: 8, background: '#27272a', marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>YOUR ANSWER</div>
                <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5, fontStyle: 'italic' }}>&ldquo;{answer}&rdquo;</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} /> Strengths
                  </div>
                  {feedback.strengths.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: 4, lineHeight: 1.4, paddingLeft: 8, borderLeft: '2px solid #22c55e' }}>{s}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f97316', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={12} /> Improvements
                  </div>
                  {feedback.improvements.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--foreground)', marginBottom: 4, lineHeight: 1.4, paddingLeft: 8, borderLeft: '2px solid #f97316' }}>{s}</div>
                  ))}
                </div>
              </div>

              <div style={{
                marginTop: 14, padding: '12px', borderRadius: 8,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
              }}>
                <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 4 }}>💡 Better phrasing</div>
                <p style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5, fontStyle: 'italic' }}>{feedback.betterPhrase}</p>
              </div>
            </div>

            <button onClick={handleNext} style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {currentQ < totalQ - 1 ? 'Next question' : 'See final results'} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
