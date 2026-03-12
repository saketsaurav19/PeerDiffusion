# PeerDiffusion

PeerDiffusion is a decentralized peer-to-peer distributed render network for diffusion models. Users install a desktop application that connects to a global P2P network and shares GPU resources for AI image generation.

## Prerequisites
- Node.js (v18+)
- Python 3.10+
- Docker (with `nvidia-docker` installed for GPU passthrough)

## 1. Setup the Desktop Client

Navigate to the Electron app directory and install dependencies:

```
cd peer-diffusion/electron-app
npm install
```

## 2. Setup the Worker Runtime

The actual execution layer runs securely inside a Docker container. You must build the container before starting the app.

```
cd peer-diffusion/worker-runtime/sandbox
docker build -t peerdiffusion-worker .
```

*Note: Ensure you have an NVIDIA GPU and the Docker engine is configured for `nvidia-container-runtime`.*

## 3. Running a Node

You can start the desktop client with:

```
cd peer-diffusion/electron-app
npx electron .
```

Upon starting, the client will:
1. Scan `./models` for any `.safetensors` files.
2. Initialize the local `libp2p` node and broadcast hardware capabilities.
3. The UI will show your node status and connected peers.

## 4. Demonstrating the Distributed Network

To test the network locally across multiple simulated nodes, you can open a second terminal and start another instance (ensure you override the Node debugging ports if applicable).

Once connected:
1. Nodes will automatically discover each other via DHT and Gossipsub.
2. If Node A submits a batch job via the Scheduler, it will broadcast `JOB_REQUEST` messages.
3. Node B will receive the request, check its local Model Store hashes, and if it matches, execute the workflow using its isolated Docker Sandbox via the `worker.py` API.
4. Node B returns the base64 generated image over the network back to Node A.

## Directory Structure

- `electron-app/`: The Main Node.js process and React UI.
  - `peer-network/`: P2P libp2p implementation.
  - `scheduler/`: Batch splitting and job routing.
  - `worker-manager/`: Docker container lifecycle.
  - `model-store/`: Model detection and management.
- `worker-runtime/`: The isolated Python backend.
  - `sandbox/`: Dockerfile and `worker.py` FastAPI server.
- `docs/ARCHITECTURE.md`: Detailed explanation of the system and protocol.
