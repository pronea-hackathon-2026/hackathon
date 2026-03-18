# TalentLens MVP

AI-powered recruitment pipeline — CV upload → auto-scoring → AI video interviews.

## Quick Start

### 1. Database Setup

Run `schema.sql` in the Supabase SQL Editor. This creates all tables and the semantic search function.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your real keys

python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Seed demo data
python seed.py

# Start server
uvicorn main:app --reload
```

Backend runs at http://localhost:8000. Swagger docs at http://localhost:8000/docs.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173.

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `OPENAI_API_KEY` | OpenAI API key (for embeddings) |
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude) |
| `DAILY_API_KEY` | Daily.co API key (for video rooms) |

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — kanban board with all candidates |
| `/candidate/:id` | Candidate detail — CV, scores, questions |
| `/interview/:applicationId` | Interview room (candidate-facing) |
| `/review/:applicationId` | Video review (HR-facing) |

## Architecture

```
frontend/         # Vite + React + Tailwind + shadcn/ui
  src/
    pages/        # Dashboard, CandidateDetail, InterviewRoom, VideoReview
    components/   # KanbanBoard, CandidateCard, ScoreBadge, ...
    lib/
      api.ts      # Typed API client
      utils.ts    # Score colors, helpers

backend/          # FastAPI
  routers/        # candidates, jobs, applications, interviews
  services/
    cv_parser.py  # Claude CV extraction
    embeddings.py # OpenAI text-embedding-3-small
    scoring.py    # Credibility, attention, interview, overall scores
    daily.py      # Daily.co room creation
  main.py
  seed.py         # Demo data

schema.sql        # Supabase PostgreSQL schema with pgvector
```
