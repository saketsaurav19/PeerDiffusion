const { exec, spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

let workerProcess = null;
const WORKER_URL = 'http://127.0.0.1:8000';
let isContainerRunning = false;

// Helper to check if docker is installed and running
function checkDocker() {
    return new Promise((resolve) => {
        exec('docker info', (error) => {
            resolve(!error);
        });
    });
}

// Builds the Docker image based on the local Python source
async function buildSandbox() {
    console.log("Building Docker sandbox image...");
    const dockerfileDir = path.join(__dirname, '..', '..', 'worker-runtime', 'sandbox');
    return new Promise((resolve, reject) => {
        const build = spawn('docker', ['build', '-t', 'peerdiffusion-worker', '.'], {
            cwd: dockerfileDir,
            stdio: 'inherit'
        });

        build.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Docker build failed with code ${code}`));
        });
    });
}

// Launches the Docker container with GPU access and mounted model volumes
async function startSandbox(modelDir) {
    if (isContainerRunning) return true;

    const hasDocker = await checkDocker();
    if (!hasDocker) {
        throw new Error("Docker is required but not running.");
    }

    console.log("Starting secure Docker sandbox for Worker...");

    // Command equivalent: docker run --rm -p 8000:8000 --gpus all -v /local/models:/models peerdiffusion-worker
    const runArgs = [
        'run', '--rm',
        '-p', '8000:8000',
        '--gpus', 'all',
        '-v', `${modelDir}:/models:ro`, // Read-only mount
        'peerdiffusion-worker'
    ];

    workerProcess = spawn('docker', runArgs, { stdio: 'pipe' });

    workerProcess.stdout.on('data', (data) => console.log(`[WORKER] ${data.toString().trim()}`));
    workerProcess.stderr.on('data', (data) => console.error(`[WORKER ERR] ${data.toString().trim()}`));

    isContainerRunning = true;

    // Wait for the FastAPI server to be ready
    let retries = 10;
    while(retries > 0) {
        try {
            await axios.get(`${WORKER_URL}/health`);
            console.log("Worker API is ready inside the sandbox.");
            return true;
        } catch(e) {
            retries--;
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    throw new Error("Worker Sandbox failed to start.");
}

function stopSandbox() {
    if (workerProcess) {
        workerProcess.kill();
        isContainerRunning = false;
        console.log("Worker sandbox stopped.");
    }
}

// Communicates with the local sandboxed Python API
async function executeWorkflow(workflowJson, seed, modelHash) {
    const { getModelPath } = require('../model-store/detection');
    const modelPath = getModelPath(modelHash);

    if (!modelPath) {
        throw new Error(`Model hash ${modelHash} not found locally.`);
    }

    const payload = {
        workflow: workflowJson,
        seed: seed,
        model_path: `/models/${path.basename(modelPath)}` // Map local path to container path
    };

    try {
        console.log(`Sending job to local Docker sandbox...`);
        const response = await axios.post(`${WORKER_URL}/generate`, payload);
        return response.data.image_base64;
    } catch (err) {
        console.error("Failed executing job on worker:", err.message);
        throw err;
    }
}

module.exports = {
    buildSandbox,
    startSandbox,
    stopSandbox,
    executeWorkflow
};
