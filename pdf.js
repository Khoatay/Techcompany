'use strict';
/**
 * Minimal PDF writer: one JPEG per A4 page, image fitted and centered.
 * pages: [{ jpeg: Uint8Array, width: px, height: px }]
 * Returns a Blob (application/pdf).
 */
function buildPdf(pages) {
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let len = 0;
  const push = (d) => {
    const b = typeof d === 'string' ? enc.encode(d) : d;
    chunks.push(b);
    len += b.length;
  };
  const obj = (id, write) => {
    offsets[id] = len;
    push(id + ' 0 obj\n');
    write();
    push('\nendobj\n');
  };
  const n = pages.length;
  const A4W = 595.28, A4H = 841.89;

  push('%PDF-1.4\n%âãÏÓ\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  const kids = pages.map((_, i) => (3 + 3 * i) + ' 0 R').join(' ');
  obj(2, () => push('<< /Type /Pages /Kids [' + kids + '] /Count ' + n + ' >>'));

  pages.forEach((p, i) => {
    const pageId = 3 + 3 * i, contentId = pageId + 1, imgId = pageId + 2;
    const landscape = p.width > p.height;
    const PW = landscape ? A4H : A4W, PH = landscape ? A4W : A4H;
    const s = Math.min(PW / p.width, PH / p.height);
    const dw = p.width * s, dh = p.height * s;
    const x = (PW - dw) / 2, y = (PH - dh) / 2;
    const f = (v) => v.toFixed(2);
    const content = 'q ' + f(dw) + ' 0 0 ' + f(dh) + ' ' + f(x) + ' ' + f(y) + ' cm /Im0 Do Q';

    obj(pageId, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(PW) + ' ' + f(PH) + '] ' +
      '/Resources << /XObject << /Im0 ' + imgId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>'));
    obj(contentId, () => {
      push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
    });
    obj(imgId, () => {
      push('<< /Type /XObject /Subtype /Image /Width ' + p.width + ' /Height ' + p.height +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
      push(p.jpeg);
      push('\nendstream');
    });
  });

  const total = 3 + 3 * n;
  const xref = len;
  let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (let id = 1; id < total; id++) x += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
  push(x);
  push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  return new Blob(chunks, { type: 'application/pdf' });
}
