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

// remember (or forget) that this device is signed in. The username (picked once, kept online in "profiles") rides along.
function keepSession(d) {
  const same = auth && auth.id === d.user.id;
  auth = { access: d.access_token, refresh: d.refresh_token, expires: Date.now() + (d.expires_in || 3600) * 1000,
           id: d.user.id, email: d.user.email, lastSync: same ? auth.lastSync : 0, username: same ? auth.username || "" : "" };
  storeAuth();
}
function storeAuth() { try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch (e) {} }
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
// what the server said went wrong, in plain words
function authError(r, fallback) {
  const code = r.data && (r.data.error_code || r.data.code), msg = (r.data && (r.data.msg || r.data.message || r.data.error_description)) || "";
  return code === "invalid_credentials" ? "Wrong email or password." :
    code === "user_already_exists" || code === "email_exists" ? "That email already has an account. Tap Sign in instead." :
    code === "weak_password" ? "Pick a password with at least 6 characters." :
    code === "email_address_invalid" || code === "validation_failed" ? "That doesn't look like an email address." :
    code === "otp_expired" || /expired|invalid/i.test(msg) && /token|otp|code/i.test(msg) ? "That code is wrong or too old. Check the newest email, or send a new code." :
    code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || r.status === 429 ? "Too many tries for now. Wait a minute and try again." :
    code === "same_password" ? "That's already your password." :
    (fallback || "Something went wrong") + " (" + (msg || "error " + r.status) + ").";
}

// ================= the account panel's views =================
// form = signed out · code = a 6-digit code from an email · newpass = choose a new password · name = pick a username · in = signed in
const ACCT_VIEWS = { form: "acct-form", code: "acct-code", newpass: "acct-newpass", name: "acct-name", in: "acct-in" };
let acctView = "";
// what a code is for: { type: "signup" | "recovery" | "email_change", email }
let codeFor = null;
function showView(v) {
  acctView = v;
  for (const [k, id] of Object.entries(ACCT_VIEWS)) $(id).hidden = k !== v;
}

// show the right view: signed out, a code waiting, no username yet, or "Signed in as …".
// keepNote = leave the status message alone (e.g. right after a sync, so "Offline: …" stays visible)
function showAccount(keepNote) {
  if (codeFor) showView("code");   // a code is waiting (new account, password reset or new email): its box stays up
  else if (!auth) showView("form");
  else if (acctView === "newpass") showView("newpass");
  else if (!auth.username) { showView("name"); if (!keepNote) loadUsername(); }
  else showView("in");
  if (auth) {
    $("acct-handle").textContent = auth.username ? "@" + auth.username : "";
    $("acct-who").textContent = auth.email;
    if (acctView === "in" && !syncing && !keepNote) syncNote(auth.lastSync ? "Synced " + ago(auth.lastSync) + "." : "Not synced yet.");
  }
  updateDiag();
}

// signed in: the session is kept, the username looked up, and the first sync merges this device's progress with what's online
async function signedIn(data) {
  keepSession(data);
  $("acct-pass").value = "";
  codeFor = null;
  await loadUsername();
  showAccount();
  await syncNow();
}

// Sign in, or create an account (create = true). With "Confirm email" on, a new account first gets a code by email.
async function signIn(create) {
  const email = $("acct-email").value.trim(), password = $("acct-pass").value;
  if (!email || !password) { syncNote("Enter your email and a password."); return; }
  syncNote(create ? "Creating your account…" : "Signing in…");
  let r;
  try {
    r = await api("POST", create ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password", { email, password });
  } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  const code = r.data && (r.data.error_code || r.data.code);
  // a new account (or one never confirmed): the email has a code in it
  if ((create && r.ok && r.data && !r.data.access_token) || code === "email_not_confirmed") {
    if (code === "email_not_confirmed") await api("POST", "/auth/v1/resend", { type: "signup", email }).catch(() => {});
    askCode("signup", email, "We sent a 6-digit code to " + email + ". Enter it to confirm your account.");
    return;
  }
  if (!r.ok || !r.data || !r.data.access_token) { syncNote(authError(r, "Couldn't sign in")); return; }
  await signedIn(r.data);   // ("Confirm email" off: a new account is signed in right away)
}

// ----- codes from an email -----
function askCode(type, email, text) {
  codeFor = { type, email };
  $("acct-codeq").textContent = text;
  $("acct-codein").value = "";
  showView("code");
  syncNote("");
  $("acct-codein").focus();
}
async function confirmCode() {
  const token = $("acct-codein").value.replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token)) { syncNote("Enter the code from the email (6 digits)."); return; }
  syncNote("Checking the code…");
  const p = codeFor;
  // "email" confirms a new account; "recovery" a password reset; "email_change" a new address (needs your sign-in)
  const type = p.type === "signup" ? "email" : p.type;
  let r;
  try { r = await api("POST", "/auth/v1/verify", { type, email: p.email, token }, p.type === "email_change" && auth ? await freshToken() : undefined); }
  catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  if (!r.ok) { syncNote(authError(r, "Couldn't check the code")); return; }
  if (p.type === "email_change") {
    codeFor = null;
    auth.email = p.email; storeAuth();
    if (r.data && r.data.access_token) keepSession(r.data);
    showAccount();
    syncNote("Your email is now " + p.email + ".");
    return;
  }
  if (!r.data || !r.data.access_token) { syncNote(authError(r, "Couldn't check the code")); return; }
  if (p.type === "recovery") {   // signed in by the code: now choose a new password
    keepSession(r.data);
    codeFor = null;
    $("acct-npwho").textContent = p.email;
    $("acct-np").value = "";
    showView("newpass");
    syncNote("");
    return;
  }
  await signedIn(r.data);
  syncNote("Your account is confirmed. Welcome to Qarbon!");
}
async function resendCode() {
  const p = codeFor;
  if (!p) return;
  let r;
  try {
    r = p.type === "recovery" ? await api("POST", "/auth/v1/recover", { email: p.email })
      : p.type === "email_change" ? await api("PUT", "/auth/v1/user", { email: p.email }, await freshToken())
      : await api("POST", "/auth/v1/resend", { type: "signup", email: p.email });
  } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  syncNote(r.ok ? "A new code is on its way to " + p.email + "." : authError(r, "Couldn't send a new code"));
}

// ----- forgot password: a code by email, then a new password -----
async function forgotPassword() {
  const email = $("acct-email").value.trim();
  if (!email) { syncNote("Type your email above first, then tap Forgot password."); $("acct-email").focus(); return; }
  syncNote("Sending a code…");
  let r;
  try { r = await api("POST", "/auth/v1/recover", { email }); } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  if (!r.ok) { syncNote(authError(r, "Couldn't send the code")); return; }
  askCode("recovery", email, "If " + email + " has an account, we sent it a 6-digit code. Enter it to choose a new password.");
}
async function saveNewPassword() {
  const password = $("acct-np").value;
  if (password.length < 6) { syncNote("Pick a password with at least 6 characters."); return; }
  let r;
  try { r = await api("PUT", "/auth/v1/user", { password }, await freshToken()); } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  if (!r.ok) { syncNote(authError(r, "Couldn't save the password")); return; }
  acctView = "";
  await loadUsername();
  showAccount();
  syncNote("New password saved. You're signed in.");
  syncNow();
}

// ================= your username (a row in the "profiles" table: user_id, username) =================
// Lowercase letters, numbers and _ (3 to 20), one per person; checked online so nobody else has it.
// Everyone signed in can look up usernames (for friends and leaderboards later); only you can change yours.
const USERNAME_RX = /^[a-z0-9_]{3,20}$/;
const RESERVED = ["admin", "qarbon", "support", "help", "root", "moderator", "mod", "staff", "system", "unknownxunknown", "ux2", "null", "undefined"];
const cleanName = v => v.trim().replace(/^@/, "").toLowerCase();

// look up the username of the account you're signed in to (none yet = the pick-a-username view)
async function loadUsername() {
  if (!auth || auth.username) return;
  try {
    const r = await api("GET", "/rest/v1/profiles?select=username&user_id=eq." + auth.id, undefined, await freshToken());
    if (r.ok && r.data && r.data[0]) { auth.username = r.data[0].username; storeAuth(); if (acctView === "name") showAccount(); }
  } catch (e) {}
}

// while you type: is it allowed, and is it free? (asked online half a second after you stop typing)
let nameTimer = 0, nameAsk = 0;
function checkName() {
  const v = cleanName($("acct-namein").value), out = $("acct-namecheck");
  $("acct-namego").disabled = true;
  clearTimeout(nameTimer);
  if (!v) { out.textContent = "3 to 20 letters, numbers or _"; return; }
  if (!USERNAME_RX.test(v)) { out.textContent = v.length < 3 ? "At least 3 characters." : "Only letters, numbers and _ (no spaces)."; return; }
  if (RESERVED.includes(v)) { out.textContent = "@" + v + " is reserved. Try another."; return; }
  out.textContent = "Checking @" + v + "…";
  const ask = ++nameAsk;
  nameTimer = setTimeout(async () => {
    let r;
    try { r = await api("GET", "/rest/v1/profiles?select=user_id&username=eq." + encodeURIComponent(v), undefined, await freshToken()); }
    catch (e) { if (ask === nameAsk) out.textContent = "Couldn't check right now (offline?)."; return; }
    if (ask !== nameAsk) return;   // you kept typing: a newer check is on its way
    const taken = r.ok && r.data && r.data.some(x => x.user_id !== auth.id);
    out.textContent = !r.ok ? "Couldn't check right now." : taken ? "@" + v + " is taken." : "✓ @" + v + " is free.";
    $("acct-namego").disabled = !r.ok || taken;
  }, 500);
}
async function saveName() {
  const v = cleanName($("acct-namein").value);
  if (!USERNAME_RX.test(v) || RESERVED.includes(v)) { checkName(); return; }
  $("acct-namego").disabled = true;
  let r;
  try { r = await api("POST", "/rest/v1/profiles", { user_id: auth.id, username: v }, await freshToken()); }
  catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); $("acct-namego").disabled = false; return; }
  // 409 = someone took it a moment ago (the table only allows each name once)
  if (r.status === 409 || (r.data && r.data.code === "23505")) { $("acct-namecheck").textContent = "@" + v + " was just taken. Try another."; return; }
  if (!r.ok) { syncNote("Couldn't save the username (" + ((r.data && r.data.message) || "error " + r.status) + ")."); $("acct-namego").disabled = false; return; }
  auth.username = v; storeAuth();
  showAccount();
  syncNote("Hi @" + v + "! Your username is saved.");
}

// ================= account settings: change email, change password, delete the account =================
async function changeEmail() {
  const email = $("acct-newemail").value.trim();
  if (!email || email === auth.email) { syncNote("Type the new email address."); return; }
  syncNote("Sending a code…");
  let r;
  try { r = await api("PUT", "/auth/v1/user", { email }, await freshToken()); } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  if (!r.ok) { syncNote(authError(r, "Couldn't change the email")); return; }
  $("acct-newemail").value = "";
  askCode("email_change", email, "We sent a 6-digit code to " + email + ". Enter it to make it your account's email.");
}
async function changePassword() {
  const old = $("acct-oldpass").value, password = $("acct-newpass1").value;
  if (!old) { syncNote("Enter your current password first."); return; }
  if (password.length < 6) { syncNote("Pick a new password with at least 6 characters."); return; }
  syncNote("Changing your password…");
  let r;
  try {
    // signing in again with the current password proves it's you (so someone holding your unlocked phone can't change it)
    const check = await api("POST", "/auth/v1/token?grant_type=password", { email: auth.email, password: old });
    if (!check.ok || !check.data || !check.data.access_token) { syncNote("Your current password isn't right."); return; }
    keepSession(check.data);
    r = await api("PUT", "/auth/v1/user", { password }, auth.access);
  } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  if (!r.ok) { syncNote(authError(r, "Couldn't change the password")); return; }
  $("acct-oldpass").value = $("acct-newpass1").value = "";
  syncNote("Password changed.");
}
// deleting runs a function on the server (delete_my_account) that removes your account, username and online save.
// Only the signed-in account can delete itself. This device keeps its own copy of your progress.
async function deleteAccount() {
  if ($("acct-deltype").value.trim().toUpperCase() !== "DELETE") { syncNote("Type DELETE in the box to confirm."); return; }
  syncNote("Deleting your account…");
  let r;
  try { r = await api("POST", "/rest/v1/rpc/delete_my_account", {}, await freshToken()); } catch (e) { syncNote("Couldn't reach the sync server. Check your internet connection."); return; }
  if (!r.ok) { syncNote("Couldn't delete the account (" + ((r.data && r.data.message) || "error " + r.status) + ")."); return; }
  forgetSession();
  $("acct-delsure").hidden = true; $("acct-deltype").value = "";
  $("acct-more").open = false;
  showAccount();
  syncNote("Your account is deleted. Your progress is still on this device.");
}

// the part of your save that goes online (things that belong to one device, like the book you're
// reading right now or the last deck you opened, stay on that device)
function syncedPart() {
  return { v: 1, cards: state.cards, decks: state.decks, playlists: state.playlists, books: state.books, deleted: state.deleted,
           settings: settingsOf(state), settingsT: state.settingsT, sessions: state.sessions,
           newDate: state.newDate, newDone: state.newDone, packDate: state.packDate, packCount: state.packCount, journey: state.journey, courses: state.courses, bar: state.bar, habits: state.habits, wf: state.wf, duels: state.duels };
}

// tidy up the online copy the same way a loaded save is tidied (see clean)
function cleanRemote(d) {
  return clean({ ...(d.settings || {}), cards: d.cards, decks: d.decks, playlists: d.playlists, books: d.books, deleted: d.deleted,
                 settingsT: d.settingsT, sessions: d.sessions, newDate: d.newDate, newDone: d.newDone, packDate: d.packDate, packCount: d.packCount, journey: d.journey, courses: d.courses, bar: d.bar, habits: d.habits, wf: d.wf, duels: d.duels });
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
  Object.assign(state, m.settings, { settingsT: m.settingsT, sessions: m.sessions, newDate: m.newDate, newDone: m.newDone, packDate: m.packDate, packCount: m.packCount, journey: m.journey, courses: m.courses, bar: m.bar, habits: m.habits, wf: m.wf, duels: m.duels });
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
$("acct-forgot").onclick = forgotPassword;
$("acct-code").addEventListener("submit", e => { e.preventDefault(); confirmCode(); });
$("acct-resend").onclick = resendCode;
$("acct-codeback").onclick = () => { const p = codeFor; codeFor = null; showAccount(); if (p && p.type === "email_change") $("acct-more").open = true; syncNote(""); };
$("acct-newpass").addEventListener("submit", e => { e.preventDefault(); saveNewPassword(); });
$("acct-name").addEventListener("submit", e => { e.preventDefault(); saveName(); });
$("acct-namein").addEventListener("input", checkName);
$("acct-chemail").addEventListener("submit", e => { e.preventDefault(); changeEmail(); });
$("acct-chpass").addEventListener("submit", e => { e.preventDefault(); changePassword(); });
$("acct-delask").onclick = () => { $("acct-delsure").hidden = false; $("acct-deltype").focus(); };
$("acct-delno").onclick = () => { $("acct-delsure").hidden = true; $("acct-deltype").value = ""; };
$("acct-delsure").addEventListener("submit", e => { e.preventDefault(); deleteAccount(); });
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
