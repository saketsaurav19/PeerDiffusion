// Mock hardware detection for prototype
function getHardwareCapabilities() {
    return {
        gpu: "NVIDIA RTX 4090",
        vram: "24GB",
        cuda: true,
        cpu: "Intel Core i9-13900K",
        ram: "64GB"
    };
}

module.exports = {
    getHardwareCapabilities
};
