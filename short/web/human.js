// Full-figure 2D cartoon humans for Telugu family-drama shorts (original designs).
// Drawn on a 600 x 1000 design card: centre x = 300, soles at y = 975 (same card contract as the stickman cast).
// drawHuman(g, def, opts)  def = character definition (see family.js), opts = { expr, armL, armR, look, tilt }
// Every character carries its own face geometry, eye / nose / mouth style, body proportions and height,
// so the cast reads as different people rather than one template.

const OL = "#3b2216", LW = 5;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = (a) => `rgb(${a.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")})`;
export const shade = (h, k = 0.8) => rgb(hex(h).map((v) => v * k));
export const tint = (h, k = 0.3) => rgb(hex(h).map((v) => v + (255 - v) * k));

function shp(g, build, fill, o = {}) {
  g.beginPath(); build(g);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (o.inner) { g.save(); g.clip(); o.inner(g); g.restore(); }
  if (o.stroke !== null) {
    g.beginPath(); build(g);
    g.lineWidth = o.lw || LW; g.strokeStyle = o.stroke || OL; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
  }
}
const line = (g, pts, w, col, cap = "round") => {
  g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p);
  g.lineWidth = w; g.strokeStyle = col; g.lineCap = cap; g.lineJoin = "round"; g.stroke();
};
const curve = (g, a, c, b, w, col) => { g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...c, ...b); g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.stroke(); };
const dot = (g, x, y, r, col, stroke) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = col; g.fill(); if (stroke) { g.lineWidth = stroke; g.strokeStyle = OL; g.stroke(); } };
const ell = (g, x, y, rx, ry, col, stroke, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); if (col) { g.fillStyle = col; g.fill(); } if (stroke) { g.lineWidth = stroke; g.strokeStyle = OL; g.stroke(); } };
const lerp = (a, b, t) => a + (b - a) * t;
const P = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** symmetric outline from left-side cubic segments [[c1, c2, p], ...] starting at `start` (x offsets from centre 300) */
function mirrorPath(c, start, segs, close = true) {
  c.moveTo(300 + start[0], start[1]);
  for (const [a, b, p] of segs) c.bezierCurveTo(300 + a[0], a[1], 300 + b[0], b[1], 300 + p[0], p[1]);
  let prev = [start, ...segs.map((s) => s[2])];
  for (let i = segs.length - 1; i >= 0; i--) {
    const [a, b] = segs[i], p = prev[i];
    c.bezierCurveTo(300 - b[0], b[1], 300 - a[0], a[1], 300 - p[0], p[1]);
  }
  if (close) c.closePath();
}

// ------------------------------------------------------------------ arms
const POSE = {
  down: [[1.08, 455], [1.06, 598]],
  hip: [[1.6, 418], [0.92, 505]],
  point: [[1.6, 332], [2.3, 266]],
  cheek: [[1.36, 418], [0.7, 214]],
  fold: [[1.06, 440], [0.12, 372]],
  up: [[1.45, 200], [1.36, 84]],
  hold: [[1.25, 430], [0.55, 440]],
  wave: [[1.55, 300], [1.75, 170]],
  phone: [[1.3, 420], [0.62, 200]],
};
function limb(g, A, B, C, w0, w1, col, outline = true) {
  const n = P(A, B, 0.72), m = P(B, C, 0.28);
  const pass = (extra, c) => {
    g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = c;
    g.beginPath(); g.moveTo(...A); g.lineTo(...n); g.quadraticCurveTo(...B, ...m); g.lineWidth = w0 + extra; g.stroke();
    g.beginPath(); g.moveTo(...m); g.lineTo(...C); g.lineWidth = w1 + extra; g.stroke();
  };
  if (outline) pass(2 * LW, OL);
  pass(0, col);
}
function arm(g, d, side, pose, sleeveCol, sleeveLen, prop) {
  const sh = d.sh;
  const S = [300 + side * (sh - 14), 314];
  const [e, h] = POSE[pose] || POSE.down;
  const E = [300 + side * e[0] * sh * 1.02, e[1]], H = [300 + side * h[0] * sh, h[1]];
  const w = d.armW || 30, skin = d.skin;
  limb(g, S, E, H, w, w * 0.82, skin);
  // light rim of shade along the outer edge of the forearm
  g.save(); g.globalAlpha = 0.22; limb(g, [S[0] + side * 6, S[1]], [E[0] + side * 6, E[1]], [H[0] + side * 5, H[1]], w * 0.35, w * 0.3, shade(skin, 0.5), false); g.restore();
  if (d.bangles) {
    for (const t of [0.7, 0.79, 0.86]) {
      const p = P(E, H, t), ang = Math.atan2(H[1] - E[1], H[0] - E[0]) + Math.PI / 2;
      const dx = Math.cos(ang) * (w * 0.41 + 3), dy = Math.sin(ang) * (w * 0.41 + 3);
      line(g, [[p[0] - dx, p[1] - dy], [p[0] + dx, p[1] + dy]], 6, d.bangles, "butt");
    }
  }
  if (sleeveLen > 0) {
    const tip = sleeveLen <= 1 ? P(S, E, sleeveLen) : P(E, H, sleeveLen - 1);
    if (sleeveLen <= 1) { line(g, [S, tip], w + 16 + 2 * LW, OL); line(g, [S, tip], w + 16, sleeveCol); }
    else limb(g, S, E, tip, w + 16, w + 8, sleeveCol);
    if (d.sleeveBorder) { const a = sleeveLen <= 1 ? S : E; line(g, [P(a, tip, 0.8), tip], w + 16, d.sleeveBorder, "butt"); }
    if (sleeveLen <= 1) line(g, [[S[0] - side * 10, S[1] - 4], P(S, tip, 0.85)], 3, shade(sleeveCol, 0.7));
  }
  // hand: palm + thumb, oriented along the forearm
  const ang = Math.atan2(H[1] - E[1], H[0] - E[0]);
  const hx = H[0] + Math.cos(ang) * 10, hy = H[1] + Math.sin(ang) * 10;
  const t = ang - side * 1.1;
  ell(g, hx + Math.cos(t) * 13, hy + Math.sin(t) * 13, 9, 6, skin, 3.5, t);
  ell(g, hx, hy, 19, 15, skin, LW, ang);
  if (prop) drawProp(g, prop, hx, hy, side, ang);
  if (pose === "point") {
    const a0 = [hx + Math.cos(ang) * 12, hy + Math.sin(ang) * 12], f = [hx + Math.cos(ang) * 44, hy + Math.sin(ang) * 44];
    line(g, [a0, f], 11 + 2 * LW, OL); line(g, [a0, f], 11, skin);
  } else {
    for (const k of [-0.35, 0, 0.35]) { const a2 = ang + k; line(g, [[hx + Math.cos(a2) * 13, hy + Math.sin(a2) * 13], [hx + Math.cos(a2) * 19, hy + Math.sin(a2) * 19]], 2.5, shade(skin, 0.5)); }
  }
}

function drawProp(g, prop, x, y, side, ang) {
  const box = (bx, by, w, h, fill, r = 6, lw = 4) => { g.beginPath(); g.roundRect(bx, by, w, h, r); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); };
  if (prop === "bag") { g.lineWidth = 5; g.strokeStyle = "#5a3418"; g.beginPath(); g.moveTo(x - 20, y + 4); g.lineTo(x - 30, y + 46); g.moveTo(x + 20, y + 4); g.lineTo(x + 30, y + 46); g.stroke(); box(x - 52, y + 40, 104, 84, "#8a4a2a", 12, 5); line(g, [[x - 52, y + 62], [x + 52, y + 62]], 4, "#e0b13a"); }
  if (prop === "phone") { box(x - 15 + side * 6, y - 40, 30, 54, "#22252c", 7, 4); g.fillStyle = "#6fb8e8"; g.fillRect(x - 10 + side * 6, y - 34, 20, 38); }
  if (prop === "remote") { g.save(); g.translate(x, y); g.rotate(ang - Math.PI / 2); box(-11, -8, 22, 70, "#1d1f26", 6, 4); for (let k = 0; k < 3; k++) dot(g, 0, 10 + k * 16, 4, k ? "#888" : "#d83030"); g.restore(); }
  if (prop === "bowl") { g.beginPath(); g.ellipse(x - side * 40, y - 6, 58, 16, 0, 0, Math.PI * 2); g.fillStyle = "#f0c540"; g.fill(); g.beginPath(); g.moveTo(x - side * 40 - 58, y - 6); g.quadraticCurveTo(x - side * 40, y + 60, x - side * 40 + 58, y - 6); g.closePath(); g.fillStyle = "#e85a3a"; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); for (let k = -2; k <= 2; k++) curve(g, [x - side * 40 + k * 16, y - 12], [x - side * 40 + k * 16 + 8, y - 30], [x - side * 40 + k * 16 + 2, y - 44], 3.5, "#f6d36a"); }
  if (prop === "shirt") { g.beginPath(); g.moveTo(x - 50, y + 6); g.lineTo(x + 50, y + 6); g.lineTo(x + 60, y + 150); g.lineTo(x - 60, y + 150); g.closePath(); g.fillStyle = "#e9eef6"; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); for (let k = 0; k < 4; k++) curve(g, [x - 40, y + 40 + k * 28], [x, y + 46 + k * 28], [x + 44, y + 38 + k * 28], 2.5, "#9aa6b8"); }
  if (prop === "ladle") { line(g, [[x, y], [x - side * 10, y - 120]], 8, "#8a8f96"); g.beginPath(); g.ellipse(x - side * 12, y - 128, 24, 14, 0, 0, Math.PI * 2); g.fillStyle = "#c9cfd5"; g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); }
}

// ------------------------------------------------------------------ torsos
function torsoBuild(d, hem) {
  const sh = d.sh, wa = d.waist, hp = d.hip, sl = d.slope || 0;
  const segs = [
    [[-sh * 0.45, 262], [-sh * 0.86, 268 + sl], [-sh, 306 + sl]],                  // sloping shoulder
    [[-sh - 2, 350], [-wa - 4, 372], [-wa, 412]],                                   // ribs -> waist
  ];
  if (hem > 430) {
    const b = d.belly ? 30 : 0;
    segs.push([[-wa - b, 460], [-hp - b * 0.4, hem - 70], [-hp, hem]]);
  }
  return (c) => {
    c.moveTo(300, 258);
    c.lineTo(300 - 34, 258);
    const s0 = [-34, 258];
    // left side down
    for (const [a, b, p] of segs) c.bezierCurveTo(300 + a[0], a[1], 300 + b[0], b[1], 300 + p[0], p[1]);
    const end = segs[segs.length - 1][2];
    c.quadraticCurveTo(300, end[1] + (d.belly && hem > 430 ? 18 : 6), 300 - end[0], end[1]);
    const pts = [s0, ...segs.map((s) => s[2])];
    for (let i = segs.length - 1; i >= 0; i--) { const [a, b] = segs[i], p = pts[i]; c.bezierCurveTo(300 - b[0], b[1], 300 - a[0], a[1], 300 - p[0], p[1]); }
    c.closePath();
  };
}
function blouseTop(g, d) {
  shp(g, torsoBuild(d, 418), d.blouse, { inner: (c) => { c.fillStyle = shade(d.blouse, 0.8); c.fillRect(300 + d.sh * 0.5, 250, 120, 200); } });
  const sh = d.sh;
  const band = (c) => { c.moveTo(300 - d.waist - 8, 452); c.quadraticCurveTo(300 - 60, 468, 300 - 40, 474); c.bezierCurveTo(300 + 40, 420, 300 + sh * 0.9, 360, 300 + sh + 8, 318); c.quadraticCurveTo(300 + sh * 0.9, 268, 300 + sh * 0.5, 262); c.bezierCurveTo(300 + 20, 330, 300 - 60, 400, 300 - d.waist - 8, 452); c.closePath(); };
  shp(g, band, d.saree, { inner: (c) => {
    c.fillStyle = shade(d.saree, 0.86); c.beginPath(); c.moveTo(300 - 40, 474); c.bezierCurveTo(300 + 40, 420, 300 + sh * 0.9, 360, 300 + sh + 8, 318); c.lineTo(300 + sh + 8, 380); c.lineTo(300 - 20, 490); c.fill();
    for (const k of [0.3, 0.55]) curve(c, [300 - 70 + k * 60, 450 - k * 30], [300 + k * 90, 380 - k * 60], [300 + sh * (0.4 + k * 0.6), 290], 2.5, shade(d.saree, 0.72)); // drape folds
    if (d.motif) for (const t of [0.3, 0.55, 0.8]) dot(c, lerp(300 - 60, 300 + sh * 0.8, t), lerp(452, 300, t), 6, d.motif);
    c.lineWidth = 15; c.strokeStyle = d.border; c.beginPath(); c.moveTo(300 - d.waist - 8, 452); c.bezierCurveTo(300 - 60, 400, 300 + 20, 330, 300 + sh * 0.5, 262); c.stroke();
    c.lineWidth = 11; c.beginPath(); c.moveTo(300 - 40, 474); c.bezierCurveTo(300 + 40, 420, 300 + sh * 0.9, 360, 300 + sh + 8, 318); c.stroke();
  } });
}
function shirtTop(g, d) {
  shp(g, torsoBuild(d, 540), d.shirt, { inner: (c) => {
    c.fillStyle = shade(d.shirt, 0.82); c.fillRect(300 + d.sh * 0.52, 250, 120, 320);
    if (d.check) { c.globalAlpha = 0.18; for (let x = 160; x < 450; x += 28) line(c, [[x, 250], [x, 560]], 5, d.check); for (let y = 270; y < 560; y += 28) line(c, [[150, y], [450, y]], 5, d.check); c.globalAlpha = 1; }
    curve(c, [300 - 70, 470], [300 - 40, 500], [300 - 60, 535], 3, shade(d.shirt, 0.7)); curve(c, [300 + 50, 360], [300 + 70, 420], [300 + 40, 470], 3, shade(d.shirt, 0.7));
  } });
  line(g, [[300, 290], [300, 535]], 3, shade(d.shirt, 0.6));
  for (let y = 320; y < 530; y += 50) dot(g, 300 + 8, y, 5, tint(d.shirt, 0.6), 2);
  for (const s of [-1, 1]) shp(g, (c) => { c.moveTo(300, 292); c.lineTo(300 + s * 46, 256); c.quadraticCurveTo(300 + s * 60, 270, 300 + s * 58, 296); c.closePath(); }, tint(d.shirt, 0.25), { lw: 4 });
  if (d.pocket) shp(g, (c) => { c.moveTo(300 - 84, 340); c.lineTo(300 - 44, 340); c.lineTo(300 - 46, 384); c.quadraticCurveTo(300 - 64, 390, 300 - 82, 384); c.closePath(); }, null, { lw: 3, stroke: shade(d.shirt, 0.6) });
}
function kurtaTop(g, d) {
  shp(g, torsoBuild(d, 610), d.shirt, { inner: (c) => {
    c.fillStyle = shade(d.shirt, 0.86); c.fillRect(300 + d.sh * 0.55, 250, 140, 380);
    curve(c, [300 - 80, 470], [300, 520], [300 + 80, 470], 3, shade(d.shirt, 0.75)); // belly fold
  } });
  line(g, [[300, 268], [300, 380]], 3, shade(d.shirt, 0.6));
  for (let y = 292; y < 380; y += 30) dot(g, 300 + 7, y, 4.5, "#c9a24a", 2);
  if (d.kanduva) {
    const b = (c) => { c.moveTo(300 + 40, 262); c.quadraticCurveTo(300 + 90, 258, 300 + d.sh, 286); c.bezierCurveTo(300 + d.sh + 20, 400, 300 + d.sh + 40, 520, 300 + d.sh + 34, 602); c.lineTo(300 + d.sh - 14, 606); c.bezierCurveTo(300 + d.sh - 10, 500, 300 + 70, 380, 300 + 40, 262); c.closePath(); };
    shp(g, b, d.kanduva, { inner: (c) => { for (let y = 300; y < 620; y += 36) line(c, [[300 + 30, y], [300 + 180, y + 6]], 8, tint(d.kanduva, 0.7)); c.fillStyle = shade(d.kanduva, 0.8); c.fillRect(300 + d.sh + 14, 250, 60, 400); } });
    for (let x = -10; x <= 36; x += 9) line(g, [[300 + d.sh + x, 604], [300 + d.sh + x, 618]], 3, d.kanduva);
  }
}

// ------------------------------------------------------------------ lower bodies
const feet = (g, d, col) => {
  // weight on one leg: the left foot slightly forward and turned out
  ell(g, 300 - 46, 968, 30, 12, d.skin, LW, -0.12); line(g, [[300 - 64, 966], [300 - 28, 962]], 6, col);
  ell(g, 300 + 42, 961, 28, 11, d.skin, LW, 0.08); line(g, [[300 + 25, 958], [300 + 58, 961]], 6, col);
};
function saree(g, d) {
  const w0 = d.waist + 8, w1 = w0 + 40;
  const build = (c) => { c.moveTo(300 - w0, 410); c.bezierCurveTo(300 - w0 - 34, 600, 300 - w1, 820, 300 - w1 + 4, 952); c.quadraticCurveTo(300, 964, 300 + w1, 950); c.bezierCurveTo(300 + w1 - 6, 820, 300 + w0 + 26, 600, 300 + w0, 410); c.closePath(); };
  shp(g, build, d.saree, { inner: (c) => {
    c.fillStyle = shade(d.saree, 0.82); c.beginPath(); c.moveTo(300 + 46, 400); c.bezierCurveTo(300 + 60, 600, 300 + 70, 800, 300 + 90, 1000); c.lineTo(600, 1000); c.lineTo(600, 400); c.fill();
    c.fillStyle = tint(d.saree, 0.12); c.beginPath(); c.moveTo(300 - 8, 440); c.lineTo(300 + 46, 440); c.lineTo(300 + 76, 960); c.lineTo(300 - 32, 960); c.fill();
    for (let i = 0; i < 5; i++) { const x0 = 300 - 4 + i * 12, x1 = 300 - 28 + i * 25; curve(c, [x0, 445], [lerp(x0, x1, 0.5) + (i % 2 ? 4 : -4), 700], [x1, 955], 3, shade(d.saree, 0.7)); }
    curve(c, [300 - w0 + 10, 470], [300 - w0 - 6, 650], [300 - w1 + 30, 900], 3, shade(d.saree, 0.78));
    if (d.motif) for (let y = 520; y < 900; y += 70) for (let x = 300 - 130; x < 300 + 140; x += 62) dot(c, x + ((y / 70) % 2) * 31, y, 6, d.motif);
    c.fillStyle = d.border; c.fillRect(0, 912, 600, 60);
    c.fillStyle = shade(d.border, 0.75); c.fillRect(0, 912, 600, 6);
    for (let x = 140; x < 470; x += 22) dot(c, x, 940, 5, shade(d.border, 0.72));
  } });
  feet(g, d, "#7a4a24");
}
function pants(g, d) {
  const hp = d.hip;
  for (const s of [-1, 1]) {
    const knee = s < 0 ? -6 : 4;
    shp(g, (c) => { c.moveTo(300 + s * 3, 528); c.lineTo(300 + s * hp, 528); c.bezierCurveTo(300 + s * (hp - 2), 640, 300 + s * (hp - 12) + knee, 760, 300 + s * (hp - 16), 946); c.lineTo(300 + s * 18, 946); c.bezierCurveTo(300 + s * 14, 760, 300 + s * 6 + knee, 640, 300 + s * 3, 528); c.closePath(); }, d.pant,
      { inner: (c) => { c.fillStyle = shade(d.pant, 0.8); c.fillRect(s > 0 ? 300 + hp - 40 : 300 - 40, 520, 40, 440); curve(c, [300 + s * 40, 700], [300 + s * 48, 760], [300 + s * 36, 820], 3, shade(d.pant, 0.65)); } });
  }
  ell(g, 300 - 54, 960, 46, 16, "#2a1d16", LW, -0.08); ell(g, 300 + 56, 955, 44, 15, "#2a1d16", LW, 0.06);
  line(g, [[300 - hp, 532], [300 + hp, 532]], 14, "#4a3426", "butt");
  dot(g, 300, 532, 8, "#c9a24a", 3);
}
function pancha(g, d) {
  const hp = d.hip;
  const build = (c) => { c.moveTo(300 - hp, 560); c.bezierCurveTo(300 - hp - 6, 700, 300 - hp - 14, 850, 300 - hp - 12, 952); c.quadraticCurveTo(300, 962, 300 + hp + 10, 950); c.bezierCurveTo(300 + hp + 12, 850, 300 + hp + 6, 700, 300 + hp, 560); c.closePath(); };
  shp(g, build, d.pancha, { inner: (c) => {
    c.fillStyle = shade(d.pancha, 0.86); c.fillRect(300 + 50, 540, 200, 450);
    curve(c, [300 + 14, 560], [300 + 10, 760], [300 + 32, 952], 4, shade(d.pancha, 0.7));
    curve(c, [300 - 60, 600], [300 - 70, 760], [300 - 54, 930], 3, shade(d.pancha, 0.8));
    c.fillStyle = d.border; c.fillRect(0, 922, 600, 30);
    c.lineWidth = 16; c.strokeStyle = d.border; c.beginPath(); c.moveTo(300 + 26, 560); c.quadraticCurveTo(300 + 22, 760, 300 + 40, 940); c.stroke();
  } });
  feet(g, d, "#6a3e1e");
}

// ------------------------------------------------------------------ head
function faceBuild(F) {
  const { top, temple, cheek, cheekY, jaw, jawY, chin, chinW } = F;
  return (c) => mirrorPath(c, [0, top], [
    [[-temple * 0.6, top], [-temple, top + 20], [-temple, top + 62]],
    [[-temple, cheekY - 34], [-cheek, cheekY - 26], [-cheek, cheekY]],
    [[-cheek, cheekY + 30], [-jaw, jawY - 26], [-jaw, jawY]],
    [[-jaw + 4, jawY + 24], [-chinW - 6, chin], [0, chin]],
  ]);
}
const STY = {
  cat: { rx: 21, ry: 11, tilt: 0.2, iris: 10.5 },
  doe: { rx: 22, ry: 16, tilt: 0.05, iris: 13 },
  small: { rx: 17, ry: 10, tilt: 0.03, iris: 8.5 },
  droopy: { rx: 18, ry: 11, tilt: -0.16, iris: 9 },
};
function eye(g, cx, cy, d, ex, side, look) {
  const st = STY[d.eyeStyle || "doe"];
  let rx = st.rx, ry = st.ry;
  if (ex === "shock") { rx *= 1.08; ry *= 1.45; }
  g.save(); g.translate(cx, cy); g.rotate(-side * st.tilt);
  const crease = shade(d.skin, 0.62);
  if (d._blink && ex !== "happy") { curve(g, [-rx, 0], [0, ry * 0.7], [rx, -1], 6, OL); if (d.female) line(g, [[side * rx, 0], [side * (rx + 9), -5]], 4, OL); g.restore(); return; }
  if (ex === "happy") {
    curve(g, [-rx, 4], [0, -ry - 8], [rx, 4], 6, OL);
    if (d.female) line(g, [[side * rx, 2], [side * (rx + 9), -6]], 4, OL);
    g.restore(); return;
  }
  curve(g, [-rx * 0.8, -ry - 5], [0, -ry * 1.9 - 4], [rx * 0.85, -ry - 4], 2.5, crease);   // lid crease
  if (d.eyeBags) curve(g, [-rx * 0.7, ry + 7], [0, ry + 13], [rx * 0.75, ry + 6], 2.5, crease);
  const almond = (c) => { c.moveTo(-rx, 0); c.bezierCurveTo(-rx * 0.5, -ry * 1.35, rx * 0.55, -ry * 1.4, rx, -1); c.bezierCurveTo(rx * 0.5, ry * 1.05, -rx * 0.5, ry * 1.0, -rx, 0); };
  const lx = (look || 0) * rx * 0.35 + (ex === "sly" ? 7 : 0), ly = ex === "sad" ? 4 : 0;
  shp(g, almond, "#fffaf2", { stroke: null, inner: (c) => {
    const ir = ex === "shock" ? st.iris * 0.75 : st.iris;
    dot(c, lx, 1 + ly, ir, d.iris || "#4a2a18");
    dot(c, lx, 1 + ly, ir * 0.52, "#140c08");
    dot(c, lx + ir * 0.35, -ir * 0.3 + ly, Math.max(2.5, ir * 0.3), "#ffffff");
    c.fillStyle = "rgba(60,30,10,0.16)"; c.fillRect(-rx, -ry * 2, rx * 2, ry * 0.9 + 2);      // lid shadow on the eyeball
    c.fillStyle = d.skin;
    if (ex === "angry") { c.beginPath(); c.moveTo(-rx - 4, -ry * 2.4); c.lineTo(rx + 4, -ry * 2.4); c.lineTo(side * -rx, -ry * 0.1); c.lineTo(side * rx, -ry * 0.85); c.closePath(); c.fill(); }
    if (ex === "sly") c.fillRect(-rx - 4, -ry * 2.6, 2 * rx + 8, ry * 2.25);
    if (ex === "sad") { c.beginPath(); c.moveTo(-rx - 4, -ry * 2.6); c.lineTo(rx + 4, -ry * 2.6); c.lineTo(-side * rx, -ry * 0.4); c.lineTo(side * rx, -ry * 0.95); c.closePath(); c.fill(); }
  } });
  g.beginPath(); g.moveTo(-rx, 0); g.bezierCurveTo(-rx * 0.5, -ry * 1.35, rx * 0.55, -ry * 1.4, rx, -1); g.lineWidth = d.female ? 6 : 5; g.strokeStyle = OL; g.lineCap = "round"; g.stroke();
  g.beginPath(); g.moveTo(-rx + 4, 2); g.bezierCurveTo(-rx * 0.4, ry * 0.95, rx * 0.4, ry * 1.0, rx - 3, 1); g.lineWidth = 2.2; g.strokeStyle = shade(d.skin, 0.45); g.stroke();
  if (ex === "sly") line(g, [[-rx, -ry * 0.35], [rx, -ry * 0.35]], 4.5, OL);
  if (d.female) { line(g, [[side * rx, -1], [side * (rx + 10), -10]], 4, OL); line(g, [[side * (rx - 6), -ry + 1], [side * (rx + 2), -ry - 8]], 3.5, OL); }
  if (d.kajal) curve(g, [-rx + 3, 3], [0, ry * 1.05], [rx - 2, 1], 3.5, "#1a120c");
  g.restore();
}
function brows(g, d, ex) {
  const F = d.face, col = d.browCol || "#22160f", w = d.browW || 7;
  for (const s of [-1, 1]) {
    const cx = 300 + s * F.eyeX, by = F.eyeY - (d.browGap || 30) - (s > 0 ? d.browAsym || 0 : 0);
    let inner = [cx - s * 19, by + 2], outer = [cx + s * 22, by + 4], mid = [cx + s * 4, by - 9];
    if (d.browShape === "straight") mid = [cx, by - 3];
    if (ex === "angry") { inner = [cx - s * 19, by + 12]; outer = [cx + s * 23, by - 6]; mid = [cx, by - 1]; }
    if (ex === "sad") { inner = [cx - s * 19, by - 8]; outer = [cx + s * 22, by + 8]; mid = [cx, by - 4]; }
    if (ex === "shock") { inner = [cx - s * 17, by - 10]; outer = [cx + s * 21, by - 8]; mid = [cx, by - 24]; }
    if (ex === "sly") { const up = s > 0; inner = [cx - s * 19, up ? by - 8 : by + 8]; outer = [cx + s * 22, up ? by - 4 : by + 4]; mid = [cx, up ? by - 22 : by + 2]; }
    if (ex === "happy") mid = [cx + s * 4, by - 15];
    // tapered brow: thick inner end, thin tail
    g.beginPath(); g.moveTo(...inner); g.quadraticCurveTo(...mid, ...outer); g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.stroke();
    g.beginPath(); g.moveTo(...inner); g.quadraticCurveTo(...P(inner, mid, 0.8), ...P(inner, outer, 0.45)); g.lineWidth = w * 1.45; g.stroke();
  }
}
function nose(g, d) {
  const F = d.face, y = F.noseY, c = shade(d.skin, 0.5), n = d.noseStyle || "button";
  if (n === "broad") {
    curve(g, [300 - 3, F.eyeY + 12], [300 - 7, y - 26], [300 - 9, y - 10], 3, shade(d.skin, 0.7));
    curve(g, [300 - 20, y - 4], [300 - 22, y + 8], [300 - 8, y + 6], 3.5, c); curve(g, [300 + 20, y - 4], [300 + 22, y + 8], [300 + 8, y + 6], 3.5, c);
    curve(g, [300 - 8, y + 6], [300, y + 10], [300 + 8, y + 6], 3.5, c);
  } else if (n === "long") {
    curve(g, [300 + 3, F.eyeY - 6], [300 - 1, y - 30], [300 - 8, y - 4], 3.5, shade(d.skin, 0.62));
    curve(g, [300 - 8, y - 4], [300 - 4, y + 8], [300 + 10, y + 2], 4, c);
    dot(g, 300 - 7, y + 3, 2.6, shade(d.skin, 0.4));
  } else if (n === "bulb") {
    g.beginPath(); g.arc(300, y - 4, 15, 0.25, Math.PI - 0.25); g.lineWidth = 4; g.strokeStyle = c; g.stroke();
    curve(g, [300 - 13, y + 1], [300 - 22, y - 2], [300 - 18, y - 12], 3.5, c); curve(g, [300 + 13, y + 1], [300 + 22, y - 2], [300 + 18, y - 12], 3.5, c);
    ell(g, 300 + 5, y - 9, 5, 3, "rgba(255,255,255,0.35)");
  } else {
    curve(g, [300 - 4, y - 14], [300 - 12, y + 2], [300 + 2, y + 3], 4, c);
    dot(g, 300 - 6, y + 2, 2.2, shade(d.skin, 0.42)); dot(g, 300 + 6, y + 2, 2.2, shade(d.skin, 0.42));
  }
}
function mouth(g, d, ex) {
  const y = d.face.mouthY, mw = d.mouthW || 24;
  const tk = d._talk || 0;
  if (tk > 0.1 && ex !== "happy" && ex !== "shock") {
    const h = 6 + 26 * Math.min(1, tk), w = mw * (0.75 + 0.15 * tk) * (ex === "angry" ? 1.15 : 1);
    const dy = ex === "sad" ? 4 : 0;
    shp(g, (c) => { c.moveTo(300 - w, y + 4 + dy); c.quadraticCurveTo(300, y - 4 + dy - (ex === "sad" ? 6 : 0), 300 + w, y + 4 + dy); c.quadraticCurveTo(300, y + 4 + h * 1.4 + dy, 300 - w, y + 4 + dy); }, "#6a1a1e",
      { lw: 4.5, inner: (c) => { c.fillStyle = "#fff"; c.fillRect(300 - w, y - 8 + dy, 2 * w, 9); ell(c, 300, y + 4 + h * 1.3 + dy, w * 0.55, h * 0.4, "#d8606a"); } });
    return;
  }
  if (ex === "happy") {
    shp(g, (c) => { c.moveTo(300 - mw - 6, y - 6); c.quadraticCurveTo(300, y - 1, 300 + mw + 6, y - 7); c.quadraticCurveTo(300 + mw, y + 30, 300 - 2, y + 32); c.quadraticCurveTo(300 - mw, y + 30, 300 - mw - 6, y - 6); }, "#7a1e22",
      { lw: 4.5, inner: (c) => { c.fillStyle = "#fff"; c.fillRect(300 - 40, y - 12, 80, 12); ell(c, 300, y + 30, 15, 10, "#e0707a"); } });
    for (const s of [-1, 1]) curve(g, [300 + s * (mw + 8), y - 12], [300 + s * (mw + 14), y - 4], [300 + s * (mw + 10), y + 4], 2.5, shade(d.skin, 0.55)); // cheek dimples
  } else if (ex === "angry") {
    shp(g, (c) => { c.moveTo(300 - mw, y + 10); c.quadraticCurveTo(300, y - 8, 300 + mw + 2, y + 8); c.quadraticCurveTo(300, y + 22, 300 - mw, y + 10); }, "#ffffff", { lw: 4.5, inner: (c) => line(c, [[270, y + 6], [330, y + 6]], 2.5, "#9a8a80") });
  } else if (ex === "sad") {
    g.beginPath(); g.moveTo(300 - mw + 2, y + 12); g.quadraticCurveTo(300 - 10, y - 2, 300, y + 4); g.quadraticCurveTo(300 + 10, y - 1, 300 + mw - 2, y + 13); g.lineWidth = 4.5; g.strokeStyle = OL; g.stroke();
  } else if (ex === "shock") {
    ell(g, 300, y + 8, 14, 21, "#5a1418", 4.5); ell(g, 300, y + 21, 8, 6, "#d8606a");
  } else if (ex === "sly") {
    curve(g, [300 - mw, y + 3], [300 + 6, y + 12], [300 + mw + 2, y - 7], 4.5, OL);
  } else {
    curve(g, [300 - mw + 4, y + 1], [300 + 2, y + 9], [300 + mw - 4, y - 1], 4.5, OL);
  }
  if (d.lips && (ex === "neutral" || ex === "sad" || ex === "sly")) {
    const lw2 = mw - 6;
    shp(g, (c) => { c.moveTo(300 - lw2, y + 4); c.quadraticCurveTo(300, y + (ex === "sad" ? 14 : 20), 300 + lw2, y + 4); c.quadraticCurveTo(300, y + 8, 300 - lw2, y + 4); }, d.lips, { stroke: null });
    curve(g, [300 - 8, y - 4], [300, y - 1], [300 + 8, y - 4], 2.5, shade(d.lips, 0.75));
  }
}

function hair(g, d, layer) {
  const H = d.hair, hl = tint(H, 0.2), F = d.face;
  const T = F.top, tw = F.temple, ch = F.cheek;
  if (layer === "back") {
    if (d.bun) { ell(g, 300 + 6, T - 6, 44, 32, H, LW, 0.1); for (let a = -2.7; a <= -0.4; a += 0.3) dot(g, 306 + Math.cos(a) * 49, T - 4 + Math.sin(a) * 36, 7, "#fffdf4", 2); }
    if (d.puff) for (const s of [-1, 1]) ell(g, 300 + s * (tw + 4), F.eyeY + 6, 26, 62, H, LW, s * 0.12);
    return;
  }
  if (d.bald) {
    for (const s of [-1, 1]) shp(g, (c) => { c.moveTo(300 + s * (ch - 2), F.eyeY + 30); c.quadraticCurveTo(300 + s * (ch + 16), F.eyeY - 10, 300 + s * (tw - 10), F.eyeY - 52); c.quadraticCurveTo(300 + s * (tw + 4), F.eyeY - 14, 300 + s * (tw - 8), F.eyeY - 6); c.quadraticCurveTo(300 + s * (ch + 6), F.eyeY + 8, 300 + s * (ch - 2), F.eyeY + 30); }, H, { lw: 3.5 });
    ell(g, 300 - 24, T + 22, 20, 9, "rgba(255,255,255,0.35)", 0, -0.4);
    return;
  }
  if (d.female) {
    const top = T - 20;
    shp(g, (c) => {
      c.moveTo(300 - ch - 6, F.eyeY + 22);
      c.bezierCurveTo(300 - ch - 14, top + 20, 300 - 40, top - 4, 300, top);
      c.bezierCurveTo(300 + 40, top - 4, 300 + ch + 14, top + 20, 300 + ch + 6, F.eyeY + 22);
      c.bezierCurveTo(300 + tw - 2, F.eyeY - 20, 300 + tw - 18, T + 34, 300 + 4, T + 26);    // hairline right
      c.bezierCurveTo(300 - tw + 16, T + 32, 300 - tw + 2, F.eyeY - 22, 300 - ch - 6, F.eyeY + 22); // hairline left
    }, H, { inner: (c) => {
      curve(c, [300 + 30, top + 8], [300 + tw, top + 30], [300 + ch, F.eyeY - 8], 9, hl);
      if (d.grey) { curve(c, [300 - 20, top + 6], [300 - tw + 4, top + 30], [300 - ch, F.eyeY - 14], 6, "#cfcac4"); curve(c, [300 + 14, top + 4], [300 + 40, top + 14], [300 + 60, top + 32], 5, "#cfcac4"); }
      for (const k of [-1, 1]) curve(c, [300 + k * 10, top + 10], [300 + k * 44, T + 4], [300 + k * (tw - 6), F.eyeY - 20], 2.5, shade(H, 0.6));
    } });
    line(g, [[300 + 2, top + 2], [300 + 4, T + 26]], 4, d.sindoor ? "#d4142a" : shade(H, 0.5));
    if (d.strands) for (const s of [-1, 1]) curve(g, [300 + s * (tw - 8), T + 30], [300 + s * (tw + 6), F.eyeY + 10], [300 + s * (tw - 4), F.eyeY + 48], 3.5, H);
  } else {
    const top = T - 16;
    shp(g, (c) => {
      c.moveTo(300 - ch + 2, F.eyeY + 4);
      c.bezierCurveTo(300 - ch - 10, top + 30, 300 - 50, top - 6, 300 + 10, top - 4);
      c.bezierCurveTo(300 + 70, top - 4, 300 + ch + 12, top + 30, 300 + ch - 2, F.eyeY + 4);
      c.bezierCurveTo(300 + tw - 6, F.eyeY - 30, 300 + tw - 10, T + 30, 300 + 40, T + 22);           // right hairline
      c.bezierCurveTo(300 + 10, T + 30, 300 - 30, T + 14, 300 - 56, T + 34);                        // side-swept fringe
      c.bezierCurveTo(300 - tw + 8, T + 44, 300 - tw + 2, F.eyeY - 30, 300 - ch + 2, F.eyeY + 4);
    }, H, { inner: (c) => { curve(c, [300 + 4, top + 6], [300 + 60, top + 10], [300 + ch - 6, T + 40], 9, hl); curve(c, [300 - 20, top + 12], [300 - 48, T + 10], [300 - 62, T + 30], 2.5, shade(H, 0.55)); } });
    line(g, [[300 - 22, top + 2], [300 - 30, T + 18]], 3, shade(H, 0.5)); // side parting
    for (const s of [-1, 1]) curve(g, [300 + s * (ch - 2), F.eyeY + 4], [300 + s * (ch + 1), F.eyeY + 24], [300 + s * (ch - 4), F.eyeY + 40], 7, H); // sideburns
  }
}
function braid(g, d) {
  const F = d.face, x0 = 300 - F.cheek + 8;
  for (let i = 0; i < 9; i++) ell(g, x0 - i * 3 + (i % 2) * 6 - 10, 256 + i * 31, 16 - i * 0.6, 19, d.hair, 4, (i % 2 ? 0.25 : -0.25));
  ell(g, x0 - 34, 548, 8, 22, d.tassel || "#d4142a", 3);
  for (let i = 0; i < 4; i++) dot(g, x0 + 8 - i * 2, 240 + i * 26, 6, "#fffdf4", 2);
}
function jewels(g, d) {
  if (d.mangalasutram) { g.beginPath(); g.moveTo(300 - 38, 266); g.quadraticCurveTo(300, 356, 300 + 38, 266); g.lineWidth = 4; g.setLineDash([3, 5]); g.strokeStyle = "#1a1210"; g.stroke(); g.setLineDash([]); dot(g, 300 - 6, 316, 7, "#e5b84a", 2.5); dot(g, 300 + 8, 316, 7, "#e5b84a", 2.5); }
  if (d.haram) { g.beginPath(); g.moveTo(300 - 46, 266); g.quadraticCurveTo(300, 380, 300 + 46, 266); g.lineWidth = 9; g.strokeStyle = "#e0b13a"; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke(); dot(g, 300, 336, 13, "#c8102e", 4); }
}

function head(g, d, ex, look) {
  const F = d.face;
  // neck: tapered, shadowed under the jaw
  const nw = d.neckW || 22;
  shp(g, (c) => { c.moveTo(300 - nw, F.chin - 40); c.quadraticCurveTo(300 - nw + 2, 250, 300 - nw - 10, 278); c.lineTo(300 + nw + 10, 278); c.quadraticCurveTo(300 + nw - 2, 250, 300 + nw, F.chin - 40); c.closePath(); }, d.skin,
    { inner: (c) => { c.fillStyle = shade(d.skin, 0.74); c.beginPath(); c.ellipse(300, F.chin - 6, F.jaw, 30, 0, 0, 7); c.fill(); } });
  if (d.neckLines) for (const k of [0, 1]) curve(g, [300 - nw + 6, F.chin + 6 + k * 10], [300, F.chin + 12 + k * 10], [300 + nw - 6, F.chin + 6 + k * 10], 2.5, shade(d.skin, 0.6));
  // ears + earrings
  const ex0 = F.cheek - 2, ey = F.eyeY + 10, er = d.earR || 20;
  for (const s of [-1, 1]) {
    ell(g, 300 + s * ex0, ey, 12, er, d.skin, LW, s * 0.15);
    curve(g, [300 + s * (ex0 + 3), ey - er * 0.5], [300 + s * (ex0 + 8), ey], [300 + s * (ex0 + 2), ey + er * 0.4], 2.5, shade(d.skin, 0.6));
    if (d.earring) { const bx = 300 + s * (ex0 + 2), by = ey + er; line(g, [[bx, by - 2], [bx, by + 8]], 3, d.earring); shp(g, (c) => { c.moveTo(bx, by + 6); c.lineTo(bx - 11, by + 26); c.quadraticCurveTo(bx, by + 32, bx + 11, by + 26); c.closePath(); }, d.earring, { lw: 3 }); }
  }
  shp(g, faceBuild(F), d.skin, { inner: (c) => {
    c.fillStyle = shade(d.skin, 0.84); c.fillRect(0, 0, 600, 320);
    ell(c, 290, F.cheekY - 12, F.cheek * 0.98, (F.chin - F.top) * 0.55, d.skin);
    if (d.female || ex === "happy") { c.globalAlpha = 0.26; ell(c, 300 - F.eyeX - 14, F.noseY + 6, 18, 10, "#e85a6a"); ell(c, 300 + F.eyeX + 14, F.noseY + 6, 18, 10, "#e85a6a"); c.globalAlpha = 1; }
    if (d.stubble) { c.globalAlpha = 0.15; c.beginPath(); c.moveTo(300 - F.jaw - 10, F.noseY + 6); c.quadraticCurveTo(300, F.noseY + 30, 300 + F.jaw + 10, F.noseY + 6); c.lineTo(600, 320); c.lineTo(0, 320); c.fill(); c.globalAlpha = 1; }
  } });
  if (d.wrinkles) for (const k of [0, 1, 2]) curve(g, [300 - 34 + k * 4, F.top + 26 + k * 10], [300, F.top + 20 + k * 10], [300 + 34 - k * 4, F.top + 26 + k * 10], 2.5, shade(d.skin, 0.62));
  if (d.folds) for (const s of [-1, 1]) curve(g, [300 + s * 22, F.noseY + 2], [300 + s * (d.mouthW + 10), F.noseY + 12], [300 + s * (d.mouthW + 8), F.mouthY - 4], 2.5, shade(d.skin, 0.66));
  if (d.doubleChin) curve(g, [300 - 30, F.chin - 12], [300, F.chin - 2], [300 + 30, F.chin - 12], 2.5, shade(d.skin, 0.6));
  nose(g, d);
  for (const s of [-1, 1]) eye(g, 300 + s * F.eyeX, F.eyeY, d, ex, s, look);
  brows(g, d, ex);
  if (d.glasses) for (const s of [-1, 1]) { g.beginPath(); g.ellipse(300 + s * F.eyeX, F.eyeY + 2, 27, 23, 0, 0, 7); g.lineWidth = 4.5; g.strokeStyle = "#5a3a1a"; g.stroke(); if (s > 0) curve(g, [300 - F.eyeX + 27, F.eyeY], [300, F.eyeY - 8], [300 + F.eyeX - 27, F.eyeY], 4, "#5a3a1a"); }
  if (d.moustache) {
    const my = F.mouthY - 10;
    for (const s of [-1, 1]) shp(g, (c) => { c.moveTo(300 + s * 2, my - 4); c.bezierCurveTo(300 + s * 20, my - 14, 300 + s * 36, my - 8, 300 + s * (d.bigMou ? 50 : 34), my + (d.bigMou ? 10 : 6)); c.bezierCurveTo(300 + s * 30, my + 4, 300 + s * 16, my + 6, 300 + s * 2, my + 4); c.closePath(); }, d.moustache, { lw: 3.5 });
  }
  mouth(g, d, ex);
  if (d.nosering) { g.beginPath(); g.arc(300 + 13, F.noseY + 2, 7, -0.6, 3.6); g.lineWidth = 3; g.strokeStyle = "#e5b84a"; g.stroke(); }
  if (d.bottu) dot(g, 300, F.eyeY - 40, d.bottu, "#c8102e");
  if (d.vibhuti) { for (const k of [0, 8, 16]) curve(g, [300 - 26, F.top + 30 + k], [300, F.top + 26 + k], [300 + 26, F.top + 30 + k], 4, "#f4efe6"); dot(g, 300, F.top + 38, 5, "#c8102e"); }
  if (ex === "sad") for (const s of [-1, 1]) { const tx = 300 + s * (F.eyeX + 6); shp(g, (c) => { c.moveTo(tx, F.eyeY + 14); c.quadraticCurveTo(tx + s * 10, F.eyeY + 40, tx + s * 4, F.eyeY + 62); c.quadraticCurveTo(tx - s * 4, F.eyeY + 40, tx, F.eyeY + 14); }, "#8fd0f0", { lw: 2.5, stroke: "#3a7aa8" }); }
  if (ex === "shock") shp(g, (c) => { c.moveTo(300 + F.temple + 6, F.top + 40); c.quadraticCurveTo(300 + F.temple + 18, F.top + 64, 300 + F.temple + 6, F.top + 70); c.quadraticCurveTo(300 + F.temple - 6, F.top + 64, 300 + F.temple + 6, F.top + 40); }, "#bfe6fa", { lw: 3, stroke: "#3a7aa8" });
  if (ex === "angry") for (const [a, b] of [[[300 + 58, F.top + 8], [300 + 72, F.top + 22]], [[300 + 76, F.top + 8], [300 + 62, F.top + 22]]]) line(g, [a, b], 6, "#d8202e");
}

// ------------------------------------------------------------------ main
export function drawHuman(g, d0, o = {}) {
  const ex = o.expr || "neutral";
  const d = { ...d0, _talk: o.talk || 0, _blink: !!o.blink };
  g.save();
  const s = d.scale || 1;
  g.translate(300, 975); g.scale(s, s); g.translate(-300, -975);
  const tiltHead = (fn) => { g.save(); const t = o.tilt ?? d.tilt ?? 0; g.translate(300, 262); g.rotate(t); g.translate(-300, -262); fn(); g.restore(); };
  tiltHead(() => hair(g, d, "back"));
  if (d.kind === "saree") saree(g, d); else if (d.kind === "pancha") pancha(g, d); else pants(g, d);
  if (d.kind === "saree") blouseTop(g, d); else if (d.kind === "pancha") kurtaTop(g, d); else shirtTop(g, d);
  jewels(g, d);
  tiltHead(() => { head(g, d, ex, o.look); hair(g, d, "front"); });
  if (d.braid) braid(g, d);
  const sleeve = d.kind === "saree" ? d.blouse : d.shirt, sl = d.sleeve ?? 0.45;
  arm(g, d, -1, o.armL || "down", sleeve, sl, o.propL);
  arm(g, d, 1, o.armR || "down", sleeve, sl, o.propR);
  g.restore();
}
