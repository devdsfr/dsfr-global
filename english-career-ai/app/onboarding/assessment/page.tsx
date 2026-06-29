'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { assessmentQuestions } from '@/lib/mock-ai'
import { generateStudyPlan } from '@/lib/mock-ai'
import type { SkillScores, EnglishLevel } from '@/lib/types'
import { CheckCircle, XCircle, ArrowRight, ChevronRight } from 'lucide-react'

export default function AssessmentPage() {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [showExplanation, setShowExplanation] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'quiz' | 'loading' | 'result'>('quiz')
  const [result, setResult] = useState<{ level: EnglishLevel; scores: SkillScores } | null>(null)
  const { completeAssessment, setStudyPlan, jobAnalysis } = useStore()
  const router = useRouter()

  const q = assessmentQuestions[currentQ]
  const total = assessmentQuestions.length
  const progress = (currentQ / total) * 100

  const handleAnswer = (optionIndex: number) => {
    if (selected !== null) return
    setSelected(optionIndex)
    setAnswers(prev => ({ ...prev, [q.id]: optionIndex }))
    setShowExplanation(true)
  }

  const handleNext = async () => {
    if (currentQ < total - 1) {
      setCurrentQ(p => p + 1)
      setSelected(null)
      setShowExplanation(false)
    } else {
      // Calculate results
      setPhase('loading')
      await new Promise(r => setTimeout(r, 2000))

      const skillTotals: Record<keyof SkillScores, { correct: number; total: number }> = {
        speaking: { correct: 0, total: 0 },
        listening: { correct: 0, total: 0 },
        reading: { correct: 0, total: 0 },
        vocabulary: { correct: 0, total: 0 },
        grammar: { correct: 0, total: 0 },
      }

      assessmentQuestions.forEach(question => {
        const skill = question.skill
        skillTotals[skill].total++
        if (answers[question.id] === question.correct) skillTotals[skill].correct++
      })

      const scores: SkillScores = {
        speaking: Math.round((skillTotals.speaking.correct / Math.max(1, skillTotals.speaking.total)) * 100 * 0.4 + 30),
        listening: Math.round((skillTotals.listening.correct / Math.max(1, skillTotals.listening.total)) * 100 * 0.4 + 30),
        reading: Math.round((skillTotals.reading.correct / Math.max(1, skillTotals.reading.total)) * 100 * 0.4 + 35),
        vocabulary: Math.round((skillTotals.vocabulary.correct / Math.max(1, skillTotals.vocabulary.total)) * 100 * 0.5 + 25),
        grammar: Math.round((skillTotals.grammar.correct / Math.max(1, skillTotals.grammar.total)) * 100 * 0.4 + 30),
      }

      const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 5
      const level: EnglishLevel = avg < 30 ? 'A1' : avg < 45 ? 'A2' : avg < 60 ? 'B1' : avg < 75 ? 'B2' : avg < 88 ? 'C1' : 'C2'

      completeAssessment(scores, level)
      const plan = await generateStudyPlan(jobAnalysis!, level)
      setStudyPlan(plan)
      setResult({ level, scores })
      setPhase('result')
    }
  }

  if (phase === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--background)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🧠</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Analyzing your results...</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 32 }}>AI is creating your personalized study plan</p>
          <div style={{ height: 4, borderRadius: 2, background: '#27272a', overflow: 'hidden', margin: '0 auto', width: 300 }}>
            <div className="xp-bar" style={{ height: '100%', width: '100%', borderRadius: 2 }} />
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Calculating skill scores...', 'Matching job requirements...', 'Building your roadmap...'].map((t, i) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 14, color: 'var(--muted)' }}>
                <span className="animate-spin" style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'result' && result) {
    const { level, scores } = result
    const levelToTarget: Record<EnglishLevel, EnglishLevel> = { A1: 'B2', A2: 'B2', B1: 'B2', B2: 'C1', C1: 'C2', C2: 'C2' }
    const levelToMonths: Record<EnglishLevel, string> = { A1: '10-12 months', A2: '7-9 months', B1: '4-6 months', B2: '2-3 months', C1: '1-2 months', C2: 'Ready!' }
    const levelToChance: Record<EnglishLevel, string> = { A1: '8%', A2: '18%', B1: '35%', B2: '62%', C1: '85%', C2: '95%' }

    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', padding: 24 }}>
        <div style={{ maxWidth: 620, margin: '0 auto', paddingTop: 40 }}>
          <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📊</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Your Assessment Results
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: 15 }}>Here&apos;s where you stand today</p>
          </div>

          {/* Level cards */}
          <div className="animate-fade-in stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Current Level', value: level, color: '#6366f1' },
              { label: 'Target', value: levelToTarget[level], color: '#22c55e' },
              { label: 'Est. Time', value: levelToMonths[level], color: '#f59e0b' },
              { label: 'Approval Chance', value: levelToChance[level], color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                padding: '16px 12px', borderRadius: 12, background: 'var(--card)',
                border: '1px solid var(--card-border)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Skill Scores */}
          <div className="animate-fade-in stagger-2" style={{
            padding: 24, borderRadius: 16, background: 'var(--card)',
            border: '1px solid var(--card-border)', marginBottom: 20,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Skill Breakdown</h3>
            {Object.entries(scores).map(([skill, score]) => {
              const colors: Record<string, string> = {
                speaking: '#6366f1', listening: '#8b5cf6', reading: '#06b6d4',
                vocabulary: '#22c55e', grammar: '#f59e0b',
              }
              const color = colors[skill] || '#6366f1'
              return (
                <div key={skill} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{skill}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{score}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: '#27272a', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${score}%`, borderRadius: 4, background: color, transition: 'width 1s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={() => router.push('/dashboard')} className="animate-fade-in stagger-3" style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 16, fontWeight: 700, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
            boxShadow: '0 0 20px rgba(99,102,241,0.3)',
          }}>
            See my personalized plan <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // Quiz phase
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: 24 }}>
      <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 40 }}>
        {/* Progress */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
            <span>Initial Assessment</span>
            <span>{currentQ + 1} / {total}</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: '#27272a', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Question */}
        <div className="animate-fade-in">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
            borderRadius: 100, fontSize: 12, fontWeight: 600, marginBottom: 16,
            background: 'rgba(99,102,241,0.1)', color: '#818cf8',
            textTransform: 'capitalize',
          }}>
            {q.type}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, marginBottom: 24 }}>
            {q.question}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {q.options.map((option, i) => {
              const isSelected = selected === i
              const isCorrect = i === q.correct
              const showResult = showExplanation

              let borderColor = 'var(--card-border)'
              let bg = 'var(--card)'
              let textColor = 'var(--foreground)'

              if (showResult && isCorrect) { borderColor = '#22c55e'; bg = 'rgba(34,197,94,0.1)'; textColor = '#22c55e' }
              if (showResult && isSelected && !isCorrect) { borderColor = '#ef4444'; bg = 'rgba(239,68,68,0.1)'; textColor = '#ef4444' }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selected !== null}
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    background: bg, color: textColor,
                    fontSize: 15, textAlign: 'left', cursor: selected !== null ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all 0.2s', fontWeight: isSelected || (showResult && isCorrect) ? 600 : 400,
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%', border: `1px solid ${borderColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    background: showResult && isCorrect ? '#22c55e' : showResult && isSelected ? '#ef4444' : 'transparent',
                    color: (showResult && (isCorrect || isSelected)) ? '#fff' : textColor,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1 }}>{option}</span>
                  {showResult && isCorrect && <CheckCircle size={18} color="#22c55e" />}
                  {showResult && isSelected && !isCorrect && <XCircle size={18} color="#ef4444" />}
                </button>
              )
            })}
          </div>

          {showExplanation && (
            <div className="animate-fade-in" style={{
              padding: 16, borderRadius: 10, marginBottom: 20,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 6 }}>💡 Explanation</div>
              <p style={{ fontSize: 14, color: 'var(--foreground)', lineHeight: 1.5 }}>{q.explanation}</p>
            </div>
          )}

          {showExplanation && (
            <button onClick={handleNext} style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {currentQ < total - 1 ? <><ChevronRight size={18} /> Next question</> : <><CheckCircle size={18} /> See my results</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
