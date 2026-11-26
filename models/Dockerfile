# Optional models service: the World Bank's public MFMod country models, run with ModelFlow.
# Built and started only with `docker compose --profile models up -d --build` (docs/INSTALL.md).
FROM python:3.12-slim@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 MFMOD_DIR=/data/mfmod MFMOD_PORT=8765
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY service.py .
# Runs as root inside the container so it can write to data/local/mfmod/ however that folder was
# made on the host; the service is reachable only from the app inside Docker (no published port).
RUN mkdir -p /data/mfmod
EXPOSE 8765
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/health', timeout=5)"
CMD ["python", "service.py"]
