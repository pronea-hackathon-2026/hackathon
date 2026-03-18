import os
import openai


def embed(text: str) -> list[float]:
    """Generate a 1536-dim embedding using OpenAI text-embedding-3-small."""
    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],  # Trim to avoid token limits
    )
    return response.data[0].embedding
