"""
Spending Pattern Prediction Model

Uses Facebook Prophet for time series forecasting of user spending patterns.
Supports:
- Monthly spending predictions
- Seasonal patterns (yearly, monthly, weekly)
- Holiday/festival effects
- Category-wise predictions
- Confidence intervals
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd
import numpy as np
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
import mlflow
import mlflow.prophet
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)


class SpendingPredictor:
    """Prophet-based spending pattern prediction model."""
    
    def __init__(self, category: Optional[str] = None):
        """
        Initialize spending predictor.
        
        Args:
            category: Spending category to predict (None for total spending)
        """
        self.category = category
        self.model: Optional[Prophet] = None
        self.training_metadata = {}
        
    def prepare_data(
        self,
        transactions: List[Dict],
        resample_freq: str = 'D'  # Daily by default
    ) -> pd.DataFrame:
        """
        Prepare transaction data for Prophet.
        
        Args:
            transactions: List of transaction dicts with 'date', 'amount', 'category'
            resample_freq: Resampling frequency ('D', 'W', 'M')
            
        Returns:
            DataFrame with 'ds' (date) and 'y' (amount) columns
        """
        df = pd.DataFrame(transactions)
        
        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Filter by category if specified
        if self.category:
            df = df[df['category'] == self.category]
        
        # Group by date and sum amounts
        df_grouped = df.groupby('date')['amount'].sum().reset_index()
        
        # Resample to fill missing dates
        df_grouped = df_grouped.set_index('date').resample(resample_freq).sum().reset_index()
        
        # Rename columns for Prophet
        df_prophet = df_grouped.rename(columns={'date': 'ds', 'amount': 'y'})
        
        logger.info(f"Prepared {len(df_prophet)} data points from {df_prophet['ds'].min()} to {df_prophet['ds'].max()}")
        
        return df_prophet
    
    def add_indian_holidays(self) -> pd.DataFrame:
        """
        Add Indian holidays and festivals.
        
        Returns:
            DataFrame with holiday dates and names
        """
        # Major Indian holidays (approximate dates)
        holidays = pd.DataFrame([
            # Republic Day
            {'holiday': 'republic_day', 'ds': '2024-01-26'},
            {'holiday': 'republic_day', 'ds': '2025-01-26'},
            {'holiday': 'republic_day', 'ds': '2026-01-26'},
            
            # Holi (varies by lunar calendar - approximate)
            {'holiday': 'holi', 'ds': '2024-03-25'},
            {'holiday': 'holi', 'ds': '2025-03-14'},
            {'holiday': 'holi', 'ds': '2026-03-03'},
            
            # Independence Day
            {'holiday': 'independence_day', 'ds': '2024-08-15'},
            {'holiday': 'independence_day', 'ds': '2025-08-15'},
            {'holiday': 'independence_day', 'ds': '2026-08-15'},
            
            # Diwali (varies - approximate)
            {'holiday': 'diwali', 'ds': '2024-11-01'},
            {'holiday': 'diwali', 'ds': '2025-10-20'},
            {'holiday': 'diwali', 'ds': '2026-11-08'},
            
            # Christmas
            {'holiday': 'christmas', 'ds': '2024-12-25'},
            {'holiday': 'christmas', 'ds': '2025-12-25'},
            {'holiday': 'christmas', 'ds': '2026-12-25'},
            
            # New Year
            {'holiday': 'new_year', 'ds': '2024-01-01'},
            {'holiday': 'new_year', 'ds': '2025-01-01'},
            {'holiday': 'new_year', 'ds': '2026-01-01'},
            {'holiday': 'new_year', 'ds': '2027-01-01'},
        ])
        
        holidays['ds'] = pd.to_datetime(holidays['ds'])
        return holidays
    
    def train(
        self,
        data: pd.DataFrame,
        params: Optional[Dict] = None
    ) -> Dict[str, float]:
        """
        Train Prophet model.
        
        Args:
            data: DataFrame with 'ds' and 'y' columns
            params: Prophet hyperparameters
            
        Returns:
            Training metrics
        """
        # Default parameters optimized for spending data
        default_params = {
            'yearly_seasonality': True,
            'weekly_seasonality': True,
            'daily_seasonality': False,
            'changepoint_prior_scale': 0.05,  # Flexibility of trend changes
            'seasonality_prior_scale': 10.0,  # Strength of seasonality
            'seasonality_mode': 'multiplicative',  # Better for spending
            'growth': 'linear',
            'interval_width': 0.95,  # 95% confidence intervals
        }
        
        if params:
            default_params.update(params)
        
        # Initialize model
        self.model = Prophet(**default_params, holidays=self.add_indian_holidays())
        
        # Add monthly seasonality
        self.model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        # Fit model
        logger.info("Training Prophet model...")
        self.model.fit(data)
        
        # Evaluate on training data
        train_predictions = self.model.predict(data)
        metrics = self._calculate_metrics(data['y'], train_predictions['yhat'])
        
        # Store metadata
        self.training_metadata = {
            'train_size': len(data),
            'train_start': str(data['ds'].min()),
            'train_end': str(data['ds'].max()),
            'category': self.category or 'total',
            'params': default_params,
        }
        
        logger.info(f"Training complete. MAE: {metrics['mae']:.2f}, RMSE: {metrics['rmse']:.2f}, R²: {metrics['r2']:.4f}")
        
        return metrics
    
    def evaluate(
        self,
        initial_days: int = 365,
        period_days: int = 90,
        horizon_days: int = 30
    ) -> pd.DataFrame:
        """
        Perform cross-validation.
        
        Args:
            initial_days: Initial training period
            period_days: Spacing between cutoff dates
            horizon_days: Forecast horizon
            
        Returns:
            Cross-validation metrics
        """
        if not self.model:
            raise ValueError("Model not trained yet")
        
        logger.info("Running cross-validation...")
        
        df_cv = cross_validation(
            self.model,
            initial=f'{initial_days} days',
            period=f'{period_days} days',
            horizon=f'{horizon_days} days'
        )
        
        df_metrics = performance_metrics(df_cv)
        
        logger.info(f"CV Results - MAE: {df_metrics['mae'].mean():.2f}, RMSE: {df_metrics['rmse'].mean():.2f}")
        
        return df_metrics
    
    def predict(
        self,
        periods: int = 30,
        freq: str = 'D',
        include_history: bool = False
    ) -> Dict:
        """
        Make future predictions.
        
        Args:
            periods: Number of periods to forecast
            freq: Frequency ('D', 'W', 'M')
            include_history: Include historical fitted values
            
        Returns:
            Predictions with confidence intervals
        """
        if not self.model:
            raise ValueError("Model not trained yet")
        
        # Create future dataframe
        future = self.model.make_future_dataframe(periods=periods, freq=freq, include_history=include_history)
        
        # Make predictions
        forecast = self.model.predict(future)
        
        # Extract relevant columns
        predictions = []
        for _, row in forecast.iterrows():
            predictions.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted_amount': max(0, row['yhat']),  # Non-negative spending
                'lower_bound': max(0, row['yhat_lower']),
                'upper_bound': max(0, row['yhat_upper']),
                'trend': row['trend'],
                'yearly': row.get('yearly', 0),
                'weekly': row.get('weekly', 0),
                'monthly': row.get('monthly', 0),
            })
        
        return {
            'category': self.category or 'total',
            'predictions': predictions,
            'metadata': self.training_metadata,
        }
    
    def predict_next_month(self) -> Dict:
        """
        Predict spending for next 30 days.
        
        Returns:
            Monthly prediction summary
        """
        result = self.predict(periods=30, freq='D')
        predictions = result['predictions']
        
        # Calculate monthly aggregates
        total = sum(p['predicted_amount'] for p in predictions)
        daily_avg = total / 30
        
        return {
            'category': self.category or 'total',
            'total_predicted': round(total, 2),
            'daily_average': round(daily_avg, 2),
            'confidence_lower': round(sum(p['lower_bound'] for p in predictions), 2),
            'confidence_upper': round(sum(p['upper_bound'] for p in predictions), 2),
            'daily_predictions': predictions,
        }
    
    def detect_anomalies(
        self,
        data: pd.DataFrame,
        threshold: float = 0.95
    ) -> List[Dict]:
        """
        Detect spending anomalies.
        
        Args:
            data: Historical data
            threshold: Confidence threshold for anomaly detection
            
        Returns:
            List of anomalous dates
        """
        if not self.model:
            raise ValueError("Model not trained yet")
        
        # Predict on historical data
        forecast = self.model.predict(data)
        
        # Find points outside confidence interval
        anomalies = []
        for i, row in data.iterrows():
            pred = forecast.iloc[i]
            actual = row['y']
            
            if actual < pred['yhat_lower'] or actual > pred['yhat_upper']:
                anomalies.append({
                    'date': row['ds'].strftime('%Y-%m-%d'),
                    'actual': actual,
                    'predicted': pred['yhat'],
                    'lower_bound': pred['yhat_lower'],
                    'upper_bound': pred['yhat_upper'],
                    'deviation': abs(actual - pred['yhat']),
                })
        
        logger.info(f"Detected {len(anomalies)} anomalous spending patterns")
        
        return anomalies
    
    def _calculate_metrics(self, y_true: pd.Series, y_pred: pd.Series) -> Dict[str, float]:
        """Calculate regression metrics."""
        return {
            'mae': mean_absolute_error(y_true, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            'r2': r2_score(y_true, y_pred),
            'mape': np.mean(np.abs((y_true - y_pred) / y_true)) * 100 if not (y_true == 0).any() else None,
        }
    
    def save(self, path: str) -> None:
        """
        Save model to disk.
        
        Args:
            path: Directory to save model
        """
        if not self.model:
            raise ValueError("Model not trained yet")
        
        model_path = Path(path)
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Save Prophet model
        model_file = model_path / 'prophet_model.json'
        with open(model_file, 'w') as f:
            json.dump(self.model.to_json(), f)
        
        # Save metadata
        metadata_file = model_path / 'metadata.json'
        with open(metadata_file, 'w') as f:
            json.dump(self.training_metadata, f, indent=2)
        
        logger.info(f"Model saved to {path}")
    
    @classmethod
    def load(cls, path: str, category: Optional[str] = None) -> 'SpendingPredictor':
        """
        Load model from disk.
        
        Args:
            path: Directory containing saved model
            category: Category for the model
            
        Returns:
            Loaded SpendingPredictor instance
        """
        predictor = cls(category=category)
        
        model_path = Path(path)
        
        # Load Prophet model
        model_file = model_path / 'prophet_model.json'
        with open(model_file, 'r') as f:
            model_json = json.load(f)
        
        predictor.model = Prophet.from_json(model_json)
        
        # Load metadata
        metadata_file = model_path / 'metadata.json'
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                predictor.training_metadata = json.load(f)
        
        logger.info(f"Model loaded from {path}")
        
        return predictor


def train_spending_predictor_with_mlflow(
    data_path: str,
    category: Optional[str] = None,
    run_name: Optional[str] = None
) -> Tuple[SpendingPredictor, str]:
    """
    Train spending predictor with MLflow tracking.
    
    Args:
        data_path: Path to transaction data JSON
        category: Category to predict
        run_name: MLflow run name
        
    Returns:
        Trained model and run ID
    """
    # Load data
    with open(data_path, 'r') as f:
        transactions = json.load(f)
    
    # Initialize model
    predictor = SpendingPredictor(category=category)
    
    # Prepare data
    data = predictor.prepare_data(transactions)
    
    # Start MLflow run
    with mlflow.start_run(run_name=run_name or f"spending_predictor_{category or 'total'}") as run:
        # Log parameters
        mlflow.log_param('category', category or 'total')
        mlflow.log_param('train_size', len(data))
        mlflow.log_param('train_start', str(data['ds'].min()))
        mlflow.log_param('train_end', str(data['ds'].max()))
        
        # Train model
        metrics = predictor.train(data)
        
        # Log metrics
        mlflow.log_metrics(metrics)
        
        # Cross-validation
        try:
            cv_metrics = predictor.evaluate()
            mlflow.log_metric('cv_mae', cv_metrics['mae'].mean())
            mlflow.log_metric('cv_rmse', cv_metrics['rmse'].mean())
        except Exception as e:
            logger.warning(f"Cross-validation failed: {e}")
        
        # Log model
        mlflow.prophet.log_model(predictor.model, "model")
        
        # Save and log artifacts
        predictor.save('models/spending_predictor')
        mlflow.log_artifacts('models/spending_predictor')
        
        run_id = run.info.run_id
        logger.info(f"MLflow run completed: {run_id}")
    
    return predictor, run_id
