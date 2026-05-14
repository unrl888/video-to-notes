from fastapi import APIRouter
from core.extractor.subtitles import Subtitles
# from core.analyzer.llm.anthropic import ClaudeLLM
from core.analyzer.llm.ollama import OllamaLLM


router = APIRouter()


@router.post("/get_note")
def get_note(url: str, lang="ru"):
    sub = Subtitles(url, lang)
    text = sub.get_text()
    ollama = OllamaLLM()
    return ollama.complete(
        "Проанализируй этот текст и верни краткую четкую выжимку"+text
        )
