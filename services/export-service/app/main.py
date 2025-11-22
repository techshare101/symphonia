from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
import aiohttp
import aiofiles
import tempfile
import os
import zipfile
from datetime import datetime

app = FastAPI(title="Symphonia Export Service", version="0.1")

class TrackExport(BaseModel):
    track_id: str
    storage_url: str
    metadata: Dict
    subtitles: Dict[str, List[Dict]]

class ExportRequest(BaseModel):
    setlist_id: str
    tracks: List[TrackExport]
    formats: List[str]  # m3u, srt, json, etc.
    callback_url: str

class ExportProgress(BaseModel):
    setlist_id: str
    status: str
    progress: int
    download_url: Optional[str] = None
    error: Optional[str] = None

# In-memory export progress tracking
EXPORT_STATUS: Dict[str, ExportProgress] = {}

async def generate_m3u(tracks: List[TrackExport], temp_dir: str) -> str:
    """Generate .m3u playlist file"""
    playlist_path = os.path.join(temp_dir, "setlist.m3u")
    async with aiofiles.open(playlist_path, "w") as f:
        await f.write("#EXTM3U\n")
        for track in tracks:
            duration = track.metadata.get("duration_sec", 0)
            await f.write(f"#EXTINF:{int(duration)},{track.metadata.get('title')}\n")
            await f.write(f"{track.storage_url}\n")
    return playlist_path

async def generate_srt(track: TrackExport, lang: str, temp_dir: str) -> str:
    """Generate .srt subtitle file for a track and language"""
    srt_path = os.path.join(temp_dir, f"{track.track_id}_{lang}.srt")
    async with aiofiles.open(srt_path, "w") as f:
        for i, sub in enumerate(track.subtitles.get(lang, []), 1):
            await f.write(f"{i}\n")
            await f.write(f"{sub['start']} --> {sub['end']}\n")
            await f.write(f"{sub['text']}\n\n")
    return srt_path

async def generate_json(tracks: List[TrackExport], temp_dir: str) -> str:
    """Generate JSON metadata file"""
    json_path = os.path.join(temp_dir, "metadata.json")
    metadata = {
        "exported_at": datetime.utcnow().isoformat(),
        "tracks": [
            {
                "id": t.track_id,
                "metadata": t.metadata,
                "analysis": {
                    "bpm": t.metadata.get("bpm"),
                    "key": t.metadata.get("key"),
                    "energy": t.metadata.get("energy"),
                    "genre": t.metadata.get("genre")
                }
            }
            for t in tracks
        ]
    }
    async with aiofiles.open(json_path, "w") as f:
        await f.write(json.dumps(metadata, indent=2))
    return json_path

async def process_export(
    request: ExportRequest,
    temp_dir: str,
    progress: ExportProgress
) -> str:
    """Process export request and return zip file path"""
    try:
        export_files = []
        total_steps = len(request.tracks) * len(request.formats)
        completed = 0

        # Generate files in parallel
        if "m3u" in request.formats:
            playlist_path = await generate_m3u(request.tracks, temp_dir)
            export_files.append(playlist_path)
            completed += 1
            progress.progress = int((completed / total_steps) * 100)

        # Generate subtitles for each track/language in parallel
        if "srt" in request.formats:
            subtitle_tasks = []
            for track in request.tracks:
                for lang in track.subtitles.keys():
                    task = generate_srt(track, lang, temp_dir)
                    subtitle_tasks.append(task)
            
            subtitle_files = await asyncio.gather(*subtitle_tasks)
            export_files.extend(subtitle_files)
            completed += len(subtitle_tasks)
            progress.progress = int((completed / total_steps) * 100)

        # Generate metadata JSON
        if "json" in request.formats:
            json_path = await generate_json(request.tracks, temp_dir)
            export_files.append(json_path)
            completed += 1
            progress.progress = int((completed / total_steps) * 100)

        # Create ZIP archive
        zip_path = os.path.join(temp_dir, f"export_{request.setlist_id}.zip")
        with zipfile.ZipFile(zip_path, "w") as zf:
            for file in export_files:
                zf.write(file, os.path.basename(file))

        # Clean up individual files
        for file in export_files:
            os.unlink(file)

        return zip_path

    except Exception as e:
        progress.status = "error"
        progress.error = str(e)
        raise

@app.post("/export")
async def start_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks
):
    """Start asynchronous export process"""
    progress = ExportProgress(
        setlist_id=request.setlist_id,
        status="processing",
        progress=0
    )
    EXPORT_STATUS[request.setlist_id] = progress

    # Create temporary directory
    temp_dir = tempfile.mkdtemp()

    async def export_and_callback():
        try:
            zip_path = await process_export(request, temp_dir, progress)

            # TODO: Upload ZIP to cloud storage
            download_url = "https://storage.example.com/exports/..." # placeholder

            # Update progress
            progress.status = "complete"
            progress.progress = 100
            progress.download_url = download_url

            # Notify callback
            async with aiohttp.ClientSession() as session:
                await session.post(request.callback_url, json=progress.dict())

        except Exception as e:
            progress.status = "error"
            progress.error = str(e)
            
            # Notify callback of error
            async with aiohttp.ClientSession() as session:
                await session.post(request.callback_url, json=progress.dict())
        finally:
            # Clean up temp directory
            import shutil
            shutil.rmtree(temp_dir)

    # Start export in background
    background_tasks.add_task(export_and_callback)

    return {
        "setlist_id": request.setlist_id,
        "status": "processing"
    }

@app.get("/export/{setlist_id}/status")
async def get_export_status(setlist_id: str):
    """Get export progress status"""
    if setlist_id not in EXPORT_STATUS:
        raise HTTPException(status_code=404, detail="Export not found")
    return EXPORT_STATUS[setlist_id]