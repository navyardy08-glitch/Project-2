// Our own flat 2D cartoon cast (riflemen, officer, townsfolk, kid, parent) + 2D effects, drawn on a canvas.
// Construction v2 (characters.md, our own cast): superellipse heads (pointed crown 1.75 / full jaw 2.3, chin taper,
// seeded side bulge + tilt), bean torsos, single-stroke limbs with ink-dot hands, a thick-thin plum outline weighted
// away from the light, soft painted crescents, deadpan lidded eyes, no blush, no catchlights.
// Design space 600 x 1000 units (soles at y = 975); the canvas transform scales it.
export const INK = "#241726";
export const SKIN = "#ffe2c2";
const WHITE = "#ffffff";
const MOUTH = "#5a1e28";
const TONGUE = "#e86e78";
                                   
const SH_SKIN     = [0.96, 0.86, 0.84]; // measured shadow/lit ratio on skin heads
const SH_CLOTH     = [0.64, 0.66, 0.74]; // torsos: lit side -> far side ~0.65
const SH_FELT     = [0.62, 0.62, 0.7];

                                              
                      
                                                                                                                             
                                                                                                                                
                
  
                           

const rad = (d        ) => (d * Math.PI) / 180;
const clamp = (x        , a        , b        ) => Math.max(a, Math.min(b, x));
export const mul = (c        , m    ) => {
  const n = parseInt(c.slice(1), 16);
  const ch = (v        , k        ) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255, m[0])}${ch((n >> 8) & 255, m[1])}${ch(n & 255, m[2])}`;
};
export const shade = (c        , k        ) => mul(c, [k, k, k]);
export const mix = (a        , b        , t        ) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s        ) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t).toString(16).padStart(2, "0");
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};
/** deterministic per-character random in [0, 1) */
const rnd = (seed        , k        ) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const rotPts = (pts      , a        , cx        , cy        )       =>
  pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const rotAbout = (q    , a        , c    )     => rotPts([q], a, c[0], c[1])[0];
const lerp2 = (a    , b    , t        )     => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** smooth curve from a through (near) k to b, as a polyline */
const curve = (a    , k    , b    , n = 10)       => {
  const c     = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out       = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = 1 - t;
    out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]);
  }
  return out;
};

export const RIFLEMAN         = { jacket: "#357650", pants: "#3d4440", boots: INK, hat: "shako", belt: "#f1efe6", buttons: "#d9dde0", rifle: true };
export const OFFICER         = { ...RIFLEMAN, hat: "shako_tall", buttons: "#e8c45a", sash: "#c0353a", sword: true, moustache: "#4a3020", rifle: false, belt: null, build: "stout" };
export const KID         = { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#e2453c", build: "kid" };
export const PARENT         = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#5a3b2a" };
export const SKINS = [SKIN, "#f5c9a0", "#ecd0b6", "#c99067"];

export const soldier = (v = 0, extra                  = {})         => {
  const o         = { ...RIFLEMAN, skin: SKINS[v % 4] };
  if (v % 4 === 1) o.moustache = "#4a3426";
  if (v % 4 === 3) o.moustache = "#2a201a";
  return { ...o, ...extra };
};

export const townsfolk = (v = 0)         => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"];
  const o         = { jacket: coats[v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "tophat" };
};

export class Pen {
  g                          ;
  ol = 12;
  /** [angle, cx, cy] rotation about (cx, cy), optional post-translation [.., dx, dy] */
  rot                  = null;
  constructor(g                          ) { this.g = g; }
  P(x        , y        )     {
    if (!this.rot) return [x, y];
    const r = this.rot, a = r[0], cx = r[1], cy = r[2], dx = r.length > 3 ? r[3] : 0, dy = r.length > 4 ? r[4] : 0, c = Math.cos(a), s = Math.sin(a);
    return [cx + (x - cx) * c - (y - cy) * s + dx, cy + (x - cx) * s + (y - cy) * c + dy];
  }
  path(pts      , close         ) {
    const g = this.g;
    g.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.P(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close) g.closePath();
  }
  /** filled shape with an ink outline; fill=null draws the outline only */
  poly(pts      , fill               , ol         ) {
    const g = this.g, w = ol ?? this.ol;
    this.path(pts, true);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (w) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
  }
  ell(cx        , cy        , rx        , ry        , fill               , ol         , a0 = 0, a1 = 360, rot = 0) {
    this.poly(ellPts(cx, cy, rx, ry, a0, a1, rot), fill, ol);
  }
  /** thick round-capped limb with an ink rim (effects, rope) */
  line(pts      , fill        , w        , ink = true) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    if (ink) { this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * this.ol * 0.9; g.stroke(); }
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  stroke(pts      , w        , fill = INK) {
    const g = this.g;
    g.lineCap = "round"; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
  }
  arc(cx        , cy        , rx        , ry        , a0        , a1        , w        , fill = INK) {
    const pts       = [];
    for (let i = 0; i <= 24; i++) pts.push([cx + rx * Math.cos(rad(a0 + ((a1 - a0) * i) / 24)), cy + ry * Math.sin(rad(a0 + ((a1 - a0) * i) / 24))]);
    this.stroke(pts, w, fill);
  }
  dot(cx        , cy        , r        , fill = INK) {
    const [x, y] = this.P(cx, cy);
    this.g.beginPath(); this.g.arc(x, y, r, 0, Math.PI * 2); this.g.fillStyle = fill; this.g.fill();
  }
  /** draw with a closed shape as clip */
  clip(pts      , fn            ) { const g = this.g; g.save(); this.path(pts, true); g.clip(); fn(); g.restore(); }
  /** flat fill + soft crescent on the side away from the light (light = canvas angle the light comes FROM).
   *  Radial ramp centred `shift` R toward the light: flat out to ~0.6 R on the far side, full shadow by ~0.8 R. */
  shadedFill(pts      , base        , shadow        , light        , R        , shift = 0.45, r0 = 1.05, r1 = 1.25) {
    const g = this.g, n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const [gx, gy] = this.P(cx + Math.cos(light) * shift * R, cy + Math.sin(light) * shift * R);
    const gr = g.createRadialGradient(gx, gy, 0, gx, gy, r1 * R);
    gr.addColorStop(0, base); gr.addColorStop(r0 / r1, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** broad gradient across a shape along the light: lit edge = base, far edge = shadow (torsos, coats) */
  gradFill(pts      , base        , shadow        , light        , flat = 0.22) {
    const g = this.g, dx = Math.cos(light), dy = Math.sin(light), n = pts.length;
    let cx = 0, cy = 0, lo = Infinity, hi = -Infinity;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; const d = x * dx + y * dy; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    const dc = cx * dx + cy * dy;
    const [ax, ay] = this.P(cx + dx * (hi - dc), cy + dy * (hi - dc)), [bx, by] = this.P(cx + dx * (lo - dc), cy + dy * (lo - dc));
    const gr = g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, base); gr.addColorStop(flat, base); gr.addColorStop(1, shadow);
    this.path(pts, true); g.fillStyle = gr; g.fill();
  }
  /** thick-thin ink ring: w(θ) = w0 (1 + k cos(θ − thick)), θ from the contour centroid (canvas angles) */
  inkRing(pts      , w0        , thick        , k = 0.45, col = INK) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x / n; cy += y / n; }
    const out       = [], inn       = [];
    pts.forEach((q, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      let nx = b[1] - a[1], ny = a[0] - b[0]; // outward normal for clockwise-on-screen contours
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const h = 0.5 * w0 * (1 + k * Math.cos(Math.atan2(q[1] - cy, q[0] - cx) - thick));
      out.push([q[0] + nx * h, q[1] + ny * h]); inn.push([q[0] - nx * h, q[1] - ny * h]);
    });
    const g = this.g;
    const trace = (r      ) => { r.forEach(([x0, y0], i) => { const [x, y] = this.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
    g.beginPath(); trace(out); trace(inn.reverse());
    g.fillStyle = col; g.fill("evenodd");
  }
  /** flat strap with a thin ink rim (cross belts, sash, rifle, handles) */
  band(pts      , fill        , w        , rim        , cap                = "butt") {
    const g = this.g; g.lineCap = cap; g.lineJoin = "round";
    this.path(pts, false); g.strokeStyle = INK; g.lineWidth = w + 2 * rim; g.stroke();
    this.path(pts, false); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
    g.lineCap = "round";
  }
}

const ellPts = (cx        , cy        , rx        , ry        , a0 = 0, a1 = 360, rot = 0, n = 48)       => {
  const r = rad(rot), pts       = [];
  for (let i = 0; i <= n; i++) {
    const a = rad(a0 + ((a1 - a0) * i) / n), x = rx * Math.cos(a), y = ry * Math.sin(a);
    pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
  }
  return pts;
};

const rrect = (x0        , y0        , x1        , y1        , r        , n = 8)       => {
  const pts       = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};

/** tapered stroke, thick end at a: brows, moustache halves */
const taper = (p     , a    , b    , wa        , wb        , col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2],
    [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

// ---------------- contours ----------------
                                                                                                                                             

/** superellipse "bean": separate crown / jaw exponents, egg taper (neg = narrower chin), one-side bulge, soft noise.
 *  Points run right -> down -> left -> up (clockwise on screen). */
export const blobPts = (cx        , cy        , B      , n = 72)       => {
  const ph = [rnd(B.seed, 11), rnd(B.seed, 12), rnd(B.seed, 13)].map((v) => v * Math.PI * 2);
  const pts       = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2 / (s < 0 ? B.nTop : B.nBot);
    let X = Math.sign(c) * Math.abs(c) ** e;
    const Y = Math.sign(s) * Math.abs(s) ** e;
    X *= (1 + B.egg * Y) * (1 + B.asym * Math.sign(X));
    const r = 1 + B.noise * (Math.cos(2 * t + ph[0]) + 0.7 * Math.cos(3 * t + ph[1]) + 0.5 * Math.cos(4 * t + ph[2]));
    const x = B.a * X * r, y = B.b * Y * r;
    pts.push([cx + x * Math.cos(B.rot) - y * Math.sin(B.rot), cy + x * Math.sin(B.rot) + y * Math.cos(B.rot)]);
  }
  return pts;
};

/** measured head: H/W 0.94, slightly pointed crown (1.75), fuller jaw (2.3), chin taper -0.12, 8 % bulge to the facing side */
export const headBlob = (seed        , a = 118, facing = 0)       => ({
  a, b: a * (0.94 + 0.08 * (rnd(seed, 1) - 0.5)),
  nTop: 1.75 + 0.3 * (rnd(seed, 2) - 0.5), nBot: 2.3 + 0.3 * (rnd(seed, 3) - 0.5),
  egg: -0.12 + 0.06 * (rnd(seed, 4) - 0.5),
  asym: (0.06 + 0.04 * rnd(seed, 5)) * (facing || (rnd(seed, 6) < 0.5 ? -1 : 1)),
  rot: rad(8 * (rnd(seed, 7) - 0.5)), noise: 0.008, seed,
});

/** thickest outline direction: away from the light, pulled toward the ground (64 deg measured for upper-left light) */
export const thickAngle = (light        ) => Math.atan2(-Math.sin(light) + 0.8, -Math.cos(light));
const DEF_LIGHT = rad(-120);

// ---------------- faces ----------------
                                                                                                                                
                                                 
                                                                                                               
                                                                                                                            
/** eyes [back, front], brows [inner, outer] offsets in u (+ = down), mouth kind */
const FACE                                                                             = {
  neutral: { eye: ["lid", "lid"], brow: [0, -1], mouth: "dash" },
  stern: { eye: ["lid", "lid"], brow: [3, -2], mouth: "frown" },
  grin: { eye: ["happy", "happy"], brow: [-3, -3], mouth: "grin" },
  laugh: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  whistle: { eye: ["dash", "dash"], brow: [-2, -4], mouth: "o" },
  nervous: { eye: ["small", "small"], brow: [-3, 2], mouth: "wave" },
  shock: { eye: ["shock", "shock"], brow: [-7, -6], mouth: "O" },
  relief: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  relief_open: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "grin" },
  dazed: { eye: ["spiral", "spiral"], brow: [-3, 2], mouth: "wave" },
  pained: { eye: ["squeeze", "lid"], brow: [-3, 2], mouth: "teeth" },
  smile: { eye: ["dot", "dot"], brow: [0, -1], mouth: "smirk" },
  smile_closed: { eye: ["happy", "happy"], brow: [0, -1], mouth: "smile" },
  lick: { eye: ["dot", "dot"], brow: [0, -1], mouth: "lick" },
};
const halfLid = (k      )       => (k === "dot" || k === "small" ? "lid" : k === "lid" ? "slit" : k === "shock" ? "shockHalf" : k);
const eyeKind = (k      , lid        )       =>
  lid >= 1 && k !== "happy" && k !== "squeeze" && k !== "spiral" ? "dash" : lid > 0 ? halfLid(k) : k;
const lidOf = (b                              ) => (b === true ? 1 : Number(b) || 0);

const eye = (p     , kind      , x        , ey        , u        , side        , look        , skin        ) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 3.8 * u, 5.5 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3 * u, 4.4 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 6 * u * side, ey - 5 * u], [x - 6 * u * side, ey], [x + 6 * u * side, ey + 5 * u]], lw); break;
    case "shock": case "shockHalf":
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
      if (kind === "shockHalf") { p.ell(x, ey, 11 * u, 11 * u, skin, 0, 180, 360); p.stroke([[x - 11 * u, ey], [x + 11 * u, ey]], 2.6 * u); }
      break;
    default: {
      const s       = [];
      for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, ey + Math.sin(t * 0.9) * t * 0.55 * u]);
      p.stroke(s, 2.4 * u);
    }
  }
};

/** open "D" mouth with a white teeth band (+ tongue) */
const dmouth = (p     , mx        , y        , rx        , ry        , u        , tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.4 * rx, 0.28 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};

const mouth = (p     , kind        , mx        , my        , u        , k = 1) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u * k, my], [mx + 5.5 * u * k, my - 0.8 * u]], mw); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u * k, 3.5 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + u, my - 3 * u, 7 * u * k, 4 * u, 10, 150, mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 4 * u, 11 * u * k, 6 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 12 * u * k, 8 * u, u); break;
    case "laugh": dmouth(p, mx, my, 16 * u * k, 11 * u, u, true); break;
    case "o": p.ell(mx + 4 * u, my, 3.5 * u, 4 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u * k, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s       = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u * k + i * 1.5 * u * k, my + 1.5 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "teeth":
      p.poly([[mx - 12 * u * k, my - 4 * u], [mx + 12 * u * k, my - 4 * u], [mx + 11 * u * k, my + 4 * u], [mx - 11 * u * k, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u * k, my - 4 * u], [mx + j * 6 * u * k, my + 4 * u]], 1.5 * u);
      break;
    case "lick": p.arc(mx, my - 3 * u, 8 * u * k, 4.5 * u, 20, 160, mw); p.ell(mx + 6 * u * k, my + 3 * u, 3.6 * u, 4.6 * u, TONGUE, 2.4 * u); break;
  }
};

/** face v2 (front / 3-4). u = 1 % of the head path width W. Eyes 26u apart on the centre line, brows 20u up, mouth 20u
 *  down, everything slid toward the facing side. No blush, no catchlights. */
const faceFront = (p     , cx        , cy        , W        , expr      , facing        , look        , lid        , brim         ,
  skin        , moustache         , stout = false) => {
  const u = W / 100, F = FACE[expr], fx = cx + 7 * u * facing;
  const ex = (F.eye[0] === "shock" ? 12 : 13) * u, ey = cy;
  for (const side of [-1, 1]) {
    const x = fx + side * ex;
    const kind = eyeKind(F.eye[(facing ? side === facing : side > 0) ? 1 : 0], lid);
    eye(p, kind, x, ey, u, side, look, skin);
    const [dI, dO] = F.brow, by = ey - (brim ? 17 : 20) * u;
    if (kind === "shock" || kind === "shockHalf") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  const mx = cx + 8 * u * facing, my = cy + 20 * u;
  mouth(p, F.mouth, mx, my, u);
  if (moustache) for (const s of [-1, 1])
    taper(p, [mx + s * 1.5 * u, cy + 12.5 * u], [mx + s * (stout ? 19 : 15) * u, cy + (stout ? 10.5 : 15) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(cx + 40 * u * (facing || 1), cy - 22 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

/** profile face (facing screen-right): one eye, brow, nose tick, mouth near the front edge; no skin bump nose, no ear */
const faceSide = (p     , hx        , hy        , W        , expr      , lid        , brim         , skin        , moustache         , stout = false) => {
  const u = W / 100, F = FACE[expr], ex = hx + 27 * u, ey = hy;
  const kind = eyeKind(F.eye[1], lid);
  eye(p, kind, ex, ey, u, 1, 0.6, skin);
  const by = ey - (brim ? 17 : 20) * u, [dI, dO] = F.brow;
  if (kind === "shock" || kind === "shockHalf") p.arc(ex, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
  else taper(p, [ex + 8 * u, by + dI * u], [ex - 7 * u, by - u + dO * u], 5 * u, 2.5 * u);
  p.stroke([[hx + 44 * u, hy + 4 * u], [hx + 47.5 * u, hy + 9 * u], [hx + 43 * u, hy + 10 * u]], 3 * u);
  mouth(p, F.mouth, hx + 33 * u, hy + 21 * u, u, 0.62);
  if (moustache) taper(p, [hx + 41 * u, hy + 13.5 * u], [hx + 25 * u, hy + (stout ? 11.5 : 16) * u], stout ? 5.5 * u : 4.5 * u, 1.6 * u, moustache);
  if (expr === "nervous") p.ell(hx - 30 * u, hy - 24 * u, 3 * u, 5 * u, "#9fd4ff", 2 * u);
};

// ---------------- hats ----------------
const BONNET = "#e9cf8f", BONNET_BRIM = "#d6b46a";
/** parts of a hat that sit behind the head (bonnet) */
const hatBehind = (p     , o        , H      , cx        , hc        , light        , thick        , ow        , side         ) => {
  if (o.hat !== "bonnet") return;
  const bb = blobPts(cx - (side ? 12 : 0) * (H.a / 50), hc - 0.07 * 2 * H.b, { ...H, a: H.a * 1.17, b: H.b * 1.13, asym: 0, egg: 0.04, seed: H.seed + 3 });
  p.shadedFill(bb, BONNET, mul(BONNET, SH_CLOTH), light, H.a * 1.17);
  p.inkRing(bb, ow * 0.85, thick);
};

const hatOn = (p     , o        , hp      , H      , cx        , hc        , light        , seed        , facing        , side         ) => {
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, crown = hc - H.b, ow = 0.85 * 5 * u;
  const a = H.rot + rad(4 * (rnd(seed, 20) - 0.5)); // tilt with the head, +-2 deg extra
  const R = (pts      ) => rotPts(pts, a, cx, hc);
  const sag = (yb        , wb        )       => {
    const base       = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; base.push([cx + wb * (2 * t - 1), yb + 3 * u * (1 - (2 * t - 1) ** 2)]); }
    return base;
  };
  if (o.hat === "shako" || o.hat === "shako_tall") {
    const tall = o.hat === "shako_tall", yb = crown + 0.25 * HH, ht = (tall ? 0.66 : 0.56) * HH, wb = 46 * u, wt = 52 * u;
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, "#3a3d47", "#24262d", light, wt, 0.4);
    if (tall) p.clip(body, () => p.band(R([[cx - wt - 5 * u, yb - ht + 0.07 * HH], [cx + wt + 5 * u, yb - ht + 0.07 * HH]]), "#e8c45a", 0.06 * HH, 1.5 * u));
    p.poly(body, null, ow);
    const deg = (a * 180) / Math.PI;
    if (side) {
      p.poly(R([[cx + 36 * u, yb - 1 * u], [cx + 60 * u, yb + 8 * u], [cx + 34 * u, yb + 6 * u]]), "#16171b", 2.5 * u);
      const [tx, ty] = R([[cx + 24 * u, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u);
    } else {
      const [px, py] = R([[cx + 3 * u * facing, yb + 3 * u]])[0];
      p.ell(px, py, 34 * u, 0.045 * HH, "#16171b", 2.5 * u, 0, 180, deg); // peak
      const [bx, by] = R([[cx, yb - 0.45 * ht]])[0];
      p.ell(bx, by, 7 * u, 6 * u, tall ? "#e8c45a" : "#c9ccd2", 2 * u, 0, 360, deg); // badge plate
      p.arc(bx, by, 3.5 * u, 2.8 * u, 200, 500, 1.6 * u);
      const [tx, ty] = R([[cx, yb - ht - 6 * u]])[0];
      p.ell(tx, ty, 7 * u, 7 * u, "#2b7a4b", 2.5 * u); // green tuft
    }
  } else if (o.hat === "cap" || o.hat === "hair") {
    const cut = crown + (o.hat === "cap" ? 0.3 : 0.42) * HH;
    const keep = (x        , y        ) => y < cut || (side && o.hat === "hair" && x < cx - 6 * u && y < hc + 0.42 * H.b);
    // start the arc at the first kept point after a dropped one, so the kept run is contiguous and the cut closes it
    const n = hp.length, startIdx = Math.max(0, hp.findIndex(([x, y], i) => keep(x, y) && !keep(hp[(i + n - 1) % n][0], hp[(i + n - 1) % n][1])));
    const arc = [...hp.slice(startIdx), ...hp.slice(0, startIdx)].filter(([x, y]) => keep(x, y))
      .map(([x, y]) => [cx + (x - cx) * 1.03, hc + (y - hc) * 1.03]      );
    if (arc.length < 3) return;
    if (o.hat === "hair") { // scalloped lower edge
      const [x0, y0] = arc[arc.length - 1], [x1, y1] = arc[0];
      for (let i = 1; i < 6; i++) arc.push([x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * i) / 6 + (i % 2 ? 4 * u : 0)]);
    }
    const col = o.hat === "cap" ? o.cap  : o.hair ;
    p.shadedFill(arc, col, mul(col, SH_FELT), light, H.a, 0.35);
    p.poly(arc, null, ow);
    if (o.hat === "hair") {
      const s = side ? -1 : facing || 1;
      p.stroke([[cx + s * 10 * u, cut - 30 * u], [cx + s * 2 * u, cut - 12 * u]], 1.2 * u);
    }
    if (o.hat === "cap") {
      const deg = (a * 180) / Math.PI;
      if (side) p.poly(R([[cx + 40 * u, cut - 2 * u], [cx + 74 * u, cut + 4 * u], [cx + 40 * u, cut + 6 * u]]), shade(col, 0.8), ow);
      else {
        const s = facing || (rnd(seed, 21) < 0.5 ? -1 : 1), [px, py] = R([[cx + s * 4 * u, cut + 1.5 * u]])[0];
        p.ell(px, py, 32 * u, 0.06 * HH, shade(col, 0.8), ow, 0, 180, deg);
      }
    }
  } else if (o.hat === "tophat") {
    const yb = crown + 0.22 * HH, ht = 0.8 * HH, wb = 0.31 * W, wt = 0.33 * W, col = "#2e2a36";
    const body = R([...sag(yb, wb).reverse(), [cx - wt, yb - ht], [cx + wt, yb - ht]]);
    p.shadedFill(body, col, mul(col, SH_FELT), light, wt, 0.4);
    p.clip(body, () => p.band(R([[cx - wt - 4 * u, yb - 0.13 * HH], [cx + wt + 4 * u, yb - 0.13 * HH]]), shade(o.jacket, 0.9), 0.14 * HH, 0.8 * u));
    p.poly(body, null, ow);
    const [bx, by] = R([[cx, yb + 1 * u]])[0];
    p.ell(bx, by, 0.45 * W, 0.05 * HH, "#1d1b22", ow, 0, 360, (a * 180) / Math.PI);
  } else if (o.hat === "bonnet") {
    const [bx, by] = R([[cx + (side ? 6 * u : 0), crown + 0.16 * HH]])[0];
    p.arc(bx, by, 0.5 * W, 0.2 * HH, 200, 340, 7 * u, BONNET_BRIM);
    p.arc(bx, by, 0.5 * W + 3.5 * u, 0.2 * HH + 3.5 * u, 200, 340, 1.2 * u);
    const cy = hc + H.b * 0.98;
    p.stroke([[cx - 14 * u, cy - 4 * u], [cx, cy + 2 * u], [cx + 14 * u, cy - 4 * u]], 2 * u, BONNET_BRIM);
  }
};

// ---------------- bodies ----------------
                                
/** held prop; for the hammer the number is the strike 0 (raised) .. 1 (struck) */
                                                                    

const BUILD                                                                        = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 },
  stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 },
  kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};

                         
                                                                                                                                            
                                                               
                                                                                      
                                                     
  

const footStroke = (p     , a    , b    , w        , col        ) => {
  if (col !== INK) p.stroke([a, b], w + 3, INK);
  p.stroke([a, b], w, col);
};

export const bodyFront = (p     , o        , opts           ) => {
  const { phase = 0, expr = "neutral", mode = "march", look = 0, blink = false, lift = 60, prop = null, tilt = 0, headTilt = 0, wave,
    light = DEF_LIGHT, facing = 0, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH, sole = 975;
  // body bob 5 % (march) / 3 % (stroll) of the height, lowest at contact (phase 0 and 0.5)
  const bob = mode === "march" ? 0.025 * tall * Math.cos(2 * two * phase) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hipY = torsoBot - 0.12 * HH;
  const thick = thickAngle(light), ow = 5 * u;
  const legCol = mix(o.pants, INK, 0.55), armCol = mix(o.jacket, INK, 0.5), footCol = o.boots;
  const legW = 5.8 * u, footW = 7.5 * u;
  // ---- legs + feet (not rotated) ----
  p.rot = null;
  if (mode === "sit") {
    for (const side of [-1, 1]) {
      const h     = [300 + side * 15 * u, hipY], k     = [300 + side * 36 * u, hipY + 0.2 * HH], f     = [300 + side * 44 * u, sole - 8 * u];
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, [f[0] - side * 2 * u, f[1]], [f[0] + side * 12 * u, f[1] - 5 * u], footW, footCol);
    }
  } else if (mode === "fall") {
    const legs                 = [
      [[300 - 15 * u, hipY], [300 - 46 * u, hipY + 0.5 * HH], [300 - 70 * u, hipY + 0.72 * HH]],
      [[300 + 15 * u, hipY], [300 + 50 * u, hipY + 0.45 * HH], [300 + 76 * u, hipY + 0.22 * HH]],
    ];
    legs.forEach(([h, k, f], i) => {
      p.stroke(curve(h, k, f), legW, legCol);
      footStroke(p, f, [f[0] + (i ? 14 : -14) * u, f[1] + (i ? -6 : 4) * u], footW, footCol);
    });
  } else if (o.dress) {
    for (const side of [-1, 1]) {
      const fx = 300 + side * 12 * u, fy = sole - 4 * u;
      p.stroke([[fx, sole - 0.4 * HH], [fx + side * u, fy]], legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 12 * u, fy + u], footW, footCol);
    }
  } else {
    const L = mode === "march" ? lift * 1.25 : mode === "stroll" ? lift * 0.55 : 0;
    for (const [side, ph] of [[-1, 0], [1, 0.5]]         ) {
      const up = Math.max(0, Math.sin(two * (phase + ph))) * L;
      const hx = 300 + side * 15 * u, fx = 300 + side * 22 * u, fy = sole - 4 * u - up;
      const k     = [(hx + fx) / 2 + side * (1.5 * u + up * 0.16), (hipY + fy) / 2 - up * 0.08];
      p.stroke(curve([hx, hipY], k, [fx, fy]), legW, legCol);
      footStroke(p, [fx - side * 3 * u, fy], [fx + side * 13 * u, fy + 0.5 * u], footW, footCol);
    }
  }
  // ---- upper body: rotates about the hips (tilt + a small weight-shift sway on every step) ----
  const sway = mode === "march" ? 1.6 * Math.sin(two * phase) : mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0;
  const A = tilt + sway;
  p.rot = A ? [rad(A), 300, hipY] : null;
  const dress = !!o.dress && mode !== "sit" && mode !== "fall";
  const T       = { a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: o.build === "stout" ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const sh = (side        )     => [tcx + side * 0.85 * T.a, chin + 0.12 * HH];
  const hang = (side        , fwd        )               => {
    const S = sh(side), ex = tcx + side * (1.12 * T.a + 4 * u);
    const hx = ex + side * 3 * u - side * 6 * u * Math.max(0, fwd) + side * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "march" || mode === "stroll" ? Math.sin(two * phase) : 0;
  // rifle at the order: butt by the right hip, held by the hanging right hand, muzzle past the crown
  const R0     = [300 + 47 * u, torsoBot + 0.12 * HH], R1     = [300 + 64 * u, crown - 0.32 * HH];
  const rifle = !!o.rifle && (mode === "march" || mode === "stand" || mode === "stroll");
                                                   
  const arms        = [];
  if (mode === "sit") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.1 * T.a + 6 * u), sh(side)[1] + 0.4 * HH], [tcx + side * (1.2 * T.a + 10 * u), torsoBot + 0.04 * HH]], front: false });
  else if (mode === "fall") for (const side of [-1, 1]) arms.push({ pts: [sh(side), [tcx + side * (1.15 * T.a + 12 * u), sh(side)[1] - 0.25 * HH], [tcx + side * (1.3 * T.a + 24 * u), sh(side)[1] - 0.68 * HH]], front: false });
  else {
    arms.push({ pts: prop === "shako" ? hang(-1, 0) : hang(-1, -sw), front: false });
    if (rifle) {
      const G = lerp2(R0, R1, 0.1);
      arms.push({ pts: [sh(1), [tcx + 1.12 * T.a + 5 * u, sh(1)[1] + 0.45 * HH], G], front: false });
    } else if (wave !== undefined) {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.1 * T.a + 10 * u + 3 * u * wave, S[1] - 0.22 * HH], [tcx + 1.18 * T.a + 16 * u + 12 * u * wave, S[1] - 0.6 * HH]], front: false });
    } else if (prop === "icecream") {
      const S = sh(1);
      arms.push({ pts: [S, [tcx + 1.05 * T.a + 4 * u, S[1] + 0.45 * HH], [tcx + 0.5 * T.a, S[1] + 0.4 * HH]], front: true });
    } else if (Array.isArray(prop)) {
      const S = sh(1), k = clamp(prop[1], 0, 1);
      const E = lerp2([tcx + 1.1 * T.a + 10 * u, S[1] - 0.15 * HH], [tcx + 1.2 * T.a + 10 * u, S[1] + 0.3 * HH], k);
      const Hd = lerp2([tcx + 1.15 * T.a + 14 * u, S[1] - 0.55 * HH], [tcx + 1.45 * T.a + 22 * u, S[1] + 0.35 * HH], k);
      arms.push({ pts: [S, E, Hd], front: true });
    } else arms.push({ pts: hang(1, sw), front: false });
  }
  const drawArm = (a     ) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // behind the body: rifle, sword, arms
  if (rifle) {
    p.band([R0, R1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(R0, R1, 0.6), R1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  if (o.sword && mode !== "sit") {
    const s0     = [tcx - 0.75 * T.a, torsoBot - 0.2 * HH];
    p.band([s0, [s0[0] - Math.sin(rad(25)) * 0.8 * HH, s0[1] + Math.cos(rad(25)) * 0.8 * HH]], "#c9ccd2", 3 * u, 1.2 * u, "round");
  }
  for (const a of arms) if (!a.front) drawArm(a);
  // torso / dress: shaded fill -> clothing clipped to it -> thick-thin ink ring
  if (dress) {
    const D       = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(300, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, o.dress , mul(o.dress , SH_CLOTH), light);
    p.inkRing(dp, ow, thick);
    const Sw       = { a: 0.37 * W, b: 0.3 * HH, nTop: 2.2, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.006, seed: seed + 8 };
    const sp = blobPts(300, chin + 0.12 * HH, Sw);
    p.gradFill(sp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.inkRing(sp, ow * 0.9, thick);
  } else {
    p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
    p.clip(tp, () => {
      if (o.belt) {
        for (const s of [-1, 1]) p.band([[tcx - s * 0.75 * T.a, chin - 0.05 * HH], [tcx + s * 0.8 * T.a, torsoBot - 0.1 * HH]], o.belt , 5.5 * u, 1.8 * u);
        const xc = tcx + 0.025 * T.a, yc = chin - 0.05 * HH + (torsoBot - 0.1 * HH - (chin - 0.05 * HH)) * (0.75 / 1.55);
        p.poly([[xc - 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc - 3.5 * u], [xc + 3.5 * u, yc + 3.5 * u], [xc - 3.5 * u, yc + 3.5 * u]], "#d9dde0", 1.5 * u);
      }
      if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
      for (let i = 0; i < 4; i++) {
        const y = chin + 0.12 * HH + i * 0.2 * HH;
        if (o.sash && Math.abs(y - (torsoBot - 0.32 * HH)) < 0.08 * HH) continue;
        p.dot(tcx + 2 * u * facing, y, 2.2 * u + 0.8 * u, INK); p.dot(tcx + 2 * u * facing, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7));
      }
    });
    if (o.sash) { const s = facing || 1; p.poly([[tcx + s * 0.55 * T.a, torsoBot - 0.3 * HH], [tcx + s * 0.75 * T.a, torsoBot + 0.05 * HH], [tcx + s * 0.45 * T.a, torsoBot + 0.02 * HH]], o.sash, 1.6 * u); }
    p.inkRing(tp, ow, thick);
  }
  // in front of the body: hands holding props
  for (const a of arms) if (a.front) {
    drawArm(a);
    const [hx, hy] = a.pts[2];
    if (prop === "icecream") {
      p.poly([[hx - 8 * u, hy - 12 * u], [hx + 8 * u, hy - 12 * u], [hx, hy + 7 * u]], "#e0a35a", 1.8 * u);
      p.ell(hx, hy - 19 * u, 11 * u, 10 * u, "#f7c6d9", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    } else if (Array.isArray(prop)) {
      const ang = rad(-70 + 105 * clamp(prop[1], 0, 1));
      const Rh = (pts      ) => rotPts(pts, ang, hx, hy);
      p.band(Rh([[hx, hy + 12 * u], [hx, hy - 44 * u]]), "#8a5a34", 5 * u, 1.5 * u, "round");
      p.poly(Rh([[hx - 12 * u, hy - 58 * u], [hx + 20 * u, hy - 58 * u], [hx + 20 * u, hy - 42 * u], [hx - 12 * u, hy - 42 * u]]), "#7d848c", 2.2 * u);
      p.dot(hx, hy, 5.5 * u);
    }
  }
  if (prop === "shako") { // carried by the left hand
    const [hx, hy] = arms[0].pts[2];
    p.poly([[hx - 14 * u, hy + 3 * u], [hx + 14 * u, hy + 3 * u], [hx + 16 * u, hy + 30 * u], [hx - 16 * u, hy + 30 * u]], "#3a3d47", 2.2 * u);
    p.ell(hx, hy + 31 * u, 3.5 * u, 3.5 * u, "#2b7a4b", 1.5 * u);
    p.dot(hx, hy, 5.5 * u);
  }
  // ---- head: rotates with the body, plus its own tilt about the chin ----
  const Ah = A + headTilt, [cpx, cpy] = rotAbout([300, chin], rad(A), [300, hipY]);
  p.rot = Ah ? [rad(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  hatBehind(p, o, H, 300, hc, light, thick, ow, false);
  const hp = blobPts(300, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, 300, hc, light, seed, facing, false);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceFront(p, 300, hc, W, expr, facing, look, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

                        
                                                                                                                                    
                                                                                                                         
                                                 
                                                                                                     
                          
  

/** two-bone leg, knee bending forward (+x) */
const ik = (hip    , ank    , l1        , l2        )     => {
  const dx = ank[0] - hip[0], dy = ank[1] - hip[1], d = clamp(Math.hypot(dx, dy), 1, l1 + l2 - 0.01);
  const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), k = Math.atan2(dy, dx) - A;
  return [hip[0] + l1 * Math.cos(k), hip[1] + l1 * Math.sin(k)];
};

/** hip height of the seated kid in `swing` mode (design units); swingKid seats the torso bottom on the plank */
const SWING_HIP = 733;

/** side view facing screen-right; march footfalls land at phase 0 (near foot) and 0.5 (far foot), like the front view.
 *  The stance foot is planted: it slides back at exactly the walking speed while the hip rises and falls over it. */
export const bodySide = (p     , o        , opts          ) => {
  const { phase = 0, expr = "neutral", mode = "march", blink = false, stomp = 1, pose = 0, stride = 1, light = DEF_LIGHT, seed = 1 } = opts;
  const Bd = BUILD[o.build ?? "adult"], skin = o.skin ?? SKIN, two = Math.PI * 2, lid = lidOf(blink);
  const H       = { ...headBlob(seed, Bd.a, 1), asym: 0.12, rot: rad(3 + 3 * (rnd(seed, 7) - 0.5)) };
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100, sole = 975, ankY = sole - 4 * u;
  const thick = thickAngle(light), ow = 5 * u;
  const legLen = (Bd.legs + 0.12) * HH - 4 * u, l1 = legLen / 2, l2 = legLen / 2;
  const nearCol = mix(o.pants, INK, 0.55), farCol = mix(o.pants, INK, 0.75), footCol = o.boots;
                                                        
  const legs         = [];
  let hipY = ankY - legLen * 0.995, lean = 0, nearFwd = 0;
  if (mode === "march") {
    const S = 370 * stride, liftH = Math.max(22, 40 + 70 * (stomp - 1));
    const st = (ph        ) => {
      const c = (((phase + ph) % 1) + 1) % 1;
      if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, h: 0, stance: true, s }; }
      const s = (c - 0.5) / 0.5; // swing: cycloid in world space, so the foot leaves and lands at zero ground speed
      return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), h: liftH * Math.sin(Math.PI * s), stance: false, s };
    };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL;
    const Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x));
    for (const [L, near] of [[fL, false], [nL, true]]         )
      legs.push({ ank: [300 + L.x, ankY - L.h], pitch: L.stance ? 0 : rad(35 * Math.sin(Math.PI * L.s) * (1 - 1.6 * L.s)), near });
    lean = 4 + 3 * Math.cos(2 * two * phase); // 7 deg at contact, 1 deg at passing
    nearFwd = nL.x / (S / 2);
  } else if (mode === "push") {
    hipY = ankY - 0.87 * legLen;
    legs.push({ ank: [300 - 0.5 * legLen, ankY], pitch: rad(-8), near: false }, { ank: [300 + 0.32 * legLen, ankY], pitch: 0, near: true });
    lean = 14 * pose;
  } else if (mode === "swing") {
    hipY = SWING_HIP;
    const a = rad(60 * pose);
    for (const [dx, near] of [[-6, false], [0, true]]         ) {
      const knee     = [300 + l1 * 0.98 + dx * u, hipY + 6 * u];
      legs.push({ ank: [knee[0] + l2 * Math.sin(a), knee[1] + l2 * Math.cos(a)], pitch: -a * 0.5, near });
    }
  } else {
    legs.push({ ank: [300 - 4 * u, ankY], pitch: 0, near: false }, { ank: [300 + 4 * u, ankY], pitch: 0, near: true });
  }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b, hip     = [300, hipY];
  p.rot = null;
  for (const L of legs) {
    const knee = mode === "swing" ? ([300 + l1 * 0.98 + (L.near ? 0 : -6 * u), hipY + 6 * u]      ) : ik(hip, L.ank, l1, l2);
    const hp0     = [300 + (L.near ? 0 : -5 * u), hipY];
    p.stroke([hp0, knee, L.ank], 5.8 * u, L.near ? nearCol : farCol);
    const c = Math.cos(L.pitch), s = Math.sin(L.pitch);
    footStroke(p, [L.ank[0] - 3 * u * c, L.ank[1] - 3 * u * s], [L.ank[0] + 13 * u * c, L.ank[1] + 13 * u * s + 0.5 * u],
      7.5 * u, L.near ? footCol : footCol === INK ? INK : shade(footCol, 0.82));
  }
  // ---- upper body leans about the hip ----
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  const T       = { a: (o.build === "stout" ? 0.36 : 0.31) * W, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.5, egg: 0.1, asym: 0.06,
    rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = 300 + 2 * u, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const armCol = mix(o.jacket, INK, 0.5), farArm = mix(o.jacket, INK, 0.68);
  const S     = [tcx + 0.05 * T.a, chin + 0.14 * HH], aLen = 0.95 * HH;
  const swingArm = (ang        )               => {
    const e     = [S[0] + Math.sin(ang) * aLen * 0.5, S[1] + Math.cos(ang) * aLen * 0.5], a2 = ang + rad(16) * Math.sign(ang || 1);
    return [S, e, [e[0] + Math.sin(a2) * aLen * 0.5, e[1] + Math.cos(a2) * aLen * 0.5]];
  };
  const rifle = !!o.rifle && (mode === "march" || mode === "stand");
  const B0     = [tcx + 0.72 * T.a, chin + 0.58 * HH], B1     = [tcx - 0.95 * T.a - 22 * u, crown - 0.4 * HH];
  let near              , far                     ;
  if (mode === "swing") { near = [S, [S[0] + 12 * u, S[1] - 0.16 * HH], [300 + 6 * u, chin - 0.3 * HH]]; far = [S, [S[0] + 8 * u, S[1] - 0.18 * HH], [300 + 2 * u, chin - 0.36 * HH]]; }
  else if (mode === "push") {
    const reach = 0.55 * HH + 0.45 * HH * pose;
    let hN     = [S[0] + reach, S[1] + 0.06 * HH];
    if (opts.hand) {
      // target is in final canvas units; the arm is drawn inside the lean rotation, so undo it
      const th = -rad(lean), dx = opts.hand[0] - 300, dy = opts.hand[1] - hipY;
      const tg     = [300 + dx * Math.cos(th) - dy * Math.sin(th), hipY + dx * Math.sin(th) + dy * Math.cos(th)];
      hN = [hN[0] + (tg[0] - hN[0]) * pose, hN[1] + (tg[1] - hN[1]) * pose];
    }
    near = [S, [(S[0] + hN[0]) / 2, (S[1] + hN[1]) / 2 + 0.06 * HH], hN];
    far = [S, [(S[0] + hN[0]) / 2 - 4 * u, (S[1] + hN[1]) / 2 - 0.02 * HH], [hN[0] - 6 * u, hN[1] - 0.08 * HH]];
  } else if (rifle) { near = [S, [S[0] - 4 * u, S[1] + 0.42 * HH], B0]; far = mode === "march" ? swingArm(rad(30) * nearFwd) : swingArm(0); }
  else { near = swingArm(rad(-30) * nearFwd); far = mode === "march" ? swingArm(rad(30) * nearFwd) : null; }
  if (far) { p.stroke(curve(far[0], far[1], far[2]), 5.2 * u, farArm); p.dot(far[2][0], far[2][1], 5.5 * u); }
  p.gradFill(tp, o.jacket, mul(o.jacket, SH_CLOTH), light);
  p.clip(tp, () => {
    if (o.belt) p.band([[tcx - 0.65 * T.a, chin - 0.05 * HH], [tcx + 0.75 * T.a, torsoBot - 0.1 * HH]], o.belt , 5.5 * u, 1.8 * u);
    if (o.sash) p.band([[tcx - 1.3 * T.a, torsoBot - 0.32 * HH], [tcx + 1.3 * T.a, torsoBot - 0.32 * HH]], o.sash, 0.13 * HH, 1.8 * u);
    if (!o.dress) for (let i = 0; i < 3; i++) { const y = chin + 0.16 * HH + i * 0.24 * HH; p.dot(tcx + 0.8 * T.a, y, 3 * u, INK); p.dot(tcx + 0.8 * T.a, y, 2.2 * u, o.buttons ?? shade(o.jacket, 0.7)); }
  });
  p.inkRing(tp, ow, thick);
  if (rifle) {
    p.band([B0, B1], "#7a4b2a", 5 * u, 1.5 * u, "round");
    p.band([lerp2(B0, B1, 0.6), B1], "#8d949c", 2.4 * u, 1.2 * u, "round");
  }
  p.stroke(curve(near[0], near[1], near[2]), 5.2 * u, armCol); p.dot(near[2][0], near[2][1], 5.5 * u);
  // ---- head ----
  const hx = 300 + 4 * u;
  hatBehind(p, o, H, hx, hc, light, thick, ow, true);
  const hp = blobPts(hx, hc, H);
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  hatOn(p, o, hp, H, hx, hc, light, seed, 1, true);
  const brim = !!o.hat && o.hat !== "hair" && o.hat !== "bonnet" && o.hat !== "cap";
  faceSide(p, hx, hc, W, expr, lid, brim, skin, o.moustache, o.build === "stout");
  p.rot = null;
};

/** rope + seat + seated kid on a 700 x 2300 canvas; the pivot is design (350, 20); kid drawn at 0.92 scale */
export const swingKid = (p     , o        , kick        , expr      , light = DEF_LIGHT, blink         = 0) => {
  const rope = 1830, k = 1.1, HH = 2 * headBlob(5, BUILD[o.build ?? "adult"].a, 1).b;
  // two ropes from the pivot to the ends of a wide plank, the kid framed between them: a single rope behind the kid
  // ended at the cap and read as a hanging. Far rope behind the kid, near rope drawn over (clear of the face).
  const seat = rope + 18, x0 = 150, x1 = 550;
  p.line([[350, 20], [x0 + 16, seat + 4]], "#a07a4c", 10);
  p.poly(rrect(x0, seat, x1, seat + 36, 10), "#b5653f", 9);
  const g = p.g;
  g.save();
  g.translate(350 - 300 * k, rope + 18 - (SWING_HIP + 0.12 * HH) * k);
  g.scale(k, k);
  bodySide(new Pen(g), o, { expr, mode: "swing", pose: kick, light, seed: 5, blink });
  g.restore();
  p.line([[350, 20], [x1 - 16, seat + 4]], "#a07a4c", 10);
};

// ---------------- effects ----------------
export const fxNote = (p     , kind        , col = "#1f2a44") => {
  p.ell(70, 200, 46, 34, col, 8, 0, 360, -20);
  p.stroke([[110, 190], [110, 40]], 14);
  if (kind === 0) p.poly([[110, 40], [170, 70], [170, 110], [110, 82]], col, 8);
  else {
    p.ell(150, 170, 40, 30, col, 8, 0, 360, -20);
    p.stroke([[186, 160], [186, 20]], 14);
    p.poly([[110, 40], [186, 20], [186, 50], [110, 70]], col, 8);
  }
};

/** spark / impact star on a 500 x 500 canvas; t in 0..1 */
export const fxBurst = (p     , t        , col = "#fff3b0", rays = 10, r0 = 40, r1 = 230) => {
  const c = 250, e = 1 - (1 - t) ** 3;
  for (let i = 0; i < rays; i++) {
    const a = rad((i * 360) / rays + 7 * (i % 2)), ra = r0 + (r1 - r0) * e * (0.75 + 0.25 * (i % 2));
    p.poly([[c + r0 * 0.5 * Math.cos(a + 0.18), c + r0 * 0.5 * Math.sin(a + 0.18)], [c + ra * Math.cos(a), c + ra * Math.sin(a)],
      [c + r0 * 0.5 * Math.cos(a - 0.18), c + r0 * 0.5 * Math.sin(a - 0.18)]], col, Math.max(3, 8 * (1 - t)));
  }
  if (t < 0.5) p.ell(c, c, r0 * (1.4 - t), r0 * (1.4 - t), WHITE, 8);
};

/** water splash crown on an 800 x 800 canvas; t in 0..1 */
export const fxSplash = (p     , t        ) => {
  const c = 400, size = 800, rise = Math.sin(Math.min(1, t * 1.3) * Math.PI);
  const blue = "#bfe8ff", deep = "#6cc0f0";
  if (rise > 0.02) {
    const pts       = [];
    for (let i = 0; i < 19; i++) {
      const h = (i % 2 ? 260 : 130) * rise * (0.7 + 0.3 * Math.sin(i * 1.7));
      pts.push([c - 330 + (660 * i) / 18, size - 120 - h]);
    }
    p.poly([...pts, [c + 330, size - 90], [c - 330, size - 90]], blue, 10);
    p.ell(c, size - 100, 360, 46, deep, 10);
  }
  for (let i = 0; i < 8; i++) {
    const a = rad(200 + i * 18), d = 120 + 380 * t, y = size - 160 + d * Math.sin(a) + 520 * t * t, r = 26 * (1 - t) + 6;
    if (t > 0.08 && y < size - 40) p.ell(c + d * Math.cos(a), y, r, r * 1.25, blue, 7);
  }
};

/** dust puff on a 300 x 300 canvas; t in 0..1 */
export const fxPuff = (p     , t        ) => {
  for (let i = 0; i < 5; i++) {
    const a = rad(160 + i * 55), d = 40 + 70 * t, r = (34 + 20 * (i % 2)) * (1 - 0.6 * t);
    p.ell(150 + d * Math.cos(a), 180 + d * 0.45 * Math.sin(a), r, r * 0.8, `rgba(238,225,205,${(1 - t).toFixed(3)})`, 0);
  }
};

/** circling stars on a 420 x 210 canvas */
export const fxStars = (p     , t        ) => {
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI) / 2, x = 210 + 150 * Math.cos(a), y = 110 + 40 * Math.sin(a), pts       = [];
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34, b = rad(k * 36 - 90); pts.push([x + r * Math.cos(b), y + r * Math.sin(b)]); }
    p.poly(pts, "#ffd84a", 6);
  }
};

/** three jittering strain ticks on a 300 x 300 canvas */
export const fxCreak = (p     , t        ) => {
  const j = 6 * Math.sin(t * 40);
  for (const a of [-30, 0, 30]) {
    const b = rad(a - 90);
    p.stroke([[150 + 70 * Math.cos(b) + j, 230 + 70 * Math.sin(b)], [150 + 100 * Math.cos(b) + 10 + j, 230 + 100 * Math.sin(b)],
      [150 + 130 * Math.cos(b) + j, 230 + 130 * Math.sin(b)]], 10);
  }
};

/** flat water ring (drawn top-down) on a 600 x 600 canvas; t in 0..1 */
export const fxRing = (p     , t        ) => {
  // thin light water rings (white crest, pale blue trailing rings), thinning as they spread
  const g = p.g;
  for (let k = 0; k < 3; k++) {
    const u = t - k * 0.22;
    if (u <= 0 || u >= 1) continue;
    g.beginPath(); g.ellipse(300, 300, 60 + 230 * u, 60 + 230 * u, 0, 0, Math.PI * 2);
    g.strokeStyle = k === 0 ? "#f6fcff" : "#cfe8fa"; g.lineWidth = 9 * (1 - u) + 3; g.stroke();
  }
};

/** text-free sign on a 700 x 520 canvas: "no marching in step on the bridge". A bridge (deck + arch + piers), four
 *  identical pairs of marching legs in the same stride (in step), a bold red X over all of it. */
export const fxSign = (p     ) => {
  const g = p.g, RED = "#d42f2f";
  p.poly(rrect(14, 14, 686, 506, 40), "#f6ecd2", 0);
  p.poly(rrect(14, 14, 686, 506, 40), null, 14);
  // bridge: deck, stone arch underneath, two piers
  p.poly(rrect(70, 352, 630, 384, 8), "#8a5a3a", 9);
  g.beginPath(); g.moveTo(112, 470); g.quadraticCurveTo(350, 300, 588, 470);
  g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.stroke();
  for (const x of [88, 612]) p.poly(rrect(x - 16, 384, x + 16, 470, 4), "#8a5a3a", 9);
  // four identical soldiers' legs mid-stride: same leg forward on every one = in step
  for (const x of [150, 278, 406, 534]) {
    p.poly(rrect(x - 30, 150, x + 30, 214, 14), "#357650", 9);                  // coat hem
    p.stroke([[x - 8, 210], [x + 34, 262], [x + 46, 338]], 15, INK);           // front leg
    p.stroke([[x + 6, 210], [x - 12, 274], [x - 36, 336]], 15, INK);           // back leg
    p.poly(rrect(x + 30, 330, x + 74, 350, 9), INK, 0);                          // boots point forward
    p.poly(rrect(x - 52, 328, x - 8, 348, 9), INK, 0);
  }
  // big red X
  for (const [a, b] of [[[96, 70], [604, 452]], [[604, 70], [96, 452]]]                                          ) {
    p.stroke([a, b], 58, "#ffffff");
    p.stroke([a, b], 42, RED);
  }
};

/** soft cartoon cloud on a 600 x 300 canvas */
export const fxCloud = (p     , seed        ) => {
  const blobs                             = [[150, 190, 80], [250, 150, 105], [360, 160, 95], [450, 195, 70], [300, 210, 90]];
  for (const [x, y, r] of blobs) p.ell(x + ((seed * 37) % 20) - 10, y, r, r * 0.8, "#ffffff", 0);
  p.ell(300, 235, 230, 40, "#ffffff", 0);
};

/** cast shadow on a 128 x 256 canvas: dark soft contact pool at the feet (y 205) and a softer tail that runs up the
 *  canvas = away from the sun, fading with distance; multiply colour (sRGB-encoded linear ratio), white = no change */
export const fxShadow = (p     , col        ) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 256);
  g.save(); g.filter = "blur(9px)";
  const lg = g.createLinearGradient(0, 205, 0, 22);
  lg.addColorStop(0, mix(col, WHITE, 0.08)); lg.addColorStop(0.55, mix(col, WHITE, 0.3)); lg.addColorStop(1, mix(col, WHITE, 0.85));
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(40, 205); g.bezierCurveTo(36, 120, 46, 50, 64, 30); g.bezierCurveTo(82, 50, 92, 120, 88, 205); g.closePath(); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(64, 205, 30, 17, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};

/** tight contact shadow right under the feet on a 128 x 128 canvas: dark core, short fall-off (multiply colour) */
export const fxContact = (p     , col        ) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.32, 0.02], [0.5, 0.22], [0.66, 0.58], [0.82, 0.88], [1, 1]]         ) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

/** floating wooden plank, side-on, on a 320 x 110 canvas */
export const fxPlank = (p     ) => {
  p.poly(rrect(14, 30, 306, 78, 10), "#a8744a", 9);
  p.line([[40, 46], [150, 44], [270, 50]], "#7d5234", 4);
  p.line([[60, 62], [200, 64], [284, 60]], "#7d5234", 4);
  p.dot(36, 54, 5, INK); p.dot(284, 54, 5, INK);
};

/** floating marching drum (no text) on a 260 x 240 canvas: white shell, red hoops, ink zig-zag cord */
export const fxDrum = (p     ) => {
  p.poly(rrect(40, 70, 220, 190, 16), "#f1ece0", 9);
  p.poly(rrect(32, 58, 228, 86, 12), "#c9373a", 8);
  p.poly(rrect(32, 176, 228, 204, 12), "#c9373a", 8);
  p.line([[52, 88], [82, 172], [112, 88], [142, 172], [172, 88], [202, 172]], INK, 6);
  p.ell(130, 58, 98, 18, "#f7f3ea", 8);
};

/** soft ground contact blob on a 128 x 128 canvas, multiply colour (sRGB-encoded linear ratio) in the centre */
export const fxBlob = (p     , col        ) => {
  const g = p.g;
  g.fillStyle = WHITE; g.fillRect(0, 0, 128, 128);
  // soft contact shadow: flat core, then a long smooth (roughly gaussian) fall-off to white = no change
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, k] of [[0, 0], [0.5, 0.04], [0.64, 0.18], [0.76, 0.42], [0.87, 0.72], [0.95, 0.92], [1, 1]]         ) gr.addColorStop(r, mix(col, WHITE, k));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};

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
