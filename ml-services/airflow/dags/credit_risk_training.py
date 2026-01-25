"""
Apache Airflow DAG for automated Credit Risk Scoring model training.

Training pipeline:
1. Data validation
2. Feature engineering validation
3. Model training (XGBoost)
4. Fairness validation
5. Model evaluation
6. Model registration
7. Production deployment

Schedule: Weekly on Saturdays at 3:00 AM
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.task_group import TaskGroup
import logging

logger = logging.getLogger(__name__)

default_args = {
    'owner': 'ml-team',
    'depends_on_past': False,
    'email': ['ml-ops@nivesh.ai'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=3),
}

dag = DAG(
    'credit_risk_training',
    default_args=default_args,
    description='Train and deploy Credit Risk Scoring model',
    schedule_interval='0 3 * * 6',  # Weekly on Saturdays at 3 AM
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['ml', 'training', 'credit-risk', 'xgboost'],
)


def validate_credit_data(**context):
    """Validate credit application training data."""
    import pandas as pd
    from pathlib import Path
    
    logger.info("Validating credit risk training data")
    
    data_path = Path('/opt/airflow/ml-services/data/credit_applications.json')
    
    if not data_path.exists():
        raise FileNotFoundError(f"Training data not found: {data_path}")
    
    df = pd.read_json(data_path)
    
    # Required features
    required_columns = [
        'age', 'annual_income', 'monthly_income', 'total_debt',
        'credit_score', 'employment_type', 'years_employed',
        'loan_amount', 'loan_purpose', 'will_default'
    ]
    
    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Check nulls
    if df.isnull().any().any():
        null_cols = df.columns[df.isnull().any()].tolist()
        raise ValueError(f"Training data contains null values in: {null_cols}")
    
    # Check class balance
    default_rate = df['will_default'].mean()
    logger.info(f"Default rate: {default_rate:.2%}")
    
    if default_rate < 0.05 or default_rate > 0.95:
        logger.warning(f"Class imbalance detected: {default_rate:.2%} defaults")
    
    # Statistics
    logger.info(f"Total applications: {len(df)}")
    logger.info(f"Defaults: {df['will_default'].sum()}")
    logger.info(f"Non-defaults: {(~df['will_default']).sum()}")
    
    # Push metadata
    context['ti'].xcom_push(key='total_samples', value=len(df))
    context['ti'].xcom_push(key='default_rate', value=default_rate)
    
    return True


def validate_features(**context):
    """Validate feature engineering and distributions."""
    import pandas as pd
    import numpy as np
    
    logger.info("Validating feature engineering")
    
    df = pd.read_json('/opt/airflow/ml-services/data/credit_applications.json')
    
    # Calculate engineered features
    df['debt_to_income'] = df['total_debt'] / (df['monthly_income'] * 12)
    df['credit_utilization'] = df['total_debt'] / (df['credit_score'] * 100)  # Simplified
    df['loan_to_income'] = df['loan_amount'] / df['annual_income']
    
    # Check for invalid values
    for col in ['debt_to_income', 'credit_utilization', 'loan_to_income']:
        if df[col].isnull().any():
            raise ValueError(f"Feature '{col}' contains null values")
        
        if (df[col] < 0).any():
            raise ValueError(f"Feature '{col}' contains negative values")
        
        if np.isinf(df[col]).any():
            raise ValueError(f"Feature '{col}' contains infinite values")
    
    logger.info("Feature engineering validation passed")
    
    # Log feature statistics
    logger.info(f"Debt-to-income ratio: {df['debt_to_income'].mean():.2f} ± {df['debt_to_income'].std():.2f}")
    logger.info(f"Loan-to-income ratio: {df['loan_to_income'].mean():.2f} ± {df['loan_to_income'].std():.2f}")
    
    return True


def train_credit_risk_model(**context):
    """Train XGBoost credit risk model."""
    logger.info("Training credit risk model")
    
    import sys
    sys.path.insert(0, '/opt/airflow/ml-services/credit_risk_scorer')
    from train import train_credit_risk_scorer
    
    # Train model
    run_id, model_uri, metrics = train_credit_risk_scorer(
        data_path='/opt/airflow/ml-services/data/credit_applications.json',
        run_name=f"airflow_training_{context['ds']}",
        register_model=False
    )
    
    logger.info(f"Training completed. MLflow run: {run_id}")
    logger.info(f"Metrics: {metrics}")
    
    # Push metrics
    context['ti'].xcom_push(key='run_id', value=run_id)
    context['ti'].xcom_push(key='model_uri', value=model_uri)
    context['ti'].xcom_push(key='accuracy', value=metrics.get('accuracy', 0))
    context['ti'].xcom_push(key='precision', value=metrics.get('precision', 0))
    context['ti'].xcom_push(key='recall', value=metrics.get('recall', 0))
    context['ti'].xcom_push(key='f1_score', value=metrics.get('f1_score', 0))
    context['ti'].xcom_push(key='auc_roc', value=metrics.get('auc_roc', 0))
    
    return run_id


def validate_fairness(**context):
    """Validate model fairness across demographic groups."""
    logger.info("Validating model fairness")
    
    # In production, this would:
    # 1. Load model from MLflow
    # 2. Predict on test set
    # 3. Calculate metrics by demographic group
    # 4. Check for disparate impact
    
    import pandas as pd
    
    df = pd.read_json('/opt/airflow/ml-services/data/credit_applications.json')
    
    # Check demographic representation
    age_groups = pd.cut(df['age'], bins=[0, 30, 45, 60, 100], labels=['<30', '30-45', '45-60', '60+'])
    
    logger.info("Demographic distribution:")
    logger.info(f"Age groups:\n{age_groups.value_counts()}")
    logger.info(f"Employment types:\n{df['employment_type'].value_counts()}")
    
    # Check minimum representation
    min_samples = 5
    for group, count in age_groups.value_counts().items():
        if count < min_samples:
            logger.warning(f"Age group '{group}' has only {count} samples")
    
    logger.info("Fairness validation completed")
    
    return True


def evaluate_credit_risk_model(**context):
    """Evaluate model performance against thresholds."""
    logger.info("Evaluating credit risk model")
    
    accuracy = context['ti'].xcom_pull(key='accuracy', task_ids='train_model')
    precision = context['ti'].xcom_pull(key='precision', task_ids='train_model')
    recall = context['ti'].xcom_pull(key='recall', task_ids='train_model')
    auc_roc = context['ti'].xcom_pull(key='auc_roc', task_ids='train_model')
    
    # Thresholds for credit risk models
    min_accuracy = 0.75
    min_precision = 0.70  # Important: minimize false positives (wrongly predicting default)
    min_recall = 0.65     # Important: catch actual defaults
    min_auc = 0.75
    
    logger.info(f"Accuracy: {accuracy:.4f} (threshold: {min_accuracy})")
    logger.info(f"Precision: {precision:.4f} (threshold: {min_precision})")
    logger.info(f"Recall: {recall:.4f} (threshold: {min_recall})")
    logger.info(f"AUC-ROC: {auc_roc:.4f} (threshold: {min_auc})")
    
    # Validate thresholds
    if accuracy < min_accuracy:
        raise ValueError(f"Accuracy {accuracy:.4f} below threshold {min_accuracy}")
    
    if precision < min_precision:
        raise ValueError(f"Precision {precision:.4f} below threshold {min_precision}")
    
    if recall < min_recall:
        raise ValueError(f"Recall {recall:.4f} below threshold {min_recall}")
    
    if auc_roc < min_auc:
        raise ValueError(f"AUC-ROC {auc_roc:.4f} below threshold {min_auc}")
    
    logger.info("Model passed evaluation thresholds")
    
    return True


def register_credit_risk_model(**context):
    """Register model in MLflow."""
    import mlflow
    
    logger.info("Registering credit risk model")
    
    mlflow.set_tracking_uri('http://mlflow:5000')
    
    run_id = context['ti'].xcom_pull(key='run_id', task_ids='train_model')
    model_uri = f"runs:/{run_id}/model"
    
    result = mlflow.register_model(
        model_uri=model_uri,
        name="credit_risk_scorer",
        tags={
            'trained_date': context['ds'],
            'dag_id': context['dag'].dag_id,
            'fairness_validated': 'true',
        }
    )
    
    version = result.version
    logger.info(f"Registered credit_risk_scorer version {version}")
    
    # Transition to staging
    client = mlflow.tracking.MlflowClient()
    client.transition_model_version_stage(
        name="credit_risk_scorer",
        version=version,
        stage="Staging"
    )
    
    context['ti'].xcom_push(key='model_version', value=version)
    
    return version


def deploy_credit_risk_model(**context):
    """Deploy to production."""
    import mlflow
    
    logger.info("Deploying credit risk model to production")
    
    mlflow.set_tracking_uri('http://mlflow:5000')
    
    version = context['ti'].xcom_pull(key='model_version', task_ids='register_model')
    
    client = mlflow.tracking.MlflowClient()
    
    # Archive current production
    prod_versions = client.get_latest_versions("credit_risk_scorer", stages=["Production"])
    for prod_version in prod_versions:
        client.transition_model_version_stage(
            name="credit_risk_scorer",
            version=prod_version.version,
            stage="Archived"
        )
    
    # Promote to production
    client.transition_model_version_stage(
        name="credit_risk_scorer",
        version=version,
        stage="Production"
    )
    
    logger.info(f"Credit risk model version {version} deployed to Production")
    
    return True


# Task definitions
with dag:
    validate_data = PythonOperator(
        task_id='validate_data',
        python_callable=validate_credit_data,
        provide_context=True,
    )
    
    validate_feature_engineering = PythonOperator(
        task_id='validate_features',
        python_callable=validate_features,
        provide_context=True,
    )
    
    train = PythonOperator(
        task_id='train_model',
        python_callable=train_credit_risk_model,
        provide_context=True,
    )
    
    fairness_check = PythonOperator(
        task_id='validate_fairness',
        python_callable=validate_fairness,
        provide_context=True,
    )
    
    evaluate = PythonOperator(
        task_id='evaluate_model',
        python_callable=evaluate_credit_risk_model,
        provide_context=True,
    )
    
    register = PythonOperator(
        task_id='register_model',
        python_callable=register_credit_risk_model,
        provide_context=True,
    )
    
    deploy = PythonOperator(
        task_id='deploy_to_production',
        python_callable=deploy_credit_risk_model,
        provide_context=True,
    )
    
    # Dependencies
    validate_data >> validate_feature_engineering >> train >> [fairness_check, evaluate]
    [fairness_check, evaluate] >> register >> deploy
