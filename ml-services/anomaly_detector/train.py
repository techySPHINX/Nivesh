"""
Training script for Anomaly Detection model.

Usage:
    python train.py --data-path ../data/transactions.json
    python train.py --data-path ../data/transactions.json --contamination 0.02
"""

import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

import mlflow
import mlflow.sklearn
from shared.config import MLConfig
from shared.mlflow_utils import init_mlflow
from anomaly_detector.model import AnomalyDetector

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description='Train Anomaly Detection model')
    parser.add_argument(
        '--data-path',
        type=str,
        required=True,
        help='Path to transaction data JSON file'
    )
    parser.add_argument(
        '--contamination',
        type=float,
        default=0.01,
        help='Expected proportion of anomalies (default: 0.01)'
    )
    parser.add_argument(
        '--n-estimators',
        type=int,
        default=100,
        help='Number of isolation trees (default: 100)'
    )
    parser.add_argument(
        '--run-name',
        type=str,
        default=None,
        help='MLflow run name'
    )
    
    args = parser.parse_args()
    
    # Validate data file
    data_path = Path(args.data_path)
    if not data_path.exists():
        logger.error(f"Data file not found: {data_path}")
        sys.exit(1)
    
    # Initialize MLflow
    config = MLConfig()
    init_mlflow(config.mlflow_tracking_uri)
    mlflow.set_experiment("anomaly_detector")
    
    logger.info("=" * 80)
    logger.info("Training Anomaly Detection Model")
    logger.info("=" * 80)
    logger.info(f"Data: {data_path}")
    logger.info(f"Contamination: {args.contamination}")
    logger.info(f"N Estimators: {args.n_estimators}")
    logger.info(f"MLflow URI: {config.mlflow_tracking_uri}")
    logger.info("=" * 80)
    
    try:
        # Load data
        import json
        with open(data_path, 'r') as f:
            transactions = json.load(f)
        
        logger.info(f"Loaded {len(transactions)} transactions")
        
        # Initialize detector
        detector = AnomalyDetector(
            contamination=args.contamination,
            n_estimators=args.n_estimators
        )
        
        # Prepare data
        X, _ = detector.prepare_data(transactions)
        
        # Start MLflow run
        with mlflow.start_run(run_name=args.run_name or "anomaly_detector_training") as run:
            # Log parameters
            mlflow.log_param('contamination', args.contamination)
            mlflow.log_param('n_estimators', args.n_estimators)
            mlflow.log_param('n_features', X.shape[1])
            mlflow.log_param('n_samples', len(X))
            
            # Train model
            metrics = detector.train(X)
            
            # Log metrics
            mlflow.log_metrics(metrics)
            
            # Log feature names
            mlflow.log_dict(
                {'features': detector.feature_names},
                'features.json'
            )
            
            # Save model
            detector.save('models/anomaly_detector')
            
            # Log model artifacts
            mlflow.sklearn.log_model(
                detector.model,
                "model",
                registered_model_name="anomaly_detector"
            )
            mlflow.log_artifacts('models/anomaly_detector', artifact_path='detector')
            
            run_id = run.info.run_id
            logger.info(f"MLflow run completed: {run_id}")
        
        logger.info("=" * 80)
        logger.info("Training Complete!")
        logger.info(f"Anomalies Detected: {metrics['anomalies_detected']} ({metrics['anomaly_rate']:.2%})")
        logger.info(f"Avg Anomaly Score: {metrics['avg_anomaly_score']:.4f}")
        logger.info(f"Avg Normal Score: {metrics['avg_normal_score']:.4f}")
        logger.info(f"MLflow Run ID: {run_id}")
        logger.info(f"View in MLflow: {config.mlflow_tracking_uri}/#/experiments/anomaly_detector")
        logger.info("=" * 80)
        
        # Test prediction on a sample transaction
        if transactions:
            logger.info("\nTesting on sample transaction:")
            sample = transactions[0]
            result = detector.predict(sample, return_score=True)
            logger.info(f"Transaction: {sample}")
            logger.info(f"Is Anomaly: {result['is_anomaly']}")
            logger.info(f"Anomaly Score: {result['anomaly_score']:.4f}")
            logger.info(f"Confidence: {result['confidence']:.4f}")
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
