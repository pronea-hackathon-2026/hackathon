import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Upload, Check, ShieldCheck, Linkedin, FileText, Brain, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Phase = 'choice' | 'scanning' | 'complete'

interface StepDef {
  id: string
  label: string
  detail: string
  duration: number
  icon: React.ReactNode
}

const STEPS: StepDef[] = [
  { id: 'upload',     label: 'Uploading CV document',      detail: 'Transferring file to analysis pipeline',          duration: 900,  icon: <Upload size={11} /> },
  { id: 'extract',    label: 'Extracting text & structure', detail: 'Recognising layout, sections & formatting',       duration: 1100, icon: <FileText size={11} /> },
  { id: 'parse',      label: 'Parsing experience & skills', detail: 'Mapping roles, companies, dates & technologies',  duration: 1400, icon: <Brain size={11} /> },
  { id: 'linkedin',   label: 'Searching LinkedIn',          detail: 'Verifying employment history & profile',          duration: 1600, icon: <Linkedin size={11} /> },
  { id: 'credibility',label: 'Running credibility check',   detail: 'Cross-referencing claims against public data',    duration: 1300, icon: <ShieldCheck size={11} /> },
  { id: 'scoring',    label: 'Generating candidate profile', detail: 'Scoring fit, flagging gaps & building report',   duration: 1200, icon: <Star size={11} /> },
]

interface MockProfile {
  candidateId: string
  name: string
  initials: string
  email: string
  phone: string
  title: string        // most recent role
  company: string      // most recent company
  location: string
  credibilityScore: number
  matchScore: number
  skills: string[]
  languages: string[]
  education: { degree: string; institution: string; year: string }
  experience: { role: string; company: string; period: string; duration: string; description: string }[]
  gaps: string[]
  redFlags: string[]
  linkedinVerified: boolean
  sources: string[]
}

const MOCK_PROFILES: Record<string, MockProfile> = {
  'mock-job-1': {
    candidateId: 'mock-c-1',
    name: 'Marcus Chen',
    initials: 'MC',
    email: 'marcus.chen@gmail.com',
    phone: '+1 415 555 0182',
    title: 'Senior Software Engineer',
    company: 'Stripe',
    location: 'San Francisco, CA',
    credibilityScore: 91,
    matchScore: 94,
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'GraphQL', 'Redis', 'Docker', 'AWS', 'Kafka'],
    languages: ['English', 'Mandarin'],
    education: { degree: 'B.S. Computer Science', institution: 'UC Berkeley', year: '2016' },
    experience: [
      { role: 'Senior Software Engineer', company: 'Stripe',  period: '2021 – Present', duration: '27 mo', description: 'Led rebuild of payment reconciliation pipeline (2M tx/day). 97% error reduction.' },
      { role: 'Software Engineer',        company: 'Airbnb',  period: '2018 – 2021',    duration: '34 mo', description: 'Core booking flow. API versioning layer, 23% booking error reduction.' },
      { role: 'Junior Software Engineer', company: 'Uber',    period: '2016 – 2018',    duration: '20 mo', description: 'Driver earnings dashboard and real-time payout tracking.' },
    ],
    gaps: [],
    redFlags: [],
    linkedinVerified: true,
    sources: ['LinkedIn', 'GitHub (142 repos)', 'Stripe Engineering Blog'],
  },
  'mock-job-2': {
    candidateId: 'mock-c-5',
    name: 'Elena Vasquez',
    initials: 'EV',
    email: 'elena.vasquez@me.com',
    phone: '+1 212 555 0197',
    title: 'Senior Product Designer',
    company: 'Figma',
    location: 'New York, NY',
    credibilityScore: 88,
    matchScore: 91,
    skills: ['Figma', 'User Research', 'Design Systems', 'Prototyping', 'Motion Design', 'Framer', 'HTML/CSS', 'Tokens Studio'],
    languages: ['English', 'Spanish'],
    education: { degree: 'BFA Graphic Design', institution: 'Rhode Island School of Design', year: '2017' },
    experience: [
      { role: 'Senior Product Designer', company: 'Figma', period: '2021 – Present', duration: '26 mo', description: 'Owned component properties panel redesign. 68% discoverability improvement.' },
      { role: 'Product Designer',        company: 'Figma', period: '2019 – 2021',    duration: '22 mo', description: 'Core editor experience, community features, plugin ecosystem UI.' },
      { role: 'UX Designer',             company: 'Adobe', period: '2017 – 2019',    duration: '19 mo', description: 'XD and Photoshop feature design. Ran usability studies.' },
    ],
    gaps: [],
    redFlags: [],
    linkedinVerified: true,
    sources: ['LinkedIn', 'Figma Design Blog', 'Dribbble (38 works)', 'RISD Alumni Records'],
  },
  'mock-job-3': {
    candidateId: 'mock-c-8',
    name: 'David Park',
    initials: 'DP',
    email: 'david.park@cornell.edu',
    phone: '+1 607 555 0199',
    title: 'Research Engineer',
    company: 'Google DeepMind',
    location: 'London, UK',
    credibilityScore: 85,
    matchScore: 88,
    skills: ['Python', 'PyTorch', 'LLMs', 'MLOps', 'Kubernetes', 'Spark', 'Ray', 'RLHF', 'TensorFlow'],
    languages: ['English', 'Korean'],
    education: { degree: 'Ph.D. Computer Science (ML)', institution: 'Cornell University', year: '2019' },
    experience: [
      { role: 'Research Engineer', company: 'Google DeepMind', period: '2022 – Present', duration: '26 mo', description: 'LLM pretraining infrastructure and RLHF pipelines. 2 published papers.' },
      { role: 'ML Engineer',       company: 'Meta AI',          period: '2019 – 2022',   duration: '30 mo', description: 'Recommendation ML pipelines at billion-user scale.' },
      { role: 'PhD Researcher',    company: 'Cornell University',period: '2015 – 2019',  duration: '48 mo', description: 'Dissertation on alignment techniques in deep RL.' },
    ],
    gaps: [],
    redFlags: [],
    linkedinVerified: true,
    sources: ['LinkedIn', 'arXiv (2 papers, 47 citations)', 'Google Scholar', 'Cornell Alumni Records'],
  },
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({ step, status }: { step: StepDef; status: 'pending' | 'running' | 'done' }) {
  return (
    <div className={`flex items-start gap-3 transition-all duration-300 ${status === 'pending' ? 'opacity-30' : 'opacity-100'}`}>
      <div className="mt-0.5 shrink-0">
        {status === 'done' && (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Check size={11} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
        {status === 'running' && (
          <div
            className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary"
            style={{ animation: 'spin 0.75s linear infinite' }}
          />
        )}
        {status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-border" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{step.label}</p>
        {status === 'running' && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-xs text-muted-foreground mt-0.5"
          >
            {step.detail}
            <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.1, repeat: Infinity }}>…</motion.span>
          </motion.p>
        )}
        {status === 'done' && <p className="text-[11px] text-emerald-600 mt-0.5">Complete</p>}
      </div>
    </div>
  )
}

// ─── Right-side CV preview card ───────────────────────────────────────────────

function CVPreviewCard({ completedSteps, profile }: { completedSteps: Set<string>; profile: MockProfile }) {
  const nameVisible    = completedSteps.has('extract')
  const skillsVisible  = completedSteps.has('parse')
  const jobVisible     = completedSteps.has('linkedin')
  const scoreVisible   = completedSteps.has('credibility')
  const isScanning     = completedSteps.size < STEPS.length

  return (
    <div className="relative w-52 shrink-0 rounded-xl border border-border bg-card overflow-hidden shadow-sm text-xs">
      {/* Scan line */}
      {isScanning && (
        <motion.div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent z-10 pointer-events-none"
          style={{ boxShadow: '0 0 8px 3px hsl(var(--primary)/0.35)' }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Header strip */}
      <div className="h-10 bg-gradient-to-r from-primary/80 to-primary flex items-center px-3 gap-2">
        <FileText size={13} className="text-primary-foreground/80" />
        <span className="text-[11px] font-semibold text-primary-foreground/90 truncate">candidate_cv.pdf</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ filter: nameVisible ? 'blur(0px)' : 'blur(5px)', opacity: nameVisible ? 1 : 0.25 }}
            transition={{ duration: 0.5 }}
            className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0"
          >
            {profile.initials}
          </motion.div>
          <motion.div
            animate={{ filter: nameVisible ? 'blur(0px)' : 'blur(5px)', opacity: nameVisible ? 1 : 0.25 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-semibold text-[12px] leading-tight">{profile.name}</p>
            <p className="text-muted-foreground text-[10px]">{profile.email}</p>
          </motion.div>
        </div>

        {/* Current role */}
        <motion.div
          animate={{ filter: jobVisible ? 'blur(0px)' : 'blur(5px)', opacity: jobVisible ? 1 : 0.2 }}
          transition={{ duration: 0.5 }}
          className="bg-muted/60 rounded-lg px-2.5 py-2"
        >
          <p className="font-medium text-[11px]">{profile.title}</p>
          <p className="text-muted-foreground text-[10px]">{profile.company} · {profile.location}</p>
        </motion.div>

        {/* Skills */}
        <motion.div
          animate={{ filter: skillsVisible ? 'blur(0px)' : 'blur(5px)', opacity: skillsVisible ? 1 : 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Skills</p>
          <div className="flex flex-wrap gap-1">
            {profile.skills.slice(0, 4).map((s) => (
              <span key={s} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{s}</span>
            ))}
            {profile.skills.length > 4 && (
              <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">+{profile.skills.length - 4}</span>
            )}
          </div>
        </motion.div>

        {/* Credibility score */}
        <motion.div
          animate={{ filter: scoreVisible ? 'blur(0px)' : 'blur(5px)', opacity: scoreVisible ? 1 : 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Credibility</p>
            <span className="text-[11px] font-bold tabular-nums">{profile.credibilityScore}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            {scoreVisible && (
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${profile.credibilityScore}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />
            )}
          </div>
        </motion.div>

        {/* Verification ticks */}
        <div className="space-y-1 pt-0.5">
          {[
            { label: 'Identity verified',   done: completedSteps.has('extract') },
            { label: 'LinkedIn confirmed',  done: completedSteps.has('linkedin') },
            { label: 'No red flags',        done: completedSteps.has('credibility') },
          ].map(({ label, done }) => (
            <div key={label} className={`flex items-center gap-1.5 transition-opacity duration-400 ${done ? 'opacity-100' : 'opacity-15'}`}>
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500' : 'bg-muted'}`}>
                {done && <Check size={8} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Phases ───────────────────────────────────────────────────────────────────

function ChoicePhase({ onSimulate, onUpload }: { onSimulate: () => void; onUpload: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18 }}
      className="p-8 space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold">Add a Candidate</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose how to bring in a new candidate for this position.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onUpload}
          className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/40 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Upload size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-sm">Upload CV</p>
            <p className="text-xs text-muted-foreground mt-0.5">Upload a PDF or DOCX — AI parses it automatically</p>
          </div>
        </button>

        <button
          onClick={onSimulate}
          className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all text-left relative overflow-hidden"
        >
          <div className="absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary tracking-wide">AI</div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Sparkles size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Simulate CV</p>
            <p className="text-xs text-muted-foreground mt-0.5">Demo the full AI parsing & verification pipeline</p>
          </div>
        </button>
      </div>
    </motion.div>
  )
}

function ScanningPhase({ completedSteps, currentStepIndex, progress, profile }: {
  completedSteps: Set<string>; currentStepIndex: number; progress: number; profile: MockProfile
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18 }}
      className="p-8"
    >
      <div className="flex gap-8">
        {/* Left */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary shrink-0"
            />
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">AI Agent · CV Analysis</span>
          </div>

          {/* Headline */}
          <div>
            <h2 className="text-2xl font-bold leading-tight">
              Analysing CV
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>…</motion.span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI is parsing the document and verifying the candidate's profile across public sources.
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">Analysis progress</span>
              <motion.span
                className="text-xs font-semibold tabular-nums"
                key={Math.round(progress)}
              >
                {Math.round(progress)}%
              </motion.span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary relative overflow-hidden"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3.5">
            {STEPS.map((step, i) => {
              const status = completedSteps.has(step.id) ? 'done'
                : i === currentStepIndex ? 'running' : 'pending'
              return <StepRow key={step.id} step={step} status={status} />
            })}
          </div>
        </div>

        {/* Right — CV preview */}
        <CVPreviewCard completedSteps={completedSteps} profile={profile} />
      </div>
    </motion.div>
  )
}

function ScoreBar({ label, score, color = 'bg-primary' }: { label: string; score: number; color?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular-nums">{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
        />
      </div>
    </div>
  )
}

function CompletePhase({ profile, onAdd, onClose }: {
  profile: MockProfile; onAdd: () => void; onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="p-8 space-y-6"
    >
      {/* Success */}
      <div className="flex items-center gap-2.5">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.05 }}
          className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"
        >
          <Check size={13} className="text-white" strokeWidth={3} />
        </motion.div>
        <span className="text-sm font-semibold text-emerald-600">CV parsed · profile generated · no issues found</span>
      </div>

      <div className="flex gap-6">
        {/* Left */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-base shrink-0">
              {profile.initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base">{profile.name}</p>
              <p className="text-sm text-muted-foreground">{profile.title} · {profile.company}</p>
              <p className="text-xs text-muted-foreground">{profile.location} · {profile.email}</p>
            </div>
          </div>

          {/* Scores */}
          <div className="space-y-2.5">
            <ScoreBar label="Match Score"       score={profile.matchScore}       color="bg-primary" />
            <ScoreBar label="Credibility Score"  score={profile.credibilityScore}  color="bg-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Red Flags</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check size={11} strokeWidth={3} /> None detected
              </span>
            </div>
          </div>

          {/* Skills */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Skills Extracted</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Education</p>
            <p className="text-sm font-medium">{profile.education.degree}</p>
            <p className="text-xs text-muted-foreground">{profile.education.institution} · {profile.education.year}</p>
          </div>
        </div>

        {/* Right */}
        <div className="w-52 shrink-0 space-y-4">
          {/* Work history */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Work History</p>
            <div className="space-y-3">
              {profile.experience.map((e, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pl-3 border-l-2 border-border"
                >
                  <p className="text-xs font-semibold leading-tight">{e.role}</p>
                  <p className="text-xs text-muted-foreground">{e.company}</p>
                  <p className="text-[10px] text-muted-foreground">{e.period} · {e.duration}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sources Verified</p>
            <div className="space-y-1.5">
              {profile.sources.map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check size={8} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-xs text-muted-foreground">{s}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Languages</p>
            <div className="flex flex-wrap gap-1">
              {profile.languages.map((l) => (
                <span key={l} className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground">{l}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button onClick={() => { onAdd(); onClose() }} className="flex-1">
          Add to Pipeline
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  jobId: string
  onUploadClick: () => void
  onAdd: () => void
}

export default function SimulateCVModal({ open, onClose, jobId, onUploadClick, onAdd }: Props) {
  const [phase, setPhase] = useState<Phase>('choice')
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const profile = MOCK_PROFILES[jobId] ?? MOCK_PROFILES['mock-job-1']

  useEffect(() => {
    if (open) {
      setPhase('choice')
      setCompletedSteps(new Set())
      setCurrentStepIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (phase !== 'scanning') return
    let cancelled = false

    async function run() {
      for (let i = 0; i < STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, STEPS[i].duration))
        if (cancelled) return
        setCompletedSteps((prev) => new Set([...prev, STEPS[i].id]))
        setCurrentStepIndex(i + 1)
      }
      await new Promise((r) => setTimeout(r, 450))
      if (!cancelled) setPhase('complete')
    }

    run()
    return () => { cancelled = true }
  }, [phase])

  const progress = (completedSteps.size / STEPS.length) * 100

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={phase === 'scanning' ? undefined : onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="relative z-10 w-full mx-4 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: phase === 'choice' ? 480 : 740 }}
      >
        {phase !== 'scanning' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {phase === 'choice' && (
            <ChoicePhase
              key="choice"
              onSimulate={() => setPhase('scanning')}
              onUpload={() => { onClose(); onUploadClick() }}
            />
          )}
          {phase === 'scanning' && (
            <ScanningPhase
              key="scanning"
              completedSteps={completedSteps}
              currentStepIndex={currentStepIndex}
              progress={progress}
              profile={profile}
            />
          )}
          {phase === 'complete' && (
            <CompletePhase
              key="complete"
              profile={profile}
              onAdd={onAdd}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
