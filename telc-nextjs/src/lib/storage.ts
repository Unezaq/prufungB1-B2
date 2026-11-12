import { Attempt, Mistake } from '@/types'

const ATTEMPTS_KEY = 'telc_attempts'
const MISTAKES_KEY = 'telc_mistakes'
const LAST_OPENED_KEY = 'telc_last_opened'
const GOALS_KEY = 'telc_goals'

export function loadAttempts(): Attempt[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveAttempt(attempt: Attempt): void {
  if (typeof window === 'undefined') return
  const attempts = loadAttempts()
  attempts.push(attempt)
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
}

export function loadMistakes(): Mistake[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MISTAKES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveMistakes(mistakes: Mistake[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes))
}

export function addMistakes(newMistakes: Mistake[]): void {
  if (typeof window === 'undefined') return
  const all = loadMistakes()
  all.push(...newMistakes)
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(all))
}

export function getLastOpened(): { id: string; title: string; level: string; category: string; file: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_OPENED_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setLastOpened(quiz: { id: string; title: string; level: string; category: string; file: string }): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_OPENED_KEY, JSON.stringify(quiz))
}

export function getGoals(): { daily: number } {
  if (typeof window === 'undefined') return { daily: 5 }
  try {
    const raw = localStorage.getItem(GOALS_KEY)
    return raw ? JSON.parse(raw) : { daily: 5 }
  } catch {
    return { daily: 5 }
  }
}

export function setGoals(goals: { daily: number }): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ATTEMPTS_KEY)
  localStorage.removeItem(MISTAKES_KEY)
  localStorage.removeItem(LAST_OPENED_KEY)
  localStorage.removeItem(GOALS_KEY)
}
