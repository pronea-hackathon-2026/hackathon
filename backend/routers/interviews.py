from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from db import get_db
from services.interview import create_daily_room
from services.scoring import (
    analyze_interview,
    calculate_attention_score,
    calculate_overall_score,
)

router = APIRouter()


class AnalyzeRequest(BaseModel):
    transcript: str
    attention_events: list[dict[str, Any]] = []


@router.post("/invite/{application_id}")
def create_invite(application_id: str):
    """Create a Daily.co room and schedule the interview."""
    db = get_db()
    app_result = db.table("applications").select("*").eq("id", application_id).single().execute()
    if not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    room_url = create_daily_room()

    db.table("applications").update({
        "interview_room_url": room_url,
        "status": "interview_scheduled",
    }).eq("id", application_id).execute()

    return {"room_url": room_url}


@router.post("/analyze/{application_id}")
def analyze(application_id: str, body: AnalyzeRequest):
    """Receive transcript + attention events, score, and store analysis."""
    db = get_db()
    app_result = db.table("applications").select(
        "*, candidates(credibility_score), jobs(description)"
    ).eq("id", application_id).single().execute()
    if not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    app = app_result.data
    job_description = (app.get("jobs") or {}).get("description", "")

    analysis = analyze_interview(body.transcript, job_description)
    attention_score = calculate_attention_score(body.attention_events)

    answer_quality = analysis.get("answer_quality_score", 0)
    communication = analysis.get("communication_score", 0)
    # Weighted formula: answer_quality * 0.4 + communication * 0.3 + attention * 0.3
    interview_score = round(answer_quality * 0.4 + communication * 0.3 + attention_score * 0.3)
    interview_score = max(0, min(100, interview_score))

    match_score = app.get("match_score") or 0
    cred_score = (app.get("candidates") or {}).get("credibility_score", 0) or 0
    overall = calculate_overall_score(match_score, cred_score, interview_score)

    analysis["attention_score"] = attention_score
    analysis["interview_score"] = interview_score

    db.table("applications").update({
        "transcript": body.transcript,
        "analysis": analysis,
        "attention_events": body.attention_events,
        "interview_score": interview_score,
        "overall_score": overall,
        "status": "interview_done",
    }).eq("id", application_id).execute()

    return {**analysis, "overall_score": overall}


@router.post("/questions/{application_id}")
def generate_questions(application_id: str):
    """Generate tailored interview questions for a candidate."""
    import os
    import json
    import anthropic

    db = get_db()
    app_result = db.table("applications").select(
        "*, candidates(parsed, raw_text), jobs(title, description)"
    ).eq("id", application_id).single().execute()
    if not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    app = app_result.data
    parsed = (app.get("candidates") or {}).get("parsed", {})
    job_title = (app.get("jobs") or {}).get("title", "")
    job_desc = (app.get("jobs") or {}).get("description", "")

    system = (
        "You are an expert interviewer. Generate 5-7 tailored interview questions for "
        "this candidate based on their CV and the job. Return ONLY a JSON array of "
        "question strings. No markdown, no explanation."
    )
    user_content = (
        f"Job Title: {job_title}\nJob Description: {job_desc}\n\n"
        f"Candidate CV Summary:\n{json.dumps(parsed, indent=2)}"
    )

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    text = message.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    questions = json.loads(text)
    return {"questions": questions}
