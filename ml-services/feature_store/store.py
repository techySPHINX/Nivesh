"""
Feature Store - Redis-backed feature storage for fast inference

Stores precomputed features with configurable TTL
"""
from shared import config, get_logger
import redis
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))


logger = get_logger(__name__)


class FeatureStore:
    """Redis-backed feature store for ML features"""

    def __init__(
        self,
        host: str = None,
        port: int = None,
        db: int = None,
        password: str = None
    ):
        """
        Initialize feature store

        Args:
            host: Redis host (defaults to config)
            port: Redis port (defaults to config)
            db: Redis database number (defaults to config)
            password: Redis password (defaults to config)
        """
        self.host = host or config.redis_host
        self.port = port or config.redis_port
        self.db = db or config.redis_db
        self.password = password or config.redis_password

        self.redis_client = redis.Redis(
            host=self.host,
            port=self.port,
            db=self.db,
            password=self.password,
            decode_responses=True
        )

        logger.info(
            f"FeatureStore initialized: {self.host}:{self.port}/{self.db}")

    def _serialize(self, data: Any) -> str:
        """Serialize data to JSON string"""
        def convert(obj):
            if isinstance(obj, (np.integer, np.floating)):
                return obj.item()
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, datetime):
                return obj.isoformat()
            elif isinstance(obj, pd.Series):
                return obj.to_dict()
            elif isinstance(obj, pd.DataFrame):
                return obj.to_dict('records')
            return obj

        return json.dumps(data, default=convert)

    def _deserialize(self, data: str) -> Any:
        """Deserialize JSON string to Python object"""
        return json.loads(data)

    def save_features(
        self,
        user_id: str,
        features: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """
        Save features for a user

        Args:
            user_id: User identifier
            features: Dictionary of features
            ttl: Time-to-live in seconds (defaults to config.feature_ttl_seconds)

        Returns:
            True if successful
        """
        try:
            key = f"features:user:{user_id}"
            ttl = ttl or config.feature_ttl_seconds

            serialized = self._serialize(features)
            self.redis_client.setex(key, ttl, serialized)

            logger.debug(f"Saved features for user {user_id} with TTL {ttl}s")
            return True
        except Exception as e:
            logger.error(f"Failed to save features for user {user_id}: {e}")
            return False

    def get_features(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get features for a user

        Args:
            user_id: User identifier

        Returns:
            Dictionary of features or None if not found
        """
        try:
            key = f"features:user:{user_id}"
            data = self.redis_client.get(key)

            if data is None:
                logger.debug(f"No features found for user {user_id}")
                return None

            features = self._deserialize(data)
            logger.debug(f"Retrieved features for user {user_id}")
            return features
        except Exception as e:
            logger.error(f"Failed to get features for user {user_id}: {e}")
            return None

    def compute_if_missing(
        self,
        user_id: str,
        compute_fn: callable
    ) -> Dict[str, Any]:
        """
        Get features or compute if missing

        Args:
            user_id: User identifier
            compute_fn: Function to compute features if missing

        Returns:
            Dictionary of features
        """
        features = self.get_features(user_id)

        if features is None:
            logger.info(f"Computing features for user {user_id}")
            features = compute_fn(user_id)
            self.save_features(user_id, features)

        return features

    def delete_features(self, user_id: str) -> bool:
        """
        Delete features for a user

        Args:
            user_id: User identifier

        Returns:
            True if successful
        """
        try:
            key = f"features:user:{user_id}"
            deleted = self.redis_client.delete(key)
            logger.debug(f"Deleted features for user {user_id}")
            return deleted > 0
        except Exception as e:
            logger.error(f"Failed to delete features for user {user_id}: {e}")
            return False

    def save_model_features(
        self,
        model_name: str,
        feature_name: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Save model-specific features (e.g., spending patterns, anomaly thresholds)

        Args:
            model_name: Model identifier
            feature_name: Feature name
            value: Feature value
            ttl: Time-to-live in seconds

        Returns:
            True if successful
        """
        try:
            key = f"features:model:{model_name}:{feature_name}"
            ttl = ttl or config.feature_ttl_seconds

            serialized = self._serialize(value)
            self.redis_client.setex(key, ttl, serialized)

            logger.debug(f"Saved model feature {model_name}:{feature_name}")
            return True
        except Exception as e:
            logger.error(
                f"Failed to save model feature {model_name}:{feature_name}: {e}")
            return False

    def get_model_features(
        self,
        model_name: str,
        feature_name: str
    ) -> Optional[Any]:
        """
        Get model-specific features

        Args:
            model_name: Model identifier
            feature_name: Feature name

        Returns:
            Feature value or None if not found
        """
        try:
            key = f"features:model:{model_name}:{feature_name}"
            data = self.redis_client.get(key)

            if data is None:
                return None

            return self._deserialize(data)
        except Exception as e:
            logger.error(
                f"Failed to get model feature {model_name}:{feature_name}: {e}")
            return None

    def save_batch_features(
        self,
        features_dict: Dict[str, Dict[str, Any]],
        ttl: Optional[int] = None
    ) -> int:
        """
        Save features for multiple users in batch

        Args:
            features_dict: Dictionary mapping user_id to features
            ttl: Time-to-live in seconds

        Returns:
            Number of successfully saved entries
        """
        success_count = 0
        for user_id, features in features_dict.items():
            if self.save_features(user_id, features, ttl):
                success_count += 1

        logger.info(
            f"Batch saved {success_count}/{len(features_dict)} feature sets")
        return success_count

    def get_batch_features(
        self,
        user_ids: List[str]
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Get features for multiple users

        Args:
            user_ids: List of user identifiers

        Returns:
            Dictionary mapping user_id to features (or None if not found)
        """
        results = {}
        for user_id in user_ids:
            results[user_id] = self.get_features(user_id)

        found_count = sum(1 for v in results.values() if v is not None)
        logger.info(
            f"Batch retrieved {found_count}/{len(user_ids)} feature sets")
        return results

    def health_check(self) -> bool:
        """
        Check if Redis connection is healthy

        Returns:
            True if healthy
        """
        try:
            return self.redis_client.ping()
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """
        Get feature store statistics

        Returns:
            Dictionary of statistics
        """
        try:
            info = self.redis_client.info()

            # Count feature keys
            user_keys = len(
                list(self.redis_client.scan_iter("features:user:*")))
            model_keys = len(
                list(self.redis_client.scan_iter("features:model:*")))

            return {
                "connected": True,
                "user_features": user_keys,
                "model_features": model_keys,
                "total_keys": info.get("db0", {}).get("keys", 0),
                "used_memory": info.get("used_memory_human"),
                "uptime_seconds": info.get("uptime_in_seconds")
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"connected": False, "error": str(e)}


# Global feature store instance
feature_store = FeatureStore()
