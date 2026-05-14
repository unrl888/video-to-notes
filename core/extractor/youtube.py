import re
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi
from core.extractor.base import Extractor

_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


class YouTube(Extractor):
    def __init__(self, url: str, lang: str):
        self.url = url
        self.lang = lang
        self.video_id = self._extract_video_id(url)

    @staticmethod
    def _extract_video_id(url_or_id: str) -> str:
        if _VIDEO_ID_RE.match(url_or_id):
            return url_or_id

        parsed = urlparse(url_or_id)
        host = parsed.netloc.lower().removeprefix("www.")

        if host == "youtu.be":
            candidate = parsed.path.lstrip("/").split("/", 1)[0]
            if _VIDEO_ID_RE.match(candidate):
                return candidate

        if host in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
            if parsed.path == "/watch":
                candidate = parse_qs(parsed.query).get("v", [""])[0]
                if _VIDEO_ID_RE.match(candidate):
                    return candidate

            parts = parsed.path.strip("/").split("/")
            if len(parts) >= 2 and parts[0] in {"embed", "shorts", "v", "live"}:
                if _VIDEO_ID_RE.match(parts[1]):
                    return parts[1]

        raise ValueError(f"Не удалось извлечь YouTube video_id из: {url_or_id!r}")

    def get_subtitles(self) -> str:
        transcript = YouTubeTranscriptApi().fetch(
            self.video_id, languages=[self.lang]
        )
        return " ".join(snippet.text for snippet in transcript)
