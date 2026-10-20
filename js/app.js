// Qarbon · js/app.js: voices, buttons and keyboard, CSV import, screens and navigation, the settings panel.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= audio: two voices, female (Amélie) and male (Thomas) =================
const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hasSpeech = () => "speechSynthesis" in window;
const frVoices = () => hasSpeech() ? speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith("fr")) : [];

function findVoice() {
  const want = plain(VOICES[state.voice] || VOICES.female);
  return frVoices().find(v => plain(v.name).includes(want));
}

function speak(text) {
  if (!hasSpeech() || !text) return;
  const clean = text.replace(/\s*\/\s*/g, ", ").replace(/\.\.\./g, " ");
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "fr-FR";
  u.rate = 0.85;   // 1 = normal speed
  const v = findVoice() || frVoices()[0];
  if (v) u.voice = v;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function updateVoiceInfo() {
  const el = $("voiceinfo");
  if (!hasSpeech()) { el.textContent = "(this browser has no speech support)"; return; }
  const fr = frVoices(), v = findVoice();
  if (!fr.length) el.textContent = "(no French voices found yet)";
  else if (v) el.textContent = "(using " + v.name + ")";
  else el.textContent = "(" + VOICES[state.voice] + " isn't installed here, using " + fr[0].name + ")";
}

function fillVoices() {
  const sel = $("voice");
  sel.innerHTML = '<option value="female">Female (Amélie)</option><option value="male">Male (Thomas)</option>';
  sel.value = state.voice;
  updateVoiceInfo();
}
fillVoices();
if (hasSpeech()) speechSynthesis.onvoiceschanged = updateVoiceInfo;   // voices often load a moment late

$("voice").onchange = e => {
  state.voice = e.target.value; save();
  updateVoiceInfo();
  if (current) speak(current.front);   // quick preview
};

document.addEventListener("click", e => {
  const b = e.target.closest(".speak");
  if (!b || !current) return;
  speak(b.dataset.speak === "example" ? current.example_target : current.front);   // the French word, either side
});

// ================= buttons and keyboard =================
$("show").onclick = () => { revealed = true; render(); };
GRADES.forEach((g, i) => { $(g).onclick = () => rate(i + 1); });
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // on the Focus page, Space starts and pauses the timer (unless you're typing in a box)
  if (!$("focus").hidden && e.key === " " && e.target === document.body) { e.preventDefault(); $("fstart").click(); return; }
  if ($("study").hidden || !cardShowing() || !current || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); $("show").click(); }
  else if (revealed && /^[1-4]$/.test(e.key)) {
    const grade = Number(e.key);
    if (mode !== "practice" || grade === 1 || grade === 3) rate(grade);   // practice only has Missed (1) and Got it (3)
  }
});

$("perday").value = String(state.newPerDay);
$("perday").onchange = e => { state.newPerDay = Number(e.target.value); save(); refresh(); };

// ================= import a CSV pack =================
// turns CSV text into cards and adds the ones you don't already have.
// Returns how it went: { added, dupes, bad }, or { error } if the file can't be used.
function importCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { error: "That file is empty or has no card rows." };

  const head = rows[0].map(h => h.trim().toLowerCase());
  if (!head.includes("front") || !head.includes("back"))
    return { error: "The first row must include 'front' and 'back' columns. Found: " + head.join(", ") };

  // words you already have: by their original word and their current spelling, so edited cards aren't added twice
  const have = new Set(state.cards.flatMap(c => [wordKey(c), c.front.trim().toLowerCase()]));
  let added = 0, dupes = 0, bad = 0;
  for (const r of rows.slice(1)) {
    const o = {}; head.forEach((h, i) => { if (h) o[h] = (r[i] || "").trim(); });
    if (!o.front || !o.back) { bad++; continue; }
    const key = o.front.toLowerCase();
    if (have.has(key)) { dupes++; continue; }
    Object.assign(o, { interval: 1, due: today(), reviews: 0, correct: 0 });
    state.cards.push(o); have.add(key); added++;
  }
  save();
  return { added, dupes, bad };
}

// the French words (fronts) in a CSV, lowercased: this is how a deck knows which cards are its own
function frontsOf(text) {
  const rows = parseCSV(text);
  const col = rows.length ? rows[0].map(h => h.trim().toLowerCase()).indexOf("front") : -1;
  if (col < 0) return [];
  return [...new Set(rows.slice(1).map(r => (r[col] || "").trim().toLowerCase()).filter(Boolean))];
}

// + New deck: read the file, ask for a name, add its cards, and save it as a stack you can pick any day
$("file").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const say = t => { $("stackmsg").textContent = t; };
  let text;
  try { text = await f.text(); } catch (err) { say("Couldn't read that file."); return; }
  e.target.value = "";
  const words = frontsOf(text);
  if (!words.length) { say("That file has no cards. The first row needs 'front' and 'back' columns."); return; }
  const name = (prompt("Name your new deck:", f.name.replace(/\.csv$/i, "")) || "").trim();
  if (!name) { say("No deck made (it needs a name)."); return; }
  const r = importCSV(text);
  if (r.error) { say(r.error); return; }
  state.decks.push({ id: "deck-" + Date.now(), name, words, added: today() });
  save();
  renderStacks();
  say("Saved “" + name + "” with " + words.length + " cards" +
      (r.dupes ? " (" + r.dupes + (r.dupes === 1 ? " word was" : " words were") + " already in another deck and will share progress)" : "") +
      ". It'll be here whenever you come back.");
});

// ================= screens: home → choose a stack → study =================
// A stack is a list of French words. A card belongs to a stack if its word is on the list,
// so a word in two stacks shares one set of progress.
// Built-in packs are stored in js/packs.js (PACKS),
// so they work offline and when index.html is opened straight from the Mac.
const BUILT_IN = [
  { id: "beginner150", name: "Beginner 150", blurb: "The 150 most useful words to start with" },
  { id: "level2",      name: "Level 2",      blurb: "The next 150 useful words" }
];
let stack = null;   // the stack you're studying (null = all cards)

// the word a card is known by in decks: its original French word (kept in c.key if you respell it)
const wordKey = c => c.key || c.front.trim().toLowerCase();
function stackCards() {
  return stack && stack.words ? state.cards.filter(c => stack.words.has(wordKey(c))) : state.cards;
}

// every stack you can pick: built-in packs, then your own decks, then everything
function allStacks() {
  const built = BUILT_IN.map(s => {
    const text = PACKS[s.id].trim();
    return { ...s, text, words: new Set(frontsOf(text)) };
  });
  const mine = state.decks.map(d => ({ id: d.id, name: d.name, custom: true, words: new Set(d.words),
                                        blurb: "Your deck" + (d.added ? " · added " + d.added : "") }));
  return [...built, ...mine, { id: "all", name: "All my cards", blurb: "Everything, from every deck" }];
}

// show one screen and hide the others, with a soft fade in
function show(screen) {
  ["home", "study", "howto", "focus", "reading"].forEach(s => { $(s).hidden = s !== screen; });
  if (screen === "home") worldInfo();
  const el = $(screen);
  el.classList.remove("fadein"); void el.offsetWidth; el.classList.add("fadein");
  scrollTo(0, 0);
}

// the deck list now lives in the Decks tab: open it there, with the list showing
function openStacks() {
  $("stackmsg").textContent = "";
  show("study");
  setMode("deck");
  $("deckpicker").open = true;
}

// the black hole opens the app on the deck you used last (Beginner 150 the first time)
function openApp() {
  const all = allStacks();
  chooseStack(all.find(s => s.id === state.stackId) || all[0]);
}

function renderStacks() {
  const box = $("stacklist"), t = today();
  box.innerHTML = "";
  const currentId = stack ? stack.id : "all";
  allStacks().forEach(s => {
    const mine = s.words ? state.cards.filter(c => s.words.has(wordKey(c))) : state.cards;
    const total = s.words ? s.words.size : state.cards.length;
    const sides = c => dirsOf(s).map(d => sideOf(c, d));   // one schedule per direction this stack uses
    const started = mine.filter(c => sides(c).some(x => x.reviews > 0)).length;
    const due = mine.filter(c => active(c) && sides(c).some(x => x.reviews > 0 && x.due <= t)).length;
    const row = document.createElement("div");
    row.className = "stackrow" + (s.custom ? " custom" : "") + (s.id === currentId ? " on" : "");
    const b = document.createElement("button"); b.className = "stack";
    const name = document.createElement("b"); name.textContent = s.name;
    const blurb = document.createElement("span"); blurb.textContent = s.blurb;
    const info = document.createElement("small");
    info.textContent = (s.id === currentId ? "✓ studying now · " : "") + total + " cards · " + started + " started" +
                       (due ? " · " + due + " due today" : "");
    b.append(name, blurb, info);
    b.onclick = () => chooseStack(s, true);   // switch decks and stay on the Decks tab
    row.appendChild(b);
    if (s.custom) {   // your own decks: rename ✎ and delete 🗑
      const tools = document.createElement("div"); tools.className = "stacktools";
      const ren = document.createElement("button"); ren.textContent = "✎"; ren.title = "Rename"; ren.setAttribute("aria-label", "Rename " + s.name);
      const del = document.createElement("button"); del.textContent = "🗑"; del.title = "Delete deck"; del.setAttribute("aria-label", "Delete " + s.name);
      ren.onclick = () => renameDeck(s.id);
      del.onclick = () => deleteDeck(s.id);
      tools.append(ren, del);
      row.appendChild(tools);
    }
    box.appendChild(row);
  });
}

function renameDeck(id) {
  const d = state.decks.find(x => x.id === id);
  const name = (prompt("Rename the deck:", d.name) || "").trim();
  if (!name || name === d.name) return;
  d.name = name;
  if (stack && stack.id === id) stack.name = name;
  save();
  renderStacks();
  $("deckname").textContent = stack ? stack.name : "All my cards";
  $("stackmsg").textContent = "Renamed to “" + name + "”.";
}

// deleting a deck keeps its cards (they stay in All my cards), it only removes the deck
function deleteDeck(id) {
  const d = state.decks.find(x => x.id === id);
  if (!confirm("Delete the deck “" + d.name + "”? Its cards and progress stay in All my cards.")) return;
  state.decks = state.decks.filter(x => x !== d);
  delete state.directions[id];
  if (stack && stack.id === id) { stack = null; state.stackId = "all"; }   // you were in it: switch to All my cards
  save();
  if (mode === "deck") renderDeck(); else renderStacks();
  $("stackmsg").textContent = "Deleted the deck “" + d.name + "”. Its cards are still in All my cards.";
}

// switch to a deck. stay = true when you picked it in the Decks tab (you stay there); otherwise Review opens
function chooseStack(s, stay) {
  stack = s.words ? s : null;
  state.stackId = s.id;   // remembered, so the black hole opens this deck next time
  save();
  $("msg").textContent = "";
  if (s.text) {   // built-in pack: add any of its words you don't have yet
    const r = importCSV(s.text);
    if (r.added) $("msg").textContent = "Added " + r.added + " new card(s) from " + s.name;
  }
  closeEditor(false);
  $("settings").hidden = true;
  $("search").value = "";                        // a new stack starts with a clear search
  $("level").value = $("type").value = "all";
  if (stay) {
    $("deckpicker").open = false;
    setMode("deck");
    scrollTo(0, 0);
    return;
  }
  show("study");
  setMode("daily");
}

// ================= ⚙ settings panel =================
function toggleSettings(open) {
  $("settings").hidden = !open;
  if (open) showAccount();
  if (open) {   // the direction list belongs to the stack you're in
    setOptions($("direction"), Object.entries(DIRECTIONS), state.directions[stack ? stack.id : "all"] || "fr");
  }
  if (cardShowing()) fitCard();   // the panel pushes the card down
}
$("gosettings").onclick = () => toggleSettings($("settings").hidden);
$("setdone").onclick = () => toggleSettings(false);
$("direction").onchange = e => {
  state.directions[stack ? stack.id : "all"] = e.target.value;
  save();
  $("msg").textContent = "Cards in " + (stack ? stack.name : "All my cards") + ": " + DIRECTIONS[e.target.value] + ".";
  refresh();   // rebuild today's review with the new direction
};

// the small lines under some worlds: cards due, the deck you're on, books you're reading
function worldInfo() {
  const all = allStacks(), s = all.find(x => x.id === state.stackId) || all[0], t = today();
  const cards = s.words ? state.cards.filter(c => s.words.has(wordKey(c))) : state.cards;
  const due = cards.filter(c => active(c) && dirsOf(s).some(d => { const x = sideOf(c, d); return x.reviews > 0 && x.due <= t; })).length;
  $("ws-daily").textContent = due ? due + " due" : "";
  $("ws-deck").textContent = s.name;
  const reading = state.books.filter(b => !isFinished(b)).length;
  $("ws-reading").textContent = reading ? reading + (reading === 1 ? " book" : " books") : "";
}

// tap a world: it rushes toward you, then the app opens straight into that mode
function enterWorld(button) {
  const home = $("home");
  if (home.classList.contains("launching") || home.classList.contains("entering")) return;
  home.classList.add("launching");
  button.classList.add("go");
  document.documentElement.classList.add("zooming");
  const wait = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
  setTimeout(() => {
    home.classList.remove("launching");
    button.classList.remove("go");
    document.documentElement.classList.remove("zooming");
    openApp();   // opens Review on your last deck…
    const m = button.dataset.mode;   // …then switches to the world you tapped
    if (m === "practice") startPractice(stackCards().filter(active));
    else if (m === "burn") startBurn();
    else if (m !== "daily") setMode(m);
  }, wait);
}
document.querySelectorAll(".world").forEach(b => { b.onclick = () => enterWorld(b); });

// tap the black hole: you're pulled in, then the app opens
$("blackhole").onclick = () => {
  const home = $("home");
  if (home.classList.contains("entering")) return;
  home.classList.add("entering");
  document.documentElement.classList.add("zooming");
  const wait = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
  setTimeout(() => {
    home.classList.remove("entering");
    document.documentElement.classList.remove("zooming");
    openApp();
  }, wait);
};

// the how-to page remembers which screen opened it, so Back returns there
let howFrom = "home";
function openHowto() {
  howFrom = ["home", "study"].find(s => !$(s).hidden) || "home";
  show("howto");
}
function closeHowto() {
  show(howFrom);
  if (howFrom === "study") render();   // re-measure the card now that the page is visible again
}
$("howtolink").onclick = openHowto;
$("gohelp").onclick = openHowto;
$("howback").onclick = closeHowto;
$("howback2").onclick = closeHowto;

$("openfocus").onclick = () => setMode("focus");   // from the timer dropdown: switch to ⏱ Focus
