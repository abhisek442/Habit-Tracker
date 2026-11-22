const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Some PCs show a blank window when the graphics driver misbehaves.
// Run Habits with --safe, or let the app switch this on by itself after a graphics crash.
const flag = path.join(app.getPath('userData'), 'safe-graphics');
if (process.argv.includes('--safe') || fs.existsSync(flag)) app.disableHardwareAcceleration();

function page(html) { return 'data:text/html;charset=utf-8,' + encodeURIComponent(html); }

function createWindow() {
  const win = new BrowserWindow({
    width: 1240, height: 820, minWidth: 900, minHeight: 620,
    backgroundColor: '#eef2fb', title: 'Habits', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, spellcheck: false }
  });
  Menu.setApplicationMenu(null);

  // If the app file cannot be loaded, show why instead of a blank window.
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (!isMain) return;
    win.loadURL(page('<body style="font-family:Segoe UI,sans-serif;padding:40px"><h2>Habits could not start</h2><p>' +
      desc + ' (' + code + ')</p><p style="color:#666;word-break:break-all">' + url + '</p></body>'));
  });
  win.webContents.on('render-process-gone', () => win.reload());

  // Ctrl+Shift+I opens the developer tools, F5 reloads.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
    if (input.key === 'F5') win.reload();
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.on('child-process-gone', (e, details) => {
  if (details.type === 'GPU' && !fs.existsSync(flag)) {
    try { fs.writeFileSync(flag, '1'); } catch (x) {}
    app.relaunch(); app.exit(0);
  }
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(() => { app.setAppUserModelId('com.abhisek442.habits'); createWindow(); });
  app.on('window-all-closed', () => app.quit());
}
