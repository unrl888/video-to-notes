from abc import ABC, abstractmethod


class Saver(ABC):

    @abstractmethod
    def save(self, text: str):
        pass
