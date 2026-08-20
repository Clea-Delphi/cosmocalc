/* ============================================================
   CosmoCalc — honest math engine
   No fudge factors. Root 432 Hz sits at exactly 1 radian.
   ============================================================ */

const C = 299792458;          // speed of light, m/s
const SPEED_OF_SOUND = 343;   // speed of sound in air, m/s
const VISIBLE_MIN_HZ = 4.3e14; // visible light band (lower edge)
const VISIBLE_MAX_HZ = 7.5e14; // visible light band (upper edge)
const AUDIBLE_MIN_HZ = 20;     // audible band (lower edge)
const AUDIBLE_MAX_HZ = 20000;  // audible band (upper edge)
const A4_432 = 432;            // 432 tuning reference

/* ---- Angle <-> Hz -------------------------------------------------
   Hz = Angle(deg) * 432 * pi/180
   At angle = 1 radian (57.2958 deg), Hz = 432 exactly. */
function angleToHz(angleDeg) {
  return angleDeg * 432 * Math.PI / 180;
}
function hzToAngle(hz) {
  return hz / (432 * Math.PI / 180);
}

/* ---- Grade <-> Angle ----------------------------------------------
   1 grade (gon) = 0.9 degree. 400 grades = 360 degrees. */
function gradeToAngle(grade) {
  return grade * 9 / 10;
}

/* ---- Octave shifting ----------------------------------------------
   Shift a sound Hz up by powers of 2 toward the visible light band.
   The visible band is narrower than one octave, so no exact power of 2
   may land inside it. We pick the octave-shifted value closest to the
   band center, then nudge one octave if that lands inside the band.
   Returns the light frequency and the octave count. */
function soundHzToLight(soundHz) {
  const center = Math.sqrt(VISIBLE_MIN_HZ * VISIBLE_MAX_HZ);
  let n = Math.round(Math.log2(center / soundHz));
  let f = soundHz * Math.pow(2, n);
  if (f < VISIBLE_MIN_HZ) {
    const f2 = f * 2;
    if (f2 <= VISIBLE_MAX_HZ) { f = f2; n++; }
  } else if (f > VISIBLE_MAX_HZ) {
    const f2 = f / 2;
    if (f2 >= VISIBLE_MIN_HZ) { f = f2; n--; }
  }
  return { fLight: f, octaves: n };
}

/* Shift a light frequency down by powers of 2 toward the audible band.
   The audible band spans many octaves, so a value always lands inside.
   Returns the sound frequency and the octave count. */
function lightHzToSound(fLight) {
  let f = fLight;
  let n = 0;
  while (f > AUDIBLE_MAX_HZ) { f /= 2; n++; }
  while (f < AUDIBLE_MIN_HZ) { f *= 2; n--; }
  return { soundHz: f, octaves: n };
}

/* ---- Conversions -------------------------------------------------- */
function hzToNm(soundHz) {
  const { fLight } = soundHzToLight(soundHz);
  return C / fLight; // meters
}
function nmToHz(nm) {
  const fLight = C / (nm * 1e-9);
  const { soundHz } = lightHzToSound(fLight);
  return soundHz;
}
function lengthToHz(lengthM) {
  return SPEED_OF_SOUND / lengthM;
}
function hzToLength(hz) {
  return SPEED_OF_SOUND / hz;
}

/* ---- Musical note (equal temperament, A4 = 432 Hz) ---------------- */
function hzToNote(hz) {
  if (!(hz > 0)) return null;
  const n = Math.round(69 + 12 * Math.log2(hz / A4_432));
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const name = names[((n % 12) + 12) % 12];
  const octave = Math.floor(n / 12) - 1;
  const exact = A4_432 * Math.pow(2, (n - 69) / 12);
  const cents = 1200 * Math.log2(hz / exact);
  return { name: name + octave, cents: cents };
}

/* ---- Master: compute the full result set from a sound Hz ---------- */
function computeFromHz(soundHz) {
  if (!(soundHz > 0) || !isFinite(soundHz)) return null;
  const angle = hzToAngle(soundHz);
  const nm = hzToNm(soundHz);
  const length = hzToLength(soundHz);
  const note = hzToNote(soundHz);
  const { fLight, octaves } = soundHzToLight(soundHz);
  return {
    angle,          // degrees
    hz: soundHz,    // sound frequency
    nm,             // meters (wavelength of light)
    length,         // meters (wavelength of sound)
    note,
    fLight,
    octaves
  };
}
