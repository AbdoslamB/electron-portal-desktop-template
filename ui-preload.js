const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronUI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
    close: () => ipcRenderer.send('window-close'),
    toggleDevtools: () => ipcRenderer.send('window-toggle-devtools')
    ,
    switchSite: (siteKey) => ipcRenderer.send('switch-site', siteKey),
    onSiteChanged: (cb) => ipcRenderer.on('site-switched', (event, siteKey) => cb(siteKey)),
    openSiteMenu: () => ipcRenderer.send('open-site-menu'),
    toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
    onFullscreenChanged: (cb) => ipcRenderer.on('window-fullscreen-changed', (event, isFs) => cb(isFs))
});
