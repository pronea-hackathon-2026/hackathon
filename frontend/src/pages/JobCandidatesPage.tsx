import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, List, LayoutGrid, Search, Upload, X, Link, Check, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import KanbanBoard from '@/components/KanbanBoard'
import ScoringProgress from '@/components/ScoringProgress'
import SourceBadge from '@/components/SourceBadge'
import { ScoreGauge } from '@/components/ScoreGauge'
import { api, type Application, type Job, type Candidate } from '@/lib/api'

interface ScoringState {
  jobId: string
  jobTitle: string
  total: number
  scored: number
  applications: Application[]
  completed: boolean
}

type ViewMode = 'list' | 'kanban'

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function JobCandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('boardView') as ViewMode) ?? 'list')

  const switchView = (v: ViewMode) => { setView(v); localStorage.setItem('boardView', v) }
  const [scoringState, setScoringState] = useState<ScoringState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Candidate[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)

  const isScoringRef = useRef(false)

  const loadApplications = useCallback(async (jId: string) => {
    if (!jId || isScoringRef.current) return
    setLoading(true)
    try {
      const progress = await api.jobs.progress(jId)
      setApplications(progress.applications)
      if (progress.total > 0 && progress.scored < progress.total) {
        isScoringRef.current = true
        setScoringState({
          jobId: jId,
          jobTitle: job?.title ?? '',
          total: progress.total,
          scored: progress.scored,
          applications: progress.applications,
          completed: false,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [job?.title])

  useEffect(() => {
    if (!jobId) return
    // Reset scoring state from any previous job before loading the new one
    isScoringRef.current = false
    setScoringState(null)
    setApplications([])
    api.jobs.list().then((jobs) => {
      setAllJobs(jobs)
      setJob(jobs.find((j) => j.id === jobId) ?? null)
    }).catch(console.error)
    loadApplications(jobId)
  }, [jobId])

  // Polling while scoring
  useEffect(() => {
    if (!scoringState) return
    const { jobId: jId } = scoringState
    let stopped = false

    const poll = async () => {
      if (stopped) return
      try {
        const progress = await api.jobs.progress(jId)
        setScoringState((prev) =>
          prev ? { ...prev, total: progress.total, scored: progress.scored, applications: progress.applications } : null,
        )
        setApplications(progress.applications)
        if (progress.total > 0 && progress.scored >= progress.total) {
          stopped = true
          isScoringRef.current = false
          setScoringState((prev) => (prev ? { ...prev, completed: true } : null))
          setTimeout(() => setScoringState(null), 2500)
        }
      } catch { /* silent */ }
    }

    poll()
    const interval = setInterval(poll, 1200)
    return () => { stopped = true; clearInterval(interval) }
  }, [scoringState?.jobId])

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)))
    try {
      await api.applications.updateStatus(appId, newStatus)
    } catch (e) {
      console.error(e)
      if (jobId) loadApplications(jobId)
    }
  }

  const handleSearch = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await api.candidates.search(searchQuery)
      setSearchResults(results)
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  const handleCopyLink = () => {
    if (!jobId) return
    navigator.clipboard.writeText(`${window.location.origin}/apply/${jobId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await api.candidates.upload(file)
      setShowUpload(false)
      if (jobId) loadApplications(jobId)
    } catch (err) {
      alert(`Upload failed: ${err}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')} className="shrink-0">
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1 min-w-0">
          {allJobs.length > 1 ? (
            <select
              value={jobId}
              onChange={(e) => navigate(`/jobs/${e.target.value}/candidates`, { replace: true })}
              className="font-semibold text-lg bg-transparent border-0 outline-none cursor-pointer hover:text-primary transition-colors truncate max-w-full pr-2"
            >
              {allJobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          ) : (
            <h1 className="font-semibold text-lg truncate">{job?.title ?? 'Candidates'}</h1>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-md border border-border overflow-hidden shrink-0">
          <button
            onClick={() => switchView('list')}
            title="List view"
            className={`px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors ${
              view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
            }`}
          >
            <List size={14} />
            List
          </button>
          <button
            onClick={() => switchView('kanban')}
            title="Kanban view"
            className={`px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors border-l border-border ${
              view === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'
            }`}
          >
            <LayoutGrid size={14} />
            Board
          </button>
        </div>

        {/* Actions */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopyLink}
          title="Copy application link"
          className={linkCopied ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'}
        >
          {linkCopied ? <Check size={16} /> : <Link size={16} />}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
          <Upload size={14} />
          Upload CV
        </Button>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-border relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            placeholder="Semantic search candidates… (press Enter)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!e.target.value) setSearchResults(null)
            }}
            onKeyDown={handleSearch}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearchQuery(''); setSearchResults(null) }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Search results overlay */}
      {searchResults !== null && (
        <div className="absolute left-16 right-0 top-[120px] z-20 bg-background border-b border-border shadow-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                {searching ? 'Searching…' : `${searchResults.length} results for "${searchQuery}"`}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => { setSearchResults(null); setSearchQuery('') }}>
                <X size={14} />
              </Button>
            </div>
            {searching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
                    onClick={() => navigate(`/candidate/${c.id}`)}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    {typeof (c as any).search_score === 'number' && (
                      <span className="text-xs text-emerald-400 font-semibold">{(c as any).search_score}%</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scoring progress banner */}
      {scoringState && (
        <div className="pt-4 animate-in fade-in-0 slide-in-from-top-2 duration-400">
          <ScoringProgress
            jobTitle={scoringState.jobTitle}
            total={scoringState.total}
            scored={scoringState.scored}
            applications={scoringState.applications}
          />
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-x-auto p-6 pt-4">
        {view === 'kanban' ? (
          <KanbanBoard
            applications={applications}
            onStatusChange={handleStatusChange}
            loading={loading && !scoringState}
          />
        ) : (
          /* List view */
          loading && !scoringState ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <Copy size={40} className="opacity-30" />
              <p>No candidates yet</p>
              <p className="text-sm">Share the application link to start receiving candidates</p>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {linkCopied ? <Check size={14} /> : <Link size={14} />}
                {linkCopied ? 'Copied!' : 'Copy Application Link'}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-card/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Credibility</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const candidate = app.candidates
                    if (!candidate) return null
                    return (
                      <tr
                        key={app.id}
                        onClick={() => navigate(`/candidate/${candidate.id}`)}
                        className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {initials(candidate.name)}
                            </div>
                            <span className="font-medium truncate">{candidate.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground truncate">{candidate.email ?? '—'}</td>
                        <td className="px-4 py-2">
                          <SourceBadge source={candidate.source} />
                        </td>
                        <td className="px-4 py-2 text-muted-foreground capitalize text-xs">
                          {app.status?.replace(/_/g, ' ') ?? '—'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-center">
                            <ScoreGauge score={candidate.credibility_score ?? 0} label="Credibility" size={64} />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-center">
                            <ScoreGauge score={app.match_score ?? 0} label="Match" size={64} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Upload CV Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload CV</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload size={24} className="text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {uploading ? 'Uploading & parsing…' : 'Click to upload PDF or DOCX'}
              </span>
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
