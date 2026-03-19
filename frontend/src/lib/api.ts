const BASE = 'http://localhost:8000'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function withFallback<T>(fn: () => Promise<T>, fallbackFn: () => T, delayMs = 2000): Promise<T> {
  try {
    return await fn()
  } catch {
    if (delayMs > 0) await delay(delayMs)
    return fallbackFn()
  }
}

// Per-job demo timers — track when scoring "started" for gradual mock progress
const _demoStartTimes = new Map<string, number>()

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_JOBS: Job[] = [
  {
    id: 'mock-job-1',
    title: 'Senior Full-Stack Engineer',
    description: 'Build scalable web applications using React and Python.',
    requirements: null,
    embedding: null,
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'mock-job-2',
    title: 'Product Designer',
    description: 'Design intuitive user experiences for our SaaS platform.',
    requirements: null,
    embedding: null,
    created_at: '2025-02-03T09:00:00Z',
  },
  {
    id: 'mock-job-3',
    title: 'DevOps Engineer',
    description: 'Own our cloud infrastructure and CI/CD pipelines.',
    requirements: null,
    embedding: null,
    created_at: '2025-02-20T14:00:00Z',
  },
]

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'mock-c-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@email.com',
    source: 'linkedin',
    raw_text: null,
    parsed: null,
    credibility_score: 87,
    embedding: null,
    created_at: '2025-03-01T08:00:00Z',
    applications: [
      { id: 'mock-a-1', candidate_id: 'mock-c-1', job_id: 'mock-job-1', match_score: 91, credibility_score: 87, interview_score: 0, overall_score: 89, status: 'interview', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-02T10:00:00Z' },
      { id: 'mock-a-2', candidate_id: 'mock-c-1', job_id: 'mock-job-3', match_score: 54, credibility_score: 87, interview_score: 0, overall_score: 70, status: 'applied', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-02T10:00:00Z' },
    ],
  },
  {
    id: 'mock-c-2',
    name: 'Jordan Kim',
    email: 'jordan.kim@email.com',
    source: 'upload',
    raw_text: null,
    parsed: null,
    credibility_score: 72,
    embedding: null,
    created_at: '2025-03-03T09:00:00Z',
    applications: [
      { id: 'mock-a-3', candidate_id: 'mock-c-2', job_id: 'mock-job-2', match_score: 83, credibility_score: 72, interview_score: 0, overall_score: 77, status: 'review', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-04T10:00:00Z' },
      { id: 'mock-a-4', candidate_id: 'mock-c-2', job_id: 'mock-job-1', match_score: 61, credibility_score: 72, interview_score: 0, overall_score: 66, status: 'applied', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-04T10:00:00Z' },
    ],
  },
  {
    id: 'mock-c-3',
    name: 'Sam Patel',
    email: 'sam.patel@email.com',
    source: 'referral',
    raw_text: null,
    parsed: null,
    credibility_score: 94,
    embedding: null,
    created_at: '2025-03-05T11:00:00Z',
    applications: [
      { id: 'mock-a-5', candidate_id: 'mock-c-3', job_id: 'mock-job-1', match_score: 78, credibility_score: 94, interview_score: 88, overall_score: 87, status: 'offer', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-06T10:00:00Z' },
    ],
  },
  {
    id: 'mock-c-4',
    name: 'Morgan Chen',
    email: 'morgan.chen@email.com',
    source: 'linkedin',
    raw_text: null,
    parsed: null,
    credibility_score: 61,
    embedding: null,
    created_at: '2025-03-07T14:00:00Z',
    applications: [
      { id: 'mock-a-6', candidate_id: 'mock-c-4', job_id: 'mock-job-3', match_score: 88, credibility_score: 61, interview_score: 0, overall_score: 74, status: 'review', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-08T10:00:00Z' },
      { id: 'mock-a-7', candidate_id: 'mock-c-4', job_id: 'mock-job-2', match_score: 44, credibility_score: 61, interview_score: 0, overall_score: 52, status: 'applied', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-08T10:00:00Z' },
    ],
  },
  {
    id: 'mock-c-5',
    name: 'Taylor Brooks',
    email: 'taylor.brooks@email.com',
    source: 'upload',
    raw_text: null,
    parsed: null,
    credibility_score: 55,
    embedding: null,
    created_at: '2025-03-09T16:00:00Z',
    applications: [
      { id: 'mock-a-8', candidate_id: 'mock-c-5', job_id: 'mock-job-2', match_score: 69, credibility_score: 55, interview_score: 0, overall_score: 62, status: 'applied', interview_date: null, interview_room_url: null, video_url: null, transcript: null, analysis: null, attention_events: null, created_at: '2025-03-10T10:00:00Z' },
    ],
  },
]

// ─── Candidates ───────────────────────────────────────────────────────────────
export const api = {
  candidates: {
    upload: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/candidates/upload`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    create: (name: string, email: string) =>
      req<Candidate>('/candidates', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      }),
    uploadCV: async (candidateId: string, file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/candidates/${candidateId}/cv`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    list: () => withFallback(() => req<Candidate[]>('/candidates'), () => MOCK_CANDIDATES),
    get: (id: string) => withFallback(
      () => req<Candidate>(`/candidates/${id}`),
      () => MOCK_CANDIDATES.find((c) => c.id === id) ?? MOCK_CANDIDATES[0],
    ),
    search: (query: string) => withFallback(
      () => req<Candidate[]>('/candidates/search', { method: 'POST', body: JSON.stringify({ query }) }),
      () => MOCK_CANDIDATES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    ),
  },

  jobs: {
    list: () => withFallback(() => req<Job[]>('/jobs'), () => MOCK_JOBS),
    get: (id: string) => withFallback(
      () => req<Job>(`/jobs/${id}`),
      () => MOCK_JOBS.find((j) => j.id === id) ?? MOCK_JOBS[0],
    ),
    create: (title: string, description: string, requirements?: JobRequirements) =>
      req<Job>('/jobs', {
        method: 'POST',
        body: JSON.stringify({ title, description, requirements }),
      }),
    delete: (id: string) => req(`/jobs/${id}`, { method: 'DELETE' }),
    rescore: (id: string) => req(`/jobs/${id}/rescore`, { method: 'POST' }),
    progress: (id: string) => withFallback(
      () => req<{ total: number; scored: number; applications: Application[] }>(`/jobs/${id}/progress`),
      () => {
        if (!_demoStartTimes.has(id)) _demoStartTimes.set(id, Date.now())
        const elapsed = Date.now() - _demoStartTimes.get(id)!
        const total = MOCK_CANDIDATES.length
        const scored = Math.min(total, Math.floor(elapsed / 500))
        const applications = MOCK_CANDIDATES.slice(0, scored).map((c) => {
          const base = (c.applications ?? [])[0]
          return {
            id: base?.id ?? `demo-app-${c.id}`,
            candidate_id: c.id,
            job_id: id,
            match_score: base?.match_score ?? 0,
            credibility_score: c.credibility_score,
            interview_score: 0,
            overall_score: base?.overall_score ?? 0,
            status: 'inbox',
            interview_date: null,
            interview_room_url: null,
            video_url: null,
            transcript: null,
            analysis: null,
            attention_events: null,
            created_at: c.created_at,
            candidates: c,
          } as Application
        })
        return { total, scored, applications }
      },
      0, // no delay — progress is polled rapidly
    ),
  },

  applications: {
    create: (candidate_id: string, job_id: string) =>
      req<Application>('/applications', {
        method: 'POST',
        body: JSON.stringify({ candidate_id, job_id }),
      }),
    updateStatus: (id: string, status: string) => withFallback(
      () => req<Application>(`/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
      () => MOCK_CANDIDATES.flatMap((c) => c.applications ?? []).find((a) => a.id === id) ?? MOCK_CANDIDATES[0].applications![0],
    ),
    get: (id: string) => withFallback(
      () => req<Application>(`/applications/${id}`),
      () => MOCK_CANDIDATES.flatMap((c) => c.applications ?? []).find((a) => a.id === id) ?? MOCK_CANDIDATES[0].applications![0],
    ),
  },

  interviews: {
    invite: (applicationId: string) =>
      req<{ room_url: string }>(`/interviews/invite/${applicationId}`, { method: 'POST' }),
    analyze: (applicationId: string, transcript: string, attentionEvents: AttentionEvent[]) =>
      req<InterviewAnalysis>(`/interviews/analyze/${applicationId}`, {
        method: 'POST',
        body: JSON.stringify({ transcript, attention_events: attentionEvents }),
      }),
    generateQuestions: (applicationId: string) =>
      req<{ questions: string[] }>(`/interviews/questions/${applicationId}`, { method: 'POST' }),
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Candidate {
  id: string
  name: string
  email: string | null
  source: string
  raw_text: string | null
  parsed: ParsedCV | null
  credibility_score: number
  embedding: number[] | null
  created_at: string
  applications?: Application[]
}

export interface ParsedCV {
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  skills: string[]
  languages: string[]
  education: { degree: string; institution: string; year: string | null }[]
  experience: {
    company: string
    role: string
    start_date: string | null
    end_date: string | null
    duration_months: number | null
    description: string
  }[]
  gaps: { start_date: string; end_date: string; duration_months: number }[]
  red_flags: string[]
}

export interface ApplicationQuestion {
  id: string
  type: 'text' | 'choice'
  question: string
  options?: string[] // for choice type
  required: boolean
}

export interface JobRequirements {
  required_skills: string[]
  nice_to_have_skills: string[]
  min_years_experience: number
  max_years_experience: number
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'director' | ''
  location_type: 'remote' | 'hybrid' | 'onsite' | ''
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | ''
  education: 'none' | 'bachelor' | 'master' | 'phd' | ''
  languages: string[]
  responsibilities: string[]
  success_description: string
  dealbreakers: string[]
  green_flags: string[]
  scoring_weights: {
    technical_skills: number
    experience_years: number
    domain_background: number
    education: number
    career_trajectory: number
  }
  application_questions?: ApplicationQuestion[]
}

export interface Job {
  id: string
  title: string
  description: string
  requirements: JobRequirements | null
  embedding: number[] | null
  created_at: string
}

export interface Application {
  id: string
  candidate_id: string
  job_id: string
  match_score: number
  credibility_score: number
  interview_score: number
  overall_score: number
  status: string
  interview_date: string | null
  interview_room_url: string | null
  video_url: string | null
  transcript: string | null
  analysis: InterviewAnalysis | null
  attention_events: AttentionEvent[] | null
  created_at: string
  candidates?: Candidate
  jobs?: Job
}

export interface InterviewAnalysis {
  answer_quality_score: number
  communication_score: number
  attention_score: number
  interview_score: number
  summary: string
  strengths: string[]
  concerns: string[]
  per_question: { question: string; score: number; notes: string }[]
}

export interface AttentionEvent {
  type: 'phone_detected' | 'tab_switch' | 'window_blur' | 'gaze_away'
  timestamp: number
}
