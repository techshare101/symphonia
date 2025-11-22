from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, AnyHttpUrl
import whisper, torch
import requests, io, os
from typing import List
import numpy as np

AUTH_TOKEN = os.getenv("AUTH_TOKEN", "")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = FastAPI(title="Symphonia Lyrics Service", version="0.1")

# Load Whisper model at startup (cached)
model = whisper.load_model("medium", device=DEVICE)

class TimedText(BaseModel):
    start: float
    end: float
    text: str

class TranscribeRequest(BaseModel):
    file_url: AnyHttpUrl
    track_id: str
    language: str = "en"  # source language hint

class TranscribeResponse(BaseModel):
    track_id: str
    language: str
    segments: List[TimedText]
    full_text: str

@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE}

@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(req: TranscribeRequest, authorization: str | None = Header(default=None)):
    if AUTH_TOKEN and authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Download audio
        r = requests.get(str(req.file_url), timeout=120)
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail="Unable to fetch file_url")

        # Load audio
        audio_data = io.BytesIO(r.content)
        
        # Transcribe with Whisper
        result = model.transcribe(
            audio_data,
            language=req.language,
            task="transcribe",
            fp16=torch.cuda.is_available()
        )

        # Format response
        segments = [
            TimedText(
                start=seg["start"],
                end=seg["end"],
                text=seg["text"].strip()
            )
            for seg in result["segments"]
        ]

        return TranscribeResponse(
            track_id=req.track_id,
            language=result["language"],
            segments=segments,
            full_text=result["text"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))