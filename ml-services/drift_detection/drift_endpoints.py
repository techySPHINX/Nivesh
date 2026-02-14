"""
FastAPI endpoint for drift detection monitoring.

Adds drift detection endpoints to the model server:
- GET /monitoring/drift/{model_name} - Get latest drift report
- POST /monitoring/drift/{model_name}/check - Run drift detection
- GET /monitoring/drift/alerts - Get active drift alerts
- GET /monitoring/drift/metrics - Get Prometheus-compatible metrics
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import pandas as pd

from drift_monitor import DriftMonitor

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

# Store drift monitors for each model
drift_monitors: Dict[str, DriftMonitor] = {}

# Store active alerts
active_alerts: List[Dict] = []


class DriftCheckRequest(BaseModel):
    """Request to run drift detection."""
    days: int = 7
    drift_threshold: Optional[float] = 0.3


class DriftCheckResponse(BaseModel):
    """Response from drift detection."""
    model_name: str
    timestamp: str
    dataset_drift: bool
    drift_score: float
    drifted_features: List[str]
    severity: str
    recommendation: str
    report_path: str


class DriftMetrics(BaseModel):
    """Prometheus-compatible drift metrics."""
    model_name: str
    drift_score: float
    dataset_drift: int
    drifted_features_count: int
    last_check: str


def get_or_create_monitor(model_name: str) -> DriftMonitor:
    """Get or create drift monitor for a model."""
    if model_name not in drift_monitors:
        # Load reference data for model
        reference_data = load_reference_data(model_name)
        
        drift_monitors[model_name] = DriftMonitor(
            model_name=model_name,
            reference_data=reference_data,
            drift_threshold=0.3
        )
    
    return drift_monitors[model_name]


def load_reference_data(model_name: str) -> pd.DataFrame:
    """Load reference data for a model."""
    from pathlib import Path
    
    data_dir = Path(__file__).parent.parent / 'data'
    
    if model_name == 'intent_classifier':
        return pd.read_json(data_dir / 'intents.json')
    elif model_name == 'financial_ner':
        return pd.read_json(data_dir / 'ner_training.json')
    elif model_name == 'spending_predictor':
        df = pd.read_json(data_dir / 'transactions.json')
        df['date'] = pd.to_datetime(df['date'])
        daily = df.groupby(['date', 'category']).agg({
            'amount': ['sum', 'count', 'mean', 'std']
        }).reset_index()
        daily.columns = ['date', 'category', 'total_amount', 'transaction_count', 'avg_amount', 'std_amount']
        return daily
    elif model_name == 'anomaly_detector':
        df = pd.read_json(data_dir / 'transactions.json')
        df['hour'] = pd.to_datetime(df['date']).dt.hour
        df['day_of_week'] = pd.to_datetime(df['date']).dt.dayofweek
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        return df[['amount', 'hour', 'day_of_week', 'is_weekend', 'category']]
    elif model_name == 'credit_risk':
        return pd.read_json(data_dir / 'credit_applications.json')
    else:
        raise ValueError(f"Unknown model: {model_name}")


def simulate_production_data(model_name: str, days: int = 7) -> pd.DataFrame:
    """
    Simulate production data for testing.
    In production, load from database/logs.
    """
    import numpy as np
    
    reference_data = load_reference_data(model_name)
    production_data = reference_data.sample(n=min(1000, len(reference_data)), replace=True).copy()
    
    if model_name == 'spending_predictor':
        production_data['total_amount'] *= np.random.uniform(1.1, 1.3)
        production_data['avg_amount'] *= np.random.uniform(1.1, 1.3)
    elif model_name == 'anomaly_detector':
        production_data['amount'] *= np.random.uniform(0.9, 1.4, size=len(production_data))
    elif model_name == 'credit_risk':
        production_data['monthly_income'] *= np.random.uniform(0.95, 1.15)
        production_data['total_debt'] *= np.random.uniform(1.0, 1.2)
    
    return production_data


@router.post("/drift/{model_name}/check", response_model=DriftCheckResponse)
async def check_drift(
    model_name: str,
    request: DriftCheckRequest,
    background_tasks: BackgroundTasks
):
    """
    Run drift detection for a specific model.
    
    Args:
        model_name: Model to check (intent_classifier, spending_predictor, etc.)
        request: Drift check configuration
        
    Returns:
        Drift detection results
    """
    try:
        # Get or create monitor
        monitor = get_or_create_monitor(model_name)
        
        # Update threshold if provided
        if request.drift_threshold:
            monitor.drift_threshold = request.drift_threshold
        
        # Load production data (simulated for demo)
        production_data = simulate_production_data(model_name, request.days)
        
        # Run drift detection
        drift_summary = monitor.detect_data_drift(production_data)
        
        # Check for alerts
        alert = monitor.check_drift_alert(drift_summary)
        
        # Store alert if triggered
        if alert['alert_triggered']:
            active_alerts.append(alert)
        
        return DriftCheckResponse(
            model_name=model_name,
            timestamp=datetime.now().isoformat(),
            dataset_drift=drift_summary['dataset_drift'],
            drift_score=drift_summary['drift_score'],
            drifted_features=drift_summary['drifted_features'],
            severity=alert['severity'],
            recommendation=alert['recommendation'],
            report_path=drift_summary['report_path']
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drift/{model_name}", response_model=DriftCheckResponse)
async def get_drift_status(model_name: str):
    """
    Get latest drift report for a model.
    
    Args:
        model_name: Model name
        
    Returns:
        Latest drift detection results
    """
    if model_name not in drift_monitors:
        raise HTTPException(status_code=404, detail=f"No drift data for {model_name}")
    
    monitor = drift_monitors[model_name]
    history = monitor.get_drift_history()
    
    if not history:
        raise HTTPException(status_code=404, detail="No drift checks run yet")
    
    latest = history[-1]
    
    return DriftCheckResponse(
        model_name=model_name,
        timestamp=latest['timestamp'],
        dataset_drift=latest['dataset_drift'],
        drift_score=latest['drift_score'],
        drifted_features=latest['drifted_features'],
        severity="LOW" if latest['drift_score'] < 0.3 else "HIGH",
        recommendation="Monitor" if latest['drift_score'] < 0.3 else "Retrain",
        report_path=latest['report_path']
    )


@router.get("/drift/alerts")
async def get_alerts():
    """
    Get all active drift alerts.
    
    Returns:
        List of active alerts
    """
    return {
        "total_alerts": len(active_alerts),
        "alerts": active_alerts
    }


@router.delete("/drift/alerts")
async def clear_alerts():
    """Clear all drift alerts."""
    global active_alerts
    count = len(active_alerts)
    active_alerts = []
    return {"message": f"Cleared {count} alerts"}


@router.get("/drift/metrics")
async def get_drift_metrics():
    """
    Get Prometheus-compatible drift metrics for all models.
    
    Returns:
        Drift metrics in Prometheus format
    """
    metrics = []
    
    for model_name, monitor in drift_monitors.items():
        prom_metrics = monitor.export_prometheus_metrics()
        
        history = monitor.get_drift_history()
        if history:
            latest = history[-1]
            
            metrics.append({
                "model_name": model_name,
                "drift_score": latest['drift_score'],
                "dataset_drift": 1 if latest['dataset_drift'] else 0,
                "drifted_features_count": len(latest['drifted_features']),
                "last_check": latest['timestamp']
            })
    
    return {"metrics": metrics}


@router.post("/drift/check-all")
async def check_all_models(request: DriftCheckRequest):
    """
    Run drift detection for all models.
    
    Args:
        request: Drift check configuration
        
    Returns:
        Drift results for all models
    """
    models = [
        'intent_classifier',
        'financial_ner',
        'spending_predictor',
        'anomaly_detector',
        'credit_risk',
    ]
    
    results = []
    
    for model_name in models:
        try:
            result = await check_drift(
                model_name=model_name,
                request=request,
                background_tasks=BackgroundTasks()
            )
            results.append(result)
        except Exception as e:
            results.append({
                "model_name": model_name,
                "error": str(e)
            })
    
    return {
        "total_models": len(models),
        "results": results
    }
