/* ChillSpace — bộ tạo nhiễu chạy liên tục (không dùng đoạn lặp nên không bao giờ nghe ra chỗ lặp lại) */
class CsNoise extends AudioWorkletProcessor {
  constructor(o) {
    super();
    this.type = (o.processorOptions && o.processorOptions.type) || 'white';
    this.st = [0, 1].map(() => ({ b: [0, 0, 0, 0, 0, 0, 0], last: 0 }));
    this.alive = true;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.alive = false; };
  }
  process(_, outputs) {
    const out = outputs[0];
    for (let ch = 0; ch < out.length; ch++) {
      const d = out[ch], s = this.st[ch] || this.st[0], b = s.b;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (this.type === 'white') d[i] = w * 0.5;
        else if (this.type === 'pink') {
          b[0] = 0.99886 * b[0] + w * 0.0555179; b[1] = 0.99332 * b[1] + w * 0.0750759; b[2] = 0.969 * b[2] + w * 0.153852;
          b[3] = 0.8665 * b[3] + w * 0.3104856; b[4] = 0.55 * b[4] + w * 0.5329522; b[5] = -0.7616 * b[5] - w * 0.016898;
          d[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.11; b[6] = w * 0.115926;
        } else { s.last = (s.last + 0.02 * w) / 1.02; d[i] = s.last * 3.5; }
      }
    }
    return this.alive;
  }
}
registerProcessor('cs-noise', CsNoise);
