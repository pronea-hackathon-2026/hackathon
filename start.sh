#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
VENV="$BACKEND_DIR/.venv"

# ─── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[talentlens]${NC} $*"; }
warn()  { echo -e "${YELLOW}[talentlens]${NC} $*"; }
error() { echo -e "${RED}[talentlens]${NC} $*" >&2; }

# ─── Checks ───────────────────────────────────────────────────────────────────
if [ ! -f "$BACKEND_DIR/.env" ]; then
  error ".env not found in backend/. Copy backend/.env.example and fill in your keys."
  exit 1
fi

if [ ! -d "$VENV" ]; then
  warn "Virtual environment not found. Creating..."
  python3 -m venv "$VENV"
  source "$VENV/bin/activate"
  pip install -r "$BACKEND_DIR/requirements.txt" -q
else
  source "$VENV/bin/activate"
fi

# ─── Supabase ─────────────────────────────────────────────────────────────────
if command -v supabase &>/dev/null; then
  info "Starting Supabase local stack..."
  cd "$PROJECT_ROOT"
  supabase start
  SUPABASE_STATUS="local"
else
  # Cloud Supabase — verify the URL is reachable
  SUPABASE_URL=$(grep -E '^SUPABASE_URL=' "$BACKEND_DIR/.env" | cut -d'=' -f2-)
  if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
    warn "SUPABASE_URL is not configured in backend/.env"
  else
    info "Using cloud Supabase: $SUPABASE_URL"
  fi
  SUPABASE_STATUS="cloud"
fi

# ─── Backend ──────────────────────────────────────────────────────────────────
info "Starting FastAPI backend on http://localhost:8000 ..."
cd "$BACKEND_DIR"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# ─── Trap for clean shutdown ───────────────────────────────────────────────────
cleanup() {
  info "Shutting down..."
  kill "$BACKEND_PID" 2>/dev/null || true
  if [ "$SUPABASE_STATUS" = "local" ] && command -v supabase &>/dev/null; then
    cd "$PROJECT_ROOT" && supabase stop
  fi
}
trap cleanup INT TERM

info ""
info "  Backend : http://localhost:8000"
info "  API docs: http://localhost:8000/docs"
if [ "$SUPABASE_STATUS" = "local" ]; then
  info "  Supabase: http://localhost:54323 (Studio)"
fi
info ""
info "Press Ctrl+C to stop."

wait "$BACKEND_PID"
