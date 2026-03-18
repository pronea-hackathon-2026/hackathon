import { useNavigate } from 'react-router-dom'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Video, GripVertical } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import ScoreBadge from './ScoreBadge'
import SourceBadge from './SourceBadge'
import { type Application } from '@/lib/api'

interface CandidateCardProps {
  application: Application
}

export default function CandidateCard({ application }: CandidateCardProps) {
  const navigate = useNavigate()
  const candidate = application.candidates!

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { application },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className="cursor-pointer hover:border-primary transition-colors group"
        onClick={() => navigate(`/candidate/${candidate.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={14} />
            </div>

            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/20 text-primary">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm truncate">{candidate.name}</p>
                <SourceBadge source={candidate.source} />
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <ScoreBadge score={application.match_score} label="Match" />
                <ScoreBadge score={candidate.credibility_score} label="Cred" />
                {application.status === 'interview_done' || application.status === 'final_round' ? (
                  <ScoreBadge score={application.overall_score} label="Overall" />
                ) : null}
              </div>

              {(application.status === 'interview_done' || application.status === 'final_round') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/review/${application.id}`)
                  }}
                >
                  <Video size={12} />
                  Watch Interview
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
