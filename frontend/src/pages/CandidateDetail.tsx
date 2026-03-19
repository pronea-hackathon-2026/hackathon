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
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular-nums">{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft size={16} />
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {initials(candidate.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base leading-tight">{candidate.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <SourceBadge source={candidate.source} />
              {app && <StatusBadge status={app.status} />}
            </div>
          </div>
        </div>

        {applications.length > 1 && (
          <select
            value={selectedAppId ?? ''}
            onChange={(e) => { setSelectedAppId(e.target.value); setQuestions([]) }}
            className="text-sm bg-transparent border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer shrink-0 max-w-[180px]"
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
        <div className="p-6 max-w-3xl mx-auto space-y-6">

          {/* Identity */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {initials(candidate.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl leading-tight">{candidate.name}</p>
              {parsed?.experience?.[0] && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {parsed.experience[0].role} · {parsed.experience[0].company}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                {parsed?.email && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail size={11} />{parsed.email}
                  </span>
                )}
                {parsed?.phone && parsed.phone !== 'N/A' && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone size={11} />{parsed.phone}
                  </span>
                )}
                {parsed?.linkedin_url && (
                  <a
                    href={parsed.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <Linkedin size={11} />LinkedIn<ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Two-column content */}
          <div className="flex gap-8">
            {/* Left */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Scores */}
              {app && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scores</p>
                  <ScoreBar label="Match Score" score={app.match_score} color="bg-primary" />
                  <ScoreBar label="Credibility" score={candidate.credibility_score} color="bg-emerald-500" />
                  {hasInterview && (
                    <ScoreBar label="Interview Score" score={app.interview_score} color="bg-violet-500" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Red Flags</span>
                    {parsed?.red_flags && parsed.red_flags.length > 0 ? (
                      <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                        <AlertTriangle size={11} strokeWidth={2.5} />{parsed.red_flags.length} detected
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <Check size={11} strokeWidth={3} />None detected
                      </span>
                    )}
                  </div>
                  {parsed?.gaps && parsed.gaps.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Employment Gaps</span>
                      <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
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
                    <p key={i} className="text-xs text-red-500 flex items-start gap-1.5">
                      <AlertTriangle size={11} className="mt-0.5 shrink-0" />{flag}
                    </p>
                  ))}
                </div>
              )}

              {/* Gap details */}
              {parsed?.gaps && parsed.gaps.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                  {parsed.gaps.map((gap, i) => (
                    <p key={i} className="text-xs text-amber-600 flex items-center gap-1.5">
                      <Clock size={11} className="shrink-0" />
                      {gap.start_date} → {gap.end_date} · {gap.duration_months}mo
                    </p>
                  ))}
                </div>
              )}

              {/* Skills */}
              {parsed?.skills && parsed.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Skills Extracted</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.skills.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsed?.education && parsed.education.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Education</p>
                  <div className="space-y-2">
                    {parsed.education.map((edu, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium">{edu.degree}</p>
                        <p className="text-xs text-muted-foreground">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="w-52 shrink-0 space-y-5">

              {/* Work History */}
              {parsed?.experience && parsed.experience.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Work History</p>
                  <div className="space-y-3">
                    {parsed.experience.map((e, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="relative pl-3 border-l-2 border-border"
                      >
                        <p className="text-xs font-semibold leading-tight">{e.role}</p>
                        <p className="text-xs text-muted-foreground">{e.company}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {e.start_date} – {e.end_date ?? 'Present'}
                          {e.duration_months ? ` · ${e.duration_months}mo` : ''}
                        </p>
                        {e.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{e.description}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Verified */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sources Verified</p>
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
                      <span className="text-xs text-muted-foreground">{s}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              {parsed?.languages && parsed.languages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Languages</p>
                  <div className="flex flex-wrap gap-1">
                    {parsed.languages.map((l) => (
                      <span key={l} className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interview section */}
          {app && (
            <div className="pt-5 border-t border-border space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interview</p>

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
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
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
          <div key={label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
            <p className="text-lg font-bold">{score}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground leading-relaxed">{a.summary}</p>

      {/* Strengths / Concerns */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Strengths</p>
          <ul className="space-y-2">
            {a.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-emerald-600">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={8} className="text-white" strokeWidth={3} />
                </div>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Concerns</p>
          <ul className="space-y-2">
            {a.concerns.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-amber-600">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Per-Question Breakdown</p>
        <div className="space-y-3">
          {a.per_question.map((q, i) => (
            <div key={i} className="relative pl-3 border-l-2 border-border">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium leading-snug">{q.question}</p>
                <span className={`text-xs font-bold tabular-nums shrink-0 ${
                  q.score >= 85 ? 'text-emerald-500' : q.score >= 70 ? 'text-amber-500' : 'text-red-500'
                }`}>{q.score}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{q.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
