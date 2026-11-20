/* ChillSpace — âm thanh nền tự tổng hợp bằng Web Audio API (không cần file, không lo bản quyền) */
window.Sound = (function () {
  let ctx = null, master = null, masterVol = 0.8, paused = false, quiet = false;
  const buffers = {}, running = {}, vols = {};

  function ensure() {
    if (!ctx) {
      // iPhone: phát cả khi gạt nút im lặng (Safari 16.4+)
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = paused ? 0 : masterVol;
      master.connect(ctx.destination);
      Object.keys(vols).forEach((id) => vols[id] > 0 && setVol(id, vols[id]));
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(type) {
    if (buffers[type]) return buffers[type];
    const len = ctx.sampleRate * 6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'white') d[i] = w * 0.5;
        else if (type === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
      const N = 4096; // nối vòng lặp mượt, tránh tiếng "tách"
      for (let i = 0; i < N; i++) { const t = i / N; d[len - N + i] = d[len - N + i] * (1 - t) + d[0] * t; }
    }
    return (buffers[type] = buf);
  }

  /* --- khối dựng --- */
  const track = () => {
    const t = { nodes: [], timers: [] };
    t.add = (n) => (t.nodes.push(n), n);
    t.every = (ms, fn) => t.timers.push(setInterval(fn, ms));
    t.stop = () => {
      t.timers.forEach(clearInterval);
      t.nodes.forEach((n) => { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
    };
    return t;
  };
  const noise = (t, type) => { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(type); s.loop = true; s.start(0, Math.random() * 5); return t.add(s); };
  const filt = (t, type, f, Q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = Q; return t.add(n); };
  const gain = (t, v) => { const g = ctx.createGain(); g.gain.value = v; return t.add(g); };
  const osc = (t, f, type = 'sine') => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return t.add(o); };
  const lfo = (t, f, depth, param, type = 'sine') => { const o = osc(t, f, type), g = gain(t, depth); o.connect(g); g.connect(param); return o; };
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
  const rand = (a, b) => a + Math.random() * (b - a);

  function blip(out, { freq = 3000, type = 'highpass', dur = 0.02, vol = 0.3, Q = 1, at = 0 }) {
    const now = ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer('white'); f.type = type; f.frequency.value = freq; f.Q.value = Q;
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    s.connect(f).connect(g).connect(out); s.start(now, Math.random() * 5, dur + 0.05);
    s.onended = () => g.disconnect();
  }
  function tone(out, { freq, to, dur = 0.2, vol = 0.1, type = 'sine', attack = 0.005, at = 0 }) {
    const now = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, now);
    if (to) o.frequency.exponentialRampToValueAtTime(to, now + dur);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + attack); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(out); o.start(now); o.stop(now + dur + 0.05);
    o.onended = () => g.disconnect();
  }
  function swell(g, peak, up, down) {
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
    g.gain.exponentialRampToValueAtTime(peak, now + up);
    g.gain.exponentialRampToValueAtTime(0.0001, now + up + down);
  }

  /* --- thư viện âm thanh --- */
  const SOUNDS = [
    { id: 'rain', name: 'Mưa', icon: '🌧️', build(out, t) {
      chain(noise(t, 'pink'), filt(t, 'highpass', 450), filt(t, 'lowpass', 7000), gain(t, 0.9), out);
      t.every(35, () => Math.random() < 0.5 && blip(out, { freq: rand(2500, 6500), type: 'bandpass', Q: 2, dur: rand(0.01, 0.03), vol: rand(0.05, 0.2) }));
    } },
    { id: 'thunder', name: 'Sấm xa', icon: '⛈️', build(out, t) {
      const g = gain(t, 0.0001);
      chain(noise(t, 'brown'), filt(t, 'lowpass', 150), g, out);
      t.every(1000, () => Math.random() < 0.06 && swell(g, rand(1, 2), rand(0.3, 0.9), rand(4, 8)));
    } },
    { id: 'waves', name: 'Sóng biển', icon: '🌊', build(out, t) {
      const g = gain(t, 0.45); chain(noise(t, 'brown'), filt(t, 'lowpass', 700), g, out); lfo(t, 0.09, 0.4, g.gain);
      const g2 = gain(t, 0.12); chain(noise(t, 'pink'), filt(t, 'highpass', 1200), filt(t, 'lowpass', 5000), g2, out); lfo(t, 0.09, 0.11, g2.gain);
    } },
    { id: 'wind', name: 'Gió', icon: '🍃', build(out, t) {
      const f = filt(t, 'bandpass', 500, 0.9), g = gain(t, 0.6);
      chain(noise(t, 'pink'), f, g, out); lfo(t, 0.05, 250, f.frequency); lfo(t, 0.13, 0.35, g.gain);
    } },
    { id: 'birds', name: 'Chim hót', icon: '🐦', build(out, t) {
      t.every(400, () => {
        if (Math.random() > 0.18) return;
        const base = rand(2200, 4700), n = 2 + Math.floor(Math.random() * 5);
        let at = 0;
        for (let i = 0; i < n; i++) { tone(out, { freq: base * rand(0.9, 1.2), to: base * rand(1.1, 1.6), dur: rand(0.06, 0.14), vol: rand(0.04, 0.09), at }); at += rand(0.09, 0.15); }
      });
    } },
    { id: 'fire', name: 'Lửa trại', icon: '🔥', build(out, t) {
      chain(noise(t, 'brown'), filt(t, 'lowpass', 420), gain(t, 0.55), out);
      t.every(25, () => {
        if (Math.random() < 0.22) blip(out, { freq: rand(1200, 4700), type: 'bandpass', Q: 1.5, dur: rand(0.004, 0.03), vol: rand(0.1, 0.7) });
        if (Math.random() < 0.006) blip(out, { freq: 900, type: 'bandpass', Q: 1, dur: 0.08, vol: 0.9 });
      });
    } },
    { id: 'crickets', name: 'Dế đêm', icon: '🦗', build(out, t) {
      const am = gain(t, 0.5), env = gain(t, 0.05);
      chain(osc(t, 4300), am, env, out);
      lfo(t, 28, 0.5, am.gain, 'square'); lfo(t, 0.6, 0.05, env.gain);
      const am2 = gain(t, 0.5), env2 = gain(t, 0.03);
      chain(osc(t, 4850), am2, env2, out);
      lfo(t, 33, 0.5, am2.gain, 'square'); lfo(t, 0.43, 0.03, env2.gain);
    } },
    { id: 'cafe', name: 'Quán cà phê', icon: '☕', build(out, t) {
      const f = filt(t, 'bandpass', 700, 0.8), g = gain(t, 0.5);
      chain(noise(t, 'pink'), f, g, out); lfo(t, 0.23, 0.15, g.gain); lfo(t, 3.1, 180, f.frequency);
      const f2 = filt(t, 'bandpass', 1100, 1); chain(noise(t, 'pink'), f2, gain(t, 0.25), out); lfo(t, 4.3, 250, f2.frequency);
      chain(noise(t, 'brown'), filt(t, 'lowpass', 250), gain(t, 0.3), out);
      t.every(450, () => {
        if (Math.random() > 0.14) return;
        const fr = rand(2500, 5000);
        tone(out, { freq: fr, dur: 0.5, vol: rand(0.03, 0.07) }); tone(out, { freq: fr * 1.52, dur: 0.35, vol: 0.015 });
      });
    } },
    { id: 'crowd', name: 'Khán đài', icon: '🏟️', build(out, t) {
      const f = filt(t, 'bandpass', 900, 0.5), g = gain(t, 0.55);
      chain(noise(t, 'pink'), f, g, out); lfo(t, 0.11, 0.15, g.gain); lfo(t, 2.7, 120, f.frequency);
      const cheer = gain(t, 0.0001); chain(noise(t, 'pink'), filt(t, 'bandpass', 1400, 0.7), cheer, out);
      t.every(1000, () => Math.random() < 0.07 && swell(cheer, 0.9, 0.8, 3.5));
    } },
    { id: 'typing', name: 'Gõ phím', icon: '⌨️', build(out, t) {
      let on = false;
      t.every(70, () => {
        if (Math.random() < (on ? 0.04 : 0.06)) on = !on;
        if (on && Math.random() < 0.7) blip(out, { freq: rand(1800, 3800), type: 'bandpass', Q: 3, dur: 0.012, vol: rand(0.25, 0.55) });
        if (on && Math.random() < 0.02) blip(out, { freq: 600, type: 'bandpass', Q: 2, dur: 0.04, vol: 0.45 });
      });
    } },
    { id: 'clock', name: 'Đồng hồ tích tắc', icon: '🕰️', build(out, t) {
      let k = 0;
      t.every(1000, () => { k ^= 1; blip(out, { freq: k ? 3500 : 2800, type: 'bandpass', Q: 8, dur: 0.02, vol: 0.7 }); });
    } },
    { id: 'purr', name: 'Mèo gừ gừ', icon: '🐈', build(out, t) {
      const g = gain(t, 0.5), env = gain(t, 0.5);
      chain(noise(t, 'brown'), filt(t, 'lowpass', 260), g, env, out);
      lfo(t, 24, 0.45, g.gain); lfo(t, 0.33, 0.4, env.gain);
    } },
    { id: 'engine', name: 'Động cơ tàu', icon: '🛸', build(out, t) {
      chain(osc(t, 55, 'sawtooth'), filt(t, 'lowpass', 140), gain(t, 0.16), out);
      chain(osc(t, 82.5, 'triangle'), gain(t, 0.05), out);
      const g = gain(t, 0.6); chain(noise(t, 'brown'), filt(t, 'lowpass', 220), g, out); lfo(t, 0.07, 0.15, g.gain);
    } },
    { id: 'binaural', name: 'Sóng não tập trung', icon: '🧠', hint: 'Đeo tai nghe', build(out, t) {
      const m = t.add(ctx.createChannelMerger(2));
      osc(t, 200).connect(gain(t, 0.5)).connect(m, 0, 0);
      osc(t, 210).connect(gain(t, 0.5)).connect(m, 0, 1);
      chain(m, gain(t, 0.12), out);
    } },
    { id: 'brown', name: 'Tiếng ồn nâu', icon: '🟤', build(out, t) { chain(noise(t, 'brown'), gain(t, 0.8), out); } },
    { id: 'stream', name: 'Suối chảy', icon: '🏞️', build(out, t) {
      const f = filt(t, 'bandpass', 1800, 0.6), g = gain(t, 0.5);
      chain(noise(t, 'pink'), f, g, out); lfo(t, 0.7, 500, f.frequency); lfo(t, 0.31, 0.12, g.gain);
      chain(noise(t, 'brown'), filt(t, 'lowpass', 500), gain(t, 0.35), out);
      t.every(60, () => Math.random() < 0.3 && tone(out, { freq: rand(500, 1400), to: rand(1500, 2600), dur: rand(0.03, 0.07), vol: rand(0.01, 0.035) }));
    } },
    { id: 'chime', name: 'Chuông gió', icon: '🎐', build(out, t) {
      const notes = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
      t.every(500, () => {
        if (Math.random() > 0.16) return;
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) { const f = notes[Math.floor(Math.random() * notes.length)]; tone(out, { freq: f, dur: rand(2, 3.5), vol: rand(0.03, 0.07), at: i * rand(0.1, 0.35), attack: 0.004 }); tone(out, { freq: f * 2.76, dur: 1.2, vol: 0.01, at: i * 0.2 }); }
      });
    } },
    { id: 'train', name: 'Tàu hoả', icon: '🚂', build(out, t) {
      const g = gain(t, 0.6); chain(noise(t, 'brown'), filt(t, 'lowpass', 260), g, out); lfo(t, 0.23, 0.12, g.gain);
      chain(noise(t, 'pink'), filt(t, 'bandpass', 2400, 0.8), gain(t, 0.05), out);
      const clack = (at) => { blip(out, { freq: rand(280, 380), type: 'bandpass', Q: 1.5, dur: 0.07, vol: rand(0.5, 0.8), at }); blip(out, { freq: 1800, type: 'bandpass', Q: 3, dur: 0.015, vol: 0.12, at }); };
      t.every(1450, () => { clack(0); clack(0.14); clack(0.62); clack(0.76); });
    } },
    { id: 'underwater', name: 'Dưới nước', icon: '🫧', build(out, t) {
      const g = gain(t, 0.7); chain(noise(t, 'brown'), filt(t, 'lowpass', 320), g, out); lfo(t, 0.08, 0.2, g.gain);
      t.every(120, () => {
        if (Math.random() > 0.12) return;
        const n = 1 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) { const f = rand(250, 600); tone(out, { freq: f, to: f * rand(2, 3), dur: rand(0.04, 0.09), vol: rand(0.04, 0.1), at: i * rand(0.05, 0.12) }); }
      });
    } },
    { id: 'frogs', name: 'Ếch nhái', icon: '🐸', build(out, t) {
      const lp = filt(t, 'lowpass', 1100); lp.connect(out);
      t.every(300, () => {
        if (Math.random() > 0.22) return;
        const f = rand(130, 230), k = 3 + Math.floor(Math.random() * 4), sp = rand(0.035, 0.06);
        for (let i = 0; i < k; i++) tone(lp, { freq: f, to: f * 0.85, dur: sp * 0.8, vol: rand(0.12, 0.22), type: 'square', at: i * sp, attack: 0.003 });
      });
    } },
    { id: 'airport', name: 'Sảnh sân bay', icon: '✈️', build(out, t) {
      const f = filt(t, 'bandpass', 650, 0.7), g = gain(t, 0.4);
      chain(noise(t, 'pink'), f, g, out); lfo(t, 0.17, 0.1, g.gain); lfo(t, 2.3, 140, f.frequency);
      chain(noise(t, 'brown'), filt(t, 'lowpass', 180), gain(t, 0.25), out);
      const jet = gain(t, 0.0001); chain(noise(t, 'brown'), filt(t, 'lowpass', 300), jet, out);
      t.every(1000, () => {
        if (Math.random() < 0.012) { tone(out, { freq: 659.3, dur: 1.6, vol: 0.06 }); tone(out, { freq: 523.3, dur: 2, vol: 0.06, at: 0.55 }); }
        if (Math.random() < 0.02) swell(jet, 0.9, 4, 7);
      });
    } },
    { id: 'market', name: 'Chợ', icon: '🛒', build(out, t) {
      // tiếng người đông, lời rao, chén bát, xe máy chạy ngang
      const f = filt(t, 'bandpass', 800, 0.7), g = gain(t, 0.6);
      chain(noise(t, 'pink'), f, g, out); lfo(t, 0.3, 0.18, g.gain); lfo(t, 3.7, 220, f.frequency);
      const f2 = filt(t, 'bandpass', 1300, 1.2); chain(noise(t, 'pink'), f2, gain(t, 0.3), out); lfo(t, 5.2, 300, f2.frequency);
      chain(noise(t, 'brown'), filt(t, 'lowpass', 200), gain(t, 0.35), out);
      t.every(700, () => {
        if (Math.random() > 0.22) return;
        const now = ctx.currentTime, o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), bp2 = ctx.createBiquadFilter(), gg = ctx.createGain();
        const f0 = rand(170, 290), d = rand(0.5, 1.1);
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, now); o.frequency.linearRampToValueAtTime(f0 * rand(1.1, 1.35), now + d * 0.4); o.frequency.linearRampToValueAtTime(f0 * rand(0.8, 0.95), now + d);
        bp.type = 'bandpass'; bp.frequency.value = rand(700, 1000); bp.Q.value = 5; bp2.type = 'bandpass'; bp2.frequency.value = rand(1500, 2300); bp2.Q.value = 6;
        gg.gain.setValueAtTime(0.0001, now); gg.gain.exponentialRampToValueAtTime(rand(0.05, 0.11), now + 0.06); gg.gain.setValueAtTime(0.08, now + d * 0.8); gg.gain.exponentialRampToValueAtTime(0.0001, now + d);
        o.connect(bp).connect(gg); o.connect(bp2).connect(gg); gg.connect(out); o.start(now); o.stop(now + d + 0.05); o.onended = () => gg.disconnect();
      });
      t.every(500, () => { if (Math.random() < 0.12) { const fr = rand(2800, 5200); tone(out, { freq: fr, dur: 0.35, vol: rand(0.02, 0.05) }); } });
      const moto = gain(t, 0.0001), mo = osc(t, 85, 'sawtooth'); chain(mo, filt(t, 'lowpass', 420), moto, out); lfo(t, 23, 6, mo.frequency);
      t.every(1000, () => Math.random() < 0.06 && swell(moto, 0.16, 1.2, 2.2));
    } },
    { id: 'traffic', name: 'Phố xá', icon: '🛵', build(out, t) {
      // dòng xe chạy, xe máy vụt qua, thỉnh thoảng bấm còi
      chain(noise(t, 'brown'), filt(t, 'lowpass', 380), gain(t, 0.8), out);
      const hiss = gain(t, 0.12); chain(noise(t, 'pink'), filt(t, 'bandpass', 1200, 0.6), hiss, out); lfo(t, 0.17, 0.06, hiss.gain);
      const pass = gain(t, 0.0001), po = osc(t, 95, 'sawtooth'); chain(po, filt(t, 'lowpass', 600), pass, out); lfo(t, 27, 8, po.frequency);
      t.every(1000, () => Math.random() < 0.18 && swell(pass, rand(0.08, 0.2), rand(0.8, 1.5), rand(1.2, 2.2)));
      t.every(1000, () => {
        if (Math.random() > 0.07) return;
        const f = rand(380, 470), n = Math.random() < 0.5 ? 1 : 2;
        for (let i = 0; i < n; i++) { tone(out, { freq: f, dur: 0.22, vol: 0.035, type: 'square', at: i * 0.28 }); tone(out, { freq: f * 1.26, dur: 0.22, vol: 0.025, type: 'square', at: i * 0.28 }); }
      });
    } },
    { id: 'white', name: 'Tiếng ồn trắng', icon: '⚪', build(out, t) { chain(noise(t, 'white'), filt(t, 'lowpass', 9000), gain(t, 0.28), out); } },
  ];
  const byId = Object.fromEntries(SOUNDS.map((s) => [s.id, s]));

  // id 'x:mua' = kênh riêng của bảng Hiệu ứng: chạy song song với Âm thanh nền, không đồng bộ lên Phòng chung
  const baseOf = (id) => (id.startsWith('x:') ? id.slice(2) : id);
  function setVol(id, v) {
    vols[id] = v;
    if (!quiet && !id.startsWith('x:') && window.Sound && Sound.onChange) Sound.onChange(); // Phòng chung: đồng bộ âm thanh cho cả phòng
    if (!ctx || !byId[baseOf(id)]) return;
    let r = running[id];
    const now = ctx.currentTime;
    if (v > 0.001) {
      if (!r) {
        const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
        const t = track(); byId[baseOf(id)].build(g, t);
        r = running[id] = { g, t };
      }
      clearTimeout(r.kill);
      r.g.gain.cancelScheduledValues(now);
      r.g.gain.setTargetAtTime(v * v, now, 0.4);
    } else if (r) {
      r.g.gain.cancelScheduledValues(now);
      r.g.gain.setTargetAtTime(0, now, 0.3);
      clearTimeout(r.kill);
      r.kill = setTimeout(() => { r.t.stop(); r.g.disconnect(); delete running[id]; }, 2000);
    }
  }

  function applyMaster(tc = 0.3) {
    if (master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(paused ? 0 : masterVol, ctx.currentTime, tc); }
  }

  return {
    list: SOUNDS,
    init: ensure,
    setVol,
    getVol: (id) => vols[id] || 0,
    setAll(map) { SOUNDS.forEach((s) => setVol(s.id, map[s.id] || 0)); },
    setAllQuiet(map) { quiet = true; try { SOUNDS.forEach((s) => setVol(s.id, map[s.id] || 0)); } finally { quiet = false; } },
    getAll() { const o = {}; Object.keys(vols).forEach((k) => !k.startsWith('x:') && vols[k] > 0.001 && (o[k] = Math.round(vols[k] * 100) / 100)); return o; },
    onChange: null,
    setMaster(v) { masterVol = v; applyMaster(0.05); },
    getMaster: () => masterVol,
    needsUnlock: () => !ctx || ctx.state !== 'running', // iPhone: cần một lần chạm hợp lệ
    isPaused: () => paused,
    setPaused(p) { paused = p; ensure(); applyMaster(); },
    fadeOut(sec = 20) { paused = true; if (master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, sec / 4); } },
    thunder(vol = 0.8) {
      // một tiếng sấm (đi kèm tia chớp của bảng Hiệu ứng)
      if (!ctx || paused) return;
      const now = ctx.currentTime, src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuffer('brown'); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, now); lp.frequency.exponentialRampToValueAtTime(120, now + 3);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(vol, now + 0.08); g.gain.exponentialRampToValueAtTime(vol * 0.5, now + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
      src.connect(lp).connect(g).connect(master); src.start(now, Math.random() * 3, 5); src.onended = () => g.disconnect();
      blip(master, { freq: 1800, type: 'highpass', dur: 0.25, vol: vol * 0.25 });
    },
    chime() {
      if (!ensure()) return;
      const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
      [880, 1108.7, 1318.5, 1760].forEach((f, i) => tone(out, { freq: f, dur: 1.4, vol: 0.14, at: i * 0.18, attack: 0.01 }));
    },
  };
})();
