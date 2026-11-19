/* ChillSpace — công cụ chuyên dụng: lưu trú, lịch âm dương, đồng hồ thế giới, trader */
/* Âm lịch Việt Nam (thuật toán Hồ Ngọc Đức, múi giờ +7) */
const Lunar = (() => {
  const PI = Math.PI, INT = Math.floor;
  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function newMoon(k, tz) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr) - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr)) - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr)) + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return INT(Jd1 + C1 - deltat + 0.5 + tz / 24);
  }
  function sunLong(jdn, tz) {
    const T = (jdn - 2451545.5 - tz / 24) / 36525, T2 = T * T, dr = PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr; L -= PI * 2 * INT(L / (PI * 2));
    return INT((L / PI) * 6);
  }
  function month11(yy, tz) {
    const k = INT((jdFromDate(31, 12, yy) - 2415021) / 29.530588853);
    let nm = newMoon(k, tz);
    if (sunLong(nm, tz) >= 9) nm = newMoon(k - 1, tz);
    return nm;
  }
  function leapOffset(a11, tz) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1, arc = sunLong(newMoon(k + i, tz), tz);
    do { last = arc; i++; arc = sunLong(newMoon(k + i, tz), tz); } while (arc !== last && i < 14);
    return i - 1;
  }
  function fromSolar(dd, mm, yy, tz = 7) {
    const dn = jdFromDate(dd, mm, yy), k = INT((dn - 2415021.076998695) / 29.530588853);
    let start = newMoon(k + 1, tz);
    if (start > dn) start = newMoon(k, tz);
    let a11 = month11(yy, tz), b11 = a11, ly;
    if (a11 >= start) { ly = yy; a11 = month11(yy - 1, tz); } else { ly = yy + 1; b11 = month11(yy + 1, tz); }
    const day = dn - start + 1, diff = INT((start - a11) / 29);
    let leap = 0, mon = diff + 11;
    if (b11 - a11 > 365) { const lm = leapOffset(a11, tz); if (diff >= lm) { mon = diff + 10; if (diff === lm) leap = 1; } }
    if (mon > 12) mon -= 12;
    if (mon >= 11 && diff < 4) ly -= 1;
    return { day, month: mon, year: ly, leap: !!leap };
  }
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const canChi = (y) => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;
  return { fromSolar, canChi };
})();

(function () {
  const { store, esc, toast, uid } = CS;
  const $ = (r, s) => r.querySelector(s), $$ = (r, s) => [...r.querySelectorAll(s)];

  /* ---------- ngày tháng (tính theo lịch, không lệch múi giờ) ---------- */
  const DOW = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const toNum = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const fromNum = (n) => { const d = new Date(n * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  const addDays = (iso, k) => fromNum(toNum(iso) + k);
  const diffDays = (a, b) => toNum(b) - toNum(a);
  const parts = (iso) => iso.split('-').map(Number);
  const vn = (iso) => { const [y, m, d] = parts(iso); return `${pad(d)}/${pad(m)}/${y}`; };
  const dow = (iso) => DOW[new Date(toNum(iso) * 864e5).getUTCDay()];
  const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const lunarOf = (iso) => { const [y, m, d] = parts(iso); return Lunar.fromSolar(d, m, y); };
  const lunarTxt = (iso) => { const l = lunarOf(iso); return `${l.day}/${l.month}${l.leap ? ' nhuận' : ''} âm lịch`; };

  /* ngày lễ Việt Nam */
  function holiday(iso) {
    const [, m, d] = parts(iso), l = lunarOf(iso), k = `${d}/${m}`, lk = `${l.day}/${l.month}`;
    const solar = { '1/1': ['Tết Dương lịch', 1], '30/4': ['Ngày Giải phóng miền Nam', 1], '1/5': ['Quốc tế Lao động', 1], '2/9': ['Quốc khánh', 1], '1/9': ['Nghỉ lễ Quốc khánh', 0], '8/3': ['Quốc tế Phụ nữ', 0], '20/10': ['Phụ nữ Việt Nam', 0], '20/11': ['Nhà giáo Việt Nam', 0], '24/12': ['Giáng sinh', 0] };
    const lunar = { '1/1': ['Mùng 1 Tết', 1], '2/1': ['Mùng 2 Tết', 1], '3/1': ['Mùng 3 Tết', 1], '15/1': ['Rằm tháng Giêng', 0], '10/3': ['Giỗ Tổ Hùng Vương', 1], '15/8': ['Tết Trung thu', 0], '23/12': ['Ông Công ông Táo', 0] };
    if (!l.leap && lunar[lk]) return lunar[lk];
    if (!l.leap && l.month === 12 && (l.day === 30 || (l.day === 29 && lunarOf(addDays(iso, 1)).day === 1))) return ['Giao thừa', 1];
    return solar[k] || null;
  }

  /* ================= TÍNH NGÀY LƯU TRÚ ================= */
  const DEFAULT_RULES = [
    { id: 'bi', name: 'Miễn TT song phương', days: [21, 30, 90], c: '#38bdf8' },
    { id: 'uni', name: 'Miễn TT đơn phương', days: [45], c: '#a78bfa' },
    { id: 'abtc', name: 'Thẻ ABTC', days: [90], c: '#34d399' },
    { id: 'gmtt', name: 'Giấy miễn thị thực', days: [180], c: '#fbbf24' },
  ];
  const STD_DAYS = [21, 30, 45, 90, 180];
  const rules = () => store.get('stay.rules', DEFAULT_RULES);
  const countFirst = () => store.get('stay.day1', true); // ngày nhập cảnh = ngày thứ 1
  const expiryOf = (entry, n) => addDays(entry, countFirst() ? n - 1 : n);
  const records = () => store.get('stay.records', []);
  function statusOf(exp) {
    const left = diffDays(todayISO(), exp);
    if (left < 0) return { cls: 'over', txt: `Quá hạn ${-left} ngày` };
    if (left === 0) return { cls: 'last', txt: 'Hôm nay là ngày cuối' };
    if (left <= 3) return { cls: 'soon', txt: `Còn ${left} ngày` };
    return { cls: 'ok', txt: `Còn ${left} ngày` };
  }
  window.StayTool = { records, expiryOf, statusOf };

  TOOLS.stay = {
    title: 'Tính ngày lưu trú', icon: '🛂', width: 440, global: true,
    render(b, { opts }) {
      let tab = opts.tab || 'calc';
      const st = { entry: isISO(opts.entry) ? opts.entry : todayISO(), rule: store.get('stay.lastRule', 'uni'), days: store.get('stay.lastDays', 45) };
      const chk = { entry: todayISO(), days: 45, a: todayISO(), b: todayISO() };
      b.innerHTML = `<div class="tabs"><button data-t="calc">🧮 Tính hạn</button><button data-t="check">🔎 Kiểm tra</button><button data-t="list">📌 Theo dõi</button><button data-t="rules">⚙️ Quy tắc</button></div><div data-body></div>`;
      const body = $(b, '[data-body]');
      const daysPick = (sel, cur) => `<div class="chips daypick">${STD_DAYS.map((d) => `<button class="chip${d === cur ? ' on' : ''}" data-d="${d}">${d} ngày</button>`).join('')}<input type="number" class="num" min="1" max="3650" data-custom placeholder="Khác" value="${STD_DAYS.includes(cur) ? '' : cur}"></div>`;
      const card = (entry, n) => {
        const exp = expiryOf(entry, n), s = statusOf(exp), h = holiday(exp), wk = [0, 6].includes(new Date(toNum(exp) * 864e5).getUTCDay());
        return `<div class="stay-card ${s.cls}">
          <small>Được lưu trú đến hết ngày</small>
          <div class="stay-date">${vn(exp)}</div>
          <div class="stay-sub">${dow(exp)} · ${lunarTxt(exp)}${h ? ` · <b>${esc(h[0])}</b>` : ''}</div>
          <div class="stay-line">Ngày ${countFirst() ? 1 : 0}: <b>${vn(entry)}</b> → Ngày ${n}: <b>${vn(exp)}</b></div>
          <div class="stay-status">${s.txt} (tính từ hôm nay ${vn(todayISO())})</div>
          ${wk || (h && h[1]) ? `<div class="stay-warn">⚠️ Ngày hết hạn rơi vào ${h && h[1] ? 'ngày lễ' : 'cuối tuần'}</div>` : ''}
        </div>`;
      };
      const draw = () => {
        $$(b, '[data-t]').forEach((x) => x.classList.toggle('on', x.dataset.t === tab));
        const R = rules();
        if (tab === 'calc') {
          const rule = R.find((r) => r.id === st.rule);
          body.innerHTML = `<label class="field">Ngày nhập cảnh <span class="row"><input type="date" data-entry value="${st.entry}" class="grow"><button class="btn ghost" data-today>Hôm nay</button></span><span class="date-vn">${dow(st.entry)}, ${vn(st.entry)}${st.entry === todayISO() ? ' (hôm nay)' : ''}</span></label>
            <div class="small muted">Diện miễn thị thực</div>
            <div class="chips">${R.map((r) => `<button class="chip rule${r.id === st.rule ? ' on' : ''}" data-r="${esc(r.id)}" style="--rc:${esc(r.c || '#888')}">${esc(r.name)} <b>${r.days.join('/')}</b></button>`).join('')}</div>
            <div class="small muted">Số ngày được lưu trú${rule ? ` · ${esc(rule.name)}: ${rule.days.join(', ')} ngày` : ''}</div>
            ${daysPick('calc', st.days)}
            ${card(st.entry, st.days)}
            <div class="row"><button class="btn" data-copy>📋 Copy kết quả</button><span class="grow"></span><button class="btn primary" data-save>📌 Lưu để theo dõi</button></div>
            <h4>Bảng nhanh từ ngày ${vn(st.entry)}</h4>
            <table class="quick"><tbody>${STD_DAYS.map((d) => { const e = expiryOf(st.entry, d), h = holiday(e); return `<tr class="${d === st.days ? 'on' : ''}" data-d="${d}"><td><b>${d}</b> ngày</td><td><b>${vn(e)}</b></td><td>${dow(e)}${h ? ` · ${esc(h[0])}` : ''}</td></tr>`; }).join('')}</tbody></table>`;
          $(body, '[data-entry]').onchange = (e) => { if (isISO(e.target.value)) { st.entry = e.target.value; draw(); } };
          $(body, '[data-today]').onclick = () => { st.entry = todayISO(); draw(); };
          $$(body, '[data-r]').forEach((x) => (x.onclick = () => { st.rule = x.dataset.r; const r = R.find((y) => y.id === st.rule); if (r && !r.days.includes(st.days)) st.days = r.days[0]; store.set('stay.lastRule', st.rule); store.set('stay.lastDays', st.days); draw(); }));
          $$(body, '[data-d]').forEach((x) => (x.onclick = () => { st.days = +x.dataset.d; store.set('stay.lastDays', st.days); draw(); }));
          $(body, '[data-custom]').onchange = (e) => { const n = Math.round(+e.target.value); if (n >= 1 && n <= 3650) { st.days = n; draw(); } };
          $(body, '[data-copy]').onclick = async () => {
            const exp = expiryOf(st.entry, st.days), r = R.find((y) => y.id === st.rule);
            const t = `${r ? r.name + ' – ' : ''}${st.days} ngày: nhập cảnh ${vn(st.entry)} → lưu trú đến hết ${dow(exp)} ${vn(exp)}`;
            try { await navigator.clipboard.writeText(t); toast('Đã copy: ' + t, 4500); } catch (e) { prompt('Copy dòng này:', t); }
          };
          $(body, '[data-save]').onclick = () => {
            const label = prompt('Ghi chú để dễ nhận ra (vd: Đoàn khách Hàn – quầy 3). Không cần ghi số hộ chiếu:', '');
            if (label == null) return;
            const list = records(); list.push({ id: uid(), label: label.trim().slice(0, 80), entry: st.entry, days: st.days, rule: st.rule, at: Date.now() });
            store.set('stay.records', list); toast('Đã lưu vào mục Theo dõi 📌'); document.dispatchEvent(new Event('cs:stay'));
          };
        } else if (tab === 'check') {
          const n = diffDays(chk.entry, todayISO()) + (countFirst() ? 1 : 0), exp = expiryOf(chk.entry, chk.days), s = statusOf(exp);
          const between = diffDays(chk.a, chk.b);
          body.innerHTML = `<p class="small muted">Khách đã nhập cảnh từ trước: hôm nay là ngày thứ mấy, còn hay quá hạn bao nhiêu ngày?</p>
            <label class="field">Ngày nhập cảnh <input type="date" data-ce value="${chk.entry}"><span class="date-vn">${dow(chk.entry)}, ${vn(chk.entry)}</span></label>
            ${daysPick('check', chk.days)}
            <div class="stay-card ${s.cls}"><small>Hôm nay ${vn(todayISO())} là</small><div class="stay-date">${n >= (countFirst() ? 1 : 0) ? `Ngày thứ ${n}` : `Chưa tới ngày nhập cảnh`}</div>
              <div class="stay-sub">trên tổng ${chk.days} ngày · hạn đến hết ${dow(exp)} ${vn(exp)}</div>
              <div class="prog big"><i style="width:${Math.max(0, Math.min(100, (n / chk.days) * 100))}%"></i></div>
              <div class="stay-status">${s.txt}</div></div>
            <h4>Đếm số ngày giữa 2 ngày</h4>
            <div class="row"><input type="date" data-a value="${chk.a}" class="grow"><span>→</span><input type="date" data-b value="${chk.b}" class="grow"></div><div class="date-vn">${vn(chk.a)} → ${vn(chk.b)}</div>
            <p class="small">Cách nhau <b>${between}</b> ngày · nếu tính cả 2 đầu là <b>${Math.abs(between) + 1}</b> ngày.</p>`;
          $(body, '[data-ce]').onchange = (e) => { if (isISO(e.target.value)) { chk.entry = e.target.value; draw(); } };
          $$(body, '[data-d]').forEach((x) => (x.onclick = () => { chk.days = +x.dataset.d; draw(); }));
          $(body, '[data-custom]').onchange = (e) => { const k = Math.round(+e.target.value); if (k >= 1) { chk.days = k; draw(); } };
          $(body, '[data-a]').onchange = (e) => { if (isISO(e.target.value)) { chk.a = e.target.value; draw(); } };
          $(body, '[data-b]').onchange = (e) => { if (isISO(e.target.value)) { chk.b = e.target.value; draw(); } };
        } else if (tab === 'list') {
          const list = records().map((r) => ({ ...r, exp: expiryOf(r.entry, r.days) })).sort((a, c) => (a.exp < c.exp ? -1 : 1));
          body.innerHTML = `<ul class="stay-list">${list.map((r) => { const s = statusOf(r.exp), ru = R.find((x) => x.id === r.rule); return `<li class="${s.cls}" data-id="${r.id}"><div class="grow"><b>${esc(r.label || 'Không tên')}</b><small>${ru ? esc(ru.name) + ' · ' : ''}${r.days} ngày · ${vn(r.entry)} → <b>${vn(r.exp)}</b></small></div><span class="badge-st">${s.txt}</span><button class="x" title="Xoá">✕</button></li>`; }).join('') || '<li class="empty">Chưa lưu trường hợp nào. Ở tab "Tính hạn" bấm 📌 Lưu để theo dõi.</li>'}</ul>
            <p class="muted small">Dữ liệu chỉ lưu trên máy này. Ngày hết hạn được đánh dấu trên 📅 Lịch.</p>`;
          $(body, '.stay-list').onclick = (e) => {
            const li = e.target.closest('li[data-id]'); if (!li) return;
            if (e.target.classList.contains('x')) { if (!confirm('Xoá mục này?')) return; store.set('stay.records', records().filter((x) => x.id !== li.dataset.id)); document.dispatchEvent(new Event('cs:stay')); return draw(); }
            const r = records().find((x) => x.id === li.dataset.id); if (r) { st.entry = r.entry; st.days = r.days; st.rule = r.rule; tab = 'calc'; draw(); }
          };
        } else {
          body.innerHTML = `<label class="row"><input type="checkbox" data-day1 ${countFirst() ? 'checked' : ''}> <span>Tính <b>ngày nhập cảnh là ngày thứ 1</b><br><small class="muted">Bật: nhập 01/01 + 45 ngày → hết hạn 14/02. Tắt: → 15/02.</small></span></label>
            <h4>Diện & số ngày (sửa theo quy định hiện hành)</h4>
            <ul class="rule-list">${R.map((r, i) => `<li data-i="${i}"><input class="grow" data-n value="${esc(r.name)}" maxlength="40"><input data-v value="${r.days.join(', ')}" placeholder="vd: 21, 30" style="width:110px"><button class="x" title="Xoá">✕</button></li>`).join('')}</ul>
            <div class="row"><button class="btn ghost" data-add>＋ Thêm diện</button><span class="grow"></span><button class="btn ghost" data-reset>↺ Mặc định</button><button class="btn primary" data-save>Lưu</button></div>
            <p class="muted small">Ví dụ thêm: "Thị thực điện tử (e-visa)", "Thẻ tạm trú"… Số ngày có thể ghi nhiều, cách nhau bởi dấu phẩy.</p>`;
          $(body, '[data-day1]').onchange = (e) => { store.set('stay.day1', e.target.checked); toast(e.target.checked ? 'Ngày nhập cảnh tính là ngày 1' : 'Ngày nhập cảnh tính là ngày 0'); document.dispatchEvent(new Event('cs:stay')); };
          const collect = () => $$(body, '.rule-list li').map((li, i) => ({ id: (R[+li.dataset.i] && R[+li.dataset.i].id) || 'r' + uid(), name: $(li, '[data-n]').value.trim() || 'Diện mới', days: $(li, '[data-v]').value.split(/[,;\s]+/).map(Number).filter((n) => n >= 1 && n <= 3650), c: (R[+li.dataset.i] && R[+li.dataset.i].c) || ['#f472b6', '#fb923c', '#4ade80', '#60a5fa'][i % 4] })).filter((r) => r.days.length);
          $(body, '[data-save]').onclick = () => { store.set('stay.rules', collect()); toast('Đã lưu quy tắc ✅'); draw(); };
          $(body, '[data-add]').onclick = () => { const cur = collect(); cur.push({ id: 'r' + uid(), name: 'Diện mới', days: [30], c: '#f472b6' }); store.set('stay.rules', cur); draw(); };
          $(body, '[data-reset]').onclick = () => { if (confirm('Đưa quy tắc về mặc định?')) { store.set('stay.rules', DEFAULT_RULES); draw(); } };
          $$(body, '.rule-list .x').forEach((x) => (x.onclick = () => { const i = +x.closest('li').dataset.i; store.set('stay.rules', R.filter((_, k) => k !== i)); draw(); }));
        }
      };
      $$(b, '[data-t]').forEach((x) => (x.onclick = () => { tab = x.dataset.t; draw(); }));
      draw();
      const midnight = setInterval(() => { if (b._day !== todayISO()) { b._day = todayISO(); draw(); } }, 60000); b._day = todayISO();
      const onStay = () => draw(); document.addEventListener('cs:stay', onStay);
      return () => { clearInterval(midnight); document.removeEventListener('cs:stay', onStay); };
    },
  };

  /* ================= LỊCH ÂM DƯƠNG ================= */
  TOOLS.calendar = {
    title: 'Lịch', icon: '📅', width: 400, global: true,
    render(b) {
      const t0 = todayISO();
      let [vy, vm] = parts(t0), sel = t0;
      const draw = () => {
        const first = `${vy}-${pad(vm)}-01`, startDow = (new Date(toNum(first) * 864e5).getUTCDay() + 6) % 7;
        const dim = new Date(Date.UTC(vy, vm, 0)).getUTCDate(), today = todayISO();
        const exp = {}; records().forEach((r) => { const e = expiryOf(r.entry, r.days); (exp[e] = exp[e] || []).push(r); });
        let cells = '';
        for (let i = 0; i < startDow; i++) cells += '<span class="cd empty"></span>';
        for (let d = 1; d <= dim; d++) {
          const iso = `${vy}-${pad(vm)}-${pad(d)}`, l = lunarOf(iso), h = holiday(iso), wd = (startDow + d - 1) % 7;
          cells += `<button class="cd${iso === today ? ' today' : ''}${iso === sel ? ' sel' : ''}${h && h[1] ? ' off' : ''}${wd === 6 ? ' sun' : ''}" data-iso="${iso}"><b>${d}</b><small>${l.day === 1 ? `${l.day}/${l.month}` : l.day}</small>${exp[iso] ? '<i class="dot"></i>' : ''}${h ? '<i class="hd"></i>' : ''}</button>`;
        }
        const l = lunarOf(sel), h = holiday(sel), diff = diffDays(today, sel);
        b.innerHTML = `<div class="cal-head"><button class="btn ghost" data-m="-1">‹</button><b>Tháng ${vm}, ${vy}</b><button class="btn ghost" data-m="1">›</button><span class="grow"></span><button class="btn ghost" data-now>Hôm nay</button></div>
          <div class="cal-grid">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((x) => `<span class="cw">${x}</span>`).join('')}${cells}</div>
          <div class="cal-info"><div class="big">${dow(sel)}, ${vn(sel)}</div>
            <div>🌙 Âm lịch: ngày ${l.day} tháng ${l.month}${l.leap ? ' (nhuận)' : ''} năm ${Lunar.canChi(l.year)}</div>
            ${h ? `<div>🎌 ${esc(h[0])}${h[1] ? ' – ngày nghỉ' : ''}</div>` : ''}
            <div class="muted small">${diff === 0 ? 'Hôm nay' : diff > 0 ? `${diff} ngày nữa` : `${-diff} ngày trước`}</div>
            ${(exp[sel] || []).map((r) => `<div class="exp-row">🛂 Hết hạn lưu trú: <b>${esc(r.label || 'Không tên')}</b> (${r.days} ngày từ ${vn(r.entry)})</div>`).join('')}
            <button class="btn primary" data-stay>🛂 Tính lưu trú từ ngày này</button></div>`;
        $$(b, '[data-m]').forEach((x) => (x.onclick = () => { vm += +x.dataset.m; if (vm < 1) { vm = 12; vy--; } if (vm > 12) { vm = 1; vy++; } draw(); }));
        $(b, '[data-now]').onclick = () => { [vy, vm] = parts(todayISO()); sel = todayISO(); draw(); };
        $$(b, '[data-iso]').forEach((x) => (x.onclick = () => { sel = x.dataset.iso; draw(); }));
        $(b, '[data-stay]').onclick = () => WM.open('stay', { entry: sel });
      };
      draw();
      const onStay = () => draw(); document.addEventListener('cs:stay', onStay);
      return () => document.removeEventListener('cs:stay', onStay);
    },
  };

  /* ================= ĐỒNG HỒ THẾ GIỚI ================= */
  const CITIES = {
    'Asia/Ho_Chi_Minh': ['🇻🇳', 'Hà Nội'], 'Asia/Seoul': ['🇰🇷', 'Seoul'], 'Asia/Tokyo': ['🇯🇵', 'Tokyo'], 'Asia/Shanghai': ['🇨🇳', 'Bắc Kinh'],
    'Asia/Taipei': ['🇹🇼', 'Đài Bắc'], 'Asia/Singapore': ['🇸🇬', 'Singapore'], 'Asia/Bangkok': ['🇹🇭', 'Bangkok'], 'Asia/Kolkata': ['🇮🇳', 'New Delhi'],
    'Asia/Dubai': ['🇦🇪', 'Dubai'], 'Europe/Moscow': ['🇷🇺', 'Moscow'], 'Europe/Berlin': ['🇩🇪', 'Berlin'], 'Europe/Paris': ['🇫🇷', 'Paris'],
    'Europe/London': ['🇬🇧', 'London'], 'America/New_York': ['🇺🇸', 'New York'], 'America/Los_Angeles': ['🇺🇸', 'Los Angeles'], 'Australia/Sydney': ['🇦🇺', 'Sydney'],
  };
  const SESSIONS = [
    { tz: 'Australia/Sydney', name: 'Sydney', open: 7, close: 16 }, { tz: 'Asia/Tokyo', name: 'Tokyo', open: 9, close: 18 },
    { tz: 'Europe/London', name: 'London', open: 8, close: 17 }, { tz: 'America/New_York', name: 'New York', open: 8, close: 17 },
  ];
  const zoned = (tz, d = new Date()) => {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });
    const o = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
    return { h: +o.hour % 24, m: +o.minute, s: +o.second, wd: o.weekday, wdv: { Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7', Sun: 'CN' }[o.weekday], dm: `${o.day}/${o.month}` };
  };
  const offsetVN = (tz) => { const a = zoned(tz), v = zoned('Asia/Ho_Chi_Minh'); let d = a.h + a.m / 60 - (v.h + v.m / 60); if (d > 12) d -= 24; if (d < -12) d += 24; return d; };
  function forexOpen(now = new Date()) { const ny = zoned('America/New_York', now); const wd = ny.wd; if (wd === 'Sat') return false; if (wd === 'Sun') return ny.h >= 17; if (wd === 'Fri') return ny.h < 17; return true; }
  function hoseOpen() { const v = zoned('Asia/Ho_Chi_Minh'), t = v.h * 60 + v.m; return !['Sat', 'Sun'].includes(v.wd) && ((t >= 540 && t < 690) || (t >= 780 && t < 885)); }

  TOOLS.clocks = {
    title: 'Đồng hồ thế giới', icon: '🌏', width: 380, global: true,
    render(b, { opts }) {
      const trader = opts.mode === 'trader';
      const key = trader ? 'clocks.trader' : 'clocks.world';
      let list = store.get(key, trader ? ['Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'Europe/London', 'America/New_York'] : ['Asia/Ho_Chi_Minh', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Tokyo', 'Europe/Moscow', 'Europe/Paris', 'America/New_York', 'Australia/Sydney']);
      b.innerHTML = `${trader ? '<div data-sess></div>' : ''}<ul class="clocks"></ul>
        <div class="row"><select data-add class="grow"><option value="">＋ Thêm thành phố…</option>${Object.entries(CITIES).map(([tz, [f, n]]) => `<option value="${tz}">${f} ${n}</option>`).join('')}</select></div>`;
      const draw = () => {
        $(b, '.clocks').innerHTML = list.map((tz) => {
          const z = zoned(tz), c = CITIES[tz] || ['🕐', tz], off = offsetVN(tz), night = z.h < 6 || z.h >= 20;
          return `<li data-tz="${tz}"><span class="fl">${c[0]}</span><span class="grow"><b>${c[1]}</b><small>${z.wdv} ${z.dm} · ${off === 0 ? 'giờ VN' : `${off > 0 ? '+' : ''}${off}h so với VN`}</small></span><span class="ct">${night ? '🌙' : '☀️'} ${pad(z.h)}:${pad(z.m)}</span>${tz !== 'Asia/Ho_Chi_Minh' ? '<button class="x">✕</button>' : ''}</li>`;
        }).join('');
        if (trader) {
          const fx = forexOpen();
          $(b, '[data-sess]').innerHTML = `<div class="sess">${SESSIONS.map((s) => { const z = zoned(s.tz), on = fx && z.h >= s.open && z.h < s.close && !['Sat', 'Sun'].includes(z.wd); return `<span class="${on ? 'on' : ''}">${on ? '🟢' : '⚪'} ${s.name}</span>`; }).join('')}</div>
            <div class="row small wrap"><span class="${fx ? 'up' : 'down'}">Forex: ${fx ? 'đang mở' : 'đóng cửa cuối tuần'}</span><span class="${hoseOpen() ? 'up' : 'down'}">HOSE: ${hoseOpen() ? 'đang giao dịch' : 'ngoài giờ'}</span><span class="up">Crypto: 24/7</span></div>
            <p class="muted small">Phiên tính theo giờ địa phương (tự chỉnh giờ mùa hè). London + New York chồng nhau là lúc biến động mạnh nhất.</p>`;
        }
      };
      $(b, '[data-add]').onchange = (e) => { const tz = e.target.value; if (tz && !list.includes(tz)) { list.push(tz); store.set(key, list); draw(); } e.target.value = ''; };
      $(b, '.clocks').onclick = (e) => { if (!e.target.classList.contains('x')) return; list = list.filter((x) => x !== e.target.closest('li').dataset.tz); store.set(key, list); draw(); };
      draw(); const t = setInterval(draw, 15000);
      return () => clearInterval(t);
    },
  };

  /* ================= TRADER ================= */
  TOOLS.chart = {
    title: 'Biểu đồ', icon: '📈', width: 620, global: true, keepAlive: true,
    render(b) {
      const picks = [['BINANCE:BTCUSDT', 'BTC'], ['BINANCE:ETHUSDT', 'ETH'], ['OANDA:XAUUSD', 'Vàng'], ['FX:EURUSD', 'EUR/USD'], ['FX:USDJPY', 'USD/JPY'], ['HOSE:VNINDEX', 'VN-Index']];
      let sym = store.get('chart.sym', 'BINANCE:BTCUSDT'), tf = store.get('chart.tf', '60');
      b.innerHTML = `<div class="row wrap"><div class="chips grow">${picks.map(([s, n]) => `<button class="chip" data-s="${s}">${n}</button>`).join('')}</div></div>
        <form class="row"><input class="grow" data-sym placeholder="Mã TradingView, vd: BINANCE:SOLUSDT" value="${esc(sym)}"><select data-tf>${[['5', '5m'], ['15', '15m'], ['60', '1H'], ['240', '4H'], ['D', '1D'], ['W', '1W']].map(([v, n]) => `<option value="${v}"${v === tf ? ' selected' : ''}>${n}</option>`).join('')}</select><button class="btn primary">Xem</button></form>
        <div class="chart-frame"></div><p class="muted small">Biểu đồ từ TradingView. Cần mạng. Có thể chậm vài giây.</p>`;
      const load = () => {
        $$(b, '[data-s]').forEach((x) => x.classList.toggle('on', x.dataset.s === sym));
        const u = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(tf)}&theme=dark&style=1&timezone=Asia%2FHo_Chi_Minh&locale=vi_VN&hidesidetoolbar=0&saveimage=0&withdateranges=1`;
        $(b, '.chart-frame').innerHTML = `<iframe src="${u}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
        store.set('chart.sym', sym); store.set('chart.tf', tf);
      };
      $$(b, '[data-s]').forEach((x) => (x.onclick = () => { sym = x.dataset.s; $(b, '[data-sym]').value = sym; load(); }));
      $(b, 'form').onsubmit = (e) => { e.preventDefault(); const v = $(b, '[data-sym]').value.trim().toUpperCase(); if (/^[A-Z0-9_.:!\-]{2,40}$/.test(v)) { sym = v; tf = $(b, '[data-tf]').value; load(); } else toast('Mã không hợp lệ'); };
      $(b, '[data-tf]').onchange = (e) => { tf = e.target.value; load(); };
      load();
    },
  };

  TOOLS.possize = {
    title: 'Tính khối lượng lệnh', icon: '🧮', width: 360,
    render(b) {
      const s = store.get('pos', { bal: 1000, risk: 1, entry: '', sl: '', tp: '', type: 'unit' });
      b.innerHTML = `<div class="grid2">
          <label class="field">Vốn tài khoản<input type="number" data-k="bal" value="${s.bal}"></label>
          <label class="field">Rủi ro mỗi lệnh (%)<input type="number" step="0.1" data-k="risk" value="${s.risk}"></label>
          <label class="field">Giá vào lệnh<input type="number" step="any" data-k="entry" value="${s.entry}"></label>
          <label class="field">Cắt lỗ (SL)<input type="number" step="any" data-k="sl" value="${s.sl}"></label>
          <label class="field">Chốt lời (TP)<input type="number" step="any" data-k="tp" value="${s.tp}" placeholder="không bắt buộc"></label>
          <label class="field">Loại tài sản<select data-k="type"><option value="unit">Crypto / cổ phiếu</option><option value="fx">Forex (1 lot = 100.000)</option><option value="xau">Vàng XAU (1 lot = 100 oz)</option></select></label>
        </div><div class="pos-out"></div>`;
      $(b, '[data-k=type]').value = s.type;
      const calc = () => {
        $$(b, '[data-k]').forEach((i) => (s[i.dataset.k] = i.type === 'number' ? (i.value === '' ? '' : +i.value) : i.value)); store.set('pos', s);
        const out = $(b, '.pos-out'), dist = Math.abs(s.entry - s.sl);
        if (!s.bal || !s.risk || !s.entry || !s.sl || !dist) { out.innerHTML = '<p class="muted small">Nhập giá vào và cắt lỗ để tính.</p>'; return; }
        const riskAmt = (s.bal * s.risk) / 100, units = riskAmt / dist, lot = s.type === 'fx' ? units / 1e5 : s.type === 'xau' ? units / 100 : null;
        const side = s.entry > s.sl ? 'LONG (mua)' : 'SHORT (bán)', rr = s.tp ? Math.abs(s.tp - s.entry) / dist : null;
        const wrongTp = s.tp && ((s.entry > s.sl && s.tp <= s.entry) || (s.entry < s.sl && s.tp >= s.entry));
        out.innerHTML = `<div class="pos-card"><div>${side}</div><div class="big">${lot != null ? `${lot.toFixed(2)} lot` : `${units.toLocaleString('vi-VN', { maximumFractionDigits: 6 })} đơn vị`}</div>
          <div class="small">Rủi ro: <b>${riskAmt.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</b> (${s.risk}%) · Giá trị vị thế ≈ ${(units * s.entry).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</div>
          ${rr != null ? `<div class="small">${wrongTp ? '⚠️ TP nằm sai phía so với lệnh' : `R:R = 1 : ${rr.toFixed(2)} ${rr >= 2 ? '✅' : '⚠️ thấp'} · Lãi nếu chạm TP ≈ ${(riskAmt * rr).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`}</div>` : ''}
          ${s.risk > 2 ? '<div class="small warn">⚠️ Rủi ro trên 2% mỗi lệnh là cao</div>' : ''}</div>
          <p class="muted small">Công cụ hỗ trợ tính toán, không phải lời khuyên đầu tư. Forex/vàng giả định tài khoản tính bằng đồng định giá (USD).</p>`;
      };
      b.oninput = calc; calc();
    },
  };

  TOOLS.tjournal = {
    title: 'Nhật ký giao dịch', icon: '📒', width: 420,
    render(b) {
      let list = store.get('tj', []);
      const emo = ['😌', '😎', '😐', '😰', '😡', '🤑'];
      b.innerHTML = `<form class="col tj-form"><div class="row"><input name="sym" placeholder="Mã (BTC, XAU…)" required maxlength="20" class="grow"><select name="side"><option>Long</option><option>Short</option></select><input name="r" type="number" step="0.1" placeholder="Kết quả R" style="width:100px" required></div>
          <div class="row"><select name="emo">${emo.map((e) => `<option>${e}</option>`).join('')}</select><input name="note" placeholder="Lý do vào lệnh / bài học…" maxlength="200" class="grow"><button class="btn primary">＋</button></div></form>
        <div class="tj-stats"></div><ul class="tj-list"></ul>`;
      const draw = () => {
        const n = list.length, w = list.filter((t) => t.r > 0).length, sum = list.reduce((a, t) => a + t.r, 0);
        $(b, '.tj-stats').innerHTML = `<span>Tổng <b>${n}</b> lệnh</span><span>Thắng <b>${n ? Math.round((w / n) * 100) : 0}%</b></span><span class="${sum >= 0 ? 'up' : 'down'}">Tổng <b>${sum >= 0 ? '+' : ''}${sum.toFixed(1)}R</b></span>`;
        $(b, '.tj-list').innerHTML = list.slice(0, 50).map((t) => `<li data-id="${t.id}"><span class="${t.r > 0 ? 'up' : t.r < 0 ? 'down' : ''}"><b>${t.r > 0 ? '+' : ''}${t.r}R</b></span><span class="grow"><b>${esc(t.sym)}</b> ${t.side} ${t.emo}<small>${new Date(t.at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}${t.note ? ' · ' + esc(t.note) : ''}</small></span><button class="x">✕</button></li>`).join('') || '<li class="empty">Ghi lại từng lệnh để biết mình thật sự thắng hay thua ở đâu.</li>';
      };
      $(b, 'form').onsubmit = (e) => { e.preventDefault(); const f = e.target; list.unshift({ id: uid(), at: Date.now(), sym: f.sym.value.trim().toUpperCase(), side: f.side.value, r: +f.r.value, emo: f.emo.value, note: f.note.value.trim() }); store.set('tj', list); f.reset(); draw(); };
      $(b, '.tj-list').onclick = (e) => { if (!e.target.classList.contains('x')) return; list = list.filter((t) => t.id !== e.target.closest('li').dataset.id); store.set('tj', list); draw(); };
      draw();
    },
  };

  const DEF_CHECK = ['Đúng xu hướng khung thời gian lớn', 'Có tín hiệu vào lệnh theo hệ thống của mình', 'Đã đặt cắt lỗ (SL) trước khi vào', 'Rủi ro ≤ 1–2% tài khoản', 'R:R tối thiểu 1:2', 'Đã xem lịch tin tức kinh tế', 'Không FOMO, không gỡ lệnh thua'];
  TOOLS.checklist = {
    title: 'Checklist trước khi vào lệnh', icon: '✅', width: 360,
    render(b) {
      let items = store.get('ck.items', DEF_CHECK), done = store.get('ck.done', {}); if (done.day !== todayISO()) done = { day: todayISO(), v: [] };
      const draw = () => {
        const all = items.length && items.every((_, i) => done.v.includes(i));
        b.innerHTML = `<ul class="todo">${items.map((t, i) => `<li class="${done.v.includes(i) ? 'done' : ''}"><label><input type="checkbox" data-i="${i}" ${done.v.includes(i) ? 'checked' : ''}><span>${esc(t)}</span></label><button class="x" data-del="${i}">✕</button></li>`).join('')}</ul>
          <div class="ck-result ${all ? 'ok' : ''}">${all ? '✅ Đủ điều kiện – vào lệnh theo kế hoạch' : `⏳ Còn ${items.length - done.v.length} điều kiện`}</div>
          <form class="row"><input class="grow" placeholder="Thêm quy tắc của bạn…" maxlength="100"><button class="btn">＋</button></form>
          <div class="row"><button class="btn ghost" data-reset>↺ Bỏ tích (lệnh mới)</button></div>`;
        $$(b, '[data-i]').forEach((x) => (x.onchange = () => { const i = +x.dataset.i; done.v = x.checked ? [...done.v, i] : done.v.filter((k) => k !== i); store.set('ck.done', done); draw(); }));
        $$(b, '[data-del]').forEach((x) => (x.onclick = () => { const i = +x.dataset.del; items = items.filter((_, k) => k !== i); done.v = []; store.set('ck.items', items); store.set('ck.done', done); draw(); }));
        $(b, 'form').onsubmit = (e) => { e.preventDefault(); const v = $(b, 'form input').value.trim(); if (v) { items.push(v); store.set('ck.items', items); draw(); } };
        $(b, '[data-reset]').onclick = () => { done.v = []; store.set('ck.done', done); draw(); };
      };
      draw();
    },
  };

  TOOLS.tlinks = {
    title: 'Tin tức & lịch kinh tế', icon: '📰', width: 360,
    render(b) {
      const L = [['📅 Lịch kinh tế – Forex Factory', 'https://www.forexfactory.com/calendar'], ['📅 Lịch kinh tế – Investing.com', 'https://vn.investing.com/economic-calendar/'], ['📊 TradingView – thị trường', 'https://vn.tradingview.com/markets/'], ['😨 Chỉ số Sợ hãi & Tham lam (crypto)', 'https://alternative.me/crypto/fear-and-greed-index/'], ['🪙 CoinMarketCap', 'https://coinmarketcap.com/vi/'], ['🇻🇳 Vietstock – chứng khoán VN', 'https://finance.vietstock.vn/'], ['🇻🇳 CafeF – tin tài chính', 'https://cafef.vn/']];
      b.innerHTML = `<ul class="links">${L.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t} ↗</a></li>`).join('')}</ul><p class="muted small">Mở ở tab mới. Nhớ tránh vào lệnh sát giờ ra tin mạnh (CPI, NFP, FOMC).</p>`;
    },
  };

  window.ProDate = { todayISO, addDays, diffDays, vn, dow, holiday, lunarOf };
})();
