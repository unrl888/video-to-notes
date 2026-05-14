import requests
from yt_dlp import YoutubeDL


class Subtitles:
    def __init__(self, url: str, lang: str):
        self.url = url
        self.lang = lang
        self._info = None

    @property
    def info(self):
        if self._info is None:
            self._info = self.get_info_video()
        return self._info

    def get_info_video(self):
        with YoutubeDL() as ydl:
            info = ydl.extract_info(self.url, download=False)
        return info

    @property
    def sub_url(self):
        return self.info["automatic_captions"][self.lang][0]["url"]

    def get_text(self) -> str:
        result = []
        data = requests.get(self.sub_url + "&fmt=json3").json()
        for event in data.get("events", []):
            if "segs" not in event:
                continue
            line = "".join(seg.get("utf8", "") for seg in event["segs"]).strip()
            if line:
                result.append(line)
        return "\n".join(result)
