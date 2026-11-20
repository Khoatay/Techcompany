/* ChillSpace — nhân vật / đồ vật động đặt lên ảnh nền (SVG + CSS):
   mèo thần tài vẫy tay, nến chart nhảy, chim nhảy trên mái, mèo nằm quẫy đuôi, mòng biển bay, cá heo nhảy.
   Vị trí theo % khung cảnh 16:9 (giống các nút), tự gỡ khi đổi không gian. */
window.Sprites = (function () {
  const R = Math.random;
  const K = {
    // 🐱 mèo thần tài: thân trắng, vòng cổ đỏ, chuông vàng, ôm đồng xu, tay trái vẫy
    luckycat: () => `<svg viewBox="0 0 120 150" class="sp-luckycat">
      <defs><radialGradient id="lcB" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f4f1ec"/><stop offset="1" stop-color="#d9d3ca"/></radialGradient>
        <linearGradient id="lcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#d69a12"/></linearGradient></defs>
      <ellipse cx="60" cy="146" rx="44" ry="5" fill="#000" opacity=".25"/>
      <ellipse cx="60" cy="110" rx="40" ry="36" fill="url(#lcB)"/>
      <circle cx="60" cy="62" r="34" fill="url(#lcB)"/>
      <path d="M32 44 L30 16 L52 34 Z" fill="url(#lcB)"/><path d="M36 40 L35 23 L48 34 Z" fill="#f4a3a8"/>
      <path d="M88 44 L90 16 L68 34 Z" fill="url(#lcB)"/><path d="M84 40 L85 23 L72 34 Z" fill="#f4a3a8"/>
      <path d="M44 60 q6 -6 12 0" stroke="#3b2b2b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M64 60 q6 -6 12 0" stroke="#3b2b2b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="44" cy="70" rx="6" ry="3.5" fill="#f7b4b8" opacity=".8"/><ellipse cx="76" cy="70" rx="6" ry="3.5" fill="#f7b4b8" opacity=".8"/>
      <path d="M57 68 l3 3 l3 -3 z" fill="#e88a96"/><path d="M54 74 q6 5 12 0" stroke="#3b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
      <g class="sp-wave"><path d="M86 72 q14 -6 16 -30 q1 -10 -7 -10 q-9 0 -10 12 q-2 14 -9 20 z" fill="url(#lcB)" stroke="#d9d3ca" stroke-width="1"/>
        <path d="M92 36 q3 -3 6 0" stroke="#e8a0a0" stroke-width="2" fill="none" stroke-linecap="round"/></g>
      <path d="M30 70 h-14 M30 74 h-13 M90 70 h14 M90 74 h13" stroke="#c9c1b6" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M30 90 q30 12 60 0 l0 7 q-30 12 -60 0 z" fill="#d7263d"/>
      <circle cx="60" cy="100" r="7" fill="url(#lcG)" stroke="#a87408" stroke-width="1"/><path d="M56 101 h8" stroke="#8a5d00" stroke-width="1.5"/>
      <g class="sp-coin"><ellipse cx="40" cy="120" rx="15" ry="19" fill="url(#lcG)" stroke="#a87408" stroke-width="1.5"/><text x="40" y="125" font-size="13" text-anchor="middle" fill="#8a5d00" font-weight="700">福</text></g>
      <path d="M28 116 q-6 14 6 18 q10 2 14 -6" fill="url(#lcB)" stroke="#d9d3ca" stroke-width="1"/>
    </svg>`,
    // 📈 nến cuối trên chart nhảy lên xuống + đường giá
    candles: () => `<svg viewBox="0 0 100 160" class="sp-candles" preserveAspectRatio="none">
      <line class="sp-price" x1="0" x2="100" y1="80" y2="80" stroke="#22d3ee" stroke-width="1" stroke-dasharray="3 3" opacity=".8"/>
      <rect class="sp-tag" x="70" y="73" width="30" height="14" rx="2" fill="#16a34a"/>
      <g class="sp-c"><line x1="40" x2="40" y1="50" y2="110" stroke="#22c55e" stroke-width="2"/><rect x="33" y="65" width="14" height="30" fill="#22c55e"/></g>
    </svg>`,
    // 🐦 chim sẻ nhỏ (bóng) nhảy, mổ
    bird: () => `<svg viewBox="0 0 40 30" class="sp-bird"><g class="sp-hop"><g class="sp-peck">
      <path d="M8 20 q4 -12 16 -10 q6 1 8 -3 q3 -2 5 1 l-3 2 q-1 5 -5 8 q-6 5 -14 5 l-6 3 z" fill="#8a6a4f"/>
      <path d="M14 21 q8 4 16 -4 q-2 6 -8 8 q-5 1 -8 -4 z" fill="#e9dcc6"/><path d="M12 15 q8 -6 14 -2" stroke="#5a4231" stroke-width="2" fill="none"/>
      <path d="M33 8 l5 1 l-5 1.5 z" fill="#3b302a"/><circle cx="32" cy="7.5" r=".9" fill="#d9c9b0"/>
      <path d="M17 24 l-1 5 M21 24 l0 5" stroke="#4a3a2e" stroke-width="1.2"/></g></g></svg>`,
    // 🐈 mèo đen nằm, đuôi buông xuống quẫy (side: 'left' | 'right' = phía đuôi buông)
    catlie: (o) => `<svg viewBox="0 0 160 110" class="sp-cat${o.flip ? ' flip' : ''}">
      <ellipse cx="85" cy="70" rx="55" ry="5" fill="#000" opacity=".35"/>
      <g class="sp-tail"><path d="M30 64 q-12 6 -14 22 q-1 12 4 20" stroke="${o.color || '#151212'}" stroke-width="7" fill="none" stroke-linecap="round"/></g>
      <path d="M28 66 q4 -30 50 -32 q38 -1 52 18 q4 6 2 14 z" fill="${o.color || '#151212'}"/>
      <g class="sp-head"><circle cx="128" cy="44" r="19" fill="${o.color || '#151212'}"/>
        <path d="M114 34 l-3 -18 l14 11 z M140 32 l4 -18 l-14 11 z" fill="${o.color || '#151212'}"/>
        <path d="M120 44 q3 2 6 0 M132 44 q3 2 6 0" stroke="#e8d27a" stroke-width="2" fill="none" stroke-linecap="round" class="sp-eye"/></g>
      <path d="M100 66 q8 -2 14 0 M60 66 q8 -2 14 0" stroke="#000" stroke-width="2" opacity=".4"/>
    </svg>`,
    // 🕊️ mòng biển bay (bóng trắng xám, vỗ cánh)
    gull: () => `<svg viewBox="0 0 60 24" class="sp-gull"><g class="sp-flap">
      <path d="M2 12 q14 -10 26 2 q2 1 4 0 q12 -12 26 -2 q-12 -2 -24 8 q-2 2 -6 0 q-12 -10 -26 -8 z" fill="#f5f7fa" stroke="#7b8794" stroke-width="1"/>
      <path d="M28 13 q2 -2 4 0 l1 3 l-3 1 z" fill="#ffb020"/></g></svg>`,
    // 🐬 cá heo nhảy lên khỏi mặt nước rồi lặn, có bọt
    dolphin: () => `<svg viewBox="0 0 100 60" class="sp-dolphin"><g class="sp-jump">
      <path d="M10 40 q18 -26 46 -22 q10 1 16 -6 l2 8 q8 2 14 8 q-8 0 -14 2 q-14 14 -40 14 q-10 0 -16 6 l-2 -8 q-6 -2 -6 -2 z" fill="#5b7186"/>
      <path d="M44 20 l6 -10 l4 10 z" fill="#4a5f73"/><path d="M20 40 q24 6 48 -2" stroke="#c9d6e2" stroke-width="2" fill="none" opacity=".6"/></g>
      <g class="sp-splash"><ellipse cx="22" cy="52" rx="14" ry="3" fill="#fff" opacity=".7"/><ellipse cx="78" cy="52" rx="12" ry="2.5" fill="#fff" opacity=".6"/></g></svg>`,
  };

  function mount(list) {
    const layer = document.createElement('div'); layer.className = 'sprites';
    const timers = [];
    (list || []).forEach((s) => {
      if (!K[s.k]) return;
      const el = document.createElement('div'); el.className = 'sp sp-' + s.k;
      el.style.cssText = `left:${s.x}%;top:${s.y}%;width:${s.w}%;${s.h ? `height:${s.h}%;` : ''}--d:${(s.delay != null ? s.delay : R() * 3).toFixed(2)}s;--dur:${s.dur || 0}s`;
      el.innerHTML = K[s.k](s);
      layer.append(el);
      if (s.k === 'candles') { // nến nhảy: giá đổi mỗi ~0,7 giây
        const c = el.querySelector('.sp-c'), line = el.querySelector('.sp-price'), tag = el.querySelector('.sp-tag');
        let open = 85, close = 75;
        timers.push(setInterval(() => {
          if (!el.isConnected) return;
          close = Math.max(30, Math.min(130, close + (R() - .48) * 14));
          const up = close < open, top = Math.min(open, close), h = Math.max(3, Math.abs(open - close)), col = up ? '#22c55e' : '#ef4444';
          c.innerHTML = `<line x1="40" x2="40" y1="${top - 6 - R() * 10}" y2="${top + h + 6 + R() * 10}" stroke="${col}" stroke-width="2"/><rect x="33" y="${top}" width="14" height="${h}" fill="${col}"/>`;
          line.setAttribute('y1', close); line.setAttribute('y2', close); tag.setAttribute('y', close - 7); tag.setAttribute('fill', up ? '#16a34a' : '#dc2626');
          if (R() < .06) open = close; // thỉnh thoảng sang nến mới
        }, 700));
      }
      if (s.k === 'bird') { // chim nhảy qua lại trên mái
        let x = s.x;
        timers.push(setInterval(() => { if (!el.isConnected) return; if (R() < .5) { x = Math.max(s.x - (s.range || 2), Math.min(s.x + (s.range || 2), x + (R() - .5) * 1.6)); el.style.left = x + '%'; el.classList.toggle('turn', R() < .35 ? !el.classList.contains('turn') : el.classList.contains('turn')); } }, 1400 + R() * 900));
      }
    });
    const stop = () => timers.forEach(clearInterval);
    const watch = setInterval(() => { if (!layer.isConnected) { stop(); clearInterval(watch); } }, 3000);
    return layer;
  }
  return { mount, kinds: Object.keys(K) };
})();
