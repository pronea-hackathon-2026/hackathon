"""Daily.co room creation and post-interview analysis."""

from __future__ import annotations

import json
import os
import sys
from typing import Any

import anthropic
import httpx
from dotenv import load_dotenv

load_dotenv()

_DAILY_API_BASE = "https://api.daily.co/v1"


# ---------------------------------------------------------------------------
# Daily.co room creation
# ---------------------------------------------------------------------------

def create_daily_room() -> str:
    """Create a new Daily.co video room and return its URL.

    Returns:
        The URL string for the newly created Daily.co room.

    Raises:
        RuntimeError: If the Daily.co API call fails.
    """
    daily_api_key = os.environ.get("DAILY_API_KEY")
    if not daily_api_key:
        raise RuntimeError("DAILY_API_KEY environment variable is not set")

    headers = {
        "Authorization": f"Bearer {daily_api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            f"{_DAILY_API_BASE}/rooms",
            headers=headers,
            json={},  # Use Daily.co defaults — auto-named ephemeral room
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()
        room_url: str = data["url"]
        return room_url
    except httpx.HTTPStatusError as exc:
        print(
            f"[interview] Daily.co API error {exc.response.status_code}: "
            f"{exc.response.text}",
            file=sys.stderr,
        )
        raise RuntimeError(
            f"Daily.co room creation failed: {exc.response.status_code}"
        ) from exc
    except Exception as exc:
        print(f"[interview] Unexpected error creating Daily.co room: {exc}", file=sys.stderr)
        raise RuntimeError(f"Daily.co room creation failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Post-interview analysis
# ---------------------------------------------------------------------------

def analyze_interview(
    transcript: str,
    attention_events: list[dict[str, Any]],
    job_description: str,
) -> dict[str, Any]:
    """Analyse a completed interview and return a comprehensive scoring dict.

    Steps:
        1. Send transcript + job_description to Claude for quality evaluation.
        2. Calculate attention_score from behavioural events.
        3. Compute composite interview_score.

    Args:
        transcript: Full interview transcript text.
        attention_events: List of attention event dicts, each having at least
            a "type" key (e.g. "phone_detected", "tab_switch", "window_blur",
            "gaze_away_extended").
        job_description: The job description the candidate was interviewed for.

    Returns:
        Dict containing:
            answer_quality_score, communication_score, attention_score,
            interview_score, summary, strengths, concerns, per_question
    """
    # -- Step 1: Claude evaluation -------------------------------------------
    claude_analysis = _evaluate_with_claude(transcript, job_description)

    answer_quality_score: int = claude_analysis.get("answer_quality_score", 0)
    communication_score: int = claude_analysis.get("communication_score", 0)

    # -- Step 2: Attention score from events ----------------------------------
    attention_score = _calculate_attention_score(attention_events)

    # -- Step 3: Composite interview score ------------------------------------
    interview_score = round(
        answer_quality_score * 0.4
        + communication_score * 0.3
        + attention_score * 0.3
    )
    interview_score = max(0, min(100, interview_score))

    return {
        "answer_quality_score": answer_quality_score,
        "communication_score": communication_score,
        "attention_score": attention_score,
        "interview_score": interview_score,
        "summary": claude_analysis.get("summary", ""),
        "strengths": claude_analysis.get("strengths", []),
        "concerns": claude_analysis.get("concerns", []),
        "per_question": claude_analysis.get("per_question", []),
    }


def _evaluate_with_claude(
    transcript: str,
    job_description: str,
) -> dict[str, Any]:
    """Send the interview transcript to Claude for structured evaluation."""
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    user_prompt = (
        f"You are evaluating a job interview. The job description is:\n\n"
        f"{job_description}\n\n"
        f"The interview transcript is:\n\n"
        f"{transcript}\n\n"
        f"Return a JSON object with exactly these fields:\n"
        f"- answer_quality_score: integer 0-100\n"
        f"- communication_score: integer 0-100\n"
        f"- summary: string summarising overall performance\n"
        f"- strengths: array of strings\n"
        f"- concerns: array of strings\n"
        f"- per_question: array of objects each with: "
        f"question (string), score (integer 0-100), notes (string)"
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system="you are an interview evaluator, return only valid JSON",
            messages=[{"role": "user", "content": user_prompt}],
        )
        response_text = message.content[0].text.strip()

        # Strip markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.splitlines()
            inner_lines = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
            response_text = "\n".join(inner_lines)

        return json.loads(response_text)
    except json.JSONDecodeError as exc:
        print(f"[interview] Claude returned invalid JSON: {exc}", file=sys.stderr)
        raise ValueError(f"Claude returned invalid JSON: {exc}") from exc
    except Exception as exc:
        print(f"[interview] Error calling Claude: {exc}", file=sys.stderr)
        raise


def _calculate_attention_score(events: list[dict[str, Any]]) -> int:
    """Calculate attention score from behavioural monitoring events.

    Starts at 100 and applies the following deductions:
        -20 per "phone_detected"
        -10 per "tab_switch"
        -10 per "window_blur"
        -5  per "gaze_away_extended"

    Args:
        events: List of event dicts, each with at least a "type" key.

    Returns:
        Integer attention score, floored at 0.
    """
    _DEDUCTIONS: dict[str, int] = {
        "phone_detected": 20,
        "tab_switch": 10,
        "window_blur": 10,
        "gaze_away_extended": 5,
    }

    score = 100
    for event in events:
        event_type = event.get("type", "")
        deduction = _DEDUCTIONS.get(event_type, 0)
        score -= deduction

    return max(0, score)
