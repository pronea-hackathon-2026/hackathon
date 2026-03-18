import { cn, SOURCE_COLORS } from '@/lib/utils'

const SOURCE_LABELS: Record<string, string> = {
  email: 'Email',
  manual: 'Manual',
  startupjobs: 'StartupJobs',
  linkedin: 'LinkedIn',
}

export default function SourceBadge({ source }: { source: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', SOURCE_COLORS[source] || SOURCE_COLORS.manual)}>
      {SOURCE_LABELS[source] || source}
    </span>
  )
}
