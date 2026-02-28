"""
Spending Predictor Fine-Tuning

Fine-tunes Facebook Prophet on synthetic transaction data with:
- Optuna hyperparameter optimization
- Indian holiday/festival calendar
- Per-category and overall models
- Cross-validation with proper time series splits
- MLflow tracking
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import pandas as pd
import optuna
import mlflow
import mlflow.prophet
from prophet import Prophet
from prophet.diagnostics import cross_validation, performance_metrics
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

sys.path.insert(0, str(Path(__file__).parent.parent))

from finetuning.config import (
    SpendingFinetuneConfig, SYNTHETIC_DATA_DIR, FINETUNED_MODELS_DIR,
    EVAL_RESULTS_DIR, EvalThresholds
)

logger = logging.getLogger(__name__)


def get_indian_holidays() -> pd.DataFrame:
    """Create Indian holiday calendar for Prophet."""
    holidays = pd.DataFrame([
        # Republic Day
        *[{"holiday": "republic_day", "ds": f"{y}-01-26"} for y in range(2023, 2027)],
        # Holi (approximate)
        {"holiday": "holi", "ds": "2023-03-08"}, {"holiday": "holi", "ds": "2024-03-25"},
        {"holiday": "holi", "ds": "2025-03-14"}, {"holiday": "holi", "ds": "2026-03-03"},
        # Independence Day
        *[{"holiday": "independence_day", "ds": f"{y}-08-15"} for y in range(2023, 2027)],
        # Ganesh Chaturthi (approximate)
        {"holiday": "ganesh_chaturthi", "ds": "2023-09-19"}, {"holiday": "ganesh_chaturthi", "ds": "2024-09-07"},
        {"holiday": "ganesh_chaturthi", "ds": "2025-08-27"}, {"holiday": "ganesh_chaturthi", "ds": "2026-09-15"},
        # Navratri (approximate)
        {"holiday": "navratri", "ds": "2023-10-15"}, {"holiday": "navratri", "ds": "2024-10-03"},
        {"holiday": "navratri", "ds": "2025-10-22"}, {"holiday": "navratri", "ds": "2026-10-11"},
        # Dussehra (approximate)
        {"holiday": "dussehra", "ds": "2023-10-24"}, {"holiday": "dussehra", "ds": "2024-10-12"},
        {"holiday": "dussehra", "ds": "2025-10-31"}, {"holiday": "dussehra", "ds": "2026-10-20"},
        # Diwali (approximate)
        {"holiday": "diwali", "ds": "2023-11-12"}, {"holiday": "diwali", "ds": "2024-11-01"},
        {"holiday": "diwali", "ds": "2025-10-20"}, {"holiday": "diwali", "ds": "2026-11-08"},
        # Christmas
        *[{"holiday": "christmas", "ds": f"{y}-12-25"} for y in range(2023, 2027)],
        # New Year
        *[{"holiday": "new_year", "ds": f"{y}-01-01"} for y in range(2023, 2027)],
        # Eid (approximate)
        {"holiday": "eid_ul_fitr", "ds": "2023-04-22"}, {"holiday": "eid_ul_fitr", "ds": "2024-04-11"},
        {"holiday": "eid_ul_fitr", "ds": "2025-03-31"}, {"holiday": "eid_ul_fitr", "ds": "2026-03-20"},
        # Makar Sankranti / Pongal
        *[{"holiday": "makar_sankranti", "ds": f"{y}-01-14"} for y in range(2023, 2027)],
    ])
    holidays["ds"] = pd.to_datetime(holidays["ds"])
    # Add lower/upper window for festival shopping
    holidays["lower_window"] = -2
    holidays["upper_window"] = 2
    return holidays


def prepare_spending_data(data_path: str, category: str = None) -> pd.DataFrame:
    """Prepare transaction data for Prophet format."""
    with open(data_path, "r") as f:
        data = json.load(f)
    
    df = pd.DataFrame(data)
    df["date"] = pd.to_datetime(df["date"])
    
    # Filter anomalies for training
    if "is_anomaly" in df.columns:
        df = df[df["is_anomaly"] == 0]
    
    # Filter by category
    if category:
        df = df[df["category"] == category]
    
    # Aggregate daily
    daily = df.groupby("date")["amount"].sum().reset_index()
    daily = daily.rename(columns={"date": "ds", "amount": "y"})
    
    # Fill missing dates
    date_range = pd.date_range(start=daily["ds"].min(), end=daily["ds"].max(), freq="D")
    daily = daily.set_index("ds").reindex(date_range, fill_value=0).reset_index()
    daily.columns = ["ds", "y"]
    
    logger.info(f"Prepared {len(daily)} daily data points for {'all categories' if not category else category}")
    return daily


def finetune_spending_predictor(
    config: SpendingFinetuneConfig = None,
    data_path: str = None,
    output_dir: str = None,
    run_hpo: bool = True,
    n_trials: int = 30,
    categories: list = None,
) -> Dict:
    """Full fine-tuning pipeline for Spending Predictor."""
    config = config or SpendingFinetuneConfig()
    data_path = data_path or str(SYNTHETIC_DATA_DIR / "transactions_training_data.json")
    output_dir = output_dir or str(FINETUNED_MODELS_DIR / "spending_predictor")
    os.makedirs(output_dir, exist_ok=True)
    
    holidays = get_indian_holidays()
    
    # Categories to train (overall + per-category)
    if categories is None:
        categories = [None, "groceries", "dining", "shopping", "transport", "utilities"]
    
    all_results = {}
    
    for category in categories:
        cat_label = category or "overall"
        logger.info(f"\n{'='*60}")
        logger.info(f"Training spending predictor for: {cat_label}")
        logger.info(f"{'='*60}")
        
        df = prepare_spending_data(data_path, category)
        
        if len(df) < 60:
            logger.warning(f"Insufficient data for {cat_label} ({len(df)} days). Skipping.")
            continue
        
        # ─── Optuna HPO ───
        best_params = {}
        if run_hpo and len(df) > 180:
            logger.info(f"Starting Prophet HPO for {cat_label}...")
            
            def objective(trial):
                cps = trial.suggest_float("changepoint_prior_scale", *config.changepoint_prior_scale_range, log=True)
                sps = trial.suggest_float("seasonality_prior_scale", *config.seasonality_prior_scale_range, log=True)
                hps = trial.suggest_float("holidays_prior_scale", *config.holidays_prior_scale_range, log=True)
                
                m = Prophet(
                    changepoint_prior_scale=cps,
                    seasonality_prior_scale=sps,
                    holidays_prior_scale=hps,
                    holidays=holidays,
                    seasonality_mode=config.seasonality_mode,
                    yearly_seasonality=config.yearly_seasonality,
                    weekly_seasonality=config.weekly_seasonality,
                )
                m.add_seasonality(name="monthly", period=30.5, fourier_order=config.monthly_fourier_order)
                
                m.fit(df)
                
                try:
                    cv_results = cross_validation(
                        m,
                        horizon=config.cross_validation_horizon,
                        period=config.cross_validation_period,
                        initial=config.cross_validation_initial,
                    )
                    perf = performance_metrics(cv_results)
                    mape = perf["mape"].mean()
                    return mape
                except Exception as e:
                    logger.warning(f"CV failed: {e}")
                    return 1.0  # Bad score
            
            study = optuna.create_study(direction="minimize")
            study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
            best_params = study.best_params
            logger.info(f"Best params for {cat_label}: {best_params}")
        
        # ─── Final Training ───
        cps = best_params.get("changepoint_prior_scale", 0.05)
        sps = best_params.get("seasonality_prior_scale", 1.0)
        hps = best_params.get("holidays_prior_scale", 1.0)
        
        mlflow.set_experiment("nivesh-spending-predictor-finetuning")
        with mlflow.start_run(run_name=f"spending-{cat_label}"):
            mlflow.log_params({
                "category": cat_label,
                "changepoint_prior_scale": cps,
                "seasonality_prior_scale": sps,
                "holidays_prior_scale": hps,
                "seasonality_mode": config.seasonality_mode,
                "data_points": len(df),
            })
            
            model = Prophet(
                changepoint_prior_scale=cps,
                seasonality_prior_scale=sps,
                holidays_prior_scale=hps,
                holidays=holidays,
                seasonality_mode=config.seasonality_mode,
                yearly_seasonality=config.yearly_seasonality,
                weekly_seasonality=config.weekly_seasonality,
            )
            model.add_seasonality(name="monthly", period=30.5, fourier_order=config.monthly_fourier_order)
            model.fit(df)
            
            # Cross-validation evaluation
            try:
                cv_results = cross_validation(
                    model,
                    horizon=config.cross_validation_horizon,
                    period=config.cross_validation_period,
                    initial=config.cross_validation_initial,
                )
                perf = performance_metrics(cv_results)
                
                mape = perf["mape"].mean()
                rmse = perf["rmse"].mean()
                mae = perf["mae"].mean()
                
                mlflow.log_metrics({
                    f"{cat_label}_mape": mape,
                    f"{cat_label}_rmse": rmse,
                    f"{cat_label}_mae": mae,
                })
                logger.info(f"{cat_label} - MAPE: {mape:.4f}, RMSE: {rmse:.2f}, MAE: {mae:.2f}")
            except Exception as e:
                logger.warning(f"Cross-validation failed for {cat_label}: {e}")
                mape, rmse, mae = None, None, None
            
            # Forecast 30 days
            future = model.make_future_dataframe(periods=30)
            forecast = model.predict(future)
            
            # Save model
            cat_dir = os.path.join(output_dir, cat_label)
            os.makedirs(cat_dir, exist_ok=True)
            
            import pickle
            with open(os.path.join(cat_dir, "prophet_model.pkl"), "wb") as f:
                pickle.dump(model, f)
            
            forecast.to_csv(os.path.join(cat_dir, "forecast.csv"), index=False)
            
            mlflow.prophet.log_model(model, f"model_{cat_label}")
            
            all_results[cat_label] = {
                "model_path": cat_dir,
                "metrics": {"mape": mape, "rmse": rmse, "mae": mae},
                "best_hpo_params": best_params,
                "forecast_path": os.path.join(cat_dir, "forecast.csv"),
            }
    
    # Save overall results
    eval_dir = EVAL_RESULTS_DIR / "spending_predictor"
    eval_dir.mkdir(parents=True, exist_ok=True)
    
    serializable_results = {}
    for k, v in all_results.items():
        sr = dict(v)
        if sr["metrics"]["mape"] is not None:
            sr["metrics"]["mape"] = float(sr["metrics"]["mape"])
        if sr["metrics"]["rmse"] is not None:
            sr["metrics"]["rmse"] = float(sr["metrics"]["rmse"])
        if sr["metrics"]["mae"] is not None:
            sr["metrics"]["mae"] = float(sr["metrics"]["mae"])
        serializable_results[k] = sr
    
    with open(eval_dir / "all_category_results.json", "w") as f:
        json.dump(serializable_results, f, indent=2, default=str)
    
    # Quality gate
    thresholds = EvalThresholds()
    overall_mape = all_results.get("overall", {}).get("metrics", {}).get("mape")
    passed = overall_mape is not None and (overall_mape * 100) <= thresholds.spending_mape
    
    if passed:
        logger.info("✅ Spending Predictor passed quality gate!")
    else:
        logger.warning(f"⚠️ Quality gate: MAPE={overall_mape}")
    
    return {
        "category_results": all_results,
        "quality_gate_passed": passed,
        "output_dir": output_dir,
    }


if __name__ == "__main__":
    import argparse
    
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    
    parser = argparse.ArgumentParser(description="Fine-tune Spending Predictor")
    parser.add_argument("--data-path", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    parser.add_argument("--no-hpo", action="store_true")
    parser.add_argument("--hpo-trials", type=int, default=30)
    parser.add_argument("--categories", nargs="+", default=None)
    args = parser.parse_args()
    
    result = finetune_spending_predictor(
        data_path=args.data_path,
        output_dir=args.output_dir,
        run_hpo=not args.no_hpo,
        n_trials=args.hpo_trials,
        categories=args.categories,
    )
    print(f"\nQuality gate passed: {result['quality_gate_passed']}")
