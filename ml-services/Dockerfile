# ML Services Dockerfile
# Multi-stage build for Python ML services with GPU support
# Uses NVIDIA CUDA base image for GPU acceleration

# ── Stage 1: Base with CUDA runtime ────────────────────────
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install Python 3.11 and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    python3-pip \
    build-essential \
    curl \
    git \
    && ln -sf /usr/bin/python3.11 /usr/bin/python \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN python -m pip install --no-cache-dir --upgrade pip setuptools wheel

# ── Stage 2: Install dependencies ──────────────────────────
# Install PyTorch with CUDA support first (large layer, cached separately)
RUN pip install --no-cache-dir \
    torch==2.2.0+cu121 \
    torchvision==0.17.0+cu121 \
    torchaudio==2.2.0+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

# Copy and install remaining requirements
COPY requirements.txt .
# Remove CPU torch lines from requirements (already installed with CUDA above)
RUN sed -i '/^torch==/d; /^torchvision==/d; /^torchaudio==/d' requirements.txt \
    && pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run FastAPI server with Gunicorn process manager for production
# Workers configurable via WEB_CONCURRENCY env var (default: 2)
CMD ["sh", "-c", "exec gunicorn model_server.app:app --worker-class uvicorn.workers.UvicornWorker --workers ${WEB_CONCURRENCY:-2} --bind 0.0.0.0:8000 --timeout 120 --keep-alive 5 --access-logfile -"]
