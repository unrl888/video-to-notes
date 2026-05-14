from fastapi import APIRouter
from core.extractor.youtube import YouTube
# from core.analyzer.llm.anthropic import ClaudeLLM
from core.analyzer.llm.ollama import OllamaLLM


router = APIRouter()


@router.post("/get_note")
def get_note(url: str, lang="ru"):
    yt = YouTube(url, lang)
    text = yt.get_subtitles()
    ollama = OllamaLLM()
    return ollama.complete(
        "Проанализируй этот текст и верни краткую четкую выжимку"+text
        )
