// Qarbon · js/account.js: accounts and syncing, backups.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= ☁ account & syncing (Supabase) =================
// Your save is kept in your own row of a table on Supabase (an online database). The table's privacy rules
// ("row level security") let each account read and write only its own row. The publishable key is meant
// to be public: it only says which project to talk to.
const SUPABASE_URL = "https://sussnemfrojgdtbthueq.supabase.co";
const SUPABASE_KEY = "sb_publishable_U0aXYXWGg40BBJdaXmp8xw_jd_7VwvJ";

// "2 min ago"
function ago(time) {
  const m = Math.round((Date.now() - time) / 60000);
  return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " days ago";
}

// one request to Supabase. token = your sign-in ticket (needed for your own data)
async function api(method, path, body, token) {
  const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  if (method === "POST" && path.startsWith("/rest/")) headers.Prefer = "resolution=merge-duplicates,return=minimal";   // insert, or update if it exists
  const res = await fetchWithin(SUPABASE_URL + path, 20, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) {}
  return { ok: res.ok, status: res.status, data };
}

// remember (or forget) that this device is signed in
function keepSession(d) {
  auth = { access: d.access_token, refresh: d.refresh_token, expires: Date.now() + (d.expires_in || 3600) * 1000,
           id: d.user.id, email: d.user.email, lastSync: auth && auth.id === d.user.id ? auth.lastSync : 0 };
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch (e) {}
}
function forgetSession() {
  auth = null;
  try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
}

// the sign-in ticket lasts an hour: swap it for a fresh one shortly before it runs out
async function freshToken() {
  if (Date.now() < auth.expires - 60000) return auth.access;
  const r = await api("POST", "/auth/v1/token?grant_type=refresh_token", { refresh_token: auth.refresh });
  if (r.ok) { keepSession(r.data); return auth.access; }
  if (r.status === 400 || r.status === 401) throw new Error("signed-out");   // the ticket is no longer valid
  throw new Error("server");
}

const syncNote = text => { $("acct-status").textContent = text; };

// show the right half of the account panel: the sign-in form, or "Signed in as …".
// keepNote = leave the status message alone (e.g. right after a sync, so "Offline: …" stays visible)
function showAccount(keepNote) {
  $("acct-form").hidden = !!auth;
  $("acct-in").hidden = !auth;
  if (auth) {
    $("acct-who").textContent = auth.email;
    if (!syncing && !keepNote) syncNote(auth.lastSync ? "Synced " + ago(auth.lastSync) + "." : "Not synced yet.");
  }
  updateDiag();
}

// Sign in, or create an account (create = true)
async function signIn(create) {
  const email = $("acct-email").value.trim(), password = $("acct-pass").value;
  if (!email || !password) { syncNote("Enter your email and a password."); return; }
  syncNote(create ? "Creating your account…" : "Signing in…");
  let r;
  try {
    r = await api("POST", create ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password", { email, password });
  } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  if (!r.ok || !r.data || !r.data.access_token) {
    const code = r.data && (r.data.error_code || r.data.code);
    syncNote(code === "invalid_credentials" ? "Wrong email or password." :
             code === "user_already_exists" ? "That email already has an account. Tap Sign in instead." :
             code === "weak_password" ? "Pick a password with at least 6 characters." :
             code === "email_address_invalid" || code === "validation_failed" ? "That doesn't look like an email address." :
             "Couldn't sign in (" + ((r.data && (r.data.msg || r.data.message)) || "error " + r.status) + ").");
    return;
  }
  keepSession(r.data);
  $("acct-pass").value = "";
  showAccount();
  await syncNow();   // the first sync merges this device's progress with what's online
}

// the part of your save that goes online (things that belong to one device, like the book you're
// reading right now or the last deck you opened, stay on that device)
function syncedPart() {
  return { v: 1, cards: state.cards, decks: state.decks, playlists: state.playlists, books: state.books, deleted: state.deleted,
           settings: settingsOf(state), settingsT: state.settingsT, sessions: state.sessions,
           newDate: state.newDate, newDone: state.newDone, packDate: state.packDate, packCount: state.packCount, journey: state.journey, courses: state.courses, bar: state.bar, habits: state.habits };
}

// tidy up the online copy the same way a loaded save is tidied (see clean)
function cleanRemote(d) {
  return clean({ ...(d.settings || {}), cards: d.cards, decks: d.decks, playlists: d.playlists, books: d.books, deleted: d.deleted,
                 settingsT: d.settingsT, sessions: d.sessions, newDate: d.newDate, newDone: d.newDone, packDate: d.packDate, packCount: d.packCount, journey: d.journey, courses: d.courses, bar: d.bar, habits: d.habits });
}

// put a merged result into this device's save. Existing cards and books are updated in place (not
// replaced), so a card you're looking at right now stays the same card.
function applyMerged(m) {
  const reuse = (list, merged, keyOf) => {
    const mine = new Map(list.map(x => [keyOf(x), x]));
    return merged.map(x => {
      const own = mine.get(keyOf(x));
      if (!own || own === x) return x;
      for (const k of Object.keys(own)) if (!(k in x)) delete own[k];
      return Object.assign(own, x);
    });
  };
  const before = JSON.stringify(settingsOf(state));
  // a book or deck that was folded into its twin (see foldTwins): follow it to the one that's kept
  const moves = m.moves || { deck: {}, book: {} };
  state.readingBook = movedTo(moves.book, state.readingBook);
  state.stackId = movedTo(moves.deck, state.stackId);
  if (stack && stack.custom) stack.id = movedTo(moves.deck, stack.id);
  for (const from of Object.keys(moves.book)) movePdf(from, movedTo(moves.book, from));
  state.cards = reuse(state.cards, m.cards, cardKey);
  state.decks = reuse(state.decks, m.decks, d => d.id);
  state.playlists = reuse(state.playlists, m.playlists, p => p.id);
  state.books = reuse(state.books, m.books, b => b.id);
  state.deleted = m.deleted;
  Object.assign(state, m.settings, { settingsT: m.settingsT, sessions: m.sessions, newDate: m.newDate, newDone: m.newDone, packDate: m.packDate, packCount: m.packCount, journey: m.journey, courses: m.courses, bar: m.bar, habits: m.habits });
  if (!state.books.some(b => b.id === state.readingBook)) state.readingBook = "";
  save(true);   // quiet: these came from syncing
  // keep the screen in step with what arrived
  if (stack && stack.custom) {
    const d = state.decks.find(x => x.id === stack.id);
    if (d) { stack.words = new Set(d.words); stack.name = d.name; } else { stack = course(); state.stackId = stack.id; }   // deleted on another device
  }
  if (JSON.stringify(settingsOf(state)) !== before) {
    $("perday").value = String(state.newPerDay);
    fillVoices();
    if (!ticking) syncTimerUI();
    showMusic(false);
  }
  showReadbar();
  playlistsSynced(moves.playlist || {});   // the playlist playing follows a fold, and the lists redraw (js/music.js)
  if (!$("study").hidden) render();
  followSyncedPlace();   // the open book jumps to a newer place read on another device
}

// sync: download the online copy, merge it with this device's, then upload the result
async function syncNow() {
  if (!auth) return;
  if (syncing) { syncAgain = true; return; }
  flushPlace();   // a reading place still waiting to be stored (js/reading.js) goes in this sync
  syncing = true;
  clearTimeout(syncTimer); syncTimer = null;
  syncNote("Syncing…");
  try {
    const token = await freshToken();
    const r = await api("GET", "/rest/v1/qarbon_state?select=data&user_id=eq." + auth.id, undefined, token);
    if (r.status === 401) throw new Error("signed-out");
    if (!r.ok) throw new Error("server");
    const online = r.data && r.data[0] && r.data[0].data;
    if (online) applyMerged(mergeStates(state, cleanRemote(online)));
    habitsUnsynced = false;   // the study time going up now is the latest
    const w = await api("POST", "/rest/v1/qarbon_state",
                        { user_id: auth.id, data: syncedPart(), updated_at: new Date().toISOString() }, token);
    if (!w.ok) throw new Error(w.status === 401 ? "signed-out" : "server");
    auth.lastSync = Date.now();
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch (e) {}
    syncNote("Synced just now.");
  } catch (e) {
    if (e.message === "signed-out") { forgetSession(); syncNote("You've been signed out. Please sign in again (your progress here is safe)."); }
    else if (e.message === "server") syncNote("The sync server had a problem. Your progress is safe here; it'll try again later.");
    else syncNote("Offline: your progress is saved on this device and will sync when you're back online.");
  } finally {
    syncing = false;
    showAccount(true);
    if (syncAgain) { syncAgain = false; syncSoon(); }
  }
}

// after a change: sync a few seconds later (so a burst of changes becomes one sync)
function syncSoon() {
  if (!auth) return;
  if (syncing) { syncAgain = true; return; }
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 3000);   // syncTimer stays set until it runs = "there are unsynced changes"
}

$("acct-form").addEventListener("submit", e => { e.preventDefault(); signIn(false); });
$("acct-create").onclick = () => signIn(true);
$("acct-sync").onclick = () => syncNow();
$("acct-out").onclick = async () => {
  if (!confirm("Sign out on this device? Your progress stays here, and it's also saved online.")) return;
  const token = auth.access;
  forgetSession();
  showAccount();
  syncNote("Signed out. Everything is still on this device.");
  try { await api("POST", "/auth/v1/logout", {}, token); } catch (e) {}
};
// sync again when you come back online, or come back to the app after a while
window.addEventListener("online", () => syncNow());
document.addEventListener("visibilitychange", () => {
  if (!auth) return;
  if (document.hidden) { if (syncTimer || habitsUnsynced) syncNow(); }   // leaving with unsynced changes (or study time): sync them now
  else if (Date.now() - (auth.lastSync || 0) > 60000) syncNow();
});

// ================= export and restore a backup =================
$("export").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "qarbon-backup-" + today() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  $("msg").textContent = "Backup downloaded (" + state.cards.length + " cards). Check your Downloads folder.";
};

$("restore").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  let data;
  try { data = JSON.parse(await f.text()); } catch (err) { data = null; }
  e.target.value = "";
  if (!data || !Array.isArray(data.cards)) {
    $("msg").textContent = "That file doesn't look like a Qarbon backup, so nothing was changed.";
    return;
  }
  const restored = clean(data);
  if (!confirm("Replace your current progress with this backup (" + restored.cards.length + " cards)?")) return;
  state = restored;
  save();
  fillVoices();
  syncTimerUI();
  showMusic(false);
  showReadbar();
  $("perday").value = String(state.newPerDay);
  setMode("daily");
  $("msg").textContent = "Restored " + state.cards.length + " card(s) from backup";
});
