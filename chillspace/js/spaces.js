/* ChillSpace — định nghĩa các không gian + phong cảnh vẽ bằng SVG (không dùng ảnh có bản quyền) */
(function () {
  const lg = (id, stops, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
      .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`)
      .join('')}</linearGradient>`;
  const rg = (id, stops) =>
    `<radialGradient id="${id}">${stops
      .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op == null ? 1 : op}"/>`)
      .join('')}</radialGradient>`;
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const svg = (defs, body) =>
    `<svg viewBox="0 0 1600 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;

  function wave(y, amp, len, color, width, cls, op = 1) {
    let d = `M -${len * 4} ${y}`;
    for (let i = 0; i < 16; i++) d += ` q ${len / 4} ${-amp} ${len / 2} 0 t ${len / 2} 0`;
    return `<g class="${cls}" style="--len:${len}px"><path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" opacity="${op}"/></g>`;
  }
  function stars(n, x0, y0, w, h, seed, maxR = 1.8) {
    const r = rnd(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const tw = i % 4 === 0 ? ` class="tw" style="animation-delay:${(r() * 4).toFixed(2)}s"` : '';
      s += `<circle cx="${(x0 + r() * w).toFixed(1)}" cy="${(y0 + r() * h).toFixed(1)}" r="${(0.5 + r() * maxR).toFixed(2)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"${tw}/>`;
    }
    return s;
  }
  function cloud(x, y, s, op = 0.9) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="${op}"><ellipse cx="0" cy="0" rx="70" ry="28"/><ellipse cx="-40" cy="8" rx="50" ry="22"/><ellipse cx="45" cy="6" rx="55" ry="24"/><ellipse cx="5" cy="-18" rx="40" ry="26"/></g>`;
  }
  function windowFrame(x, y, w, h, color, bar = 12) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="${color}" stroke-width="${bar * 1.6}"/><line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${color}" stroke-width="${bar}"/><line x1="${x}" y1="${y + h * 0.45}" x2="${x + w}" y2="${y + h * 0.45}" stroke="${color}" stroke-width="${bar}"/>`;
  }

  /* ---------------- phong cảnh ---------------- */
  const SCENES = {
    beach: (p) =>
      svg(
        lg(p + 'sky', [[0, '#1d1a4a'], [0.42, '#8f4a86'], [0.72, '#ff8a5c'], [1, '#ffc778']]) +
          lg(p + 'sea', [[0, '#f29a72'], [0.2, '#b0607c'], [1, '#1f3557']]) +
          lg(p + 'sand', [[0, '#f6d39d'], [1, '#d39a5f']]) +
          rg(p + 'glow', [[0, '#ffe7a8', 0.9], [0.4, '#ffb36b', 0.35], [1, '#ff8a5c', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}sky)"/>
         ${stars(40, 0, 0, 1600, 220, 7, 1.2)}
         <circle cx="800" cy="520" r="330" fill="url(#${p}glow)"/>
         <circle cx="800" cy="520" r="96" fill="#ffe2a1"/>
         <rect y="520" width="1600" height="260" fill="url(#${p}sea)"/>
         <g class="shimmer" fill="#ffd9a0">
           <rect x="700" y="532" width="200" height="6" rx="3" opacity=".7"/><rect x="725" y="552" width="150" height="5" rx="3" opacity=".6"/>
           <rect x="745" y="575" width="110" height="5" rx="3" opacity=".5"/><rect x="765" y="602" width="70" height="4" rx="2" opacity=".45"/>
           <rect x="780" y="632" width="40" height="4" rx="2" opacity=".4"/></g>
         ${wave(585, 6, 400, '#ffd2b0', 2, 'drift slow', 0.35)}
         ${wave(640, 9, 500, '#ffe0c8', 3, 'drift', 0.3)}
         ${wave(705, 12, 600, '#ffffff', 3, 'drift fast', 0.35)}
         <path d="M0 760 Q 300 725 650 748 T 1250 742 T 1600 735 V900 H0Z" fill="url(#${p}sand)"/>
         <path class="foam" d="M0 760 Q 300 725 650 748 T 1250 742 T 1600 735" fill="none" stroke="#fff" stroke-width="5" opacity=".55"/>
         <ellipse cx="1240" cy="845" rx="60" ry="10" fill="#b77d47" opacity=".5"/>`
      ),

    study: (p) =>
      svg(
        lg(p + 'wall', [[0, '#f6e7cf'], [1, '#e7cba1']]) +
          lg(p + 'floor', [[0, '#b98a5e'], [1, '#7f5636']]) +
          lg(p + 'sky', [[0, '#7cc8f7'], [1, '#d8f1ff']]) +
          lg(p + 'desk', [[0, '#b07446'], [1, '#7d4e2b']]) +
          rg(p + 'glow', [[0, '#fff1c2', 0.75], [1, '#fff1c2', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         <rect x="1000" y="100" width="420" height="320" fill="url(#${p}sky)"/>
         ${cloud(1110, 180, 0.8)}${cloud(1330, 240, 0.6)}
         <circle cx="1060" cy="410" r="70" fill="#5aa469"/><circle cx="1130" cy="400" r="55" fill="#6cbf7b"/><circle cx="1370" cy="415" r="65" fill="#5aa469"/>
         ${windowFrame(1000, 100, 420, 320, '#fbf3e4', 12)}
         <rect x="985" y="420" width="450" height="18" rx="4" fill="#d9bb8e"/>
         ${(() => {
           const r = rnd(3), cols = ['#c0392b', '#2e86de', '#f6b93b', '#10ac84', '#8e44ad', '#e15f41', '#546de5', '#3dc1d3'];
           let s = '', x = 175;
           while (x < 520) { const w = 18 + r() * 16, hh = 70 + r() * 45; s += `<rect x="${x}" y="${170 - hh}" width="${w}" height="${hh}" rx="3" fill="${cols[Math.floor(r() * cols.length)]}"/>`; x += w + 3; }
           x = 330;
           while (x < 520) { const w = 18 + r() * 14, hh = 60 + r() * 40; s += `<rect x="${x}" y="${330 - hh}" width="${w}" height="${hh}" rx="3" fill="${cols[Math.floor(r() * cols.length)]}"/>`; x += w + 3; }
           return s;
         })()}
         <rect x="160" y="170" width="380" height="16" rx="3" fill="#8b5a3c"/><rect x="160" y="330" width="380" height="16" rx="3" fill="#8b5a3c"/>
         <rect y="760" width="1600" height="140" fill="url(#${p}floor)"/>
         <rect x="220" y="600" width="1160" height="36" rx="8" fill="url(#${p}desk)"/>
         <rect x="260" y="636" width="28" height="140" fill="#6b4226"/><rect x="1312" y="636" width="28" height="140" fill="#6b4226"/>
         <rect x="300" y="636" width="300" height="90" rx="6" fill="#8e5a35"/><rect x="430" y="676" width="40" height="8" rx="4" fill="#d6a671"/>
         <circle cx="1325" cy="470" r="230" fill="url(#${p}glow)"/>
         <path d="M1300 600 L1300 590 L1270 500 L1330 430" stroke="#3b3b3b" stroke-width="10" fill="none" stroke-linecap="round"/>
         <path d="M1300 405 L1375 455 L1350 480 L1290 440Z" fill="#2d6a4f"/><ellipse cx="1300" cy="600" rx="40" ry="8" fill="#3b3b3b"/>`
      ),

    work: (p) =>
      svg(
        lg(p + 'wall', [[0, '#1a2433'], [1, '#253649']]) +
          lg(p + 'sky', [[0, '#1b2340'], [0.6, '#6b4e7a'], [1, '#e3856b']]) +
          lg(p + 'screen', [[0, '#16324f'], [1, '#0d1b2a']]) +
          rg(p + 'glow', [[0, '#6fb7ff', 0.35], [1, '#6fb7ff', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         <rect x="120" y="90" width="1360" height="400" fill="url(#${p}sky)"/>
         ${stars(30, 120, 90, 1360, 120, 11, 1)}
         ${(() => {
           const r = rnd(21);
           let s = '', x = 120;
           while (x < 1480) {
             const w = 40 + r() * 70, hh = 80 + r() * 190, top = 490 - hh, c = r() > 0.5 ? '#121a2b' : '#172036';
             s += `<rect x="${x}" y="${top}" width="${Math.min(w, 1480 - x)}" height="${hh}" fill="${c}"/>`;
             for (let wy = top + 12; wy < 480; wy += 18) for (let wx = x + 8; wx < x + w - 10 && wx < 1470; wx += 14) if (r() > 0.62) s += `<rect x="${wx}" y="${wy}" width="6" height="8" fill="#ffd27a" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
             x += w + 4;
           }
           return s;
         })()}
         <rect x="120" y="90" width="1360" height="400" fill="none" stroke="#0e141e" stroke-width="18"/>
         <line x1="573" y1="90" x2="573" y2="490" stroke="#0e141e" stroke-width="10"/><line x1="1027" y1="90" x2="1027" y2="490" stroke="#0e141e" stroke-width="10"/>
         <rect y="760" width="1600" height="140" fill="#0e131a"/>
         <circle cx="800" cy="500" r="420" fill="url(#${p}glow)"/>
         <rect x="260" y="620" width="1080" height="28" rx="6" fill="#2f2f37"/><rect x="260" y="620" width="1080" height="4" rx="2" fill="#4a4a56"/>
         <rect x="300" y="648" width="22" height="130" fill="#1e1e24"/><rect x="1278" y="648" width="22" height="130" fill="#1e1e24"/>
         <rect x="770" y="590" width="60" height="30" fill="#2a2a32"/><rect x="740" y="612" width="120" height="10" rx="4" fill="#3a3a44"/>
         <rect x="630" y="390" width="340" height="210" rx="12" fill="#0f1622" stroke="#39465a" stroke-width="6"/>
         <rect x="645" y="405" width="310" height="180" rx="6" fill="url(#${p}screen)"/>
         ${(() => { const r = rnd(5), cols = ['#7dd3fc', '#f9a8d4', '#fde68a', '#86efac', '#c4b5fd']; let s = ''; for (let i = 0; i < 9; i++) s += `<rect x="${662 + (i % 3) * 14}" y="${420 + i * 18}" width="${40 + r() * 150}" height="6" rx="3" fill="${cols[i % 5]}" opacity=".55"/>`; return s; })()}
         <rect x="560" y="610" width="200" height="12" rx="5" fill="#3f3f4a"/>`
      ),

    pirate: (p) =>
      svg(
        lg(p + 'sky', [[0, '#3aa6f2'], [1, '#bfe8ff']]) +
          lg(p + 'sea', [[0, '#1e88e5'], [1, '#0b3d91']]) +
          lg(p + 'deck', [[0, '#a8703c'], [1, '#6d4423']]) +
          lg(p + 'sail', [[0, '#fff7e6'], [1, '#f0dcb4']], 1, 0) +
          rg(p + 'sun', [[0, '#fffbd0', 1], [0.35, '#fff1a0', 0.6], [1, '#fff1a0', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}sky)"/>
         <circle cx="300" cy="140" r="170" fill="url(#${p}sun)"/><circle cx="300" cy="140" r="55" fill="#fff8c4"/>
         <g class="clouds">${cloud(600, 150, 1)}${cloud(980, 90, 0.7)}${cloud(1500, 200, 0.9)}${cloud(2100, 120, 0.8)}</g>
         <path d="M520 560 Q 600 470 690 560Z" fill="#2e7d32"/><path d="M600 500 q 10 -40 -5 -70" stroke="#5d4037" stroke-width="6" fill="none"/>
         <path d="M595 430 q -40 0 -55 25 M595 430 q 40 -5 55 20 M595 430 q -15 -30 -45 -35 M595 430 q 20 -30 50 -30" stroke="#388e3c" stroke-width="9" fill="none" stroke-linecap="round"/>
         <rect y="555" width="1600" height="345" fill="url(#${p}sea)"/>
         ${wave(600, 7, 360, '#bbdefb', 3, 'drift slow', 0.5)}
         ${wave(650, 10, 460, '#e3f2fd', 3, 'drift', 0.45)}
         <rect x="0" y="690" width="1600" height="22" rx="6" fill="#7b4a22"/>
         ${(() => { let s = ''; for (let x = 30; x < 1600; x += 110) s += `<rect x="${x}" y="705" width="16" height="70" fill="#6d4423"/>`; return s; })()}
         <rect y="760" width="1600" height="140" fill="url(#${p}deck)"/>
         ${(() => { let s = ''; for (let y = 790; y < 900; y += 32) s += `<line x1="0" y1="${y}" x2="1600" y2="${y}" stroke="#5a371b" stroke-width="3" opacity=".6"/>`; return s; })()}
         <path d="M1395 70 L1120 150 Q 1060 330 1130 520 L1395 470Z" fill="url(#${p}sail)" class="sail"/>
         <circle cx="1255" cy="310" r="62" fill="none" stroke="#c0392b" stroke-width="10"/>
         <path d="M1255 255 L1270 300 L1312 310 L1270 322 L1255 365 L1240 322 L1198 310 L1240 300Z" fill="#c0392b"/>
         <rect x="1380" y="20" width="36" height="760" fill="#6d4423"/>
         <line x1="1398" y1="40" x2="1600" y2="700" stroke="#4e342e" stroke-width="4"/><line x1="1398" y1="40" x2="1000" y2="700" stroke="#4e342e" stroke-width="3" opacity=".8"/>`
      ),

    football: (p) =>
      svg(
        lg(p + 'sky', [[0, '#050b1d'], [1, '#16305c']]) +
          lg(p + 'stand', [[0, '#141b2d'], [1, '#232c45']]) +
          rg(p + 'flood', [[0, '#ffffff', 0.85], [0.25, '#e8f1ff', 0.35], [1, '#e8f1ff', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}sky)"/>
         ${stars(40, 0, 0, 1600, 200, 5, 1)}
         <path d="M0 470 L0 300 Q 800 210 1600 300 L1600 470Z" fill="url(#${p}stand)"/>
         ${(() => {
           const r = rnd(9), cols = ['#e53935', '#fdd835', '#1e88e5', '#ffffff', '#43a047', '#fb8c00', '#ec407a'];
           let s = '';
           for (let i = 0; i < 650; i++) {
             const x = r() * 1600, y = 300 - Math.sin((x / 1600) * Math.PI) * 80 + 15 + r() * (150 + Math.sin((x / 1600) * Math.PI) * 70);
             if (y > 462) continue;
             s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + r() * 2.5).toFixed(1)}" fill="${cols[Math.floor(r() * cols.length)]}" opacity=".85"${i % 9 === 0 ? ' class="bob"' : ''}/>`;
           }
           return s;
         })()}
         <rect x="0" y="462" width="1600" height="26" fill="#0d47a1"/>
         ${(() => { let s = '', c = ['#fdd835', '#e53935', '#ffffff', '#43a047']; for (let x = 0, i = 0; x < 1600; x += 200, i++) s += `<rect x="${x + 10}" y="466" width="180" height="18" rx="3" fill="${c[i % 4]}" opacity=".85"/>`; return s; })()}
         <polygon points="-300,900 1900,900 1260,488 340,488" fill="#2e7d32"/>
         ${(() => {
           let s = '';
           const L = (y) => 340 + ((y - 488) / 412) * -640, R = (y) => 1260 + ((y - 488) / 412) * 640;
           const ys = [488, 515, 548, 588, 636, 694, 764, 848, 900];
           for (let i = 0; i < ys.length - 1; i += 2) s += `<polygon points="${L(ys[i])},${ys[i]} ${R(ys[i])},${ys[i]} ${R(ys[i + 1])},${ys[i + 1]} ${L(ys[i + 1])},${ys[i + 1]}" fill="#388e3c"/>`;
           return s;
         })()}
         <g fill="none" stroke="#fff" stroke-width="3" opacity=".85">
           <polygon points="40,880 1560,880 1235,505 365,505"/>
           <line x1="245" y1="640" x2="1355" y2="640"/>
           <ellipse cx="800" cy="640" rx="160" ry="44"/>
           <polygon points="640,505 960,505 975,535 625,535"/>
         </g>
         <circle cx="800" cy="640" r="4" fill="#fff"/>
         <circle cx="180" cy="110" r="330" fill="url(#${p}flood)"/><circle cx="1420" cy="110" r="330" fill="url(#${p}flood)"/>
         <rect x="130" y="90" width="100" height="40" rx="4" fill="#e8f1ff"/><rect x="1370" y="90" width="100" height="40" rx="4" fill="#e8f1ff"/>
         <rect x="176" y="130" width="8" height="190" fill="#2a3550"/><rect x="1416" y="130" width="8" height="190" fill="#2a3550"/>`
      ),

    bedroom: (p) =>
      svg(
        lg(p + 'wall', [[0, '#2b2350'], [1, '#43316e']]) +
          lg(p + 'floor', [[0, '#3a2b55'], [1, '#1f1533']]) +
          lg(p + 'sky', [[0, '#0b1636'], [1, '#2a4380']]) +
          rg(p + 'lamp', [[0, '#ffcf7a', 0.8], [1, '#ffcf7a', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         <rect x="980" y="140" width="420" height="330" fill="url(#${p}sky)"/>
         ${stars(45, 985, 145, 410, 300, 13, 1.5)}
         ${windowFrame(980, 140, 420, 330, '#1b1433', 12)}
         <path d="M960 120 Q 1190 200 1420 120 L1430 480 Q 1400 300 1360 130 M960 120 L955 480 Q 990 300 1020 140" fill="#7a5fc0" opacity=".55"/>
         <path d="M80 90 Q 480 190 900 90" fill="none" stroke="#6b5a9a" stroke-width="2"/>
         ${(() => { let s = ''; for (let i = 0; i <= 14; i++) { const t = i / 14, x = 80 + t * 820, y = 90 + Math.sin(t * Math.PI) * 50 + 6; s += `<circle cx="${x}" cy="${y}" r="7" fill="#ffd56b" class="tw" style="animation-delay:${(i * 0.37) % 3}s"/>`; } return s; })()}
         <rect y="780" width="1600" height="120" fill="url(#${p}floor)"/>
         <ellipse cx="900" cy="845" rx="380" ry="40" fill="#5c4a8f" opacity=".6"/>
         <rect x="60" y="430" width="60" height="370" rx="22" fill="#4b3b80"/>
         <rect x="80" y="560" width="780" height="240" rx="34" fill="#6a58a8"/>
         <ellipse cx="200" cy="585" rx="105" ry="45" fill="#ece4ff"/>
         <rect x="300" y="585" width="560" height="215" rx="30" fill="#8f7ad1"/>
         <path d="M330 640 Q 580 610 840 650" stroke="#a796e0" stroke-width="6" fill="none"/>
         <circle cx="1010" cy="520" r="220" fill="url(#${p}lamp)"/>
         <rect x="880" y="640" width="200" height="160" rx="12" fill="#55438e"/><rect x="900" y="700" width="160" height="6" rx="3" fill="#3c2f6b"/>
         <rect x="1003" y="560" width="10" height="80" fill="#c9b37a"/><path d="M965 560 L1050 560 L1030 505 L985 505Z" fill="#ffd98a"/>`
      ),

    cafe: (p) =>
      svg(
        `<pattern id="${p}brick" width="120" height="50" patternUnits="userSpaceOnUse"><rect width="120" height="50" fill="#6b3a28"/><rect x="2" y="2" width="56" height="21" fill="#7a4430"/><rect x="62" y="2" width="56" height="21" fill="#73402c"/><rect x="-28" y="27" width="56" height="21" fill="#7d4733"/><rect x="32" y="27" width="56" height="21" fill="#713e2b"/><rect x="92" y="27" width="56" height="21" fill="#7a4430"/></pattern>` +
          lg(p + 'shade', [[0, '#000', 0.15], [1, '#000', 0.55]]) +
          lg(p + 'street', [[0, '#1b2740'], [1, '#3b4767']]) +
          lg(p + 'table', [[0, '#a8713f'], [1, '#6b4223']]) +
          rg(p + 'warm', [[0, '#ffc773', 0.7], [1, '#ffc773', 0]]) +
          `<filter id="${p}blur"><feGaussianBlur stdDeviation="8"/></filter>`,
        `<rect width="1600" height="900" fill="url(#${p}brick)"/><rect width="1600" height="900" fill="url(#${p}shade)"/>
         <rect x="900" y="120" width="560" height="360" fill="url(#${p}street)"/>
         <g filter="url(#${p}blur)">${(() => { const r = rnd(17), c = ['#ffd27a', '#ff9e7a', '#ffe9b0', '#9ad0ff']; let s = ''; for (let i = 0; i < 22; i++) s += `<circle cx="${910 + r() * 540}" cy="${300 + r() * 170}" r="${8 + r() * 18}" fill="${c[i % 4]}" opacity="${0.4 + r() * 0.5}"/>`; return s; })()}</g>
         <rect x="1180" y="250" width="8" height="230" fill="#20283b"/><circle cx="1184" cy="250" r="14" fill="#ffe3a0"/>
         ${windowFrame(900, 120, 560, 360, '#2a1810', 12)}
         <rect x="880" y="480" width="600" height="22" rx="4" fill="#3b2216"/>
         <rect x="110" y="290" width="320" height="240" rx="10" fill="#2b352d" stroke="#8a5a36" stroke-width="12"/>
         <g font-family="'Be Vietnam Pro',sans-serif" fill="#f1efe6" opacity=".9">
           <text x="270" y="340" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="4">MENU</text>
           <text x="140" y="390" font-size="20">Cà phê sữa đá</text><text x="400" y="390" font-size="20" text-anchor="end">25k</text>
           <text x="140" y="428" font-size="20">Bạc xỉu</text><text x="400" y="428" font-size="20" text-anchor="end">29k</text>
           <text x="140" y="466" font-size="20">Trà đào cam sả</text><text x="400" y="466" font-size="20" text-anchor="end">35k</text>
           <text x="140" y="504" font-size="20">Cà phê trứng</text><text x="400" y="504" font-size="20" text-anchor="end">39k</text>
         </g>
         ${[330, 700].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="170" stroke="#1a1a1a" stroke-width="3"/><circle cx="${x}" cy="230" r="170" fill="url(#${p}warm)"/><path d="M${x - 55} 215 L${x + 55} 215 L${x + 25} 170 L${x - 25} 170Z" fill="#2b2b2b"/><circle cx="${x}" cy="222" r="14" fill="#fff0c4"/>`).join('')}
         <rect y="790" width="1600" height="110" fill="#2a1a12"/>
         <ellipse cx="600" cy="690" rx="440" ry="78" fill="#3b2418"/>
         <ellipse cx="600" cy="676" rx="430" ry="70" fill="url(#${p}table)"/>
         <rect x="580" y="740" width="40" height="70" fill="#3b2418"/>
         <rect x="1190" y="760" width="200" height="22" rx="10" fill="#5a3522"/><rect x="1280" y="782" width="20" height="80" fill="#3b2418"/>`
      ),

    rainy: (p) =>
      svg(
        lg(p + 'wall', [[0, '#0f131d'], [1, '#1b2132']]) +
          lg(p + 'sky', [[0, '#0b1626'], [1, '#26425f']]) +
          rg(p + 'candle', [[0, '#ffbf69', 0.55], [1, '#ffbf69', 0]]) +
          `<filter id="${p}blur"><feGaussianBlur stdDeviation="12"/></filter>`,
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         <rect x="200" y="80" width="1200" height="520" fill="url(#${p}sky)"/>
         <g filter="url(#${p}blur)">${(() => { const r = rnd(23), c = ['#ffcc80', '#ff8a80', '#80d8ff', '#fff59d', '#b388ff']; let s = ''; for (let i = 0; i < 40; i++) s += `<circle cx="${210 + r() * 1180}" cy="${330 + r() * 260}" r="${10 + r() * 26}" fill="${c[i % 5]}" opacity="${0.25 + r() * 0.45}"/>`; return s; })()}</g>
         ${(() => { const r = rnd(31); let s = ''; for (let i = 0; i < 60; i++) { const x = 210 + r() * 1180, y = 90 + r() * 480; s += `<ellipse cx="${x}" cy="${y}" rx="${1.5 + r() * 2.5}" ry="${2.5 + r() * 4}" fill="#cfe3ff" opacity="${0.25 + r() * 0.35}"/>`; } return s; })()}
         ${windowFrame(200, 80, 1200, 520, '#0a0d14', 16)}
         <rect x="160" y="600" width="1280" height="34" rx="6" fill="#2a3040"/>
         <rect y="634" width="1600" height="266" fill="#121722"/>
         <circle cx="320" cy="560" r="240" fill="url(#${p}candle)" class="flicker"/>`
      ),

    camp: (p) =>
      svg(
        lg(p + 'sky', [[0, '#050818'], [0.6, '#16224a'], [1, '#2f3a6e']]) +
          rg(p + 'fire', [[0, '#ff9d3c', 0.75], [0.4, '#ff6a1f', 0.25], [1, '#ff6a1f', 0]]) +
          `<filter id="${p}blur"><feGaussianBlur stdDeviation="30"/></filter>`,
        `<rect width="1600" height="900" fill="url(#${p}sky)"/>
         <ellipse cx="800" cy="200" rx="900" ry="70" fill="#c9d3ff" opacity=".08" transform="rotate(-12 800 200)" filter="url(#${p}blur)"/>
         ${stars(220, 0, 0, 1600, 520, 41, 1.6)}
         <circle cx="1320" cy="140" r="42" fill="#fff6d6"/><circle cx="1340" cy="128" r="40" fill="#0b1029"/>
         <path d="M0 560 L180 400 L330 500 L520 330 L720 480 L900 360 L1100 500 L1300 380 L1600 520 V900 H0Z" fill="#1b2547"/>
         <path d="M0 640 L240 520 L430 600 L650 500 L860 610 L1080 520 L1330 610 L1600 540 V900 H0Z" fill="#121a34"/>
         ${(() => { const r = rnd(51); let s = ''; for (let x = -20; x < 1640; x += 38 + r() * 40) { if (x > 560 && x < 1040) continue; const h = 90 + r() * 120, b = 690 + r() * 20; s += `<path d="M${x} ${b} L${x + h * 0.28} ${b - h} L${x + h * 0.56} ${b}Z" fill="#0a1124"/>`; } return s; })()}
         <rect y="700" width="1600" height="200" fill="#090e1c"/>
         <circle cx="800" cy="720" r="420" fill="url(#${p}fire)" class="flicker"/>
         <rect x="720" y="738" width="160" height="22" rx="10" fill="#5d3a1e" transform="rotate(12 800 748)"/>
         <rect x="720" y="738" width="160" height="22" rx="10" fill="#6d4423" transform="rotate(-12 800 748)"/>`
      ),

    space: (p) =>
      svg(
        lg(p + 'bg', [[0, '#03040c'], [1, '#0d1036']]) +
          rg(p + 'planet', [[0, '#9be7ff'], [0.5, '#3f6fd8'], [1, '#191c5c']]) +
          lg(p + 'console', [[0, '#202a3d'], [1, '#0b0f18']]) +
          `<filter id="${p}blur"><feGaussianBlur stdDeviation="40"/></filter>`,
        `<rect width="1600" height="900" fill="url(#${p}bg)"/>
         <ellipse cx="400" cy="300" rx="380" ry="160" fill="#7b2ff7" opacity=".28" filter="url(#${p}blur)"/>
         <ellipse cx="1000" cy="500" rx="300" ry="130" fill="#00bcd4" opacity=".18" filter="url(#${p}blur)"/>
         ${stars(260, 80, 60, 1440, 560, 61, 1.6)}
         <g class="spin-slow"><circle cx="1120" cy="330" r="190" fill="url(#${p}planet)"/></g>
         <ellipse cx="1120" cy="330" rx="300" ry="58" fill="none" stroke="#ffd9b0" stroke-width="14" opacity=".55" transform="rotate(-14 1120 330)"/>
         <circle cx="560" cy="180" r="26" fill="#d6d6e6"/><circle cx="552" cy="172" r="6" fill="#b4b4c8"/>
         <path fill-rule="evenodd" fill="#141a26" d="M0 0 H1600 V900 H0Z M140 60 H1460 Q1520 60 1520 120 V560 Q1520 620 1460 620 H140 Q80 620 80 560 V120 Q80 60 140 60Z"/>
         <path fill="none" stroke="#2c3850" stroke-width="6" d="M140 60 H1460 Q1520 60 1520 120 V560 Q1520 620 1460 620 H140 Q80 620 80 560 V120 Q80 60 140 60Z"/>
         ${[30, 1570].map((x) => `<rect x="${x - 12}" y="120" width="24" height="440" rx="10" fill="#1d2536"/>`).join('')}
         <polygon points="0,665 1600,665 1600,900 0,900" fill="url(#${p}console)"/>
         <rect x="0" y="661" width="1600" height="6" fill="#34405a"/>
         ${(() => { const r = rnd(71), c = ['#22d3ee', '#a3e635', '#f472b6', '#facc15']; let s = ''; for (let i = 0; i < 40; i++) s += `<circle cx="${40 + r() * 1520}" cy="${690 + r() * 190}" r="3" fill="${c[i % 4]}"${i % 3 === 0 ? ` class="tw" style="animation-delay:${(r() * 3).toFixed(1)}s"` : ''}/>`; return s; })()}`
      ),

    /* ===== 6 không gian mới ===== */
    zen: (p) =>
      svg(
        lg(p + 'sky', [[0, '#f5c3d0'], [0.6, '#fbe2dc'], [1, '#fdf0e4']]) +
          lg(p + 'mt', [[0, '#a996c0'], [1, '#d6cbe0']]) +
          lg(p + 'pond', [[0, '#9fd3de'], [1, '#5c9fb3']]) +
          lg(p + 'wood', [[0, '#a2714a'], [1, '#6e4528']]),
        `<rect width="1600" height="900" fill="url(#${p}sky)"/>
         <circle cx="1180" cy="215" r="72" fill="#ec6f6f" opacity=".85"/>
         <path d="M800 570 L1150 250 L1500 570Z" fill="url(#${p}mt)"/>
         <path d="M1082 312 L1150 250 L1218 312 L1192 298 L1168 320 L1146 296 L1120 322 L1104 302Z" fill="#fff"/>
         <path d="M0 585 Q 400 505 800 565 T 1600 545 V900 H0Z" fill="#c4d6b0"/>
         <rect y="610" width="1600" height="290" fill="#b4cca1"/>
         <ellipse cx="1060" cy="690" rx="340" ry="58" fill="url(#${p}pond)"/>
         <g class="shimmer" fill="none" stroke="#fff" opacity=".5"><ellipse cx="1000" cy="690" rx="90" ry="10"/><ellipse cx="1150" cy="700" rx="60" ry="7"/><ellipse cx="900" cy="705" rx="40" ry="5"/></g>
         <g fill="#8d8f94"><rect x="1395" y="650" width="54" height="50"/><rect x="1410" y="560" width="24" height="92"/><rect x="1385" y="518" width="74" height="44" rx="4"/><polygon points="1365,520 1479,520 1422,486"/></g>
         <rect x="1402" y="528" width="40" height="24" fill="#ffe7a3"/>
         <g class="sway">${[1510, 1540, 1572].map((x, i) => `<rect x="${x}" y="${120 + i * 40}" width="14" height="${640 - i * 40}" fill="${i % 2 ? '#7fae68' : '#679a54'}"/>${[0, 1, 2, 3, 4].map((k) => `<rect x="${x - 1}" y="${200 + i * 40 + k * 110}" width="16" height="4" fill="#4f7d3e"/>`).join('')}`).join('')}</g>
         <g fill="none" stroke="#4a2f2a" stroke-linecap="round">
           <path d="M200 900 C230 700 170 560 260 430 C300 370 360 340 430 300" stroke-width="38"/>
           <path d="M255 455 C180 385 120 335 50 300" stroke-width="18"/>
           <path d="M335 362 C420 330 520 298 610 250" stroke-width="14"/>
           <path d="M262 430 C300 300 280 200 305 110" stroke-width="12"/>
         </g>
         ${(() => { const r = rnd(81), c = ['#ffb7c9', '#ffc8d6', '#ffd9e4', '#f7a1ba', '#ffe4ec'], centers = [[50, 290], [140, 235], [250, 175], [305, 100], [410, 255], [520, 225], [610, 238], [380, 320], [190, 320], [470, 300]]; let s = ''; centers.forEach(([cx, cy]) => { for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = r() * 70; s += `<circle cx="${(cx + Math.cos(a) * d).toFixed(0)}" cy="${(cy + Math.sin(a) * d * 0.7).toFixed(0)}" r="${(16 + r() * 22).toFixed(0)}" fill="${c[Math.floor(r() * c.length)]}" opacity=".92"/>`; } }); return s; })()}
         <rect y="736" width="1600" height="10" fill="#5a3a22"/>
         <rect y="744" width="1600" height="156" fill="url(#${p}wood)"/>
         ${[778, 812, 846, 880].map((y) => `<line x1="0" y1="${y}" x2="1600" y2="${y}" stroke="#5a3820" stroke-width="2" opacity=".6"/>`).join('')}`
      ),

    train: (p) =>
      svg(
        lg(p + 'wall', [[0, '#2c2332'], [1, '#18131c']]) +
          lg(p + 'night', [[0, '#0b1330'], [1, '#26335f']]) +
          lg(p + 'seat', [[0, '#80283a'], [1, '#4c1520']]) +
          lg(p + 'table', [[0, '#8f5d38'], [1, '#5e3b21']]) +
          lg(p + 'glass', [[0, '#ffffff', 0.08], [1, '#ffffff', 0]], 1, 1) +
          rg(p + 'lamp', [[0, '#ffc979', 0.6], [1, '#ffc979', 0]]) +
          `<clipPath id="${p}win"><rect x="260" y="110" width="1080" height="460" rx="40"/></clipPath>`,
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         <rect x="300" y="58" width="1000" height="12" rx="4" fill="#4a3d4f"/>${[340, 560, 780, 1000, 1220].map((x) => `<rect x="${x}" y="58" width="8" height="40" fill="#4a3d4f"/>`).join('')}
         <g clip-path="url(#${p}win)">
           <rect x="260" y="110" width="1080" height="460" fill="url(#${p}night)"/>
           ${stars(45, 260, 110, 1080, 220, 91, 1.3)}
           <g class="pass slow">${(() => { let d = 'M0 480'; for (let x = 0; x < 3600; x += 300) d += ` Q ${x + 150} ${x % 600 ? 400 : 430} ${x + 300} 480`; return `<path d="${d} V600 H0Z" fill="#17204a"/>`; })()}</g>
           <g class="pass">${(() => {
             const r = rnd(97); let base = '';
             for (let i = 0; i < 10; i++) { const x = r() * 1200, y = 470 + r() * 50; base += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1.5 + r() * 2.5).toFixed(1)}" fill="#ffd27a" opacity="${(0.6 + r() * 0.4).toFixed(2)}"/>`; }
             base += [0, 400, 800].map((x) => `<rect x="${x}" y="380" width="6" height="190" fill="#060918"/><line x1="${x}" y1="392" x2="${x + 400}" y2="400" stroke="#060918" stroke-width="2"/>`).join('');
             return [0, 1200, 2400].map((o) => `<g transform="translate(${260 + o} 0)">${base}</g>`).join('') + `<rect x="260" y="525" width="3600" height="50" fill="#0b1026"/>`;
           })()}</g>
           <rect x="260" y="110" width="1080" height="460" fill="url(#${p}glass)"/>
         </g>
         <rect x="260" y="110" width="1080" height="460" rx="40" fill="none" stroke="#3b2f3f" stroke-width="24"/>
         <rect x="210" y="86" width="60" height="530" rx="18" fill="#8b3a3a"/><rect x="1330" y="86" width="60" height="530" rx="18" fill="#8b3a3a"/>
         <circle cx="1120" cy="560" r="270" fill="url(#${p}lamp)"/>
         <rect x="420" y="600" width="760" height="30" rx="8" fill="url(#${p}table)"/>
         <rect x="780" y="630" width="40" height="270" fill="#2f1d12"/>
         <rect x="30" y="330" width="230" height="570" rx="44" fill="url(#${p}seat)"/><rect x="50" y="345" width="190" height="90" rx="30" fill="#93364a"/>
         <rect x="1340" y="330" width="230" height="570" rx="44" fill="url(#${p}seat)"/><rect x="1360" y="345" width="190" height="90" rx="30" fill="#93364a"/>
         <rect x="1112" y="550" width="16" height="50" fill="#c9b37a"/><path d="M1080 552 L1160 552 L1142 505 L1098 505Z" fill="#ffdb94"/>`
      ),

    cabin: (p) =>
      svg(
        lg(p + 'wall', [[0, '#6b4329'], [1, '#4a2d1b']]) +
          lg(p + 'sky', [[0, '#12234a'], [1, '#3b5a8d']]) +
          lg(p + 'floor', [[0, '#3d2617'], [1, '#24160d']]) +
          lg(p + 'stone', [[0, '#7b7680'], [1, '#55515b']]) +
          rg(p + 'fire', [[0, '#ffae4a', 0.75], [0.45, '#ff6a1f', 0.25], [1, '#ff6a1f', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         ${(() => { let s = ''; for (let y = 30; y < 800; y += 46) s += `<line x1="0" y1="${y}" x2="1600" y2="${y}" stroke="#3a2313" stroke-width="5" opacity=".55"/><line x1="0" y1="${y + 6}" x2="1600" y2="${y + 6}" stroke="#8a5a38" stroke-width="2" opacity=".3"/>`; return s; })()}
         <rect x="110" y="130" width="560" height="400" fill="url(#${p}sky)"/>
         ${stars(25, 110, 130, 560, 150, 103, 1.2)}
         <path d="M110 430 Q 260 380 400 420 T 670 400 V530 H110Z" fill="#dfe8f5"/>
         ${(() => { const r = rnd(107); let s = ''; for (let i = 0; i < 9; i++) { const x = 130 + i * 62 + r() * 20, h = 70 + r() * 70, b = 445 + r() * 30; s += `<path d="M${x} ${b} L${x + h * 0.3} ${b - h} L${x + h * 0.6} ${b}Z" fill="#1f3d3c"/><path d="M${x + h * 0.15} ${b - h * 0.5} L${x + h * 0.3} ${b - h} L${x + h * 0.45} ${b - h * 0.5}Z" fill="#e9f0fa"/>`; } return s; })()}
         <path d="M110 530 Q 250 505 390 522 T 670 515 V530 H110Z" fill="#fff"/>
         ${windowFrame(110, 130, 560, 400, '#2e1b0f', 12)}
         <rect x="88" y="528" width="604" height="24" rx="4" fill="#5a3720"/>
         <rect x="1180" y="0" width="200" height="320" fill="#5d5862"/>
         <rect x="1060" y="330" width="440" height="460" rx="8" fill="url(#${p}stone)"/>
         ${(() => { const r = rnd(109); let s = ''; for (let y = 345; y < 780; y += 42) for (let x = 1070 + ((y / 42) % 2) * 30; x < 1480; x += 70 + r() * 20) s += `<rect x="${x.toFixed(0)}" y="${y}" width="${Math.min(50 + r() * 15, 1492 - x).toFixed(0)}" height="32" rx="8" fill="#8a858f" opacity="${(0.25 + r() * 0.3).toFixed(2)}"/>`; return s; })()}
         <rect x="1030" y="306" width="500" height="30" rx="5" fill="#4a2e1a"/>
         <path d="M1150 790 V610 Q1150 525 1280 525 Q1410 525 1410 610 V790Z" fill="#1a0f0a"/>
         <circle cx="1280" cy="730" r="340" fill="url(#${p}fire)" class="flicker"/>
         <rect x="1200" y="752" width="160" height="22" rx="10" fill="#5d3a1e" transform="rotate(8 1280 760)"/><rect x="1200" y="752" width="160" height="22" rx="10" fill="#6d4423" transform="rotate(-8 1280 760)"/>
         <rect y="790" width="1600" height="110" fill="url(#${p}floor)"/>
         <ellipse cx="720" cy="852" rx="430" ry="40" fill="#8a2f2f"/><ellipse cx="720" cy="852" rx="380" ry="30" fill="none" stroke="#d9a35b" stroke-width="4" stroke-dasharray="14 10"/>
         <rect x="545" y="515" width="250" height="150" rx="55" fill="#a0523d"/>
         <rect x="520" y="620" width="300" height="170" rx="40" fill="#b5634b"/>
         <rect x="500" y="600" width="70" height="190" rx="30" fill="#a0523d"/><rect x="770" y="600" width="70" height="190" rx="30" fill="#a0523d"/>`
      ),

    ocean: (p) =>
      svg(
        lg(p + 'water', [[0, '#0b6c8f'], [0.5, '#064763'], [1, '#03263a']]) +
          lg(p + 'sand', [[0, '#d8bb83'], [1, '#a88553']]) +
          lg(p + 'ray', [[0, '#ffffff', 0.35], [1, '#ffffff', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}water)"/>
         <g class="rays" fill="url(#${p}ray)"><polygon points="300,0 430,0 640,900 380,900"/><polygon points="760,0 840,0 980,900 820,900"/><polygon points="1180,0 1300,0 1420,900 1200,900"/></g>
         <path d="M0 700 Q 200 560 420 640 T 820 620 L820 900 H0Z" fill="#05344b" opacity=".8"/>
         <path d="M1000 690 Q 1250 560 1600 620 V900 H1000Z" fill="#053149" opacity=".8"/>
         ${[[300, 60, 0], [520, 44, -12], [220, 52, -24], [400, 36, -31]].map(([y, f, d]) => `<g class="swim" style="animation-delay:${d}s"><text x="0" y="${y}" font-size="${f}">🐟</text></g>`).join('')}
         <g class="swim" style="animation-duration:60s;animation-delay:-8s"><text x="0" y="470" font-size="70">🐠</text></g>
         <path d="M0 790 Q 400 745 800 772 T 1600 760 V900 H0Z" fill="url(#${p}sand)"/>
         ${[[110, 520], [160, 580], [205, 540], [1430, 540], [1480, 600], [1530, 520], [1010, 610]].map(([x, top], i) => `<path class="sway" style="animation-delay:${i * 0.6}s" d="M${x} 800 C ${x - 30} ${(800 + top) / 2 + 60} ${x + 30} ${(800 + top) / 2 - 40} ${x} ${top}" fill="none" stroke="${i % 2 ? '#3aa06a' : '#2e8b57'}" stroke-width="14" stroke-linecap="round"/>`).join('')}
         ${(() => { const r = rnd(113), c = ['#ff7f9e', '#ff9f43', '#f368e0', '#feca57']; let s = ''; for (let i = 0; i < 26; i++) s += `<circle cx="${(880 + r() * 260).toFixed(0)}" cy="${(760 + r() * 40).toFixed(0)}" r="${(8 + r() * 16).toFixed(0)}" fill="${c[i % 4]}" opacity=".85"/>`; return s; })()}
         <path d="M1180 790 L1170 720 M1170 720 L1150 690 M1170 720 L1195 685 M1180 760 L1210 730" stroke="#ff7f9e" stroke-width="9" stroke-linecap="round"/>`
      ),

    village: (p) =>
      svg(
        lg(p + 'sky', [[0, '#ffa863'], [0.45, '#ffd39a'], [0.8, '#fff1cc']]) +
          lg(p + 'field', [[0, '#a9cf62'], [1, '#5b9a37']]) +
          rg(p + 'sun', [[0, '#fff7d6', 0.9], [0.4, '#ffe39a', 0.45], [1, '#ffd08a', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}sky)"/>
         <circle cx="800" cy="470" r="320" fill="url(#${p}sun)"/><circle cx="800" cy="470" r="78" fill="#fff4c8"/>
         <g class="clouds" opacity=".8">${cloud(500, 170, 0.9, 0.7)}${cloud(1500, 120, 0.7, 0.6)}${cloud(2100, 200, 0.8, 0.7)}</g>
         <line x1="1215" y1="215" x2="1010" y2="700" stroke="#6d4c41" stroke-width="2" opacity=".55"/>
         ${(() => { const r = rnd(127); let s = ''; for (let x = -20; x < 1640; x += 26 + r() * 30) s += `<circle cx="${x.toFixed(0)}" cy="${(510 + r() * 14).toFixed(0)}" r="${(18 + r() * 26).toFixed(0)}" fill="${r() > 0.5 ? '#4f7a3a' : '#5c8a43'}"/>`; return s; })()}
         <rect x="140" y="420" width="270" height="125" fill="#ead6ab"/><rect x="250" y="470" width="50" height="75" fill="#6d4c41"/><rect x="170" y="455" width="45" height="38" fill="#8d6e63"/><rect x="335" y="455" width="45" height="38" fill="#8d6e63"/>
         <polygon points="110,428 440,428 385,355 165,355" fill="#a0432b"/>${[370, 385, 400, 415].map((y) => `<line x1="${110 + (428 - y) * 0.75}" y1="${y}" x2="${440 - (428 - y) * 0.75}" y2="${y}" stroke="#7d3220" stroke-width="2"/>`).join('')}
         <rect x="1335" y="360" width="46" height="200" fill="#5d4037"/>
         ${(() => { const r = rnd(131); let s = ''; for (let i = 0; i < 26; i++) s += `<circle cx="${(1358 + (r() - 0.5) * 300).toFixed(0)}" cy="${(320 + (r() - 0.5) * 150).toFixed(0)}" r="${(40 + r() * 45).toFixed(0)}" fill="${r() > 0.5 ? '#3e6b2f' : '#4a7a37'}"/>`; return s; })()}
         <rect y="530" width="1600" height="370" fill="url(#${p}field)"/>
         <polygon points="770,530 830,530 1030,900 570,900" fill="#c9a46a" opacity=".9"/>
         ${(() => { let s = ''; for (let x = -1200; x <= 2800; x += 140) s += `<line x1="800" y1="530" x2="${x}" y2="900" stroke="#c6e07e" stroke-width="2" opacity=".35"/>`; return s; })()}
         ${[565, 615, 690, 795].map((y) => `<line x1="0" y1="${y}" x2="1600" y2="${y}" stroke="#d8c27a" stroke-width="${2 + (y - 530) / 60}" opacity=".7"/>`).join('')}
         <rect x="0" y="618" width="770" height="40" fill="#c9eef0" opacity=".25"/><rect x="830" y="618" width="770" height="40" fill="#c9eef0" opacity=".25"/>`
      ),

    hoian: (p) =>
      svg(
        lg(p + 'sky', [[0, '#0c0f2e'], [0.7, '#2b1d50'], [1, '#4b2b5f']]) +
          lg(p + 'river', [[0, '#1c2150'], [1, '#090c22']]) +
          rg(p + 'glow', [[0, '#ffcf7a', 0.7], [1, '#ffb347', 0]]) +
          `<filter id="${p}blur"><feGaussianBlur stdDeviation="10"/></filter>`,
        `<rect width="1600" height="900" fill="url(#${p}sky)"/>
         ${stars(50, 0, 0, 1600, 260, 137, 1.3)}
         ${(() => {
           const r = rnd(139), walls = ['#f0b84e', '#e6a33a', '#f3c562', '#d9952f']; let s = '', x = -20;
           while (x < 1620) {
             const w = 170 + r() * 90, h = 150 + r() * 70, top = 560 - h;
             s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${walls[Math.floor(r() * 4)]}"/>`;
             s += `<polygon points="${x - 14},${top + 4} ${x + w + 14},${top + 4} ${x + w - 20},${top - 48} ${x + 20},${top - 48}" fill="#5b2a1e"/>`;
             for (let k = 1; k < 4; k++) s += `<line x1="${x - 14 + k * 8}" y1="${top + 4 - k * 13}" x2="${x + w + 14 - k * 8}" y2="${top + 4 - k * 13}" stroke="#3f1c13" stroke-width="2"/>`;
             s += `<rect x="${x + w * 0.15}" y="${top + h * 0.3}" width="${w * 0.25}" height="${h * 0.35}" fill="#ffd98a" opacity=".85"/><rect x="${x + w * 0.55}" y="${top + h * 0.45}" width="${w * 0.3}" height="${h * 0.55}" fill="#4a2b1a"/>`;
             x += w + 6;
           }
           return s;
         })()}
         <rect y="556" width="1600" height="34" fill="#3b2a2a"/>
         ${(() => {
           const cols = ['#e53935', '#ff9800', '#ffd54f', '#ab47bc', '#ec407a', '#ff7043']; let s = '', n = 0;
           [[0, 300, 800, 330, 60], [800, 330, 1600, 290, 55], [150, 230, 1450, 240, 70]].forEach(([x1, y1, x2, y2, sag]) => {
             s += `<path d="M${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}" fill="none" stroke="#2a1a12" stroke-width="2"/>`;
             for (let i = 1; i < 12; i++) {
               const t = i / 12, x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2, y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag * 2) + t * t * y2, c = cols[n++ % cols.length];
               s += `<circle cx="${x.toFixed(0)}" cy="${(y + 24).toFixed(0)}" r="40" fill="url(#${p}glow)" opacity=".55"/><line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${x.toFixed(0)}" y2="${(y + 8).toFixed(0)}" stroke="#2a1a12" stroke-width="2"/><ellipse cx="${x.toFixed(0)}" cy="${(y + 26).toFixed(0)}" rx="15" ry="19" fill="${c}"${i % 3 === 0 ? ` class="tw" style="animation-delay:${(i * 0.4) % 3}s"` : ''}/><rect x="${(x - 7).toFixed(0)}" y="${(y + 5).toFixed(0)}" width="14" height="4" fill="#3b2a12"/><rect x="${(x - 7).toFixed(0)}" y="${(y + 44).toFixed(0)}" width="14" height="4" fill="#3b2a12"/>`;
             }
           });
           return s;
         })()}
         <rect y="590" width="1600" height="310" fill="url(#${p}river)"/>
         <g filter="url(#${p}blur)" class="shimmer">${(() => { const r = rnd(149), c = ['#ff9800', '#e53935', '#ffd54f', '#ec407a', '#ab47bc']; let s = ''; for (let i = 0; i < 30; i++) s += `<ellipse cx="${(r() * 1600).toFixed(0)}" cy="${(620 + r() * 120).toFixed(0)}" rx="${(14 + r() * 20).toFixed(0)}" ry="${(30 + r() * 30).toFixed(0)}" fill="${c[i % 5]}" opacity="${(0.25 + r() * 0.3).toFixed(2)}"/>`; return s; })()}</g>
         ${(() => { const r = rnd(151); let s = ''; for (let i = 0; i < 9; i++) { const x = 120 + r() * 1360, y = 770 + r() * 90; if (x > 560 && x < 720) continue; s += `<g class="bobble" style="animation-delay:${(r() * 3).toFixed(1)}s"><circle cx="${x.toFixed(0)}" cy="${(y - 6).toFixed(0)}" r="26" fill="url(#${p}glow)"/><ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="16" ry="6" fill="#f48fb1"/><circle cx="${x.toFixed(0)}" cy="${(y - 9).toFixed(0)}" r="4" fill="#fff3c4"/></g>`; } return s; })()}`
      ),

    /* ===== Quầy cửa khẩu (không gian riêng) ===== */
    border: (p) =>
      svg(
        lg(p + 'wall', [[0, '#1b2738'], [1, '#2a3b50']]) +
          lg(p + 'sky', [[0, '#2a2d5c'], [0.55, '#b9647a'], [1, '#f4b26b']]) +
          lg(p + 'floor', [[0, '#3a4658'], [1, '#232c3a']]) +
          lg(p + 'counter', [[0, '#3b5068'], [1, '#203046']]) +
          rg(p + 'glow', [[0, '#9fd8ff', 0.25], [1, '#9fd8ff', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         <rect x="640" y="90" width="920" height="470" fill="url(#${p}sky)"/>
         ${stars(25, 640, 90, 920, 120, 171, 1.1)}
         <circle cx="1250" cy="470" r="46" fill="#ffd49a" opacity=".9"/>
         <path d="M640 470 L760 450 L820 462 L900 440 L980 458 L1080 446 L1180 462 L1300 448 L1420 460 L1560 450 V560 H640Z" fill="#3b3550" opacity=".8"/>
         <rect x="640" y="478" width="920" height="82" fill="#2a2e3a"/>
         <rect x="640" y="505" width="920" height="20" fill="#1a1d26"/>
         ${(() => { let s = ''; for (let x = 660; x < 1560; x += 60) s += `<rect x="${x}" y="513" width="30" height="3" fill="#f1f1f1" opacity=".7"/>`; for (let x = 650; x < 1560; x += 40) s += `<circle cx="${x}" cy="530" r="2.5" fill="${x % 80 ? '#7dd3fc' : '#fbbf24'}" class="tw" style="animation-delay:${((x / 40) % 6) * 0.3}s"/>`; return s; })()}
         <rect x="1440" y="330" width="22" height="150" fill="#4a5568"/><rect x="1414" y="300" width="74" height="36" rx="6" fill="#4a5568"/><rect x="1420" y="306" width="62" height="20" fill="#9fd8ff" opacity=".85"/>
         <g class="takeoff"><g fill="#eef2f8"><ellipse cx="0" cy="0" rx="62" ry="9"/><polygon points="-12,2 22,2 -6,34 -22,34"/><polygon points="-12,-2 22,-2 -6,-30 -20,-30" opacity=".75"/><polygon points="-62,-2 -46,-2 -58,-24 -66,-24"/></g><circle cx="48" cy="-2" r="3" fill="#9fd8ff"/></g>
         ${[870, 1100, 1330].map((x) => `<rect x="${x - 5}" y="90" width="10" height="470" fill="#0f1724"/>`).join('')}
         <rect x="640" y="90" width="920" height="470" fill="none" stroke="#0f1724" stroke-width="16"/>
         <rect y="640" width="1600" height="260" fill="url(#${p}floor)"/>
         <circle cx="800" cy="560" r="420" fill="url(#${p}glow)"/>
         <rect x="250" y="360" width="1100" height="238" fill="#bfe3ff" opacity=".06" stroke="#cfe8ff" stroke-opacity=".25" stroke-width="3"/>
         <rect x="555" y="360" width="6" height="238" fill="#cfe8ff" opacity=".2"/><rect x="1040" y="360" width="6" height="238" fill="#cfe8ff" opacity=".2"/>
         <rect x="160" y="596" width="1280" height="26" rx="6" fill="#d3dce8"/>
         <rect x="180" y="622" width="1240" height="278" fill="url(#${p}counter)"/>
         <rect x="560" y="690" width="480" height="62" rx="10" fill="#14202f" stroke="#38bdf8" stroke-opacity=".5" stroke-width="2"/>
         <text x="800" y="730" text-anchor="middle" font-family="'Be Vietnam Pro',sans-serif" font-size="26" font-weight="700" fill="#e0f2fe" letter-spacing="3">NHẬP CẢNH · IMMIGRATION</text>`
      ),

    /* ===== Bàn trader ===== */
    trader: (p) =>
      svg(
        lg(p + 'wall', [[0, '#0a0e1c'], [1, '#121a2e']]) +
          lg(p + 'sky', [[0, '#070b1c'], [1, '#1e1b4b']]) +
          lg(p + 'scr', [[0, '#0b1426'], [1, '#070d1a']]) +
          rg(p + 'glow', [[0, '#22c55e', 0.18], [1, '#22c55e', 0]]),
        `<rect width="1600" height="900" fill="url(#${p}wall)"/>
         <rect x="100" y="60" width="1400" height="360" fill="url(#${p}sky)"/>
         ${stars(30, 100, 60, 1400, 120, 181, 1)}
         ${(() => {
           const r = rnd(191), neon = ['#a78bfa', '#22d3ee', '#f472b6', '#facc15']; let s = '', x = 100;
           while (x < 1500) {
             const w = 50 + r() * 80, hh = 90 + r() * 200, top = 420 - hh;
             s += `<rect x="${x}" y="${top}" width="${Math.min(w, 1500 - x)}" height="${hh}" fill="${r() > 0.5 ? '#0d1326' : '#111a33'}"/>`;
             if (r() > 0.7) s += `<rect x="${x}" y="${top}" width="${Math.min(w, 1500 - x)}" height="3" fill="${neon[Math.floor(r() * 4)]}" opacity=".8"/>`;
             for (let wy = top + 12; wy < 410; wy += 16) for (let wx = x + 7; wx < x + w - 8 && wx < 1490; wx += 12) if (r() > 0.7) s += `<rect x="${wx}" y="${wy}" width="5" height="7" fill="${r() > 0.85 ? '#7dd3fc' : '#fcd38a'}" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
             x += w + 4;
           }
           return s;
         })()}
         <rect x="100" y="60" width="1400" height="360" fill="none" stroke="#05070f" stroke-width="16"/>
         <circle cx="800" cy="480" r="520" fill="url(#${p}glow)"/>
         ${(() => {
           const screen = (x, y, w, h, kind, seed) => {
             const r = rnd(seed); let s = `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="10" fill="#05070d" stroke="#273349" stroke-width="3"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${p}scr)"/>`;
             for (let gy = y + h / 4; gy < y + h; gy += h / 4) s += `<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="#1e2a44" stroke-width="1"/>`;
             if (kind === 'candles') {
               let v = h / 2, cw = 12, pts = [];
               for (let i = 0, cx = x + 10; cx < x + w - 10; i++, cx += cw + 4) { const o = v; v += (r() - 0.45) * h * 0.12; v = Math.max(h * 0.12, Math.min(h * 0.88, v)); const c = v, hi = Math.min(o, c) - r() * h * 0.06, lo = Math.max(o, c) + r() * h * 0.06, up = c < o; s += `<line x1="${cx + cw / 2}" y1="${y + hi}" x2="${cx + cw / 2}" y2="${y + lo}" stroke="${up ? '#22c55e' : '#ef4444'}" stroke-width="2"/><rect x="${cx}" y="${y + Math.min(o, c)}" width="${cw}" height="${Math.max(2, Math.abs(c - o))}" fill="${up ? '#22c55e' : '#ef4444'}"/>`; pts.push(`${cx + cw / 2},${y + c}`); }
               s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#facc15" stroke-width="2" opacity=".7"/>`;
             } else if (kind === 'line') {
               let v = h * 0.6, pts = [];
               for (let cx = x; cx <= x + w; cx += 10) { v += (r() - 0.48) * 14; v = Math.max(15, Math.min(h - 15, v)); pts.push(`${cx},${y + v}`); }
               s += `<polygon points="${x},${y + h} ${pts.join(' ')} ${x + w},${y + h}" fill="#22d3ee" opacity=".12"/><polyline points="${pts.join(' ')}" fill="none" stroke="#22d3ee" stroke-width="2.5"/>`;
             } else {
               for (let i = 0; i < 10; i++) { const bw = 20 + r() * (w / 2 - 30), yy = y + 12 + i * ((h - 20) / 10); s += `<rect x="${x + w / 2 - bw}" y="${yy}" width="${bw}" height="${(h - 20) / 10 - 4}" fill="#22c55e" opacity="${(0.25 + r() * 0.5).toFixed(2)}"/><rect x="${x + w / 2}" y="${yy}" width="${20 + r() * (w / 2 - 30)}" height="${(h - 20) / 10 - 4}" fill="#ef4444" opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`; }
             }
             return s;
           };
           return screen(255, 395, 340, 205, 'line', 201) + screen(640, 345, 320, 255, 'candles', 203) + screen(1005, 395, 340, 205, 'book', 207);
         })()}
         ${[425, 800, 1175].map((x) => `<rect x="${x - 12}" y="600" width="24" height="40" fill="#1b2232"/>`).join('')}
         <rect x="120" y="640" width="1360" height="26" rx="6" fill="#1f2533"/>
         <line x1="130" y1="668" x2="1470" y2="668" stroke="#22c55e" stroke-width="3" opacity=".55"/>
         <rect x="160" y="666" width="22" height="234" fill="#151a26"/><rect x="1418" y="666" width="22" height="234" fill="#151a26"/>
         <rect x="640" y="622" width="300" height="16" rx="4" fill="#2b3346"/><rect x="975" y="624" width="34" height="14" rx="7" fill="#2b3346"/>`
      ),
  };

  /* ---------------- các không gian ---------------- */
  // x, y: vị trí tâm (% khung cảnh 16:9) — s: cỡ (theo % chiều cao khung)
  const YT_LOFI = { t: 'Lofi Girl – lofi hip hop radio (học/làm việc)', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' };
  const YT_SLEEP = { t: 'Lofi Girl – lofi radio để ngủ/chill', url: 'https://www.youtube.com/watch?v=rUxyKA_-grg' };
  const YT_SYNTH = { t: 'Lofi Girl – synthwave radio', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' };

  window.SPACES = [
    {
      id: 'study', name: 'Bàn học', emoji: '📚', mood: 'Học tập · Ghi nhớ', accent: '#f4a259', fx: 'dust',
      quote: 'Mỗi ngày một trang. Chậm mà chắc, rồi sẽ giỏi.',
      sounds: { clock: 0.25, rain: 0.15, brown: 0.12 },
      yt: { q: 'lofi study music', picks: [YT_LOFI] },
      journal: 'Hôm nay mình đã học được điều gì mới?',
      objects: [
        { e: '📻', x: 16, y: 33.5, s: 6, label: 'Nhạc học bài (YouTube)', tool: 'youtube' },
        { e: '⏰', x: 29, y: 33.5, s: 6, label: 'Pomodoro 25/5', tool: 'pomodoro', opts: { preset: [25, 5] } },
        { e: '🎧', x: 20, y: 63.5, s: 6, label: 'Sách nói', tool: 'library', opts: { tab: 'audio' } },
        { e: '📖', x: 28, y: 63, s: 7, label: 'Sách đọc & tủ sách', tool: 'library', opts: { tab: 'read' } },
        { e: '🗂️', x: 37, y: 63.5, s: 6, label: 'Thẻ ghi nhớ (flashcard)', tool: 'flashcards' },
        { e: '💻', x: 50, y: 59.5, s: 12, label: 'Ghi chú bài học', tool: 'notes', opts: { placeholder: 'Ghi chú bài học, công thức, ý chính...' } },
        { e: '☕', x: 60, y: 63.5, s: 6, label: 'Cà phê hôm nay', tool: 'tracker', opts: { kind: 'coffee' } },
        { e: '✏️', x: 67, y: 64, s: 5.5, label: 'Bút vẽ – nháp, sơ đồ tư duy', tool: 'sketch' },
        { e: '📝', x: 75, y: 63.5, s: 6, label: 'Bài tập cần làm', tool: 'todo', opts: { title: 'Bài tập cần làm', reward: '⭐' } },
      ],
    },
    {
      id: 'work', name: 'Bàn làm việc', emoji: '💼', mood: 'Tập trung sâu · Deep work', accent: '#6fb7ff', fx: 'dust',
      quote: 'Làm một việc. Làm cho xong. Rồi mới tới việc tiếp theo.',
      sounds: { brown: 0.3, typing: 0.15 },
      yt: { q: 'deep focus music for work', picks: [YT_LOFI, YT_SYNTH] },
      journal: 'Việc quan trọng nhất mình đã hoàn thành hôm nay là gì?',
      objects: [
        { e: '📻', x: 19, y: 65, s: 6, label: 'Nhạc tập trung (YouTube)', tool: 'youtube' },
        { e: '📒', x: 26, y: 65, s: 6, label: 'Ghi chú công việc', tool: 'notes', opts: { placeholder: 'Ý tưởng, biên bản họp, việc cần nhớ...' } },
        { e: '⏱️', x: 33, y: 65, s: 6, label: 'Phiên tập trung 50/10', tool: 'pomodoro', opts: { preset: [50, 10] } },
        { e: '📋', x: 50, y: 55, s: 7, label: 'Danh sách việc', tool: 'todo', opts: { title: 'Việc hôm nay', reward: '✅' } },
        { e: '☕', x: 67, y: 65, s: 6, label: 'Cà phê hôm nay', tool: 'tracker', opts: { kind: 'coffee' } },
        { e: '🎧', x: 74, y: 65, s: 6, label: 'Trộn âm thanh nền', tool: 'mixer' },
        { e: '🪴', x: 83, y: 63, s: 10, label: 'Nghỉ mắt & giãn cơ', tool: 'stretch' },
      ],
    },
    {
      id: 'beach', name: 'Bờ biển', emoji: '🏖️', mood: 'Nghỉ ngơi · Thả lỏng', accent: '#ff9f6b', fx: 'sparkle',
      quote: 'Thở chậm lại. Sóng vẫn về, việc rồi cũng xong.',
      sounds: { waves: 0.7, wind: 0.2, birds: 0.15 },
      yt: { q: 'tropical beach chill music', picks: [YT_SLEEP] },
      journal: 'Hôm nay bạn biết ơn điều gì?',
      objects: [
        { e: '🌴', x: 9, y: 60, s: 22, label: 'Hít thở theo nhịp sóng', tool: 'breathing', opts: { pattern: 'calm' } },
        { e: '🥥', x: 19, y: 82, s: 6, label: 'Nước dừa – nhắc uống nước', tool: 'tracker', opts: { kind: 'water' } },
        { e: '📻', x: 30, y: 83, s: 5.5, label: 'Nhạc biển (YouTube)', tool: 'youtube' },
        { e: '⛵', x: 66, y: 62, s: 6, label: 'Lời nhắn bình yên', tool: 'cheer' },
        { e: '🐚', x: 61, y: 84, s: 5, label: 'Vỏ ốc – nhật ký biết ơn', tool: 'journal' },
        { e: '⛱️', x: 80, y: 78, s: 16, label: 'Nghỉ ngơi 15 phút', tool: 'pomodoro', opts: { preset: [15, 5] } },
      ],
    },
    {
      id: 'pirate', name: 'Tàu hải tặc', emoji: '🏴‍☠️', mood: 'Phiêu lưu anime · Vui vẻ', accent: '#ffcc33', fx: 'sparkle',
      quote: 'Thuyền trưởng ơi, mỗi việc xong là một kho báu! Ra khơi thôi!',
      sounds: { waves: 0.45, wind: 0.3, birds: 0.12 },
      yt: { q: 'anime adventure ost upbeat', picks: [] },
      journal: 'Cuộc phiêu lưu hôm nay có gì vui?',
      objects: [
        { e: '⚓', x: 7, y: 80, s: 7, label: 'Thả neo – hít thở', tool: 'breathing', opts: { pattern: 'box' } },
        { e: '🦜', x: 15, y: 71, s: 8, label: 'Vẹt cổ vũ', tool: 'cheer' },
        { e: '🗺️', x: 29, y: 81, s: 9, label: 'Bản đồ kho báu – nhiệm vụ', tool: 'todo', opts: { title: 'Nhiệm vụ săn kho báu', reward: '💰', done: 'Thêm một rương vàng! 💰' } },
        { e: '🧭', x: 41, y: 82, s: 6, label: 'Nhật ký hải trình', tool: 'notes', opts: { placeholder: 'Nhật ký hải trình của thuyền trưởng...' } },
        { e: '🛢️', x: 60, y: 81, s: 7, label: 'Thùng nước ngọt – uống nước', tool: 'tracker', opts: { kind: 'water' } },
        { e: '🎻', x: 72, y: 81, s: 7, label: 'Nhạc phiêu lưu (YouTube)', tool: 'youtube' },
        { e: '🚩', x: 86.5, y: 13, s: 7, label: 'Ra khơi 25 phút', tool: 'pomodoro', opts: { preset: [25, 5] } },
      ],
    },
    {
      id: 'football', name: 'Sân bóng', emoji: '⚽', mood: 'Sôi động · Hào hứng', accent: '#4ade80', fx: 'confetti',
      quote: 'Ra sân là phải ghi bàn. Mỗi việc xong là một bàn thắng! ⚽',
      sounds: { crowd: 0.5, wind: 0.1 },
      yt: { q: 'stadium anthem workout hype music', picks: [] },
      journal: 'Bàn thắng đẹp nhất hôm nay của bạn là gì?',
      objects: [
        { e: '🥅', x: 50, y: 53, s: 7, label: 'Khởi động – giãn cơ', tool: 'stretch' },
        { e: '⚽', x: 50, y: 71, s: 6, label: 'Bàn thắng hôm nay', tool: 'todo', opts: { title: 'Bàn thắng hôm nay', reward: '⚽', done: 'VÀOOO! Một bàn thắng! ⚽🔥' } },
        { e: '⏱️', x: 14, y: 80, s: 7, label: 'Hiệp đấu 45 phút', tool: 'pomodoro', opts: { preset: [45, 15] } },
        { e: '🥤', x: 26, y: 82, s: 5.5, label: 'Nước tăng lực – uống nước', tool: 'tracker', opts: { kind: 'water' } },
        { e: '📻', x: 63, y: 82, s: 5, label: 'Nhạc cổ vũ (YouTube)', tool: 'youtube' },
        { e: '📣', x: 74, y: 82, s: 6, label: 'Cổ động viên', tool: 'cheer' },
        { e: '📋', x: 86, y: 80, s: 7, label: 'Bảng chiến thuật', tool: 'sketch', opts: { board: 'pitch' } },
      ],
    },
    {
      id: 'bedroom', name: 'Phòng ngủ', emoji: '🛏️', mood: 'Thư giãn · Ngủ ngon', accent: '#b9a4ff', fx: 'dust',
      quote: 'Hôm nay vậy là đủ rồi. Thả lỏng vai, thở ra thật dài.',
      sounds: { rain: 0.3, purr: 0.2 },
      yt: { q: 'sleep music relaxing', picks: [YT_SLEEP] },
      journal: '3 điều nhỏ làm bạn vui hôm nay?',
      objects: [
        { e: '🧸', x: 13, y: 61, s: 6, label: 'Hít thở 4-7-8 dễ ngủ', tool: 'breathing', opts: { pattern: '478' } },
        { e: '🐈', x: 27, y: 64, s: 8, label: 'Mèo gừ gừ – âm thanh nền', tool: 'mixer' },
        { e: '📔', x: 41, y: 70, s: 6, label: 'Nhật ký trước khi ngủ', tool: 'journal' },
        { e: '📚', x: 58, y: 68, s: 5.5, label: 'Truyện & sách nói', tool: 'library', opts: { tab: 'audio' } },
        { e: '🎵', x: 73, y: 80, s: 6, label: 'Nhạc ngủ (YouTube)', tool: 'youtube' },
        { e: '🌙', x: 81, y: 26, s: 8, label: 'Hẹn giờ tắt nhạc', tool: 'sleep' },
      ],
    },
    {
      id: 'cafe', name: 'Cà phê phố cổ', emoji: '☕', mood: 'Sáng tạo · Viết lách', accent: '#e0a96d', fx: 'dust',
      quote: 'Một ly cà phê, một góc quen, và vài trang viết thật lòng.',
      sounds: { cafe: 0.55, rain: 0.08 },
      yt: { q: 'jazz cafe music', picks: [YT_LOFI] },
      journal: 'Ý tưởng nào đang làm bạn hào hứng?',
      objects: [
        { e: '🕰️', x: 17, y: 22, s: 7, label: 'Pomodoro 25/5', tool: 'pomodoro', opts: { preset: [25, 5] } },
        { e: '🥐', x: 20, y: 71, s: 5, label: 'Lời chúc kèm bánh', tool: 'cheer' },
        { e: '☕', x: 30, y: 68, s: 7, label: 'Cà phê sữa đá – đếm ly', tool: 'tracker', opts: { kind: 'coffee' } },
        { e: '📓', x: 42, y: 69, s: 6, label: 'Viết tự do', tool: 'notes', opts: { placeholder: 'Viết bất cứ điều gì bạn nghĩ... không cần hay, chỉ cần thật.' } },
        { e: '🎨', x: 53, y: 69, s: 6, label: 'Vẽ phác thảo', tool: 'sketch' },
        { e: '🎷', x: 81, y: 76, s: 9, label: 'Nhạc jazz (YouTube)', tool: 'youtube' },
      ],
    },
    {
      id: 'rainy', name: 'Đêm mưa', emoji: '🌧️', mood: 'Đọc sách · Suy ngẫm', accent: '#7cb7ff', fx: 'rain',
      quote: 'Ngoài kia mưa, trong này ấm. Đọc thêm vài trang nữa nhé.',
      sounds: { rain: 0.6, thunder: 0.25 },
      yt: { q: 'rainy night piano', picks: [YT_SLEEP] },
      journal: 'Điều gì đang ở trong đầu bạn đêm nay?',
      objects: [
        { e: '🕯️', x: 20, y: 61, s: 8, label: 'Ngắm nến – hít thở', tool: 'breathing', opts: { pattern: 'calm' } },
        { e: '📖', x: 31, y: 63, s: 6.5, label: 'Sách đọc', tool: 'library', opts: { tab: 'read' } },
        { e: '🍵', x: 41, y: 63.5, s: 5.5, label: 'Trà nóng – đếm ly', tool: 'tracker', opts: { kind: 'tea' } },
        { e: '🐈‍⬛', x: 57, y: 62, s: 7, label: 'Chỉnh tiếng mưa', tool: 'mixer' },
        { e: '📔', x: 70, y: 63.5, s: 6, label: 'Nhật ký đêm mưa', tool: 'journal' },
        { e: '🎧', x: 80, y: 63.5, s: 6, label: 'Piano đêm mưa (YouTube)', tool: 'youtube' },
      ],
    },
    {
      id: 'camp', name: 'Lửa trại', emoji: '🏕️', mood: 'Tĩnh tâm · Chữa lành', accent: '#ff8c42', fx: 'embers',
      quote: 'Ngồi xuống bên lửa. Không cần vội gì cả.',
      sounds: { fire: 0.6, crickets: 0.3, wind: 0.12 },
      yt: { q: 'acoustic guitar campfire', picks: [] },
      journal: 'Nếu được ước một điều đêm nay, bạn sẽ ước gì?',
      objects: [
        { e: '⛺', x: 20, y: 70, s: 18, label: 'Hẹn giờ đi ngủ', tool: 'sleep' },
        { e: '📔', x: 35, y: 81, s: 5, label: 'Nhật ký bên lửa', tool: 'journal' },
        { e: '🔥', x: 50, y: 77, s: 11, label: 'Ngắm lửa – hít thở', tool: 'breathing', opts: { pattern: 'calm' } },
        { e: '🎸', x: 66, y: 79, s: 8, label: 'Guitar mộc (YouTube)', tool: 'youtube' },
        { e: '🌠', x: 74, y: 18, s: 6, label: 'Sao băng – điều ước', tool: 'cheer' },
        { e: '🔦', x: 82, y: 81, s: 5, label: 'Ghi chép dưới đèn pin', tool: 'notes' },
      ],
    },
    {
      id: 'space', name: 'Trạm vũ trụ', emoji: '🚀', mood: 'Deep work · Coding', accent: '#a78bfa', fx: null,
      quote: 'Ở đây không có thông báo, chỉ có bạn và nhiệm vụ.',
      sounds: { engine: 0.35, binaural: 0.15, brown: 0.1 },
      yt: { q: 'synthwave space ambient', picks: [YT_SYNTH, YT_LOFI] },
      journal: 'Nhiệm vụ hôm nay tiến tới đâu rồi?',
      objects: [
        { e: '🛰️', x: 22, y: 28, s: 8, label: 'Chu kỳ 90 phút', tool: 'pomodoro', opts: { preset: [90, 20] } },
        { e: '🚀', x: 70, y: 20, s: 5, label: 'Lời nhắn từ mặt đất', tool: 'cheer' },
        { e: '👩‍🚀', x: 10, y: 77, s: 9, label: 'Giãn cơ không trọng lực', tool: 'stretch' },
        { e: '📋', x: 36, y: 79, s: 6.5, label: 'Danh sách nhiệm vụ', tool: 'todo', opts: { title: 'Nhiệm vụ', reward: '🌟' } },
        { e: '🎛️', x: 48, y: 79, s: 6.5, label: 'Synthwave radio (YouTube)', tool: 'youtube' },
        { e: '📡', x: 60, y: 79, s: 6.5, label: 'Nhật ký phi hành', tool: 'notes', opts: { placeholder: 'Log: ...' } },
        { e: '🎧', x: 72, y: 79, s: 6.5, label: 'Âm thanh tàu', tool: 'mixer' },
        { e: '🧃', x: 84, y: 79, s: 6, label: 'Nước uống', tool: 'tracker', opts: { kind: 'water' } },
      ],
    },

    {
      id: 'zen', name: 'Vườn Nhật', emoji: '🌸', mood: 'Thiền · Viết · Tĩnh lặng', accent: '#f48fb1', fx: 'petals', ink: '#5b2c3d',
      quote: 'Như cánh hoa rơi – không vội, mà vẫn tới nơi.',
      sounds: { stream: 0.4, chime: 0.25, birds: 0.12, wind: 0.12 },
      yt: { q: 'japanese koto zen music', picks: [YT_LOFI] },
      journal: 'Một khoảnh khắc bình yên hôm nay của bạn là gì?',
      objects: [
        { e: '📻', x: 17, y: 80.5, s: 5.5, label: 'Nhạc Nhật – koto, piano', tool: 'youtube' },
        { e: '📜', x: 25, y: 80, s: 6.5, label: 'Viết haiku / ghi chú', tool: 'notes', opts: { placeholder: 'Ba dòng thôi: 5 – 7 – 5 âm tiết…' } },
        { e: '🖌️', x: 33, y: 80.5, s: 6, label: 'Thư pháp – vẽ tự do', tool: 'sketch' },
        { e: '🍵', x: 41, y: 80.5, s: 6, label: 'Trà xanh – đếm ly', tool: 'tracker', opts: { kind: 'tea' } },
        { e: '🧘', x: 51, y: 77, s: 9, label: 'Thiền & làm 25 phút', tool: 'pomodoro', opts: { preset: [25, 5] } },
        { e: '🪷', x: 63, y: 75.5, s: 6, label: 'Nhật ký bình yên', tool: 'journal' },
        { e: '🐟', x: 75, y: 77, s: 5.5, label: 'Cá koi – lời nhắn', tool: 'cheer' },
        { e: '🎐', x: 88, y: 13, s: 6, label: 'Chuông gió – âm thanh nền', tool: 'mixer' },
        { e: '🎋', x: 95, y: 58, s: 10, label: 'Hít thở cùng rừng trúc', tool: 'breathing', opts: { pattern: 'calm' } },
      ],
    },
    {
      id: 'train', name: 'Tàu đêm', emoji: '🚂', mood: 'Đọc sách · Viết · Mơ màng', accent: '#e57373', fx: 'rain', fxClip: [16.25, 12.2, 67.5, 51.1],
      quote: 'Tàu cứ chạy, mình cứ đọc. Ga tiếp theo còn xa lắm.',
      sounds: { train: 0.55, rain: 0.2 },
      yt: { q: 'night train lofi rain', picks: [YT_SLEEP, YT_LOFI] },
      journal: 'Nếu chuyến tàu này đưa bạn tới bất cứ đâu, bạn muốn tới đâu?',
      objects: [
        { e: '🧳', x: 10, y: 62, s: 8, label: 'Mỗi chặng 30 phút', tool: 'pomodoro', opts: { preset: [30, 5] } },
        { e: '📖', x: 32, y: 63, s: 6.5, label: 'Sách đọc trên tàu', tool: 'library', opts: { tab: 'read' } },
        { e: '☕', x: 40, y: 63.5, s: 6, label: 'Cà phê toa ăn', tool: 'tracker', opts: { kind: 'coffee' } },
        { e: '💻', x: 51, y: 61, s: 9, label: 'Nhật ký hành trình', tool: 'notes', opts: { placeholder: 'Hôm nay mình đi qua…' } },
        { e: '🎫', x: 60, y: 64, s: 5.5, label: 'Lịch trình hôm nay', tool: 'todo', opts: { title: 'Lịch trình hôm nay', reward: '🚉', done: 'Tới ga! 🚉' } },
        { e: '🎧', x: 66, y: 63.5, s: 5.5, label: 'Nhạc tàu đêm (YouTube)', tool: 'youtube' },
        { e: '🌙', x: 74, y: 22, s: 6, label: 'Ngủ một giấc tới ga', tool: 'sleep' },
        { e: '🐈', x: 90, y: 62, s: 7, label: 'Tiếng tàu & mưa', tool: 'mixer' },
      ],
    },
    {
      id: 'cabin', name: 'Cabin tuyết', emoji: '❄️', mood: 'Ấm áp · Thư thả', accent: '#ff9f5a', fx: 'snow', fxClip: [6.9, 14.4, 35, 44.4],
      quote: 'Ngoài trời tuyết rơi. Trong này có lửa, có cacao, có bạn.',
      sounds: { fire: 0.55, wind: 0.35 },
      yt: { q: 'cozy winter cabin music', picks: [YT_SLEEP] },
      journal: 'Điều gì khiến bạn thấy ấm lòng gần đây?',
      objects: [
        { e: '🕯️', x: 20, y: 56, s: 6, label: 'Nhật ký bên cửa sổ', tool: 'journal' },
        { e: '🧶', x: 27, y: 84, s: 6.5, label: 'Việc nhỏ hôm nay', tool: 'todo', opts: { title: 'Việc nhỏ hôm nay', reward: '🧦', done: 'Đan xong thêm một chiếc tất! 🧦' } },
        { e: '📖', x: 41, y: 69, s: 6.5, label: 'Đọc sách trên ghế bành', tool: 'library', opts: { tab: 'read' } },
        { e: '🍫', x: 55, y: 84, s: 5.5, label: 'Cacao nóng', tool: 'tracker', opts: { kind: 'cocoa' } },
        { e: '🐕', x: 65, y: 84, s: 8, label: 'Cún sưởi ấm – lời động viên', tool: 'cheer' },
        { e: '🕰️', x: 72, y: 29.5, s: 6, label: 'Pomodoro 25/5', tool: 'pomodoro', opts: { preset: [25, 5] } },
        { e: '🔥', x: 80, y: 78, s: 9, label: 'Ngắm lửa – hít thở', tool: 'breathing', opts: { pattern: 'calm' } },
        { e: '📻', x: 88, y: 29.5, s: 5.5, label: 'Nhạc mùa đông (YouTube)', tool: 'youtube' },
      ],
    },
    {
      id: 'ocean', name: 'Đáy biển', emoji: '🐠', mood: 'Tập trung sâu · Êm dịu', accent: '#4dd0e1', fx: 'bubbles',
      quote: 'Lặn thật sâu vào việc. Trên kia ồn ào, dưới này yên lắm.',
      sounds: { underwater: 0.6, brown: 0.1 },
      yt: { q: 'underwater ambient music', picks: [YT_LOFI] },
      journal: 'Hôm nay bạn đã "lặn sâu" vào việc gì?',
      objects: [
        { e: '🪼', x: 14, y: 30, s: 7, label: 'Nhạc dưới nước (YouTube)', tool: 'youtube' },
        { e: '🐡', x: 31, y: 52, s: 6, label: 'Cá nóc – lời nhắn', tool: 'cheer' },
        { e: '🐢', x: 80, y: 42, s: 9, label: 'Bơi chậm cùng rùa – hít thở', tool: 'breathing', opts: { pattern: 'box' } },
        { e: '🐙', x: 18, y: 82, s: 8, label: 'Việc cần làm (8 tay cũng xong!)', tool: 'todo', opts: { title: 'Việc cần làm', reward: '🐚' } },
        { e: '🐚', x: 40, y: 86, s: 5, label: 'Nhật ký dưới biển', tool: 'journal' },
        { e: '🪸', x: 61, y: 82, s: 8, label: 'Lặn sâu 50 phút', tool: 'pomodoro', opts: { preset: [50, 10] } },
        { e: '💎', x: 86, y: 84, s: 6, label: 'Kho báu ý tưởng', tool: 'notes', opts: { placeholder: 'Ý tưởng quý như ngọc…' } },
      ],
    },
    {
      id: 'village', name: 'Đồng quê', emoji: '🌾', mood: 'Bình yên · Quê nhà', accent: '#f6b73c', fx: 'fireflies', fxClip: [0, 58, 100, 42],
      quote: 'Chiều quê gió mát, việc gì rồi cũng xong.',
      sounds: { frogs: 0.35, crickets: 0.2, wind: 0.2, birds: 0.12 },
      yt: { q: 'nhạc quê hương nhẹ nhàng', picks: [] },
      journal: 'Kỷ niệm tuổi thơ nào chợt hiện về hôm nay?',
      objects: [
        { e: '🎋', x: 5, y: 62, s: 10, label: 'Hít thở cùng gió đồng', tool: 'breathing', opts: { pattern: 'calm' } },
        { e: '🐃', x: 22, y: 73, s: 11, label: 'Ra đồng vận động', tool: 'stretch' },
        { e: '🐓', x: 31, y: 60, s: 6, label: 'Gà gáy – 25 phút', tool: 'pomodoro', opts: { preset: [25, 5] } },
        { e: '🌾', x: 45, y: 80, s: 8, label: 'Việc đồng áng hôm nay', tool: 'todo', opts: { title: 'Việc hôm nay', reward: '🌾', done: 'Thêm một bó lúa! 🌾' } },
        { e: '🍵', x: 57, y: 84, s: 5.5, label: 'Trà đá – nhắc uống nước', tool: 'tracker', opts: { kind: 'water' } },
        { e: '🐸', x: 68, y: 84, s: 6, label: 'Ếch nhái – âm thanh nền', tool: 'mixer' },
        { e: '🪁', x: 76, y: 22, s: 7, label: 'Thả diều – lời nhắn', tool: 'cheer' },
        { e: '📻', x: 85, y: 66, s: 6, label: 'Nhạc quê hương (YouTube)', tool: 'youtube' },
      ],
    },
    {
      id: 'hoian', name: 'Phố Hội', emoji: '🏮', mood: 'Lãng mạn · Hoài niệm', accent: '#ffb74d', fx: 'lanterns', fxClip: [0, 0, 100, 62],
      quote: 'Đèn lồng soi phố, dòng sông chở điều ước đi xa.',
      sounds: { stream: 0.45, crickets: 0.18, cafe: 0.12, chime: 0.12 },
      yt: { q: 'nhạc acoustic chill Hội An', picks: [YT_LOFI] },
      journal: 'Bạn muốn gửi điều gì theo dòng sông tối nay?',
      objects: [
        { e: '🏮', x: 13, y: 30, s: 7, label: 'Ngắm đèn – hít thở', tool: 'breathing', opts: { pattern: '478' } },
        { e: '📜', x: 12, y: 58.5, s: 5.5, label: 'Ghi chú', tool: 'notes' },
        { e: '🪷', x: 40, y: 83, s: 7, label: 'Thả hoa đăng – gửi điều ước', tool: 'lantern' },
        { e: '🛶', x: 69, y: 79, s: 11, label: 'Nhạc trên sông (YouTube)', tool: 'youtube' },
        { e: '🏮', x: 86, y: 30, s: 7, label: 'Đèn sáng 25 phút', tool: 'pomodoro', opts: { preset: [25, 5] } },
        { e: '☕', x: 88, y: 58.5, s: 5.5, label: 'Cà phê ven sông', tool: 'tracker', opts: { kind: 'coffee' } },
        { e: '🌕', x: 87.5, y: 12, s: 6, label: 'Trăng rằm – lời nhắn', tool: 'cheer' },
      ],
    },
  ];
  window.SPACES.unshift(
    {
      id: 'border', name: 'Immigration space', short: 'Immigration', emoji: '🛂', mood: 'Không gian của tôi', accent: '#38bdf8', fx: null, boards: ['stay', 'flights'],
      quote: 'Đúng từng ngày, chuẩn từng con dấu.',
      sounds: { airport: 0.35, brown: 0.12 },
      yt: { q: 'lofi music for work', picks: [YT_LOFI] },
      journal: 'Ca trực hôm nay thế nào?',
      objects: [
        { e: '⏱️', x: 20, y: 62.5, s: 6, label: 'Pomodoro ca trực', tool: 'pomodoro', opts: { preset: [50, 10] } },
        { e: '☕', x: 28, y: 63, s: 6, label: 'Cà phê ca trực', tool: 'tracker', opts: { kind: 'coffee' } },
        { e: '📅', x: 37, y: 62, s: 7, label: 'Lịch âm dương', tool: 'calendar' },
        { e: '🛂', x: 50, y: 59.5, s: 11, label: 'Hạn lưu trú', tool: 'stay' },
        { e: '📝', x: 61, y: 63, s: 6, label: 'Ghi chú ca trực', tool: 'notes', opts: { placeholder: 'Bàn giao ca, lưu ý, quy định mới…' } },
        { e: '🎧', x: 69, y: 63, s: 6, label: 'Nhạc / YouTube', tool: 'youtube' },
        { e: '🌏', x: 77, y: 62.5, s: 6.5, label: 'Giờ các nước', tool: 'clocks' },
        { e: '✈️', x: 86, y: 51, s: 6, label: 'Chuyến quốc tế đến', tool: 'flights' },
      ],
    },
    {
      id: 'trader', name: 'Bàn trader', emoji: '📈', mood: 'Giao dịch · Kỷ luật', accent: '#22c55e', fx: null,
      quote: 'Kế hoạch giao dịch, giao dịch theo kế hoạch.',
      sounds: { brown: 0.25, rain: 0.15, typing: 0.08 },
      yt: { q: 'trading focus music', picks: [YT_SYNTH, YT_LOFI] },
      journal: 'Hôm nay mình đã giữ kỷ luật thế nào?',
      objects: [
        { e: '🌏', x: 26.5, y: 53, s: 6, label: 'Phiên giao dịch & giờ thế giới', tool: 'clocks', opts: { mode: 'trader' } },
        { e: '📈', x: 50, y: 52, s: 7, label: 'Biểu đồ TradingView', tool: 'chart' },
        { e: '📰', x: 73.5, y: 53, s: 6, label: 'Tin tức & lịch kinh tế', tool: 'tlinks' },
        { e: '🐂', x: 9, y: 77, s: 11, label: 'Lời nhắc kỷ luật', tool: 'cheer' },
        { e: '⏱️', x: 22, y: 68.5, s: 5.5, label: 'Phiên tập trung 50/10', tool: 'pomodoro', opts: { preset: [50, 10] } },
        { e: '📒', x: 29, y: 68.5, s: 6, label: 'Nhật ký giao dịch', tool: 'tjournal' },
        { e: '🧮', x: 36, y: 68.5, s: 6, label: 'Tính khối lượng lệnh', tool: 'possize' },
        { e: '✅', x: 64, y: 68.5, s: 5.5, label: 'Checklist trước khi vào lệnh', tool: 'checklist' },
        { e: '☕', x: 71, y: 68.5, s: 6, label: 'Cà phê', tool: 'tracker', opts: { kind: 'coffee' } },
        { e: '📅', x: 78, y: 68.5, s: 5.5, label: 'Lịch', tool: 'calendar' },
        { e: '🎧', x: 85, y: 68.5, s: 5.5, label: 'Nhạc / YouTube', tool: 'youtube' },
        { e: '🐻', x: 92, y: 77, s: 10, label: 'Bình tĩnh – hít thở trước khi vào lệnh', tool: 'breathing', opts: { pattern: 'box' } },
      ],
    }
  );
  window.SCENES = SCENES;
})();
