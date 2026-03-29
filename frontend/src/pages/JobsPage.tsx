import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAIProgress } from '@/lib/ai-progress'
import { Briefcase, Plus, Trash2, X, ChevronRight, ChevronLeft, CheckCircle2, Copy, Check, Link, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api, type Job, type JobRequirements, type ApplicationQuestion } from '@/lib/api'

// ─── Tag Input ────────────────────────────────────────────────────────────────

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  Frontend: ['React', 'TypeScript', 'Next.js', 'Vue.js', 'Tailwind CSS', 'GraphQL'],
  Backend: ['Node.js', 'Java', 'Python', 'Go', 'PostgreSQL', 'Redis', 'REST API'],
  Mobile: ['React Native', 'Swift', 'Kotlin', 'Flutter'],
  DevOps: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform'],
  AI: ['Machine Learning', 'PyTorch', 'OpenAI API', 'LLMs', 'Data Science'],
  Soft: ['Leadership', 'Communication', 'Agile', 'Mentoring'],
}

function TagInput({
  tags,
  onChange,
  suggestions,
  placeholder = 'Type and press Enter…',
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(val: string) {
    const trimmed = val.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const filteredSuggestions = suggestions?.filter(
    (s) => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <div
        className="min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-md border border-input bg-background cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="hover:text-destructive"
            >
              <X size={11} />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
        />
      </div>
      {suggestions && input.length === 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(SKILL_SUGGESTIONS).map(([group, skills]) =>
            skills
              .filter((s) => !tags.includes(s))
              .slice(0, 3)
              .map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => addTag(skill)}
                  className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors"
                >
                  + {skill}
                </button>
              ))
          )}
        </div>
      )}
      {filteredSuggestions && filteredSuggestions.length > 0 && input.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Scoring Weights Slider ───────────────────────────────────────────────────

type WeightKey = 'technical_skills' | 'experience_years' | 'domain_background' | 'education' | 'career_trajectory'
const WEIGHT_LABELS: Record<WeightKey, string> = {
  technical_skills: 'Technical Skills',
  experience_years: 'Years of Experience',
  domain_background: 'Domain Background',
  education: 'Education',
  career_trajectory: 'Career Trajectory',
}
const WEIGHT_COLORS: Record<WeightKey, string> = {
  technical_skills: 'bg-blue-500',
  experience_years: 'bg-green-500',
  domain_background: 'bg-purple-500',
  education: 'bg-orange-500',
  career_trajectory: 'bg-pink-500',
}

function ScoringWeights({
  weights,
  onChange,
}: {
  weights: JobRequirements['scoring_weights']
  onChange: (w: JobRequirements['scoring_weights']) => void
}) {
  function handleChange(key: WeightKey, newVal: number) {
    const clamped = Math.max(0, Math.min(100, newVal))
    const diff = clamped - weights[key]
    const others = (Object.keys(weights) as WeightKey[]).filter((k) => k !== key)
    const totalOthers = others.reduce((s, k) => s + weights[k], 0)

    const updated = { ...weights, [key]: clamped }
    if (totalOthers > 0) {
      others.forEach((k) => {
        updated[k] = Math.max(0, Math.round(weights[k] - diff * (weights[k] / totalOthers)))
      })
    }
    // Fix rounding so sum = 100
    const sum = (Object.values(updated) as number[]).reduce((a, b) => a + b, 0)
    if (sum !== 100) {
      const adjustKey = others.find((k) => updated[k] > 0) ?? others[0]
      updated[adjustKey] = Math.max(0, updated[adjustKey] + (100 - sum))
    }
    onChange(updated)
  }

  const total = (Object.values(weights) as number[]).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      <div className="flex gap-1 h-3 rounded-full overflow-hidden">
        {(Object.keys(weights) as WeightKey[]).map((k) => (
          <div
            key={k}
            className={`${WEIGHT_COLORS[k]} transition-all`}
            style={{ width: `${weights[k]}%` }}
            title={`${WEIGHT_LABELS[k]}: ${weights[k]}%`}
          />
        ))}
      </div>
      {(Object.keys(weights) as WeightKey[]).map((k) => (
        <div key={k} className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${WEIGHT_COLORS[k]}`} />
          <span className="text-sm flex-1 text-muted-foreground">{WEIGHT_LABELS[k]}</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={weights[k]}
              onChange={(e) => handleChange(k, parseInt(e.target.value))}
              className="w-28"
            />
            <span className="text-sm font-mono w-8 text-right">{weights[k]}%</span>
          </div>
        </div>
      ))}
      {total !== 100 && (
        <p className="text-xs text-destructive">Total: {total}% (must equal 100%)</p>
      )}
    </div>
  )
}

// ─── Responsibilities List ────────────────────────────────────────────────────

function ResponsibilitiesInput({
  items,
  onChange,
}: {
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [input, setInput] = useState('')

  function add() {
    if (input.trim()) {
      onChange([...items, input.trim()])
      setInput('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="e.g. Lead backend architecture decisions"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span className="flex-1">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = ['Basics', 'Skills', 'Role Details', 'Application Form', 'AI Guidance']

function defaultRequirements(): JobRequirements {
  return {
    required_skills: [],
    nice_to_have_skills: [],
    min_years_experience: 0,
    max_years_experience: 10,
    seniority: '',
    location_type: '',
    employment_type: '',
    education: '',
    languages: [],
    responsibilities: [],
    success_description: '',
    dealbreakers: [],
    green_flags: [],
    scoring_weights: {
      technical_skills: 40,
      experience_years: 20,
      domain_background: 20,
      education: 10,
      career_trajectory: 10,
    },
    application_questions: [],
  }
}

// ─── Question Builder ─────────────────────────────────────────────────────────

function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: ApplicationQuestion[]
  onChange: (questions: ApplicationQuestion[]) => void
}) {
  const [newQuestion, setNewQuestion] = useState('')
  const [newType, setNewType] = useState<'text' | 'choice'>('text')
  const [newOptions, setNewOptions] = useState('')

  function addQuestion() {
    if (!newQuestion.trim()) return
    const q: ApplicationQuestion = {
      id: crypto.randomUUID(),
      type: newType,
      question: newQuestion.trim(),
      required: true,
      ...(newType === 'choice' && newOptions.trim()
        ? { options: newOptions.split(',').map(o => o.trim()).filter(Boolean) }
        : {}),
    }
    onChange([...questions, q])
    setNewQuestion('')
    setNewOptions('')
  }

  function removeQuestion(id: string) {
    onChange(questions.filter(q => q.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Existing questions */}
      {questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-xs text-muted-foreground mt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{q.question}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {q.type === 'text' ? 'Text answer' : 'Multiple choice'}
                  </Badge>
                  {q.options && (
                    <span className="text-xs text-muted-foreground">
                      {q.options.join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new question */}
      <div className="space-y-3 p-3 rounded-lg border border-dashed border-border">
        <div className="flex gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'text' | 'choice')}
          >
            <option value="text">Text answer</option>
            <option value="choice">Multiple choice</option>
          </select>
          <Input
            placeholder="Enter your question..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
            className="flex-1"
          />
        </div>
        {newType === 'choice' && (
          <Input
            placeholder="Options (comma separated): Yes, No, Maybe"
            value={newOptions}
            onChange={(e) => setNewOptions(e.target.value)}
          />
        )}
        <Button type="button" variant="outline" size="sm" onClick={addQuestion} disabled={!newQuestion.trim()}>
          <Plus size={14} />
          Add Question
        </Button>
      </div>
    </div>
  )
}

// ─── Job Form Dialog (Create or Edit) ─────────────────────────────────────────

function JobFormDialog({
  open,
  onClose,
  onSaved,
  editJob,
}: {
  open: boolean
  onClose: () => void
  onSaved: (job: Job) => void
  editJob?: Job | null
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [req, setReq] = useState<JobRequirements>(defaultRequirements())
  const [saving, setSaving] = useState(false)
  const aiProgress = useAIProgress()

  const isEditMode = !!editJob

  // Initialize form with edit data when editJob changes
  useEffect(() => {
    if (editJob) {
      setTitle(editJob.title || '')
      setDesc(editJob.description || '')
      setReq(editJob.requirements || defaultRequirements())
      setStep(0)
    }
  }, [editJob])

  function reset() {
    setStep(0)
    setTitle('')
    setDesc('')
    setReq(defaultRequirements())
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    aiProgress.start()
    try {
      let job: Job
      if (isEditMode && editJob) {
        job = await api.jobs.update(editJob.id, { title, description: desc, requirements: req })
      } else {
        job = await api.jobs.create(title, desc, req)
        navigate(`/?job=${job.id}`)
      }
      aiProgress.complete()
      onSaved(job)
      handleClose()
    } catch (e) {
      console.error(e)
      aiProgress.complete()
    } finally {
      setSaving(false)
    }
  }

  function updateReq<K extends keyof JobRequirements>(key: K, value: JobRequirements[K]) {
    setReq((prev) => ({ ...prev, [key]: value }))
  }

  const allSkillSuggestions = Object.values(SKILL_SUGGESTIONS).flat()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Job' : 'Create New Job'}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  i === step
                    ? 'text-foreground'
                    : i < step
                    ? 'text-primary cursor-pointer hover:underline'
                    : 'text-muted-foreground'
                }`}
              >
                {i < step ? (
                  <CheckCircle2 size={14} className="text-primary shrink-0" />
                ) : (
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                    i === step ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>{i + 1}</span>
                )}
                {s}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">

          {/* Step 0: Basics */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  placeholder="e.g. Senior Full-Stack Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seniority Level</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={req.seniority}
                    onChange={(e) => updateReq('seniority', e.target.value as JobRequirements['seniority'])}
                  >
                    <option value="">Select…</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead / Staff</option>
                    <option value="director">Director / Head</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={req.location_type}
                    onChange={(e) => updateReq('location_type', e.target.value as JobRequirements['location_type'])}
                  >
                    <option value="">Select…</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={req.employment_type}
                    onChange={(e) => updateReq('employment_type', e.target.value as JobRequirements['employment_type'])}
                  >
                    <option value="">Select…</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Education Required</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={req.education}
                    onChange={(e) => updateReq('education', e.target.value as JobRequirements['education'])}
                  >
                    <option value="">Select…</option>
                    <option value="none">No requirement</option>
                    <option value="bachelor">Bachelor's</option>
                    <option value="master">Master's</option>
                    <option value="phd">PhD</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Min</span>
                    <Input
                      type="number"
                      min={0}
                      max={req.max_years_experience}
                      value={req.min_years_experience}
                      onChange={(e) => updateReq('min_years_experience', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Max</span>
                    <Input
                      type="number"
                      min={req.min_years_experience}
                      max={30}
                      value={req.max_years_experience}
                      onChange={(e) => updateReq('max_years_experience', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">years</span>
                </div>
              </div>
            </>
          )}

          {/* Step 1: Skills */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Required Skills</Label>
                <p className="text-xs text-muted-foreground">Click suggestions or type + Enter to add</p>
                <TagInput
                  tags={req.required_skills}
                  onChange={(v) => updateReq('required_skills', v)}
                  suggestions={allSkillSuggestions}
                  placeholder="React, TypeScript, Node.js…"
                />
              </div>
              <div className="space-y-2">
                <Label>Nice-to-Have Skills</Label>
                <TagInput
                  tags={req.nice_to_have_skills}
                  onChange={(v) => updateReq('nice_to_have_skills', v)}
                  suggestions={allSkillSuggestions.filter((s) => !req.required_skills.includes(s))}
                  placeholder="Docker, AWS, GraphQL…"
                />
              </div>
              <div className="space-y-2">
                <Label>Languages</Label>
                <TagInput
                  tags={req.languages}
                  onChange={(v) => updateReq('languages', v)}
                  placeholder="English, Czech, German…"
                />
              </div>
            </>
          )}

          {/* Step 2: Role Details */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Key Responsibilities</Label>
                <p className="text-xs text-muted-foreground">What will this person actually do day-to-day?</p>
                <ResponsibilitiesInput
                  items={req.responsibilities}
                  onChange={(v) => updateReq('responsibilities', v)}
                />
              </div>
              <div className="space-y-2">
                <Label>What does success look like in 6 months?</Label>
                <Textarea
                  placeholder="e.g. Has shipped 2+ major features independently, comfortable leading technical discussions…"
                  className="min-h-[80px]"
                  value={req.success_description}
                  onChange={(e) => updateReq('success_description', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Additional Description</Label>
                <Textarea
                  placeholder="Anything else about the role, team culture, company context…"
                  className="min-h-[80px]"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Step 3: Application Form */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Application Questions</Label>
                <p className="text-xs text-muted-foreground">
                  Add custom questions that candidates will answer when applying. These appear after name, email, and resume upload.
                </p>
                <QuestionBuilder
                  questions={req.application_questions || []}
                  onChange={(v) => updateReq('application_questions', v)}
                />
              </div>
            </>
          )}

          {/* Step 4: AI Guidance */}
          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Deal-breakers</Label>
                <p className="text-xs text-muted-foreground">Candidates with any of these should score much lower</p>
                <TagInput
                  tags={req.dealbreakers}
                  onChange={(v) => updateReq('dealbreakers', v)}
                  placeholder="e.g. No experience with React, Only junior roles…"
                />
              </div>
              <div className="space-y-2">
                <Label>Green Flags</Label>
                <p className="text-xs text-muted-foreground">Strong positive signals that should boost the score</p>
                <TagInput
                  tags={req.green_flags}
                  onChange={(v) => updateReq('green_flags', v)}
                  placeholder="e.g. Open source contributions, Startup experience, FAANG background…"
                />
              </div>
              <div className="space-y-2">
                <Label>Scoring Weights</Label>
                <p className="text-xs text-muted-foreground">How should AI prioritize when evaluating candidates?</p>
                <ScoringWeights
                  weights={req.scoring_weights}
                  onChange={(v) => updateReq('scoring_weights', v)}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => step === 0 ? handleClose() : setStep(step - 1)}
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft size={14} /> Back</>}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !title.trim()}
            >
              Next <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !title.trim()}
            >
              {saving ? (isEditMode ? 'Saving…' : 'Creating…') : (isEditMode ? 'Save Changes' : 'Create Job')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Job Created Success Dialog ───────────────────────────────────────────────

function JobCreatedDialog({
  open,
  onClose,
  job,
}: {
  open: boolean
  onClose: () => void
  job: Job | null
}) {
  const [copied, setCopied] = useState(false)

  if (!job) return null

  const applyUrl = `${window.location.origin}/apply/${job.id}`

  function handleCopy() {
    navigator.clipboard.writeText(applyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={20} />
            Job Created!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{job.title}</strong> has been created successfully. Share this link with candidates so they can apply:
          </p>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
            <Link size={16} className="text-muted-foreground shrink-0" />
            <code className="flex-1 text-sm break-all">{applyUrl}</code>
          </div>

          <Button onClick={handleCopy} className="w-full" variant={copied ? "outline" : "default"}>
            {copied ? (
              <>
                <Check size={16} className="text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [createdJob, setCreatedJob] = useState<Job | null>(null)
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null)

  function handleEdit(job: Job) {
    setEditingJob(job)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingJob(null)
  }

  function handleCopyLink(jobId: string) {
    const applyUrl = `${window.location.origin}/apply/${jobId}`
    navigator.clipboard.writeText(applyUrl)
    setCopiedJobId(jobId)
    setTimeout(() => setCopiedJobId(null), 2000)
  }

  useEffect(() => {
    api.jobs.list().then(setJobs).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this job and all its applications?')) return
    setDeleting(id)
    try {
      await api.jobs.delete(id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function seniorityLabel(s: string | undefined) {
    const map: Record<string, string> = { junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead', director: 'Director' }
    return s ? map[s] : null
  }

  function locationLabel(s: string | undefined) {
    const map: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }
    return s ? map[s] : null
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Briefcase size={18} className="text-muted-foreground" />
          <h1 className="font-semibold text-lg">Jobs</h1>
          {!loading && (
            <span className="text-sm text-muted-foreground">({jobs.length})</span>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} />
          New Job
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Briefcase size={40} className="opacity-30" />
            <p>No jobs yet</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={14} />
              Create First Job
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Skills</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const seniority = seniorityLabel(j.requirements?.seniority)
                  const location = locationLabel(j.requirements?.location_type)
                  const topSkills = j.requirements?.required_skills?.slice(0, 3) ?? []
                  const moreCount = (j.requirements?.required_skills?.length ?? 0) - topSkills.length

                  return (
                    <tr key={j.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => navigate(`/jobs/${j.id}/candidates`)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center shrink-0">
                            <Briefcase size={13} className="text-primary" />
                          </div>
                          <span className="font-medium hover:underline">{j.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {seniority && <Badge variant="outline" className="text-xs">{seniority}</Badge>}
                          {location && <Badge variant="outline" className="text-xs">{location}</Badge>}
                          {j.requirements?.min_years_experience != null && j.requirements.min_years_experience > 0 && (
                            <Badge variant="outline" className="text-xs">{j.requirements.min_years_experience}+ yrs</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {topSkills.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                          {moreCount > 0 && (
                            <Badge variant="secondary" className="text-xs">+{moreCount}</Badge>
                          )}
                          {topSkills.length === 0 && (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {j.created_at ? formatDate(j.created_at) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(j)}
                          >
                            <Pencil size={13} />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(j.id)}
                            className={copiedJobId === j.id ? 'text-green-500 border-green-500' : ''}
                          >
                            {copiedJobId === j.id ? <Check size={13} /> : <Copy size={13} />}
                            {copiedJobId === j.id ? 'Copied!' : 'Copy Link'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600 hover:border-red-300"
                            disabled={deleting === j.id}
                            onClick={() => handleDelete(j.id)}
                          >
                            <Trash2 size={13} />
                            {deleting === j.id ? 'Deleting…' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <JobFormDialog
        open={showForm}
        onClose={handleCloseForm}
        editJob={editingJob}
        onSaved={(job) => {
          if (editingJob) {
            // Update existing job in list
            setJobs((prev) => prev.map((j) => j.id === job.id ? job : j))
          } else {
            // Add new job to list
            setJobs((prev) => [job, ...prev])
            setCreatedJob(job)
          }
        }}
      />

      <JobCreatedDialog
        open={createdJob !== null}
        onClose={() => setCreatedJob(null)}
        job={createdJob}
      />
    </div>
  )
}
