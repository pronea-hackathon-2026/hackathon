from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Candidate models
# ---------------------------------------------------------------------------

class CandidateCreate(BaseModel):
    name: str
    email: str
    source: str = "manual"


class CandidateResponse(BaseModel):
    id: str
    name: str
    email: str
    source: str
    credibility_score: Optional[float] = None
    parsed: Optional[dict[str, Any]] = None
    raw_text: Optional[str] = None
    created_at: Optional[str] = None

    # Joined fields from applications (latest application per candidate)
    status: Optional[str] = None
    match_score: Optional[float] = None
    overall_score: Optional[float] = None
    interview_score: Optional[float] = None


# ---------------------------------------------------------------------------
# Job models
# ---------------------------------------------------------------------------

class JobCreate(BaseModel):
    title: str
    description: str


class JobResponse(BaseModel):
    id: str
    title: str
    description: str
    created_at: Optional[str] = None


# ---------------------------------------------------------------------------
# Application models
# ---------------------------------------------------------------------------

class ApplicationCreate(BaseModel):
    candidate_id: str
    job_id: str


class ApplicationResponse(BaseModel):
    id: str
    candidate_id: str
    job_id: str
    status: Optional[str] = None
    match_score: Optional[float] = None
    credibility_score: Optional[float] = None
    interview_score: Optional[float] = None
    overall_score: Optional[float] = None
    interview_room_url: Optional[str] = None
    transcript: Optional[str] = None
    analysis: Optional[dict[str, Any]] = None
    attention_events: Optional[list[dict[str, Any]]] = None
    created_at: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Search models
# ---------------------------------------------------------------------------

class SearchQuery(BaseModel):
    query: str


# ---------------------------------------------------------------------------
# Interview models
# ---------------------------------------------------------------------------

class InterviewAnalysisRequest(BaseModel):
    transcript: str
    attention_events: list[dict[str, Any]]
