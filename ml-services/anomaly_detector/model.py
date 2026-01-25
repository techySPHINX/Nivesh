"""
Anomaly Detection Model

Uses Isolation Forest for detecting anomalous transactions.
Supports:
- Transaction-level anomaly detection
- User behavior profiling
- Feature engineering (z-scores, frequency, time patterns)
- Adaptive thresholds
- Real-time scoring
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import mlflow
import mlflow.sklearn
import joblib

logger = logging.getLogger(__name__)


class AnomalyDetector:
    """Isolation Forest-based transaction anomaly detector."""
    
    def __init__(
        self,
        contamination: float = 0.01,  # 1% expected anomaly rate
        n_estimators: int = 100,
        random_state: int = 42
    ):
        """
        Initialize anomaly detector.
        
        Args:
            contamination: Expected proportion of anomalies in dataset
            n_estimators: Number of isolation trees
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.user_profiles = {}  # Store user spending profiles
        self.training_metadata = {}
        
    def engineer_features(
        self,
        transactions: pd.DataFrame,
        user_profiles: Optional[Dict] = None
    ) -> pd.DataFrame:
        """
        Engineer features for anomaly detection.
        
        Args:
            transactions: DataFrame with transaction data
            user_profiles: Pre-computed user spending profiles
            
        Returns:
            DataFrame with engineered features
        """
        df = transactions.copy()
        
        # Convert date to datetime if needed
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df['hour'] = df['date'].dt.hour
            df['day_of_week'] = df['date'].dt.dayofweek
            df['day_of_month'] = df['date'].dt.day
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Basic amount features
        df['log_amount'] = np.log1p(df['amount'])
        
        # User-level statistics
        if 'user_id' in df.columns and user_profiles is None:
            user_stats = df.groupby('user_id')['amount'].agg([
                'mean', 'std', 'min', 'max', 'median'
            ]).reset_index()
            user_stats.columns = ['user_id', 'user_mean', 'user_std', 
                                  'user_min', 'user_max', 'user_median']
            df = df.merge(user_stats, on='user_id', how='left')
            
            # Z-score from user's typical spending
            df['amount_zscore'] = (df['amount'] - df['user_mean']) / (df['user_std'] + 1e-5)
        elif user_profiles:
            # Use pre-computed profiles
            for idx, row in df.iterrows():
                user_id = row.get('user_id')
                if user_id and user_id in user_profiles:
                    profile = user_profiles[user_id]
                    df.at[idx, 'user_mean'] = profile['mean_amount']
                    df.at[idx, 'user_std'] = profile['std_amount']
                    df.at[idx, 'amount_zscore'] = (
                        row['amount'] - profile['mean_amount']
                    ) / (profile['std_amount'] + 1e-5)
        
        # Category-level statistics
        if 'category' in df.columns:
            category_stats = df.groupby('category')['amount'].agg([
                'mean', 'std'
            ]).reset_index()
            category_stats.columns = ['category', 'category_mean', 'category_std']
            df = df.merge(category_stats, on='category', how='left')
            
            df['category_zscore'] = (
                df['amount'] - df['category_mean']
            ) / (df['category_std'] + 1e-5)
            
            # One-hot encode top categories
            top_categories = df['category'].value_counts().head(10).index
            for cat in top_categories:
                df[f'is_{cat}'] = (df['category'] == cat).astype(int)
        
        # Merchant frequency (how often this merchant is used)
        if 'merchant' in df.columns:
            merchant_counts = df['merchant'].value_counts().to_dict()
            df['merchant_frequency'] = df['merchant'].map(merchant_counts)
            df['is_new_merchant'] = (df['merchant_frequency'] == 1).astype(int)
        
        # Time-based features
        if 'hour' in df.columns:
            df['is_late_night'] = df['hour'].between(0, 5).astype(int)
            df['is_business_hours'] = df['hour'].between(9, 17).astype(int)
        
        # Velocity features (transactions per day)
        if 'user_id' in df.columns and 'date' in df.columns:
            daily_counts = df.groupby(['user_id', df['date'].dt.date]).size().reset_index(name='daily_tx_count')
            daily_counts['date'] = pd.to_datetime(daily_counts['date'])
            df = df.merge(daily_counts, left_on=['user_id', df['date'].dt.date], 
                         right_on=['user_id', daily_counts['date'].dt.date], 
                         how='left', suffixes=('', '_count'))
        
        logger.info(f"Engineered {len(df.columns)} features from {len(df)} transactions")
        
        return df
    
    def build_user_profiles(self, transactions: pd.DataFrame) -> Dict:
        """
        Build user spending profiles for anomaly detection.
        
        Args:
            transactions: Historical transaction data
            
        Returns:
            Dictionary of user profiles
        """
        profiles = {}
        
        if 'user_id' not in transactions.columns:
            return profiles
        
        for user_id in transactions['user_id'].unique():
            user_data = transactions[transactions['user_id'] == user_id]
            
            profiles[user_id] = {
                'mean_amount': user_data['amount'].mean(),
                'std_amount': user_data['amount'].std(),
                'median_amount': user_data['amount'].median(),
                'total_transactions': len(user_data),
                'common_categories': user_data['category'].value_counts().head(5).to_dict() if 'category' in user_data.columns else {},
                'common_merchants': user_data['merchant'].value_counts().head(5).to_dict() if 'merchant' in user_data.columns else {},
                'avg_daily_transactions': len(user_data) / max(1, (user_data['date'].max() - user_data['date'].min()).days),
            }
        
        logger.info(f"Built profiles for {len(profiles)} users")
        self.user_profiles = profiles
        
        return profiles
    
    def prepare_data(
        self,
        transactions: List[Dict],
        labels: Optional[List[int]] = None
    ) -> Tuple[pd.DataFrame, Optional[np.ndarray]]:
        """
        Prepare transaction data for training.
        
        Args:
            transactions: List of transaction dictionaries
            labels: Optional labels (1=normal, -1=anomaly) for supervised eval
            
        Returns:
            Engineered features DataFrame and labels array
        """
        df = pd.DataFrame(transactions)
        
        # Build user profiles
        self.build_user_profiles(df)
        
        # Engineer features
        df_features = self.engineer_features(df, self.user_profiles)
        
        # Select numerical features for model
        numeric_cols = df_features.select_dtypes(include=[np.number]).columns.tolist()
        
        # Remove ID columns and labels
        exclude_cols = ['user_id', 'transaction_id', 'label']
        numeric_cols = [col for col in numeric_cols if col not in exclude_cols]
        
        self.feature_names = numeric_cols
        X = df_features[numeric_cols].fillna(0)
        
        y = np.array(labels) if labels is not None else None
        
        logger.info(f"Prepared {len(X)} samples with {len(numeric_cols)} features")
        
        return X, y
    
    def train(
        self,
        X: pd.DataFrame,
        y: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Train Isolation Forest model.
        
        Args:
            X: Feature matrix
            y: Optional labels for evaluation (1=normal, -1=anomaly)
            
        Returns:
            Training metrics
        """
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Isolation Forest
        logger.info(f"Training Isolation Forest with contamination={self.contamination}")
        
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1,
            verbose=1
        )
        
        self.model.fit(X_scaled)
        
        # Predictions and scores
        predictions = self.model.predict(X_scaled)
        scores = self.model.score_samples(X_scaled)
        
        # Calculate metrics
        metrics = {
            'n_samples': len(X),
            'n_features': X.shape[1],
            'contamination': self.contamination,
            'anomalies_detected': int((predictions == -1).sum()),
            'anomaly_rate': float((predictions == -1).mean()),
            'avg_anomaly_score': float(scores[predictions == -1].mean()) if (predictions == -1).any() else 0,
            'avg_normal_score': float(scores[predictions == 1].mean()) if (predictions == 1).any() else 0,
        }
        
        # If labels provided, calculate supervised metrics
        if y is not None:
            metrics['accuracy'] = float((predictions == y).mean())
            metrics['precision'] = float(np.sum((predictions == -1) & (y == -1)) / max(1, np.sum(predictions == -1)))
            metrics['recall'] = float(np.sum((predictions == -1) & (y == -1)) / max(1, np.sum(y == -1)))
            
            # AUC-ROC
            if len(np.unique(y)) > 1:
                # Convert scores to probabilities (higher = more normal)
                probs = -scores  # Invert so anomalies have higher "probability"
                metrics['auc_roc'] = float(roc_auc_score(y == -1, probs))
        
        # Store metadata
        self.training_metadata = {
            'train_size': len(X),
            'n_features': X.shape[1],
            'contamination': self.contamination,
            'n_estimators': self.n_estimators,
        }
        
        logger.info(f"Training complete. Detected {metrics['anomalies_detected']} anomalies ({metrics['anomaly_rate']:.2%})")
        
        return metrics
    
    def predict(
        self,
        transaction: Dict,
        return_score: bool = False
    ) -> Dict:
        """
        Detect if a single transaction is anomalous.
        
        Args:
            transaction: Transaction dictionary
            return_score: Whether to return anomaly score
            
        Returns:
            Prediction result with is_anomaly flag and optional score
        """
        if not self.model or not self.scaler:
            raise ValueError("Model not trained yet")
        
        # Convert to DataFrame
        df = pd.DataFrame([transaction])
        
        # Engineer features
        df_features = self.engineer_features(df, self.user_profiles)
        
        # Extract features
        X = df_features[self.feature_names].fillna(0)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        score = self.model.score_samples(X_scaled)[0]
        
        result = {
            'is_anomaly': bool(prediction == -1),
            'confidence': abs(score),  # Distance from decision boundary
        }
        
        if return_score:
            result['anomaly_score'] = float(score)
            result['threshold'] = 0.0  # Scores below 0 are anomalies
        
        return result
    
    def predict_batch(
        self,
        transactions: List[Dict]
    ) -> List[Dict]:
        """
        Detect anomalies in batch of transactions.
        
        Args:
            transactions: List of transaction dictionaries
            
        Returns:
            List of prediction results
        """
        if not self.model or not self.scaler:
            raise ValueError("Model not trained yet")
        
        # Prepare data
        df = pd.DataFrame(transactions)
        df_features = self.engineer_features(df, self.user_profiles)
        X = df_features[self.feature_names].fillna(0)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        predictions = self.model.predict(X_scaled)
        scores = self.model.score_samples(X_scaled)
        
        results = []
        for pred, score in zip(predictions, scores):
            results.append({
                'is_anomaly': bool(pred == -1),
                'anomaly_score': float(score),
                'confidence': abs(score),
            })
        
        return results
    
    def save(self, path: str) -> None:
        """
        Save model, scaler, and metadata to disk.
        
        Args:
            path: Directory to save model
        """
        if not self.model or not self.scaler:
            raise ValueError("Model not trained yet")
        
        model_path = Path(path)
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Save model and scaler
        joblib.dump(self.model, model_path / 'isolation_forest.pkl')
        joblib.dump(self.scaler, model_path / 'scaler.pkl')
        
        # Save feature names
        with open(model_path / 'features.json', 'w') as f:
            json.dump(self.feature_names, f)
        
        # Save user profiles
        with open(model_path / 'user_profiles.json', 'w') as f:
            json.dump(self.user_profiles, f, indent=2, default=str)
        
        # Save metadata
        with open(model_path / 'metadata.json', 'w') as f:
            json.dump(self.training_metadata, f, indent=2)
        
        logger.info(f"Model saved to {path}")
    
    @classmethod
    def load(cls, path: str) -> 'AnomalyDetector':
        """
        Load model from disk.
        
        Args:
            path: Directory containing saved model
            
        Returns:
            Loaded AnomalyDetector instance
        """
        model_path = Path(path)
        
        # Load metadata to get init params
        with open(model_path / 'metadata.json', 'r') as f:
            metadata = json.load(f)
        
        detector = cls(
            contamination=metadata.get('contamination', 0.01),
            n_estimators=metadata.get('n_estimators', 100)
        )
        
        # Load model and scaler
        detector.model = joblib.load(model_path / 'isolation_forest.pkl')
        detector.scaler = joblib.load(model_path / 'scaler.pkl')
        
        # Load feature names
        with open(model_path / 'features.json', 'r') as f:
            detector.feature_names = json.load(f)
        
        # Load user profiles
        with open(model_path / 'user_profiles.json', 'r') as f:
            detector.user_profiles = json.load(f)
        
        detector.training_metadata = metadata
        
        logger.info(f"Model loaded from {path}")
        
        return detector
