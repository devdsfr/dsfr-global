'use client'
import { useStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { CheckCircle, Lock, BookOpen, ArrowRight, Calendar } from 'lucide-react'

export default function StudyPlanPage() {
  const { studyPlan, jobAnalysis, completeWeek } = useStore()

  if (!studyPlan.length) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>No study plan yet</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Complete the initial assessment to get your personalized plan.</p>
          <Link href="/onboarding/assessment" style={{
            padding: '12px 24px', borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', textDecoration: 'none', fontWeight: 700,
          }}>Take Assessment</Link>
        </div>
      </AppLayout>
    )
  }

  const totalWeeks = studyPlan.reduce((acc, m) => acc + m.weeks.length, 0)
  const completedWeeks = studyPlan.reduce((acc, m) => acc + m.weeks.filter(w => w.completed).length, 0)
  const overallProgress = Math.round((completedWeeks / totalWeeks) * 100)

  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>Study Plan</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            Personalized roadmap for: <span style={{ color: '#818cf8' }}>{jobAnalysis?.title || 'International Dev Job'}</span>
          </p>
        </div>

        {/* Overall progress */}
        <div className="animate-fade-in stagger-1" style={{
          padding: 20, borderRadius: 14, background: 'var(--card)',
          border: '1px solid var(--card-border)', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Overall Progress</span>
              <span style={{ fontSize: 14, color: '#818cf8', fontWeight: 700 }}>{completedWeeks}/{totalWeeks} weeks</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#27272a', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, width: `${overallProgress}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 1s ease',
              }} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#818cf8' }}>{overallProgress}%</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>complete</div>
          </div>
        </div>

        {/* Months */}
        {studyPlan.map((month, mi) => {
          const monthCompleted = month.weeks.filter(w => w.completed).length
          const monthTotal = month.weeks.length
          const isCurrentMonth = mi === studyPlan.findIndex(m => m.weeks.some(w => !w.completed))

          return (
            <div key={month.month} className="animate-fade-in" style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isCurrentMonth ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#27272a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: isCurrentMonth ? '#fff' : 'var(--muted)',
                }}>{month.month}</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Month {month.month}: {month.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{monthCompleted}/{monthTotal} weeks completed</div>
                </div>
                {isCurrentMonth && (
                  <span style={{
                    marginLeft: 'auto', padding: '3px 10px', borderRadius: 100,
                    background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                    fontSize: 11, fontWeight: 700,
                  }}>CURRENT</span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {month.weeks.map((week, wi) => {
                  const prevCompleted = wi === 0 || month.weeks[wi - 1].completed
                  const isLocked = mi > 0 && !studyPlan[mi - 1].weeks.every(w => w.completed) && !week.completed

                  return (
                    <div key={week.week} style={{
                      padding: '16px', borderRadius: 12, background: 'var(--card)',
                      border: `1px solid ${week.completed ? 'rgba(34,197,94,0.3)' : 'var(--card-border)'}`,
                      opacity: isLocked ? 0.5 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: week.completed ? '#22c55e' : 'var(--foreground)' }}>
                          Week {week.week}
                        </span>
                        {week.completed ? (
                          <CheckCircle size={16} color="#22c55e" />
                        ) : isLocked ? (
                          <Lock size={14} color="var(--muted)" />
                        ) : (
                          <BookOpen size={14} color="#818cf8" />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                        {week.topics.map(topic => (
                          <div key={topic} style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                              width: 4, height: 4, borderRadius: '50%',
                              background: week.completed ? '#22c55e' : '#6366f1', flexShrink: 0,
                            }} />
                            {topic}
                          </div>
                        ))}
                      </div>
                      {!week.completed && !isLocked && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link href="/lessons" style={{ textDecoration: 'none', flex: 1 }}>
                            <button style={{
                              width: '100%', padding: '7px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                              background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                              cursor: 'pointer',
                            }}>
                              Start
                            </button>
                          </Link>
                          <button
                            onClick={() => completeWeek(mi, wi)}
                            style={{
                              padding: '7px 10px', borderRadius: 7, fontSize: 12,
                              background: 'transparent', color: 'var(--muted)',
                              border: '1px solid var(--card-border)', cursor: 'pointer',
                            }}
                          >✓ Mark done</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Coming up */}
        <div className="animate-fade-in" style={{
          padding: 20, borderRadius: 14, background: 'var(--card)',
          border: '1px solid var(--card-border)', textAlign: 'center',
        }}>
          <Calendar size={24} color="var(--muted)" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>More months unlocking as you progress</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Complete Month 3 to unlock advanced interview prep and salary negotiation
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
