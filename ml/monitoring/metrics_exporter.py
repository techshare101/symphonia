import time
import mlflow
import prometheus_client as prom
from prometheus_client import start_http_server, Gauge, Histogram, Counter
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define Prometheus metrics
METRICS = {
    # Model performance metrics
    'model_accuracy': Gauge('symphonia_ml_accuracy', 'Model accuracy', ['model', 'version']),
    'model_f1': Gauge('symphonia_ml_f1_score', 'Model F1 score', ['model', 'version']),
    'model_precision': Gauge('symphonia_ml_precision', 'Model precision', ['model', 'version']),
    'model_recall': Gauge('symphonia_ml_recall', 'Model recall', ['model', 'version']),
    'model_mae': Gauge('symphonia_ml_mae', 'Model mean absolute error', ['model', 'version']),
    'model_mse': Gauge('symphonia_ml_mse', 'Model mean squared error', ['model', 'version']),
    
    # Prediction metrics
    'prediction_latency': Histogram(
        'symphonia_ml_prediction_latency_seconds',
        'Time taken for model prediction',
        ['model'],
        buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    ),
    'prediction_errors': Counter(
        'symphonia_ml_prediction_errors_total',
        'Total number of prediction errors',
        ['model', 'error_type']
    ),
    
    # Resource metrics
    'gpu_memory_usage': Gauge('symphonia_ml_gpu_memory_bytes', 'GPU memory usage', ['device']),
    'model_memory_usage': Gauge('symphonia_ml_model_memory_bytes', 'Model memory usage', ['model']),
    'batch_processing_time': Histogram(
        'symphonia_ml_batch_processing_seconds',
        'Time taken to process a batch',
        ['model'],
        buckets=[0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
    )
}

class MLMetricsExporter:
    def __init__(self, mlflow_uri: str, export_port: int = 8000):
        self.mlflow_uri = mlflow_uri
        self.export_port = export_port
        self.metrics = METRICS
        mlflow.set_tracking_uri(mlflow_uri)
        
    def start(self):
        """Start the metrics exporter server"""
        start_http_server(self.export_port)
        logger.info(f"Metrics server started on port {self.export_port}")
        
    def update_model_metrics(self, model_name: str, version: str, metrics: Dict[str, float]):
        """Update model performance metrics"""
        try:
            # Update accuracy metrics
            if 'accuracy' in metrics:
                self.metrics['model_accuracy'].labels(
                    model=model_name,
                    version=version
                ).set(metrics['accuracy'])
                
            # Update F1 score
            if 'f1' in metrics:
                self.metrics['model_f1'].labels(
                    model=model_name,
                    version=version
                ).set(metrics['f1'])
                
            # Update precision
            if 'precision' in metrics:
                self.metrics['model_precision'].labels(
                    model=model_name,
                    version=version
                ).set(metrics['precision'])
                
            # Update recall
            if 'recall' in metrics:
                self.metrics['model_recall'].labels(
                    model=model_name,
                    version=version
                ).set(metrics['recall'])
                
            # Update regression metrics
            if 'mae' in metrics:
                self.metrics['model_mae'].labels(
                    model=model_name,
                    version=version
                ).set(metrics['mae'])
                
            if 'mse' in metrics:
                self.metrics['model_mse'].labels(
                    model=model_name,
                    version=version
                ).set(metrics['mse'])
                
            logger.info(f"Updated metrics for model {model_name} version {version}")
            
        except Exception as e:
            logger.error(f"Error updating model metrics: {str(e)}")
            
    def record_prediction_latency(self, model_name: str, duration: float):
        """Record prediction latency"""
        try:
            self.metrics['prediction_latency'].labels(
                model=model_name
            ).observe(duration)
        except Exception as e:
            logger.error(f"Error recording prediction latency: {str(e)}")
            
    def record_prediction_error(self, model_name: str, error_type: str):
        """Record prediction errors"""
        try:
            self.metrics['prediction_errors'].labels(
                model=model_name,
                error_type=error_type
            ).inc()
        except Exception as e:
            logger.error(f"Error recording prediction error: {str(e)}")
            
    def update_resource_metrics(self, metrics: Dict[str, Any]):
        """Update resource usage metrics"""
        try:
            # Update GPU memory metrics
            if 'gpu_memory' in metrics:
                for device, memory in metrics['gpu_memory'].items():
                    self.metrics['gpu_memory_usage'].labels(
                        device=device
                    ).set(memory)
                    
            # Update model memory metrics
            if 'model_memory' in metrics:
                for model, memory in metrics['model_memory'].items():
                    self.metrics['model_memory_usage'].labels(
                        model=model
                    ).set(memory)
                    
        except Exception as e:
            logger.error(f"Error updating resource metrics: {str(e)}")
            
    def record_batch_processing_time(self, model_name: str, duration: float):
        """Record batch processing time"""
        try:
            self.metrics['batch_processing_time'].labels(
                model=model_name
            ).observe(duration)
        except Exception as e:
            logger.error(f"Error recording batch processing time: {str(e)}")

def main():
    """Main entry point for the metrics exporter"""
    try:
        # Initialize metrics exporter
        exporter = MLMetricsExporter(
            mlflow_uri="http://mlflow.symphonia:5000",
            export_port=8000
        )
        exporter.start()
        
        # Main loop to continuously update metrics
        while True:
            try:
                # Get active experiments from MLflow
                experiments = mlflow.search_experiments()
                
                for experiment in experiments:
                    # Get latest runs for the experiment
                    runs = mlflow.search_runs(
                        experiment_ids=[experiment.experiment_id],
                        order_by=["start_time DESC"],
                        max_results=1
                    )
                    
                    if not runs.empty:
                        latest_run = runs.iloc[0]
                        metrics = {
                            k: v for k, v in latest_run.items()
                            if k.startswith('metrics.')
                        }
                        
                        # Clean metric names
                        metrics = {
                            k.replace('metrics.', ''): v
                            for k, v in metrics.items()
                        }
                        
                        # Update metrics
                        exporter.update_model_metrics(
                            model_name=experiment.name,
                            version=latest_run.run_id,
                            metrics=metrics
                        )
                
            except Exception as e:
                logger.error(f"Error in metrics collection loop: {str(e)}")
                
            # Sleep before next update
            time.sleep(60)
            
    except Exception as e:
        logger.error(f"Fatal error in metrics exporter: {str(e)}")
        raise

if __name__ == "__main__":
    main()