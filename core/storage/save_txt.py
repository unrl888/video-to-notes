from base import Saver


class SaverTXT(Saver):
    def __init__(self, file_name: str):
        self.file_name = file_name

    def save(self, text: str):
        with open(f"{self.file_name}.txt", mode="w", encoding="utf-8") as file:
            file.write(text)
