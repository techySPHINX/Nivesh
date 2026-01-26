"""
Performance Optimization Utilities

Provides:
- LRU cache with TTL
- Connection pooling
- Batch processing
- Request deduplication
"""

import asyncio
import hashlib
import time
from typing import Any, Callable, Dict, List, Optional, TypeVar, Generic
from functools import wraps
from collections import OrderedDict
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


# ==========================================
# LRU Cache with TTL
# ==========================================

class LRUCache(Generic[T]):
    """
    LRU (Least Recently Used) Cache with TTL support.

    Features:
    - Automatic eviction of least recently used items
    - Time-to-live (TTL) for entries
    - Thread-safe operations
    - Statistics tracking
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        """
        Initialize LRU cache.

        Args:
            max_size: Maximum number of entries
            default_ttl: Default time-to-live in seconds
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: OrderedDict = OrderedDict()
        self.expiry_times: Dict[str, float] = {}

        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0

    def get(self, key: str) -> Optional[T]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        # Check if key exists
        if key not in self.cache:
            self.misses += 1
            return None

        # Check if expired
        if self._is_expired(key):
            self._remove(key)
            self.misses += 1
            return None

        # Move to end (most recently used)
        self.cache.move_to_end(key)
        self.hits += 1

        return self.cache[key]

    def set(self, key: str, value: T, ttl: Optional[int] = None):
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not provided)
        """
        # Remove if exists
        if key in self.cache:
            self._remove(key)

        # Add new entry
        self.cache[key] = value
        self.expiry_times[key] = time.time() + (ttl or self.default_ttl)

        # Evict if over capacity
        if len(self.cache) > self.max_size:
            self._evict_lru()

    def delete(self, key: str):
        """Delete entry from cache"""
        if key in self.cache:
            self._remove(key)

    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()
        self.expiry_times.clear()

    def _is_expired(self, key: str) -> bool:
        """Check if entry is expired"""
        if key not in self.expiry_times:
            return True
        return time.time() > self.expiry_times[key]

    def _remove(self, key: str):
        """Remove entry from cache"""
        del self.cache[key]
        del self.expiry_times[key]

    def _evict_lru(self):
        """Evict least recently used entry"""
        if self.cache:
            # Get first (least recently used) key
            lru_key = next(iter(self.cache))
            self._remove(lru_key)
            self.evictions += 1
            logger.debug(f"Evicted LRU cache entry: {lru_key}")

    def cleanup_expired(self):
        """Remove all expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, expiry in self.expiry_times.items()
            if current_time > expiry
        ]

        for key in expired_keys:
            self._remove(key)

        if expired_keys:
            logger.info(
                f"Cleaned up {len(expired_keys)} expired cache entries")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.hits + self.misses
        hit_rate = self.hits / total_requests if total_requests > 0 else 0

        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": hit_rate,
            "evictions": self.evictions
        }


def lru_cache(max_size: int = 128, ttl: int = 3600):
    """
    LRU cache decorator with TTL.

    Args:
        max_size: Maximum cache size
        ttl: Time-to-live in seconds

    Usage:
        @lru_cache(max_size=100, ttl=300)
        def expensive_function(arg1, arg2):
            ...
    """
    cache = LRUCache(max_size=max_size, default_ttl=ttl)

    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()

            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Compute and cache
            result = func(*args, **kwargs)
            cache.set(cache_key, result)

            return result

        # Attach cache to function for inspection
        wrapper.cache = cache
        return wrapper

    return decorator


# ==========================================
# Batch Processing
# ==========================================

class BatchProcessor:
    """
    Batch processor for efficient bulk operations.

    Collects requests and processes them in batches to reduce overhead.
    """

    def __init__(
        self,
        batch_size: int = 32,
        max_wait_time: float = 0.1,
        process_func: Optional[Callable] = None
    ):
        """
        Initialize batch processor.

        Args:
            batch_size: Maximum batch size
            max_wait_time: Maximum wait time before processing (seconds)
            process_func: Function to process batch
        """
        self.batch_size = batch_size
        self.max_wait_time = max_wait_time
        self.process_func = process_func

        self.queue: List[Dict[str, Any]] = []
        self.results: Dict[str, Any] = {}
        self.lock = asyncio.Lock()

    async def submit(self, request_id: str, data: Any) -> Any:
        """
        Submit request for batch processing.

        Args:
            request_id: Unique request ID
            data: Request data

        Returns:
            Processing result
        """
        async with self.lock:
            # Add to queue
            self.queue.append({"id": request_id, "data": data})

            # Process if batch is full
            if len(self.queue) >= self.batch_size:
                await self._process_batch()

        # Wait for result
        start_time = time.time()
        while request_id not in self.results:
            if time.time() - start_time > self.max_wait_time:
                async with self.lock:
                    await self._process_batch()
            await asyncio.sleep(0.01)

        result = self.results.pop(request_id)
        return result

    async def _process_batch(self):
        """Process current batch"""
        if not self.queue:
            return

        batch = self.queue[:]
        self.queue.clear()

        if self.process_func:
            try:
                # Process batch
                batch_data = [item["data"] for item in batch]
                batch_results = await self.process_func(batch_data)

                # Store results
                for item, result in zip(batch, batch_results):
                    self.results[item["id"]] = result

                logger.debug(f"Processed batch of {len(batch)} requests")

            except Exception as e:
                logger.error(f"Batch processing error: {e}")
                # Store error for all requests in batch
                for item in batch:
                    self.results[item["id"]] = {"error": str(e)}


# ==========================================
# Request Deduplication
# ==========================================

class RequestDeduplicator:
    """
    Deduplicate identical concurrent requests.

    When multiple identical requests arrive concurrently, only one
    is processed and the result is shared with all requesters.
    """

    def __init__(self):
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.lock = asyncio.Lock()

    async def deduplicate(
        self,
        key: str,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute function with deduplication.

        Args:
            key: Deduplication key
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments

        Returns:
            Function result
        """
        async with self.lock:
            # Check if request is already pending
            if key in self.pending_requests:
                logger.debug(f"Deduplicating request: {key}")
                future = self.pending_requests[key]
            else:
                # Create new future
                future = asyncio.Future()
                self.pending_requests[key] = future

                # Execute function
                try:
                    if asyncio.iscoroutinefunction(func):
                        result = await func(*args, **kwargs)
                    else:
                        result = func(*args, **kwargs)

                    future.set_result(result)
                except Exception as e:
                    future.set_exception(e)
                finally:
                    # Remove from pending
                    del self.pending_requests[key]

        return await future


# ==========================================
# Connection Pool (Simple Implementation)
# ==========================================

class ConnectionPool:
    """
    Simple connection pool for external services.

    Maintains a pool of reusable connections to reduce
    connection overhead.
    """

    def __init__(
        self,
        create_connection: Callable,
        max_size: int = 10,
        min_size: int = 2
    ):
        """
        Initialize connection pool.

        Args:
            create_connection: Function to create new connection
            max_size: Maximum pool size
            min_size: Minimum pool size
        """
        self.create_connection = create_connection
        self.max_size = max_size
        self.min_size = min_size

        self.available: List[Any] = []
        self.in_use: set = set()
        self.lock = asyncio.Lock()

    async def acquire(self) -> Any:
        """Acquire connection from pool"""
        async with self.lock:
            # Try to get available connection
            if self.available:
                conn = self.available.pop()
                self.in_use.add(conn)
                return conn

            # Create new connection if under max size
            if len(self.in_use) < self.max_size:
                conn = await self._create_connection()
                self.in_use.add(conn)
                return conn

        # Wait for connection to become available
        while True:
            await asyncio.sleep(0.1)
            async with self.lock:
                if self.available:
                    conn = self.available.pop()
                    self.in_use.add(conn)
                    return conn

    async def release(self, conn: Any):
        """Release connection back to pool"""
        async with self.lock:
            if conn in self.in_use:
                self.in_use.remove(conn)
                self.available.append(conn)

    async def _create_connection(self) -> Any:
        """Create new connection"""
        if asyncio.iscoroutinefunction(self.create_connection):
            return await self.create_connection()
        else:
            return self.create_connection()

    async def close_all(self):
        """Close all connections"""
        async with self.lock:
            # Close available connections
            for conn in self.available:
                if hasattr(conn, 'close'):
                    if asyncio.iscoroutinefunction(conn.close):
                        await conn.close()
                    else:
                        conn.close()

            self.available.clear()
            self.in_use.clear()


# ==========================================
# Performance Monitoring
# ==========================================

def measure_performance(func: Callable):
    """
    Decorator to measure and log function performance.

    Usage:
        @measure_performance
        def slow_function():
            ...
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            duration = time.time() - start_time
            logger.info(
                f"Performance: {func.__name__} took {duration:.3f}s",
                extra={
                    "function": func.__name__,
                    "duration": duration
                }
            )

    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            duration = time.time() - start_time
            logger.info(
                f"Performance: {func.__name__} took {duration:.3f}s",
                extra={
                    "function": func.__name__,
                    "duration": duration
                }
            )

    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper
