# syntax = docker/dockerfile:1.7

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && pip install --no-cache-dir uv

WORKDIR /workspace

COPY apps/backend/pyproject.toml apps/backend/uv.lock apps/backend/

RUN --mount=type=cache,id=backend-uv-cache,target=/root/.cache/uv \
    uv sync --directory apps/backend --frozen

CMD ["uv", "run", "--directory", "apps/backend", "fastapi", "dev", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
