/* ChillSpace — Hiệu ứng không gian: nắng, mưa, giông, tuyết, sương, gió, đêm, ồn ào, chợ, phố xá + sáng/tối.
   Mỗi hiệu ứng = hình ảnh + âm thanh đi kèm. Bật nhiều cái cùng lúc được, có độ mạnh riêng.
   Lưu riêng cho từng không gian, chỉ trên máy mình (không đồng bộ lên Phòng chung). */
window.Atmos = (function () {
  const EFFECTS = [
    { id: 'sun', icon: '☀️', name: 'Nắng', sounds: { birds: 0.45, wind: 0.12 }, vis: ['sun', 'motes'] },
    { id: 'rain', icon: '🌧️', name: 'Mưa', sounds: { rain: 0.7 }, vis: ['rain'], tint: 'rain' },
    { id: 'storm', icon: '⛈️', name: 'Giông', sounds: { rain: 0.95, wind: 0.45 }, vis: ['rain', 'storm'], tint: 'storm' },
    { id: 'snow', icon: '❄️', name: 'Tuyết', sounds: { wind: 0.35 }, vis: ['snow'], tint: 'cold' },
    { id: 'fog', icon: '🌫️', name: 'Sương mù', sounds: { wind: 0.18 }, vis: ['fog'] },
    { id: 'wind', icon: '🍃', name: 'Gió lộng', sounds: { wind: 0.65 }, vis: ['leaves'] },
    { id: 'night', icon: '🌙', name: 'Đêm hè', sounds: { crickets: 0.5, frogs: 0.18 }, vis: ['fireflies'], tint: 'night' },
    { id: 'crowd', icon: '🗣️', name: 'Ồn ào', sounds: { cafe: 0.75, crowd: 0.25 }, vis: ['bokeh'] },
    { id: 'market', icon: '🛒', name: 'Tiếng chợ', sounds: { market: 0.8 }, vis: ['bokehWarm'], tint: 'warm' },
    { id: 'street', icon: '🛵', name: 'Phố xá', sounds: { traffic: 0.75 }, vis: ['streaks'] },
  ];
  const byId = Object.fromEntries(EFFECTS.map((e) => [e.id, e]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cs:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  let spaceId = null, state = { on: {}, light: 0 };
  const subs = new Set();

  /* ---------- hình ảnh: lớp màu + nắng + chớp (dưới nút) và hạt (canvas) ---------- */
  const bg = () => document.getElementById('atmBg');
  const cv = document.getElementById('atmFx'), g = cv && cv.getContext('2d');
  let W = 0, H = 0, layers = {}, raf = 0, lastT = 0, stormT = 0;
  const R = Math.random;
  function resize() { if (!cv) return; const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); }
  const make = {
    rain: () => ({ x: R() * W * 1.2 - W * 0.1, y: R() * H, l: 12 + R() * 20, v: 700 + R() * 500 }),
    snow: () => ({ x: R() * W, y: R() * H, r: 0.8 + R() * 2.6, vy: 20 + R() * 45, a: R() * 6.28 }),
    leaves: () => ({ x: -20 - R() * W * 0.5, y: R() * H * 0.9, s: 4 + R() * 6, vx: 160 + R() * 220, vy: -10 + R() * 40, a: R() * 6.28, va: 2 + R() * 4, c: ['#9ccc65', '#c5e1a5', '#ffcc80', '#a5d6a7'][(R() * 4) | 0] }),
    fireflies: () => ({ x: R() * W, y: H * (0.35 + R() * 0.6), vx: (R() - 0.5) * 22, vy: (R() - 0.5) * 14, a: R() * 6.28, s: 0.6 + R() * 1.4 }),
    motes: () => ({ x: W * (0.35 + R() * 0.65), y: R() * H, r: 0.6 + R() * 1.8, vx: (R() - 0.5) * 8, vy: -3 - R() * 6, a: R() * 6.28 }),
    bokeh: () => ({ x: R() * W, y: H * (0.25 + R() * 0.6), r: 10 + R() * 28, vx: (R() - 0.5) * 10, a: R() * 6.28, h: R() * 360 }),
    bokehWarm: () => ({ x: R() * W, y: H * (0.15 + R() * 0.6), r: 8 + R() * 26, vx: (R() - 0.5) * 8, a: R() * 6.28, h: 20 + R() * 30 }),
    streaks: () => ({ x: R() < 0.5 ? -200 - R() * W : W + 200 + R() * W, y: H * (0.78 + R() * 0.12), l: 60 + R() * 160, red: R() < 0.5 }),
    fog: () => ({ x: R() * W * 1.4 - W * 0.2, y: H * (0.3 + R() * 0.65), rx: W * (0.25 + R() * 0.3), ry: H * (0.08 + R() * 0.1), vx: 6 + R() * 12 }),
  };
  const COUNT = { rain: 420, snow: 220, leaves: 46, fireflies: 46, motes: 60, bokeh: 34, bokehWarm: 34, streaks: 14, fog: 9 };

  function setLayer(type, k) {
    if (!make[type]) return;
    const n = Math.round(COUNT[type] * k);
    const cur = layers[type] || [];
    if (n <= 0) delete layers[type];
    else layers[type] = n <= cur.length ? cur.slice(0, n) : cur.concat(Array.from({ length: n - cur.length }, make[type]));
    if (Object.keys(layers).length && !raf) raf = requestAnimationFrame(loop);
  }
  function loop(t) {
    raf = 0;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    g.clearRect(0, 0, W, H);
    if (!document.hidden) {
      for (const type in layers) for (const p of layers[type]) draw[type](p, dt, type);
    }
    if (Object.keys(layers).length) raf = requestAnimationFrame(loop);
  }
  const draw = {
    rain(p, dt) {
      p.y += p.v * dt; p.x -= p.v * 0.12 * dt;
      if (p.y > H) { p.y = -20; p.x = R() * W * 1.2; }
      g.strokeStyle = 'rgba(200,220,255,.38)'; g.lineWidth = 1; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.l * 0.12, p.y + p.l); g.stroke();
    },
    snow(p, dt) {
      p.a += dt; p.y += p.vy * dt; p.x += Math.sin(p.a + p.r) * 14 * dt;
      if (p.y > H + 5) { p.y = -5; p.x = R() * W; }
      g.fillStyle = `rgba(255,255,255,${0.55 + p.r / 7})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
    },
    leaves(p, dt) {
      p.a += p.va * dt; p.x += p.vx * dt; p.y += (p.vy + Math.sin(p.a) * 40) * dt;
      if (p.x > W + 30 || p.y > H + 30) Object.assign(p, make.leaves(), { x: -20 });
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.abs(Math.cos(p.a)) * 0.6 + 0.4); g.fillStyle = p.c; g.globalAlpha = 0.85;
      g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 6.28); g.fill(); g.restore();
    },
    fireflies(p, dt) {
      p.a += dt * p.s; p.x += (p.vx + Math.sin(p.a * 1.3) * 10) * dt; p.y += (p.vy + Math.cos(p.a) * 8) * dt;
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) Object.assign(p, make.fireflies());
      const o = Math.max(0, Math.sin(p.a * 2)), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
      gr.addColorStop(0, `rgba(230,255,140,${o})`); gr.addColorStop(1, 'rgba(230,255,140,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, 9, 0, 6.28); g.fill();
    },
    motes(p, dt) {
      p.a += dt; p.x += (p.vx + Math.sin(p.a) * 4) * dt; p.y += p.vy * dt;
      if (p.y < -5) { p.y = H + 5; p.x = W * (0.35 + R() * 0.65); }
      g.fillStyle = `rgba(255,240,200,${0.3 + Math.sin(p.a * 0.7) * 0.2})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
    },
    bokeh(p, dt, type) {
      p.a += dt * 0.6; p.x += p.vx * dt; if (p.x < -40) p.x = W + 40; if (p.x > W + 40) p.x = -40;
      const o = 0.08 + Math.max(0, Math.sin(p.a)) * 0.14, gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      const c = type === 'bokehWarm' ? `hsla(${p.h},100%,70%,` : `hsla(${p.h},70%,75%,`;
      gr.addColorStop(0, c + o + ')'); gr.addColorStop(0.7, c + o * 0.7 + ')'); gr.addColorStop(1, c + '0)');
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
    },
    bokehWarm(p, dt) { draw.bokeh(p, dt, 'bokehWarm'); },
    streaks(p, dt) {
      const dir = p.red ? -1 : 1; p.x += dir * 520 * dt;
      if ((dir > 0 && p.x > W + 300) || (dir < 0 && p.x < -300)) Object.assign(p, make.streaks(), { red: p.red, x: dir > 0 ? -200 - R() * W : W + 200 + R() * W });
      const gr = g.createLinearGradient(p.x, 0, p.x - dir * p.l, 0), col = p.red ? '255,70,60' : '255,240,200';
      gr.addColorStop(0, `rgba(${col},.75)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.strokeStyle = gr; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - dir * p.l, p.y); g.stroke();
    },
    fog(p, dt) {
      p.x += p.vx * dt; if (p.x - p.rx > W) p.x = -p.rx;
      g.save(); g.translate(p.x, p.y); g.scale(1, p.ry / p.rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, p.rx); gr.addColorStop(0, 'rgba(225,232,240,.22)'); gr.addColorStop(1, 'rgba(225,232,240,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, p.rx, 0, 6.28); g.fill(); g.restore();
    },
  };

  // chớp + sấm (Giông)
  function scheduleStorm(k) {
    clearTimeout(stormT);
    if (!k) return;
    stormT = setTimeout(() => {
      const f = bg() && bg().querySelector('.atm-flash');
      if (f && !document.hidden) { f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
      if (window.Sound) setTimeout(() => Sound.thunder(0.35 + 0.55 * k), 300 + R() * 1400);
      scheduleStorm(k);
    }, (7 + R() * 14) * 1000 / (0.5 + k));
  }

  /* ---------- áp dụng ---------- */
  function apply() {
    const on = state.on, b = bg();
    // âm thanh: mỗi âm lấy mức lớn nhất trong các hiệu ứng đang bật
    const vol = {};
    for (const id in on) for (const [s, v] of Object.entries(byId[id] ? byId[id].sounds : {})) vol[s] = Math.max(vol[s] || 0, v * on[id]);
    if (window.Sound) Sound.list.forEach((s) => { const v = vol[s.id] || 0; if (v || Sound.getVol('x:' + s.id)) Sound.setVol('x:' + s.id, v); });
    // hạt
    const vis = {};
    for (const id in on) (byId[id] ? byId[id].vis : []).forEach((t) => (vis[t] = Math.max(vis[t] || 0, on[id])));
    Object.keys(COUNT).forEach((t) => setLayer(t, vis[t] || 0));
    scheduleStorm(vis.storm || 0);
    if (!b) return;
    // nắng
    b.style.setProperty('--sun', vis.sun || 0);
    // lớp màu
    const tints = {};
    for (const id in on) { const t = byId[id] && byId[id].tint; if (t) tints[t] = Math.max(tints[t] || 0, on[id]); }
    b.querySelector('.atm-tints').innerHTML = Object.entries(tints).map(([t, k]) => `<i class="tint-${t}" style="opacity:${k.toFixed(2)}"></i>`).join('');
    // sáng / tối: chỉ làm sáng/tối ảnh nền, không ảnh hưởng nút
    const L = state.light / 100, sc = document.getElementById('scenery');
    if (sc) sc.style.filter = L ? `brightness(${(1 + L * (L > 0 ? 0.45 : 0.62)).toFixed(3)}) saturate(${(1 + L * 0.15).toFixed(3)})` : '';
    subs.forEach((f) => f());
  }
  function load(id) {
    spaceId = id;
    const s = store.get('atmos:' + id, null);
    state = { on: (s && s.on) || {}, light: (s && s.light) || 0 };
    apply();
  }
  function save() { if (spaceId) store.set('atmos:' + spaceId, state); }

  const api = {
    list: EFFECTS,
    get: () => state,
    toggle(id) { if (window.Sound) Sound.init(); if (state.on[id]) delete state.on[id]; else state.on[id] = 0.7; save(); apply(); },
    setLevel(id, k) { if (!state.on[id]) return; state.on[id] = Math.max(0.05, Math.min(1, k)); save(); apply(); },
    setLight(v) { state.light = Math.max(-100, Math.min(100, Math.round(v))); save(); apply(); },
    clear() { state = { on: {}, light: 0 }; save(); apply(); },
    activeCount: () => Object.keys(state.on).length + (state.light ? 1 : 0),
    subs,
  };

  addEventListener('resize', resize); resize();
  document.addEventListener('cs:space', (e) => load(e.detail.id));
  addEventListener('load', () => { const sp = window.currentSpace && window.currentSpace(); if (sp) load(sp.id); });

  /* ---------- cửa sổ ✨ Hiệu ứng ---------- */
  if (window.TOOLS) {
    TOOLS.atmos = {
      title: 'Hiệu ứng', icon: '✨', width: 360, global: true,
      render(b) {
        b.innerHTML = `<p class="muted small">Chạm để bật/tắt — có cả hình lẫn tiếng. Bật nhiều cái cùng lúc được. Lưu riêng cho từng không gian.</p>
          <div class="atm-grid">${EFFECTS.map((e) => `<button class="atm-chip" data-id="${e.id}"><span>${e.icon}</span>${e.name}</button>`).join('')}</div>
          <div class="atm-levels"></div>
          <label class="atm-light"><span>🌑 Tối</span><input type="range" min="-100" max="100" step="5" data-light><span>Sáng ☀️</span></label>
          <div class="row small"><span class="grow"></span><button class="btn ghost" data-clear>↺ Tắt hết hiệu ứng</button></div>`;
        const levels = b.querySelector('.atm-levels');
        const draw = () => {
          b.querySelectorAll('.atm-chip').forEach((c) => c.classList.toggle('on', !!state.on[c.dataset.id]));
          const ids = Object.keys(state.on);
          const have = [...levels.querySelectorAll('[data-lv]')].map((x) => x.dataset.lv).join();
          if (have !== ids.join()) levels.innerHTML = ids.map((id) => `<label class="mix on"><span class="ico">${byId[id].icon}</span><span class="nm">${byId[id].name}</span><input type="range" min="5" max="100" data-lv="${id}"></label>`).join('');
          levels.querySelectorAll('[data-lv]').forEach((i) => { if (document.activeElement !== i) i.value = Math.round(state.on[i.dataset.lv] * 100); i.dispatchEvent(new Event('input', { bubbles: true })); });
          const l = b.querySelector('[data-light]'); if (document.activeElement !== l) l.value = state.light; l.dispatchEvent(new Event('input', { bubbles: true }));
        };
        b.querySelector('.atm-grid').onclick = (e) => { const c = e.target.closest('.atm-chip'); if (c) api.toggle(c.dataset.id); };
        levels.oninput = (e) => { const i = e.target.closest('[data-lv]'); if (i && e.isTrusted) api.setLevel(i.dataset.lv, i.value / 100); };
        b.querySelector('[data-light]').oninput = (e) => { if (e.isTrusted) api.setLight(+e.target.value); };
        b.querySelector('[data-light]').ondblclick = () => api.setLight(0);
        b.querySelector('[data-clear]').onclick = () => api.clear();
        subs.add(draw); draw();
        return () => subs.delete(draw);
      },
    };
  }
  return api;
})();
