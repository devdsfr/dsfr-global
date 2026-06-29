'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getLevelName, XP_PER_LEVEL, getReadinessLabel } from '@/lib/types'
import {
  LayoutDashboard, BookOpen, Mic, Video, BarChart3,
  Map, LogOut, Zap, Target, Flame, ChevronRight
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/study-plan', icon: Map, label: 'Study Plan' },
  { href: '/lessons', icon: BookOpen, label: 'Lessons' },
  { href: '/conversation', icon: Mic, label: 'Conversation' },
  { href: '/interview', icon: Video, label: 'Mock Interview' },
  { href: '/progress', icon: BarChart3, label: 'Progress' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, progress, logout } = useStore()

  const xpInLevel = progress.xp % XP_PER_LEVEL
  const xpPercent = (xpInLevel / XP_PER_LEVEL) * 100
  const readiness = getReadinessLabel(progress.jobReadiness)

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'var(--card)',
      borderRight: '1px solid var(--card-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--card-border)' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>🌊</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)' }}>English Career</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>AI Platform</div>
            </div>
          </div>
        </Link>
      </div>

      {/* User XP Card */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff',
          }}>
            {user?.name?.[0]?.toUpperCase() || 'D'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{user?.name || 'Daniel'}</div>
            <div style={{ fontSize: 11, color: 'var(--accent)' }}>Lv.{progress.level} · {getLevelName(progress.level)}</div>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Zap size={10} color="#6366f1" /> XP
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{xpInLevel}/{XP_PER_LEVEL}</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: '#27272a', overflow: 'hidden' }}>
            <div className="xp-bar" style={{ height: '100%', width: `${xpPercent}%`, borderRadius: 3 }} />
          </div>
        </div>

        {/* Streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flame size={13} color="#f97316" />
          <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>{progress.streak} day streak</span>
        </div>
      </div>

      {/* Job Readiness */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--card-border)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Interview Readiness
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, height: 6, borderRadius: 3, background: '#27272a', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${progress.jobReadiness}%`,
              background: readiness.color,
              transition: 'width 1s ease',
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: readiness.color }}>{progress.jobReadiness}%</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
          {readiness.emoji} {readiness.label} para entrevistas
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? '#818cf8' : 'var(--muted)',
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s',
                cursor: 'pointer',
                borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
              }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget
                    el.style.background = 'rgba(255,255,255,0.05)'
                    el.style.color = 'var(--foreground)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget
                    el.style.background = 'transparent'
                    el.style.color = 'var(--muted)'
                  }
                }}
              >
                <Icon size={17} />
                <span style={{ flex: 1 }}>{label}</span>
                {active && <ChevronRight size={14} />}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Target size={14} color="var(--muted)" />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Goal: <span style={{ color: '#818cf8' }}>International Dev Job</span>
          </span>
        </div>
        <button
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--muted)', cursor: 'pointer',
            background: 'none', border: 'none', padding: 0,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
