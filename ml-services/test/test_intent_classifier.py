"""
Unit tests for intent_classifier/model.py — IntentClassifier class.

DistilBERT + transformers + torch are heavy, so they are mocked out via
the root conftest.py. We test class logic (instantiation, label mapping,
predict flow, input validation, output format).
"""

import sys
import os
import pytest
import numpy as np
from unittest.mock import patch, MagicMock, PropertyMock

# Ensure ml-services root on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Get handle to the mocked torch module for softmax patching
_mock_torch = sys.modules["torch"]


def _mock_softmax(logits, dim=-1):
    """Return a fake probability tensor (14 labels)."""
    probs = MagicMock()

    # Build index objects
    idx_objects = []
    for idx_val in [0, 2, 5]:
        idx_obj = MagicMock()
        idx_obj.item.return_value = idx_val
        idx_objects.append(idx_obj)

    val_objects = []
    for prob_val in [0.85, 0.08, 0.04]:
        val_obj = MagicMock()
        val_obj.__float__ = MagicMock(return_value=prob_val)
        val_objects.append(val_obj)

    top_values = MagicMock()
    top_indices = MagicMock()
    top_values.__getitem__ = MagicMock(return_value=val_objects)
    top_indices.__getitem__ = MagicMock(return_value=idx_objects)

    probs.topk.return_value = (top_values, top_indices)
    return probs


_mock_torch.softmax = _mock_softmax

from intent_classifier.model import IntentClassifier
from shared.config import INTENT_LABELS


# =============================================
# Instantiation
# =============================================

class TestIntentClassifierInit:
    """Test IntentClassifier creation."""

    def test_default_init(self):
        clf = IntentClassifier()
        assert clf.num_labels == len(INTENT_LABELS)
        assert clf.model is None
        assert clf.tokenizer is None

    def test_custom_num_labels(self):
        clf = IntentClassifier(num_labels=5)
        assert clf.num_labels == 5

    def test_label_mappings(self):
        clf = IntentClassifier()
        assert clf.label_to_id["affordability_check"] == 0
        assert clf.id_to_label[0] == "affordability_check"
        # Round-trip all labels
        for label in INTENT_LABELS:
            idx = clf.label_to_id[label]
            assert clf.id_to_label[idx] == label

    def test_all_intents_present(self):
        clf = IntentClassifier()
        assert len(clf.label_to_id) == len(INTENT_LABELS)
        assert set(clf.label_to_id.keys()) == set(INTENT_LABELS)


# =============================================
# Predict — with mocked model & tokenizer
# =============================================

class TestPredict:
    """Test the predict method with mocked model and tokenizer."""

    def _build_classifier_with_mock(self):
        """Return an IntentClassifier with mocked model and tokenizer."""
        clf = IntentClassifier()

        # Mock tokenizer
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {
            "input_ids": MagicMock(),
            "attention_mask": MagicMock(),
        }
        clf.tokenizer = mock_tokenizer

        # Mock model — __call__ returns an object with .logits
        mock_model = MagicMock()
        mock_outputs = MagicMock()
        mock_outputs.logits = MagicMock()
        mock_model.return_value = mock_outputs
        clf.model = mock_model

        return clf

    def test_predict_returns_dict(self):
        clf = self._build_classifier_with_mock()
        result = clf.predict("Can I afford a car?")
        assert isinstance(result, dict)

    def test_predict_has_intent_field(self):
        clf = self._build_classifier_with_mock()
        result = clf.predict("Show my expenses")
        assert "intent" in result
        assert result["intent"] in INTENT_LABELS

    def test_predict_has_confidence(self):
        clf = self._build_classifier_with_mock()
        result = clf.predict("Help me plan retirement")
        assert "confidence" in result
        assert isinstance(result["confidence"], float)

    def test_predict_has_alternatives(self):
        clf = self._build_classifier_with_mock()
        result = clf.predict("Invest in SIP")
        assert "alternatives" in result
        assert isinstance(result["alternatives"], list)

    def test_predict_alternatives_structure(self):
        clf = self._build_classifier_with_mock()
        result = clf.predict("Create a budget")
        for alt in result["alternatives"]:
            assert "intent" in alt
            assert "confidence" in alt

    def test_predict_query_length_tracked(self):
        clf = self._build_classifier_with_mock()
        query = "What is my spending for March?"
        result = clf.predict(query)
        assert "query_length" in result
        assert result["query_length"] == len(query)


# =============================================
# Input Validation
# =============================================

class TestInputValidation:
    """Test input validation in predict."""

    def test_raises_when_model_not_loaded(self):
        clf = IntentClassifier()
        with pytest.raises(ValueError, match="Model not loaded"):
            clf.predict("test query")

    def test_raises_on_non_string_input(self):
        clf = IntentClassifier()
        clf.model = MagicMock()
        clf.tokenizer = MagicMock()
        with pytest.raises(TypeError, match="must be a string"):
            clf.predict(12345)

    def test_raises_on_empty_string(self):
        clf = IntentClassifier()
        clf.model = MagicMock()
        clf.tokenizer = MagicMock()
        with pytest.raises(ValueError, match="cannot be empty"):
            clf.predict("   ")

    def test_null_bytes_stripped(self):
        clf = IntentClassifier()
        clf.model = MagicMock()
        clf.tokenizer = MagicMock()
        mock_outputs = MagicMock()
        mock_outputs.logits = MagicMock()
        clf.model.return_value = mock_outputs
        clf.tokenizer.return_value = {"input_ids": MagicMock(), "attention_mask": MagicMock()}
        # Should not raise
        result = clf.predict("test\x00query")
        assert isinstance(result, dict)


# =============================================
# Output Format
# =============================================

class TestOutputFormat:
    """Verify output shape and types."""

    def _get_prediction(self):
        clf = IntentClassifier()
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": MagicMock(), "attention_mask": MagicMock()}
        clf.tokenizer = mock_tokenizer
        mock_model = MagicMock()
        mock_outputs = MagicMock()
        mock_outputs.logits = MagicMock()
        mock_model.return_value = mock_outputs
        clf.model = mock_model
        return clf.predict("Check my budget")

    def test_top_intent_is_string(self):
        result = self._get_prediction()
        assert isinstance(result["intent"], str)

    def test_confidence_is_between_0_and_1(self):
        result = self._get_prediction()
        assert 0 <= result["confidence"] <= 1

    def test_alternatives_count(self):
        result = self._get_prediction()
        # Should have up to 3 alternatives (including top)
        assert len(result["alternatives"]) <= min(3, len(INTENT_LABELS))

    def test_result_keys(self):
        result = self._get_prediction()
        expected_keys = {"intent", "confidence", "query_length", "alternatives"}
        assert expected_keys.issubset(set(result.keys()))
