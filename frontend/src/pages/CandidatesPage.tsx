import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Briefcase } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CandidateAvatar from '@/components/CandidateAvatar'
import SourceBadge from '@/components/SourceBadge'
import { ScoreGauge } from '@/components/ScoreGauge'
import { api, type Candidate, type Job } from '@/lib/api'

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [activeJobId, setActiveJobId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.candidates.list(),
      api.jobs.list(),
    ]).then(([cands, jobList]) => {
      setCandidates(cands)
      setJobs(jobList)
      if (jobList.length > 0) setActiveJobId(jobList[0].id)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  function scoreForJob(c: Candidate, jobId: string): number {
    if (!c.applications || c.applications.length === 0) return 0
    if (!jobId) return Math.max(...c.applications.map((a) => a.match_score ?? 0))
    const app = c.applications.find((a) => a.job_id === jobId)
    return app?.match_score ?? 0
  }

  const activeJob = jobs.find((j) => j.id === activeJobId)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <Users size={18} className="text-muted-foreground" />
        <h1 className="font-semibold text-lg">Candidates</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground">({candidates.length})</span>
        )}

        {jobs.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Briefcase size={15} className="text-muted-foreground shrink-0" />
            <Select value={activeJobId} onValueChange={setActiveJobId}>
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Users size={40} className="opacity-30" />
            <p>No candidates yet</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[24%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground overflow-hidden">
                    <span className="block truncate" title={activeJob?.title}>
                      {activeJob ? `Score · ${activeJob.title}` : 'Score'}
                    </span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Applications</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/candidate/${c.id}`)}
                    className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <CandidateAvatar candidateId={c.id} name={c.name} className="h-8 w-8 shrink-0" />
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{c.email ?? '—'}</td>
                    <td className="px-4 py-2">
                      <SourceBadge source={c.source} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center">
                        <ScoreGauge score={scoreForJob(c, activeJobId)} label="Score" size={64} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-center">
                      {c.applications?.length ?? 0} job{(c.applications?.length ?? 0) !== 1 ? 's' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
