import {
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  Trophy,
  UserRound,
} from 'lucide-react'

import type { ReactNode } from 'react'

type DashboardRole = 'teacher' | 'student'
export type DashboardSection =
  | 'homework'
  | 'practice'
  | 'test'
  | 'leaderboard'
  | 'performance'
  | 'profile'

interface NavigationItem {
  label: string
  to: string
  icon: ReactNode
}

const sectionMeta: Array<{ section: DashboardSection; label: string; icon: ReactNode }> = [
  { section: 'homework', label: 'Homework Section', icon: <FileText size={18} /> },
  { section: 'practice', label: 'Practice', icon: <BookOpenCheck size={18} /> },
  { section: 'test', label: 'Test', icon: <ClipboardCheck size={18} /> },
  { section: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={18} /> },
  { section: 'performance', label: 'Student Performance', icon: <BarChart3 size={18} /> },
  { section: 'profile', label: 'Profile', icon: <UserRound size={18} /> },
]

export const getDashboardNavigation = (role: DashboardRole): NavigationItem[] => {
  const basePath = role === 'teacher' ? '/teacher' : '/student'
  return sectionMeta.map((item) => ({
    label: item.label,
    to: `${basePath}/${item.section}`,
    icon: item.icon,
  }))
}

