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
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const sw = size * 0.1

  // Arc: 135° → clockwise 270° → 45° (speedometer shape, opens at bottom)
  const startAngle = 135
  const totalSweep = 270

  const arcStart = polar(cx, cy, r, startAngle)
  const arcEnd = polar(cx, cy, r, startAngle + totalSweep) // same as 45°

  const sweepDeg = Math.max(0, Math.min(99.9, score)) / 100 * totalSweep
  const valEnd = polar(cx, cy, r, startAngle + sweepDeg)
  const largeArc = sweepDeg > 180 ? 1 : 0

  const bgPath = `M ${arcStart.x.toFixed(2)} ${arcStart.y.toFixed(2)} A ${r} ${r} 0 1 1 ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)}`
  const valPath = sweepDeg > 0
    ? `M ${arcStart.x.toFixed(2)} ${arcStart.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${valEnd.x.toFixed(2)} ${valEnd.y.toFixed(2)}`
    : null

  const color =
    score < 30 ? '#ef4444'
    : score < 50 ? '#f97316'
    : score < 70 ? '#eab308'
    : score < 85 ? '#84cc16'
    : '#22c55e'

  // Crop viewBox just below the arc endpoints (endpoints at y = cy + r*sin(135°))
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
          {score}
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground leading-none text-center">{label}</span>
    </div>
  )
}
