import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Video, Calendar } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, type Job } from '@/lib/api'

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Steps: name, email, cv, then custom questions (q0, q1, ...), then submitting, done
  const [step, setStep] = useState<string>('name')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [cvError, setCvError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [applicationId, setApplicationId] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    api.jobs.get(jobId)
      .then(setJob)
      .catch(() => setError('Job not found'))
      .finally(() => setLoading(false))
  }, [jobId])

  const questions = job?.requirements?.application_questions || []
  const totalSteps = 3 + questions.length // name, email, cv + questions

  function getStepIndex(): number {
    if (step === 'name') return 0
    if (step === 'email') return 1
    if (step === 'cv') return 2
    if (step.startsWith('q')) return 3 + parseInt(step.slice(1))
    return 0
  }

  function canProceed(): boolean {
    if (step === 'name') return !!name.trim()
    if (step === 'email') return !!email.trim()
    if (step === 'cv') return !!cvFile
    if (step.startsWith('q')) {
      const qIndex = parseInt(step.slice(1))
      const q = questions[qIndex]
      if (q?.required) return !!(answers[q.id]?.trim())
      return true
    }
    return false
  }

  function handleNext() {
    if (step === 'name' && name.trim()) setStep('email')
    else if (step === 'email' && email.trim()) setStep('cv')
    else if (step === 'cv' && cvFile) {
      if (questions.length > 0) {
        setStep('q0')
      } else {
        handleSubmit()
      }
    } else if (step.startsWith('q')) {
      const qIndex = parseInt(step.slice(1))
      if (qIndex < questions.length - 1) {
        setStep(`q${qIndex + 1}`)
      } else {
        handleSubmit()
      }
    }
  }

  function handleBack() {
    if (step === 'email') setStep('name')
    else if (step === 'cv') setStep('email')
    else if (step === 'q0') setStep('cv')
    else if (step.startsWith('q')) {
      const qIndex = parseInt(step.slice(1))
      setStep(`q${qIndex - 1}`)
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !cvFile || !jobId) return

    setStep('submitting')
    try {
      const candidate = await api.candidates.create(name, email)
      await api.candidates.uploadCV(candidate.id, cvFile)
      // Pass custom question answers along with the application
      const application = await api.applications.create(candidate.id, jobId, Object.keys(answers).length > 0 ? answers : undefined)
      setApplicationId(application.id)
      setStep('done')
    } catch (err) {
      console.error(err)
      setError('Failed to submit application. Please try again.')
      setStep('cv')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && canProceed()) {
      e.preventDefault()
      handleNext()
    }
  }

  function isAllowedResumeFile(file: File) {
    const lowerName = file.name.toLowerCase()
    return lowerName.endsWith('.pdf') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')
  }

  function handleResumeFile(file: File | null) {
    if (!file) return
    if (!isAllowedResumeFile(file)) {
      setCvError('Please upload a PDF, DOC, or DOCX file.')
      return
    }
    setCvFile(file)
    setCvError(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{error || 'Job not found'}</p>
        </div>
      </div>
    )
  }

  const currentQuestionIndex = step.startsWith('q') ? parseInt(step.slice(1)) : -1
  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null
  const isLastStep = step === 'cv' && questions.length === 0 ||
                     (step.startsWith('q') && parseInt(step.slice(1)) === questions.length - 1)
  const transitionKey = currentQuestion ? `question-${currentQuestion.id}` : step

  const transitionProps = {
    initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -18, filter: 'blur(4px)' },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }

  return (
    <div className="min-h-screen flex bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.12),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      {/* Left side - Form */}
      <div className="w-1/2 flex flex-col items-center justify-center px-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-10">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="mb-2 text-sm text-muted-foreground"
            >
              Apply for
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-2xl font-semibold tracking-tight"
            >
              {job.title}
            </motion.h1>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={transitionKey} {...transitionProps} className="space-y-5">
              {step === 'name' && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-[13px] font-medium text-slate-700">Full name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="h-12 rounded-xl border-slate-200 bg-white px-4 text-[16px] shadow-sm transition focus-visible:scale-[1.01] focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/10"
                    />
                  </div>
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
                    <Button onClick={handleNext} disabled={!canProceed()} className="h-12 w-full rounded-xl text-base font-semibold shadow-sm">
                      Continue
                      <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                        <ArrowRight size={18} />
                      </motion.span>
                    </Button>
                  </motion.div>
                </div>
              )}

              {step === 'email' && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-[13px] font-medium text-slate-700">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="h-12 rounded-xl border-slate-200 bg-white px-4 text-[16px] shadow-sm transition focus-visible:scale-[1.01] focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/10"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack} className="h-12 rounded-xl border-slate-200 px-4">
                      <ArrowLeft size={16} />
                    </Button>
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} className="flex-1">
                      <Button onClick={handleNext} disabled={!canProceed()} className="h-12 w-full rounded-xl text-base font-semibold shadow-sm">
                        Continue
                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                          <ArrowRight size={18} />
                        </motion.span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              )}

              {step === 'cv' && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-[13px] font-medium text-slate-700">Resume</Label>
                    <label className="block">
                      <motion.div
                        animate={isDraggingFile ? { scale: 1.015, y: -2 } : { scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                          isDraggingFile
                            ? 'border-primary bg-primary/10 shadow-[0_0_0_8px_rgba(59,130,246,0.08)]'
                            : cvFile
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-input bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:bg-accent'
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDraggingFile(true)
                        }}
                        onDragEnter={(e) => {
                          e.preventDefault()
                          setIsDraggingFile(true)
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault()
                          const nextTarget = e.relatedTarget as Node | null
                          if (!nextTarget || !e.currentTarget.contains(nextTarget)) {
                            setIsDraggingFile(false)
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          setIsDraggingFile(false)
                          handleResumeFile(e.dataTransfer.files?.[0] ?? null)
                        }}
                      >
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleResumeFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={cvFile ? cvFile.name : isDraggingFile ? 'dragging' : 'empty'}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22 }}
                          >
                            {cvFile ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2">
                                  <CheckCircle2 size={18} className="text-primary" />
                                  <span className="text-sm font-medium text-foreground">{cvFile.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Drop a different file here, or click to replace it.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <motion.div
                                  animate={isDraggingFile ? { y: [0, -3, 0] } : { y: 0 }}
                                  transition={{ repeat: isDraggingFile ? Infinity : 0, duration: 1.2 }}
                                  className="flex items-center justify-center gap-2 text-muted-foreground"
                                >
                                  <Upload size={18} />
                                  <span className="text-sm font-medium">
                                    {isDraggingFile ? 'Drop your resume here' : 'Drag and drop your resume'}
                                  </span>
                                </motion.div>
                                <p className="text-xs text-muted-foreground">or click to upload a PDF, DOC, or DOCX file</p>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>
                    </label>
                    {cvError && <p className="text-sm text-destructive">{cvError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack} className="h-12 rounded-xl border-slate-200 px-4">
                      <ArrowLeft size={16} />
                    </Button>
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} className="flex-1">
                      <Button onClick={handleNext} disabled={!canProceed()} className="h-12 w-full rounded-xl text-base font-semibold shadow-sm">
                        {isLastStep ? 'Submit' : 'Continue'}
                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                          <ArrowRight size={18} />
                        </motion.span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              )}

              {currentQuestion && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-[13px] font-medium text-slate-700">{currentQuestion.question}</Label>
                    {currentQuestion.type === 'text' ? (
                      <Textarea
                        placeholder="Your answer..."
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                        className="min-h-[128px] rounded-xl border-slate-200 bg-white px-4 py-3 text-[15px] leading-7 shadow-sm focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/10"
                        autoFocus
                      />
                    ) : (
                      <div className="space-y-2">
                        {currentQuestion.options?.map((option, index) => (
                          <motion.label
                            key={option}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, duration: 0.25 }}
                            className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                              answers[currentQuestion.id] === option
                                ? 'border-primary bg-primary/5 shadow-[0_8px_24px_rgba(59,130,246,0.08)]'
                                : 'border-input bg-white hover:bg-accent'
                            }`}
                          >
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={option}
                              checked={answers[currentQuestion.id] === option}
                              onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                              className="sr-only"
                            />
                            <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                              answers[currentQuestion.id] === option ? 'border-primary' : 'border-muted-foreground'
                            }`}>
                              {answers[currentQuestion.id] === option && (
                                <motion.div layoutId="selectedOption" className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <span className="text-sm">{option}</span>
                          </motion.label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleBack} className="h-12 rounded-xl border-slate-200 px-4">
                      <ArrowLeft size={16} />
                    </Button>
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} className="flex-1">
                      <Button onClick={handleNext} disabled={!canProceed()} className="h-12 w-full rounded-xl text-base font-semibold shadow-sm">
                        {isLastStep ? 'Submit' : 'Continue'}
                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                          <ArrowRight size={18} />
                        </motion.span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              )}

              {step === 'submitting' && (
                <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 shadow-sm">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-sm text-muted-foreground">Submitting...</span>
                </div>
              )}

              {step === 'done' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-green-500" />
                      <span className="font-medium">Application submitted</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Thanks {name.split(' ')[0]}! Let&apos;s schedule your interview.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        if (applicationId) setStep('pre-interview')
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-input bg-white hover:border-primary hover:bg-accent transition-colors text-left shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Video size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Start interview now</p>
                        <p className="text-sm text-muted-foreground">Begin your AI video interview</p>
                      </div>
                    </motion.button>

                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setStep('schedule-meeting')}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-input bg-white hover:border-primary hover:bg-accent transition-colors text-left shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Schedule for later</p>
                        <p className="text-sm text-muted-foreground">Pick a time that works for you</p>
                      </div>
                    </motion.button>
                  </div>
                </div>
              )}

              {step === 'pre-interview' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Interview ready</p>
                    <h2 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">You&apos;re about to begin your interview</h2>
                    <p className="max-w-md text-[15px] leading-7 text-muted-foreground">
                      We&apos;ll ask a few questions one by one. Once you click begin, we&apos;ll open the interview directly and start right away.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">1</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Allow camera and microphone access</p>
                        <p className="text-sm text-muted-foreground">Your responses are recorded only during the interview.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">2</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Answer each question clearly</p>
                        <p className="text-sm text-muted-foreground">You can move to the next question when you&apos;re ready.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">3</div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Submit once you finish</p>
                        <p className="text-sm text-muted-foreground">We&apos;ll process the recording automatically after the last answer.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('done')} className="h-12 rounded-xl border-slate-200 px-4">
                      <ArrowLeft size={16} />
                    </Button>
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} className="flex-1">
                      <Button
                        onClick={() => {
                          if (applicationId) navigate(`/join/${applicationId}`)
                        }}
                        className="h-12 w-full rounded-xl text-base font-semibold shadow-sm"
                      >
                        Begin interview
                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                          <ArrowRight size={18} />
                        </motion.span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              )}

              {step === 'instant-meeting' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Video size={20} className="text-primary" />
                      <span className="font-medium">Starting your interview...</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You&apos;ll be connected to a video call shortly.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3 shadow-sm">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-sm text-muted-foreground">Preparing room...</span>
                  </div>
                </div>
              )}

              {step === 'schedule-meeting' && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-[13px] font-medium text-slate-700">Select a date and time</Label>
                    <Input
                      type="datetime-local"
                      min={new Date().toISOString().slice(0, 16)}
                      className="h-12 rounded-xl border-slate-200 bg-white px-4 text-[15px] shadow-sm focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/10"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('done')} className="h-12 rounded-xl border-slate-200 px-4">
                      <ArrowLeft size={16} />
                    </Button>
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} className="flex-1">
                      <Button className="h-12 w-full rounded-xl text-base font-semibold shadow-sm">
                        Confirm
                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                          <ArrowRight size={18} />
                        </motion.span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress */}
          {step !== 'submitting' && step !== 'done' && (
            <motion.div layout className="mt-10 flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/70"
                >
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: getStepIndex() >= i ? '100%' : '0%' }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Right side - Image */}
      <div className="w-1/2 relative">
        <motion.img
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          src="/pexels-rickyrecap-2383277.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,251,255,0.08)_0%,rgba(15,23,42,0.08)_100%)]" />
      </div>
    </div>
  )
}
