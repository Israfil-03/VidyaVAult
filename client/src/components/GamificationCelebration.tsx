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

    // ─── New Physics Medals ───────────────────────────────────────────────
    case 'force_field_master':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="32" cy="32" r="18" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx="32" cy="32" r="10" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="32" cy="32" r="4" fill="#fbbf24" />
          <path d="M14 32H18M46 32H50M32 14V18M32 46V50" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'wave_rider':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <path d="M10 36C14 28 18 28 22 36C26 44 30 44 34 36C38 28 42 28 46 36C48 40 50 42 54 38" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M10 26C14 18 18 18 22 26C26 34 30 34 34 26" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      )
    case 'relativistic_scholar':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <path d="M20 16H44V22L36 32L44 42V48H20V42L28 32L20 22V16Z" fill="rgba(255,255,255,0.03)" stroke="#f59e0b" strokeWidth="2.5" />
          <path d="M24 20C28 26 36 26 40 20" fill="#f59e0b" />
          <path d="M30 42C31 40 33 40 34 42L38 46H26L30 42Z" fill="#f59e0b" />
          <circle cx="32" cy="32" r="1.5" fill="#f59e0b" />
        </svg>
      )
    case 'optics_ace':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="32" cy="32" r="12" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M10 32H20M44 32H54" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 20L26 26M38 38L44 44M20 44L26 38M38 26L44 20" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <circle cx="32" cy="32" r="4" fill="#fbbf24" />
        </svg>
      )
    case 'einsteinian_genius':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <path d="M20 24C20 24 24 14 32 14C40 14 44 24 44 24V38C44 44 38 50 32 50C26 50 20 44 20 38V24Z" fill="rgba(245,158,11,0.1)" stroke="#f59e0b" strokeWidth="2" />
          <path d="M26 30L30 34L38 24" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 18C24 18 20 12 16 14" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M40 18C40 18 44 12 48 14" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'particle_pioneer':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="32" cy="32" r="5" fill="#f59e0b" />
          <circle cx="18" cy="22" r="3" fill="#fbbf24" opacity="0.8" />
          <circle cx="46" cy="22" r="3" fill="#fbbf24" opacity="0.8" />
          <circle cx="18" cy="42" r="3" fill="#fbbf24" opacity="0.8" />
          <circle cx="46" cy="42" r="3" fill="#fbbf24" opacity="0.8" />
          <path d="M18 22L32 32L46 22" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M18 42L32 32L46 42" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      )
    case 'singularity':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#03001e" stroke="#c084fc" strokeWidth="2" />
          <circle cx="32" cy="32" r="6" fill="#fff" />
          <circle cx="32" cy="32" r="12" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx="32" cy="32" r="20" stroke="#7c3aed" strokeWidth="1" strokeDasharray="1 3" />
          <path d="M10 32C10 20 20 10 32 10" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
          <path d="M54 32C54 44 44 54 32 54" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'nobel_contender':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M32 10L36 22H50L40 30L44 44L32 36L20 44L24 30L14 22H28L32 10Z" fill="url(#nobel_grad)" stroke="#fbbf24" strokeWidth="1.5" />
          <defs>
            <linearGradient id="nobel_grad" x1="14" y1="10" x2="50" y2="44">
              <stop stopColor="#78350f" />
              <stop offset="0.5" stopColor="#d97706" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>
      )

    // ─── New Chemistry Medals ─────────────────────────────────────────────
    case 'lab_initiate':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <path d="M26 20H38V30L44 44H20L26 30V20Z" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="2" />
          <path d="M26 20H38" stroke="#34d399" strokeWidth="2.5" />
          <circle cx="28" cy="36" r="2" fill="#6ee7b7" />
          <circle cx="34" cy="40" r="1.5" fill="#6ee7b7" />
          <path d="M22 44H42" stroke="#34d399" strokeWidth="1.5" />
        </svg>
      )
    case 'titration_expert':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <rect x="28" y="10" width="8" height="30" rx="3" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2" />
          <rect x="29" y="22" width="6" height="16" rx="1" fill="#10b981" opacity="0.5" />
          <circle cx="32" cy="44" r="4" fill="#34d399" />
          <path d="M24 44C24 44 26 46 28 46" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'reaction_specialist':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <circle cx="22" cy="28" r="8" stroke="#10b981" strokeWidth="2" />
          <circle cx="42" cy="28" r="8" stroke="#10b981" strokeWidth="2" />
          <path d="M28 34L32 44L36 34" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 28H34" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'organic_voyager':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <path d="M14 32C14 22 22 14 32 14C42 14 50 22 50 32" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 40L28 32L32 38L38 24L44 32" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'periodic_master':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <rect x="12" y="14" width="10" height="10" rx="1" stroke="#34d399" strokeWidth="1.5" />
          <rect x="26" y="14" width="10" height="10" rx="1" stroke="#34d399" strokeWidth="1.5" />
          <rect x="40" y="14" width="10" height="10" rx="1" stroke="#34d399" strokeWidth="1.5" />
          <rect x="12" y="28" width="10" height="10" rx="1" fill="rgba(16,185,129,0.3)" stroke="#10b981" strokeWidth="1.5" />
          <rect x="26" y="28" width="10" height="10" rx="1" fill="rgba(16,185,129,0.3)" stroke="#10b981" strokeWidth="1.5" />
          <rect x="40" y="28" width="10" height="10" rx="1" stroke="#34d399" strokeWidth="1.5" />
          <rect x="19" y="42" width="10" height="10" rx="1" stroke="#34d399" strokeWidth="1.5" />
          <rect x="33" y="42" width="10" height="10" rx="1" stroke="#34d399" strokeWidth="1.5" />
        </svg>
      )
    case 'electrode_pioneer':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <rect x="14" y="24" width="14" height="20" rx="3" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="2" />
          <rect x="36" y="24" width="14" height="20" rx="3" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="2" />
          <path d="M28 34H36" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 2" />
          <path d="M21 20V24M43 20V24" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    case 'catalyst_prime':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <path d="M32 10L40 24H52L42 34L46 50L32 42L18 50L22 34L12 24H24L32 10Z" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="2" />
          <path d="M26 30L30 34L38 24" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'curie_award':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />
          <circle cx="32" cy="26" r="10" fill="rgba(16,185,129,0.15)" stroke="#34d399" strokeWidth="2" />
          <path d="M22 36L18 48H46L42 36" stroke="#10b981" strokeWidth="2" />
          <rect x="28" y="36" width="8" height="12" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
          <path d="M26 22L30 26L38 18" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

    // ─── New Mathematics Medals ───────────────────────────────────────────
    case 'geometry_initiate':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <polygon points="32,12 54,48 10,48" fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth="2.5" />
          <rect x="10" y="44" width="8" height="8" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        </svg>
      )
    case 'number_theorist':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <text x="14" y="26" fontSize="12" fill="#3b82f6" fontWeight="bold">π</text>
          <text x="36" y="26" fontSize="12" fill="#60a5fa" fontWeight="bold">∑</text>
          <text x="14" y="46" fontSize="12" fill="#60a5fa" fontWeight="bold">∞</text>
          <text x="36" y="46" fontSize="12" fill="#3b82f6" fontWeight="bold">√</text>
          <line x1="32" y1="12" x2="32" y2="52" stroke="#1d4ed8" strokeWidth="1" opacity="0.5" />
          <line x1="12" y1="32" x2="52" y2="32" stroke="#1d4ed8" strokeWidth="1" opacity="0.5" />
        </svg>
      )
    case 'algebra_specialist':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M16 20L32 44L48 20" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 36H44" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'trigonometry_ace':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M10 44C14 32 20 20 28 20C36 20 40 32 52 20" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          <path d="M10 44L52 44" stroke="#1d4ed8" strokeWidth="1.5" />
          <path d="M10 44L10 20" stroke="#1d4ed8" strokeWidth="1.5" />
        </svg>
      )
    case 'calculus_commander':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
          <path d="M14 20C14 20 18 14 22 14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14 44C18 44 22 48 22 48" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 20C50 20 46 14 42 14" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 44C46 44 42 48 42 48" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 30H40M24 34H40" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'ramanujans_heir':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
          <path d="M32 10L36 22H50L40 30L44 44L32 36L20 44L24 30L14 22H28L32 10Z" fill="rgba(59,130,246,0.2)" stroke="#60a5fa" strokeWidth="2" />
          <circle cx="32" cy="32" r="5" fill="#3b82f6" />
        </svg>
      )
    case 'abel_prize':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
          <rect x="20" y="42" width="24" height="4" rx="2" fill="#2563eb" />
          <path d="M32 42V34" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 18V26C18 33.7 24.3 40 32 40C39.7 40 46 33.7 46 26V18H18Z" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
          <path d="M18 20H10V28C10 31 12.5 33 15.5 33H18" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M46 20H54V28C54 31 51.5 33 48.5 33H46" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M26 26L30 30L38 20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

    // ─── Cross-Subject Special Medals ────────────────────────────────────
    case 'triple_scholar':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#triple_bg)" stroke="#a78bfa" strokeWidth="2" />
          <circle cx="22" cy="28" r="8" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="42" cy="28" r="8" fill="none" stroke="#10b981" strokeWidth="2" />
          <circle cx="32" cy="42" r="8" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="32" cy="32" r="3" fill="#a78bfa" />
          <defs>
            <linearGradient id="triple_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#312e81" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'multidisciplinary':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#multi_bg)" stroke="#a78bfa" strokeWidth="2" />
          <path d="M32 14L50 24V44L32 54L14 44V24L32 14Z" fill="rgba(167,139,250,0.1)" stroke="#a78bfa" strokeWidth="2" />
          <circle cx="32" cy="24" r="4" fill="#f59e0b" />
          <circle cx="42" cy="38" r="4" fill="#10b981" />
          <circle cx="22" cy="38" r="4" fill="#3b82f6" />
          <path d="M32 24L42 38L22 38L32 24Z" stroke="#a78bfa" strokeWidth="1.5" />
          <defs>
            <linearGradient id="multi_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#4c1d95" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'omniscient':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#omni_bg)" stroke="#c084fc" strokeWidth="2.5" />
          <path d="M32 10C44 16 52 24 52 32C52 44 44 54 32 54C20 54 12 44 12 32C12 24 20 16 32 10Z" fill="rgba(192,132,252,0.1)" />
          <ellipse cx="32" cy="32" rx="22" ry="8" stroke="#a855f7" strokeWidth="1.5" />
          <ellipse cx="32" cy="32" rx="8" ry="22" stroke="#a855f7" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="5" fill="#c084fc" />
          <defs>
            <linearGradient id="omni_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#2e1065" />
              <stop offset="1" stopColor="#4c1d95" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'polymath_supreme':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#poly_bg)" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M32 8L38 24H56L42 34L48 52L32 42L16 52L22 34L8 24H26L32 8Z" fill="url(#poly_star)" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="6" fill="#fff" opacity="0.9" />
          <defs>
            <linearGradient id="poly_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#78350f" />
              <stop offset="0.5" stopColor="#92400e" />
              <stop offset="1" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="poly_star" x1="8" y1="8" x2="56" y2="52">
              <stop stopColor="#fbbf24" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'grand_champion':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#champ_bg)" stroke="#fbbf24" strokeWidth="3" />
          <path d="M32 8L36 20H50L40 28L44 42L32 34L20 42L24 28L14 20H28L32 8Z" fill="url(#champ_star)" />
          <path d="M22 48L26 52M42 48L38 52" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="24" y="52" width="16" height="4" rx="2" fill="#f59e0b" />
          <defs>
            <radialGradient id="champ_bg" cx="50%" cy="30%" r="60%">
              <stop offset="0" stopColor="#4c1d95" />
              <stop offset="1" stopColor="#1e1b4b" />
            </radialGradient>
            <linearGradient id="champ_star" x1="14" y1="8" x2="50" y2="42">
              <stop stopColor="#fde68a" />
              <stop offset="0.5" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </svg>
      )

    // ─── New Achievement Icons ────────────────────────────────────────────
    case 'daily_goal':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#dg_bg)" stroke="#10b981" strokeWidth="2" />
          <circle cx="32" cy="32" r="16" stroke="#10b981" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="8" stroke="#34d399" strokeWidth="2" />
          <circle cx="32" cy="32" r="3" fill="#10b981" />
          <defs>
            <linearGradient id="dg_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#064e3b" />
              <stop offset="1" stopColor="#065f46" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'centurion':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#cent_bg)" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M18 16H46V22L40 26V46H24V26L18 22V16Z" fill="rgba(251,191,36,0.1)" stroke="#fbbf24" strokeWidth="2" />
          <path d="M24 14H40" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 36L32 30L36 36" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="24" y="46" fontSize="10" fill="#fbbf24" fontWeight="bold">100</text>
          <defs>
            <linearGradient id="cent_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#78350f" />
              <stop offset="1" stopColor="#451a03" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'grind_mode':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1c1917" stroke="#f97316" strokeWidth="2" />
          <path d="M24 48C24 40 20 34 20 26C20 18 26 12 32 12C38 12 44 18 44 26C44 34 40 40 40 48" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 48H36" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="26" r="6" fill="rgba(249,115,22,0.3)" stroke="#fb923c" strokeWidth="2" />
          <path d="M30 24L32 26L34 22" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'maniac':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1c1917" stroke="#ef4444" strokeWidth="2.5" />
          <path d="M22 54C22 42 16 36 16 26C16 16 24 8 32 8C40 8 48 16 48 26C48 36 42 42 42 54" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M22 54H42" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M26 28C26 24 29 20 32 20C35 20 38 24 38 28" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
          <circle cx="27" cy="31" r="2" fill="#fff" />
          <circle cx="37" cy="31" r="2" fill="#fff" />
        </svg>
      )
    case 'marathon_runner':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#a855f7" strokeWidth="2.5" />
          <circle cx="36" cy="16" r="5" fill="none" stroke="#a78bfa" strokeWidth="2" />
          <path d="M36 21L34 30L28 34" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34 30L40 38" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 34L22 44" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M40 38L44 46" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M12 52H52" stroke="#a855f7" strokeWidth="2" />
          <path d="M16 46C24 46 40 46 48 46" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      )
    case 'accuracy_champion':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="32" cy="32" r="20" stroke="#1e40af" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="13" stroke="#3b82f6" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="6" stroke="#60a5fa" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="2" fill="#ef4444" />
          <path d="M32 12V16M32 48V52M12 32H16M48 32H52" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'perfectionist':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#perf_bg)" stroke="#fbbf24" strokeWidth="2" />
          <path d="M32 10L35 22H48L38 30L42 44L32 36L22 44L26 30L16 22H29L32 10Z" fill="url(#perf_star)" />
          <path d="M26 30L30 34L38 24" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="perf_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#78350f" />
              <stop offset="1" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="perf_star" x1="16" y1="10" x2="48" y2="44">
              <stop stopColor="#fde68a" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
        </svg>
      )
    case 'first_strike':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
          <path d="M36 10L28 28H44L22 54L30 34H14L36 10Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
        </svg>
      )
    case 'speed_demon':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1c1917" stroke="#f97316" strokeWidth="2" />
          <path d="M40 10L28 28H44L20 54" stroke="#f97316" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 22H20M14 28H18M14 34H20" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        </svg>
      )
    case 'comeback_kid':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#0f2d20" stroke="#10b981" strokeWidth="2" />
          <path d="M10 44L20 32L28 38L38 24L54 20" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M46 20H54V28" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'epic_comeback':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1c0040" stroke="#a855f7" strokeWidth="2.5" />
          <path d="M32 50L26 32H38L32 50Z" fill="#a855f7" />
          <path d="M32 14L26 32H38L32 14Z" fill="#fbbf24" opacity="0.9" />
          <path d="M14 36L26 32L14 28" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M50 36L38 32L50 28" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'resilient':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1c1917" stroke="#f97316" strokeWidth="2" />
          <path d="M32 10C32 10 14 22 14 36C14 46 22 54 32 54C42 54 50 46 50 36C50 22 32 10 32 10Z" fill="rgba(249,115,22,0.1)" stroke="#f97316" strokeWidth="2" />
          <path d="M22 34L28 40L42 26" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'knowledge_seeker':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
          <path d="M14 20H50V44H14V20Z" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="2" rx="2" />
          <path d="M20 28H44M20 34H38M20 40H32" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="46" cy="40" r="6" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1.5" />
          <path d="M44 40L46 42L50 38" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'polymath':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <circle cx="22" cy="26" r="7" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="42" cy="26" r="7" fill="none" stroke="#10b981" strokeWidth="2" />
          <circle cx="32" cy="42" r="7" fill="none" stroke="#3b82f6" strokeWidth="2" />
        </svg>
      )
    case 'subject_devotee':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <path d="M32 12C32 12 20 16 20 28C20 36 26 42 32 42C38 42 44 36 44 28C44 16 32 12 32 12Z" fill="rgba(129,140,248,0.15)" stroke="#818cf8" strokeWidth="2" />
          <path d="M26 28L30 32L38 22" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M26 44H38" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 44V50H36V44" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'night_owl':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#0f0c29" stroke="#818cf8" strokeWidth="2" />
          <path d="M40 14C34 14 22 20 22 32C22 44 32 50 40 50C36 50 28 46 28 32C28 20 36 16 40 14Z" fill="#818cf8" />
          <circle cx="44" cy="18" r="3" fill="#fbbf24" />
          <circle cx="50" cy="26" r="2" fill="#fbbf24" opacity="0.6" />
          <circle cx="48" cy="12" r="1.5" fill="#fbbf24" opacity="0.8" />
        </svg>
      )
    case 'early_bird':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="#431407" stroke="#fb923c" strokeWidth="2" />
          <path d="M32 16L36 28H50L40 36L44 50L32 42L20 50L24 36L14 28H28L32 16Z" fill="rgba(251,146,60,0.2)" stroke="#fb923c" strokeWidth="1.5" />
          <circle cx="44" cy="20" r="6" fill="#fbbf24" />
          <path d="M36 16C38 12 44 10 48 14" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'triple_crown':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="28" fill="url(#tc_bg)" stroke="#fbbf24" strokeWidth="2.5" />
          <path d="M14 44V26L22 34L32 16L42 34L50 26V44H14Z" fill="url(#tc_crown)" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" />
          <rect x="12" y="44" width="40" height="6" rx="2" fill="#f59e0b" />
          <defs>
            <linearGradient id="tc_bg" x1="4" y1="4" x2="60" y2="60">
              <stop stopColor="#78350f" />
              <stop offset="1" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="tc_crown" x1="14" y1="16" x2="50" y2="44">
              <stop stopColor="#fde68a" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
          </defs>
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
  let colorGlowRgb = '99, 102, 241' // Indigo default
  const iconLower = iconName.toLowerCase()

  // Physics icons — Amber
  if (['newtonian_pioneer','quantum_leap','galileos_observer','relativistic_scholar','optics_ace',
       'einsteinian_genius','particle_pioneer','cosmic_explorer','singularity','nobel_contender',
       'force_field_master','wave_rider'].some(n => iconLower.includes(n.split('_')[0]))) {
    colorGlowRgb = '245, 158, 11'
  }
  // Chemistry icons — Emerald
  else if (['molecular_apprentice','covalent_bond','alchemists_trial','noble_gas_status',
             'lab_initiate','titration_expert','reaction_specialist','organic_voyager',
             'periodic_master','electrode_pioneer','catalyst_prime','curie_award'].some(n => iconLower.includes(n.split('_')[0]))) {
    colorGlowRgb = '16, 185, 129'
  }
  // Mathematics icons — Blue
  else if (['arithmetic_ace','eulers_disciple','pythagorean_explorer','fields_medalist',
             'geometry_initiate','number_theorist','algebra_specialist','trigonometry_ace',
             'calculus_commander','ramanujans_heir','abel_prize','infinite_series'].some(n => iconLower.includes(n.split('_')[0]))) {
    colorGlowRgb = '59, 130, 246'
  }
  // Special / cross-subject — Violet
  else if (['triple_scholar','multidisciplinary','omniscient','polymath_supreme','grand_champion',
             'triple_crown','knowledge_seeker','polymath'].some(n => iconLower.includes(n.split('_')[0]))) {
    colorGlowRgb = '167, 139, 250'
  }
  // Streak/achievement — Red/Pink
  else if (['maniac','epic_comeback','marathon_runner','speed_demon','grind_mode'].some(n => iconLower.includes(n.split('_')[0]))) {
    colorGlowRgb = '239, 68, 68'
  }
  // Level Up
  else if (type === 'LEVEL_UP') {
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
