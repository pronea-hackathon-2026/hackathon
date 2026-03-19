import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, type Application } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export default function InterviewRoom() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!applicationId) return
    api.applications.get(applicationId)
      .then(setApp)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [applicationId])

  const joinLink = applicationId ? `${window.location.origin}/join/${applicationId}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(joinLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (!app) return <div className="p-8 text-muted-foreground">Application not found.</div>

  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-lg w-full mx-auto p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Candidate Interview</h1>
          <p className="text-muted-foreground text-sm">
            Share the link below with the candidate. They will record their interview independently —
            no HR presence required.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Candidate join link</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono text-sm truncate text-foreground">{joinLink}</p>
            <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0">
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" className="shrink-0 px-2" onClick={() => window.open(joinLink, '_blank')}>
              <ExternalLink size={13} />
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-blue-500/5 p-4 text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">How it works:</strong> the candidate opens their link,
          sees the interview questions overlaid on their camera feed, records their answers,
          then submits. The recording is automatically transcribed and analyzed — you'll see
          results in the candidate's profile once complete.
        </div>

        {app.status === 'interview_done' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
            Interview completed — view the analysis in the candidate's profile.
          </div>
        )}
      </div>
    </div>
  )
}
