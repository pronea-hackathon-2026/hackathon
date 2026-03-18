import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import SourceBadge from '@/components/SourceBadge'
import { ScoreGauge } from '@/components/ScoreGauge'
import { api, type Candidate } from '@/lib/api'

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.candidates.list().then(setCandidates).catch(console.error).finally(() => setLoading(false))
  }, [])

  function bestMatchScore(c: Candidate) {
    if (!c.applications || c.applications.length === 0) return 0
    return Math.max(...c.applications.map((a) => a.match_score ?? 0))
  }

  function initials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/50 backdrop-blur sticky top-0 z-10">
        <Users size={18} className="text-muted-foreground" />
        <h1 className="font-semibold text-lg">Candidates</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground">({candidates.length})</span>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Social Credit</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Position Fit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applications</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/candidate/${c.id}`)}
                    className="border-b border-border last:border-0 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {initials(c.name)}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{c.email ?? '—'}</td>
                    <td className="px-4 py-2">
                      <SourceBadge source={c.source} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center">
                        <ScoreGauge score={c.credibility_score ?? 0} label="Credibility" size={64} />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center">
                        <ScoreGauge score={bestMatchScore(c)} label="Match" size={64} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
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
