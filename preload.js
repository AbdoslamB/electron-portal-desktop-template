// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

// Since we are loading a remote, untrusted website, we should expose as little as possible.
// For a simple wrapper, we don't expose anything to the window object.
// We just make sure the script exists to satisfy the webPreferences configuration.

// For most web apps, this file can remain empty, ensuring maximum security isolation.
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, explicit API to the renderer (offline page) for retrying the load
contextBridge.exposeInMainWorld('electronAPI', {
    retry: () => ipcRenderer.send('retry-load')
});

console.log('Preload script loaded.');