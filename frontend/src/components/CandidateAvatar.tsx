import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getCandidateAvatarUrl } from '@/lib/candidate-avatars'

interface CandidateAvatarProps {
  candidateId?: string | null
  name: string
  className?: string
  fallbackClassName?: string
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function CandidateAvatar({
  candidateId,
  name,
  className,
  fallbackClassName,
}: CandidateAvatarProps) {
  const src = getCandidateAvatarUrl(candidateId)

  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={name} className="object-cover" /> : null}
      <AvatarFallback className={cn('text-xs font-semibold bg-primary/20 text-primary', fallbackClassName)}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
