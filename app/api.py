from fastapi import APIRouter, HTTPException, Query
from app.config import CONFIG
from app.schemas import NoteResponse
from app.services import generate_note, is_ollama_running

router = APIRouter(prefix="/api")

_PROVIDERS      = CONFIG["providers"]
_DEFAULT_PROMPT = CONFIG["default_prompt"]
_DEFAULT_FORMAT = CONFIG["default_format"]


@router.get("/providers")
def get_providers() -> dict:
    return _PROVIDERS


@router.get("/ollama/status")
def ollama_status() -> dict:
    return {"running": is_ollama_running()}


@router.post("/get_note", response_model=NoteResponse)
def get_note(
    url:      str,
    lang:     str = "en",
    prompt:   str = _DEFAULT_PROMPT,
    provider: str = "ollama",
    model:    str | None = None,
    fmt:      str = Query(default=_DEFAULT_FORMAT, alias="format"),
) -> NoteResponse:
    if provider not in _PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    return NoteResponse(text=generate_note(url, lang, prompt, provider, model, fmt))
