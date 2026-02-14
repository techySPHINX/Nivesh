"""
Training script for Spending Pattern Prediction model.

Usage:
    python train.py --data-path ../data/transactions.json
    python train.py --data-path ../data/transactions.json --category groceries
"""

import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

import mlflow
from shared.config import MLConfig
from shared.mlflow_utils import init_mlflow
from spending_predictor.model import train_spending_predictor_with_mlflow

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description='Train Spending Pattern Prediction model')
    parser.add_argument(
        '--data-path',
        type=str,
        required=True,
        help='Path to transaction data JSON file'
    )
    parser.add_argument(
        '--category',
        type=str,
        default=None,
        help='Category to predict (None for total spending)'
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
    mlflow.set_experiment("spending_predictor")
    
    logger.info("=" * 80)
    logger.info("Training Spending Pattern Prediction Model")
    logger.info("=" * 80)
    logger.info(f"Data: {data_path}")
    logger.info(f"Category: {args.category or 'total'}")
    logger.info(f"MLflow URI: {config.mlflow_tracking_uri}")
    logger.info("=" * 80)
    
    try:
        # Train model
        predictor, run_id = train_spending_predictor_with_mlflow(
            data_path=str(data_path),
            category=args.category,
            run_name=args.run_name
        )
        
        logger.info("=" * 80)
        logger.info("Training Complete!")
        logger.info(f"MLflow Run ID: {run_id}")
        logger.info(f"View in MLflow: {config.mlflow_tracking_uri}/#/experiments/spending_predictor")
        logger.info("=" * 80)
        
        # Make sample prediction
        logger.info("\nSample Prediction (Next 30 Days):")
        prediction = predictor.predict_next_month()
        logger.info(f"Total Predicted: ₹{prediction['total_predicted']:,.2f}")
        logger.info(f"Daily Average: ₹{prediction['daily_average']:,.2f}")
        logger.info(f"Confidence Range: ₹{prediction['confidence_lower']:,.2f} - ₹{prediction['confidence_upper']:,.2f}")
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
