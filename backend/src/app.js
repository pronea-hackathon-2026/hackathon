import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MockPostgresRepository } from './repositories/mockPostgresRepository.js'
import { createApiRouter } from './routes/apiRouter.js'
import { TalentLensService } from './services/talentLensService.js'

dotenv.config()

const currentFile = fileURLToPath(import.meta.url)
const currentDir = path.dirname(currentFile)
const frontendDistDir = path.resolve(currentDir, '../../frontend/dist')

export function createApp() {
  const app = express()
  const repository = new MockPostgresRepository()
  const service = new TalentLensService(repository)

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? true,
    }),
  )
  app.use(express.json())

  app.use('/api', createApiRouter(service))

  app.get('/', (_request, response) => {
    response.redirect('/jobs')
  })

  app.get('/extension', (_request, response) => {
    response.redirect('/extension-demo')
  })

  app.use(express.static(frontendDistDir))

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api')) {
      next()
      return
    }

    response.sendFile(path.join(frontendDistDir, 'index.html'))
  })

  app.use((error, _request, response, _next) => {
    console.error(error)
    response.status(500).json({
      error: 'Internal server error',
    })
  })

  return app
}
