"""
Apache Airflow DAG for automated ML model training.

This DAG orchestrates the training pipeline for the Intent Classifier model:
1. Data validation
2. Model training
3. Model evaluation
4. Model registration
5. Deployment validation

Schedule: Weekly on Sundays at 2:00 AM
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.utils.task_group import TaskGroup
import logging

logger = logging.getLogger(__name__)

# Default args for all tasks
default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'email': ['ml-ops@nivesh.ai'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}

# DAG definition
dag = DAG(
    'intent_classifier_training',
    default_args=default_args,
    description='Train and deploy Intent Classifier model',
    schedule_interval='0 2 * * 0',  # Weekly on Sundays at 2 AM
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['ml', 'training', 'intent-classification'],
)


def validate_training_data(**context):
    """Validate training data quality and completeness."""
    import pandas as pd
    import json
    from pathlib import Path
    
    logger.info("Validating training data for Intent Classifier")
    
    data_path = Path('/opt/airflow/ml-services/data/intents.json')
    
    if not data_path.exists():
        raise FileNotFoundError(f"Training data not found: {data_path}")
    
    # Load data
    df = pd.read_json(data_path)
    
    # Validation checks
    required_columns = ['text', 'intent']
    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Check for nulls
    if df.isnull().any().any():
        raise ValueError("Training data contains null values")
    
    # Check minimum samples per intent
    min_samples = 10
    intent_counts = df['intent'].value_counts()
    
    for intent, count in intent_counts.items():
        if count < min_samples:
            raise ValueError(f"Intent '{intent}' has only {count} samples (minimum: {min_samples})")
    
    # Log statistics
    logger.info(f"Total samples: {len(df)}")
    logger.info(f"Unique intents: {df['intent'].nunique()}")
    logger.info(f"Intent distribution:\n{intent_counts}")
    
    # Push metadata to XCom
    context['ti'].xcom_push(key='total_samples', value=len(df))
    context['ti'].xcom_push(key='num_intents', value=df['intent'].nunique())
    
    return True


def check_drift(**context):
    """Check for data drift before training."""
    logger.info("Checking for data drift")
    
    # Import drift detection module
    import sys
    sys.path.insert(0, '/opt/airflow/ml-services/drift_detection')
    from drift_monitor import DriftMonitor
    import pandas as pd
    
    # Load reference and current data
    data_path = '/opt/airflow/ml-services/data/intents.json'
    df = pd.read_json(data_path)
    
    # Split into reference (80%) and current (20%)
    split_idx = int(len(df) * 0.8)
    reference_data = df[:split_idx]
    current_data = df[split_idx:]
    
    # Initialize monitor
    monitor = DriftMonitor(
        model_name='intent_classifier',
        reference_data=reference_data,
        drift_threshold=0.5  # Higher threshold for training
    )
    
    # Detect drift
    drift_summary = monitor.detect_data_drift(current_data)
    
    logger.info(f"Drift detected: {drift_summary['dataset_drift']}")
    logger.info(f"Drift score: {drift_summary['drift_score']:.4f}")
    
    # Push drift info to XCom
    context['ti'].xcom_push(key='drift_score', value=drift_summary['drift_score'])
    context['ti'].xcom_push(key='dataset_drift', value=drift_summary['dataset_drift'])
    
    return drift_summary


def train_model(**context):
    """Train the Intent Classifier model."""
    logger.info("Starting model training")
    
    # Get training metadata from previous tasks
    total_samples = context['ti'].xcom_pull(key='total_samples', task_ids='validate_data')
    drift_score = context['ti'].xcom_pull(key='drift_score', task_ids='check_drift')
    
    logger.info(f"Training on {total_samples} samples")
    logger.info(f"Data drift score: {drift_score:.4f}")
    
    # Import training module
    import sys
    sys.path.insert(0, '/opt/airflow/ml-services/intent_classifier')
    from train import train_intent_classifier
    
    # Train model
    run_id, model_uri, metrics = train_intent_classifier(
        data_path='/opt/airflow/ml-services/data/intents.json',
        run_name=f"airflow_training_{context['ds']}",
        register_model=False  # Register separately after evaluation
    )
    
    logger.info(f"Training completed. MLflow run: {run_id}")
    logger.info(f"Model URI: {model_uri}")
    logger.info(f"Metrics: {metrics}")
    
    # Push model info to XCom
    context['ti'].xcom_push(key='run_id', value=run_id)
    context['ti'].xcom_push(key='model_uri', value=model_uri)
    context['ti'].xcom_push(key='accuracy', value=metrics.get('accuracy', 0))
    context['ti'].xcom_push(key='f1_score', value=metrics.get('f1_score', 0))
    
    return run_id


def evaluate_model(**context):
    """Evaluate model performance against thresholds."""
    logger.info("Evaluating model performance")
    
    # Get metrics from training
    accuracy = context['ti'].xcom_pull(key='accuracy', task_ids='train_model')
    f1_score = context['ti'].xcom_pull(key='f1_score', task_ids='train_model')
    
    # Performance thresholds
    min_accuracy = 0.85
    min_f1 = 0.80
    
    logger.info(f"Accuracy: {accuracy:.4f} (threshold: {min_accuracy})")
    logger.info(f"F1 Score: {f1_score:.4f} (threshold: {min_f1})")
    
    # Check thresholds
    if accuracy < min_accuracy:
        raise ValueError(f"Accuracy {accuracy:.4f} below threshold {min_accuracy}")
    
    if f1_score < min_f1:
        raise ValueError(f"F1 score {f1_score:.4f} below threshold {min_f1}")
    
    logger.info("Model passed evaluation thresholds")
    
    # Push evaluation result
    context['ti'].xcom_push(key='evaluation_passed', value=True)
    
    return True


def register_model(**context):
    """Register model in MLflow Model Registry."""
    logger.info("Registering model in MLflow")
    
    import mlflow
    
    mlflow.set_tracking_uri('http://mlflow:5000')
    
    run_id = context['ti'].xcom_pull(key='run_id', task_ids='train_model')
    model_uri = f"runs:/{run_id}/model"
    
    # Register model
    model_name = "intent_classifier"
    
    result = mlflow.register_model(
        model_uri=model_uri,
        name=model_name,
        tags={
            'trained_date': context['ds'],
            'dag_id': context['dag'].dag_id,
            'task_id': context['task'].task_id,
        }
    )
    
    version = result.version
    
    logger.info(f"Model registered as {model_name} version {version}")
    
    # Transition to staging
    client = mlflow.tracking.MlflowClient()
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage="Staging"
    )
    
    logger.info(f"Model version {version} transitioned to Staging")
    
    context['ti'].xcom_push(key='model_version', value=version)
    
    return version


def deploy_to_production(**context):
    """Deploy model to production after validation."""
    logger.info("Deploying model to production")
    
    import mlflow
    
    mlflow.set_tracking_uri('http://mlflow:5000')
    
    model_name = "intent_classifier"
    version = context['ti'].xcom_pull(key='model_version', task_ids='register_model')
    
    client = mlflow.tracking.MlflowClient()
    
    # Archive current production model
    prod_versions = client.get_latest_versions(model_name, stages=["Production"])
    
    for prod_version in prod_versions:
        client.transition_model_version_stage(
            name=model_name,
            version=prod_version.version,
            stage="Archived"
        )
        logger.info(f"Archived previous production version {prod_version.version}")
    
    # Promote new version to production
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage="Production"
    )
    
    logger.info(f"Model version {version} deployed to Production")
    
    return True


def send_notification(**context):
    """Send notification about training completion."""
    logger.info("Sending training completion notification")
    
    version = context['ti'].xcom_pull(key='model_version', task_ids='register_model')
    accuracy = context['ti'].xcom_pull(key='accuracy', task_ids='train_model')
    f1_score = context['ti'].xcom_pull(key='f1_score', task_ids='train_model')
    
    message = f"""
    Intent Classifier Training Completed
    
    Date: {context['ds']}
    Model Version: {version}
    
    Metrics:
    - Accuracy: {accuracy:.4f}
    - F1 Score: {f1_score:.4f}
    
    Status: Deployed to Production
    """
    
    logger.info(message)
    
    # In production, send to Slack/email
    # For now, just log
    
    return True


# Task definitions
with dag:
    # Data validation tasks
    validate_data = PythonOperator(
        task_id='validate_data',
        python_callable=validate_training_data,
        provide_context=True,
    )
    
    check_data_drift = PythonOperator(
        task_id='check_drift',
        python_callable=check_drift,
        provide_context=True,
    )
    
    # Training tasks
    train = PythonOperator(
        task_id='train_model',
        python_callable=train_model,
        provide_context=True,
    )
    
    evaluate = PythonOperator(
        task_id='evaluate_model',
        python_callable=evaluate_model,
        provide_context=True,
    )
    
    # Deployment tasks
    register = PythonOperator(
        task_id='register_model',
        python_callable=register_model,
        provide_context=True,
    )
    
    deploy = PythonOperator(
        task_id='deploy_to_production',
        python_callable=deploy_to_production,
        provide_context=True,
    )
    
    # Notification
    notify = PythonOperator(
        task_id='send_notification',
        python_callable=send_notification,
        provide_context=True,
    )
    
    # Task dependencies
    validate_data >> check_data_drift >> train >> evaluate >> register >> deploy >> notify
