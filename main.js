const { app, BrowserWindow, BrowserView, Menu, ipcMain, shell } = require('electron');
const path = require('path');

// The set of websites that can be switched between
const SITE_URLS = {
  support: 'https://example.edu/',
  broadcom: 'https://example.net/',
  uat: 'https://uat.example.edu/'
};
let currentSiteKey = 'support';
const WEBSITE_URL = SITE_URLS[currentSiteKey];

function getSiteUrl(key = currentSiteKey) {
  return SITE_URLS[key] || SITE_URLS.support;
}

function changeSite(siteKey) {
  if (!SITE_URLS[siteKey]) return;
  currentSiteKey = siteKey;
  const url = getSiteUrl(siteKey);
  if (USE_FRAMELESS_UI && contentView) contentView.webContents.loadURL(url);
  else mainWindow.loadURL(url);
  // Notify titlebar UI of the new site
  try { titlebarView?.webContents?.send('site-switched', siteKey); } catch (e) { }
}

let mainWindow;
let titlebarView, contentView;
const USE_FRAMELESS_UI = true;
const TITLEBAR_HEIGHT = 34; // normal titlebar height
const HOT_ZONE_HEIGHT = 34; // height of the titlebar strip in fullscreen (must fit overlay)

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    // Start with an empty title so the title text won't be shown in the native window frame
    title: '',
    // Hide the native menu bar; it can be made visible with Alt on Windows
    autoHideMenuBar: true,
    // Optional: set a custom icon for the app window (use a valid .ico on Windows)
    icon: path.join(__dirname, 'build', 'icon.ico'),
    // Enable frameless mode if USE_FRAMELESS_UI is true.
    frame: USE_FRAMELESS_UI ? false : true,
    titleBarStyle: USE_FRAMELESS_UI ? 'hidden' : 'default',
    // Note: We use contextIsolation and disable nodeIntegration for security
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false // Disable webview for security unless explicitly needed
    }
  });

  if (!USE_FRAMELESS_UI) {
    // Load the remote URL. This is the core action that turns your app into a website wrapper.
    mainWindow.loadURL(getSiteUrl());

    // If the page fails to load (e.g., network offline or blocked), we show a simple offline page
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame) {
        mainWindow.loadFile(path.join(__dirname, 'offline.html'));
      }
    });
  } else {
    // Build the UI/browserviews: titlebar and content
    titlebarView = new BrowserView({ webPreferences: { preload: path.join(__dirname, 'ui-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    contentView = new BrowserView({ webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });

    mainWindow.addBrowserView(contentView);
    mainWindow.addBrowserView(titlebarView);

    const resizeViews = () => {
      const [width, height] = mainWindow.getSize();
      const isFullscreen = mainWindow.isFullScreen();
      const titlebarHeight = isFullscreen ? HOT_ZONE_HEIGHT : TITLEBAR_HEIGHT;
      titlebarView.setBounds({ x: 0, y: 0, width, height: titlebarHeight });
      const contentY = isFullscreen ? 0 : titlebarHeight;
      const contentHeight = isFullscreen ? height : height - titlebarHeight;
      contentView.setBounds({ x: 0, y: contentY, width, height: contentHeight });
      contentView.setAutoResize({ width: true, height: true });
    };
    mainWindow.on('resize', resizeViews);
    resizeViews();

    // Load the UI and content
    const uiUrl = `file://${path.join(__dirname, 'ui.html')}?hideTitle=1`;
    titlebarView.webContents.loadURL(uiUrl);
    titlebarView.webContents.on('did-finish-load', () => {
      try { titlebarView.webContents.send('site-switched', currentSiteKey); } catch (e) { }
      // Notify initial fullscreen state
      try { titlebarView.webContents.send('window-fullscreen-changed', mainWindow.isFullScreen()); } catch (e) { }
    });

    // Keep UI updated when this mainWindow changes full-screen
    mainWindow.on('enter-full-screen', () => {
      try { titlebarView?.webContents?.send('window-fullscreen-changed', true); } catch (e) { }
    });
    mainWindow.on('leave-full-screen', () => {
      try { titlebarView?.webContents?.send('window-fullscreen-changed', false); } catch (e) { }
    });
    contentView.webContents.loadURL(getSiteUrl());

    // Offline handling for content view
    contentView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame) {
        contentView.webContents.loadFile(path.join(__dirname, 'offline.html'));
      }
    });

    // Handle new windows => open externally
    contentView.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
    contentView.webContents.on('will-navigate', (event, url) => {
      const allowedOrigin = new URL(getSiteUrl()).origin;
      if (new URL(url).origin !== allowedOrigin) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // Block title updates
    contentView.webContents.on('page-title-updated', (event) => { event.preventDefault(); });
    contentView.webContents.on('did-finish-load', () => { try { mainWindow.setTitle(''); } catch (e) { } });
  }

  // When the site requests to open a new window, open it in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow browsers and safe links to open externally
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external origins inside the app; open them externally instead
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedOrigin = new URL(getSiteUrl()).origin;
    if (new URL(url).origin !== allowedOrigin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Optional: Maximize the window on launch
  // mainWindow.maximize();

  // Minimal View menu only (Reload / Toggle DevTools / Fullscreen)
  const template = [
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => {
            if (USE_FRAMELESS_UI && contentView) contentView.webContents.toggleDevTools();
            else if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  try {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } catch (e) {
    // Fallback: hide app menu
    try { Menu.setApplicationMenu(null); } catch (err) { }
  }
  // Keep the menu bar hidden by default in Windows (Alt will show it)
  mainWindow.setMenuBarVisibility(false);

  // Prevent the page from updating the window title (hides the remote page title)
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // When the page finishes loading ensure the title remains empty (works for initial and retry loads)
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      mainWindow.setTitle('');
    } catch (e) {
      // Ignore if the window is already destroyed
    }
  });
}

// Retry handler from the offline page (via preload/electronAPI.retry)
ipcMain.on('retry-load', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (USE_FRAMELESS_UI && contentView) contentView.webContents.loadURL(getSiteUrl());
    else mainWindow.loadURL(getSiteUrl());
  }
});

// Switch site request from the titlebar UI
ipcMain.on('switch-site', (event, siteKey) => {
  changeSite(siteKey);
});

ipcMain.on('open-site-menu', (event) => {
  // Build native menu and show it near the top-left of the app window
  const menu = Menu.buildFromTemplate([
    { label: 'Example.edu', type: 'radio', checked: currentSiteKey === 'support', click: () => changeSite('support') },
    { label: 'Example.net', type: 'radio', checked: currentSiteKey === 'broadcom', click: () => changeSite('broadcom') },
    { label: 'UAT (example.edu)', type: 'radio', checked: currentSiteKey === 'uat', click: () => changeSite('uat') }
  ]);
  try {
    const bounds = mainWindow.getBounds();
    const x = bounds.x + 8;
    const y = bounds.y + 34;
    menu.popup({ window: mainWindow, x, y });
  } catch (e) {
    try { menu.popup({ window: mainWindow }); } catch (err) { }
  }
});

// Respond to fullscreen toggle requests from the UI
ipcMain.on('window-toggle-fullscreen', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const newFs = !mainWindow.isFullScreen();
  try { mainWindow.setFullScreen(newFs); } catch (e) { }
  // Notify titlebar UI if present
  try { titlebarView?.webContents?.send('window-fullscreen-changed', newFs); } catch (e) { }
});

// Window control handlers (from UI titlebar)
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});
ipcMain.on('window-toggle-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});
ipcMain.on('window-toggle-devtools', () => {
  if (USE_FRAMELESS_UI && contentView) contentView.webContents.toggleDevTools();
  else if (mainWindow) mainWindow.webContents.toggleDevTools();
});

// The application menu has been removed to simplify the UI. If you need a menu again,
// create a template and call `Menu.setApplicationMenu(menu)` in `createWindow()`.


// When Electron is ready, create the window
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // Re-create a window if the app is activated and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
// Note: We removed the setupApplicationMenu function and menu template to simplify the UI.