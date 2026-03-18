"""OpenAI embedding generation."""

from __future__ import annotations

import os
import sys
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

_EMBEDDING_MODEL = "text-embedding-3-small"
_EMBEDDING_DIMENSIONS = 1536


def generate_embedding(text: str) -> list[float]:
    """Generate a 1536-dimensional embedding vector for the given text.

    Uses OpenAI's text-embedding-3-small model.

    Args:
        text: The input text to embed.

    Returns:
        A list of 1536 floats representing the embedding vector.

    Raises:
        RuntimeError: If the API call fails.
    """
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    try:
        # Replace newlines which can negatively affect embedding quality
        clean_text = text.replace("\n", " ").strip()
        response = client.embeddings.create(
            model=_EMBEDDING_MODEL,
            input=clean_text,
        )
        vector: list[float] = response.data[0].embedding
        return vector
    except Exception as exc:
        print(f"[embedding] Error generating embedding: {exc}", file=sys.stderr)
        raise RuntimeError(f"Failed to generate embedding: {exc}") from exc
