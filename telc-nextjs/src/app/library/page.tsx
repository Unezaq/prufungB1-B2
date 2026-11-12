'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, Play, ChevronRight } from 'lucide-react'
import { QUIZ_REGISTRY, getQuizById } from '@/lib/quiz'

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 'B1' | 'B2'>('all')
  const [catFilter, setCatFilter] = useState('all')

  const categories = useMemo(() => {
    const cats = [...new Set(QUIZ_REGISTRY.map((q) => q.category))].sort()
    return cats
  }, [])

  const filtered = useMemo(() => {
    return QUIZ_REGISTRY.filter((q) => {
      if (!q.exists) return false
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false
      if (levelFilter !== 'all' && q.level !== levelFilter) return false
      if (catFilter !== 'all' && q.category !== catFilter) return false
      return true
    })
  }, [search, levelFilter, catFilter])

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
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'library', label: 'Quiz Library', active: true },
              { key: 'simulator', label: 'Simulateur' },
              { key: 'mistakes', label: 'Erreurs' },
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
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bibliothèque de Quiz</h1>
            <p className="text-slate-600">Tous les quiz TELC disponibles</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un quiz..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="w-full sm:w-32 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les niveaux</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full sm:w-48 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="text-slate-400 text-4xl mb-4">🔍</div>
              <p className="text-slate-600">Aucun quiz ne correspond à vos filtres.</p>
            </div>
          ) : (
            filtered.map((quiz) => (
              <div key={quiz.id} className="group relative bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all p-5">
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    quiz.level === 'B1' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {quiz.level}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 mb-2 line-clamp-1">{quiz.title}</h3>
                <p className="text-xs text-slate-500 mb-4 truncate">{quiz.category}</p>
                <Link
                  href={`/quiz/${quiz.id}`}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors"
                >
                  Commencer
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 text-center text-slate-400">
          {filtered.length} quiz disponibles
        </div>
      </main>
    </div>
  )
}
