import os
import json
import anthropic
from typing import Any


def calculate_credibility(parsed: dict[str, Any], check_progression: bool = True) -> int:
    """Calculate credibility score (0-100) from parsed CV data."""
    score = 0

    # +20 for contact info
    if parsed.get("email") and parsed.get("phone"):
        score += 20

    # +15 for education
    if parsed.get("education") and len(parsed["education"]) > 0:
        score += 15

    # +15 for skills
    if parsed.get("skills") and len(parsed["skills"]) > 5:
        score += 15

    # +25 for average tenure > 18 months
    experience = parsed.get("experience", [])
    if experience:
        durations = [
            e["duration_months"]
            for e in experience
            if e.get("duration_months") is not None and e["duration_months"] > 0
        ]
        if durations and (sum(durations) / len(durations)) > 18:
            score += 25

    # +15 for upward career progression (skip if already checked externally)
    if check_progression:
        from services.cv_parser import check_career_progression
        if experience and check_career_progression(experience):
            score += 15

    # -5 per employment gap over 3 months
    gaps = parsed.get("gaps", [])
    score -= 5 * len(gaps)

    # -5 per red flag
    red_flags = parsed.get("red_flags", [])
    score -= 5 * len(red_flags)

    return max(0, min(100, score))


def calculate_attention_score(attention_events: list[dict]) -> int:
    """Calculate attention score from attention event array."""
    score = 100
    for event in attention_events:
        etype = event.get("type", "")
        if etype == "phone_detected":
            score -= 20
        elif etype in ("tab_switch", "window_blur"):
            score -= 10
        elif etype == "gaze_away":
            score -= 5
    return max(0, score)


def calculate_match_score(
    candidate_embedding: list[float],
    job_embedding: list[float],
) -> int:
    """Cosine similarity between two embedding vectors, expressed as 0-100.

    Formula: round((1 - cosine_distance) * 100)
    where cosine_distance = 1 - dot(a, b) / (norm(a) * norm(b))
    """
    import math

    dot = sum(a * b for a, b in zip(candidate_embedding, job_embedding))
    norm_a = math.sqrt(sum(x * x for x in candidate_embedding))
    norm_b = math.sqrt(sum(x * x for x in job_embedding))

    if norm_a == 0 or norm_b == 0:
        return 0

    cosine_similarity = dot / (norm_a * norm_b)
    # Clamp to [-1, 1] to handle floating-point drift
    cosine_similarity = max(-1.0, min(1.0, cosine_similarity))
    return max(0, min(100, round(cosine_similarity * 100)))


def calculate_overall_score(match_score: int, credibility_score: int, interview_score: int) -> int:
    """Weighted composite of all three scores."""
    return round(match_score * 0.30 + credibility_score * 0.20 + interview_score * 0.50)


ANALYSIS_SYSTEM = """You are an expert interviewer evaluating a job candidate. Analyze the interview transcript and return ONLY valid JSON with no other text, no markdown fences.

Return exactly this JSON structure:
{
  "answer_quality_score": integer 0-100,
  "communication_score": integer 0-100,
  "summary": "2-3 sentence plain English summary of the candidate's performance",
  "strengths": ["up to 3 strings"],
  "concerns": ["up to 3 strings"],
  "per_question": [
    {"question": "string", "score": integer 0-100, "notes": "one sentence"}
  ]
}"""


def analyze_interview(transcript: str, job_description: str) -> dict[str, Any]:
    """Send interview transcript to Claude for analysis."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    user_content = f"Job Description:\n{job_description}\n\nInterview Transcript:\n{transcript}"
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=ANALYSIS_SYSTEM,
        messages=[{"role": "user", "content": user_content}],
    )
    text = message.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return json.loads(text)
