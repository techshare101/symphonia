import mlflow
import mlflow.tensorflow
import tensorflow as tf
import numpy as np
from pathlib import Path
import json
import yaml
from typing import Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ExperimentManager:
    def __init__(
        self,
        experiment_name: str,
        config_path: str,
        tracking_uri: Optional[str] = None
    ):
        self.experiment_name = experiment_name
        
        # Load configuration
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
        
        # Set up MLflow
        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)
        
        mlflow.set_experiment(experiment_name)
        
        # Set up metrics
        self.metrics = {
            "train_loss": [],
            "val_loss": [],
            "train_metrics": {},
            "val_metrics": {}
        }

    def log_hyperparameters(self, params: Dict[str, Any]):
        """Log hyperparameters to MLflow"""
        mlflow.log_params(params)

    def log_metrics(self, metrics: Dict[str, float], step: int):
        """Log metrics to MLflow"""
        mlflow.log_metrics(metrics, step)

    def log_model(self, model: tf.keras.Model, artifacts: Dict[str, str]):
        """Log model and artifacts to MLflow"""
        mlflow.tensorflow.log_model(model, "model")
        
        for name, path in artifacts.items():
            mlflow.log_artifact(path, name)

    def create_checkpoint_callback(
        self,
        model_dir: str,
        monitor: str = "val_loss",
        mode: str = "min"
    ) -> tf.keras.callbacks.ModelCheckpoint:
        """Create checkpoint callback"""
        return tf.keras.callbacks.ModelCheckpoint(
            filepath=str(Path(model_dir) / "model-{epoch:02d}-{val_loss:.2f}.h5"),
            monitor=monitor,
            mode=mode,
            save_best_only=True,
            save_weights_only=False
        )

    def create_mlflow_callback(self) -> tf.keras.callbacks.Callback:
        """Create MLflow callback for logging during training"""
        class MLflowCallback(tf.keras.callbacks.Callback):
            def on_epoch_end(self, epoch: int, logs: Dict[str, float] = None):
                if logs:
                    mlflow.log_metrics(logs, step=epoch)

        return MLflowCallback()

    def train_with_crossval(
        self,
        model_fn,
        train_data: tuple,
        n_folds: int = 5,
        **train_kwargs
    ):
        """Train with cross-validation"""
        X, y = train_data
        fold_size = len(X) // n_folds
        
        fold_metrics = []
        
        with mlflow.start_run():
            self.log_hyperparameters(train_kwargs)
            
            for fold in range(n_folds):
                logger.info(f"Training fold {fold + 1}/{n_folds}")
                
                # Create fold indices
                val_start = fold * fold_size
                val_end = (fold + 1) * fold_size
                
                train_idx = list(range(0, val_start)) + list(range(val_end, len(X)))
                val_idx = list(range(val_start, val_end))
                
                # Split data
                X_train = X[train_idx]
                y_train = y[train_idx]
                X_val = X[val_idx]
                y_val = y[val_idx]
                
                # Create and train model
                model = model_fn()
                history = model.fit(
                    X_train, y_train,
                    validation_data=(X_val, y_val),
                    callbacks=[
                        self.create_mlflow_callback(),
                        self.create_checkpoint_callback(f"models/fold_{fold}")
                    ],
                    **train_kwargs
                )
                
                # Store fold metrics
                fold_metrics.append({
                    "val_loss": min(history.history["val_loss"]),
                    "val_accuracy": max(history.history["val_accuracy"])
                })
                
                # Log fold metrics
                mlflow.log_metrics({
                    f"fold_{fold}_val_loss": fold_metrics[-1]["val_loss"],
                    f"fold_{fold}_val_accuracy": fold_metrics[-1]["val_accuracy"]
                })
            
            # Log average metrics
            avg_metrics = {
                "avg_val_loss": np.mean([m["val_loss"] for m in fold_metrics]),
                "avg_val_accuracy": np.mean([m["val_accuracy"] for m in fold_metrics]),
                "std_val_loss": np.std([m["val_loss"] for m in fold_metrics]),
                "std_val_accuracy": np.std([m["val_accuracy"] for m in fold_metrics])
            }
            
            mlflow.log_metrics(avg_metrics)
            
            return fold_metrics

    def train_with_ensembling(
        self,
        model_fns,
        train_data: tuple,
        **train_kwargs
    ):
        """Train ensemble of models"""
        X_train, y_train = train_data
        
        ensemble_models = []
        ensemble_metrics = []
        
        with mlflow.start_run():
            self.log_hyperparameters(train_kwargs)
            
            for i, model_fn in enumerate(model_fns):
                logger.info(f"Training model {i + 1}/{len(model_fns)}")
                
                # Create and train model
                model = model_fn()
                history = model.fit(
                    X_train, y_train,
                    callbacks=[
                        self.create_mlflow_callback(),
                        self.create_checkpoint_callback(f"models/ensemble_{i}")
                    ],
                    **train_kwargs
                )
                
                ensemble_models.append(model)
                ensemble_metrics.append({
                    "val_loss": min(history.history["val_loss"]),
                    "val_accuracy": max(history.history["val_accuracy"])
                })
                
                # Log individual model metrics
                mlflow.log_metrics({
                    f"model_{i}_val_loss": ensemble_metrics[-1]["val_loss"],
                    f"model_{i}_val_accuracy": ensemble_metrics[-1]["val_accuracy"]
                })
            
            # Create ensemble model
            class EnsembleModel(tf.keras.Model):
                def __init__(self, models):
                    super().__init__()
                    self.models = models
                
                def call(self, inputs):
                    # Average predictions
                    predictions = [model(inputs) for model in self.models]
                    return tf.reduce_mean(predictions, axis=0)
            
            ensemble = EnsembleModel(ensemble_models)
            
            # Save ensemble model
            ensemble.save("models/ensemble")
            mlflow.tensorflow.log_model(ensemble, "ensemble_model")
            
            return ensemble, ensemble_metrics

    def hyperparameter_search(
        self,
        model_fn,
        train_data: tuple,
        param_grid: Dict[str, list],
        **train_kwargs
    ):
        """Perform grid search for hyperparameters"""
        from itertools import product
        
        # Generate parameter combinations
        param_names = list(param_grid.keys())
        param_values = list(product(*param_grid.values()))
        
        best_params = None
        best_val_loss = float('inf')
        
        for values in param_values:
            params = dict(zip(param_names, values))
            logger.info(f"Training with parameters: {params}")
            
            # Update training kwargs
            current_kwargs = {**train_kwargs, **params}
            
            # Train and evaluate
            with mlflow.start_run():
                self.log_hyperparameters(params)
                
                model = model_fn()
                history = model.fit(
                    *train_data,
                    callbacks=[self.create_mlflow_callback()],
                    **current_kwargs
                )
                
                val_loss = min(history.history["val_loss"])
                
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    best_params = params
                
                # Log metrics
                mlflow.log_metrics({
                    "val_loss": val_loss,
                    "best_val_loss": best_val_loss
                })
        
        return best_params, best_val_loss

    def evaluate_model(
        self,
        model: tf.keras.Model,
        test_data: tuple,
        run_name: Optional[str] = None
    ):
        """Evaluate model and log results"""
        X_test, y_test = test_data
        
        with mlflow.start_run(run_name=run_name):
            # Evaluate model
            metrics = model.evaluate(X_test, y_test)
            metric_names = model.metrics_names
            
            # Log metrics
            results = dict(zip(metric_names, metrics))
            mlflow.log_metrics(results)
            
            # Generate predictions
            y_pred = model.predict(X_test)
            
            # Log confusion matrix for classification
            if len(y_test.shape) > 1:  # One-hot encoded
                y_true = np.argmax(y_test, axis=1)
                y_pred = np.argmax(y_pred, axis=1)
            else:
                y_true = y_test
            
            from sklearn.metrics import confusion_matrix
            import matplotlib.pyplot as plt
            import seaborn as sns
            
            cm = confusion_matrix(y_true, y_pred)
            plt.figure(figsize=(10, 8))
            sns.heatmap(cm, annot=True, fmt='d')
            plt.title('Confusion Matrix')
            plt.savefig('confusion_matrix.png')
            plt.close()
            
            mlflow.log_artifact('confusion_matrix.png')