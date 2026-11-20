/* ChillSpace — 🎵 Nhạc: danh sách nhạc dài (không lời) phát kiểu vừa tải vừa nghe.
   Danh sách bài nằm trong music.json (file nhạc để trên GitHub Releases, mỗi file tối đa 2 GB).
   Nhạc chạy tiếp khi đóng cửa sổ hay đổi không gian; có nút điều khiển trên màn hình khoá điện thoại. */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cs:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => { if (!isFinite(s)) return '--:--'; s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const toast = (m) => { const el = document.getElementById('toast'); if (!el) return; el.textContent = m; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3000); };

  const a = new Audio(); a.preload = 'metadata';
  let list = [], loaded = false;
  const st = Object.assign({ i: 0, pos: 0, vol: 0.7, shuffle: false, repeat: 'all' }, store.get('music', {}));
  a.volume = st.vol;
  const subs = new Set(), emit = () => subs.forEach((f) => f());
  const save = () => store.set('music', { i: st.i, pos: a.currentTime || st.pos, vol: st.vol, shuffle: st.shuffle, repeat: st.repeat });

  const ready = fetch('music.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []).then((x) => {
    list = (Array.isArray(x) ? x : []).filter((t) => t && t.url && /^https:\/\//.test(t.url));
    loaded = true; if (st.i >= list.length) st.i = 0; emit();
  });

  function load(i, autoplay, pos = 0) {
    if (!list.length) return;
    st.i = (i + list.length) % list.length; st.pos = pos;
    a.src = list[st.i].url;
    if (pos) a.addEventListener('loadedmetadata', () => { try { a.currentTime = pos; } catch (e) {} }, { once: true });
    if (autoplay) a.play().catch(() => toast('Chạm ▶ một lần nữa để phát nhạc'));
    meta(); save(); emit();
  }
  const M = (window.Music = {
    get list() { return list; }, get loaded() { return loaded; }, st, audio: a, subs,
    playing: () => !a.paused,
    async play(i) {
      await ready;
      if (!list.length) return toast('Chưa có bài nhạc nào');
      if (i != null && i !== st.i) return load(i, true);
      if (!a.src) return load(st.i, true, st.pos);
      a.play().catch(() => toast('Chạm ▶ một lần nữa để phát nhạc'));
    },
    pause() { a.pause(); },
    toggle() { M.playing() ? M.pause() : M.play(); },
    next(auto) {
      if (!list.length) return;
      if (auto && st.repeat === 'one') { a.currentTime = 0; return a.play(); }
      let n = st.i + 1;
      if (st.shuffle && list.length > 1) { do n = Math.floor(Math.random() * list.length); while (n === st.i); }
      load(n, true);
    },
    prev() { if (a.currentTime > 5) { a.currentTime = 0; return; } load(st.i - 1, true); },
    seek(s) { if (isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(a.duration - 1, s)); },
    setVol(v) { st.vol = v; a.volume = v; save(); },
    setShuffle(v) { st.shuffle = v; save(); emit(); },
    cycleRepeat() { st.repeat = st.repeat === 'all' ? 'one' : 'all'; save(); emit(); },
  });
  a.addEventListener('ended', () => M.next(true));
  a.addEventListener('play', emit); a.addEventListener('pause', () => { save(); emit(); });
  a.addEventListener('error', () => { if (a.src) toast('Không phát được bài này, chuyển bài tiếp'); if (list.length > 1) setTimeout(() => M.next(), 1500); });
  let lastSave = 0;
  a.addEventListener('timeupdate', () => { if (Date.now() - lastSave > 5000) { lastSave = Date.now(); save(); } });

  // nút điều khiển trên màn hình khoá / tai nghe
  function meta() {
    if (!('mediaSession' in navigator) || !list[st.i]) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: list[st.i].t, artist: 'ChillSpace', artwork: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }] });
      navigator.mediaSession.setActionHandler('play', () => M.play());
      navigator.mediaSession.setActionHandler('pause', () => M.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => M.next());
      navigator.mediaSession.setActionHandler('previoustrack', () => M.prev());
    } catch (e) {}
  }

  /* ---------- cửa sổ 🎵 Nhạc ---------- */
  if (!window.TOOLS) return;
  TOOLS.music = {
    title: 'Nhạc', icon: '🎵', width: 380, global: true,
    render(b) {
      b.innerHTML = `<div class="mu-now"><div class="mu-title" data-title>—</div>
          <div class="mu-bar"><span data-cur>0:00</span><input type="range" min="0" max="1000" value="0" data-seek><span data-dur>--:--</span></div>
          <div class="mu-ctl"><button class="btn ghost" data-shuf title="Phát ngẫu nhiên">🔀</button><button class="btn ghost" data-prev title="Bài trước">⏮</button>
            <button class="btn primary mu-play" data-play>▶</button><button class="btn ghost" data-next title="Bài sau">⏭</button><button class="btn ghost" data-rep title="Lặp lại"></button></div>
          <label class="mu-vol">🔈 <input type="range" min="0" max="100" data-vol> 🔊</label></div>
        <ol class="mu-list"></ol>`;
      const listEl = b.querySelector('.mu-list'), seek = b.querySelector('[data-seek]');
      let dragging = false;
      const draw = () => {
        b.querySelector('[data-title]').textContent = list[st.i] ? list[st.i].t : loaded ? 'Chưa có bài nhạc nào' : 'Đang tải danh sách…';
        b.querySelector('[data-play]').textContent = M.playing() ? '⏸' : '▶';
        b.querySelector('[data-shuf]').classList.toggle('on', st.shuffle);
        b.querySelector('[data-rep]').textContent = st.repeat === 'one' ? '🔂' : '🔁';
        b.querySelector('[data-rep]').title = st.repeat === 'one' ? 'Lặp lại 1 bài' : 'Lặp lại cả danh sách';
        const v = b.querySelector('[data-vol]'); v.value = Math.round(st.vol * 100); v.dispatchEvent(new Event('input', { bubbles: true }));
        listEl.innerHTML = list.length
          ? list.map((t, i) => `<li class="${i === st.i ? 'on' : ''}" data-i="${i}"><span class="mu-n">${i === st.i && M.playing() ? '♪' : i + 1}</span><span class="mu-t">${esc(t.t)}</span>${t.d ? `<span class="mu-d">${esc(t.d)}</span>` : ''}</li>`).join('')
          : loaded ? '<li class="mu-empty">Chưa có bài. Đưa file nhạc lên GitHub Releases rồi báo mình thêm vào danh sách.</li>' : '';
      };
      const tick = () => {
        b.querySelector('[data-cur]').textContent = fmt(a.currentTime || (a.src ? 0 : st.pos));
        b.querySelector('[data-dur]').textContent = fmt(a.duration);
        if (!dragging) { seek.value = isFinite(a.duration) && a.duration ? Math.round((a.currentTime / a.duration) * 1000) : 0; seek.dispatchEvent(new Event('input', { bubbles: true })); }
      };
      b.querySelector('[data-play]').onclick = () => M.toggle();
      b.querySelector('[data-next]').onclick = () => M.next();
      b.querySelector('[data-prev]').onclick = () => M.prev();
      b.querySelector('[data-shuf]').onclick = () => M.setShuffle(!st.shuffle);
      b.querySelector('[data-rep]').onclick = () => M.cycleRepeat();
      b.querySelector('[data-vol]').oninput = (e) => { if (e.isTrusted) M.setVol(e.target.value / 100); };
      seek.oninput = (e) => { if (e.isTrusted) { dragging = true; b.querySelector('[data-cur]').textContent = fmt((seek.value / 1000) * a.duration); } };
      seek.onchange = () => { dragging = false; M.seek((seek.value / 1000) * a.duration); };
      listEl.onclick = (e) => { const li = e.target.closest('[data-i]'); if (li) M.play(+li.dataset.i); };
      const iv = setInterval(tick, 500);
      subs.add(draw); draw(); tick();
      return () => { subs.delete(draw); clearInterval(iv); };
    },
  };
})();
