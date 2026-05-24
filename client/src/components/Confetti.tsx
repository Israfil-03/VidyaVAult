import { useEffect, useState } from 'react'

interface ConfettiParticle {
  id: number
  left: string
  color: string
  delay: string
  duration: string
  size: string
  shape: 'square' | 'circle' | 'triangle'
}

const COLORS = [
  '#f59e0b', // Gold
  '#3b82f6', // Indigo
  '#10b981', // Emerald
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
]

export const Confetti = ({ durationMs = 5000 }: { durationMs?: number }) => {
  const [particles, setParticles] = useState<ConfettiParticle[]>([])
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Generate particles
    const list: ConfettiParticle[] = []
    const shapes: Array<'square' | 'circle' | 'triangle'> = ['square', 'circle', 'triangle']
    
    for (let i = 0; i < 120; i++) {
      const left = `${Math.random() * 100}%`
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const delay = `${Math.random() * 2.5}s`
      const duration = `${3 + Math.random() * 2.5}s`
      const size = `${6 + Math.random() * 10}px`
      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      
      list.push({
        id: i,
        left,
        color,
        delay,
        duration,
        size,
        shape,
      })
    }
    
    setParticles(list)

    const timer = setTimeout(() => {
      setVisible(false)
    }, durationMs)

    return () => clearTimeout(timer)
  }, [durationMs])

  if (!visible) return null

  return (
    <div className="confetti-wrapper">
      {particles.map((p) => {
        let borderStyle: React.CSSProperties = {}
        if (p.shape === 'circle') {
          borderStyle = { borderRadius: '50%' }
        } else if (p.shape === 'triangle') {
          borderStyle = {
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderLeft: `${parseInt(p.size) / 2}px solid transparent`,
            borderRight: `${parseInt(p.size) / 2}px solid transparent`,
            borderBottom: `${p.size} solid ${p.color}`,
          }
        }

        return (
          <div
            key={p.id}
            className="confetti-particle"
            style={{
              left: p.left,
              backgroundColor: p.shape !== 'triangle' ? p.color : undefined,
              animationDelay: p.delay,
              animationDuration: p.duration,
              width: p.shape !== 'triangle' ? p.size : undefined,
              height: p.shape !== 'triangle' ? p.size : undefined,
              ...borderStyle,
            }}
          />
        )
      })}
    </div>
  )
}
