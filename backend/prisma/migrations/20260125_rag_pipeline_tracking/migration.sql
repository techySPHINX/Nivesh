-- Migration: Add RAG Pipeline Tracking Tables
-- Description: Tables for vector indexing jobs, embedding cache, and retrieval metrics
-- Date: 2026-01-25

-- Enable pgvector extension for vector similarity search in PostgreSQL
-- This allows us to cache embeddings and do fallback vector search if needed
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- Table: vector_indexing_jobs
-- Purpose: Track vector indexing operations for audit and retry
-- ==========================================
CREATE TABLE IF NOT EXISTS vector_indexing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,  -- 'transaction', 'goal', 'budget', 'knowledge', 'conversation'
  entity_id VARCHAR(100) NOT NULL,
  collection_name VARCHAR(100) NOT NULL,  -- Qdrant collection name
  vector_id VARCHAR(100),  -- Qdrant vector ID (UUID)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'indexed', 'failed', 'retrying')),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  indexed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate indexing
  CONSTRAINT unique_entity_indexing UNIQUE(entity_type, entity_id)
);

-- Indices for efficient querying
CREATE INDEX idx_vector_jobs_status ON vector_indexing_jobs(status, created_at);
CREATE INDEX idx_vector_jobs_entity ON vector_indexing_jobs(entity_type, entity_id);
CREATE INDEX idx_vector_jobs_collection ON vector_indexing_jobs(collection_name);
CREATE INDEX idx_vector_jobs_created ON vector_indexing_jobs(created_at DESC);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_vector_jobs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vector_jobs_update_timestamp
  BEFORE UPDATE ON vector_indexing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_vector_jobs_timestamp();

-- ==========================================
-- Table: embedding_cache
-- Purpose: Cache embedding vectors in PostgreSQL for redundancy and analytics
-- Note: Primary cache is Redis (hot), this is cold storage with 30-day TTL
-- ==========================================
CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash VARCHAR(64) NOT NULL,  -- SHA256 hash of input text
  model_name VARCHAR(100) NOT NULL,  -- e.g., 'Xenova/all-MiniLM-L6-v2'
  embedding VECTOR(384),  -- pgvector type, 384 dimensions
  text_preview TEXT,  -- First 200 chars for debugging
  hit_count INT DEFAULT 0,  -- Track cache utilization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Unique constraint for deduplication
  CONSTRAINT unique_embedding_cache UNIQUE(text_hash, model_name)
);

-- Indices for fast lookup
CREATE INDEX idx_embedding_cache_lookup ON embedding_cache(text_hash, model_name);
CREATE INDEX idx_embedding_cache_expires ON embedding_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_embedding_cache_model ON embedding_cache(model_name);

-- Vector similarity index (for fallback vector search)
CREATE INDEX idx_embedding_vector ON embedding_cache USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_embeddings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM embedding_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Table: retrieval_metrics
-- Purpose: Track RAG retrieval performance and quality
-- ==========================================
CREATE TABLE IF NOT EXISTS retrieval_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,  -- NULL for system queries
  query_text TEXT NOT NULL,
  query_hash VARCHAR(64) NOT NULL,  -- For deduplication analysis
  
  -- Results metadata
  results_count INT NOT NULL,
  collections_searched TEXT[],  -- Array of collection names
  avg_score FLOAT,
  max_score FLOAT,
  min_score FLOAT,
  
  -- Performance metrics
  retrieval_time_ms INT NOT NULL,
  embedding_time_ms INT,
  search_time_ms INT,
  rerank_time_ms INT,
  
  -- Cache efficiency
  cache_hit BOOLEAN DEFAULT FALSE,
  cache_source VARCHAR(20),  -- 'redis', 'postgres', 'none'
  
  -- Quality metrics (optional, filled post-generation)
  user_feedback_score INT CHECK (user_feedback_score BETWEEN -1 AND 1),  -- -1 (bad), 0 (neutral), 1 (good)
  context_used_count INT,  -- How many retrieved docs actually used by LLM
  
  -- Metadata
  session_id UUID,
  intent VARCHAR(100),  -- Classified intent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for analytics
CREATE INDEX idx_retrieval_user ON retrieval_metrics(user_id, created_at DESC);
CREATE INDEX idx_retrieval_created ON retrieval_metrics(created_at DESC);
CREATE INDEX idx_retrieval_performance ON retrieval_metrics(retrieval_time_ms, cache_hit);
CREATE INDEX idx_retrieval_quality ON retrieval_metrics(avg_score, user_feedback_score);
CREATE INDEX idx_retrieval_query_hash ON retrieval_metrics(query_hash);

-- ==========================================
-- Table: rag_analytics_summary (Materialized View)
-- Purpose: Pre-aggregated metrics for dashboards
-- ==========================================
CREATE MATERIALIZED VIEW IF NOT EXISTS rag_analytics_summary AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS total_retrievals,
  AVG(retrieval_time_ms) AS avg_retrieval_time_ms,
  AVG(avg_score) AS avg_relevance_score,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::FLOAT / COUNT(*) AS cache_hit_rate,
  AVG(results_count) AS avg_results_count,
  COUNT(DISTINCT user_id) AS unique_users,
  AVG(user_feedback_score) FILTER (WHERE user_feedback_score IS NOT NULL) AS avg_feedback_score
FROM retrieval_metrics
GROUP BY hour
ORDER BY hour DESC;

-- Index for fast querying
CREATE INDEX idx_rag_analytics_hour ON rag_analytics_summary(hour DESC);

-- Refresh function (call hourly via cron)
CREATE OR REPLACE FUNCTION refresh_rag_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY rag_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Table: knowledge_base_articles
-- Purpose: Store knowledge base content for indexing
-- ==========================================
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_type VARCHAR(50) NOT NULL CHECK (knowledge_type IN ('faq', 'regulation', 'product', 'strategy', 'guideline')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source VARCHAR(200) NOT NULL,
  authority VARCHAR(100),  -- e.g., 'RBI', 'SEBI', 'Internal'
  version VARCHAR(20),
  
  -- Indexing status
  vector_id VARCHAR(100),  -- Qdrant vector ID
  indexed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by UUID,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_knowledge_type ON knowledge_base_articles(knowledge_type, is_active);
CREATE INDEX idx_knowledge_tags ON knowledge_base_articles USING GIN(tags);
CREATE INDEX idx_knowledge_source ON knowledge_base_articles(source);
CREATE INDEX idx_knowledge_indexed ON knowledge_base_articles(indexed_at) WHERE indexed_at IS NOT NULL;

-- Full-text search index
CREATE INDEX idx_knowledge_fts ON knowledge_base_articles USING GIN(
  to_tsvector('english', question || ' ' || answer)
);

-- Auto-update timestamp
CREATE TRIGGER knowledge_update_timestamp
  BEFORE UPDATE ON knowledge_base_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_vector_jobs_timestamp();

-- ==========================================
-- Useful Views
-- ==========================================

-- Failed indexing jobs that need retry
CREATE OR REPLACE VIEW pending_indexing_jobs AS
SELECT 
  id,
  entity_type,
  entity_id,
  retry_count,
  error_message,
  created_at
FROM vector_indexing_jobs
WHERE status IN ('pending', 'failed', 'retrying')
  AND retry_count < 3
ORDER BY created_at ASC;

-- Cache performance by model
CREATE OR REPLACE VIEW embedding_cache_stats AS
SELECT
  model_name,
  COUNT(*) AS total_entries,
  SUM(hit_count) AS total_hits,
  AVG(hit_count) AS avg_hits_per_entry,
  MAX(last_accessed_at) AS last_access,
  COUNT(*) FILTER (WHERE expires_at < NOW()) AS expired_entries
FROM embedding_cache
GROUP BY model_name;

-- Daily retrieval performance
CREATE OR REPLACE VIEW daily_retrieval_stats AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_retrievals,
  AVG(retrieval_time_ms) AS avg_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY retrieval_time_ms) AS p95_time_ms,
  AVG(avg_score) AS avg_relevance,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 AS cache_hit_pct
FROM retrieval_metrics
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ==========================================
-- Comments for documentation
-- ==========================================
COMMENT ON TABLE vector_indexing_jobs IS 'Tracks vector indexing operations for entities';
COMMENT ON TABLE embedding_cache IS 'PostgreSQL cache for embeddings (cold storage, 30-day TTL)';
COMMENT ON TABLE retrieval_metrics IS 'RAG retrieval performance and quality metrics';
COMMENT ON TABLE knowledge_base_articles IS 'Financial knowledge base content for indexing';
COMMENT ON MATERIALIZED VIEW rag_analytics_summary IS 'Hourly aggregated RAG metrics for dashboards';
