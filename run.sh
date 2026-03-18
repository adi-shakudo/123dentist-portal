#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== 123Dentist Partner Onboarding Portal ==="

echo "[1] Installing Python dependencies..."
pip install -q -r backend/requirements.txt

if [ ! -d "frontend/dist" ]; then
  echo "[2] Building frontend (first run)..."
  cd frontend && npm install --silent && npm run build && cd ..
else
  echo "[2] Pre-built frontend found — skipping build"
fi

echo "[3] Starting server on port 8787..."
cd backend
exec uvicorn main:app --host 0.0.0.0 --port 8787
