/* ChillSpace — khung ứng dụng */
(function () {
  const { store, esc, toast, mmss, Pomo } = CS;
  const $ = (s) => document.querySelector(s);
  let space = SPACES.find((s) => s.id === store.get('space', 'study')) || SPACES[0];
  window.currentSpace = () => space;

  /* ---------- Quản lý cửa sổ ---------- */
  const WM = (window.WM = (() => {
    const root = $('#windows'), wins = {};
    let z = 30, n = 0;
    const mobile = () => matchMedia('(max-width: 720px)').matches;
    function focus(w) { w.el.style.zIndex = ++z; Object.values(wins).forEach((x) => x.el.classList.toggle('top', x === w)); }
    function drag(w) {
      const head = w.el.querySelector('.win-head');
      head.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button') || mobile()) return;
        const r = w.el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
        head.setPointerCapture(e.pointerId);
        const mv = (ev) => {
          w.el.style.left = Math.max(-r.width + 80, Math.min(innerWidth - 80, ev.clientX - dx)) + 'px';
          w.el.style.top = Math.max(56, Math.min(innerHeight - 50, ev.clientY - dy)) + 'px';
        };
        const up = () => { head.removeEventListener('pointermove', mv); head.removeEventListener('pointerup', up); };
        head.addEventListener('pointermove', mv); head.addEventListener('pointerup', up);
      });
    }
    function open(tool, opts = {}) {
      const def = TOOLS[tool]; if (!def) return;
      const key = def.key ? def.key(opts) : tool;
      let w = wins[key];
      if (!w) {
        const el = document.createElement('section');
        el.className = 'win';
        el.innerHTML = `<header class="win-head"><span class="win-ico"></span><span class="win-title"></span><button class="win-x" aria-label="Đóng">✕</button></header><div class="win-body"></div>`;
        const width = Math.min(def.width || 340, innerWidth - 24);
        el.style.width = width + 'px';
        const k = n++ % 6;
        if (def.place === 'right') { el.style.left = Math.max(12, innerWidth - width - 16) + 'px'; el.style.top = '70px'; }
        else {
          el.style.left = Math.max(12, Math.min(innerWidth - width - 12, innerWidth / 2 - width / 2 + (k - 2.5) * 34)) + 'px';
          el.style.top = Math.max(70, Math.min(innerHeight - 320, 96 + k * 26)) + 'px';
        }
        root.append(el);
        w = wins[key] = { el, def, key };
        el.querySelector('.win-x').onclick = () => close(key);
        el.addEventListener('pointerdown', () => focus(w));
        drag(w);
      } else if (def.keepAlive && w.rendered) {
        w.el.hidden = false; focus(w); def.refresh && def.refresh(); return w;
      }
      w.el.hidden = false;
      w.cleanup && w.cleanup();
      const setTitle = (t, ic) => { w.el.querySelector('.win-title').textContent = t; if (ic) w.el.querySelector('.win-ico').textContent = ic; };
      setTitle(opts.title || def.title, opts.icon || def.icon);
      w.cleanup = def.render(w.el.querySelector('.win-body'), { space, opts, setTitle }) || null;
      w.rendered = true; w.global = def.global;
      w.el.classList.remove('pop'); void w.el.offsetWidth; w.el.classList.add('pop');
      focus(w);
      return w;
    }
    function close(key) {
      const w = wins[key]; if (!w) return;
      if (w.def.keepAlive) { w.el.hidden = true; return; }
      w.cleanup && w.cleanup(); w.el.remove(); delete wins[key];
    }
    function toggle(tool) {
      const w = wins[tool];
      if (w && !w.el.hidden && w.el.classList.contains('top')) close(tool); else open(tool);
    }
    function onSpace() {
      Object.values(wins).forEach((w) => { if (!w.global) close(w.key); else if (w.def.refresh) w.def.refresh(); });
    }
    function closeTop() { const w = Object.values(wins).filter((x) => !x.el.hidden).sort((a, b) => +b.el.style.zIndex - +a.el.style.zIndex)[0]; if (w) close(w.key); }
    return { open, close, toggle, onSpace, closeTop };
  })());

  window.openObject = (o) => WM.open(o.tool, { ...(o.opts || {}), title: (o.opts && o.opts.title) || o.label, icon: o.e });

  /* ---------- Hiệu ứng hạt ---------- */
  const FX = (window.FX = (() => {
    const cv = $('#fx'), g = cv.getContext('2d');
    let W = 0, H = 0, type = null, clip = null, parts = [], bursts = [], raf = 0, lastT = 0;
    let X0 = 0, Y0 = 0, RW = 0, RH = 0; // vùng hiệu ứng (cả màn hình hoặc 1 phần cảnh)
    function region() {
      if (!clip) { X0 = 0; Y0 = 0; RW = W; RH = H; return; }
      const r = $('#stage').getBoundingClientRect();
      X0 = r.left + (clip[0] / 100) * r.width; Y0 = r.top + (clip[1] / 100) * r.height; RW = (clip[2] / 100) * r.width; RH = (clip[3] / 100) * r.height;
    }
    const R = Math.random;
    function resize() { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
    const make = {
      rain: () => ({ x: R() * W * 1.2 - W * 0.1, y: R() * H, l: 10 + R() * 18, v: 600 + R() * 500 }),
      dust: () => ({ x: R() * W, y: R() * H, r: 0.6 + R() * 1.8, vx: (R() - 0.5) * 8, vy: -2 - R() * 6, a: R() * 6.28 }),
      sparkle: () => ({ x: W * (0.2 + R() * 0.6), y: H * (0.6 + R() * 0.2), r: 1 + R() * 2.5, a: R() * 6.28, s: 1 + R() * 2 }),
      confetti: () => ({ x: R() * W, y: -R() * H, w: 4 + R() * 6, h: 6 + R() * 8, v: 40 + R() * 70, vx: (R() - 0.5) * 30, rot: R() * 6.28, vr: (R() - 0.5) * 4, c: `hsl(${R() * 360},90%,65%)` }),
      embers: () => ({ x: W * (0.44 + R() * 0.12), y: H * (0.8 + R() * 0.1), r: 0.8 + R() * 2, vx: (R() - 0.5) * 30, vy: -30 - R() * 60, life: 0, max: 2 + R() * 3 }),
      petals: () => ({ x: X0 + R() * RW * 1.2, y: Y0 - R() * RH, s: 4 + R() * 5, vy: 25 + R() * 35, vx: -15 - R() * 30, a: R() * 6.28, va: 1 + R() * 2, c: R() > 0.5 ? '#ffc4d6' : '#ffe0ea' }),
      snow: () => ({ x: X0 + R() * RW, y: Y0 + R() * RH, r: 0.8 + R() * 2.4, vy: 18 + R() * 40, a: R() * 6.28 }),
      bubbles: () => ({ x: X0 + R() * RW, y: Y0 + RH + R() * RH, r: 1.5 + R() * 5, vy: 25 + R() * 50, a: R() * 6.28 }),
      fireflies: () => ({ x: X0 + R() * RW, y: Y0 + RH * (0.45 + R() * 0.55), vx: (R() - 0.5) * 20, vy: (R() - 0.5) * 12, a: R() * 6.28, s: 0.6 + R() * 1.4 }),
      lanterns: () => ({ x: X0 + R() * RW, y: Y0 + RH + R() * RH * 0.8, r: 3 + R() * 4, vy: 8 + R() * 14, a: R() * 6.28, h: 20 + R() * 25 }),
    };
    const count = { rain: 260, dust: 45, sparkle: 50, confetti: 45, embers: 45, petals: 40, snow: 140, bubbles: 45, fireflies: 30, lanterns: 22 };
    function set(t, c) { type = t; clip = c || null; region(); parts = t ? Array.from({ length: count[t] }, make[t]) : []; if (!raf) raf = requestAnimationFrame(loop); }
    function burst(x, y) {
      for (let i = 0; i < 36; i++) { const a = R() * 6.28, sp = 150 + R() * 300; bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 150, rot: R() * 6.28, life: 0, c: `hsl(${R() * 360},90%,62%)` }); }
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function loop(t) {
      raf = 0;
      const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
      g.clearRect(0, 0, W, H);
      if (!document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (clip) { g.save(); g.beginPath(); g.rect(X0, Y0, RW, RH); g.clip(); }
        for (const p of parts) {
          if (type === 'rain') {
            p.y += p.v * dt; p.x -= p.v * 0.12 * dt;
            if (p.y > H) { p.y = -20; p.x = R() * W * 1.2; }
            g.strokeStyle = 'rgba(190,210,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.l * 0.12, p.y + p.l); g.stroke();
          } else if (type === 'dust') {
            p.a += dt; p.x += (p.vx + Math.sin(p.a) * 4) * dt; p.y += p.vy * dt;
            if (p.y < -5) { p.y = H + 5; p.x = R() * W; }
            g.fillStyle = `rgba(255,236,200,${0.25 + Math.sin(p.a * 0.7) * 0.15})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
          } else if (type === 'sparkle') {
            p.a += dt * p.s; const o = Math.max(0, Math.sin(p.a)); if (p.a > 6.28) Object.assign(p, make.sparkle(), { a: 0 });
            g.fillStyle = `rgba(255,240,210,${o * 0.9})`; g.beginPath(); g.moveTo(p.x, p.y - p.r * 3); g.lineTo(p.x + p.r * 0.6, p.y); g.lineTo(p.x, p.y + p.r * 3); g.lineTo(p.x - p.r * 0.6, p.y); g.fill();
            g.beginPath(); g.moveTo(p.x - p.r * 3, p.y); g.lineTo(p.x, p.y + p.r * 0.6); g.lineTo(p.x + p.r * 3, p.y); g.lineTo(p.x, p.y - p.r * 0.6); g.fill();
          } else if (type === 'confetti') {
            p.y += p.v * dt; p.x += p.vx * dt; p.rot += p.vr * dt;
            if (p.y > H + 10) Object.assign(p, make.confetti(), { y: -10 });
            g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.globalAlpha = 0.75; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2))); g.restore();
          } else if (type === 'embers') {
            p.life += dt; p.x += (p.vx + Math.sin(p.life * 3) * 15) * dt; p.y += p.vy * dt;
            if (p.life > p.max) Object.assign(p, make.embers());
            const o = 1 - p.life / p.max; g.fillStyle = `rgba(255,${140 + o * 80 | 0},60,${o})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
          } else if (type === 'petals') {
            p.a += p.va * dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.a) * 25) * dt;
            if (p.y > Y0 + RH + 10 || p.x < X0 - 20) Object.assign(p, make.petals(), { y: Y0 - 10 });
            g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.abs(Math.cos(p.a)) * 0.6 + 0.4); g.fillStyle = p.c; g.globalAlpha = 0.9;
            g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, 6.28); g.fill(); g.restore();
          } else if (type === 'snow') {
            p.a += dt; p.y += p.vy * dt; p.x += Math.sin(p.a + p.r) * 12 * dt;
            if (p.y > Y0 + RH + 5) { p.y = Y0 - 5; p.x = X0 + R() * RW; }
            g.fillStyle = `rgba(255,255,255,${0.5 + p.r / 6})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
          } else if (type === 'bubbles') {
            p.a += dt * 2; p.y -= p.vy * dt; p.x += Math.sin(p.a) * 10 * dt;
            if (p.y < Y0 - 10) Object.assign(p, make.bubbles(), { y: Y0 + RH + 10 });
            g.strokeStyle = 'rgba(220,245,255,.55)'; g.lineWidth = 1.2; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.stroke();
            g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, 6.28); g.fill();
          } else if (type === 'fireflies') {
            p.a += dt * p.s; p.x += (p.vx + Math.sin(p.a * 1.3) * 10) * dt; p.y += (p.vy + Math.cos(p.a) * 8) * dt;
            if (p.x < X0 || p.x > X0 + RW || p.y < Y0 || p.y > Y0 + RH) Object.assign(p, make.fireflies());
            const o = Math.max(0, Math.sin(p.a * 2)); const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
            gr.addColorStop(0, `rgba(230,255,140,${o})`); gr.addColorStop(1, 'rgba(230,255,140,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, 9, 0, 6.28); g.fill();
          } else if (type === 'lanterns') {
            p.a += dt; p.y -= p.vy * dt; p.x += Math.sin(p.a * 0.5) * 6 * dt;
            if (p.y < Y0 - 20) Object.assign(p, make.lanterns(), { y: Y0 + RH + 20 });
            const fade = Math.min(1, (p.y - Y0) / (RH * 0.4)), fl = 0.8 + Math.sin(p.a * 6) * 0.2;
            const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.h); gr.addColorStop(0, `rgba(255,190,90,${0.5 * fade * fl})`); gr.addColorStop(1, 'rgba(255,150,60,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.h, 0, 6.28); g.fill();
            g.fillStyle = `rgba(255,214,140,${0.95 * fade})`; g.beginPath(); g.roundRect ? g.roundRect(p.x - p.r * 0.8, p.y - p.r, p.r * 1.6, p.r * 2, p.r * 0.4) : g.rect(p.x - p.r * 0.8, p.y - p.r, p.r * 1.6, p.r * 2); g.fill();
          }
        }
        if (clip) g.restore();
      }
      bursts = bursts.filter((b) => (b.life += dt) < 1.6);
      for (const b of bursts) {
        b.vy += 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += 8 * dt;
        g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.globalAlpha = 1 - b.life / 1.6; g.fillStyle = b.c; g.fillRect(-4, -3, 8, 6); g.restore();
      }
      if (type || bursts.length) raf = requestAnimationFrame(loop);
    }
    addEventListener('resize', () => { resize(); if (type) set(type, clip); });
    resize();
    return { set, burst };
  })());

  /* ---------- Không gian ---------- */
  function renderObjects() {
    $('#objects').innerHTML = space.objects.map((o, i) => `<button class="obj" style="left:${o.x}%;top:${o.y}%;--s:${o.s};animation-delay:${(i * 0.4) % 3}s" data-i="${i}" aria-label="${esc(o.label)}"><span class="emo">${o.e}</span><span class="lbl">${esc(o.label)}</span></button>`).join('');
    renderBoards();
    $('#quickbar').innerHTML = space.objects.map((o, i) => `<button data-i="${i}"><span>${o.e}</span>${esc(o.label)}</button>`).join('');
  }
  function setSpace(id, first, remote) {
    const next = SPACES.find((s) => s.id === id); if (!next) return;
    const changed = next !== space; space = next;
    store.set('space', id);
    document.documentElement.style.setProperty('--accent', space.accent);
    document.body.dataset.space = space.id;
    document.body.dataset.ink = space.ink ? '1' : '';
    if (space.ink) document.documentElement.style.setProperty('--ink', space.ink);
    const stage = $('#stage');
    stage.classList.add('fade');
    setTimeout(() => {
      $('#scenery').innerHTML = SCENES[space.id](space.id + '-');
      renderObjects();
      stage.classList.remove('fade');
    }, first ? 0 : 280);
    FX.set(space.fx, space.fxClip);
    $('#spaceMood').textContent = `${space.emoji} ${space.name} · ${space.mood}`;
    $('#quote').textContent = space.quote;
    $$('#dock button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    if (store.get('autoSound', true) && (changed || first)) Sound.setAll(space.sounds);
    document.dispatchEvent(new Event('cs:audio'));
    WM.onSpace();
    document.title = `${space.emoji} ${space.name} · ChillSpace`;
    if (!first) document.dispatchEvent(new CustomEvent('cs:space', { detail: { id, remote: !!remote } }));
  }
  window.setSpace = (id, o = {}) => setSpace(id, false, o.remote);
  const $$ = (s) => [...document.querySelectorAll(s)];

  $('#dock').innerHTML = SPACES.map((s, i) => `<button data-id="${s.id}" title="${esc(s.name)} — ${esc(s.mood)} (${(i + 1) % 10})"><span>${s.emoji}</span><small>${esc(s.short || s.name)}</small></button>`).join('');
  $('#dock').onclick = (e) => { const b = e.target.closest('button'); if (b) { Sound.init(); setSpace(b.dataset.id); } };
  const objClick = (e) => { const b = e.target.closest('[data-i]'); if (b) { Sound.init(); openObject(space.objects[+b.dataset.i]); } };
  $('#objects').onclick = objClick; $('#quickbar').onclick = objClick;
  /* ---------- Bảng treo tường: thu nhỏ / phóng to / tắt ---------- */
  function boardHtml(id, mobile) {
    const B = window.Boards && Boards[id]; if (!B) return '';
    const st = Boards.state(id); if (st === 'closed') return '';
    return `<div class="board b-${id} st-${st}${mobile ? ' m' : ''}" data-bid="${id}">
      <div class="bh" data-bh><span class="bt">${B.icon} ${B.title}<small>${B.sub()}</small></span>
        <span class="bc">${B.extra ? B.extra() : ''}<button data-bc="min" title="${st === 'min' ? 'Mở ra' : 'Thu nhỏ'}">${st === 'min' ? '▾' : '–'}</button>${mobile ? '' : `<button data-bc="max" title="${st === 'max' ? 'Thu về cỡ thường' : 'Phóng to'}">${st === 'max' ? '❐' : '▢'}</button>`}<button data-bc="close" title="Tắt bảng">✕</button></span></div>
      ${st === 'min' ? '' : `<div class="bb" data-tool="${B.tool}">${B.body(st)}</div>`}</div>`;
  }
  function renderBoards() {
    document.querySelectorAll('#objects .board').forEach((e) => e.remove());
    const ids = space.boards || [];
    $('#objects').insertAdjacentHTML('beforeend', ids.map((id) => boardHtml(id, false)).join(''));
    $('#mboard').innerHTML = ids.map((id) => boardHtml(id, true)).join('');
    document.body.classList.toggle('board-max', ids.some((id) => Boards.state(id) === 'max'));
    if (ids.includes('flights') && Boards.state('flights') !== 'closed' && window.Flights) setTimeout(() => Flights.load(false), 0);
  }
  document.addEventListener('click', (e) => {
    const bd = e.target.closest('.board'); if (!bd) return;
    const id = bd.dataset.bid, st = Boards.state(id), c = e.target.closest('[data-bc]');
    if (c) {
      const a = c.dataset.bc;
      if (a === 'close') { Boards.setState(id, 'closed'); toast(`Đã tắt bảng. Mở lại bằng ${Boards[id].icon} trên bàn`, 4000); }
      else Boards.setState(id, st === a ? 'normal' : a);
      return;
    }
    if (st === 'min') return Boards.setState(id, 'normal');
    if (e.target.closest('.bb')) WM.open(Boards[id].tool);
  });
  document.addEventListener('cs:boards', renderBoards);
  document.addEventListener('cs:flights', () => { if ((space.boards || []).includes('flights')) renderBoards(); });
  let boardDay = ''; // qua 0 giờ (giờ VN) thì tính lại bảng hạn lưu trú
  setInterval(() => { if (!space.boards || !window.ProDate) return; const d = ProDate.todayISO(); if (d !== boardDay) { boardDay = d; renderBoards(); } }, 30000);

  /* ---------- Thanh trên ---------- */
  document.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => { Sound.init(); WM.toggle(b.dataset.open); }));
  const zen = (on) => { const v = document.body.classList.toggle('zen', typeof on === 'boolean' ? on : undefined); if (v) toast('Bấm 👁️ góc dưới bên phải (hoặc phím Esc) để hiện lại giao diện', 3500); };
  $('#zenBtn').onclick = () => zen(true);
  $('#zenExit').onclick = () => zen(false);
  // Toàn màn hình: hỗ trợ cả Safari (webkit). Máy không hỗ trợ (iPhone) thì ẩn nút.
  const D = document, EL = D.documentElement;
  const fsEl = () => D.fullscreenElement || D.webkitFullscreenElement;
  const fsCan = !!(EL.requestFullscreen || EL.webkitRequestFullscreen);
  const fs = () => {
    try {
      if (fsEl()) (D.exitFullscreen || D.webkitExitFullscreen).call(D);
      else { const r = (EL.requestFullscreen || EL.webkitRequestFullscreen).call(EL); if (r && r.catch) r.catch(() => toast('Trình duyệt không cho bật toàn màn hình')); }
    } catch (e) { toast('Trình duyệt không hỗ trợ toàn màn hình'); }
  };
  const fsSync = () => { const on = !!fsEl(); $('#fsBtn').textContent = on ? '🗗' : '⛶'; $('#fsBtn').title = on ? 'Thoát toàn màn hình (F hoặc Esc)' : 'Toàn màn hình (F)'; };
  if (!fsCan) $('#fsBtn').hidden = true;
  $('#fsBtn').onclick = fs;
  D.addEventListener('fullscreenchange', fsSync); D.addEventListener('webkitfullscreenchange', fsSync);
  $('#playBtn').onclick = () => { Sound.init(); Sound.setPaused(!Sound.isPaused()); syncPlay(); document.dispatchEvent(new Event('cs:audio')); };
  const syncPlay = () => { $('#playBtn').textContent = Sound.isPaused() ? '🔇' : '🔊'; $('#playBtn').title = Sound.isPaused() ? 'Bật âm thanh nền' : 'Tắt âm thanh nền'; };
  document.addEventListener('cs:audio', syncPlay);

  const badge = $('#pomoBadge');
  badge.onclick = () => WM.open('pomodoro');
  Pomo.subs.add(() => {
    const show = Pomo.running || !Pomo.fresh();
    badge.hidden = !show;
    badge.textContent = `${Pomo.mode === 'focus' ? '🍅' : '☕'} ${mmss(Pomo.remain)}${Pomo.running ? '' : ' ⏸'}`;
    document.title = Pomo.running ? `${mmss(Pomo.remain)} ${Pomo.mode === 'focus' ? 'tập trung' : 'nghỉ'} · ChillSpace` : `${space.emoji} ${space.name} · ChillSpace`;
  });

  /* ---------- Đồng hồ ---------- */
  // Đồng hồ luôn chạy theo giờ Việt Nam (khớp với bảng hạn lưu trú và báo thức 00:00)
  const VN_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short' });
  const VN_DOW = { Mon: 'Thứ Hai', Tue: 'Thứ Ba', Wed: 'Thứ Tư', Thu: 'Thứ Năm', Fri: 'Thứ Sáu', Sat: 'Thứ Bảy', Sun: 'Chủ Nhật' };
  function clock() {
    const o = Object.fromEntries(VN_FMT.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const h = +o.hour % 24, y = +o.year, mo = +o.month, dd = +o.day;
    $('#clock').textContent = `${String(h).padStart(2, '0')}:${o.minute}`;
    const hi = h < 5 ? 'Khuya rồi, nhớ nghỉ ngơi nhé' : h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Buổi trưa vui vẻ' : h < 18 ? 'Chào buổi chiều' : h < 22 ? 'Buổi tối thư thả' : 'Khuya rồi, nhớ nghỉ ngơi nhé';
    let lun = ''; try { const l = Lunar.fromSolar(dd, mo, y); lun = ` · ${l.day}/${l.month}${l.leap ? ' nhuận' : ''} âm lịch`; } catch (e) {}
    $('#date').textContent = `${hi} · ${VN_DOW[o.weekday]}, ${dd} tháng ${mo}${lun}`;
  }
  clock(); setInterval(clock, 5000);

  /* ---------- Phím tắt ---------- */
  addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select,[contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('#welcome').hidden) return;
    const k = e.key.toLowerCase();
    const map = { m: 'mixer', y: 'youtube', p: 'pomodoro', t: 'toolbox', r: 'room' };
    if (map[k]) { Sound.init(); WM.toggle(map[k]); }
    else if (k === 'h') zen();
    else if (k === 'f') fs();
    else if (k === 'escape') { if (document.body.classList.contains('zen')) zen(false); else WM.closeTop(); }
    else if (/^[0-9]$/.test(k)) { const s = SPACES[(+k + 9) % 10]; if (s) setSpace(s.id); }
    else if (k === ' ' && document.body.classList.contains('zen')) { e.preventDefault(); Pomo.running ? Pomo.pause() : Pomo.start(); }
  });

  /* ---------- Màn chào ---------- */
  const welcome = $('#welcome');
  welcome.querySelector('.cards').innerHTML = SPACES.map((s) => `<button class="wcard${s.id === space.id ? ' last' : ''}" data-id="${s.id}" style="--a:${s.accent}"><span class="e">${s.emoji}</span><b>${esc(s.name)}</b><small>${esc(s.mood)}</small></button>`).join('');
  welcome.onclick = (e) => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    Sound.init(); welcome.classList.add('out'); setTimeout(() => (welcome.hidden = true), 400);
    setSpace(b.dataset.id);
    window.Room && Room.boot();
    if (!store.get('seenTips')) { store.set('seenTips', 1); setTimeout(() => toast('Mẹo: bấm vào các đồ vật trong cảnh để mở công cụ ✨', 5000), 900); }
  };

  setSpace(space.id, true);
  syncPlay();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
