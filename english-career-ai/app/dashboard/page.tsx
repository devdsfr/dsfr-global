'use client'
import { useStore } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import { getReadinessLabel, getLevelName, XP_PER_LEVEL } from '@/lib/types'
import Link from 'next/link'
import { Mic, BookOpen, Video, Flame, Zap, Target, TrendingUp, ArrowRight, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { user, progress, jobAnalysis, studyPlan } = useStore()
  const readiness = getReadinessLabel(progress.jobReadiness)
  const xpInLevel = progress.xp % XP_PER_LEVEL
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100
  const nextMonth = studyPlan[0]
  const nextWeek = nextMonth?.weeks.find(w => !w.completed)

  const skillColors: Record<string, string> = {
    speaking: '#6366f1', listening: '#8b5cf6', reading: '#06b6d4',
    vocabulary: '#22c55e', grammar: '#f59e0b',
  }

  const quickActions = [
    { href: '/lessons', icon: BookOpen, label: 'Today\'s Lesson', sub: nextWeek?.topics[0] || 'Continue learning', color: '#6366f1' },
    { href: '/conversation', icon: Mic, label: 'Speak with AI', sub: 'Practice pronunciation', color: '#8b5cf6' },
    { href: '/interview', icon: Video, label: 'Mock Interview', sub: 'Simulate a real interview', color: '#06b6d4' },
  ]

  return (
    <AppLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
            Good morning, {user?.name?.split(' ')[0] || 'Developer'} 👋
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            {jobAnalysis ? `Working towards: ${jobAnalysis.title}` : 'Your dashboard is ready'}
          </p>
        </div>

        {/* Top stats row */}
        <div className="animate-fade-in stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { icon: Flame, label: 'Streak', value: `${progress.streak} days`, color: '#f97316', sub: 'Keep going!' },
            { icon: Zap, label: 'Total XP', value: progress.xp.toLocaleString(), color: '#6366f1', sub: `Level ${progress.level}` },
            { icon: BookOpen, label: 'Words', value: progress.totalWords.toLocaleString(), color: '#22c55e', sub: 'learned' },
            { icon: Clock, label: 'Sessions', value: progress.sessionsCompleted.toString(), color: '#8b5cf6', sub: 'completed' },
          ].map(({ icon: Icon, label, value, color, sub }) => (
            <div key={label} style={{
              padding: '18px', borderRadius: 14, background: 'var(--card)',
              border: '1px solid var(--card-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} color={color} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Job Readiness Score — CA008 */}
          <div className="animate-fade-in stagger-2" style={{
            padding: 24, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Interview Readiness Score
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: readiness.color, lineHeight: 1 }}>
                  {progress.jobReadiness}
                  <span style={{ fontSize: 20 }}>/100</span>
                </div>
                <div style={{ fontSize: 14, marginTop: 6, color: readiness.color, fontWeight: 600 }}>
                  {readiness.emoji} {readiness.label}
                </div>
              </div>
              {/* Radial progress */}
              <svg width={80} height={80} viewBox="0 0 80 80">
                <circle cx={40} cy={40} r={32} fill="none" stroke="#27272a" strokeWidth={6} />
                <circle
                  cx={40} cy={40} r={32} fill="none"
                  stroke={readiness.color} strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress.jobReadiness / 100)}`}
                  className="progress-ring-circle"
                />
                <text x={40} y={44} textAnchor="middle" fontSize={14} fontWeight={700} fill={readiness.color}>{progress.jobReadiness}%</text>
              </svg>
            </div>

            {/* Skill bars */}
            {Object.entries(progress.skillScores).map(([skill, score]) => (
              <div key={skill} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, textTransform: 'capitalize', color: 'var(--muted)' }}>{skill}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: skillColors[skill] || '#6366f1' }}>{score}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: '#27272a', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${score}%`,
                    background: skillColors[skill] || '#6366f1', transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            ))}

            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              fontSize: 12, color: '#818cf8',
            }}>
              <Target size={12} style={{ display: 'inline', marginRight: 4 }} />
              Get to 90+ to apply with confidence for {jobAnalysis?.title || 'your target role'}
            </div>
          </div>

          {/* Level + XP — Gamification */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="animate-fade-in stagger-2" style={{
              padding: 24, borderRadius: 16, background: 'var(--card)',
              border: '1px solid var(--card-border)', flex: 1,
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Your Level
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 900, color: '#fff',
                }}>{progress.level}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{getLevelName(progress.level)}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{xpInLevel} / {XP_PER_LEVEL} XP to next level</div>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: '#27272a', overflow: 'hidden' }}>
                <div className="xp-bar" style={{ height: '100%', width: `${xpPercent}%`, borderRadius: 4 }} />
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {[
                  { label: '→ Junior', milestone: 5 },
                  { label: '→ Mid', milestone: 10 },
                  { label: '→ Senior', milestone: 20 },
                  { label: '→ Int\'l Ready', milestone: 30 },
                ].map(({ label, milestone }) => (
                  <div key={label} style={{
                    padding: '6px 10px', borderRadius: 6, fontSize: 11,
                    background: progress.level >= milestone ? 'rgba(34,197,94,0.1)' : '#27272a',
                    color: progress.level >= milestone ? '#22c55e' : 'var(--muted)',
                    border: `1px solid ${progress.level >= milestone ? 'rgba(34,197,94,0.3)' : '#3f3f46'}`,
                  }}>
                    {progress.level >= milestone ? '✓' : `Lv.${milestone}`} {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly goal */}
            <div className="animate-fade-in stagger-3" style={{
              padding: 20, borderRadius: 16, background: 'var(--card)',
              border: '1px solid var(--card-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Weekly Goal</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{progress.weeklyDone}/{progress.weeklyGoal} days</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: progress.weeklyGoal }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: i < progress.weeklyDone
                      ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                      : '#27272a',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-in stagger-3" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Continue learning</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {quickActions.map(({ href, icon: Icon, label, sub, color }) => (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div className="card-hover" style={{
                  padding: '20px', borderRadius: 14, background: 'var(--card)',
                  border: '1px solid var(--card-border)', cursor: 'pointer',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, marginBottom: 12,
                    background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} color={color} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{sub}</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4, marginTop: 12,
                    fontSize: 12, color,
                  }}>
                    Start <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Today's topics from study plan */}
        {nextWeek && (
          <div className="animate-fade-in stagger-4" style={{
            padding: 20, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>
                This week — Month {nextMonth.month}, Week {nextWeek.week}
              </h2>
              <Link href="/study-plan" style={{ fontSize: 12, color: '#818cf8', textDecoration: 'none' }}>
                View full plan <ArrowRight size={11} style={{ display: 'inline' }} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {nextWeek.topics.map(topic => (
                <span key={topic} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 13,
                  background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}>{topic}</span>
              ))}
            </div>
          </div>
        )}

        {/* Recent history — CA010 */}
        {progress.history.length > 0 && (
          <div className="animate-fade-in stagger-5" style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent activity</h2>
              <Link href="/progress" style={{ fontSize: 12, color: '#818cf8', textDecoration: 'none' }}>View all</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {progress.history.slice(0, 3).map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10, background: 'var(--card)',
                  border: '1px solid var(--card-border)',
                }}>
                  <div style={{ fontSize: 20 }}>
                    {entry.type === 'conversation' ? '🎙️' : entry.type === 'interview' ? '🎯' : entry.type === 'assessment' ? '📊' : '📚'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{entry.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{entry.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>+{entry.xpGained} XP</span>
                    {entry.wordsLearned > 0 && <span style={{ fontSize: 12, color: '#22c55e' }}>+{entry.wordsLearned} words</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations — CA009 */}
        <div className="animate-fade-in stagger-6" style={{
          marginTop: 20, padding: 20, borderRadius: 16,
          background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={16} color="#eab308" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#eab308' }}>AI Recommendation</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.5, marginBottom: 12 }}>
            Your <strong>Listening</strong> ({progress.skillScores.listening}%) is your weakest skill.
            Focus on listening exercises this week to improve your Job Readiness Score.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['🎧 Command Line Heroes podcast', '📺 TED Talk: Communication at Work', '🎙️ Daily standup practice'].map(r => (
              <span key={r} style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 12,
                background: 'rgba(234,179,8,0.08)', color: '#eab308',
                border: '1px solid rgba(234,179,8,0.2)', cursor: 'pointer',
              }}>{r}</span>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
