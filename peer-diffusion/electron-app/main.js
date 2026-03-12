const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initNode } = require('./peer-network/node');
const { startScheduler } = require('./scheduler/scheduler');
const { startModelDetection } = require('./model-store/detection');

let mainWindow;
let p2pNode;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // In a real app we would load a React build or Dev Server URL.
  // For the prototype, we load a basic HTML file.
  mainWindow.loadFile('ui/index.html');

  // Initialize Background Services
  console.log("Initializing local model detection...");
  await startModelDetection();

  console.log("Initializing PeerDiffusion Network Node...");
  p2pNode = await initNode();

  console.log("Starting Job Scheduler...");
  startScheduler(p2pNode);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
