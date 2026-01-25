"""
Data Drift Detection and Monitoring

Uses Evidently AI for detecting data drift in production models.
Supports:
- Data drift detection (feature distribution changes)
- Prediction drift detection (target distribution changes)
- Model performance degradation detection
- Automated alerts and reports
- Integration with Prometheus metrics
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
from evidently import ColumnMapping
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset, DataQualityPreset
from evidently.metrics import *
from evidently.test_suite import TestSuite
from evidently.tests import *

logger = logging.getLogger(__name__)


class DriftMonitor:
    """Monitor data and prediction drift for ML models."""
    
    def __init__(
        self,
        model_name: str,
        reference_data: Optional[pd.DataFrame] = None,
        drift_threshold: float = 0.3
    ):
        """
        Initialize drift monitor.
        
        Args:
            model_name: Name of the model to monitor
            reference_data: Reference/training data for comparison
            drift_threshold: Drift score threshold for alerts (0-1)
        """
        self.model_name = model_name
        self.reference_data = reference_data
        self.drift_threshold = drift_threshold
        self.reports_dir = Path(f'reports/{model_name}')
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        self.drift_history = []
        
    def detect_data_drift(
        self,
        current_data: pd.DataFrame,
        column_mapping: Optional[ColumnMapping] = None
    ) -> Dict:
        """
        Detect data drift between reference and current data.
        
        Args:
            current_data: Current production data
            column_mapping: Evidently column mapping
            
        Returns:
            Drift detection results
        """
        if self.reference_data is None:
            raise ValueError("Reference data not set. Use set_reference_data() first.")
        
        logger.info(f"Detecting data drift for {self.model_name}")
        logger.info(f"Reference data: {len(self.reference_data)} samples")
        logger.info(f"Current data: {len(current_data)} samples")
        
        # Create drift report
        report = Report(metrics=[
            DataDriftPreset(),
        ])
        
        report.run(
            reference_data=self.reference_data,
            current_data=current_data,
            column_mapping=column_mapping
        )
        
        # Extract results
        results = report.as_dict()
        
        # Calculate overall drift metrics
        drift_summary = self._extract_drift_summary(results)
        
        # Save report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_path = self.reports_dir / f'data_drift_{timestamp}.html'
        report.save_html(str(report_path))
        
        logger.info(f"Drift report saved to {report_path}")
        logger.info(f"Dataset drift detected: {drift_summary['dataset_drift']}")
        logger.info(f"Drift score: {drift_summary['drift_score']:.4f}")
        
        # Store in history
        drift_summary['timestamp'] = timestamp
        drift_summary['report_path'] = str(report_path)
        self.drift_history.append(drift_summary)
        
        return drift_summary
    
    def detect_target_drift(
        self,
        current_data: pd.DataFrame,
        target_column: str,
        prediction_column: Optional[str] = None
    ) -> Dict:
        """
        Detect target/prediction drift.
        
        Args:
            current_data: Current production data with predictions
            target_column: Name of target column
            prediction_column: Name of prediction column
            
        Returns:
            Target drift results
        """
        if self.reference_data is None:
            raise ValueError("Reference data not set.")
        
        logger.info(f"Detecting target drift for {self.model_name}")
        
        # Create column mapping
        column_mapping = ColumnMapping(
            target=target_column,
            prediction=prediction_column
        )
        
        # Create drift report
        report = Report(metrics=[
            TargetDriftPreset(),
        ])
        
        report.run(
            reference_data=self.reference_data,
            current_data=current_data,
            column_mapping=column_mapping
        )
        
        results = report.as_dict()
        
        # Extract target drift metrics
        target_drift = self._extract_target_drift(results)
        
        # Save report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_path = self.reports_dir / f'target_drift_{timestamp}.html'
        report.save_html(str(report_path))
        
        logger.info(f"Target drift report saved to {report_path}")
        
        return target_drift
    
    def create_comprehensive_report(
        self,
        current_data: pd.DataFrame,
        column_mapping: Optional[ColumnMapping] = None
    ) -> str:
        """
        Create comprehensive drift and quality report.
        
        Args:
            current_data: Current production data
            column_mapping: Column mapping
            
        Returns:
            Path to saved report
        """
        logger.info(f"Creating comprehensive report for {self.model_name}")
        
        report = Report(metrics=[
            DataDriftPreset(),
            DataQualityPreset(),
        ])
        
        report.run(
            reference_data=self.reference_data,
            current_data=current_data,
            column_mapping=column_mapping
        )
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_path = self.reports_dir / f'comprehensive_{timestamp}.html'
        report.save_html(str(report_path))
        
        logger.info(f"Comprehensive report saved to {report_path}")
        
        return str(report_path)
    
    def run_drift_tests(
        self,
        current_data: pd.DataFrame,
        column_mapping: Optional[ColumnMapping] = None
    ) -> Dict:
        """
        Run automated drift tests.
        
        Args:
            current_data: Current production data
            column_mapping: Column mapping
            
        Returns:
            Test results
        """
        logger.info(f"Running drift tests for {self.model_name}")
        
        # Create test suite
        test_suite = TestSuite(tests=[
            TestNumberOfColumnsWithMissingValues(),
            TestNumberOfRowsWithMissingValues(),
            TestNumberOfConstantColumns(),
            TestNumberOfDuplicatedRows(),
            TestNumberOfDuplicatedColumns(),
            TestColumnsType(),
            TestNumberOfDriftedColumns(columns=None),
        ])
        
        test_suite.run(
            reference_data=self.reference_data,
            current_data=current_data,
            column_mapping=column_mapping
        )
        
        results = test_suite.as_dict()
        
        # Count passed/failed tests
        test_summary = {
            'total_tests': len(results['tests']),
            'passed': sum(1 for test in results['tests'] if test['status'] == 'SUCCESS'),
            'failed': sum(1 for test in results['tests'] if test['status'] == 'FAIL'),
            'warnings': sum(1 for test in results['tests'] if test['status'] == 'WARNING'),
        }
        
        # Save test report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_path = self.reports_dir / f'tests_{timestamp}.html'
        test_suite.save_html(str(report_path))
        
        logger.info(f"Tests: {test_summary['passed']}/{test_summary['total_tests']} passed")
        logger.info(f"Test report saved to {report_path}")
        
        return test_summary
    
    def check_drift_alert(self, drift_summary: Dict) -> Dict:
        """
        Check if drift exceeds threshold and create alert.
        
        Args:
            drift_summary: Drift detection results
            
        Returns:
            Alert information
        """
        drift_score = drift_summary.get('drift_score', 0)
        dataset_drift = drift_summary.get('dataset_drift', False)
        
        alert = {
            'model_name': self.model_name,
            'timestamp': datetime.now().isoformat(),
            'drift_score': drift_score,
            'threshold': self.drift_threshold,
            'alert_triggered': drift_score > self.drift_threshold,
            'severity': self._get_severity(drift_score),
            'recommendation': self._get_recommendation(drift_score),
        }
        
        if alert['alert_triggered']:
            logger.warning(f"DRIFT ALERT for {self.model_name}!")
            logger.warning(f"Drift score {drift_score:.4f} exceeds threshold {self.drift_threshold}")
            logger.warning(f"Severity: {alert['severity']}")
            logger.warning(f"Recommendation: {alert['recommendation']}")
        
        return alert
    
    def _extract_drift_summary(self, results: Dict) -> Dict:
        """Extract drift summary from Evidently results."""
        metrics = results.get('metrics', [])
        
        drift_summary = {
            'dataset_drift': False,
            'drift_score': 0.0,
            'drifted_features': [],
            'drift_by_feature': {},
        }
        
        # Find DataDriftTable metric
        for metric in metrics:
            if metric.get('metric') == 'DataDriftTable':
                metric_result = metric.get('result', {})
                
                drift_summary['dataset_drift'] = metric_result.get('dataset_drift', False)
                drift_summary['drift_share'] = metric_result.get('drift_share', 0.0)
                drift_summary['number_of_drifted_columns'] = metric_result.get('number_of_drifted_columns', 0)
                
                # Extract per-feature drift
                drift_by_columns = metric_result.get('drift_by_columns', {})
                for feature, drift_info in drift_by_columns.items():
                    if drift_info.get('drift_detected', False):
                        drift_summary['drifted_features'].append(feature)
                        drift_summary['drift_by_feature'][feature] = {
                            'drift_score': drift_info.get('drift_score', 0),
                            'stattest_name': drift_info.get('stattest_name', 'unknown'),
                        }
                
                # Calculate overall drift score (share of drifted features)
                drift_summary['drift_score'] = drift_summary.get('drift_share', 0.0)
                
                break
        
        return drift_summary
    
    def _extract_target_drift(self, results: Dict) -> Dict:
        """Extract target drift from Evidently results."""
        metrics = results.get('metrics', [])
        
        target_drift = {
            'target_drift_detected': False,
            'target_drift_score': 0.0,
        }
        
        for metric in metrics:
            if 'TargetDrift' in metric.get('metric', ''):
                metric_result = metric.get('result', {})
                target_drift['target_drift_detected'] = metric_result.get('drift_detected', False)
                target_drift['target_drift_score'] = metric_result.get('drift_score', 0.0)
                break
        
        return target_drift
    
    def _get_severity(self, drift_score: float) -> str:
        """Determine alert severity based on drift score."""
        if drift_score < 0.1:
            return 'LOW'
        elif drift_score < 0.3:
            return 'MEDIUM'
        elif drift_score < 0.5:
            return 'HIGH'
        else:
            return 'CRITICAL'
    
    def _get_recommendation(self, drift_score: float) -> str:
        """Get recommendation based on drift score."""
        if drift_score < 0.1:
            return "Continue monitoring. No action needed."
        elif drift_score < 0.3:
            return "Monitor closely. Consider investigating drifted features."
        elif drift_score < 0.5:
            return "Retrain model within 7 days. Data distribution has shifted significantly."
        else:
            return "URGENT: Retrain model immediately. Critical drift detected."
    
    def set_reference_data(self, reference_data: pd.DataFrame):
        """Set or update reference data."""
        self.reference_data = reference_data
        logger.info(f"Reference data updated: {len(reference_data)} samples")
    
    def get_drift_history(self) -> List[Dict]:
        """Get drift detection history."""
        return self.drift_history
    
    def save_drift_history(self, path: str):
        """Save drift history to file."""
        with open(path, 'w') as f:
            json.dump(self.drift_history, f, indent=2, default=str)
        logger.info(f"Drift history saved to {path}")
    
    def export_prometheus_metrics(self) -> Dict[str, float]:
        """
        Export drift metrics for Prometheus.
        
        Returns:
            Dictionary of metric_name: value
        """
        if not self.drift_history:
            return {}
        
        latest = self.drift_history[-1]
        
        return {
            f'model_drift_score_{{{self.model_name}}}': latest.get('drift_score', 0),
            f'model_dataset_drift_{{{self.model_name}}}': 1 if latest.get('dataset_drift') else 0,
            f'model_drifted_features_{{{self.model_name}}}': len(latest.get('drifted_features', [])),
        }


def create_drift_monitoring_job(
    model_name: str,
    reference_data: pd.DataFrame,
    production_data_loader,
    schedule_days: int = 7
) -> Dict:
    """
    Create a drift monitoring job configuration.
    
    Args:
        model_name: Name of model to monitor
        reference_data: Training/reference data
        production_data_loader: Function to load production data
        schedule_days: How often to run (in days)
        
    Returns:
        Job configuration
    """
    monitor = DriftMonitor(model_name, reference_data)
    
    job_config = {
        'model_name': model_name,
        'schedule_days': schedule_days,
        'drift_threshold': 0.3,
        'created_at': datetime.now().isoformat(),
    }
    
    logger.info(f"Created drift monitoring job for {model_name}")
    logger.info(f"Schedule: Every {schedule_days} days")
    
    return job_config
