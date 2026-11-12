import { User } from '@/types'

const USERS: Record<string, { password: string; role: string }> = {
  admin: { password: 'admin123', role: 'admin' },
  student: { password: 'student123', role: 'student' },
}

export function authenticate(username: string, password: string): User | null {
  const user = USERS[username]
  if (!user || user.password !== password) return null
  return { id: username, username, role: user.role as 'student' | 'admin' }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('telc_user')
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('telc_user')
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function login(user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('telc_user', JSON.stringify(user))
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('telc_user')
}
