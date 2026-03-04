"""
Intent Classifier Fine-Tuning

Fine-tunes DistilBERT on synthetic Indian financial intent data with:
- Optuna hyperparameter search
- Stratified train/val/test splits
- Early stopping & learning rate scheduling
- MLflow experiment tracking
- ONNX export for production serving
- Confusion matrix & per-class metrics
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import optuna
import mlflow
import mlflow.pytorch
import torch
from datasets import Dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    confusion_matrix
)
from transformers import (
    DistilBertForSequenceClassification,
    DistilBertTokenizer,
    Trainer,
    TrainingArguments,
    EarlyStoppingCallback,
)

# Add parent dir
sys.path.insert(0, str(Path(__file__).parent.parent))

from finetuning.config import (
    IntentFinetuneConfig, SYNTHETIC_DATA_DIR, FINETUNED_MODELS_DIR,
    EVAL_RESULTS_DIR, EvalThresholds
)

logger = logging.getLogger(__name__)


def _tokenize(examples, tokenizer, max_length):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=max_length,
    )


def _compute_metrics(eval_pred):
    predictions, labels = eval_pred
    preds = np.argmax(predictions, axis=-1)
    acc = accuracy_score(labels, preds)
    f1_macro = f1_score(labels, preds, average="macro")
    f1_weighted = f1_score(labels, preds, average="weighted")
    return {"accuracy": acc, "f1_macro": f1_macro, "f1_weighted": f1_weighted}


def load_and_split_data(
    data_path: str,
    label_to_id: Dict[str, int],
    test_size: float = 0.15,
    val_size: float = 0.1,
):
    """Load intent data and create stratified splits."""
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    texts = [item["query"] for item in data]
    labels = [label_to_id[item["intent"]] for item in data]

    # Stratified split: train / (val+test) → val / test
    X_train, X_temp, y_train, y_temp = train_test_split(
        texts, labels, test_size=test_size + val_size,
        stratify=labels, random_state=42
    )
    relative_val = val_size / (test_size + val_size)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=1 - relative_val,
        stratify=y_temp, random_state=42
    )

    return (
        Dataset.from_dict({"text": X_train, "label": y_train}),
        Dataset.from_dict({"text": X_val, "label": y_val}),
        Dataset.from_dict({"text": X_test, "label": y_test}),
    )


def finetune_intent_classifier(
    config: Optional[IntentFinetuneConfig] = None,
    data_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    run_hpo: bool = True,
    n_trials: int = 20,
) -> Dict:
    """
    Full fine-tuning pipeline for Intent Classifier.

    Args:
        config: Fine-tuning configuration
        data_path: Path to intent training JSON
        output_dir: Where to save the fine-tuned model
        run_hpo: Whether to run Optuna hyperparameter search
        n_trials: Number of Optuna trials

    Returns:
        Dict with metrics, model path, and run info
    """
    config = config or IntentFinetuneConfig()
    data_path = data_path or str(SYNTHETIC_DATA_DIR / "intent_training_data.json")
    output_dir = output_dir or str(FINETUNED_MODELS_DIR / "intent_classifier")

    os.makedirs(output_dir, exist_ok=True)

    label_to_id = {label: idx for idx, label in enumerate(config.labels)}
    id_to_label = {idx: label for label, idx in label_to_id.items()}

    logger.info(f"Loading data from {data_path}")
    train_ds, val_ds, test_ds = load_and_split_data(data_path, label_to_id)
    logger.info(f"Splits: train={len(train_ds)}, val={len(val_ds)}, test={len(test_ds)}")

    # Tokenize
    tokenizer = DistilBertTokenizer.from_pretrained(config.base_model)
    train_ds = train_ds.map(lambda x: _tokenize(x, tokenizer, config.max_length), batched=True)
    val_ds = val_ds.map(lambda x: _tokenize(x, tokenizer, config.max_length), batched=True)
    test_ds = test_ds.map(lambda x: _tokenize(x, tokenizer, config.max_length), batched=True)

    for ds in [train_ds, val_ds, test_ds]:
        ds.set_format("torch", columns=["input_ids", "attention_mask", "label"])

    # ─── Optuna HPO ───
    best_params = {}
    if run_hpo:
        logger.info(f"Starting Optuna HPO with {n_trials} trials...")

        def objective(trial):
            lr = trial.suggest_float("learning_rate", 1e-5, 5e-5, log=True)
            bs = trial.suggest_categorical("batch_size", [16, 32, 64])
            wd = trial.suggest_float("weight_decay", 0.0, 0.1)
            warmup = trial.suggest_float("warmup_ratio", 0.0, 0.2)
            epochs = trial.suggest_int("num_epochs", 3, 10)

            model = DistilBertForSequenceClassification.from_pretrained(
                config.base_model, num_labels=len(config.labels)
            )

            args = TrainingArguments(
                output_dir=os.path.join(output_dir, "hpo_trial"),
                num_train_epochs=epochs,
                per_device_train_batch_size=bs,
                per_device_eval_batch_size=bs * 2,
                learning_rate=lr,
                weight_decay=wd,
                warmup_ratio=warmup,
                evaluation_strategy="epoch",
                save_strategy="epoch",
                load_best_model_at_end=True,
                metric_for_best_model="f1_macro",
                greater_is_better=True,
                fp16=config.fp16 and torch.cuda.is_available(),
                report_to="none",
                logging_steps=50,
                save_total_limit=1,
            )

            trainer = Trainer(
                model=model,
                args=args,
                train_dataset=train_ds,
                eval_dataset=val_ds,
                compute_metrics=_compute_metrics,
                callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
            )
            trainer.train()
            metrics = trainer.evaluate()
            return metrics["eval_f1_macro"]

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)
        best_params = study.best_params
        logger.info(f"Best HPO params: {best_params}")

    # ─── Final Training with Best Params ───
    lr = best_params.get("learning_rate", config.learning_rate)
    bs = best_params.get("batch_size", config.batch_size)
    wd = best_params.get("weight_decay", config.weight_decay)
    warmup = best_params.get("warmup_ratio", config.warmup_ratio)
    epochs = best_params.get("num_epochs", config.num_epochs)

    mlflow.set_experiment("nivesh-intent-classifier-finetuning")
    with mlflow.start_run(run_name="intent-final-training"):
        mlflow.log_params({
            "base_model": config.base_model,
            "learning_rate": lr,
            "batch_size": bs,
            "weight_decay": wd,
            "warmup_ratio": warmup,
            "epochs": epochs,
            "train_size": len(train_ds),
            "val_size": len(val_ds),
            "test_size": len(test_ds),
            "num_labels": len(config.labels),
            "hpo_trials": n_trials if run_hpo else 0,
        })

        model = DistilBertForSequenceClassification.from_pretrained(
            config.base_model, num_labels=len(config.labels)
        )

        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=bs,
            per_device_eval_batch_size=bs * 2,
            learning_rate=lr,
            weight_decay=wd,
            warmup_ratio=warmup,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1_macro",
            greater_is_better=True,
            fp16=config.fp16 and torch.cuda.is_available(),
            gradient_accumulation_steps=config.gradient_accumulation_steps,
            logging_dir=os.path.join(output_dir, "logs"),
            logging_steps=20,
            save_total_limit=2,
            report_to=["mlflow"],
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_ds,
            eval_dataset=val_ds,
            compute_metrics=_compute_metrics,
            callbacks=[EarlyStoppingCallback(early_stopping_patience=config.early_stopping_patience)],
        )

        train_result = trainer.train()
        mlflow.log_metrics({
            "train_loss": train_result.metrics["train_loss"],
            "train_runtime": train_result.metrics["train_runtime"],
        })

        # ─── Evaluate on Test Set ───
        test_metrics = trainer.evaluate(test_ds)
        mlflow.log_metrics({
            "test_accuracy": test_metrics["eval_accuracy"],
            "test_f1_macro": test_metrics["eval_f1_macro"],
            "test_f1_weighted": test_metrics["eval_f1_weighted"],
        })
        logger.info(f"Test results: {test_metrics}")

        # Per-class report
        test_preds = trainer.predict(test_ds)
        pred_labels = np.argmax(test_preds.predictions, axis=-1)
        report = classification_report(
            test_preds.label_ids, pred_labels,
            target_names=config.labels, output_dict=True
        )
        report_text = classification_report(
            test_preds.label_ids, pred_labels,
            target_names=config.labels
        )
        logger.info(f"\n{report_text}")

        # Save classification report
        eval_dir = EVAL_RESULTS_DIR / "intent_classifier"
        eval_dir.mkdir(parents=True, exist_ok=True)
        with open(eval_dir / "classification_report.json", "w") as f:
            json.dump(report, f, indent=2)
        mlflow.log_artifact(str(eval_dir / "classification_report.json"))

        # Save confusion matrix
        cm = confusion_matrix(test_preds.label_ids, pred_labels)
        np.save(str(eval_dir / "confusion_matrix.npy"), cm)

        # ─── Save Model ───
        model_save_path = os.path.join(output_dir, "best_model")
        trainer.save_model(model_save_path)
        tokenizer.save_pretrained(model_save_path)

        # Save label mapping
        with open(os.path.join(model_save_path, "label_mapping.json"), "w") as f:
            json.dump({"label_to_id": label_to_id, "id_to_label": id_to_label}, f, indent=2)

        mlflow.log_artifact(model_save_path)
        mlflow.pytorch.log_model(model, "model")

        # ─── ONNX Export ───
        try:
            _export_onnx(model, tokenizer, config, output_dir)
            mlflow.log_artifact(os.path.join(output_dir, "model.onnx"))
            logger.info("ONNX model exported successfully")
        except Exception as e:
            logger.warning(f"ONNX export failed: {e}")

        # Quality gate
        thresholds = EvalThresholds()
        passed = (
            test_metrics["eval_accuracy"] >= thresholds.intent_accuracy
            and test_metrics["eval_f1_macro"] >= thresholds.intent_f1_macro
        )

        result = {
            "model_path": model_save_path,
            "test_metrics": test_metrics,
            "best_hpo_params": best_params,
            "quality_gate_passed": passed,
            "classification_report": report,
            "mlflow_run_id": mlflow.active_run().info.run_id,
        }

        if passed:
            logger.info("✅ Intent Classifier passed quality gate!")
        else:
            logger.warning(
                f"⚠️ Quality gate failed: accuracy={test_metrics['eval_accuracy']:.3f} "
                f"(need {thresholds.intent_accuracy}), "
                f"f1={test_metrics['eval_f1_macro']:.3f} (need {thresholds.intent_f1_macro})"
            )

    return result


def _export_onnx(model, tokenizer, config, output_dir):
    """Export fine-tuned model to ONNX for fast inference."""
    from torch.onnx import export as onnx_export

    model.eval()
    dummy_input = tokenizer(
        "Test query for ONNX export",
        padding="max_length",
        truncation=True,
        max_length=config.max_length,
        return_tensors="pt",
    )

    onnx_path = os.path.join(output_dir, "model.onnx")
    onnx_export(
        model,
        (dummy_input["input_ids"], dummy_input["attention_mask"]),
        onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size"},
            "attention_mask": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
        opset_version=14,
    )
    logger.info(f"ONNX model saved to {onnx_path}")


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="Fine-tune Intent Classifier")
    parser.add_argument("--data-path", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    parser.add_argument("--no-hpo", action="store_true", help="Skip hyperparameter optimization")
    parser.add_argument("--hpo-trials", type=int, default=20)
    args = parser.parse_args()

    result = finetune_intent_classifier(
        data_path=args.data_path,
        output_dir=args.output_dir,
        run_hpo=not args.no_hpo,
        n_trials=args.hpo_trials,
    )
    print(f"\nResult: quality_gate_passed={result['quality_gate_passed']}")
    print(f"Model saved: {result['model_path']}")
