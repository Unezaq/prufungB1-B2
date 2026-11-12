'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Gauge,
  BookOpen,
  Clock,
  TriangleAlert,
  BarChart3,
  CalendarCheck,
  Settings,
  Home,
  LogOut,
} from 'lucide-react'

const navItems = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: Gauge },
  { key: 'b1', href: '/b1', label: 'B1 Préparation', icon: BookOpen },
  { key: 'b2', href: '/b2', label: 'B2 Préparation', icon: BookOpen },
  { key: 'library', href: '/library', label: 'Tous les Quiz', icon: BookOpen },
  { key: 'simulator', href: '/simulator', label: 'Simulateur', icon: Clock },
  { key: 'mistakes', href: '/mistakes', label: 'Cahier d\'Erreurs', icon: TriangleAlert },
  { key: 'analytics', href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'planner', href: '/planner', label: 'Planificateur', icon: CalendarCheck },
  { key: 'settings', href: '/settings', label: 'Réglages', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900/90 backdrop-blur-xl border-r border-white/10 z-50">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 mb-8">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(79,140,255,0.6)]" />
          <span className="font-bold text-lg tracking-tight text-white">TELC</span>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="absolute bottom-0 left-0 w-full p-6 border-t border-white/10">
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </Link>
      </div>
    </aside>
  )
}
