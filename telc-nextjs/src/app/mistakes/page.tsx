'use client'

import { useEffect, useState } from 'react'
import { TriangleAlert, Trash2, Play } from 'lucide-react'
import { loadMistakes } from '@/lib/storage'

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<any[]>([])

  useEffect(() => {
    setMistakes(loadMistakes())
  }, [])

  return (
    <div className="flex">
      <div className="hidden md:flex md:w-64 flex-col fixed left-0 top-0 h-full bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
            <span className="font-bold text-lg tracking-tight text-white">TELC</span>
          </div>
          <nav className="space-y-1">
            {['dashboard', 'library', 'simulator', 'mistakes'].map((key) => (
              <a
                key={key}
                href={`/${key}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  key === 'mistakes'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {key === 'mistakes' ? <TriangleAlert className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {key}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Cahier d'Erreurs</h1>
          <p className="text-slate-600">Apprenez de vos réponses incorrectes</p>
        </div>

        {mistakes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-slate-400 text-6xl mb-4">📝</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune erreur enregistrée</h2>
            <p className="text-slate-500">Complétez des quiz pour remplir votre cahier d'erreurs.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mistakes.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                      m.level === 'B1' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {m.level}
                    </span>
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      {m.category}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(m.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <div className="text-xs font-bold text-red-600 uppercase mb-1">Votre réponse</div>
                    <div className="text-sm text-slate-700">{m.studentAnswer || '—'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                    <div className="text-xs font-bold text-green-600 uppercase mb-1">Bonne réponse</div>
                    <div className="text-sm text-slate-700">{m.correctAnswer || '—'}</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-50">
                  <div className="text-xs text-slate-500 mb-1">Question</div>
                  <div className="text-sm text-slate-800 italic">{m.question || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => {
              if (confirm('Supprimer toutes les erreurs ?')) {
                localStorage.removeItem('telc_mistakes')
                setMistakes([])
              }
            }}
            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Tout effacer
          </button>
        </div>
      </main>
    </div>
  )
}
