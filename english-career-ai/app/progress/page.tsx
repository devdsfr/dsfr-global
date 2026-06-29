'use client'
import AppLayout from '@/components/layout/AppLayout'
import { useStore } from '@/lib/store'
import { getReadinessLabel, getLevelName, XP_PER_LEVEL } from '@/lib/types'
import { generateRecommendations } from '@/lib/mock-ai'
import { useState, useEffect } from 'react'
import { TrendingUp, Flame, BookOpen, Zap, Target } from 'lucide-react'

export default function ProgressPage() {
  const { progress, jobAnalysis } = useStore()
  const readiness = getReadinessLabel(progress.jobReadiness)
  const xpInLevel = progress.xp % XP_PER_LEVEL
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100

  const [recommendations, setRecommendations] = useState<Awaited<ReturnType<typeof generateRecommendations>> | null>(null)

  const skillColors: Record<string, string> = {
    speaking: '#6366f1', listening: '#8b5cf6', reading: '#06b6d4',
    vocabulary: '#22c55e', grammar: '#f59e0b',
  }

  const weakestSkill = Object.entries(progress.skillScores).sort((a, b) => a[1] - b[1])[0][0] as keyof typeof progress.skillScores

  useEffect(() => {
    generateRecommendations(weakestSkill).then(setRecommendations)
  }, [weakestSkill])

  // Simulated weekly data
  const weeklyData = [
    { day: 'Mon', xp: 320, listening: 36, speaking: 40 },
    { day: 'Tue', xp: 450, listening: 38, speaking: 41 },
    { day: 'Wed', xp: 280, listening: 37, speaking: 42 },
    { day: 'Thu', xp: 520, listening: 39, speaking: 43 },
    { day: 'Fri', xp: 410, listening: 40, speaking: 44 },
    { day: 'Sat', xp: 380, listening: 38, speaking: 42 },
    { day: 'Sun', xp: 350, listening: 38, speaking: 42 },
  ]
  const maxXP = Math.max(...weeklyData.map(d => d.xp))

  return (
    <AppLayout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="animate-fade-in" style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>Progress</h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>CA007 & CA010 — Your complete learning history</p>
        </div>

        {/* Summary cards */}
        <div className="animate-fade-in stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { icon: Flame, label: 'Streak', value: `${progress.streak}d`, color: '#f97316' },
            { icon: Zap, label: 'Total XP', value: progress.xp.toLocaleString(), color: '#6366f1' },
            { icon: BookOpen, label: 'Words', value: progress.totalWords, color: '#22c55e' },
            { icon: Target, label: 'Sessions', value: progress.sessionsCompleted, color: '#8b5cf6' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{
              padding: '16px', borderRadius: 14, background: 'var(--card)',
              border: '1px solid var(--card-border)', textAlign: 'center',
            }}>
              <Icon size={20} color={color} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Job Readiness — CA007 */}
          <div className="animate-fade-in stagger-2" style={{
            padding: 24, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              English Level & Readiness
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Current Level', value: 'A2', color: '#6366f1' },
                { label: 'Target Level', value: 'B2', color: '#22c55e' },
                { label: 'Est. Time', value: '7 months', color: '#f59e0b' },
                { label: 'Job Readiness', value: `${progress.jobReadiness}%`, color: readiness.color },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '12px', borderRadius: 10, background: '#27272a', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {Object.entries(progress.skillScores).map(([skill, score]) => (
              <div key={skill} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{skill}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: skillColors[skill] }}>{score}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: '#27272a', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, borderRadius: 4, background: skillColors[skill], transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Level Progress */}
          <div className="animate-fade-in stagger-2" style={{
            padding: 24, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Level Progress
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20, margin: '0 auto 12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 900, color: '#fff',
              }}>{progress.level}</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{getLevelName(progress.level)}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{xpInLevel} / {XP_PER_LEVEL} XP</div>
            </div>

            <div style={{ height: 10, borderRadius: 5, background: '#27272a', overflow: 'hidden', marginBottom: 20 }}>
              <div className="xp-bar" style={{ height: '100%', width: `${xpPercent}%`, borderRadius: 5 }} />
            </div>

            {/* Level milestones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { level: 1, name: 'Intern', unlocked: true },
                { level: 5, name: 'Junior', unlocked: progress.level >= 5 },
                { level: 10, name: 'Mid', unlocked: progress.level >= 10 },
                { level: 20, name: 'Senior', unlocked: progress.level >= 20 },
                { level: 30, name: 'International Ready', unlocked: progress.level >= 30 },
              ].map(({ level, name, unlocked }) => (
                <div key={level} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                  background: unlocked ? 'rgba(34,197,94,0.08)' : '#27272a',
                  border: `1px solid ${unlocked ? 'rgba(34,197,94,0.2)' : '#3f3f46'}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, background: unlocked ? '#22c55e' : '#3f3f46',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: unlocked ? '#fff' : 'var(--muted)',
                  }}>{level}</div>
                  <span style={{ fontSize: 13, color: unlocked ? '#22c55e' : 'var(--muted)', fontWeight: unlocked ? 600 : 400 }}>
                    {name} {unlocked && '✓'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly XP chart */}
        <div className="animate-fade-in stagger-3" style={{
          padding: 24, borderRadius: 16, background: 'var(--card)',
          border: '1px solid var(--card-border)', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>XP This Week</h3>
            <span style={{ fontSize: 13, color: '#818cf8' }}>Total: {weeklyData.reduce((a, b) => a + b.xp, 0).toLocaleString()} XP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
            {weeklyData.map(({ day, xp }) => {
              const height = (xp / maxXP) * 100
              const isToday = day === 'Sun'
              return (
                <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 11, color: '#818cf8', fontWeight: isToday ? 700 : 400 }}>{xp}</div>
                  <div style={{
                    width: '100%', height: `${height}%`, borderRadius: '4px 4px 0 0',
                    background: isToday ? 'linear-gradient(180deg, #6366f1, #8b5cf6)' : '#27272a',
                    minHeight: 4, transition: 'height 0.5s ease',
                    boxShadow: isToday ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
                  }} />
                  <div style={{ fontSize: 11, color: isToday ? '#818cf8' : 'var(--muted)', fontWeight: isToday ? 700 : 400 }}>{day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CA009 — AI Recommendations */}
        {recommendations && (
          <div className="animate-fade-in stagger-4" style={{
            padding: 24, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <TrendingUp size={16} color="#eab308" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#eab308' }}>AI Recommendations</h3>
            </div>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
              Based on your weakest skill (<strong style={{ color: 'var(--foreground)', textTransform: 'capitalize' }}>{weakestSkill}</strong>), here&apos;s what to do next:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                { label: '🎥 Videos', items: recommendations.videos },
                { label: '🎧 Podcasts', items: recommendations.podcasts },
                { label: '📰 Articles', items: recommendations.articles },
                { label: '✏️ Exercises', items: recommendations.exercises },
              ].map(({ label, items }) => (
                <div key={label}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{label}</div>
                  {items.slice(0, 2).map(item => (
                    <div key={item} style={{
                      fontSize: 12, color: 'var(--muted)', marginBottom: 6, lineHeight: 1.4,
                      padding: '6px 10px', borderRadius: 6, background: '#27272a',
                    }}>{item}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CA010 — Activity History */}
        {progress.history.length > 0 ? (
          <div className="animate-fade-in stagger-5" style={{
            padding: 24, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Activity History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {progress.history.map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 10, background: '#27272a',
                  border: '1px solid #3f3f46',
                }}>
                  <div style={{ fontSize: 24 }}>
                    {entry.type === 'conversation' ? '🎙️' : entry.type === 'interview' ? '🎯' : entry.type === 'assessment' ? '📊' : '📚'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{entry.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{entry.date}</div>
                    {Object.entries(entry.improvements).filter(([, v]) => v && v > 0).map(([skill, val]) => (
                      <span key={skill} style={{ fontSize: 11, color: skillColors[skill] || '#818cf8', marginRight: 8 }}>
                        +{val}% {skill}
                      </span>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>+{entry.xpGained} XP</div>
                    {entry.wordsLearned > 0 && <div style={{ fontSize: 11, color: '#22c55e' }}>+{entry.wordsLearned} words</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            padding: 24, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)', textAlign: 'center', color: 'var(--muted)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p>Complete lessons and conversations to see your progress history here.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
