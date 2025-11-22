# Fast, small, deterministic
FROM python:3.11-slim

# System deps (librosa -> ffmpeg, libsndfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 git && rm -rf /var/lib/apt/lists/*

# App deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App
COPY app ./app

# Health port
ENV PORT=8080
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]