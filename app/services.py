import ollama as ollama_client
from core.analyzer.base import LLM
from core.analyzer.llm.anthropic import ClaudeLLM
from core.analyzer.llm.ollama import OllamaLLM
from core.extractor.youtube import YouTube
from app.config import CONFIG


def is_ollama_running() -> bool:
    try:
        ollama_client.list()
        return True
    except Exception:
        return False


def list_ollama_models() -> list[str]:
    try:
        return [m.model for m in ollama_client.list().models]
    except Exception:
        return []


def create_llm(provider: str, model: str | None) -> LLM:
    chosen = model or CONFIG["providers"][provider]["default"]
    if provider == "claude":
        return ClaudeLLM(model=chosen, max_tokens=CONFIG["providers"]["claude"]["max_tokens"])
    return OllamaLLM(model=chosen)


def build_prompt(prompt: str, fmt: str, lang: str) -> str:
    lang_name = CONFIG["lang_names"].get(lang.lower(), lang.upper())
    hint = CONFIG["format_hints"].get(fmt, "")
    instruction = f"Respond entirely in {lang_name}.\n{prompt}"
    return f"{instruction}\n{hint}\n\n" if hint else f"{instruction}\n\n"


def generate_note(
    url: str, lang: str, prompt: str,
    provider: str, model: str | None, fmt: str
):
    llm = create_llm(provider, model)
    text = YouTube(url, lang).get_subtitles()
    prompt = build_prompt(prompt, fmt, lang) + text
    for chunk in llm.complete(prompt):
        yield chunk
