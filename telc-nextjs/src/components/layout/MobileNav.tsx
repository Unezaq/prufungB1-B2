'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, MessageCircle, Plus, Bell, User } from 'lucide-react'

const items = [
  { key: 'dashboard', href: '/dashboard', icon: Home, label: 'Home' },
  { key: 'library', href: '/library', icon: MessageCircle, label: 'Quiz' },
  { key: 'add', href: '#', icon: Plus, label: 'Add', isAdd: true },
  { key: 'mistakes', href: '/mistakes', icon: Bell, label: 'Erreurs' },
  { key: 'settings', href: '/settings', icon: User, label: 'Profil' },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [active, setActive] = useState<string>('dashboard')

  useEffect(() => {
    const map: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/library': 'library',
      '/mistakes': 'mistakes',
      '/settings': 'settings',
    }
    setActive(map[pathname] || 'dashboard')
  }, [pathname])

  return (
    <nav className="fixed bottom-[26px] left-1/2 -translate-x-1/2 z-50 w-[min(90vw,720px)] h-[72px] bg-white/85 backdrop-blur-2xl border border-white/60 rounded-[36px] px-5 shadow-[0_22px_48px_rgba(0,0,0,0.10)] flex items-center justify-between gap-8 relative">
      {items.map((item) => {
        if (item.isAdd) {
          return (
            <button
              key={item.key}
              className="absolute top-[-16px] left-1/2 -translate-x-1/2 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center shadow-[0_10px_26px_rgba(79,140,255,0.45)] ring-5 ring-white z-10 hover:scale-95 active:scale-90 transition-transform"
              onClick={() => {}}
            >
              <Plus className="w-6 h-6" />
            </button>
          )
        }
        const isActive = active === item.key
        const Icon = item.icon
        return (
          <a
            key={item.key}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 px-2 py-2 rounded-2xl text-sm font-bold transition-all ${
              isActive
                ? 'text-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
            }`}
          >
            <Icon className="w-6 h-6" />
            {isActive && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1" />}
          </a>
        )
      })}
    </nav>
  )
}
