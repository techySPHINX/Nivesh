"""
Credit Risk Scoring Model

Uses XGBoost for predicting loan default probability.
Supports:
- Credit risk classification (default/no-default)
- Risk score generation (0-100)
- Feature importance analysis
- Fairness validation across demographic segments
- SHAP explanations for interpretability
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    roc_curve, precision_recall_curve, f1_score
)
import mlflow
import mlflow.xgboost
import joblib

logger = logging.getLogger(__name__)


class CreditRiskScorer:
    """XGBoost-based credit risk scoring model."""
    
    def __init__(
        self,
        max_depth: int = 6,
        n_estimators: int = 100,
        learning_rate: float = 0.1,
        min_child_weight: int = 1,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        random_state: int = 42
    ):
        """
        Initialize credit risk scorer.
        
        Args:
            max_depth: Maximum tree depth
            n_estimators: Number of boosting rounds
            learning_rate: Step size shrinkage
            min_child_weight: Minimum sum of instance weight needed in a child
            subsample: Subsample ratio of training instances
            colsample_bytree: Subsample ratio of columns when constructing each tree
            random_state: Random seed
        """
        self.max_depth = max_depth
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.min_child_weight = min_child_weight
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.random_state = random_state
        
        self.model = None
        self.scaler = None
        self.label_encoders = {}
        self.feature_names = None
        self.feature_importances_ = None
        self.training_metadata = {}
        
    def engineer_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Engineer credit risk features.
        
        Args:
            data: Raw applicant data
            
        Returns:
            DataFrame with engineered features
        """
        df = data.copy()
        
        # Financial ratios
        if 'monthly_income' in df.columns and 'monthly_debt' in df.columns:
            df['debt_to_income'] = df['monthly_debt'] / (df['monthly_income'] + 1)
            df['income_to_debt'] = df['monthly_income'] / (df['monthly_debt'] + 1)
        
        if 'credit_limit' in df.columns and 'credit_used' in df.columns:
            df['credit_utilization'] = df['credit_used'] / (df['credit_limit'] + 1)
            df['available_credit'] = df['credit_limit'] - df['credit_used']
        
        if 'loan_amount' in df.columns and 'monthly_income' in df.columns:
            df['loan_to_income'] = df['loan_amount'] / (df['monthly_income'] * 12 + 1)
        
        # Payment history features
        if 'payments_missed' in df.columns and 'total_payments' in df.columns:
            df['payment_miss_rate'] = df['payments_missed'] / (df['total_payments'] + 1)
        
        # Age-based features
        if 'age' in df.columns:
            df['age_group'] = pd.cut(
                df['age'],
                bins=[0, 25, 35, 45, 55, 100],
                labels=['18-25', '26-35', '36-45', '46-55', '55+']
            )
        
        # Employment stability
        if 'months_employed' in df.columns:
            df['employment_stability'] = pd.cut(
                df['months_employed'],
                bins=[0, 6, 12, 24, 60, 1000],
                labels=['0-6m', '6-12m', '1-2y', '2-5y', '5y+']
            )
        
        # Credit history length
        if 'credit_history_months' in df.columns:
            df['credit_history_years'] = df['credit_history_months'] / 12
            df['has_long_history'] = (df['credit_history_months'] >= 36).astype(int)
        
        # Number of accounts features
        if 'num_credit_accounts' in df.columns:
            df['has_multiple_accounts'] = (df['num_credit_accounts'] > 1).astype(int)
        
        # Boolean features
        if 'has_mortgage' in df.columns:
            df['has_mortgage'] = df['has_mortgage'].astype(int)
        if 'has_car_loan' in df.columns:
            df['has_car_loan'] = df['has_car_loan'].astype(int)
        
        logger.info(f"Engineered {len(df.columns)} features")
        
        return df
    
    def prepare_data(
        self,
        data: List[Dict],
        target_col: str = 'default'
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare data for training.
        
        Args:
            data: List of applicant dictionaries
            target_col: Name of target column (default/no-default)
            
        Returns:
            Feature matrix and target labels
        """
        df = pd.DataFrame(data)
        
        # Engineer features
        df = self.engineer_features(df)
        
        # Separate target
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in data")
        
        y = df[target_col].copy()
        X = df.drop(columns=[target_col])
        
        # Encode categorical variables
        categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
        
        for col in categorical_cols:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                X[col] = self.label_encoders[col].fit_transform(X[col].astype(str))
            else:
                X[col] = self.label_encoders[col].transform(X[col].astype(str))
        
        # Store feature names
        self.feature_names = X.columns.tolist()
        
        # Handle missing values
        X = X.fillna(X.median())
        
        logger.info(f"Prepared {len(X)} samples with {len(X.columns)} features")
        logger.info(f"Class distribution: {y.value_counts().to_dict()}")
        
        return X, y
    
    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        eval_set: Optional[Tuple] = None,
        early_stopping_rounds: int = 10
    ) -> Dict[str, float]:
        """
        Train XGBoost model.
        
        Args:
            X: Feature matrix
            y: Target labels
            eval_set: Optional validation set (X_val, y_val)
            early_stopping_rounds: Stop if no improvement for N rounds
            
        Returns:
            Training metrics
        """
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Initialize XGBoost classifier
        logger.info("Training XGBoost classifier...")
        
        self.model = xgb.XGBClassifier(
            max_depth=self.max_depth,
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            min_child_weight=self.min_child_weight,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            objective='binary:logistic',
            eval_metric='auc',
            random_state=self.random_state,
            n_jobs=-1
        )
        
        # Prepare eval set if provided
        eval_sets = []
        if eval_set:
            X_val, y_val = eval_set
            X_val_scaled = self.scaler.transform(X_val)
            eval_sets = [(X_scaled, y), (X_val_scaled, y_val)]
        
        # Train
        if eval_sets:
            self.model.fit(
                X_scaled, y,
                eval_set=eval_sets,
                early_stopping_rounds=early_stopping_rounds,
                verbose=False
            )
        else:
            self.model.fit(X_scaled, y)
        
        # Get feature importances
        self.feature_importances_ = dict(zip(
            self.feature_names,
            self.model.feature_importances_
        ))
        
        # Evaluate on training set
        y_pred = self.model.predict(X_scaled)
        y_proba = self.model.predict_proba(X_scaled)[:, 1]
        
        metrics = {
            'accuracy': float((y_pred == y).mean()),
            'auc_roc': float(roc_auc_score(y, y_proba)),
            'f1_score': float(f1_score(y, y_pred)),
        }
        
        # Precision/Recall at different thresholds
        precision, recall, thresholds = precision_recall_curve(y, y_proba)
        metrics['precision_at_80_recall'] = float(precision[recall >= 0.8][0]) if any(recall >= 0.8) else 0
        
        # Add validation metrics if available
        if eval_set:
            y_val_pred = self.model.predict(X_val_scaled)
            y_val_proba = self.model.predict_proba(X_val_scaled)[:, 1]
            
            metrics['val_accuracy'] = float((y_val_pred == y_val).mean())
            metrics['val_auc_roc'] = float(roc_auc_score(y_val, y_val_proba))
            metrics['val_f1_score'] = float(f1_score(y_val, y_val_pred))
        
        # Store metadata
        self.training_metadata = {
            'train_size': len(X),
            'n_features': X.shape[1],
            'max_depth': self.max_depth,
            'n_estimators': self.n_estimators,
            'learning_rate': self.learning_rate,
        }
        
        logger.info(f"Training complete. AUC-ROC: {metrics['auc_roc']:.4f}, F1: {metrics['f1_score']:.4f}")
        
        return metrics
    
    def predict(
        self,
        applicant_data: Dict,
        return_probability: bool = True
    ) -> Dict:
        """
        Predict credit risk for an applicant.
        
        Args:
            applicant_data: Applicant information dictionary
            return_probability: Whether to return default probability
            
        Returns:
            Prediction result with risk score
        """
        if not self.model or not self.scaler:
            raise ValueError("Model not trained yet")
        
        # Convert to DataFrame
        df = pd.DataFrame([applicant_data])
        
        # Engineer features
        df = self.engineer_features(df)
        
        # Encode categorical variables
        for col in self.label_encoders:
            if col in df.columns:
                df[col] = self.label_encoders[col].transform(df[col].astype(str))
        
        # Ensure all features present
        for feat in self.feature_names:
            if feat not in df.columns:
                df[feat] = 0
        
        X = df[self.feature_names].fillna(0)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        probability = self.model.predict_proba(X_scaled)[0, 1]
        
        # Convert probability to risk score (0-100)
        risk_score = int(probability * 100)
        
        # Risk category
        if risk_score < 30:
            risk_category = 'low'
        elif risk_score < 60:
            risk_category = 'medium'
        else:
            risk_category = 'high'
        
        result = {
            'will_default': bool(prediction == 1),
            'risk_score': risk_score,
            'risk_category': risk_category,
        }
        
        if return_probability:
            result['default_probability'] = float(probability)
            result['no_default_probability'] = float(1 - probability)
        
        return result
    
    def get_feature_importance(self, top_n: int = 10) -> List[Dict]:
        """
        Get top N most important features.
        
        Args:
            top_n: Number of features to return
            
        Returns:
            List of feature importance dicts
        """
        if not self.feature_importances_:
            raise ValueError("Model not trained yet")
        
        sorted_features = sorted(
            self.feature_importances_.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_n]
        
        return [
            {'feature': feat, 'importance': float(imp)}
            for feat, imp in sorted_features
        ]
    
    def validate_fairness(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        sensitive_features: List[str]
    ) -> Dict:
        """
        Validate model fairness across demographic groups.
        
        Args:
            X: Feature matrix
            y: True labels
            sensitive_features: List of sensitive feature names (e.g., 'age_group', 'gender')
            
        Returns:
            Fairness metrics by group
        """
        if not self.model:
            raise ValueError("Model not trained yet")
        
        X_scaled = self.scaler.transform(X)
        y_pred = self.model.predict(X_scaled)
        y_proba = self.model.predict_proba(X_scaled)[:, 1]
        
        fairness_results = {}
        
        for feature in sensitive_features:
            if feature not in X.columns:
                continue
            
            groups = X[feature].unique()
            group_metrics = {}
            
            for group in groups:
                mask = X[feature] == group
                if mask.sum() == 0:
                    continue
                
                group_metrics[str(group)] = {
                    'n_samples': int(mask.sum()),
                    'accuracy': float((y_pred[mask] == y[mask]).mean()),
                    'auc_roc': float(roc_auc_score(y[mask], y_proba[mask])) if len(np.unique(y[mask])) > 1 else None,
                    'approval_rate': float((y_pred[mask] == 0).mean()),  # 0 = no default
                }
            
            fairness_results[feature] = group_metrics
        
        logger.info(f"Fairness validation completed for {len(sensitive_features)} features")
        
        return fairness_results
    
    def save(self, path: str) -> None:
        """
        Save model, scaler, and encoders to disk.
        
        Args:
            path: Directory to save model
        """
        if not self.model or not self.scaler:
            raise ValueError("Model not trained yet")
        
        model_path = Path(path)
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Save XGBoost model
        self.model.save_model(str(model_path / 'xgboost_model.json'))
        
        # Save scaler
        joblib.dump(self.scaler, model_path / 'scaler.pkl')
        
        # Save label encoders
        joblib.dump(self.label_encoders, model_path / 'label_encoders.pkl')
        
        # Save feature names
        with open(model_path / 'features.json', 'w') as f:
            json.dump(self.feature_names, f)
        
        # Save feature importances
        with open(model_path / 'feature_importances.json', 'w') as f:
            json.dump(self.feature_importances_, f, indent=2, default=float)
        
        # Save metadata
        with open(model_path / 'metadata.json', 'w') as f:
            json.dump(self.training_metadata, f, indent=2)
        
        logger.info(f"Model saved to {path}")
    
    @classmethod
    def load(cls, path: str) -> 'CreditRiskScorer':
        """
        Load model from disk.
        
        Args:
            path: Directory containing saved model
            
        Returns:
            Loaded CreditRiskScorer instance
        """
        model_path = Path(path)
        
        # Load metadata
        with open(model_path / 'metadata.json', 'r') as f:
            metadata = json.load(f)
        
        scorer = cls(
            max_depth=metadata.get('max_depth', 6),
            n_estimators=metadata.get('n_estimators', 100),
            learning_rate=metadata.get('learning_rate', 0.1)
        )
        
        # Load XGBoost model
        scorer.model = xgb.XGBClassifier()
        scorer.model.load_model(str(model_path / 'xgboost_model.json'))
        
        # Load scaler
        scorer.scaler = joblib.load(model_path / 'scaler.pkl')
        
        # Load label encoders
        scorer.label_encoders = joblib.load(model_path / 'label_encoders.pkl')
        
        # Load feature names
        with open(model_path / 'features.json', 'r') as f:
            scorer.feature_names = json.load(f)
        
        # Load feature importances
        with open(model_path / 'feature_importances.json', 'r') as f:
            scorer.feature_importances_ = json.load(f)
        
        scorer.training_metadata = metadata
        
        logger.info(f"Model loaded from {path}")
        
        return scorer
