/* ChillSpace — "ảnh sống": hiệu ứng chuyển động nhẹ vẽ trực tiếp lên ảnh nền (WebGL).
   Cảnh đứng yên, chỉ chi tiết nhỏ chuyển động. Hiện có: 'rain' = mưa chảy trên kính (Đêm mưa), 'fire' = lửa bập bùng + ánh lửa hắt ra phòng (Cabin, Lửa trại), 'sea' = tia nắng, vân sáng, bọt khí dưới nước (Đáy biển), 'beach' = mặt biển lấp lánh, sóng gợn, sóng vỗ mép cát (Bờ biển), 'amb' = ghép các lớp theo vùng: đèn, nước, cỏ, sương, bụi nắng, hoa rơi, đom đóm, sao, hơi nóng, bóng mây, màn hình.
   Tự dừng khi đổi không gian / ẩn app; máy không có WebGL thì giữ ảnh tĩnh. */
window.Live = (function () {
  const VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
  const SHADERS = {
    amb: `precision highp float;
varying vec2 v;
uniform sampler2D uSharp;
uniform vec2 uRes, uImg;
uniform float uT;
// tối đa 6 lớp hiệu ứng, mỗi lớp: uR = vùng (% x0, y0, x1, y1 từ góc trên trái), uP = (loại, độ mạnh, tham số 1, tham số 2)
// loại: 1 đèn lung linh · 2 mặt nước gợn + lấp lánh · 3 cây cỏ đung đưa · 4 sương trôi · 5 bụi nắng · 6 cánh hoa rơi
//       7 đom đóm · 8 sao lấp lánh · 9 hơi nóng · 10 bóng mây trôi · 11 màn hình sáng nhịp · 12 cảnh ngoài cửa sổ trôi
uniform vec4 uR[6];
uniform vec4 uP[6];
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= .5; } return s; }
vec2 cover(vec2 uv){ float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y; vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.); return (uv - .5) * s + .5; }
vec3 tex(vec2 im){ return texture2D(uSharp, vec2(im.x, 1. - im.y)).rgb; }
float rmask(vec2 im, vec4 r){ vec4 b = r / 100.; vec2 q = (im - b.xy) / max(b.zw - b.xy, vec2(.001));
  return smoothstep(0., .12, q.x) * smoothstep(1., .88, q.x) * smoothstep(0., .12, q.y) * smoothstep(1., .88, q.y); }
vec2 rrel(vec2 im, vec4 r){ vec4 b = r / 100.; return (im - b.xy) / max(b.zw - b.xy, vec2(.001)); }
void main(){
  vec2 iuv = cover(v);
  vec2 im = vec2(iuv.x, 1. - iuv.y);
  float asp = uRes.x / uRes.y;
  // lượt 1: các lớp làm lệch ảnh (nước gợn, cỏ đung đưa, hơi nóng)
  vec2 off = vec2(0.);
  for (int i = 0; i < 6; i++) {
    float ty = uP[i].x, k = uP[i].y; if (ty < .5) continue;
    float m = rmask(im, uR[i]); if (m <= 0.) continue;
    if (abs(ty - 2.) < .1) { float w = sin(im.x * 50. + im.y * 300. - uT * 1.4) * .5 + noise(vec2(im.x * 40., im.y * 220. - uT * .8)) - .5;
      off += vec2(w * .0008, w * .0018) * uP[i].z * k * m * (.4 + rrel(im, uR[i]).y); }
    else if (abs(ty - 3.) < .1) { float g = noise(vec2(im.x * 6. - uT * .35, im.y * 2.)) - .5;
      float w = sin(im.x * 22. + uT * (1. + uP[i].w) + g * 4.) * .6 + g;
      off.x += w * .0022 * uP[i].z * k * m * (1.2 - rrel(im, uR[i]).y * .5); }
    else if (abs(ty - 9.) < .1) { float w = sin(im.x * 140. + uT * 3.5 + noise(im * 30. + uT) * 4.) + noise(vec2(im.x * 60., uT * 2.)) - .5;
      off += vec2(0., w * .0007) * uP[i].z * k * m; }
  }
  vec3 col = tex(im + off);
  float lum = dot(col, vec3(.3, .59, .11));
  // lượt 2: các lớp thêm ánh sáng / hạt
  for (int i = 0; i < 6; i++) {
    float ty = uP[i].x, k = uP[i].y; if (ty < .5) continue;
    float m = rmask(im, uR[i]); if (m <= 0.) continue;
    vec2 rl = rrel(im, uR[i]);
    if (abs(ty - 1.) < .1) {                       // đèn lung linh: chỉ điểm sáng, mỗi cụm một nhịp
      float sp = uP[i].w;   // nhịp loang mềm theo không gian, không chia ô
      float f = noise(vec2(im.x * 22. + uT * sp * .8, im.y * 13. - uT * sp * .55)) * .6 + noise(vec2(uT * sp * 1.4, (im.x + im.y) * 7.)) * .4;
      float hot = smoothstep(uP[i].z, uP[i].z + .25, lum) * m;
      col *= 1. + hot * (f - .45) * .55 * k;
      col += vec3(1., .7, .35) * hot * max(f - .5, 0.) * .12 * k;
    } else if (abs(ty - 2.) < .1) {                // mặt nước lấp lánh
      vec2 g = im * vec2(380. * asp, 700.); vec2 id = floor(g);
      float h = hash(id), tw = pow(max(0., sin(uT * (2. + h * 5.) + h * 60.)), 12.);
      col += vec3(1., .95, .85) * step(.88, h) * tw * smoothstep(.45, .02, length(fract(g) - .5)) * uP[i].w * k * m * (.4 + lum);
    } else if (abs(ty - 4.) < .1) {                // sương trôi
      float f = fbm(vec2(im.x * 3. * asp - uT * .04 * uP[i].w, im.y * 6. + uT * .01));
      col = mix(col, vec3(.92, .94, .96), smoothstep(.35, .85, f) * uP[i].z * k * m);
    } else if (abs(ty - 5.) < .1) {                // bụi nắng lơ lửng
      for (int L = 0; L < 2; L++) {
        float sc = 55. + float(L) * 40.;
        vec2 p = im * vec2(sc * asp, sc) + vec2(sin(uT * .2 + float(L)) * .8, -uT * (.15 + float(L) * .1));
        vec2 id = floor(p), f = fract(p) - .5; vec2 r = vec2(hash(id + float(L) * 7.), hash(id + 9.));
        float tw = .5 + .5 * sin(uT * (.8 + r.y * 1.5) + r.x * 40.);
        float d = smoothstep(.16, .02, length(f - (r - .5) * .6)) * step(1. - uP[i].z * .12, r.x);
        col += mix(vec3(.85, .9, 1.), vec3(1., .88, .65), uP[i].w) * d * tw * .45 * k * m;
      }
    } else if (abs(ty - 6.) < .1) {                // cánh hoa rơi chéo, xoay lật
      for (int L = 0; L < 2; L++) {
        float sc = 16. + float(L) * 10.;
        vec2 p = im * vec2(sc * asp, sc) + vec2(-uT * (.35 + float(L) * .15), -uT * (.6 + float(L) * .25));
        p.x += sin(p.y * .9 + uT * .8) * .35;
        vec2 id = floor(p), f = fract(p) - .5; vec2 r = vec2(hash(id + float(L)), hash(id + 4.));
        float a = uT * (1. + r.y * 2.) + r.x * 6.28;
        vec2 q = f - (r - .5) * .5; q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q; q.y /= .35 + .65 * abs(sin(a * 1.3));
        float d = smoothstep(.09, .05, length(q * vec2(1., 1.8))) * step(.72, r.x);
        col = mix(col, vec3(1., .78, .86), d * .9 * k * m);
      }
    } else if (abs(ty - 7.) < .1) {                // đom đóm
      vec2 p = im * vec2(14. * asp, 14.); vec2 id = floor(p), f = fract(p) - .5; vec2 r = vec2(hash(id), hash(id + 2.));
      vec2 c = (r - .5) * .6 + vec2(sin(uT * (.4 + r.x) + r.y * 9.), cos(uT * (.3 + r.y) + r.x * 7.)) * .18;
      float g = exp(-dot(f - c, f - c) * 260.) * step(.55, r.y) * max(0., sin(uT * (.8 + r.x) + r.y * 20.));
      col += vec3(.85, 1., .45) * g * 1.2 * k * m;
    } else if (abs(ty - 8.) < .1) {                // sao lấp lánh
      float sat = max(max(col.r, col.g), col.b) - min(min(col.r, col.g), col.b);
      float around = (dot(tex(im + vec2(.012, 0.)), vec3(.33)) + dot(tex(im - vec2(.012, 0.)), vec3(.33)) + dot(tex(im + vec2(0., .02)), vec3(.33)) + dot(tex(im - vec2(0., .02)), vec3(.33))) * .25;
      float star = smoothstep(.22, .5, lum) * smoothstep(.2, .05, sat) * smoothstep(.12, .04, around);   // chỉ chấm sáng giữa nền tối
      vec2 cell = floor(im * vec2(320., 180.));
      col = mix(col, col * (.5 + noise(vec2(uT * (1.5 + hash(cell) * 3.), hash(cell + 2.) * 50.))), star * k * m);
    } else if (abs(ty - 10.) < .1) {               // bóng mây trôi rất chậm
      float f = fbm(vec2(im.x * 4. * asp - uT * .02 * uP[i].w, im.y * 4. + uT * .005));
      col *= 1. - smoothstep(.45, .8, f) * .28 * uP[i].z * k * m;
      col += vec3(1.) * smoothstep(.6, .9, fbm(vec2(im.x * 5. * asp + 3. - uT * .025 * uP[i].w, im.y * 5.))) * .06 * k * m;
    } else if (abs(ty - 12.) < .1) {               // cảnh ngoài cửa sổ trôi (tàu đang chạy): 2 lớp lệch pha ghép liền, không thấy chỗ nối
      vec4 bb = uR[i] / 100.;
      float W = bb.z - bb.x, sp = uP[i].z * .02;
      float p1 = fract(uT * sp), p2 = fract(uT * sp + .5), w1 = 1. - abs(2. * p1 - 1.);
      vec2 s1 = vec2(bb.x + fract(rl.x + p1 * .35) * W, im.y), s2 = vec2(bb.x + fract(rl.x + p2 * .35) * W, im.y);
      vec3 sc = mix(tex(s2), tex(s1), w1);
      // cột điện / cây ven đường vụt qua
      float ph = fract(uT * uP[i].w * .35), hb = hash(vec2(floor(uT * uP[i].w * .35), 4.));
      float px = 1.2 - ph * 1.4, bar = smoothstep(.035, .0, abs(rl.x - px)) * step(.45, hb) * smoothstep(.0, .1, rl.y);
      sc = mix(sc, vec3(.18, .19, .21), bar * .8);
      col = mix(col, sc, m * k);
    } else if (abs(ty - 11.) < .1) {               // màn hình sáng nhịp + vệt quét
      float hot = smoothstep(uP[i].z, uP[i].z + .2, lum) * m;
      float pulse = .5 + .5 * sin(uT * uP[i].w + im.x * 4.);
      float band = exp(-pow((rl.y - fract(uT * .07)) * 14., 2.));
      col *= 1. + hot * (pulse * .1 + band * .12) * k;
    }
  }
  gl_FragColor = vec4(col, 1.);
}`,
    beach: `precision highp float;
varying vec2 v;
uniform sampler2D uSharp;
uniform vec2 uRes, uImg;
uniform float uT;
uniform vec4 uS1, uS2;  // mép nước: 4 điểm (x, y) % từ góc trên trái, đi từ chân trời ra sát mép ảnh
uniform vec4 uBox;      // x = đường chân trời (%), y,z = vị trí mặt trời (%), w = không dùng
uniform vec4 uFx;       // x = nắng lấp lánh trên mặt biển, y = sóng gợn, z = sóng vỗ mép cát, w = mặt trời ửng sáng
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
vec2 cover(vec2 uv){ float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y; vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.); return (uv - .5) * s + .5; }
vec3 tex(vec2 im){ return texture2D(uSharp, vec2(im.x, 1. - im.y)).rgb; }
float shoreY(float x){
  vec2 p0 = uS1.xy / 100., p1 = uS1.zw / 100., p2 = uS2.xy / 100., p3 = uS2.zw / 100.;
  if (x >= p0.x) return -1.;
  if (x >= p1.x) return mix(p1.y, p0.y, (x - p1.x) / (p0.x - p1.x));
  if (x >= p2.x) return mix(p2.y, p1.y, (x - p2.x) / (p1.x - p2.x));
  return mix(p3.y, p2.y, (x - p3.x) / max(.0001, p2.x - p3.x));
}
void main(){
  vec2 iuv = cover(v);
  vec2 im = vec2(iuv.x, 1. - iuv.y);
  float asp = uRes.x / uRes.y;
  float hz = uBox.x / 100.;
  float sy = shoreY(im.x);
  float depth = (im.y - hz) / max(.001, sy - hz);                 // 0 ở chân trời → 1 ở mép cát
  float water = step(hz, im.y) * step(0., sy) * step(im.y, sy);
  water *= smoothstep(0., .02, im.y - hz);
  // sóng gợn: lệch nhẹ ảnh mặt biển, gần bờ mạnh hơn, xa thì gần như yên
  vec2 off = vec2(0.);
  if (water > 0.) {
    float w = sin(im.x * 40. + im.y * 260. - uT * 1.6) * .5 + noise(vec2(im.x * 30., im.y * 180. - uT * .9)) - .5;
    off = vec2(w * .0012, w * .0022) * (.2 + depth) * uFx.y * water;
  }
  vec3 col = tex(im + off);
  float lum = dot(col, vec3(.3, .59, .11));
  // nắng lấp lánh trên mặt biển: nhiều hơn ở vệt phản chiếu mặt trời
  if (water > 0.) {
    vec2 sun = uBox.yz / 100.;
    float lane = exp(-pow((im.x - sun.x) * 3.2 / (.3 + depth), 2.));
    vec2 g = im * vec2(420. * asp, 900.);
    vec2 id = floor(g);
    float h = hash(id), tw = pow(max(0., sin(uT * (2. + h * 5.) + h * 60.)), 12.);
    float glint = step(.86, h) * tw * smoothstep(.45, .02, length(fract(g) - .5));
    col += vec3(1., .85, .6) * glint * (.25 + lane * 1.1) * (1. - depth * .5) * uFx.x * water;
    // sóng vỗ mép cát: dải bọt trắng tiến vào rồi rút ra
    float sw = sin(uT * .55) * .5 + .5, sw2 = sin(uT * .55 + 1.7) * .5 + .5;
    float edge = sy - im.y;                                     // khoảng cách tới mép cát
    float band = smoothstep(.012 + sw * .01, .0, edge) * smoothstep(-.002, .004, edge);
    float foam = band * (.55 + .45 * noise(vec2(im.x * 140., uT * .7)));
    col = mix(col, vec3(1., .93, .88), foam * .45 * uFx.z * (.6 + .4 * sw2));
  }
  // nước tràn lên cát rồi rút: lớp nước mỏng óng ánh ngay dưới mép
  if (sy > 0.) {
    float sw = sin(uT * .55) * .5 + .5;
    float below = im.y - sy;
    float sheet = smoothstep(0., .002, below) * smoothstep(.006 + sw * .016, .0, below);
    col = mix(col, col * 1.12 + vec3(.05, .04, .04), sheet * .6 * uFx.z);
  }
  // mặt trời ửng sáng nhè nhẹ
  vec2 sun = uBox.yz / 100.;
  float sg = exp(-length((im - sun) * vec2(asp, 1.)) * 7.);
  col += vec3(1., .6, .3) * sg * (.06 + .04 * sin(uT * .4)) * uFx.w;
  gl_FragColor = vec4(col, 1.);
}`,
    sea: `precision highp float;
varying vec2 v;
uniform sampler2D uSharp;
uniform vec2 uRes, uImg;
uniform float uT;
uniform vec4 uBox;   // vùng rạn san hô (% x0, y0, x1, y1 từ góc trên trái) — nhận vân sáng gợn
uniform vec4 uFx;    // x = tia nắng, y = vân sáng trên rạn, z = bọt khí, w = hạt trôi lơ lửng
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
vec2 cover(vec2 uv){ float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y; vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.); return (uv - .5) * s + .5; }
// vân sáng dưới nước (caustics): lưới sáng uốn lượn
float caustic(vec2 p, float t){
  float c = 0.;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = p * (1.6 + fi * .7) + vec2(t * (.25 + fi * .07), -t * (.18 + fi * .05));
    q += vec2(noise(q * .8 + t * .3), noise(q * .8 - t * .27)) * 1.6;
    c += pow(1. - abs(sin(q.x * 3.1) * sin(q.y * 2.7)), 6.) * (.6 - fi * .15);
  }
  return c;
}
void main(){
  vec2 iuv = cover(v);
  vec2 im = vec2(iuv.x, 1. - iuv.y);
  float asp = uRes.x / uRes.y;
  vec3 col = texture2D(uSharp, iuv).rgb;
  float lum = dot(col, vec3(.3, .59, .11));
  // 1) tia nắng từ mặt nước góc trên trái, đung đưa chậm
  vec2 sun = vec2(.06, -.12);
  vec2 d = (im - sun) * vec2(asp, 1.);
  float ang = atan(d.x, d.y), dist = length(d);
  float rays = 0.;
  rays += pow(noise(vec2(ang * 9. + sin(uT * .25) * .6, uT * .15)), 3.) * 1.2;
  rays += pow(noise(vec2(ang * 17. - uT * .05, uT * .22 + 4.)), 4.) * .9;
  rays *= smoothstep(1.6, .1, dist) * smoothstep(.0, .25, dist);
  col += vec3(.75, .95, 1.) * rays * .22 * uFx.x;
  // 2) vân sáng gợn trên rạn san hô (chỉ chỗ sáng của san hô nhận sáng)
  vec4 b = uBox / 100.;
  float reef = smoothstep(b.y - .04, b.y + .06, im.y);
  float cs = caustic(im * vec2(asp, 1.) * 7., uT);
  col *= 1. + reef * cs * .28 * uFx.y * smoothstep(.12, .45, lum);
  // 3) bọt khí nhỏ bay lên từ rạn, lắc lư
  for (int i = 0; i < 14; i++) {
    float fi = float(i), h = hash(vec2(fi, 1.3)), h2 = hash(vec2(fi, 8.1));
    float ph = fract(uT * (.05 + h2 * .05) + h);
    vec2 pp = vec2(.08 + h * .84 + sin(uT * (1.5 + h2) + fi) * .006, b.y + .1 - ph * (b.y + .15));
    vec2 dd = (im - pp) * vec2(asp, 1.);
    float r = .0035 + h2 * .004;
    float l = length(dd);
    float ring = smoothstep(r, r * .7, l) - smoothstep(r * .7, r * .35, l) * .7;   // viền bọt sáng, giữa trong
    float hi = smoothstep(r * .35, 0., length(dd - vec2(-r * .35, r * .35)));      // đốm sáng nhỏ
    float a = smoothstep(0., .1, ph) * smoothstep(1., .85, ph);
    col += vec3(.85, .97, 1.) * (ring * .45 + hi * .6) * a * uFx.z;
  }
  // 4) hạt li ti trôi lơ lửng trong nước
  for (int L = 0; L < 2; L++) {
    float sc = 90. + float(L) * 60.;
    vec2 p = im * vec2(sc * asp, sc) + vec2(uT * (.6 + float(L) * .4), -uT * (.3 + float(L) * .2));
    vec2 id = floor(p), f = fract(p) - .5;
    vec2 r = vec2(hash(id + float(L)), hash(id + float(L) + 5.));
    float on = step(.93, r.x) * (1. - reef * .8);
    float tw = .5 + .5 * sin(uT * (1. + r.y * 2.) + r.x * 30.);
    col += vec3(.8, .95, 1.) * smoothstep(.12, .02, length(f - (r - .5) * .6)) * on * tw * .35 * uFx.w;
  }
  gl_FragColor = vec4(col, 1.);
}`,
    fire: `precision highp float;
varying vec2 v;
uniform sampler2D uSharp;
uniform vec2 uRes, uImg;
uniform float uT;
uniform vec4 uBox;   // vùng lửa trên ảnh (% x0, y0, x1, y1 tính từ góc trên trái)
uniform vec4 uSnow, uSnow2;
uniform vec4 uFx;    // x = tàn lửa bay (0..1), y = sao lấp lánh (0..1), z = độ lan ánh lửa (0 = mặc định), w = sao băng (0..1)  // tối đa 2 vùng nhìn ra ngoài trời có tuyết rơi (cùng cách tính); 0 = không có
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= .5; } return s; }
vec2 cover(vec2 uv){ float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y; vec2 s = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.); return (uv - .5) * s + .5; }
vec3 tex(vec2 im){ return texture2D(uSharp, vec2(im.x, 1. - im.y)).rgb; }
void main(){
  vec2 iuv = cover(v);
  vec2 im = vec2(iuv.x, 1. - iuv.y);                       // toạ độ ảnh, gốc trên trái
  vec4 b = uBox / 100.;
  vec2 bc = (b.xy + b.zw) * .5, bs = (b.zw - b.xy) * .5;
  vec2 rel = (im - bc) / bs;
  float m = smoothstep(1., .55, abs(rel.x)) * smoothstep(1.05, .45, abs(rel.y));
  // nhịp lửa: 2 tầng nhiễu chậm + nhanh
  float fl = .55 * noise(vec2(uT * 2.3, 1.7)) + .3 * noise(vec2(uT * 6.1, 4.2)) + .15 * noise(vec2(uT * 13., 9.));
  // ngọn lửa liếm lên: lấy mẫu lệch xuống dưới theo nhiễu chạy lên
  vec2 np = vec2(im.x * 70., im.y * 34. + uT * 2.6);
  float n1 = fbm(np), n2 = fbm(np * 1.3 + 11.);
  vec2 off = vec2((n1 - .5) * .007, abs(n2 - .45) * .016) * m;
  vec3 base = tex(im + off);
  float lum = dot(base, vec3(.3, .59, .11));
  float hot = m * smoothstep(.35, .85, lum);               // chỉ phần lửa sáng mới bập bùng
  vec3 col = base * (1. + hot * (fl - .45) * .7);
  col += vec3(1., .55, .18) * hot * pow(n1, 3.) * .25;     // lưỡi lửa sáng chạy lên
  // ánh lửa hắt ra phòng: sáng tối theo nhịp lửa, mạnh gần lò
  float asp = uRes.x / uRes.y;
  float d = length((im - bc) * vec2(asp, 1.));
  float glow = exp(-d * (uFx.z > 0. ? uFx.z : 2.6)) * (fl - .45);
  col *= 1. + glow * .22;
  col += vec3(1., .5, .15) * max(glow, 0.) * .05;
  // tàn lửa bay lên từ đáy đống lửa, lắc theo gió rồi tắt dần
  if (uFx.x > 0.) {
    vec2 e0 = vec2(bc.x, b.w - bs.y * .25);
    for (int i = 0; i < 28; i++) {
      float fi = float(i), h = hash(vec2(fi, 3.1)), h2 = hash(vec2(fi, 7.7));
      float ph = fract(uT * (.12 + h * .18) + h2);
      vec2 pp = e0 + vec2((h - .5) * bs.x * 1.2 + sin(uT * (1. + h2) + fi) * .015 * ph, -ph * (.35 + h2 * .3));
      vec2 dd = (im - pp) * vec2(asp, 1.);
      float r = .0018 + h2 * .0018;
      float a = smoothstep(0., .08, ph) * (1. - ph) * (.6 + .4 * sin(uT * 20. + fi * 3.));
      col += vec3(1., .62, .25) * exp(-dot(dd, dd) / (r * r)) * a * 1.4 * uFx.x;
    }
  }
  // sao lấp lánh: chỉ các điểm sáng nhỏ, ít màu ở nửa trên ảnh
  if (uFx.y > 0.) {
    float sat = max(max(base.r, base.g), base.b) - min(min(base.r, base.g), base.b);
    float star = smoothstep(.25, .5, lum) * smoothstep(.18, .05, sat) * smoothstep(.5, .3, im.y);
    vec2 cell = floor(im * vec2(320., 180.));
    float tw = .55 + .9 * noise(vec2(uT * (1.5 + hash(cell) * 3.), hash(cell + 2.) * 50.));
    col = mix(col, col * tw, star * uFx.y);
  }
  // sao băng: thi thoảng vạch một đường sáng qua nền trời (không đè lên núi / cây tối)
  if (uFx.w > 0.) {
    for (int j = 0; j < 2; j++) {
      float P = 7. + float(j) * 4.3, k = floor((uT + float(j) * 3.1) / P), lt = mod(uT + float(j) * 3.1, P);
      float h = hash(vec2(k, 13.7 + float(j))), h2 = hash(vec2(k, 2.9 + float(j)));
      if (h < .4 || lt > 1.1) continue;                      // không phải lần nào cũng có
      vec2 st = vec2(.28 + h2 * .42, .04 + h * .14);
      vec2 dir = normalize(vec2(h2 > .5 ? -1. : 1., .55 + h * .3));
      float prog = lt / 1.1, len = .16;
      vec2 head = st + dir * prog * .32, tail = head - dir * len * min(1., prog * 3.);
      vec2 pa = (im - tail) * vec2(asp, 1.), ba = (head - tail) * vec2(asp, 1.);
      float t = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
      float dist = length(pa - ba * t);
      float sky = smoothstep(.05, .11, dot(texture2D(uSharp, vec2(im.x, 1. - im.y)).rgb, vec3(.3, .59, .11))) * smoothstep(.45, .3, im.y);
      float a = smoothstep(.0022, 0., dist) * t * t * sin(prog * 3.1416) * sky;
      col += vec3(.9, .95, 1.) * a * 1.6 * uFx.w;
      col += vec3(.7, .8, 1.) * exp(-dist * dist / .00002) * t * sin(prog * 3.1416) * sky * .25 * uFx.w; // quầng mờ
    }
  }
  // tuyết rơi ngoài trời (chỉ trong khung cửa)
  float inside = 0., edge = 0.;
  for (int k = 0; k < 2; k++) {
    vec4 sb = (k == 0 ? uSnow : uSnow2) / 100.;
    if (sb.z > sb.x) {
      vec2 sr = (im - sb.xy) / (sb.zw - sb.xy);
      float ins = step(0., sr.x) * step(sr.x, 1.) * step(0., sr.y) * step(sr.y, 1.);
      inside = max(inside, ins);
      edge = max(edge, ins * smoothstep(0., .05, sr.x) * smoothstep(1., .95, sr.x) * smoothstep(0., .03, sr.y) * smoothstep(1., .97, sr.y));
    }
  }
  if (inside > 0.) {
    float snow = 0.;
    for (int L = 0; L < 3; L++) {
      float fl3 = float(L), sc = 55. + fl3 * 35.;              // lớp gần to & nhanh, lớp xa nhỏ & chậm
      vec2 p = vec2(im.x * sc * asp, im.y * sc - uT * (5. + fl3 * 2.5));
      p.x += sin(p.y * .35 + fl3 * 3.) * .6 + uT * .4;
      vec2 id = floor(p), f = fract(p) - .5;
      vec2 r = vec2(hash(id + fl3), hash(id + fl3 + 4.7));
      float on = step(.5, r.x);
      float rad = .1 + r.y * .12;
      snow += smoothstep(rad, rad * .3, length(f - (r - .5) * .6)) * on * (1. - fl3 * .25);
    }
    col = mix(col, col * vec3(.72, .77, .86), .7 * edge);          // trời tuyết: xám lạnh hơn để thấy bông tuyết
    col = mix(col, vec3(.97, .98, 1.), clamp(snow, 0., 1.) * .95 * edge);
  }
  gl_FragColor = vec4(col, 1.);
}`,
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
  function mount(host, img, kind, box, snow, fx) {
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
      const needBlur = FS.indexOf('uBlur') >= 0;
      const b = document.createElement('canvas'); b.width = Math.round(img.naturalWidth / 2); b.height = Math.round(img.naturalHeight / 2);
      if (!needBlur) { b.width = b.height = 2; }
      const bx = b.getContext('2d'); if (needBlur) bx.filter = 'blur(5px) brightness(.95)'; if (needBlur) bx.drawImage(img, -10, -10, b.width + 20, b.height + 20);
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0); tex(img); gl.activeTexture(gl.TEXTURE1); tex(b);
      gl.uniform1i(gl.getUniformLocation(pr, 'uSharp'), 0); gl.uniform1i(gl.getUniformLocation(pr, 'uBlur'), 1);
      gl.uniform2f(gl.getUniformLocation(pr, 'uImg'), img.naturalWidth, img.naturalHeight);
      const uRes = gl.getUniformLocation(pr, 'uRes'), uT = gl.getUniformLocation(pr, 'uT');
      const sh1 = gl.getUniformLocation(pr, 'uS1'), sh2 = gl.getUniformLocation(pr, 'uS2');
      if (sh1 && snow && snow.length >= 2) { gl.uniform4f(sh1, ...snow[0]); gl.uniform4f(sh2, ...snow[1]); } // Bờ biển: mép nước (dùng chung tham số thứ 5)
      if (kind === 'amb') { // box = danh sách lớp [[x0, y0, x1, y1, loại, độ mạnh, tham số 1, tham số 2], …]
        const L = (box || []).slice(0, 6);
        for (let i = 0; i < 6; i++) { const l = L[i] || [0, 0, 0, 0, 0, 0, 0, 0];
          gl.uniform4f(gl.getUniformLocation(pr, `uR[${i}]`), l[0], l[1], l[2], l[3]); gl.uniform4f(gl.getUniformLocation(pr, `uP[${i}]`), l[4], l[5], l[6], l[7]); }
        box = null;
      }
      const uBox = gl.getUniformLocation(pr, 'uBox'); if (uBox && box) gl.uniform4f(uBox, box[0], box[1], box[2], box[3]);
      const uFx = gl.getUniformLocation(pr, 'uFx'); if (uFx) { const f = fx || []; gl.uniform4f(uFx, f[0] || 0, f[1] || 0, f[2] || 0, f[3] || 0); }
      const sn = snow || [], z = [0, 0, 0, 0]; ['uSnow', 'uSnow2'].forEach((u, i) => { const l = gl.getUniformLocation(pr, u); if (l) gl.uniform4f(l, ...(sn[i] || z)); });
      host.append(cv);
      // độ phân giải vẽ: máy tính ~1,4 triệu điểm ảnh, chế độ mượt ~0,4 triệu (ảnh nền vốn mềm nên khó thấy khác)
      const lite = !!window.LITE;
      let maxPx = lite ? 420000 : 1400000;
      const fit = () => {
        const r = host.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5);
        const k = Math.min(d, Math.sqrt(maxPx / Math.max(1, r.width * r.height)));
        cv.width = Math.max(2, Math.round(r.width * k)); cv.height = Math.max(2, Math.round(r.height * k));
        gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uRes, cv.width, cv.height);
      };
      fit(); addEventListener('resize', fit);
      const t0 = performance.now(), minGap = lite ? 31 : 0;   // chế độ mượt: 30 hình/giây
      let last = 0, n = 0, sum = 0, stopped = false;
      const loop = (now) => {
        if (!cv.isConnected) { removeEventListener('resize', fit); const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); return; }
        if (stopped) return;
        if (!document.hidden && now - last >= minGap) {
          // tự giảm tải: khung hình chậm thì giảm độ phân giải; vẫn chậm ở mức thấp nhất thì dừng (giữ ảnh tĩnh)
          if (last) { sum += now - last; if (++n >= 60) { const avg = sum / n; n = sum = 0;
            if (avg > (lite ? 48 : 34)) { if (maxPx > 160000) { maxPx = Math.round(maxPx * .7); fit(); } else { stopped = true; cv.style.transition = 'opacity .8s'; cv.style.opacity = '0'; return; } } } }
          last = now;
          gl.uniform1f(uT, (now - t0) / 1000 + 40); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      return true;
    } catch (e) { console.warn('live', e); cv.remove(); return false; }
  }
  return { mount, kinds: Object.keys(SHADERS) };
})();
