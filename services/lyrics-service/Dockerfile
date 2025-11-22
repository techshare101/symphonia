# Use CUDA base for GPU support
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# System deps
RUN apt-get update && apt-get install -y \
    python3 python3-pip git ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# App deps
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# App
COPY app ./app

# Health port
ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]