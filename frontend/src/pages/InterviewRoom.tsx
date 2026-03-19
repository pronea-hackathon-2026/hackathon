import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Application, type AttentionEvent } from '@/lib/api'
import { useAIProgress } from '@/lib/ai-progress'

export default function InterviewRoom() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const attentionEventsRef = useRef<AttentionEvent[]>([])
  const transcriptRef = useRef<string[]>([])
  const startTimeRef = useRef(Date.now())
  const aiProgress = useAIProgress()

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Camera access error:', err)
        setCameraError(true)
      }
    }
    startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

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
    aiProgress.start()
    Promise.all([
      api.applications.get(applicationId),
      api.interviews.generateQuestions(applicationId),
    ]).then(async ([appData, qs]) => {
      // Auto-create room if not yet assigned
      if (!appData.interview_room_url) {
        try {
          const res = await api.interviews.invite(applicationId)
          appData = { ...appData, interview_room_url: res.room_url }
        } catch (e) {
          console.error('Failed to create room:', e)
        }
      }
      setApp(appData)
      setQuestions(qs.questions)
      aiProgress.complete()
    }).catch((e) => { console.error(e); aiProgress.complete() }).finally(() => setLoading(false))
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
    aiProgress.start()
    try {
      await api.interviews.analyze(applicationId, transcript, attentionEventsRef.current)
      aiProgress.complete()
      navigate(`/review/${applicationId}`)
    } catch (e) {
      console.error(e)
      aiProgress.complete()
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-32 w-full bg-white/10" />
        </div>
      </div>
    )
  }

  if (!app) return <div className="h-screen w-screen bg-black flex items-center justify-center text-white/60">Application not found.</div>

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Full-screen camera background */}
      <div className="absolute inset-0">
        {cameraError ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-white/60 gap-4">
            <VideoOff size={64} className="text-white/40" />
            <p className="text-lg">Camera access denied</p>
            <p className="text-sm">Please enable camera access to continue</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}
      </div>

      {/* Subtle gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-transparent to-transparent pointer-events-none" />

      {/* Floating question box - right side */}
      <Card className="absolute right-6 top-1/2 -translate-y-1/2 w-[420px] max-h-[80vh] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl border-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Interview</h2>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
              Question {currentQ + 1} of {questions.length}
            </Badge>
          </div>
        </div>

        {/* Current question */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {currentQ + 1}
            </div>
            <Badge variant="default" className="bg-primary/10 text-primary border-0">
              Current Question
            </Badge>
          </div>
          <p className="text-xl font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
            {questions[currentQ]}
          </p>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="space-y-3">
            {currentQ < questions.length - 1 ? (
              <Button className="w-full h-12 text-base" onClick={handleNextQuestion}>
                <ChevronRight size={20} className="mr-2" />
                Next Question
              </Button>
            ) : (
              <Button
                className="w-full h-12 text-base"
                variant="destructive"
                onClick={handleEndInterview}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'End Interview'}
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Look at the camera while answering
            </p>
          </div>
        </div>
      </Card>

      {/* Recording indicator */}
      <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-white text-sm font-medium">Recording</span>
      </div>
    </div>
  )
}
