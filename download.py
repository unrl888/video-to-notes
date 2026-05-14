import requests
from yt_dlp import YoutubeDL


class Subtitles:
    def __init__(self, url: str, lang: str):
        self.url = url
        self.lang = lang
        self._info = self.get_info_video()

    def get_info_video(self):
        with YoutubeDL() as ydl:
            info = ydl.extract_info(self.url, download=False)
        return info

    @property
    def sub_url(self):
        info = self._info
        return info["automatic_captions"][self.lang][0]["url"]

    def get_text(self):
        result = []
        text = requests.get(self.sub_url + "&fmt=json3").json()
        for event in text["events"]:
            if "segs" in event:
                line = "".join(
                    seg.get("utf8", "")
                    for seg in event["segs"]
                ).replace("\n", " ")
                result.append(line)
        return " ".join(result)
