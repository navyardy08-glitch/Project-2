// 2D backgrounds for the Telugu family short, drawn on a 1080 x 1920 canvas in the same flat-colour + outline style as human.js.
const OL = "#3b2216";
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = (a) => `rgb(${a.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(",")})`;
const shade = (h, k = 0.8) => rgb(hex(h).map((v) => v * k));
const tint = (h, k = 0.3) => rgb(hex(h).map((v) => v + (255 - v) * k));
function box(g, x, y, w, h, fill, lw = 5, r = 0) {
  g.beginPath(); r ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h);
  g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); }
}
function poly(g, pts, fill, lw = 5) {
  g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = OL; g.lineJoin = "round"; g.stroke(); }
}
const ell = (g, x, y, rx, ry, fill, lw = 5) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OL; g.stroke(); } };
function grad(g, y0, y1, a, b) { const k = g.createLinearGradient(0, y0, 0, y1); k.addColorStop(0, a); k.addColorStop(1, b); return k; }

// ---------------------------------------------------------------- interior wall + floor shared by kitchen / hall
function room(g, wall, floor, t = 0) {
  g.fillStyle = grad(g, 0, 1300, tint(wall, 0.12), wall); g.fillRect(0, 0, 1080, 1320);
  g.fillStyle = shade(wall, 0.9); g.fillRect(0, 1240, 1080, 80);                         // dado band
  g.fillStyle = grad(g, 1320, 1920, floor, shade(floor, 0.82)); g.fillRect(0, 1320, 1080, 600);
  g.strokeStyle = shade(floor, 0.75); g.lineWidth = 3;
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(540 + i * 60, 1320); g.lineTo(540 + i * 260, 1920); g.stroke(); }
  for (const y of [1400, 1520, 1690]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); }
  g.lineWidth = 6; g.strokeStyle = OL; g.beginPath(); g.moveTo(0, 1320); g.lineTo(1080, 1320); g.stroke();
}

export function kitchen(g, s = {}) {
  room(g, "#f2d7a6", "#b9805a");
  // window with morning light
  box(g, 620, 260, 300, 330, "#bfe3f2", 7, 6);
  g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(640, 280, 120, 290);
  box(g, 765, 260, 10, 330, "#8a5a34", 0); box(g, 620, 420, 300, 10, "#8a5a34", 0);
  box(g, 600, 590, 340, 26, "#8a5a34", 5);
  // hanging tulasi pot outside? -> potted plant on the sill
  // steel utensil shelf
  box(g, 90, 300, 420, 22, "#7a4a2a", 5);
  for (let i = 0; i < 5; i++) ell(g, 140 + i * 80, 270, 32, 30, i % 2 ? "#cfd6dc" : "#b8c1c8", 4);
  box(g, 90, 470, 420, 22, "#7a4a2a", 5);
  for (let i = 0; i < 4; i++) box(g, 120 + i * 95, 380, 70, 90, ["#e9b03a", "#c8452f", "#e9b03a", "#3f8f5a"][i], 4, 10);   // spice jars
  // counter (granite) with stove, cooker, milk pot
  box(g, 0, 1000, 1080, 60, "#4a4a52", 6);
  box(g, 0, 1060, 1080, 260, "#a0683f", 6);
  for (let x = 40; x < 1080; x += 260) box(g, x, 1090, 220, 200, "#b67a4c", 4, 6);
  box(g, 360, 950, 380, 52, "#2d2d33", 5, 8);                                                    // 2-burner stove
  ell(g, 460, 950, 64, 12, "#1a1a1f", 4); ell(g, 640, 950, 64, 12, "#1a1a1f", 4);
  const flame = (x) => { if (!s.flame) return; g.fillStyle = "#3a8cff"; for (let k = -2; k <= 2; k++) ell(g, x + k * 22, 942, 7, 10, "#5aa0ff", 0); };
  flame(460); flame(640);
  // pressure cooker (left burner)
  box(g, 400, 790, 120, 150, "#c9d1d8", 6, 18); box(g, 390, 780, 140, 26, "#aab4bc", 5, 10);
  box(g, 445, 740, 30, 44, "#2a2a30", 5, 6); box(g, 520, 790, 110, 18, "#2a2a30", 5, 8);
  // milk pot (right burner)
  box(g, 585, 840, 110, 104, "#d8dde2", 6, 14);
  if (s.milkOver) { g.fillStyle = "#fffdf6"; g.beginPath(); g.moveTo(580, 850); g.bezierCurveTo(560, 880, 600, 900, 570, 960); g.lineTo(720, 960); g.bezierCurveTo(690, 900, 730, 880, 700, 850); g.closePath(); g.fill(); g.lineWidth = 4; g.strokeStyle = OL; g.stroke(); }
  // gas cylinder under counter
  box(g, 820, 1120, 120, 180, "#c8302a", 6, 30);
}

export function hall(g, s = {}) {
  room(g, "#d6e6c4", "#c49a6c");
  // framed photo + clock
  box(g, 140, 230, 230, 280, "#7a4a2a", 7, 6); box(g, 168, 258, 174, 224, "#efe1c4", 4);
  ell(g, 255, 340, 46, 56, "#c98a5e", 4); ell(g, 255, 330, 50, 40, "#2a2226", 0);
  box(g, 700, 220, 150, 150, "#f6f0e2", 6, 75);
  g.lineWidth = 6; g.strokeStyle = OL; g.beginPath(); g.moveTo(775, 295); g.lineTo(775, 250); g.moveTo(775, 295); g.lineTo(810, 310); g.stroke();
  // TV on a stand
  box(g, 600, 640, 380, 240, "#1d1f26", 8, 10); box(g, 620, 660, 340, 200, s.tv || "#3d5a80", 0);
  box(g, 620, 900, 340, 120, "#8a5a34", 6, 6);
  // sofa
  box(g, 40, 900, 520, 200, "#c8452f", 6, 30); box(g, 40, 1040, 520, 170, "#a8382a", 6, 20);
  box(g, 20, 980, 70, 230, "#a8382a", 6, 20); box(g, 510, 980, 70, 230, "#a8382a", 6, 20);
  ell(g, 140, 1010, 60, 40, "#f0cf6a", 4); ell(g, 460, 1010, 60, 40, "#f0cf6a", 4);              // cushions
  // mess for day 2
  if (s.mess) {
    for (const [x, y, r] of [[300, 1500, 0.3], [620, 1600, -0.5], [820, 1450, 0.8]]) { g.save(); g.translate(x, y); g.rotate(r); box(g, -70, -40, 140, 80, ["#f1ead8", "#6fa8dc", "#e8708e"][Math.abs(Math.round(r * 3)) % 3], 5, 12); g.restore(); }
    ell(g, 500, 1380, 50, 18, "#fdf2c0", 4); ell(g, 160, 1650, 34, 12, "#cfd6dc", 4);
  }
}

export function busStand(g, s = {}) {
  g.fillStyle = grad(g, 0, 1100, "#8ec9ee", "#e7f3f6"); g.fillRect(0, 0, 1080, 1100);
  // distant trees + hills
  for (let i = 0; i < 9; i++) ell(g, i * 140 - 20, 1000, 120, 90, i % 2 ? "#6fae66" : "#5d9c58", 0);
  // road + footpath
  g.fillStyle = "#6c6a70"; g.fillRect(0, 1060, 1080, 300);
  g.fillStyle = "#f2f2f2"; for (let x = 0; x < 1080; x += 160) g.fillRect(x + 20, 1200, 90, 14);
  g.fillStyle = grad(g, 1360, 1920, "#d9c39a", "#c2a878"); g.fillRect(0, 1360, 1080, 560);
  g.lineWidth = 6; g.strokeStyle = OL; g.beginPath(); g.moveTo(0, 1360); g.lineTo(1080, 1360); g.stroke();
  // shelter
  box(g, 560, 760, 22, 600, "#4a6a8a", 5); box(g, 1010, 760, 22, 600, "#4a6a8a", 5);
  poly(g, [[520, 770], [1080, 740], [1080, 700], [540, 720]], "#3f7fb5", 6);
  box(g, 600, 1180, 400, 30, "#8a5a34", 5); box(g, 620, 1210, 20, 150, "#4a3426", 0); box(g, 960, 1210, 20, 150, "#4a3426", 0);
  // sign board (Telugu)
  box(g, 600, 560, 380, 120, "#2f6e4a", 6, 10);
  g.fillStyle = "#fffbe6"; g.font = "bold 64px 'Noto Sans Telugu'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("బస్ స్టాప్", 790, 622);
  // bus (optional, slides via s.busX)
  if (s.busX !== undefined) {
    const x = s.busX;
    box(g, x, 820, 760, 360, "#d9532f", 7, 30); box(g, x, 1100, 760, 60, "#f0c540", 6, 8);
    for (let i = 0; i < 5; i++) box(g, x + 40 + i * 140, 870, 110, 120, "#bfe3f2", 5, 10);
    ell(g, x + 150, 1180, 60, 60, "#222", 6); ell(g, x + 610, 1180, 60, 60, "#222", 6);
    ell(g, x + 150, 1180, 24, 24, "#999", 4); ell(g, x + 610, 1180, 24, 24, "#999", 4);
  }
}

export function frontDoor(g, s = {}) {
  room(g, "#e6c9a0", "#a8744c");
  // door frame + door (s.open 0..1)
  box(g, 330, 300, 420, 1030, "#6a3e1e", 8);
  box(g, 360, 330, 360, 1000, "#f4e3b8", 0);                                                          // light outside
  const w = 360 * (1 - (s.open || 0) * 0.85);
  box(g, 360, 330, w, 1000, "#8a5a34", 6);
  if (w > 120) { box(g, 360 + w * 0.12, 380, w * 0.76, 400, "#9c6a40", 4, 6); box(g, 360 + w * 0.12, 840, w * 0.76, 420, "#9c6a40", 4, 6); ell(g, 360 + w - 40, 860, 14, 14, "#e0b13a", 4); }
  // thoranam (mango-leaf string) over the door
  for (let i = 0; i < 11; i++) poly(g, [[350 + i * 38, 300], [366 + i * 38, 370], [382 + i * 38, 300]], i % 2 ? "#3f8f5a" : "#5aa86a", 3);
  // rangoli on the floor
  for (let r = 3; r > 0; r--) ell(g, 540, 1600, 60 * r, 22 * r, ["#e8708e", "#f0c540", "#ffffff"][r - 1], 3);
}

export function tulasi(g, s = {}) {
  g.fillStyle = grad(g, 0, 1200, "#f6d7a0", "#f2e6c8"); g.fillRect(0, 0, 1080, 1250);
  g.fillStyle = grad(g, 1250, 1920, "#c9a06c", "#a8804e"); g.fillRect(0, 1250, 1080, 670);
  box(g, 0, 700, 1080, 560, "#e9dcc0", 6);                                                             // courtyard wall
  // tulasi kota
  box(g, 380, 1050, 320, 420, "#e8a22c", 7, 10); box(g, 350, 1010, 380, 60, "#c8452f", 6, 8);
  box(g, 470, 1180, 140, 140, "#c8452f", 5, 70);
  const wilt = s.wilt || 0, col = wilt > 0.5 ? "#8a8a3a" : "#3f8f5a";
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.28 + wilt * i * 0.12, len = 260 - Math.abs(i) * 30;
    const tipx = 540 + Math.cos(a) * len, tipy = 1010 + Math.sin(a) * len + wilt * 140;
    g.lineWidth = 8; g.strokeStyle = "#5a3a1a"; g.beginPath(); g.moveTo(540, 1010); g.quadraticCurveTo(540 + Math.cos(a) * len * 0.5, 1010 + Math.sin(a) * len * 0.5, tipx, tipy); g.stroke();
    for (let k = 0.35; k <= 1; k += 0.2) ell(g, lerp(540, tipx, k), lerp(1010, tipy, k), 24, 14, col, 3);
  }
}
const lerp = (a, b, t) => a + (b - a) * t;

export function bedroom(g, s = {}) {
  room(g, s.night ? "#b7c4e0" : "#f0d9e0", "#9a6a48");
  // window: sun or moon
  box(g, 600, 250, 320, 340, s.night ? "#1d2a4a" : "#bfe3f2", 7, 6);
  if (s.night) { ell(g, 820, 340, 42, 42, "#f4efd0", 3); for (const [x, y] of [[660, 300], [700, 470], [880, 520], [760, 280]]) ell(g, x, y, 4, 4, "#fff", 0); }
  else { g.fillStyle = "rgba(255,240,180,0.55)"; g.beginPath(); g.moveTo(600, 590); g.lineTo(920, 590); g.lineTo(1080, 1400); g.lineTo(420, 1400); g.closePath(); g.fill(); }
  box(g, 755, 250, 10, 340, "#8a5a34", 0); box(g, 600, 415, 320, 10, "#8a5a34", 0);
  // wall clock (hour hand at s.hour)
  box(g, 150, 230, 160, 160, "#f6f0e2", 6, 80);
  const hr = (s.hour ?? 9) / 12 * Math.PI * 2 - Math.PI / 2;
  g.lineWidth = 7; g.strokeStyle = OL; g.beginPath(); g.moveTo(230, 310); g.lineTo(230 + Math.cos(hr) * 40, 310 + Math.sin(hr) * 40); g.moveTo(230, 310); g.lineTo(230, 252); g.stroke();
  // cot with mattress and pillow
  box(g, 60, 1100, 960, 60, "#7a4a2a", 6, 8);
  box(g, 60, 900, 40, 420, "#6a3e1e", 6); box(g, 980, 980, 40, 340, "#6a3e1e", 6);
  box(g, 100, 1030, 880, 80, s.night ? "#c8d4ee" : "#f4f0e6", 6, 20);
  box(g, 120, 980, 200, 70, "#ffffff", 5, 30);
}
export function nightTint(g, k = 0.55) {
  g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = `rgba(70,90,160,${k})`; g.fillRect(0, 0, 1080, 1920); g.restore();
}
export function blanket(g, col = "#e8708e") {
  box(g, 300, 1000, 680, 110, col, 6, 30);
  g.strokeStyle = shade(col, 0.75); g.lineWidth = 3; for (let x = 360; x < 960; x += 70) { g.beginPath(); g.moveTo(x, 1010); g.lineTo(x - 20, 1100); g.stroke(); }
}

export const SETS = { kitchen, hall, busStand, frontDoor, tulasi, bedroom };
