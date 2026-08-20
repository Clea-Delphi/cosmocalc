/* ============================================================
   CosmoCalc — wavelength to RGB (Dan Bruton approximation)
   ============================================================ */

function wavelengthToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / (440 - 380); g = 0; b = 1; }
  else if (nm >= 440 && nm < 490) { r = 0; g = (nm - 440) / (490 - 440); b = 1; }
  else if (nm >= 490 && nm < 510) { r = 0; g = 1; b = -(nm - 510) / (510 - 490); }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / (580 - 510); g = 1; b = 0; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / (645 - 580); b = 0; }
  else if (nm >= 645 && nm <= 780) { r = 1; g = 0; b = 0; }
  else { return { r: 0, g: 0, b: 0 }; }

  let factor;
  if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / (420 - 380);
  else if (nm >= 420 && nm <= 700) factor = 1;
  else if (nm > 700 && nm <= 780) factor = 0.3 + 0.7 * (780 - nm) / (780 - 700);
  else factor = 0;

  return {
    r: Math.round(255 * Math.pow(r * factor, 0.8)),
    g: Math.round(255 * Math.pow(g * factor, 0.8)),
    b: Math.round(255 * Math.pow(b * factor, 0.8))
  };
}

function rgbToHex(r, g, b) {
  const to2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + to2(r) + to2(g) + to2(b);
}

function rgbToCss(r, g, b) {
  return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
}

/* Complementary (inverse) color on the RGB wheel */
function inverseRgb(r, g, b) {
  return { r: 255 - r, g: 255 - g, b: 255 - b };
}

/* ---- Universal Pendulum radiesthesia color -------------------------
   Clea's CAD-laid-out color wedge (pendulum angle -> nm), piecewise
   linear through her measured anchors:
     51.5 deg  -> 780 nm  (darkest scarlet, edge of visible)
     74.5 deg  -> 518 nm  (D, green)
     90.0 deg  -> 440 nm  (indigo / blue-violet, North)
     104.6 deg -> 380 nm  (violet, highest visible)
   Below 51.5 = infra-red; above 104.6 = ultraviolet.
   A note's color is read at the octave that falls inside the wedge
   (octave-shift the harmonic angle by x2 until it lands in 51.5-104.6). */

const WEDGE_MIN = 51.5;
const WEDGE_MAX = 104.6;
const WEDGE_ANCHORS = [
  { angle: 51.5,  nm: 780 }, // darkest scarlet
  { angle: 74.5,  nm: 518 }, // D, green
  { angle: 90.0,  nm: 440 }, // indigo (North)
  { angle: 104.6, nm: 380 }  // violet
];

function wedgeNm(angle) {
  if (angle <= WEDGE_MIN) return WEDGE_ANCHORS[0].nm;
  if (angle >= WEDGE_MAX) return WEDGE_ANCHORS[WEDGE_ANCHORS.length - 1].nm;
  for (let i = 0; i < WEDGE_ANCHORS.length - 1; i++) {
    const a = WEDGE_ANCHORS[i], b = WEDGE_ANCHORS[i + 1];
    if (angle >= a.angle && angle <= b.angle) {
      const t = (angle - a.angle) / (b.angle - a.angle);
      return a.nm + t * (b.nm - a.nm);
    }
  }
  return WEDGE_ANCHORS[WEDGE_ANCHORS.length - 1].nm;
}

/* Grok reference table: nm range -> color name */
const NM_COLOR_NAMES = [
  [380, 397, 'Deep Violet'], [397, 414, 'Violet'], [414, 431, 'Blue-Violet'],
  [431, 448, 'Indigo'], [448, 465, 'Blue'], [465, 482, 'Cyan-Blue'],
  [482, 499, 'Cyan'], [499, 516, 'Blue-Green'], [516, 533, 'Green'],
  [533, 550, 'Yellow-Green'], [550, 567, 'Light Green'], [567, 584, 'Yellow'],
  [584, 601, 'Yellow-Orange'], [601, 618, 'Orange'], [618, 635, 'Red-Orange'],
  [635, 652, 'Scarlet'], [652, 669, 'Light Scarlet'], [669, 686, 'Bright Red'],
  [686, 703, 'Deep Red'], [703, 720, 'Dark Red'], [720, 737, 'Crimson'],
  [737, 754, 'Dark Crimson'], [754, 771, 'Deep Scarlet Red'], [771, 780, 'Darkest Scarlet Red']
];

function colorNameFromNm(nm) {
  for (const [lo, hi, name] of NM_COLOR_NAMES) {
    if (nm >= lo && nm <= hi) return name;
  }
  if (nm < 380) return 'Ultra-Violet';
  if (nm > 780) return 'Infra-Red';
  return '—';
}

/* Pendulum color for a frequency: octave-shift the harmonic angle into
   the wedge, read nm, return color + name + pendulum angle. */
function pendulumColorFromHz(hz) {
  if (!(hz > 0) || !isFinite(hz)) return null;
  let angle = hz / (432 * Math.PI / 180);
  while (angle < WEDGE_MIN) angle *= 2;
  while (angle > WEDGE_MAX) angle /= 2;
  const nm = wedgeNm(angle);
  const rgb = wavelengthToRGB(nm);
  return {
    name: colorNameFromNm(nm),
    nm: nm,
    angle: angle,
    r: rgb.r, g: rgb.g, b: rgb.b
  };
}

/* ---- Universal Pendulum 400-grade scale -------------------------
   The White -> Black arc (West, 0/400g) with the Greek-letter
   archetypes. These special settings are Turenne / Chaumery's
   (French physical radiesthesia lineage). The 400/0 mark is the
   White/Black boundary, labeled Negative Green/Omega: the precise
   mark is beneficial (BioGeometry/Karim scare people off it, but we
    reclaim it). The Pi-ray sits ~6°15' (6.944 grades) from Omega toward
    Black. Negative Green the color also lives at 270° in the 24-color
    wheel. 1 grade = 0.9 degree. */

const PENDULUM_GRADES = [
  { grade: 366.5, name: 'White',          glyph: 'W' },
  { grade: 370,   name: 'Epsilon',        glyph: 'ε' },
  { grade: 375,   name: 'Chi',            glyph: 'χ' },
  { grade: 380,   name: 'Lambda',         glyph: 'λ' },
  { grade: 385,   name: 'Psi',            glyph: 'ψ' },
  { grade: 390,   name: 'Rho',            glyph: 'ρ' },
  { grade: 400,   name: 'Negative Green/Omega', glyph: 'Ω' },
  { grade: 5,     name: 'Alpha',          glyph: 'α' },
  { grade: 6.944, name: 'Pi-ray',         glyph: 'π' },
  { grade: 10,    name: 'Beta',           glyph: 'β' },
  { grade: 15,    name: 'Theta',          glyph: 'θ' },
  { grade: 20,    name: 'Xi',             glyph: 'ξ' },
  { grade: 25,    name: 'Nu',             glyph: 'ν' },
  { grade: 30,    name: 'Zeta',           glyph: 'ζ' },
  { grade: 33.5,  name: 'Black',          glyph: '—' }
];

const PENDULUM_24COLOR = [
  { degree: 0,   grade: 0,      name: 'Red' },
  { degree: 15,  grade: 16.67,  name: 'Red-Orange' },
  { degree: 30,  grade: 33.33,  name: 'Orange' },
  { degree: 45,  grade: 50,     name: 'Orange-Yellow' },
  { degree: 60,  grade: 66.67,  name: 'Yellow' },
  { degree: 75,  grade: 83.33,  name: 'Yellow-Green' },
  { degree: 90,  grade: 100,    name: 'Green' },
  { degree: 105, grade: 116.67, name: 'Turquoise' },
  { degree: 120, grade: 133.33, name: 'Blue' },
  { degree: 135, grade: 150,    name: 'Blue-Indigo' },
  { degree: 150, grade: 166.67, name: 'Indigo' },
  { degree: 165, grade: 183.33, name: 'Indigo-Violet' },
  { degree: 180, grade: 200,    name: 'Violet' },
  { degree: 195, grade: 216.67, name: 'Violet-UV' },
  { degree: 210, grade: 233.33, name: 'Ultra-Violet' },
  { degree: 225, grade: 250,    name: 'UV-White' },
  { degree: 240, grade: 266.67, name: 'White' },
  { degree: 255, grade: 283.33, name: 'White-Grey' },
  { degree: 270, grade: 300,    name: 'Negative Green' },
  { degree: 285, grade: 316.67, name: 'Grey-Black' },
  { degree: 300, grade: 333.33, name: 'Black' },
  { degree: 315, grade: 350,    name: 'Black-IR' },
  { degree: 330, grade: 366.67, name: 'Infra-Red' },
  { degree: 345, grade: 383.33, name: 'IR-Red' }
];

/* Pi-ray: special ray 6°15' (6.25°) from Negative Green/Omega toward
   Black, i.e. 276.25° (306.94g) in the 24-color wheel. */
const PENDULUM_PIRAY = { degree: 276.25, grade: 306.94, name: 'Pi-ray' };

function gradeFromAngle(angle) {
  return ((angle * 10 / 9) % 400 + 400) % 400;
}

function pendulumMarkerForGrade(grade) {
  const sets = [
    { list: PENDULUM_GRADES,  label: 'Chaumery/Turenne' },
    { list: PENDULUM_24COLOR, label: '24-color' },
    { list: [PENDULUM_PIRAY], label: 'Pi-ray' }
  ];
  let best = null, bestDist = Infinity, bestSet = null;
  for (const { list, label } of sets) {
    for (const m of list) {
      const g = m.grade === 400 ? 0 : m.grade;
      let d = Math.abs(grade - g);
      d = Math.min(d, 400 - d);
      if (d < bestDist) { bestDist = d; best = m; bestSet = label; }
    }
  }
  return { marker: best, dist: bestDist, set: bestSet };
}

/* ---- Universal Pendulum color at an input angle -------------------
   The radiesthesia pendulum color at the angle's position on the
   24-color wheel. The swatch is the engine's honest octave/overtone
   color at that step's angle (same as the main swatch) — no hand-picked
   colors. Negative Green is the one exception: the boundary between
   darkest scarlet (#8B0000) and deepest magenta (#8B008B) = #8B0045. */
const NEGATIVE_GREEN_RGB = [139, 0, 69]; // #8B0045

function engineColorAtAngle(angle) {
  const a = (angle === 0) ? 0.01 : angle;
  const c = pendulumColorFromHz(angleToHz(a));
  return c ? { r: c.r, g: c.g, b: c.b } : { r: 0, g: 0, b: 0 };
}

function pendulumColorFromAngle(angle) {
  const grade = gradeFromAngle(angle);
  const markers = PENDULUM_24COLOR.concat([PENDULUM_PIRAY]);
  let best = null, bestDist = Infinity;
  for (const m of markers) {
    let d = Math.abs(grade - m.grade);
    d = Math.min(d, 400 - d);
    if (d < bestDist) { bestDist = d; best = m; }
  }
  let rgb;
  if (best.name === 'Negative Green') rgb = NEGATIVE_GREEN_RGB;
  else rgb = engineColorAtAngle(best.degree);
  return { name: best.name, degree: best.degree, grade: best.grade, r: rgb.r, g: rgb.g, b: rgb.b };
}
