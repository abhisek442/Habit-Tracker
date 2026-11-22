const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Some PCs show a blank window when the graphics driver misbehaves.
// Run Habits with --safe, or let the app switch this on by itself after a graphics crash.
const flag = path.join(app.getPath('userData'), 'safe-graphics');
if (process.argv.includes('--safe') || fs.existsSync(flag)) app.disableHardwareAcceleration();

function page(html) { return 'data:text/html;charset=utf-8,' + encodeURIComponent(html); }


// Creates Desktop and Start menu shortcuts the first time the installed app runs,
// even if the installer did not make them. It only does this once.
function ensureShortcuts() {
  if (process.platform !== 'win32' || !app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE) return;
  const marker = path.join(app.getPath('userData'), 'shortcuts-created');
  if (fs.existsSync(marker)) return;
  const opts = { target: process.execPath, cwd: path.dirname(process.execPath), description: 'Habits',
    icon: process.execPath, iconIndex: 0, appUserModelId: 'com.abhisek442.habits' };
  const places = [
    path.join(app.getPath('desktop'), 'Habits.lnk'),
    path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Habits.lnk')
  ];
  let ok = false;
  for (const p of places) {
    try { ok = (fs.existsSync(p) ? true : shell.writeShortcutLink(p, 'create', opts)) || ok; } catch (e) {}
  }
  if (ok) { try { fs.mkdirSync(path.dirname(marker), { recursive: true }); fs.writeFileSync(marker, '1'); } catch (e) {} }
}

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
    if (!isMain || url.startsWith('data:')) return;
    const www = path.join(__dirname, 'www');
    let info;
    try { info = 'Folder contents: ' + fs.readdirSync(www).join(', '); } catch (x) { info = 'Folder not readable: ' + x.message; }
    win.loadURL(page('<body style="font-family:Segoe UI,sans-serif;padding:40px"><h2>Habits could not start</h2><p>' +
      desc + ' (' + code + ')</p><p style="color:#666;word-break:break-all">' + url + '</p><p style="color:#666;word-break:break-all">index.html exists: ' +
      fs.existsSync(path.join(www, 'index.html')) + '<br>' + info + '</p></body>'));
  });
  win.webContents.on('render-process-gone', () => win.reload());

  // Ctrl+Shift+I opens the developer tools, F5 reloads.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
    if (input.key === 'F5') win.reload();
  });

  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.on('child-process-gone', (e, details) => {
  if (details.type === 'GPU' && !fs.existsSync(flag)) {
    try { fs.mkdirSync(path.dirname(flag), { recursive: true }); fs.writeFileSync(flag, '1'); } catch (x) {}
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
  app.whenReady().then(() => { app.setAppUserModelId('com.abhisek442.habits'); ensureShortcuts(); createWindow(); });
  app.on('window-all-closed', () => app.quit());
}
