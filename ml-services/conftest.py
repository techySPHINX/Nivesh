"""
Root conftest.py for ml-services tests.

This file is loaded by pytest BEFORE any test modules are imported.
It pre-mocks heavy ML dependencies that are not installed in the
local test environment (mlflow, torch, transformers, prophet, datasets, spacy)
while leaving lighter deps (numpy, pandas, sklearn, xgboost, pydantic,
fastapi, redis, psutil, prometheus_client, joblib) as real imports.
"""

import sys
from unittest.mock import MagicMock

# =============================================
# Mock mlflow and sub-modules
# =============================================
_mlflow = MagicMock()
_mlflow.get_tracking_uri.return_value = "http://mock-mlflow:5000"
_mlflow.set_tracking_uri = MagicMock()
_mlflow.start_run = MagicMock()
_mlflow.log_param = MagicMock()
_mlflow.log_params = MagicMock()
_mlflow.log_metric = MagicMock()
_mlflow.log_metrics = MagicMock()
_mlflow.log_artifacts = MagicMock()

for submod in [
    "mlflow", "mlflow.sklearn", "mlflow.xgboost", "mlflow.pytorch",
    "mlflow.prophet", "mlflow.pyfunc", "mlflow.tracking",
    "mlflow.entities", "mlflow.models",
]:
    sys.modules[submod] = _mlflow if submod == "mlflow" else MagicMock()

# =============================================
# Mock torch and sub-modules
# =============================================
_torch = MagicMock()
_torch.no_grad.return_value.__enter__ = MagicMock(return_value=None)
_torch.no_grad.return_value.__exit__ = MagicMock(return_value=False)
_torch.tensor = MagicMock()

for submod in [
    "torch", "torch.nn", "torch.onnx", "torch.cuda",
    "torch.utils", "torch.utils.data",
]:
    sys.modules[submod] = _torch if submod == "torch" else MagicMock()

# =============================================
# Mock transformers and sub-modules
# =============================================
for submod in [
    "transformers",
    "transformers.DistilBertForSequenceClassification",
    "transformers.DistilBertTokenizer",
    "transformers.Trainer",
    "transformers.TrainingArguments",
    "transformers.EarlyStoppingCallback",
]:
    sys.modules.setdefault(submod, MagicMock())

# =============================================
# Mock datasets
# =============================================
sys.modules.setdefault("datasets", MagicMock())

# =============================================
# Mock prophet
# =============================================
_mock_prophet_module = MagicMock()
sys.modules.setdefault("prophet", _mock_prophet_module)
sys.modules.setdefault("prophet.diagnostics", MagicMock())

# =============================================
# Mock spacy
# =============================================
sys.modules.setdefault("spacy", MagicMock())
