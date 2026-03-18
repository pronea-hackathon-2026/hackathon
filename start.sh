#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
JAR="$BACKEND_DIR/target/talentlens-0.1.0.jar"

# ─── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[talentlens]${NC} $*"; }
warn()  { echo -e "${YELLOW}[talentlens]${NC} $*"; }
error() { echo -e "${RED}[talentlens]${NC} $*" >&2; }

# ─── Check Java ───────────────────────────────────────────────────────────────
if ! command -v java &>/dev/null; then
  error "Java not found. Install Java 17+: https://adoptium.net"
  exit 1
fi

# ─── Check Gemini key ─────────────────────────────────────────────────────────
if [ -z "$GEMINI_API_KEY" ]; then
  if [ -f "$BACKEND_DIR/.env" ]; then
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
  fi
fi

if [ -z "$GEMINI_API_KEY" ]; then
  error "GEMINI_API_KEY is not set. Add it to backend/.env or export it."
  exit 1
fi

# ─── Find Maven ───────────────────────────────────────────────────────────────
MVN=""
if [ -f "$BACKEND_DIR/mvnw" ]; then
  MVN="$BACKEND_DIR/mvnw"
elif command -v mvn &>/dev/null; then
  MVN="mvn"
else
  error "Maven not found. Install it with:  brew install maven"
  error "Or run: brew install maven && ./start.sh"
  exit 1
fi

# ─── Kill any running instance ────────────────────────────────────────────────
if pkill -f talentlens 2>/dev/null; then
  info "Stopped existing backend."
  sleep 1
fi

# ─── Always rebuild ───────────────────────────────────────────────────────────
info "Building backend..."
cd "$BACKEND_DIR"
$MVN -q package -DskipTests
info "Build complete."

# ─── Start backend ────────────────────────────────────────────────────────────
info "Starting Spring Boot backend on http://localhost:8000 ..."
info "(Database: H2 file stored in backend/data/ — no external DB needed)"
cd "$BACKEND_DIR"
java -jar "$JAR" &
BACKEND_PID=$!

# ─── Clean shutdown ───────────────────────────────────────────────────────────
cleanup() {
  info "Shutting down..."
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM

info ""
info "  Backend:  http://localhost:8000"
info "  API docs: http://localhost:8000/swagger-ui.html"
info "  DB UI:    http://localhost:8000/h2-console  (JDBC: jdbc:h2:file:./data/talentlens)"
info ""
info "Demo data is seeded automatically on first startup."
info "Press Ctrl+C to stop."

wait "$BACKEND_PID"
