import { Router } from 'express'

export function createApiRouter(service) {
  const router = Router()

  router.get('/health', async (_request, response, next) => {
    try {
      response.json(await service.getHealth())
    } catch (error) {
      next(error)
    }
  })

  router.get('/jobs', async (_request, response, next) => {
    try {
      response.json({ data: await service.listJobs() })
    } catch (error) {
      next(error)
    }
  })

  router.get('/jobs/:jobId/candidates', async (request, response, next) => {
    try {
      const result = await service.getJobCandidates(request.params.jobId)

      if (!result) {
        response.status(404).json({ error: 'Job not found' })
        return
      }

      response.json({ data: result })
    } catch (error) {
      next(error)
    }
  })

  router.get('/candidates/:candidateId', async (request, response, next) => {
    try {
      const candidate = await service.getCandidateDetail(request.params.candidateId)

      if (!candidate) {
        response.status(404).json({ error: 'Candidate not found' })
        return
      }

      response.json({ data: candidate })
    } catch (error) {
      next(error)
    }
  })

  router.get('/interviews/:applicationId', async (request, response, next) => {
    try {
      const interview = await service.getInterview(request.params.applicationId)

      if (!interview) {
        response.status(404).json({ error: 'Interview not found' })
        return
      }

      response.json({ data: interview })
    } catch (error) {
      next(error)
    }
  })

  return router
}
