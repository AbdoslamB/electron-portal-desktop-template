<p align="right">
<a href="https://github.com/AbdoslamB/electron-portal-desktop-template/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/static/v1?label=license&message=MIT&color=d08aff" alt="License"></a>
</p>

# Example Portal Desktop Template

An Electron-based desktop application template focused on simplicity and rapid prototyping. It embeds a remote experience inside a frameless window, giving you a ready-to-extend foundation for your own Electron projects.

## Why this template?
- **Fast customization:** Change the default sites by editing the `SITE_URLS` map in `main.js`. By default it loads `https://example.edu/`, `https://example.net/`, and `https://uat.example.edu/` and exposes a menu + keyboard shortcut to switch between them.
- **Modern defaults:** `contextIsolation`, `sandbox`, and `nodeIntegration: false` are already configured. A minimal offline page and external link handling are included.
- **Production-ready structure:** Separate BrowserViews for the titlebar UI (`ui.html`) and the remote content make it easy to adapt the chrome, add branding, or integrate more controls.

## Quick start
1. Install dependencies (first time only)
   ```powershell
   npm install
   ```
2. Run the app in development
   ```powershell
   npm start
   ```
3. Customize the embedded sites
   - Open `main.js`
   - Update the `SITE_URLS` object with your own endpoints
   - (Optional) adjust menu labels or titlebar text in `ui.html`

## Building a distributable
```powershell
npm run dist
```

This uses `electron-builder` to create both a portable `win-unpacked` folder and an installer. Replace `build/icon.ico` with your branding before distributing.

## Extending the UI
- Titlebar buttons (minimize/maximize/fullscreen/close) live in `ui.html` and communicate with the main process via `ui-preload.js`.
- The fullscreen overlay is triggered by a top-edge hot zone so users can exit fullscreen without losing screen real estate.
- You can tweak hover height, hide delays, and branding chips directly in `ui.html`.

## License
This repository is distributed under the [MIT License](LICENSE). See the `LICENSE` file for the full text.

---

Use this template as a starting point: fork it, change the URLs, restyle the titlebar, and layer in your own preload APIs or native integrations as needed.

