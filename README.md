# Tým ClusterBusters
Pronea Hackathon 2026

## Stack
- Frontend: React/Vite skeleton + MSW mocks
- Backend: Express.js
- DB: PostgreSQL shape mocked in-memory

## Backend rewrite

Java backend was replaced with a new Express.js API in [backend](/Users/daved/Desktop/hackathon-pronea/hackathon/backend).

Available endpoints:

- `GET /api/health`
- `GET /api/jobs`
- `GET /api/jobs/:jobId/candidates`
- `GET /api/candidates/:candidateId`
- `GET /api/interviews/:applicationId`

Run backend:

```bash
cd backend
npm install
npm run dev
```

The repository layer is intentionally modeled as a PostgreSQL adapter, but it currently serves in-memory mock data so the app can run without a real database.

## Frontend mocks

MSW handlers were added in [frontend/src/mocks/handlers.ts](/Users/daved/Desktop/hackathon-pronea/hackathon/frontend/src/mocks/handlers.ts) with shared seed data in [frontend/src/mocks/data.ts](/Users/daved/Desktop/hackathon-pronea/hackathon/frontend/src/mocks/data.ts).

When you add or restore the frontend entry file, initialize the worker in development:

```ts
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser')
  await worker.start()
}
```

## Assumption

I interpreted "Pozdrav SQL" as "PostgreSQL". If you meant a different SQL database or service, the repository layer is separated so we can swap it quickly.
