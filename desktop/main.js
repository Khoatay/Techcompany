// ChillSpace cho máy tính (Windows) — mở bản web ChillSpace trong cửa sổ riêng, tự cập nhật theo web.
// Thêm: phát nhạc không cần bấm trước, nhớ kích thước cửa sổ, và "Ứng dụng của tôi" (mở chương trình / trang web từ từng không gian).
const { app, BrowserWindow, shell, ipcMain, dialog, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const APP_URL = process.env.CHILLSPACE_URL || 'https://khoatay.github.io/Techcompany/chillspace/'; // biến môi trường chỉ để thử
const APP_ORIGIN = new URL(APP_URL).origin;
const APP_PATH = new URL(APP_URL).pathname;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // nhạc / âm thanh nền phát ngay
if (!app.requestSingleInstanceLock()) app.quit();

const dataFile = (n) => path.join(app.getPath('userData'), n);
const readJson = (n, d) => { try { return JSON.parse(fs.readFileSync(dataFile(n), 'utf8')); } catch (e) { return d; } };
const writeJson = (n, v) => { try { fs.writeFileSync(dataFile(n), JSON.stringify(v, null, 1)); } catch (e) {} };
const isOurs = (u) => { try { const x = new URL(u); return x.origin === APP_ORIGIN && x.pathname.startsWith(APP_PATH); } catch (e) { return false; } };
const isHttp = (u) => { try { return /^https?:$/.test(new URL(u).protocol); } catch (e) { return false; } };

let win = null;
function createWindow() {
  const st = readJson('window.json', { width: 1400, height: 860, maximized: true });
  win = new BrowserWindow({
    width: st.width, height: st.height, x: st.x, y: st.y, minWidth: 720, minHeight: 480,
    backgroundColor: '#0d0f17', title: 'ChillSpace', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false },
  });
  Menu.setApplicationMenu(null);
  if (st.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  const save = () => { if (!win || win.isDestroyed()) return; const b = win.getNormalBounds(); writeJson('window.json', { ...b, maximized: win.isMaximized() }); };
  win.on('close', save);

  win.loadURL(APP_URL);
  // mất mạng lần đầu (chưa có bản lưu) → trang báo, có nút thử lại
  win.webContents.on('did-fail-load', (_e, code, _d, url, isMain) => { if (isMain && code !== -3 && isOurs(url)) win.loadFile(path.join(__dirname, 'offline.html')); });

  // chỉ trang ChillSpace chạy trong cửa sổ chính; link khác mở bằng trình duyệt
  win.webContents.on('will-navigate', (e, url) => { if (!isOurs(url) && !url.startsWith('file:')) { e.preventDefault(); if (isHttp(url)) shell.openExternal(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (isHttp(url)) shell.openExternal(url); return { action: 'deny' }; });

  // phím tắt: F5 / Ctrl+R tải lại, Ctrl+Shift+R tải lại sạch, F11 toàn màn hình
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F5' || (i.control && i.key.toLowerCase() === 'r')) { e.preventDefault(); i.shift ? win.webContents.reloadIgnoringCache() : win.webContents.reload(); }
    else if (i.key === 'F11') { e.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
  });
}

/* ---------- Ứng dụng của tôi ----------
   Chỉ mở được chương trình chính tay người dùng chọn qua hộp thoại (danh sách lưu trong máy), trang web phải là http(s). */
const appsFile = 'apps.json';
const loadApps = () => readJson(appsFile, []);
async function withIcon(a) {
  try { const img = await app.getFileIcon(a.path, { size: 'large' }); return { ...a, icon: img.isEmpty() ? '' : img.toDataURL() }; } catch (e) { return { ...a, icon: '' }; }
}
ipcMain.handle('apps:list', async () => Promise.all(loadApps().map(withIcon)));
ipcMain.handle('apps:pick', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn chương trình để thêm vào ChillSpace', properties: ['openFile'],
    filters: [{ name: 'Chương trình', extensions: ['exe', 'lnk', 'url', 'appref-ms'] }, { name: 'Tất cả', extensions: ['*'] }],
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = r.filePaths[0], list = loadApps();
  let a = list.find((x) => x.path === p);
  if (!a) { a = { id: crypto.randomBytes(6).toString('hex'), name: path.basename(p).replace(/\.(exe|lnk|url|appref-ms)$/i, ''), path: p }; list.push(a); writeJson(appsFile, list); }
  return withIcon(a);
});
ipcMain.handle('apps:open', async (_e, id) => {
  const a = loadApps().find((x) => x.id === id); if (!a) return 'Không tìm thấy chương trình';
  return shell.openPath(a.path); // '' = mở được
});
ipcMain.handle('apps:rename', async (_e, id, name) => { const list = loadApps(); const a = list.find((x) => x.id === id); if (a) { a.name = String(name || '').slice(0, 40) || a.name; writeJson(appsFile, list); } return true; });
ipcMain.handle('apps:remove', async (_e, id) => { writeJson(appsFile, loadApps().filter((x) => x.id !== id)); return true; });

// trang web (Notion, TradingView…) mở trong cửa sổ riêng của ChillSpace, giữ đăng nhập
const webWins = {};
ipcMain.handle('web:open', async (_e, url, title) => {
  if (!isHttp(url)) return false;
  const key = new URL(url).origin;
  const w0 = webWins[key];
  if (w0 && !w0.isDestroyed()) { w0.loadURL(url); w0.show(); w0.focus(); return true; }
  const w = new BrowserWindow({ width: 1280, height: 820, backgroundColor: '#ffffff', title: title || 'ChillSpace', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'), webPreferences: { partition: 'persist:apps', contextIsolation: true, sandbox: true } });
  w.webContents.setWindowOpenHandler(({ url: u }) => { if (isHttp(u)) w.loadURL(u); return { action: 'deny' }; });
  w.loadURL(url); webWins[key] = w;
  return true;
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  app.setAppUserModelId('app.chillspace.desktop');
  createWindow();
});
app.on('window-all-closed', () => app.quit());
