'use client'

import { Trash2, Download, User as UserIcon, Shield } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex">
      <div className="hidden md:flex md:w-64 flex-col fixed left-0 top-0 h-full bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 rounded-full bg-slate-500 shadow-[0_0_12px_rgba(100,116,139,0.6)]" />
            <span className="font-bold text-lg tracking-tight text-white">TELC</span>
          </div>
          <nav className="space-y-1">
            <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700/50 text-white border border-slate-600/30">
              <Shield className="w-5 h-5" />
              Réglages
            </a>
          </nav>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Réglages</h1>
          <p className="text-slate-600">Gérez votre compte et vos données</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Gestion des données</h2>
          <p className="text-slate-600 mb-6">
            Toutes vos données (progression, erreurs, objectifs) sont stockées localement dans votre navigateur.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => {
                if (confirm('Effacer toutes les tentatives ?')) {
                  localStorage.removeItem('telc_attempts')
                  alert('Tentatives effacées')
                }
              }}
              className="w-full py-3 px-6 rounded-xl bg-red-50 text-red-700 border border-red-100 font-semibold hover:bg-red-100 transition-colors flex items-center justify-between"
            >
              <span>
                <Trash2 className="w-4 h-4 mr-2" />
                Effacer les tentatives
              </span>
            </button>
            <button
              onClick={() => {
                if (confirm('Effacer toutes les erreurs ?')) {
                  localStorage.removeItem('telc_mistakes')
                  alert('Erreurs effacées')
                }
              }}
              className="w-full py-3 px-6 rounded-xl bg-red-50 text-red-700 border border-red-100 font-semibold hover:bg-red-100 transition-colors flex items-center justify-between"
            >
              <span>
                <Trash2 className="w-4 h-4 mr-2" />
                Effacer le cahier d'erreurs
              </span>
            </button>
            <button
              onClick={() => {
                if (confirm('Effacer TOUTES les données ?')) {
                  localStorage.clear()
                  alert('Toutes les données effacées')
                  window.location.reload()
                }
              }}
              className="w-full py-3 px-6 rounded-xl bg-red-100 text-red-800 border border-red-200 font-bold hover:bg-red-200 transition-colors flex items-center justify-between"
            >
              <span>
                <Trash2 className="w-4 h-4 mr-2" />
                Réinitialiser complètement
              </span>
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Exporter vos données</h3>
            <button
              onClick={() => {
                const data = {
                  attempts: JSON.parse(localStorage.getItem('telc_attempts') || '[]'),
                  mistakes: JSON.parse(localStorage.getItem('telc_mistakes') || '[]'),
                  goals: JSON.parse(localStorage.getItem('telc_goals') || '{}'),
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'telc-data.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="w-full py-3 px-6 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors flex items-center justify-between gap-2"
            >
              <span>
                <Download className="w-4 h-4 mr-2" />
                Télécharger JSON
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
