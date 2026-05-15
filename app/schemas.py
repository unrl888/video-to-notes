from pydantic import BaseModel


class NoteResponse(BaseModel):
    text: str
