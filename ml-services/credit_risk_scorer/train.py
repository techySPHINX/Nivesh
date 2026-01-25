"""
Training script for Credit Risk Scoring model.

Usage:
    python train.py --data-path ../data/credit_applications.json
    python train.py --data-path ../data/credit_applications.json --max-depth 8
"""

import argparse
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

import mlflow
import mlflow.xgboost
from sklearn.model_selection import train_test_split
from shared.config import MLConfig
from shared.mlflow_utils import init_mlflow
from credit_risk_scorer.model import CreditRiskScorer

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description='Train Credit Risk Scoring model')
    parser.add_argument(
        '--data-path',
        type=str,
        required=True,
        help='Path to credit applications JSON file'
    )
    parser.add_argument(
        '--max-depth',
        type=int,
        default=6,
        help='Maximum tree depth (default: 6)'
    )
    parser.add_argument(
        '--n-estimators',
        type=int,
        default=100,
        help='Number of boosting rounds (default: 100)'
    )
    parser.add_argument(
        '--learning-rate',
        type=float,
        default=0.1,
        help='Learning rate (default: 0.1)'
    )
    parser.add_argument(
        '--test-size',
        type=float,
        default=0.2,
        help='Test set proportion (default: 0.2)'
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
    mlflow.set_experiment("credit_risk_scorer")
    
    logger.info("=" * 80)
    logger.info("Training Credit Risk Scoring Model")
    logger.info("=" * 80)
    logger.info(f"Data: {data_path}")
    logger.info(f"Max Depth: {args.max_depth}")
    logger.info(f"N Estimators: {args.n_estimators}")
    logger.info(f"Learning Rate: {args.learning_rate}")
    logger.info(f"Test Size: {args.test_size}")
    logger.info(f"MLflow URI: {config.mlflow_tracking_uri}")
    logger.info("=" * 80)
    
    try:
        # Load data
        import json
        with open(data_path, 'r') as f:
            applications = json.load(f)
        
        logger.info(f"Loaded {len(applications)} credit applications")
        
        # Initialize scorer
        scorer = CreditRiskScorer(
            max_depth=args.max_depth,
            n_estimators=args.n_estimators,
            learning_rate=args.learning_rate
        )
        
        # Prepare data
        X, y = scorer.prepare_data(applications)
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=args.test_size,
            random_state=42,
            stratify=y
        )
        
        logger.info(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
        
        # Start MLflow run
        with mlflow.start_run(run_name=args.run_name or "credit_risk_scorer_training") as run:
            # Log parameters
            mlflow.log_param('max_depth', args.max_depth)
            mlflow.log_param('n_estimators', args.n_estimators)
            mlflow.log_param('learning_rate', args.learning_rate)
            mlflow.log_param('train_size', len(X_train))
            mlflow.log_param('test_size', len(X_test))
            mlflow.log_param('n_features', X.shape[1])
            
            # Train model
            metrics = scorer.train(
                X_train, y_train,
                eval_set=(X_test, y_test),
                early_stopping_rounds=10
            )
            
            # Log training metrics
            mlflow.log_metrics({
                f'train_{k}': v for k, v in metrics.items()
                if not k.startswith('val_')
            })
            
            # Log validation metrics
            mlflow.log_metrics({
                k: v for k, v in metrics.items()
                if k.startswith('val_')
            })
            
            # Feature importance
            feature_importance = scorer.get_feature_importance(top_n=15)
            mlflow.log_dict(
                {'feature_importance': feature_importance},
                'feature_importance.json'
            )
            
            # Fairness validation (if sensitive features available)
            sensitive_features = ['age_group', 'employment_stability']
            available_sensitive = [f for f in sensitive_features if f in X.columns]
            
            if available_sensitive:
                fairness_metrics = scorer.validate_fairness(
                    X_test, y_test, available_sensitive
                )
                mlflow.log_dict(fairness_metrics, 'fairness_metrics.json')
                logger.info(f"Fairness validation completed for: {available_sensitive}")
            
            # Save model
            scorer.save('models/credit_risk_scorer')
            
            # Log model artifacts
            mlflow.xgboost.log_model(
                scorer.model,
                "model",
                registered_model_name="credit_risk_scorer"
            )
            mlflow.log_artifacts('models/credit_risk_scorer', artifact_path='scorer')
            
            run_id = run.info.run_id
            logger.info(f"MLflow run completed: {run_id}")
        
        logger.info("=" * 80)
        logger.info("Training Complete!")
        logger.info(f"Train AUC-ROC: {metrics['auc_roc']:.4f}")
        logger.info(f"Val AUC-ROC: {metrics.get('val_auc_roc', 0):.4f}")
        logger.info(f"Train F1: {metrics['f1_score']:.4f}")
        logger.info(f"Val F1: {metrics.get('val_f1_score', 0):.4f}")
        logger.info(f"MLflow Run ID: {run_id}")
        logger.info(f"View in MLflow: {config.mlflow_tracking_uri}/#/experiments/credit_risk_scorer")
        logger.info("=" * 80)
        
        # Test prediction on a sample
        if applications:
            logger.info("\nTesting on sample application:")
            sample = applications[0]
            # Remove target if present
            test_sample = {k: v for k, v in sample.items() if k != 'default'}
            result = scorer.predict(test_sample, return_probability=True)
            logger.info(f"Applicant: {test_sample}")
            logger.info(f"Will Default: {result['will_default']}")
            logger.info(f"Risk Score: {result['risk_score']}/100")
            logger.info(f"Risk Category: {result['risk_category']}")
            logger.info(f"Default Probability: {result['default_probability']:.2%}")
        
        # Display top features
        logger.info("\nTop 10 Most Important Features:")
        for i, feat in enumerate(feature_importance[:10], 1):
            logger.info(f"{i}. {feat['feature']}: {feat['importance']:.4f}")
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
