'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Gauge,
  BookOpen,
  Lightbulb,
  TriangleAlert,
  Clock,
  Play,
  ChevronRight,
} from 'lucide-react'
import { computeStats, weakestCategories } from '@/lib/stats'
import { loadAttempts, getLastOpened } from '@/lib/storage'
import { QUIZ_REGISTRY, getQuizById } from '@/lib/quiz'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [weak, setWeak] = useState<any[]>([])

  useEffect(() => {
    setStats(computeStats())
    setWeak(weakestCategories(4))
  }, [])

  const last = getLastOpened()
  const quiz = last ? getQuizById(last.id) : null

  // Recent activity items
  const recentItems = loadAttempts().slice(-5).reverse()

  return (
    <div className="flex">
      <div className="hidden md:flex md:w-64 flex-col fixed left-0 top-0 h-full bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-50">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
            <span className="font-bold text-lg tracking-tight text-white">TELC</span>
          </Link>
          <nav className="space-y-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: Gauge, active: true },
              { key: 'library', label: 'Quiz Library', icon: BookOpen },
              { key: 'simulator', label: 'Simulateur', icon: Play },
              { key: 'mistakes', label: 'Erreurs', icon: TriangleAlert },
              { key: 'analytics', label: 'Analytics', icon: Gauge },
            ].map((item) => (
              <Link
                key={item.key}
                href={`/${item.key}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  item.active
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Bienvenue</h1>
          <p className="text-slate-600">Suivez votre progression TELC B1/B2</p>
        </div>

        {/* Welcome stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Quiz terminés', value: stats?.completedQuizzes ?? 0, icon: BookOpen, color: 'text-blue-600' },
            { label: 'Tentatives', value: stats?.totalAttempts ?? 0, icon: Gauge, color: 'text-purple-600' },
            { label: 'Précision', value: stats?.averageAccuracy?.toFixed(1) ?? '0', unit: '%', icon: Play, color: 'text-green-600' },
            { label: 'Erreurs', value: stats?.mistakesCount ?? 0, icon: TriangleAlert, color: 'text-red-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${stat.color} bg-${stat.color === 'text-blue-600' ? 'blue' : stat.color === 'text-purple-600' ? 'purple' : stat.color === 'text-green-600' ? 'green' : 'red'}-500/10 flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}{stat.unit}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Continue */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Reprendre l'apprentissage
                </h2>
              </div>
              {quiz ? (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    Q
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{quiz.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">{quiz.level}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">{quiz.category}</span>
                    </div>
                  </div>
                  <Link href={`/quiz/${quiz.id}`} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                    Continuer
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>Aucune activité pour le moment</p>
                  <Link href="/library" className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block">
                    Commencer un quiz
                  </Link>
                </div>
              )}
            </div>

            {/* Recommendation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Recommandation suivante
              </h2>
              <div className="text-center py-6 text-slate-400">
                <p>Terminez des quiz pour recevoir des recommandations personnalisées.</p>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TriangleAlert className="w-5 h-5 text-red-500" />
                Points à améliorer
              </h2>
              {weak.length > 0 ? (
                <div className="space-y-3">
                  {weak.map((w) => (
                    <div key={w.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{w.name}</div>
                        <div className="text-xs text-slate-500">{w.total} tentatives</div>
                      </div>
                      <div className="text-sm font-bold text-red-600">{w.accuracy.toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Complétez des quiz pour détecter vos points faibles.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                Activité récente
              </h2>
              <div className="space-y-3">
                {recentItems.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    Aucune activité récente.
                  </p>
                ) : (
                  <>
                    {recentItems.map((a) => (
                      <div
                        key={a.quizId + a.date}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50"
                      >
                        <div>
                          <div
                            className="text-sm font-medium text-slate-900 truncate"
                            title={a.title}
                          >
                            {a.title}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <span
                              className="px-1.5 py-0 rounded bg-slate-100 text-slate-600 text-[10px]"
                            >
                              {a.level}
                            </span>
                            <span>{new Date(a.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {a.score}/{a.total}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
