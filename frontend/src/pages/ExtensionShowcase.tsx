import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Chrome,
  Clock,
  ExternalLink,
  FileText,
  FileSearch,
  Linkedin,
  Mail,
  MessagesSquare,
  Phone,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import CandidateAvatar from '@/components/CandidateAvatar'
import ScoreBadge from '@/components/ScoreBadge'
import SourceBadge from '@/components/SourceBadge'
import StatusBadge from '@/components/StatusBadge'
import { ScoreGauge } from '@/components/ScoreGauge'

type ScanStep = {
  id: string
  label: string
  detail: string
  duration: number
}

const scanSteps: ScanStep[] = [
  { id: 'profile', label: 'Profile ingestion', detail: 'Reading LinkedIn profile, CV, and supporting docs', duration: 1400 },
  { id: 'timeline', label: 'Timeline verification', detail: 'Checking employment gaps, dropouts, and credibility signals', duration: 1600 },
  { id: 'sources', label: 'Source cross-check', detail: 'Comparing profile claims against portfolio links and supporting files', duration: 1500 },
  { id: 'questions', label: 'Interview generation', detail: 'Preparing targeted questions based on the candidate story', duration: 1500 },
  { id: 'report', label: 'HR packet ready', detail: 'Summarizing fit, concerns, and second-round recommendation', duration: 1400 },
]

const generatedQuestions = [
  'You left university before graduating. What led to that decision, and how did you continue learning after?',
  'There is an 11-month gap between May 2023 and April 2024. What were you focused on during that time?',
  'You mention improving onboarding at Bloomreach. Which product metric moved because of your work?',
  'Tell me about a conflict with engineering or product, and how you resolved it.',
]

const sources = ['CV Document', 'LinkedIn', 'Portfolio', 'Course Certificates']

function ScoreBar({ label, score, color = 'bg-primary' }: { label: string; score: number; color?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">{score}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  )
}

export default function ExtensionShowcase() {
  const [activeStep, setActiveStep] = useState(0)
  const [completed, setCompleted] = useState<string[]>([])
  const [analysisReady, setAnalysisReady] = useState(false)
  const [pushedToHr, setPushedToHr] = useState(false)
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    setActiveStep(0)
    setCompleted([])
    setAnalysisReady(false)
    setPushedToHr(false)
    setDisplayProgress(0)

    let cancelled = false
    let elapsed = 0

    const progressTimer = setInterval(() => {
      setDisplayProgress((prev) => {
        if (cancelled) return prev
        if (prev >= 96) return prev
        if (prev < 10) return Math.min(10, prev + 2)
        if (prev < 55) return Math.min(55, prev + 1)
        if (prev < 82) return Math.min(82, prev + 0.45)
        return Math.min(96, prev + 0.18)
      })
    }, 110)

    scanSteps.forEach((step, index) => {
      setTimeout(() => {
        if (!cancelled) setActiveStep(index)
      }, elapsed)

      elapsed += step.duration

      setTimeout(() => {
        if (cancelled) return
        setCompleted((prev) => (prev.includes(step.id) ? prev : [...prev, step.id]))
        if (index === scanSteps.length - 1) {
          setDisplayProgress(100)
          setAnalysisReady(true)
        }
      }, elapsed)
    })

    return () => {
      cancelled = true
      clearInterval(progressTimer)
    }
  }, [])

  const progress = useMemo(() => Math.round(analysisReady ? 100 : displayProgress), [analysisReady, displayProgress])
  const completedSet = useMemo(() => new Set(completed), [completed])

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-6 py-3 backdrop-blur">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card">
          <Chrome size={16} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Chrome extension showcase</p>
          <p className="text-xs text-muted-foreground">Mocked LinkedIn profile with staged AI analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={analysisReady ? 'final_round' : 'interview_scheduled'} />
          <Button asChild size="sm" variant="outline">
            <Link to="/jobs">Open Dashboard</Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl space-y-5 p-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <SourceBadge source="linkedin" />
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    <Sparkles size={11} />
                    TalentLens Extension
                  </span>
                </div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">TalentLens as a LinkedIn side-panel extension</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Launch the extension from the profile, let it analyse the candidate, then review the AI-generated packet once the scan completes.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="Scan time" value="45 sec" />
                <MetricCard label="Fit score" value={analysisReady ? '86%' : '...'} />
                <MetricCard label="HR handoff" value={analysisReady ? '1 click' : 'Pending'} />
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-2 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                    linkedin.com/in/nina-vargova-product-designer
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div className="flex items-start gap-4 rounded-xl border border-border bg-background p-5">
                    <CandidateAvatar name="Nina Vargova" className="h-14 w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-3xl font-semibold tracking-[-0.03em] text-foreground">Nina Vargova</p>
                        <SourceBadge source="linkedin" />
                        <StatusBadge status={analysisReady ? 'shortlisted' : 'interview_scheduled'} />
                        {analysisReady ? (
                          <ScoreBadge score={86} label="Fit" />
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            <ScanSearch size={11} />
                            Scanning
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-lg text-muted-foreground">Senior Product Designer · Bloomreach</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail size={11} />nina.vargova@gmail.com
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone size={11} />+421 903 555 201
                        </span>
                        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Linkedin size={11} />LinkedIn<ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {analysisReady ? (
                    <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-5 transition-all duration-500">
                      <div className="space-y-5 transition-all duration-500">
                        <div className="space-y-3">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Scores</p>
                          <ScoreBar label="Match Score" score={86} color="bg-primary" />
                          <ScoreBar label="Credibility" score={78} color="bg-emerald-500" />
                          <ScoreBar label="Interview Readiness" score={91} color="bg-violet-500" />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Red Flags</span>
                            <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                              <AlertTriangle size={11} strokeWidth={2.5} />2 detected
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Employment Gaps</span>
                            <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                              <Clock size={11} />1 gap
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                          <p className="flex items-start gap-1.5 text-sm text-red-500">
                            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                            Candidate dropped out of Comenius University before finishing year two. Ask why and what replaced formal education.
                          </p>
                          <p className="flex items-start gap-1.5 text-sm text-red-500">
                            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                            LinkedIn timeline shows an 11-month consulting gap with limited detail.
                          </p>
                        </div>

                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                          <p className="flex items-center gap-1.5 text-sm text-amber-600">
                            <Clock size={11} className="shrink-0" />
                            May 2023 → April 2024 · 11mo
                          </p>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Verified sources</p>
                          <div className="flex flex-wrap gap-2">
                            {sources.map((source) => (
                              <span key={source} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Experience</p>
                          <div className="space-y-3">
                            <ExperienceRow title="Senior Product Designer · Bloomreach" meta="2024 — present" detail="Owned onboarding redesign, activation flows, and design-to-engineering handoff quality." />
                            <ExperienceRow title="Independent consulting" meta="2023 — 2024" detail="Profile mentions freelance work but needs sharper evidence during the interview." />
                            <ExperienceRow title="Product Designer · Kiwi.com" meta="2020 — 2023" detail="Worked on booking flows, marketplace UX, and customer-support surfaces." />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 transition-all duration-500">
                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Snapshot</p>
                          <div className="grid grid-cols-2 gap-3">
                            <ScoreGauge score={86} label="Fit" />
                            <ScoreGauge score={78} label="Evidence" />
                            <ScoreGauge score={91} label="Interview" />
                            <ScoreGauge score={83} label="Overall" />
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Recommended action</p>
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                            Proceed to AI first-round interview, then schedule HR follow-up if communication quality stays above threshold.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <LoadingOverview activeStep={scanSteps[activeStep]?.label ?? 'Analysing profile'} />
                  )}

                  {!analysisReady && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ opacity: [1, 0.35, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="h-2 w-2 rounded-full bg-primary"
                        />
                        <p className="text-sm font-medium text-foreground">TalentLens is analysing this candidate</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Scores, generated questions, and the HR recommendation will appear when the scan is finished.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">TalentLens side panel</p>
                    <p className="text-xs text-muted-foreground">Same logic, packaged like a Chrome extension</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
                    <Chrome size={16} className="text-primary" />
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-primary/20 bg-card/60 p-4 backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5 shrink-0">
                      {analysisReady ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <>
                          <ScanSearch size={18} className="text-primary animate-pulse" />
                          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                        </>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-none">
                        {analysisReady ? 'Candidate ready for HR review' : 'Running first-round AI analysis'}
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-[width] duration-300 ease-out ${analysisReady ? 'bg-emerald-500' : 'bg-primary'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between">
                        <span className="text-xs text-muted-foreground">{completed.length} / {scanSteps.length} stages</span>
                        <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                    {scanSteps.map((step, index) => {
                      const isDone = completed.includes(step.id)
                      const isCurrent = index === activeStep && !isDone
                      return (
                        <StepRow key={step.id} step={step} isDone={isDone} isCurrent={isCurrent} />
                      )
                    })}
                  </div>
                </div>

                {!analysisReady && (
                  <div className="mt-5 space-y-3">
                    <LoadingCard title="Generating interview prompts" lines={3} />
                    <LoadingCard title="Preparing communication analysis" lines={3} />
                  </div>
                )}

                {analysisReady && (
                  <div className="mt-5 space-y-3">
                    <PanelCard
                      icon={<FileSearch size={14} />}
                      title="Generated interview prompts"
                      content={(
                        <div className="space-y-2">
                          {generatedQuestions.map((question, index) => (
                            <div key={question} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                              <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                              {question}
                            </div>
                          ))}
                        </div>
                      )}
                    />

                    <PanelCard
                      icon={<MessagesSquare size={14} />}
                      title="Behavior analysis after interview"
                      content={(
                        <div className="space-y-3">
                          <ScoreBar label="Answer clarity" score={92} color="bg-primary" />
                          <ScoreBar label="Communication" score={88} color="bg-emerald-500" />
                          <ScoreBar label="Attention consistency" score={76} color="bg-violet-500" />
                        </div>
                      )}
                    />
                  </div>
                )}

                {pushedToHr && (
                  <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                    HR packet created with fit score, flagged concerns, interview summary, and second-round recommendation.
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2">
                  <Button onClick={() => setPushedToHr(true)} disabled={!analysisReady}>
                    <ShieldCheck size={14} />
                    Push to HR dashboard
                  </Button>
                  <Button asChild variant="outline" disabled={!analysisReady}>
                    <Link to="/jobs">
                      <Video size={14} />
                      Continue in recruiter dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!analysisReady && (
        <ScanningOverlay completedSteps={completedSet} currentStepIndex={activeStep} progress={progress} />
      )}
    </div>
  )
}

function ScanningOverlay({
  completedSteps,
  currentStepIndex,
  progress,
}: {
  completedSteps: Set<string>
  currentStepIndex: number
  progress: number
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-[1180px] rounded-[24px] border border-border bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
          <div className="flex gap-8">
            <div className="min-w-0 flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="h-4 w-4 rounded-full bg-primary"
                />
                <span className="text-[15px] font-semibold uppercase tracking-[0.18em] text-primary">AI Agent · CV Analysis</span>
              </div>

              <div>
                <h2 className="text-5xl font-bold leading-none tracking-[-0.05em] text-foreground">
                  Analysing CV
                  <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>…</motion.span>
                </h2>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-muted-foreground">
                  AI is parsing the document and verifying the candidate&apos;s profile across public sources.
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[15px] font-medium text-muted-foreground">Analysis progress</span>
                  <span className="text-[18px] font-semibold tabular-nums text-foreground">{progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="relative h-full rounded-full bg-primary"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
                    />
                  </motion.div>
                </div>
              </div>

              <div className="space-y-5 pt-2">
                {scanSteps.map((step, index) => {
                  const status = completedSteps.has(step.id)
                    ? 'done'
                    : index === currentStepIndex
                      ? 'running'
                      : 'pending'
                  return <OverlayStepRow key={step.id} step={step} status={status} />
                })}
              </div>
            </div>

            <OverlayPreviewCard completedSteps={completedSteps} />
          </div>
        </div>
      </div>
    </div>
  )
}

function OverlayStepRow({ step, status }: { step: ScanStep; status: 'pending' | 'running' | 'done' }) {
  return (
    <div className={`flex items-start gap-4 transition-all duration-300 ${status === 'pending' ? 'opacity-30' : 'opacity-100'}`}>
      <div className="mt-1 shrink-0">
        {status === 'done' && (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500"
          >
            <Check size={18} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
        {status === 'running' && (
          <div className="h-8 w-8 rounded-full border-[3px] border-primary/25 border-t-primary" style={{ animation: 'spin 0.75s linear infinite' }} />
        )}
        {status === 'pending' && <div className="h-8 w-8 rounded-full border-[3px] border-border" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xl font-semibold leading-tight text-foreground">{step.label}</p>
        {status === 'running' && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-1 text-base text-muted-foreground"
          >
            {step.detail}
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity }}>…</motion.span>
          </motion.p>
        )}
        {status === 'done' && <p className="mt-1 text-base text-emerald-600">Complete</p>}
      </div>
    </div>
  )
}

function OverlayPreviewCard({ completedSteps }: { completedSteps: Set<string> }) {
  const nameVisible = completedSteps.has('timeline')
  const roleVisible = completedSteps.has('sources')
  const scoreVisible = completedSteps.has('report')
  const isScanning = completedSteps.size < scanSteps.length

  return (
    <div className="relative w-[360px] shrink-0 overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
      {isScanning && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 z-10 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ boxShadow: '0 0 10px 4px hsl(var(--primary)/0.35)' }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <div className="flex h-16 items-center gap-3 bg-gradient-to-r from-primary/80 to-primary px-5">
        <FileText size={20} className="text-primary-foreground/80" />
        <span className="text-xl font-semibold text-primary-foreground/90">candidate_cv.pdf</span>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ filter: nameVisible ? 'blur(0px)' : 'blur(6px)', opacity: nameVisible ? 1 : 0.25 }}
            transition={{ duration: 0.5 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary"
          >
            NV
          </motion.div>
          <motion.div
            animate={{ filter: nameVisible ? 'blur(0px)' : 'blur(6px)', opacity: nameVisible ? 1 : 0.25 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-3xl font-bold text-foreground">Nina Vargova</p>
            <p className="text-base text-muted-foreground">nina.vargova@gmail.com</p>
          </motion.div>
        </div>

        <motion.div
          animate={{ filter: roleVisible ? 'blur(0px)' : 'blur(6px)', opacity: roleVisible ? 1 : 0.2 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-muted/60 px-4 py-4"
        >
          <p className="text-[17px] font-semibold text-foreground">Senior Product Designer</p>
          <p className="text-[14px] text-muted-foreground">Bloomreach · Bratislava, Slovakia</p>
        </motion.div>

        <div className="space-y-3">
          <motion.div animate={{ opacity: roleVisible ? 1 : 0.2, filter: roleVisible ? 'blur(0px)' : 'blur(6px)' }} transition={{ duration: 0.5 }} className="h-8 rounded-xl bg-muted/60" />
          <motion.div animate={{ opacity: roleVisible ? 1 : 0.2, filter: roleVisible ? 'blur(0px)' : 'blur(6px)' }} transition={{ duration: 0.5 }} className="h-8 w-[88%] rounded-xl bg-muted/60" />
          <motion.div animate={{ opacity: roleVisible ? 1 : 0.2, filter: roleVisible ? 'blur(0px)' : 'blur(6px)' }} transition={{ duration: 0.5 }} className="h-8 w-[80%] rounded-xl bg-muted/60" />
        </div>

        <motion.div
          animate={{ filter: scoreVisible ? 'blur(0px)' : 'blur(6px)', opacity: scoreVisible ? 1 : 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credibility</p>
            <span className="text-sm font-bold text-foreground">78%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            {scoreVisible && (
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: '78%' }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            )}
          </div>
        </motion.div>

        <div className="space-y-3 pt-1">
          {[
            { label: 'Identity verified', done: completedSteps.has('timeline') },
            { label: 'LinkedIn confirmed', done: completedSteps.has('sources') },
            { label: 'No red flags', done: completedSteps.has('report') },
          ].map(({ label, done }) => (
            <div key={label} className={`flex items-center gap-3 transition-opacity duration-400 ${done ? 'opacity-100' : 'opacity-15'}`}>
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? 'bg-emerald-500' : 'bg-muted'}`}>
                {done && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-base text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepRow({ step, isDone, isCurrent }: { step: ScanStep; isDone: boolean; isCurrent: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{step.label}</p>
          <p className="text-xs text-muted-foreground">
            {isCurrent ? (
              <>
                {step.detail}
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity }}>…</motion.span>
              </>
            ) : (
              step.detail
            )}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
          isDone
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : isCurrent
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-border bg-muted text-muted-foreground'
        }`}>
          {isDone ? <Check size={11} strokeWidth={3} /> : isCurrent ? <ScanSearch size={11} /> : <Clock size={11} />}
          {isDone ? 'Done' : isCurrent ? 'Running' : 'Pending'}
        </span>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  )
}

function ExperienceRow({ title, meta, detail }: { title: string; meta: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <span className="text-xs text-muted-foreground">{meta}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function PanelCard({
  icon,
  title,
  content,
}: {
  icon: ReactNode
  title: string
  content: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {content}
    </div>
  )
}

function LoadingOverview({ activeStep }: { activeStep: string }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-primary"
          />
          <p className="text-sm font-medium text-foreground">Analysing candidate profile</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Current stage: {activeStep}
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-5">
        <div className="space-y-4">
          <LoadingSection title="Scores" rows={5} />
          <LoadingSection title="Risk flags" rows={2} />
          <LoadingSection title="Employment gaps" rows={1} />
          <LoadingSection title="Verified sources" rows={1} compact />
          <LoadingSection title="Experience" rows={3} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Snapshot</p>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-border p-3">
                  <div className="mx-auto h-[54px] w-[54px] animate-pulse rounded-full bg-muted" />
                  <div className="mx-auto mt-2 h-3 w-12 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>

          <LoadingSection title="Recommended action" rows={3} />
        </div>
      </div>
    </div>
  )
}

function LoadingSection({ title, rows, compact = false }: { title: string; rows: number; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={`animate-pulse rounded-lg bg-muted ${compact ? 'h-8' : 'h-12'}`}
            style={{ width: `${compact ? 100 : 100 - index * 8}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function LoadingCard({ title, lines }: { title: string; lines: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-muted"
            style={{ width: `${100 - index * 10}%` }}
          />
        ))}
      </div>
    </div>
  )
}
