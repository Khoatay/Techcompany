/* ChillSpace — 🧩 Ứng dụng của tôi (chỉ có trong app máy tính).
   Mỗi không gian có danh sách riêng: chương trình trên máy (MT5, Excel…) hoặc trang web (Notion, TradingView…). */
(function () {
  const D = window.desktop;
  if (!D || !D.isDesktop || !window.TOOLS) return;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cs:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cs:' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { const el = document.getElementById('toast'); if (!el) return; el.textContent = m; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200); };
  const key = () => 'myapps:' + ((window.currentSpace && currentSpace().parent) || (window.currentSpace && currentSpace().id) || 'all');

  // hiện nút 🧩 trên thanh trên cùng
  const showBtn = () => { const b = document.getElementById('myappsBtn'); if (b) b.hidden = false; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBtn); else showBtn();

  TOOLS.myapps = {
    title: 'Ứng dụng của tôi', icon: '🧩', width: 420, global: true,
    render(b) {
      let exe = [];
      const draw = async () => {
        exe = await D.listApps();
        const sp = window.currentSpace && currentSpace();
        const items = store.get(key(), []).map((it) => (it.t === 'exe' ? { ...it, a: exe.find((x) => x.id === it.id) } : it)).filter((it) => it.t === 'web' || it.a);
        b.innerHTML = `<p class="muted small">Ứng dụng riêng cho <b>${esc(sp ? sp.name : '')}</b>. Bấm để mở; chuột phải để đổi tên / bỏ.</p>
          <div class="ma-grid">${items.map((it, i) => `<button class="ma-tile" data-i="${i}" title="${esc(it.t === 'web' ? it.url : it.a.path)}">
              ${it.t === 'web' ? '<span class="ma-ico">🌐</span>' : it.a.icon ? `<img class="ma-img" src="${it.a.icon}" alt="">` : '<span class="ma-ico">🖥️</span>'}
              <span class="ma-nm">${esc(it.t === 'web' ? it.name : it.a.name)}</span></button>`).join('')}
            <button class="ma-tile ma-add" data-add="exe"><span class="ma-ico">＋</span><span class="ma-nm">Chương trình</span></button>
            <button class="ma-tile ma-add" data-add="web"><span class="ma-ico">＋</span><span class="ma-nm">Trang web</span></button></div>
          <form class="ma-web" hidden><input name="name" placeholder="Tên (vd. Notion)" maxlength="30"><input name="url" placeholder="https://…" autocomplete="off"><button class="btn primary">Thêm</button></form>`;
        b.querySelectorAll('.ma-tile[data-i]').forEach((t) => {
          const it = items[+t.dataset.i];
          t.onclick = async () => {
            if (it.t === 'web') { D.openWeb(it.url, it.name); return; }
            const err = await D.openApp(it.id); if (err) toast('Không mở được: ' + err);
          };
          t.oncontextmenu = async (e) => {
            e.preventDefault();
            const cur = it.t === 'web' ? it.name : it.a.name;
            const nm = prompt('Đổi tên (để trống rồi OK = bỏ khỏi không gian này):', cur); if (nm == null) return;
            const list = store.get(key(), []);
            if (!nm.trim()) { store.set(key(), list.filter((x) => !(x.t === it.t && (x.t === 'web' ? x.url === it.url : x.id === it.id)))); }
            else if (it.t === 'web') { const x = list.find((y) => y.t === 'web' && y.url === it.url); if (x) x.name = nm.trim(); store.set(key(), list); }
            else await D.renameApp(it.id, nm.trim());
            draw();
          };
        });
        b.querySelector('[data-add=exe]').onclick = async () => {
          const a = await D.pickApp(); if (!a) return;
          const list = store.get(key(), []); if (!list.some((x) => x.t === 'exe' && x.id === a.id)) list.push({ t: 'exe', id: a.id }); store.set(key(), list); draw();
        };
        const f = b.querySelector('.ma-web');
        b.querySelector('[data-add=web]').onclick = () => { f.hidden = !f.hidden; if (!f.hidden) f.name.focus(); };
        f.onsubmit = (e) => {
          e.preventDefault();
          let url = f.url.value.trim(); if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
          try { new URL(url); } catch (x) { return toast('Link không hợp lệ'); }
          const name = f.name.value.trim() || new URL(url).hostname.replace(/^www\./, '');
          const list = store.get(key(), []); list.push({ t: 'web', url, name }); store.set(key(), list); draw();
        };
      };
      const on = () => draw();
      document.addEventListener('cs:space', on);
      draw();
      return () => document.removeEventListener('cs:space', on);
    },
  };
})();
