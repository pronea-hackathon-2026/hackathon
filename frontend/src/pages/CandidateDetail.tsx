import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, AlertTriangle, Clock, Sparkles,
  Check, ExternalLink, Video, Linkedin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import SourceBadge from '@/components/SourceBadge'
import StatusBadge from '@/components/StatusBadge'
import { api, type Candidate, type Application, type Job } from '@/lib/api'

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

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

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<string[]>([])
  const [genQuestions, setGenQuestions] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([api.candidates.get(id), api.jobs.list()]).then(([c, js]) => {
      setCandidate(c)
      setJobs(js)
      setSelectedAppId((c.applications?.[0] as Application)?.id ?? null)
      setLoading(false)
    }).catch(console.error)
  }, [id])

  const applications = (candidate?.applications ?? []) as Application[]
  const app = (selectedAppId ? applications.find((a) => a.id === selectedAppId) : null) ?? applications[0]
  const jobTitle = (appArg: Application) => jobs.find((j) => j.id === appArg.job_id)?.title ?? appArg.job_id

  const handleGenerateQuestions = async () => {
    if (!app) return
    setGenQuestions(true)
    try {
      const res = await api.interviews.generateQuestions(app.id)
      setQuestions(res.questions)
    } catch (e) {
      console.error(e)
    } finally {
      setGenQuestions(false)
    }
  }

  const handleShortlistAndInvite = async () => {
    if (!app) return
    setInviting(app.id)
    try {
      await api.applications.updateStatus(app.id, 'shortlisted')
      await api.interviews.invite(app.id)
      navigate(`/interview/${app.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setInviting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!candidate) return <div className="p-6 text-muted-foreground">Candidate not found.</div>

  const parsed = candidate.parsed
  const hasInterview = !!app?.analysis

  // Derive verified sources from available data
  const sources: string[] = ['CV Document']
  if (parsed?.linkedin_url || candidate.source === 'linkedin') sources.push('LinkedIn')
  if (candidate.source === 'referral') sources.push('Referral')
  if ((parsed?.skills ?? []).length > 6) sources.push('Skills Verified')

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-6 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft size={16} />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Candidate profile</p>
        </div>

        {applications.length > 1 && (
          <select
            value={selectedAppId ?? ''}
            onChange={(e) => { setSelectedAppId(e.target.value); setQuestions([]) }}
            className="max-w-[220px] shrink-0 cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
          >
            {applications.map((a) => (
              <option key={a.id} value={a.id}>{jobTitle(a)}</option>
            ))}
          </select>
        )}

        <div className="flex gap-2 shrink-0">
          {app && (app.status === 'inbox' || app.status === 'shortlisted') && (
            <Button size="sm" onClick={handleShortlistAndInvite} disabled={!!inviting}>
              <Video size={14} />
              {inviting ? 'Creating…' : 'Schedule Interview'}
            </Button>
          )}
          {app?.status === 'interview_scheduled' && (
            <Button size="sm" onClick={() => navigate(`/interview/${app.id}`)}>
              <Video size={14} />
              Join Interview
            </Button>
          )}
          {app && (app.status === 'interview_done' || app.status === 'final_round') && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/review/${app.id}`)}>
              <Video size={14} />
              Review Interview
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-5xl space-y-5 p-6">

          {/* Identity */}
          <div className="flex items-start gap-4 rounded-xl border border-border bg-background p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
              {initials(candidate.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-3xl font-semibold tracking-[-0.03em] text-foreground">{candidate.name}</p>
                <SourceBadge source={candidate.source} />
                {app && <StatusBadge status={app.status} />}
              </div>
              {parsed?.experience?.[0] && (
                <p className="mt-1 text-lg text-muted-foreground">
                  {parsed.experience[0].role} · {parsed.experience[0].company}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                {parsed?.email && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail size={11} />{parsed.email}
                  </span>
                )}
                {parsed?.phone && parsed.phone !== 'N/A' && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone size={11} />{parsed.phone}
                  </span>
                )}
                {parsed?.linkedin_url && (
                  <a
                    href={parsed.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Linkedin size={11} />LinkedIn<ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Two-column content */}
          <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-5">
            {/* Left */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Scores */}
              {app && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Scores</p>
                  <ScoreBar label="Match Score" score={app.match_score} color="bg-primary" />
                  <ScoreBar label="Credibility" score={candidate.credibility_score} color="bg-emerald-500" />
                  {hasInterview && (
                    <ScoreBar label="Interview Score" score={app.interview_score} color="bg-violet-500" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Red Flags</span>
                    {parsed?.red_flags && parsed.red_flags.length > 0 ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                        <AlertTriangle size={11} strokeWidth={2.5} />{parsed.red_flags.length} detected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                        <Check size={11} strokeWidth={3} />None detected
                      </span>
                    )}
                  </div>
                  {parsed?.gaps && parsed.gaps.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Employment Gaps</span>
                      <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                        <Clock size={11} />{parsed.gaps.length} gap{parsed.gaps.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Red flag details */}
              {parsed?.red_flags && parsed.red_flags.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                  {parsed.red_flags.map((flag, i) => (
                    <p key={i} className="flex items-start gap-1.5 text-sm text-red-500">
                      <AlertTriangle size={11} className="mt-0.5 shrink-0" />{flag}
                    </p>
                  ))}
                </div>
              )}

              {/* Gap details */}
              {parsed?.gaps && parsed.gaps.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                  {parsed.gaps.map((gap, i) => (
                    <p key={i} className="flex items-center gap-1.5 text-sm text-amber-600">
                      <Clock size={11} className="shrink-0" />
                      {gap.start_date} → {gap.end_date} · {gap.duration_months}mo
                    </p>
                  ))}
                </div>
              )}

              {/* Skills */}
              {parsed?.skills && parsed.skills.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {parsed.skills.map((s) => (
                      <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsed?.education && parsed.education.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Education</p>
                  <div className="space-y-2">
                    {parsed.education.map((edu, i) => (
                      <div key={i}>
                        <p className="text-base font-medium">{edu.degree}</p>
                        <p className="text-sm text-muted-foreground">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="w-60 shrink-0 space-y-5">

              {/* Work History */}
              {parsed?.experience && parsed.experience.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Work History</p>
                  <div className="space-y-3">
                    {parsed.experience.map((e, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="relative border-l border-border pl-3"
                      >
                        <p className="text-sm font-medium leading-tight">{e.role}</p>
                        <p className="text-sm text-muted-foreground">{e.company}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.start_date} – {e.end_date ?? 'Present'}
                          {e.duration_months ? ` · ${e.duration_months}mo` : ''}
                        </p>
                        {e.description && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{e.description}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Verified */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Sources</p>
                <div className="space-y-1.5">
                  {sources.map((s, i) => (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-1.5"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <Check size={8} className="text-white" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-muted-foreground">{s}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              {parsed?.languages && parsed.languages.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Languages</p>
                  <div className="flex flex-wrap gap-1">
                    {parsed.languages.map((l) => (
                      <span key={l} className="rounded-md border border-border px-2.5 py-1 text-sm text-muted-foreground">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interview section */}
          {app && (
            <div className="space-y-4 border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Interview</p>

              {/* Generate questions */}
              {(app.status === 'inbox' || app.status === 'shortlisted') && (
                questions.length === 0 ? (
                  <Button variant="outline" size="sm" onClick={handleGenerateQuestions} disabled={genQuestions}>
                    <Sparkles size={13} />
                    {genQuestions ? 'Generating…' : 'Generate Questions'}
                  </Button>
                ) : (
                  <ol className="space-y-2">
                    {questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ol>
                )
              )}

              {/* Room link */}
              {app.interview_room_url && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video size={13} className="text-primary shrink-0" />
                    <span className="text-xs font-mono text-muted-foreground truncate">{app.interview_room_url}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 px-2" onClick={() => window.open(app.interview_room_url!, '_blank')}>
                    <ExternalLink size={13} />
                  </Button>
                </div>
              )}

              {/* Analysis */}
              {app.analysis && <InterviewAnalysisPanel app={app} />}

              {!app.analysis && app.status === 'interview_scheduled' && (
                <p className="text-sm text-muted-foreground italic">Waiting for candidate to complete the interview…</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function InterviewAnalysisPanel({ app }: { app: Application }) {
  const a = app.analysis!
  return (
    <div className="space-y-5">
      {/* Score tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Answer Quality', score: a.answer_quality_score },
          { label: 'Communication',  score: a.communication_score },
          { label: 'Attention',       score: a.attention_score },
        ].map(({ label, score }) => (
          <div key={label} className="rounded-lg border border-border bg-slate-50 p-3 text-center">
            <p className="text-3xl font-semibold tracking-[-0.03em] text-foreground">{score}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="text-[15px] leading-7 text-muted-foreground">{a.summary}</p>

      {/* Strengths / Concerns */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Strengths</p>
          <ul className="space-y-2">
            {a.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-emerald-600">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={8} className="text-white" strokeWidth={3} />
                </div>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Concerns</p>
          <ul className="space-y-2">
            {a.concerns.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-amber-600">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Per-question Breakdown</p>
        <div className="space-y-3">
          {a.per_question.map((q, i) => (
            <div key={i} className="relative border-l border-border pl-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-6">{q.question}</p>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${
                  q.score >= 85 ? 'text-emerald-500' : q.score >= 70 ? 'text-amber-500' : 'text-red-500'
                }`}>{q.score}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{q.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
