import json
import os


def _load() -> dict:
    path = os.path.join(os.path.dirname(__file__), "config.json")
    with open(path) as f:
        return json.load(f)


CONFIG = _load()
