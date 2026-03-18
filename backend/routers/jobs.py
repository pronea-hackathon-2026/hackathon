from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import get_db
from services.embeddings import embed

router = APIRouter()


class CreateJobRequest(BaseModel):
    title: str
    description: str


@router.post("")
def create_job(body: CreateJobRequest):
    """Create a job and recalculate match scores for all candidates."""
    embedding = embed(body.description)
    db = get_db()

    job_result = db.table("jobs").insert({
        "title": body.title,
        "description": body.description,
        "embedding": embedding,
    }).execute()
    job = job_result.data[0]

    _rescore_all(db, job["id"], embedding)
    return job


@router.get("")
def list_jobs():
    db = get_db()
    result = db.table("jobs").select("*").order("created_at", desc=True).execute()
    return result.data


@router.post("/{job_id}/rescore")
def rescore_job(job_id: str):
    db = get_db()
    job = db.table("jobs").select("*").eq("id", job_id).single().execute().data
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    _rescore_all(db, job_id, job["embedding"])
    return {"ok": True, "job_id": job_id}


def _rescore_all(db, job_id: str, job_embedding: list[float]):
    """Recalculate match scores for all candidates against this job."""
    candidates = db.table("candidates").select("id, embedding").execute().data
    for cand in candidates:
        if not cand.get("embedding"):
            continue
        # Calculate cosine similarity via pgvector RPC
        try:
            sim_result = db.rpc("cosine_similarity", {
                "vec_a": cand["embedding"],
                "vec_b": job_embedding,
            }).execute()
            similarity = sim_result.data if isinstance(sim_result.data, (int, float)) else 0
        except Exception:
            # Fallback: use Python
            import math
            a = cand["embedding"]
            b = job_embedding
            dot = sum(x * y for x, y in zip(a, b))
            norm_a = math.sqrt(sum(x * x for x in a))
            norm_b = math.sqrt(sum(x * x for x in b))
            similarity = dot / (norm_a * norm_b) if norm_a and norm_b else 0

        match_score = max(0, min(100, round((similarity) * 100)))

        # Upsert the application's match_score
        existing = db.table("applications").select("id, credibility_score").eq(
            "candidate_id", cand["id"]
        ).eq("job_id", job_id).execute()

        if existing.data:
            app = existing.data[0]
            from services.scoring import calculate_overall_score
            overall = calculate_overall_score(
                match_score,
                0,  # credibility comes from candidate table
                app.get("interview_score", 0),
            )
            db.table("applications").update({
                "match_score": match_score,
                "overall_score": overall,
            }).eq("id", app["id"]).execute()
        else:
            # Get candidate credibility
            cred_result = db.table("candidates").select("credibility_score").eq(
                "id", cand["id"]
            ).single().execute()
            cred = cred_result.data.get("credibility_score", 0) if cred_result.data else 0
            from services.scoring import calculate_overall_score
            overall = calculate_overall_score(match_score, cred, 0)
            db.table("applications").insert({
                "candidate_id": cand["id"],
                "job_id": job_id,
                "match_score": match_score,
                "overall_score": overall,
                "status": "inbox",
            }).execute()
