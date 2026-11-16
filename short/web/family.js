// Original Telugu family cast for drawHuman(). Each has a distinct face shape, features, build and height.
// face: top (crown y), temple/cheek/jaw half-widths, cheekY/jawY, chin y and chin half-width, eye/nose/mouth placement.

// Atta: broad, heavy-jawed face with a double chin; sharp cat eyes, broad nose, thin stern mouth; stout.
export const ATTA = { female: true, kind: "saree", scale: 0.97, tilt: -0.04,
  face: { top: 66, temple: 80, cheek: 90, cheekY: 176, jaw: 80, jawY: 226, chin: 262, chinW: 40, eyeX: 34, eyeY: 156, noseY: 196, mouthY: 224 },
  eyeStyle: "cat", noseStyle: "broad", mouthW: 22, browW: 6, browGap: 26, browAsym: 4, folds: true, doubleChin: true, earR: 22, kajal: true,
  sh: 112, waist: 100, hip: 104, armW: 34, neckW: 26,
  skin: "#c98a5e", hair: "#2a2226", grey: true, bun: true, iris: "#3a2214",
  saree: "#8e1f3b", border: "#e0b13a", motif: "#e0b13a", blouse: "#2f6e4a", sleeveBorder: "#e0b13a",
  bottu: 11, earring: "#e5b84a", nosering: true, haram: true, bangles: "#e0b13a", lips: "#8a3a3a", browCol: "#3a2a24" };

// Kodalu: soft heart-shaped face with a small pointed chin; big doe eyes, button nose, full lips; slim, a bit shorter.
export const KODALU = { female: true, kind: "saree", scale: 0.94, tilt: 0.06,
  face: { top: 70, temple: 76, cheek: 76, cheekY: 158, jaw: 54, jawY: 222, chin: 256, chinW: 14, eyeX: 31, eyeY: 154, noseY: 190, mouthY: 214 },
  eyeStyle: "doe", noseStyle: "button", mouthW: 20, browW: 5, browGap: 30, strands: true, earR: 18, kajal: true,
  sh: 92, waist: 72, hip: 80, armW: 26, neckW: 19,
  skin: "#dba27a", hair: "#1e1614", braid: true, iris: "#5a3418",
  saree: "#e8708e", border: "#2f8f5b", motif: "#ffd7e0", blouse: "#2f8f5b", sleeveBorder: "#e0b13a",
  bottu: 6, sindoor: true, earring: "#e5b84a", mangalasutram: true, bangles: "#2f9a5e", lips: "#c24a5a" };

// Koduku: long face with a square jaw; small eyes, long nose, thick straight brows; broad shoulders, tallest.
export const KODUKU = { kind: "pants", scale: 1.03, tilt: 0.02,
  face: { top: 58, temple: 74, cheek: 78, cheekY: 164, jaw: 62, jawY: 234, chin: 266, chinW: 24, eyeX: 31, eyeY: 152, noseY: 198, mouthY: 228 },
  eyeStyle: "small", noseStyle: "long", mouthW: 22, browW: 8, browGap: 24, browShape: "straight", earR: 21,
  sh: 116, waist: 96, hip: 98, armW: 32, neckW: 28,
  skin: "#b97a52", hair: "#1c1410", shirt: "#6fa8dc", check: "#2a4a7a", pocket: true,
  pant: "#3d4250", moustache: "#1c1410", stubble: true, sleeve: 0.5 };

// Mamagaru: pear-shaped face, wide jowls; droopy eyes with bags, bulb nose, wrinkles; round belly, sloping shoulders.
export const MAMAGARU = { kind: "pancha", scale: 0.99, tilt: -0.03,
  face: { top: 64, temple: 70, cheek: 82, cheekY: 172, jaw: 78, jawY: 234, chin: 266, chinW: 32, eyeX: 32, eyeY: 156, noseY: 200, mouthY: 230 },
  eyeStyle: "droopy", noseStyle: "bulb", mouthW: 22, browW: 8, browGap: 26, eyeBags: true, wrinkles: true, folds: true, neckLines: true, earR: 25,
  sh: 102, slope: 12, waist: 110, hip: 116, belly: true, armW: 32, neckW: 30,
  skin: "#b67e56", hair: "#e6e2dc", bald: true,
  shirt: "#f4f1e8", pancha: "#f8f5ec", border: "#d8a93a", kanduva: "#c8452f", moustache: "#ece8e2", bigMou: true,
  glasses: true, vibhuti: true, browCol: "#d8d4ce", sleeve: 1.35 };
