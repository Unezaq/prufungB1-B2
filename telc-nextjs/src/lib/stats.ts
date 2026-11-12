import { Attempt, Stats } from '@/types'
import { loadAttempts, loadMistakes } from '@/lib/storage'

export function computeStats(): Stats {
  const attempts = loadAttempts()
  const mistakes = loadMistakes()

  const totalAttempts = attempts.length
  const completedQuizzes = new Set(attempts.map((a) => a.quizId)).size
  const averageAccuracy =
    totalAttempts > 0
      ? (attempts.reduce((s, a) => s + (a.total ? (a.score / a.total) * 100 : 0), 0) / totalAttempts).toFixed(1)
      : '0'

  const byLevel: Record<string, { attempts: number; score: number; total: number; accuracy: number }> = {
    B1: { attempts: 0, score: 0, total: 0, accuracy: 0 },
    B2: { attempts: 0, score: 0, total: 0, accuracy: 0 },
  }

  attempts.forEach((a) => {
    if (!byLevel[a.level]) return
    byLevel[a.level].attempts++
    byLevel[a.level].score += a.score || 0
    byLevel[a.level].total += a.total || 0
  })

  Object.keys(byLevel).forEach((k) => {
    const c = byLevel[k]
    c.accuracy = c.total ? (c.score / c.total) * 100 : 0
  })

  const byCategory: Record<string, { attempts: number; score: number; total: number; accuracy: number }> = {}

  attempts.forEach((a) => {
    const key = `${a.level} · ${a.category}`
    if (!byCategory[key]) byCategory[key] = { attempts: 0, score: 0, total: 0, accuracy: 0 }
    byCategory[key].attempts++
    byCategory[key].score += a.score || 0
    byCategory[key].total += a.total || 0
  })

  Object.keys(byCategory).forEach((k) => {
    const c = byCategory[k]
    c.accuracy = c.total ? (c.score / c.total) * 100 : 0
  })

  return {
    totalAttempts,
    completedQuizzes,
    averageAccuracy: Number(averageAccuracy),
    mistakesCount: mistakes.length,
    byLevel,
    byCategory,
  }
}

export function weakestCategories(n = 3): Array<{ name: string; accuracy: number; attempts: number; total: number }> {
  const { byCategory } = computeStats()
  return Object.entries(byCategory)
    .filter(([_, v]) => v.total >= 3)
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
    .slice(0, n)
    .map(([name, v]) => ({ name, accuracy: v.accuracy, attempts: v.attempts, total: v.total }))
}
