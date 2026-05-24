import { Sparkles, Trophy, Flame } from 'lucide-react'
import { useEffect } from 'react'
import { Confetti } from './Confetti'

interface CelebrationProps {
  type: 'LEVEL_UP' | 'MEDAL'
  title: string
  subtitle?: string
  description: string
  points?: number
  iconName: string
  onClose: () => void
}

export const renderBadgeIcon = (iconName: string, size = 64) => {
  // SVG templates for all 20 medals/badges
  switch (iconName) {
    case 'first_step':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#bronze_grad)" stroke="#d97706" strokeWidth="2" />
          <path d="M26 38L32 32M32 32L38 26M32 32L38 38M32 32L26 26" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 36L20 44H16V40L24 32" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="24" r="6" stroke="#fbbf24" strokeWidth="3" />
          <defs>
            <linearGradient id="bronze_grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#78350f" />
              <stop offset="1" stopColor="#b45309" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'consistent_scholar':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#silver_grad)" stroke="#9ca3af" strokeWidth="2" />
          <path d="M32 14L36 26H48L38 34L42 46L32 38L22 46L26 34L16 26H28L32 14Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" strokeLinejoin="round" />
          <path d="M32 20L34.5 28H42L36 33L38 41L32 36L26 41L28 33L22 28H29.5L32 20Z" fill="#fff" />
          <defs>
            <linearGradient id="silver_grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#374151" />
              <stop offset="1" stopColor="#4b5563" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'daily_champion':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 6L50 14V34C50 44 42.5 52 32 58C21.5 52 14 44 14 34V14L32 6Z" fill="url(#gold_grad)" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M26 32L30 36L38 24" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 18L10 24L12 36L20 30" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <path d="M46 18L54 24L52 36L44 30" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="gold_grad" x1="14" y1="6" x2="50" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b45309" />
              <stop offset="0.5" stopColor="#d97706" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'perfect_scholar':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="22" y="44" width="20" height="4" rx="2" fill="#d97706" />
          <path d="M32 44V36M30 40H34" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 16V24C18 31.7 24.3 38 32 38C39.7 38 46 31.7 46 24V16H18Z" fill="url(#gold_grad)" stroke="#fbbf24" strokeWidth="2" />
          <path d="M18 18H10V26C10 29 12.5 31.5 15.5 31.5H18" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M46 18H54V26C54 29 51.5 31.5 48.5 31.5H46" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="24" r="5" fill="#fff" />
          <defs>
            <linearGradient id="gold_grad" x1="18" y1="16" x2="46" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b45309" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'academic_titan':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#hologram_grad)" stroke="#818cf8" strokeWidth="2.5" />
          <path d="M32 12L50 22V42L32 52L14 42V22L32 12Z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <path d="M32 12V32M32 32L50 22M32 32L14 22M32 32L32 52M32 32L50 42M32 32L14 42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <defs>
            <linearGradient id="hologram_grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#312e81" />
              <stop offset="0.5" stopColor="#4f46e5" />
              <stop offset="1" stopColor="#818cf8" />
            </linearGradient>
          </defs>
        </svg>
      )

    // --- Physics ---
    case 'newtonian_pioneer':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <ellipse cx="32" cy="32" rx="20" ry="6" stroke="#f59e0b" strokeWidth="1.5" transform="rotate(30 32 32)" />
          <ellipse cx="32" cy="32" rx="20" ry="6" stroke="#f59e0b" strokeWidth="1.5" transform="rotate(-30 32 32)" />
          <circle cx="32" cy="32" r="5" fill="#f59e0b" />
          <path d="M32 10C35 10 37 13 36 16C33 22 28 20 25 15C26 12 29 10 32 10Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
          <path d="M32 10V6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'quantum_leap':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="32" cy="32" r="6" fill="#fff" stroke="#f59e0b" strokeWidth="3" />
          <path d="M12 32C12 32 20 22 32 22C44 22 52 32 52 32" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M12 32C12 32 20 42 32 42C44 42 52 32 52 32" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="20" cy="26" r="3" fill="#6366f1" />
          <circle cx="44" cy="38" r="3" fill="#6366f1" />
        </svg>
      )
    case 'galileos_observer':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <path d="M18 46L24 30L44 18L48 22L28 42L22 48L18 46Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
          <path d="M26 36L14 50M30 32L38 48" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <circle cx="48" cy="16" r="2" fill="#fbbf24" />
          <circle cx="54" cy="22" r="3" fill="#fbbf24" />
        </svg>
      )
    case 'relativistic_master':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <path d="M20 16H44V22L36 32L44 42V48H20V42L28 32L20 22V16Z" fill="rgba(255,255,255,0.03)" stroke="#f59e0b" strokeWidth="2.5" />
          <path d="M24 20C28 26 36 26 40 20" fill="#f59e0b" />
          <path d="M30 42C31 40 33 40 34 42L38 46H26L30 42Z" fill="#f59e0b" />
          <circle cx="32" cy="32" r="1.5" fill="#f59e0b" />
        </svg>
      )
    case 'cosmic_explorer':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#03001e" stroke="#c084fc" strokeWidth="2" />
          <path d="M32 32C24 38 14 36 10 32C6 28 10 20 18 20" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 32C40 26 50 28 54 32C58 36 54 44 46 44" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="32" r="4" fill="#fff" />
        </svg>
      )

    // --- Chemistry ---
    case 'molecular_apprentice':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <path d="M22 48L28 30V18H36V30L42 48H22Z" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M24 44H40" stroke="#34d399" strokeWidth="2" />
          <circle cx="28" cy="38" r="2" fill="#fff" />
          <circle cx="34" cy="42" r="1.5" fill="#fff" />
          <circle cx="31" cy="35" r="1" fill="#fff" />
        </svg>
      )
    case 'covalent_bond':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <circle cx="24" cy="32" r="10" stroke="#10b981" strokeWidth="2" />
          <circle cx="40" cy="32" r="10" stroke="#10b981" strokeWidth="2" />
          <circle cx="32" cy="32" r="3.5" fill="#fff" />
        </svg>
      )
    case 'alchemists_trial':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <path d="M24 24C24 24 20 28 20 36C20 44 25.4 48 32 48C38.6 48 44 44 44 36C44 28 40 24 40 24H24Z" fill="rgba(255,255,255,0.05)" stroke="#10b981" strokeWidth="2" />
          <path d="M28 24V16H36V24" stroke="#10b981" strokeWidth="2" />
          <rect x="26" y="14" width="12" height="3" rx="1.5" fill="#10b981" />
          <path d="M23 38C26 40 38 40 41 38" stroke="#34d399" strokeWidth="2.5" />
        </svg>
      )
    case 'catalytic_reaction':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <path d="M20 44L36 20V12H42V8" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 20L34 26" stroke="#fbbf24" strokeWidth="2" />
          <path d="M12 20L18 24M44 40L50 42" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="28" cy="36" r="3" fill="#fff" />
        </svg>
      )
    case 'noble_gas_status':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <circle cx="32" cy="32" r="16" stroke="#059669" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="8" stroke="#34d399" strokeWidth="2" />
          <circle cx="32" cy="16" r="2" fill="#fff" />
          <circle cx="32" cy="48" r="2" fill="#fff" />
          <circle cx="16" cy="32" r="2" fill="#fff" />
          <circle cx="48" cy="32" r="2" fill="#fff" />
        </svg>
      )

    // --- Math ---
    case 'arithmetic_ace':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M22 24H30M26 20V28" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          <path d="M36 24H44" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 42C22 42 25 36 32 36C39 36 42 42 42 42" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 44H40" stroke="#3b82f6" strokeWidth="2" />
        </svg>
      )
    case 'eulers_disciple':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M16 48H48M32 16V48" stroke="#1d4ed8" strokeWidth="2" />
          <path d="M16 16C32 16 48 32 48 48" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M32 32C24 32 20 24 20 16" stroke="#60a5fa" strokeWidth="2" />
        </svg>
      )
    case 'pythagorean_explorer':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M20 44V20H44L20 44Z" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth="3" strokeLinejoin="round" />
          <rect x="20" y="40" width="4" height="4" fill="none" stroke="#3b82f6" strokeWidth="2" />
        </svg>
      )
    case 'infinite_series':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M20 32C20 24 24 20 28 20C32 20 36 28 36 32C36 36 40 44 44 44C48 44 52 40 52 32" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          <path d="M12 32C12 24 16 20 20 20" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="32" r="2" fill="#fff" />
        </svg>
      )
    case 'fields_medalist':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="32" cy="32" r="14" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <line x1="32" y1="18" x2="32" y2="46" stroke="#2563eb" strokeWidth="1.5" />
          <line x1="18" y1="32" x2="46" y2="32" stroke="#2563eb" strokeWidth="1.5" />
          <path d="M14 24C16 28 16 36 14 40M50 24C48 28 48 36 50 40" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    default:
      // Level Up or general trophy fallback
      return <Trophy size={size} className="text-warning-500" strokeWidth={1.5} />
  }
}

export const GamificationCelebration = ({
  type,
  title,
  subtitle,
  description,
  points = 0,
  iconName,
  onClose,
}: CelebrationProps) => {
  // Set theme colors based on subject context
  let colorGlowRgb = '99, 102, 241' // Indigo
  const iconLower = iconName.toLowerCase()
  if (iconLower.includes('newtonian') || iconLower.includes('quantum') || iconLower.includes('galileo') || iconLower.includes('relativ') || iconLower.includes('cosmic')) {
    colorGlowRgb = '245, 158, 11' // Amber
  } else if (iconLower.includes('molecul') || iconLower.includes('covalent') || iconLower.includes('alchemist') || iconLower.includes('cataly') || iconLower.includes('noble')) {
    colorGlowRgb = '16, 185, 129' // Emerald
  } else if (iconLower.includes('arithmetic') || iconLower.includes('euler') || iconLower.includes('pythagor') || iconLower.includes('infinite') || iconLower.includes('fields')) {
    colorGlowRgb = '59, 130, 246' // Blue
  } else if (type === 'LEVEL_UP') {
    colorGlowRgb = '236, 72, 153' // Pink/Magenta for Level Up!
  }

  useEffect(() => {
    // Automatically close celebration after 8 seconds
    const timer = setTimeout(() => {
      onClose()
    }, 8000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <>
      <Confetti durationMs={8000} />
      <div className="celebration-overlay" onClick={onClose}>
        <div
          className="celebration-card"
          style={{ '--badge-glow-rgb': colorGlowRgb } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="celebration-glow" />
          <div className="celebration-content">
            <div className="celebration-badge-container">
              {type === 'LEVEL_UP' ? (
                <div className="flex flex-col items-center justify-center">
                  <Flame size={48} className="text-pink-500 animate-pulse" />
                  <span className="text-2xl font-black text-white mt-1">LVL</span>
                </div>
              ) : (
                renderBadgeIcon(iconName, 80)
              )}
            </div>

            <h2 className="celebration-title">{title}</h2>
            <p className="celebration-subtitle">
              {subtitle || (type === 'LEVEL_UP' ? 'Rank Up Unleashed!' : 'Medal Unlocked!')}
            </p>
            <p className="celebration-desc">{description}</p>

            {points > 0 && (
              <div className="celebration-xp">
                <Sparkles size={16} /> +{points} XP Awarded
              </div>
            )}

            <div>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-extrabold text-sm uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 active:scale-95 transition-all shadow-lg"
                style={{
                  background: `rgba(${colorGlowRgb}, 0.25)`,
                  borderColor: `rgba(${colorGlowRgb}, 0.4)`,
                  boxShadow: `0 8px 20px rgba(${colorGlowRgb}, 0.15)`,
                }}
              >
                Awesome! 🚀
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
