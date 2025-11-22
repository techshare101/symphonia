from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict
import asyncio
import aiohttp
import os

app = FastAPI(title="Symphonia Batch Controller", version="0.1")

# Service configuration
SERVICES = {
    "analyzer": {
        "url": os.getenv("ANALYZER_URL"),
        "token": os.getenv("ANALYZER_TOKEN"),
        "concurrency": 3  # max concurrent requests
    },
    "whisper": {
        "url": os.getenv("WHISPER_URL"),
        "token": os.getenv("WHISPER_TOKEN"),
        "concurrency": 2  # GPU-bound, lower concurrency
    },
    "gpt": {
        "url": os.getenv("GPT_URL"),
        "token": os.getenv("GPT_TOKEN"),
        "concurrency": 5  # API-bound, higher concurrency
    }
}

class BatchTrack(BaseModel):
    track_id: str
    storage_path: str
    signed_url: str

class BatchRequest(BaseModel):
    tracks: List[BatchTrack]
    callback_url: str  # Firebase Function to call with results

class ServiceResponse(BaseModel):
    track_id: str
    service: str
    success: bool
    data: Dict = {}
    error: str = ""

async def process_track(
    session: aiohttp.ClientSession,
    track: BatchTrack,
    service: str,
    semaphore: asyncio.Semaphore
) -> ServiceResponse:
    """Process a single track through a service with rate limiting"""
    config = SERVICES[service]
    
    async with semaphore:
        try:
            async with session.post(
                config["url"],
                headers={"Authorization": f"Bearer {config['token']}"},
                json={
                    "track_id": track.track_id,
                    "file_url": track.signed_url
                }
            ) as response:
                if response.status != 200:
                    return ServiceResponse(
                        track_id=track.track_id,
                        service=service,
                        success=False,
                        error=f"Service error: {await response.text()}"
                    )
                
                data = await response.json()
                return ServiceResponse(
                    track_id=track.track_id,
                    service=service,
                    success=True,
                    data=data
                )
        except Exception as e:
            return ServiceResponse(
                track_id=track.track_id,
                service=service,
                success=False,
                error=str(e)
            )

async def process_batch(
    tracks: List[BatchTrack],
    callback_url: str,
    background_tasks: BackgroundTasks
):
    """Process a batch of tracks through all services"""
    async with aiohttp.ClientSession() as session:
        # Create semaphores for rate limiting
        semaphores = {
            service: asyncio.Semaphore(config["concurrency"])
            for service, config in SERVICES.items()
        }
        
        # Process tracks through analysis pipeline
        for service in ["analyzer", "whisper", "gpt"]:
            tasks = [
                process_track(session, track, service, semaphores[service])
                for track in tracks
            ]
            
            # Wait for all tracks to complete current service
            results = await asyncio.gather(*tasks)
            
            # Report results back to Firebase
            async with session.post(
                callback_url,
                json={"service": service, "results": [r.dict() for r in results]}
            ) as response:
                if response.status != 200:
                    print(f"Callback error: {await response.text()}")

@app.post("/batch")
async def start_batch(
    req: BatchRequest,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None)
):
    """Start batch processing tracks"""
    # Verify services are configured
    for service, config in SERVICES.items():
        if not config["url"] or not config["token"]:
            raise HTTPException(
                status_code=500,
                detail=f"{service} service not configured"
            )
    
    # Start processing in background
    background_tasks.add_task(
        process_batch,
        req.tracks,
        req.callback_url,
        background_tasks
    )
    
    return {
        "message": f"Processing {len(req.tracks)} tracks",
        "batch_size": len(req.tracks)
    }