'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { Play, ChevronLeft, ChevronRight, Check, ExternalLink } from 'lucide-react'
import { QUIZ_REGISTRY, getQuizById, getNextQuiz, getPrevQuiz } from '@/lib/quiz'
import { setLastOpened } from '@/lib/storage'

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [quiz, setQuiz] = useState<any>(null)
  const [nextQuiz, setNextQuiz] = useState<any>(null)
  const [prevQuiz, setPrevQuiz] = useState<any>(null)
  const [remaining, setRemaining] = useState(900)

  useEffect(() => {
    const q = getQuizById(id)
    if (!q) return
    setQuiz(q)
    const level = q.level as 'B1' | 'B2'
    setNextQuiz(getNextQuiz(id, level))
    setPrevQuiz(getPrevQuiz(id, level))
    setLastOpened({ id: q.id, title: q.title, level: q.level, category: q.category, file: q.file })

    const title = q.title.toLowerCase() + ' ' + q.category.toLowerCase()
    let secs = 900
    if (title.includes('hör') || title.includes('listening')) secs = 1200
    else if (title.includes('sprach')) secs = 600
    setRemaining(secs)

    const interval = setInterval(() => {
      setRemaining((r) => (r <= 0 ? 0 : r - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [id])

  const timerDisplay = () => {
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Minimal top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Link
            href={quiz ? `/${quiz.level.toLowerCase()}` : '/dashboard'}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {quiz ? `Retour ${quiz.level}` : 'Retour'}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
              <span className="text-xs font-bold text-slate-700">⏱ {timerDisplay()}</span>
            </div>
            <button
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/25 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Korrigieren
            </button>
          </div>
        </div>
      </div>

      {/* Quiz takes full remaining page */}
      <div className="flex-1 relative overflow-hidden">
        {quiz && (
          <iframe
            src={`/quizzes/${quiz.file}`}
            className="w-full h-full block"
            title={quiz.title}
            style={{ border: 'none', display: 'block' }}
          />
        )}
      </div>

      {/* Bottom navigation for next/prev */}
      {quiz && (
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-3 max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            {prevQuiz && (
              <Link
                href={`/quiz/${prevQuiz.id}`}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorheriges
              </Link>
            )}
            {nextQuiz && (
              <Link
                href={`/quiz/${nextQuiz.id}`}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-600/25"
              >
                Nächstes <ChevronRight className="w-4 h-4" />
              </Link>
            )}
            <span className="text-xs text-slate-400 flex-1 text-center">
              {quiz.level} · {quiz.category}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
