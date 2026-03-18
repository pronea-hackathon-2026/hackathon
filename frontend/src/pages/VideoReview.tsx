import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import ScoreBadge from '@/components/ScoreBadge'
import { api, type Application } from '@/lib/api'

export default function VideoReview() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!applicationId) return
    api.applications.get(applicationId).then((a) => {
      setApp(a)
      setLoading(false)
    }).catch(console.error)
  }, [applicationId])

  const handleAdvance = async () => {
    if (!applicationId) return
    setAdvancing(true)
    try {
      await api.applications.updateStatus(applicationId, 'final_round')
      setApp((prev) => prev ? { ...prev, status: 'final_round' } : prev)
    } finally {
      setAdvancing(false)
    }
  }

  const handleReject = async () => {
    if (!applicationId) return
    setRejecting(true)
    try {
      await api.applications.updateStatus(applicationId, 'rejected')
      setApp((prev) => prev ? { ...prev, status: 'rejected' } : prev)
    } finally {
      setRejecting(false)
    }
  }

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      videoRef.current.play()
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!app) return <div className="p-6 text-muted-foreground">Application not found.</div>

  const candidate = app.candidates
  const analysis = app.analysis
  const attentionEvents = (app.attention_events || []) as { type: string; timestamp: number }[]

  // Build timeline markers
  const analysisData = analysis as any
  const questionMarkers = (analysisData?.per_question || []).map((q: any, i: number) => ({
    type: 'question',
    label: `Q${i + 1}`,
    timestamp: i * 120, // Estimated 2 min per question
    color: 'bg-blue-500',
  }))
  const attentionMarkers = attentionEvents.map((e) => ({
    type: 'attention',
    label: e.type.replace(/_/g, ' '),
    timestamp: e.timestamp,
    color: 'bg-orange-500',
  }))
  const allMarkers = [...questionMarkers, ...attentionMarkers].sort(
    (a, b) => a.timestamp - b.timestamp
  )

  const totalDuration = questionMarkers.length * 120 || 600

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">
            Interview Review — {candidate?.name || 'Candidate'}
          </h1>
        </div>
        <div className="flex gap-2">
          {app.status !== 'final_round' && app.status !== 'rejected' && (
            <>
              <Button onClick={handleAdvance} disabled={advancing}>
                <CheckCircle size={14} />
                {advancing ? 'Moving…' : 'Advance to Final Round'}
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
                <XCircle size={14} />
                {rejecting ? 'Rejecting…' : 'Reject'}
              </Button>
            </>
          )}
          {app.status === 'final_round' && (
            <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 border">Final Round</Badge>
          )}
          {app.status === 'rejected' && (
            <Badge className="bg-red-950 text-red-400 border-red-800 border">Rejected</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
          {/* Video + Transcript side by side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Video */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-0 overflow-hidden rounded-lg">
                  {app.video_url ? (
                    <video
                      ref={videoRef}
                      src={app.video_url}
                      controls
                      className="w-full aspect-video bg-black"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-black flex items-center justify-center text-white/40">
                      <div className="text-center">
                        <Play size={32} className="mx-auto mb-2" />
                        <p className="text-sm">No video recording available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Interview Timeline</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                    {allMarkers.map((marker, i) => (
                      <button
                        key={i}
                        className={`absolute top-0 bottom-0 w-2 rounded-full ${marker.color} hover:opacity-80 transition-opacity cursor-pointer`}
                        style={{ left: `${Math.min((marker.timestamp / totalDuration) * 100, 98)}%` }}
                        onClick={() => seekTo(marker.timestamp)}
                        title={`${marker.label} @ ${Math.round(marker.timestamp)}s`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Question start
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      Attention flag
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transcript */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Transcript</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-80 p-4">
                  {app.transcript ? (
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {app.transcript}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No transcript available.</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Analysis */}
          {analysis && (
            <>
              {/* Score cards */}
              <div className="grid grid-cols-4 gap-4">
                <ScoreCard label="Overall" score={app.overall_score} />
                <ScoreCard label="Answer Quality" score={analysis.answer_quality_score} />
                <ScoreCard label="Communication" score={analysis.communication_score} />
                <ScoreCard label="Attention" score={analysis.attention_score} />
              </div>

              {/* Summary + Strengths/Concerns */}
              <Card>
                <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                  <Separator />
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Strengths</p>
                      <ul className="space-y-1">
                        {analysis.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-emerald-400">
                            <CheckCircle size={12} className="mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Concerns</p>
                      <ul className="space-y-1">
                        {analysis.concerns.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-amber-400">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-question breakdown */}
              <Card>
                <CardHeader><CardTitle className="text-base">Per-Question Scores</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead className="w-20">Score</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.per_question.map((q, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{q.question}</TableCell>
                          <TableCell><ScoreBadge score={q.score} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{q.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <ScoreBadge score={score} className="text-base px-3 py-1" />
      </CardContent>
    </Card>
  )
}
