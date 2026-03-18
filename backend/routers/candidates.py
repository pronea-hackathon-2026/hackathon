import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from db import get_db
from services.cv_parser import extract_text, parse_cv
from services.embeddings import embed
from services.scoring import calculate_credibility

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    limit: int = 20


@router.post("/upload")
async def upload_candidate(file: UploadFile = File(...)):
    """Upload a CV file, parse it, score it, and save to DB."""
    file_bytes = await file.read()
    filename = file.filename or "upload"

    try:
        raw_text = extract_text(file_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    parsed = parse_cv(raw_text)
    credibility_score = calculate_credibility(parsed)
    embedding = embed(raw_text)

    db = get_db()
    result = db.table("candidates").insert({
        "name": parsed.get("name", "Unknown"),
        "email": parsed.get("email"),
        "source": "manual",
        "raw_text": raw_text,
        "parsed": parsed,
        "credibility_score": credibility_score,
        "embedding": embedding,
    }).execute()

    return result.data[0]


@router.get("")
def list_candidates():
    """Return all candidates with their latest application info."""
    db = get_db()
    result = db.table("candidates").select(
        "*, applications(id, job_id, match_score, interview_score, overall_score, status, interview_date, interview_room_url)"
    ).order("created_at", desc=True).execute()
    return result.data


@router.get("/{candidate_id}")
def get_candidate(candidate_id: str):
    """Return full detail for one candidate."""
    db = get_db()
    result = db.table("candidates").select(
        "*, applications(*, jobs(id, title, description))"
    ).eq("id", candidate_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return result.data


@router.post("/search")
def search_candidates(body: SearchRequest):
    """Semantic search over candidates."""
    query_embedding = embed(body.query)
    db = get_db()
    result = db.rpc("match_candidates", {
        "query_embedding": query_embedding,
        "match_count": body.limit,
    }).execute()
    if not result.data:
        return []
    candidate_ids = [r["id"] for r in result.data]
    scores = {r["id"]: r.get("similarity", 0) for r in result.data}
    candidates_result = db.table("candidates").select("*").in_("id", candidate_ids).execute()
    candidates = candidates_result.data
    for c in candidates:
        c["search_score"] = round(scores.get(c["id"], 0) * 100)
    candidates.sort(key=lambda c: scores.get(c["id"], 0), reverse=True)
    return candidates
