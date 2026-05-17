from abc import ABC, abstractmethod
from collections.abc import Iterable


class LLM(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> Iterable:
        pass
