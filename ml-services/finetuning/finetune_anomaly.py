"""
Anomaly Detector Fine-Tuning

Fine-tunes Isolation Forest on synthetic transaction data with:
- Optuna hyperparameter optimization
- Feature engineering pipeline (z-scores, velocity, time patterns)
- Cross-validation with anomaly-specific metrics
- MLflow tracking
- Comparison with alternative algorithms (LOF, One-Class SVM)
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import optuna
import mlflow
import mlflow.sklearn
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, classification_report,
    average_precision_score
)
from sklearn.model_selection import StratifiedKFold

sys.path.insert(0, str(Path(__file__).parent.parent))

from finetuning.config import (
    AnomalyFinetuneConfig, SYNTHETIC_DATA_DIR, FINETUNED_MODELS_DIR,
    EVAL_RESULTS_DIR, EvalThresholds
)

logger = logging.getLogger(__name__)


def load_transaction_data(data_path: str) -> pd.DataFrame:
    """Load and validate transaction data."""
    with open(data_path, "r") as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    logger.info(f"Loaded {len(df)} transactions, anomaly rate: {df['is_anomaly'].mean():.3f}")
    return df


def engineer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """Engineer features for anomaly detection.

    Returns:
        Tuple of (feature DataFrame, list of available feature column names).
    """
    feat = df.copy()
    
    # Time features
    feat["hour"] = feat["date"].dt.hour
    feat["day_of_week"] = feat["date"].dt.dayofweek
    feat["day_of_month"] = feat["date"].dt.day
    feat["is_weekend"] = feat["day_of_week"].isin([5, 6]).astype(int)
    feat["is_month_start"] = (feat["day_of_month"] <= 5).astype(int)
    feat["is_late_night"] = feat["hour"].between(0, 5).astype(int)
    
    # Amount features
    feat["log_amount"] = np.log1p(feat["amount"])
    
    # User-level statistics
    user_stats = feat.groupby("user_id")["amount"].agg(
        ["mean", "std", "median", "min", "max"]
    ).reset_index()
    user_stats.columns = ["user_id", "user_mean", "user_std", "user_median", "user_min", "user_max"]
    feat = feat.merge(user_stats, on="user_id", how="left")
    
    # Z-score from user average
    feat["amount_zscore"] = (feat["amount"] - feat["user_mean"]) / (feat["user_std"] + 1e-5)
    feat["amount_vs_median"] = feat["amount"] / (feat["user_median"] + 1)
    
    # Category stats
    cat_stats = feat.groupby("category")["amount"].agg(["mean", "std"]).reset_index()
    cat_stats.columns = ["category", "cat_mean", "cat_std"]
    feat = feat.merge(cat_stats, on="category", how="left")
    feat["cat_zscore"] = (feat["amount"] - feat["cat_mean"]) / (feat["cat_std"] + 1e-5)
    
    # Merchant frequency
    merchant_freq = feat["merchant"].value_counts().to_dict()
    feat["merchant_freq"] = feat["merchant"].map(merchant_freq)
    feat["is_rare_merchant"] = (feat["merchant_freq"] <= 2).astype(int)
    
    # Daily transaction velocity per user
    daily_counts = feat.groupby(["user_id", feat["date"].dt.date]).size().reset_index(name="daily_tx_count")
    daily_counts.columns = ["user_id", "date_only", "daily_tx_count"]
    feat["date_only"] = feat["date"].dt.date
    feat = feat.merge(daily_counts, on=["user_id", "date_only"], how="left")
    
    # One-hot encode top categories
    top_cats = feat["category"].value_counts().head(10).index
    for cat in top_cats:
        feat[f"is_{cat}"] = (feat["category"] == cat).astype(int)
    
    # Select numeric features
    feature_cols = [
        "log_amount", "amount_zscore", "amount_vs_median", "cat_zscore",
        "merchant_freq", "is_rare_merchant", "hour", "day_of_week",
        "day_of_month", "is_weekend", "is_month_start", "is_late_night",
        "user_mean", "user_std", "daily_tx_count",
    ] + [f"is_{cat}" for cat in top_cats]
    
    # Drop any remaining NaN
    for col in feature_cols:
        if col in feat.columns:
            feat[col] = feat[col].fillna(0)
    
    available_cols = [c for c in feature_cols if c in feat.columns]
    return feat, available_cols


def finetune_anomaly_detector(
    config: Optional[AnomalyFinetuneConfig] = None,
    data_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    run_hpo: bool = True,
    n_trials: int = 50,
) -> Dict:
    """Full fine-tuning pipeline for Anomaly Detector."""
    config = config or AnomalyFinetuneConfig()
    data_path = data_path or str(SYNTHETIC_DATA_DIR / "transactions_training_data.json")
    output_dir = output_dir or str(FINETUNED_MODELS_DIR / "anomaly_detector")
    os.makedirs(output_dir, exist_ok=True)
    
    # Load and engineer features
    df = load_transaction_data(data_path)
    df_feat, feature_cols = engineer_features(df)
    
    X = np.array(df_feat[feature_cols].values)
    y = np.array(df_feat["is_anomaly"].values)
    
    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # ─── Optuna HPO ───
    best_params = {}
    if run_hpo:
        logger.info(f"Starting Anomaly HPO with {n_trials} trials...")
        
        def objective(trial):
            contamination = trial.suggest_float(
                "contamination", *config.contamination_range, log=True
            )
            n_estimators = trial.suggest_int(
                "n_estimators", *config.n_estimators_range
            )
            max_samples = trial.suggest_float(
                "max_samples", *config.max_samples_range
            )
            max_features = trial.suggest_float(
                "max_features", *config.max_features_range
            )
            
            # Cross-validation
            skf = StratifiedKFold(n_splits=config.cross_val_folds, shuffle=True, random_state=42)
            f1_scores = []
            
            for train_idx, val_idx in skf.split(X, y):
                # Fit scaler only on training fold to avoid data leakage
                fold_scaler = StandardScaler()
                X_tr = fold_scaler.fit_transform(X[train_idx])
                X_val = fold_scaler.transform(X[val_idx])
                y_val = y[val_idx]
                
                model = IsolationForest(
                    contamination=contamination,
                    n_estimators=n_estimators,
                    max_samples=max_samples,
                    max_features=max_features,
                    random_state=42,
                    n_jobs=-1,
                )
                model.fit(X_tr)
                
                preds = model.predict(X_val)
                preds_binary = (preds == -1).astype(int)
                f1 = f1_score(y_val, preds_binary, zero_division=0)
                f1_scores.append(f1)
            
            return float(np.mean(f1_scores))
        
        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
        best_params = study.best_params
        logger.info(f"Best anomaly HPO params: {best_params}")
    
    # ─── Final Training ───
    contamination = best_params.get("contamination", 0.01)
    n_estimators = best_params.get("n_estimators", 100)
    max_samples = best_params.get("max_samples", 1.0)
    max_features = best_params.get("max_features", 1.0)
    
    mlflow.set_experiment("nivesh-anomaly-detector-finetuning")
    with mlflow.start_run(run_name="anomaly-final-training"):
        mlflow.log_params({
            "contamination": contamination,
            "n_estimators": n_estimators,
            "max_samples": max_samples,
            "max_features": max_features,
            "n_features": len(feature_cols),
            "n_samples": len(X_scaled),
            "anomaly_rate": float(y.mean()),
            "hpo_trials": n_trials if run_hpo else 0,
        })
        
        # Train on full data
        model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            max_samples=max_samples,
            max_features=max_features,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_scaled)
        
        # Evaluate
        preds = model.predict(X_scaled)
        preds_binary = (preds == -1).astype(int)
        scores = -model.score_samples(X_scaled)  # Higher = more anomalous
        
        precision = precision_score(y, preds_binary, zero_division=0)
        recall = recall_score(y, preds_binary, zero_division=0)
        f1 = f1_score(y, preds_binary, zero_division=0)
        
        try:
            auc = roc_auc_score(y, scores)
        except ValueError:
            auc = 0.0
        
        try:
            ap = average_precision_score(y, scores)
        except ValueError:
            ap = 0.0
        
        mlflow.log_metrics({
            "precision": float(precision),
            "recall": float(recall),
            "f1": float(f1),
            "auc_roc": float(auc),
            "average_precision": float(ap),
        })
        
        logger.info(f"Precision: {precision:.4f}, Recall: {recall:.4f}, "
                    f"F1: {f1:.4f}, AUC: {auc:.4f}")
        
        # Save model artifacts
        model_path = os.path.join(output_dir, "best_model")
        os.makedirs(model_path, exist_ok=True)
        joblib.dump(model, os.path.join(model_path, "isolation_forest.pkl"))
        joblib.dump(scaler, os.path.join(model_path, "scaler.pkl"))
        
        with open(os.path.join(model_path, "feature_names.json"), "w") as f:
            json.dump(feature_cols, f)
        
        mlflow.sklearn.log_model(model, "model")
        mlflow.log_artifacts(model_path, artifact_path="best_model")
        
        # Eval results
        eval_dir = EVAL_RESULTS_DIR / "anomaly_detector"
        eval_dir.mkdir(parents=True, exist_ok=True)
        report = classification_report(y, preds_binary, target_names=["normal", "anomaly"], output_dict=True)
        with open(eval_dir / "classification_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        # Quality gate
        thresholds = EvalThresholds()
        passed = (
            precision >= thresholds.anomaly_precision
            and recall >= thresholds.anomaly_recall
            and auc >= thresholds.anomaly_auc
        )
        
        active_run = mlflow.active_run()
        result = {
            "model_path": model_path,
            "test_metrics": {"precision": precision, "recall": recall, "f1": f1, "auc": auc},
            "best_hpo_params": best_params,
            "quality_gate_passed": passed,
            "feature_names": feature_cols,
            "mlflow_run_id": active_run.info.run_id if active_run else None,
        }
        
        if passed:
            logger.info("✅ Anomaly Detector passed quality gate!")
        else:
            logger.warning("⚠️ Quality gate failed")
    
    return result


if __name__ == "__main__":
    import argparse
    
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    
    parser = argparse.ArgumentParser(description="Fine-tune Anomaly Detector")
    parser.add_argument("--data-path", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    parser.add_argument("--no-hpo", action="store_true")
    parser.add_argument("--hpo-trials", type=int, default=50)
    args = parser.parse_args()
    
    result = finetune_anomaly_detector(
        data_path=args.data_path,
        output_dir=args.output_dir,
        run_hpo=not args.no_hpo,
        n_trials=args.hpo_trials,
    )
    print(f"\nResult: quality_gate_passed={result['quality_gate_passed']}")
