import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, closestCenter } from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import { Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import CandidateCard from './CandidateCard'
import { type Application } from '@/lib/api'
import { cn, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'

interface KanbanBoardProps {
  applications: Application[]
  onStatusChange: (applicationId: string, newStatus: string) => void
  loading?: boolean
}

const COLUMNS = ['inbox', 'shortlisted', 'interview_done', 'final_round']

function DroppableColumn({
  columnId,
  applications,
}: {
  columnId: string
  applications: Application[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  const label = STATUS_LABELS[columnId]

  return (
    <div className={cn('flex flex-col rounded-lg border border-border bg-card/50 transition-colors', isOver && 'border-primary bg-primary/5')} style={{ minWidth: 260 }}>
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">{label}</span>
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', STATUS_COLORS[columnId])}>
          {applications.length}
        </span>
      </div>

      <ScrollArea className="flex-1" style={{ height: 'calc(100vh - 220px)' }}>
        <div ref={setNodeRef} className="p-3 flex flex-col gap-3 min-h-[120px]">
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Users size={24} className="opacity-40" />
              <p className="text-xs">No candidates</p>
            </div>
          ) : (
            applications.map((app) => (
              <CandidateCard key={app.id} application={app} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function KanbanBoard({ applications, onStatusChange, loading }: KanbanBoardProps) {
  const [activeApp, setActiveApp] = useState<Application | null>(null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const appId = active.id as string
    const newStatus = over.id as string
    const app = applications.find((a) => a.id === appId)
    if (app && app.status !== newStatus && COLUMNS.includes(newStatus)) {
      onStatusChange(appId, newStatus)
    }
    setActiveApp(null)
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col} className="flex flex-col rounded-lg border border-border bg-card/50" style={{ minWidth: 260 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            <div className="p-3 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const byColumn = COLUMNS.reduce((acc, col) => {
    acc[col] = applications.filter((a) => a.status === col)
    return acc
  }, {} as Record<string, Application[]>)

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(e) => {
        const app = applications.find((a) => a.id === e.active.id)
        setActiveApp(app || null)
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <DroppableColumn key={col} columnId={col} applications={byColumn[col] || []} />
        ))}
      </div>

      <DragOverlay>
        {activeApp ? <CandidateCard application={activeApp} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
