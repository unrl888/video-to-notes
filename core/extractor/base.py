from abc import ABC, abstractmethod


class Extractor(ABC):
    @abstractmethod
    def get_subtitles(self) -> str:
        pass
