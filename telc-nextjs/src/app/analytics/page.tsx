'use client'

import { BarChart3, Play } from 'lucide-react'
import { computeStats } from '@/lib/stats'

export default function AnalyticsPage() {
  const stats = computeStats()

  return (
    <div className="flex">
      <div className="hidden md:flex md:w-64 flex-col fixed left-0 top-0 h-full bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]" />
            <span className="font-bold text-lg tracking-tight text-white">TELC</span>
          </div>
          <nav className="space-y-1">
            {['dashboard', 'library', 'analytics'].map((key) => (
              <a
                key={key}
                href={`/${key}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  key === 'analytics'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {key === 'analytics' ? <BarChart3 className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {key}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600">Votre progression basée sur de vraies données</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Précision par catégorie (B1)</h2>
            <div className="space-y-4">
              {Object.entries(stats.byLevel.B1 ? {} : {}).length > 0 ? null : (
                <p className="text-slate-400 text-center py-10">Aucune donnée B1 pour le moment.</p>
              )}
              {Object.entries(stats.byCategory)
                .filter(([k]) => k.startsWith('B1'))
                .map(([name, v]) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{name.replace('B1 · ', '')}</div>
                      <div className="text-xs text-slate-500">{v.attempts} tentative(s)</div>
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${Math.min(100, v.accuracy)}%` }}
                      />
                    </div>
                    <div className="text-sm font-bold text-slate-900 ml-3">{v.accuracy.toFixed(0)}%</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Précision par catégorie (B2)</h2>
            <div className="space-y-4">
              {Object.entries(stats.byCategory)
                .filter(([k]) => k.startsWith('B2'))
                .map(([name, v]) => (
                  <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{name.replace('B2 · ', '')}</div>
                      <div className="text-xs text-slate-500">{v.attempts} tentative(s)</div>
                    </div>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-600"
                        style={{ width: `${Math.min(100, v.accuracy)}%` }}
                      />
                    </div>
                    <div className="text-sm font-bold text-slate-900 ml-3">{v.accuracy.toFixed(0)}%</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
