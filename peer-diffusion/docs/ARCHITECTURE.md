# PeerDiffusion Architecture

PeerDiffusion is a decentralized, peer-to-peer render network for distributing AI image generation tasks (diffusion models) across a global network of consumer GPUs.

## 1. Electron Desktop Application
The user-facing entry point. Responsibilities:
- Manage the local Node.js `libp2p` instance.
- Coordinate with other peers on the network.
- Execute the job scheduler algorithm to split batches and assign tasks.
- Keep track of local models.
- Provide a UI for submitting prompts and viewing progress.

## 2. Peer-to-Peer Networking Layer
Built on `libp2p` running inside the Node.js process.
- **Transports**: TCP, WebSockets.
- **Discovery**: Kademlia Distributed Hash Table (DHT) and local mDNS.
- **Messaging**: Gossipsub pub/sub protocol.

### Message Protocol
Messages are broadcasted via Gossipsub over specific topics.

- `NODE_CAPABILITIES`: Broadcast periodically. Contains `nodeId`, `gpus`, `vram`, and array of `installed_models_hashes`.
- `JOB_REQUEST`: Sent when a node wants to generate images. Contains the `jobId`, `modelHash`, and `workflow_json`.
- `JOB_ASSIGN`: Sent directly from the requesting node to a worker node assigning a specific task ID.
- `JOB_RESULT`: Sent from the worker back to the requester containing the generated image payload (base64) or a pointer to the result.

## 3. Job Scheduler
When a user requests 100 images:
1. The Scheduler generates 100 unique task IDs.
2. It looks at the routing table of known peers and their `NODE_CAPABILITIES`.
3. It filters for peers that have the requested `modelHash` and sufficient `vram`.
4. It sends `JOB_ASSIGN` messages to compatible peers.
5. It awaits `JOB_RESULT` messages, aggregating them into the final batch result.

## 4. Worker Runtime
The actual AI execution layer, written in Python using PyTorch and Diffusers.
- Runs inside a secure environment.
- Exposes a local HTTP/REST API (FastAPI) to the Electron parent process.
- Receives ComfyUI-like workflow definitions.
- Translates workflows to Diffusers pipelines and generates the image.

## 5. Sandbox Execution
To ensure security, the Worker Runtime executes within a Docker container.
- Uses `nvidia-docker` to provide GPU access.
- The Electron app mounts the local model directory in read-only mode to the container.
- Network access from the container is restricted to only communicate with the local host (the Electron app).

## 6. Model Store & Detection
- Models are large (2GB-7GB). A matching hash is required for distributed rendering to ensure deterministic outputs.
- Upon startup, the app scans directories (like `models/checkpoints/`) for `.safetensors`.
- Calculates SHA-256 hashes and registers them to local capabilities.
- The Model Store provides a registry to download new models via HTTP mirrors (eventually P2P chunking).
