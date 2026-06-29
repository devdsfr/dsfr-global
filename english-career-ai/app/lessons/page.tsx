'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useStore } from '@/lib/store'
import { CheckCircle, XCircle, Lightbulb, ArrowRight, Zap } from 'lucide-react'

interface LessonExercise {
  id: string
  type: 'translate' | 'fill' | 'choose' | 'rewrite'
  prompt: string
  question: string
  answer: string
  alternatives?: string[]
  explanation: string
  naturalForm: string
  nativeForm: string
  xp: number
}

const exercises: LessonExercise[] = [
  {
    id: 'e1', type: 'choose', xp: 50,
    prompt: 'Tech English — Daily Standup',
    question: 'In your daily standup, how do you say that a task is preventing you from moving forward?',
    answer: 'I\'m blocked on the authentication feature.',
    alternatives: [
      'I\'m blocked on the authentication feature.',
      'I am stopped by authentication.',
      'Authentication is a problem for me.',
      'I cannot do authentication.',
    ],
    explanation: '"Blocked" is the standard Agile term for an obstacle stopping your progress. It\'s precise, professional, and universally understood in tech teams.',
    naturalForm: 'I\'m blocked on the auth feature — waiting on the API keys from DevOps.',
    nativeForm: '"Blocked" or "I\'ve hit a blocker" — native speakers often add context: what\'s blocking them and who can unblock them.',
  },
  {
    id: 'e2', type: 'rewrite', xp: 80,
    prompt: 'Grammar — Present Perfect',
    question: 'Rewrite correctly: "I worked on this bug since yesterday morning."',
    answer: 'I have been working on this bug since yesterday morning.',
    alternatives: [
      'I have been working on this bug since yesterday morning.',
      'I worked on this bug since yesterday morning.',
      'I am working on this bug since yesterday morning.',
      'I was working on this bug since yesterday morning.',
    ],
    explanation: 'Use Present Perfect Continuous ("have been + -ing") with "since/for" when the action started in the past and continues to the present.',
    naturalForm: '"I\'ve been working on this bug since yesterday morning."',
    nativeForm: 'Native speakers contract it: "I\'ve been" not "I have been". In standup: "Been debugging this since yesterday — finally narrowed it down."',
  },
  {
    id: 'e3', type: 'choose', xp: 50,
    prompt: 'Vocabulary — Code Review',
    question: 'What is the most professional way to suggest an improvement in a code review?',
    answer: '"Consider using a helper function here — would improve readability."',
    alternatives: [
      '"This code is bad, please rewrite it."',
      '"Consider using a helper function here — would improve readability."',
      '"I don\'t understand this code."',
      '"You should not write code like this."',
    ],
    explanation: 'Professional code review uses constructive language: suggest (not command), explain the why, and stay focused on the code — not the person.',
    naturalForm: '"Nit: consider extracting this into a helper — makes it easier to test in isolation."',
    nativeForm: 'Prefix with "Nit:" (minor suggestion), "Suggestion:", or "Consider:" — signals non-blocking feedback. Blocking issues use "Blocker:" or "Required:".',
  },
  {
    id: 'e4', type: 'fill', xp: 60,
    prompt: 'Expressions — Meetings',
    question: 'Complete: "I see your _____, but have we considered the performance implications?"',
    answer: 'I see your point, but have we considered the performance implications?',
    alternatives: [
      'I see your point, but have we considered the performance implications?',
      'I see your idea, but have we considered the performance implications?',
      'I see your opinion, but have we considered the performance implications?',
      'I see your thought, but have we considered the performance implications?',
    ],
    explanation: '"I see your point" is the standard polite disagreement opener in English-speaking professional environments. It acknowledges before redirecting.',
    naturalForm: '"That\'s a fair point — I\'d just want to validate the performance impact first."',
    nativeForm: 'Often followed by "but" (contrast) or "and" (addition). "That\'s a fair point, and I\'d also add..." shows you built on their idea.',
  },
]

export default function LessonsPage() {
  const [currentEx, setCurrentEx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])
  const [lessonDone, setLessonDone] = useState(false)
  const { addXP, addWords, addHistoryEntry, updateSkillScore } = useStore()

  const ex = exercises[currentEx]
  const isCorrect = selected !== null && ex.alternatives?.[selected] === ex.answer

  const handleSelect = (i: number) => {
    if (showResult) return
    setSelected(i)
    setShowResult(true)
  }

  const handleNext = () => {
    if (selected !== null) {
      addXP(isCorrect ? ex.xp : Math.floor(ex.xp * 0.3))
    }
    if (currentEx < exercises.length - 1) {
      setCurrentEx(p => p + 1)
      setSelected(null)
      setShowResult(false)
      setCompleted(p => [...p, ex.id])
    } else {
      // Lesson complete
      addXP(250)
      addWords(8)
      updateSkillScore('vocabulary', 58)
      updateSkillScore('grammar', 52)
      addHistoryEntry({
        date: 'Today',
        type: 'lesson',
        title: 'Tech English — Daily Standup & Code Review',
        xpGained: 290,
        improvements: { vocabulary: 3, grammar: 2 },
        wordsLearned: 8,
      })
      setLessonDone(true)
    }
  }

  const progress = ((currentEx + (showResult ? 1 : 0)) / exercises.length) * 100

  if (lessonDone) {
    return (
      <AppLayout>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '60px 0' }}>
          <div className="animate-fade-in" style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
          <h1 className="animate-fade-in stagger-1" style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
            Lesson Complete!
          </h1>
          <div className="animate-fade-in stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, margin: '24px 0 32px' }}>
            {[
              { label: 'XP Earned', value: '+290 XP', color: '#6366f1' },
              { label: 'Words Learned', value: '+8 words', color: '#22c55e' },
              { label: 'Grammar +2%', value: 'improved', color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                padding: '14px', borderRadius: 12, background: 'var(--card)',
                border: '1px solid var(--card-border)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
          </div>
          <div className="animate-fade-in stagger-3" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setCurrentEx(0); setSelected(null); setShowResult(false); setCompleted([]); setLessonDone(false) }}
              style={{
                padding: '12px 24px', borderRadius: 10, border: '1px solid var(--card-border)',
                background: 'var(--card)', color: 'var(--foreground)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
              Redo lesson
            </button>
            <button onClick={() => window.location.href = '/dashboard'} style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Back to Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>Tech English — Week 1</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Month 1 · Foundations</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#818cf8' }}>
            <Zap size={14} color="#6366f1" />
            <span>{currentEx + 1} / {exercises.length}</span>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: 5, borderRadius: 3, background: '#27272a', overflow: 'hidden', marginBottom: 28 }}>
          <div style={{
            height: '100%', borderRadius: 3, width: `${progress}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Exercise */}
        <div className="animate-fade-in">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
            borderRadius: 100, fontSize: 12, fontWeight: 600, marginBottom: 16,
            background: 'rgba(99,102,241,0.1)', color: '#818cf8',
          }}>
            {ex.prompt}
          </div>

          <div style={{
            padding: 24, borderRadius: 14, background: 'var(--card)',
            border: '1px solid var(--card-border)', marginBottom: 20,
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, marginBottom: 20 }}>
              {ex.question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ex.alternatives?.map((alt, i) => {
                const isSelectedOpt = selected === i
                const isCorrectOpt = alt === ex.answer

                let border = 'var(--card-border)'
                let bg = '#27272a'
                let color = 'var(--foreground)'
                let icon = null

                if (showResult && isCorrectOpt) { border = '#22c55e'; bg = 'rgba(34,197,94,0.08)'; color = '#22c55e'; icon = <CheckCircle size={16} color="#22c55e" /> }
                if (showResult && isSelectedOpt && !isCorrectOpt) { border = '#ef4444'; bg = 'rgba(239,68,68,0.08)'; color = '#ef4444'; icon = <XCircle size={16} color="#ef4444" /> }

                return (
                  <button key={i} onClick={() => handleSelect(i)} disabled={showResult} style={{
                    padding: '13px 16px', borderRadius: 10, border: `1px solid ${border}`,
                    background: bg, color, fontSize: 14, textAlign: 'left', cursor: showResult ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    fontWeight: (showResult && (isCorrectOpt || isSelectedOpt)) ? 600 : 400,
                    transition: 'all 0.2s',
                  }}>
                    <span>{alt}</span>
                    {icon}
                  </button>
                )
              })}
            </div>
          </div>

          {/* CA005 — Correction feedback */}
          {showResult && (
            <div className="animate-fade-in" style={{
              padding: 20, borderRadius: 14, background: 'var(--card)',
              border: '1px solid var(--card-border)', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Lightbulb size={16} color="#eab308" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#eab308' }}>
                  {isCorrect ? '✅ Correct!' : '❌ Not quite — here\'s why:'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Explanation</div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--foreground)' }}>{ex.explanation}</p>
                </div>
                <div style={{ height: 1, background: 'var(--card-border)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>More natural form</div>
                  <p style={{ fontSize: 14, color: '#818cf8', fontStyle: 'italic' }}>{ex.naturalForm}</p>
                </div>
                <div style={{ height: 1, background: 'var(--card-border)' }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>How natives say it</div>
                  <p style={{ fontSize: 14, color: '#22c55e' }}>{ex.nativeForm}</p>
                </div>
              </div>

              <div style={{
                marginTop: 16, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                color: isCorrect ? '#22c55e' : '#818cf8',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Zap size={13} />
                {isCorrect ? `+${ex.xp} XP` : `+${Math.floor(ex.xp * 0.3)} XP (keep practicing!)`}
              </div>
            </div>
          )}

          {showResult && (
            <button onClick={handleNext} style={{
              width: '100%', padding: '13px', borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {currentEx < exercises.length - 1 ? 'Next exercise' : 'Complete lesson'} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
