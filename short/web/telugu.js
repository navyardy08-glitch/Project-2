// "అత్త పుట్టింటికి వెళ్ళింది" — 2D shot list, timed to telugu_short/audio/voice.wav (91.0 s) + 3 s tail.
import { SETS, nightTint, blanket } from "./sets.js";
import { drawHuman } from "./human.js";
import * as F from "./family.js";

export const FPS = 30;
const T = (s) => Math.round(s * FPS);
export const TOTAL = T(94.0);
let ENV = [];
export async function init() { ENV = await (await fetch("./tel_env.json")).json(); await document.fonts.load("bold 64px 'Noto Sans Telugu'"); }

// ------------------------------------------------------------------ helpers
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lin = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 3;
const TALK = {
  atta: [[9.7, 17.35], [66.0, 71.0]], kodalu: [[17.65, 21.45], [54.85, 58.6]],
  mama: [[43.55, 46.5]], koduku: [[46.7, 50.0]],
};
const talk = (who, f) => (TALK[who].some(([a, b]) => f >= T(a) && f <= T(b)) ? Math.pow(ENV[f] || 0, 0.8) : 0);
const blink = (f, seed) => ((f + seed * 37) % (96 + seed * 7)) < 4;
const nod = (f, s = 0, a = 0.04) => a * Math.sin(f * 0.21 + s);
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function put(g, def, x, foot, sc, o = {}, flip = false, bob = 0) {
  g.save(); g.translate(x, foot + bob); g.scale(flip ? -sc : sc, sc); g.translate(-300, -975); drawHuman(g, def, o); g.restore();
}
function lying(g, def, x, y, sc, o = {}) {
  g.save(); g.translate(x, y); g.rotate(-Math.PI / 2); g.scale(sc, sc); g.translate(-300, -560); drawHuman(g, def, { ...o, tilt: 0 }); g.restore();
}
let CUR = 0;   // current frame, for the operator's gentle hand-held float
function cam(g, cx, cy, z, rot = 0) {
  const fl = CUR * 0.045;
  cx += 5 * Math.sin(fl * 1.3) + 3 * Math.sin(fl * 2.9 + 1.0); cy += 4 * Math.sin(fl * 1.7 + 2.0) + 2 * Math.sin(fl * 3.7);
  z *= 1 + 0.006 * Math.sin(fl * 0.9 + 0.5); rot += 0.0025 * Math.sin(fl * 1.1 + 1.5);
  const hw = 540 / z, hh = 960 / z;
  cx = clamp(cx, hw, 1080 - hw); cy = clamp(cy, hh, 1920 - hh);
  g.setTransform(1, 0, 0, 1, 0, 0); g.translate(540, 960); g.rotate(rot); g.scale(z, z); g.translate(-cx, -cy);
}
function shake(f, amp) { return [amp * (rnd(f) - 0.5) * 2, amp * (rnd(f + 99) - 0.5) * 2]; }
const circle = (g, x, y, r, fill, lw = 0) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = "#3b2216"; g.stroke(); } };
function puffs(g, x, y, t, n = 6, col = "rgba(255,255,255,0.85)", spread = 40, rise = 260) {
  for (let i = 0; i < n; i++) { const u = (t * 0.6 + i / n) % 1; circle(g, x + Math.sin(i * 2.3 + u * 4) * spread * u, y - rise * u, 18 + 46 * u, col.replace(/[\d.]+\)$/, `${(1 - u) * 0.85})`)); }
}
function zzz(g, x, y, t) {
  g.fillStyle = "#3b5a9a"; g.font = "bold 64px sans-serif";
  for (let i = 0; i < 3; i++) { const u = (t * 0.5 + i / 3) % 1; g.globalAlpha = 1 - u; g.fillText("z", x + u * 80, y - u * 160 - i * 6); }
  g.globalAlpha = 1;
}
function sparkle(g, x, y, s, a = 1) {
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s); g.beginPath();
  for (let k = 0; k < 8; k++) { const r = k % 2 ? 10 : 34, ang = k * Math.PI / 4; g.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
  g.closePath(); g.fillStyle = "#ffe27a"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#3b2216"; g.stroke(); g.restore();
}
function heart(g, x, y, s, a = 1) {
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 30);
  g.bezierCurveTo(-60, -10, -30, -55, 0, -22); g.bezierCurveTo(30, -55, 60, -10, 0, 30); g.fillStyle = "#e8445a"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#3b2216"; g.stroke(); g.restore();
}
const walk = (f, k = 0.38) => -Math.abs(Math.sin(f * k)) * 12;

// character presets
const SC = 1.25, FOOT = 1780;
const A = (o) => ({ ...o }); // readability

// ------------------------------------------------------------------ shots
const SHOTS = [];
const shot = (a, b, draw, opt = {}) => SHOTS.push({ a: T(a), b: T(b), draw, ...opt });

// 1 bus stand: atta walks to the bus with her bag, kodalu waves
shot(0, 2.75, (g, f, t) => {
  cam(g, 560 + t * 10, 980, 1.0 + t * 0.02);
  SETS.busStand(g, { busX: -90 });
  const ax = lerp(700, 470, smooth(lin(0, 2.4, t)));
  put(g, F.ATTA, ax, FOOT, SC, { expr: "neutral", propR: "bag", armL: "down", blink: blink(f, 1) }, true, t < 2.4 ? walk(f) : 0);
  put(g, F.KODALU, 880, FOOT + 10, SC, { expr: "happy", armR: Math.floor(f / 7) % 2 ? "wave" : "up", blink: blink(f, 2) });
});
// 2 hall: kodalu dances
const dance = (g, f, t) => {
  cam(g, 540, 900, 1.25);
  SETS.hall(g, {});
  const ph = Math.floor(f / 8) % 4;
  put(g, F.KODALU, 540 + Math.sin(f * 0.2) * 30, FOOT, SC, { expr: "happy", armL: ph % 2 ? "up" : "hip", armR: ph % 2 ? "hip" : "up", tilt: 0.1 * Math.sin(f * 0.4) }, false, walk(f, 0.4) * 1.6);
  if (t > 0.3) for (let i = 0; i < 3; i++) sparkle(g, 300 + i * 240, 520 + 60 * Math.sin(f * 0.3 + i), 0.8, 0.5 + 0.5 * Math.sin(f * 0.5 + i));
};
shot(2.75, 5.6, dance, { whip: true });
// 3 freeze-frame on "కానీ..." (record scratch)
shot(5.6, 7.6, null, { freeze: { from: dance, f: T(5.55), z0: 1.0, z1: 1.18 } });
// 4 kitchen: day two, kodalu crying, smoke
shot(7.6, 9.65, (g, f, t) => {
  const [sx, sy] = shake(f, 4);
  cam(g, 620 + sx, 820 + sy, 1.65 - t * 0.04);
  SETS.kitchen(g, { flame: true, milkOver: true });
  puffs(g, 460, 760, t, 7, "rgba(90,90,90,0.8)", 60, 420);
  put(g, F.KODALU, 760, FOOT, SC, { expr: "sad", armL: "cheek", armR: "cheek" });
});
// 5 bus stand two-shot: atta instructs
shot(9.65, 13.1, (g, f, t) => {
  cam(g, 620 + t * 6, 820, 1.35);
  SETS.busStand(g, { busX: -90 });
  put(g, F.ATTA, 470, FOOT, SC, { expr: "angry", armR: "point", propL: "bag", talk: talk("atta", f), blink: blink(f, 1) }, true);
  put(g, F.KODALU, 860, FOOT + 10, SC, { expr: "neutral", armL: "fold", armR: "fold", tilt: nod(f), blink: blink(f, 2), look: -0.6 });
});
// 6 atta close-up, counting on her fingers
shot(13.1, 17.4, (g, f, t) => {
  cam(g, 470, 700, 2.0 + t * 0.03);
  SETS.busStand(g, { busX: -90 });
  put(g, F.ATTA, 470, FOOT, SC, { expr: t < 2.2 ? "neutral" : "angry", armR: Math.floor(t / 1.1) % 2 ? "up" : "point", talk: talk("atta", f), blink: blink(f, 1) }, true);
});
// 7 kodalu close-up: sweet reply
shot(17.4, 21.6, (g, f, t) => {
  cam(g, 860, 710, 1.95 - t * 0.02);
  SETS.busStand(g, { busX: -90 });
  put(g, F.KODALU, 860, FOOT + 10, SC, { expr: t < 0.4 ? "shock" : "neutral", armL: "fold", armR: "fold", talk: talk("kodalu", f), blink: blink(f, 2), tilt: nod(f, 1, 0.05) });
});
// 8 the bus leaves; kodalu waves bye
shot(21.6, 24.3, (g, f, t) => {
  cam(g, 540, 980, 1.0);
  SETS.busStand(g, { busX: lerp(-90, 1250, Math.pow(lin(0.2, 2.5, t), 1.6)) });
  puffs(g, lerp(-90, 1250, Math.pow(lin(0.2, 2.5, t), 1.6)) - 20, 1200, t * 2, 5, "rgba(200,190,170,0.8)", 30, 120);
  put(g, F.KODALU, 760, FOOT + 10, SC, { expr: "happy", armR: Math.floor(f / 6) % 2 ? "wave" : "up", blink: blink(f, 2) });
}, { whip: true });
// 9 kodalu alone: sly grin, then punch-in "ఇల్లు నాదే!"
shot(24.3, 28.2, (g, f, t) => {
  const pun = t > 1.6;
  cam(g, 760, pun ? 690 : 760, pun ? 2.35 : 1.6);
  SETS.busStand(g, {});
  put(g, F.KODALU, 760, FOOT + 10, SC, { expr: pun ? "happy" : "sly", armL: pun ? "up" : "hip", armR: pun ? "up" : "hip", blink: !pun && blink(f, 2) }, false, pun ? walk(f, 0.5) : 0);
  if (pun) for (let i = 0; i < 4; i++) sparkle(g, 560 + i * 140, 560 + 40 * Math.sin(f * 0.4 + i), 0.6, 0.8);
});
// 10 first day: still asleep at nine
shot(28.2, 31.0, (g, f, t) => {
  cam(g, 520, 1000 - t * 8, 1.15 + t * 0.03);
  SETS.bedroom(g, { hour: 9 });
  lying(g, F.KODALU, 610, 1015, 0.9, { expr: "neutral", blink: true });
  blanket(g, "#e8708e");
  zzz(g, 300, 900, t);
}, { whip: true });
// 11 maggie for lunch
shot(31.0, 33.7, (g, f, t) => {
  cam(g, 600, 820, 1.55);
  SETS.kitchen(g, {});
  put(g, F.KODALU, 600, FOOT, SC, { expr: t < 0.9 ? "neutral" : "happy", armR: "hold", propR: "bowl", armL: "hip", blink: blink(f, 2) });
  puffs(g, 640, 860, t, 4, "rgba(255,255,255,0.7)", 20, 160);
});
// 12 remote in hand, TV flicking channels
shot(33.7, 35.75, (g, f, t) => {
  cam(g, 620, 880, 1.25);
  const tv = ["#3d5a80", "#c8452f", "#3f8f5a", "#e8a22c"][Math.floor(f / 9) % 4];
  SETS.hall(g, { tv });
  put(g, F.KODALU, 360, FOOT, SC, { expr: "sly", armR: "point", propR: "remote", armL: "hip", blink: blink(f, 2) }, true);
});
// 13 second day: the milk boils over
shot(35.75, 38.7, (g, f, t) => {
  const [sx, sy] = shake(f, 6);
  cam(g, 660 + sx, 900 + sy, 1.35);
  SETS.kitchen(g, { flame: true, milkOver: t > 0.6 });
  if (t > 0.6) puffs(g, 640, 820, t, 5, "rgba(255,255,255,0.8)", 30, 200);
  put(g, F.KODALU, 900, FOOT, SC, { expr: "shock", armL: "cheek", armR: "cheek" }, true);
}, { whip: true });
// 14 the cooker whistles… and whistles
shot(38.7, 41.5, (g, f, t) => {
  const [sx, sy] = shake(f, 3);
  cam(g, 470 + sx, 820 + sy, 2.3);
  SETS.kitchen(g, { flame: true });
  const w = (t % 0.7) / 0.7;
  if (w < 0.5) puffs(g, 460, 720, w * 2, 6, "rgba(255,255,255,0.9)", 25, 240);
  put(g, F.KODALU, 760, FOOT, SC, { expr: Math.floor(t / 0.7) % 2 ? "shock" : "sad", armL: "cheek", armR: "down" }, true);
});
// 15 the dal burns: black smoke, coughing
shot(41.5, 43.5, (g, f, t) => {
  cam(g, 600, 820, 1.5);
  SETS.kitchen(g, { flame: true, milkOver: true });
  puffs(g, 460, 760, t, 9, "rgba(60,60,60,0.85)", 90, 520);
  put(g, F.KODALU, 780, FOOT + Math.sin(f * 0.9) * 4, SC, { expr: "sad", armL: "cheek", armR: "down", blink: true });
});
// 16 mamagaru: where is my BP tablet?
shot(43.5, 46.65, (g, f, t) => {
  cam(g, 400, 720, 1.85 + t * 0.03);
  SETS.hall(g, { mess: true });
  put(g, F.MAMAGARU, 400, FOOT, SC, { expr: "sad", armL: "cheek", talk: talk("mama", f), blink: blink(f, 3) });
});
// 17 koduku: shirt not ironed! (with a quick reaction cut to kodalu)
shot(46.65, 48.85, (g, f, t) => {
  cam(g, 700, 760, 1.7);
  SETS.hall(g, { mess: true });
  put(g, F.KODUKU, 700, FOOT, SC, { expr: "angry", armR: "hold", propR: "shirt", armL: "hip", talk: talk("koduku", f), blink: blink(f, 4) });
});
shot(48.85, 49.45, (g, f, t) => {
  cam(g, 540, 700, 2.4);
  SETS.hall(g, { mess: true });
  put(g, F.KODALU, 540, FOOT, SC, { expr: "shock", armL: "cheek", armR: "cheek" });
});
shot(49.45, 50.3, (g, f, t) => {
  cam(g, 700, 740, 1.8);
  SETS.hall(g, { mess: true });
  put(g, F.KODUKU, 700, FOOT, SC, { expr: "angry", armR: "hold", propR: "shirt", armL: "point", talk: talk("koduku", f) });
});
// 18 the tulasi has wilted
shot(50.3, 52.3, (g, f, t) => {
  cam(g, 540, 1080, 1.2 + t * 0.06);
  SETS.tulasi(g, { wilt: smooth(lin(0, 1.2, t)) });
});
// 19 the whole house in a mess
shot(52.3, 54.75, (g, f, t) => {
  cam(g, 540, 1000, 1.0 + t * 0.03);
  SETS.hall(g, { mess: true });
  put(g, F.MAMAGARU, 200, FOOT - 40, SC * 0.95, { expr: "sad", blink: blink(f, 3) });
  put(g, F.KODUKU, 880, FOOT - 40, SC * 0.95, { expr: "angry", armL: "hip", propR: "shirt", armR: "hold", blink: blink(f, 4) }, true);
  put(g, F.KODALU, 540, FOOT + 40, SC, { expr: "sad", armL: "cheek", armR: "cheek" });
});
// 20 crying on the phone to atta
shot(54.75, 59.3, (g, f, t) => {
  cam(g, 540, 700, 1.8 + t * 0.06);
  SETS.hall(g, { mess: true });
  put(g, F.KODALU, 540, FOOT, SC, { expr: "sad", armR: "phone", propR: "phone", armL: "down", talk: talk("kodalu", f), blink: blink(f, 2) }, false, Math.sin(f * 0.8) * 2);
});
// 21 the call ends
shot(59.3, 61.2, (g, f, t) => {
  cam(g, 540, 880, 1.3);
  SETS.hall(g, { mess: true });
  put(g, F.KODALU, 540, FOOT, SC, { expr: "sad", armR: t < 0.6 ? "phone" : "down", propR: "phone", blink: blink(f, 2) });
});
// 22 knock knock
shot(61.2, 63.15, (g, f, t) => {
  const knock = [61.28, 61.5].some((k) => f >= T(k) && f < T(k) + 4);
  cam(g, 540 + (knock ? 6 : 0), 960, 1.05);
  SETS.frontDoor(g, { open: 0 });
  put(g, F.KODALU, 900, FOOT + 60, SC * 1.05, { expr: t > 0.3 ? "shock" : "sad", look: -1 }, true);
}, { whip: true });
// 23 the door opens… atta with her bag
shot(63.15, 66.0, (g, f, t) => {
  cam(g, 540, 900, 1.1 + t * 0.06);
  SETS.frontDoor(g, { open: easeOut(lin(0, 0.6, t)) });
  put(g, F.ATTA, 540, FOOT - 120, SC * 0.95, { expr: t > 1.0 ? "happy" : "neutral", propR: "bag", blink: blink(f, 1) });
  put(g, F.KODALU, 960, FOOT + 80, SC * 1.1, { expr: "shock", armL: "cheek", armR: "cheek" }, true);
});
// 24 atta: "I knew it"
shot(66.0, 69.3, (g, f, t) => {
  cam(g, 540, 600, 1.95);
  SETS.frontDoor(g, { open: 1 });
  put(g, F.ATTA, 540, FOOT - 120, SC * 0.95, { expr: "neutral", propR: "bag", armL: "hip", talk: talk("atta", f), blink: blink(f, 1), tilt: nod(f, 2, 0.03) });
});
// 25 kodalu's teary smile
shot(69.3, 71.25, (g, f, t) => {
  cam(g, 540, 700, 2.1);
  SETS.hall(g, {});
  put(g, F.KODALU, 540, FOOT, SC, { expr: t < 0.9 ? "sad" : "happy", armL: "fold", armR: "fold" });
});
// 26 flashback: atta awake at night in her mother's house
shot(71.25, 76.4, (g, f, t) => {
  cam(g, 520, 980, 1.2 + t * 0.04);
  SETS.bedroom(g, { night: true, hour: 2 });
  lying(g, F.ATTA, 610, 1015, 0.9, { expr: "sad", blink: blink(f, 1) && t > 1 });
  blanket(g, "#8e1f3b");
  nightTint(g, 0.35);
});
// 27 atta at the window, thinking of her kodalu
shot(76.4, 80.7, (g, f, t) => {
  cam(g, 600, 760, 1.45 + t * 0.03);
  SETS.bedroom(g, { night: true, hour: 3 });
  put(g, F.ATTA, 520, FOOT, SC, { expr: "sad", armL: "cheek", blink: blink(f, 1) });
  nightTint(g, 0.3);
  const k = easeOut(lin(0.4, 1.2, t));
  if (k > 0) {
    g.save(); g.globalAlpha = k;
    circle(g, 560, 600, 14 * k, "#fff", 3); circle(g, 600, 540, 22 * k, "#fff", 3);
    g.beginPath(); g.ellipse(720, 380, 190 * k, 150 * k, 0, 0, 7); g.fillStyle = "#fffaf0"; g.fill(); g.lineWidth = 5; g.strokeStyle = "#3b2216"; g.stroke();
    g.save(); g.beginPath(); g.ellipse(720, 380, 180 * k, 140 * k, 0, 0, 7); g.clip();
    put(g, F.KODALU, 720, 380 + 790 * 0.95 * k, 0.95 * k, { expr: "sad" }); g.restore(); g.restore();
  }
});
// 28 that night: cooking together
shot(80.7, 84.0, (g, f, t) => {
  cam(g, 560, 860, 1.3);
  SETS.kitchen(g, { flame: true });
  puffs(g, 590, 820, t, 5, "rgba(255,255,255,0.75)", 25, 220);
  put(g, F.ATTA, 380, FOOT, SC, { expr: "happy", armR: "hold", propR: "ladle", blink: blink(f, 1) }, true);
  put(g, F.KODALU, 780, FOOT, SC, { expr: "happy", armL: "hold", blink: blink(f, 2) });
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "rgba(255,170,80,0.10)"; g.fillRect(0, 0, 1080, 1920);
}, { whip: true });
// 29 the dal is perfect this time
shot(84.0, 86.15, (g, f, t) => {
  cam(g, 580, 720, 1.75);
  SETS.kitchen(g, { flame: true });
  put(g, F.ATTA, 400, FOOT, SC, { expr: "happy", armR: "hold", propR: "ladle" }, true);
  put(g, F.KODALU, 760, FOOT, SC, { expr: "happy", armL: "hold" });
  sparkle(g, 590, 740, 0.9 * easeOut(lin(0.3, 0.8, t)));
  heart(g, 580, 420 - t * 40, 1.0 * easeOut(lin(0.8, 1.3, t)), 1 - lin(1.6, 2.1, t));
});
// 30 moral: the whole family together
shot(86.15, 94.0, (g, f, t) => {
  cam(g, 540, 960, Math.max(1.0, 1.35 - t * 0.07));
  SETS.hall(g, {});
  put(g, F.MAMAGARU, 170, FOOT - 30, SC * 0.9, { expr: "happy", blink: blink(f, 3) });
  put(g, F.KODUKU, 910, FOOT - 30, SC * 0.9, { expr: "happy", armL: "hip", blink: blink(f, 4) }, true);
  put(g, F.ATTA, 400, FOOT + 30, SC, { expr: "happy", armR: "wave", blink: blink(f, 1) }, true);
  put(g, F.KODALU, 680, FOOT + 30, SC, { expr: "happy", armR: "wave", blink: blink(f, 2) });
  for (let i = 0; i < 3; i++) heart(g, 300 + i * 240, 380 - ((t * 60 + i * 70) % 260), 0.6, 0.7);
});

export const SHOTLIST = SHOTS.map((s) => ({ a: s.a, b: s.b }));

// ------------------------------------------------------------------ frame renderer
const off = document.createElement("canvas"); off.width = 1080; off.height = 1920;
const tmp = document.createElement("canvas"); tmp.width = 1080; tmp.height = 1920;
function drawShot(g, s, f) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, 1080, 1920);
  if (s.freeze) {
    const o = off.getContext("2d"); s.freeze.from(o, s.freeze.f, (s.freeze.f - T(2.75)) / FPS); o.setTransform(1, 0, 0, 1, 0, 0);
    const u = (f - s.a) / (s.b - s.a), z = lerp(s.freeze.z0, s.freeze.z1, easeOut(u));
    g.filter = "grayscale(0.85) contrast(1.1)"; g.translate(540, 760); g.scale(z, z); g.translate(-540, -760); g.drawImage(off, 0, 0); g.filter = "none";
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(255,255,255,${0.6 * (1 - clamp(u * 8))})`; g.fillRect(0, 0, 1080, 1920);
    return;
  }
  s.draw(g, f, (f - s.a) / FPS);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (s.whip && f - s.a < 5) {   // whip-pan in: horizontal smear that settles
    const k = 1 - (f - s.a) / 5, tg = tmp.getContext("2d");
    tg.clearRect(0, 0, 1080, 1920); tg.drawImage(g.canvas, 0, 0);
    g.globalAlpha = 0.22; for (let i = -4; i <= 4; i++) g.drawImage(tmp, i * 60 * k + 120 * k, 0); g.globalAlpha = 1;
  }
}
export function renderTo(g, f) {
  CUR = f;
  const s = SHOTS.find((x) => f >= x.a && f < x.b) || SHOTS[SHOTS.length - 1];
  drawShot(g, s, f);
  // soft vignette for a filmic finish
  g.setTransform(1, 0, 0, 1, 0, 0);
  const v = g.createRadialGradient(540, 960, 600, 540, 960, 1250); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(30,15,5,0.28)");
  g.fillStyle = v; g.fillRect(0, 0, 1080, 1920);
}
