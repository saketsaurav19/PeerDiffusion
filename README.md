# PeerDiffusion
PeerDiffusion — A peer-to-peer distributed render network for diffusion models. Generate AI images using shared GPU power across multiple machines with ComfyUI workflows.

PeerDiffusion

🚀 Peer-to-Peer Distributed GPU Network for Diffusion Models

PeerDiffusion is a decentralized AI compute network that allows users to generate images using shared GPU resources across multiple computers.

Instead of relying on centralized servers, PeerDiffusion distributes diffusion workflows across connected peers. Each node in the network can both submit generation tasks and process tasks for other peers.

This allows large batches of images or video frames to be generated in parallel.

Example:

If one image takes 30 seconds to generate and a user requests 100 images, PeerDiffusion distributes the workload across multiple peers so the entire batch can complete in roughly 30 seconds.

---

✨ Features

• Fully peer-to-peer architecture
• No centralized servers
• Distributed Stable Diffusion generation
• ComfyUI workflow compatibility
• Parallel batch rendering across multiple machines
• Automatic GPU and hardware detection
• Secure sandbox execution for remote workflows
• Built-in Model Store for installing AI models
• Automatic detection of preinstalled models

---

🧠 How It Works

PeerDiffusion connects computers into a decentralized compute network.

User Request
      │
      ▼
Workflow Analyzer
      │
      ▼
Job Scheduler
      │
      ▼
Peer Network
 ┌────────┬────────┬────────┐
 │ Node A │ Node B │ Node C │
 │ GPU    │ GPU    │ GPU    │
 └────────┴────────┴────────┘
      │
      ▼
Generated Images Returned

Each node can function as:

• Client – submitting generation tasks
• Worker – processing jobs from other peers

---

🏗 Architecture

PeerDiffusion is composed of several major subsystems.

peer-diffusion/
│
├ electron-app/          # Desktop application
│   ├ ui/                # React interface
│   ├ peer-network/      # P2P networking
│   ├ scheduler/         # job distribution
│   ├ worker-manager/    # worker control
│   └ model-store/       # model installation system
│
├ worker-runtime/        # Python runtime
│   ├ diffusion-engine/  # Stable Diffusion execution
│   ├ workflow-runner/   # ComfyUI workflow executor
│   └ sandbox/           # secure job execution
│
├ hardware-detection/    # GPU + model detection
├ protocol/              # network message protocol
└ docs/

---

🧩 Model Store

PeerDiffusion includes a built-in model store similar to an app marketplace.

Users can browse and install:

• Stable Diffusion base models
• LoRA models
• ControlNet models
• Upscalers

The application automatically:

• downloads models
• verifies model hashes
• registers models for the scheduler

The app also scans the system for already installed models on startup.

---

🔒 Security

All remote jobs run inside a sandbox environment to protect user systems.

Sandbox isolation prevents:

• filesystem access
• malicious code execution
• unauthorized network access

Possible sandbox implementations include:

• container isolation
• micro-VM environments

---

⚙ Installation

Clone the repository:

git clone https://github.com/saketsaurav19/PeerDiffusion
cd PeerDiffusion

Install dependencies:

npm install
pip install -r requirements.txt

Run the application:

npm start

The Electron app will automatically start the worker runtime.

---

🚀 Usage

1. Launch PeerDiffusion
2. Install required models using the Model Store
3. Connect to the peer network
4. Submit prompts or workflows
5. Images are generated across multiple nodes

---

🧪 Example

Local generation:

100 images
30 seconds per image
≈ 50 minutes total

With PeerDiffusion:

100 peers
30 seconds total

---

🗺 Roadmap

Planned features:

• distributed video generation
• torrent-style model sharing
• peer reputation system
• bandwidth optimization
• distributed LoRA training
• global GPU compute marketplace

---

🤝 Contributing

Contributions are welcome.

To contribute:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

📜 License

MIT License

---

⭐ Support

If you find this project interesting, consider starring the repository.
