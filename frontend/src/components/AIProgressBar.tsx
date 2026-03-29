import { useAIProgress } from '@/lib/ai-progress'

export default function AIProgressBar() {
  const { progress, visible, fading } = useAIProgress()

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent pointer-events-none"
      style={{ opacity: fading ? 0 : 1, transition: 'opacity 300ms ease' }}
    >
      <div
        className="h-full relative"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.85) 100%)',
          transition: progress === 100
            ? 'width 200ms ease-out'
            : 'width 50ms linear',
          boxShadow: '0 0 8px 1px hsl(var(--primary) / 0.6), 0 0 2px 0px hsl(var(--primary))',
        }}
      >
        {/* Glow pulse on the leading edge */}
        <div
          className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4))',
          }}
        />
      </div>
    </div>
  )
}
