import { cn, scoreBg } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  label?: string
  className?: string
}

export default function ScoreBadge({ score, label, className }: ScoreBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', scoreBg(score), className)}>
      {label && <span className="text-current/60">{label}</span>}
      {score}
    </span>
  )
}
