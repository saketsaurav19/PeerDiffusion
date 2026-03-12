const { createLibp2p } = require('libp2p');
const { tcp } = require('@libp2p/tcp');
const { websockets } = require('@libp2p/websockets');
const { mplex } = require('@libp2p/mplex');
const { noise } = require('@chainsafe/libp2p-noise');
const { kadDHT } = require('@libp2p/kad-dht');
const { gossipsub } = require('@libp2p/gossipsub');
const { bootstrap } = require('@libp2p/bootstrap');
const { identify } = require('@libp2p/identify');

const TOPICS = {
    CAPABILITIES: 'peerdiffusion/capabilities/1.0.0',
    JOB_REQUESTS: 'peerdiffusion/jobs/requests/1.0.0',
    JOB_RESULTS: 'peerdiffusion/jobs/results/1.0.0'
};

let libp2pNode = null;
const peers = new Map(); // Store known peers and their capabilities

async function initNode() {
    console.log("Starting libp2p node...");

    // Default bootstrap nodes for discovery (in a real app, these would be dedicated signaling servers)
    const bootstrapList = [
        '/ip4/127.0.0.1/tcp/0', // Local test fallback
        // '/dnsaddr/bootstrap.peerdiffusion.net/p2p/Qm...'
    ];

    libp2pNode = await createLibp2p({
        addresses: {
            listen: [
                '/ip4/0.0.0.0/tcp/0', // Listen on random available port
                '/ip4/0.0.0.0/tcp/0/ws' // WebSocket fallback
            ]
        },
        transports: [
            tcp(),
            websockets()
        ],
        streamMuxers: [
            mplex()
        ],
        connectionEncryption: [
            noise()
        ],
        peerDiscovery: [
            bootstrap({
                list: bootstrapList
            })
        ],
        services: {
            dht: kadDHT({
                kBucketSize: 20,
                clientMode: false
            }),
            pubsub: gossipsub({
                emitSelf: false,
                fallbackToFloodsub: true
            }),
            identify: identify()
        }
    });

    libp2pNode.addEventListener('peer:discovery', (evt) => {
        const peerId = evt.detail.id;
        console.log(`Discovered peer: ${peerId.toString()}`);
    });

    libp2pNode.addEventListener('peer:connect', (evt) => {
        const peerId = evt.detail;
        console.log(`Connected to peer: ${peerId.toString()}`);
    });

    libp2pNode.addEventListener('peer:disconnect', (evt) => {
        const peerId = evt.detail;
        console.log(`Disconnected from peer: ${peerId.toString()}`);
        peers.delete(peerId.toString());
    });

    await libp2pNode.start();
    console.log(`Node started with ID: ${libp2pNode.peerId.toString()}`);

    const listenAddrs = libp2pNode.getMultiaddrs();
    console.log('Listening on addresses:');
    listenAddrs.forEach((addr) => {
        console.log(addr.toString());
    });

    setupPubSub();

    return libp2pNode;
}

function setupPubSub() {
    if (!libp2pNode) return;

    const pubsub = libp2pNode.services.pubsub;

    pubsub.addEventListener('message', (evt) => {
        const topic = evt.detail.topic;
        const msg = Buffer.from(evt.detail.data).toString();

        try {
            const data = JSON.parse(msg);
            handleIncomingMessage(topic, data, evt.detail.from.toString());
        } catch(e) {
            console.error("Failed to parse incoming message", e);
        }
    });

    // Subscribe to topics
    Object.values(TOPICS).forEach(topic => {
        pubsub.subscribe(topic);
        console.log(`Subscribed to topic: ${topic}`);
    });

    // Periodically broadcast our capabilities
    setInterval(broadcastCapabilities, 30000); // Every 30s
}

function handleIncomingMessage(topic, data, fromPeer) {
    switch (topic) {
        case TOPICS.CAPABILITIES:
            console.log(`Received capabilities from ${fromPeer}`);
            peers.set(fromPeer, data);
            break;
        case TOPICS.JOB_REQUESTS:
            console.log(`Received job request from ${fromPeer}:`, data);
            // Handle in the scheduler module
            const { handleJobRequest } = require('../scheduler/scheduler');
            handleJobRequest(fromPeer, data);
            break;
        case TOPICS.JOB_RESULTS:
            console.log(`Received job result from ${fromPeer} for job: ${data.jobId}`);
            const { handleJobResult } = require('../scheduler/scheduler');
            handleJobResult(data);
            break;
        default:
            console.log(`Unhandled topic: ${topic}`);
    }
}

async function broadcastCapabilities() {
    if (!libp2pNode) return;

    // In a real app, gather actual hardware and models
    const { getDetectedModels } = require('../model-store/detection');
    const { getHardwareCapabilities } = require('../../hardware-detection/index.js');

    const capabilities = {
        nodeId: libp2pNode.peerId.toString(),
        timestamp: Date.now(),
        hardware: getHardwareCapabilities(),
        models: getDetectedModels()
    };

    try {
        await libp2pNode.services.pubsub.publish(
            TOPICS.CAPABILITIES,
            Buffer.from(JSON.stringify(capabilities))
        );
    } catch(e) {
        console.error("Failed to broadcast capabilities", e);
    }
}

async function publishJobRequest(jobData) {
    if (!libp2pNode) return;
    try {
        await libp2pNode.services.pubsub.publish(
            TOPICS.JOB_REQUESTS,
            Buffer.from(JSON.stringify(jobData))
        );
        console.log("Job request published to network:", jobData.jobId);
    } catch(e) {
        console.error("Failed to publish job request", e);
    }
}

async function publishJobResult(resultData) {
    if (!libp2pNode) return;
    try {
        await libp2pNode.services.pubsub.publish(
            TOPICS.JOB_RESULTS,
            Buffer.from(JSON.stringify(resultData))
        );
        console.log("Job result published to network:", resultData.jobId);
    } catch(e) {
        console.error("Failed to publish job result", e);
    }
}

function getKnownPeers() {
    return Array.from(peers.entries()).map(([id, capabilities]) => ({ id, capabilities }));
}

module.exports = {
    initNode,
    getKnownPeers,
    publishJobRequest,
    publishJobResult,
    TOPICS
};
