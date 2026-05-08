import { Bell, Menu, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { useAuth } from '../hooks/useAuth'
import { Button } from './Button'
import { PageTransition } from './PageTransition'

interface NavigationItem {
  label: string
  to: string
  icon?: ReactNode
}

interface DashboardLayoutProps {
  title: string
  navigation: NavigationItem[]
  children: ReactNode
}

export const DashboardLayout = ({ title, navigation, children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const roleLabel =
    user?.role === 'superadmin'
      ? 'Super Admin'
      : user?.role === 'teacher_admin'
        ? 'Teacher Admin'
        : 'Student'

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Link to="/" className="brand">
          <span>Vidya</span>Vault
        </Link>
        <p className="sidebar-subtitle">Learning operations platform</p>
        <nav className="nav-list">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${item.icon ? 'nav-item-icon' : ''} ${isActive ? 'active' : ''}`}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </aside>
      <button
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-meta">
            <div className="topbar-leading">
              <button
                className="menu-btn"
                type="button"
                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="header-titles">
                <h1>{title}</h1>
                <p className="muted">
                  {user?.username} · <span className="role-pill">{roleLabel}</span>
                </p>
              </div>
            </div>

            <div className="topbar-search hide-mobile">
               <div className="search-box">
                 <Search size={16} className="search-icon" />
                 <input type="text" placeholder="Quick search..." aria-label="Global search" />
               </div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn-ghost" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>
          </div>
        </header>
        <main className="content">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
