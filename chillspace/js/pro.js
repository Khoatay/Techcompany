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
  // "hôm nay" luôn theo giờ Việt Nam, dù máy đang để múi giờ nào
  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
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

  /* ================= HẠN LƯU TRÚ (đơn giản) ================= */
  const STAY_DAYS = [21, 30, 45, 90, 180];
  const HOT = { 30: 'amber', 45: 'green' }; // 2 mốc dùng nhiều nhất: nổi bật
  const expiry = (n) => addDays(todayISO(), n - 1); // ngày nhập cảnh = ngày thứ 1
  const stayRows = () => STAY_DAYS.map((n) => { const e = expiry(n); return `<li class="sr ${HOT[n] || ''}" data-n="${n}"><span class="sn">${n}<small>ngày</small></span><span class="sd">${vn(e)}<small>${dow(e)}</small></span></li>`; }).join('');
  window.StayBoard = { html: () => `<div class="sb-head">HẠN LƯU TRÚ<small>nhập cảnh hôm nay ${vn(todayISO())}</small></div><ul class="sb">${stayRows()}</ul>`, expiry };

  TOOLS.stay = {
    title: 'Hạn lưu trú', icon: '🛂', width: 360, global: true,
    render(b) {
      const draw = () => {
        b.innerHTML = `<p class="small">Nhập cảnh hôm nay: <b>${dow(todayISO())}, ${vn(todayISO())}</b> <span class="muted">(giờ Việt Nam)</span></p>
          <ul class="sb big">${stayRows()}</ul>
          <p class="muted small">Bấm vào một dòng để copy. Ngày nhập cảnh tính là ngày thứ 1. Qua 0 giờ (giờ VN) bảng tự đổi sang ngày mới.</p>`;
        $$(b, '.sr').forEach((li) => (li.onclick = async () => {
          const t = `${li.dataset.n} ngày: ${vn(expiry(+li.dataset.n))}`;
          try { await navigator.clipboard.writeText(t); toast('Đã copy: ' + t); } catch (e) { prompt('Copy:', t); }
        }));
      };
      draw(); const t = setInterval(draw, 30000);
      return () => clearInterval(t);
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
        let cells = '';
        for (let i = 0; i < startDow; i++) cells += '<span class="cd empty"></span>';
        for (let d = 1; d <= dim; d++) {
          const iso = `${vy}-${pad(vm)}-${pad(d)}`, l = lunarOf(iso), h = holiday(iso), wd = (startDow + d - 1) % 7;
          cells += `<button class="cd${iso === today ? ' today' : ''}${iso === sel ? ' sel' : ''}${h && h[1] ? ' off' : ''}${wd === 6 ? ' sun' : ''}" data-iso="${iso}"><b>${d}</b><small>${l.day === 1 ? `${l.day}/${l.month}` : l.day}</small>${h ? '<i class="hd"></i>' : ''}</button>`;
        }
        const l = lunarOf(sel), h = holiday(sel), diff = diffDays(today, sel);
        b.innerHTML = `<div class="cal-head"><button class="btn ghost" data-m="-1">‹</button><b>Tháng ${vm}, ${vy}</b><button class="btn ghost" data-m="1">›</button><span class="grow"></span><button class="btn ghost" data-now>Hôm nay</button></div>
          <div class="cal-grid">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((x) => `<span class="cw">${x}</span>`).join('')}${cells}</div>
          <div class="cal-info"><div class="big">${dow(sel)}, ${vn(sel)}</div>
            <div>🌙 Âm lịch: ngày ${l.day} tháng ${l.month}${l.leap ? ' (nhuận)' : ''} năm ${Lunar.canChi(l.year)}</div>
            ${h ? `<div>🎌 ${esc(h[0])}${h[1] ? ' – ngày nghỉ' : ''}</div>` : ''}
            <div class="muted small">${diff === 0 ? 'Hôm nay' : diff > 0 ? `${diff} ngày nữa` : `${-diff} ngày trước`}</div>
            </div>`;
        $$(b, '[data-m]').forEach((x) => (x.onclick = () => { vm += +x.dataset.m; if (vm < 1) { vm = 12; vy--; } if (vm > 12) { vm = 1; vy++; } draw(); }));
        $(b, '[data-now]').onclick = () => { [vy, vm] = parts(todayISO()); sel = todayISO(); draw(); };
        $$(b, '[data-iso]').forEach((x) => (x.onclick = () => { sel = x.dataset.iso; draw(); }));
      };
      draw();
      const t = setInterval(() => { if (b._d !== todayISO()) { b._d = todayISO(); draw(); } }, 60000); b._d = todayISO();
      return () => clearInterval(t);
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


  /* ================= CHUYẾN BAY QUỐC TẾ ĐẾN (AeroDataBox qua RapidAPI) ================= */
  const FL_HOST = 'aerodatabox.p.rapidapi.com';
  const AIRPORTS = { CXR: 'Cam Ranh', HAN: 'Nội Bài', SGN: 'Tân Sơn Nhất', DAD: 'Đà Nẵng', PQC: 'Phú Quốc', HPH: 'Cát Bi', VCA: 'Cần Thơ', VDO: 'Vân Đồn' };
  const COUNTRY = { KR: 'Hàn Quốc', CN: 'Trung Quốc', TW: 'Đài Loan', HK: 'Hồng Kông', MO: 'Ma Cao', JP: 'Nhật Bản', RU: 'Nga', KZ: 'Kazakhstan', UZ: 'Uzbekistan', IN: 'Ấn Độ', TH: 'Thái Lan', SG: 'Singapore', MY: 'Malaysia', KH: 'Campuchia', LA: 'Lào', PH: 'Philippines', ID: 'Indonesia', AU: 'Úc', US: 'Mỹ', MN: 'Mông Cổ', AE: 'UAE', QA: 'Qatar' };
  const FL_STATUS = {
    Arrived: ['Đã hạ cánh', 'done'], Approaching: ['Sắp hạ cánh', 'soon'], EnRoute: ['Đang bay', 'air'], Departed: ['Đã cất cánh', 'air'],
    Expected: ['Dự kiến', 'plan'], CheckIn: ['Dự kiến', 'plan'], Boarding: ['Đang lên máy bay', 'plan'], GateClosed: ['Đã đóng cửa', 'air'],
    Delayed: ['Trễ', 'late'], Canceled: ['Huỷ', 'cancel'], CanceledUncertain: ['Có thể huỷ', 'cancel'], Diverted: ['Chuyển hướng', 'cancel'], Unknown: ['—', 'plan'],
  };
  const flag = (cc) => (/^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : '🏳️');
  const vnParts = (d) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map((p) => [p.type, p.value]));
  const vnLocal = (d) => { const o = vnParts(d); return `${o.year}-${o.month}-${o.day}T${o.hour === '24' ? '00' : o.hour}:${o.minute}`; };
  const hhmm = (d) => { const o = vnParts(d); return `${o.hour === '24' ? '00' : o.hour}:${o.minute}`; };
  const parseT = (t) => { if (!t) return null; const s = typeof t === 'string' ? t : t.local || t.utc; if (!s) return null; const d = new Date(s.replace(' ', 'T').replace(/Z$/, 'Z')); return isNaN(d) ? null : d; };

  // AeroDataBox có 2 kiểu dữ liệu: có "movement" (withLeg=false) hoặc "departure"/"arrival" (withLeg=true)
  function normArrival(f) {
    const mv = f.movement || f.arrival || {}, from = (f.movement ? f.movement.airport : f.departure && f.departure.airport) || {};
    const sched = parseT(mv.scheduledTime || mv.scheduledTimeLocal || mv.scheduledTimeUtc);
    const est = parseT(mv.revisedTime) || parseT(mv.predictedTime) || parseT(mv.actualTime) || parseT(mv.runwayTime);
    return {
      no: (f.number || '').replace(/\s+/g, ' ').trim(), airline: (f.airline && f.airline.name) || '', status: f.status || 'Unknown',
      from: from.municipalityName || from.shortName || from.name || from.iata || '?', fromCode: from.iata || from.icao || '', cc: (from.countryCode || '').toUpperCase(),
      sched, est, terminal: mv.terminal || '', gate: mv.gate || '', belt: mv.baggageBelt || '', aircraft: (f.aircraft && f.aircraft.model) || '',
      cargo: !!f.isCargo, codeshare: f.codeshareStatus === 'IsCodeshared',
    };
  }

  async function fetchArrivals(key, iata, from, to) {
    const u = `https://${FL_HOST}/flights/airports/iata/${iata}/${vnLocal(from)}/${vnLocal(to)}?withLeg=false&direction=Arrival&withCancelled=true&withCodeshared=false&withCargo=false&withPrivate=false&withLocation=false`;
    const r = await fetch(u, { headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': FL_HOST } });
    const used = store.get('fl.used', {}), m = todayISO().slice(0, 7); used[m] = (used[m] || 0) + 1; store.set('fl.used', used);
    if (r.status === 204) return [];
    if (r.status === 401 || r.status === 403) throw new Error('Khoá API không đúng hoặc chưa đăng ký gói AeroDataBox (kể cả gói miễn phí)');
    if (r.status === 429) throw new Error('Hết lượt gọi API của gói hiện tại – thử lại sau hoặc nâng gói');
    if (!r.ok) throw new Error(`Máy chủ chuyến bay báo lỗi ${r.status}`);
    const j = await r.json();
    return (j.arrivals || []).map(normArrival);
  }

  TOOLS.flights = {
    title: 'Chuyến quốc tế đến', icon: '✈️', width: 460, global: true, place: 'right',
    render(b) {
      let iata = store.get('fl.airport', 'CXR'), key = store.get('fl.key', ''), filter = 'all', loading = false, err = '', showSet = !key, timer = null;
      let cache = store.get('fl.cache', null);
      const fresh = () => cache && cache.iata === iata && Date.now() - cache.at < 30 * 60000;
      async function load(force) {
        if (!key) { showSet = true; return draw(); }
        if (!force && fresh()) return draw();
        loading = true; err = ''; draw();
        try {
          const now = new Date(), from = new Date(now - 3 * 3600e3), to = new Date(+now + 9 * 3600e3 - 60000); // 12 giờ: 3 giờ trước → 9 giờ tới
          const list = await fetchArrivals(key, iata, from, to);
          cache = { iata, at: Date.now(), from: +from, to: +to, list: list.map((f) => ({ ...f, sched: f.sched && +f.sched, est: f.est && +f.est })) };
          store.set('fl.cache', cache);
        } catch (e) { err = e.message || String(e); if (/Failed to fetch|NetworkError|Load failed/i.test(err)) err = 'Không kết nối được máy chủ chuyến bay – kiểm tra mạng'; }
        loading = false; draw();
      }
      function draw() {
        const used = store.get('fl.used', {})[todayISO().slice(0, 7)] || 0;
        const all = (cache && cache.iata === iata ? cache.list : []).filter((f) => f.cc && f.cc !== 'VN' && !f.cargo).sort((a, c) => (a.est || a.sched) - (c.est || c.sched));
        const byC = {}; all.forEach((f) => (byC[f.cc] = (byC[f.cc] || 0) + 1));
        const list = filter === 'all' ? all : all.filter((f) => f.cc === filter);
        const now = Date.now(); let nextMarked = false;
        b.innerHTML = `<div class="fl-head"><div class="grow"><b>${flag('VN')} ${esc(AIRPORTS[iata] || iata)} (${esc(iata)}) · chuyến quốc tế đến</b>
            <small>${cache && cache.iata === iata ? `Cập nhật ${hhmm(new Date(cache.at))} · từ ${hhmm(new Date(cache.from))} đến ${hhmm(new Date(cache.to))} (giờ VN)` : 'Chưa có dữ liệu'}</small></div>
            <button class="btn ghost" data-r title="Tải lại">${loading ? '⏳' : '↻'}</button><button class="btn ghost" data-set title="Cài đặt">⚙️</button></div>
          ${showSet ? `<div class="fl-set">
              <p class="small"><b>Kết nối dữ liệu chuyến bay (AeroDataBox)</b></p>
              <ol class="small"><li>Vào <a href="https://rapidapi.com/aedbx-aedbx/api/aerodatabox/pricing" target="_blank" rel="noopener">rapidapi.com → AeroDataBox ↗</a>, đăng nhập bằng Google</li><li>Chọn gói <b>Basic (miễn phí)</b> → Subscribe</li><li>Sang tab <b>Endpoints</b>, copy giá trị <b>X-RapidAPI-Key</b> rồi dán vào đây</li></ol>
              <input type="password" data-key placeholder="Dán X-RapidAPI-Key" value="${esc(key)}" autocomplete="off">
              <div class="row"><select data-ap>${Object.entries(AIRPORTS).map(([k, n]) => `<option value="${k}"${k === iata ? ' selected' : ''}>${n} (${k})</option>`).join('')}</select><span class="grow"></span><button class="btn primary" data-save>Lưu & tải</button></div>
              <p class="muted small">Khoá chỉ lưu trên máy này, không gửi đi đâu ngoài máy chủ AeroDataBox. Tháng này đã dùng ${used} lượt. Mỗi lần tải dùng 1 lượt, app tự giữ kết quả 30 phút để tiết kiệm.</p></div>` : ''}
          ${err ? `<p class="fl-err">⚠️ ${esc(err)}</p>` : ''}
          ${all.length ? `<div class="chips fl-filter"><button class="chip${filter === 'all' ? ' on' : ''}" data-f="all">Tất cả <b>${all.length}</b></button>${Object.entries(byC).sort((a, c) => c[1] - a[1]).map(([cc, n]) => `<button class="chip${filter === cc ? ' on' : ''}" data-f="${cc}">${flag(cc)} ${esc(COUNTRY[cc] || cc)} <b>${n}</b></button>`).join('')}</div>` : ''}
          <ul class="fl-list">${list.map((f) => {
            const t = f.est || f.sched, st = FL_STATUS[f.status] || FL_STATUS.Unknown, past = f.status === 'Arrived' || (t && t < now - 20 * 60000);
            const isNext = !nextMarked && !past && !['cancel'].includes(st[1]) && (nextMarked = true);
            const late = f.est && f.sched && f.est - f.sched > 10 * 60000;
            return `<li class="${past ? 'past' : ''}${isNext ? ' next' : ''}"><span class="fl-time">${f.sched ? hhmm(new Date(f.sched)) : '--:--'}${f.est && f.sched && Math.abs(f.est - f.sched) > 5 * 60000 ? `<small class="${late ? 'late' : ''}">→ ${hhmm(new Date(f.est))}</small>` : ''}</span>
              <span class="fl-main"><b>${esc(f.no)}</b> <span class="fl-from">${flag(f.cc)} ${esc(f.from)}${f.fromCode ? ` (${esc(f.fromCode)})` : ''}</span><small>${esc(f.airline)}${f.aircraft ? ' · ' + esc(f.aircraft) : ''}${f.terminal ? ' · Nhà ga ' + esc(f.terminal) : ''}${f.belt ? ' · Băng chuyền ' + esc(f.belt) : ''}</small></span>
              <span class="fl-st ${st[1]}">${isNext ? 'Chuyến kế tiếp' : st[0]}</span></li>`;
          }).join('') || (loading ? '<li class="empty">Đang tải…</li>' : key && !err ? '<li class="empty">Không có chuyến quốc tế đến trong khung giờ này.</li>' : '')}</ul>
          <p class="muted small">Nguồn: AeroDataBox. Giờ hiển thị là giờ Việt Nam. Chỉ để tham khảo – lịch chính thức theo sân bay/hãng bay.</p>`;
        const q = (s) => b.querySelector(s);
        q('[data-r]').onclick = () => load(true);
        q('[data-set]').onclick = () => { showSet = !showSet; draw(); };
        b.querySelectorAll('[data-f]').forEach((x) => (x.onclick = () => { filter = x.dataset.f; draw(); }));
        if (showSet) q('[data-save]').onclick = () => { key = q('[data-key]').value.trim(); iata = q('[data-ap]').value; store.set('fl.key', key); store.set('fl.airport', iata); showSet = !key; filter = 'all'; load(true); };
      }
      draw(); load(false);
      timer = setInterval(() => { if (!document.hidden) load(false); }, 5 * 60000); // tự tải lại khi dữ liệu cũ hơn 30 phút
      return () => clearInterval(timer);
    },
  };

  window.ProDate = { todayISO, addDays, diffDays, vn, dow, holiday, lunarOf };
})();
