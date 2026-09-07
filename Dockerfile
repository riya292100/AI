# Multi-stage Dockerfile for LifeOS on Google Cloud Run
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
ENV REACT_APP_BACKEND_URL=""
RUN npm run build

# Stage 2: Production Python Backend serving API & Frontend Assets
FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY --from=frontend-builder /app/frontend/build /app/frontend/build

ENV PORT=8080
ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD exec uvicorn backend.server:app --host 0.0.0.0 --port ${PORT}
