import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

type Phase = 'intro' | 'starting' | 'ready' | 'countdown' | 'recording' | 'uploading' | 'error'

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

export default function CandidateInterviewView() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const navigate = useNavigate()

  const [phase, setPhase]         = useState<Phase>('intro')
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQ, setCurrentQ]   = useState(0)
  const [countdown, setCountdown] = useState(3)
  const [errorMsg, setErrorMsg]   = useState('')

  const videoRef         = useRef<HTMLVideoElement>(null)
  const streamRef        = useRef<MediaStream | null>(null)
  const recorderRef      = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const audioChunksRef   = useRef<Blob[]>([])

  // Prefetch questions in background while user reads the intro screen
  useEffect(() => {
    if (!applicationId) return
    api.interviews.getSession(applicationId)
      .then((session) => {
        if (session.questions.length > 0) {
          setQuestions(session.questions)
        } else {
          return api.interviews.generateQuestions(applicationId).then((r) => setQuestions(r.questions))
        }
      })
      .catch(() => {
        setQuestions([
          'Tell me about yourself and your most relevant experience.',
          'What are your key technical skills for this role?',
          'Describe a challenging project you led and how you handled it.',
          'How do you approach collaboration and problem-solving?',
          'Where do you see yourself growing in the next few years?',
        ])
      })
  }, [applicationId])

  // Called when user explicitly clicks "Enable Camera & Begin"
  const handleEnableCamera = useCallback(async () => {
    setPhase('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setPhase('ready')
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Camera and microphone access was denied. Please allow access in your browser settings and refresh.'
          : `Could not access camera/microphone: ${err?.message ?? 'Unknown error'}`
      )
      setPhase('error')
    }
  }, [])

  // Countdown → recording
  const startCountdown = useCallback(() => {
    setPhase('countdown')
    setCountdown(3)
    let count = 3
    const tick = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count === 0) {
        clearInterval(tick)
        beginRecording()
      }
    }, 1000)
  }, [])

  const beginRecording = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return

    // Video + audio recorder (for storage)
    const mimeType = pickMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.start(1000)

    // Audio-only recorder (for Gemini transcription — much smaller file)
    const audioMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
    const audioStream = new MediaStream(stream.getAudioTracks())
    const audioRecorder = new MediaRecorder(audioStream, audioMime ? { mimeType: audioMime } : undefined)
    audioRecorderRef.current = audioRecorder
    audioChunksRef.current = []
    audioRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
    audioRecorder.start(1000)

    setPhase('recording')
  }, [])

  const handleNext = useCallback(() => {
    setCurrentQ((q) => Math.min(q + 1, questions.length - 1))
  }, [questions.length])

  const handleEnd = useCallback(async () => {
    const recorder      = recorderRef.current
    const audioRecorder = audioRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return

    setPhase('uploading')
    streamRef.current?.getTracks().forEach((t) => t.stop())

    // Stop both recorders; wait for the video one to finish before uploading
    let audioBlobReady: Blob | null = null

    const doUpload = async () => {
      const videoBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
      try {
        await api.interviews.uploadRecording(applicationId!, videoBlob, audioBlobReady)
      } catch (e) {
        console.error('Upload failed:', e)
      }
      navigate('/thank-you')
    }

    if (audioRecorder && audioRecorder.state !== 'inactive') {
      audioRecorder.onstop = () => {
        audioBlobReady = new Blob(audioChunksRef.current, { type: audioRecorder.mimeType || 'audio/webm' })
      }
      audioRecorder.stop()
    }

    recorder.onstop = async () => { await doUpload() }
    recorder.stop()
  }, [applicationId, navigate])

  // Cleanup on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  const isLastQuestion = currentQ === questions.length - 1

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">

      {/* Camera feed — always in DOM so ref is ready */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={[
          'absolute inset-0 w-full h-full object-cover transition-all duration-500',
          phase === 'intro' || phase === 'starting' || phase === 'error' ? 'opacity-0' : 'opacity-100',
          phase === 'uploading' ? 'brightness-[0.2]' : '',
        ].join(' ')}
      />

      {/* ── INTRO: explicit button to trigger camera permission ── */}
      {(phase === 'intro' || phase === 'starting') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-zinc-950">
          <div className="max-w-md w-full text-center space-y-8">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <svg className="w-9 h-9 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>

            <div className="space-y-3">
              <h1 className="text-white text-2xl font-bold">Your interview is ready</h1>
              <p className="text-white/50 text-sm leading-relaxed">
                You'll answer {questions.length > 0 ? questions.length : 'a few'} questions on camera.
                Each question appears on screen — answer it, then move to the next.
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-400 text-sm">
              This interview cannot be retaken once started.
            </div>

            <button
              onClick={handleEnableCamera}
              disabled={phase === 'starting'}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-base rounded-xl py-4 px-8 hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {phase === 'starting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Enabling camera…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                  Enable Camera &amp; Microphone
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {phase === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-zinc-950">
          <div className="max-w-md text-center space-y-4">
            <div className="text-5xl">🚫</div>
            <p className="text-white font-semibold text-lg">Camera access blocked</p>
            <p className="text-white/50 text-sm leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => { setErrorMsg(''); setPhase('intro') }}
              className="mt-4 text-white/40 underline text-sm hover:text-white/70"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── READY — camera preview + begin button ── */}
      {phase === 'ready' && (
        <div className="absolute inset-x-0 bottom-0">
          <div className="h-40 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
          <div className="bg-black/80 backdrop-blur-sm px-8 pb-10 pt-6">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-white font-semibold text-lg">Camera is on — you're live</p>
                <p className="text-white/50 text-sm mt-1">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} · recording starts after you click
                </p>
              </div>
              <button
                onClick={startCountdown}
                className="shrink-0 flex items-center gap-2 bg-white text-black font-semibold rounded-xl py-3 px-8 hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                Begin Interview →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center">
            <p className="text-white/60 text-lg mb-4">Recording starts in</p>
            <div
              key={countdown}
              className="text-white font-bold"
              style={{ fontSize: '10rem', lineHeight: 1, animation: 'pingIn 0.9s ease-out forwards' }}
            >
              {countdown}
            </div>
          </div>
          <style>{`
            @keyframes pingIn {
              0%   { transform: scale(1.5); opacity: 0; }
              100% { transform: scale(1);   opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* ── RECORDING ── */}
      {phase === 'recording' && (
        <>
          <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-semibold drop-shadow tracking-wide">REC</span>
          </div>

          <div className="absolute top-6 right-6 z-10">
            <span className="text-white/60 text-sm font-medium drop-shadow">
              {currentQ + 1} / {questions.length}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10">
            <div className="h-32 bg-gradient-to-b from-transparent to-black/85 pointer-events-none" />
            <div className="bg-black/85 backdrop-blur-sm px-8 pb-10 pt-5">
              <div className="max-w-3xl mx-auto">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
                  Question {currentQ + 1} of {questions.length}
                </p>
                <p className="text-white text-2xl font-semibold leading-snug mb-6">
                  {questions[currentQ]}
                </p>
                <div className="flex justify-end">
                  {!isLastQuestion ? (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-2 bg-white text-black font-semibold rounded-xl py-3 px-6 hover:bg-white/90 active:scale-[0.98] transition-all text-sm"
                    >
                      Next Question <span>→</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleEnd}
                      className="flex items-center gap-2 bg-red-600 text-white font-semibold rounded-xl py-3 px-6 hover:bg-red-700 active:scale-[0.98] transition-all text-sm"
                    >
                      End Interview <span>■</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── UPLOADING ── */}
      {phase === 'uploading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <div className="text-center space-y-2">
            <p className="text-white font-semibold text-xl">Submitting your interview…</p>
            <p className="text-white/40 text-sm">Please don't close this tab.</p>
          </div>
        </div>
      )}
    </div>
  )
}
