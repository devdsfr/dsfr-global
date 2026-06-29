export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface SkillScores {
  speaking: number
  listening: number
  reading: number
  vocabulary: number
  grammar: number
}

export interface JobAnalysis {
  title: string
  company: string
  expectedLevel: EnglishLevel
  technologies: string[]
  softSkills: string[]
  technicalTerms: string[]
  commonExpressions: string[]
  keyPhrases: string[]
  profileExpected: string
}

export interface StudyWeek {
  week: number
  topics: string[]
  completed: boolean
}

export interface StudyMonth {
  month: number
  title: string
  weeks: StudyWeek[]
}

export interface UserProgress {
  xp: number
  level: number
  levelName: string
  streak: number
  totalWords: number
  skillScores: SkillScores
  jobReadiness: number
  sessionsCompleted: number
  weeklyGoal: number
  weeklyDone: number
  history: HistoryEntry[]
}

export interface HistoryEntry {
  date: string
  type: 'lesson' | 'conversation' | 'interview' | 'assessment'
  title: string
  xpGained: number
  improvements: Partial<SkillScores>
  wordsLearned: number
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
}

export interface AppState {
  user: User | null
  isAuthenticated: boolean
  onboardingComplete: boolean
  assessmentComplete: boolean
  jobAnalysis: JobAnalysis | null
  studyPlan: StudyMonth[]
  progress: UserProgress
  currentLesson: string | null

  // Actions
  login: (user: User) => void
  logout: () => void
  setJobAnalysis: (analysis: JobAnalysis) => void
  setStudyPlan: (plan: StudyMonth[]) => void
  completeOnboarding: () => void
  completeAssessment: (scores: SkillScores, level: EnglishLevel) => void
  addXP: (amount: number) => void
  updateSkillScore: (skill: keyof SkillScores, value: number) => void
  addHistoryEntry: (entry: HistoryEntry) => void
  addWords: (count: number) => void
  completeWeek: (monthIndex: number, weekIndex: number) => void
}

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Intern',
  2: 'Intern II',
  3: 'Intern III',
  4: 'Junior I',
  5: 'Junior',
  6: 'Junior II',
  7: 'Junior III',
  8: 'Mid I',
  9: 'Mid',
  10: 'Mid II',
  15: 'Senior I',
  20: 'Senior',
  25: 'Senior II',
  30: 'International Ready',
}

export const XP_PER_LEVEL = 500

export const getLevelName = (level: number): string => {
  const levels = Object.keys(LEVEL_NAMES).map(Number).sort((a, b) => b - a)
  for (const l of levels) {
    if (level >= l) return LEVEL_NAMES[l]
  }
  return 'Intern'
}

export const getReadinessLabel = (score: number): { label: string; color: string; emoji: string } => {
  if (score >= 90) return { label: 'Pronto!', color: '#22c55e', emoji: '🟢' }
  if (score >= 70) return { label: 'Quase', color: '#eab308', emoji: '🟡' }
  if (score >= 50) return { label: 'Em progresso', color: '#f97316', emoji: '🟠' }
  return { label: 'Iniciando', color: '#ef4444', emoji: '🔴' }
}
