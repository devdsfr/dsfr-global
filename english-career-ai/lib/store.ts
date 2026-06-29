'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, User, JobAnalysis, StudyMonth, SkillScores, EnglishLevel, HistoryEntry } from './types'
import { getLevelName, XP_PER_LEVEL } from './types'

const defaultProgress = {
  xp: 350,
  level: 1,
  levelName: 'Intern',
  streak: 3,
  totalWords: 124,
  skillScores: {
    speaking: 42,
    listening: 38,
    reading: 61,
    vocabulary: 55,
    grammar: 48,
  },
  jobReadiness: 18,
  sessionsCompleted: 4,
  weeklyGoal: 5,
  weeklyDone: 3,
  history: [] as HistoryEntry[],
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      onboardingComplete: false,
      assessmentComplete: false,
      jobAnalysis: null,
      studyPlan: [],
      progress: defaultProgress,
      currentLesson: null,

      login: (user: User) => set({ user, isAuthenticated: true }),

      logout: () => set({
        user: null,
        isAuthenticated: false,
        onboardingComplete: false,
        assessmentComplete: false,
        jobAnalysis: null,
        studyPlan: [],
        progress: defaultProgress,
      }),

      setJobAnalysis: (analysis: JobAnalysis) => set({ jobAnalysis: analysis }),

      setStudyPlan: (plan: StudyMonth[]) => set({ studyPlan: plan }),

      completeOnboarding: () => set({ onboardingComplete: true }),

      completeAssessment: (scores: SkillScores, level: EnglishLevel) => {
        const levelMap: Record<EnglishLevel, number> = { A1: 5, A2: 18, B1: 40, B2: 68, C1: 85, C2: 95 }
        set(state => ({
          assessmentComplete: true,
          progress: {
            ...state.progress,
            skillScores: scores,
            jobReadiness: levelMap[level] || 18,
          }
        }))
      },

      addXP: (amount: number) => set(state => {
        const newXP = state.progress.xp + amount
        const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1
        return {
          progress: {
            ...state.progress,
            xp: newXP,
            level: newLevel,
            levelName: getLevelName(newLevel),
          }
        }
      }),

      updateSkillScore: (skill: keyof SkillScores, value: number) => set(state => {
        const newScores = { ...state.progress.skillScores, [skill]: Math.min(100, value) }
        const avg = Object.values(newScores).reduce((a, b) => a + b, 0) / 5
        return {
          progress: {
            ...state.progress,
            skillScores: newScores,
            jobReadiness: Math.round(avg * 0.9),
          }
        }
      }),

      addHistoryEntry: (entry: HistoryEntry) => set(state => ({
        progress: {
          ...state.progress,
          history: [entry, ...state.progress.history].slice(0, 50),
          sessionsCompleted: state.progress.sessionsCompleted + 1,
          weeklyDone: Math.min(state.progress.weeklyGoal, state.progress.weeklyDone + 1),
        }
      })),

      addWords: (count: number) => set(state => ({
        progress: {
          ...state.progress,
          totalWords: state.progress.totalWords + count,
        }
      })),

      completeWeek: (monthIndex: number, weekIndex: number) => set(state => ({
        studyPlan: state.studyPlan.map((month, mi) =>
          mi === monthIndex
            ? {
                ...month,
                weeks: month.weeks.map((week, wi) =>
                  wi === weekIndex ? { ...week, completed: true } : week
                )
              }
            : month
        )
      })),
    }),
    {
      name: 'english-career-ai',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
        assessmentComplete: state.assessmentComplete,
        jobAnalysis: state.jobAnalysis,
        studyPlan: state.studyPlan,
        progress: state.progress,
      }),
    }
  )
)
