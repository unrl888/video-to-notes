from fastapi import APIRouter, HTTPException, Query
from app.config import CONFIG
from app.services import generate_note, is_ollama_running, list_ollama_models
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api")

_PROVIDERS = CONFIG["providers"]
_PROMPTS = CONFIG["prompts"]
_DEFAULT_PROMPT = CONFIG["default_prompt"]
_DEFAULT_FORMAT = CONFIG["default_format"]


@router.get("/providers")
def get_providers() -> dict:
    return _PROVIDERS


@router.get("/prompts")
def get_prompts() -> dict:
    return _PROMPTS


@router.get("/ollama/status")
def ollama_status() -> dict:
    return {"running": is_ollama_running()}


@router.get("/ollama/models")
def get_ollama_models() -> list[str]:
    return list_ollama_models()


@router.post("/get_note")
def get_note(
    url: str,
    lang: str = "en",
    prompt: str = _DEFAULT_PROMPT,
    provider: str = "ollama",
    model: str | None = None,
    fmt: str = Query(default=_DEFAULT_FORMAT, alias="format"),
) -> StreamingResponse:
    if provider not in _PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    return StreamingResponse(
        generate_note(url, lang, prompt, provider, model, fmt),
        media_type="text/plain",
    )