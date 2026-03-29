import { useEffect, useState } from 'react'
import { Zap, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Application } from '@/lib/api'

interface ScoringProgressProps {
  jobTitle: string
  total: number
  scored: number
  applications: Application[]
}

export default function ScoringProgress({ jobTitle, total, scored, applications }: ScoringProgressProps) {
  const completed = total > 0 && scored >= total
  const pct = total > 0 ? Math.round((scored / total) * 100) : 0

  // Track which app IDs have already been "seen" so we can re-animate truly new ones
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    setSeenIds((prev) => {
      const next = new Set(prev)
      applications.forEach((a) => next.add(a.id))
      return next
    })
  }, [applications])

  return (
    <div
      className={cn(
        'mx-6 mb-4 rounded-xl border p-4 transition-colors duration-700',
        completed
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-primary/20 bg-card/60 backdrop-blur',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="relative mt-0.5 shrink-0">
          {completed ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <>
              <Zap size={18} className="text-primary animate-pulse" />
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm font-semibold leading-none">
            {completed ? 'All candidates scored' : `Scoring against "${jobTitle}"`}
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-out',
                completed ? 'bg-emerald-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">
              {scored} / {total || '…'} candidates
            </span>
            <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
          </div>

          {/* Candidate avatars */}
          {applications.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
              {applications.slice(0, 28).map((app) => {
                const name = app.candidates?.name ?? '?'
                const initials = name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                const isNew = !seenIds.has(app.id)
                return (
                  <div
                    key={app.id}
                    title={name}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors duration-500',
                      completed
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-primary/20 text-primary',
                      isNew && 'animate-in zoom-in-50 duration-300',
                    )}
                  >
                    {initials}
                  </div>
                )
              })}
              {applications.length > 28 && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[9px] font-bold">
                  +{applications.length - 28}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
