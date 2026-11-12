'use client'

import Link from 'next/link'
import { CalendarCheck, Play, Target } from 'lucide-react'
import { useState } from 'react'
import { weakestCategories } from '@/lib/stats'
import { QUIZ_REGISTRY } from '@/lib/quiz'
import { loadAttempts } from '@/lib/storage'

export default function PlannerPage() {
  const [dailyGoal, setDailyGoal] = useState(5)

  const attempts = loadAttempts()
  const today = new Date().toDateString()
  const todayAttempts = attempts.filter((a) => new Date(a.date).toDateString() === today)
  const progress = Math.min(100, (todayAttempts.length / dailyGoal) * 100)

  const weak = weakestCategories(3)
  const done = new Set(attempts.map((a) => a.quizId))
  const recs = QUIZ_REGISTRY.filter((q) => q.exists && !done.has(q.id)).slice(0, 5)

  return (
    <div className="flex">
      <div className="hidden md:flex md:w-64 flex-col fixed left-0 top-0 h-full bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
            <span className="font-bold text-lg tracking-tight text-white">TELC</span>
          </div>
          <nav className="space-y-1">
            {['dashboard', 'planner'].map((key) => (
              <a
                key={key}
                href={`/${key}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  key === 'planner'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {key === 'planner' ? <CalendarCheck className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {key}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Planificateur d'Étude</h1>
          <p className="text-slate-600">Fixez vos objectifs quotidiens et suivez votre progression</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Objectif quotidien</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(parseInt(e.target.value) || 5)}
                    min="1"
                    max="20"
                    className="w-16 px-3 py-2 rounded-lg border border-slate-200 text-center"
                  />
                  <button
                    onClick={() => localStorage.setItem('telc_goals', JSON.stringify({ daily: dailyGoal }))}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Progression aujourd'hui</span>
                  <span className="font-bold text-slate-900">{todayAttempts.length} / {dailyGoal}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1 text-center">
                  {todayAttempts.length >= dailyGoal ? 'Objectif atteint !' : `${dailyGoal - todayAttempts.length} quiz restants`}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Quiz recommandés</h2>
              <div className="space-y-3">
                {recs.length > 0 ? (
                  recs.map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{q.title}</div>
                        <div className="text-xs text-slate-500">{q.level} · {q.category}</div>
                      </div>
                      <Link
                        href={`/quiz/${q.id}`}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                      >
                        Commencer
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-4">Tous les quiz sont terminés !</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Domaines à travailler
              </h2>
              {weak.length > 0 ? (
                weak.map((w) => (
                  <div key={w.name} className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{w.name}</span>
                      <span className="font-bold text-red-600">{w.accuracy.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-red-500" style={{ width: `${w.accuracy}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4">Complétez des quiz pour voir vos domaines à améliorer.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
