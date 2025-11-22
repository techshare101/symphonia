import tensorflow as tf
import numpy as np
import librosa
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from pathlib import Path
import json
import logging
from typing import Dict, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GenreClassifierTrainer:
    def __init__(
        self,
        data_path: str,
        model_path: str,
        config_path: str = "config/genre_classifier.json"
    ):
        self.data_path = Path(data_path)
        self.model_path = Path(model_path)
        
        # Load configuration
        with open(config_path) as f:
            self.config = json.load(f)
        
        self.feature_config = self.config["features"]
        self.model_config = self.config["model"]
        
        # Initialize label encoder
        self.label_encoder = LabelEncoder()

    def extract_features(self, audio_path: str) -> np.ndarray:
        """Extract audio features for genre classification"""
        y, sr = librosa.load(
            audio_path,
            sr=self.feature_config["sample_rate"],
            duration=self.feature_config["duration"]
        )
        
        # Mel spectrogram
        mel_spec = librosa.feature.melspectrogram(
            y=y,
            sr=sr,
            n_mels=self.feature_config["n_mels"],
            fmax=self.feature_config["fmax"]
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Chromagram
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        
        # Rhythm features
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        
        # Stack and normalize features
        features = np.concatenate([
            mel_spec_db.flatten()[:1024],
            chroma.flatten()[:128],
            spectral_centroids[:128],
            spectral_rolloff[:128],
            [tempo],
            onset_env[:128]
        ])
        
        return features

    def build_model(self, input_shape: int, num_classes: int) -> tf.keras.Model:
        """Build genre classifier model"""
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(512, input_shape=(input_shape,)),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.Dropout(0.3),
            
            tf.keras.layers.Dense(256),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.Dropout(0.3),
            
            tf.keras.layers.Dense(128),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.Dropout(0.3),
            
            tf.keras.layers.Dense(num_classes, activation='softmax')
        ])
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(
                learning_rate=self.model_config["learning_rate"]
            ),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model

    def train(self) -> tf.keras.Model:
        """Train genre classifier model"""
        logger.info("Loading dataset...")
        
        # Load dataset (CSV with audio_path and genre columns)
        df = pd.read_csv(self.data_path / "metadata.csv")
        
        # Extract features
        X = []
        y = []
        for _, row in df.iterrows():
            try:
                features = self.extract_features(
                    self.data_path / row["audio_path"]
                )
                X.append(features)
                y.append(row["genre"])
            except Exception as e:
                logger.warning(f"Error processing {row['audio_path']}: {e}")
        
        X = np.array(X)
        y = self.label_encoder.fit_transform(y)
        
        # Split dataset
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.model_config["test_size"],
            random_state=42
        )
        
        # Build and train model
        model = self.build_model(X.shape[1], len(self.label_encoder.classes_))
        
        logger.info("Training model...")
        history = model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=self.model_config["epochs"],
            batch_size=self.model_config["batch_size"],
            callbacks=[
                tf.keras.callbacks.EarlyStopping(
                    patience=5,
                    restore_best_weights=True
                )
            ]
        )
        
        # Save model and metadata
        logger.info("Saving model...")
        model.save(self.model_path / "genre_classifier")
        
        # Save label encoder classes
        with open(self.model_path / "genre_classes.json", "w") as f:
            json.dump(
                {
                    "classes": self.label_encoder.classes_.tolist(),
                    "config": self.config
                },
                f
            )
        
        return model, history

class MoodClassifierTrainer:
    def __init__(
        self,
        data_path: str,
        model_path: str,
        config_path: str = "config/mood_classifier.json"
    ):
        self.data_path = Path(data_path)
        self.model_path = Path(model_path)
        
        # Load configuration
        with open(config_path) as f:
            self.config = json.load(f)
        
        self.feature_config = self.config["features"]
        self.model_config = self.config["model"]

    def extract_features(self, audio_path: str) -> np.ndarray:
        """Extract audio features for mood classification"""
        y, sr = librosa.load(
            audio_path,
            sr=self.feature_config["sample_rate"],
            duration=self.feature_config["duration"]
        )
        
        # Mel spectrogram with more frequency resolution
        mel_spec = librosa.feature.melspectrogram(
            y=y,
            sr=sr,
            n_mels=128,
            fmax=8000
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        
        # Spectral contrast (for emotional content)
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
        
        # MFCC (for timbre)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Stack features
        features = np.concatenate([
            mel_spec_db.flatten()[:1024],
            contrast.flatten()[:128],
            mfcc.flatten()[:128]
        ])
        
        return features

    def build_model(self, input_shape: int) -> tf.keras.Model:
        """Build mood classifier model (predicts valence/arousal)"""
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(512, input_shape=(input_shape,)),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.Dropout(0.3),
            
            tf.keras.layers.Dense(256),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.Dropout(0.3),
            
            tf.keras.layers.Dense(2, activation='sigmoid')  # Valence, Arousal
        ])
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(
                learning_rate=self.model_config["learning_rate"]
            ),
            loss='mse',
            metrics=['mae']
        )
        
        return model

    def train(self) -> Tuple[tf.keras.Model, Dict]:
        """Train mood classifier model"""
        logger.info("Loading dataset...")
        
        # Load dataset (CSV with audio_path, valence, arousal columns)
        df = pd.read_csv(self.data_path / "mood_metadata.csv")
        
        # Extract features
        X = []
        y = []
        for _, row in df.iterrows():
            try:
                features = self.extract_features(
                    self.data_path / row["audio_path"]
                )
                X.append(features)
                y.append([row["valence"], row["arousal"]])
            except Exception as e:
                logger.warning(f"Error processing {row['audio_path']}: {e}")
        
        X = np.array(X)
        y = np.array(y)
        
        # Split dataset
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.model_config["test_size"],
            random_state=42
        )
        
        # Build and train model
        model = self.build_model(X.shape[1])
        
        logger.info("Training model...")
        history = model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=self.model_config["epochs"],
            batch_size=self.model_config["batch_size"],
            callbacks=[
                tf.keras.callbacks.EarlyStopping(
                    patience=5,
                    restore_best_weights=True
                )
            ]
        )
        
        # Save model and configuration
        logger.info("Saving model...")
        model.save(self.model_path / "mood_classifier")
        
        with open(self.model_path / "mood_config.json", "w") as f:
            json.dump(self.config, f)
        
        return model, history

def main():
    """Train all models"""
    # Configure paths
    base_path = Path("ml_data")
    model_path = Path("models")
    model_path.mkdir(exist_ok=True)
    
    # Train genre classifier
    genre_trainer = GenreClassifierTrainer(
        base_path / "genre_dataset",
        model_path
    )
    genre_model, genre_history = genre_trainer.train()
    
    # Train mood classifier
    mood_trainer = MoodClassifierTrainer(
        base_path / "mood_dataset",
        model_path
    )
    mood_model, mood_history = mood_trainer.train()
    
    logger.info("Training complete!")

if __name__ == "__main__":
    main()