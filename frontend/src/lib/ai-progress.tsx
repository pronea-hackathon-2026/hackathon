import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

interface AIProgressCtx {
  progress: number
  visible: boolean
  fading: boolean
  start: () => void
  complete: () => void
}

const AIProgressContext = createContext<AIProgressCtx>({
  progress: 0, visible: false, fading: false,
  start: () => {}, complete: () => {},
})

export function AIProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)
  const activeCallsRef = useRef(0)

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const start = useCallback(() => {
    activeCallsRef.current += 1
    // If already running, just keep going — don't restart
    if (activeCallsRef.current > 1) return

    doneRef.current = false
    setFading(false)
    setProgress(0)
    setVisible(true)
    clearTimer()

    timerRef.current = setInterval(() => {
      if (doneRef.current) return
      setProgress((prev) => {
        if (prev >= 95) return prev
        // 0→40: fast   (~700ms at 50ms tick)
        if (prev < 40) return Math.min(40, prev + 2.8)
        // 40→60: slow  (~4.5s)
        if (prev < 60) return Math.min(60, prev + 0.22)
        // 60→80: fast  (~700ms)
        if (prev < 80) return Math.min(80, prev + 1.4)
        // 80→95: inch  (~12s, stops at 95)
        return Math.min(95, prev + 0.06)
      })
    }, 50)
  }, [])

  const complete = useCallback(() => {
    activeCallsRef.current = Math.max(0, activeCallsRef.current - 1)
    // Wait for all concurrent calls to finish
    if (activeCallsRef.current > 0) return

    doneRef.current = true
    clearTimer()

    // Jump to 100%
    setProgress(100)

    // After 350ms at 100%, start fade out
    setTimeout(() => {
      setFading(true)
      // After fade transition (300ms), hide completely
      setTimeout(() => {
        setVisible(false)
        setFading(false)
        setProgress(0)
        activeCallsRef.current = 0
      }, 300)
    }, 350)
  }, [])

  useEffect(() => () => clearTimer(), [])

  return (
    <AIProgressContext.Provider value={{ progress, visible, fading, start, complete }}>
      {children}
    </AIProgressContext.Provider>
  )
}

export const useAIProgress = () => useContext(AIProgressContext)
