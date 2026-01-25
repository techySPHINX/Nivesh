"""
MLflow configuration and utilities
"""
import mlflow
from mlflow.tracking import MlflowClient
from typing import Dict, Any, Optional
from ..shared import config, get_logger


logger = get_logger(__name__)


def init_mlflow():
    """Initialize MLflow tracking"""
    mlflow.set_tracking_uri(config.mlflow_tracking_uri)
    logger.info(f"MLflow tracking URI set to: {config.mlflow_tracking_uri}")


def get_client() -> MlflowClient:
    """Get MLflow client"""
    return MlflowClient(tracking_uri=config.mlflow_tracking_uri)


def create_experiment(experiment_name: str, tags: Optional[Dict[str, str]] = None) -> str:
    """
    Create or get existing experiment
    
    Args:
        experiment_name: Name of the experiment
        tags: Optional tags for the experiment
        
    Returns:
        Experiment ID
    """
    try:
        experiment_id = mlflow.create_experiment(
            experiment_name,
            tags=tags or {}
        )
        logger.info(f"Created experiment: {experiment_name} (ID: {experiment_id})")
        return experiment_id
    except Exception as e:
        # Experiment might already exist
        experiment = mlflow.get_experiment_by_name(experiment_name)
        if experiment:
            logger.info(f"Using existing experiment: {experiment_name} (ID: {experiment.experiment_id})")
            return experiment.experiment_id
        else:
            logger.error(f"Failed to create experiment {experiment_name}: {e}")
            raise


def log_model_params(params: Dict[str, Any]):
    """Log model parameters"""
    for key, value in params.items():
        mlflow.log_param(key, value)


def log_model_metrics(metrics: Dict[str, float]):
    """Log model metrics"""
    for key, value in metrics.items():
        mlflow.log_metric(key, value)


def log_model_artifact(artifact_path: str, artifact_name: str = None):
    """Log model artifact"""
    mlflow.log_artifact(artifact_path, artifact_name)


def register_model(
    model_name: str,
    model_uri: str,
    tags: Optional[Dict[str, str]] = None,
    description: Optional[str] = None
) -> Any:
    """
    Register model in MLflow Model Registry
    
    Args:
        model_name: Name of the model
        model_uri: URI of the model
        tags: Optional tags
        description: Optional description
        
    Returns:
        Registered model version
    """
    try:
        model_version = mlflow.register_model(
            model_uri=model_uri,
            name=model_name,
            tags=tags or {}
        )
        
        # Add description if provided
        if description:
            client = get_client()
            client.update_model_version(
                name=model_name,
                version=model_version.version,
                description=description
            )
        
        logger.info(f"Registered model {model_name} version {model_version.version}")
        return model_version
    except Exception as e:
        logger.error(f"Failed to register model {model_name}: {e}")
        raise


def transition_model_stage(
    model_name: str,
    version: str,
    stage: str,  # Staging, Production, Archived
    archive_existing: bool = True
):
    """
    Transition model to a different stage
    
    Args:
        model_name: Name of the model
        version: Model version
        stage: Target stage (Staging, Production, Archived)
        archive_existing: Whether to archive existing versions in target stage
    """
    try:
        client = get_client()
        client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage=stage,
            archive_existing_versions=archive_existing
        )
        logger.info(f"Transitioned {model_name} v{version} to {stage}")
    except Exception as e:
        logger.error(f"Failed to transition model stage: {e}")
        raise


def load_model(model_name: str, stage: str = "Production"):
    """
    Load model from MLflow registry
    
    Args:
        model_name: Name of the model
        stage: Stage to load from (Staging, Production)
        
    Returns:
        Loaded model
    """
    try:
        model_uri = f"models:/{model_name}/{stage}"
        model = mlflow.pyfunc.load_model(model_uri)
        logger.info(f"Loaded {model_name} from {stage}")
        return model
    except Exception as e:
        logger.error(f"Failed to load model {model_name} from {stage}: {e}")
        raise


def get_latest_version(model_name: str, stage: str = "Production") -> Optional[str]:
    """
    Get latest version of a model in a specific stage
    
    Args:
        model_name: Name of the model
        stage: Stage to check (Staging, Production)
        
    Returns:
        Latest version number or None
    """
    try:
        client = get_client()
        versions = client.get_latest_versions(model_name, stages=[stage])
        if versions:
            return versions[0].version
        return None
    except Exception as e:
        logger.warning(f"Failed to get latest version for {model_name}: {e}")
        return None


# Experiment names for each model
EXPERIMENTS = {
    "intent_classifier": "intent_classification",
    "financial_ner": "financial_ner",
    "spending_predictor": "spending_prediction",
    "anomaly_detector": "anomaly_detection",
    "credit_risk": "credit_risk_scoring",
    "gemini_tuning": "gemini_fine_tuning"
}


def setup_experiments():
    """Create all required experiments"""
    init_mlflow()
    
    for model_key, experiment_name in EXPERIMENTS.items():
        create_experiment(
            experiment_name,
            tags={
                "model_type": model_key,
                "project": "nivesh",
                "version": "1.0"
            }
        )
    
    logger.info("All experiments set up successfully")


# Initialize MLflow on module import
init_mlflow()
