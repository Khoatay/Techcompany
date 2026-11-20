/* ChillSpace — Không gian riêng "Immigration" (Nhập cảnh + Xuất cảnh).
   Chỉ chủ app và người được cấp mã mời mới vào được; người khác thấy cảnh bị làm mờ, chỉ hiện tên.
   Quyền + link Google Sheet lịch bay nằm trên máy chủ (Supabase, xem supabase/vip.sql), không nằm trong code. */
window.Vip = (function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cs:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, ms = 3500) => { const el = document.getElementById('toast'); if (!el) return; el.textContent = m; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), ms); };
  const FAMILY = ['border', 'borderout'];
  const isPrivate = (sp) => !!sp && (FAMILY.includes(sp.id) || FAMILY.includes(sp.parent));

  let st = Object.assign({ member: false, admin: false, has_admin: true, checked: false }, store.get('vip', {}));
  let conf = {};
  const subs = new Set();
  const emit = () => { store.set('vip', { member: st.member, admin: st.admin, has_admin: st.has_admin }); applyLock(); subs.forEach((f) => f()); };
  const sb = (create) => (window.Room && Room.configured ? Room.client(create) : Promise.resolve(null));

  async function refresh(create) {
    try {
      const c = await sb(create); if (!c) return;
      const { data, error } = await c.rpc('vip_status'); if (error) throw error;
      const was = st.member;
      st = { ...data, checked: true };
      if (st.member) await loadConfig(c);
      else if (was && st.has_admin) forget(); // bị thu hồi quyền → xoá link lịch bay trên máy này
      emit();
    } catch (e) { console.warn('vip', e); }
  }
  async function loadConfig(c) {
    const { data } = await c.from('vip_config').select('key,value');
    conf = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    if (conf.sheet_url && conf.sheet_url !== store.get('fl.sheet', '')) {
      store.set('fl.sheet', conf.sheet_url);
      if (window.Flights) { Flights.cache = null; if (window.FlightsOut) FlightsOut.cache = null; Flights.load(true); }
    }
  }
  function forget() { store.set('fl.sheet', ''); store.set('fl.cache', null); store.set('fl.cacheD', null); if (window.Flights) Flights.cache = null; if (window.FlightsOut) FlightsOut.cache = null; conf = {}; }

  /* ---------- làm mờ khi chưa có quyền ---------- */
  const lock = document.createElement('div');
  lock.id = 'vipLock'; lock.hidden = true;
  lock.innerHTML = `<div class="vl-card"><div class="vl-ico">🔒</div><h2>🛬 Immigration space</h2>
    <p>Không gian riêng — chỉ người được chủ app cấp quyền mới vào được.</p>
    <form class="vl-form"><input name="name" placeholder="Tên của bạn" maxlength="40" autocomplete="nickname"><input name="code" placeholder="Mã mời (8 ký tự)" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn primary">🔑 Vào không gian</button></form>
    <button class="btn ghost small" data-owner hidden>👑 Tôi là chủ app — nhận quyền quản lý</button>
    <p class="vl-err" aria-live="polite"></p></div>`;
  const mount = () => { if (!lock.isConnected) document.body.append(lock); };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  const err = (m) => (lock.querySelector('.vl-err').textContent = m || '');
  lock.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, code = f.code.value.trim(), name = f.name.value.trim();
    if (!code) return err('Nhập mã mời chủ app gửi cho bạn');
    err('Đang kiểm tra…');
    try {
      const c = await sb(true); if (!c) return err('Chưa kết nối được máy chủ');
      const { data, error } = await c.rpc('vip_redeem', { p_code: code, p_name: name || (window.Room && Room.myName()) || '' });
      if (error) throw error;
      if (!data) return err('Mã không đúng hoặc đã được dùng');
      err(''); f.reset(); await refresh(); toast('✅ Đã vào Immigration space');
    } catch (x) { err(x.message || String(x)); }
  };
  lock.querySelector('[data-owner]').onclick = async () => {
    try {
      const c = await sb(true); const name = lock.querySelector('[name=name]').value.trim() || (window.Room && Room.myName()) || 'Chủ app';
      const { data, error } = await c.rpc('vip_claim_owner', { p_name: name }); if (error) throw error;
      if (!data) { err('Hệ thống đã có chủ. Hãy xin mã mời.'); return refresh(); }
      await refresh();
      const sh = store.get('fl.sheet', ''); if (sh) await api.setConfig('sheet_url', sh); // đưa link lịch bay đang dùng lên máy chủ
      toast('👑 Bạn là chủ app. Tạo mã mời ở nút 👑 góc trên bên trái', 6000);
    } catch (x) { err(x.message || String(x)); }
  };

  let asked = false;
  function applyLock() {
    const sp = window.currentSpace && currentSpace();
    const locked = isPrivate(sp) && !st.member;
    document.body.classList.toggle('vip-lock', locked);
    lock.hidden = !locked;
    lock.querySelector('[data-owner]').hidden = !(st.checked && !st.has_admin);
    document.querySelectorAll('#dock [data-id="border"], #welcome [data-id="border"]').forEach((b) => b.classList.toggle('vip-locked', !st.member));
    const vb = document.getElementById('vipBtn'); if (vb) vb.hidden = !st.admin;
    if (locked && !asked) { asked = true; refresh(true); } // mở trang khoá lần đầu: hỏi máy chủ xem đã có chủ chưa
  }
  document.addEventListener('cs:space', applyLock);
  addEventListener('load', () => { applyLock(); refresh(false); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
  setInterval(() => refresh(false), 10 * 60000);

  const api = {
    member: () => st.member, admin: () => st.admin, conf: () => conf, subs, refresh, isPrivate,
    async setConfig(key, value) {
      const c = await sb(false); if (!c) throw new Error('Chưa kết nối máy chủ');
      const { error } = await c.from('vip_config').upsert({ key, value, updated_at: new Date().toISOString() }); if (error) throw error;
      conf[key] = value;
    },
    async createCode(admin, note) { const c = await sb(false); const { data, error } = await c.rpc('vip_create_code', { p_admin: !!admin, p_note: note || '' }); if (error) throw error; return data; },
    async codes() { const c = await sb(false); const { data, error } = await c.from('vip_codes').select('*').is('used_by', null).order('created_at', { ascending: false }); if (error) throw error; return data || []; },
    async deleteCode(code) { const c = await sb(false); const { error } = await c.from('vip_codes').delete().eq('code', code); if (error) throw error; },
    async members() { const c = await sb(false); const { data, error } = await c.from('vip_members').select('*').order('added_at'); if (error) throw error; return data || []; },
    async revoke(uid) { const c = await sb(false); const { error } = await c.from('vip_members').delete().eq('user_id', uid); if (error) throw error; },
    me: () => window.Room && Room.uid(),
  };

  /* ---------- 👑 Quản lý quyền (chỉ người quản lý) ---------- */
  if (window.TOOLS) {
    TOOLS.vip = {
      title: 'Quyền Immigration', icon: '👑', width: 420, global: true,
      render(b) {
        let lastCode = '';
        const draw = async () => {
          if (!st.admin) { b.innerHTML = '<p class="muted">Chỉ người quản lý mới xem được trang này.</p>'; return; }
          b.innerHTML = `<p class="muted small">Người chưa có quyền chỉ thấy Immigration bị làm mờ. Gửi mã mời cho người bạn muốn cho vào; mỗi mã dùng 1 lần, nhập 1 lần trên mỗi máy.</p>
            <h4>🔑 Tạo mã mời</h4>
            <div class="row wrap"><input class="grow" data-note placeholder="Ghi chú (vd. tên người nhận)" maxlength="60"><label class="small"><input type="checkbox" data-adm> Cho quyền quản lý</label><button class="btn primary" data-new>Tạo mã</button></div>
            ${lastCode ? `<div class="vip-code"><b>${esc(lastCode)}</b><button class="btn ghost small" data-copy>📋 Chép</button></div>` : ''}
            <h4>⏳ Mã chưa dùng</h4><ul class="vip-list" data-codes><li class="muted">Đang tải…</li></ul>
            <h4>👥 Người có quyền</h4><ul class="vip-list" data-mem><li class="muted">Đang tải…</li></ul>
            <h4>📄 Link Google Sheet lịch bay</h4>
            <div class="row"><input class="grow" data-sheet placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(conf.sheet_url || store.get('fl.sheet', ''))}"><button class="btn" data-save>Lưu</button></div>
            <p class="muted small">Lưu trên máy chủ, chỉ người có quyền đọc được. Ai có quyền mở app là tự có lịch bay.</p>`;
          const q = (s) => b.querySelector(s);
          q('[data-new]').onclick = async () => { try { lastCode = await api.createCode(q('[data-adm]').checked, q('[data-note]').value.trim()); draw(); } catch (x) { toast(x.message); } };
          if (q('[data-copy]')) q('[data-copy]').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(lastCode).then(() => toast('Đã chép mã')); };
          q('[data-save]').onclick = async () => { const v = q('[data-sheet]').value.trim(); if (v && !/docs\.google\.com\/spreadsheets\/d\//.test(v)) return toast('Link Google Sheet không hợp lệ'); try { await api.setConfig('sheet_url', v); store.set('fl.sheet', v); if (window.Flights) { Flights.cache = null; Flights.load(true); } toast('Đã lưu link lịch bay'); } catch (x) { toast(x.message); } };
          try {
            const [codes, mem] = await Promise.all([api.codes(), api.members()]);
            q('[data-codes]').innerHTML = codes.length ? codes.map((c) => `<li><b class="mono">${esc(c.code)}</b><span class="grow">${esc(c.note)}${c.is_admin ? ' · 👑 quản lý' : ''}</span><button class="btn ghost small" data-delc="${esc(c.code)}">Huỷ</button></li>`).join('') : '<li class="muted">Không có</li>';
            q('[data-mem]').innerHTML = mem.map((m) => `<li><span class="grow">${m.is_admin ? '👑 ' : ''}${esc(m.name || 'Không tên')}${m.user_id === api.me() ? ' <small class="muted">(máy này)</small>' : ''}<small class="muted"> · từ ${new Date(m.added_at).toLocaleDateString('vi-VN')}</small></span>${m.user_id === api.me() ? '' : `<button class="btn ghost small" data-rev="${esc(m.user_id)}">Thu hồi</button>`}</li>`).join('');
            b.querySelectorAll('[data-delc]').forEach((x) => (x.onclick = async () => { await api.deleteCode(x.dataset.delc); draw(); }));
            b.querySelectorAll('[data-rev]').forEach((x) => (x.onclick = async () => { if (!confirm('Thu hồi quyền vào Immigration của người này?')) return; try { await api.revoke(x.dataset.rev); draw(); } catch (y) { toast(y.message); } }));
          } catch (x) { q('[data-codes]').innerHTML = `<li class="muted">${esc(x.message)}</li>`; }
        };
        subs.add(draw); draw();
        return () => subs.delete(draw);
      },
    };
  }
  return api;
})();
