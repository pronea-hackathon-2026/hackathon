import { useState, useEffect, useRef } from 'react'

interface ScoreGaugeProps {
  score: number
  label: string
  size?: number
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function ScoreGauge({ score, label, size = 72 }: ScoreGaugeProps) {
  const [displayed, setDisplayed] = useState(score)
  const rafRef = useRef<number>()
  const animState = useRef({ from: score, to: score, startTime: 0 })

  useEffect(() => {
    if (animState.current.to === score) return
    const from = displayed
    animState.current = { from, to: score, startTime: performance.now() }

    const DURATION = 650

    const tick = (now: number) => {
      const { from: f, to: t, startTime } = animState.current
      const elapsed = now - startTime
      const progress = Math.min(elapsed / DURATION, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(f + (t - f) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [score])

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const sw = size * 0.1

  const startAngle = 135
  const totalSweep = 270

  const arcStart = polar(cx, cy, r, startAngle)
  const arcEnd = polar(cx, cy, r, startAngle + totalSweep)

  const sweepDeg = Math.max(0, Math.min(99.9, displayed)) / 100 * totalSweep
  const valEnd = polar(cx, cy, r, startAngle + sweepDeg)
  const largeArc = sweepDeg > 180 ? 1 : 0

  const bgPath = `M ${arcStart.x.toFixed(2)} ${arcStart.y.toFixed(2)} A ${r} ${r} 0 1 1 ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)}`
  const valPath = sweepDeg > 0
    ? `M ${arcStart.x.toFixed(2)} ${arcStart.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${valEnd.x.toFixed(2)} ${valEnd.y.toFixed(2)}`
    : null

  const color =
    displayed < 30 ? '#ef4444'
    : displayed < 50 ? '#f97316'
    : displayed < 70 ? '#eab308'
    : displayed < 85 ? '#84cc16'
    : '#22c55e'

  const h = Math.ceil(cy + r * Math.sin(startAngle * Math.PI / 180) + sw * 0.7)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
        <path d={bgPath} fill="none" stroke="#e2e8f0" strokeWidth={sw} strokeLinecap="round" />
        {valPath && (
          <path d={valPath} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        )}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.24}
          fontWeight="700"
          fill="#1e293b"
        >
          {displayed}
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground leading-none text-center">{label}</span>
    </div>
  )
}
