import { useEffect, useRef, useState } from 'react'

export function GeneratingProgressBar() {
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev
        // 0 → 5: fast burst (~250ms)
        if (prev < 5) return Math.min(5, prev + 1)
        // 5 → 50: medium (~4s)
        if (prev < 50) return Math.min(50, prev + 0.55)
        // 50 → 80: steady crawl (~5s)
        if (prev < 80) return Math.min(80, prev + 0.3)
        // 80 → 95: very slow inch (~15s)
        return Math.min(95, prev + 0.05)
      })
    }, 50)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="w-full h-[3px] rounded-full overflow-hidden bg-primary/10">
      <div
        className="h-full rounded-full"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 100%)',
          transition: 'width 50ms linear',
          boxShadow: '0 0 6px 1px hsl(var(--primary) / 0.5)',
        }}
      />
    </div>
  )
}
