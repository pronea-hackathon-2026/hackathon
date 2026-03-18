from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import get_db

router = APIRouter()


class CreateApplicationRequest(BaseModel):
    candidate_id: str
    job_id: str


class UpdateStatusRequest(BaseModel):
    status: str


VALID_STATUSES = {"inbox", "shortlisted", "interview_scheduled", "interview_done", "final_round", "rejected"}


@router.post("")
def create_application(body: CreateApplicationRequest):
    db = get_db()
    # Check for duplicate
    existing = db.table("applications").select("id").eq(
        "candidate_id", body.candidate_id
    ).eq("job_id", body.job_id).execute()
    if existing.data:
        return existing.data[0]

    # Get match score via embedding comparison
    cand = db.table("candidates").select("embedding, credibility_score").eq(
        "id", body.candidate_id
    ).single().execute().data
    job = db.table("jobs").select("embedding").eq("id", body.job_id).single().execute().data

    match_score = 0
    if cand and job and cand.get("embedding") and job.get("embedding"):
        import math
        a = cand["embedding"]
        b = job["embedding"]
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        sim = dot / (norm_a * norm_b) if norm_a and norm_b else 0
        match_score = max(0, min(100, round(sim * 100)))

    cred = cand.get("credibility_score", 0) if cand else 0
    from services.scoring import calculate_overall_score
    overall = calculate_overall_score(match_score, cred, 0)

    result = db.table("applications").insert({
        "candidate_id": body.candidate_id,
        "job_id": body.job_id,
        "match_score": match_score,
        "overall_score": overall,
        "status": "inbox",
    }).execute()
    return result.data[0]


@router.patch("/{application_id}/status")
def update_status(application_id: str, body: UpdateStatusRequest):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
    db = get_db()
    result = db.table("applications").update({"status": body.status}).eq(
        "id", application_id
    ).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data[0]


@router.get("/{application_id}")
def get_application(application_id: str):
    db = get_db()
    result = db.table("applications").select(
        "*, candidates(*), jobs(*)"
    ).eq("id", application_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data
