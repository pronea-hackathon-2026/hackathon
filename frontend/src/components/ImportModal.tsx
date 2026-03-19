import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, FileSpreadsheet, Database, Building2, Users,
  Linkedin, Briefcase, Globe, Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type Phase = 'picker' | 'connecting' | 'complete'

// ─── Service definitions ───────────────────────────────────────────────────────

interface ServiceDef {
  id: string
  name: string
  description: string
  category: 'job-boards' | 'ats' | 'enterprise' | 'other'
  color: string
  icon: React.ReactNode
}

const SERVICES: ServiceDef[] = [
  // Job Boards
  { id: 'linkedin', name: 'LinkedIn Recruiter', description: 'Import from LinkedIn talent pool', category: 'job-boards', color: 'bg-[#0A66C2]', icon: <Linkedin size={18} /> },
  { id: 'indeed', name: 'Indeed', description: 'Import from Indeed candidate list', category: 'job-boards', color: 'bg-[#2164F3]', icon: <Briefcase size={18} /> },
  { id: 'glassdoor', name: 'Glassdoor', description: 'Import applications from Glassdoor', category: 'job-boards', color: 'bg-[#0CAA41]', icon: <Globe size={18} /> },
  { id: 'ziprecruiter', name: 'ZipRecruiter', description: 'Sync candidates from ZipRecruiter', category: 'job-boards', color: 'bg-[#5B9A47]', icon: <Users size={18} /> },

  // ATS Platforms
  { id: 'greenhouse', name: 'Greenhouse', description: 'Migrate from Greenhouse ATS', category: 'ats', color: 'bg-[#3AB549]', icon: <Layers size={18} /> },
  { id: 'lever', name: 'Lever', description: 'Import from Lever hiring platform', category: 'ats', color: 'bg-[#6B46C1]', icon: <Layers size={18} /> },
  { id: 'workable', name: 'Workable', description: 'Sync from Workable ATS', category: 'ats', color: 'bg-[#19B4E5]', icon: <Layers size={18} /> },
  { id: 'ashby', name: 'Ashby', description: 'Import from Ashby recruiting', category: 'ats', color: 'bg-[#FF6B35]', icon: <Layers size={18} /> },
  { id: 'bamboohr', name: 'BambooHR', description: 'Import from BambooHR HRIS', category: 'ats', color: 'bg-[#73C41D]', icon: <Building2 size={18} /> },
  { id: 'personio', name: 'Personio', description: 'Sync from Personio HR platform', category: 'ats', color: 'bg-[#FF5A5F]', icon: <Building2 size={18} /> },

  // Enterprise
  { id: 'workday', name: 'Workday', description: 'Import from Workday HCM', category: 'enterprise', color: 'bg-[#0875E1]', icon: <Building2 size={18} /> },
  { id: 'sap', name: 'SAP SuccessFactors', description: 'Sync from SAP SuccessFactors', category: 'enterprise', color: 'bg-[#007DB8]', icon: <Building2 size={18} /> },

  // Other
  { id: 'csv', name: 'CSV / Spreadsheet', description: 'Upload CSV, Excel, or Google Sheets export', category: 'other', color: 'bg-muted', icon: <FileSpreadsheet size={18} /> },
  { id: 'database', name: 'Database Export', description: 'Import from SQL or JSON export', category: 'other', color: 'bg-muted', icon: <Database size={18} /> },
]

const CATEGORY_LABELS: Record<string, string> = {
  'job-boards': 'Job Boards',
  'ats': 'ATS Platforms',
  'enterprise': 'Enterprise',
  'other': 'CSV / Spreadsheet',
}

// ─── Connection steps ──────────────────────────────────────────────────────────

interface StepDef {
  id: string
  label: string
  detail: string
  duration: number
}

const CONNECTION_STEPS: StepDef[] = [
  { id: 'auth', label: 'Authenticating', detail: 'Establishing secure connection', duration: 1200 },
  { id: 'fetch', label: 'Fetching candidates', detail: 'Retrieving candidate records', duration: 1800 },
  { id: 'parse', label: 'Parsing records', detail: 'Extracting profile data', duration: 1400 },
  { id: 'sync', label: 'Syncing profiles', detail: 'Adding candidates to pipeline', duration: 1100 },
]

// ─── Mock imported candidates ──────────────────────────────────────────────────

const MOCK_IMPORTED = [
  { name: 'Sarah Mitchell', email: 'sarah.m@example.com' },
  { name: 'James Rodriguez', email: 'j.rodriguez@example.com' },
  { name: 'Emily Zhang', email: 'emily.zhang@example.com' },
  { name: 'Michael Okonkwo', email: 'm.okonkwo@example.com' },
  { name: 'Anna Kowalski', email: 'anna.k@example.com' },
  { name: 'David Chen', email: 'd.chen@example.com' },
  { name: 'Rachel Kim', email: 'r.kim@example.com' },
  { name: 'Thomas Müller', email: 't.muller@example.com' },
]

// ─── Step row ──────────────────────────────────────────────────────────────────

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

// ─── Phases ────────────────────────────────────────────────────────────────────

function PickerPhase({ onSelect }: { onSelect: (service: ServiceDef) => void }) {
  const categories = ['job-boards', 'ats', 'enterprise', 'other'] as const

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18 }}
      className="p-8 space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold">Import Candidates</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a service to import candidates from.</p>
      </div>

      <div className="space-y-5">
        {categories.map((category) => {
          const services = SERVICES.filter((s) => s.category === category)
          if (services.length === 0) return null

          return (
            <div key={category}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[category]}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => onSelect(service)}
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/40 transition-all text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg ${service.color} flex items-center justify-center text-white shrink-0`}>
                      {service.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function ConnectingPhase({
  service,
  completedSteps,
  currentStepIndex,
  progress,
  importCount
}: {
  service: ServiceDef
  completedSteps: Set<string>
  currentStepIndex: number
  progress: number
  importCount: number
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
          {/* Service badge */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${service.color} flex items-center justify-center text-white shrink-0`}>
              {service.icon}
            </div>
            <div>
              <p className="font-semibold">{service.name}</p>
              <p className="text-xs text-muted-foreground">Importing candidates</p>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h2 className="text-2xl font-bold leading-tight">
              Connecting
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>…</motion.span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Securely fetching and syncing candidate data from {service.name}.
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">Import progress</span>
              <motion.span className="text-xs font-semibold tabular-nums" key={Math.round(progress)}>
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
            {CONNECTION_STEPS.map((step, i) => {
              const status = completedSteps.has(step.id) ? 'done'
                : i === currentStepIndex ? 'running' : 'pending'
              return <StepRow key={step.id} step={step} status={status} />
            })}
          </div>
        </div>

        {/* Right — live counter */}
        <div className="w-48 shrink-0 flex flex-col items-center justify-center bg-muted/30 rounded-xl border border-border p-6">
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-3 h-3 rounded-full bg-primary mb-4"
          />
          <motion.p
            key={importCount}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-5xl font-bold tabular-nums"
          >
            {importCount}
          </motion.p>
          <p className="text-sm text-muted-foreground mt-1">candidates found</p>
        </div>
      </div>
    </motion.div>
  )
}

function CompletePhase({
  service,
  importedCandidates,
  onViewPipeline,
  onClose
}: {
  service: ServiceDef
  importedCandidates: typeof MOCK_IMPORTED
  onViewPipeline: () => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
      className="p-8 space-y-6"
    >
      {/* Success */}
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.05 }}
          className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"
        >
          <Check size={16} className="text-white" strokeWidth={3} />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold">Import Complete</h2>
          <p className="text-sm text-muted-foreground">
            {importedCandidates.length} candidates imported from {service.name}
          </p>
        </div>
      </div>

      {/* Imported list */}
      <div className="bg-muted/30 rounded-xl border border-border p-4 max-h-64 overflow-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Imported Candidates
        </p>
        <div className="space-y-2">
          {importedCandidates.map((candidate, i) => (
            <motion.div
              key={candidate.email}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 py-2 px-3 bg-background rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                {candidate.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{candidate.name}</p>
                <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check size={10} className="text-white" strokeWidth={3} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-border">
        <Button onClick={onViewPipeline} className="flex-1">
          View Pipeline
        </Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </motion.div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  jobId: string
  onImportComplete?: () => void
}

export default function ImportModal({ open, onClose, jobId, onImportComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('picker')
  const [selectedService, setSelectedService] = useState<ServiceDef | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [importCount, setImportCount] = useState(0)

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase('picker')
      setSelectedService(null)
      setCompletedSteps(new Set())
      setCurrentStepIndex(0)
      setImportCount(0)
    }
  }, [open])

  // Connection animation
  useEffect(() => {
    if (phase !== 'connecting' || !selectedService) return
    let cancelled = false

    async function run() {
      // Tick up import count while fetching
      const countInterval = setInterval(() => {
        setImportCount((prev) => Math.min(prev + 1, MOCK_IMPORTED.length))
      }, 400)

      for (let i = 0; i < CONNECTION_STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, CONNECTION_STEPS[i].duration))
        if (cancelled) { clearInterval(countInterval); return }
        setCompletedSteps((prev) => new Set([...prev, CONNECTION_STEPS[i].id]))
        setCurrentStepIndex(i + 1)
      }

      clearInterval(countInterval)
      setImportCount(MOCK_IMPORTED.length)

      // Actually add the imported candidates to the job
      api.candidates.addImported(jobId)

      await new Promise((r) => setTimeout(r, 450))
      if (!cancelled) setPhase('complete')
    }

    run()
    return () => { cancelled = true }
  }, [phase, selectedService])

  const progress = (completedSteps.size / CONNECTION_STEPS.length) * 100

  const handleSelect = (service: ServiceDef) => {
    setSelectedService(service)
    setPhase('connecting')
  }

  const handleViewPipeline = () => {
    onImportComplete?.()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={phase === 'connecting' ? undefined : onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="relative z-10 w-full mx-4 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxWidth: phase === 'picker' ? 580 : 680 }}
      >
        {phase !== 'connecting' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={16} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {phase === 'picker' && (
            <PickerPhase key="picker" onSelect={handleSelect} />
          )}
          {phase === 'connecting' && selectedService && (
            <ConnectingPhase
              key="connecting"
              service={selectedService}
              completedSteps={completedSteps}
              currentStepIndex={currentStepIndex}
              progress={progress}
              importCount={importCount}
            />
          )}
          {phase === 'complete' && selectedService && (
            <CompletePhase
              key="complete"
              service={selectedService}
              importedCandidates={MOCK_IMPORTED}
              onViewPipeline={handleViewPipeline}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
