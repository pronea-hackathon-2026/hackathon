import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, Mic, MicOff, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Application, type AttentionEvent } from '@/lib/api'

export default function InterviewRoom() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [ended, setEnded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const attentionEventsRef = useRef<AttentionEvent[]>([])
  const transcriptRef = useRef<string[]>([])
  const startTimeRef = useRef(Date.now())
  const gazeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track tab switches and window blur
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        attentionEventsRef.current.push({
          type: 'tab_switch',
          timestamp: (Date.now() - startTimeRef.current) / 1000,
        })
      }
    }
    const handleBlur = () => {
      attentionEventsRef.current.push({
        type: 'window_blur',
        timestamp: (Date.now() - startTimeRef.current) / 1000,
      })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(() => {
    if (!applicationId) return
    Promise.all([
      api.applications.get(applicationId),
      api.interviews.generateQuestions(applicationId),
    ]).then(([appData, qs]) => {
      setApp(appData)
      setQuestions(qs.questions)
      setLoading(false)
    }).catch(console.error)
  }, [applicationId])

  const handleNextQuestion = () => {
    if (currentQ < questions.length - 1) {
      transcriptRef.current.push(`Q${currentQ + 1}: ${questions[currentQ]}`)
      setCurrentQ((q) => q + 1)
    }
  }

  const handleEndInterview = async () => {
    if (!applicationId) return
    transcriptRef.current.push(`Q${currentQ + 1}: ${questions[currentQ]}`)
    const transcript = transcriptRef.current.join('\n\n')
    setSubmitting(true)
    try {
      await api.interviews.analyze(applicationId, transcript, attentionEventsRef.current)
      navigate('/thank-you')
    } catch (e) {
      console.error(e)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!app) return <div className="p-6 text-muted-foreground">Application not found.</div>

  const roomUrl = app.interview_room_url

  return (
    <div className="flex h-full gap-0">
      {/* Left: Video call */}
      <div className="flex-1 bg-black relative">
        {roomUrl ? (
          <iframe
            src={roomUrl}
            title="Interview Room"
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; display-capture"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/60">
            <p>No room URL configured</p>
          </div>
        )}
      </div>

      {/* Right: Questions panel */}
      <div className="w-96 flex flex-col border-l border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Interview Questions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Question {currentQ + 1} of {questions.length}
          </p>
        </div>

        {/* Current question - large display */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="default">Current</Badge>
          </div>
          <p className="text-lg font-medium leading-relaxed">
            {questions[currentQ]}
          </p>
        </div>

        {/* Upcoming questions */}
        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">Upcoming</p>
          <div className="space-y-2">
            {questions.slice(currentQ + 1).map((q, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                <span className="text-xs font-semibold mr-2">Q{currentQ + 2 + i}</span>
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border space-y-2">
          {!ended && currentQ < questions.length - 1 && (
            <Button className="w-full" onClick={handleNextQuestion}>
              <ChevronRight size={16} />
              Next Question
            </Button>
          )}
          {(currentQ === questions.length - 1 || ended) && (
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleEndInterview}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'End Interview'}
            </Button>
          )}
          <p className="text-xs text-muted-foreground text-center">
            Your attention is being monitored during this interview
          </p>
        </div>
      </div>
    </div>
  )
}
