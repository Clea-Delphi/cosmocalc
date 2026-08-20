/* ============================================================
   CosmoCalc — UI wiring
   ============================================================ */

(function () {
  'use strict';

  const doors = {
    angle: { input: document.getElementById('in-angle'), unit: '°' },
    nm:    { input: document.getElementById('in-nm'),    unit: 'nm' },
    hz:    { input: document.getElementById('in-hz'),    unit: 'Hz' },
    length:{ input: document.getElementById('in-length'),unit: 'm' },
    grade: { input: document.getElementById('in-grade'), unit: 'g' }
  };

  const out = {
    angle:   document.getElementById('out-angle'),
    hz:      document.getElementById('out-hz'),
    nm:      document.getElementById('out-nm'),
    length:  document.getElementById('out-length'),
    note:    document.getElementById('out-note'),
    octaves: document.getElementById('out-octaves'),
    swatch:  document.getElementById('swatch'),
    hex:     document.getElementById('out-hex'),
    rgb:     document.getElementById('out-rgb'),
    invSwatch: document.getElementById('inv-swatch'),
    invHex:  document.getElementById('out-inv-hex'),
    radName: document.getElementById('out-rad-name'),
    radGrade: document.getElementById('out-rad-grade'),
    overtone: document.getElementById('out-overtone')
  };

  /* Unbound angle: raw angle display, not bound to 432. */
  const unboundInput = document.getElementById('in-unbound');
  const glyphArmB = document.getElementById('glyph-arm-b');
  const gradeArmB = document.getElementById('grade-arm-b');
  const outUnboundDeg = document.getElementById('out-unbound-deg');
  const outUnboundGrade = document.getElementById('out-unbound-grade');

  let lastSource = null;

  function fmt(v, digits) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  /* Format a large frequency in scientific notation with superscripts,
     e.g. 4.75e14 -> "4.75×10¹⁴". */
  function formatScientific(v) {
    if (!isFinite(v) || v === 0) return '—';
    const exp = Math.floor(Math.log10(Math.abs(v)));
    const mant = v / Math.pow(10, exp);
    const sup = String(exp).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d] || d).join('');
    return mant.toFixed(2) + '×10' + sup;
  }

  function render(result) {
    if (!result) {
      Object.values(out).forEach((el) => {
        if (el && el.tagName === 'SPAN') el.textContent = '—';
      });
      out.swatch.style.background = '#222';
      out.invSwatch.style.background = '#222';
      out.radName.textContent = '—';
      out.radGrade.textContent = '—';
      unboundInput.value = '';
      renderUnbound(0);
      return;
    }

    out.angle.textContent = fmt(result.angle, 4) + '°';
    out.hz.textContent = fmt(result.hz, 4) + ' Hz';
    out.nm.textContent = fmt(result.nm * 1e9, 2) + ' nm';
    out.length.textContent = fmt(result.length, 4) + ' m';

    if (result.note) {
      const cents = Math.round(result.note.cents);
      const detune = Math.abs(cents) >= 1 ? ' (' + (cents > 0 ? '+' : '') + cents + '¢)' : '';
      out.note.textContent = result.note.name + detune;
    } else {
      out.note.textContent = '—';
    }
    out.octaves.textContent = result.octaves + ' octaves up to light';
    const fLight = result.hz * Math.pow(2, result.octaves);
    out.overtone.textContent = formatScientific(fLight) + ' Hz';

    const nm = result.nm * 1e9;
    const rgb = wavelengthToRGB(nm);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const inv = inverseRgb(rgb.r, rgb.g, rgb.b);
    const invHex = rgbToHex(inv.r, inv.g, inv.b);

    out.swatch.style.background = rgbToCss(rgb.r, rgb.g, rgb.b);
    out.hex.textContent = hex;
    out.rgb.textContent = rgb.r + ', ' + rgb.g + ', ' + rgb.b;
    out.invSwatch.style.background = rgbToCss(inv.r, inv.g, inv.b);
    out.invHex.textContent = invHex;

    const rad = pendulumColorFromAngle(result.angle);
    if (rad) {
      out.radName.textContent = rad.name + ' @ ' + result.angle.toFixed(2) + '°';
      const grade = gradeFromAngle(result.angle);
      const pm = pendulumMarkerForGrade(grade);
      out.radGrade.textContent = grade.toFixed(2) + 'g · ' + pm.marker.name +
        (pm.marker.glyph ? ' ' + pm.marker.glyph : '') +
        ' · ' + pm.set;
    }

    /* Reflect the current angle in the unbound glyph. */
    unboundInput.value = fmt(result.angle, 4);
    renderUnbound(result.angle);
  }

  function computeFromDoor(source) {
    const el = doors[source].input;
    const raw = parseFloat(el.value);
    if (isNaN(raw) || raw <= 0) { render(null); return; }

    let hz;
    if (source === 'angle') hz = angleToHz(raw);
    else if (source === 'nm') hz = nmToHz(raw);
    else if (source === 'hz') hz = raw;
    else if (source === 'length') hz = lengthToHz(raw);
    else if (source === 'grade') hz = angleToHz(gradeToAngle(((raw % 400) + 400) % 400));

    lastSource = source;
    render(computeFromHz(hz));
  }

  Object.keys(doors).forEach((key) => {
    doors[key].input.addEventListener('input', () => computeFromDoor(key));
  });

  /* ---- Unbound angle glyphs ----
     A faint circle with a bold angle line. Degrees: 0° at West,
     increasing clockwise (90° = North). Grades: 0g at South,
     increasing clockwise. The angle is raw — it does NOT drive the
     432 conversions. */
  function renderGrade(g) {
    const gg = ((g % 400) + 400) % 400;
    const cx = 100, cy = 100, r = 88;
    const rad = gg * Math.PI / 200;
    const x2 = cx - r * Math.sin(rad);
    const y2 = cy + r * Math.cos(rad);
    gradeArmB.setAttribute('x2', x2);
    gradeArmB.setAttribute('y2', y2);
  }

  function renderUnbound(angleDeg) {
    const a = ((angleDeg % 360) + 360) % 360;
    const cx = 100, cy = 100, r = 88;
    const rad = a * Math.PI / 180;
    const x2 = cx - r * Math.cos(rad);
    const y2 = cy - r * Math.sin(rad);
    glyphArmB.setAttribute('x2', x2);
    glyphArmB.setAttribute('y2', y2);
    outUnboundDeg.textContent = fmt(angleDeg, 4) + '°';
    const g = gradeFromAngle(angleDeg);
    outUnboundGrade.textContent = fmt(g, 4) + 'g';
    renderGrade(g);
  }

  unboundInput.addEventListener('input', () => {
    const raw = parseFloat(unboundInput.value);
    if (isNaN(raw)) { renderUnbound(0); return; }
    renderUnbound(raw);
  });

  /* ---- Length converter (m / cm / decimal ft / decimal in) ---- */
  const conv = {
    m:  document.getElementById('conv-m'),
    cm: document.getElementById('conv-cm'),
    ft: document.getElementById('conv-ft'),
    in: document.getElementById('conv-in')
  };
  const M_TO_CM = 100;
  const M_TO_FT = 3.28084;
  const M_TO_IN = 39.3701;

  function fmtNum(v, digits) {
    if (!isFinite(v)) return '';
    return parseFloat(v.toFixed(digits)).toString();
  }

  function convFrom(key) {
    const raw = parseFloat(conv[key].value);
    if (isNaN(raw) || raw < 0) {
      Object.keys(conv).forEach((k) => { if (k !== key) conv[k].value = ''; });
      return;
    }
    let m;
    if (key === 'm') m = raw;
    else if (key === 'cm') m = raw / M_TO_CM;
    else if (key === 'ft') m = raw / M_TO_FT;
    else if (key === 'in') m = raw / M_TO_IN;
    conv.m.value = fmtNum(m, 6);
    conv.cm.value = fmtNum(m * M_TO_CM, 4);
    conv.ft.value = fmtNum(m * M_TO_FT, 4);
    conv.in.value = fmtNum(m * M_TO_IN, 4);
  }
  Object.keys(conv).forEach((k) => conv[k].addEventListener('input', () => convFrom(k)));

  /* ---- Journal ---- */
  const journalList = document.getElementById('journal-list');
  const noteTitle = document.getElementById('note-title');
  const noteBody = document.getElementById('note-body');
  const addBtn = document.getElementById('note-add');
  const cancelBtn = document.getElementById('note-cancel');
  const editor = document.getElementById('note-editor');
  let editingId = null;

  function renderJournal() {
    const notes = loadNotes();
    journalList.innerHTML = '';
    if (notes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'journal-empty';
      empty.textContent = 'No notes yet. Capture a reading, a color, a hunch.';
      journalList.appendChild(empty);
      return;
    }
    notes.forEach((n) => {
      const card = document.createElement('div');
      card.className = 'journal-card';

      const head = document.createElement('div');
      head.className = 'journal-card-head';

      const title = document.createElement('div');
      title.className = 'journal-card-title';
      title.textContent = n.title || 'Untitled';

      const stamp = document.createElement('div');
      stamp.className = 'journal-card-stamp';
      stamp.textContent = formatStamp(n.updated);

      head.appendChild(title);
      head.appendChild(stamp);

      const body = document.createElement('div');
      body.className = 'journal-card-body';
      body.textContent = n.body || '';

      const actions = document.createElement('div');
      actions.className = 'journal-card-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-ghost';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditor(n));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-ghost btn-danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        deleteNote(n.id);
        renderJournal();
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      card.appendChild(head);
      card.appendChild(body);
      card.appendChild(actions);
      journalList.appendChild(card);
    });
  }

  function openEditor(n) {
    editingId = n ? n.id : null;
    noteTitle.value = n ? n.title : '';
    noteBody.value = n ? n.body : '';
    editor.classList.add('open');
    noteTitle.focus();
  }

  function closeEditor() {
    editor.classList.remove('open');
    editingId = null;
    noteTitle.value = '';
    noteBody.value = '';
  }

  addBtn.addEventListener('click', () => {
    if (editingId) {
      updateNote(editingId, noteTitle.value, noteBody.value);
    } else {
      createNote(noteTitle.value, noteBody.value);
    }
    closeEditor();
    renderJournal();
  });

  cancelBtn.addEventListener('click', closeEditor);

  document.getElementById('note-new').addEventListener('click', () => openEditor(null));

  renderJournal();

  /* ---- Theme toggle (dark / grey) ---- */
  const themeToggle = document.getElementById('theme-toggle');
  const THEME_KEY = 'cosmocalc.theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeToggle.textContent = t === 'dark' ? '☀' : '☾';
    localStorage.setItem(THEME_KEY, t);
  }
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'grey' : 'dark');
  });
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
})();
