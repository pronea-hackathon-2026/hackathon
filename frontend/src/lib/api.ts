const apiBase = '/api'

async function readJson(response: Response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? `Request failed with ${response.status}`)
  }

  return response.json()
}

export async function fetchJobs() {
  const response = await fetch(`${apiBase}/jobs`)
  const payload = await readJson(response)
  return payload.data
}

export async function fetchJobCandidates(jobId: string) {
  const response = await fetch(`${apiBase}/jobs/${jobId}/candidates`)
  const payload = await readJson(response)
  return payload.data
}

export async function fetchCandidate(candidateId: string) {
  const response = await fetch(`${apiBase}/candidates/${candidateId}`)
  const payload = await readJson(response)
  return payload.data
}

export async function fetchInterview(applicationId: string) {
  const response = await fetch(`${apiBase}/interviews/${applicationId}`)
  const payload = await readJson(response)
  return payload.data
}
