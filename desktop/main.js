const { app, BrowserWindow, Menu, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// The app is served to itself from memory (app://habits/...), so it does not depend on
// Windows allowing file:// pages. This also gives the app a stable place to keep your data.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const WWW = path.join(__dirname, 'www');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.css': 'text/css', '.ico': 'image/x-icon' };

function serve() {
  protocol.handle('app', async (request) => {
    try {
      let p = decodeURIComponent(new URL(request.url).pathname);
      if (p === '/' || p === '') p = '/index.html';
      const file = path.normalize(path.join(WWW, p));
      if (!file.startsWith(WWW)) return new Response('Forbidden', { status: 403 });
      const data = await fs.promises.readFile(file);
      return new Response(data, { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
    } catch (e) {
      return new Response('Could not read ' + request.url + '\n' + e.message,
        { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
  });
}

// Some PCs show a blank window when the graphics driver misbehaves.
// Run Habits with --safe, or let the app switch this on by itself after a graphics crash.
const flag = path.join(app.getPath('userData'), 'safe-graphics');
if (process.argv.includes('--safe') || fs.existsSync(flag)) app.disableHardwareAcceleration();

function page(html) { return 'data:text/html;charset=utf-8,' + encodeURIComponent(html); }
function errorPage(title, lines) {
  return page('<body style="font-family:Segoe UI,sans-serif;padding:40px"><h2>' + title + '</h2>' +
    lines.map(l => '<p style="color:#444;word-break:break-all">' + String(l).replace(/</g, '&lt;') + '</p>').join('') + '</body>');
}

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

  // If the page cannot be loaded or crashes, show why instead of a blank window.
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (!isMain || url.startsWith('data:')) return;
    let info;
    try { info = 'Folder contents: ' + fs.readdirSync(WWW).join(', '); } catch (x) { info = 'Folder not readable: ' + x.message; }
    win.loadURL(errorPage('Habits could not start', [desc + ' (' + code + ')', url,
      'index.html exists: ' + fs.existsSync(path.join(WWW, 'index.html')), info, 'Electron ' + process.versions.electron]));
  });
  win.webContents.on('render-process-gone', (e, d) => {
    win.loadURL(errorPage('Habits stopped working', ['Reason: ' + d.reason + ' (exit code ' + d.exitCode + ')',
      'Try running Habits with --safe, or press F5 to reload.']));
  });

  // Ctrl+Shift+I opens the developer tools, F5 reloads the app.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
    if (input.key === 'F5') win.loadURL('app://habits/index.html');
  });

  win.loadURL('app://habits/index.html');
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
  app.whenReady().then(() => {
    app.setAppUserModelId('com.abhisek442.habits');
    serve(); ensureShortcuts(); createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
