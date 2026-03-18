import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Upload, X, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import KanbanBoard from '@/components/KanbanBoard'
import { api, type Application, type Job, type Candidate } from '@/lib/api'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [activeJobId, setActiveJobId] = useState<string>('')
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Candidate[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [showNewJob, setShowNewJob] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobDesc, setNewJobDesc] = useState('')
  const [creatingJob, setCreatingJob] = useState(false)
  const [uploading, setUploading] = useState(false)

  const loadJobs = useCallback(async () => {
    try {
      const j = await api.jobs.list()
      setJobs(j)
      if (j.length > 0 && !activeJobId) {
        setActiveJobId(j[0].id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setJobsLoading(false)
    }
  }, [activeJobId])

  const loadApplications = useCallback(async (jobId: string) => {
    if (!jobId) return
    setLoading(true)
    try {
      const candidates = await api.candidates.list()
      // Filter applications for this job
      const apps: Application[] = []
      for (const c of candidates) {
        if (c.applications) {
          for (const app of c.applications) {
            if (app.job_id === jobId) {
              apps.push({ ...app, candidates: c })
            }
          }
        }
      }
      setApplications(apps)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [])

  useEffect(() => {
    if (activeJobId) loadApplications(activeJobId)
  }, [activeJobId])

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a))
    try {
      await api.applications.updateStatus(appId, newStatus)
    } catch (e) {
      console.error(e)
      loadApplications(activeJobId)
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

  const handleCreateJob = async () => {
    if (!newJobTitle.trim()) return
    setCreatingJob(true)
    try {
      const job = await api.jobs.create(newJobTitle, newJobDesc)
      setJobs((prev) => [job, ...prev])
      setActiveJobId(job.id)
      setShowNewJob(false)
      setNewJobTitle('')
      setNewJobDesc('')
    } catch (e) {
      console.error(e)
    } finally {
      setCreatingJob(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await api.candidates.upload(file)
      setShowUpload(false)
      if (activeJobId) loadApplications(activeJobId)
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
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2 flex-1">
          <Briefcase size={16} className="text-muted-foreground" />
          {jobs.length > 0 ? (
            <Select value={activeJobId} onValueChange={setActiveJobId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">No jobs yet</span>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowNewJob(true)}>
            <Plus size={14} />
            New Job
          </Button>
        </div>

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
                      {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
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

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        {jobsLoading ? (
          <KanbanBoard applications={[]} onStatusChange={handleStatusChange} loading={true} />
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Briefcase size={48} className="opacity-30" />
            <p className="text-lg">No jobs yet</p>
            <p className="text-sm">Create a job to start tracking candidates</p>
            <Button onClick={() => setShowNewJob(true)}>
              <Plus size={16} />
              Create First Job
            </Button>
          </div>
        ) : (
          <KanbanBoard
            applications={applications}
            onStatusChange={handleStatusChange}
            loading={loading}
          />
        )}
      </div>

      {/* New Job Dialog */}
      <Dialog open={showNewJob} onOpenChange={setShowNewJob}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g. Senior Full-Stack Engineer"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Job Description</Label>
              <Textarea
                placeholder="Describe the role, requirements, and responsibilities…"
                className="min-h-[120px]"
                value={newJobDesc}
                onChange={(e) => setNewJobDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewJob(false)}>Cancel</Button>
            <Button onClick={handleCreateJob} disabled={creatingJob || !newJobTitle.trim()}>
              {creatingJob ? 'Creating…' : 'Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
