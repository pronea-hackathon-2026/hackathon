export class TalentLensService {
  constructor(repository) {
    this.repository = repository
  }

  async getHealth() {
    return {
      status: 'ok',
      database: this.repository.describe(),
      timestamp: new Date().toISOString(),
    }
  }

  async listJobs() {
    const jobs = await this.repository.listJobs()
    return jobs.map((job) => ({
      ...job,
      candidateCount: 0,
    }))
  }

  async getJobCandidates(jobId) {
    const job = await this.repository.getJobById(jobId)
    if (!job) {
      return null
    }

    const candidates = await this.repository.listCandidatesByJob(jobId)

    return {
      job,
      candidates,
    }
  }

  async getCandidateDetail(candidateId) {
    return this.repository.getCandidateById(candidateId)
  }

  async getInterview(applicationId) {
    const interview = await this.repository.getInterviewByApplicationId(applicationId)
    if (!interview) {
      return null
    }

    const candidate = await this.repository.getCandidateById(interview.candidateId)
    const job = await this.repository.getJobById(interview.jobId)

    return {
      ...interview,
      candidate,
      job,
    }
  }
}
