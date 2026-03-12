const { v4: uuidv4 } = require('uuid');

let activeJobs = new Map(); // Store local generated requests and their progress
let myJobsQueue = []; // Store external requests queued for our local worker

const SCHEDULING_STRATEGY = 'VRAM_FIRST';

let networkNode = null;

function startScheduler(node) {
    networkNode = node;
    console.log("Scheduler started with VRAM_FIRST strategy.");

    // Simulate processing the queue locally
    setInterval(processLocalQueue, 5000);
}

// Called by Electron UI when user requests 100 images
function submitBatchJob(batchRequest) {
    const batchId = uuidv4();
    const tasks = [];

    // Split batch into 100 individual tasks
    for(let i=0; i<batchRequest.count; i++) {
        const taskId = `${batchId}-${i}`;
        tasks.push({
            taskId: taskId,
            batchId: batchId,
            workflow: batchRequest.workflow,
            modelHash: batchRequest.modelHash,
            seed: Math.floor(Math.random() * 1000000), // Unique seed per task
            status: 'PENDING',
            assignedTo: null,
            result: null
        });
    }

    activeJobs.set(batchId, {
        batchId: batchId,
        totalTasks: batchRequest.count,
        completedTasks: 0,
        tasks: tasks,
        createdAt: Date.now()
    });

    console.log(`Submitted Batch Job ${batchId} with ${batchRequest.count} tasks.`);
    distributeTasks(batchId);
    return batchId;
}

async function distributeTasks(batchId) {
    const job = activeJobs.get(batchId);
    if (!job) return;

    const { getKnownPeers, publishJobRequest } = require('../peer-network/node');
    const peers = getKnownPeers();

    console.log(`Distributing tasks for batch ${batchId} across ${peers.length} peers.`);

    // Very naive scheduling: broadcast all PENDING tasks to the network.
    // In a real P2P app, you would target specific nodes via direct streams.
    // For this prototype, we'll pubsub the request and nodes will 'claim' it or execute it.

    for(let task of job.tasks) {
        if(task.status === 'PENDING') {
            task.status = 'BROADCASTED';

            const requestPayload = {
                type: 'RENDER_TASK',
                taskId: task.taskId,
                batchId: task.batchId,
                modelHash: task.modelHash,
                workflow: task.workflow,
                seed: task.seed,
                requesterId: networkNode.peerId.toString()
            };

            await publishJobRequest(requestPayload);
            // Throttle slightly to not flood pubsub
            await new Promise(r => setTimeout(r, 100));
        }
    }
}

// Handlers for incoming network messages
function handleJobRequest(fromPeer, jobData) {
    // Check if we can fulfill this request
    const { hasModel } = require('../model-store/detection');
    const hasRequiredModel = hasModel(jobData.modelHash);

    if (hasRequiredModel) {
        console.log(`Can fulfill task ${jobData.taskId} from peer ${fromPeer}. Queuing locally.`);
        myJobsQueue.push({
            ...jobData,
            status: 'QUEUED'
        });
    } else {
        console.log(`Cannot fulfill task ${jobData.taskId}. Missing model hash: ${jobData.modelHash}`);
    }
}

function handleJobResult(resultData) {
    // Check if this result is for a job we submitted
    const batchId = resultData.batchId;
    const job = activeJobs.get(batchId);

    if (job) {
        const task = job.tasks.find(t => t.taskId === resultData.taskId);
        if (task && task.status !== 'COMPLETED') {
            task.status = 'COMPLETED';
            task.result = resultData.imagePayload;
            task.assignedTo = resultData.workerId;
            job.completedTasks++;

            console.log(`Batch ${batchId}: Task ${task.taskId} completed by ${resultData.workerId}. Progress: ${job.completedTasks}/${job.totalTasks}`);

            // Send IPC to UI to update progress
            // mainWindow.webContents.send('batch-progress', job);
        }
    }
}

// Local Execution Loop
async function processLocalQueue() {
    if (myJobsQueue.length === 0) return;

    // Get the next job
    const job = myJobsQueue.shift();
    job.status = 'PROCESSING';

    console.log(`Local worker starting execution for task ${job.taskId}...`);

    try {
        const { executeWorkflow } = require('../worker-manager/manager');
        const imagePayload = await executeWorkflow(job.workflow, job.seed, job.modelHash);

        // Send Result Back
        console.log(`Local worker finished task ${job.taskId}. Publishing result...`);

        const { publishJobResult } = require('../peer-network/node');
        await publishJobResult({
            taskId: job.taskId,
            batchId: job.batchId,
            workerId: networkNode.peerId.toString(),
            imagePayload: imagePayload,
            timestamp: Date.now()
        });

    } catch(err) {
        console.error(`Local worker failed on task ${job.taskId}:`, err);
        // Could implement re-queuing or sending a failure message
    }
}

module.exports = {
    startScheduler,
    submitBatchJob,
    handleJobRequest,
    handleJobResult
};
