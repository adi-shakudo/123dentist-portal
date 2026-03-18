import json
import anthropic
from anthropic.types import TextBlock
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

_client = None


def client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


SCHEMA_PROMPT = """You are a technical writer converting plain-English task instructions into a structured JSON object.

Given the admin's raw instructions for a task, extract and return ONLY valid JSON with these exact fields:
{
  "what_to_provide": "clear description of what document/information the clinic must provide",
  "how_to_prepare": "step-by-step guidance on how to prepare or source it",
  "data_room_path": "the data room folder path (e.g. 'Financial Due Diligence > FD1 - Financial Statements') or null if not applicable",
  "due_week": "when it is due (e.g. 'Week 1', 'Week 3', 'Closing date') or null",
  "priority": "High, Medium, or Low"
}

Rules:
- Respond with valid JSON only, no markdown, no prose.
- If a field cannot be determined, use null.
- Keep language professional and clear for a dental clinic partner audience.
"""


def process_instructions(raw: str) -> dict:
    response = client().messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1024,
        system=SCHEMA_PROMPT,
        messages=[{"role": "user", "content": f"Raw instructions:\n\n{raw}"}],
    )
    block = next(b for b in response.content if isinstance(b, TextBlock))
    text = block.text.strip()

    # Strip markdown fences if present
    if "```" in text:
        for seg in text.split("```"):
            stripped = seg.lstrip("json").lstrip("JSON").strip()
            if stripped.startswith("{"):
                text = stripped
                break

    start, end = text.find("{"), text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    return json.loads(text)
