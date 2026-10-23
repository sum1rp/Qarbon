// Qarbon · js/cards.js: Review, Practice and Decks: the queue, card directions, drawing cards, the deck list, the card editor, scheduling, answering, swipes.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= modes: "daily" (spaced repetition), "deck" (browse), "practice" (free review) =================
let mode = "daily";
// the queue holds { c: card, dir: "fr" or "en" }: the same word can come up French-first or English-first
let queue = [], current = null, currentDir = "fr", revealed = false;
let practice = { total: 0, right: 0, missed: new Set() };
// is a flashcard on screen? (Review and Practice show one; Deck, Burn and Focus don't)
function cardShowing() { return mode === "daily" || mode === "practice"; }

// ================= card directions =================
// "fr" = French on the front (the usual way), "en" = English on the front and you answer in French.
// Each direction keeps its own schedule: French → English lives on the card itself (like before),
// English → French lives in card.rev, so turning on reverse cards never touches your existing progress.
const dirsOf = s => ({ fr: ["fr"], en: ["en"], both: ["fr", "en"] })[state.directions[s ? s.id : "all"] || "fr"];
const newSide = () => ({ interval: 1, ease: 2.5, reviews: 0, correct: 0, due: today() });
const sideOf = (c, dir) => dir === "en" ? (c.rev || newSide()) : c;   // for reading
function sideToSave(c, dir) {                                           // for saving an answer
  if (dir !== "en") return c;
  if (!c.rev) c.rev = newSide();
  return c.rev;
}
const active = c => !c.suspended;   // suspended cards are skipped everywhere you study

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// a card is in your binder once you've seen it: from a pack (c.got), or studied before packs existed
const inBinder = c => !!c.got || c.reviews > 0 || !!(c.rev && c.rev.reviews > 0);
// your own cards (any word that isn't in the built-in Levels) work like an Anki deck: no packs, they come straight into
// Review, OWN_PER_DAY new ones a day per deck (c.got = the day one came in), and they live in a personal binder
const OWN_PER_DAY = 10;
const isOwn = c => { if (!wordWorld) sortWorlds(); return !wordWorld.has(wordKey(c)); };

function dailyList() {
  const t = today();
  if (state.newDate !== t) { state.newDate = t; state.newDone = 0; }
  // your own cards come in by themselves: up to OWN_PER_DAY new ones today, in the order you added them
  const own = stackCards().filter(c => active(c) && isOwn(c));
  let room = OWN_PER_DAY - own.filter(c => c.got === t).length;
  own.forEach(c => { if (room > 0 && !inBinder(c)) { c.got = t; room--; } });
  const dirs = dirsOf(stack);
  // new words come from the packs you've opened (js/collection.js): the cards in your binder you haven't studied yet,
  // plus a rare you pulled today (it may belong to another deck, like Level 6)
  const mine = new Set(stackCards());
  const pulledToday = state.cards.filter(c => c.pulled && c.got === t && c.reviews === 0 && active(c) && !mine.has(c))
    .map(c => ({ c, dir: dirs[0] }));
  const items = stackCards().filter(active).flatMap(c => dirs.map(dir => ({ c, dir })));
  // words you missed in Burn After Reading go first, even if they aren't due yet
  const burnDir = dirs[0], isBurned = it => it.c.burnMissed && it.dir === burnDir;
  const burned = items.filter(isBurned);
  const reviews = shuffle(items.filter(it => {
    const s = sideOf(it.c, it.dir);
    return !isBurned(it) && s.reviews > 0 && s.due <= t;
  }));
  // new cards. With "both", a word's English → French side only unlocks once you've seen it French-first,
  // so you never get both sides of a brand-new word back to back.
  const fresh = items.filter(it => sideOf(it.c, it.dir).reviews === 0 && !isBurned(it) && inBinder(it.c) &&
    (it.dir === "fr" || !dirs.includes("fr") || it.c.reviews > 0));
  save();
  return [...burned, ...reviews, ...fresh, ...pulledToday];
}

function setMode(m, list) {
  if (m === "deck" && mode !== "deck") showBinder(true);   // Decks opens on the binder; List is one tap away (js/collection.js)
  mode = m;
  if (m === "deck" || m === "focus" || m === "reading" || m === "media" || m === "translate" || m === "solar") { render(); return; }
  if (m === "daily") queue = dailyList();
  if (m === "practice") {
    queue = shuffle(list.flatMap(c => dirsOf(stack).map(dir => ({ c, dir }))));
    practice = { total: queue.length, right: 0, missed: new Set() };
  }
  next();
}

function startPractice(list) {
  if (!list.length) { $("msg").textContent = "No cards to practice yet. Import a pack first."; return; }
  $("msg").textContent = "";
  setMode("practice", list);
}

// re-sync the screen after cards change (import, restore, settings)
function refresh() { if (mode === "daily") setMode("daily"); else render(); }

function next() {
  const it = queue.shift();
  current = it ? it.c : null;
  currentDir = it ? it.dir : "fr";
  revealed = false;
  const c = $("card");
  c.classList.add("noanim");       // un-flip instantly so the next answer never peeks through
  c.classList.remove("flipped");
  void c.offsetWidth;
  c.classList.remove("noanim");
  render();
}

function updateDiag() {
  const t = today();
  const due = state.cards.filter(c => c.reviews > 0 && c.due <= t).length;
  $("diag").textContent = BUILD + " · " + state.cards.length + " cards loaded · " + due +
    " due for review · saving " + (storageOK ? "on" : "OFF (this browser is blocking storage)") +
    (auth ? " · ☁ " + (auth.lastSync ? "synced " + ago(auth.lastSync) : "not synced yet") : "");
}

function render() {
  if (mode !== "reading" && reader) closeReader();
  $("cardview").hidden = !cardShowing();
  $("deckview").hidden = mode !== "deck";
  $("focus").hidden = mode !== "focus";
  $("reading").hidden = mode !== "reading";
  $("media").hidden = mode !== "media";
  $("translate").hidden = mode !== "translate";
  $("solar").hidden = mode !== "solar";
  $("burnview").hidden = mode !== "burn";
  $("modeselect").value = mode;           // the Mode menu always shows where you are
  if (typeof miniQpod === "function") miniQpod();   // the mini Qpod (js/media.js) shows in the other modes while music is loaded
  updateDiag();
  if (mode === "deck") { renderDeck(); return; }
  if (mode === "reading") { renderBooks(); return; }
  if (mode === "media") { renderMedia(); return; }
  if (mode === "translate") { renderTranslate(); return; }
  if (mode === "solar") { renderSolar(); return; }   // 🪐 the Solar System map (js/collection.js)
  if (mode === "burn" || mode === "focus") return;   // these draw their own screens

  if (typeof packBanner === "function") packBanner();   // "Today's pack is ready" above the card (js/collection.js)
  const left = queue.length + (current ? 1 : 0);
  const practicing = mode === "practice";
  $("status").textContent = practicing
    ? "Practice · " + left + " left · nothing here affects your schedule"
    : (stack ? stack.name : "All cards") + " · " + left + " left today · " + stackCards().length + " cards";
  // practice only has two answers; daily review has Anki's four, each showing when you'd see the card next
  const names = practicing ? ["Missed", "", "Got it", ""] : ["Again", "Hard", "Good", "Easy"];
  GRADES.forEach((g, i) => {
    const b = $(g);
    b.hidden = !current || !revealed || !names[i];
    b.firstChild.textContent = names[i];
    b.lastChild.textContent = current && revealed && !practicing ? preview(sideOf(current, currentDir), i + 1) : "";
  });
  $("show").hidden = !current || revealed;
  $("buttons").hidden = !current;
  $("card").classList.toggle("flipped", revealed);
  setUpSwipe();
  fitCard();
  startShine();

  if (!current) {
    $("card").dataset.type = "";
    $("front").textContent = practicing
      ? "Practice complete! " + practice.right + " of " + practice.total + " right on the first try"
      : !stackCards().length ? "No cards here yet. Tap ‹ to pick a stack."
      : !$("packbanner").hidden ? packDoneText() : "Done for today! Try “Practice” to keep going.";
    $("answer").textContent = $("example").textContent = "";
    $("type1").textContent = $("type2").textContent = "";
    $("newbadge").hidden = $("gender").hidden = $("dirbadge").hidden = true;
    dressCard(null);
    return;
  }

  const reverse = currentDir === "en";   // English on the front, French is the answer
  const isNew = sideOf(current, currentDir).reviews === 0;
  const genders = { m: "masculine", f: "feminine", "m/f": "either" };

  $("card").dataset.type = current.part_of_speech || "";
  $("type1").textContent = $("type2").textContent = current.part_of_speech || "word";
  $("newbadge").hidden = practicing || !isNew;
  $("dirbadge").hidden = !reverse;
  $("front").textContent = reverse ? current.back || "" : current.front;
  $("answer").textContent = reverse ? current.front : current.back || "";
  $("speakfront").hidden = reverse;     // don't say the French before you've answered
  $("speakanswer").hidden = !reverse;
  $("gender").textContent = genders[current.gender] || "";
  $("gender").hidden = !genders[current.gender];
  $("example").textContent = current.example_target
    ? current.example_target + " — " + (current.example_english || "") : "";
  dressCard(current, currentDir);
}

// phones: tell the CSS how much room the top bars, the bottom buttons and the closed timer under the card take, so the card
// fills the rest. Only the timer's closed line counts: opening it makes the page longer instead of the card smaller.
function fitCard() {
  const r = document.documentElement.style;
  r.setProperty("--above", Math.round($("scene").getBoundingClientRect().top + scrollY + 8) + "px");
  r.setProperty("--below", ($("buttons").offsetHeight + $("timer").querySelector("summary").offsetHeight + 18) + "px");
}
window.addEventListener("resize", () => { if (cardShowing()) fitCard(); });

// ================= collectible cards: rarity, mastery and the holo shine =================
// Every word is a world on a trip out from Earth. Each built-in deck covers two worlds: its easier half and its harder half
// (Level 1 = Earth, then the Moon; Level 2 = Venus, then Mars; ...). The rare cards come last: Level 6 words are Nebulas and Black Holes.
// The Solar System mode (js/collection.js) is this trip as a map.
// The real photos are in img/ (NASA, public domain; credits on the how-to page). Each world has its own foil colors (css/styles.css).
// steps = the review wait in days for Familiar, Known and Mastered: easy words master fast, only Black Holes take 60 days.
const WORLDS = [
  { id: "earth",   name: "Earth",      img: "img/earth.jpg",       steps: [2, 3, 4] },
  { id: "moon",    name: "Moon",       img: "img/moon-full.jpg",   steps: [2, 4, 7] },
  { id: "venus",   name: "Venus",      img: "img/venus.jpg",       steps: [3, 5, 10] },
  { id: "mars",    name: "Mars",       img: "img/mars.jpg",        steps: [3, 7, 14] },
  { id: "mercury", name: "Mercury",    img: "img/mercury.jpg",     steps: [4, 9, 18] },
  { id: "jupiter", name: "Jupiter",    img: "img/jupiter.jpg",     steps: [5, 10, 21] },
  { id: "saturn",  name: "Saturn",     img: "img/saturn.jpg",      steps: [7, 14, 28] },
  { id: "uranus",  name: "Uranus",     img: "img/uranus.jpg",      steps: [7, 15, 30] },
  { id: "neptune", name: "Neptune",    img: "img/neptune.jpg",     steps: [7, 18, 35] },
  { id: "sun",     name: "Sun",        img: "img/sun.jpg",         steps: [7, 20, 40] },
  { id: "nebula",  name: "Nebula",     img: "img/crab-nebula.jpg", steps: [7, 21, 50] },
  { id: "hole",    name: "Black Hole", img: "img/sgr-a.jpg",       steps: [7, 21, 60] },
];
const MASTERY = ["New", "Learning", "Familiar", "Known", "Mastered"];
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

// how hard a word looks, as one number: 100 for accents, 100 for a long word (9+ letters) or several words, plus its letters
function difficulty(front) {
  const w = front || "";
  const word = w.replace(/^(le|la|les|l'|un|une) /i, "");        // "la femme" counts as "femme"
  const letters = word.replace(/ /g, "").length;
  let d = letters;
  if (/[éèêëàâçîïôûùœæ]/i.test(w)) d += 100;                      // accents
  if (letters >= 9 || word.includes(" ") || w.includes("s'")) d += 100;   // long, several words, or reflexive
  return d;
}

// compare two words by difficulty; words that tie are put in alphabetical order, so each level splits exactly in half
const harderThan = (a, b) => a.d - b.d || (a.w < b.w ? -1 : a.w > b.w ? 1 : 0);

// which world each built-in word belongs to, worked out once from js/packs.js: its deck (the first one it's in),
// then the easier or harder half of that deck, split at the middle difficulty (so each deck splits exactly in half).
// worldWords = the built-in words (lowercase) of each world, in the order of WORLDS: what the Solar System counts.
let wordWorld = null, worldWords = null, deckCuts = [];
function sortWorlds() {
  wordWorld = new Map(); worldWords = WORLDS.map(() => []);
  BUILT_IN.forEach((b, n) => {
    const rows = parseCSV(PACKS[b.id]), col = rows[0].map(h => h.trim().toLowerCase()).indexOf("front");
    const words = rows.slice(1).map(r => (r[col] || "").trim()).filter(w => w && !wordWorld.has(w.toLowerCase()));
    const sorted = words.map(w => ({ d: difficulty(w), w })).sort(harderThan);
    deckCuts[n] = sorted[Math.floor(sorted.length / 2)];
    sorted.forEach((x, i) => {
      const w = n * 2 + (i >= Math.floor(sorted.length / 2) ? 1 : 0);
      wordWorld.set(x.w.toLowerCase(), WORLDS[w]);
      worldWords[w].push(x.w.toLowerCase());
    });
  });
}

function worldOf(c) {
  if (!wordWorld) sortWorlds();
  const built = wordWorld.get(wordKey(c));
  if (built) return built;
  // your own cards: their level tag picks the deck's worlds (A1 → Level 1's, A2 → Level 2's … C2 → Level 6's)
  const n = Math.max(0, LEVEL_ORDER.indexOf(levelOf(c) || "A1"));
  return WORLDS[n * 2 + (harderThan({ d: difficulty(c.front), w: c.front }, deckCuts[n]) >= 0 ? 1 : 0)];
}

// mastery step 0–4 for one direction of a card: New until you get it right once (Learning),
// then Familiar / Known / Mastered as its review wait (interval) passes the tier's steps
function masteryOf(c, dir) {
  const s = sideOf(c, dir);
  if (!s.reviews || (!s.correct && s.interval <= 1)) return 0;
  return 1 + worldOf(c).steps.filter(d => s.interval >= d).length;
}

// put the world and mastery on the card on screen (both faces); c = null for the "done for today" card
function dressCard(c, dir) {
  const card = $("card");
  const r = c && worldOf(c), m = c ? masteryOf(c, dir) : 0;
  card.dataset.tier = r ? r.id : "";
  card.dataset.m = m;
  card.querySelectorAll(".tier img, .art .photo").forEach(img => {
    if (!r) img.removeAttribute("src");
    else if (img.getAttribute("src") !== r.img) img.src = r.img;
  });
  card.querySelectorAll(".tier b").forEach(b => { b.textContent = r ? r.name : ""; });
  card.querySelectorAll(".pips").forEach(p => {
    p.querySelectorAll("i").forEach((i, n) => i.classList.toggle("on", n < m));
    p.querySelector(".step").textContent = c ? MASTERY[m] : "";
  });
}

// after an answer: if the word went up a step, say so for a moment above the card ("le magasin · Known")
function noteLevelUp(c, dir, before) {
  const after = masteryOf(c, dir);
  if (after <= before) return;
  const el = $("levelup");
  el.textContent = "⬆ " + c.front + " · " + MASTERY[after];
  el.hidden = false;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(noteLevelUp.timer);
  noteLevelUp.timer = setTimeout(() => { el.hidden = true; }, 1800);
}

// The shine: --mx / --my (where the light is, 0–100%) on #card, and --rx / --ry (a small tilt) on #tilt, the layer around it.
// It follows your finger or the mouse, the phone's tilt when that's turned on in ⚙, and drifts slowly by itself otherwise.
const stillCards = matchMedia("(prefers-reduced-motion: reduce)").matches;
let fingerAt = 0, tiltAt = 0, tiltBase = null, shineLoop = false;
const clamp01 = v => Math.min(1, Math.max(0, v));

function setShine(x, y) {   // x, y from 0 to 1
  const st = $("card").style, tilt = $("tilt").style;   // the light on the card, the tilt on its holder (see #tilt in the styles)
  st.setProperty("--mx", (x * 100).toFixed(1) + "%");
  st.setProperty("--my", (y * 100).toFixed(1) + "%");
  tilt.setProperty("--rx", stillCards ? "0deg" : ((0.5 - y) * 8).toFixed(2) + "deg");
  tilt.setProperty("--ry", stillCards ? "0deg" : ((x - 0.5) * 10).toFixed(2) + "deg");
}

// finger or mouse over the card (also while swiping: the light slides with it)
$("scene").addEventListener("pointermove", e => {
  if (!current) return;
  const r = $("scene").getBoundingClientRect();
  fingerAt = performance.now();
  setShine(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height));
});

// the phone's tilt: gamma = left/right, beta = forward/back. The "level" slowly follows how you hold the phone,
// so only the movement counts, whether you hold it upright or flat.
function onTilt(e) {
  if (e.gamma == null || e.beta == null) return;
  if (!tiltBase) tiltBase = { b: e.beta, g: e.gamma };
  tiltBase.b += (e.beta - tiltBase.b) * 0.02;
  tiltBase.g += (e.gamma - tiltBase.g) * 0.02;
  if (!cardShowing() || performance.now() - fingerAt < 1500) return;   // your finger wins
  tiltAt = performance.now();
  setShine(clamp01(0.5 + (e.gamma - tiltBase.g) / 40), clamp01(0.5 + (e.beta - tiltBase.b) / 40));
}
function startTilt(on) {
  window.removeEventListener("deviceorientation", onTilt);
  tiltBase = null;
  if (on) window.addEventListener("deviceorientation", onTilt);
}
// iPhone only allows tilt after you say yes, and only from a tap: ask from ⚙ (or the card, if it was on before)
async function askTilt() {
  const D = window.DeviceOrientationEvent;
  if (!D) return false;
  if (typeof D.requestPermission === "function") {
    try { if (await D.requestPermission() !== "granted") return false; } catch (err) { return false; }
  }
  startTilt(true);
  return true;
}
// tilt was turned on in an earlier visit: listen now, and if iPhone wants a yes again, ask on the first tap of a card
if (state.cardTilt) startTilt(true);
$("scene").addEventListener("pointerup", () => { if (state.cardTilt && !tiltBase) askTilt(); });

// the slow drift when nothing moves the light (30 times a second, only while a card is on screen)
function shineDrift(t) {
  const onScreen = cardShowing() && !$("study").hidden && !document.hidden && current;
  if (!onScreen || stillCards) { shineLoop = false; return; }
  const now = performance.now();
  if (now - fingerAt > 1500 && now - tiltAt > 1500 && !(shineDrift.last > now - 33)) {
    shineDrift.last = now;
    const a = t / 2600;
    setShine(0.5 + Math.cos(a) * 0.3, 0.42 + Math.sin(a * 1.3) * 0.25);
  }
  requestAnimationFrame(shineDrift);
}
function startShine() {
  if (shineLoop || stillCards) return;
  shineLoop = true;
  requestAnimationFrame(shineDrift);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && cardShowing()) startShine(); });

// ================= the deck screen =================
function setOptions(sel, items, prev) {
  sel.innerHTML = "";
  items.forEach(([v, l]) => {
    const o = document.createElement("option"); o.value = v; o.textContent = l; sel.appendChild(o);
  });
  if (items.some(i => i[0] === prev)) sel.value = prev;
}

function fillFilters() {
  const levels = [...new Set(stackCards().map(c => levelOf(c) || "none"))].sort();
  setOptions($("level"),
    [["all", "All levels"], ...levels.map(l => [l, LEVELS[l] || "Unrated"])], $("level").value);
  const types = [...new Set(stackCards().map(c => c.part_of_speech || "other"))].sort();
  setOptions($("type"),
    [["all", "All word types"], ...types.map(t => [t, t])], $("type").value);
}

function filtered() {
  const q = $("search").value.trim().toLowerCase();
  const lv = $("level").value || "all", ty = $("type").value || "all";
  return stackCards().filter(c =>
    (lv === "all" || (levelOf(c) || "none") === lv) &&
    (ty === "all" || (c.part_of_speech || "other") === ty) &&
    (!q || c.front.toLowerCase().includes(q) || (c.back || "").toLowerCase().includes(q)));
}

function statusOf(c) {
  if (c.suspended) return ["suspended", "sus"];
  const s = sideOf(c, dirsOf(stack)[0]);   // the schedule for this stack's main direction
  if (s.reviews === 0) return ["new", "n"];
  if (s.due <= today()) return ["due today", "due"];
  return ["next " + s.due, ""];
}

function renderList() {
  const list = filtered();
  const counts = {};
  const all = stackCards();
  all.forEach(c => { const l = LEVELS[levelOf(c)] || "Unrated"; counts[l] = (counts[l] || 0) + 1; });
  const started = all.filter(c => c.reviews > 0).length;
  $("decksummary").textContent = all.length + " cards · " +
    Object.entries(counts).map(([l, n]) => l + ": " + n).join(" · ") +
    " · " + started + " started · showing " + list.length;
  $("practicefiltered").textContent = "Practice these (" + list.length + ")";

  const box = $("decklist");
  box.innerHTML = "";
  list.forEach(c => {
    const row = document.createElement("div"); row.className = "row";
    const left = document.createElement("div");
    const w = document.createElement("span"); w.className = "w"; w.textContent = c.front;
    const m = document.createElement("span"); m.className = "m"; m.textContent = " — " + (c.back || "");
    left.append(w, m);
    if (c.example_target) {
      const ex = document.createElement("div"); ex.className = "ex"; ex.textContent = c.example_target;
      left.appendChild(ex);
    }
    const [label, cls] = statusOf(c);
    const s = document.createElement("div"); s.className = "s " + cls; s.textContent = label;
    row.append(left, s);
    row.title = "Tap to edit";
    row.onclick = () => openEditor(c);
    box.appendChild(row);
  });
  if (!list.length) box.textContent = all.length ? "No matching cards." : "No cards here yet. Tap ‹ to pick a stack.";
}

function renderDeck() {
  $("deckname").textContent = stack ? stack.name : "All my cards";
  renderStacks();
  fillFilters();
  renderList();
  renderBinder();   // only draws while the Binder tab is open (js/collection.js)
}

$("search").oninput = renderList;
$("level").onchange = renderList;
$("type").onchange = renderList;
$("practicefiltered").onclick = () => startPractice(filtered().filter(active));

// the Mode menu: switch what you're doing
$("modeselect").onchange = e => {
  const m = e.target.value;
  if (m === "practice") startPractice(stackCards().filter(active));
  else if (m === "burn") startBurn();
  else {
    if (m === "deck") closeEditor(false);
    if (m === "reading") closeBookForm();
    setMode(m);
  }
  $("modeselect").value = mode;   // e.g. Practice with no cards: stay where you were
};

// ================= editing cards (Deck tab) =================
// Tap a card in the list to edit, suspend or delete it. "+ Add card" makes a new one.
let editing = null;   // the card being edited, or null when adding a new card

// words from the built-in packs: these can be suspended but not deleted
// (opening Level 1, Level 2 or Level 3 would just add them back)
const builtInWords = () => new Set(allStacks().filter(s => s.text).flatMap(s => [...s.words]));

function openEditor(c) {
  editing = c;
  $("decklistview").hidden = true;
  $("editor").hidden = false;
  $("edtitle").textContent = c ? "Edit card" : "Add a card";
  $("ed-front").value = c ? c.front : "";
  $("ed-back").value = c ? c.back || "" : "";
  $("ed-pos").value = c ? c.part_of_speech || "" : "";
  $("ed-gender").value = c && ["m", "f", "m/f"].includes(c.gender) ? c.gender : "";
  $("ed-exfr").value = c ? c.example_target || "" : "";
  $("ed-exen").value = c ? c.example_english || "" : "";
  $("ed-tags").value = c ? c.tags || "" : "";
  $("ed-suspend").hidden = $("ed-delete").hidden = !c;
  const builtIn = c && builtInWords().has(wordKey(c));
  if (c) {
    $("ed-suspend").textContent = c.suspended ? "Unsuspend" : "Suspend";
    $("ed-delete").disabled = builtIn;
  }
  $("ed-msg").textContent = builtIn ? "This word is part of a built-in stack, so it can be suspended but not deleted."
    : c ? "" : "It will go into " + (stack && stack.custom ? "“" + stack.name + "”" : "All my cards") + ".";
  scrollTo(0, 0);
}

// back to the list (refresh = redraw it, to show what changed)
function closeEditor(refresh = true) {
  editing = null;
  $("editor").hidden = true;
  $("decklistview").hidden = false;
  if (refresh && mode === "deck") renderDeck();
}

$("addcard").onclick = () => openEditor(null);
$("ed-cancel").onclick = () => closeEditor();

$("ed-save").onclick = () => {
  const front = $("ed-front").value.trim(), back = $("ed-back").value.trim();
  if (!front || !back) { $("ed-msg").textContent = "Both the French and the English are needed."; return; }
  const key = front.toLowerCase();
  const clash = state.cards.find(c => c !== editing && (wordKey(c) === key || c.front.trim().toLowerCase() === key));
  if (clash) { $("ed-msg").textContent = "“" + clash.front + "” is already one of your cards."; return; }
  const fields = { front, back, part_of_speech: $("ed-pos").value.trim(), gender: $("ed-gender").value,
                   example_target: $("ed-exfr").value.trim(), example_english: $("ed-exen").value.trim(),
                   tags: $("ed-tags").value.trim() };
  if (editing) {
    // remember the card's original word, so it stays in its decks (and keeps its progress) even if you respell it
    editing.key = wordKey(editing);
    Object.assign(editing, fields);
    $("msg").textContent = "Saved “" + front + "”.";
  } else {
    state.cards.push({ ...fields, interval: 1, ease: 2.5, due: today(), reviews: 0, correct: 0 });
    const deck = stack && stack.custom && state.decks.find(d => d.id === stack.id);
    if (deck) { deck.words.push(key); stack.words.add(key); }   // goes into the custom deck you're in
    $("msg").textContent = "Added “" + front + "” to " + (deck ? "“" + deck.name + "”" : "All my cards") + ".";
  }
  save();
  closeEditor();
};

// suspended cards stay in your deck but never come up in Review, Practice or Burn
$("ed-suspend").onclick = () => {
  editing.suspended = !editing.suspended;
  if (!editing.suspended) delete editing.suspended;
  $("msg").textContent = (editing.suspended ? "Suspended “" : "Unsuspended “") + editing.front + "”.";
  save();
  closeEditor();
};

$("ed-delete").onclick = () => {
  const c = editing;
  if (!confirm("Delete “" + c.front + "” and its progress? This can't be undone.")) return;
  state.cards = state.cards.filter(x => x !== c);
  state.decks.forEach(d => { d.words = d.words.filter(w => w !== wordKey(c)); });   // and from your decks
  if (stack && stack.words && stack.custom) stack.words.delete(wordKey(c));
  $("msg").textContent = "Deleted “" + c.front + "”.";
  save();
  closeEditor();
};

// ================= scheduling, the Anki way (SM-2) =================
// grade: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
// Every card has an "ease" (starts at 2.5): how much its wait grows after a Good. Hard words get a lower ease.
const GRADES = ["again", "hard", "good", "easy"];

function schedule(c, grade) {
  let ease = c.ease || 2.5, days;
  if (c.reviews === 0) days = grade === 4 ? 4 : 1;                              // brand-new card
  else if (grade === 1) { days = 1; ease -= 0.2; }                             // forgot it: start over
  else if (grade === 2) { days = Math.max(c.interval * 1.2, c.interval); ease -= 0.15; }
  else if (grade === 3) days = Math.max(c.interval * ease, c.interval + 1);
  else { days = Math.max(c.interval * ease * 1.3, c.interval + 2); ease += 0.15; }
  return { interval: Math.max(1, Math.round(days)), ease: Math.max(1.3, Math.round(ease * 100) / 100) };
}

// a card you pressed Again on earlier today (it's already scheduled for a later day)
const relearning = c => c.reviews > 0 && c.due > today();

// the little label under each button, like "3d" or "2mo"
function preview(c, grade) {
  if (grade === 1) return "soon";
  if (relearning(c) && !c.burnMissed) return "1d";
  const d = schedule(c, grade).interval;
  return d < 30 ? d + "d" : d < 365 ? Math.round(d / 30) + "mo" : (d / 365).toFixed(1) + "y";
}

// put the card you just missed back a few cards later (same direction), so you see it again today
const againSoon = () => queue.splice(Math.min(3, queue.length), 0, { c: current, dir: currentDir });

// save an answer into a card's schedule (used by normal review and by Burn After Reading)
function applyGrade(c, grade) {
  const s = schedule(c, grade);
  c.interval = s.interval;
  c.ease = s.ease;
  c.reviews++;
  if (grade > 1) c.correct = (c.correct || 0) + 1;
  c.due = addDays(s.interval);
}

// ================= answering =================
function rate(grade) {
  if (!current) return;
  if (mode === "practice") {
    // free review: nothing is saved, missed cards come back at the end
    const key = current.front + "|" + currentDir;
    if (grade > 1) { if (!practice.missed.has(key)) practice.right++; }
    else { practice.missed.add(key); queue.push({ c: current, dir: currentDir }); }
    next();
    return;
  }
  const side = sideToSave(current, currentDir);   // the schedule for the direction you were just tested on
  // a word missed in Burn After Reading gets a normal review now, then it's back to regular
  const burned = current.burnMissed;
  delete current.burnMissed;
  if (!burned && relearning(side)) {   // second look at a missed card: its schedule is already set
    if (grade === 1) againSoon();
    next();
    return;
  }
  const wasNew = side.reviews === 0;
  const step = masteryOf(current, currentDir);
  applyGrade(side, grade);
  noteLevelUp(current, currentDir, step);
  journeyCheck();   // did that answer reach a world? Then the next one opens (js/collection.js)
  if (wasNew) state.newDone++;
  if (grade === 1) againSoon();
  save(); next();
}

// ================= card gestures: tap to flip, swipe up = show the answer, then swipe right = Good, left = Again =================
// They live on the card only, so scrolling in the Deck tab (which has no card) is never affected.
const scene = $("scene");
let drag = null, flying = false;

// move the card sideways with a slight tilt, and glow green/red once it's far enough to count
function slide(x, animate) {
  scene.style.transition = animate ? "transform .25s ease, opacity .25s ease" : "none";
  scene.style.transform = x ? "translateX(" + x + "px) rotate(" + x / 25 + "deg)" : "";
  scene.dataset.swipe = Math.abs(x) < 40 ? "" : x > 0 ? "good" : "again";
}

// tap: show the answer, or once it's showing, flip back and forth to look again
function flip() {
  if (!revealed) { revealed = true; render(); }
  else $("card").classList.toggle("flipped");
}

scene.addEventListener("pointerdown", e => {
  if (!current || flying || e.target.closest(".speak")) return;
  e.preventDefault();   // stops a mouse drag from highlighting text on the page
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, sideways: false, up: false };
});

scene.addEventListener("pointermove", e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.sideways && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
    drag.sideways = true;
    scene.setPointerCapture(e.pointerId);
  }
  if (drag.sideways && revealed) { drag.dx = dx; slide(dx, false); }   // no swiping sideways before you've seen the answer
  // before the answer shows: pushing the card up lifts it a little, and letting go far enough up shows the answer
  if (!revealed && !drag.sideways && !drag.up && dy < -10 && Math.abs(dy) > Math.abs(dx)) {
    drag.up = true;
    scene.setPointerCapture(e.pointerId);
  }
  if (drag.up) {
    drag.dy = Math.min(0, dy);
    scene.style.transition = "none";
    scene.style.transform = "translateY(" + drag.dy * .35 + "px)";
  }
});

scene.addEventListener("pointerup", e => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (d.up) {   // a swipe up: settle back, and show the answer if it went far enough (50px)
    scene.style.transition = "transform .25s ease";
    scene.style.transform = "";
    if (d.dy < -50) flip();
    return;
  }
  if (!d.sideways && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) { flip(); return; }
  if (!revealed) return;
  if (Math.abs(d.dx) < Math.min(100, scene.offsetWidth * 0.3)) { slide(0, true); return; }   // not far enough: snap back
  // far enough: fly off that side, rate the card, then fade the next one in
  const good = d.dx > 0;
  flying = true;
  slide((good ? 1 : -1) * window.innerWidth, true);
  scene.style.opacity = "0";
  setTimeout(() => {
    rate(good ? 3 : 1);
    slide(0, false);
    void scene.offsetWidth;
    scene.style.transition = "opacity .2s ease";
    scene.style.opacity = "";
    flying = false;
  }, 250);
});

scene.addEventListener("pointercancel", () => { drag = null; if (!flying) slide(0, true); });
// a swipe up needs the browser to leave up-and-down moves on the card to us: that's only switched on while the answer
// is hidden (#scene.upswipe in the styles). Once it shows, up and down scroll the page again.
function setUpSwipe() { $("scene").classList.toggle("upswipe", !!current && !revealed); }
