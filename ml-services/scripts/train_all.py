#!/usr/bin/env python
"""
Master Training Script for All ML Models
Executes training for all models in sequence

Usage:
    python scripts/train_all.py
    python scripts/train_all.py --models intent,ner,spending
"""

import argparse
import subprocess
import sys
from pathlib import Path
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Model configurations
MODELS = {
    'intent': {
        'name': 'Intent Classifier',
        'script': 'intent_classifier/train.py',
        'data': 'data/intents.json',
        'args': ['--epochs', '5', '--batch-size', '32']
    },
    'ner': {
        'name': 'Financial NER',
        'script': 'financial_ner/train.py',
        'data': 'data/ner_training.json',
        'args': ['--iterations', '30']
    },
    'spending': {
        'name': 'Spending Predictor',
        'script': 'spending_predictor/train.py',
        'data': 'data/transactions.json',
        'args': ['--forecast-horizon', '365']
    },
    'anomaly': {
        'name': 'Anomaly Detector',
        'script': 'anomaly_detector/train.py',
        'data': 'data/transactions.json',
        'args': ['--contamination', '0.01']
    },
    'credit_risk': {
        'name': 'Credit Risk Scorer',
        'script': 'credit_risk_scorer/train.py',
        'data': 'data/credit_applications.json',
        'args': ['--max-depth', '6', '--n-estimators', '100']
    }
}


def check_data_exists(data_path: str) -> bool:
    """Check if training data exists"""
    path = Path(data_path)
    if not path.exists():
        logger.warning(f"⚠️  Data file not found: {data_path}")
        return False
    return True


def train_model(model_key: str, config: dict) -> bool:
    """Train a single model"""
    logger.info("=" * 80)
    logger.info(f"Training: {config['name']}")
    logger.info("=" * 80)

    # Check if data exists
    if not check_data_exists(config['data']):
        logger.error(f"❌ Cannot train {config['name']} - data missing")
        return False

    # Build command
    cmd = [
        sys.executable,
        config['script'],
        '--data-path', config['data']
    ] + config.get('args', [])

    logger.info(f"Command: {' '.join(cmd)}")

    try:
        # Run training
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True
        )

        logger.info(f"✅ {config['name']} trained successfully")
        logger.debug(f"Output: {result.stdout}")
        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"❌ {config['name']} training failed")
        logger.error(f"Error: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error training {config['name']}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Train all ML models or selected models'
    )
    parser.add_argument(
        '--models',
        type=str,
        help='Comma-separated list of models to train (default: all)',
        default='all'
    )
    parser.add_argument(
        '--continue-on-error',
        action='store_true',
        help='Continue training other models if one fails'
    )

    args = parser.parse_args()

    # Determine which models to train
    if args.models == 'all':
        models_to_train = MODELS.keys()
    else:
        models_to_train = [m.strip() for m in args.models.split(',')]
        # Validate model names
        invalid = set(models_to_train) - set(MODELS.keys())
        if invalid:
            logger.error(f"❌ Invalid model names: {invalid}")
            logger.info(f"Valid models: {', '.join(MODELS.keys())}")
            sys.exit(1)

    logger.info("=" * 80)
    logger.info("Nivesh ML Models - Training Pipeline")
    logger.info("=" * 80)
    logger.info(f"Start Time: {datetime.now().isoformat()}")
    logger.info(f"Models to train: {', '.join(models_to_train)}")
    logger.info("=" * 80)

    # Train models
    results = {}
    for model_key in models_to_train:
        config = MODELS[model_key]
        success = train_model(model_key, config)
        results[model_key] = success

        if not success and not args.continue_on_error:
            logger.error(
                "Training stopped due to error (use --continue-on-error to override)")
            break

    # Print summary
    logger.info("")
    logger.info("=" * 80)
    logger.info("Training Summary")
    logger.info("=" * 80)

    successful = [k for k, v in results.items() if v]
    failed = [k for k, v in results.items() if not v]

    logger.info(f"Total models: {len(results)}")
    logger.info(f"✅ Successful: {len(successful)}")
    if successful:
        for model in successful:
            logger.info(f"   - {MODELS[model]['name']}")

    logger.info(f"❌ Failed: {len(failed)}")
    if failed:
        for model in failed:
            logger.info(f"   - {MODELS[model]['name']}")

    logger.info(f"End Time: {datetime.now().isoformat()}")
    logger.info("=" * 80)

    # Exit with appropriate code
    sys.exit(0 if len(failed) == 0 else 1)


if __name__ == '__main__':
    main()
