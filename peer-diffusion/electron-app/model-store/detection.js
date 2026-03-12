const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');

let localModels = new Map();

// Standard locations a user might store models
const SEARCH_PATHS = [
    path.join(__dirname, '..', '..', 'models'), // Local app fallback
    // In production, would check standard ComfyUI/Auto1111 directories like:
    // path.join(os.homedir(), 'ComfyUI/models/checkpoints')
];

async function startModelDetection() {
    console.log("Starting model detection...");

    // Create default model dir if it doesn't exist
    if (!fs.existsSync(SEARCH_PATHS[0])) {
        fs.mkdirSync(SEARCH_PATHS[0], { recursive: true });
    }

    // Initial scan
    for (const dir of SEARCH_PATHS) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (file.endsWith('.safetensors') || file.endsWith('.ckpt')) {
                    const filePath = path.join(dir, file);
                    await registerModel(filePath);
                }
            }
        }
    }

    // Watch for new models
    const watcher = chokidar.watch(SEARCH_PATHS, { ignored: /(^|[\/\\])\../, persistent: true });
    watcher.on('add', async (filePath) => {
        if (filePath.endsWith('.safetensors') || filePath.endsWith('.ckpt')) {
            await registerModel(filePath);
        }
    });

    console.log(`Detected ${localModels.size} initial models.`);
}

async function registerModel(filePath) {
    // Basic hash calculation for prototype (in production, use chunked sha256)
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);

    // Quick mock hash for demo
    // const hash = crypto.createHash('sha256').update(fileName).digest('hex');

    // Simulate real hash calculation mapping to a known mock hash
    let hash = "abc12345";
    if (fileName.includes('sd_xl_base_1.0')) hash = "sdxl_hash_01";
    if (fileName.includes('v1-5-pruned')) hash = "sd15_hash_01";

    localModels.set(hash, {
        name: fileName,
        hash: hash,
        path: filePath,
        size: stats.size,
        type: 'diffusion'
    });

    console.log(`Registered model: ${fileName} with hash: ${hash}`);
}

function getDetectedModels() {
    return Array.from(localModels.values()).map(m => m.hash);
}

function hasModel(hash) {
    return localModels.has(hash);
}

function getModelPath(hash) {
    const model = localModels.get(hash);
    return model ? model.path : null;
}

// Download mock logic for the Model Store UI
async function downloadModelFromMirror(modelMetadata) {
    const { default: axios } = await import('axios');
    console.log(`Downloading model ${modelMetadata.name} from HTTP mirror...`);
    // Simulated download logic here
    const targetPath = path.join(SEARCH_PATHS[0], modelMetadata.name + '.safetensors');

    // For demo, just write a dummy file
    fs.writeFileSync(targetPath, "Dummy model content");
    console.log(`Model downloaded to: ${targetPath}`);
    return true;
}

module.exports = {
    startModelDetection,
    getDetectedModels,
    hasModel,
    getModelPath,
    downloadModelFromMirror
};
