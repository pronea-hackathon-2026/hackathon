import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, AlertTriangle, Clock, Sparkles,
  CheckCircle, ExternalLink, Video, Linkedin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import ScoreBadge from '@/components/ScoreBadge'
import SourceBadge from '@/components/SourceBadge'
import StatusBadge from '@/components/StatusBadge'
import { api, type Candidate, type Application } from '@/lib/api'
import { cn, scoreColor } from '@/lib/utils'

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<string[]>([])
  const [genQuestions, setGenQuestions] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.candidates.get(id).then((c) => {
      setCandidate(c)
      setLoading(false)
    }).catch(console.error)
  }, [id])

  const applications: Application[] = (candidate?.applications || []) as Application[]
  const latestApp = applications[0]

  const handleGenerateQuestions = async () => {
    if (!latestApp) return
    setGenQuestions(true)
    try {
      const res = await api.interviews.generateQuestions(latestApp.id)
      setQuestions(res.questions)
    } catch (e) {
      console.error(e)
    } finally {
      setGenQuestions(false)
    }
  }

  const handleShortlistAndInvite = async () => {
    if (!latestApp) return
    setInviting(latestApp.id)
    try {
      await api.applications.updateStatus(latestApp.id, 'shortlisted')
      const res = await api.interviews.invite(latestApp.id)
      alert(`Interview room created:\n${res.room_url}`)
      navigate(`/interview/${latestApp.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setInviting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!candidate) {
    return <div className="p-6 text-muted-foreground">Candidate not found.</div>
  }

  const parsed = candidate.parsed

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">{candidate.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <SourceBadge source={candidate.source} />
            {latestApp && <StatusBadge status={latestApp.status} />}
          </div>
        </div>
        <div className="flex gap-2">
          {latestApp && (latestApp.status === 'inbox' || latestApp.status === 'shortlisted') && (
            <Button onClick={handleShortlistAndInvite} disabled={!!inviting}>
              <Video size={14} />
              {inviting ? 'Creating room…' : 'Schedule Interview'}
            </Button>
          )}
          {latestApp?.status === 'interview_scheduled' && (
            <Button onClick={() => navigate(`/interview/${latestApp.id}`)}>
              <Video size={14} />
              Join Interview
            </Button>
          )}
          {latestApp && (latestApp.status === 'interview_done' || latestApp.status === 'final_round') && (
            <Button variant="outline" onClick={() => navigate(`/review/${latestApp.id}`)}>
              <Video size={14} />
              Review Interview
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          {/* Scores */}
          {latestApp && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <ScoreBar label="Match Score" score={latestApp.match_score} />
                  <ScoreBar label="Credibility" score={candidate.credibility_score} />
                  {latestApp.status === 'interview_done' || latestApp.status === 'final_round' ? (
                    <ScoreBar label="Overall Score" score={latestApp.overall_score} />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm text-muted-foreground">Overall Score</span>
                      <span className="text-sm text-muted-foreground italic">After interview</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Red flags */}
          {parsed?.red_flags && parsed.red_flags.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <AlertTriangle size={16} />
                  <span className="font-semibold text-sm">Red Flags</span>
                </div>
                <ul className="space-y-1">
                  {parsed.red_flags.map((flag, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Employment gaps */}
          {parsed?.gaps && parsed.gaps.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Clock size={16} />
                  <span className="font-semibold text-sm">Employment Gaps</span>
                </div>
                <ul className="space-y-1">
                  {parsed.gaps.map((gap, i) => (
                    <li key={i} className="text-sm text-amber-700">
                      {gap.start_date} → {gap.end_date} ({gap.duration_months} months)
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="interview">Interview</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Contact */}
              <Card>
                <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {parsed?.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-muted-foreground" />
                      <span>{parsed.email}</span>
                    </div>
                  )}
                  {parsed?.phone && parsed.phone !== 'N/A' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-muted-foreground" />
                      <span>{parsed.phone}</span>
                    </div>
                  )}
                  {parsed?.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin size={14} className="text-muted-foreground" />
                      <a
                        href={parsed.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        LinkedIn Profile
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Skills */}
              {parsed?.skills && parsed.skills.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Skills</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {parsed.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {parsed?.languages && parsed.languages.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Languages</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {parsed.languages.map((lang) => (
                        <Badge key={lang} variant="outline">{lang}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {parsed?.education && parsed.education.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Education</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {parsed.education.map((edu, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{edu.degree}</span>
                        <span className="text-muted-foreground text-sm">{edu.institution} {edu.year && `· ${edu.year}`}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="experience" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Work History</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(parsed?.experience || []).map((exp, i) => (
                      <div key={i} className="relative pl-4 border-l-2 border-border pb-4">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary" />
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">{exp.role}</p>
                            <p className="text-muted-foreground text-sm">{exp.company}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {exp.start_date} → {exp.end_date || 'Present'}
                            </p>
                            {exp.duration_months && (
                              <p className="text-xs text-muted-foreground">{exp.duration_months}mo</p>
                            )}
                          </div>
                        </div>
                        {exp.description && (
                          <p className="text-sm text-muted-foreground mt-1">{exp.description}</p>
                        )}
                      </div>
                    ))}
                    {!parsed?.experience?.length && (
                      <p className="text-muted-foreground text-sm">No experience data.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interview" className="mt-4 space-y-4">
              {/* Interview room link */}
              {latestApp?.interview_room_url && (
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Video size={14} className="text-primary" />
                      <span className="text-muted-foreground">Interview room:</span>
                      <span className="font-mono text-xs truncate max-w-xs">{latestApp.interview_room_url}</span>
                    </div>
                    <Button size="sm" onClick={() => window.open(latestApp.interview_room_url!, '_blank')}>
                      <ExternalLink size={13} />
                      Open
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Generate questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Interview Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {questions.length === 0 ? (
                    <Button onClick={handleGenerateQuestions} disabled={genQuestions || !latestApp} variant="outline">
                      <Sparkles size={14} />
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
                  )}
                </CardContent>
              </Card>

              {/* Interview analysis if done */}
              {latestApp?.analysis && (
                <InterviewAnalysisPanel app={latestApp} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <ScoreBadge score={score} />
      </div>
      <Progress value={score} className="h-2" />
    </div>
  )
}

function InterviewAnalysisPanel({ app }: { app: Application }) {
  const a = app.analysis!
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Interview Analysis</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{a.summary}</p>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Strengths</p>
            <ul className="space-y-1">
              {a.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-600">
                  <CheckCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Concerns</p>
            <ul className="space-y-1">
              {a.concerns.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-600">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Separator />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead className="w-20">Score</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {a.per_question.map((q, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{q.question}</TableCell>
                <TableCell><ScoreBadge score={q.score} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{q.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
