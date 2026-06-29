'use client'
import { useStore } from '@/lib/store'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, onboardingComplete, assessmentComplete } = useStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    if (!onboardingComplete && !pathname.startsWith('/onboarding')) {
      router.push('/onboarding')
      return
    }
    if (onboardingComplete && !assessmentComplete && !pathname.startsWith('/onboarding')) {
      router.push('/onboarding/assessment')
      return
    }
  }, [isAuthenticated, onboardingComplete, assessmentComplete, pathname, router])

  if (!isAuthenticated) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 240,
        padding: '32px',
        minHeight: '100vh',
        background: 'var(--background)',
      }}>
        {children}
      </main>
    </div>
  )
}
