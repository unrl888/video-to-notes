from core.extractor.subtitles import Subtitles
from core.storage.save_txt import SaverTXT


def main(url):
    sub = Subtitles(url, "ru")
    text = sub.get_text()
    s = SaverTXT("test")
    s.save(text)


if __name__ == "__main__":
    url = "https://www.youtube.com/watch?v=1c-dp71awsI"
    main(url)
