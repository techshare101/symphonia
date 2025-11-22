from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, AnyHttpUrl
import librosa, numpy as np
import requests, io, os

AUTH_TOKEN = os.getenv("AUTH_TOKEN", "")  # simple bearer token

app = FastAPI(title="Symphonia Audio Analyzer", version="0.1")

class AnalyzeRequest(BaseModel):
    file_url: AnyHttpUrl   # signed GCS URL or any HTTPS
    track_id: str          # Firestore doc id (for logging / trace)
    sample_rate: int = 22050

class GrooveFeatures(BaseModel):
    groove_type: str  # straight, swing, shuffle
    swing_ratio: float
    beat_positions: list[float]
    downbeat_positions: list[float]

class MoodFeatures(BaseModel):
    valence: float    # emotional positivity
    arousal: float    # energy/intensity
    tension: float    # harmonic tension
    brightness: float # timbral brightness

class GenreFeatures(BaseModel):
    primary_genre: str
    genre_probs: Dict[str, float]
    sub_genres: List[str]

class MixingFeatures(BaseModel):
    cue_points: List[float]  # good mixing points
    phrase_length: int      # bars in main phrase
    mix_in_start: float    # best mix-in point
    mix_out_end: float     # best mix-out point
    compatible_keys: List[str]  # harmonically compatible keys

class AdvancedSpectralFeatures(BaseModel):
    mfcc: List[float]       # Mel-frequency cepstral coefficients
    chroma: List[float]     # Chromagram
    spectral_flux: float
    spectral_novelty: float

class AnalyzeResponse(BaseModel):
    # Basic features
    track_id: str
    bpm: float
    key: str
    key_confidence: float
    energy_rms: float
    duration_sec: float
    
    # Rhythm features
    onset_times: list[float]
    tempo_confidence: float
    groove: GrooveFeatures
    
    # Spectral features
    spectral_centroid: float
    spectral_rolloff: float
    zero_crossing_rate: float
    spectral_contrast: list[float]
    spectral_bandwidth: float
    spectral_flatness: float
    
    # Harmonic/Percussive features
    harmonic_energy: float
    percussive_energy: float
    h_p_energy_ratio: float
    
    # High-level features
    mood: MoodFeatures
    danceable: float
    dynamic_range: float

def estimate_key(y, sr):
    # crude key estimation via chroma + Krumhansl profile correlation
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)

    # 12 pitch classes; major/minor Krumhansl profiles (normalized)
    major_profile = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
    minor_profile = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
    major_profile /= major_profile.sum()
    minor_profile /= minor_profile.sum()

    # Rotate profiles for all 12 keys and compute cosine similarity
    def rotate(a, n): return np.roll(a, n)
    best = (None, -1, "major")
    for tonic in range(12):
        for mode_name, profile in [("major", major_profile), ("minor", minor_profile)]:
            prof = rotate(profile, tonic)
            sim = np.dot(chroma_mean/np.linalg.norm(chroma_mean), prof/np.linalg.norm(prof))
            if sim > best[1]:
                best = (tonic, sim, mode_name)

    pitch_classes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
    key = f"{pitch_classes[best[0]]} {best[2]}"
    return key, float(best[1])

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, authorization: str | None = Header(default=None)):
    # Simple auth
    if AUTH_TOKEN and authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # download audio
    r = requests.get(str(req.file_url), timeout=120)
    if r.status_code != 200:
        raise HTTPException(status_code=400, detail="Unable to fetch file_url")

    # load with librosa
    data = io.BytesIO(r.content)
    try:
        y, sr = librosa.load(data, sr=req.sample_rate, mono=True)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Audio load error: {e}")

    duration = librosa.get_duration(y=y, sr=sr)

    # tempo (bpm)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo)

    # energy (RMS)
    rms = librosa.feature.rms(y=y)
    energy = float(np.mean(rms))

    # Advanced rhythm analysis
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
    tempo_conf = np.mean(librosa.feature.rms(y=y[librosa.frames_to_samples(beats)])[0])
    
    # Beat and downbeat detection
    _, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units='frames')
    beat_times = librosa.frames_to_time(beat_frames)
    
    # Estimate downbeats (every 4th beat as approximation)
    downbeat_frames = beat_frames[::4]
    downbeat_times = librosa.frames_to_time(downbeat_frames)
    
    # Groove analysis
    ibi = np.diff(beat_times)  # inter-beat intervals
    swing_ratio = np.mean(ibi[::2]) / np.mean(ibi[1::2]) if len(ibi) > 2 else 1.0
    
    # Determine groove type
    if 1.7 < swing_ratio < 2.3:  # typical swing ratio range
        groove_type = "swing"
    elif 1.3 < swing_ratio < 1.7:  # subtle shuffle
        groove_type = "shuffle"
    else:
        groove_type = "straight"
    
    # Onset detection
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
    
    # Harmonic-percussive source separation
    y_harmonic, y_percussive = librosa.effects.hpss(y)
    h_energy = np.mean(librosa.feature.rms(y=y_harmonic)[0])
    p_energy = np.mean(librosa.feature.rms(y=y_percussive)[0])
    hp_ratio = h_energy / p_energy if p_energy > 0 else float('inf')
    
    # Advanced spectral features
    spec_cent = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0])
    spec_rolloff = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)[0])
    spec_bw = np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)[0])
    spec_flat = np.mean(librosa.feature.spectral_flatness(y=y)[0])
    spec_contrast = np.mean(librosa.feature.spectral_contrast(y=y, sr=sr), axis=1)
    zcr = np.mean(librosa.feature.zero_crossing_rate(y)[0])
    
    # Mood estimation from audio features
    # Map spectral and energy features to valence-arousal space
    valence = (spec_cent / 4000) * 0.5 + (h_energy / (h_energy + p_energy)) * 0.5
    arousal = p_energy * 0.6 + (spec_rolloff / (sr/2)) * 0.4
    tension = spec_flat * -0.5 + (spec_contrast.max() - spec_contrast.min()) * 0.5
    brightness = spec_rolloff / (sr/2)
    
    # Danceability estimation
    # Combine tempo stability, beat strength, and rhythmic regularity
    tempo_stability = 1.0 - np.std(np.diff(beat_times)) / np.mean(np.diff(beat_times))
    beat_strength = np.mean(onset_env[beat_frames]) / np.mean(onset_env)
    danceable = (tempo_stability * 0.4 + beat_strength * 0.6) * \
                (1.0 if 110 <= tempo <= 130 else 0.8)  # optimal dance tempo range
    
    # Dynamic range
    frame_length = 2048
    hop_length = 512
    rms_frames = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    dynamic_range = np.percentile(rms_frames, 95) - np.percentile(rms_frames, 5)
    
    # Genre detection using MFCCs and spectral features
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = np.mean(mfcc, axis=1)
    
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)
    
    flux = np.mean(librosa.onset.onset_strength(y=y, sr=sr))
    novelty = np.mean(librosa.onset.onset_strength(
        y=y, sr=sr,
        feature=librosa.feature.spectral_novelty
    ))
    
    # Mixing point detection
    # Find strong beats that align with phrase boundaries
    _, beats = librosa.beat.beat_track(y=y, sr=sr, units='frames')
    beat_times = librosa.frames_to_time(beats)
    
    # Estimate phrase length (usually 8, 16, or 32 beats)
    frame_size = 8
    while frame_size <= 32:
        beat_frames = librosa.util.frame(
            beats,
            frame_length=frame_size,
            hop_length=frame_size
        )
        if len(beat_frames) < 4:  # Need at least 4 phrases
            break
        frame_size *= 2
    phrase_length = frame_size // 2
    
    # Find best mix points at phrase boundaries with strong beats
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    beat_strengths = onset_env[beats]
    strong_beats = beat_times[beat_strengths > np.mean(beat_strengths) + np.std(beat_strengths)]
    
    # Align with phrase boundaries
    cue_points = []
    for beat in strong_beats:
        phrase_pos = int(beat * bpm / 60) % phrase_length
        if phrase_pos < 2 or phrase_pos > phrase_length - 2:
            cue_points.append(float(beat))
    
    # Get compatible keys
    camelot_wheel = {
        'C major': ['G major', 'F major', 'A minor'],
        'G major': ['D major', 'C major', 'E minor'],
        # ... (add all key relationships)
    }
    compatible_keys = camelot_wheel.get(key, [])
    
    # Genre detection (simplified example)
    genre_classifier = {
        'house': lambda: spec_cent > 3000 and 120 <= bpm <= 130,
        'techno': lambda: spec_flat > 0.8 and 125 <= bpm <= 140,
        'trance': lambda: spec_contrast.max() > 0.9 and 130 <= bpm <= 150,
        'ambient': lambda: spec_cent < 2000 and energy < 0.4,
        'dnb': lambda: 160 <= bpm <= 180 and p_energy > h_energy,
    }
    
    genre_scores = {}
    sub_genres = []
    for genre, check in genre_classifier.items():
        if check():
            score = np.random.uniform(0.7, 1.0)  # Replace with real scoring
            genre_scores[genre] = score
            if score > 0.8:
                sub_genres.append(genre)
    
    primary_genre = max(genre_scores.items(), key=lambda x: x[1])[0] if genre_scores else 'unknown'
    
    # Key detection
    key, key_conf = estimate_key(y, sr)
    
    return AnalyzeResponse(
        track_id=req.track_id,
        bpm=float(tempo),
        key=key,
        key_confidence=key_conf,
        energy_rms=energy,
        duration_sec=float(duration),
        # New features
        onset_times=onset_times.tolist(),
        spectral_centroid=float(spec_cent),
        spectral_rolloff=float(spec_rolloff),
        zero_crossing_rate=float(zcr),
        tempo_confidence=float(tempo_conf)
    )
