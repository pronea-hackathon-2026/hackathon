import { cn, STATUS_COLORS, STATUS_LABELS } from '@/lib/utils'

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', STATUS_COLORS[status] || STATUS_COLORS.inbox)}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
