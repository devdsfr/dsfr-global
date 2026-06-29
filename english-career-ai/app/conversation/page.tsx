'use client'
import { useState, useRef, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useStore } from '@/lib/store'
import { getAIResponse } from '@/lib/mock-ai'
import type { ConversationMessage } from '@/lib/mock-ai'
import { Mic, MicOff, Send, Volume2, Sparkles, ChevronDown } from 'lucide-react'

const scenarioOptions = [
  { id: 'standup', label: '📋 Daily Standup', starter: "Good morning! Let's start our daily standup. Can you give me a quick update on what you worked on yesterday, what you're working on today, and if you have any blockers?" },
  { id: 'codereview', label: '🔍 Code Review', starter: "Hi! I left some comments on your PR. I'd love to discuss a few things. Can you walk me through the architecture decision you made in the authentication module?" },
  { id: 'interview', label: '💼 Interview Intro', starter: "Hello! Thanks for joining. Let's start with a simple one — can you tell me about yourself and your background as a developer?" },
  { id: 'meeting', label: '🤝 Team Meeting', starter: "Thanks everyone for joining. Let's discuss the Q3 roadmap. I'd like everyone's input on our priority features. What do you think we should focus on?" },
]

export default function ConversationPage() {
  const [scenario, setScenario] = useState(scenarioOptions[0])
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { role: 'ai', content: scenarioOptions[0].starter }
  ])
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showFeedback, setShowFeedback] = useState<ConversationMessage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { addXP, addHistoryEntry, updateSkillScore } = useStore()

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText) return

    const userMsg: ConversationMessage = { role: 'user', content: messageText }
    setMessages(p => [...p, userMsg])
    setInput('')
    setLoading(true)

    const aiResponse = await getAIResponse(messageText, scenario.id)
    setMessages(p => [...p, aiResponse])
    setShowFeedback(aiResponse)
    setLoading(false)

    addXP(120)
    updateSkillScore('speaking', 45)
  }

  const toggleRecording = () => {
    if (typeof window === 'undefined') return

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognition) {
      // Simulate recording for demo
      setIsRecording(true)
      setTimeout(() => {
        setIsRecording(false)
        const samplePhrases = [
          "Yesterday I worked on the authentication feature. Today I'll be fixing the API bug. No blockers.",
          "I think the approach looks good, but I have a suggestion about the error handling.",
          "I'm a full stack developer with 4 years of experience building web applications.",
        ]
        handleSend(samplePhrases[Math.floor(Math.random() * samplePhrases.length)])
      }, 2500)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsRecording(false)
    }
    recognition.onend = () => setIsRecording(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  const handleScenarioChange = (s: typeof scenarioOptions[0]) => {
    setScenario(s)
    setMessages([{ role: 'ai', content: s.starter }])
    setShowFeedback(null)
  }

  const handleEndSession = () => {
    addHistoryEntry({
      date: 'Today',
      type: 'conversation',
      title: `Conversation: ${scenario.label}`,
      xpGained: 120 * (messages.filter(m => m.role === 'user').length),
      improvements: { speaking: 4 },
      wordsLearned: 3,
    })
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' }}>
        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>
                AI Conversation Practice
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>CA003 & CA004 — Speak, listen, get corrected in real time</p>
            </div>
            <button onClick={handleEndSession} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid var(--card-border)',
              background: 'var(--card)', color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
            }}>
              End Session
            </button>
          </div>

          {/* Scenario selector */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {scenarioOptions.map(s => (
              <button key={s.id} onClick={() => handleScenarioChange(s)} style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                border: `1px solid ${scenario.id === s.id ? '#6366f1' : 'var(--card-border)'}`,
                background: scenario.id === s.id ? 'rgba(99,102,241,0.1)' : 'var(--card)',
                color: scenario.id === s.id ? '#818cf8' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div style={{
          flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14,
          paddingBottom: 16, minHeight: 0,
        }}>
          {messages.map((msg, i) => (
            <div key={i} className="animate-fade-in" style={{
              display: 'flex', gap: 12,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'ai' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#27272a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>
                {msg.role === 'ai' ? '🤖' : '👤'}
              </div>
              <div style={{ maxWidth: '75%' }}>
                <div style={{
                  padding: '12px 16px', borderRadius: 14, fontSize: 14, lineHeight: 1.6,
                  background: msg.role === 'ai' ? 'var(--card)' : 'rgba(99,102,241,0.15)',
                  border: `1px solid ${msg.role === 'ai' ? 'var(--card-border)' : 'rgba(99,102,241,0.3)'}`,
                  color: 'var(--foreground)',
                  borderTopLeftRadius: msg.role === 'ai' ? 4 : 14,
                  borderTopRightRadius: msg.role === 'user' ? 4 : 14,
                }}>
                  {msg.content}
                </div>

                {/* CA004 — Pronunciation feedback */}
                {msg.role === 'ai' && msg.pronunciation && i === messages.length - 1 && (
                  <div className="animate-fade-in" style={{
                    marginTop: 8, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                  }}>
                    <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={10} /> AI Pronunciation Analysis
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {[
                        { label: 'Pronunciation', value: msg.pronunciation.score },
                        { label: 'Fluency', value: msg.pronunciation.fluency },
                        { label: 'Confidence', value: msg.pronunciation.confidence },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: value > 70 ? '#22c55e' : value > 50 ? '#eab308' : '#ef4444' }}>{value}%</span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: '#27272a', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${value}%`, background: value > 70 ? '#22c55e' : value > 50 ? '#eab308' : '#ef4444', borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
                      🎯 {msg.pronunciation.accent}
                    </div>
                  </div>
                )}

                {/* CA005 — Corrections */}
                {msg.role === 'ai' && msg.corrections && (
                  <div className="animate-fade-in" style={{
                    marginTop: 6, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)',
                    fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5, whiteSpace: 'pre-line',
                  }}>
                    {msg.corrections}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>🤖</div>
              <div style={{
                padding: '12px 16px', borderRadius: 14, background: 'var(--card)',
                border: '1px solid var(--card-border)', display: 'flex', gap: 4, alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
                    animation: `pulse-glow 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <button
              onClick={toggleRecording}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: isRecording ? '#ef4444' : 'rgba(99,102,241,0.15)',
                color: isRecording ? '#fff' : '#818cf8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
              }}
              className={isRecording ? 'voice-active' : ''}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <div style={{ flex: 1, position: 'relative' }}>
              {isRecording && (
                <div style={{
                  position: 'absolute', top: -28, left: 0, right: 0,
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#ef4444',
                }}>
                  <div className="recording-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                  Listening... speak in English
                </div>
              )}
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your response in English or use the mic..."
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                rows={2}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid var(--card-border)', background: 'var(--card)',
                  color: 'var(--foreground)', fontSize: 14, lineHeight: 1.5,
                  resize: 'none', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#27272a',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
              }}
            >
              <Send size={18} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
            Press Enter to send · Use mic for voice · AI will correct your English in real time
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
