// Full-figure 2D cartoon humans for Telugu family-drama shorts (original designs).
// Drawn on a 600 x 1000 design card: centre x = 300, soles at y = 975 (same card contract as the stickman cast).
// drawHuman(g, def, opts)  def = outfit/character definition, opts = { expr, armL, armR, look }

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

// ------------------------------------------------------------------ arms
const POSE = {
  down: [[120, 455], [124, 600]],
  hip: [[178, 420], [96, 505]],
  point: [[176, 330], [250, 262]],
  cheek: [[150, 420], [74, 212]],
  fold: [[118, 438], [14, 372]],
  up: [[160, 200], [150, 80]],
};
function arm(g, d, side, pose, sleeveCol, sleeveLen) {
  const x0 = 300, sx = side * (d.stout ? 112 : 98);
  const S = [x0 + sx, 300];
  const [e, h] = POSE[pose] || POSE.down;
  const E = [x0 + side * e[0] * (d.stout ? 1.06 : 1), e[1]], H = [x0 + side * h[0], h[1]];
  const skin = d.skin, w = d.stout ? 38 : 32;
  // outline pass, then fill pass
  line(g, [S, E, H], w + 2 * LW, OL); line(g, [S, E, H], w, skin);
  // bangles near the wrist
  if (d.bangles) {
    for (const t of [0.72, 0.8]) {
      const p = P(E, H, t), ang = Math.atan2(H[1] - E[1], H[0] - E[0]) + Math.PI / 2;
      const dx = Math.cos(ang) * (w / 2 + 2), dy = Math.sin(ang) * (w / 2 + 2);
      line(g, [[p[0] - dx, p[1] - dy], [p[0] + dx, p[1] + dy]], 7, d.bangles, "butt");
    }
  }
  // sleeve
  if (sleeveLen > 0) {
    const tip = sleeveLen <= 1 ? P(S, E, sleeveLen) : P(E, H, sleeveLen - 1);
    const pts = sleeveLen <= 1 ? [S, tip] : [S, E, tip];
    line(g, pts, w + 14 + 2 * LW, OL); line(g, pts, w + 14, sleeveCol);
    if (d.sleeveBorder) { const a = sleeveLen <= 1 ? S : E; const p = P(a, tip, 0.86); line(g, [p, tip], w + 14, d.sleeveBorder, "butt"); }
  }
  // hand
  const ang = Math.atan2(H[1] - E[1], H[0] - E[0]);
  ell(g, H[0] + Math.cos(ang) * 8, H[1] + Math.sin(ang) * 8, 21, 19, skin, LW, ang);
  if (pose === "point") {
    const f = [H[0] + Math.cos(ang) * 50, H[1] + Math.sin(ang) * 50];
    line(g, [[H[0] + Math.cos(ang) * 14, H[1] + Math.sin(ang) * 14], f], 12 + 2 * LW, OL); line(g, [[H[0] + Math.cos(ang) * 14, H[1] + Math.sin(ang) * 14], f], 12, skin);
  } else {
    const t = ang - side * 1.2; // thumb
    line(g, [[H[0] + Math.cos(t) * 10, H[1] + Math.sin(t) * 10], [H[0] + Math.cos(t) * 24, H[1] + Math.sin(t) * 24]], 3.5, OL);
  }
}

// ------------------------------------------------------------------ lower bodies
function saree(g, d) {
  const w0 = d.stout ? 100 : 86, w1 = d.stout ? 140 : 126;
  const build = (c) => { c.moveTo(300 - w0, 410); c.bezierCurveTo(300 - w0 - 30, 600, 300 - w1, 820, 300 - w1, 952); c.quadraticCurveTo(300, 962, 300 + w1, 952); c.bezierCurveTo(300 + w1, 820, 300 + w0 + 30, 600, 300 + w0, 410); c.closePath(); };
  shp(g, build, d.saree, { inner: (c) => {
    c.fillStyle = shade(d.saree, 0.82); c.fillRect(300 + 40, 400, 200, 600);       // cel shade on one side
    c.fillStyle = tint(d.saree, 0.12); c.beginPath(); c.moveTo(300 - 8, 440); c.lineTo(300 + 50, 440); c.lineTo(300 + 78, 960); c.lineTo(300 - 30, 960); c.fill(); // front pleats panel
    for (let i = 0; i < 5; i++) line(c, [[300 - 4 + i * 13, 445], [300 - 26 + i * 25, 955]], 3, shade(d.saree, 0.7));
    if (d.motif) for (let y = 520; y < 900; y += 70) for (let x = 300 - 120; x < 300 + 130; x += 62) dot(c, x + ((y / 70) % 2) * 31, y, 6, d.motif);
    c.fillStyle = d.border; c.fillRect(0, 912, 600, 60);                            // zari border at the hem
    c.fillStyle = shade(d.border, 0.75); c.fillRect(0, 912, 600, 6);
    for (let x = 140; x < 470; x += 22) dot(c, x, 940, 5, shade(d.border, 0.72));
  } });
  // feet + sandals
  for (const s of [-1, 1]) { ell(g, 300 + s * 44, 966, 30, 12, d.skin, LW); line(g, [[300 + s * 44 - 18, 962], [300 + s * 44 + 18, 962]], 6, "#7a4a24"); }
}
function pants(g, d) {
  for (const s of [-1, 1]) {
    shp(g, (c) => { c.moveTo(300 + s * 2, 528); c.lineTo(300 + s * 100, 528); c.lineTo(300 + s * 86, 948); c.lineTo(300 + s * 16, 948); c.closePath(); }, d.pant,
      { inner: (c) => { c.fillStyle = shade(d.pant, 0.8); c.fillRect(s > 0 ? 300 + 50 : 300 - 40, 520, 40, 440); } });
    ell(g, 300 + s * 56, 958, 46, 17, "#2a1d16", LW);
  }
  line(g, [[300 - 100, 532], [300 + 100, 532]], 14, "#4a3426", "butt");
  dot(g, 300, 532, 8, "#c9a24a", 3);
}
function pancha(g, d) {
  const build = (c) => { c.moveTo(300 - 108, 560); c.lineTo(300 - 120, 952); c.quadraticCurveTo(300, 960, 300 + 120, 952); c.lineTo(300 + 108, 560); c.closePath(); };
  shp(g, build, d.pancha, { inner: (c) => {
    c.fillStyle = shade(d.pancha, 0.86); c.fillRect(300 + 45, 540, 200, 450);
    line(c, [[300 + 14, 560], [300 + 30, 952]], 4, shade(d.pancha, 0.7));
    c.fillStyle = d.border; c.fillRect(0, 922, 600, 30); c.fillRect(300 + 18, 560, 16, 380);
  } });
  for (const s of [-1, 1]) { ell(g, 300 + s * 46, 964, 32, 12, d.skin, LW); line(g, [[300 + s * 46 - 18, 960], [300 + s * 46 + 18, 960]], 6, "#6a3e1e"); }
}

// ------------------------------------------------------------------ torsos
function torsoBuild(d, hem) {
  const k = d.stout ? 1.14 : 1;
  return (c) => {
    c.moveTo(300 - 58, 262); c.quadraticCurveTo(300 - 112 * k, 266, 300 - 114 * k, 318);
    c.lineTo(300 - (hem > 450 ? 108 : 92) * k, hem); c.quadraticCurveTo(300, hem + (d.belly ? 22 : 8), 300 + (hem > 450 ? 108 : 92) * k, hem);
    c.lineTo(300 + 114 * k, 318); c.quadraticCurveTo(300 + 112 * k, 266, 300 + 58, 262); c.closePath();
  };
}
function blouseTop(g, d) {
  shp(g, torsoBuild(d, 418), d.blouse, { inner: (c) => { c.fillStyle = shade(d.blouse, 0.8); c.fillRect(300 + 55, 250, 120, 200); } });
  // pallu: drape from the left hip over the right shoulder, with zari edges
  const band = (c) => { c.moveTo(300 - 100, 452); c.lineTo(300 - 44, 470); c.lineTo(300 + 124, 316); c.lineTo(300 + 108, 262); c.lineTo(300 + 70, 262); c.closePath(); };
  shp(g, band, d.saree, { inner: (c) => {
    c.fillStyle = shade(d.saree, 0.85); c.beginPath(); c.moveTo(300 - 44, 470); c.lineTo(300 + 124, 316); c.lineTo(300 + 124, 380); c.lineTo(300 - 20, 480); c.fill();
    if (d.motif) for (const t of [0.3, 0.55, 0.8]) dot(c, lerp(300 - 70, 300 + 100, t), lerp(455, 290, t), 6, d.motif);
    line(c, [[300 - 100, 452], [300 + 70, 262]], 16, d.border); line(c, [[300 - 44, 470], [300 + 124, 316]], 12, d.border);
  } });
}
function shirtTop(g, d) {
  shp(g, torsoBuild(d, 540), d.shirt, { inner: (c) => {
    c.fillStyle = shade(d.shirt, 0.82); c.fillRect(300 + 60, 250, 120, 320);
    if (d.check) { c.globalAlpha = 0.18; for (let x = 160; x < 450; x += 28) line(c, [[x, 250], [x, 560]], 5, d.check); for (let y = 270; y < 560; y += 28) line(c, [[150, y], [450, y]], 5, d.check); c.globalAlpha = 1; }
  } });
  line(g, [[300, 290], [300, 535]], 3, shade(d.shirt, 0.6));
  for (let y = 320; y < 530; y += 50) dot(g, 300 + 8, y, 5, tint(d.shirt, 0.6), 2);
  // collar
  for (const s of [-1, 1]) shp(g, (c) => { c.moveTo(300, 290); c.lineTo(300 + s * 52, 258); c.lineTo(300 + s * 62, 292); c.closePath(); }, tint(d.shirt, 0.25), { lw: 4 });
  if (d.pocket) shp(g, (c) => c.rect(300 - 82, 340, 40, 44), null, { lw: 3, stroke: shade(d.shirt, 0.6) });
}
function kurtaTop(g, d) {
  shp(g, torsoBuild(d, 610), d.shirt, { inner: (c) => { c.fillStyle = shade(d.shirt, 0.86); c.fillRect(300 + 60, 250, 140, 380); } });
  line(g, [[300, 268], [300, 380]], 3, shade(d.shirt, 0.6));
  for (let y = 292; y < 380; y += 30) dot(g, 300 + 7, y, 4.5, "#c9a24a", 2);
  // kanduva (shoulder towel) over the left shoulder
  if (d.kanduva) {
    const b = (c) => { c.moveTo(300 + 46, 262); c.lineTo(300 + 108, 270); c.lineTo(300 + 150, 600); c.lineTo(300 + 100, 606); c.closePath(); };
    shp(g, b, d.kanduva, { inner: (c) => { for (let y = 300; y < 620; y += 36) line(c, [[300 + 40, y], [300 + 170, y + 6]], 8, tint(d.kanduva, 0.7)); c.fillStyle = shade(d.kanduva, 0.8); c.fillRect(300 + 128, 250, 60, 400); } });
  }
}

// ------------------------------------------------------------------ head
const EYE = { x: 32, y: 160 };
function eye(g, cx, cy, d, ex, side) {
  const big = d.female ? 1.12 : 1;
  const wide = ex === "shock" ? 1.25 : 1;
  const rx = 21 * big, ry = 15 * big * wide;
  if (ex === "happy") { // closed happy arcs
    curve(g, [cx - rx, cy + 4], [cx, cy - 20], [cx + rx, cy + 4], 6.5, OL);
    if (d.female) line(g, [[cx + side * rx, cy + 2], [cx + side * (rx + 9), cy - 6]], 4, OL);
    return;
  }
  const almond = (c) => { c.moveTo(cx - rx, cy); c.quadraticCurveTo(cx, cy - ry * 1.6, cx + rx, cy); c.quadraticCurveTo(cx, cy + ry * 1.25, cx - rx, cy); };
  const lookX = ex === "sly" ? 8 * side * 0 + 9 : ex === "sad" ? 0 : 0, lookY = ex === "sad" ? 5 : 0;
  shp(g, almond, "#ffffff", { stroke: null, inner: (c) => {
    const ir = ex === "shock" ? 9 : 12.5 * big;
    dot(c, cx + lookX, cy + 1 + lookY, ir, d.iris || "#4a2a18");
    dot(c, cx + lookX, cy + 1 + lookY, ir * 0.5, "#140c08");
    dot(c, cx + lookX + 4, cy - 3 + lookY, 3.6, "#ffffff");
    // lids for mood
    c.fillStyle = d.skin;
    if (ex === "angry") { c.beginPath(); c.moveTo(cx - rx - 4, cy - 26); c.lineTo(cx + rx + 4, cy - 26); c.lineTo(cx + side * -rx, cy - 3); c.lineTo(cx + side * rx, cy - 12); c.closePath(); c.fill(); }
    if (ex === "sly") { c.fillRect(cx - rx - 4, cy - 30, 2 * rx + 8, 25); }
    if (ex === "sad") { c.beginPath(); c.moveTo(cx - rx - 4, cy - 30); c.lineTo(cx + rx + 4, cy - 30); c.lineTo(cx - side * rx, cy - 6); c.lineTo(cx + side * rx, cy - 13); c.closePath(); c.fill(); }
  } });
  g.beginPath(); g.moveTo(cx - rx, cy); g.quadraticCurveTo(cx, cy - ry * 1.6, cx + rx, cy); g.lineWidth = 6; g.strokeStyle = OL; g.lineCap = "round"; g.stroke();
  g.beginPath(); g.moveTo(cx - rx + 3, cy + 2); g.quadraticCurveTo(cx, cy + ry * 1.2, cx + rx - 3, cy + 2); g.lineWidth = 2.5; g.stroke();
  if (ex === "sly") line(g, [[cx - rx, cy - 5], [cx + rx, cy - 5]], 5, OL);
  if (d.female) { line(g, [[cx + side * rx, cy - 1], [cx + side * (rx + 10), cy - 9]], 4, OL); line(g, [[cx + side * (rx - 6), cy - 8], [cx + side * (rx + 4), cy - 17]], 3.5, OL); }
  if (d.glasses) { g.beginPath(); g.arc(cx, cy + 2, 27, 0, 7); g.lineWidth = 4.5; g.strokeStyle = "#5a3a1a"; g.stroke(); }
}
function brows(g, d, ex) {
  const col = d.browCol || "#22160f", w = d.female ? 6 : 8.5;
  for (const s of [-1, 1]) {
    const cx = 300 + s * EYE.x, by = EYE.y - 34;
    let inner = [cx - s * 20, by], outer = [cx + s * 20, by], mid = [cx, by - 8];
    if (ex === "angry") { inner = [cx - s * 20, by + 10]; outer = [cx + s * 22, by - 8]; mid = [cx, by - 2]; }
    if (ex === "sad") { inner = [cx - s * 20, by - 8]; outer = [cx + s * 20, by + 6]; mid = [cx, by - 4]; }
    if (ex === "shock") { inner = [cx - s * 18, by - 12]; outer = [cx + s * 20, by - 10]; mid = [cx, by - 24]; }
    if (ex === "sly") { const up = s > 0; inner = [cx - s * 20, up ? by - 10 : by + 6]; outer = [cx + s * 20, up ? by - 6 : by + 2]; mid = [cx, up ? by - 22 : by + 1]; }
    if (ex === "happy") { mid = [cx, by - 14]; }
    curve(g, inner, mid, outer, w, col);
  }
}
function mouth(g, d, ex) {
  const y = 212;
  if (ex === "happy") {
    shp(g, (c) => { c.moveTo(300 - 30, y - 6); c.quadraticCurveTo(300, y - 2, 300 + 30, y - 6); c.quadraticCurveTo(300 + 26, y + 34, 300, y + 34); c.quadraticCurveTo(300 - 26, y + 34, 300 - 30, y - 6); }, "#7a1e22",
      { lw: 4.5, inner: (c) => { c.fillStyle = "#fff"; c.fillRect(300 - 34, y - 12, 68, 13); ell(c, 300, y + 32, 16, 10, "#e0707a"); } });
  } else if (ex === "angry") {
    shp(g, (c) => { c.moveTo(300 - 28, y + 10); c.quadraticCurveTo(300, y - 8, 300 + 28, y + 10); c.quadraticCurveTo(300, y + 20, 300 - 28, y + 10); }, "#ffffff", { lw: 4.5, inner: (c) => line(c, [[270, y + 6], [330, y + 6]], 2.5, "#9a8a80") });
  } else if (ex === "sad") {
    g.beginPath(); g.moveTo(300 - 22, y + 12); g.quadraticCurveTo(300 - 10, y - 2, 300, y + 4); g.quadraticCurveTo(300 + 10, y - 2, 300 + 22, y + 12); g.lineWidth = 5; g.strokeStyle = OL; g.stroke();
  } else if (ex === "shock") {
    ell(g, 300, y + 8, 15, 22, "#5a1418", 4.5); ell(g, 300, y + 22, 9, 6, "#d8606a");
  } else if (ex === "sly") {
    curve(g, [300 - 22, y + 4], [300 + 6, y + 12], [300 + 26, y - 6], 5, OL);
  } else {
    curve(g, [300 - 20, y], [300, y + 12], [300 + 20, y], 5, OL);
  }
  if (d.lips && ex !== "happy" && ex !== "shock") curve(g, [300 - 12, y + 9], [300, y + 13], [300 + 12, y + 9], 3, d.lips);
}
function faceBuild(c) { c.moveTo(300, 64); c.bezierCurveTo(354, 64, 384, 106, 384, 158); c.bezierCurveTo(384, 214, 342, 254, 300, 254); c.bezierCurveTo(258, 254, 216, 214, 216, 158); c.bezierCurveTo(216, 106, 246, 64, 300, 64); }

function head(g, d, ex) {
  // neck
  shp(g, (c) => c.rect(300 - 24, 222, 48, 58), d.skin, { inner: (c) => { c.fillStyle = shade(d.skin, 0.78); c.fillRect(0, 222, 600, 26); } });
  // ears + earrings
  for (const s of [-1, 1]) {
    ell(g, 300 + s * 84, 166, 13, 22, d.skin, LW);
    if (d.earring) { line(g, [[300 + s * 86, 186], [300 + s * 86, 196]], 3, d.earring); shp(g, (c) => { c.moveTo(300 + s * 86, 194); c.lineTo(300 + s * 86 - 11, 214); c.quadraticCurveTo(300 + s * 86, 220, 300 + s * 86 + 11, 214); c.closePath(); }, d.earring, { lw: 3 }); }
  }
  shp(g, faceBuild, d.skin, { inner: (c) => {
    c.fillStyle = shade(d.skin, 0.84); c.fillRect(0, 0, 600, 300);
    ell(c, 290, 150, 86, 104, d.skin);
    if (d.female || ex === "happy") { c.globalAlpha = 0.28; ell(c, 300 - 50, 198, 18, 10, "#e85a6a"); ell(c, 300 + 50, 198, 18, 10, "#e85a6a"); c.globalAlpha = 1; }
    if (d.stubble) { c.globalAlpha = 0.16; ell(c, 300, 238, 70, 34, "#2a1a10"); c.globalAlpha = 1; }
  } });
  // nose
  curve(g, [300 - 2, 176], [292, 196], [306, 197], 4, shade(d.skin, 0.55));
  for (const s of [-1, 1]) eye(g, 300 + s * EYE.x, EYE.y, d, ex, s);
  brows(g, d, ex);
  if (d.moustache) {
    for (const s of [-1, 1]) shp(g, (c) => { c.moveTo(300, 204); c.quadraticCurveTo(300 + s * 26, 192, 300 + s * (d.bigMou ? 50 : 38), 210); c.quadraticCurveTo(300 + s * 24, 204, 300, 210); c.closePath(); }, d.moustache, { lw: 3.5 });
  }
  mouth(g, d, ex);
  if (d.nosering) { g.beginPath(); g.arc(300 + 12, 196, 7, -0.6, 3.6); g.lineWidth = 3; g.strokeStyle = "#e5b84a"; g.stroke(); }
  if (d.bottu) dot(g, 300, 122, d.bottu, "#c8102e");
  if (d.vibhuti) { line(g, [[278, 110], [322, 110]], 4, "#f4efe6"); line(g, [[278, 118], [322, 118]], 4, "#f4efe6"); dot(g, 300, 114, 5, "#c8102e"); }
  // mood marks
  if (ex === "sad") for (const s of [-1, 1]) { shp(g, (c) => { c.moveTo(300 + s * 40, 176); c.quadraticCurveTo(300 + s * 50, 200, 300 + s * 44, 222); c.quadraticCurveTo(300 + s * 36, 200, 300 + s * 40, 176); }, "#8fd0f0", { lw: 2.5, stroke: "#3a7aa8" }); }
  if (ex === "shock") shp(g, (c) => { c.moveTo(300 + 92, 96); c.quadraticCurveTo(300 + 104, 120, 300 + 92, 126); c.quadraticCurveTo(300 + 80, 120, 300 + 92, 96); }, "#bfe6fa", { lw: 3, stroke: "#3a7aa8" });
  if (ex === "angry") for (const [a, b] of [[[300 + 62, 70], [300 + 76, 84]], [[300 + 80, 70], [300 + 66, 84]]]) line(g, [a, b], 6, "#d8202e");
}

function hair(g, d, layer) {
  const H = d.hair, hl = tint(H, 0.18);
  if (layer === "back") {
    if (d.bun) { ell(g, 300, 58, 46, 36, H, LW); for (let a = -2.6; a <= -0.5; a += 0.32) dot(g, 300 + Math.cos(a) * 50, 60 + Math.sin(a) * 38, 7, "#fffdf4", 2); }
    if (d.longHair) shp(g, (c) => { c.moveTo(214, 150); c.bezierCurveTo(196, 280, 214, 380, 252, 400); c.lineTo(348, 400); c.bezierCurveTo(386, 380, 404, 280, 386, 150); c.closePath(); }, H);
    return;
  }
  if (d.bald) {
    for (const s of [-1, 1]) shp(g, (c) => { c.moveTo(300 + s * 82, 182); c.quadraticCurveTo(300 + s * 96, 140, 300 + s * 70, 104); c.quadraticCurveTo(300 + s * 86, 138, 300 + s * 70, 150); c.quadraticCurveTo(300 + s * 84, 160, 300 + s * 82, 182); }, H, { lw: 3.5 });
    ell(g, 300 - 24, 86, 18, 8, "rgba(255,255,255,0.35)", 0, -0.4);
    return;
  }
  if (d.female) {
    shp(g, (c) => { c.moveTo(212, 176); c.bezierCurveTo(200, 70, 258, 40, 300, 42); c.bezierCurveTo(342, 40, 400, 70, 388, 176); c.bezierCurveTo(380, 120, 346, 92, 300, 90); c.bezierCurveTo(254, 92, 220, 120, 212, 176); }, H,
      { inner: (c) => { line(c, [[300 + 40, 52], [300 + 82, 118]], 9, hl); if (d.grey) { line(c, [[300 - 30, 52], [300 - 70, 110]], 6, "#cfcac4"); line(c, [[300 + 22, 50], [300 + 50, 74]], 5, "#cfcac4"); } } });
    line(g, [[300, 46], [300, 90]], 4, d.sindoor ? "#d4142a" : shade(H, 0.5));
  } else {
    shp(g, (c) => { c.moveTo(214, 166); c.bezierCurveTo(204, 70, 262, 36, 306, 40); c.bezierCurveTo(358, 42, 396, 78, 386, 166); c.bezierCurveTo(380, 120, 362, 104, 340, 100); c.quadraticCurveTo(320, 112, 296, 98); c.quadraticCurveTo(270, 112, 246, 106); c.quadraticCurveTo(222, 124, 214, 166); }, H,
      { inner: (c) => line(c, [[300 + 20, 52], [300 + 70, 82]], 9, hl) });
  }
}
function braid(g, d) {
  // braid over the left shoulder (screen left), jasmine on top
  const pts = []; for (let i = 0; i < 9; i++) pts.push([236 - i * 3 + (i % 2) * 6, 250 + i * 32]);
  for (const [x, y] of pts) ell(g, x, y, 17, 20, d.hair, 4);
  ell(g, 230, 548, 9, 22, d.tassel || "#d4142a", 3);
  for (let i = 0; i < 4; i++) dot(g, 252 - i * 2, 236 + i * 26, 6, "#fffdf4", 2);
}
function jewels(g, d) {
  if (d.mangalasutram) { g.beginPath(); g.moveTo(300 - 40, 266); g.quadraticCurveTo(300, 352, 300 + 40, 266); g.lineWidth = 4; g.setLineDash([3, 5]); g.strokeStyle = "#1a1210"; g.stroke(); g.setLineDash([]); dot(g, 300 - 6, 314, 7, "#e5b84a", 2.5); dot(g, 300 + 8, 314, 7, "#e5b84a", 2.5); }
  if (d.haram) { g.beginPath(); g.moveTo(300 - 48, 266); g.quadraticCurveTo(300, 380, 300 + 48, 266); g.lineWidth = 9; g.strokeStyle = "#e0b13a"; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = OL; g.stroke(); dot(g, 300, 336, 13, "#c8102e", 4); }
}

// ------------------------------------------------------------------ main
export function drawHuman(g, d, o = {}) {
  const ex = o.expr || "neutral";
  hair(g, d, "back");
  if (d.kind === "saree") saree(g, d); else if (d.kind === "pancha") pancha(g, d); else pants(g, d);
  const behindR = (o.armR || "down") === "down" || o.armR === "hip", behindL = (o.armL || "down") === "down" || o.armL === "hip";
  if (d.kind === "saree") blouseTop(g, d); else if (d.kind === "pancha") kurtaTop(g, d); else shirtTop(g, d);
  jewels(g, d);
  head(g, d, ex);
  hair(g, d, "front");
  if (d.braid) braid(g, d);
  const sleeve = d.kind === "saree" ? d.blouse : d.shirt, sl = d.sleeve ?? 0.45;
  arm(g, d, -1, o.armL || "down", sleeve, sl);
  arm(g, d, 1, o.armR || "down", sleeve, sl);
}
