// Qarbon · js/data.js: saving, loading, change stamps and merging (for sync), card levels, reading CSV files.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= saving and loading =================
let storageOK = true;
try { localStorage.setItem("_qtest", "1"); localStorage.removeItem("_qtest"); } catch (e) { storageOK = false; }

const FRESH = { cards: [], decks: [], playlists: [], music: "", directions: {}, books: [], readingBook: "", stackId: "", courseId: COURSE_ID, courses: {}, newPerDay: 10, newDate: "", newDone: 0, packDate: "", packCount: 0, journey: 0, voice: "female", sessions: 0, timerMode: "pomodoro",
                bar: {}, barLevel: "medium", typeAnswer: {}, habits: {}, goal: "10-20", session: null };

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
  // a cover from Google Books (only their own image addresses)
  if (typeof m.coverUrl === "string" && /^https:\/\/books\.google(usercontent)?\.com\/[^\s"'<>]{1,400}$/.test(m.coverUrl)) out.coverUrl = m.coverUrl;
  if (typeof m.parts === "string") out.parts = m.parts.slice(0, 200);
  if (Number(m.pages)) out.pages = Math.round(Number(m.pages));
  if (typeof m.textId === "string" && /^[a-z0-9-]+$/.test(m.textId)) out.textId = m.textId;   // a built-in text to read in Qarbon
  return out;
}

// your playlists (js/music.js): { id, name, items, t }. Each item is a link { k: "link", link, title }
// or one of your own songs { k: "song", id, title, artist, album }. A song's file stays on the device it was added on,
// so the item keeps enough to find it again (its id there, or its title + artist + album on another device).
const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
// B.A.R. Exam scores, per course or deck: { french: { best: { easy: round, medium: round, hard: round }, last: [round, …] } }
// A round = { id (when it ended, ms), level, right, total, secs (time used on the test), date }. At most the last 10 are kept.
const BAR_LEVELS = ["easy", "medium", "hard"], BAR_KEEP = 10;
function cleanRound(r) {
  if (!r || typeof r !== "object" || !BAR_LEVELS.includes(r.level)) return null;
  const total = Math.round(Number(r.total)), right = Math.round(Number(r.right));
  if (!(total >= 1 && total <= 50 && right >= 0 && right <= total)) return null;
  return { id: Number(r.id) || 0, level: r.level, right, total, secs: Math.max(0, Math.min(999, Math.round(Number(r.secs) || 0))),
           date: typeof r.date === "string" ? r.date.slice(0, 10) : "" };
}
function cleanBar(b) {
  const out = {};
  for (const [k, v] of Object.entries(b && typeof b === "object" ? b : {})) {
    if (!v || typeof v !== "object" || k.length > 80) continue;
    const best = {};
    for (const lv of BAR_LEVELS) { const r = cleanRound(v.best && v.best[lv]); if (r && r.level === lv) best[lv] = r; }
    const last = (Array.isArray(v.last) ? v.last : []).map(cleanRound).filter(Boolean).sort((x, y) => y.id - x.id).slice(0, BAR_KEEP);
    out[k] = { best, last };
  }
  return out;
}
// is round a better than round b? More right (as a share of the round), then faster
const betterRound = (a, b) => !b || a.right / a.total > b.right / b.total || (a.right / a.total === b.right / b.total && a.secs < b.secs);
// two devices' scores: the better best of each level, and the newest 10 rounds from both
function mergeBar(a, b) {
  const out = {};
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = (a || {})[k] || { best: {}, last: [] }, y = (b || {})[k] || { best: {}, last: [] };
    const best = {};
    for (const lv of BAR_LEVELS) {
      const p = x.best[lv], q = y.best[lv];
      if (p || q) best[lv] = p && q ? (betterRound(q, p) ? q : p) : p || q;
    }
    const seen = new Map([...x.last, ...y.last].map(r => [r.id, r]));
    out[k] = { best, last: [...seen.values()].sort((m, n) => n.id - m.id).slice(0, BAR_KEEP) };
  }
  return out;
}

// 🌍 Habits (js/habits.js): your study time, per device, per day: { "dev-…": { "2026-10-28": { s: { review: 340, reading: 1200 }, r: 42, ok: 37 } } }
// s = seconds per activity, r = cards answered, ok = answered right (Hard, Good or Easy). Each device only ever adds to its
// own record, so syncing can't count the same minute twice: the totals add up every device's record.
const HABIT_DAYS = 400;   // days kept per device (a bit over a year)
const dayRx = /^\d{4}-\d\d-\d\d$/;
function cleanHabits(h) {
  const out = {};
  for (const [dev, days] of Object.entries(h && typeof h === "object" ? h : {})) {
    if (!/^[\w-]{1,40}$/.test(dev) || !days || typeof days !== "object") continue;
    const keep = Object.keys(days).filter(d => dayRx.test(d)).sort().slice(-HABIT_DAYS);
    out[dev] = Object.fromEntries(keep.map(d => {
      const x = days[d] && typeof days[d] === "object" ? days[d] : {}, s = {};
      for (const [k, v] of Object.entries(x.s && typeof x.s === "object" ? x.s : {}))
        if (/^[a-z]{1,12}$/.test(k) && Number(v) > 0) s[k] = Math.min(86400, Math.round(Number(v) * 10) / 10);   // seconds, to a tenth
      return [d, { s, r: Math.max(0, Math.round(Number(x.r)) || 0), ok: Math.max(0, Math.round(Number(x.ok)) || 0) }];
    }));
  }
  return out;
}
// two copies of the habit records: for each device and day, the bigger number of each kind (a record only grows)
function mergeHabits(a, b) {
  const out = {};
  for (const dev of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = (a || {})[dev] || {}, y = (b || {})[dev] || {};
    out[dev] = {};
    for (const d of new Set([...Object.keys(x), ...Object.keys(y)])) {
      const p = x[d] || { s: {} }, q = y[d] || { s: {} }, s = {};
      for (const k of new Set([...Object.keys(p.s), ...Object.keys(q.s)])) s[k] = Math.max(p.s[k] || 0, q.s[k] || 0);
      out[dev][d] = { s, r: Math.max(p.r || 0, q.r || 0), ok: Math.max(p.ok || 0, q.ok || 0) };
    }
  }
  return out;
}
// a session running on this device (js/habits.js): { act, start, end (0 = open-ended), counted (time counted up to), timer (the Focus timer) }
function cleanSession(x) {
  if (!x || typeof x !== "object" || !/^[a-z]{1,12}$/.test(x.act) || !(Number(x.start) > 0)) return null;
  const start = Number(x.start);
  return { act: x.act, start, end: Number(x.end) > start ? Number(x.end) : 0,
           counted: Math.max(start, Number(x.counted) || start), timer: x.timer === true };
}

function cleanPlaylists(list) {
  return (Array.isArray(list) ? list : [])
    .filter(p => p && typeof p.name === "string" && p.name.trim() && Array.isArray(p.items))
    .map(p => ({ id: String(p.id || "pl-" + Math.random()), name: p.name.trim().slice(0, 60),
                 items: p.items.filter(it => it && (it.k === "song" ? typeof it.id === "string"
                                                   : it.k === "link" && /^https:\/\/[^\s"'<>]{1,500}$/.test(it.link)))
                               .slice(0, 500)
                               .map(it => it.k === "song"
                                 ? { k: "song", id: it.id.slice(0, 40), title: str(it.title, 200), artist: str(it.artist, 200), album: str(it.album, 200) }
                                 : { k: "link", link: it.link, title: str(it.title, 200) }),
                 t: Number(p.t) || 0 }));
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
      // the card's language: "es" for Spanish (build 69). French cards (and cards from before) have none.
      if (typeof c.lang !== "string" || !/^[a-z]{2}$/.test(c.lang) || c.lang === "fr") delete c.lang;
      // the collection (js/collection.js): got = the day the card went into your binder (first seen in a pack),
      // pulled = it came as a rare pull from a harder deck
      if (typeof c.got !== "string" || !/^\d{4}-\d\d-\d\d$/.test(c.got)) delete c.got;
      if (c.pulled !== true) delete c.pulled;
      c.t = Number(c.t) || 0;   // when this card last changed (for syncing)
      return c;
    });
  // card direction per deck id, e.g. { french: "both" }
  const dirs = s.directions && typeof s.directions === "object" ? s.directions : {};
  s.directions = Object.fromEntries(Object.entries(dirs).filter(([, v]) => DIRECTIONS[v]));
  // build 64: the six Levels and "All my cards" became one French course. Its direction = Level 1's, else the one
  // most of the old decks used; the deck you were on becomes the course (your own decks stay as they were)
  if (!s.directions[COURSE_ID]) {
    const old = OLD_STACKS.map(id => s.directions[id]).filter(Boolean);
    const most = old.sort((a, b) => old.filter(v => v === b).length - old.filter(v => v === a).length)[0];
    const pick = s.directions.beginner150 || most;
    if (pick) s.directions[COURSE_ID] = pick;
  }
  OLD_STACKS.forEach(id => { delete s.directions[id]; });
  // your own decks: a name plus the list of words (French fronts) in it
  s.decks = (Array.isArray(s.decks) ? s.decks : [])
    .filter(d => d && typeof d.name === "string" && Array.isArray(d.words))
    .map(d => ({ id: String(d.id || "deck-" + Math.random()), name: d.name, words: d.words.map(String), added: d.added || "",
                 t: Number(d.t) || 0 }));
  s.music = typeof s.music === "string" ? s.music : "";   // the YouTube/SoundCloud link you pasted
  s.playlists = cleanPlaylists(s.playlists);
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
  s.stackId = typeof s.stackId === "string" && s.stackId && !OLD_STACKS.includes(s.stackId) ? s.stackId : COURSE_ID;   // the deck you used last
  // the course you used last (this device): the map, packs and Translate follow it, even while you're in one of your own decks
  s.courseId = COURSE_IDS.includes(s.stackId) ? s.stackId : COURSE_IDS.includes(s.courseId) ? s.courseId : COURSE_ID;
  // 🌐 Translate (this device): the direction ("fr" = the course's language → English, "en" = English → it) and the deck new cards go to
  s.trDir = s.trDir === "en" ? "en" : "fr";
  s.trDeck = typeof s.trDeck === "string" ? s.trDeck : "";
  s.readerSize = Number(s.readerSize) >= 14 && Number(s.readerSize) <= 28 ? Number(s.readerSize) : 18;   // the reader's text size (this device)
  // the 🎧 Media iPod (this device): its front ("white", "fiber", "u2", "silver", "red", "blue", "green", "neon" or "clear") and the wheel's tick sound
  if (s.ipodSkin === "galaxy") s.ipodSkin = "clear";   // "Galaxy" was renamed "Clear" (build 40)
  if (s.ipodSkin === "black") s.ipodSkin = "fiber";    // Black was replaced by Qarbon Fiber (build 43)
  s.ipodSkin = ["white", "fiber", "silver", "red", "blue", "green", "u2", "neon", "clear"].includes(s.ipodSkin) ? s.ipodSkin : "fiber";
  // the Qpod (Qarbon Fiber) is the default player: everyone is switched to it once (build 50), then can choose another color
  if (!s.qpodDefault) { s.ipodSkin = "fiber"; s.qpodDefault = true; }
  s.ipodClick = s.ipodClick !== false;
  s.cardTilt = s.cardTilt === true;   // the cards' holo shine follows the phone's tilt (this device, turned on in ⚙)
  // where the mini Qpod sits: on the "left" or "right" side, y = how far down (0 top, 1 bottom)
  const qp = s.qpodPos || {};
  s.qpodPos = { side: qp.side === "left" ? "left" : "right", y: Number(qp.y) >= 0 && Number(qp.y) <= 1 ? Number(qp.y) : .62 };
  s.ipodViz = ["wave", "itunes", "space"].includes(s.ipodViz) ? s.ipodViz : "wave";   // the Visualizer's look: the whole song, bars and a glowing wave, or a flight through space
  // for syncing: things you deleted ("card:chat" → when), and when your settings last changed
  const del = s.deleted && typeof s.deleted === "object" ? s.deleted : {};
  s.deleted = Object.fromEntries(Object.entries(del).filter(([k, v]) => /^(card|deck|playlist|book):/.test(k) && Number(v) > 0).map(([k, v]) => [k, Number(v)]));
  s.settingsT = Number(s.settingsT) || 0;
  s.newPerDay = PER_DAY_CHOICES.includes(Number(s.newPerDay)) ? Number(s.newPerDay) : 10;   // new cards a day for your own decks (packs are always 10)
  s.newDone = Number(s.newDone) || 0;
  s.packDate = typeof s.packDate === "string" ? s.packDate : "";   // the day you last opened a pack
  s.packCount = Number.isInteger(s.packCount) && s.packCount > 0 ? s.packCount : 0;   // how many packs you opened that day (at most 3)
  if (s.packDate && !s.packCount) s.packCount = 1;   // saves from before build 63 only kept the day of the daily pack
  // the Solar System (js/collection.js): the furthest world open to your packs, 0 = Earth … 11 = Black Hole. Once open, it stays open.
  s.journey = Number.isInteger(s.journey) && s.journey >= 0 && s.journey <= 11 ? s.journey : 0;
  // the other courses keep the same three things for themselves: { spanish: { journey, packDate, packCount } }
  // (French keeps them at the top of the save, where they were before Spanish existed)
  const cs = s.courses && typeof s.courses === "object" ? s.courses : {};
  s.courses = Object.fromEntries(COURSE_IDS.filter(id => id !== COURSE_ID).map(id => {
    const p = cs[id] && typeof cs[id] === "object" ? cs[id] : {};
    return [id, { journey: Number.isInteger(p.journey) && p.journey >= 0 && p.journey <= 11 ? p.journey : 0,
                  packDate: typeof p.packDate === "string" ? p.packDate : "",
                  packCount: Number.isInteger(p.packCount) && p.packCount > 0 ? p.packCount : 0 }];
  }));
  s.sessions = Number(s.sessions) || 0;
  s.bar = cleanBar(s.bar);   // B.A.R. Exam scores (js/burn.js)
  s.barLevel = BAR_LEVELS.includes(s.barLevel) ? s.barLevel : "medium";   // the level you picked last (this device)
  // "Type the answer" in Review, per deck: { french: true, "d-…": true } (⚙, synced with your settings)
  s.typeAnswer = Object.fromEntries(Object.entries(s.typeAnswer && typeof s.typeAnswer === "object" ? s.typeAnswer : {})
    .filter(([k, v]) => v === true && k.length < 80));
  s.habits = cleanHabits(s.habits);   // 🌍 Habits: study time per day (synced)
  s.goal = GOALS[s.goal] ? s.goal : "10-20";   // the daily goal range (synced with your settings)
  s.session = cleanSession(s.session);         // a session running on this device (not synced)
  if (!VOICES.fr[s.voice]) s.voice = "female";
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
// the key a word is known by: lowercase, with its language in front unless it's French ("es:hola"), so the same
// spelling in two languages ("piano") is two different cards
const langKey = (lang, word) => (lang && lang !== "fr" ? lang + ":" : "") + word.trim().toLowerCase();
const cardKey = c => c.key || langKey(c.lang, c.front);   // same as wordKey(): the key a card is known by
const SYNCED_SETTINGS = ["newPerDay", "voice", "timerMode", "customTimer", "music", "directions", "typeAnswer", "goal"];
const settingsOf = s => Object.fromEntries(SYNCED_SETTINGS.map(k => [k, s[k]]));

// a "fingerprint" (JSON text) of every item, without its t, by "kind:id"
function snapshot(s) {
  const out = {};
  const add = (key, obj) => { const { t, ...rest } = obj; out[key] = JSON.stringify(rest); };
  s.cards.forEach(c => add("card:" + cardKey(c), c));
  s.decks.forEach(d => add("deck:" + d.id, d));
  s.playlists.forEach(p => add("playlist:" + p.id, p));
  s.books.forEach(b => add("book:" + b.id, b));
  out.settings = JSON.stringify(settingsOf(s));
  out.counters = JSON.stringify([s.sessions, s.newDate, s.newDone, s.packDate, s.packCount, s.journey, s.courses, s.bar]);   // not stamped, but worth syncing
  return out;
}
let snap = {};   // the fingerprints at the last save

// stamp whatever changed since the last save; returns true if anything did
function stampChanges() {
  const now = Date.now(), next = snapshot(state);
  let changed = false;
  [["card", state.cards, cardKey], ["deck", state.decks, d => d.id], ["playlist", state.playlists, p => p.id], ["book", state.books, b => b.id]].forEach(([kind, list, keyOf]) => {
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
// study time (js/habits.js) changes every second, so it doesn't start a sync by itself: it goes along with the next one,
// and leaving the app syncs it if this is true
let habitsUnsynced = false;

// ----- merging two saves: this device's and the copy online -----
// For each card, deck and book: the newer version wins. If both have the same time (e.g. old saves from
// before syncing existed), the one with more progress wins. Deleting something wins over older versions.
const PROGRESS = {
  card: c => (c.reviews || 0) + (c.rev ? c.rev.reviews || 0 : 0),
  deck: d => (d.words || []).length,
  playlist: p => (p.items || []).length,
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
// the same song or link in two playlists (or in two copies of one): a song by its title + artist + album, a link by itself
const itemKey = it => it.k === "song" ? "song:" + [it.title, it.artist, it.album].join("|").toLowerCase() : "link:" + it.link;

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

// two copies of one playlist → one: the kept copy's order, then anything only the other copy had
function combinePlaylists(keep, other) {
  const have = new Set(keep.items.map(itemKey));
  return { ...keep, items: [...keep.items, ...other.items.filter(it => !have.has(itemKey(it)))] };
}

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
  const moves = { deck: {}, book: {}, playlist: {} };
  const decks = foldTwins("deck", mergeLists("deck", a.decks, b.decks, d => d.id, deleted), deckTwin, combineDecks, deleted, moves.deck);
  const playlists = foldTwins("playlist", mergeLists("playlist", a.playlists, b.playlists, p => p.id, deleted), deckTwin, combinePlaylists, deleted, moves.playlist);
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
    decks, playlists, books, moves,
    deleted,
    settings,
    settingsT: Math.max(a.settingsT, b.settingsT),
    sessions: Math.max(a.sessions, b.sessions),   // focus sessions done: the bigger count
    newDate: later.newDate,                        // new cards started today: the bigger count, if it's the same day
    newDone: a.newDate === b.newDate ? Math.max(a.newDone, b.newDone) : later.newDone,
    ...mergeProgress(a, b),   // French's packs and place on the map
    courses: Object.fromEntries(Object.keys(a.courses).map(id => [id, mergeProgress(a.courses[id], b.courses[id] || {})])),   // Spanish's
    bar: mergeBar(a.bar, b.bar),   // B.A.R. Exam scores: best of both, newest 10 rounds
    habits: mergeHabits(a.habits, b.habits)   // 🌍 study time: every device's own record
  };
}
// one course's packs today and place on the map, from two devices
function mergeProgress(a, b) {
  return {
    packDate: (a.packDate || "") > (b.packDate || "") ? a.packDate : b.packDate || "",  // the daily pack: opened on either device counts
    packCount: a.packDate === b.packDate ? Math.max(a.packCount || 0, b.packCount || 0) // packs opened that day: the bigger count,
             : (a.packDate || "") > (b.packDate || "") ? a.packCount : b.packCount,     // or the later day's
    journey: Math.max(a.journey || 0, b.journey || 0)                                   // the Solar System: the furthest world reached on either device
  };
}

// ================= bigger files kept on this device only (IndexedDB) =================
// IndexedDB is the browser's storage area for big things. Qarbon's database "qarbon-files" has four stores:
//   pdfs      the PDFs attached to books (js/reading.js)
//   songs     your own music files, as raw bytes (js/music.js)
//   songinfo  each song's name, artist, album and cover, kept apart so the list loads without reading every song
//   songviz   each song's numbers for the iPod's Visualizer (js/media.js), worked out once, kept for next time
// Nothing here is synced or put in backups: these files stay on the device they were added on.
function fileStore(name, mode) {
  return new Promise((ok, fail) => {
    const r = indexedDB.open("qarbon-files", 3);   // version 2 added the song stores, version 3 songviz
    r.onupgradeneeded = () => ["pdfs", "songs", "songinfo", "songviz"].forEach(n => {
      if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
    });
    r.onerror = () => fail(r.error);
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();   // a newer Qarbon (in another tab) needs to add a store: let it
      ok(r.result.transaction(name, mode).objectStore(name));
    };
  });
}
// run one request on a store (like st => st.get(id)) and get its result
const fileDo = (name, mode, fn) => fileStore(name, mode).then(st => new Promise((ok, fail) => {
  const r = fn(st); r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
}));

// ================= levels (read from each card's tags, like "A1;core") =================
const LEVELS = { A1: "Beginner (A1)", A2: "Elementary (A2)", B1: "Intermediate (B1)", B2: "Upper intermediate (B2)",
                 C1: "Advanced (C1)", C2: "Mastery (C2)" };
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
