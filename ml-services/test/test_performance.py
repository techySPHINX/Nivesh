"""
Tests for performance optimization utilities

Test Coverage:
- LRU cache with TTL
- Batch processing
- Request deduplication
- Connection pooling
"""

import pytest
import asyncio
import time
from shared.performance import (
    LRUCache, lru_cache, BatchProcessor,
    RequestDeduplicator, ConnectionPool, measure_performance
)


class TestLRUCache:
    """Test LRUCache class"""

    def test_set_and_get(self):
        """Test basic set and get operations"""
        cache = LRUCache(max_size=10, default_ttl=60)

        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

    def test_cache_miss(self):
        """Test cache miss returns None"""
        cache = LRUCache(max_size=10, default_ttl=60)
        assert cache.get("nonexistent") is None

    def test_ttl_expiration(self):
        """Test that entries expire after TTL"""
        cache = LRUCache(max_size=10, default_ttl=1)

        cache.set("key1", "value1", ttl=1)
        assert cache.get("key1") == "value1"

        # Wait for expiration
        time.sleep(1.1)
        assert cache.get("key1") is None

    def test_lru_eviction(self):
        """Test that least recently used entry is evicted"""
        cache = LRUCache(max_size=3, default_ttl=60)

        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # Access key1 to make it recently used
        cache.get("key1")

        # Add key4 - should evict key2 (least recently used)
        cache.set("key4", "value4")

        assert cache.get("key1") == "value1"
        assert cache.get("key2") is None  # Evicted
        assert cache.get("key3") == "value3"
        assert cache.get("key4") == "value4"

    def test_update_existing_key(self):
        """Test updating existing key"""
        cache = LRUCache(max_size=10, default_ttl=60)

        cache.set("key1", "value1")
        cache.set("key1", "value2")

        assert cache.get("key1") == "value2"
        assert len(cache.cache) == 1

    def test_delete(self):
        """Test deleting entry"""
        cache = LRUCache(max_size=10, default_ttl=60)

        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"

        cache.delete("key1")
        assert cache.get("key1") is None

    def test_clear(self):
        """Test clearing all entries"""
        cache = LRUCache(max_size=10, default_ttl=60)

        cache.set("key1", "value1")
        cache.set("key2", "value2")

        cache.clear()

        assert cache.get("key1") is None
        assert cache.get("key2") is None
        assert len(cache.cache) == 0

    def test_cleanup_expired(self):
        """Test cleanup of expired entries"""
        cache = LRUCache(max_size=10, default_ttl=1)

        cache.set("key1", "value1", ttl=1)
        cache.set("key2", "value2", ttl=10)

        time.sleep(1.1)
        cache.cleanup_expired()

        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"

    def test_get_stats(self):
        """Test getting cache statistics"""
        cache = LRUCache(max_size=10, default_ttl=60)

        cache.set("key1", "value1")
        cache.set("key2", "value2")

        # Generate hits and misses
        cache.get("key1")  # Hit
        cache.get("key1")  # Hit
        cache.get("key3")  # Miss

        stats = cache.get_stats()

        assert stats["size"] == 2
        assert stats["max_size"] == 10
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == pytest.approx(2/3, abs=0.01)


class TestLRUCacheDecorator:
    """Test lru_cache decorator"""

    def test_basic_caching(self):
        """Test basic function caching"""
        call_count = [0]

        @lru_cache(max_size=10, ttl=60)
        def expensive_function(x):
            call_count[0] += 1
            return x * 2

        # First call - should execute
        result1 = expensive_function(5)
        assert result1 == 10
        assert call_count[0] == 1

        # Second call - should use cache
        result2 = expensive_function(5)
        assert result2 == 10
        assert call_count[0] == 1  # Not incremented

        # Different argument - should execute
        result3 = expensive_function(10)
        assert result3 == 20
        assert call_count[0] == 2

    def test_cache_with_kwargs(self):
        """Test caching with keyword arguments"""
        call_count = [0]

        @lru_cache(max_size=10, ttl=60)
        def function_with_kwargs(a, b=10):
            call_count[0] += 1
            return a + b

        result1 = function_with_kwargs(5, b=10)
        result2 = function_with_kwargs(5, b=10)

        assert result1 == result2 == 15
        assert call_count[0] == 1  # Should use cache

        # Different kwargs
        result3 = function_with_kwargs(5, b=20)
        assert result3 == 25
        assert call_count[0] == 2


class TestBatchProcessor:
    """Test BatchProcessor class"""

    @pytest.mark.asyncio
    async def test_batch_processing(self):
        """Test basic batch processing"""
        processed_batches = []

        async def process_func(batch):
            processed_batches.append(len(batch))
            return [x * 2 for x in batch]

        processor = BatchProcessor(
            batch_size=3,
            max_wait_time=0.1,
            process_func=process_func
        )

        # Submit requests
        results = await asyncio.gather(
            processor.submit("req1", 1),
            processor.submit("req2", 2),
            processor.submit("req3", 3)
        )

        assert results == [2, 4, 6]
        assert 3 in processed_batches  # Batch of 3

    @pytest.mark.asyncio
    async def test_batch_timeout(self):
        """Test batch processing with timeout"""
        processed_batches = []

        async def process_func(batch):
            processed_batches.append(len(batch))
            return [x * 2 for x in batch]

        processor = BatchProcessor(
            batch_size=10,
            max_wait_time=0.2,
            process_func=process_func
        )

        # Submit fewer than batch_size
        result = await processor.submit("req1", 5)

        assert result == 10
        # Should process due to timeout, not batch size
        assert len(processed_batches) > 0


class TestRequestDeduplicator:
    """Test RequestDeduplicator class"""

    @pytest.mark.asyncio
    async def test_deduplication(self):
        """Test that duplicate requests are deduplicated"""
        call_count = [0]

        async def expensive_operation(x):
            call_count[0] += 1
            await asyncio.sleep(0.1)
            return x * 2

        deduplicator = RequestDeduplicator()

        # Submit identical concurrent requests
        results = await asyncio.gather(
            deduplicator.deduplicate("key1", expensive_operation, 5),
            deduplicator.deduplicate("key1", expensive_operation, 5),
            deduplicator.deduplicate("key1", expensive_operation, 5)
        )

        # All should return same result
        assert results == [10, 10, 10]
        # But function should only be called once
        assert call_count[0] == 1

    @pytest.mark.asyncio
    async def test_different_keys(self):
        """Test that different keys are not deduplicated"""
        call_count = [0]

        async def operation(x):
            call_count[0] += 1
            return x * 2

        deduplicator = RequestDeduplicator()

        # Different keys
        results = await asyncio.gather(
            deduplicator.deduplicate("key1", operation, 5),
            deduplicator.deduplicate("key2", operation, 10)
        )

        assert results == [10, 20]
        assert call_count[0] == 2  # Both executed


class TestConnectionPool:
    """Test ConnectionPool class"""

    @pytest.mark.asyncio
    async def test_acquire_and_release(self):
        """Test acquiring and releasing connections"""
        connection_count = [0]

        async def create_connection():
            connection_count[0] += 1
            return {"id": connection_count[0]}

        pool = ConnectionPool(
            create_connection=create_connection,
            max_size=5,
            min_size=2
        )

        # Acquire connection
        conn1 = await pool.acquire()
        assert conn1["id"] == 1

        # Acquire another
        conn2 = await pool.acquire()
        assert conn2["id"] == 2

        # Release and reuse
        await pool.release(conn1)
        conn3 = await pool.acquire()
        assert conn3["id"] == 1  # Reused

    @pytest.mark.asyncio
    async def test_max_size_limit(self):
        """Test that pool respects max size"""
        async def create_connection():
            return {"id": time.time()}

        pool = ConnectionPool(
            create_connection=create_connection,
            max_size=2,
            min_size=1
        )

        conn1 = await pool.acquire()
        conn2 = await pool.acquire()

        # Should have 2 connections in use
        assert len(pool.in_use) == 2


class TestMeasurePerformance:
    """Test measure_performance decorator"""

    def test_sync_function(self):
        """Test performance measurement for sync function"""
        @measure_performance
        def slow_function():
            time.sleep(0.1)
            return "done"

        result = slow_function()
        assert result == "done"

    @pytest.mark.asyncio
    async def test_async_function(self):
        """Test performance measurement for async function"""
        @measure_performance
        async def slow_async_function():
            await asyncio.sleep(0.1)
            return "done"

        result = await slow_async_function()
        assert result == "done"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
