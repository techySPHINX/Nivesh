"""
Data Validation Pipeline for ML Services
Ensures data quality before training and inference

Version: 1.0.0
"""

from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field, validator
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DataQualityReport(BaseModel):
    """Data quality assessment report"""
    total_records: int
    valid_records: int
    invalid_records: int
    missing_values: Dict[str, int]
    outliers: Dict[str, int]
    duplicates: int
    quality_score: float
    issues: List[str]
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat())


class DataValidator:
    """Validates data quality for ML models"""

    def __init__(
        self,
        max_missing_ratio: float = 0.1,
        outlier_method: str = 'iqr',
        outlier_threshold: float = 1.5
    ):
        self.max_missing_ratio = max_missing_ratio
        self.outlier_method = outlier_method
        self.outlier_threshold = outlier_threshold

    def validate_dataframe(
        self,
        df: pd.DataFrame,
        schema: Optional[Dict[str, type]] = None,
        required_columns: Optional[List[str]] = None
    ) -> DataQualityReport:
        """
        Validate a pandas DataFrame

        Args:
            df: DataFrame to validate
            schema: Expected column types
            required_columns: Columns that must be present

        Returns:
            DataQualityReport with validation results
        """
        issues = []

        # Check required columns
        if required_columns:
            missing_cols = set(required_columns) - set(df.columns)
            if missing_cols:
                issues.append(f"Missing required columns: {missing_cols}")

        # Check schema
        if schema:
            for col, expected_type in schema.items():
                if col in df.columns:
                    actual_type = df[col].dtype
                    if not self._types_compatible(actual_type, expected_type):
                        issues.append(
                            f"Column '{col}' has type {actual_type}, expected {expected_type}"
                        )

        # Check missing values
        missing_values = df.isnull().sum().to_dict()
        for col, count in missing_values.items():
            ratio = count / len(df)
            if ratio > self.max_missing_ratio:
                issues.append(
                    f"Column '{col}' has {ratio:.1%} missing values (threshold: {self.max_missing_ratio:.1%})"
                )

        # Check for duplicates
        duplicates = df.duplicated().sum()
        if duplicates > 0:
            issues.append(f"Found {duplicates} duplicate rows")

        # Check for outliers in numeric columns
        outliers = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            outlier_count = self._detect_outliers(df[col])
            if outlier_count > 0:
                outliers[col] = outlier_count

        # Calculate quality score
        total_issues = len(issues) + sum(outliers.values())
        quality_score = max(
            0, 1 - (total_issues / (len(df) * len(df.columns))))

        return DataQualityReport(
            total_records=len(df),
            valid_records=len(df) - df.isnull().any(axis=1).sum(),
            invalid_records=df.isnull().any(axis=1).sum(),
            missing_values=missing_values,
            outliers=outliers,
            duplicates=int(duplicates),
            quality_score=quality_score,
            issues=issues
        )

    def _types_compatible(self, actual, expected) -> bool:
        """Check if actual type is compatible with expected type"""
        type_map = {
            int: [np.int8, np.int16, np.int32, np.int64],
            float: [np.float16, np.float32, np.float64],
            str: [object],
            bool: [bool],
        }

        if expected in type_map:
            return actual in type_map[expected]

        return actual == expected

    def _detect_outliers(self, series: pd.Series) -> int:
        """Detect outliers in a numeric series"""
        if self.outlier_method == 'iqr':
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1

            lower_bound = Q1 - self.outlier_threshold * IQR
            upper_bound = Q3 + self.outlier_threshold * IQR

            outliers = (series < lower_bound) | (series > upper_bound)
            return outliers.sum()

        elif self.outlier_method == 'zscore':
            z_scores = np.abs((series - series.mean()) / series.std())
            outliers = z_scores > self.outlier_threshold
            return outliers.sum()

        return 0


class FeatureValidator:
    """Validates features for ML models"""

    @staticmethod
    def validate_intent_features(data: Dict[str, Any]) -> bool:
        """Validate intent classification features"""
        required_fields = ['query']

        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        if not isinstance(data['query'], str):
            raise ValueError("Query must be a string")

        if len(data['query']) < 3:
            raise ValueError("Query too short (minimum 3 characters)")

        if len(data['query']) > 512:
            raise ValueError("Query too long (maximum 512 characters)")

        return True

    @staticmethod
    def validate_transaction_features(data: Dict[str, Any]) -> bool:
        """Validate transaction features"""
        required_fields = ['amount', 'category', 'timestamp']

        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        if not isinstance(data['amount'], (int, float)):
            raise ValueError("Amount must be numeric")

        if data['amount'] <= 0:
            raise ValueError("Amount must be positive")

        return True

    @staticmethod
    def validate_credit_application(data: Dict[str, Any]) -> bool:
        """Validate credit risk features"""
        required_fields = ['income', 'employment_length', 'credit_history']

        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        if data['income'] <= 0:
            raise ValueError("Income must be positive")

        if data['employment_length'] < 0:
            raise ValueError("Employment length cannot be negative")

        return True


# Export
__all__ = [
    'DataValidator',
    'FeatureValidator',
    'DataQualityReport'
]
