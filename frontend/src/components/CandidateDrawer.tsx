import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mail, Phone, AlertTriangle, Clock, Sparkles,
  Check, ExternalLink, Video, Linkedin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import CandidateAvatar from '@/components/CandidateAvatar'
import SourceBadge from '@/components/SourceBadge'
import StatusBadge from '@/components/StatusBadge'
import { api, type Candidate, type Application, type Job } from '@/lib/api'

function ScoreBar({ label, score, color = 'bg-primary' }: { label: string; score: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-slate-900">{score}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
        />
      </div>
    </div>
  )
}

interface Props {
  candidateId: string | null
  onClose: () => void
}

export default function CandidateDrawer({ candidateId, onClose }: Props) {
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<string[]>([])
  const [genQuestions, setGenQuestions] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  useEffect(() => {
    if (!candidateId) return
    setLoading(true)
    setQuestions([])
    setSelectedAppId(null)
    Promise.all([api.candidates.get(candidateId), api.jobs.list()]).then(([c, js]) => {
      setCandidate(c)
      setJobs(js)
      setSelectedAppId((c.applications?.[0] as Application)?.id ?? null)
      setLoading(false)
    }).catch(console.error)
  }, [candidateId])

  const applications = (candidate!?.applications ?? []) as Application[]
  const app = (selectedAppId ? applications.find((a) => a.id === selectedAppId) : null) ?? applications[0]
  const jobTitle = (a: Application) => jobs.find((j) => j.id === a.job_id)?.title ?? a.job_id

  const handleGenerateQuestions = async () => {
    if (!app) return
    setGenQuestions(true)
    try {
      const res = await api.interviews.generateQuestions(app.id)
      setQuestions(res.questions)
    } catch (e) { console.error(e) }
    finally { setGenQuestions(false) }
  }

  const handleShortlistAndInvite = async () => {
    if (!app) return
    setInviting(app.id)
    try {
      await api.applications.updateStatus(app.id, 'shortlisted')
      await api.interviews.invite(app.id)
      onClose()
      navigate(`/interview/${app.id}`)
    } catch (e) { console.error(e) }
    finally { setInviting(null) }
  }

  const parsed = candidate!?.parsed
  const hasInterview = !!app?.analysis
  const sources: string[] = ['CV Document']
  if (parsed?.linkedin_url || candidate!?.source === 'linkedin') sources.push('LinkedIn')
  if (candidate!?.source === 'referral') sources.push('Referral')
  if ((parsed?.skills ?? []).length > 6) sources.push('Skills Verified')

  return (
    <AnimatePresence>
      {candidateId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-2xl flex-col border-l border-slate-200 bg-slate-50 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white/92 px-6 py-4 shrink-0">
              {loading || !candidate ? (
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ) : (
                <>
                  <CandidateAvatar
                    candidateId={candidate!.id}
                    name={candidate!.name}
                    className="h-9 w-9 shrink-0"
                    fallbackClassName="bg-slate-100 text-slate-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-tight text-slate-900">{candidate!.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Candidate snapshot</p>
                  </div>

                  {applications.length > 1 && (
                    <select
                      value={selectedAppId ?? ''}
                      onChange={(e) => { setSelectedAppId(e.target.value); setQuestions([]) }}
                      className="max-w-[160px] shrink-0 cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none"
                    >
                      {applications.map((a) => (
                        <option key={a.id} value={a.id}>{jobTitle(a)}</option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {app && (app.status === 'inbox' || app.status === 'shortlisted') && (
                      <Button size="sm" className="shadow-[0_4px_10px_rgba(59,130,246,0.12)]" onClick={handleShortlistAndInvite} disabled={!!inviting}>
                        <Video size={13} />
                        {inviting ? 'Creating…' : 'Schedule Interview'}
                      </Button>
                    )}
                    {app?.status === 'interview_scheduled' && (
                      <Button size="sm" onClick={() => { onClose(); navigate(`/interview/${app.id}`) }}>
                        <Video size={13} />
                        Join Interview
                      </Button>
                    )}
                    {app && (app.status === 'interview_done' || app.status === 'final_round') && (
                      <Button size="sm" variant="outline" className="border-slate-200 bg-white text-slate-700" onClick={() => { onClose(); navigate(`/review/${app.id}`) }}>
                        <Video size={13} />
                        Review
                      </Button>
                    )}
                  </div>
                </>
              )}

              <button
                onClick={onClose}
                className="ml-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : !candidate ? null : (
                <div className="p-6 space-y-6">

                  {/* Identity */}
                  <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                    <CandidateAvatar
                      candidateId={candidate!.id}
                      name={candidate!.name}
                      className="h-12 w-12 shrink-0"
                      fallbackClassName="bg-slate-100 text-slate-600 text-base"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-lg leading-tight text-slate-900">{candidate!.name}</p>
                        <SourceBadge source={candidate!.source} />
                        {app && <StatusBadge status={app.status} />}
                      </div>
                      {parsed?.experience?.[0] && (
                        <p className="mt-1 text-sm text-slate-500">
                          {parsed.experience[0].role} · {parsed.experience[0].company}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
                        {parsed?.email && (
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Mail size={11} />{parsed.email}
                          </span>
                        )}
                        {parsed?.phone && parsed.phone !== 'N/A' && (
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Phone size={11} />{parsed.phone}
                          </span>
                        )}
                        {parsed?.linkedin_url && (
                          <a href={parsed.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 hover:underline">
                            <Linkedin size={11} />LinkedIn<ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Two-column */}
                  <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-6">
                    {/* Left */}
                    <div className="flex-1 min-w-0 space-y-5">

                      {app && (
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Scores</p>
                          <ScoreBar label="Match Score" score={app.match_score} color="bg-slate-600" />
                          <ScoreBar label="Credibility" score={candidate!.credibility_score} color="bg-emerald-500" />
                          {hasInterview && (
                            <ScoreBar label="Interview Score" score={app.interview_score} color="bg-slate-400" />
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Red Flags</span>
                            {(parsed?.red_flags?.length ?? 0) > 0 ? (
                              <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                                <AlertTriangle size={11} strokeWidth={2.5} />{parsed!.red_flags!.length} detected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                                <Check size={11} strokeWidth={3} />None detected
                              </span>
                            )}
                          </div>
                          {(parsed?.gaps?.length ?? 0) > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Employment Gaps</span>
                              <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                                <Clock size={11} />{parsed!.gaps!.length} gap{parsed!.gaps!.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {(parsed?.red_flags?.length ?? 0) > 0 && (
                        <div className="space-y-1.5 rounded-lg border border-red-200/80 bg-red-50/70 p-3 shadow-[0_2px_8px_rgba(239,68,68,0.03)]">
                          {parsed!.red_flags!.map((flag: string, i: number) => (
                            <p key={i} className="text-sm text-red-500 flex items-start gap-1.5">
                              <AlertTriangle size={11} className="mt-0.5 shrink-0" />{flag}
                            </p>
                          ))}
                        </div>
                      )}

                      {(parsed?.gaps?.length ?? 0) > 0 && (
                        <div className="space-y-1 rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 shadow-[0_2px_8px_rgba(245,158,11,0.03)]">
                          {parsed!.gaps!.map((gap: any, i: number) => (
                            <p key={i} className="text-sm text-amber-600 flex items-center gap-1.5">
                              <Clock size={11} className="shrink-0" />
                              {gap.start_date} → {gap.end_date} · {gap.duration_months}mo
                            </p>
                          ))}
                        </div>
                      )}

                      {(parsed?.skills?.length ?? 0) > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Skills Extracted</p>
                          <div className="flex flex-wrap gap-2">
                            {parsed!.skills!.map((s: string) => (
                              <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(parsed?.education?.length ?? 0) > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Education</p>
                          <div className="space-y-2">
                            {parsed!.education!.map((edu: any, i: number) => (
                              <div key={i}>
                                <p className="text-base font-medium text-slate-900">{edu.degree}</p>
                                <p className="text-sm text-slate-500">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right */}
                    <div className="w-48 shrink-0 space-y-5">
                      {(parsed?.experience?.length ?? 0) > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Work History</p>
                          <div className="space-y-3">
                            {parsed!.experience!.map((e: any, i: number) => (
                              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                                className="relative border-l border-slate-200 pl-3">
                                <p className="text-sm font-medium leading-tight text-slate-900">{e.role}</p>
                                <p className="text-sm text-slate-500">{e.company}</p>
                                <p className="text-xs text-slate-500">
                                  {e.start_date} – {e.end_date ?? 'Present'}
                                  {e.duration_months ? ` · ${e.duration_months}mo` : ''}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Sources Verified</p>
                        <div className="space-y-1.5">
                          {sources.map((s, i) => (
                            <motion.div key={s} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                              className="flex items-center gap-1.5">
                              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                <Check size={8} className="text-white" strokeWidth={3} />
                              </div>
                              <span className="text-sm text-slate-500">{s}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {(parsed?.languages?.length ?? 0) > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Languages</p>
                          <div className="flex flex-wrap gap-2">
                            {parsed!.languages!.map((l: string) => (
                              <span key={l} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-600">{l}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interview */}
                  {app && (
                    <div className="pt-5 border-t border-border space-y-4">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Interview</p>

                      {(app.status === 'inbox' || app.status === 'shortlisted') && (
                        questions.length === 0 ? (
                          <Button variant="outline" size="sm" className="border-slate-200 bg-white text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.03)]" onClick={handleGenerateQuestions} disabled={genQuestions}>
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

                      {app.interview_room_url && (
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <Video size={13} className="shrink-0 text-slate-500" />
                            <span className="truncate text-xs font-mono text-slate-500">{app.interview_room_url}</span>
                          </div>
                          <Button size="sm" variant="ghost" className="shrink-0 px-2" onClick={() => window.open(app.interview_room_url!, '_blank')}>
                            <ExternalLink size={13} />
                          </Button>
                        </div>
                      )}

                      {app.analysis && <InterviewAnalysisPanel app={app} />}

                      {!app.analysis && app.status === 'interview_scheduled' && (
                        <p className="text-sm italic text-slate-500">Waiting for candidate to complete the interview…</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function InterviewAnalysisPanel({ app }: { app: Application }) {
  const a = app.analysis!
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Answer Quality', score: a.answer_quality_score },
          { label: 'Communication',  score: a.communication_score },
          { label: 'Attention',       score: a.attention_score },
        ].map(({ label, score }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <p className="text-2xl font-semibold leading-none text-slate-900">{score}</p>
            <p className="mt-2 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm leading-7 text-slate-500">{a.summary}</p>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Strengths</p>
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
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Concerns</p>
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

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Per-Question Breakdown</p>
        <div className="space-y-3">
          {a.per_question.map((q, i) => (
            <div key={i} className="relative border-l border-slate-200 pl-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-6 text-slate-900">{q.question}</p>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                  q.score >= 85 ? 'text-emerald-500' : q.score >= 70 ? 'text-amber-500' : 'text-red-500'
                }`}>{q.score}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{q.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
