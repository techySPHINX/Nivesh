"""
Intent Classification Model

Fine-tuned DistilBERT for classifying user financial queries
"""
from shared.mlflow_utils import create_experiment, log_model_params, log_model_metrics
from shared import config, get_logger, INTENT_LABELS
import torch
import torch.nn as nn
from transformers import (
    DistilBertForSequenceClassification,
    DistilBertTokenizer,
    Trainer,
    TrainingArguments,
    EarlyStoppingCallback
)
from datasets import Dataset, load_dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
import mlflow
import mlflow.pytorch
import numpy as np
import json
import os
from typing import Dict, Any, List, Tuple
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


logger = get_logger(__name__)


class IntentClassifier:
    """Intent classification model trainer and predictor"""

    def __init__(
        self,
        model_name: str = None,
        num_labels: int = None
    ):
        """
        Initialize intent classifier

        Args:
            model_name: Pre-trained model name (defaults to config)
            num_labels: Number of intent labels (defaults to len(INTENT_LABELS))
        """
        self.model_name = model_name or config.intent_model_name
        self.num_labels = num_labels or len(INTENT_LABELS)
        self.tokenizer = None
        self.model = None
        self.label_to_id = {label: idx for idx,
                            label in enumerate(INTENT_LABELS)}
        self.id_to_label = {idx: label for label,
                            idx in self.label_to_id.items()}

        logger.info(
            f"Initialized IntentClassifier with {self.num_labels} labels")

    def load_model(self):
        """Load pre-trained model and tokenizer"""
        logger.info(f"Loading model: {self.model_name}")

        self.tokenizer = DistilBertTokenizer.from_pretrained(self.model_name)
        self.model = DistilBertForSequenceClassification.from_pretrained(
            self.model_name,
            num_labels=self.num_labels
        )

        logger.info("Model loaded successfully")

    def prepare_data(
        self,
        data_path: str,
        test_size: float = 0.2,
        val_size: float = 0.1
    ) -> Tuple[Dataset, Dataset, Dataset]:
        """
        Load and prepare training data

        Args:
            data_path: Path to JSON file with training data
            test_size: Proportion for test set
            val_size: Proportion for validation set

        Returns:
            Tuple of (train_dataset, val_dataset, test_dataset)
        """
        logger.info(f"Loading data from {data_path}")

        # Load data
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Convert to format: [{"query": "...", "intent": "..."}]
        queries = [item['query'] for item in data]
        intents = [item['intent'] for item in data]

        # Convert labels to IDs
        labels = [self.label_to_id[intent] for intent in intents]

        # Split data
        train_queries, test_queries, train_labels, test_labels = train_test_split(
            queries, labels, test_size=test_size, random_state=42, stratify=labels
        )

        train_queries, val_queries, train_labels, val_labels = train_test_split(
            train_queries, train_labels, test_size=val_size/(1-test_size),
            random_state=42, stratify=train_labels
        )

        logger.info(
            f"Data split: Train={len(train_queries)}, Val={len(val_queries)}, Test={len(test_queries)}")

        # Tokenize
        def tokenize_data(queries, labels):
            encodings = self.tokenizer(
                queries,
                truncation=True,
                padding='max_length',
                max_length=config.intent_max_length,
                return_tensors='pt'
            )
            return Dataset.from_dict({
                'input_ids': encodings['input_ids'],
                'attention_mask': encodings['attention_mask'],
                'labels': torch.tensor(labels)
            })

        train_dataset = tokenize_data(train_queries, train_labels)
        val_dataset = tokenize_data(val_queries, val_labels)
        test_dataset = tokenize_data(test_queries, test_labels)

        return train_dataset, val_dataset, test_dataset

    def compute_metrics(self, eval_pred):
        """Compute metrics for evaluation"""
        predictions, labels = eval_pred
        predictions = np.argmax(predictions, axis=1)

        accuracy = accuracy_score(labels, predictions)
        f1 = f1_score(labels, predictions, average='weighted')

        return {
            'accuracy': accuracy,
            'f1': f1
        }

    def train(
        self,
        train_dataset: Dataset,
        val_dataset: Dataset,
        output_dir: str = './models/intent_classifier',
        epochs: int = None,
        batch_size: int = None,
        learning_rate: float = None
    ) -> Dict[str, Any]:
        """
        Train the intent classification model

        Args:
            train_dataset: Training dataset
            val_dataset: Validation dataset
            output_dir: Directory to save model
            epochs: Number of training epochs
            batch_size: Training batch size
            learning_rate: Learning rate

        Returns:
            Training metrics
        """
        epochs = epochs or config.training_epochs
        batch_size = batch_size or config.training_batch_size
        learning_rate = learning_rate or config.learning_rate

        logger.info(
            f"Starting training: epochs={epochs}, batch_size={batch_size}, lr={learning_rate}")

        # Training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            learning_rate=learning_rate,
            weight_decay=0.01,
            evaluation_strategy='epoch',
            save_strategy='epoch',
            load_best_model_at_end=True,
            metric_for_best_model='f1',
            logging_dir=f'{output_dir}/logs',
            logging_steps=10,
            save_total_limit=3,
            report_to='none'  # We'll use MLflow
        )

        # Trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            compute_metrics=self.compute_metrics,
            callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
        )

        # Train
        train_result = trainer.train()

        # Evaluate
        eval_metrics = trainer.evaluate()

        # Save model
        trainer.save_model(output_dir)
        self.tokenizer.save_pretrained(output_dir)

        logger.info(f"Training completed. Metrics: {eval_metrics}")

        return {
            'train_loss': train_result.training_loss,
            'eval_accuracy': eval_metrics['eval_accuracy'],
            'eval_f1': eval_metrics['eval_f1'],
            'eval_loss': eval_metrics['eval_loss']
        }

    def evaluate(self, test_dataset: Dataset) -> Dict[str, Any]:
        """
        Evaluate model on test set

        Args:
            test_dataset: Test dataset

        Returns:
            Evaluation metrics
        """
        logger.info("Evaluating model on test set")

        # Create trainer for evaluation
        trainer = Trainer(
            model=self.model,
            compute_metrics=self.compute_metrics
        )

        # Predict
        predictions = trainer.predict(test_dataset)
        pred_labels = np.argmax(predictions.predictions, axis=1)
        true_labels = predictions.label_ids

        # Metrics
        accuracy = accuracy_score(true_labels, pred_labels)
        f1 = f1_score(true_labels, pred_labels, average='weighted')

        # Classification report
        report = classification_report(
            true_labels,
            pred_labels,
            target_names=INTENT_LABELS,
            output_dict=True
        )

        # Confusion matrix
        cm = confusion_matrix(true_labels, pred_labels)

        results = {
            'accuracy': accuracy,
            'f1_score': f1,
            'classification_report': report,
            'confusion_matrix': cm.tolist()
        }

        logger.info(f"Test Accuracy: {accuracy:.4f}, F1: {f1:.4f}")

        return results

    def predict(self, query: str) -> Dict[str, Any]:
        """
        Predict intent for a query

        Args:
            query: User query

        Returns:
            Dictionary with intent, confidence, and alternatives

        Raises:
            ValueError: If model not loaded or input is invalid
            TypeError: If query is not a string
        """
        # Validate model loaded
        if self.model is None or self.tokenizer is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        # Input validation
        if not isinstance(query, str):
            raise TypeError(f"Query must be a string, got {type(query)}")

        # Strip and validate
        query = query.strip()
        if not query:
            raise ValueError("Query cannot be empty")

        # Length validation and truncation
        max_length = config.intent_max_length
        if len(query) > max_length * 4:  # Approximate token count
            logger.warning(
                f"Query too long ({len(query)} chars), truncating to {max_length * 4}")
            query = query[:max_length * 4]

        # Sanitize - remove null bytes
        query = query.replace('\x00', '')

        # Tokenize
        inputs = self.tokenizer(
            query,
            truncation=True,
            padding='max_length',
            max_length=max_length,
            return_tensors='pt'
        )

        # Predict
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)

        # Get top predictions
        top_probs, top_indices = torch.topk(
            probs, k=min(3, self.num_labels), dim=-1)

        results = {
            'intent': self.id_to_label[top_indices[0][0].item()],
            'confidence': float(top_probs[0][0]),
            'query_length': len(query),
            'alternatives': [
                {
                    'intent': self.id_to_label[idx.item()],
                    'confidence': float(prob)
                }
                for idx, prob in zip(top_indices[0], top_probs[0])
            ]
        }

        return results

    def export_onnx(self, output_path: str):
        """
        Export model to ONNX format for fast inference

        Args:
            output_path: Path to save ONNX model
        """
        logger.info(f"Exporting model to ONNX: {output_path}")

        # Dummy input
        dummy_input = self.tokenizer(
            "Example query",
            truncation=True,
            padding='max_length',
            max_length=config.intent_max_length,
            return_tensors='pt'
        )

        # Export
        torch.onnx.export(
            self.model,
            (dummy_input['input_ids'], dummy_input['attention_mask']),
            output_path,
            input_names=['input_ids', 'attention_mask'],
            output_names=['logits'],
            dynamic_axes={
                'input_ids': {0: 'batch_size'},
                'attention_mask': {0: 'batch_size'},
                'logits': {0: 'batch_size'}
            },
            opset_version=14
        )

        logger.info("ONNX export completed")
