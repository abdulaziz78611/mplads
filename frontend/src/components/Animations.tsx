import React, { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react'

/**
 * Animated Colorful Floating Mesh Orbs (Matches the reference image)
 * Glowing Cyan / Turquoise on the left, Electric Magenta / Violet on the right.
 * Responds to subtle mouse parallax for realistic 3D depth.
 */
export function FloatingMeshGlow() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      // Calculate normalized offset from center (-1 to 1)
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      setMousePos({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="mesh-background-container" aria-hidden="true">
      {/* Cyan / Turquoise Glow Orb (Left) */}
      <div 
        className="mesh-orb mesh-cyan"
        style={{
          transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 0)`
        }}
      />

      {/* Electric Magenta / Pink Glow Orb (Right) */}
      <div 
        className="mesh-orb mesh-magenta"
        style={{
          transform: `translate3d(${-mousePos.x * 0.7}px, ${-mousePos.y * 0.7}px, 0)`
        }}
      />

      {/* Deep Violet / Royal Blue Center Ambient Glow */}
      <div 
        className="mesh-orb mesh-violet"
        style={{
          transform: `translate3d(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px, 0)`
        }}
      />

      {/* Warm Gold / Amber Accent Glow (Bottom Center) */}
      <div 
        className="mesh-orb mesh-amber"
        style={{
          transform: `translate3d(${-mousePos.x * 0.5}px, ${mousePos.y * 0.5}px, 0)`
        }}
      />
    </div>
  )
}

/**
 * Fluid Cursor Glow
 * Follows mouse with smooth physics interpolation, casting an interactive light through frosted glass.
 */
export function FluidCursorGlow() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ currentX: 0, currentY: 0, targetX: 0, targetY: 0 })

  useEffect(() => {
    let animId: number
    const pos = posRef.current

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      pos.targetX = e.clientX
      pos.targetY = e.clientY
    }

    const render = () => {
      // Smooth lerp damping (0.15 gives silky fluid trail)
      pos.currentX += (pos.targetX - pos.currentX) * 0.15
      pos.currentY += (pos.targetY - pos.currentY) * 0.15

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.currentX - 175}px, ${pos.currentY - 175}px, 0)`
      }
      animId = requestAnimationFrame(render)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    animId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animId)
    }
  }, [])

  return <div ref={cursorRef} className="ambient-cursor-glow" aria-hidden="true" />
}

interface TiltCardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  maxTilt?: number
  onClick?: () => void
}

/**
 * 3D Interactive Tilt Card with Dynamic Glass Sheen Reflection
 * Tilts in 3D relative to mouse coordinates and sweeps a specular light sheen across the card.
 */
export function TiltCard({
  children,
  className = '',
  style = {},
  maxTilt = 8,
  onClick
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0, sheenX: 50, sheenY: 50, opacity: 0 })

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Compute rotation angles
    const rotateY = ((x - centerX) / centerX) * maxTilt
    const rotateX = -((y - centerY) / centerY) * maxTilt

    // Sheen coordinates
    const sheenX = (x / rect.width) * 100
    const sheenY = (y / rect.height) * 100

    setTilt({
      x: rotateX,
      y: rotateY,
      sheenX,
      sheenY,
      opacity: 0.18
    })
  }

  const handleMouseLeave = () => {
    setTilt(prev => ({ ...prev, x: 0, y: 0, opacity: 0 }))
  }

  return (
    <div
      ref={cardRef}
      className={`tilt-card-container ${className}`}
      style={{
        ...style,
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
        transition: tilt.opacity === 0 ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.1s ease-out'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Dynamic Specular Glass Highlight Sheen */}
      <div
        className="glass-specular-sheen"
        style={{
          background: `radial-gradient(circle 280px at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(255, 255, 255, 0.28), transparent 70%)`,
          opacity: tilt.opacity
        }}
      />
      {children}
    </div>
  )
}

/**
 * Frosted Glass Pulsing Skeletons for Loading States
 */
export function SkeletonCard({ height = 180 }: { height?: number }) {
  return (
    <div 
      className="frosted-skeleton panel" 
      style={{ height, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div className="skeleton-line" style={{ width: '40%', height: 20 }} />
      <div className="skeleton-line" style={{ width: '85%', height: 14 }} />
      <div className="skeleton-line" style={{ width: '60%', height: 14 }} />
      <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
        <div className="skeleton-pill" style={{ width: 80, height: 28 }} />
        <div className="skeleton-pill" style={{ width: 100, height: 28 }} />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="frosted-skeleton" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div className="skeleton-circle" style={{ width: 36, height: 36, borderRadius: 10 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton-line" style={{ width: '35%', height: 14 }} />
        <div className="skeleton-line" style={{ width: '20%', height: 11 }} />
      </div>
      <div className="skeleton-pill" style={{ width: 90, height: 20 }} />
    </div>
  )
}