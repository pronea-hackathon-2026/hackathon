import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Upload, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Video, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api, type Job } from '@/lib/api'

export default function ApplyPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Steps: name, email, cv, then custom questions (q0, q1, ...), then submitting, done
  const [step, setStep] = useState<string>('name')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

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
      await api.applications.create(candidate.id, jobId)
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

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-1/2 flex flex-col justify-center px-20">
        <div className="max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-1">Apply for</p>
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          </div>

          {/* Form */}
          {step === 'name' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
              <Button onClick={handleNext} disabled={!canProceed()} className="w-full">
                Continue
                <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {step === 'email' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft size={16} />
                </Button>
                <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
                  Continue
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 'cv' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Resume</Label>
                <label className="block">
                  <div className={`border rounded-md p-4 text-center cursor-pointer transition-colors ${
                    cvFile ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                  }`}>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    {cvFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} className="text-primary" />
                        <span className="text-sm">{cvFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Upload size={16} />
                        <span className="text-sm">Upload PDF or DOCX</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft size={16} />
                </Button>
                <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
                  {isLastStep ? 'Submit' : 'Continue'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Custom questions */}
          {currentQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{currentQuestion.question}</Label>
                {currentQuestion.type === 'text' ? (
                  <Textarea
                    placeholder="Your answer..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    className="min-h-[100px]"
                    autoFocus
                  />
                ) : (
                  <div className="space-y-2">
                    {currentQuestion.options?.map((option) => (
                      <label
                        key={option}
                        className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          answers[currentQuestion.id] === option
                            ? 'border-primary bg-primary/5'
                            : 'border-input hover:bg-accent'
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
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion.id] === option ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {answers[currentQuestion.id] === option && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft size={16} />
                </Button>
                <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
                  {isLastStep ? 'Submit' : 'Continue'}
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex items-center gap-3">
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
                  Thanks {name.split(' ')[0]}! Let's schedule your interview.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setStep('instant-meeting')}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-input hover:border-primary hover:bg-accent transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Start interview now</p>
                    <p className="text-sm text-muted-foreground">Join a video call right away</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep('schedule-meeting')}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-input hover:border-primary hover:bg-accent transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Schedule for later</p>
                    <p className="text-sm text-muted-foreground">Pick a time that works for you</p>
                  </div>
                </button>
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
                  You'll be connected to a video call shortly.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm text-muted-foreground">Preparing room...</span>
              </div>
            </div>
          )}

          {step === 'schedule-meeting' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select a date and time</Label>
                <Input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('done')}>
                  <ArrowLeft size={16} />
                </Button>
                <Button className="flex-1">
                  Confirm
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Progress */}
          {step !== 'submitting' && step !== 'done' && (
            <div className="flex gap-1 mt-8">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    getStepIndex() >= i ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Image */}
      <div className="w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=1600&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  )
}
