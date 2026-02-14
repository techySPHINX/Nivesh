"""
Script to run drift detection for all deployed models.

Usage:
    python run_drift_check.py --model intent_classifier
    python run_drift_check.py --all
    python run_drift_check.py --model credit_risk --days 30
"""

import argparse
import logging
import sys
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from drift_monitor import DriftMonitor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_reference_data(model_name: str) -> pd.DataFrame:
    """Load reference/training data for a model."""
    data_dir = Path(__file__).parent.parent / 'data'
    
    if model_name == 'intent_classifier':
        # Load intent training data
        df = pd.read_json(data_dir / 'intents.json')
        return df
    
    elif model_name == 'financial_ner':
        # Load NER training data
        df = pd.read_json(data_dir / 'ner_training.json')
        return df
    
    elif model_name == 'spending_predictor':
        # Load transaction data
        df = pd.read_json(data_dir / 'transactions.json')
        # Convert to daily aggregates for drift detection
        df['date'] = pd.to_datetime(df['date'])
        daily = df.groupby(['date', 'category']).agg({
            'amount': ['sum', 'count', 'mean', 'std']
        }).reset_index()
        daily.columns = ['date', 'category', 'total_amount', 'transaction_count', 'avg_amount', 'std_amount']
        return daily
    
    elif model_name == 'anomaly_detector':
        # Load transaction data
        df = pd.read_json(data_dir / 'transactions.json')
        # Add engineered features
        df['hour'] = pd.to_datetime(df['date']).dt.hour
        df['day_of_week'] = pd.to_datetime(df['date']).dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        return df[['amount', 'hour', 'day_of_week', 'is_weekend', 'category']]
    
    elif model_name == 'credit_risk':
        # Load credit applications
        df = pd.read_json(data_dir / 'credit_applications.json')
        return df
    
    else:
        raise ValueError(f"Unknown model: {model_name}")


def simulate_production_data(model_name: str, days: int = 7) -> pd.DataFrame:
    """
    Simulate production data for testing.
    In production, this would load from database/logs.
    
    Args:
        model_name: Model to simulate data for
        days: Number of days of production data
        
    Returns:
        Simulated production data
    """
    logger.info(f"Simulating {days} days of production data for {model_name}")
    
    # Load reference data
    reference_data = load_reference_data(model_name)
    
    # Simulate drift by adding noise and shifting distributions
    production_data = reference_data.sample(n=min(1000, len(reference_data)), replace=True).copy()
    
    if model_name == 'spending_predictor':
        # Simulate spending increase (inflation/drift)
        production_data['total_amount'] *= np.random.uniform(1.1, 1.3)
        production_data['avg_amount'] *= np.random.uniform(1.1, 1.3)
        
        # Add some noise
        production_data['transaction_count'] += np.random.randint(-5, 10, size=len(production_data))
        production_data['transaction_count'] = production_data['transaction_count'].clip(lower=0)
    
    elif model_name == 'anomaly_detector':
        # Simulate new transaction patterns
        production_data['amount'] *= np.random.uniform(0.9, 1.4, size=len(production_data))
        
        # Shift time distribution (more night transactions)
        night_mask = production_data['hour'] >= 22
        production_data.loc[night_mask, 'amount'] *= 1.5
    
    elif model_name == 'credit_risk':
        # Simulate economic changes
        production_data['monthly_income'] *= np.random.uniform(0.95, 1.15)
        production_data['total_debt'] *= np.random.uniform(1.0, 1.2)
        production_data['credit_score'] += np.random.randint(-30, 10, size=len(production_data))
        production_data['credit_score'] = production_data['credit_score'].clip(300, 850)
    
    return production_data


def run_drift_check(model_name: str, days: int = 7):
    """
    Run drift detection for a specific model.
    
    Args:
        model_name: Model to check
        days: Days of production data to analyze
    """
    logger.info(f"Starting drift detection for {model_name}")
    logger.info(f"Analyzing {days} days of production data")
    
    # Load reference data
    reference_data = load_reference_data(model_name)
    logger.info(f"Loaded reference data: {len(reference_data)} samples")
    
    # Load production data (simulated for demo)
    production_data = simulate_production_data(model_name, days)
    logger.info(f"Loaded production data: {len(production_data)} samples")
    
    # Initialize monitor
    monitor = DriftMonitor(
        model_name=model_name,
        reference_data=reference_data,
        drift_threshold=0.3
    )
    
    # Detect data drift
    drift_summary = monitor.detect_data_drift(production_data)
    
    logger.info("\n" + "="*60)
    logger.info("DRIFT DETECTION RESULTS")
    logger.info("="*60)
    logger.info(f"Model: {model_name}")
    logger.info(f"Dataset drift detected: {drift_summary['dataset_drift']}")
    logger.info(f"Drift score: {drift_summary['drift_score']:.4f}")
    logger.info(f"Drifted features: {len(drift_summary['drifted_features'])}")
    
    if drift_summary['drifted_features']:
        logger.info("\nDrifted features:")
        for feature in drift_summary['drifted_features']:
            feature_drift = drift_summary['drift_by_feature'][feature]
            logger.info(f"  - {feature}: {feature_drift['drift_score']:.4f} ({feature_drift['stattest_name']})")
    
    # Check alert
    alert = monitor.check_drift_alert(drift_summary)
    
    logger.info("\n" + "="*60)
    logger.info("ALERT STATUS")
    logger.info("="*60)
    logger.info(f"Alert triggered: {alert['alert_triggered']}")
    logger.info(f"Severity: {alert['severity']}")
    logger.info(f"Recommendation: {alert['recommendation']}")
    logger.info("="*60 + "\n")
    
    # Run automated tests
    logger.info("Running automated drift tests...")
    test_results = monitor.run_drift_tests(production_data)
    logger.info(f"Tests passed: {test_results['passed']}/{test_results['total_tests']}")
    
    # Create comprehensive report
    report_path = monitor.create_comprehensive_report(production_data)
    logger.info(f"\nComprehensive report: {report_path}")
    
    # Export Prometheus metrics
    metrics = monitor.export_prometheus_metrics()
    logger.info("\nPrometheus metrics:")
    for metric_name, value in metrics.items():
        logger.info(f"  {metric_name} = {value}")
    
    # Save drift history
    history_path = Path(f'reports/{model_name}/drift_history.json')
    monitor.save_drift_history(str(history_path))
    
    return drift_summary, alert


def run_all_models(days: int = 7):
    """Run drift detection for all models."""
    models = [
        'intent_classifier',
        'financial_ner',
        'spending_predictor',
        'anomaly_detector',
        'credit_risk',
    ]
    
    results = {}
    alerts = []
    
    for model_name in models:
        logger.info(f"\n{'='*80}")
        logger.info(f"Processing: {model_name}")
        logger.info(f"{'='*80}\n")
        
        try:
            drift_summary, alert = run_drift_check(model_name, days)
            results[model_name] = drift_summary
            
            if alert['alert_triggered']:
                alerts.append(alert)
        
        except Exception as e:
            logger.error(f"Error processing {model_name}: {e}", exc_info=True)
            continue
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("DRIFT DETECTION SUMMARY - ALL MODELS")
    logger.info("="*80)
    
    for model_name, drift_summary in results.items():
        logger.info(f"{model_name}:")
        logger.info(f"  Drift score: {drift_summary['drift_score']:.4f}")
        logger.info(f"  Dataset drift: {drift_summary['dataset_drift']}")
        logger.info(f"  Drifted features: {len(drift_summary['drifted_features'])}")
    
    logger.info("\n" + "="*80)
    logger.info(f"ALERTS: {len(alerts)} model(s) require attention")
    logger.info("="*80)
    
    for alert in alerts:
        logger.info(f"\n{alert['model_name']}:")
        logger.info(f"  Severity: {alert['severity']}")
        logger.info(f"  Drift score: {alert['drift_score']:.4f}")
        logger.info(f"  Recommendation: {alert['recommendation']}")


def main():
    parser = argparse.ArgumentParser(description='Run drift detection for ML models')
    parser.add_argument(
        '--model',
        type=str,
        choices=['intent_classifier', 'financial_ner', 'spending_predictor', 'anomaly_detector', 'credit_risk'],
        help='Model to check for drift'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Run drift detection for all models'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=7,
        help='Days of production data to analyze (default: 7)'
    )
    
    args = parser.parse_args()
    
    if args.all:
        run_all_models(args.days)
    elif args.model:
        run_drift_check(args.model, args.days)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
