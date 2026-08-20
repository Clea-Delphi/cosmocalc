/* ============================================================
   CosmoCalc — iPhone-Notes-style journal (localStorage)
   ============================================================ */

const JOURNAL_KEY = 'cosmocalc.journal.v1';

function loadNotes() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(notes));
}

function createNote(title, body) {
  const notes = loadNotes();
  notes.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title: title || '',
    body: body || '',
    created: Date.now(),
    updated: Date.now()
  });
  saveNotes(notes);
  return notes;
}

function updateNote(id, title, body) {
  const notes = loadNotes();
  const n = notes.find((x) => x.id === id);
  if (n) {
    n.title = title || '';
    n.body = body || '';
    n.updated = Date.now();
  }
  saveNotes(notes);
  return notes;
}

function deleteNote(id) {
  let notes = loadNotes();
  notes = notes.filter((x) => x.id !== id);
  saveNotes(notes);
  return notes;
}

function formatStamp(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
