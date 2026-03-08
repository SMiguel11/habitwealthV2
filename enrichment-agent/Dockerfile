# ──────────────────────────────────────────────────────────────────────────────
# HabitWealth – Enrichment Agent Container App
# Build: docker build -t habitwealth-enrichment-agent .
# Run:   docker run -p 8001:8001 --env-file .env habitwealth-enrichment-agent
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Security: non-root user
RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

# Install deps first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure the app user owns all files
RUN chown -R app:app /app
USER app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
