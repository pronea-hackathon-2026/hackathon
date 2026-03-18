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
    list: () => req<Candidate[]>('/candidates'),
    get: (id: string) => req<Candidate>(`/candidates/${id}`),
    search: (query: string) =>
      req<Candidate[]>('/candidates/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }),
  },

  jobs: {
    list: () => req<Job[]>('/jobs'),
    create: (title: string, description: string, requirements?: JobRequirements) =>
      req<Job>('/jobs', {
        method: 'POST',
        body: JSON.stringify({ title, description, requirements }),
      }),
    delete: (id: string) => req(`/jobs/${id}`, { method: 'DELETE' }),
    rescore: (id: string) => req(`/jobs/${id}/rescore`, { method: 'POST' }),
  },

  applications: {
    create: (candidate_id: string, job_id: string) =>
      req<Application>('/applications', {
        method: 'POST',
        body: JSON.stringify({ candidate_id, job_id }),
      }),
    updateStatus: (id: string, status: string) =>
      req<Application>(`/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    get: (id: string) => req<Application>(`/applications/${id}`),
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
