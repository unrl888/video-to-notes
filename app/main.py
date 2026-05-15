from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api import router
import os

app = FastAPI()
app.include_router(router)

web_dir = os.path.join(os.path.dirname(__file__), "web")
app.mount("/", StaticFiles(directory=web_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
