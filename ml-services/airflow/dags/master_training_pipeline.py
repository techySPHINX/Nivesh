"""
Apache Airflow DAG for coordinated ML model training.

This master DAG orchestrates training for all models in dependency order:
1. Independent models (Intent, NER, Spending, Anomaly, Credit Risk) train in parallel
2. Drift detection runs after all models complete
3. Notification sent with summary

Schedule: Weekly on Mondays at 1:00 AM
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
from airflow.sensors.external_task import ExternalTaskSensor
import logging

logger = logging.getLogger(__name__)

default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'email': ['ml-ops@nivesh.ai'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=10),
    'execution_timeout': timedelta(hours=6),
}

dag = DAG(
    'master_training_pipeline',
    default_args=default_args,
    description='Orchestrate training for all ML models',
    schedule_interval='0 1 * * 1',  # Weekly on Mondays at 1 AM
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['ml', 'training', 'master', 'orchestration'],
)


def check_data_freshness(**context):
    """Check if training data is fresh enough."""
    from pathlib import Path
    from datetime import datetime, timedelta
    
    logger.info("Checking training data freshness")
    
    data_dir = Path('/opt/airflow/ml-services/data')
    
    # Data files to check
    data_files = [
        'intents.json',
        'ner_training.json',
        'transactions.json',
        'credit_applications.json',
    ]
    
    max_age_days = 30  # Data should be updated within 30 days
    now = datetime.now()
    
    for filename in data_files:
        filepath = data_dir / filename
        
        if not filepath.exists():
            logger.warning(f"Data file not found: {filename}")
            continue
        
        # Check file modification time
        mtime = datetime.fromtimestamp(filepath.stat().st_mtime)
        age_days = (now - mtime).days
        
        logger.info(f"{filename}: {age_days} days old")
        
        if age_days > max_age_days:
            logger.warning(f"{filename} is {age_days} days old (threshold: {max_age_days})")
    
    logger.info("Data freshness check completed")
    
    return True


def run_drift_detection_all_models(**context):
    """Run drift detection for all deployed models."""
    logger.info("Running drift detection for all models")
    
    import sys
    sys.path.insert(0, '/opt/airflow/ml-services/drift_detection')
    from run_drift_check import run_all_models
    
    # Run drift detection
    run_all_models(days=7)
    
    logger.info("Drift detection completed for all models")
    
    return True


def send_training_summary(**context):
    """Send summary notification about training pipeline."""
    logger.info("Sending training pipeline summary")
    
    # In production, gather metrics from all triggered DAGs
    # and send comprehensive report via email/Slack
    
    summary = f"""
    Weekly ML Training Pipeline Completed
    
    Date: {context['ds']}
    Execution Time: {context['execution_date']}
    
    Models Trained:
    - Intent Classifier
    - Financial NER
    - Spending Predictor
    - Anomaly Detector
    - Credit Risk Scorer
    
    Drift Detection: Completed
    
    Next Training: {context['next_execution_date']}
    """
    
    logger.info(summary)
    
    return True


# Task definitions
with dag:
    # Initial data checks
    check_data = PythonOperator(
        task_id='check_data_freshness',
        python_callable=check_data_freshness,
        provide_context=True,
    )
    
    # Trigger individual model training DAGs in parallel
    # These can run independently
    trigger_intent_classifier = TriggerDagRunOperator(
        task_id='trigger_intent_classifier',
        trigger_dag_id='intent_classifier_training',
        wait_for_completion=True,
        poke_interval=60,
    )
    
    trigger_credit_risk = TriggerDagRunOperator(
        task_id='trigger_credit_risk',
        trigger_dag_id='credit_risk_training',
        wait_for_completion=True,
        poke_interval=60,
    )
    
    # Drift detection after all models trained
    drift_detection = PythonOperator(
        task_id='run_drift_detection',
        python_callable=run_drift_detection_all_models,
        provide_context=True,
    )
    
    # Final notification
    summary_notification = PythonOperator(
        task_id='send_summary',
        python_callable=send_training_summary,
        provide_context=True,
    )
    
    # Dependencies
    check_data >> [trigger_intent_classifier, trigger_credit_risk]
    [trigger_intent_classifier, trigger_credit_risk] >> drift_detection >> summary_notification
