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
  ];
  window.SCENES = SCENES;
})();
