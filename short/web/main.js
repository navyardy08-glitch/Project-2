// Engine: toon world + ink + grade + lens blur, canvas-drawn character cards. Exposes window.renderFrame(f).
import * as THREE from "three";
import * as T from "./toon.js";
import * as P from "./paint.js";
import { frameState, TOTAL, HOUSES, ROOM, TABLE, CUP, PODIUM } from "./story.js";

const W = 1080, H = 1920, PX = W / 1080;
const NOINK = 1;
const canvas = document.createElement("canvas");
canvas.width = W; canvas.height = H;
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 3000);
camera.layers.enableAll();
scene.fog = new THREE.Fog(0xb8d0ec, 80, 900);

// ---------- toon materials ----------
const grad = (() => { const d = new Uint8Array([0, 0, 255, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const ctex = (c, rep = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: grad, ...opts });
/** triplanar toon: world-space projected texture (scale = metres per tile) */
const triToon = (tex, scale, color = 0xffffff, extra = {}) => {
  const m = toon({ color, ...extra });
  m.customProgramCacheKey = () => "tri";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tTri = { value: tex };
    sh.uniforms.triS = { value: 1 / scale };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTP; varying vec3 vTN;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vTP = (modelMatrix * vec4(transformed, 1.0)).xyz; vTN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tTri; uniform float triS; varying vec3 vTP; varying vec3 vTN;")
      .replace("#include <map_fragment>", `{
        vec3 bw = pow(abs(vTN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 tc = texture2D(tTri, vTP.zy * triS).rgb * bw.x + texture2D(tTri, vTP.xz * triS).rgb * bw.y + texture2D(tTri, vTP.xy * triS).rgb * bw.z;
        vec3 ta = textureLod(tTri, vec2(0.5), 12.0).rgb;
        tc = mix(tc, ta, smoothstep(70.0, 320.0, distance(vTP, cameraPosition)) * 0.85);
        diffuseColor.rgb *= tc; }`);
  };
  return m;
};

const TEX = {
  cobble: ctex(P.cobbleTex(3)), grass: ctex(P.grassTex(3, 1024, "#8fae5a")), dirt: ctex(P.dirtTex(2)),
  pl0: ctex(P.mudTex(4, 512, "#efe2c4")), pl1: ctex(P.mudTex(14, 512, "#e8c9a0")), pl2: ctex(P.mudTex(24, 512, "#d9dcc8")), pl3: ctex(P.mudTex(34, 512, "#f0d7c9")),
  plIn: ctex(P.mudTex(44, 512, "#e6d3b0")), tile: ctex(P.tileTex(5)), wood: ctex(P.woodTex(7)), woodD: ctex(P.woodTex(17, 512, "#5d3a26")), floor: ctex(P.woodTex(27, 512, "#b0794a")),
  leaf: ctex(P.leafTex(8)), leaf2: ctex(P.leafTex(18, 512, "#4f7a34")), stone: ctex(P.rockTex(11)),
};
const MAT = {
  cobble: triToon(TEX.cobble, 5), grass: triToon(TEX.grass, 14), dirt: triToon(TEX.dirt, 8, 0xd8c8b0),
  pl: [triToon(TEX.pl0, 4), triToon(TEX.pl1, 4), triToon(TEX.pl2, 4), triToon(TEX.pl3, 4)], plIn: triToon(TEX.plIn, 4),
  tile: [toon({ map: TEX.tile, side: THREE.DoubleSide }), toon({ map: TEX.tile, color: 0xb9c0e8, side: THREE.DoubleSide }), toon({ map: TEX.tile, color: 0xffd9a0, side: THREE.DoubleSide })],
  wood: triToon(TEX.wood, 2), beam: triToon(TEX.woodD, 1.6), floor: triToon(TEX.floor, 1.6), door: triToon(TEX.woodD, 1.1, 0xd0a080),
  leaf: triToon(TEX.leaf, 3), leaf2: triToon(TEX.leaf2, 3), trunk: triToon(TEX.wood, 1.5, 0x9a8070), stone: triToon(TEX.stone, 5, 0xd8d0d0),
  dark: toon({ color: 0x2a1f1a }), hill: toon({ color: 0x8fa77a }), hill2: toon({ color: 0x9db487 }), mount: toon({ color: 0x8c8fa8 }), snow: toon({ color: 0xf4f4fa }),
  rug: toon({ color: 0xa8433a }), rug2: toon({ color: 0xe9c15a }), brass: toon({ color: 0xd9a93a }),
};
const winMat = new THREE.MeshBasicMaterial({ color: 0x33415e });
const world = []; // meshes that get inked
const addW = (mesh, cast = true, recv = true) => { mesh.castShadow = cast; mesh.receiveShadow = recv; mesh.layers.set(0); scene.add(mesh); world.push(mesh); return mesh; };
const reg = (g, cast = true) => { g.traverse((o) => { if (o.isMesh) { o.castShadow = cast && o.userData.cast !== false; o.receiveShadow = true; world.push(o); } }); scene.add(g); return g; };
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
const groundAt = () => 0;

// ---------- world ----------
{ const g = new THREE.PlaneGeometry(2400, 2400); g.rotateX(-Math.PI / 2); addW(new THREE.Mesh(g, MAT.grass), false, true); }
{ const g = new THREE.PlaneGeometry(9, 150); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, MAT.cobble); m.position.y = 0.03; addW(m, false, true); }
{ const g = new THREE.PlaneGeometry(26, 150); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, MAT.dirt); m.position.y = 0.015; addW(m, false, true); }
const rnd = P.rng(77);
const roofGeo = (w, d, rise, over) => {
  const hw = w / 2 + over, hd = d / 2 + over, g = new THREE.BufferGeometry();
  const v = [-hw, 0, hd, hw, 0, hd, hw, rise, 0, -hw, rise, 0, -hw, rise, 0, hw, rise, 0, hw, 0, -hd, -hw, 0, -hd];
  const uv = [0, 0, w / 2.2, 0, w / 2.2, hd / 1.6, 0, hd / 1.6, 0, hd / 1.6, w / 2.2, hd / 1.6, w / 2.2, 0, 0, 0];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); g.computeVertexNormals();
  return g;
};
const windowAt = (g, x, y, z, w = 0.85, h = 0.95) => {
  g.add(box(w + 0.2, h + 0.2, 0.1, MAT.beam, x, y, z));
  g.add(box(w, h, 0.06, winMat, x, y, z + 0.05));
  g.add(box(0.06, h, 0.05, MAT.beam, x, y, z + 0.09)); g.add(box(w, 0.06, 0.05, MAT.beam, x, y, z + 0.09));
  g.add(box(w + 0.36, 0.1, 0.22, MAT.beam, x, y - h / 2 - 0.12, z + 0.06));
};
/** crooked half-timbered house; front faces local +z. returns { group, door (pivot group) } */
const house = (hd) => {
  const { x, z, w, d, h, side, col, lean, rise } = hd;
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const wall = MAT.pl[col % 4], G = 2.9, fz = d / 2;
  inner.add(box(w, G, d, wall, 0, G / 2, 0));
  inner.add(box(w + 0.3, h - G, d + 0.5, wall, 0, G + (h - G) / 2, 0));
  const uz = fz + 0.25;
  // timber frame
  inner.add(box(w + 0.4, 0.22, d + 0.6, MAT.beam, 0, G, 0));
  for (const s of [-1, 1]) { inner.add(box(0.2, G, 0.2, MAT.beam, s * (w / 2 - 0.02), G / 2, fz - 0.02)); inner.add(box(0.2, h - G, 0.2, MAT.beam, s * (w / 2 + 0.08), G + (h - G) / 2, uz - 0.02)); }
  inner.add(box(w + 0.4, 0.18, 0.2, MAT.beam, 0, h - 0.09, uz - 0.02));
  inner.add(box(0.16, h - G, 0.16, MAT.beam, 0, G + (h - G) / 2, uz - 0.02));
  for (const s of [-1, 1]) { const b = box(0.14, (h - G) * 1.05, 0.12, MAT.beam, s * w * 0.36, G + (h - G) / 2, uz - 0.03); b.rotation.z = s * 0.42; inner.add(b); }
  inner.add(box(w + 0.5, 0.4, d + 0.4, MAT.stone, 0, 0.2, 0));
  // roof + gables + chimney
  const roof = new THREE.Mesh(roofGeo(w + 0.3, d + 0.5, rise, 0.5), MAT.tile[col % 3]); roof.position.y = h; inner.add(roof);
  const D = d + 0.5, gab = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, rise * (D / 2) / (D / 2 + 0.5) - 0.02)]), { depth: w + 0.28, bevelEnabled: false }), wall);
  gab.rotation.y = Math.PI / 2; gab.position.set(-(w + 0.28) / 2, h, 0); inner.add(gab);
  if (hd.chim) { const cx = hd.chim * w * 0.28; inner.add(box(0.7, rise + 1.5, 0.7, MAT.stone, cx, h + (rise + 1.5) / 2 - 0.2, -d * 0.18)); inner.add(box(0.95, 0.22, 0.95, MAT.beam, cx, h + rise + 1.35, -d * 0.18)); }
  // door (pivot at the hinge edge), step, windows
  const dx = hd.dx, pivot = new THREE.Group(); pivot.position.set(dx - 0.5, 0.4, fz + 0.05);
  const leaf = box(1.0, 1.95, 0.09, MAT.door, 0.5, 0.975, 0); pivot.add(leaf); pivot.add(box(0.1, 0.1, 0.08, MAT.brass, 0.84, 1.0, 0.07));
  inner.add(pivot);
  inner.add(box(1.3, 2.15, 0.08, MAT.beam, dx, 1.42, fz - 0.01)); inner.add(box(0.98, 1.93, 0.05, MAT.dark, dx, 1.37, fz + 0.01));
  inner.add(box(1.7, 0.2, 0.8, MAT.stone, dx, 0.3, fz + 0.35));
  windowAt(inner, hd.wx, 1.75, fz + 0.02);
  const uy = G + (h - G) * 0.52;
  for (const s of [-1, 1]) windowAt(inner, s * w * 0.24, uy, uz + 0.02, 0.8, Math.min(1.0, (h - G) * 0.42));
  inner.rotation.z = lean;
  g.position.set(x, 0, z); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  reg(g);
  return { group: g, door: pivot };
};
const built = HOUSES.map((h) => house(h));
const doorPivot = built[HOUSES.findIndex((h) => h.name === "door")].door;
// shop sign (hidden until the workshop opens)
const sign = new THREE.Group();
{
  const S = HOUSES.find((h) => h.name === "shop");
  const t = ctex(P.signCanvas("THE THIEF", "mending & repairs"), false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.81), new THREE.MeshBasicMaterial({ map: t })); m.rotation.y = Math.PI / 2; m.position.x = 0.06; sign.add(m);
  const b = box(0.1, 0.9, 2.7, MAT.beam, 0, 0, 0); sign.add(b);
  sign.position.set(S.x + S.d / 2 + 0.36, 3.42, S.z - S.dx); reg(sign); sign.userData.all = [m, b];
}
// podium for the trial
const podium = new THREE.Group();
{ podium.add(box(1.5, 0.7, 1.5, MAT.wood, 0, 0.35, 0)); podium.add(box(1.7, 0.1, 1.7, MAT.beam, 0, 0.72, 0)); podium.position.set(PODIUM[0], 0, PODIUM[1]); reg(podium); }
// trees, hills, mountains
const blobTree = (x, z, s, mat = MAT.leaf, trunkH = 0) => {
  const g = new THREE.Group();
  if (trunkH) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, trunkH, 7), MAT.trunk); t.position.y = trunkH / 2; g.add(t); }
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s * (0.55 + rnd() * 0.35), 1), mat); b.position.set((rnd() - 0.5) * s * 1.2, trunkH + s * (0.3 + rnd() * 0.5), (rnd() - 0.5) * s * 1.2); b.scale.y = 0.8; g.add(b); }
  g.position.set(x, 0, z); reg(g);
};
for (let i = 0; i < 46; i++) { const s = i % 2 ? 1 : -1, x = s * (17 + rnd() * 40), z = -70 + rnd() * 150; blobTree(x, z, 2.2 + rnd() * 1.6, rnd() < 0.5 ? MAT.leaf : MAT.leaf2, 2 + rnd() * 2); }
for (const z of [-66, 70]) for (let i = 0; i < 8; i++) blobTree(-20 + i * 6 + rnd() * 3, z + rnd() * 8, 2.6 + rnd() * 1.4, MAT.leaf2, 2.6);
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2 + rnd() * 0.3, r = 260 + rnd() * 240;
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), i % 2 ? MAT.hill : MAT.hill2);
  m.scale.set(90 + rnd() * 120, 30 + rnd() * 45, 70 + rnd() * 80); m.position.set(Math.cos(a) * r, -8, Math.sin(a) * r);
  addW(m, false, false);
}
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2 + 0.2, r = 720 + rnd() * 200, hgt = 220 + rnd() * 200, rad = 170 + rnd() * 120;
  const m = new THREE.Mesh(new THREE.ConeGeometry(rad, hgt, 7), MAT.mount); m.position.set(Math.cos(a) * r, hgt / 2 - 10, Math.sin(a) * r); m.rotation.y = rnd() * 3; addW(m, false, false);
  const c = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.36, hgt * 0.36, 7), MAT.snow); c.position.set(m.position.x, hgt * 0.82 - 10 + 1, m.position.z); c.rotation.y = m.rotation.y; addW(c, false, false);
}
// interior room (far from the town): floor, walls, window with a sliding sash, table, cupboard with doors, rug
const RX = ROOM[0], RZ = ROOM[1];
const sash = new THREE.Group(), cupL = new THREE.Group(), cupR = new THREE.Group();
{
  const g = new THREE.Group();
  const fl = new THREE.PlaneGeometry(8, 6.5); fl.rotateX(-Math.PI / 2); const fm = new THREE.Mesh(fl, MAT.floor); fm.position.set(0, 0.02, 0.25); g.add(fm);
  const WH = 4.4, wx = -0.1, ww = 1.5, wy0 = 1.0, wy1 = 2.5; // window opening in the back wall
  g.add(box(4 + wx - ww / 2, WH, 0.3, MAT.plIn, (-4 + wx - ww / 2) / 2, WH / 2, -3.15));
  g.add(box(4 - wx - ww / 2, WH, 0.3, MAT.plIn, (4 + wx + ww / 2) / 2, WH / 2, -3.15));
  g.add(box(ww, wy0, 0.3, MAT.plIn, wx, wy0 / 2, -3.15)); g.add(box(ww, WH - wy1, 0.3, MAT.plIn, wx, (WH + wy1) / 2, -3.15));
  g.add(box(ww + 0.3, 0.12, 0.5, MAT.beam, wx, wy0 - 0.02, -3.05));
  for (const s of [-1, 1]) g.add(box(0.14, wy1 - wy0 + 0.2, 0.4, MAT.beam, wx + s * (ww / 2 + 0.05), (wy0 + wy1) / 2, -3.1));
  g.add(box(ww + 0.3, 0.14, 0.4, MAT.beam, wx, wy1 + 0.05, -3.1));
  for (const s of [-1, 1]) g.add(box(0.3, WH, 6.5, MAT.plIn, s * 4.15, WH / 2, 0.25));
  // front wall with a doorway (never casts shadow so the key light reaches the room)
  const fw = [box(3.35, WH, 0.3, MAT.plIn, -2.325, WH / 2, 3.65), box(3.35, WH, 0.3, MAT.plIn, 2.325, WH / 2, 3.65), box(1.3, WH - 2.3, 0.3, MAT.plIn, 0, (WH + 2.3) / 2, 3.65)];
  for (const m of fw) { m.userData.cast = false; g.add(m); }
  g.add(box(8, 0.18, 0.12, MAT.beam, 0, 0.1, -2.96)); g.add(box(8, 0.2, 0.2, MAT.beam, 0, 3.3, -2.95));
  // sash
  sash.add(box(ww, 0.1, 0.08, MAT.beam, 0, 0.05, 0)); sash.add(box(ww, 0.1, 0.08, MAT.beam, 0, 1.45, 0));
  for (const s of [-1, 0, 1]) sash.add(box(0.08, 1.5, 0.08, MAT.beam, s * (ww / 2 - 0.04), 0.75, 0));
  sash.add(box(ww, 0.06, 0.07, MAT.beam, 0, 0.75, 0));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, 1.5), new THREE.MeshBasicMaterial({ color: 0x9fc4e8, transparent: true, opacity: 0.16, depthWrite: false })); glass.position.set(0, 0.75, 0); glass.userData.noink = true; sash.add(glass);
  sash.position.set(wx, wy0, -3.1); g.add(sash);
  // rug
  const rg = new THREE.PlaneGeometry(3.2, 2.2); rg.rotateX(-Math.PI / 2); const rm = new THREE.Mesh(rg, MAT.rug); rm.position.set(0.3, 0.035, 0.2); g.add(rm);
  const rg2 = new THREE.PlaneGeometry(2.7, 1.7); rg2.rotateX(-Math.PI / 2); const rm2 = new THREE.Mesh(rg2, MAT.rug2); rm2.position.set(0.3, 0.04, 0.2); g.add(rm2);
  const rg3 = new THREE.PlaneGeometry(2.4, 1.4); rg3.rotateX(-Math.PI / 2); const rm3 = new THREE.Mesh(rg3, MAT.rug); rm3.position.set(0.3, 0.045, 0.2); g.add(rm3);
  // table
  const tx = TABLE[0] - RX, tz = TABLE[1] - RZ;
  g.add(box(1.9, 0.1, 0.95, MAT.wood, tx, 0.82, tz));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.1, 0.78, 0.1, MAT.beam, tx + sx * 0.85, 0.39, tz + sz * 0.38));
  // cupboard
  const cx = CUP[0] - RX, cz = CUP[1] - RZ, CW = 1.5, CHh = 2.5, CD = 0.9;
  g.add(box(CW, CHh, 0.08, MAT.dark, cx, CHh / 2, cz - CD / 2));
  for (const s of [-1, 1]) g.add(box(0.08, CHh, CD, MAT.beam, cx + s * CW / 2, CHh / 2, cz));
  g.add(box(CW + 0.2, 0.12, CD + 0.1, MAT.beam, cx, CHh + 0.04, cz)); g.add(box(CW + 0.1, 0.1, CD, MAT.beam, cx, 0.05, cz));
  for (const [grp, s] of [[cupL, -1], [cupR, 1]]) {
    grp.add(box(CW / 2 - 0.02, CHh - 0.16, 0.07, MAT.wood, -s * (CW / 4), 0, 0)); grp.add(box(0.07, 0.2, 0.06, MAT.brass, -s * (CW / 2 - 0.14), 0, 0.06));
    grp.position.set(cx + s * CW / 2, CHh / 2 + 0.02, cz + CD / 2); g.add(grp);
  }
  // wall shelf (under the clock) + a framed picture
  g.add(box(1.2, 0.07, 0.3, MAT.beam, tx, 1.45, -2.86));
  g.add(box(0.9, 0.7, 0.06, MAT.beam, 2.2, 3.0, -2.97)); g.add(box(0.74, 0.54, 0.07, MAT.rug2, 2.2, 3.0, -2.96));
  g.position.set(RX, 0, RZ); reg(g);
  g.traverse((o) => { if (o.userData.noink) { const i = world.indexOf(o); if (i >= 0) world.splice(i, 1); o.layers.set(NOINK); o.castShadow = false; } });
}
// backdrop outside the room: flat silhouettes whose colour follows the time of day
const bgMat = new THREE.MeshBasicMaterial({ color: 0x101830, fog: false }), bgGround = new THREE.MeshBasicMaterial({ color: 0x0c1426, fog: false });
{
  const g = new THREE.Group();
  for (const [x, z, w, h] of [[-7, -16, 8, 6.5], [2.5, -19, 7, 8], [11, -15, 7, 6], [-3, 9.5, 9, 7], [7, 10.5, 8, 6]]) {
    g.add(box(w, h, 5, bgMat, x, h / 2, z));
    const r = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 3, 4), bgMat); r.rotation.y = Math.PI / 4; r.scale.z = 0.8; r.position.set(x, h + 1.5, z); g.add(r);
    for (const sx of [-1, 1]) { const zz = z + (z < 0 ? 2.55 : -2.55); g.add(box(0.8, 1.0, 0.06, winMat, x + sx * w * 0.22, h * 0.55, zz)); }
  }
  for (const z of [-34, 34.4]) { const p = new THREE.PlaneGeometry(120, 60); p.rotateX(-Math.PI / 2); const m = new THREE.Mesh(p, bgGround); m.position.set(0, 0.06, z); g.add(m); }
  g.position.set(RX, 0, RZ); g.traverse((o) => { if (o.isMesh) o.layers.set(NOINK); }); scene.add(g);
}
const worldSet = new Set(world);

// ---------- sky + clouds ----------
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0 } },
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }",
  fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize; varying vec3 vD;
  void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(mix(hor, mid, smoothstep(0.0, 0.22, h)), top, smoothstep(0.18, 0.85, h));
    float s = max(dot(normalize(vD), sunDir), 0.0); c += sunCol * (pow(s, 12.0) * 0.35 + smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.7, s) * 2.0);
    gl_FragColor = vec4(c, 1.0); }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat);
sky.layers.set(NOINK); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
const clouds = [];
for (let i = 0; i < 10; i++) {
  const t = ctex(P.cloudCanvas(i + 3), false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  const a = (i / 10) * Math.PI * 2 + 0.3, r = 850 + (i % 3) * 120;
  m.userData.base = [Math.cos(a) * r, 160 + (i % 4) * 45, Math.sin(a) * r - 100]; m.scale.setScalar(260 + (i % 3) * 90);
  m.layers.set(NOINK); scene.add(m); clouds.push(m);
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun); scene.add(sun.target);

// ---------- cards ----------
const SC = 0.00225; // metres per design unit
const cards = new Map();
const drawFn = {
  front: (p, a) => T.stickFront(p, a.outfit, a.opts),
  side: (p, a) => T.stickSide(p, a.outfit, a.opts),
};
const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; T.fxBlob(new T.Pen(c.getContext("2d")), "#7d7f96"); return ctex(c, false); })();
const multiply = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, fog: false, polygonOffset: true, polygonOffsetFactor: -2 });
const ndCardMat = (map, pullU) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, uPull: pullU }, side: THREE.DoubleSide,
  vertexShader: "uniform float uPull; varying vec2 vUv; varying float vZ; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); float d = length(mv.xyz); mv.xyz *= max(0.15, (d - uPull) / d); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "uniform sampler2D map; varying vec2 vUv; varying float vZ; void main(){ if (texture2D(map, vUv).a < 0.5) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, vZ); }",
});
const getCard = (id, DW, DH) => {
  let c = cards.get(id);
  if (c && c.DW === DW && c.DH === DH) return c;
  if (c) { scene.remove(c.mesh); scene.remove(c.blob); }
  const sc = DW > 600 ? 1.6 : 2;
  const cv = document.createElement("canvas"); cv.width = Math.round(DW * sc); cv.height = Math.round(DH * sc);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(DW * SC, DH * SC); geo.translate(0, (DH * SC) / 2 - 25 * SC, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const pullU = { value: 0.3 };
  mat.customProgramCacheKey = () => "cardpull";
  mat.onBeforeCompile = (sh) => { sh.uniforms.uPull = pullU; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uPull;").replace("#include <project_vertex>", "#include <project_vertex>\n{ float d = length(mvPosition.xyz); mvPosition.xyz *= max(0.15, (d - uPull) / d); gl_Position = projectionMatrix * mvPosition; }"); };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.order = "YXZ"; mesh.castShadow = true; mesh.layers.set(NOINK);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
  mesh.userData.nd = ndCardMat(tex, pullU);
  const bg = new THREE.PlaneGeometry(1.1, 0.55); bg.rotateX(-Math.PI / 2);
  const blob = new THREE.Mesh(bg, multiply(blobTex)); blob.layers.set(NOINK);
  scene.add(mesh); scene.add(blob);
  c = { id, DW, DH, sc, cv, g: cv.getContext("2d"), tex, mesh, blob, key: "", pullU };
  cards.set(id, c);
  return c;
};
const fxCards = new Map();
const fxDraw = {
  burst: (p, s) => T.fxBurst(p, s.t, s.col || "#fff3b0"), puff: (p, s) => T.fxPuff(p, s.t), bird: (p, s) => T.fxBird(p, s.t), smoke: (p, s) => T.fxSmoke(p, s.t),
  glow: (p) => T.fxGlow(p), chair: (p, s) => T.fxChair(p, !!s.k), clock: (p, s) => T.fxClock(p, s.t, s.h || 0, !!s.k), kettle: (p, s) => T.fxKettle(p, !!s.k, s.w || 0),
  box: (p, s) => T.fxBox(p, s.t || 0), flame: (p, s) => T.fxFlame(p, s.t), candle: (p, s) => T.fxCandle(p, s.t), zzz: (p, s) => T.fxZzz(p, s.t), boards: (p, s) => T.fxBoards(p, s.t),
  spark: (p, s) => T.fxSpark(p, s.t), note: (p, s) => { p.g.translate(20, 10); T.fxNote(p, s.k || 0, s.col || "#2a2440"); },
};
const FXSIZE = { burst: [500, 500], puff: [300, 300], bird: [200, 100], smoke: [300, 600], glow: [256, 256], chair: [400, 500], clock: [400, 500], kettle: [400, 400], box: [400, 400], flame: [200, 260], candle: [200, 400], zzz: [300, 300], boards: [400, 400], spark: [200, 200], note: [240, 240] };
const getFx = (id, kind) => {
  let c = fxCards.get(id);
  if (c && c.kind === kind) return c;
  const [w, h] = FXSIZE[kind];
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, h / w), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: kind !== "glow", blending: kind === "glow" ? THREE.AdditiveBlending : THREE.NormalBlending }));
  mesh.layers.set(NOINK); scene.add(mesh);
  c = { id, kind, cv, g: cv.getContext("2d"), tex, mesh, key: "" };
  fxCards.set(id, c);
  return c;
};

// ---------- post ----------
const rtColor = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const rtND = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const rtPost = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const ndWorld = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: "varying vec3 vN; varying float vZ; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vZ = -mv.z; gl_Position = projectionMatrix * mv; }",
  fragmentShader: "varying vec3 vN; varying float vZ; void main(){ vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0); gl_FragColor = vec4(n, vZ); }",
});
const FSV = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
const inkMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rtColor.texture }, tND: { value: rtND.texture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, px: { value: PX },
    inkCol: { value: new THREE.Color(0x0b0a0c) }, fogCol: { value: new THREE.Color() }, sat: { value: 1.08 }, expo: { value: 1 },
    lift: { value: new THREE.Vector3(0.02, 0.025, 0.05) }, gain: { value: new THREE.Vector3(1, 1, 1) }, vign: { value: 0.18 }, flash: { value: 0 }, inkK: { value: 1 }, dbg: { value: 0 },
  },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float px; uniform vec3 inkCol; uniform vec3 fogCol;
  uniform float sat; uniform float expo; uniform vec3 lift; uniform vec3 gain; uniform float vign; uniform float flash; uniform float inkK; uniform float dbg; varying vec2 vUv;
  vec3 shoulder(vec3 x){ return mix(x, 0.78 + 0.3 * (1.0 - exp(-(x - 0.78) / 0.3)), step(0.78, x)); }
  void main(){
    vec3 c = texture2D(tColor, vUv).rgb * expo;
    vec4 nd = texture2D(tND, vUv); float zc = nd.a > 0.0 ? nd.a : 1e5; vec3 nc = nd.xyz;
    float ink = 0.0;
    if (dot(nc, nc) > 0.25 && zc < 4000.0) {
      float w = mix(5.0, 3.2, smoothstep(1.8, 4.5, log(zc))) * px;
      float bD = 99.0, bC = 99.0;
      for (int d = 0; d < 4; d++) {
        vec2 st = d == 0 ? vec2(1.0, 0.0) : d == 1 ? vec2(0.0, 1.0) : d == 2 ? vec2(0.7071, 0.7071) : vec2(0.7071, -0.7071);
        for (int s = 1; s <= 6; s++) {
          float fs = float(s);
          float fl = fs * (d > 1 ? 1.4142 : 1.0);
          if (fl > w + 1.0) break;
          vec2 o = st * texel * fs;
          vec4 a = texture2D(tND, vUv + o), b = texture2D(tND, vUv - o);
          if (a.a <= 0.0) a.a = 1e5; if (b.a <= 0.0) b.a = 1e5;
          float k = 2.0 - zc / a.a - zc / b.a;
          if (k > 0.02) bD = min(bD, fl);
          if (dot(a.xyz, a.xyz) > 0.25 && abs(a.a - zc) < zc * 0.03 && dot(a.xyz, nc) < 0.7) bC = min(bC, fl);
          if (dot(b.xyz, b.xyz) > 0.25 && abs(b.a - zc) < zc * 0.03 && dot(b.xyz, nc) < 0.7) bC = min(bC, fl);
        }
      }
      float iD = 1.0 - smoothstep(w - 0.6, w + 0.4, bD);
      float iC = (1.0 - smoothstep(w * 0.7 - 0.6, w * 0.7 + 0.4, bC)) * 0.85;
      ink = max(iD, iC) * (1.0 - smoothstep(170.0, 560.0, zc)) * inkK;
    }
    vec3 ic = mix(inkCol, fogCol * 0.55, 0.3 * smoothstep(60.0, 400.0, zc));
    c = mix(c, ic, ink);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, sat);
    c = c * gain + lift * (1.0 - clamp(c, 0.0, 1.0));
    c = shoulder(c);
    vec2 q = (vUv - 0.5) * vec2(0.75, 1.0);
    c *= 1.0 - vign * smoothstep(0.25, 0.75, length(q));
    c = mix(c, vec3(1.0), flash);
    if (dbg > 0.5) c = vec3(ink, zc / 60.0, dot(nc, nc));
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const dofMat = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: rtPost.texture }, tND: { value: rtND.texture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, focus: { value: 10 }, cInf: { value: 0 }, cMax: { value: 18 } },
  vertexShader: FSV,
  fragmentShader: `uniform sampler2D tColor; uniform sampler2D tND; uniform vec2 texel; uniform float focus; uniform float cInf; uniform float cMax; varying vec2 vUv;
  float coc(float z){ z = z > 0.0 ? z : 1e5; return min(cMax, cInf * abs(1.0 - focus / max(z, 0.05))); }
  vec3 enc(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main(){
    vec3 c0 = texture2D(tColor, vUv).rgb;
    float cc = coc(texture2D(tND, vUv).a);
    if (cInf < 0.3 || cc < 0.6) { gl_FragColor = vec4(enc(c0), 1.0); return; }
    vec3 acc = c0; float ws = 1.0;
    for (int i = 0; i < 48; i++) {
      float fi = float(i) + 0.5, r = sqrt(fi / 48.0) * cc, a = fi * 2.39996;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * texel;
      float cq = coc(texture2D(tND, uv).a);
      float w = clamp(cq - r + 1.0, 0.0, 1.0);
      acc += texture2D(tColor, uv).rgb * w; ws += w;
    }
    gl_FragColor = vec4(enc(acc / ws), 1.0);
  }`,
});

// ---------- per-frame ----------
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const col = (c) => new THREE.Color(c);
const applyLight = (L, S) => {
  const d = new THREE.Vector3(Math.cos(L.el * Math.PI / 180) * Math.cos(L.az * Math.PI / 180), Math.sin(L.el * Math.PI / 180), Math.cos(L.el * Math.PI / 180) * Math.sin(L.az * Math.PI / 180)).normalize();
  sun.color.setRGB(L.sun[0], L.sun[1], L.sun[2]); sun.intensity = Math.PI;
  hemi.color.setRGB(L.amb[0], L.amb[1], L.amb[2]); hemi.groundColor.setRGB(L.gnd[0], L.gnd[1], L.gnd[2]); hemi.intensity = Math.PI;
  const c = v3(S.shadow.c), r = S.shadow.r;
  sun.position.copy(c).addScaledVector(d, 200); sun.target.position.copy(c);
  const sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 420; sc.updateProjectionMatrix();
  skyMat.uniforms.top.value.copy(col(L.top)).convertSRGBToLinear(); skyMat.uniforms.hor.value.copy(col(L.hor)).convertSRGBToLinear(); skyMat.uniforms.mid.value.copy(col(L.mid)).convertSRGBToLinear();
  skyMat.uniforms.sunDir.value.copy(d); if (L.moon) skyMat.uniforms.sunCol.value.setRGB(0.9, 0.9, 0.8); else skyMat.uniforms.sunCol.value.setRGB(L.sun[0] * 0.6, L.sun[1] * 0.5, L.sun[2] * 0.4); skyMat.uniforms.sunSize.value = L.disc || 0;
  scene.fog.color.copy(col(L.hor)).convertSRGBToLinear(); scene.fog.near = L.fog[0]; scene.fog.far = L.fog[1];
  inkMat.uniforms.fogCol.value.copy(scene.fog.color);
  inkMat.uniforms.sat.value = L.sat; inkMat.uniforms.expo.value = L.expo ?? 1;
  inkMat.uniforms.lift.value.set(L.lift[0], L.lift[1], L.lift[2]); inkMat.uniforms.gain.value.set(L.gain[0], L.gain[1], L.gain[2]);
  return d;
};

const camRightOf = () => { const r = new THREE.Vector3(); camera.matrixWorld.extractBasis(r, new THREE.Vector3(), new THREE.Vector3()); return r; };

window.renderFrame = (f) => {
  const S = frameState(f);
  const WS = S.world;
  doorPivot.rotation.y = -(WS.door || 0) * 1.9;
  sash.position.y = 1.0 + (WS.sash || 0) * 1.25;
  cupL.rotation.y = -(WS.cup || 0) * 2.0; cupR.rotation.y = (WS.cup || 0) * 2.0;
  for (const m of sign.userData.all) m.visible = !!WS.sign;
  podium.traverse((o) => { o.visible = !!WS.podium; });
  { const k = S.light.win || 0; winMat.color.setRGB(0.03 + 1.6 * k, 0.05 + 1.05 * k, 0.1 + 0.3 * k); bgMat.color.setRGB(0.5 - 0.485 * k, 0.42 - 0.4 * k, 0.3 - 0.24 * k); bgGround.color.setRGB(0.2 - 0.19 * k, 0.33 - 0.31 * k, 0.1 - 0.06 * k); }
  // camera
  camera.position.set(...S.cam.pos); camera.up.set(0, 1, 0); camera.lookAt(...S.cam.look);
  camera.fov = S.cam.fov; camera.updateProjectionMatrix();
  if (S.cam.roll) camera.rotateZ((S.cam.roll * Math.PI) / 180);
  camera.updateMatrixWorld();
  const camR = camRightOf();
  applyLight(S.light, S);
  // cards
  const seen = new Set();
  for (const a of S.actors) {
    const DW = a.wide ? 1000 : 600, DH = a.wide ? 1150 : 1000;
    const c = getCard(a.id, DW, DH); seen.add(a.id);
    const key = a.kind + JSON.stringify(a.opts) + (a.outfitKey || "");
    if (key !== c.key) {
      c.key = key;
      c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      c.g.setTransform(c.sc, 0, 0, c.sc, 0, 0); c.g.translate((DW - 600) / 2, DH - 1000);
      drawFn[a.kind](new T.Pen(c.g), a);
      c.tex.needsUpdate = true;
    }
    const y = a.y ?? 0;
    c.mesh.position.set(a.pos[0], y + (a.lift || 0), a.pos[1]);
    const s = a.scale || 1;
    let mirror = 1;
    if (a.kind === "side" && a.dir) mirror = a.dir[0] * camR.x + a.dir[1] * camR.z < 0 ? -1 : 1;
    c.mesh.scale.set(s * mirror, s, s);
    c.mesh.rotation.set(0, Math.atan2(camera.position.x - a.pos[0], camera.position.z - a.pos[1]), ((a.roll || 0) * Math.PI) / 180);
    c.mesh.material.color.setRGB(...S.light.card);
    c.pullU.value = a.pull ?? 0.3;
    c.mesh.visible = a.visible !== false;
    c.blob.visible = a.visible !== false && a.blob !== false && !a.lift;
    c.blob.position.set(a.pos[0], (a.y ?? 0) + 0.05, a.pos[1]);
    c.blob.scale.setScalar(s);
    c.blob.rotation.y = c.mesh.rotation.y;
  }
  for (const [id, c] of cards) if (!seen.has(id)) { c.mesh.visible = false; c.blob.visible = false; }
  // fx
  const seenFx = new Set();
  for (const e of (window.NOFX ? [] : S.fx)) {
    const c = getFx(e.id, e.kind); seenFx.add(e.id);
    const key = JSON.stringify([e.t, e.seed, e.col, e.k, e.h, e.w]);
    if (key !== c.key) {
      c.key = key; c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, c.cv.width, c.cv.height);
      fxDraw[e.kind](new T.Pen(c.g), e); c.tex.needsUpdate = true;
    }
    c.mesh.position.set(...e.pos);
    if (e.flat) { c.mesh.rotation.set(-Math.PI / 2, 0, e.rot || 0); }
    else if (e.yaw !== undefined) { c.mesh.rotation.set(0, e.yaw, e.rot || 0); }
    else { c.mesh.quaternion.copy(camera.quaternion); if (e.rot) c.mesh.rotateZ(e.rot); }
    c.mesh.scale.set(e.size * (e.mirror ? -1 : 1), e.size, e.size);
    c.mesh.material.opacity = e.alpha ?? 1;
    c.mesh.material.color.setRGB(...(e.kind === "glow" ? [1, 1, 1] : S.light.card));
    c.mesh.visible = true;
  }
  for (const [id, c] of fxCards) if (!seenFx.has(id)) c.mesh.visible = false;
  // clouds drift
  for (const [i, m] of clouds.entries()) { const b = m.userData.base; m.position.set(b[0] + f * 0.25 * (1 + (i % 3) * 0.3), b[1], b[2]); m.quaternion.copy(camera.quaternion); m.material.color.setRGB(...S.light.cloud); }
  sky.position.copy(camera.position);

  // pass 1: colour
  renderer.shadowMap.enabled = true; renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rtColor); renderer.setClearColor(0x000000, 1); renderer.clear();
  renderer.render(scene, camera);
  // pass 2: normal + depth (world inked, cards = depth only, everything else hidden)
  const hidden = [], swapped = [];
  scene.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (o.userData.nd) { swapped.push([o, o.material]); o.material = o.userData.nd; }
    else if (worldSet.has(o)) { swapped.push([o, o.material]); o.material = ndWorld; }
    else { hidden.push(o); o.visible = false; }
  });
  const fog = scene.fog; scene.fog = null; renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rtND); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.render(scene, camera);
  scene.fog = fog;
  for (const [o, m] of swapped) o.material = m;
  for (const o of hidden) o.visible = true;
  // pass 3: ink + grade
  inkMat.uniforms.dbg.value = window.INKDBG ? 1 : 0;
  inkMat.uniforms.flash.value = S.flash || 0; inkMat.uniforms.vign.value = S.vign ?? 0.18;
  fsQuad.material = inkMat; renderer.setRenderTarget(rtPost); renderer.render(fsScene, fsCam);
  // pass 4: lens blur -> screen
  dofMat.uniforms.focus.value = S.dof.focus; dofMat.uniforms.cInf.value = window.NODOF ? 0 : S.dof.cInf * PX;
  fsQuad.material = dofMat; renderer.setRenderTarget(null); renderer.render(fsScene, fsCam);
  return canvas.toDataURL("image/jpeg", 0.95);
};
window.TOTAL = TOTAL;
window.dbgND = () => { const out = []; const buf = new Float32Array(4); for (const [x, y] of [[540, 1700], [540, 1200], [540, 900], [540, 700], [300, 300], [800, 1500]]) { renderer.readRenderTargetPixels(rtND, x, y, 1, 1, buf); out.push([x, y, ...Array.from(buf).map((v) => +v.toFixed(3))]); } return JSON.stringify(out); };
window.ready = true;
