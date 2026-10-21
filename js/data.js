// Qarbon · js/data.js: saving, loading, change stamps and merging (for sync), card levels, reading CSV files.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= saving and loading =================
let storageOK = true;
try { localStorage.setItem("_qtest", "1"); localStorage.removeItem("_qtest"); } catch (e) { storageOK = false; }

const FRESH = { cards: [], decks: [], music: "", directions: {}, books: [], readingBook: "", stackId: "", newPerDay: 10, newDate: "", newDone: 0, voice: "female", sessions: 0, timerMode: "pomodoro" };

// where you stopped reading a book: { ch: chapter (from 0), y: how far down it (0 to 1) } or { page } for a PDF
function cleanPlace(p) {
  if (!p || typeof p !== "object") return {};
  const out = {};
  if (Number.isInteger(p.ch) && p.ch >= 0) out.ch = p.ch;
  if (Number(p.y) >= 0 && Number(p.y) <= 1) out.y = Number(p.y);
  if (Number.isInteger(p.page) && p.page >= 1) out.page = p.page;
  return out;
}

// extra book details from the library (year, Project Gutenberg number, Open Library ids): only these, as plain values
function cleanMeta(m) {
  if (!m || typeof m !== "object") return {};
  const out = {};
  if (Number(m.year)) out.year = Number(m.year);
  if (Number(m.gutenberg)) out.gutenberg = Number(m.gutenberg);
  if (typeof m.openLibrary === "string" && /^\/works\/OL\d+W$/.test(m.openLibrary)) out.openLibrary = m.openLibrary;
  if (Number(m.cover)) out.cover = Number(m.cover);
  if (typeof m.parts === "string") out.parts = m.parts.slice(0, 200);
  if (Number(m.pages)) out.pages = Math.round(Number(m.pages));
  if (typeof m.textId === "string" && /^[a-z0-9-]+$/.test(m.textId)) out.textId = m.textId;   // a built-in text to read in Qarbon
  return out;
}

// make sure whatever we loaded (or restored) has the right shape
function clean(data) {
  const s = Object.assign({}, FRESH, data && typeof data === "object" ? data : {});
  s.cards = (Array.isArray(s.cards) ? s.cards : [])
    .filter(c => c && typeof c.front === "string" && c.front.trim())
    .map(c => {
      c.interval = Number(c.interval) > 0 ? Number(c.interval) : 1;
      c.ease = Number(c.ease) >= 1.3 ? Number(c.ease) : 2.5;   // cards from before Anki-style scheduling start at 2.5
      c.reviews = Number(c.reviews) || 0;
      c.correct = Number(c.correct) || 0;
      c.due = typeof c.due === "string" && c.due ? c.due : today();
      // the English → French schedule (only exists once you've studied that direction)
      if (c.rev && typeof c.rev === "object") {
        c.rev = { interval: Number(c.rev.interval) > 0 ? Number(c.rev.interval) : 1,
                  ease: Number(c.rev.ease) >= 1.3 ? Number(c.rev.ease) : 2.5,
                  reviews: Number(c.rev.reviews) || 0, correct: Number(c.rev.correct) || 0,
                  due: typeof c.rev.due === "string" && c.rev.due ? c.rev.due : today() };
      } else delete c.rev;
      if (c.suspended !== true) delete c.suspended;
      if (typeof c.key !== "string" || !c.key) delete c.key;
      c.t = Number(c.t) || 0;   // when this card last changed (for syncing)
      return c;
    });
  // card direction per stack id, e.g. { beginner150: "both" }
  const dirs = s.directions && typeof s.directions === "object" ? s.directions : {};
  s.directions = Object.fromEntries(Object.entries(dirs).filter(([, v]) => DIRECTIONS[v]));
  // your own decks: a name plus the list of words (French fronts) in it
  s.decks = (Array.isArray(s.decks) ? s.decks : [])
    .filter(d => d && typeof d.name === "string" && Array.isArray(d.words))
    .map(d => ({ id: String(d.id || "deck-" + Math.random()), name: d.name, words: d.words.map(String), added: d.added || "",
                 t: Number(d.t) || 0 }));
  s.music = typeof s.music === "string" ? s.music : "";   // the YouTube/SoundCloud link you pasted
  // your books: title, author, chapter names, how many chapters are done, and reading time
  s.books = (Array.isArray(s.books) ? s.books : [])
    .filter(b => b && typeof b.title === "string" && Array.isArray(b.chapters))
    .map(b => {
      const chapters = b.chapters.map(String).slice(0, 500);
      return { id: String(b.id || "book-" + Math.random()), title: b.title, author: typeof b.author === "string" ? b.author : "",
               chapters, done: Math.min(chapters.length, Math.max(0, Math.round(Number(b.done)) || 0)),
               minutes: Number(b.minutes) || 0, sessions: Number(b.sessions) || 0,
               added: typeof b.added === "string" ? b.added : "", finished: typeof b.finished === "string" ? b.finished : "",
               log: Array.isArray(b.log) ? b.log.slice(-200) : [],
               meta: cleanMeta(b.meta),
               place: cleanPlace(b.place),   // where you stopped in the reader
               open: !!b.open || !chapters.length,   // open = more chapters to come (the total isn't known yet)
               t: Number(b.t) || 0 };
    });
  if (!s.books.some(b => b.id === s.readingBook)) s.readingBook = "";
  s.stackId = typeof s.stackId === "string" ? s.stackId : "";   // the deck you used last
  s.readerSize = Number(s.readerSize) >= 14 && Number(s.readerSize) <= 28 ? Number(s.readerSize) : 18;   // the reader's text size (this device)
  // for syncing: things you deleted ("card:chat" → when), and when your settings last changed
  const del = s.deleted && typeof s.deleted === "object" ? s.deleted : {};
  s.deleted = Object.fromEntries(Object.entries(del).filter(([k, v]) => /^(card|deck|book):/.test(k) && Number(v) > 0).map(([k, v]) => [k, Number(v)]));
  s.settingsT = Number(s.settingsT) || 0;
  s.newPerDay = PER_DAY_CHOICES.includes(Number(s.newPerDay)) ? Number(s.newPerDay) : 10;
  s.newDone = Number(s.newDone) || 0;
  s.sessions = Number(s.sessions) || 0;
  if (!VOICES[s.voice]) s.voice = "female";
  if (!TIMER_MODES[s.timerMode] && s.timerMode !== "custom") s.timerMode = "pomodoro";
  // your Custom timer: each length is kept between its smallest and largest allowed value
  const ct = s.customTimer && typeof s.customTimer === "object" ? s.customTimer : {};
  s.customTimer = Object.fromEntries(Object.entries(CUSTOM_LIMITS).map(([k, [lo, hi]]) =>
    [k, Math.min(hi, Math.max(lo, Math.round(Number(ct[k])) || TIMER_MODES.pomodoro[k]))]));
  return s;
}

function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  return clean(data);
}
// ----- "last changed" times, so two devices can be merged item by item -----
// Every card, deck and book has a "t" (when it last changed, in milliseconds), and your settings share one
// "settingsT". Instead of stamping things all over the code, save() compares each item with how it looked at
// the last save: whatever changed gets stamped "now", and whatever disappeared goes into state.deleted.
const cardKey = c => c.key || c.front.trim().toLowerCase();   // same as wordKey(): the word a card is known by
const SYNCED_SETTINGS = ["newPerDay", "voice", "timerMode", "customTimer", "music", "directions"];
const settingsOf = s => Object.fromEntries(SYNCED_SETTINGS.map(k => [k, s[k]]));

// a "fingerprint" (JSON text) of every item, without its t, by "kind:id"
function snapshot(s) {
  const out = {};
  const add = (key, obj) => { const { t, ...rest } = obj; out[key] = JSON.stringify(rest); };
  s.cards.forEach(c => add("card:" + cardKey(c), c));
  s.decks.forEach(d => add("deck:" + d.id, d));
  s.books.forEach(b => add("book:" + b.id, b));
  out.settings = JSON.stringify(settingsOf(s));
  out.counters = JSON.stringify([s.sessions, s.newDate, s.newDone]);   // not stamped, but worth syncing
  return out;
}
let snap = {};   // the fingerprints at the last save

// stamp whatever changed since the last save; returns true if anything did
function stampChanges() {
  const now = Date.now(), next = snapshot(state);
  let changed = false;
  [["card", state.cards, cardKey], ["deck", state.decks, d => d.id], ["book", state.books, b => b.id]].forEach(([kind, list, keyOf]) => {
    for (const it of list) {
      const key = kind + ":" + keyOf(it);
      if (snap[key] !== next[key]) { it.t = now; delete state.deleted[key]; changed = true; }
    }
  });
  if (snap.settings !== next.settings) { state.settingsT = now; changed = true; }
  if (snap.counters !== next.counters) changed = true;
  for (const key of Object.keys(snap))
    if (key !== "settings" && key !== "counters" && !(key in next)) { state.deleted[key] = now; changed = true; }
  snap = next;
  return changed;
}

// quiet = these changes came from syncing, so don't stamp them as new (and don't sync again)
function save(quiet) {
  const changed = quiet ? (snap = snapshot(state), false) : stampChanges();
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch (e) { storageOK = false; }
  if (changed) syncSoon();
}
let state = load();
snap = snapshot(state);   // what's saved right now; the next save compares against this

// syncing: which account this device is signed in to (kept separately from your save, never in backups)
const AUTH_KEY = "qarbon-auth";
function loadAuth() {
  try { const a = JSON.parse(localStorage.getItem(AUTH_KEY)); return a && a.refresh && a.id ? a : null; } catch (e) { return null; }
}
let auth = loadAuth();
let syncTimer = null, syncing = false, syncAgain = false;

// ----- merging two saves: this device's and the copy online -----
// For each card, deck and book: the newer version wins. If both have the same time (e.g. old saves from
// before syncing existed), the one with more progress wins. Deleting something wins over older versions.
const PROGRESS = {
  card: c => (c.reviews || 0) + (c.rev ? c.rev.reviews || 0 : 0),
  deck: d => (d.words || []).length,
  book: b => (b.done || 0) + (b.sessions || 0)
};
function mergeLists(kind, mine, theirs, keyOf, deleted) {
  const out = new Map();   // keeps this device's order, with new items from the other added after
  for (const it of [...mine, ...theirs]) {
    const k = keyOf(it), have = out.get(k), ti = it.t || 0, th = have ? have.t || 0 : -1;
    if (!have || ti > th || (ti === th && PROGRESS[kind](it) > PROGRESS[kind](have))) out.set(k, it);
  }
  return [...out.values()].filter(it => !((deleted[kind + ":" + keyOf(it)] || 0) > (it.t || 0)));
}
// ----- the same book or deck, added on two devices -----
// Each device gives a new book or deck its own id, so the same book added on your phone and on your Mac
// shows up twice (matching by id can't tell they're the same). These find such "twins" by name and fold
// them into one: the copy with more progress keeps its id, the other is recorded as deleted (so it
// doesn't come back from the other device), and its progress is added in.
const bookTwin = b => b.title.trim().toLowerCase() + "|" + (b.author || "").trim().toLowerCase();
const deckTwin = d => d.name.trim().toLowerCase();

// two copies of one book → one. keep = the copy with more progress.
function combineBooks(keep, other) {
  // reading diaries: every session from both copies, once each (the same session synced to both counts once)
  const seen = new Set(), log = [];
  for (const e of [...keep.log, ...other.log]) {
    const k = JSON.stringify(e);
    if (!seen.has(k)) { seen.add(k); log.push(e); }
  }
  log.sort((x, y) => String(x.date || "").localeCompare(String(y.date || "")));
  const logMinutes = log.reduce((n, e) => n + (Number(e.minutes) || 0), 0);
  const longer = other.chapters.length > keep.chapters.length ? other : keep;   // the fuller chapter list
  const newer = (other.t || 0) > (keep.t || 0) ? other : keep;                  // the copy you used last
  const earliest = (x, y) => [x, y].filter(Boolean).sort()[0] || "";
  return { ...keep,
    chapters: longer.chapters, open: longer.open,
    done: Math.min(longer.chapters.length, Math.max(keep.done, other.done)),
    // reading time: never less than either copy, and more if the diaries add up to more
    minutes: Math.max(keep.minutes, other.minutes, logMinutes),
    sessions: Math.max(keep.sessions, other.sessions, log.length),
    log: log.slice(-200),
    added: earliest(keep.added, other.added), finished: earliest(keep.finished, other.finished),
    meta: { ...other.meta, ...keep.meta },
    place: newer.place };
}
// two copies of one deck → one, with the words from both
const combineDecks = (keep, other) => ({ ...keep, words: [...new Set([...keep.words, ...other.words])],
                                          added: [keep.added, other.added].filter(Boolean).sort()[0] || "" });

// fold twins in a merged list. moves = { old id: id it was folded into }, so things that pointed at the
// old one (the book you're reading, a deck's card direction, a PDF) can follow it.
function foldTwins(kind, list, twinOf, combine, deleted, moves) {
  const now = Date.now(), at = new Map(), out = [];
  for (const it of list) {
    const k = twinOf(it);
    if (!at.has(k)) { at.set(k, out.length); out.push(it); continue; }
    const have = out[at.get(k)];
    // more progress keeps its id; if that's a tie, the smaller id (so both devices pick the same one)
    const p1 = PROGRESS[kind](it), p0 = PROGRESS[kind](have);
    const itWins = p1 > p0 || (p1 === p0 && it.id < have.id);
    const [keep, gone] = itWins ? [it, have] : [have, it];
    out[at.get(k)] = { ...combine(keep, gone), t: now };
    deleted[kind + ":" + gone.id] = now;
    moves[gone.id] = keep.id;
  }
  return out;
}
// follow moves to where something ended up (it may have been folded more than once)
function movedTo(moves, id) {
  while (moves[id]) id = moves[id];
  return id;
}

function mergeStates(a, b) {   // a = this device, b = online (both already cleaned)
  const deleted = { ...a.deleted };
  for (const [k, t] of Object.entries(b.deleted)) deleted[k] = Math.max(deleted[k] || 0, t);
  const forgetBefore = Date.now() - 90 * 864e5;   // deletions older than 90 days are forgotten
  for (const k of Object.keys(deleted)) if (deleted[k] < forgetBefore) delete deleted[k];
  const later = (a.newDate || "") >= (b.newDate || "") ? a : b;
  const moves = { deck: {}, book: {} };
  const decks = foldTwins("deck", mergeLists("deck", a.decks, b.decks, d => d.id, deleted), deckTwin, combineDecks, deleted, moves.deck);
  const books = foldTwins("book", mergeLists("book", a.books, b.books, x => x.id, deleted), bookTwin, combineBooks, deleted, moves.book);
  // a folded deck's card direction goes to the deck it was folded into
  const settings = settingsOf(b.settingsT > a.settingsT ? b : a);
  settings.directions = { ...settings.directions };
  for (const [from, dir] of Object.entries(settings.directions)) {
    if (!moves.deck[from]) continue;
    const to = movedTo(moves.deck, from);
    if (!settings.directions[to]) settings.directions[to] = dir;
    delete settings.directions[from];
  }
  return {
    cards: mergeLists("card", a.cards, b.cards, cardKey, deleted),
    decks, books, moves,
    deleted,
    settings,
    settingsT: Math.max(a.settingsT, b.settingsT),
    sessions: Math.max(a.sessions, b.sessions),   // focus sessions done: the bigger count
    newDate: later.newDate,                        // new cards started today: the bigger count, if it's the same day
    newDone: a.newDate === b.newDate ? Math.max(a.newDone, b.newDone) : later.newDone
  };
}

// ================= bigger files kept on this device only (IndexedDB) =================
// IndexedDB is the browser's storage area for big things. Qarbon's database "qarbon-files" has three stores:
//   pdfs      the PDFs attached to books (js/reading.js)
//   songs     your own music files, as raw bytes (js/music.js)
//   songinfo  each song's name, artist, album and cover, kept apart so the list loads without reading every song
// Nothing here is synced or put in backups: these files stay on the device they were added on.
function fileStore(name, mode) {
  return new Promise((ok, fail) => {
    const r = indexedDB.open("qarbon-files", 2);   // version 2 added the song stores
    r.onupgradeneeded = () => ["pdfs", "songs", "songinfo"].forEach(n => {
      if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
    });
    r.onerror = () => fail(r.error);
    r.onsuccess = () => ok(r.result.transaction(name, mode).objectStore(name));
  });
}
// run one request on a store (like st => st.get(id)) and get its result
const fileDo = (name, mode, fn) => fileStore(name, mode).then(st => new Promise((ok, fail) => {
  const r = fn(st); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
}));

// ================= levels (read from each card's tags, like "A1;core") =================
const LEVELS = { A1: "Beginner (A1)", A2: "Elementary (A2)", B1: "Intermediate (B1)", B2: "Upper intermediate (B2)" };
const levelOf = c => (c.tags || "").split(";").map(t => t.trim()).find(t => LEVELS[t]) || "";

// ================= CSV reading (handles quoted fields) =================
function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = ""; rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r[0] && r[0].trim()));
}
