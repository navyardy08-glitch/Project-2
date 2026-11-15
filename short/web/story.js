// Staging for "The Thief Who Returned Everything": every value is a pure function of the frame number.
import { clamp, lin, smooth, smoother, easeOut, easeIn, easeInOut, back, spring, lerp, lerp3, add3, kick, blinkAt, idle, q } from "./motion.js";
import * as C from "./castdefs.js";

export const FPS = 30, TOTAL = 2521;
const NAME = new Map(Object.entries(C).map(([k, v]) => [v, k]));

// ---------------- world layout ----------------
// Main street runs along z. West row (side -1) faces +x, east row faces -x.
export const HOUSES = [];
{
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const side of [-1, 1]) for (let i = 0; i < 15; i++) {
    const z = -49 + i * 7;
    const h = { side, x: side * 8.2, z, w: 5.5 + r() * 0.9, d: 7, h: 5.2 + r() * 2.2, col: (r() * 4) | 0, lean: (r() - 0.5) * 0.09, rise: 2.2 + r() * 0.9, dx: 1.3, wx: -1.4, chim: r() < 0.75 ? (r() < 0.5 ? -1 : 1) : 0, name: "" };
    if (side < 0 && z === 0) Object.assign(h, { name: "mayor", w: 6.4, h: 6.8, col: 3, lean: 0.02, chim: 1 });
    if (side < 0 && z === 14) Object.assign(h, { name: "shop", h: 5.8, col: 1, lean: -0.025, chim: -1 });
    if (side < 0 && z === -14) Object.assign(h, { name: "door", col: 0, lean: 0.03, h: 5.6 });
    if (side < 0) { h.h = 6.4; h.rise = 2.6; }
    HOUSES.push(h);
  }
}
const HN = (n) => HOUSES.find((h) => h.name === n);
const doorZ = (h) => h.z - h.dx, winZ = (h) => h.z - h.wx, FX = -4.7; // west front face x
const WROW = HOUSES.filter((h) => h.side < 0).sort((a, b) => a.z - b.z);
/** roof-ridge height of the west row at z (little hop arcs over the gaps) */
const ridgeY = (z) => {
  for (let i = 0; i < WROW.length; i++) {
    const a = WROW[i], hw = a.w / 2 + 0.15;
    if (Math.abs(z - a.z) <= hw) return a.h + a.rise + 0.02;
    const b = WROW[i + 1];
    if (b && z > a.z + hw && z < b.z - (b.w / 2 + 0.15)) { const t = (z - a.z - hw) / (b.z - (b.w / 2 + 0.15) - a.z - hw); return lerp(a.h + a.rise, b.h + b.rise, t) + 0.9 * Math.sin(t * Math.PI); }
  }
  return 8;
};
export const ROOM = [300, 0];
export const TABLE = [297.6, -1.3];
export const CUP = [302.9, -2.5];
export const PODIUM = [-2.3, 0.4];
const RX = ROOM[0];
const WINX = RX - 0.1;

// ---------------- light presets ----------------
const LP = {
  day: { az: 35, el: 48, sun: [1.2, 1.12, 0.97], amb: [0.38, 0.39, 0.47], gnd: [0.32, 0.27, 0.2], top: "#3f80d4", mid: "#8fb7e6", hor: "#c4d8ee", fog: [120, 1300], sat: 1.12, lift: [0.02, 0.025, 0.05], gain: [1, 1, 1], card: [1, 1, 1], cloud: [1, 1, 1], disc: 0, win: 0, moon: 0 },
  morning: { az: 25, el: 20, sun: [1.38, 1.04, 0.74], amb: [0.34, 0.34, 0.47], gnd: [0.3, 0.24, 0.19], top: "#4f8ad8", mid: "#a6c3e4", hor: "#f0dcbc", fog: [110, 1200], sat: 1.12, lift: [0.025, 0.02, 0.05], gain: [1.02, 1, 0.97], card: [1.03, 0.98, 0.93], cloud: [1, 0.93, 0.86], disc: 0.003, win: 0.15, moon: 0 },
  golden: { az: 40, el: 12, sun: [1.62, 0.98, 0.52], amb: [0.31, 0.28, 0.48], gnd: [0.27, 0.21, 0.19], top: "#6d7cc4", mid: "#e6a98e", hor: "#ffcf8e", fog: [90, 1100], sat: 1.14, lift: [0.03, 0.02, 0.06], gain: [1.04, 0.99, 0.94], card: [1.06, 0.94, 0.82], cloud: [1, 0.84, 0.72], disc: 0.004, win: 0.55, moon: 0 },
  night: { az: -90, el: 13, sun: [0.36, 0.46, 0.76], amb: [0.16, 0.2, 0.36], gnd: [0.08, 0.09, 0.15], top: "#0d1838", mid: "#1f3058", hor: "#3a5079", fog: [80, 900], sat: 0.86, lift: [0.01, 0.02, 0.05], gain: [0.95, 1, 1.08], card: [0.6, 0.67, 0.92], cloud: [0.32, 0.4, 0.58], disc: 0.006, win: 1, moon: 1 },
  // interiors: key light comes through the (shadowless) front wall
  nightIn: { az: 70, el: 40, sun: [0.5, 0.62, 0.98], amb: [0.2, 0.24, 0.42], gnd: [0.1, 0.11, 0.18], top: "#0d1838", mid: "#1f3058", hor: "#3a5079", fog: [80, 900], sat: 0.9, lift: [0.01, 0.02, 0.05], gain: [0.96, 1, 1.08], card: [0.68, 0.75, 0.98], cloud: [0.32, 0.4, 0.58], disc: 0, win: 1, moon: 0 },
  torchIn: { az: 78, el: 30, sun: [1.55, 0.92, 0.46], amb: [0.2, 0.2, 0.38], gnd: [0.14, 0.1, 0.1], top: "#0d1838", mid: "#1f3058", hor: "#3a5079", fog: [80, 900], sat: 1.08, lift: [0.02, 0.02, 0.05], gain: [1.04, 0.98, 0.92], card: [1.04, 0.92, 0.76], cloud: [0.32, 0.4, 0.58], disc: 0, win: 1, moon: 0 },
  candle: { az: 110, el: 28, sun: [1.45, 0.95, 0.5], amb: [0.24, 0.18, 0.22], gnd: [0.16, 0.1, 0.08], top: "#0d1838", mid: "#1f3058", hor: "#3a5079", fog: [80, 900], sat: 1.1, lift: [0.03, 0.02, 0.04], gain: [1.05, 0.98, 0.9], card: [1.05, 0.93, 0.78], cloud: [0.32, 0.4, 0.58], disc: 0, win: 1, moon: 0 },
  dayIn: { az: 70, el: 42, sun: [1.2, 1.1, 0.94], amb: [0.42, 0.41, 0.46], gnd: [0.32, 0.27, 0.2], top: "#3f80d4", mid: "#8fb7e6", hor: "#c4d8ee", fog: [120, 1300], sat: 1.12, lift: [0.02, 0.025, 0.05], gain: [1, 1, 1], card: [1, 1, 1], cloud: [1, 1, 1], disc: 0, win: 0, moon: 0 },
};
LP.warm = { ...LP.golden, el: 34, az: 30, sun: [1.45, 1.05, 0.7], win: 0.2 };
const hexMix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const ch = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0"); return `#${ch(16)}${ch(8)}${ch(0)}`; };
const blendL = (a, b, t) => {
  const o = {};
  for (const k of Object.keys(a)) { const x = a[k], y = b[k]; o[k] = typeof x === "string" ? hexMix(x, y, t) : Array.isArray(x) ? x.map((v, i) => lerp(v, y[i], t)) : lerp(x, y, t); }
  let d = b.az - a.az; if (d > 180) d -= 360; if (d < -180) d += 360; o.az = a.az + d * t;
  return o;
};
const lightSeq = (seq, f) => {
  const g = (n) => (typeof n === "string" ? LP[n] : n);
  if (f <= seq[0][0]) return g(seq[0][1]);
  for (let i = 0; i < seq.length - 1; i++) if (f <= seq[i + 1][0]) return blendL(g(seq[i][1]), g(seq[i + 1][1]), smooth(lin(seq[i][0], seq[i + 1][0], f)));
  return g(seq[seq.length - 1][1]);
};

// ---------------- helpers ----------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a, b) => Math.hypot(...sub(a, b));
const camRight = (c) => norm(cross(sub(c.look, c.pos), [0, 1, 0]));
const camUp = (c) => norm(cross(camRight(c), sub(c.look, c.pos)));
const ext = (f, a, b) => f >= a && f < b;
/** creeping camera move across [a, b] (linear by default so nothing ever holds) */
const mv = (f, a, b, P0, L0, P1, L1, fov0 = 40, fov1 = fov0, ease = (t) => t, roll0 = 0, roll1 = roll0) => { const t = ease(lin(a, b, f)); return { pos: lerp3(P0, P1, t), look: lerp3(L0, L1, t), fov: lerp(fov0, fov1, t), roll: lerp(roll0, roll1, t) }; };
const act = (id, kind, outfit, x, z, opts, extra = {}) => ({ id, kind, outfit, outfitKey: NAME.get(outfit), pos: [x, z], opts, ...extra });
/** idle life for a front card */
const life = (f, seed, k = 1) => { const i = idle(f, seed); return { seed, blink: blinkAt(f, seed), tilt: q(i.tilt * k, 0.5), headTilt: q(i.head * k, 1), bob: q(3 * Math.sin(f * 0.19 + seed), 1) }; };
const lifeS = (f, seed) => ({ seed, blink: blinkAt(f, seed), lean0: q(idle(f, seed).tilt * 0.6, 0.5), headTilt: q(idle(f, seed).head, 1) });
const CYC = { walk: 1.18, run: 1.77, sneak: 0.85 };
const ph = (d, mode = "walk") => q(d / CYC[mode], 1 / 24);
const flick = (f, s = 0) => q((f * 0.11 + s) % 1, 0.05);
const glow = (id, pos, size, f, s = 0, a = 0.8) => ({ id, kind: "glow", pos, size, alpha: a * (0.82 + 0.18 * Math.sin(f * 1.3 + s)) });
const puff = (out, id, f, f0, pos, size = 1.2, n = 16, alpha = 0.8) => { if (ext(f, f0, f0 + n)) out.push({ id, kind: "puff", pos, size, t: q((f - f0) / n, 0.06), alpha }); };
const burst = (out, id, f, f0, pos, size = 0.8, n = 8, col) => { if (ext(f, f0, f0 + n)) out.push({ id, kind: "burst", pos, size, t: q((f - f0 + 1) / n, 0.12), col }); };
const spark = (out, id, f, f0, pos, size = 0.4, n = 12) => { if (ext(f, f0, f0 + n)) out.push({ id, kind: "spark", pos, size, t: q((f - f0 + 1) / n, 0.08) }); };
const notes = (out, id, f, f0, pos, n = 3, sz = 1) => { for (let i = 0; i < n; i++) { const t = (((f - f0) * 0.018 + i / n) % 1 + 1) % 1; if (f >= f0) out.push({ id: id + i, kind: "note", pos: [pos[0] + 0.25 * Math.sin(t * 6 + i * 2), pos[1] + t * 1.0 * sz, pos[2]], size: (0.2 + 0.08 * (i % 2)) * sz, k: i % 2, alpha: Math.min(1, 4 * (1 - t)), rot: 0.3 * Math.sin(t * 9 + i) }); } };
const smokes = (out, f) => HOUSES.filter((h) => h.chim && Math.abs(h.z) < 40).forEach((h, i) => out.push({ id: "smk" + i, kind: "smoke", pos: [h.x - h.side * 1.26, h.h + h.rise + 3.2, h.z - h.side * h.chim * h.w * 0.28], size: 2.4, t: q((f * 0.011 + i * 0.27) % 1, 0.02), alpha: 0.85 }));
const birds = (out, f, n, base, v = 0.3) => { for (let i = 0; i < n; i++) out.push({ id: "bird" + i, kind: "bird", pos: [base[0] + f * v * 0.5 + i * 3, base[1] + i * 1.6 + Math.sin(f * 0.05 + i) * 1.2, base[2] - i * 4 - f * v * 0.3], size: 1.4, t: q((f * 0.09 + i * 0.3) % 1, 0.125) }); };
const R = (x, y, z) => [RX + x, y, z];

// ---------------- shots ----------------
const SHOTS = [];
const shot = (id, a, b, fn) => SHOTS.push({ id, a, b, fn });
const TH = C.THIEF;

// 1 HOOK: caught in the torchlight, chair over his head
shot("hook", 0, 50, (f) => {
  const cam = mv(f, 0, 50, R(0.95, 1.85, 3.2), R(0.5, 1.68, -0.4), R(0.75, 1.8, 2.5), R(0.5, 1.7, -0.4), 37, 35);
  const a = [act("thief", "front", TH, RX + 0.5, -0.4, { ...life(f, 3, 0.4), blink: 0, expr: "shock", armL: "carry", armR: "carry", prop: "chair", chairBroken: false, look: q(0.6 * Math.sin(f * 0.21), 0.2), bob: f < 6 ? [-14, -8, -3, 2, 1, 0][f] : q(2 * Math.sin(f * 0.9), 1) })];
  const fx = [];
  return { cam, L: LP.torchIn, actors: a, fx, kicks: [{ f: 1, a: 0.02 }], dof: { focus: dist(cam.pos, R(0.5, 1.5, -0.4)), cInf: 10 }, shadow: { c: R(0, 0, 0), r: 9 }, flash: f < 4 ? [0.55, 0.3, 0.14, 0.05][f] : 0 };
});
// 1b the crowd in the doorway
shot("crowd", 50, 97, (f) => {
  const cam = mv(f, 50, 97, R(0.5, 1.55, -1.1), R(0.3, 1.35, 2.5), R(0.42, 1.48, -0.6), R(0.3, 1.36, 2.5), 42, 40);
  const pt = back(clamp((f - 54) / 8));
  const a = [
    act("capt", "front", C.CAPTAIN, RX + 0.3, 2.1, { ...life(f, 5, 0.5), expr: "angry", armR: f >= 54 ? "point" : "hang", armL: "hip", tilt: q(-4 * pt, 0.5), look: 0.3 }),
    act("baker", "front", C.BAKER, RX - 0.45, 2.9, { ...life(f, 9), expr: "shock", armR: "torch", prop: "torch", propT: flick(f, 0.2) }),
    act("woman", "front", C.WOMAN, RX + 1.0, 3.05, { ...life(f, 11), expr: "ooh", armR: "torch", prop: "torch", propT: flick(f, 0.6), turn: -0.4 }),
  ];
  const fx = [glow("g1", R(-0.15, 2.25, 2.95), 1.8, f, 0), glow("g2", R(1.3, 2.25, 3.1), 1.8, f, 2)];
  return { cam, L: LP.torchIn, actors: a, fx, kicks: [{ f: 56, a: 0.012 }], dof: { focus: dist(cam.pos, R(0.3, 1.4, 2.1)), cInf: 8 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 2 "He was putting things back."
shot("putback", 97, 155, (f) => {
  const cam = mv(f, 97, 155, R(0.2, 1.3, 3.2), R(-0.3, 1.05, -0.7), R(-0.05, 1.2, 2.6), R(-0.35, 1.05, -0.7), 40, 38);
  const x = lerp(0.75, -0.05, smooth(lin(97, 124, f))), down = f >= 126;
  const a = [];
  if (f < 138) a.push(act("thief", "side", TH, RX + x, -0.7, { ...lifeS(f, 3), mode: f < 124 ? "sneak" : "stand", phase: ph(0.75 - x, "sneak"), arm: down ? "reach" : "carry", prop: down ? null : "chair", expr: "worried", lean0: down ? q(10 * Math.sin(lin(126, 136, f) * Math.PI), 1) : 0 }, { dir: [-1, 0] }));
  else a.push(act("thief", "front", TH, RX + x, -0.7, { ...life(f, 3), expr: f < 146 ? "worried" : "smile", armL: "shrug", armR: "shrug", look: -0.4, bob: q(-6 * Math.sin(lin(138, 146, f) * Math.PI), 1) }));
  const fx = [];
  if (down) fx.push({ id: "chair", kind: "chair", pos: R(-0.85, 0.5 + 0.06 * Math.max(0, 1 - (f - 126) / 3), -0.7), size: 0.8, k: 0 });
  puff(fx, "p", f, 127, R(-0.85, 0.15, -0.6), 0.8, 12, 0.6);
  return { cam, L: LP.torchIn, actors: a, fx, kicks: [{ f: 127, a: 0.006 }], dof: { focus: dist(cam.pos, R(-0.3, 1.1, -0.7)), cInf: 6 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 3 the crooked little town (crane)
shot("town", 155, 232, (f) => {
  const cam = mv(f, 155, 232, [24, 30, 64], [-2, 5, 4], [11, 15, 42], [-2, 4.5, 2], 46, 44, smooth);
  cam.pos = add3(cam.pos, [0, 0, -(f - 155) * 0.03]);
  const fx = []; smokes(fx, f); birds(fx, f - 155, 4, [-14, 20, 30]);
  const a = [act("w1", "side", C.WOMAN2, lerp(-3, 1.5, lin(155, 232, f)), 10, { ...lifeS(f, 21), phase: ph(lerp(0, 4.5, lin(155, 232, f))), expr: "smile" }, { dir: [1, 0] })];
  return { cam, L: LP.golden, actors: a, fx, dof: { focus: 40, cInf: 0 }, shadow: { c: [0, 0, 10], r: 60 } };
});
// 3b chimneys and cobblestones (low street track)
shot("street", 232, 298, (f) => {
  const t = lin(232, 298, f);
  const cam = mv(f, 232, 298, [1.6, 0.55, 31], [-1.5, 3.4, 8], [0.4, 0.95, 25], [-1.2, 3.0, 6], 44, 42);
  const a = [
    act("w1", "side", C.WOMAN, lerp(-3.2, 1.2, t), 18, { ...lifeS(f, 11), phase: ph(4.4 * t), expr: "smile" }, { dir: [1, 0] }),
    act("w2", "side", C.BAKER, lerp(3.4, -0.4, t), 14, { ...lifeS(f, 9), phase: ph(3.8 * t), expr: "happy" }, { dir: [-1, 0] }),
    act("w3", "side", C.KID, lerp(-1.0, 3.6, t), 21.5, { ...lifeS(f, 13), mode: "run", phase: ph(4.6 * t, "run"), expr: "grin" }, { dir: [1, 0] }),
  ];
  const fx = []; smokes(fx, f); birds(fx, f - 232, 3, [-6, 14, 6]);
  return { cam, L: LP.golden, actors: a, fx, dof: { focus: 9, cInf: 3 }, shadow: { c: [0, 0, 16], r: 30 } };
});
// 4 every night, something went missing (the thief tiptoes across the street)
shot("sneak", 298, 378, (f) => {
  const t = lin(298, 378, f), x = lerp(-3.6, 2.6, t);
  const cam = mv(f, 298, 378, [-0.6, 1.35, 11.6], [x, 1.25, 4], [1.2, 1.2, 10.2], [x - 0.4, 1.25, 4], 38, 36);
  cam.look = [x - 0.3, 1.25, 4];
  const a = [act("thief", "side", TH, x, 4, { ...lifeS(f, 3), mode: "sneak", phase: ph(6.2 * t, "sneak"), arm: "sneak", expr: "sly", look: q(0.6 * Math.sin(f * 0.12), 0.3) }, { dir: [1, 0] })];
  const fx = []; smokes(fx, f);
  return { cam, L: LP.night, actors: a, fx, dof: { focus: dist(cam.pos, [x, 1.2, 4]), cInf: 6 }, shadow: { c: [0, 0, 4], r: 22 } };
});
// item inserts in the room: clock on the wall, kettle + music box on the table
const CLK = R(-2.4, 2.3, -2.92), KET = [TABLE[0], 0.87 + 0.22, TABLE[1] + 0.1], BOX = [TABLE[0] + 0.05, 0.87 + 0.17, TABLE[1] + 0.15];
const zip = (f, f0, p, to) => { const t = easeIn(lin(f0, f0 + 9, f)), h = Math.sin(lin(f0 - 4, f0, f) * Math.PI) * 0.06; return [lerp(p[0], to[0], t), lerp(p[1], to[1], t) + h, lerp(p[2], to[2], t)]; };
shot("clockGone", 378, 408, (f) => {
  const cam = mv(f, 378, 408, R(-1.9, 1.9, -0.2), CLK, R(-2.0, 1.95, -0.55), CLK, 36, 35, (t) => t, -2, 2);
  const fx = [];
  if (f < 401) fx.push({ id: "clock", kind: "clock", pos: zip(f, 392, add3(CLK, [0, 0, 0.06]), R(1.5, 2.2, -2.5)), size: 0.62, t: q((f * 0.033) % 1, 0.04), h: 11.2, yaw: 0, rot: f >= 392 ? -(f - 392) * 0.12 : 0 });
  puff(fx, "p", f, 394, add3(CLK, [0, -0.1, 0.2]), 1.0, 14);
  return { cam, L: LP.nightIn, actors: [], fx, kicks: [{ f: 393, a: 0.008 }], dof: { focus: 2.3, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("kettleGone", 408, 434, (f) => {
  const cam = mv(f, 408, 434, [TABLE[0] + 0.55, 1.35, 0.55], add3(KET, [0, 0.05, 0]), [TABLE[0] + 0.4, 1.3, 0.3], add3(KET, [0, 0.05, 0]), 36, 35);
  const fx = [];
  if (f < 430) fx.push({ id: "kettle", kind: "kettle", pos: zip(f, 420, KET, R(0.4, 1.9, -2.6)), size: 0.5, k: 0, rot: f >= 420 ? (f - 420) * 0.15 : 0 });
  puff(fx, "p", f, 422, add3(KET, [0, -0.05, 0.1]), 0.8, 12);
  return { cam, L: LP.nightIn, actors: [], fx, kicks: [{ f: 421, a: 0.008 }], dof: { focus: 2, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("boxGone", 434, 491, (f) => {
  const cam = mv(f, 434, 491, [TABLE[0] - 0.5, 1.3, 1.0], [TABLE[0], 1.1, -1.6], [TABLE[0] - 0.3, 1.36, 0.6], [TABLE[0], 1.15, -1.7], 40, 37);
  const awake = f >= 462;
  const a = [act("kid", "front", C.KID, TABLE[0] + 0.1, -2.0, { ...life(f, 13, awake ? 0.3 : 1), expr: awake ? (f < 476 ? "shock" : "sad") : "sleep", armL: awake ? "cheek" : "hang", armR: awake ? "cheek" : "hang", bob: awake ? q(-10 * Math.sin(lin(462, 470, f) * Math.PI), 1) : q(3 * Math.sin(f * 0.12), 1), headTilt: awake ? 0 : 8 })];
  const fx = [];
  if (f < 461) fx.push({ id: "box", kind: "box", pos: zip(f, 450, BOX, R(0.2, 1.9, -2.6)), size: 0.42, t: 0, rot: f >= 450 ? -(f - 450) * 0.14 : 0 });
  if (!awake) fx.push({ id: "zzz", kind: "zzz", pos: [TABLE[0] + 0.55, 1.75, -1.9], size: 0.5, t: q((f * 0.025) % 1, 0.04) });
  puff(fx, "p", f, 452, add3(BOX, [0, -0.05, 0.1]), 0.8, 12);
  return { cam, L: LP.nightIn, actors: a, fx, kicks: [{ f: 451, a: 0.008 }, { f: 463, a: 0.01 }], dof: { focus: 2.6, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 8 the mayor sits down on a chair that is not there
shot("mayorChair", 491, 568, (f) => {
  const fall = f >= 526;
  const cam = mv(f, 491, 568, R(-0.3, 1.45, 3.1), R(-0.8, 1.25, -0.5), R(-0.45, 1.15, 2.5), R(-0.8, 0.95, -0.5), 40, 38);
  if (fall) cam.look[1] -= 0.18 * easeOut(lin(526, 536, f));
  const o = fall
    ? { ...life(f, 7, 0.3), mode: "sit", expr: f < 544 ? "shock" : "angry", armL: f < 544 ? "up" : "hip", armR: f < 544 ? "up" : "wave", wave: q(((f - 544) / 9) % 1, 0.08), capT: q((f - 526) * 0.5, 0.2), bob: 0 }
    : { ...life(f, 7), expr: f < 512 ? "sleep" : "soft", armL: f >= 514 ? "behind" : "hang", armR: f >= 514 ? "behind" : "hang", step: f < 512 ? q(Math.sin(f * 0.5), 0.25) : 0, bob: f >= 518 ? q(40 * easeIn(lin(518, 526, f)), 2) : q(3 * Math.sin(f * 0.19), 1), capT: q(f * 0.12, 0.2) };
  const a = [act("mayor", "front", C.MAYOR_NIGHT, RX - 0.8, -0.5, o)];
  const fx = [];
  puff(fx, "p", f, 527, R(-0.8, 0.25, -0.3), 1.6, 18);
  burst(fx, "b", f, 527, R(-0.8, 0.5, -0.2), 1.2, 7);
  return { cam, L: LP.dayIn, actors: a, fx, kicks: [{ f: 527, a: 0.024 }], dof: { focus: dist(cam.pos, R(-0.8, 1.1, -0.5)), cInf: 6 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 9 doors bolted
const DH = HN("door"), DZ = doorZ(DH), WZ = winZ(DH);
shot("bolt", 568, 626, (f) => {
  const cam = mv(f, 568, 626, [-0.5, 1.55, DZ + 1.5], [FX, 1.35, DZ], [-1.1, 1.5, DZ + 1.1], [FX, 1.38, DZ], 42, 39);
  const back2 = easeIn(lin(586, 592, f));
  const a = [act("woman", "front", C.WOMAN2, -3.95 - 1.2 * back2, DZ, { ...life(f, 21, 0.5), expr: f < 582 ? "suspicious" : "worried", look: q(Math.sin((f - 568) * 0.35), 0.5), turn: q(0.5 * Math.sin((f - 568) * 0.35), 0.25) }, { visible: f < 592, y: 0.4, blob: false })];
  const door = 1 - easeIn(lin(590, 597, f));
  const fx = [];
  burst(fx, "b1", f, 597, [FX + 0.4, 1.4, DZ + 0.5], 1.0, 7); puff(fx, "p1", f, 597, [FX + 0.3, 0.6, DZ], 1.2, 14);
  burst(fx, "b2", f, 608, [FX + 0.35, 1.45, DZ + 0.4], 0.5, 6, "#ffffff"); burst(fx, "b3", f, 616, [FX + 0.35, 1.05, DZ + 0.4], 0.5, 6, "#ffffff");
  return { cam, L: LP.day, actors: a, fx, world: { door }, kicks: [{ f: 597, a: 0.022 }, { f: 608, a: 0.008 }, { f: 616, a: 0.008 }], dof: { focus: 3.9, cInf: 4 }, shadow: { c: [-3, 0, DZ], r: 14 } };
});
// 10 windows nailed shut
shot("nail", 626, 680, (f) => {
  const cam = mv(f, 626, 680, [-0.9, 0.85, WZ - 2.9], [FX, 1.7, WZ + 0.45], [-1.3, 0.95, WZ - 2.5], [FX, 1.7, WZ + 0.45], 46, 44, (t) => t, 3, 3);
  const bt = lin(636, 641, f) * 0.5 + lin(650, 655, f) * 0.5, hits = [641, 655, 664, 671];
  const hit = hits.some((h) => f >= h - 3 && f <= h);
  const a = [act("old", "front", C.OLDMAN, -3.7, WZ - 1.0, { ...life(f, 31, 0.4), expr: "determined", armR: "work", prop: "mallet", propT: hit ? 0.9 : 0.2, wave: hit ? 0.75 : 0.25, turn: -0.6, look: -0.6 }, { scale: 0.95 })];
  const fx = [{ id: "boards", kind: "boards", pos: [FX + 0.22, 1.75, WZ], size: 1.3, t: q(bt, 0.1), yaw: Math.PI / 2 }];
  for (const [i, h] of hits.entries()) burst(fx, "b" + i, f, h, [FX + 0.4, 1.9 - 0.2 * i, WZ + 0.45], 0.6, 6);
  return { cam, L: LP.day, actors: a, fx, world: { door: 0 }, kicks: hits.map((h) => ({ f: h, a: 0.014 })), dof: { focus: 3.4, cInf: 4 }, shadow: { c: [-3, 0, WZ], r: 14 } };
});
// 11 one man slept inside his own cupboard
shot("cupboard", 680, 760, (f) => {
  const cam = mv(f, 680, 760, [CUP[0] - 0.9, 1.55, 2.3], [CUP[0], 1.3, CUP[1]], [CUP[0] - 0.35, 1.5, 0.5], [CUP[0], 1.36, CUP[1]], 40, 37, smooth);
  cam.pos = add3(cam.pos, [0, 0, -(f - 680) * 0.004]);
  const cup = f < 728 ? 0.72 * easeOut(lin(688, 712, f)) : 0.72 - 0.25 * smooth(lin(728, 760, f));
  const a = [act("sleeper", "front", C.SLEEPER, CUP[0], CUP[1] + 0.05, { seed: 17, expr: "sleep", capT: q(f * 0.1, 0.2), bob: q(5 * Math.sin(f * 0.1), 1), headTilt: q(6 + 2 * Math.sin(f * 0.1), 1), tilt: 0 }, { scale: 0.92, pull: 0.05, y: 0.1, blob: false })];
  const fx = [{ id: "zzz", kind: "zzz", pos: [CUP[0] + 0.25, 2.0, CUP[1] + 0.6], size: 0.55, t: q((f * 0.022) % 1, 0.04) }];
  return { cam, L: LP.nightIn, actors: a, fx, world: { cup }, dof: { focus: dist(cam.pos, [CUP[0], 1.3, CUP[1]]), cInf: 5 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 12 rooftops: the guards chase a shadow
const roofRun = (f, f0, z0, v, id, outfit, seed, o = {}) => { const z = z0 - v * (f - f0); return act(id, "side", outfit, -8.2, z, { ...lifeS(f, seed), mode: "run", phase: ph(z0 - z + seed, "run"), ...o }, { dir: [0, -1], y: ridgeY(z), blob: false, pull: 0.1 }); };
shot("roofs", 760, 825, (f) => {
  const zt = 16 - 0.17 * (f - 760);
  const cam = { pos: [1.6, 10.2, zt + 2.2], look: [-8.2, 10.9, zt + 1.7], fov: lerp(46, 44, lin(760, 825, f)), roll: -2 };
  const a = [
    roofRun(f, 760, 16, 0.17, "thief", TH, 3, { expr: "grin" }),
    roofRun(f, 760, 18.3, 0.17, "capt", C.CAPTAIN, 5, { expr: "angry", arm: "hold", prop: "lantern", propT: flick(f) }),
    roofRun(f, 760, 19.9, 0.167, "guard", C.GUARD, 6, { expr: "worried", arm: "torch", prop: "torch", propT: flick(f, 0.4) }),
  ];
  const fx = [glow("g1", [-7.9, ridgeY(zt + 2.3) + 1.2, zt + 2.0], 1.0, f, 0, 0.45), glow("g2", [-7.9, ridgeY(zt + 3.9) + 2.0, zt + 3.6], 1.1, f, 2, 0.45)];
  smokes(fx, f);
  return { cam, L: { ...LP.night, az: 180, el: 9, disc: 0.01 }, actors: a, fx, dof: { focus: 24, cInf: 0 }, shadow: { c: [-6, 0, zt], r: 30 } };
});
shot("roofsYear", 825, 890, (f) => {
  const zt = 2 - 0.17 * (f - 825);
  const cam = { pos: [0.2, 10.1, zt + 1.2], look: [-8.2, 10.8, zt + 1.6], fov: lerp(46, 44, lin(825, 890, f)), roll: 2 };
  const N = { ...LP.night, az: 180, el: 9, disc: 0.01 };
  const L = lightSeq([[825, N], [838, { ...LP.morning, az: 200 }], [848, { ...LP.day, az: 215 }], [858, { ...LP.golden, az: 200 }], [870, N], [890, N]], f);
  const a = [
    roofRun(f, 825, 2.6, 0.17, "capt", C.CAPTAIN, 5, { expr: f > 855 ? "worried" : "angry", arm: "hold", prop: "lantern", propT: flick(f) }),
    roofRun(f, 825, 4.2, 0.167, "guard", C.GUARD, 6, { expr: "worried", arm: "torch", prop: "torch", propT: flick(f, 0.4) }),
    roofRun(f, 825, 0.0, 0.176, "thief", TH, 3, { expr: "grin" }),
  ];
  const fl = (c) => (f >= c - 1 && f < c + 5 ? [0.3, 0.6, 0.45, 0.28, 0.14, 0.05][f - c + 1] : 0);
  const fx = []; smokes(fx, f);
  return { cam, L, actors: a, fx, flash: Math.max(fl(838), fl(858)), dof: { focus: 15, cInf: 0 }, shadow: { c: [-6, 0, zt], r: 30 } };
});
// 13 people noticed something strange
shot("strange", 890, 940, (f) => {
  const z = 6;
  const cam = mv(f, 890, 940, [2.9, 1.5, z + 6.2], [-0.9, 1.25, z], [2.5, 1.45, z + 5.6], [-0.9, 1.27, z], 40, 38);
  const a = [
    act("woman", "front", C.WOMAN, -1.3, z + 0.35, { ...life(f, 11), expr: "suspicious", armR: f >= 904 ? "temple" : "hang", look: 0.6, turn: 0.4 }),
    act("baker", "front", C.BAKER, -0.55, z - 0.45, { ...life(f, 9), expr: f < 915 ? "neutral" : "ooh", armL: "hip", armR: f >= 918 ? "chin" : "hang", look: -0.6, turn: -0.4 }),
  ];
  const fx = []; birds(fx, f - 890, 3, [-10, 12, -4]); smokes(fx, f);
  return { cam, L: LP.morning, actors: a, fx, dof: { focus: 5.6, cInf: 6 }, shadow: { c: [0, 0, z], r: 18 } };
});
shot("strange2", 940, 982, (f) => {
  const cam = mv(f, 940, 982, [-1.2, 1.5, DZ + 3.4], [-3.4, 1.35, DZ + 0.3], [-1.5, 1.45, DZ + 2.9], [-3.4, 1.3, DZ + 0.3], 34, 32, (t) => t, -3, -3);
  const a = [act("old", "front", C.OLDMAN, -3.4, DZ + 0.3, { ...life(f, 31, 0.5), expr: f < 952 ? "neutral" : "shock", armL: f >= 952 ? "cheek" : "hang", armR: f >= 952 ? "cheek" : "hang", look: -0.5, headTilt: q(8 * smooth(lin(946, 954, f)), 1), bob: q(-8 * Math.sin(lin(952, 960, f) * Math.PI), 1) })];
  return { cam, L: LP.morning, actors: a, fx: [], world: { door: 0 }, kicks: [{ f: 953, a: 0.01 }], dof: { focus: dist(cam.pos, [-3.4, 1.35, DZ + 0.3]), cInf: 9 }, shadow: { c: [-3, 0, DZ], r: 14 } };
});
// 14 everything came back (on the doorstep)
const STEPY = 0.42;
shot("back", 982, 1036, (f) => {
  const cam = mv(f, 982, 1036, [-1.0, 0.85, DZ + 0.15], [FX + 0.5, 0.82, DZ], [0.3, 1.1, DZ + 0.3], [FX + 0.5, 0.84, DZ], 40, 38);
  const fx = [], items = [["clock", 990, [FX + 0.62, STEPY + 0.34, DZ - 0.52], 0.5, { t: q((f * 0.033) % 1, 0.04), h: 7.1 }], ["kettle", 1000, [FX + 0.72, STEPY + 0.2, DZ + 0.02], 0.42, { k: 0 }], ["box", 1010, [FX + 0.82, STEPY + 0.14, DZ + 0.5], 0.4, { t: 0 }]];
  for (const [kind, f0, pos, size, o] of items) {
    if (f < f0) continue;
    const pop = back(clamp((f - f0) / 7));
    fx.push({ id: kind, kind, pos: [pos[0], pos[1] - (1 - pop) * 0.1, pos[2]], size: size * (0.6 + 0.4 * pop), ...o });
    spark(fx, "s" + kind, f, f0 + 1, add3(pos, [0.2, 0.35, 0.15]), 0.45, 12); spark(fx, "t" + kind, f, f0 + 7, add3(pos, [0.25, 0.1, -0.2]), 0.3, 12);
  }
  return { cam, L: LP.morning, actors: [], fx, world: { door: 0 }, kicks: [{ f: 990, a: 0.006 }, { f: 1000, a: 0.006 }, { f: 1010, a: 0.006 }], dof: { focus: 3, cInf: 0 }, shadow: { c: [-3, 0, DZ], r: 12 } };
});
shot("clockBack", 1036, 1091, (f) => {
  const sw = Math.sin((f - 1036) * 0.21) * 2.5;
  const cam = mv(f, 1036, 1091, R(-2.75, 2.05, -0.3), CLK, R(-2.55, 2.1, -0.8), CLK, 37, 35, (t) => t, sw, sw);
  const fx = [{ id: "clock", kind: "clock", pos: add3(CLK, [0, 0, 0.06]), size: 0.62, t: q(((f - 1036) / 30) % 1, 0.03), h: 7.2 + (f - 1036) * 0.002, yaw: 0, rot: 0.03 * Math.sin((f - 1036) * 0.21) }];
  for (const [i, f0] of [1046, 1061, 1076].entries()) spark(fx, "s" + i, f, f0, add3(CLK, [0.36 - 0.3 * i, 0.3 - 0.25 * i, 0.3]), 0.3, 12);
  return { cam, L: LP.dayIn, actors: [], fx, kicks: [1046, 1061, 1076].map((x) => ({ f: x, a: 0.004 })), dof: { focus: 2.3, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("kettleBack", 1091, 1153, (f) => {
  const cam = mv(f, 1091, 1153, [TABLE[0] - 0.6, 1.3, 0.5], add3(KET, [0.05, 0.15, 0]), [TABLE[0] - 0.4, 1.4, 0.2], add3(KET, [0.05, 0.2, 0]), 38, 36);
  const boil = lin(1097, 1110, f);
  const fx = [{ id: "kettle", kind: "kettle", pos: add3(KET, [0, 0.012 * boil * Math.sin(f * 2.2), 0]), size: 0.5, k: 0, w: q(3 * boil * Math.sin(f * 1.9), 0.5) }];
  if (boil > 0.3) fx.push({ id: "steam", kind: "smoke", pos: add3(KET, [0.27, 0.42, 0.02]), size: 0.36, t: q((f * 0.03) % 1, 0.03), alpha: 0.9 });
  notes(fx, "n", f, 1104, add3(KET, [-0.25, 0.25, 0.1]), 2, 0.55);
  return { cam, L: LP.dayIn, actors: [], fx, dof: { focus: 2, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("boxBack", 1153, 1210, (f) => {
  const cam = mv(f, 1153, 1210, [TABLE[0] + 0.5, 1.25, 0.35], add3(BOX, [0, 0.08, 0]), [TABLE[0] + 0.35, 1.32, 0.05], add3(BOX, [0, 0.14, 0]), 37, 35);
  const fx = [{ id: "box", kind: "box", pos: BOX, size: 0.42, t: q(back(clamp((f - 1164) / 12)), 0.05) }];
  notes(fx, "n", f, 1170, add3(BOX, [0, 0.12, 0.1]), 4, 0.5);
  spark(fx, "s", f, 1166, add3(BOX, [0.2, 0.25, 0.1]), 0.3, 12);
  return { cam, L: LP.dayIn, actors: [], fx, dof: { focus: 2, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("kidDance", 1210, 1265, (f) => {
  const cam = mv(f, 1210, 1265, R(0.9, 1.15, 2.9), R(0.3, 0.95, 0), R(0.7, 1.1, 2.4), R(0.3, 0.98, 0), 40, 38);
  const b = (f - 1210) * 0.42;
  const a = [
    act("kid", "front", C.KID, RX + 0.1, 0.2, { seed: 13, blink: blinkAt(f, 13), expr: "happy", armL: "present", armR: "present", prop: "box", boxOpen: 1, tilt: q(7 * Math.sin(b), 1), bob: q(-9 * Math.abs(Math.sin(b)), 1), step: q(Math.sin(b), 0.25) }),
    act("woman", "front", C.WOMAN, RX + 0.72, -0.7, { ...life(f, 11), expr: "happy", armL: "cheek", armR: "cheek", tilt: q(3 * Math.sin(b * 0.5), 1) }),
  ];
  const fx = []; notes(fx, "n", f, 1200, R(-0.3, 1.0, 0.4), 4);
  return { cam, L: LP.dayIn, actors: a, fx, dof: { focus: 3, cInf: 5 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 17 so one night... (crane down the mayor's house)
const MH = HN("mayor"), MWZ = winZ(MH), MDZ = doorZ(MH);
shot("oneNight", 1265, 1312, (f) => {
  const cam = mv(f, 1265, 1312, [4.5, 10.5, 9], [FX, 9, 0], [1.2, 2.2, 5.2], [FX, 2.0, MWZ - 0.4], 44, 40, smoother);
  cam.pos = add3(cam.pos, [0, 0, -(f - 1265) * 0.006]);
  const fx = []; smokes(fx, f);
  return { cam, L: LP.night, actors: [], fx, dof: { focus: 8, cInf: 0 }, shadow: { c: [-4, 0, 0], r: 24 } };
});
shot("captSneak", 1312, 1365, (f) => {
  const t = lin(1312, 1365, f), x = lerp(0.9, -1.3, t);
  const cam = mv(f, 1312, 1365, R(0.6, 1.25, 3.2), R(x, 1.1, -0.6), R(-0.4, 1.2, 2.9), R(x, 1.1, -0.6), 40, 39);
  cam.look = R(x - 0.2, 1.1, -0.6);
  const a = [act("capt", "side", C.CAPTAIN, RX + x, -0.6, { ...lifeS(f, 5), mode: "sneak", phase: ph(2.2 * t, "sneak"), arm: "hold", prop: "lantern", propT: flick(f), expr: "suspicious", look: q(0.6 * Math.sin(f * 0.2), 0.3) }, { dir: [-1, 0] })];
  const fx = [glow("g", R(x - 0.3, 0.95, -0.3), 0.8, f, 0, 0.3)];
  return { cam, L: LP.nightIn, actors: a, fx, dof: { focus: dist(cam.pos, R(x, 1.1, -0.6)), cInf: 5 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("captHide", 1365, 1420, (f) => {
  const cam = mv(f, 1365, 1420, [TABLE[0] + 0.5, 1.15, 1.6], [TABLE[0], 0.98, -2.0], [TABLE[0] + 0.3, 1.1, 1.0], [TABLE[0], 1.0, -2.0], 36, 33, (t) => t, 2, 2);
  const up = f < 1376 ? easeOut(lin(1366, 1376, f)) : 1;
  const a = [act("capt", "front", C.CAPTAIN, TABLE[0], -2.05, { seed: 5, blink: blinkAt(f, 5), expr: "suspicious", look: q(Math.sin((f - 1365) * 0.16), 0.25), headTilt: q(3 * Math.sin((f - 1365) * 0.16), 1), bob: q(2 * Math.sin(f * 0.25), 1) }, { y: -0.3 - 0.6 * (1 - up), blob: false, pull: 0.0 })];
  const fx = [glow("g", [TABLE[0] - 0.5, 0.5, -1.9], 1.2, f, 0, 0.35)];
  return { cam, L: LP.nightIn, actors: a, fx, dof: { focus: dist(cam.pos, [TABLE[0], 1.0, -2.0]), cInf: 8 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("midnight", 1420, 1450, (f) => {
  const cam = mv(f, 1420, 1450, R(-2.1, 1.25, -0.9), add3(CLK, [0, 0.05, 0]), R(-2.2, 1.3, -1.15), add3(CLK, [0, 0.05, 0]), 40, 38, (t) => t, 5, 4);
  const h = 11.9 + 0.1 * easeOut(lin(1420, 1432, f));
  const fx = [{ id: "clock", kind: "clock", pos: add3(CLK, [0, 0, 0.06]), size: 0.62, t: q(((f - 1420) / 30) % 1, 0.03), h: q(h, 0.005), yaw: 0 }];
  burst(fx, "b", f, 1432, add3(CLK, [0.25, 0.42, 0.3]), 0.4, 9, "#dfe8ff");
  return { cam, L: LP.nightIn, actors: [], fx, kicks: [{ f: 1432, a: 0.012 }], dof: { focus: 2.3, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 21 the window creaks open
shot("window", 1450, 1508, (f) => {
  const cam = mv(f, 1450, 1508, R(0.6, 1.5, 2.2), R(-0.1, 1.75, -3.1), R(0.35, 1.55, 1.1), R(-0.1, 1.75, -3.1), 37, 35, (t) => t, -2, -2);
  const steps = [[1458, 0.22], [1470, 0.5], [1482, 0.78], [1494, 1]];
  let sash = 0; for (const [s, v] of steps) if (f >= s) sash = v - (v - sash) * (1 - easeOut(lin(s, s + 7, f)));
  const rise = smooth(lin(1474, 1502, f));
  const a = [act("thief", "front", TH, WINX, -3.75, { seed: 3, blink: blinkAt(f, 3), expr: "sly", look: q(0.7 * Math.sin((f - 1474) * 0.22), 0.25), armL: "up", armR: "up" }, { y: -0.95 + 1.15 * rise, blob: false, pull: 0 })];
  return { cam, L: LP.nightIn, actors: a, fx: [], world: { sash }, kicks: steps.map(([s]) => ({ f: s, a: 0.005 })), dof: { focus: 3.6, cInf: 3 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 22 a masked figure climbed in, carrying a chair
shot("climb", 1508, 1560, (f) => {
  const cam = mv(f, 1508, 1560, R(1.1, 1.35, 2.5), R(-0.1, 1.45, -2.6), R(0.9, 1.3, 2.0), R(-0.05, 1.2, -2.2), 41, 39);
  const hop = lin(1534, 1546, f), z = lerp(-3.0, -2.2, hop), y = lerp(1.02, 0, easeIn(hop)) + 0.35 * Math.sin(hop * Math.PI);
  const land = f >= 1546;
  const a = [act("thief", "front", TH, WINX, z, { ...life(f, 3, 0.4), mode: hop <= 0 ? "crouch" : "stand", expr: land ? "sly" : "focus", armL: hop > 0 && !land ? "up" : "hang", armR: hop > 0 && !land ? "up" : "hang", look: q(0.6 * Math.sin(f * 0.25), 0.3), bob: land ? q(18 * Math.sin(lin(1546, 1554, f) * Math.PI), 2) : 0 }, { y, blob: land, pull: 0.05 })];
  const fx = []; puff(fx, "p", f, 1546, R(-0.1, 0.2, -2.0), 1.1, 14, 0.6);
  return { cam, L: LP.nightIn, actors: a, fx, world: { sash: 1 }, kicks: [{ f: 1546, a: 0.01 }], dof: { focus: dist(cam.pos, R(-0.1, 1.2, -2.4)), cInf: 4 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("chairIn", 1560, 1606, (f) => {
  const t = lin(1560, 1606, f), z = lerp(-2.1, -0.9, t);
  const cam = mv(f, 1560, 1606, R(0.5, 0.6, 2.2), R(0, 1.7, -1.5), R(0.4, 0.7, 1.9), R(0.05, 1.65, -1.2), 46, 44, (x) => x, 3, 3);
  const a = [act("thief", "front", TH, RX + 0.05, z, { seed: 3, blink: blinkAt(f, 3), expr: "sly", armL: "carry", armR: "carry", prop: "chair", step: q(Math.sin((f - 1560) * 0.42), 0.25), tilt: q(3 * Math.sin((f - 1560) * 0.42), 1), bob: q(-5 * Math.abs(Math.sin((f - 1560) * 0.42)), 1), look: q(0.6 * Math.sin(f * 0.2), 0.3) })];
  return { cam, L: LP.nightIn, actors: a, fx: [], world: { sash: 1 }, dof: { focus: dist(cam.pos, R(0, 1.5, z)), cInf: 5 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 24 the whole town came running with torches
shot("torches", 1606, 1690, (f) => {
  const t = f - 1606, zc = 22 - 0.13 * t;
  const cam = { pos: [4.3, 1.25, zc + 0.6], look: [-1.5, 1.5, zc - 0.9], fov: lerp(47, 45, t / 84), roll: -2 };
  const who = [[C.BAKER, 9, -1.6, 0, "angry", "torch"], [C.WOMAN, 11, 0.0, 2.0, "angry", "torch"], [C.OLDMAN, 31, -2.8, 3.6, "determined", "torch"], [C.KID, 13, 0.9, 4.4, "grin", null], [C.WOMAN2, 21, -1.0, 5.6, "worried", "torch"], [C.GUARD, 6, -2.2, 7.2, "angry", "torch"]];
  const a = [], fx = [];
  who.forEach(([o, seed, x, dz, expr, prop], i) => {
    const z = 23.5 + dz - 0.2 * t - 0.01 * i * t;
    a.push(act("r" + i, "side", o, x, z, { ...lifeS(f, seed), mode: "run", phase: ph(0.2 * t + seed, "run"), arm: prop ? "torch" : null, prop, propT: flick(f, i * 0.2), expr }, { dir: [0, -1] }));
    if (prop) fx.push(glow("g" + i, [x + 0.3, 1.85, z - 0.3], 1.5, f, i, 0.6));
  });
  smokes(fx, f);
  return { cam, L: LP.night, actors: a, fx, dof: { focus: 7, cInf: 3 }, shadow: { c: [0, 0, zc], r: 22 } };
});
// 25 "You see, the thief had never wanted their things."
shot("youSee", 1690, 1740, (f) => {
  const cam = mv(f, 1690, 1740, R(0.25, 1.5, 2.3), R(-0.05, 1.42, -0.7), R(0.15, 1.5, 1.5), R(-0.05, 1.45, -0.7), 34, 32, (t) => t, 3, 2);
  const a = [act("thief", "front", TH, RX - 0.05, -0.7, { ...life(f, 3), expr: f < 1712 ? "worried" : "sad", armL: "present", armR: "present", look: q(0.7 * Math.sin((f - 1690) * 0.13), 0.25), headTilt: q(-5 * smooth(lin(1712, 1730, f)), 1) })];
  const fx = [{ id: "chair", kind: "chair", pos: R(-0.85, 0.5, -0.9), size: 0.8, k: 0 }];
  return { cam, L: LP.torchIn, actors: a, fx, dof: { focus: dist(cam.pos, R(-0.05, 1.45, -0.7)), cInf: 10 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
shot("puzzled", 1740, 1783, (f) => {
  const cam = mv(f, 1740, 1783, R(0.4, 1.5, -1.6), R(0.25, 1.3, 2.3), R(0.3, 1.45, -1.1), R(0.25, 1.3, 2.3), 42, 40);
  const a = [
    act("mayor", "front", C.MAYOR_NIGHT, RX + 0.2, 2.1, { ...life(f, 7), expr: f < 1756 ? "angry" : "ooh", armR: f >= 1756 ? "temple" : "hip", armL: "hip", capT: q(f * 0.12, 0.2), look: 0.3 }),
    act("capt", "front", C.CAPTAIN, RX + 0.95, 2.9, { ...life(f, 5), expr: f < 1762 ? "angry" : "suspicious", armR: "hold", prop: "lantern", propT: flick(f), look: -0.4, turn: -0.3 }),
    act("baker", "front", C.BAKER, RX - 0.5, 3.0, { ...life(f, 9), expr: "ooh", armR: "torch", prop: "torch", propT: flick(f, 0.3) }),
  ];
  const fx = [glow("g1", R(-0.2, 2.4, 3.05), 1.5, f, 0, 0.6)];
  return { cam, L: LP.torchIn, actors: a, fx, dof: { focus: 3.7, cInf: 6 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 27 he only took what was broken (truck along the bench)
shot("broken", 1783, 1846, (f) => {
  const t = lin(1783, 1846, f), x = lerp(TABLE[0] - 0.75, TABLE[0] + 0.95, smooth(t));
  const cam = { pos: [x + 0.25, 1.35, 0.75], look: [x, 1.12, TABLE[1]], fov: 38, roll: -2 };
  const wob = (s) => q(4 * Math.sin(f * 0.5 + s) * Math.max(0, 1 - ((f - 1783 - s * 18) % 40) / 14), 0.5);
  const fx = [
    { id: "clock", kind: "clock", pos: [TABLE[0] - 0.62, 0.87 + 0.33, TABLE[1]], size: 0.5, t: 0, h: 3.6, k: 1, rot: 0.06 },
    { id: "kettle", kind: "kettle", pos: [TABLE[0] + 0.05, 0.87 + 0.2, TABLE[1] + 0.1], size: 0.44, k: 1, w: wob(1) },
    { id: "chair", kind: "chair", pos: [TABLE[0] + 1.5, 0.5, TABLE[1] + 0.2], size: 0.8, k: 1, rot: 0.05 + 0.02 * Math.sin(f * 0.4) },
    { id: "candle", kind: "candle", pos: [TABLE[0] - 0.25, 0.87 + 0.2, TABLE[1] - 0.25], size: 0.2, t: flick(f) },
    glow("g", [TABLE[0] - 0.25, 1.3, TABLE[1] - 0.2], 1.6, f, 0, 0.7),
  ];
  return { cam, L: LP.candle, actors: [], fx, dof: { focus: 2.1, cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 28 he carried it home
shot("carry", 1846, 1886, (f) => {
  const t = lin(1846, 1886, f), x = lerp(2.6, -1.6, t), z = 26;
  const cam = mv(f, 1846, 1886, [0.9, 0.45, z + 5.2], [x, 1.7, z], [0.4, 0.5, z + 4.6], [x, 1.7, z], 44, 43, (k) => k, 2, 2);
  cam.look = [x - 0.2, 1.75, z];
  const a = [act("thief", "side", TH, x, z, { ...lifeS(f, 3), mode: "sneak", phase: ph(4.2 * t, "sneak"), arm: "carry", prop: "chair", chairBroken: true, expr: "focus" }, { dir: [-1, 0] })];
  const fx = []; smokes(fx, f);
  return { cam, L: LP.night, actors: a, fx, dof: { focus: 5.3, cInf: 4 }, shadow: { c: [0, 0, z], r: 22 } };
});
// 29 mended it by candlelight
shot("mend", 1886, 1934, (f) => {
  const cam = mv(f, 1886, 1934, [TABLE[0] + 0.7, 1.5, 1.3], [TABLE[0] + 0.1, 1.2, -1.7], [TABLE[0] + 0.5, 1.45, 0.75], [TABLE[0] + 0.1, 1.22, -1.7], 38, 36);
  const cyc = ((f - 1886) % 12) / 12, hitF = 1886 + Math.floor((f - 1886) / 12) * 12 + 9;
  const a = [act("thief", "front", TH, TABLE[0] + 0.15, -2.05, { ...life(f, 3, 0.4), expr: "focus", armR: "work", prop: "mallet", propT: q(cyc < 0.75 ? 0.2 + 0.1 * cyc : 0.9, 0.1), wave: q(cyc, 0.08), armL: "work", look: -0.2, headTilt: q(-4 + 2 * Math.sin(cyc * 6.28), 1) })];
  const fx = [
    { id: "kettle", kind: "kettle", pos: [TABLE[0] - 0.05, 0.87 + 0.19, TABLE[1] + 0.2], size: 0.4, k: f < 1915 ? 1 : 0 },
    { id: "candle", kind: "candle", pos: [TABLE[0] - 0.7, 0.87 + 0.2, TABLE[1] + 0.1], size: 0.2, t: flick(f) },
    glow("g", [TABLE[0] - 0.7, 1.32, TABLE[1] + 0.15], 1.8, f, 0, 0.8),
    { id: "chair", kind: "chair", pos: [TABLE[0] + 1.35, 0.5, TABLE[1] + 0.5], size: 0.8, k: 0 },
  ];
  burst(fx, "b", f, hitF, [TABLE[0] - 0.02, 1.25, TABLE[1] + 0.3], 0.45, 5);
  spark(fx, "s", f, 1916, [TABLE[0] + 0.1, 1.35, TABLE[1] + 0.35], 0.45, 14);
  return { cam, L: LP.candle, actors: a, fx, kicks: [1895, 1907, 1919, 1931].map((x) => ({ f: x, a: 0.006 })), dof: { focus: dist(cam.pos, [TABLE[0], 1.2, -1.6]), cInf: 0 }, shadow: { c: R(0, 0, 0), r: 9 } };
});
// 30 and brought it back before morning
shot("bringBack", 1934, 1992, (f) => {
  const cam = mv(f, 1934, 1992, [1.6, 1.2, MDZ + 4.6], [-2.8, 1.1, MDZ], [1.0, 1.25, MDZ + 4.0], [-2.6, 1.15, MDZ], 41, 39);
  const L = lightSeq([[1934, LP.night], [1960, LP.night], [1992, { ...LP.morning, az: -60 }]], f);
  const placed = f >= 1958;
  const xa = lerp(-0.6, -3.3, smooth(lin(1934, 1956, f))), xb = lerp(-3.3, 1.2, easeIn(lin(1962, 1992, f)) * 0.9);
  const a = [placed && f >= 1962
    ? act("thief", "side", TH, xb, MDZ + 0.2, { ...lifeS(f, 3), mode: "sneak", phase: ph(xb + 3.3, "sneak"), arm: "sneak", expr: "sly" }, { dir: [1, 0] })
    : act("thief", "side", TH, xa, MDZ + 0.2, { ...lifeS(f, 3), mode: f < 1956 ? "sneak" : "stand", phase: ph(-0.6 - xa, "sneak"), arm: placed ? "reach" : "carry", prop: placed ? null : "chair", expr: "focus" }, { dir: [-1, 0] })];
  const fx = [];
  if (placed) { fx.push({ id: "chair", kind: "chair", pos: [FX + 0.75, STEPY + 0.5 + 0.05 * Math.max(0, 1 - (f - 1958) / 3), MDZ + 0.1], size: 0.8, k: 0 }); spark(fx, "s", f, 1964, [FX + 0.9, STEPY + 1.0, MDZ + 0.3], 0.5, 14); }
  smokes(fx, f);
  return { cam, L, actors: a, fx, kicks: [{ f: 1959, a: 0.005 }], dof: { focus: 5.8, cInf: 3 }, shadow: { c: [-3, 0, MDZ], r: 16 } };
});
// 31 nobody in that town ever opened the door to a stranger
shot("knock", 1992, 2050, (f) => {
  const cam = mv(f, 1992, 2050, [-0.9, 1.5, DZ + 3.6], [-4.0, 1.3, DZ + 0.1], [-1.3, 1.45, DZ + 3.1], [-4.0, 1.3, DZ + 0.1], 39, 37);
  const knocks = [2002, 2008, 2014, 2028, 2034];
  const kn = knocks.some((k) => f >= k - 2 && f <= k + 1);
  const wait = f >= 2038;
  const a = [wait
    ? act("thief", "front", TH, -3.55, DZ + 0.15, { ...life(f, 3), expr: "sad", armL: "hang", armR: "hang", headTilt: q(-7 * smooth(lin(2038, 2048, f)), 1), look: -0.3 })
    : act("thief", "side", TH, -3.55, DZ + 0.15, { ...lifeS(f, 3), mode: "stand", arm: "reach", expr: "smile", lean0: kn ? 5 : 0 }, { dir: [-1, 0] })];
  const fx = [];
  for (const [i, k] of knocks.entries()) burst(fx, "k" + i, f, k, [FX + 0.25, 1.45, DZ + 0.25], 0.4, 5, "#ffffff");
  return { cam, L: LP.day, actors: a, fx, world: { door: 0 }, kicks: knocks.map((k) => ({ f: k, a: 0.005 })), dof: { focus: 4.4, cInf: 5 }, shadow: { c: [-3, 0, DZ], r: 14 } };
});
shot("alone", 2050, 2108, (f) => {
  const cam = mv(f, 2050, 2108, [0.4, 2.2, -4.5], [0, 1.2, -14], [0.8, 8.5, 3], [0, 0.6, -14], 40, 42, smooth);
  cam.pos = add3(cam.pos, [0, (f - 2050) * 0.004, 0]);
  const a = [act("thief", "front", TH, 0, -14, { ...life(f, 3), expr: "sad", headTilt: -8, look: -0.3 })];
  const fx = []; birds(fx, f - 2050, 2, [-8, 9, -20]); smokes(fx, f);
  return { cam, L: LP.day, actors: a, fx, world: { door: 0 }, dof: { focus: 12, cInf: 0 }, shadow: { c: [0, 0, -12], r: 30 } };
});
// 32 the town held a trial
shot("trial", 2108, 2162, (f) => {
  const cam = mv(f, 2108, 2162, [2.6, 1.7, 6.6], [-1.1, 1.4, 1.0], [2.0, 1.6, 5.8], [-1.1, 1.4, 1.0], 44, 42);
  const a = [
    act("mayor", "front", C.MAYOR, PODIUM[0], PODIUM[1], { ...life(f, 7), expr: "determined", armR: f >= 2124 ? "point" : "hip", armL: "hip", look: 0.5, turn: 0.3 }, { y: 0.77, blob: false }),
    act("thief", "front", TH, -0.5, 1.9, { ...life(f, 3), expr: "worried", armL: "behind", armR: "behind", headTilt: -6, look: -0.5 }),
    act("capt", "front", C.CAPTAIN, -1.0, -0.6, { ...life(f, 5), expr: "angry", armL: "hip", armR: "hip", look: -0.5, turn: -0.3 }),
    act("baker", "front", C.BAKER, -3.0, -1.5, { ...life(f, 9), expr: "suspicious", armL: "hip" }),
  ];
  const fx = []; smokes(fx, f); birds(fx, f - 2108, 2, [-12, 13, -6]);
  return { cam, L: LP.day, actors: a, fx, world: { podium: true }, dof: { focus: 6.3, cInf: 3 }, shadow: { c: [-1, 0, 1], r: 18 } };
});
shot("verdict", 2162, 2224, (f) => {
  const cam = mv(f, 2162, 2224, [-0.9, 1.25, PODIUM[1] + 3.3], [PODIUM[0], 2.05, PODIUM[1]], [-1.2, 1.3, PODIUM[1] + 2.8], [PODIUM[0], 2.08, PODIUM[1]], 38, 36, (t) => t, -3, -3);
  const bang = 2200, think = f < 2188;
  const sw = f >= bang - 5 && f <= bang ? 0.75 : 0.25;
  const a = [act("mayor", "front", C.MAYOR, PODIUM[0], PODIUM[1], { ...life(f, 7, 0.5), expr: think ? "suspicious" : f < bang ? "determined" : "grin", armL: think ? "chin" : "hip", armR: think ? "hip" : "work", prop: think ? null : "mallet", propT: f >= bang - 3 ? 0.9 : 0.15, wave: sw, look: think ? q(Math.sin((f - 2162) * 0.5), 0.5) : 0.3 }, { y: 0.77, blob: false })];
  const fx = [];
  burst(fx, "b", f, bang, [PODIUM[0] + 0.3, 1.5, PODIUM[1] + 0.4], 0.8, 8); spark(fx, "s", f, bang + 2, [PODIUM[0] + 0.6, 2.5, PODIUM[1] + 0.3], 0.5, 14);
  return { cam, L: LP.day, actors: a, fx, world: { podium: true }, kicks: [{ f: bang, a: 0.022 }], dof: { focus: dist(cam.pos, [PODIUM[0], 2.0, PODIUM[1]]), cInf: 9 }, shadow: { c: [-1, 0, 1], r: 18 } };
});
// 34 a workshop on the main street
const SH = HN("shop"), SDZ = doorZ(SH);
const shopThief = { ...C.THIEF_SHOP, mask: "#17151f" };
NAME.set(shopThief, "shopThief");
shot("workshop", 2224, 2308, (f) => {
  const cam = mv(f, 2224, 2308, [3.4, 9.5, SDZ + 13], [FX, 4.5, SDZ], [1.4, 1.75, SDZ + 5.6], [FX + 0.6, 2.2, SDZ], 44, 41, smoother);
  cam.pos = add3(cam.pos, [0, 0, -(f - 2224) * 0.006]);
  const ch = (s) => q(((f * 0.07 + s) % 1), 0.08);
  const a = [
    act("thief", "front", shopThief, -3.5, SDZ + 0.1, { ...life(f, 3), expr: "ooh", armL: "cheek", armR: "cheek" }),
    act("woman", "front", C.WOMAN, -2.9, SDZ + 2.5, { ...life(f, 11), expr: "happy", armR: "wave", wave: ch(0.2), turn: -0.3 }),
    act("baker", "front", C.BAKER, -3.0, SDZ - 2.0, { ...life(f, 9), expr: "grin", armL: "wave", armR: "wave", wave: ch(0.5), bob: q(-8 * Math.abs(Math.sin(f * 0.3)), 1) }),
    act("kid", "front", C.KID, -2.0, SDZ - 0.9, { ...life(f, 13), expr: "happy", armL: "up", armR: "up", bob: q(-12 * Math.abs(Math.sin(f * 0.36)), 1) }),
  ];
  const fx = []; smokes(fx, f); birds(fx, f - 2224, 3, [-12, 12, SDZ - 8]);
  return { cam, L: LP.day, actors: a, fx, world: { sign: true }, dof: { focus: 7, cInf: 0 }, shadow: { c: [-2, 0, SDZ], r: 24 } };
});
shot("sign", 2308, 2360, (f) => {
  const cam = mv(f, 2308, 2360, [0.6, 1.3, SDZ + 2.3], [FX + 0.4, 1.5, SDZ], [0.9, 1.5, SDZ + 2.0], [FX + 0.4, 3.2, SDZ], 44, 40, smoother);
  cam.pos = add3(cam.pos, [(f - 2308) * 0.003, 0, 0]);
  const a = [act("thief", "front", shopThief, -3.5, SDZ + 0.1, { ...life(f, 3), expr: "happy", armR: "wave", wave: q(((f * 0.06) % 1), 0.08), armL: "hip" })];
  const fx = []; spark(fx, "s1", f, 2332, [FX + 0.6, 3.75, SDZ + 1.1], 0.5, 14); spark(fx, "s2", f, 2340, [FX + 0.6, 3.2, SDZ - 1.2], 0.4, 14);
  return { cam, L: LP.day, actors: a, fx, world: { sign: true }, dof: { focus: 5, cInf: 0 }, shadow: { c: [-2, 0, SDZ], r: 18 } };
});
// 36 he never had to steal a broken thing again
shot("happy", 2360, 2412, (f) => {
  const cam = mv(f, 2360, 2412, [-1.6, 1.55, SDZ + 2.9], [-3.45, 1.4, SDZ + 0.1], [-1.9, 1.5, SDZ + 2.3], [-3.45, 1.42, SDZ + 0.1], 34, 32, (t) => t, 2, 2);
  const cyc = ((f - 2360) % 14) / 14;
  const a = [act("thief", "front", shopThief, -3.45, SDZ + 0.1, { ...life(f, 3, 0.5), expr: "soft", armR: "work", armL: "work", prop: "mallet", propT: q(cyc < 0.75 ? 0.25 : 0.9, 0.1), wave: q(cyc, 0.08) })];
  const fx = []; spark(fx, "s", f, 2384, [-3.1, 1.75, SDZ + 0.5], 0.4, 14);
  return { cam, L: LP.warm, actors: a, fx, world: { sign: true }, dof: { focus: dist(cam.pos, [-3.45, 1.4, SDZ + 0.1]), cInf: 9 }, shadow: { c: [-2, 0, SDZ], r: 16 } };
});
shot("customer", 2412, 2458, (f) => {
  const t = lin(2412, 2458, f), x = lerp(0.3, -2.3, smooth(t));
  const cam = mv(f, 2412, 2458, [0.2, 1.3, SDZ + 5.8], [-1.0, 1.25, SDZ + 0.4], [-0.6, 1.3, SDZ + 5.2], [-2.7, 1.25, SDZ + 0.4], 42, 40, smooth);
  cam.pos = add3(cam.pos, [0, 0, -(f - 2412) * 0.004]);
  const a = [
    act("woman", "side", C.WOMAN2, x, SDZ + 0.6, { ...lifeS(f, 21), mode: t < 0.98 ? "walk" : "stand", phase: ph(0.3 - x), arm: "carry", prop: "chair", chairBroken: true, expr: "happy" }, { dir: [-1, 0] }),
    act("thief", "front", shopThief, -3.5, SDZ + 0.1, { ...life(f, 3), expr: "happy", armR: "wave", wave: q(((f * 0.07) % 1), 0.08), turn: 0.4 }),
  ];
  const fx = []; smokes(fx, f);
  return { cam, L: LP.warm, actors: a, fx, world: { sign: true }, dof: { focus: 5.4, cInf: 3 }, shadow: { c: [-2, 0, SDZ], r: 18 } };
});
// 38 people just left them on his step (twist: push-in with roll)
shot("step", 2458, TOTAL, (f) => {
  const cam = mv(f, 2458, TOTAL, [0.9, 1.3, SDZ + 0.7], [FX + 0.6, 0.95, SDZ + 0.1], [-0.9, 0.95, SDZ + 0.4], [FX + 0.6, 0.92, SDZ + 0.1], 42, 39, smooth, 0, 4);
  cam.pos = add3(cam.pos, [-(f - 2458) * 0.002, 0, 0]);
  const kz = lerp(SDZ + 3.4, SDZ + 1.2, smooth(lin(2462, 2486, f))), placed = f >= 2488;
  const a = [
    act("kid", "side", C.KID, FX + 1.05, kz, { ...lifeS(f, 13), mode: f < 2486 ? "run" : "stand", phase: ph(SDZ + 3.4 - kz, "run"), arm: placed ? "reach" : "carry", expr: "happy" }, { dir: [0, -1], visible: f >= 2462 }),
    act("thief", "front", shopThief, -4.25, SDZ - 0.05, { ...life(f, 3), expr: f >= 2500 ? "happy" : "ooh", armL: f >= 2500 ? "cheek" : "hang", armR: f >= 2500 ? "cheek" : "hang", look: 0.4 }, { y: STEPY, blob: false, visible: f >= 2493, pull: 0.02 }),
  ];
  const fx = [
    { id: "chair", kind: "chair", pos: [FX + 0.9, 0.44, SDZ - 0.68], size: 0.7, k: 1, rot: 0.06 },
    { id: "clock", kind: "clock", pos: [FX + 1.05, 0.29, SDZ - 0.12], size: 0.42, t: 0, h: 4.4, k: 1, rot: -0.12 },
    { id: "kettle", kind: "kettle", pos: [FX + 1.1, 0.22, SDZ + 0.3], size: 0.38, k: 1, rot: 0.1 },
  ];
  if (!placed && f >= 2462) fx.push({ id: "box", kind: "box", pos: [FX + 1.05, 0.7, kz - 0.4], size: 0.34, t: 0.4 });
  if (placed) { const pop = back(clamp((f - 2488) / 6)); fx.push({ id: "box", kind: "box", pos: [FX + 1.15, 0.05 + 0.12 * pop, SDZ + 0.68], size: 0.3, t: 0.4 }); }
  burst(fx, "b", f, 2488, [FX + 1.2, 0.3, SDZ + 0.7], 0.5, 7); spark(fx, "s", f, 2504, [FX + 0.9, 1.6, SDZ + 0.5], 0.6, 16);
  return { cam, L: LP.warm, actors: a, fx, world: { sign: true, door: f >= 2489 ? easeOut(lin(2489, 2499, f)) * 0.95 : 0 }, kicks: [{ f: 2488, a: 0.012 }], dof: { focus: 4, cInf: 0 }, shadow: { c: [-2, 0, SDZ], r: 16 } };
});

export const SHOTLIST = SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b }));
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f < s.b) || SHOTS[SHOTS.length - 1];

export const frameState = (f) => {
  const s = shotAt(f), r = s.fn(f);
  const cam = { ...r.cam, pos: [...r.cam.pos], look: [...r.cam.look] };
  const [kx, ky] = kick(f, r.kicks || []);
  if (kx || ky) {
    const d = dist(cam.pos, cam.look), Rr = camRight(cam), U = camUp(cam);
    cam.look = add3(cam.look, [Rr[0] * kx * d + U[0] * ky * d, Rr[1] * kx * d + U[1] * ky * d, Rr[2] * kx * d + U[2] * ky * d]);
  }
  const world = { door: 0, sash: 0, cup: 0, sign: false, podium: false, ...(r.world || {}) };
  return { shot: s.id, cam, light: r.L, actors: r.actors || [], fx: r.fx || [], world, flash: r.flash || 0, vign: r.vign ?? 0.18, dof: r.dof, shadow: r.shadow };
};
