import { http, HttpResponse } from 'msw'
import { candidates, interviews, jobs } from './data'

const apiBase = '/api'

export const handlers = [
  http.get(`${apiBase}/health`, () =>
    HttpResponse.json({
      status: 'ok',
      database: {
        dialect: 'postgresql',
        mode: 'mock',
      },
      timestamp: new Date().toISOString(),
    }),
  ),
  http.get(`${apiBase}/jobs`, () => HttpResponse.json({ data: jobs })),
  http.get(`${apiBase}/jobs/:jobId/candidates`, ({ params }: { params: Record<string, string | undefined> }) => {
    const job = jobs.find((item) => item.id === params.jobId)
    if (!job) {
      return HttpResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return HttpResponse.json({
      data: {
        job,
        candidates: candidates.filter((candidate) => candidate.jobId === params.jobId),
      },
    })
  }),
  http.get(`${apiBase}/candidates/:candidateId`, ({ params }: { params: Record<string, string | undefined> }) => {
    const candidate = candidates.find((item) => item.id === params.candidateId)
    if (!candidate) {
      return HttpResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    return HttpResponse.json({ data: candidate })
  }),
  http.get(`${apiBase}/interviews/:applicationId`, ({ params }: { params: Record<string, string | undefined> }) => {
    const interview = interviews.find((item) => item.id === params.applicationId)
    if (!interview) {
      return HttpResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    const candidate = candidates.find((item) => item.id === interview.candidateId)
    const job = jobs.find((item) => item.id === interview.jobId)

    return HttpResponse.json({
      data: {
        ...interview,
        candidate,
        job,
      },
    })
  }),
]
