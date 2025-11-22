from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import openai
import os

AUTH_TOKEN = os.getenv("AUTH_TOKEN", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

app = FastAPI(title="Symphonia GPT-5 Service", version="0.1")
openai.api_key = OPENAI_API_KEY

class Lyrics(BaseModel):
    start: float
    end: float
    text: str

class TranslateRequest(BaseModel):
    track_id: str
    lyrics: List[Lyrics]
    source_lang: str
    target_langs: List[str]

class TranslateResponse(BaseModel):
    track_id: str
    translations: Dict[str, List[Lyrics]]

class TrackMetadata(BaseModel):
    id: str
    title: str
    bpm: float
    key: str
    energy: float
    lyrics: List[Lyrics]

from .templates import get_template, list_templates, ArcTemplate

class GenerateArcRequest(BaseModel):
    tracks: List[TrackMetadata]
    template_name: str
    custom_stages: List[str] = []  # optional custom stage names

class GenerateArcResponse(BaseModel):
    ordered_track_ids: List[str]
    arc_description: str
    transition_notes: List[str]

TRANSLATION_PROMPT = """
You are a professional music translator. Translate the following lyrics while:
1. Preserving the musical meaning and emotion
2. Maintaining singable rhythm when possible
3. Using culturally appropriate expressions

Source Language: {source_lang}
Target Language: {target_lang}

Original Lyrics:
{lyrics}

Translate each line keeping the same timing markers.
"""

ARC_PROMPT = """
You are a professional DJ crafting a {template.name} set. Follow this template:

Description: {template.description}

Stages ({len(template.stages)}):
{stage_descriptions}

Energy Curve: {energy_curve}
BPM Ranges: {bpm_ranges}
Mood Targets: {mood_targets}

Available Tracks:
{tracks}

Arrange the tracks to:
1. Match each stage's energy level
2. Stay within BPM ranges
3. Hit mood targets
4. Create smooth key transitions
5. Tell a story through lyrics

Consider:
- Track energy levels vs stage targets
- BPM progression within ranges
- Key relationships for smooth mixing
- Lyrical themes matching stage moods
- Groove types and danceable moments

Provide:
1. Track order with stage assignments
2. Transition notes (energy shifts, key changes)
3. Stage-by-stage narrative description
"""

@app.post("/translate", response_model=TranslateResponse)
async def translate(
    req: TranslateRequest,
    authorization: str | None = Header(default=None)
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    if AUTH_TOKEN and authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        translations = {}
        for target_lang in req.target_langs:
            # Format lyrics for prompt
            lyrics_text = "\n".join(
                f"[{l.start:.2f} - {l.end:.2f}] {l.text}"
                for l in req.lyrics
            )

            # Call GPT-5
            response = openai.chat.completions.create(
                model="gpt-5",
                messages=[
                    {"role": "system", "content": TRANSLATION_PROMPT.format(
                        source_lang=req.source_lang,
                        target_lang=target_lang,
                        lyrics=lyrics_text
                    )}
                ],
                temperature=0.7,
            )

            # Parse response into timed lyrics
            translated_lyrics = []
            for line in response.choices[0].message.content.strip().split("\n"):
                if line.startswith("["):
                    timing, text = line.split("]", 1)
                    start, end = timing[1:].split(" - ")
                    translated_lyrics.append(Lyrics(
                        start=float(start),
                        end=float(end),
                        text=text.strip()
                    ))

            translations[target_lang] = translated_lyrics

        return TranslateResponse(
            track_id=req.track_id,
            translations=translations
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-arc", response_model=GenerateArcResponse)
async def generate_arc(
    req: GenerateArcRequest,
    authorization: str | None = Header(default=None)
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    if AUTH_TOKEN and authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Get template
        template = get_template(req.template_name)
        
        # Format stage descriptions
        stage_desc = "\n".join(
            f"{i+1}. {stage}: {template.stage_descriptions[stage]}"
            for i, stage in enumerate(template.stages)
        )
        
        # Format BPM ranges
        bpm_ranges = "\n".join(
            f"{stage}: {low}-{high} BPM"
            for stage, (low, high) in template.bpm_range.items()
        )
        
        # Format mood targets
        mood_targets = "\n".join(
            f"{stage}: Valence={mood['valence']:.1f}, Arousal={mood['arousal']:.1f}"
            for stage, mood in template.mood_targets.items()
        )
        
        # Format tracks with detailed features
        tracks_text = "\n".join(
            f"Track {i+1}:\n"
            f"Title: {t.title}\n"
            f"BPM: {t.bpm}\n"
            f"Key: {t.key}\n"
            f"Energy: {t.energy}\n"
            f"Mood: Valence={t.mood.valence:.1f}, Arousal={t.mood.arousal:.1f}\n"
            f"Groove: {t.groove.groove_type} (Swing={t.groove.swing_ratio:.2f})\n"
            f"Danceability: {t.danceable:.2f}\n"
            f"Dynamic Range: {t.dynamic_range:.2f}\n"
            f"Lyrics Sample: {t.lyrics[0].text if t.lyrics else 'No lyrics'}\n"
            for i, t in enumerate(req.tracks)
        )

        # Call GPT-5
        response = openai.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "system", "content": ARC_PROMPT.format(
                    arc_template=req.arc_template,
                    tracks=tracks_text
                )}
            ],
            temperature=0.8,
        )

        # Parse response
        lines = response.choices[0].message.content.strip().split("\n")
        arc_description = lines[0]
        ordered_ids = []
        transition_notes = []

        for line in lines[1:]:
            if line.startswith("Order:"):
                # Extract track indices and map to IDs
                indices = [int(i)-1 for i in line.split(":")[1].strip().split(",")]
                ordered_ids = [req.tracks[i].id for i in indices]
            elif line.startswith("Transition:"):
                transition_notes.append(line.split(":")[1].strip())

        return GenerateArcResponse(
            ordered_track_ids=ordered_ids,
            arc_description=arc_description,
            transition_notes=transition_notes
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))