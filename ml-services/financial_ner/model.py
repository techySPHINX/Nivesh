"""
Financial NER (Named Entity Recognition) Model

SpaCy-based NER for extracting financial entities
"""
from shared.mlflow_utils import create_experiment, log_model_params, log_model_metrics
from shared import config, get_logger, NER_ENTITY_TYPES
import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import json
import random
from typing import List, Dict, Any, Tuple
import mlflow
import mlflow.spacy
from pathlib import Path
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


logger = get_logger(__name__)


class FinancialNER:
    """Financial Named Entity Recognition model"""

    def __init__(self, model_name: str = None):
        """
        Initialize Financial NER

        Args:
            model_name: Base SpaCy model name (defaults to config)
        """
        self.model_name = model_name or config.ner_model_name
        self.nlp = None
        self.entity_types = NER_ENTITY_TYPES

        logger.info(
            f"Initialized FinancialNER with entity types: {self.entity_types}")

    def create_blank_model(self, lang: str = "en"):
        """Create a blank SpaCy model"""
        logger.info(f"Creating blank {lang} model")
        self.nlp = spacy.blank(lang)

        # Add NER pipeline component
        if "ner" not in self.nlp.pipe_names:
            ner = self.nlp.add_pipe("ner")
        else:
            ner = self.nlp.get_pipe("ner")

        # Add entity labels
        for entity_type in self.entity_types:
            ner.add_label(entity_type)

        logger.info(
            f"Created blank model with {len(self.entity_types)} entity types")

    def load_model(self, model_path: str = None):
        """Load pre-trained SpaCy model"""
        if model_path:
            logger.info(f"Loading model from {model_path}")
            self.nlp = spacy.load(model_path)
        else:
            logger.info(f"Loading base model: {self.model_name}")
            try:
                self.nlp = spacy.load(self.model_name)
            except OSError:
                logger.warning(
                    f"Model {self.model_name} not found, creating blank model")
                self.create_blank_model()

    def prepare_training_data(
        self,
        data_path: str
    ) -> List[Tuple[str, Dict[str, List]]]:
        """
        Load and prepare training data

        Args:
            data_path: Path to training data JSON

        Returns:
            List of (text, annotations) tuples
        """
        logger.info(f"Loading training data from {data_path}")

        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Format: [{"text": "...", "entities": [(start, end, label), ...]}]
        training_data = []
        for item in data:
            text = item['text']
            entities = item.get('entities', [])

            # Convert to SpaCy format
            annotations = {'entities': entities}
            training_data.append((text, annotations))

        logger.info(f"Loaded {len(training_data)} training examples")
        return training_data

    def train(
        self,
        training_data: List[Tuple[str, Dict]],
        n_iter: int = 30,
        output_dir: str = './models/financial_ner'
    ) -> Dict[str, Any]:
        """
        Train the NER model

        Args:
            training_data: List of (text, annotations) tuples
            n_iter: Number of training iterations
            output_dir: Directory to save model

        Returns:
            Training metrics
        """
        logger.info(f"Starting training for {n_iter} iterations")

        if self.nlp is None:
            self.create_blank_model()

        # Get NER component
        ner = self.nlp.get_pipe("ner")

        # Disable other pipeline components during training
        other_pipes = [pipe for pipe in self.nlp.pipe_names if pipe != "ner"]

        # Training loop
        losses_history = []

        with self.nlp.disable_pipes(*other_pipes):
            # Initialize optimizer
            optimizer = self.nlp.begin_training()

            for iteration in range(n_iter):
                random.shuffle(training_data)
                losses = {}

                # Batch training
                batches = minibatch(
                    training_data, size=compounding(4.0, 32.0, 1.001))

                for batch in batches:
                    examples = []
                    for text, annotations in batch:
                        doc = self.nlp.make_doc(text)
                        example = Example.from_dict(doc, annotations)
                        examples.append(example)

                    self.nlp.update(
                        examples,
                        drop=0.5,
                        losses=losses
                    )

                losses_history.append(losses.get("ner", 0.0))

                if iteration % 5 == 0:
                    logger.info(
                        f"Iteration {iteration}: Loss = {losses.get('ner', 0.0):.4f}")

        # Save model
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        self.nlp.to_disk(output_path)

        logger.info(f"Model saved to {output_dir}")

        return {
            'final_loss': losses_history[-1] if losses_history else 0.0,
            'avg_loss': sum(losses_history) / len(losses_history) if losses_history else 0.0,
            'iterations': n_iter
        }

    def evaluate(
        self,
        test_data: List[Tuple[str, Dict]]
    ) -> Dict[str, Any]:
        """
        Evaluate model on test data

        Args:
            test_data: List of (text, annotations) tuples

        Returns:
            Evaluation metrics
        """
        logger.info(f"Evaluating on {len(test_data)} examples")

        if self.nlp is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        # Create examples
        examples = []
        for text, annotations in test_data:
            doc = self.nlp.make_doc(text)
            example = Example.from_dict(doc, annotations)
            examples.append(example)

        # Evaluate
        scores = self.nlp.evaluate(examples)

        # Calculate per-entity metrics
        entity_scores = {}
        for entity_type in self.entity_types:
            entity_scores[entity_type] = {
                'precision': scores.get(f'ents_per_type', {}).get(entity_type, {}).get('p', 0.0),
                'recall': scores.get(f'ents_per_type', {}).get(entity_type, {}).get('r', 0.0),
                'f1': scores.get(f'ents_per_type', {}).get(entity_type, {}).get('f', 0.0)
            }

        results = {
            'overall_precision': scores.get('ents_p', 0.0),
            'overall_recall': scores.get('ents_r', 0.0),
            'overall_f1': scores.get('ents_f', 0.0),
            'entity_scores': entity_scores
        }

        logger.info(f"Evaluation complete: P={results['overall_precision']:.3f}, "
                    f"R={results['overall_recall']:.3f}, F1={results['overall_f1']:.3f}")

        return results

    def predict(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract entities from text

        Args:
            text: Input text

        Returns:
            List of extracted entities
        """
        if self.nlp is None:
            raise ValueError("Model not loaded. Call load_model() first.")

        doc = self.nlp(text)

        entities = [
            {
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char,
                'confidence': 1.0  # SpaCy doesn't provide confidence scores by default
            }
            for ent in doc.ents
        ]

        return entities
