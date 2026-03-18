import json
import os
import io
import anthropic
import pypdf
import docx
from typing import Any


def extract_text(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from PDF or DOCX bytes."""
    fname = filename.lower()
    if fname.endswith(".pdf"):
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages)
    elif fname.endswith(".docx"):
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        raise ValueError(f"Unsupported file type: {filename}")


PARSE_SYSTEM = """You are a CV parser. Extract structured data from the CV text and return ONLY valid JSON with no other text, no markdown code fences, no explanation.

Return exactly this JSON structure:
{
  "name": "string",
  "email": "string or null",
  "phone": "string or null",
  "skills": ["array", "of", "strings"],
  "languages": ["array", "of", "strings"],
  "education": [
    {"degree": "string", "institution": "string", "year": "string or null"}
  ],
  "experience": [
    {
      "company": "string",
      "role": "string",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null (null if current)",
      "duration_months": integer or null,
      "description": "one-sentence description"
    }
  ],
  "gaps": [
    {"start_date": "YYYY-MM", "end_date": "YYYY-MM", "duration_months": integer}
  ],
  "red_flags": ["array of strings describing anything suspicious"]
}"""


def parse_cv(raw_text: str) -> dict[str, Any]:
    """Send CV text to Claude and return parsed JSON."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=PARSE_SYSTEM,
        messages=[{"role": "user", "content": f"Parse this CV:\n\n{raw_text}"}],
    )
    text = message.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    return json.loads(text)


PROGRESSION_SYSTEM = """You are an HR analyst. Given a list of job experience entries, determine if the candidate's career shows upward progression (roles getting more senior over time). Return ONLY a JSON object: {"upward_progression": true} or {"upward_progression": false}. No other text."""


def check_career_progression(experience: list[dict]) -> bool:
    """Ask Claude whether the career shows upward progression."""
    if not experience or len(experience) < 2:
        return False
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=64,
        system=PROGRESSION_SYSTEM,
        messages=[{"role": "user", "content": json.dumps(experience)}],
    )
    text = message.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    result = json.loads(text)
    return result.get("upward_progression", False)
