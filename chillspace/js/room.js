/* ChillSpace — Phòng chung: ngồi làm việc cùng nhau, tương tác bằng emoji & chat (không gọi thoại) */
(function () {
  const { store, esc, toast, uid, debounce, Pomo } = CS;
  const cfg = window.CS_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const SB_LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  const STICKERS = [
    ['📚', 'Học bài'], ['⌨️', 'Gõ phím'], ['💻', 'Code'], ['☕', 'Uống cafe'], ['📖', 'Đọc sách'], ['✍️', 'Viết'],
    ['🎨', 'Vẽ'], ['🎧', 'Nghe nhạc'], ['🧠', 'Suy nghĩ'], ['📞', 'Họp'], ['📊', 'Làm báo cáo'], ['🍜', 'Ăn uống'],
    ['🏃', 'Vận động'], ['😴', 'Nghỉ ngơi'], ['🔥', 'Cày hết sức'], ['🤯', 'Bí ý tưởng'],
  ];
  const REACTS = ['👏', '🔥', '💪', '☕', '❤️', '😂', '🎉', '👀', '🫡', '🥲'];
  const AVATARS = ['🙂', '😎', '🤓', '🥰', '😺', '🐶', '🐼', '🦊', '🐸', '🐧', '🦁', '🐯', '🐨', '🐙', '👻', '🤖', '👽', '🧑‍🎓', '🧑‍💻', '🧑‍🎨', '🦸', '⚽', '🌸', '🌙'];

  let sb = null, libP = null, user = null, profile = null, room = null, channel = null;
  let members = [], messages = [], unread = 0, lastSend = 0, view = 'chat';
  const profiles = {}; // cache user_id -> {name, avatar_emoji, avatar_url}
  const subs = new Set();
  const emit = () => subs.forEach((f) => f());

  /* ---------- kết nối ---------- */
  function lib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = SB_LIB;
      s.onload = res; s.onerror = () => { libP = null; rej(new Error('Không tải được thư viện kết nối – kiểm tra mạng')); };
      document.head.append(s);
    });
    return libP;
  }
  async function init() {
    if (!configured) return false;
    if (sb) return true;
    await lib();
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cs-auth' } });
    const { data } = await sb.auth.getSession();
    if (data.session) { user = data.session.user; await loadProfile(); }
    return true;
  }
  async function ensureUser() {
    if (user) return;
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new Error(/anonymous/i.test(error.message) ? 'Máy chủ chưa bật đăng nhập ẩn danh (Anonymous sign-ins)' : error.message);
    user = data.user;
  }
  async function loadProfile() {
    const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    profile = data; if (data) profiles[user.id] = data;
  }
  const okUrl = (u) => typeof u === 'string' && u.startsWith(cfg.supabaseUrl + '/storage/');

  function squareJpeg(file, size = 256) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement('canvas');
        cv.width = cv.height = size;
        cv.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        cv.toBlob((b) => (b ? res(b) : rej(new Error('Không xử lý được ảnh'))), 'image/jpeg', 0.86);
      };
      img.onerror = () => rej(new Error('Ảnh không hợp lệ'));
      img.src = url;
    });
  }
  async function saveProfile({ name, emoji, file, usePhoto }) {
    await ensureUser();
    let avatar_url = usePhoto ? (profile && profile.avatar_url) || null : null;
    if (usePhoto && file) {
      const blob = await squareJpeg(file);
      const path = `${user.id}/avatar.jpg`;
      const { error } = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      avatar_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
    }
    const row = { id: user.id, name: name.trim().slice(0, 40) || 'Bạn mới', avatar_emoji: emoji, avatar_url, updated_at: new Date().toISOString() };
    const { data, error } = await sb.from('profiles').upsert(row).select().single();
    if (error) throw error;
    profile = data; profiles[user.id] = data;
    if (channel) track();
  }
  async function ensureProfiles(ids) {
    const need = [...new Set(ids)].filter((i) => i && !profiles[i]);
    if (!need.length) return;
    const { data } = await sb.from('profiles').select('id,name,avatar_emoji,avatar_url').in('id', need);
    (data || []).forEach((p) => (profiles[p.id] = p));
  }

  /* ---------- phòng ---------- */
  async function myRooms() {
    const { data } = await sb.from('rooms').select('code,name,space,owner,created_at').order('created_at', { ascending: false }).limit(20);
    return data || [];
  }
  async function createRoom(name) {
    const { data, error } = await sb.rpc('create_room', { p_name: name, p_space: currentSpace().id });
    if (error) throw error;
    await enter(data);
  }
  async function joinRoom(code) {
    const { data, error } = await sb.rpc('join_room', { p_code: code });
    if (error) throw new Error(error.message);
    await enter(data);
  }
  const isOwner = () => !!(room && user && room.owner === user.id);
  const perms = () => (room && room.perms) || { audio: 'owner', users: [] };
  const canAudio = (id) => { id = id || (user && user.id); if (!room || !id) return false; const p = perms(); return room.owner === id || p.audio === 'all' || (p.users || []).includes(id); };
  async function setPerms(p) {
    const { error } = await sb.rpc('set_room_perms', { p_code: room.code, p_perms: p });
    if (error) return toast(error.message);
    room = { ...room, perms: p }; emit(); document.dispatchEvent(new Event('cs:audio'));
  }

  /* ---------- Âm thanh chung của phòng (âm thanh nền + YouTube) ---------- */
  let lastAudio = '', ytNow = null, ytPlaying = null, audioOff = false;
  function applyAudio(a) {
    if (!a || !Object.keys(a).length) return;
    const j = JSON.stringify(a); if (j === lastAudio) return; lastAudio = j;
    if (a.vols) { Sound.init(); Sound.setAllQuiet(a.vols); }
    if (a.yt && a.yt.item && (!ytNow || ytNow.key !== a.yt.key)) { ytNow = a.yt; CS.YTP.remotePlay(a.yt.item); }
    if (typeof a.playing === 'boolean' && a.playing !== ytPlaying) { ytPlaying = a.playing; if (ytNow) CS.YTP.remoteSetPlaying(a.playing); }
    document.dispatchEvent(new Event('cs:audio'));
    setTimeout(checkUnlock, 2000);
  }
  function checkUnlock() {
    let el = document.getElementById('audioUnlock');
    const a = room && room.audio, has = a && ((a.vols && Object.keys(a.vols).length) || a.yt);
    const ytWaiting = room && ytNow && ytPlaying !== false && CS.YTP.state !== 1;
    const need = !!(has && (Sound.needsUnlock() || ytWaiting));
    if (!need) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('button'); el.id = 'audioUnlock'; el.className = 'audio-unlock';
      el.textContent = '🔈 Chạm vào đây để nghe nhạc & âm thanh của phòng';
      el.onclick = () => { Sound.init(); if (ytNow) { if (CS.YTP.player) CS.YTP.remoteSetPlaying(true); else CS.YTP.remotePlay(ytNow.item); } setTimeout(checkUnlock, 1500); };
      document.body.append(el);
    }
  }
  document.addEventListener('cs:unlock', () => setTimeout(checkUnlock, 300));
  const pushAudio = debounce(() => {
    if (!room || !canAudio()) return;
    const a = { vols: Sound.getAll(), yt: ytNow, playing: ytPlaying };
    lastAudio = JSON.stringify(a);
    if (audioOff) return;
    sb.rpc('set_room_audio', { p_code: room.code, p_audio: a }).then(({ error }) => {
      if (!error) return;
      if (/set_room_audio|schema cache|does not exist|PGRST202/i.test(error.message + (error.code || ''))) { audioOff = true; toast('⚠️ Máy chủ chưa cập nhật tính năng âm thanh chung – chạy lại file setup.sql trên Supabase', 8000); }
      else toast(error.message);
    });
  }, 500);
  Sound.onChange = () => { if (room && canAudio()) pushAudio(); };
  CS.YTP.onUser = (item) => { if (room && canAudio()) { ytNow = { item, key: Date.now() }; ytPlaying = true; pushAudio(); } };
  CS.YTP.onState = (st) => { if (room && canAudio() && ytNow && (st === 1 || st === 2)) { ytPlaying = st === 1; pushAudio(); } };

  const statusOf = () => (Pomo.running ? Pomo.mode : 'idle');
  function myState() {
    return {
      id: user.id, name: (profile && profile.name) || 'Bạn mới', emoji: (profile && profile.avatar_emoji) || '🙂',
      url: (profile && profile.avatar_url) || null, status: statusOf(), act: store.get('room.act', '📚'), task: store.get('room.task', ''), since: Date.now(),
      pos: room ? store.get('room.pos.' + room.code, null) : null,
    };
  }
  const track = debounce(() => { if (channel) channel.track(myState()); }, 250);
  let lastStatus = null;
  Pomo.subs.add(() => { const s = statusOf(); if (s !== lastStatus) { lastStatus = s; track(); } });

  async function enter(r) {
    await leave(true);
    room = r; messages = []; members = []; unread = 0; view = 'chat';
    store.set('room.code', r.code);
    if (r.space !== currentSpace().id) window.setSpace(r.space, { remote: true });
    Pomo.applyState(r.pomo);
    lastAudio = ''; ytNow = (r.audio && r.audio.yt) || null; ytPlaying = null;
    if (r.audio && Object.keys(r.audio).length) { const a = r.audio; ytNow = null; applyAudio(a); } // nghe cùng âm thanh của phòng
    else if (r.owner === user.id) pushAudio(); // phòng mới: âm thanh của chủ phòng là âm thanh của phòng
    Pomo.remote = debounce((st) => sb.rpc('set_room_pomo', { p_code: room.code, p_pomo: st }).then(({ error }) => error && toast('Không đồng bộ được Pomodoro: ' + error.message)), 150);
    Pomo.onFocusDone = (min) => sb.from('focus_log').insert({ minutes: min, room: room && room.code }).then(() => {});
    const { data: msgs } = await sb.from('messages').select('*').eq('room', r.code).order('created_at', { ascending: false }).limit(60);
    messages = (msgs || []).reverse();
    await ensureProfiles(messages.map((m) => m.user_id));
    channel = sb.channel('room:' + r.code, { config: { presence: { key: user.id }, broadcast: { self: true } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const st = channel.presenceState();
        members = Object.values(st).map((arr) => arr[arr.length - 1]).filter(Boolean).sort((a, b) => a.since - b.since);
        renderSeats(); emit();
      })
      .on('broadcast', { event: 'react' }, ({ payload }) => floatReact(payload))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room=eq.${r.code}` }, async ({ new: m }) => {
        if (messages.some((x) => x.id === m.id)) return;
        messages.push(m); if (messages.length > 150) messages.shift();
        await ensureProfiles([m.user_id]);
        if (m.kind === 'done') { const seat = document.querySelector(`#seats [data-u="${m.user_id}"]`); const rr = (seat || document.body).getBoundingClientRect(); FX.burst(rr.left + rr.width / 2, rr.top + rr.height / 2); }
        if (m.kind === 'sticker' || m.kind === 'done') floatReact({ e: m.kind === 'done' ? '✅' : m.body, u: m.user_id });
        const winOpen = isOpen();
        if (m.user_id !== user.id && !winOpen) { unread++; const p = profiles[m.user_id]; toast(`${p ? p.name : 'Ai đó'}: ${m.kind === 'done' ? '✅ ' : ''}${m.body}`); }
        emit();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${r.code}` }, ({ new: nr }) => applyRoomRow(nr))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `code=eq.${r.code}` }, () => { toast('Phòng đã bị chủ phòng xoá'); leave(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { lastStatus = statusOf(); channel.track(myState()); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') toast('Mất kết nối phòng, đang thử lại…');
      });
    document.body.classList.add('in-room');
    toast(`Đã vào phòng "${r.name}" 👋`);
    emit();
  }
  function applyRoomRow(nr) {
    if (!room || !nr || nr.code !== room.code) return;
    const permChanged = JSON.stringify(nr.perms) !== JSON.stringify(room.perms), pomoChanged = JSON.stringify(nr.pomo) !== JSON.stringify(room.pomo);
    room = { ...room, ...nr };
    if (nr.audio) applyAudio(nr.audio);
    if (permChanged) { document.dispatchEvent(new Event('cs:audio')); toast(canAudio() ? '🎧 Bạn được chủ phòng cho điều khiển âm thanh' : '🔒 Âm thanh do chủ phòng điều khiển'); }
    if (nr.space && nr.space !== currentSpace().id) { window.setSpace(nr.space, { remote: true }); if (!isOwner()) toast(nr.space === 'borderout' ? '🛫 Chủ phòng chuyển sang Xuất cảnh' : nr.space === 'border' ? '🛬 Chủ phòng chuyển sang Nhập cảnh' : 'Chủ phòng đã chuyển không gian ✨'); }
    if (pomoChanged) Pomo.applyState(nr.pomo);
    emit();
  }
  // dự phòng: hỏi lại máy chủ mỗi 20 giây, phòng khi mất tín hiệu realtime
  setInterval(async () => {
    if (!room || document.hidden || !sb) return;
    const { data } = await sb.from('rooms').select('code,space,pomo,audio,perms,owner,name').eq('code', room.code).maybeSingle();
    if (data) applyRoomRow(data);
  }, 20000);

  // Phòng ở Immigration: chủ phòng (và chỉ chủ phòng) chuyển Nhập ⇄ Xuất cảnh, cả phòng chuyển theo
  const FAMILY = ['border', 'borderout'];
  const sameFamily = (a, b) => FAMILY.includes(a) && FAMILY.includes(b);
  document.addEventListener('cs:space', (ev) => {
    if (!room || ev.detail.remote || !isOwner() || !sameFamily(room.space, ev.detail.id) || ev.detail.id === room.space) return;
    room = { ...room, space: ev.detail.id };
    sb.rpc('set_room_space', { p_code: room.code, p_space: ev.detail.id }).then(({ error }) => error && toast('Không đồng bộ được: ' + error.message));
  });

  async function leave(silent) {
    if (channel) { try { await channel.untrack(); } catch (e) {} sb.removeChannel(channel); channel = null; }
    if (room && !silent) { store.set('room.code', null); toast('Đã rời phòng'); }
    room = null; members = []; Pomo.remote = null; Pomo.onFocusDone = null;
    document.body.classList.remove('in-room');
    renderSeats(); emit();
  }
  async function send(kind, body) {
    if (!room) return;
    body = String(body).trim().slice(0, 300); if (!body) return;
    if (Date.now() - lastSend < 700) return toast('Từ từ thôi nào 😄');
    lastSend = Date.now();
    const { error } = await sb.from('messages').insert({ room: room.code, kind, body });
    if (error) toast('Gửi không được: ' + error.message);
  }
  function react(e) { if (channel) channel.send({ type: 'broadcast', event: 'react', payload: { e, u: user.id } }); }

  // Không gian của phòng cố định từ lúc tạo (muốn đổi thì tạo phòng mới) – không đồng bộ đổi không gian nữa

  /* ---------- hiển thị trong cảnh ---------- */
  const avatarHtml = (p, cls = 'av') => {
    const url = p && (p.url || p.avatar_url);
    return okUrl(url) ? `<span class="${cls}"><img src="${esc(url)}" alt="" loading="lazy"></span>` : `<span class="${cls}">${esc((p && (p.emoji || p.avatar_emoji)) || '🙂')}</span>`;
  };
  let dragging = false;
  function seatXY(m, i, n) {
    const st = document.getElementById('stage').getBoundingClientRect(), p = m.pos;
    let x, y;
    if (p && isFinite(p.x) && isFinite(p.y)) { x = st.left + (p.x / 100) * st.width; y = st.top + (p.y / 100) * st.height; }
    else { const gap = Math.min(110, (innerWidth - 80) / Math.max(n, 1)); x = innerWidth / 2 + (i - (n - 1) / 2) * gap; y = innerWidth <= 720 ? 172 : innerHeight * 0.44; }
    return [Math.max(44, Math.min(innerWidth - 44, x)), Math.max(70, Math.min(innerHeight - 120, y))];
  }
  function renderSeats() {
    const el = document.getElementById('seats');
    if (!room) { el.innerHTML = ''; return; }
    if (dragging) return;
    const label = { focus: 'đang tập trung', break: 'đang nghỉ', idle: 'đang ngồi chill' };
    el.innerHTML = members.map((m, i) => { const [x, y] = seatXY(m, i, members.length), me = m.id === user.id; return `<div class="seat st-${esc(m.status)}${me ? ' me' : ''}" data-u="${esc(m.id)}" style="left:${x}px;top:${y}px;animation-delay:${(i * 0.37) % 3}s">
        ${avatarHtml(m)}<span class="act" title="${esc(m.act)}">${esc(m.act || '')}</span>
        <span class="nm">${esc(m.name)}${me ? ' (bạn)' : ''}${m.id === room.owner ? ' 👑' : ''}</span>
        <span class="tip"><b>${esc(m.name)}</b> ${label[m.status] || ''}${m.task ? `<br>📌 ${esc(m.task)}` : ''}${me ? '<br><i>Kéo để đổi chỗ ngồi</i>' : ''}</span>
      </div>`; }).join('');
    const mine = el.querySelector('.seat.me'); if (mine) mine.onpointerdown = dragSeat;
  }
  function dragSeat(e) {
    const seat = e.currentTarget, ox = e.clientX - parseFloat(seat.style.left), oy = e.clientY - parseFloat(seat.style.top);
    dragging = true; seat.setPointerCapture(e.pointerId); seat.classList.add('dragging'); e.preventDefault();
    seat.onpointermove = (ev) => { seat.style.left = Math.max(44, Math.min(innerWidth - 44, ev.clientX - ox)) + 'px'; seat.style.top = Math.max(70, Math.min(innerHeight - 120, ev.clientY - oy)) + 'px'; };
    seat.onpointerup = seat.onpointercancel = () => {
      seat.onpointermove = seat.onpointerup = seat.onpointercancel = null; seat.classList.remove('dragging'); dragging = false;
      const st = document.getElementById('stage').getBoundingClientRect();
      const pos = { x: Math.round(((parseFloat(seat.style.left) - st.left) / st.width) * 1000) / 10, y: Math.round(((parseFloat(seat.style.top) - st.top) / st.height) * 1000) / 10 };
      store.set('room.pos.' + room.code, pos);
      const me = members.find((m) => m.id === user.id); if (me) me.pos = pos;
      track();
    };
  }
  addEventListener('resize', () => renderSeats());
  function floatReact({ e, u }) {
    if (typeof e !== 'string' || e.length > 16) return;
    const seat = document.querySelector(`#seats [data-u="${CSS.escape(String(u))}"]`);
    const r = seat ? seat.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'float-react'; s.textContent = e;
      s.style.left = r.left + r.width / 2 + (Math.random() - 0.5) * 40 + 'px'; s.style.top = r.top + 'px';
      s.style.animationDelay = i * 0.12 + 's';
      document.body.append(s); setTimeout(() => s.remove(), 2400);
    }
  }

  /* ---------- cửa sổ Phòng chung ---------- */
  const isOpen = () => { const w = document.querySelector('.win[data-tool="room"]'); return !!(w && !w.hidden && !w.classList.contains('collapsed')); };
  document.addEventListener('cs:win', (e) => { if (e.detail.key === 'room') { if (!e.detail.collapsed) unread = 0; updateBadge(); } });
  const errMsg = (e) => (e && e.message) || String(e);

  TOOLS.room = {
    title: 'Phòng chung', icon: '👥', width: 400, global: true, place: 'right', collapse: true,
    render(b) {
      b.closest('.win').dataset.tool = 'room';
      const draw = () => { if (b._lock) return; try { paint(b); } catch (e) { b.innerHTML = `<p class="empty">Lỗi: ${esc(errMsg(e))}</p>`; } };
      b.innerHTML = '<p class="empty">Đang kết nối…</p>';
      if (!configured) { paintUnconfigured(b); return; }
      init().then(() => { draw(); subs.add(draw); }).catch((e) => (b.innerHTML = `<p class="empty">${esc(errMsg(e))}</p>`));
      unread = 0; setTimeout(updateBadge, 0);
      return () => subs.delete(draw);
    },
  };
  function paintUnconfigured(b) {
    b.innerHTML = `<div class="room-hero">👥</div><p><b>Phòng chung</b> – ngồi làm việc cùng bạn bè online: chung Pomodoro, thả emoji, chat, xem ai đang làm gì.</p>
      <p class="muted small">App chưa được kết nối máy chủ. Người cài đặt app cần điền <code>js/config.js</code> (xem <code>supabase/HUONG-DAN.md</code>).</p>`;
  }

  function paint(b) {
    if (!profile) return paintProfile(b);
    if (!room) return paintLobby(b);
    paintRoom(b);
  }

  function paintProfile(b, editing) {
    b._lock = true;
    let emoji = (profile && profile.avatar_emoji) || '🙂', usePhoto = !!(profile && profile.avatar_url), file = null;
    b.innerHTML = `${!editing && pendingCode ? `<p class="invite">🔗 Bạn được mời vào phòng <b>${esc(pendingCode)}</b>. Đặt tên rồi bấm <b>Vào phòng</b>.</p>` : ''}<p><b>${editing ? 'Sửa hồ sơ' : 'Chào bạn! Mọi người sẽ thấy bạn thế này:'}</b></p>
      <div class="prof-prev"><span class="av big" data-prev></span><input data-name maxlength="40" placeholder="Tên hiển thị" value="${esc((profile && profile.name) || store.get('room.name', ''))}"></div>
      <div class="tabs"><button data-m="emoji">😀 Emoji</button><button data-m="photo">📷 Ảnh thật</button></div>
      <div data-pane></div>
      <div class="row sticky-actions"><span class="grow"></span>${editing ? '<button class="btn" data-cancel>Huỷ</button>' : ''}<button class="btn primary" data-save>${!editing && pendingCode ? '👉 Vào phòng' : 'Lưu & tiếp tục'}</button></div>
      <p class="muted small">Không cần email hay mật khẩu. Ảnh chỉ dùng làm ảnh đại diện trong phòng.</p>`;
    const prev = b.querySelector('[data-prev]'), pane = b.querySelector('[data-pane]');
    let previewUrl = usePhoto ? profile.avatar_url : null;
    const showPrev = () => { prev.innerHTML = usePhoto && previewUrl ? `<img src="${esc(previewUrl)}" alt="">` : esc(emoji); };
    const drawPane = () => {
      b.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', (x.dataset.m === 'photo') === usePhoto));
      pane.innerHTML = usePhoto
        ? `<label class="btn" style="width:100%">📷 Chụp / chọn ảnh<input type="file" accept="image/*" hidden data-file></label>`
        : `<div class="emoji-grid">${AVATARS.map((a) => `<button data-e="${a}" class="${a === emoji ? 'on' : ''}">${a}</button>`).join('')}</div>`;
      if (usePhoto) pane.querySelector('[data-file]').onchange = (e) => { file = e.target.files[0]; if (file) { previewUrl = URL.createObjectURL(file); showPrev(); } };
      else pane.querySelectorAll('[data-e]').forEach((x) => (x.onclick = () => { emoji = x.dataset.e; drawPane(); showPrev(); }));
      showPrev();
    };
    b.querySelectorAll('[data-m]').forEach((x) => (x.onclick = () => { usePhoto = x.dataset.m === 'photo'; drawPane(); }));
    if (editing) b.querySelector('[data-cancel]').onclick = () => { b._lock = false; paint(b); };
    b.querySelector('[data-save]').onclick = async (ev) => {
      const name = b.querySelector('[data-name]').value.trim();
      if (!name) return b.querySelector('[data-name]').focus();
      if (usePhoto && !file && !(profile && profile.avatar_url)) return toast('Chọn một tấm ảnh trước đã 📷');
      ev.target.disabled = true; ev.target.textContent = 'Đang lưu…';
      try { store.set('room.name', name); await saveProfile({ name, emoji, file, usePhoto }); b._lock = false; await afterProfile(); paint(b); }
      catch (e) { toast(errMsg(e), 6000); ev.target.disabled = false; ev.target.textContent = 'Lưu & tiếp tục'; }
    };
    drawPane();
  }

  async function paintLobby(b) {
    b.innerHTML = `<div class="row me-row">${avatarHtml(profile, 'av')}<b class="grow">${esc(profile.name)}</b><button class="btn ghost" data-edit>✏️ Sửa</button></div>
      <h4>Tạo phòng mới</h4>
      <form class="row" data-create><input class="grow" name="n" maxlength="60" placeholder="Tên phòng, vd: Ôn thi cuối kỳ" required><button class="btn primary">＋ Tạo</button></form>
      <p class="muted small">🔒 Phòng dùng cố định không gian bạn đang ngồi: <b>${currentSpace().emoji} ${esc(currentSpace().name)}</b>. Muốn không gian khác thì chuyển không gian trước rồi mới tạo phòng.</p>
      <h4>Vào phòng bằng mã</h4>
      <form class="row" data-join><input class="grow code-in" name="c" maxlength="6" placeholder="VD: K7M2QX" autocapitalize="characters" required><button class="btn">Vào</button></form>
      <h4>Phòng của tôi</h4><ul class="rooms" data-list><li class="empty">Đang tải…</li></ul>`;
    b.querySelector('[data-edit]').onclick = () => paintProfile(b, true);
    const busy = (f) => async (e) => { e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; try { await f(e.target); } catch (er) { toast(errMsg(er), 6000); } btn.disabled = false; };
    b.querySelector('[data-create]').onsubmit = busy((f) => createRoom(f.n.value));
    b.querySelector('[data-join]').onsubmit = busy((f) => joinRoom(f.c.value));
    const list = await myRooms();
    const ul = b.querySelector('[data-list]'); if (!ul) return;
    const sp = (id) => (SPACES.find((s) => s.id === id) || SPACES[0]);
    ul.innerHTML = list.map((r) => `<li data-c="${esc(r.code)}"><span>${sp(r.space).emoji}</span><span class="grow"><b>${esc(r.name)}</b><small>${esc(r.code)}${r.owner === user.id ? ' · bạn là chủ phòng' : ''}</small></span><span class="muted">›</span></li>`).join('') || '<li class="empty">Chưa có phòng nào. Tạo một phòng rồi gửi mã cho bạn bè nhé!</li>';
    ul.onclick = async (e) => { const li = e.target.closest('[data-c]'); if (li) { try { await joinRoom(li.dataset.c); } catch (er) { toast(errMsg(er)); } } };
  }

  function paintRoom(b) {
    const keep = b.querySelector('[data-msg]'), draft = keep ? keep.value : '', hadFocus = keep && document.activeElement === keep;
    const tk = b.querySelector('[data-task]'), taskDraft = tk ? tk.value : null, taskFocus = tk && document.activeElement === tk;
    const listEl0 = b.querySelector('.chat'); const atBottom = !listEl0 || listEl0.scrollHeight - listEl0.scrollTop - listEl0.clientHeight < 40;
    const act = store.get('room.act', '📚');
    const p = Pomo;
    b.innerHTML = `<div class="room-head"><div class="grow"><b>${esc(room.name)}</b><small>🔒 ${currentSpace().emoji} ${esc(currentSpace().name)} · ${members.length} người đang ngồi</small></div>
        <button class="chip code" data-copy title="Bấm để mời bạn">🔗 ${esc(room.code)}</button><button class="btn ghost" data-leave title="Rời phòng">🚪</button></div>
      <div class="room-pomo st-${p.running ? p.mode : 'idle'}"><span class="t">${CS.mmss(p.remain)}</span><span class="grow small">${p.running ? (p.mode === 'focus' ? '🍅 Cả phòng đang tập trung' : '☕ Cả phòng đang nghỉ') : '⏸ Pomodoro chung'}</span>
        <button class="btn ghost" data-pomo>${p.running ? '⏸' : '▶'}</button><button class="btn ghost" data-pomo-open title="Chỉnh thời lượng">⚙️</button></div>
      <div class="stickers">${STICKERS.map(([e, n]) => `<button data-act="${e}" class="${e === act ? 'on' : ''}" title="${n}">${e}<small>${n}</small></button>`).join('')}</div>
      <input data-task maxlength="80" placeholder="📌 Mình đang làm… (mọi người sẽ thấy)" value="${esc(store.get('room.task', ''))}">
      <div class="tabs"><button data-v="chat">💬 Chat</button><button data-v="people">👥 Mọi người (${members.length})</button><button data-v="top">🏆 Tuần này</button></div>
      <div data-view></div>`;
    b.querySelectorAll('[data-v]').forEach((x) => { x.classList.toggle('on', x.dataset.v === view); x.onclick = () => { view = x.dataset.v; paint(b); }; });
    b.querySelector('[data-copy]').onclick = invite;
    b.querySelector('[data-leave]').onclick = () => { if (confirm('Rời phòng này?')) leave(); };
    b.querySelector('[data-pomo]').onclick = () => (Pomo.running ? Pomo.pause() : Pomo.start());
    b.querySelector('[data-pomo-open]').onclick = () => WM.open('pomodoro');
    b.querySelectorAll('[data-act]').forEach((x) => (x.onclick = () => { store.set('room.act', x.dataset.act); track(); send('sticker', x.dataset.act); paint(b); }));
    const task = b.querySelector('[data-task]');
    if (taskDraft != null) task.value = taskDraft; if (taskFocus) task.focus();
    task.onchange = () => { store.set('room.task', task.value.trim()); track(); };
    task.onkeydown = (e) => { if (e.key === 'Enter') task.blur(); };
    const v = b.querySelector('[data-view]');
    if (view === 'chat') {
      v.innerHTML = `<ul class="chat">${messages.map(msgHtml).join('') || '<li class="empty">Chưa có tin nhắn. Chào mọi người một tiếng đi 👋</li>'}</ul>
        <div class="reacts">${REACTS.map((e) => `<button data-r="${e}">${e}</button>`).join('')}</div>
        <div class="sticky-actions col"><form class="row" data-send><input class="grow" data-msg maxlength="300" placeholder="Nhắn gì đó…"><button class="btn primary">➤</button></form>
        <button class="btn done-btn" data-done>✅ Mình vừa xong một việc!</button></div>`;
      const ul = v.querySelector('.chat'); if (atBottom) ul.scrollTop = ul.scrollHeight; else if (listEl0) ul.scrollTop = listEl0.scrollTop;
      const input = v.querySelector('[data-msg]'); input.value = draft; if (hadFocus) input.focus();
      v.querySelector('[data-send]').onsubmit = (e) => { e.preventDefault(); const t = input.value; input.value = ''; send('chat', t); };
      v.querySelectorAll('[data-r]').forEach((x) => (x.onclick = () => react(x.dataset.r)));
      v.querySelector('[data-done]').onclick = () => { const t = store.get('room.task', ''); send('done', t ? `Xong: ${t}` : 'Vừa xong một việc!'); };
    } else if (view === 'people') {
      const label = { focus: '🍅 tập trung', break: '☕ nghỉ', idle: '😌 chill' };
      const P = perms(), own = isOwner();
      v.innerHTML = `<div class="perm"><b>🎧 Nhạc & âm thanh của phòng</b>${own ? `<div class="chips"><button class="chip${P.audio !== 'all' ? ' on' : ''}" data-pa="owner">Chủ phòng + người được chọn</button><button class="chip${P.audio === 'all' ? ' on' : ''}" data-pa="all">Tất cả thành viên</button></div>` : `<small>${canAudio() ? '✅ Bạn được điều khiển âm thanh của phòng' : '🔒 Do chủ phòng điều khiển – mọi người nghe chung'}</small>`}</div>
        <ul class="people">${members.map((m) => `<li>${avatarHtml(m)}<span class="grow"><b>${esc(m.name)}${m.id === user.id ? ' (bạn)' : ''}${m.id === room.owner ? ' 👑' : ''}${m.id !== room.owner && canAudio(m.id) ? ' 🎧' : ''}</b><small>${esc(m.act || '')} ${label[m.status] || ''}${m.task ? ' · ' + esc(m.task) : ''}</small></span>${own && m.id !== room.owner ? (P.audio === 'all' ? '<span class="muted small">🎧 được</span>' : `<button class="chip${(P.users || []).includes(m.id) ? ' on' : ''}" data-pu="${esc(m.id)}">${(P.users || []).includes(m.id) ? '🎧 Đang cho phép' : '🎧 Cho phép'}</button>`) : ''}</li>`).join('')}</ul>
        <button class="btn ghost" data-edit>✏️ Sửa hồ sơ của tôi</button>`;
      v.querySelector('[data-edit]').onclick = () => paintProfile(b, true);
      v.querySelectorAll('[data-pa]').forEach((x) => (x.onclick = () => setPerms({ ...P, audio: x.dataset.pa })));
      v.querySelectorAll('[data-pu]').forEach((x) => (x.onclick = () => { const id = x.dataset.pu, us = new Set(P.users || []); us.has(id) ? us.delete(id) : us.add(id); setPerms({ ...P, users: [...us] }); }));
    } else {
      v.innerHTML = '<p class="empty">Đang tải…</p>';
      sb.rpc('leaderboard', { p_code: room.code }).then(({ data, error }) => {
        if (!v.isConnected) return;
        if (error) { v.innerHTML = `<p class="empty">${esc(error.message)}</p>`; return; }
        const medal = ['🥇', '🥈', '🥉'];
        v.innerHTML = `<ul class="people">${(data || []).map((r, i) => `<li><span class="rank">${medal[i] || i + 1}</span>${avatarHtml(r)}<span class="grow"><b>${esc(r.name)}</b></span><b>${Math.floor(r.minutes / 60)}h${String(r.minutes % 60).padStart(2, '0')}</b></li>`).join('')}</ul>
          <p class="muted small">Tính số phút tập trung trọn phiên Pomodoro từ thứ Hai tuần này.</p>`;
      });
    }
  }
  function msgHtml(m) {
    const p = profiles[m.user_id] || {}, mine = user && m.user_id === user.id;
    const time = new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    if (m.kind === 'sticker') return `<li class="sys">${avatarHtml(p, 'av sm')} <b>${esc(p.name || 'Ai đó')}</b> đang <span class="big-e">${esc(m.body)}</span> ${esc((STICKERS.find((s) => s[0] === m.body) || [, ''])[1].toLowerCase())} <small>${time}</small></li>`;
    if (m.kind === 'done') return `<li class="sys done">${avatarHtml(p, 'av sm')} <b>${esc(p.name || 'Ai đó')}</b> ✅ ${esc(m.body)} 🎉 <small>${time}</small></li>`;
    return `<li class="${mine ? 'mine' : ''}">${mine ? '' : avatarHtml(p, 'av sm')}<div class="bubble">${mine ? '' : `<b>${esc(p.name || 'Ai đó')}</b>`}${esc(m.body)}<small>${time}</small></div></li>`;
  }
  async function invite() {
    const url = location.origin + location.pathname + '?room=' + room.code;
    const text = `Vào ngồi làm việc chung với mình ở ChillSpace nhé! Phòng "${room.name}" – mã ${room.code}`;
    try { if (navigator.share) return await navigator.share({ title: 'ChillSpace', text, url }); } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Đã copy link mời – dán gửi bạn bè nhé 📋'); } catch (e) { prompt('Copy link này gửi bạn bè:', url); }
  }

  function updateBadge() { document.body.classList.toggle('room-open', isOpen()); const t = document.querySelector('.win[data-tool="room"] .win-title'); if (t) t.textContent = `Phòng chung${room ? ` · ${members.length} người` : ''}${unread ? ` · 💬 ${unread} tin mới` : ''}`;
    const el = document.getElementById('roomBadge'); if (el) { el.textContent = unread > 9 ? '9+' : unread; el.hidden = !unread; } }
  subs.add(updateBadge);
  Pomo.subs.add(debounce(() => { if (room && isOpen()) { const t = document.querySelector('.room-pomo .t'); if (t) t.textContent = CS.mmss(Pomo.remain); } }, 0));
  let lastPomoKey = '';
  Pomo.subs.add(() => { const k = Pomo.running + Pomo.mode; if (room && k !== lastPomoKey) { lastPomoKey = k; emit(); } });

  /* ---------- khởi động: vào lại phòng cũ hoặc theo link mời ---------- */
  let pendingCode = null;
  async function afterProfile() {
    const code = pendingCode || store.get('room.code', null);
    pendingCode = null;
    if (code && !room) { try { await joinRoom(code); } catch (e) { toast(errMsg(e)); store.set('room.code', null); } }
  }
  async function boot() {
    const q = new URLSearchParams(location.search).get('room');
    if (q && /^[A-Za-z0-9]{6}$/.test(q)) { pendingCode = q.toUpperCase(); history.replaceState(null, '', location.pathname); }
    if (!configured) { if (pendingCode) WM.open('room'); return; }
    if (!pendingCode && !store.get('room.code', null)) return;
    try {
      await init();
      if (!profile) { WM.open('room'); return; }
      await afterProfile();
      if (room) WM.open('room');
    } catch (e) { toast(errMsg(e)); }
  }

  // dùng chung kết nối cho phần khác (vd. quyền Immigration). create=false: chỉ dùng khi máy đã có tài khoản, không tạo mới
  async function client(create) { if (!(await init())) return null; if (!user) { if (!create) return null; await ensureUser(); } return sb; }
  window.Room = { boot, configured, client, uid: () => user && user.id, myName: () => (profile && profile.name) || '', get room() { return room; }, lockSpace: (id) => !!room && !(isOwner() && sameFamily(room.space, id)), audioLocked: () => !!room && !canAudio(), isOwner };
})();
