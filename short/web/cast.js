
// ===================== stickman cast (appended to toonbase.js) =====================
// Flat hand-drawn stickmen: pure white wobbly head with a thick dark outline, black dot-pupil eyes, no nose,
// the outfit is the body (one flat colour blob), thin black stick arms + legs, black dot hands, no feet.
// Design space 600 x 1000 per body, soles at y = 975.

const BLK = "#14121c", PAPER = "#ffffff";
const LIMB = 8.6;

const SF = {
  neutral: { eye: "open", brow: [0, -1], mouth: "dash" },
  determined: { eye: "half", brow: [6, -3], mouth: "frown" },
  angry: { eye: "open", brow: [8, -4], mouth: "frown" },
  happy: { eye: "happy", brow: [-2, -2], mouth: "smileWide" },
  smile: { eye: "open", brow: [-1, -2], mouth: "smile" },
  grin: { eye: "open", brow: [-3, -3], mouth: "grin" },
  laugh: { eye: "squeeze", brow: [-4, -4], mouth: "laugh" },
  shock: { eye: "big", brow: [-8, -7], mouth: "O" },
  worried: { eye: "open", brow: [-6, 3], mouth: "wave" },
  sad: { eye: "half", brow: [-6, 4], mouth: "frown" },
  sly: { eye: "half", brow: [4, -3], mouth: "smirk" },
  soft: { eye: "happy", brow: [-3, 2], mouth: "smile" },
  sleep: { eye: "closed", brow: [1, 1], mouth: "o" },
  focus: { eye: "half", brow: [3, 0], mouth: "dash" },
  suspicious: { eye: "half", brow: [5, -5], mouth: "wave" },
  ooh: { eye: "big", brow: [-6, -6], mouth: "o" },
};

const sEye = (p, kind, x, y, u, look, lid, side) => {
  const k = lid >= 1 && kind !== "happy" && kind !== "squeeze" && kind !== "closed" ? "dash" : lid > 0 && (kind === "open" || kind === "big") ? "half" : kind;
  switch (k) {
    case "open": p.ell(x, y, 9 * u, 9.6 * u, PAPER, 2.7 * u); p.dot(x + look * 3.4 * u, y + 0.6 * u, 3.7 * u, BLK); break;
    case "big": p.ell(x, y, 11.5 * u, 12 * u, PAPER, 2.7 * u); p.dot(x + look * 3 * u, y + u, 3.1 * u, BLK); break;
    case "half": p.ell(x, y - u, 9 * u, 9 * u, PAPER, 2.7 * u, 0, 180); p.stroke([[x - 10.5 * u, y - u], [x + 10.5 * u, y - u]], 3.6 * u, BLK); p.dot(x + look * 3 * u, y + 2.8 * u, 3.3 * u, BLK); break;
    case "happy": p.arc(x, y + 3 * u, 8 * u, 6 * u, 200, 340, 3.9 * u, BLK); break;
    case "closed": p.arc(x, y - 3 * u, 8 * u, 5 * u, 20, 160, 3.6 * u, BLK); break;
    case "squeeze": p.stroke([[x + 6 * u * side, y - 5 * u], [x - 6 * u * side, y], [x + 6 * u * side, y + 5 * u]], 3.8 * u, BLK); break;
    default: p.stroke([[x - 8.5 * u, y], [x + 8.5 * u, y]], 3.9 * u, BLK);
  }
};

/** face on the head centre; turn -1..1 slides the features sideways (3/4 view), no nose ever */
const sFace = (p, cx, cy, u, expr, turn, look, lid, browUp = 0) => {
  const F = SF[expr] || SF.neutral, fx = cx + 20 * u * turn, sep = 14 * u * (1 - 0.22 * Math.abs(turn));
  for (const side of [-1, 1]) {
    const x = fx + side * sep;
    sEye(p, F.eye, x, cy - 2 * u, u, look, lid, side);
    const [dI, dO] = F.brow, by = cy - (F.eye === "big" ? 27 : 23) * u - browUp * u;
    if (F.eye === "big") p.arc(x, by + 2 * u, 9 * u, 3.4 * u, 200, 340, 4.2 * u, BLK);
    else taper(p, [x - side * 9 * u, by + dI * u], [x + side * 9 * u, by + dO * u], 5.4 * u, 3 * u, BLK);
  }
  mouth(p, F.mouth, fx + 2 * u * turn, cy + 21 * u, u, 1 - 0.2 * Math.abs(turn));
};

const stickHead = (seed, R) => ({
  a: R, b: R * (0.955 + 0.05 * (rnd(seed, 1) - 0.5)), nTop: 2, nBot: 2.06 + 0.1 * (rnd(seed, 3) - 0.5),
  egg: 0.04 * (rnd(seed, 4) - 0.5), asym: 0.03 * (rnd(seed, 6) < 0.5 ? -1 : 1), rot: rad(14 * (rnd(seed, 7) - 0.5)), noise: 0.017, seed,
});

/** part of the head contour kept by keep(x, y), scaled about the head centre and closed along the cut */
const crownArc = (hp, cx, hc, keep, sc = 1.05, dy = 0, sag = 0) => {
  const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
  const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y)).map(([x, y]) => [cx + (x - cx) * sc, hc + (y - hc) * sc + dy]);
  if (arc.length < 3) return arc;
  if (sag) { const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0]; for (let i = 1; i < 8; i++) arc.push([x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8 + sag * Math.sin((i / 8) * Math.PI)]); }
  return arc;
};

const headBehind = (p, o, H, cx, hc, R, u, turn) => {
  if (o.hood) {
    const bb = blobPts(cx - 10 * u * turn, hc - 0.04 * R, { ...H, a: R * 1.17, b: R * 1.2, nTop: 1.75, egg: -0.05, asym: 0, noise: 0.012, seed: H.seed + 3 });
    p.poly(bb, o.hood, 0); p.inkRing(bb, 4.4 * u, 1.2, 0.35);
  }
  if (o.hairLong) {
    const bb = blobPts(cx - 16 * u * turn, hc + 0.14 * R, { ...H, a: R * 1.1, b: R * 1.22, nTop: 2, egg: 0.12, asym: 0, noise: 0.014, seed: H.seed + 5 });
    p.poly(bb, o.hairLong, 0); p.inkRing(bb, 4 * u, 1.2, 0.35);
  }
  if (o.bun) { const bx = cx - 30 * u * turn, by = hc - R * 1.08; p.ell(bx, by, 0.34 * R, 0.3 * R, o.bun, 4 * u); }
};

const maskOn = (p, o, hp, cx, hc, R, u, turn) => {
  if (o.mask) {
    p.clip(hp, () => p.band([[cx - 1.3 * R, hc - 2 * u], [cx + 1.3 * R, hc - 3 * u]], o.mask, 29 * u, 0));
    const s = turn > 0.3 ? -1 : 1, kx = cx + s * R * 0.98, ky = hc - 3 * u;
    p.poly([[kx, ky - 6 * u], [kx + s * 26 * u, ky - 16 * u], [kx + s * 20 * u, ky + 2 * u]], o.mask, 2.4 * u);
    p.poly([[kx, ky + 4 * u], [kx + s * 24 * u, ky + 18 * u], [kx + s * 10 * u, ky + 16 * u]], o.mask, 2.4 * u);
  }
};

const headFront = (p, o, hp, H, cx, hc, R, u, turn, seed, capT = 0) => {
  const crown = hc - R;
  if (o.hairLong || o.bun || o.hair) {
    const col = o.hairLong || o.bun || o.hair, cut = hc - 0.42 * R;
    const arc = crownArc(hp, cx, hc, (x, y) => y < cut + 0.3 * R * Math.max(0, -(x - cx) * (turn || 0.0001) / R), 1.03, 0, o.hair ? -5 * u : 7 * u);
    if (arc.length > 2) p.poly(arc, col, 4 * u);
    if (o.tuft) p.stroke([[cx + 6 * u, crown + 2 * u], [cx + 14 * u, crown - 16 * u], [cx + 26 * u, crown - 10 * u]], 5 * u, col);
  }
  if (o.hood) {
    const cut = hc - 0.7 * R, arc = crownArc(hp, cx, hc, (x, y) => y < cut, 1.06, -2 * u, 5 * u);
    if (arc.length > 2) p.poly(arc, o.hood, 4.2 * u);
  }
  if (o.hat === "helmet") {
    const col = o.hatCol || "#d9a93a", cut = hc - 0.3 * R, arc = crownArc(hp, cx, hc, (x, y) => y < cut, 1.09, -3 * u);
    if (arc.length > 2) p.poly(arc, col, 4.4 * u);
    p.band([[cx - 1.22 * R, cut + 2 * u], [cx + 1.22 * R, cut + 2 * u]], shade(col, 0.8), 9 * u, 2.2 * u, "round");
    p.stroke([[cx + 8 * u * turn, crown - 6 * u], [cx + 8 * u * turn, crown - 26 * u]], 7 * u, INK);
    p.dot(cx + 8 * u * turn, crown - 30 * u, 8 * u, INK); p.dot(cx + 8 * u * turn, crown - 30 * u, 5.4 * u, col);
  } else if (o.hat === "nightcap") {
    const col = o.hatCol || "#e9e4f2", cut = hc - 0.42 * R, arc = crownArc(hp, cx, hc, (x, y) => y < cut, 1.06, -2 * u);
    const s = turn < -0.3 ? -1 : 1, sw = 10 * u * Math.sin(capT);
    const tip = [cx + s * (1.25 * R + sw), hc - 0.2 * R + 4 * u * Math.cos(capT)];
    p.poly([[cx - s * 0.3 * R, crown + 2 * u], [cx + s * 0.5 * R, crown - 0.32 * R], [cx + s * 1.05 * R, crown + 0.05 * R], tip, [cx + s * 0.75 * R, crown + 0.42 * R], [cx + s * 0.4 * R, crown + 0.2 * R]], col, 4 * u);
    if (arc.length > 2) p.poly(arc, col, 4.2 * u);
    p.band([[cx - 0.98 * R, cut], [cx + 0.98 * R, cut]], shade(col, 0.86), 10 * u, 2.2 * u, "round");
    p.ell(tip[0], tip[1] + 6 * u, 10 * u, 10 * u, PAPER, 3.4 * u);
  } else if (o.hat === "tophat") {
    const col = o.hatCol || "#2e2a36", yb = crown + 0.2 * R, ht = 0.95 * R, tx = cx + 6 * u * turn;
    p.poly([[tx - 0.6 * R, yb], [tx - 0.66 * R, yb - ht], [tx + 0.66 * R, yb - ht], [tx + 0.6 * R, yb]], col, 4.2 * u);
    p.band([[tx - 0.6 * R, yb - 0.18 * R], [tx + 0.6 * R, yb - 0.18 * R]], o.hatBand || "#c9a23a", 0.16 * R, 0);
    p.band([[tx - 0.98 * R, yb + 2 * u], [tx + 0.98 * R, yb + 2 * u]], col, 9 * u, 2.4 * u, "round");
  } else if (o.hat === "toque") {
    const yb = crown + 0.26 * R, tx = cx + 4 * u * turn;
    const puff = blobPts(tx, yb - 0.62 * R, { a: 0.86 * R, b: 0.5 * R, nTop: 2, nBot: 2.4, egg: -0.2, asym: 0, rot: 0, noise: 0.05, seed: seed + 21 });
    p.poly(puff, PAPER, 4.2 * u);
    p.poly([[tx - 0.62 * R, yb - 0.34 * R], [tx + 0.62 * R, yb - 0.34 * R], [tx + 0.66 * R, yb + 2 * u], [tx - 0.66 * R, yb + 2 * u]], "#f4f1ea", 4.2 * u);
  } else if (o.hat === "cap") {
    const col = o.hatCol || "#c8452f", cut = hc - 0.5 * R, arc = crownArc(hp, cx, hc, (x, y) => y < cut, 1.06, -2 * u, 4 * u);
    if (arc.length > 2) p.poly(arc, col, 4.2 * u);
    const s = turn < -0.3 ? -1 : 1;
    p.poly([[cx + s * 0.5 * R, cut - 4 * u], [cx + s * 1.32 * R, cut + 4 * u], [cx + s * 0.6 * R, cut + 8 * u]], shade(col, 0.8), 3.6 * u);
  } else if (o.hat === "scarf") {
    const col = o.hatCol || "#d9573c", cut = hc - 0.4 * R, arc = crownArc(hp, cx, hc, (x, y) => y < cut, 1.07, -1 * u, 8 * u);
    if (arc.length > 2) p.poly(arc, col, 4.2 * u);
    p.poly([[cx - 0.96 * R, cut], [cx - 1.26 * R, cut + 0.5 * R], [cx - 0.86 * R, cut + 0.36 * R]], col, 3.4 * u);
  }
};

/** the outfit body: one flat blob. shapes: oval (tunic), bell (dress / cloak), rect (coat / suit) */
const torsoPts = (o, cx, top, bot, side, seed) => {
  const sh = o.shape || "oval", w = (o.w ?? 1) * (side ? 0.82 : 1);
  const B = sh === "bell" ? { a: 84 * w, nTop: 2.2, nBot: 3.4, egg: 0.36 } : sh === "rect" ? { a: 80 * w, nTop: 3.2, nBot: 4.4, egg: 0.05 } : { a: 76 * w, nTop: 2.3, nBot: 2.7, egg: 0.16 };
  return blobPts(cx, (top + bot) / 2, { ...B, b: (bot - top) / 2, asym: 0, rot: 0, noise: 0.013, seed: seed + 7 });
};
const edgeAt = (pts, y, side, cx) => {
  let best = null, bd = 1e9;
  for (const q of pts) { if ((q[0] - cx) * side <= 0) continue; const d = Math.abs(q[1] - y); if (d < bd) { bd = d; best = q; } }
  return best || [cx, y];
};
const torsoDetail = (p, o, tp, cx, top, bot, side) => {
  const h = bot - top;
  p.clip(tp, () => {
    if (o.apron) p.poly(rrect(cx - (side ? 20 : 46), top + 0.34 * h, cx + (side ? 70 : 46), bot + 30, 14), o.apron, 3);
    if (o.sash) p.band([[cx - 130, top + 0.72 * h], [cx + 130, top + 0.1 * h]], o.sash, 26, 2.6);
    if (o.belt) p.band([[cx - 150, top + 0.6 * h], [cx + 150, top + 0.6 * h]], o.belt, 17, 2.6);
    if (o.hem) p.band([[cx - 170, bot - 16], [cx + 170, bot - 16]], o.hem, 20, 2.4);
    if (o.lapel && !side) { p.poly([[cx - 4, top + 0.1 * h], [cx - 44, top + 0.06 * h], [cx - 6, top + 0.46 * h]], o.lapel, 2.6); p.poly([[cx + 4, top + 0.1 * h], [cx + 44, top + 0.06 * h], [cx + 6, top + 0.46 * h]], o.lapel, 2.6); }
    if (o.buttons) for (let i = 0; i < 3; i++) p.dot(cx + (side ? 34 : 0), top + (0.5 + 0.13 * i) * h, 5.4, o.buttons);
  });
};
const torsoOver = (p, o, cx, top, bot, side) => {
  const h = bot - top;
  if (o.chain && !side) {
    p.arc(cx, top + 0.1 * h, 50, 0.3 * h, 12, 168, 7.5, INK); p.arc(cx, top + 0.1 * h, 50, 0.3 * h, 12, 168, 4, o.chain);
    p.ell(cx, top + 0.42 * h, 15, 15, o.chain, 3.4);
  }
  if (o.chain && side) p.ell(cx + 46, top + 0.4 * h, 12, 14, o.chain, 3.2);
  if (o.badge) p.ell(cx + (side ? 40 : 30), top + 0.3 * h, 11, 12, o.badge, 3);
  if (o.satchel) { const sx = cx + (side ? -20 : -56), sy = top + 0.78 * h; p.stroke([[cx + (side ? 30 : 46), top + 0.12 * h], [sx, sy - 16]], 6, o.satchel); p.poly(rrect(sx - 26, sy - 18, sx + 26, sy + 24, 8), o.satchel, 3.4); p.dot(sx, sy - 2, 4.4, "#e9c15a"); }
};

// ---------------- props (drawn with the body) ----------------
const chairDraw = (p, cx, base, s, broken = false, col = "#b9793f") => {
  const w = 62 * s, seat = base - 78 * s, top = base - 190 * s, d = shade(col, 0.72);
  p.band([[cx - w, seat], [cx - w, top]], col, 13 * s, 3 * s, "round"); p.band([[cx + w, seat], [cx + w, top]], col, 13 * s, 3 * s, "round");
  p.poly(rrect(cx - w - 8 * s, top - 6 * s, cx + w + 8 * s, top + 34 * s, 9 * s), col, 3.6 * s);
  for (const k of [-0.45, 0, 0.45]) p.band([[cx + k * w, top + 34 * s], [cx + k * w, seat - 4 * s]], d, 8 * s, 2.4 * s);
  p.band([[cx - w + 6 * s, base], [cx - w + 2 * s, seat]], d, 12 * s, 3 * s, "round");
  if (broken) { p.band([[cx + w - 2 * s, seat + 4 * s], [cx + w + 18 * s, seat + 40 * s]], d, 12 * s, 3 * s, "round"); p.stroke([[cx + w + 14 * s, seat + 34 * s], [cx + w + 30 * s, seat + 26 * s]], 3 * s, INK); }
  else p.band([[cx + w - 6 * s, base], [cx + w - 2 * s, seat]], d, 12 * s, 3 * s, "round");
  p.poly(rrect(cx - w - 12 * s, seat - 12 * s, cx + w + 12 * s, seat + 12 * s, 8 * s), col, 3.6 * s);
  p.stroke([[cx - w + 4 * s, seat - 2 * s], [cx + w - 10 * s, seat - 3 * s]], 2.6 * s, d);
};
const flameDraw = (p, x, y, s, t) => {
  const w = Math.sin(t * 6.283), w2 = Math.sin(t * 6.283 * 2 + 1);
  p.poly([[x - 16 * s, y], [x - 20 * s - 3 * s * w2, y - 26 * s], [x - 6 * s + 5 * s * w, y - 58 * s - 6 * s * w2], [x + 3 * s + 7 * s * w, y - 34 * s], [x + 15 * s + 3 * s * w2, y - 46 * s], [x + 19 * s, y - 16 * s], [x + 14 * s, y]], "#f39a2c", 3.2 * s);
  p.poly([[x - 8 * s, y - 2 * s], [x - 9 * s, y - 18 * s], [x + 1 * s + 3 * s * w, y - 34 * s], [x + 9 * s, y - 14 * s], [x + 7 * s, y - 2 * s]], "#ffe37a", 0);
};
const lanternDraw = (p, hx, hy, s, t) => {
  p.arc(hx, hy + 16 * s, 16 * s, 16 * s, 180, 360, 3.4 * s, INK);
  p.poly(rrect(hx - 22 * s, hy + 16 * s, hx + 22 * s, hy + 74 * s, 6 * s), "#ffd66b", 3.6 * s);
  p.poly(rrect(hx - 26 * s, hy + 10 * s, hx + 26 * s, hy + 22 * s, 4 * s), "#4a4652", 3 * s); p.poly(rrect(hx - 26 * s, hy + 70 * s, hx + 26 * s, hy + 82 * s, 4 * s), "#4a4652", 3 * s);
  flameDraw(p, hx, hy + 66 * s, 0.42 * s, t);
};
const torchDraw = (p, hx, hy, s, t, ang = -78) => {
  const a = rad(ang), e = [hx + Math.cos(a) * 110 * s, hy + Math.sin(a) * 110 * s], b = [hx - Math.cos(a) * 30 * s, hy - Math.sin(a) * 30 * s];
  p.band([b, e], "#8a5a34", 11 * s, 3 * s, "round");
  p.ell(e[0], e[1], 16 * s, 13 * s, "#4a3a30", 3 * s);
  flameDraw(p, e[0], e[1] - 4 * s, 1.15 * s, t);
};
const malletDraw = (p, hx, hy, s, ang) => {
  const a = rad(ang), e = [hx + Math.cos(a) * 74 * s, hy + Math.sin(a) * 74 * s], b = [hx - Math.cos(a) * 16 * s, hy - Math.sin(a) * 16 * s];
  p.band([b, e], "#8a5a34", 9 * s, 2.6 * s, "round");
  const c = Math.cos(a), sn = Math.sin(a), Rr = (dx, dy) => [e[0] + dx * c - dy * sn, e[1] + dx * sn + dy * c];
  p.poly([Rr(-14 * s, -30 * s), Rr(14 * s, -30 * s), Rr(14 * s, 30 * s), Rr(-14 * s, 30 * s)], "#8f96a0", 3.2 * s);
};
const boxDraw = (p, cx, cy, s, open = 0) => { // music box: little chest, lid opens 0..1, tiny crank
  p.poly(rrect(cx - 46 * s, cy - 22 * s, cx + 46 * s, cy + 30 * s, 6 * s), "#c9543e", 3.6 * s);
  p.band([[cx - 46 * s, cy + 4 * s], [cx + 46 * s, cy + 4 * s]], "#e9c15a", 7 * s, 1.6 * s);
  const a = rad(-70 * open), lx = cx - 46 * s, ly = cy - 22 * s, e = [lx + Math.cos(a) * 92 * s, ly + Math.sin(a) * 92 * s];
  p.band([[lx, ly - 5 * s], [e[0], e[1] - 5 * s]], "#a8402e", 13 * s, 3.2 * s, "round");
  p.stroke([[cx + 46 * s, cy + 12 * s], [cx + 64 * s, cy + 12 * s], [cx + 64 * s, cy - 4 * s]], 4 * s, INK); p.dot(cx + 64 * s, cy - 6 * s, 6 * s, "#e9c15a");
};
const propAt = (p, prop, hand, t, s = 1, side = false) => {
  const [hx, hy] = hand;
  if (prop === "lantern") lanternDraw(p, hx, hy, s, t);
  else if (prop === "torch") torchDraw(p, hx, hy, s, t, side ? -62 : -80);
  else if (prop === "mallet") malletDraw(p, hx, hy, s, side ? -50 + 80 * t : -110 + 70 * t);
  else if (prop === "candle") { p.band([[hx, hy + 10 * s], [hx, hy - 34 * s]], "#f4efdc", 13 * s, 3 * s); flameDraw(p, hx, hy - 36 * s, 0.5 * s, t); p.ell(hx, hy + 14 * s, 24 * s, 7 * s, "#c9a23a", 3 * s); }
};
const hand = (p, q) => p.dot(q[0], q[1], 10.5, BLK);

// ---------------- front view ----------------
/** opts: expr, look, blink, turn (-1..1 three-quarter), seed, tilt, headTilt, bob, armL/armR (pose names), wave (0..1),
 *  prop (in the right hand) + propT, step (-1..1 foot lift for walking on the spot), mode stand | sit | crouch */
export const stickFront = (p, o, opts) => {
  const { expr = "neutral", look = 0, blink = 0, turn = 0, seed = 1, tilt = 0, headTilt = 0, bob = 0, armL = "hang", armR = "hang",
    wave = 0, prop = null, propT = 0, step = 0, mode = "stand", capT = 0, chairBroken = false, boxOpen = 0 } = opts;
  const kid = o.build === "kid", stout = o.build === "stout", R = kid ? 98 : 110, u = R / 50;
  const legL = kid ? 175 : stout ? 250 : 270, torsoH = kid ? 195 : stout ? 262 : 250, sole = 975;
  const crouch = mode === "crouch" ? 70 : 0;
  const hipY = (mode === "sit" ? sole - 70 : sole - legL + crouch) + bob;
  const long = o.long ?? (o.shape === "bell" ? 78 : o.shape === "rect" ? 30 : 0);
  const neckY = hipY - torsoH, top = neckY - 12, bot = hipY + long;
  const hc = neckY - 0.78 * R, crown = hc - R, cx = 300;
  p.rot = null;
  // legs: black sticks, no feet
  for (const side of [-1, 1]) {
    const lift = Math.max(0, step * side) * 34, h = [cx + side * 22, hipY - 6], f = [cx + side * (mode === "sit" ? 60 : 30), sole - lift];
    if (mode === "sit") p.stroke([h, [cx + side * 86, hipY + 14], f], LIMB, BLK);
    else if (crouch || lift) p.stroke([h, [cx + side * (40 + crouch * 0.3 + lift * 0.4), (hipY + sole - lift) / 2], f], LIMB, BLK);
    else p.stroke([h, f], LIMB, BLK);
  }
  // upper body
  p.rot = tilt ? [rad(tilt), cx, hipY] : null;
  const tp = torsoPts(o, cx, top, bot, false, seed);
  const sh = (side) => { const e = edgeAt(tp, top + 0.2 * (bot - top), side, cx); return [e[0] - side * 8, e[1]]; };
  const pose = (name, side) => {
    const S = sh(side), X = (k) => S[0] + side * k, y = S[1];
    switch (name) {
      case "hip": return { pts: [S, [X(86), y + 70], [X(22), y + 138]], front: true };
      case "belly": return { pts: [S, [X(58), y + 96], [cx + side * 22, y + 118]], front: true };
      case "point": return { pts: [S, [X(70), y - 4], [X(150), y - 40]] };
      case "up": return { pts: [S, [X(56), y - 76], [X(74), y - 176]] };
      case "wave": return { pts: [S, [X(62), y - 62], [X(84 + 44 * Math.sin(wave * 6.283)), y - 168]] };
      case "cheek": return { pts: [S, [X(64), y + 30], [cx + side * R * 0.9, hc + 0.42 * R]], late: true };
      case "temple": return { pts: [S, [X(78), y - 14], [cx + side * (R + 4), hc - 0.24 * R]], late: true };
      case "hold": return { pts: [S, [X(44), y + 74], [X(100), y + 24]] };
      case "torch": return { pts: [S, [X(52), y - 6], [X(84), y - 84]] };
      case "carry": return { pts: [S, [X(52), y - 96], [cx + side * 92, crown - 22]], late: true };
      case "present": return { pts: [S, [X(46), y + 92], [cx + side * 44, y + 72]], front: true };
      case "chin": return { pts: [S, [X(54), y + 88], [cx + side * 26, hc + R + 2]], late: true };
      case "behind": return { pts: [S, [X(30), y + 84], [X(-14), y + 146]] };
      case "shrug": return { pts: [S, [X(74), y + 40], [X(118), y - 26]] };
      case "work": return { pts: [S, [X(36), y + 84], [cx + side * (40 - 16 * Math.sin(wave * 6.283)), y + 60 + 14 * Math.cos(wave * 6.283)]], front: true };
      case "knee": return { pts: [S, [X(40), y + 90], [X(52), hipY + 6]], front: true };
      default: return { pts: [S, [X(24), y + 104], [X(30), y + 206]] };
    }
  };
  const arms = [pose(armL, -1), pose(armR, 1)];
  const drawArm = (a) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), LIMB, BLK); hand(p, a.pts[2]); };
  for (const a of arms) if (!a.front && !a.late) drawArm(a);
  if (prop && !arms[1].front && !arms[1].late && prop !== "chair" && prop !== "box") propAt(p, prop, arms[1].pts[2], propT);
  p.poly(tp, o.col, 0);
  torsoDetail(p, o, tp, cx, top, bot, false);
  p.inkRing(tp, 9, 1.1, 0.38);
  torsoOver(p, o, cx, top, bot, false);
  if (prop === "box") boxDraw(p, cx, sh(1)[1] + 66, 1, boxOpen);
  for (const a of arms) if (a.front) drawArm(a);
  if (prop && arms[1].front && prop !== "chair" && prop !== "box") propAt(p, prop, arms[1].pts[2], propT);
  // head
  const Ah = tilt + headTilt, [cpx, cpy] = rotAbout([cx, neckY], rad(tilt), [cx, hipY]);
  p.rot = Ah ? [rad(Ah), cx, neckY, cpx - cx, cpy - neckY] : null;
  const H = stickHead(seed, R);
  headBehind(p, o, H, cx, hc, R, u, turn);
  const hp = blobPts(cx, hc, H);
  p.poly(hp, PAPER, 0);
  p.inkRing(hp, 4.6 * u, 1.1 + 2 * rnd(seed, 9), 0.42);
  maskOn(p, o, hp, cx, hc, R, u, turn);
  sFace(p, cx, hc + 4 * u, u, expr, turn, look, lidOf(blink), o.mask ? 3 : 0);
  headFront(p, o, hp, H, cx, hc, R, u, turn, seed, capT);
  if (o.moustache) for (const s of [-1, 1]) taper(p, [cx + 20 * u * turn + s * 2 * u, hc + 16 * u], [cx + 20 * u * turn + s * 20 * u, hc + 20 * u], 6 * u, 2 * u, o.moustache);
  p.rot = tilt ? [rad(tilt), cx, hipY] : null;
  if (prop === "chair") chairDraw(p, cx, crown - 6, 1.15, chairBroken);
  for (const a of arms) if (a.late) drawArm(a);
  p.rot = null;
};

// ---------------- side view (facing screen-right, three-quarter face) ----------------
/** modes: walk, run, sneak (tiptoe, crouched), stand. arm: null (swing) | hold | carry | reach | work. */
export const stickSide = (p, o, opts) => {
  const { phase = 0, expr = "neutral", mode = "walk", blink = 0, stride = 1, seed = 1, lean0 = 0, look = 0.6, prop = null, propT = 0,
    arm = null, capT = 0, chairBroken = false, wave = 0, headTilt = 0 } = opts;
  const kid = o.build === "kid", stout = o.build === "stout", R = kid ? 98 : 110, u = R / 50, two = Math.PI * 2;
  const legL = kid ? 175 : stout ? 250 : 270, torsoH = kid ? 195 : stout ? 262 : 250, sole = 975, ankY = sole - 3, cx = 300;
  const legLen = legL + 6, l1 = legLen * 0.52, l2 = legLen * 0.52;
  const legs = [];
  let hipY = ankY - legLen * 0.985, lean = lean0, nearFwd = 0;
  if (mode === "stand") legs.push({ ank: [cx - 14, ankY] }, { ank: [cx + 14, ankY] });
  else {
    const K = mode === "run" ? 1.5 : mode === "sneak" ? 0.72 : 1, S = 0.95 * legLen * stride * K, liftH = mode === "run" ? 52 : mode === "sneak" ? 58 : 28;
    const st = (ph) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5;
      return { x: -S / 2 + S * s - (S / Math.PI) * 0.6 * Math.sin(two * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (mode === "sneak" ? 0.9 : 0.985) * (1 - 0.03 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    legs.push({ ank: [cx + fL.x, ankY - fL.h] }, { ank: [cx + nL.x, ankY - nL.h] });
    lean += (mode === "run" ? 13 : mode === "sneak" ? 11 : 3) + 2 * Math.cos(2 * two * phase);
    nearFwd = nL.x / (S / 2);
  }
  const long = o.long ?? (o.shape === "bell" ? 78 : o.shape === "rect" ? 30 : 0);
  const neckY = hipY - torsoH, top = neckY - 12, bot = hipY + long, hip = [cx, hipY - 4];
  p.rot = null;
  for (const L of legs) { const kn = ik(hip, L.ank, l1, l2); p.stroke([hip, kn, L.ank], LIMB, BLK); }
  p.rot = lean ? [rad(lean), cx, hipY] : null;
  const tcx = cx + 2, tp = torsoPts(o, tcx, top, bot, true, seed);
  const S = [tcx + 6, top + 0.22 * (bot - top)], aLen = 205;
  const swingArm = (ang) => {
    const e = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(22) * (ang >= 0 ? 1 : 0.3);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const amp = mode === "run" ? 46 : mode === "sneak" ? 12 : 28;
  let near = swingArm(rad(-amp) * nearFwd), far = mode === "stand" ? null : swingArm(rad(amp) * nearFwd);
  if (arm === "hold") near = [S, [S[0] + 40, S[1] + 72], [S[0] + 104, S[1] + 28]];
  else if (arm === "torch") near = [S, [S[0] + 50, S[1] + 10], [S[0] + 92, S[1] - 64]];
  else if (arm === "carry") { near = [S, [S[0] + 60, S[1] + 50], [S[0] + 118, S[1] - 8]]; far = [S, [S[0] + 48, S[1] + 36], [S[0] + 104, S[1] - 30]]; }
  else if (arm === "reach") { near = [S, [S[0] + 70, S[1] - 20], [S[0] + 150, S[1] - 50]]; }
  else if (arm === "sneak") { near = [S, [S[0] + 30, S[1] + 70], [S[0] + 84, S[1] + 40 + 10 * Math.sin(phase * two)]]; far = [S, [S[0] + 24, S[1] + 60], [S[0] + 70, S[1] + 22 - 10 * Math.sin(phase * two)]]; }
  else if (arm === "work") { const w = Math.sin(wave * two); near = [S, [S[0] + 36, S[1] + 70], [S[0] + 96, S[1] + 44 - 26 * w]]; far = [S, [S[0] + 30, S[1] + 84], [S[0] + 80, S[1] + 86]]; }
  else if (arm === "point") near = [S, [S[0] + 76, S[1] - 6], [S[0] + 156, S[1] - 34]];
  // cape trailing behind (thief)
  if (o.cape) {
    const sw = 14 * Math.sin(phase * two * 2 + 1) + (mode === "run" ? 40 : mode === "stand" ? 0 : 16);
    p.poly([[tcx - 8, top + 22], [tcx - 70, top + 60], [tcx - 96 - sw, bot - 20], [tcx - 60 - sw * 0.6, bot + 26], [tcx - 26, bot - 6]], o.cape, 8);
  }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), LIMB, BLK); hand(p, far[2]); }
  p.poly(tp, o.col, 0);
  torsoDetail(p, o, tp, tcx, top, bot, true);
  p.inkRing(tp, 9, 1.1, 0.38);
  torsoOver(p, o, tcx, top, bot, true);
  if (prop === "chair") chairDraw(p, S[0] + 150, S[1] + 70, 1.0, chairBroken);
  p.stroke(curve(near[0], near[1], near[2]), LIMB, BLK); hand(p, near[2]);
  if (prop && prop !== "chair") propAt(p, prop, near[2], propT, 1, true);
  // head
  const hx = cx + 10, hc = neckY - 0.78 * R;
  if (headTilt) { const [qx, qy] = rotAbout([hx, neckY], rad(lean), [cx, hipY]); p.rot = [rad(lean + headTilt), hx, neckY, qx - hx, qy - neckY]; }
  const H = stickHead(seed, R);
  headBehind(p, o, H, hx, hc, R, u, 0.8);
  const hp = blobPts(hx, hc, H);
  p.poly(hp, PAPER, 0);
  p.inkRing(hp, 4.6 * u, 1.1 + 2 * rnd(seed, 9), 0.42);
  maskOn(p, o, hp, hx, hc, R, u, 0.85);
  sFace(p, hx, hc + 4 * u, u, expr, 0.85, look, lidOf(blink), o.mask ? 3 : 0);
  headFront(p, o, hp, H, hx, hc, R, u, 0.85, seed, capT);
  if (o.moustache) for (const s of [-1, 1]) taper(p, [hx + 17 * u + s * 2 * u, hc + 16 * u], [hx + 17 * u + s * 17 * u, hc + 20 * u], 6 * u, 2 * u, o.moustache);
  p.rot = null;
};

// ---------------- prop / effect cards ----------------
/** chair on a 400 x 500 canvas */
export const fxChair = (p, broken) => chairDraw(p, 200, 470, 2.0, broken);
/** wall clock on a 400 x 500 canvas: t = pendulum phase, hands from `hour`; stopped = cracked + still */
export const fxClock = (p, t, hour = 0, broken = false) => {
  p.poly([[70, 150], [200, 30], [330, 150]], "#8a4a2c", 9);
  p.poly(rrect(84, 140, 316, 470, 16), "#b9693a", 9);
  p.ell(200, 235, 86, 86, "#f6efd9", 8);
  for (let i = 0; i < 12; i++) { const a = rad(i * 30); p.stroke([[200 + Math.cos(a) * 68, 235 + Math.sin(a) * 68], [200 + Math.cos(a) * 78, 235 + Math.sin(a) * 78]], i % 3 ? 4 : 7, INK); }
  const ha = rad(hour * 30 - 90), ma = rad(hour * 360 - 90);
  p.stroke([[200, 235], [200 + Math.cos(ha) * 40, 235 + Math.sin(ha) * 40]], 10, INK);
  p.stroke([[200, 235], [200 + Math.cos(ma) * 62, 235 + Math.sin(ma) * 62]], 6, INK);
  p.dot(200, 235, 9, "#c9373a");
  p.poly(rrect(150, 340, 250, 452, 10), "#5d3220", 6);
  const sw = broken ? 0.5 : Math.sin(t * 6.283) * 0.42, bx = 200 + Math.sin(sw) * 80, by = 350 + Math.cos(sw) * 80;
  p.clip(rrect(150, 340, 250, 452, 10), () => { p.stroke([[200, 345], [bx, by]], 5, "#e9c15a"); p.ell(bx, by, 17, 17, "#e9c15a", 4); });
  if (broken) { p.stroke([[150, 190], [190, 225], [176, 250], [214, 282]], 5, INK); p.stroke([[190, 225], [226, 214]], 4, INK); }
};
/** kettle on a 400 x 400 canvas; dent = broken (dented, spout drooping) */
export const fxKettle = (p, broken = false, wob = 0) => {
  const col = "#4f8fb3";
  p.rot = wob ? [rad(wob), 200, 360] : null;
  p.arc(200, 150, 78, 74, 180, 360, 16, INK); p.arc(200, 150, 78, 74, 180, 360, 8, "#3a3642");
  const sp = broken ? [[300, 250], [352, 262], [366, 300]] : [[300, 250], [350, 214], [374, 170]];
  p.line(sp, col, 22);
  const body = blobPts(200, 262, { a: 122, b: 98, nTop: 2.6, nBot: 3.2, egg: 0.14, asym: 0, rot: 0, noise: broken ? 0.03 : 0.008, seed: 4 });
  p.poly(body, col, 9);
  p.clip(body, () => { p.band([[60, 300], [340, 300]], shade(col, 0.8), 26, 0); if (broken) p.ell(150, 240, 30, 22, shade(col, 0.66), 0); });
  p.ell(200, 168, 44, 13, shade(col, 0.82), 7); p.ell(200, 150, 13, 12, "#e9c15a", 6);
  if (broken) p.stroke([[136, 222], [158, 240], [146, 258]], 5, INK);
  p.rot = null;
};
/** music box on a 400 x 400 canvas, lid open 0..1 */
export const fxBox = (p, open = 0) => boxDraw(p, 200, 280, 2.6, open);
/** flame on a 200 x 260 canvas */
export const fxFlame = (p, t) => flameDraw(p, 100, 250, 3.6, t);
/** candle on a 200 x 400 canvas */
export const fxCandle = (p, t) => { p.band([[100, 380], [100, 190]], "#f4efdc", 46, 6); p.ell(100, 384, 70, 14, "#c9a23a", 6); p.stroke([[100, 190], [100, 168]], 5, INK); flameDraw(p, 100, 176, 1.9, t); };
/** soft warm glow on 256 x 256 (additive) */
export const fxGlow = (p) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,236,180,1)"); gr.addColorStop(0.25, "rgba(255,196,104,0.7)"); gr.addColorStop(1, "rgba(255,150,50,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};
/** steam / chimney smoke column on a 300 x 600 canvas, t phase */
export const fxSmoke = (p, t) => {
  for (let i = 0; i < 5; i++) {
    const s = ((t + i / 5) % 1), y = 560 - s * 520, x = 150 + Math.sin(s * 5 + i) * 30 * s, r = 26 + 60 * s;
    p.ell(x, y, r, r * 0.85, `rgba(236,232,240,${(0.8 * (1 - s)).toFixed(3)})`, 0);
  }
};
/** Zzz on a 300 x 300 canvas */
export const fxZzz = (p, t) => {
  for (let i = 0; i < 3; i++) { const s = ((t + i / 3) % 1), x = 60 + s * 150 + 14 * Math.sin(s * 9), y = 250 - s * 200, k = 16 + 26 * s; p.g.globalAlpha = 1 - s * 0.9; p.stroke([[x, y], [x + k, y], [x, y + k], [x + k, y + k]], 7, INK); }
  p.g.globalAlpha = 1;
};
/** flying bird (V stroke) on a 200 x 100 canvas, flap 0..1 */
export const fxBird = (p, flap) => { const y = 50 + 18 * Math.sin(flap * Math.PI * 2); p.stroke([[20, y], [70, 52], [100, 64], [130, 52], [180, y]], 9, "#2a2230"); };
/** door bolt + boards "X" on a 400 x 400 canvas, t = 0..1 slam-in */
export const fxBoards = (p, t = 1) => {
  const k = Math.min(1, t * 2), k2 = Math.max(0, Math.min(1, t * 2 - 1));
  if (k > 0) p.band([[40, 60 + 0], [40 + 320 * k, 60 + 280 * k]], "#b9793f", 44, 7);
  if (k2 > 0) p.band([[360, 60], [360 - 320 * k2, 60 + 280 * k2]], "#a86a34", 44, 7);
  if (t >= 1) for (const [x, y] of [[70, 86], [330, 312], [330, 86], [70, 312]]) p.dot(x, y, 9, INK);
};
/** small mended-sparkle on 200 x 200 */
export const fxSpark = (p, t) => {
  const s = Math.sin(Math.min(1, t) * Math.PI), r = 20 + 70 * s;
  p.poly([[100, 100 - r], [100 + r * 0.22, 100 - r * 0.22], [100 + r, 100], [100 + r * 0.22, 100 + r * 0.22], [100, 100 + r], [100 - r * 0.22, 100 + r * 0.22], [100 - r, 100], [100 - r * 0.22, 100 - r * 0.22]], "#fff3b0", 5);
};
