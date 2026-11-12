'use client'

import { useState } from 'react'
import { QUIZ_REGISTRY } from '@/lib/quiz'
import { Clock, Play, List, Home } from 'lucide-react'

export default function SimulatorPage() {
  const [level, setLevel] = useState<'B1' | 'B2'>('B1')
  const [count, setCount] = useState(5)
  const [time, setTime] = useState(30)
  const [started, setStarted] = useState(false)

  const pool = QUIZ_REGISTRY.filter((q) => q.level === level && q.exists)

  const startExam = () => {
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, count)
    // open first quiz in new tab
    if (shuffled.length > 0) {
      window.open(`/quiz/${shuffled[0].id}`, '_blank')
    }
    setStarted(true)
  }

  return (
    <div className="flex">
      <div className="hidden md:flex md:w-64 flex-col fixed left-0 top-0 h-full bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
            <span className="font-bold text-lg tracking-tight text-white">TELC</span>
          </div>
          <nav className="space-y-1">
            {['dashboard', 'library', 'simulator', 'mistakes'].map((key) => (
              <a
                key={key}
                href={`/${key}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  key === 'simulator'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {key === 'simulator' ? <Clock className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                {key}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Simulateur d'Examen</h1>
          <p className="text-slate-600">Entraînez-vous dans des conditions réelles</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Niveau</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre de quiz</label>
              <select
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="8">8</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Durée (min)</label>
              <select
                value={time}
                onChange={(e) => setTime(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={startExam}
              className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Démarrer l'examen
            </button>
          </div>
        </div>

        {started && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold mb-4">
              ✓
            </div>
            <h3 className="text-lg font-bold text-green-800 mb-2">Examens prêts</h3>
            <p className="text-green-700 text-sm mb-4">
              {count} quiz de niveau {level} sélectionnés pour {time} minutes.
            </p>
            <p className="text-xs text-green-600">
              Chaque quiz s'ouvre dans un nouvel onglet. Répondez à tous les quiz, puis consultez vos résultats dans le Cahier d'Erreurs.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
