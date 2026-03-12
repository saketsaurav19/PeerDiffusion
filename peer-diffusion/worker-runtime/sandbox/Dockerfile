# Use an official NVIDIA base image with PyTorch
FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python worker engine
COPY worker.py .
COPY diffusion-engine/ ./diffusion-engine/

# Expose the API port
EXPOSE 8000

# Start the FastAPI server that Electron will talk to
CMD ["uvicorn", "worker:app", "--host", "0.0.0.0", "--port", "8000"]
