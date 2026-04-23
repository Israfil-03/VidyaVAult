import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuth } from '../hooks/useAuth'
import { Button } from './Button'

interface DashboardLayoutProps {
  title: string
  navigation: Array<{ label: string; to: string }>
  children: ReactNode
}

export const DashboardLayout = ({ title, navigation, children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth()
  const roleLabel =
    user?.role === 'superadmin'
      ? 'Super Admin'
      : user?.role === 'teacher_admin'
        ? 'Teacher Admin'
        : 'Student'

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span>Vidya</span>Vault
        </Link>
        <p className="sidebar-subtitle">Learning operations platform</p>
        <nav className="nav-list">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            Profile & Security
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-meta">
            <h1>{title}</h1>
            <p>
              {user?.username} · <span className="role-pill">{roleLabel}</span>
            </p>
          </div>
          <Link to="/profile" className="profile-shortcut">
            View profile
          </Link>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
