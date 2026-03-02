"""
Fine-Tuning Configuration

Central configuration for all fine-tuning jobs, hyperparameters,
data generation settings, and evaluation thresholds.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union
from pathlib import Path


# ============================================================
# Paths
# ============================================================
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
SYNTHETIC_DATA_DIR = BASE_DIR / "finetuning" / "synthetic_data"
FINETUNED_MODELS_DIR = BASE_DIR / "finetuning" / "output_models"
EVAL_RESULTS_DIR = BASE_DIR / "finetuning" / "eval_results"
LOGS_DIR = BASE_DIR / "finetuning" / "logs"


# ============================================================
# Synthetic Data Generation Sizes
# ============================================================
@dataclass
class DataGenConfig:
    """How many synthetic samples to generate per model."""
    intent_samples_per_class: int = 150       # 14 classes × 150 = 2,100 total
    ner_samples: int = 1500                   # 1,500 annotated sentences
    transaction_samples: int = 50_000         # 50K transactions across users
    credit_application_samples: int = 5_000   # 5K loan applications
    llm_qa_pairs: int = 2_000                 # 2K financial Q&A pairs
    num_users: int = 200                      # Simulated user base
    date_range_months: int = 24               # 2 years of transaction history
    anomaly_ratio: float = 0.03              # 3% anomalous transactions


# ============================================================
# Intent Classifier Fine-Tuning
# ============================================================
@dataclass
class IntentFinetuneConfig:
    """DistilBERT fine-tuning config."""
    base_model: str = "distilbert-base-uncased"
    max_length: int = 128
    batch_size: int = 32
    learning_rate: float = 3e-5
    weight_decay: float = 0.01
    num_epochs: int = 8
    warmup_ratio: float = 0.1
    eval_steps: int = 50
    save_steps: int = 100
    early_stopping_patience: int = 3
    fp16: bool = True
    gradient_accumulation_steps: int = 2
    # Augmentation
    augmentation_factor: int = 3  # paraphrase each sample 3x
    labels: List[str] = field(default_factory=lambda: [
        "affordability_check", "goal_planning", "spending_analysis",
        "investment_advice", "debt_management", "tax_planning",
        "emergency_fund", "retirement_planning", "insurance_advice",
        "transaction_query", "budget_creation", "savings_strategy",
        "loan_inquiry", "general_question"
    ])


# ============================================================
# Financial NER Fine-Tuning
# ============================================================
@dataclass
class NERFinetuneConfig:
    """SpaCy NER fine-tuning config."""
    base_model: str = "en_core_web_sm"  # Start with pretrained instead of blank
    entity_types: List[str] = field(default_factory=lambda: [
        "MONEY", "DATE", "CATEGORY", "MERCHANT", "ACCOUNT"
    ])
    n_iter: int = 40
    dropout: float = 0.35
    batch_size_start: int = 4
    batch_size_end: int = 32
    batch_compound: float = 1.001
    learn_rate: float = 0.001
    # Transformer-based NER (optional upgrade)
    use_transformer: bool = False
    transformer_model: str = "ai4bharat/indic-bert"


# ============================================================
# Anomaly Detector Fine-Tuning
# ============================================================
@dataclass
class AnomalyFinetuneConfig:
    """Isolation Forest fine-tuning with Optuna."""
    contamination_range: tuple = (0.005, 0.05)
    n_estimators_range: tuple = (50, 500)
    max_samples_range: tuple = (0.5, 1.0)
    max_features_range: tuple = (0.5, 1.0)
    optuna_n_trials: int = 50
    cross_val_folds: int = 5


# ============================================================
# Credit Risk Scorer Fine-Tuning
# ============================================================
@dataclass
class CreditRiskFinetuneConfig:
    """XGBoost fine-tuning with Optuna."""
    max_depth_range: tuple = (3, 12)
    n_estimators_range: tuple = (50, 500)
    learning_rate_range: tuple = (0.01, 0.3)
    min_child_weight_range: tuple = (1, 10)
    subsample_range: tuple = (0.6, 1.0)
    colsample_bytree_range: tuple = (0.6, 1.0)
    gamma_range: tuple = (0, 5)
    reg_alpha_range: tuple = (0, 2)
    reg_lambda_range: tuple = (0, 2)
    scale_pos_weight_auto: bool = True  # Handle class imbalance
    optuna_n_trials: int = 100
    cross_val_folds: int = 5
    early_stopping_rounds: int = 20


# ============================================================
# Spending Predictor Fine-Tuning
# ============================================================
@dataclass
class SpendingFinetuneConfig:
    """Prophet fine-tuning."""
    changepoint_prior_scale_range: tuple = (0.001, 0.5)
    seasonality_prior_scale_range: tuple = (0.01, 10.0)
    holidays_prior_scale_range: tuple = (0.01, 10.0)
    seasonality_mode: str = "multiplicative"
    yearly_seasonality: Union[bool, str, int] = 10
    weekly_seasonality: Union[bool, str, int] = 3
    monthly_fourier_order: int = 5
    cross_validation_horizon: str = "30 days"
    cross_validation_period: str = "15 days"
    cross_validation_initial: str = "180 days"
    optuna_n_trials: int = 30


# ============================================================
# LLM Fine-Tuning (LoRA/QLoRA)
# ============================================================
@dataclass
class LLMFinetuneConfig:
    """QLoRA fine-tuning for LLaMA-3 / Mistral."""
    base_model: str = "meta-llama/Meta-Llama-3-8B-Instruct"
    fallback_model: str = "mistralai/Mistral-7B-Instruct-v0.2"
    # QLoRA parameters
    lora_r: int = 64
    lora_alpha: int = 128
    lora_dropout: float = 0.05
    target_modules: List[str] = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ])
    # Training
    batch_size: int = 4
    gradient_accumulation_steps: int = 8
    learning_rate: float = 2e-4
    num_epochs: int = 3
    max_seq_length: int = 2048
    warmup_ratio: float = 0.03
    weight_decay: float = 0.001
    # Quantization
    load_in_4bit: bool = True
    bnb_4bit_compute_dtype: str = "float16"
    bnb_4bit_quant_type: str = "nf4"
    use_double_quantization: bool = True
    # GGUF export for Ollama
    export_gguf: bool = True
    gguf_quantization: str = "Q4_K_M"
    ollama_model_name: str = "nivesh-advisor"


# ============================================================
# Evaluation Thresholds
# ============================================================
@dataclass
class EvalThresholds:
    """Minimum quality thresholds for model acceptance."""
    intent_accuracy: float = 0.90
    intent_f1_macro: float = 0.85
    ner_f1: float = 0.80
    ner_precision: float = 0.78
    anomaly_precision: float = 0.75
    anomaly_recall: float = 0.70
    anomaly_auc: float = 0.85
    credit_risk_auc: float = 0.80
    credit_risk_f1: float = 0.75
    spending_mape: float = 20.0  # Max 20% mean absolute percentage error
    spending_rmse_ratio: float = 0.25  # RMSE / mean < 25%
    llm_relevance_score: float = 0.80  # Judge model score
    llm_safety_score: float = 0.95
