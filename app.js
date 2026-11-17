'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const stamp = (d = new Date()) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const tick = () => new Promise((r) => setTimeout(r, 30));

const DEFAULTS = {
  brand: '', phone: '', address: '', note: '', logo: '',
  position: 'bl', size: 'm', accent: '#f5a524',
  showTime: true, showGPS: false,
  autoDownloadPdf: true, autoDownloadPhoto: false,
};
function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('cq-settings') || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

const state = {
  mode: 'photo',
  facing: 'environment',
  stream: null,
  settings: loadSettings(),
  logoImg: null,
  gps: null,
  gpsWatch: null,
  pages: [],          // [{ blob, width, height, thumb }]
  dirHandle: null,
  busy: false,
};

function saveSettings() {
  try { localStorage.setItem('cq-settings', JSON.stringify(state.settings)); }
  catch { toast('Không lưu được cài đặt'); }
}

/* ---------- IndexedDB ---------- */
const DB = (() => {
  let p;
  const open = () => p || (p = new Promise((res, rej) => {
    const r = indexedDB.open('chup-quet', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('files', { keyPath: 'id' });
      r.result.createObjectStore('kv');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (store, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  };
  return {
    put: (rec) => run('files', 'readwrite', (s) => s.put(rec)),
    del: (id) => run('files', 'readwrite', (s) => s.delete(id)),
    all: () => run('files', 'readonly', (s) => s.getAll()),
    kvGet: (k) => run('kv', 'readonly', (s) => s.get(k)),
    kvSet: (k, v) => run('kv', 'readwrite', (s) => s.put(v, k)),
    kvDel: (k) => run('kv', 'readwrite', (s) => s.delete(k)),
  };
})();

/* ---------- UI bits ---------- */
let toastTimer;
function toast(msg, actLabel, act, ms = 3500) {
  const t = $('#toast'), b = $('#toastAct');
  $('#toastMsg').textContent = msg;
  b.hidden = !actLabel;
  b.textContent = actLabel || '';
  b.onclick = () => { t.hidden = true; act && act(); };
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), actLabel ? Math.max(ms, 6000) : ms);
}
function busy(on, msg) {
  state.busy = on;
  $('#busy').hidden = !on;
  if (msg) $('#busyMsg').textContent = msg;
  $('#shutter').disabled = on;
}
let openSheetEl = null;
function openSheet(el) {
  closeSheet();
  $('#toast').hidden = true;
  openSheetEl = el;
  $('#backdrop').hidden = false;
  el.hidden = false;
}
function closeSheet() {
  if (!openSheetEl) return;
  openSheetEl.hidden = true;
  openSheetEl = null;
  $('#backdrop').hidden = true;
}
$('#backdrop').onclick = closeSheet;
$$('.sheet .close').forEach((b) => (b.onclick = closeSheet));

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
function canvasToBlob(c, type = 'image/jpeg', q = 0.9) {
  return new Promise((res) => c.toBlob(res, type, q));
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function thumbOf(src, max = 320) {
  const k = Math.min(1, max / Math.max(src.width, src.height));
  const c = makeCanvas(Math.round(src.width * k), Math.round(src.height * k));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.75);
}
async function fileToCanvas(file, maxSide = 4096) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = makeCanvas(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- Camera ---------- */
const video = $('#video');
const preview = $('#preview');
const pctx = preview.getContext('2d');

function stopCamera() {
  if (state.stream) state.stream.getTracks().forEach((t) => t.stop());
  state.stream = null;
}
async function startCamera() {
  stopCamera();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#noCam').hidden = false; return; }
  try {
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: state.facing }, width: { ideal: 2560 }, height: { ideal: 1440 } },
      });
    } catch (e) {
      if (e.name === 'NotAllowedError') throw e;
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    }
    video.srcObject = state.stream;
    await video.play().catch(() => {});
    $('#noCam').hidden = true;
  } catch (e) {
    console.warn(e);
    $('#noCam').hidden = false;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopCamera();
  else if ($('#cropView').hidden && $('#filterView').hidden) startCamera();
});

function previewLoop() {
  if (state.stream && video.readyState >= 2 && video.videoWidth) {
    const vw = video.videoWidth, vh = video.videoHeight;
    const k = Math.min(1, 1440 / Math.max(vw, vh));
    const w = Math.round(vw * k), h = Math.round(vh * k);
    if (preview.width !== w || preview.height !== h) { preview.width = w; preview.height = h; }
    pctx.drawImage(video, 0, 0, w, h);
    if (state.mode === 'photo') drawStamp(pctx, w, h, new Date());
  }
  requestAnimationFrame(previewLoop);
}

function grabFrame() {
  const c = makeCanvas(video.videoWidth, video.videoHeight);
  c.getContext('2d').drawImage(video, 0, 0);
  return c;
}
function flash() {
  const f = $('#flash');
  f.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
}

/* ---------- GPS ---------- */
function setGps(on) {
  state.settings.showGPS = on;
  saveSettings();
  $('#btnGps').classList.toggle('on', on);
  if (state.gpsWatch != null) { navigator.geolocation.clearWatch(state.gpsWatch); state.gpsWatch = null; }
  if (!on) { state.gps = null; return; }
  if (!('geolocation' in navigator)) { toast('Máy không hỗ trợ GPS'); return; }
  state.gpsWatch = navigator.geolocation.watchPosition(
    (p) => (state.gps = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
    (e) => { toast('Không lấy được vị trí: hãy cho phép quyền vị trí'); console.warn(e); },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
}

/* ---------- Brand stamp ---------- */
function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !line) line = t;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  // hard-cut very long single words
  return lines.flatMap((l) => {
    if (ctx.measureText(l).width <= maxW) return [l];
    const out = []; let cur = '';
    for (const ch of l) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStamp(ctx, W, H, now) {
  const s = state.settings;
  const k = { s: 0.78, m: 1, l: 1.3 }[s.size] || 1;
  const u = (Math.min(W, H) / 100) * k;
  const margin = Math.min(W, H) * 0.03;
  const padX = 2.4 * u, padY = 2 * u, bar = 0.8 * u;
  const maxTextW = Math.min(W - 2 * margin - 2 * padX - bar, 72 * u);
  const font = (px, wt = 500) => `${wt} ${px}px ${FONT}`;
  const accent = s.accent || '#f5a524';

  const brand = (s.brand || '').trim();
  const logo = state.logoImg;
  const blocks = []; // { h, w, draw(x,y) }

  // header: logo + brand
  if (logo || brand) {
    const hH = 6.5 * u;
    let lw = 0, lh = 0;
    if (logo) {
      const r = logo.naturalWidth / logo.naturalHeight || 1;
      lh = hH; lw = lh * r;
      if (lw > 24 * u) { lw = 24 * u; lh = lw / r; }
    }
    ctx.font = font(3.6 * u, 700);
    const gap = logo && brand ? 1.6 * u : 0;
    let bText = brand;
    const room = maxTextW - lw - gap;
    if (brand && ctx.measureText(bText).width > room) {
      while (bText.length > 1 && ctx.measureText(bText + '…').width > room) bText = bText.slice(0, -1);
      bText += '…';
    }
    const bw = brand ? ctx.measureText(bText).width : 0;
    blocks.push({
      h: Math.max(lh, 4.4 * u), w: lw + gap + bw,
      draw(x, y) {
        const bh = this.h;
        if (logo) ctx.drawImage(logo, x, y + (bh - lh) / 2, lw, lh);
        if (brand) {
          ctx.font = font(3.6 * u, 700);
          ctx.fillStyle = '#fff';
          ctx.textBaseline = 'middle';
          ctx.fillText(bText, x + lw + gap, y + bh / 2);
        }
      },
    });
  }

  // time block
  if (s.showTime) {
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const wd = WEEKDAYS[now.getDay()];
    ctx.font = font(8 * u, 700);
    const tw = ctx.measureText(time).width;
    ctx.font = font(2.8 * u, 600);
    const dw = Math.max(ctx.measureText(date).width, ctx.measureText(wd).width);
    const sep = 2 * u;
    blocks.push({
      h: 8.4 * u, w: tw + sep * 2 + 0.4 * u + dw,
      draw(x, y) {
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#fff';
        ctx.font = font(8 * u, 700);
        ctx.fillText(time, x, y + 7.4 * u);
        ctx.fillStyle = accent;
        ctx.fillRect(x + tw + sep, y + 1.2 * u, 0.4 * u, 6.4 * u);
        ctx.fillStyle = '#fff';
        ctx.font = font(2.8 * u, 600);
        ctx.fillText(date, x + tw + sep * 2 + 0.4 * u, y + 3.8 * u);
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.fillText(wd, x + tw + sep * 2 + 0.4 * u, y + 7.3 * u);
      },
    });
  }

  // info lines
  const info = [];
  if (s.address) info.push(s.address);
  if (s.phone) info.push('ĐT: ' + s.phone);
  if (s.showGPS) {
    info.push(state.gps
      ? `GPS: ${state.gps.lat.toFixed(6)}, ${state.gps.lng.toFixed(6)} (±${Math.round(state.gps.acc)}m)`
      : 'GPS: đang lấy vị trí…');
  }
  if (s.note) info.push(s.note);
  if (info.length) {
    const fs = 2.7 * u, lh = fs * 1.38;
    ctx.font = font(fs, 500);
    const lines = info.flatMap((t) => wrapText(ctx, t, maxTextW));
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
    blocks.push({
      h: lines.length * lh, w,
      draw(x, y) {
        ctx.font = font(fs, 500);
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.textBaseline = 'middle';
        lines.forEach((l, i) => ctx.fillText(l, x, y + lh * i + lh / 2));
      },
    });
  }

  if (!blocks.length) return;
  const gapY = 1.4 * u;
  const contentW = Math.max(...blocks.map((b) => b.w));
  const contentH = blocks.reduce((a, b) => a + b.h, 0) + gapY * (blocks.length - 1);
  const pw = contentW + padX * 2 + bar, ph = contentH + padY * 2;
  const px = s.position[1] === 'r' ? W - margin - pw : margin;
  const py = s.position[0] === 'b' ? H - margin - ph : margin;

  ctx.save();
  roundRect(ctx, px, py, pw, ph, 1.6 * u);
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(px, py, bar, ph);
  let y = py + padY;
  for (const b of blocks) { b.draw(px + bar + padX, y); y += b.h + gapY; }
  ctx.restore();
}

/* ---------- File saving ---------- */
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

async function saveRecord(rec) {
  try { await DB.put(rec); }
  catch (e) { console.error(e); toast('Không lưu được vào Thư viện (bộ nhớ đầy?)'); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  await saveToFolder(rec);
  $('#lastThumb').src = rec.thumb;
  return rec;
}
function downloadRec(rec) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(rec.blob);
  a.download = rec.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
async function shareRec(rec) {
  const file = new File([rec.blob], rec.name, { type: rec.blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: rec.name }); return; }
    catch (e) { if (e.name === 'AbortError') return; console.warn(e); }
  }
  downloadRec(rec);
}

// Fixed folder via File System Access API (desktop Chrome/Edge; some Android browsers)
const fsSupported = 'showDirectoryPicker' in window;
async function saveToFolder(rec) {
  const h = state.dirHandle;
  if (!h) return;
  try {
    let perm = await h.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await h.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;
    const sub = await h.getDirectoryHandle(rec.type === 'pdf' ? 'TaiLieu' : 'HinhAnh', { create: true });
    const fh = await sub.getFileHandle(rec.name, { create: true });
    const w = await fh.createWritable();
    await w.write(rec.blob);
    await w.close();
  } catch (e) {
    console.warn(e);
    toast('Không ghi được vào thư mục đã chọn');
  }
}

/* ---------- Photo mode ---------- */
async function stampAndSave(canvas) {
  drawStamp(canvas.getContext('2d'), canvas.width, canvas.height, new Date());
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  const rec = await saveRecord({
    id: newId(), type: 'photo', name: `Anh_${stamp()}.jpg`, blob, size: blob.size,
    created: Date.now(), thumb: thumbOf(canvas),
  });
  if (state.settings.autoDownloadPhoto) { downloadRec(rec); toast('Đã lưu ảnh'); }
  else toast('Đã lưu vào Thư viện', 'Lưu vào máy', () => shareRec(rec));
}

/* ---------- Scan mode: crop ---------- */
const crop = { src: null, pts: null, k: 1 };
const cropCanvas = $('#cropCanvas');
const cropWrap = $('#cropWrap');
let handles = [];

function defaultPts(w, h, inset = 0.06) {
  return [
    { x: w * inset, y: h * inset }, { x: w * (1 - inset), y: h * inset },
    { x: w * (1 - inset), y: h * (1 - inset) }, { x: w * inset, y: h * (1 - inset) },
  ];
}
function openCrop(srcCanvas) {
  stopCamera();
  $('#toast').hidden = true;
  crop.src = srcCanvas;
  crop.pts = detectDocument(srcCanvas) || defaultPts(srcCanvas.width, srcCanvas.height);
  $('#cropView').hidden = false;
  requestAnimationFrame(layoutCrop);
}
function closeCropAndFilter() {
  $('#cropView').hidden = true;
  $('#filterView').hidden = true;
  startCamera();
}
function layoutCrop() {
  const area = $('#cropArea');
  const aw = area.clientWidth - 36, ah = area.clientHeight - 36;
  const { width: w, height: h } = crop.src;
  crop.k = Math.min(aw / w, ah / h);
  const dw = Math.round(w * crop.k), dh = Math.round(h * crop.k);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cropCanvas.width = dw * dpr; cropCanvas.height = dh * dpr;
  cropCanvas.style.width = dw + 'px'; cropCanvas.style.height = dh + 'px';
  cropWrap.style.width = dw + 'px'; cropWrap.style.height = dh + 'px';
  if (!handles.length) {
    handles = [0, 1, 2, 3].map((i) => {
      const el = document.createElement('div');
      el.className = 'handle';
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add('drag');
        const move = (ev) => {
          const r = cropWrap.getBoundingClientRect();
          const x = Math.max(0, Math.min(r.width, ev.clientX - r.left));
          const y = Math.max(0, Math.min(r.height, ev.clientY - r.top));
          crop.pts[i] = { x: x / crop.k, y: y / crop.k };
          drawCrop();
        };
        const up = () => {
          el.classList.remove('drag');
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
      cropWrap.appendChild(el);
      return el;
    });
  }
  drawCrop();
}
function drawCrop() {
  const ctx = cropCanvas.getContext('2d');
  const s = cropCanvas.width / crop.src.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(crop.src, 0, 0, cropCanvas.width, cropCanvas.height);
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath();
  ctx.rect(0, 0, cropCanvas.width, cropCanvas.height);
  crop.pts.forEach((p, i) => (i ? ctx.lineTo(p.x * s, p.y * s) : ctx.moveTo(p.x * s, p.y * s)));
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.strokeStyle = state.settings.accent || '#f5a524';
  ctx.lineWidth = 2.5 * (cropCanvas.width / parseFloat(cropCanvas.style.width));
  ctx.beginPath();
  crop.pts.forEach((p, i) => (i ? ctx.lineTo(p.x * s, p.y * s) : ctx.moveTo(p.x * s, p.y * s)));
  ctx.closePath();
  ctx.stroke();
  crop.pts.forEach((p, i) => {
    handles[i].style.left = p.x * crop.k + 'px';
    handles[i].style.top = p.y * crop.k + 'px';
  });
}
function rotateCanvas(src) {
  const c = makeCanvas(src.height, src.width);
  const ctx = c.getContext('2d');
  ctx.translate(c.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return c;
}

/* Rough automatic edge detection: find the bright paper region against a darker background. */
function detectDocument(src) {
  try {
    const S = 160;
    const k = S / Math.max(src.width, src.height);
    const w = Math.max(8, Math.round(src.width * k)), h = Math.max(8, Math.round(src.height * k));
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = new Float32Array(w * h);
    const hist = new Uint32Array(256);
    for (let i = 0; i < w * h; i++) {
      const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      g[i] = v; hist[v | 0]++;
    }
    // Otsu threshold
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sB = 0, wB = 0, best = 0, th = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = w * h - wB; if (!wF) break;
      sB += t * hist[t];
      const mB = sB / wB, mF = (sum - sB) / wF;
      const between = wB * wF * (mB - mF) ** 2;
      if (between > best) { best = between; th = t; }
    }
    // largest connected bright component
    const lab = new Int32Array(w * h).fill(-1);
    let bestCount = 0, bestId = -1, id = 0;
    const stack = [];
    for (let i = 0; i < w * h; i++) {
      if (g[i] <= th || lab[i] !== -1) continue;
      let cnt = 0; stack.push(i); lab[i] = id;
      while (stack.length) {
        const p = stack.pop(); cnt++;
        const x = p % w, y = (p / w) | 0;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
        for (const q of nb) if (q >= 0 && lab[q] === -1 && g[q] > th) { lab[q] = id; stack.push(q); }
      }
      if (cnt > bestCount) { bestCount = cnt; bestId = id; }
      id++;
    }
    const frac = bestCount / (w * h);
    if (frac < 0.12 || frac > 0.97) return null;
    // extreme points along diagonals
    let tl = null, tr = null, br = null, bl = null;
    let mTL = Infinity, mTR = -Infinity, mBR = -Infinity, mBL = -Infinity;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (lab[y * w + x] !== bestId) continue;
      if (x + y < mTL) { mTL = x + y; tl = { x, y }; }
      if (x - y > mTR) { mTR = x - y; tr = { x, y }; }
      if (x + y > mBR) { mBR = x + y; br = { x, y }; }
      if (y - x > mBL) { mBL = y - x; bl = { x, y }; }
    }
    const pts = [tl, tr, br, bl].map((p) => ({ x: (p.x + 0.5) / k, y: (p.y + 0.5) / k }));
    const area = Math.abs(pts.reduce((a, p, i) => {
      const q = pts[(i + 1) % 4]; return a + p.x * q.y - q.x * p.y;
    }, 0)) / 2;
    if (area < src.width * src.height * 0.12) return null;
    // if region touches nearly all borders, it's probably not a distinct page
    return pts;
  } catch (e) { console.warn(e); return null; }
}

/* ---------- Perspective warp ---------- */
function squareToQuad(p) {
  const [p0, p1, p2, p3] = p;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  return {
    a: p1.x - p0.x + g * p1.x, b: p3.x - p0.x + h * p3.x, c: p0.x,
    d: p1.y - p0.y + g * p1.y, e: p3.y - p0.y + h * p3.y, f: p0.y, g, h,
  };
}
function warp(src, pts) {
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let W = Math.max(dist(pts[0], pts[1]), dist(pts[3], pts[2]));
  let H = Math.max(dist(pts[0], pts[3]), dist(pts[1], pts[2]));
  const lim = 2600 / Math.max(W, H);
  if (lim < 1) { W *= lim; H *= lim; }
  W = Math.max(16, Math.round(W)); H = Math.max(16, Math.round(H));
  const sw = src.width, sh = src.height;
  const sd = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sw, sh).data;
  const out = makeCanvas(W, H);
  const octx = out.getContext('2d');
  const img = octx.createImageData(W, H);
  const o = img.data;
  const { a, b, c, d, e, f, g, h } = squareToQuad(pts);
  let i = 0;
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++, i += 4) {
      const u = (x + 0.5) / W;
      const den = g * u + h * v + 1;
      let sx = (a * u + b * v + c) / den - 0.5;
      let sy = (d * u + e * v + f) / den - 0.5;
      if (sx < 0) sx = 0; else if (sx > sw - 1) sx = sw - 1;
      if (sy < 0) sy = 0; else if (sy > sh - 1) sy = sh - 1;
      const x0 = sx | 0, y0 = sy | 0;
      const x1 = x0 < sw - 1 ? x0 + 1 : x0, y1 = y0 < sh - 1 ? y0 + 1 : y0;
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = sd[i00 + ch] + (sd[i10 + ch] - sd[i00 + ch]) * fx;
        const bot = sd[i01 + ch] + (sd[i11 + ch] - sd[i01 + ch]) * fx;
        o[i + ch] = top + (bot - top) * fy;
      }
      o[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/* ---------- Filters ---------- */
function backgroundOf(src) {
  // Estimate paper illumination: heavy down-scale then up-scale (cheap blur).
  const sw = Math.max(4, Math.round(src.width / 28)), sh = Math.max(4, Math.round(src.height / 28));
  const small = makeCanvas(sw, sh);
  const sctx = small.getContext('2d');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(src, 0, 0, sw, sh);
  // Max-filter to push text out of the background estimate
  const sdat = sctx.getImageData(0, 0, sw, sh);
  const s = sdat.data, m = new Uint8ClampedArray(s);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = (y * sw + x) * 4;
    for (let ch = 0; ch < 3; ch++) {
      let mx = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = Math.min(sw - 1, Math.max(0, x + dx)), yy = Math.min(sh - 1, Math.max(0, y + dy));
        mx = Math.max(mx, s[(yy * sw + xx) * 4 + ch]);
      }
      m[i + ch] = mx;
    }
  }
  sdat.data.set(m);
  sctx.putImageData(sdat, 0, 0);
  const big = makeCanvas(src.width, src.height);
  const bctx = big.getContext('2d', { willReadFrequently: true });
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, src.width, src.height);
  return bctx.getImageData(0, 0, src.width, src.height).data;
}
function applyFilter(src, mode) {
  const out = makeCanvas(src.width, src.height);
  const octx = out.getContext('2d');
  octx.drawImage(src, 0, 0);
  if (mode === 'original') return out;
  const img = octx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  if (mode === 'gray') {
    for (let i = 0; i < d.length; i += 4) {
      const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  } else {
    const bg = backgroundOf(src);
    for (let i = 0; i < d.length; i += 4) {
      if (mode === 'enhance') {
        for (let ch = 0; ch < 3; ch++) {
          let n = d[i + ch] / Math.max(bg[i + ch], 40);
          n = (n - 0.25) / 0.68;                      // stretch: paper → white, ink stays dark
          d[i + ch] = 255 * Math.min(1, Math.max(0, n)) ** 1.15;
        }
      } else { // bw
        const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const b = 0.299 * bg[i] + 0.587 * bg[i + 1] + 0.114 * bg[i + 2];
        let n = v / Math.max(b, 40);
        n = (n - 0.6) / 0.28;
        const o = 255 * Math.min(1, Math.max(0, n));
        d[i] = d[i + 1] = d[i + 2] = o;
      }
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/* ---------- Scan mode: filter view ---------- */
const filt = { warped: null, mode: 'enhance', result: null };
async function renderFilter() {
  busy(true, 'Đang xử lý ảnh…');
  await tick();
  try {
    filt.result = applyFilter(filt.warped, filt.mode);
    const fc = $('#filterCanvas');
    fc.width = filt.result.width; fc.height = filt.result.height;
    fc.getContext('2d').drawImage(filt.result, 0, 0);
  } finally { busy(false); }
}
async function addPage() {
  const c = filt.result;
  const blob = await canvasToBlob(c, 'image/jpeg', 0.85);
  state.pages.push({ blob, width: c.width, height: c.height, thumb: thumbOf(c, 360) });
  updateDocBtn();
}
function updateDocBtn() {
  const n = state.pages.length;
  $('#pageCount').textContent = n;
  $('#btnDoc').hidden = !(state.mode === 'scan' && n > 0);
}

/* ---------- Document sheet / PDF ---------- */
function openDoc() {
  if (!$('#pdfName').value) $('#pdfName').value = `TaiLieu_${stamp()}`;
  renderPages();
  openSheet($('#docSheet'));
}
function renderPages() {
  const list = $('#pageList');
  list.innerHTML = '';
  state.pages.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'pageItem';
    el.innerHTML = `<img alt=""><span class="num">${i + 1}</span><button class="del" aria-label="Xóa trang">×</button>`;
    el.querySelector('img').src = p.thumb;
    el.querySelector('.del').onclick = () => {
      state.pages.splice(i, 1);
      updateDocBtn();
      if (!state.pages.length) closeSheet(); else renderPages();
    };
    list.appendChild(el);
  });
}
async function makePdf() {
  if (!state.pages.length) return;
  busy(true, 'Đang tạo PDF…');
  try {
    const pages = await Promise.all(state.pages.map(async (p) => ({
      jpeg: new Uint8Array(await p.blob.arrayBuffer()), width: p.width, height: p.height,
    })));
    const blob = buildPdf(pages);
    let name = ($('#pdfName').value || `TaiLieu_${stamp()}`).trim().replace(/[\\/:*?"<>|]+/g, '-');
    if (!/\.pdf$/i.test(name)) name += '.pdf';
    const firstThumb = state.pages[0].thumb;
    const rec = await saveRecord({
      id: newId(), type: 'pdf', name, blob, size: blob.size, pages: pages.length,
      created: Date.now(), thumb: firstThumb,
    });
    state.pages = [];
    $('#pdfName').value = '';
    updateDocBtn();
    closeSheet();
    if (state.settings.autoDownloadPdf) downloadRec(rec);
    toast(`Đã tạo PDF (${rec.pages} trang)`, 'Chia sẻ', () => shareRec(rec));
  } catch (e) {
    console.error(e);
    toast('Lỗi khi tạo PDF');
  } finally { busy(false); }
}

/* ---------- Library ---------- */
let libFilter = 'all';
async function openLibrary() {
  openSheet($('#librarySheet'));
  await renderLibrary();
}
async function renderLibrary() {
  const grid = $('#libGrid');
  let items = [];
  try { items = await DB.all(); } catch (e) { console.error(e); }
  items.sort((a, b) => b.created - a.created);
  if (libFilter !== 'all') items = items.filter((x) => x.type === libFilter);
  grid.innerHTML = '';
  $('#libEmpty').hidden = items.length > 0;
  for (const rec of items) {
    const b = document.createElement('button');
    b.className = 'libItem';
    const d = new Date(rec.created);
    b.innerHTML = `<img alt=""><span class="tag ${rec.type}">${rec.type === 'pdf' ? 'PDF' : 'ẢNH'}</span>
      <span class="cap"></span>`;
    b.querySelector('img').src = rec.thumb;
    b.querySelector('.cap').textContent = rec.type === 'pdf'
      ? `${rec.name} · ${rec.pages || '?'} tr`
      : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    b.onclick = () => openViewer(rec);
    grid.appendChild(b);
  }
}
let viewerRec = null, viewerUrl = null;
function openViewer(rec) {
  viewerRec = rec;
  if (rec.type === 'pdf') {
    // PDFs open in the system viewer
    const url = URL.createObjectURL(rec.blob);
    const w = window.open(url, '_blank');
    if (!w) shareRec(rec);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    toast(rec.name, 'Xóa', () => deleteRec(rec));
    return;
  }
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(rec.blob);
  $('#viewerImg').src = viewerUrl;
  $('#viewerName').textContent = rec.name;
  $('#viewer').hidden = false;
}
async function deleteRec(rec) {
  if (!confirm(`Xóa "${rec.name}"?`)) return;
  await DB.del(rec.id);
  $('#viewer').hidden = true;
  await refreshLastThumb();
  if (!$('#librarySheet').hidden) renderLibrary();
}
async function refreshLastThumb() {
  try {
    const all = await DB.all();
    all.sort((a, b) => b.created - a.created);
    $('#lastThumb').src = all[0] ? all[0].thumb : '';
  } catch { /* ignore */ }
}

/* ---------- Settings ---------- */
function renderSettings() {
  const s = state.settings;
  $$('#settingsSheet input[data-k]').forEach((el) => {
    if (el.type === 'checkbox') el.checked = !!s[el.dataset.k];
    else el.value = s[el.dataset.k] || '';
  });
  $$('#settingsSheet [data-k] > button[data-v]').forEach((b) => {
    b.classList.toggle('active', s[b.parentElement.dataset.k] === b.dataset.v);
  });
  $('#logoPreview').hidden = !s.logo;
  if (s.logo) $('#logoPreview').src = s.logo;
  $('#logoClear').hidden = !s.logo;
  $('#folderBox').hidden = !fsSupported;
  $('#folderName').textContent = state.dirHandle ? state.dirHandle.name : 'Chưa chọn';
  $('#folderClear').hidden = !state.dirHandle;
  document.documentElement.style.setProperty('--accent', s.accent);
  $('#btnGps').classList.toggle('on', !!s.showGPS);
  drawSettingsPreview();
}
function drawSettingsPreview() {
  const c = $('#stampPreview');
  if (c.offsetParent === null && !openSheetEl) return;
  const w = 1200, h = 900;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#6b8fa8'); g.addColorStop(0.55, '#a7b59a'); g.addColorStop(1, '#5b5145');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let i = 0; i < 6; i++) ctx.fillRect(120 + i * 170, 260 - i * 18, 110, 520 + i * 18);
  drawStamp(ctx, w, h, new Date());
}
function bindSettings() {
  $$('#settingsSheet input[data-k]').forEach((el) => {
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      const k = el.dataset.k;
      if (k === 'showGPS') { setGps(el.checked); drawSettingsPreview(); return; }
      state.settings[k] = el.type === 'checkbox' ? el.checked : el.value;
      saveSettings();
      drawSettingsPreview();
    });
  });
  $$('#settingsSheet [data-k] > button[data-v]').forEach((b) => {
    b.addEventListener('click', () => {
      state.settings[b.parentElement.dataset.k] = b.dataset.v;
      saveSettings();
      renderSettings();
    });
  });
  $('#logoPick').onclick = () => $('#logoInput').click();
  $('#logoInput').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const c = await fileToCanvas(f, 600);
      state.settings.logo = c.toDataURL('image/png');
      saveSettings();
      state.logoImg = await loadImage(state.settings.logo);
      renderSettings();
    } catch { toast('Không đọc được file logo'); }
  };
  $('#logoClear').onclick = () => {
    state.settings.logo = '';
    state.logoImg = null;
    saveSettings();
    renderSettings();
  };
  $('#folderPick').onclick = async () => {
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      state.dirHandle = h;
      await DB.kvSet('dir', h);
      renderSettings();
      toast(`Sẽ tự lưu vào thư mục "${h.name}"`);
    } catch (e) { if (e.name !== 'AbortError') toast('Không chọn được thư mục'); }
  };
  $('#folderClear').onclick = async () => {
    state.dirHandle = null;
    await DB.kvDel('dir').catch(() => {});
    renderSettings();
  };
}

/* ---------- Mode / main controls ---------- */
function setMode(m) {
  state.mode = m;
  $$('.modes button').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
  $('#scanGuide').hidden = m !== 'scan';
  $('#shutter').classList.toggle('scan', m === 'scan');
  updateDocBtn();
}

async function onShutter() {
  if (state.busy) return;
  if (!state.stream || !video.videoWidth) { $('#fileInput').click(); return; }
  flash();
  const frame = grabFrame();
  if (state.mode === 'photo') {
    busy(true, 'Đang lưu ảnh…');
    try { await stampAndSave(frame); } finally { busy(false); }
  } else {
    openCrop(frame);
  }
}

async function onImport(e) {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  busy(true, 'Đang mở ảnh…');
  try {
    const c = await fileToCanvas(f);
    busy(false);
    if (state.mode === 'photo') {
      busy(true, 'Đang lưu ảnh…');
      await stampAndSave(c);
    } else openCrop(c);
  } catch (err) {
    console.error(err);
    toast('Không mở được ảnh này');
  } finally { busy(false); }
}

function bindMain() {
  $$('.modes button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
  $('#shutter').onclick = onShutter;
  $('#btnFlip').onclick = () => {
    state.facing = state.facing === 'environment' ? 'user' : 'environment';
    startCamera();
  };
  $('#btnGps').onclick = () => setGps(!state.settings.showGPS);
  $('#btnSettings').onclick = () => { openSheet($('#settingsSheet')); renderSettings(); };
  $('#btnLibrary').onclick = openLibrary;
  $('#btnImport').onclick = () => $('#fileInput').click();
  $('#importAlt').onclick = () => $('#fileInput').click();
  $('#retryCam').onclick = startCamera;
  $('#fileInput').onchange = onImport;
  $('#btnDoc').onclick = openDoc;

  $('#libFilter').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    libFilter = b.dataset.v;
    $$('#libFilter button').forEach((x) => x.classList.toggle('active', x === b));
    renderLibrary();
  });

  // crop
  $('#cropCancel').onclick = closeCropAndFilter;
  $('#cropRotate').onclick = () => {
    crop.src = rotateCanvas(crop.src);
    crop.pts = detectDocument(crop.src) || defaultPts(crop.src.width, crop.src.height);
    layoutCrop();
  };
  $('#cropReset').onclick = () => { crop.pts = defaultPts(crop.src.width, crop.src.height, 0); drawCrop(); };
  $('#cropApply').onclick = async () => {
    busy(true, 'Đang làm phẳng giấy…');
    await tick();
    try { filt.warped = warp(crop.src, crop.pts); }
    finally { busy(false); }
    $('#cropView').hidden = true;
    $('#filterView').hidden = false;
    renderFilter();
  };
  window.addEventListener('resize', () => { if (!$('#cropView').hidden) layoutCrop(); });

  // filter
  $('#filterChips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]');
    if (!b) return;
    filt.mode = b.dataset.f;
    $$('#filterChips button').forEach((x) => x.classList.toggle('active', x === b));
    renderFilter();
  });
  $('#filterBack').onclick = () => { $('#filterView').hidden = true; $('#cropView').hidden = false; layoutCrop(); };
  $('#filterAddMore').onclick = async () => {
    await addPage();
    closeCropAndFilter();
    toast(`Đã thêm trang ${state.pages.length}. Chụp trang tiếp theo.`);
  };
  $('#filterDone').onclick = async () => {
    await addPage();
    closeCropAndFilter();
    openDoc();
  };

  // doc
  $('#docMake').onclick = makePdf;
  $('#docDiscard').onclick = () => {
    if (!confirm('Bỏ toàn bộ các trang đang quét?')) return;
    state.pages = [];
    updateDocBtn();
    closeSheet();
  };

  // viewer
  $('#viewerClose').onclick = () => ($('#viewer').hidden = true);
  $('#viewerShare').onclick = () => viewerRec && shareRec(viewerRec);
  $('#viewerDelete').onclick = () => viewerRec && deleteRec(viewerRec);
}

/* ---------- init ---------- */
(async function init() {
  bindMain();
  bindSettings();
  document.documentElement.style.setProperty('--accent', state.settings.accent);
  if (state.settings.logo) state.logoImg = await loadImage(state.settings.logo).catch(() => null);
  if (state.settings.showGPS) setGps(true);
  if (fsSupported) {
    try { state.dirHandle = (await DB.kvGet('dir')) || null; } catch { /* ignore */ }
  }
  setMode('photo');
  refreshLastThumb();
  requestAnimationFrame(previewLoop);
  startCamera();
  if (!state.settings.brand && !state.settings.logo) {
    setTimeout(() => toast('Chưa có thông tin thương hiệu', 'Thiết lập', () => $('#btnSettings').click()), 800);
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
})();
