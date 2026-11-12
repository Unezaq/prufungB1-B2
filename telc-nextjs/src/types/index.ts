export interface Quiz {
  id: string
  file: string
  level: 'B1' | 'B2'
  category: string
  title: string
  exists?: boolean
}

export interface Attempt {
  quizId: string
  title: string
  level: string
  category: string
  score: number
  total: number
  date: number
}

export interface Mistake {
  quizId: string
  title: string
  level: string
  category: string
  question: string
  studentAnswer: string
  correctAnswer: string
  type: 'radio' | 'blank'
  date: number
}

export interface User {
  id: string
  username: string
  role: 'student' | 'admin'
}

export interface Stats {
  totalAttempts: number
  completedQuizzes: number
  averageAccuracy: number
  mistakesCount: number
  byLevel: Record<string, { attempts: number; score: number; total: number; accuracy: number }>
  byCategory: Record<string, { attempts: number; score: number; total: number; accuracy: number }>
}

export interface QuizSection {
  title: string
  quizzes: Quiz[]
}
