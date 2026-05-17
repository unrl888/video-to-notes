from core.analyzer.base import LLM
import ollama


class OllamaLLM(LLM):
    def __init__(self, model: str = "qwen2.5:7b"):
        self.model = model

    def complete(self, prompt: str) -> str:
        response = ollama.generate(self.model, prompt)
        return response['response']

    def get_running_models(self):
        return ollama.ps()

    def get_list_models(self) -> list:
        return ollama.list()
