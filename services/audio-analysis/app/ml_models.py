import tensorflow as tf
import numpy as np
import librosa
from typing import Dict, List, Tuple

class GenreClassifier:
    def __init__(self, model_path: str = 'models/genre_classifier'):
        self.model = tf.keras.models.load_model(model_path)
        self.genres = [
            'techno', 'house', 'trance', 'ambient',
            'dnb', 'minimal', 'progressive', 'dub'
        ]

    def extract_features(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Extract features for genre classification"""
        # Mel spectrograms
        mel_spec = librosa.feature.melspectrogram(
            y=y, sr=sr, n_mels=128,
            fmax=8000, hop_length=512
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Chromagram
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        
        # Rhythm features
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        
        # Stack features
        features = np.concatenate([
            mel_spec_db.flatten()[:1024],  # First 1024 mel features
            chroma.flatten()[:128],        # Chromagram
            spectral_centroids[:128],      # Spectral features
            spectral_rolloff[:128],
            [tempo],                       # Rhythm features
            onset_env[:128]
        ])
        
        return features.reshape(1, -1)

    def predict(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Predict genre probabilities"""
        features = self.extract_features(y, sr)
        probs = self.model.predict(features)[0]
        return dict(zip(self.genres, probs.tolist()))

class MoodClassifier:
    def __init__(self, model_path: str = 'models/mood_classifier'):
        self.model = tf.keras.models.load_model(model_path)
        
    def predict(self, y: np.ndarray, sr: int) -> Dict[str, float]:
        """Predict valence/arousal values"""
        # Extract features similar to genre classifier
        mel_spec = librosa.feature.melspectrogram(y=y, sr=sr)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Additional features for mood
        spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Stack features
        features = np.concatenate([
            mel_spec_db.flatten()[:1024],
            spectral_contrast.flatten()[:128],
            mfcc.flatten()[:128]
        ])
        
        # Predict valence/arousal
        pred = self.model.predict(features.reshape(1, -1))[0]
        return {
            'valence': float(pred[0]),  # Emotional positivity
            'arousal': float(pred[1])   # Energy/intensity
        }

class MixingPointDetector:
    def __init__(self, model_path: str = 'models/mix_point_detector'):
        self.model = tf.keras.models.load_model(model_path)
        
    def find_mix_points(
        self,
        y: np.ndarray,
        sr: int,
        min_spacing: float = 16.0  # Minimum seconds between mix points
    ) -> List[Dict[str, float]]:
        """Find optimal mixing points in the track"""
        # Segment track into 8-beat windows
        _, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
        segments = []
        
        for i in range(0, len(beats)-8, 8):
            segment_start = beats[i]
            segment_end = beats[i+8]
            
            # Get audio for this segment
            start_idx = int(segment_start * sr)
            end_idx = int(segment_end * sr)
            segment = y[start_idx:end_idx]
            
            # Extract features
            rms = librosa.feature.rms(y=segment)[0]
            onset_env = librosa.onset.onset_strength(y=segment, sr=sr)
            spec_cent = librosa.feature.spectral_centroid(y=segment, sr=sr)[0]
            
            segments.append({
                'start': segment_start,
                'end': segment_end,
                'features': np.concatenate([
                    rms, onset_env, spec_cent
                ])
            })
        
        # Predict mix point quality for each segment
        mix_points = []
        for seg in segments:
            quality = self.model.predict(
                seg['features'].reshape(1, -1)
            )[0][0]
            
            if quality > 0.7:  # Only keep good mix points
                mix_points.append({
                    'time': seg['start'],
                    'quality': float(quality)
                })
        
        # Filter points too close together
        filtered_points = []
        last_point = -min_spacing
        for point in sorted(mix_points, key=lambda x: -x['quality']):
            if point['time'] - last_point >= min_spacing:
                filtered_points.append(point)
                last_point = point['time']
        
        return filtered_points

def load_models() -> Tuple[GenreClassifier, MoodClassifier, MixingPointDetector]:
    """Load all ML models"""
    return (
        GenreClassifier(),
        MoodClassifier(),
        MixingPointDetector()
    )