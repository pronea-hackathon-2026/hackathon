import { candidates, interviews, jobs } from '../data/mockData.js'

const clone = (value) => JSON.parse(JSON.stringify(value))

export class MockPostgresRepository {
  constructor() {
    this.tables = {
      jobs: clone(jobs),
      candidates: clone(candidates),
      interviews: clone(interviews),
    }
  }

  describe() {
    return {
      dialect: 'postgresql',
      mode: 'mock',
      note: 'In-memory mock repository shaped like a PostgreSQL adapter.',
    }
  }

  async query(sql, params = []) {
    return {
      sql,
      params,
      mode: 'mock',
    }
  }

  async listJobs() {
    await this.query('select * from jobs order by title asc')
    return clone(this.tables.jobs)
  }

  async getJobById(jobId) {
    await this.query('select * from jobs where id = $1 limit 1', [jobId])
    return clone(this.tables.jobs.find((job) => job.id === jobId) ?? null)
  }

  async listCandidatesByJob(jobId) {
    await this.query('select * from candidates where job_id = $1 order by score desc', [jobId])
    return clone(this.tables.candidates.filter((candidate) => candidate.jobId === jobId))
  }

  async getCandidateById(candidateId) {
    await this.query('select * from candidates where id = $1 limit 1', [candidateId])
    return clone(this.tables.candidates.find((candidate) => candidate.id === candidateId) ?? null)
  }

  async getInterviewByApplicationId(applicationId) {
    await this.query('select * from interviews where id = $1 limit 1', [applicationId])
    return clone(this.tables.interviews.find((interview) => interview.id === applicationId) ?? null)
  }
}
