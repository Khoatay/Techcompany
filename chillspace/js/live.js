/* ChillSpace — "ảnh sống": hiệu ứng chuyển động nhẹ vẽ trực tiếp lên ảnh nền (WebGL).
   Cảnh đứng yên, chỉ chi tiết nhỏ chuyển động. Hiện có: 'rain' = mưa chảy trên kính (Đêm mưa).
   Tự dừng khi đổi không gian / ẩn app; máy không có WebGL thì giữ ảnh tĩnh. */
window.Live = (function () {
  const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
  const SHADERS = {
    rain: `precision highp float;
varying vec2 v;
uniform sampler2D uSharp, uBlur;
uniform vec2 uRes, uImg;
uniform float uT;
float h1(float n){ return fract(sin(n * 91.3458) * 47453.5453); }
vec2 h2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
vec2 cover(vec2 uv){ float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y; vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.); return (uv - .5) * s + .5; }
void main(){
  float asp = uRes.x / uRes.y;
  vec2 uv = v;
  vec2 q = vec2(uv.x * asp, uv.y);           // toạ độ vuông (giọt tròn)
  vec2 off = vec2(0.); float clear = 0.; float edge = 0.;

  // 1) giọt nhỏ đứng yên: hiện dần rồi tan
  for (int L = 0; L < 2; L++) {
    float sc = L == 0 ? 26. : 13.;
    vec2 g = q * sc, id = floor(g), f = fract(g) - .5;
    vec2 r = h2(id + float(L) * 17.);
    vec2 c = (r - .5) * .7;
    float life = fract(uT * (.03 + r.x * .05) + r.y);
    float a = smoothstep(0., .08, life) * smoothstep(1., .75, life);
    float rad = (.08 + r.y * .14) * (L == 0 ? 1. : .8);
    vec2 d = f - c; float l = length(d);
    float m = smoothstep(rad, rad * .55, l) * a * step(.35, r.x);
    off += d / rad * m * .6; clear = max(clear, m); edge = max(edge, smoothstep(rad * .55, rad, l) * m);
  }

  // 2) giọt lớn trượt xuống theo từng cột, lắc nhẹ, để lại vệt trong
  float cols = 16.;
  float cx = q.x * cols; float ci = floor(cx); float fx = fract(cx) - .5;
  for (int k = 0; k < 2; k++) {
    float id = ci + float(k) * 97.;
    float sp = .06 + h1(id) * .09;
    float ph = h1(id + 3.);
    float y = 1.15 - fract(uT * sp + ph) * 1.4;           // vị trí đầu giọt (đi từ trên xuống)
    float wob = sin(uv.y * 30. + id) * .08 + sin(uv.y * 7. + id * 2.) * .1;
    float x0 = (h1(id + 7.) - .5) * .5 + wob;
    float rad = .22 + h1(id + 11.) * .14;
    vec2 d = vec2(fx - x0, (uv.y - y) * cols);
    d.y *= .75;                                              // giọt hơi dẹt
    float l = length(d);
    float on = step(.35, h1(id + 5.));                       // không phải cột nào cũng có giọt
    float m = smoothstep(rad, rad * .5, l) * on;
    off += d / rad * m * 1.1; clear = max(clear, m); edge = max(edge, smoothstep(rad * .5, rad, l) * m);
    // vệt trong phía trên giọt, mờ dần
    float above = uv.y - y;
    float trail = smoothstep(rad * .55, rad * .2, abs(fx - x0)) * step(0., above) * smoothstep(.55, 0., above) * on;
    clear = max(clear, trail * .85);
    // giọt li ti đọng lại trên vệt
    float tb = fract(uv.y * 40.); float td = length(vec2((fx - x0) * 2.2, tb - .5));
    float tm = smoothstep(.22, .1, td) * trail * step(.5, h1(floor(uv.y * 40.) + id));
    off += vec2(fx - x0, tb - .5) * tm * .5; clear = max(clear, tm);
  }

  vec2 iuv = cover(uv);
  vec3 fog = texture2D(uBlur, iuv).rgb;
  vec3 sharp = texture2D(uSharp, cover(uv - off * .035)).rgb;
  vec3 col = mix(fog * .92, sharp * 1.06, clamp(clear, 0., 1.));
  col += edge * .06;                                        // ánh sáng viền giọt
  // hơi tối viền khung cho ấm
  float vig = smoothstep(1.25, .35, length((uv - .5) * vec2(asp, 1.)));
  gl_FragColor = vec4(col * mix(.78, 1., vig), 1.);
}`,
  };
  function mount(host, img, kind) {
    const FS = SHADERS[kind]; if (!FS) return false;
    const cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const tex = (src) => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
    };
    try {
      // bản kính mờ hơi nước: làm nhoè ảnh
      const b = document.createElement('canvas'); b.width = Math.round(img.naturalWidth / 2); b.height = Math.round(img.naturalHeight / 2);
      const bx = b.getContext('2d'); bx.filter = 'blur(5px) brightness(.95)'; bx.drawImage(img, -10, -10, b.width + 20, b.height + 20);
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0); tex(img); gl.activeTexture(gl.TEXTURE1); tex(b);
      gl.uniform1i(gl.getUniformLocation(pr, 'uSharp'), 0); gl.uniform1i(gl.getUniformLocation(pr, 'uBlur'), 1);
      gl.uniform2f(gl.getUniformLocation(pr, 'uImg'), img.naturalWidth, img.naturalHeight);
      const uRes = gl.getUniformLocation(pr, 'uRes'), uT = gl.getUniformLocation(pr, 'uT');
      host.append(cv);
      const fit = () => {
        const r = host.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5), k = Math.min(d, 2200 / Math.max(1, r.width));
        cv.width = Math.max(2, Math.round(r.width * k)); cv.height = Math.max(2, Math.round(r.height * k));
        gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uRes, cv.width, cv.height);
      };
      fit(); addEventListener('resize', fit);
      const t0 = performance.now();
      const loop = (now) => {
        if (!cv.isConnected) { removeEventListener('resize', fit); const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); return; }
        if (!document.hidden) { gl.uniform1f(uT, (now - t0) / 1000 + 40); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      return true;
    } catch (e) { console.warn('live', e); cv.remove(); return false; }
  }
  return { mount, kinds: Object.keys(SHADERS) };
})();
