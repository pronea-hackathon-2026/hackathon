import os
import httpx


DAILY_API = "https://api.daily.co/v1"


def create_room(application_id: str) -> str:
    """Create a Daily.co room and return the room URL."""
    api_key = os.environ.get("DAILY_API_KEY", "")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "name": f"interview-{application_id[:8]}",
        "properties": {
            "enable_recording": "cloud",
            "enable_chat": False,
            "max_participants": 2,
            "exp": int(__import__("time").time()) + 7 * 24 * 3600,  # 7 days
        },
    }
    with httpx.Client() as client:
        resp = client.post(f"{DAILY_API}/rooms", json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data["url"]
