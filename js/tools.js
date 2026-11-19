/* ChillSpace — các công cụ trong không gian */
(function () {
  /* ---------- tiện ích ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cs:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = (offset = 0) => { const d = new Date(Date.now() - offset * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const mmss = (ms) => { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const $ = (root, sel) => root.querySelector(sel);
  const $$ = (root, sel) => [...root.querySelectorAll(sel)];
  function toast(msg, ms = 3200) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), ms);
  }
  function notify(msg) {
    toast(msg, 6000);
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('ChillSpace', { body: msg, icon: 'icon.svg' }); } catch (e) {}
  }
  const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; } };

  /* ---------- Pomodoro (toàn cục) ---------- */
  const Pomo = {
    focus: store.get('pomo.focus', 25), brk: store.get('pomo.break', 5),
    mode: 'focus', running: false, endAt: 0, remain: 0, subs: new Set(),
    total() { return (this.mode === 'focus' ? this.focus : this.brk) * 60000; },
    emit() { this.subs.forEach((f) => f()); },
    fresh() { return !this.running && this.mode === 'focus' && this.remain === this.total(); },
    setPreset(f, b) {
      if (this.running) return toast('Đang chạy – hãy tạm dừng trước khi đổi thời lượng');
      this.focus = Math.max(1, Math.min(240, f | 0)); this.brk = Math.max(1, Math.min(120, b | 0));
      store.set('pomo.focus', this.focus); store.set('pomo.break', this.brk);
      this.mode = 'focus'; this.remain = this.total(); this.emit();
    },
    start() {
      if (this.running) return;
      try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {}
      this.endAt = Date.now() + this.remain; this.running = true; this.emit();
    },
    pause() { if (!this.running) return; this.remain = Math.max(0, this.endAt - Date.now()); this.running = false; this.emit(); },
    reset() { this.running = false; this.mode = 'focus'; this.remain = this.total(); this.emit(); },
    complete(skipped) {
      if (this.mode === 'focus') {
        if (!skipped) { const d = store.get('pomo.days', {}); const t = d[today()] || { n: 0, min: 0 }; t.n++; t.min += this.focus; d[today()] = t; store.set('pomo.days', d); }
        this.mode = 'break'; this.remain = this.total();
        if (!skipped) notify(`Xong một phiên tập trung! Nghỉ ${this.brk} phút nhé ☕`);
      } else {
        this.mode = 'focus'; this.remain = this.total();
        if (!skipped) notify('Hết giờ nghỉ. Quay lại tập trung nào 💪');
      }
      if (!skipped) Sound.chime();
      if (this.running) this.endAt = Date.now() + this.remain;
      this.emit();
    },
    tick() {
      if (!this.running) return;
      this.remain = Math.max(0, this.endAt - Date.now());
      if (this.remain <= 0) this.complete(false); else this.emit();
    },
    stats() { return store.get('pomo.days', {})[today()] || { n: 0, min: 0 }; },
  };
  Pomo.remain = Pomo.total();

  /* ---------- Hẹn giờ tắt (toàn cục) ---------- */
  const Sleep = {
    endAt: 0, subs: new Set(),
    set(min) { this.endAt = min ? Date.now() + min * 60000 : 0; if (min && Sound.isPaused()) Sound.setPaused(false); this.emit(); if (min) toast(`Sẽ tắt âm thanh sau ${min} phút 🌙`); },
    emit() { this.subs.forEach((f) => f()); },
    tick() {
      if (!this.endAt) return;
      if (Date.now() >= this.endAt) { this.endAt = 0; Sound.fadeOut(20); YTP.pause(); toast('Chúc ngủ ngon 🌙 – âm thanh đã tắt dần'); document.dispatchEvent(new Event('cs:audio')); }
      this.emit();
    },
  };
  setInterval(() => { Pomo.tick(); Sleep.tick(); }, 500);

  /* ---------- YouTube ---------- */
  const YTP = {
    player: null, apiP: null, vol: store.get('yt.vol', 70), current: null,
    api() {
      if (this.apiP) return this.apiP;
      this.apiP = new Promise((res, rej) => {
        if (window.YT && YT.Player) return res();
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = () => { this.apiP = null; rej(new Error('Không tải được YouTube – kiểm tra kết nối mạng')); };
        document.head.append(s);
      });
      return this.apiP;
    },
    parse(input) {
      input = (input || '').trim();
      if (/^[\w-]{11}$/.test(input)) return { v: input };
      try {
        const u = new URL(input);
        if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/.test(u.hostname)) return null;
        const list = u.searchParams.get('list');
        let v = u.searchParams.get('v');
        if (!v && u.hostname.endsWith('youtu.be')) v = u.pathname.slice(1, 12);
        const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/);
        if (!v && m) v = m[2];
        if (v && !/^[\w-]{11}$/.test(v)) v = null;
        if (list && !/^[\w-]+$/.test(list)) return null;
        return v || list ? { v: v || null, list: list || null } : null;
      } catch (e) { return null; }
    },
    async play(item, mount) {
      try { await this.api(); } catch (e) { return toast(e.message); }
      this.current = item;
      if (!this.player) {
        mount.innerHTML = '<div></div>';
        const vars = { autoplay: 1, playsinline: 1, rel: 0 };
        if (item.list) { vars.listType = 'playlist'; vars.list = item.list; }
        this.player = new YT.Player(mount.firstChild, {
          width: '100%', height: '100%', videoId: item.v || undefined, playerVars: vars,
          events: {
            onReady: (e) => { e.target.setVolume(this.vol); e.target.playVideo(); },
            onError: (e) => toast(`Không phát được video này (mã ${e.data}). Có thể chủ kênh chặn phát nhúng – thử link khác nhé.`, 6000),
          },
        });
      } else if (item.list) this.player.loadPlaylist({ listType: 'playlist', list: item.list });
      else this.player.loadVideoById(item.v);
    },
    pause() { try { this.player && this.player.pauseVideo(); } catch (e) {} },
    setVolume(v) { this.vol = v; store.set('yt.vol', v); try { this.player && this.player.setVolume(v); } catch (e) {} },
  };

  /* ---------- Hiệu ứng pháo giấy khi xong việc ---------- */
  const celebrate = (el) => { const r = el.getBoundingClientRect(); window.FX && FX.burst(r.left + r.width / 2, r.top + r.height / 2); };

  /* ================= CÔNG CỤ ================= */
  const TOOLS = {};

  TOOLS.pomodoro = {
    title: 'Pomodoro', icon: '⏱️', width: 330, global: true,
    render(b, { opts }) {
      if (opts.preset && Pomo.fresh() && (Pomo.focus !== opts.preset[0] || Pomo.brk !== opts.preset[1])) Pomo.setPreset(...opts.preset);
      const R = 92, C = 2 * Math.PI * R;
      b.innerHTML = `
        <div class="pomo">
          <div class="pomo-mode"><span data-m="focus">Tập trung</span><span data-m="break">Nghỉ</span></div>
          <div class="ring"><svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="${R}" class="ring-bg"/><circle cx="110" cy="110" r="${R}" class="ring-fg" stroke-dasharray="${C}"/></svg><div class="ring-time"></div></div>
          <div class="row center"><button class="btn primary" data-a="go"></button><button class="btn" data-a="reset" title="Làm lại">↺</button><button class="btn" data-a="skip" title="Bỏ qua">⏭</button></div>
          <div class="chips">${[[25, 5, 'Pomodoro'], [50, 10, 'Sâu'], [45, 15, 'Hiệp đấu'], [90, 20, 'Chu kỳ 90′']].map(([f, br, n]) => `<button class="chip" data-p="${f},${br}">${n} ${f}/${br}</button>`).join('')}</div>
          <div class="row center small">Tự chỉnh: <input type="number" min="1" max="240" class="num" data-f> phút / nghỉ <input type="number" min="1" max="120" class="num" data-b> phút</div>
          <p class="muted center small" data-stats></p>
        </div>`;
      const fg = $(b, '.ring-fg'), time = $(b, '.ring-time'), go = $(b, '[data-a=go]'), fi = $(b, '[data-f]'), bi = $(b, '[data-b]'), st = $(b, '[data-stats]');
      const draw = () => {
        const frac = Pomo.remain / Pomo.total();
        fg.style.strokeDashoffset = C * (1 - frac);
        fg.classList.toggle('brk', Pomo.mode === 'break');
        time.innerHTML = `${mmss(Pomo.remain)}<small>${Pomo.mode === 'focus' ? (opts.title && opts.title !== 'Pomodoro' ? esc(opts.title) : 'tập trung') : 'nghỉ ngơi'}</small>`;
        go.textContent = Pomo.running ? '⏸ Tạm dừng' : Pomo.fresh() ? '▶ Bắt đầu' : '▶ Tiếp tục';
        $$(b, '[data-m]').forEach((e) => e.classList.toggle('on', e.dataset.m === Pomo.mode));
        if (document.activeElement !== fi) fi.value = Pomo.focus;
        if (document.activeElement !== bi) bi.value = Pomo.brk;
        const s = Pomo.stats(); st.textContent = `Hôm nay: ${s.n} phiên · ${s.min} phút tập trung 🍅`;
      };
      go.onclick = () => (Pomo.running ? Pomo.pause() : Pomo.start());
      $(b, '[data-a=reset]').onclick = () => Pomo.reset();
      $(b, '[data-a=skip]').onclick = () => Pomo.complete(true);
      $$(b, '[data-p]').forEach((c) => (c.onclick = () => Pomo.setPreset(...c.dataset.p.split(',').map(Number))));
      const custom = () => Pomo.setPreset(+fi.value || 25, +bi.value || 5);
      fi.onchange = custom; bi.onchange = custom;
      Pomo.subs.add(draw); draw();
      return () => Pomo.subs.delete(draw);
    },
  };

  TOOLS.notes = {
    title: 'Ghi chú', icon: '📝', width: 380,
    render(b, { space, opts }) {
      const k = `notes:${space.id}`;
      b.innerHTML = `<textarea class="notes" placeholder="${esc(opts.placeholder || 'Ghi chú nhanh...')}"></textarea>
        <div class="row small muted"><span data-c></span><span class="grow"></span><button class="btn ghost" data-dl>⬇️ Tải .txt</button></div>`;
      const ta = $(b, 'textarea'), c = $(b, '[data-c]');
      ta.value = store.get(k, '');
      const count = () => { const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; c.textContent = `${w} từ · tự động lưu`; };
      const save = debounce(() => store.set(k, ta.value), 300);
      ta.oninput = () => { save(); count(); };
      count();
      $(b, '[data-dl]').onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([ta.value], { type: 'text/plain;charset=utf-8' }));
        a.download = `ghi-chu-${space.id}-${today()}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      setTimeout(() => ta.focus(), 50);
    },
  };

  TOOLS.todo = {
    title: 'Việc cần làm', icon: '✅', width: 360,
    render(b, { space, opts }) {
      const k = `todo:${space.id}`, reward = opts.reward || '✅';
      let items = store.get(k, []);
      b.innerHTML = `<form class="row"><input class="grow" placeholder="Thêm việc mới rồi Enter..." maxlength="200"><button class="btn primary">＋</button></form>
        <ul class="todo"></ul><div class="row small muted"><span data-sum></span><span class="grow"></span><button class="btn ghost" data-clear>Xoá việc đã xong</button></div>`;
      const ul = $(b, 'ul'), input = $(b, 'input'), sum = $(b, '[data-sum]');
      const save = () => store.set(k, items);
      const draw = () => {
        ul.innerHTML = items.length ? items.map((it) => `<li class="${it.done ? 'done' : ''}" data-id="${it.id}"><label><input type="checkbox" ${it.done ? 'checked' : ''}><span>${esc(it.text)}</span></label><button class="x" title="Xoá">✕</button></li>`).join('') : '<li class="empty">Chưa có việc nào. Thêm một việc nhỏ để bắt đầu nhé!</li>';
        const done = items.filter((i) => i.done && i.day === today()).length;
        sum.textContent = `Hôm nay: ${done ? reward.repeat(Math.min(done, 10)) + (done > 10 ? ` ×${done}` : '') : '–'}  (${items.filter((i) => !i.done).length} việc còn lại)`;
      };
      $(b, 'form').onsubmit = (e) => { e.preventDefault(); const t = input.value.trim(); if (!t) return; items.push({ id: uid(), text: t, done: false }); input.value = ''; save(); draw(); };
      ul.onclick = (e) => {
        const li = e.target.closest('li[data-id]'); if (!li) return;
        const it = items.find((i) => i.id === li.dataset.id);
        if (e.target.classList.contains('x')) { items = items.filter((i) => i !== it); save(); draw(); }
        else if (e.target.type === 'checkbox') {
          it.done = e.target.checked; it.day = it.done ? today() : null; save(); draw();
          if (it.done) { celebrate(e.target); toast(opts.done || `Xong rồi! ${reward}`); }
        }
      };
      $(b, '[data-clear]').onclick = () => { items = items.filter((i) => !i.done); save(); draw(); };
      draw(); setTimeout(() => input.focus(), 50);
    },
  };

  TOOLS.sketch = {
    title: 'Bút vẽ', icon: '✏️', width: 520,
    render(b, { space, opts }) {
      const k = `sketch:${space.id}`, W = 960, H = 600;
      const colors = ['#1f2937', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];
      b.innerHTML = `<div class="row wrap tools-row">${colors.map((c, i) => `<button class="sw${i === 0 ? ' on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
          <input type="range" min="2" max="40" value="5" data-size title="Cỡ nét"><button class="btn ghost" data-er title="Tẩy">🧽</button><button class="btn ghost" data-undo title="Hoàn tác">↶</button><button class="btn ghost" data-clr title="Xoá hết">🗑️</button><button class="btn ghost" data-dl title="Tải ảnh">⬇️</button></div>
        <canvas class="sketch" width="${W}" height="${H}"></canvas>`;
      const cv = $(b, 'canvas'), g = cv.getContext('2d');
      let color = colors[0], size = 5, erase = false, drawing = false, last = null;
      const undo = [];
      const paper = () => {
        if (opts.board === 'pitch') {
          g.fillStyle = '#2e7d32'; g.fillRect(0, 0, W, H);
          for (let i = 0; i < 8; i += 2) { g.fillStyle = '#388e3c'; g.fillRect((i * W) / 8, 0, W / 8, H); }
          g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4;
          g.strokeRect(30, 30, W - 60, H - 60); g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H - 30); g.stroke();
          g.beginPath(); g.arc(W / 2, H / 2, 80, 0, Math.PI * 2); g.stroke();
          g.strokeRect(30, H / 2 - 140, 140, 280); g.strokeRect(W - 170, H / 2 - 140, 140, 280);
          g.strokeRect(30, H / 2 - 60, 50, 120); g.strokeRect(W - 80, H / 2 - 60, 50, 120);
        } else { g.fillStyle = '#fffdf7'; g.fillRect(0, 0, W, H); }
      };
      const saved = store.get(k, null);
      paper();
      if (saved) { const im = new Image(); im.onload = () => g.drawImage(im, 0, 0); im.src = saved; }
      const persist = debounce(() => { try { store.set(k, cv.toDataURL('image/webp', 0.8)); } catch (e) {} }, 400);
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
      cv.onpointerdown = (e) => {
        drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId);
        undo.push(g.getImageData(0, 0, W, H)); if (undo.length > 25) undo.shift();
        g.beginPath(); g.fillStyle = erase ? (opts.board === 'pitch' ? '#2e7d32' : '#fffdf7') : color; g.arc(last.x, last.y, size / 2, 0, Math.PI * 2); g.fill();
      };
      cv.onpointermove = (e) => {
        if (!drawing) return;
        const p = pos(e);
        g.strokeStyle = erase ? (opts.board === 'pitch' ? '#2e7d32' : '#fffdf7') : color;
        g.lineWidth = erase ? size * 3 : size; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p;
      };
      cv.onpointerup = cv.onpointercancel = () => { if (drawing) { drawing = false; persist(); } };
      $$(b, '.sw').forEach((s) => (s.onclick = () => { color = s.dataset.c; erase = false; $$(b, '.sw').forEach((x) => x.classList.toggle('on', x === s)); $(b, '[data-er]').classList.remove('on'); }));
      $(b, '[data-size]').oninput = (e) => (size = +e.target.value);
      $(b, '[data-er]').onclick = (e) => { erase = !erase; e.currentTarget.classList.toggle('on', erase); };
      $(b, '[data-undo]').onclick = () => { const s = undo.pop(); if (s) { g.putImageData(s, 0, 0); persist(); } };
      $(b, '[data-clr]').onclick = () => { undo.push(g.getImageData(0, 0, W, H)); paper(); persist(); };
      $(b, '[data-dl]').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `ban-ve-${space.id}-${today()}.png`; a.click(); };
    },
  };

  const PATTERNS = {
    calm: { name: 'Thư thái 5-5', steps: [['Hít vào', 5, 1], ['Thở ra', 5, 0]] },
    box: { name: 'Hộp 4-4-4-4', steps: [['Hít vào', 4, 1], ['Giữ', 4, 1], ['Thở ra', 4, 0], ['Giữ', 4, 0]] },
    '478': { name: '4-7-8 dễ ngủ', steps: [['Hít vào', 4, 1], ['Giữ', 7, 1], ['Thở ra', 8, 0]] },
  };
  TOOLS.breathing = {
    title: 'Hít thở', icon: '🫁', width: 320,
    render(b, { opts }) {
      let pat = opts.pattern || 'calm', timer = null, step = 0, left = 0, rounds = 0;
      b.innerHTML = `<div class="chips center">${Object.entries(PATTERNS).map(([k, p]) => `<button class="chip" data-k="${k}">${p.name}</button>`).join('')}</div>
        <div class="breath"><div class="breath-orb"></div><div class="breath-txt">Sẵn sàng</div></div>
        <div class="row center"><button class="btn primary" data-go>▶ Bắt đầu</button></div><p class="muted center small" data-r></p>`;
      const orb = $(b, '.breath-orb'), txt = $(b, '.breath-txt'), go = $(b, '[data-go]'), r = $(b, '[data-r]');
      const mark = () => $$(b, '[data-k]').forEach((c) => c.classList.toggle('on', c.dataset.k === pat));
      const phase = () => {
        const [name, sec, big] = PATTERNS[pat].steps[step];
        left = sec; orb.style.transitionDuration = sec + 's'; orb.classList.toggle('big', !!big);
        txt.innerHTML = `${name}<small>${left}</small>`;
      };
      const stop = () => { clearInterval(timer); timer = null; go.textContent = '▶ Bắt đầu'; orb.classList.remove('big'); orb.style.transitionDuration = '1.5s'; txt.textContent = 'Sẵn sàng'; };
      const start = () => {
        step = 0; rounds = 0; phase(); go.textContent = '⏹ Dừng';
        timer = setInterval(() => {
          left--;
          if (left <= 0) { step = (step + 1) % PATTERNS[pat].steps.length; if (step === 0) r.textContent = `Đã thở ${++rounds} vòng 🌿`; phase(); }
          else $(txt, 'small').textContent = left;
        }, 1000);
      };
      go.onclick = () => (timer ? stop() : start());
      $$(b, '[data-k]').forEach((c) => (c.onclick = () => { pat = c.dataset.k; mark(); if (timer) { stop(); start(); } }));
      mark();
      return () => clearInterval(timer);
    },
  };

  const TRACK = {
    coffee: { icon: '☕', name: 'Cà phê', unit: 'ly', goal: 3, hint: 'Đừng quá 3–4 ly/ngày nhé' },
    water: { icon: '💧', name: 'Uống nước', unit: 'ly', goal: 8, hint: 'Khoảng 8 ly (2 lít) mỗi ngày' },
    tea: { icon: '🍵', name: 'Trà', unit: 'ly', goal: 4, hint: 'Trà ấm giúp thư giãn' },
  };
  TOOLS.tracker = {
    title: 'Theo dõi', icon: '☕', width: 320, key: (o) => 'tracker:' + (o.kind || 'water'),
    render(b, { opts, setTitle }) {
      const t = TRACK[opts.kind] || TRACK.water, kind = opts.kind || 'water';
      if (!opts.title) setTitle(t.name + ' hôm nay', t.icon);
      const key = (d) => `track:${kind}:${d}`;
      b.innerHTML = `<div class="tracker"><div class="big-ico">${t.icon}</div><div class="cnt"></div>
        <div class="row center"><button class="btn" data-d="-1">－</button><button class="btn primary" data-d="1">＋ Thêm 1 ${t.unit}</button></div>
        <div class="cups"></div><p class="muted small center">${t.hint}</p><div class="bars"></div></div>`;
      const draw = () => {
        const n = store.get(key(today()), 0);
        $(b, '.cnt').innerHTML = `<b>${n}</b> / ${t.goal} ${t.unit}`;
        $(b, '.cups').innerHTML = Array.from({ length: Math.max(t.goal, n) }, (_, i) => `<span class="${i < n ? 'on' : ''}">${t.icon}</span>`).join('');
        const days = Array.from({ length: 7 }, (_, i) => 6 - i).map((o) => ({ d: today(o), n: store.get(key(today(o)), 0), o }));
        const mx = Math.max(t.goal, ...days.map((x) => x.n));
        $(b, '.bars').innerHTML = days.map((x) => `<div class="bar" title="${x.d}: ${x.n}"><i style="height:${(x.n / mx) * 100}%"></i><small>${x.o === 0 ? 'Nay' : new Date(x.d).getDate()}</small></div>`).join('');
      };
      $$(b, '[data-d]').forEach((btn) => (btn.onclick = () => {
        const n = Math.max(0, store.get(key(today()), 0) + +btn.dataset.d); store.set(key(today()), n); draw();
        if (+btn.dataset.d > 0 && n === t.goal) { celebrate(btn); toast(`Đạt mục tiêu ${t.name.toLowerCase()} hôm nay! 🎉`); }
      }));
      draw();
    },
  };

  const LIB = {
    read: [
      { t: 'Project Gutenberg – 70.000+ sách miễn phí (tiếng Anh)', u: 'https://www.gutenberg.org' },
      { t: 'Open Library – mượn sách điện tử', u: 'https://openlibrary.org' },
      { t: 'Waka – sách điện tử tiếng Việt', u: 'https://waka.vn' },
      { t: 'Standard Ebooks – sách kinh điển trình bày đẹp', u: 'https://standardebooks.org' },
    ],
    audio: [
      { t: 'Fonos – sách nói tiếng Việt', u: 'https://fonos.vn' },
      { t: 'Voiz FM – sách nói & podcast Việt', u: 'https://voiz.vn' },
      { t: 'LibriVox – sách nói miễn phí (tiếng Anh)', u: 'https://librivox.org' },
      { t: 'Sách nói trên YouTube', u: 'https://www.youtube.com/results?search_query=s%C3%A1ch+n%C3%B3i' },
    ],
  };
  TOOLS.library = {
    title: 'Tủ sách', icon: '📚', width: 380,
    render(b, { opts }) {
      let tab = opts.tab || 'read';
      let shelf = store.get('shelf', []);
      b.innerHTML = `<div class="tabs"><button data-t="read">📖 Sách đọc</button><button data-t="audio">🎧 Sách nói</button><button data-t="mine">⭐ Tủ của tôi</button></div><div data-body></div>`;
      const body = $(b, '[data-body]');
      const draw = () => {
        $$(b, '[data-t]').forEach((x) => x.classList.toggle('on', x.dataset.t === tab));
        if (tab !== 'mine') {
          body.innerHTML = `<ul class="links">${LIB[tab].map((l) => `<li><a href="${l.u}" target="_blank" rel="noopener">${esc(l.t)} ↗</a></li>`).join('')}</ul>
            <p class="muted small">Mẹo: mở sách nói ở tab khác, để ChillSpace chạy âm thanh nền nhỏ phía sau.</p>`;
          return;
        }
        body.innerHTML = `<form class="col"><input name="t" placeholder="Tên sách" required maxlength="120"><div class="row"><input name="u" class="grow" placeholder="Link (không bắt buộc)"><input name="p" type="number" min="1" class="num" placeholder="Số trang"></div><button class="btn primary">＋ Thêm vào tủ</button></form>
          <ul class="shelf">${shelf.map((s) => `<li data-id="${s.id}"><div class="row"><b class="grow">${s.u ? `<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)} ↗</a>` : esc(s.t)}</b><button class="x">✕</button></div>
            ${s.p ? `<div class="row small"><button class="btn ghost" data-pg="-10">−10</button><div class="prog grow"><i style="width:${Math.min(100, (s.at / s.p) * 100)}%"></i></div><button class="btn ghost" data-pg="10">+10</button><span class="muted">${s.at}/${s.p}</span></div>` : ''}</li>`).join('') || '<li class="empty">Thêm cuốn sách bạn đang đọc để theo dõi tiến độ.</li>'}</ul>`;
        $(body, 'form').onsubmit = (e) => {
          e.preventDefault(); const f = e.target;
          shelf.unshift({ id: uid(), t: f.t.value.trim(), u: safeUrl(f.u.value.trim()), p: +f.p.value || 0, at: 0 });
          store.set('shelf', shelf); draw();
        };
        $(body, '.shelf').onclick = (e) => {
          const li = e.target.closest('li[data-id]'); if (!li) return;
          const s = shelf.find((x) => x.id === li.dataset.id);
          if (e.target.classList.contains('x')) shelf = shelf.filter((x) => x !== s);
          else if (e.target.dataset.pg) { s.at = Math.max(0, Math.min(s.p, s.at + +e.target.dataset.pg)); if (s.at === s.p) { celebrate(e.target); toast(`Đọc xong "${s.t}"! 🎉`); } }
          else return;
          store.set('shelf', shelf); draw();
        };
      };
      $$(b, '[data-t]').forEach((x) => (x.onclick = () => { tab = x.dataset.t; draw(); }));
      draw();
    },
  };

  TOOLS.journal = {
    title: 'Nhật ký', icon: '📔', width: 380,
    render(b, { space, opts }) {
      let entries = store.get('journal', []), mood = '🙂';
      const moods = ['😄', '🙂', '😌', '😐', '😔', '😴'];
      b.innerHTML = `<p class="prompt">${esc(opts.prompt || space.journal || 'Hôm nay của bạn thế nào?')}</p>
        <div class="moods">${moods.map((m) => `<button data-m="${m}">${m}</button>`).join('')}</div>
        <textarea class="notes short" placeholder="Viết vài dòng thôi cũng được..."></textarea>
        <div class="row"><span class="grow"></span><button class="btn primary" data-save>Lưu trang nhật ký</button></div><ul class="entries"></ul>`;
      const ta = $(b, 'textarea');
      const draw = () => {
        $$(b, '[data-m]').forEach((x) => x.classList.toggle('on', x.dataset.m === mood));
        $(b, '.entries').innerHTML = entries.slice(0, 30).map((e) => `<li data-id="${e.id}"><div class="row small muted"><span>${e.mood} ${new Date(e.at).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })} · ${esc(e.space || '')}</span><span class="grow"></span><button class="x">✕</button></div><div class="pre">${esc(e.text)}</div></li>`).join('');
      };
      $$(b, '[data-m]').forEach((x) => (x.onclick = () => { mood = x.dataset.m; draw(); }));
      $(b, '[data-save]').onclick = () => {
        const t = ta.value.trim(); if (!t) return ta.focus();
        entries.unshift({ id: uid(), at: Date.now(), mood, text: t, space: space.name }); store.set('journal', entries); ta.value = ''; draw(); toast('Đã lưu nhật ký 💛');
      };
      $(b, '.entries').onclick = (e) => { if (!e.target.classList.contains('x')) return; const id = e.target.closest('li').dataset.id; entries = entries.filter((x) => x.id !== id); store.set('journal', entries); draw(); };
      draw();
    },
  };

  TOOLS.flashcards = {
    title: 'Thẻ ghi nhớ', icon: '🗂️', width: 380,
    render(b, { space }) {
      const k = `cards:${space.id}`;
      let cards = store.get(k, []), tab = cards.length ? 'study' : 'add', cur = null, flipped = false;
      b.innerHTML = `<div class="tabs"><button data-t="study">🧠 Học</button><button data-t="add">＋ Thêm thẻ (<span data-n></span>)</button></div><div data-body></div>`;
      const body = $(b, '[data-body]'), save = () => store.set(k, cards);
      const pick = () => { if (!cards.length) return null; const min = Math.min(...cards.map((c) => c.box)); const pool = cards.filter((c) => c.box === min && c !== cur); const p = pool.length ? pool : cards.filter((c) => c.box === min); return p[Math.floor(Math.random() * p.length)]; };
      const draw = () => {
        $(b, '[data-n]').textContent = cards.length;
        $$(b, '[data-t]').forEach((x) => x.classList.toggle('on', x.dataset.t === tab));
        if (tab === 'study') {
          if (!cards.length) { body.innerHTML = '<p class="empty">Chưa có thẻ nào – qua tab "Thêm thẻ" nhé.</p>'; return; }
          if (!cur || !cards.includes(cur)) cur = pick();
          body.innerHTML = `<div class="card ${flipped ? 'flip' : ''}"><div class="face">${esc(cur.f)}</div><div class="face back">${esc(cur.b)}</div></div>
            <p class="muted small center">Bấm vào thẻ để lật · Hộp ${cur.box + 1}</p>
            <div class="row center"><button class="btn" data-r="0">😵 Chưa nhớ</button><button class="btn primary" data-r="1">😎 Nhớ rồi</button></div>`;
          $(body, '.card').onclick = () => { flipped = !flipped; $(body, '.card').classList.toggle('flip', flipped); };
          $$(body, '[data-r]').forEach((x) => (x.onclick = () => { cur.box = +x.dataset.r ? Math.min(5, cur.box + 1) : 0; save(); flipped = false; cur = pick(); draw(); }));
        } else {
          body.innerHTML = `<form class="col"><input name="f" placeholder="Mặt trước (câu hỏi / từ vựng)" required maxlength="300"><input name="b" placeholder="Mặt sau (đáp án / nghĩa)" required maxlength="500"><button class="btn primary">＋ Thêm thẻ</button></form>
            <ul class="cardlist">${cards.map((c) => `<li data-id="${c.id}"><span class="grow"><b>${esc(c.f)}</b> — ${esc(c.b)}</span><button class="x">✕</button></li>`).join('')}</ul>`;
          $(body, 'form').onsubmit = (e) => { e.preventDefault(); cards.push({ id: uid(), f: e.target.f.value.trim(), b: e.target.b.value.trim(), box: 0 }); save(); draw(); $(body, 'input').focus(); };
          $(body, '.cardlist').onclick = (e) => { if (!e.target.classList.contains('x')) return; cards = cards.filter((c) => c.id !== e.target.closest('li').dataset.id); save(); draw(); };
        }
      };
      $$(b, '[data-t]').forEach((x) => (x.onclick = () => { tab = x.dataset.t; draw(); }));
      draw();
    },
  };

  const MOVES = [
    ['🙆', 'Xoay cổ nhẹ nhàng', 'Xoay chậm 5 vòng mỗi bên'], ['🤷', 'Xoay vai', 'Xoay vai ra sau 10 lần'],
    ['🙌', 'Duỗi tay qua đầu', 'Đan tay, đẩy lên cao, hít sâu'], ['🧘', 'Vặn người', 'Ngồi thẳng, vặn sang trái rồi phải'],
    ['🤲', 'Xoay cổ tay', 'Xoay cổ tay và duỗi ngón'], ['👀', 'Quy tắc 20-20-20', 'Nhìn xa ~6m trong 20 giây'],
    ['🚶', 'Đứng dậy đi lại', 'Đi vài bước, uống một ngụm nước'],
  ];
  TOOLS.stretch = {
    title: 'Giãn cơ', icon: '🤸', width: 320,
    render(b) {
      let i = 0, left = 30, timer = null;
      b.innerHTML = `<div class="stretch"><div class="big-ico" data-e></div><b data-n></b><p class="muted small" data-h></p><div class="big-time" data-t></div><div class="dots"></div></div>
        <div class="row center"><button class="btn" data-a="-1">⏮</button><button class="btn primary" data-go>▶ Bắt đầu</button><button class="btn" data-a="1">⏭</button></div>`;
      const draw = () => {
        const [e, n, h] = MOVES[i];
        $(b, '[data-e]').textContent = e; $(b, '[data-n]').textContent = `${i + 1}. ${n}`; $(b, '[data-h]').textContent = h; $(b, '[data-t]').textContent = left + 's';
        $(b, '.dots').innerHTML = MOVES.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'past' : ''}"></i>`).join('');
        $(b, '[data-go]').textContent = timer ? '⏸ Tạm dừng' : '▶ Bắt đầu';
      };
      const go = (d) => { i = (i + d + MOVES.length) % MOVES.length; left = 30; draw(); };
      $(b, '[data-go]').onclick = () => {
        if (timer) { clearInterval(timer); timer = null; return draw(); }
        timer = setInterval(() => {
          left--;
          if (left <= 0) { Sound.chime(); if (i === MOVES.length - 1) { clearInterval(timer); timer = null; left = 30; i = 0; toast('Xong bài giãn cơ! Cơ thể cảm ơn bạn 💪'); } else go(1); }
          draw();
        }, 1000);
        draw();
      };
      $$(b, '[data-a]').forEach((x) => (x.onclick = () => go(+x.dataset.a)));
      draw();
      return () => clearInterval(timer);
    },
  };

  const CHEERS = {
    base: ['Bạn đang làm tốt hơn bạn nghĩ đấy.', 'Bắt đầu nhỏ thôi, nhưng hãy bắt đầu.', 'Xong còn hơn hoàn hảo.', 'Nghỉ một chút không phải là bỏ cuộc.', 'Hôm nay chỉ cần tốt hơn hôm qua một chút.', 'Tập trung vào việc trước mắt, những thứ khác để sau.', 'Uống ngụm nước, thả lỏng vai, rồi tiếp tục nhé.', 'Kỷ luật hôm nay là tự do ngày mai.'],
    pirate: ['Hỡi thuyền trưởng! Kho báu không tự tìm đến đâu – giương buồm!', 'Sóng to thì càng phải giữ chặt bánh lái!', 'Cả thuyền tin bạn. Thêm một nhiệm vụ nữa thôi!', 'Mỗi việc xong là một mảnh bản đồ kho báu!'],
    football: ['Còn cả hiệp hai! Chưa hết trận đâu!', 'Chuyền ngắn, chắc chân – từng việc một!', 'Khán đài đang gọi tên bạn! 📣', 'Pressing tầm cao! Đừng để việc khó lấn sân!'],
    beach: ['Sóng đến rồi đi, bạn cứ thong thả.', 'Thả lỏng vai, nghe gió biển một chút.', 'Nghỉ ngơi cũng là một phần của tiến bộ.'],
    camp: ['Điều ước của bạn đã được ngôi sao ghi lại ✨', 'Lửa vẫn cháy, bạn cũng vậy.', 'Tĩnh lặng một chút, câu trả lời sẽ đến.'],
    space: ['Houston nhắn: nhiệm vụ đang đi đúng quỹ đạo 🛰️', 'Mặt đất vẫn dõi theo bạn. Tiếp tục nhé!', 'Không trọng lực, nhưng có trọng tâm.'],
    cafe: ['Ly cà phê này là để dành cho người chăm chỉ ☕', 'Viết dở cũng được, miễn là viết.'],
  };
  TOOLS.cheer = {
    title: 'Lời động viên', icon: '💬', width: 320,
    render(b, { space }) {
      const own = CHEERS[space.id] || [];
      const pool = [...own, ...own, ...CHEERS.base]; // ưu tiên câu hợp không gian
      let last = -1;
      b.innerHTML = `<blockquote class="cheer"></blockquote><div class="row center"><button class="btn primary">🎲 Lời khác</button></div>`;
      const next = () => { let k; do k = Math.floor(Math.random() * pool.length); while (k === last && pool.length > 1); last = k; const q = $(b, '.cheer'); q.classList.remove('pop'); void q.offsetWidth; q.textContent = pool[k]; q.classList.add('pop'); };
      $(b, 'button').onclick = next; next();
    },
  };

  TOOLS.sleep = {
    title: 'Hẹn giờ tắt', icon: '🌙', width: 300, global: true,
    render(b) {
      b.innerHTML = `<p class="muted small">Âm thanh nền và YouTube sẽ tắt dần sau:</p><div class="chips">${[15, 30, 45, 60, 90].map((m) => `<button class="chip" data-m="${m}">${m} phút</button>`).join('')}</div><div class="big-time center" data-r></div><div class="row center"><button class="btn" data-off>Huỷ hẹn giờ</button></div>`;
      const r = $(b, '[data-r]');
      const draw = () => { r.textContent = Sleep.endAt ? mmss(Sleep.endAt - Date.now()) : '–'; $(b, '[data-off]').hidden = !Sleep.endAt; };
      $$(b, '[data-m]').forEach((x) => (x.onclick = () => Sleep.set(+x.dataset.m)));
      $(b, '[data-off]').onclick = () => Sleep.set(0);
      Sleep.subs.add(draw); draw();
      return () => Sleep.subs.delete(draw);
    },
  };

  TOOLS.mixer = {
    title: 'Âm thanh nền', icon: '🎧', width: 340, global: true,
    render(b, { space }) {
      b.innerHTML = `<div class="row"><button class="btn" data-pause></button><span class="grow"></span><label class="small">🔊 <input type="range" min="0" max="100" data-master></label></div>
        <div class="mixer"></div>
        <div class="row small wrap"><button class="btn ghost" data-def>↺ Theo không gian</button><button class="btn ghost" data-off>🔇 Tắt hết</button><span class="grow"></span><label class="muted"><input type="checkbox" data-auto> Tự đổi theo không gian</label></div>`;
      const mx = $(b, '.mixer');
      mx.innerHTML = Sound.list.map((s) => `<label class="mix" data-id="${s.id}"><span class="ico">${s.icon}</span><span class="nm">${s.name}${s.hint ? `<small>${s.hint}</small>` : ''}</span><input type="range" min="0" max="100"></label>`).join('');
      const draw = () => {
        $$(mx, '.mix').forEach((l) => { const v = Sound.getVol(l.dataset.id); $(l, 'input').value = Math.round(v * 100); l.classList.toggle('on', v > 0); });
        $(b, '[data-master]').value = Math.round(Sound.getMaster() * 100);
        $(b, '[data-pause]').textContent = Sound.isPaused() ? '▶ Phát' : '⏸ Tạm dừng';
        $(b, '[data-auto]').checked = store.get('autoSound', true);
      };
      mx.oninput = (e) => { const l = e.target.closest('.mix'); Sound.init(); Sound.setVol(l.dataset.id, e.target.value / 100); if (Sound.isPaused()) Sound.setPaused(false); l.classList.toggle('on', e.target.value > 0); $(b, '[data-pause]').textContent = '⏸ Tạm dừng'; };
      $(b, '[data-master]').oninput = (e) => Sound.setMaster(e.target.value / 100);
      $(b, '[data-pause]').onclick = () => { Sound.setPaused(!Sound.isPaused()); draw(); document.dispatchEvent(new Event('cs:audio')); };
      $(b, '[data-def]').onclick = () => { Sound.setAll(space.sounds); Sound.setPaused(false); draw(); };
      $(b, '[data-off]').onclick = () => { Sound.setAll({}); draw(); };
      $(b, '[data-auto]').onchange = (e) => store.set('autoSound', e.target.checked);
      const sync = () => draw();
      document.addEventListener('cs:audio', sync);
      draw();
      return () => document.removeEventListener('cs:audio', sync);
    },
  };

  TOOLS.youtube = {
    title: 'YouTube', icon: '▶️', width: 420, global: true, keepAlive: true,
    render(b, ctx) {
      b.innerHTML = `<div class="yt-frame" data-mount><div class="yt-empty">🎵 Dán link YouTube (video, playlist, livestream) hoặc chọn gợi ý bên dưới.<small>Đăng nhập tài khoản <b>YouTube Premium</b> trên trình duyệt này để nghe không quảng cáo.</small></div></div>
        <form class="row"><input class="grow" placeholder="https://youtube.com/watch?v=... hoặc playlist"><button class="btn primary">▶ Phát</button></form>
        <div class="row small wrap"><button class="btn ghost" data-save>⭐ Lưu vào không gian này</button><a class="btn ghost" data-search target="_blank" rel="noopener"></a><span class="grow"></span><label>🔊 <input type="range" min="0" max="100" data-vol></label></div>
        <ul class="yt-list"></ul>`;
      const mount = $(b, '[data-mount]'), input = $(b, 'input');
      $(b, '[data-vol]').value = YTP.vol;
      $(b, '[data-vol]').oninput = (e) => YTP.setVolume(+e.target.value);
      const play = (url) => { const it = YTP.parse(url); if (!it) return toast('Link YouTube không hợp lệ'); YTP.play(it, mount); };
      $(b, 'form').onsubmit = (e) => { e.preventDefault(); play(input.value); };
      this._b = b; this._play = play;
      $(b, '[data-save]').onclick = () => {
        const sp = window.currentSpace(), url = input.value.trim();
        if (!YTP.parse(url)) return toast('Dán một link YouTube hợp lệ trước đã');
        const name = prompt('Đặt tên cho bản nhạc/playlist này:', 'Nhạc của tôi'); if (name == null) return;
        const list = store.get('yt:' + sp.id, []); list.unshift({ t: name.trim() || url, url }); store.set('yt:' + sp.id, list); this.refresh(); toast('Đã lưu ⭐');
      };
      $(b, '.yt-list').onclick = (e) => {
        const li = e.target.closest('li[data-url]'); if (!li) return;
        if (e.target.classList.contains('x')) { const sp = window.currentSpace(); store.set('yt:' + sp.id, store.get('yt:' + sp.id, []).filter((x) => x.url !== li.dataset.url)); return this.refresh(); }
        input.value = li.dataset.url; play(li.dataset.url);
      };
      this.refresh(ctx);
    },
    refresh() {
      const b = this._b; if (!b) return;
      const sp = window.currentSpace(), mine = store.get('yt:' + sp.id, []);
      const s = $(b, '[data-search]');
      s.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(sp.yt.q); s.textContent = `🔎 Tìm "${sp.yt.q}"`;
      $(b, '.yt-list').innerHTML = [...mine.map((m) => ({ ...m, mine: 1 })), ...sp.yt.picks].map((m) => `<li data-url="${esc(m.url)}"><span>${m.mine ? '⭐' : '🎧'}</span><span class="grow">${esc(m.t)}</span>${m.mine ? '<button class="x" title="Xoá">✕</button>' : ''}</li>`).join('') || '<li class="empty">Bấm 🔎 để tìm nhạc hợp không gian này, copy link rồi dán vào ô trên.</li>';
    },
  };

  TOOLS.toolbox = {
    title: 'Công cụ', icon: '🧰', width: 400, global: true,
    render(b) { this._b = b; this.refresh(); },
    refresh() {
      const b = this._b; if (!b) return;
      const sp = window.currentSpace();
      const all = ['pomodoro', 'todo', 'notes', 'sketch', 'flashcards', 'library', 'journal', 'breathing', 'stretch', 'tracker', 'cheer', 'sleep', 'mixer', 'youtube'];
      b.innerHTML = `<h4>${sp.emoji} Trong ${esc(sp.name)}</h4><div class="grid">${sp.objects.map((o, i) => `<button class="tile" data-o="${i}"><span>${o.e}</span>${esc(o.label)}</button>`).join('')}</div>
        <h4>Tất cả công cụ</h4><div class="grid">${all.map((t) => `<button class="tile" data-t="${t}"><span>${TOOLS[t].icon}</span>${TOOLS[t].title}</button>`).join('')}</div>
        <p class="muted small">Phím tắt: <kbd>M</kbd> âm thanh · <kbd>Y</kbd> YouTube · <kbd>P</kbd> Pomodoro · <kbd>T</kbd> công cụ · <kbd>H</kbd> ẩn giao diện · <kbd>F</kbd> toàn màn hình · <kbd>1</kbd>–<kbd>0</kbd> đổi không gian</p>`;
      $$(b, '[data-o]').forEach((x) => (x.onclick = () => window.openObject(sp.objects[+x.dataset.o])));
      $$(b, '[data-t]').forEach((x) => (x.onclick = () => WM.open(x.dataset.t)));
    },
  };

  window.CS = { store, esc, toast, mmss, Pomo, Sleep, YTP };
  window.TOOLS = TOOLS;
})();
