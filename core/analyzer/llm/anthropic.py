import os
import anthropic
from base import LLM
from dotenv import load_dotenv


class ClaudeLLM(LLM):
    def __init__(self, model: str = "claude-sonnet-4-5"):
        load_dotenv()
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = model

    def generate(self, prompt: str):
        message = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
