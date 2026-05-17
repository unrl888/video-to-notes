import os
import anthropic
from core.analyzer.base import LLM
from dotenv import load_dotenv


class ClaudeLLM(LLM):
    def __init__(self, model: str = "claude-sonnet-4-5", max_tokens: int = 1024):
        load_dotenv()
        self.client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
            )
        self.model = model
        self.max_tokens = max_tokens

    def complete(self, prompt: str):
        with self.client.messages.stream(
            model=self.model,
            max_tokens=self.max_tokens,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            yield from stream.text_stream
