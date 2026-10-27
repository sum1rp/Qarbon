// Qarbon · js/cards.js: Review, Practice and Decks: the queue, card directions, drawing cards, the deck list, the card editor, scheduling, answering, swipes.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= modes: "daily" (spaced repetition), "deck" (browse), "practice" (🔁 Practice: free review) =================
let mode = "daily";
// the queue holds { c: card, dir: "fr" or "en" }: the same word can come up French-first or English-first
let queue = [], current = null, currentDir = "fr", revealed = false;
let practice = { total: 0, right: 0, missed: new Set(), name: "" };
// is a flashcard on screen? (Review and Practice show one; Deck, Burn and Focus don't)
function cardShowing() { return mode === "daily" || mode === "practice"; }

// ================= card directions =================
// "fr" = the course's language (French or Spanish) on the front (the usual way), "en" = English on the front and you answer in it.
// Each direction keeps its own schedule: French → English lives on the card itself (like before),
// English → French lives in card.rev, so turning on reverse cards never touches your existing progress.
const dirsOf = s => ({ fr: ["fr"], en: ["en"], both: ["fr", "en"] })[state.directions[(s || course()).id] || "fr"];
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
// your own cards (any word that isn't in a course's built-in Levels) work like an Anki deck: no packs, they come straight into
// Review, a few new ones a day per deck (⚙ "New cards a day (your own decks)", state.newPerDay: 10, 20 or 30;
// c.got = the day one came in), and they live in a personal binder
const isOwn = c => { if (!wordWorld) sortWorlds(); return !wordWorld.has(wordKey(c)); };

function dailyList() {
  const t = today();
  if (state.newDate !== t) { state.newDate = t; state.newDone = 0; }
  // your own cards come in by themselves: up to state.newPerDay new ones today, in the order you added them
  const own = stackCards().filter(c => active(c) && isOwn(c));
  let room = state.newPerDay - own.filter(c => c.got === t).length;
  own.forEach(c => { if (room > 0 && !inBinder(c)) { c.got = t; room--; } });
  const dirs = dirsOf(stack);
  // new words come from the packs you've opened (js/collection.js): the cards in your binder you haven't studied yet,
  // plus a rare you pulled today (it may belong to another deck, like Level 6; only in the course's own language)
  const mine = new Set(stackCards());
  const pulledToday = state.cards.filter(c => c.pulled && c.got === t && c.reviews === 0 && active(c) && !mine.has(c) && cardLang(c) === course().lang)
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

function setMode(m, list, name) {
  if (m !== "daily") setMapBack(false);   // ‹ goes back to the map only while you're in the Review the map opened (js/collection.js)
  if (m === "deck" && mode !== "deck") showBinder(true);   // Decks opens on the binder; List is one tap away (js/collection.js)
  mode = m;
  if (m === "deck" || m === "focus" || m === "reading" || m === "media" || m === "translate" || m === "solar") { render(); return; }
  if (m === "daily") queue = dailyList();
  if (m === "practice") {
    queue = shuffle(list.flatMap(c => dirsOf(stack).map(dir => ({ c, dir }))));
    practice = { total: queue.length, right: 0, missed: new Set(), name: name || "" };
  }
  next();
}

// 🔁 Practice: go through one set of cards (a world, your personal binder, the cards you
// filtered) in random order, as often as you like. Nothing here changes your schedule. name = what you're practicing
function startPractice(list, name) {
  if (!list.length) { $("msg").textContent = "No cards to practice here yet. Open a pack first."; return; }
  $("msg").textContent = "";
  setMode("practice", list, name);
}

// re-sync the screen after cards change (import, restore, settings)
function refresh() { if (mode === "daily") setMode("daily"); else render(); }

function next() {
  const it = queue.shift();
  current = it ? it.c : null;
  currentDir = it ? it.dir : "fr";
  revealed = false;
  typed = null;              // a new card: nothing typed yet
  $("typein").value = "";
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
    ? "Practice" + (practice.name ? " · " + practice.name : "") + " · " + left + " left · your schedule stays the same"
    : (stack || course()).name + " · " + left + " left today";   // (Binder and List sit at the end of this line)
  // the hint under the card: how to turn it over, then how to answer by swiping
  $("cardhint").textContent = !current ? "" : !revealed ? "Tap or swipe up to flip"
    : practicing ? "Swipe right for Got it, left for Missed" : "Swipe right for Good, left for Again";
  // practice only has two answers; daily review has Anki's four, each showing when you'd see the card next
  const names = practicing ? ["Missed", "", "Got it", ""] : ["Again", "Hard", "Good", "Easy"];
  GRADES.forEach((g, i) => {
    const b = $(g);
    b.hidden = !current || !revealed || !names[i];
    b.firstChild.textContent = names[i];
    b.lastChild.textContent = current && revealed && !practicing ? preview(sideOf(current, currentDir), i + 1) : "";
  });
  // "Type the answer" (⚙, per deck): a box under the card instead of Show answer, then your letters compared
  const typing = !!current && typeOn();
  $("show").hidden = !current || revealed || typing;
  $("typerow").hidden = !typing || revealed;
  $("typein").placeholder = "Type the " + answerLang() + "…";
  showTyped(typing && revealed);
  $("buttons").hidden = !current;
  $("card").classList.toggle("flipped", revealed);
  setUpSwipe();
  fitCard();
  startShine();

  if (!current) {
    $("card").dataset.type = "";
    $("front").textContent = practicing
      ? "Practice complete! " + practice.right + " of " + practice.total + " right on the first try"
      : !stackCards().length ? "No cards here yet. Pick a deck in 🗂 Decks."
      : !$("packbanner").hidden ? packDoneText() : "Done for today! To keep going, 🔁 Practice a world in the Binder or on the map.";
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
  // the example: the sentence in French or Spanish (bigger), then its English (smaller, on its own line)
  const exT = document.createElement("span"), exEn = document.createElement("span");
  exT.className = "ex-t"; exEn.className = "ex-en";
  exT.textContent = current.example_target || ""; exEn.textContent = current.example_english || "";
  $("example").replaceChildren(...(current.example_target ? [exT, exEn] : []));
  dressCard(current, currentDir);
}

// phones: tell the CSS how much room the top bars, the bottom buttons and the hint under the card take, so the card fills the rest
function fitCard() {
  const r = document.documentElement.style;
  r.setProperty("--above", Math.round($("scene").getBoundingClientRect().top + scrollY + 8) + "px");
  r.setProperty("--below", ($("buttons").offsetHeight + $("cardhint").offsetHeight + $("typerow").offsetHeight + $("typeres").offsetHeight + 18) + "px");
  // the card keeps its card shape, so a short screen makes it narrow: then its top row drops the world's name (css "narrow")
  $("card").classList.toggle("narrow", $("scene").offsetWidth < 290);
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

// how hard a word looks, as one number: 100 for accents, 100 for a long word (9+ letters) or several words, plus its letters.
// Works for French and Spanish words alike.
function difficulty(front) {
  const w = front || "";
  const word = w.replace(/^(le|la|les|l'|un|une|el|los|las|una) /i, "");   // "la femme" counts as "femme", "el perro" as "perro"
  const letters = word.replace(/ /g, "").length;
  let d = letters;
  if (/[éèêëàâçîïôûùœæáíóúüñ¿¡]/i.test(w)) d += 100;              // accents (French and Spanish)
  if (letters >= 9 || word.includes(" ") || w.includes("s'")) d += 100;   // long, several words, or reflexive
  return d;
}

// compare two words by difficulty; words that tie are put in alphabetical order, so each level splits exactly in half
const harderThan = (a, b) => a.d - b.d || (a.w < b.w ? -1 : a.w > b.w ? 1 : 0);

// which world each built-in word belongs to, worked out once from js/packs.js: its deck (the first one it's in),
// then the easier or harder half of that deck, split at the middle difficulty (so each deck splits exactly in half).
// Each course does this on its own: French Level 1 and Spanish Level 1 are both Earth and the Moon.
// The maps use word keys (wordKey: "es:hola" for Spanish).
// worldWords = { course id: the built-in words of each world, in the order of WORLDS }: what the Solar System counts.
// wordOrder = each built-in word's place in its course (Level 1's list first, the most useful words first): packs deal in this order.
// deckCuts = French's middle word per Level: your own cards with a level tag are placed by it (worldOf).
let wordWorld = null, worldWords = null, deckCuts = [], wordOrder = null;
function sortWorlds() {
  wordWorld = new Map(); worldWords = {}; wordOrder = new Map();
  courses().forEach(k => {
    worldWords[k.id] = WORLDS.map(() => []);
    k.levels.forEach((b, n) => {
      const rows = parseCSV(PACKS[b.id]), col = rows[0].map(h => h.trim().toLowerCase()).indexOf("front");
      const words = rows.slice(1).map(r => (r[col] || "").trim()).filter(w => w && !wordWorld.has(langKey(k.lang, w)));
      words.forEach(w => { if (!wordOrder.has(langKey(k.lang, w))) wordOrder.set(langKey(k.lang, w), wordOrder.size); });
      const sorted = words.map(w => ({ d: difficulty(w), w })).sort(harderThan);
      if (k.id === COURSE_ID) deckCuts[n] = sorted[Math.floor(sorted.length / 2)];
      sorted.forEach((x, i) => {
        const w = n * 2 + (i >= Math.floor(sorted.length / 2) ? 1 : 0);
        wordWorld.set(langKey(k.lang, x.w), WORLDS[w]);
        worldWords[k.id][w].push(langKey(k.lang, x.w));
      });
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
  $("practicefiltered").textContent = "🔁 Practice these (" + list.filter(practicable).length + ")";

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
  if (!list.length) box.textContent = all.length ? "No matching cards." : "No cards here yet. Tap + Add card to make one.";
}

function renderDeck() {
  $("deckname").textContent = (stack || course()).name;
  renderStacks();
  fillFilters();
  renderList();
  renderBinder();   // only draws while the Binder tab is open (js/collection.js)
}

$("search").oninput = renderList;
$("level").onchange = renderList;
$("type").onchange = renderList;
// practice only takes cards that are yours: collected from a pack (or your own cards); silhouettes aren't yet
const practicable = c => active(c) && (inBinder(c) || isOwn(c));
$("practicefiltered").onclick = () => startPractice(filtered().filter(practicable), "your filtered cards");

// the Mode menu: switch what you're doing
$("modeselect").onchange = e => {
  const m = e.target.value;
  if (m === "burn") startBurn();
  else {
    if (m === "deck") closeEditor(false);
    if (m === "reading") closeBookForm();
    setMode(m);
  }
  $("modeselect").value = mode;   // e.g. B.A.R. with no cards: stay where you were
};

// ================= editing cards (Deck tab) =================
// Tap a card in the list to edit, suspend or delete it. "+ Add card" makes a new one.
let editing = null;   // the card being edited, or null when adding a new card

// words from the built-in Levels (a course): these can be suspended but not deleted
// (opening the course would just add them back)
const isBuiltIn = c => courses().some(k => k.words.has(wordKey(c)));

function openEditor(c) {
  editing = c;
  $("decklistview").hidden = true;
  $("editor").hidden = false;
  $("edtitle").textContent = c ? "Edit card" : "Add a card";
  // the labels name the card's language: the course's for a new card in a course, else the card's own (your decks: French, as before)
  const lang = c ? courseOf(c).name : stack && stack.custom ? "French" : course().name;
  $("ed-front").previousSibling.textContent = lang + " (front)";
  $("ed-exfr").previousSibling.textContent = "Example sentence (" + lang + ")";
  $("ed-front").value = c ? c.front : "";
  $("ed-back").value = c ? c.back || "" : "";
  $("ed-pos").value = c ? c.part_of_speech || "" : "";
  $("ed-gender").value = c && ["m", "f", "m/f"].includes(c.gender) ? c.gender : "";
  $("ed-exfr").value = c ? c.example_target || "" : "";
  $("ed-exen").value = c ? c.example_english || "" : "";
  $("ed-tags").value = c ? c.tags || "" : "";
  $("ed-suspend").hidden = $("ed-delete").hidden = !c;
  const builtIn = c && isBuiltIn(c);
  if (c) {
    $("ed-suspend").textContent = c.suspended ? "Unsuspend" : "Suspend";
    $("ed-delete").disabled = builtIn;
  }
  $("ed-msg").textContent = builtIn ? "This word is part of a built-in stack, so it can be suspended but not deleted."
    : c ? "" : "It will go into " + (stack && stack.custom ? "“" + stack.name + "”" : course().name + "'s personal binder") + ".";
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
  // the card's language: an edited card keeps its own; a new one in a course gets the course's (your own decks: none, as before)
  const lang = editing ? editing.lang : stack && stack.custom ? "" : course().lang;
  if (!front || !back) { $("ed-msg").textContent = "Both the " + (lang === "es" ? "Spanish" : "French") + " and the English are needed."; return; }
  const key = langKey(lang, front);
  const clash = state.cards.find(c => c !== editing && (wordKey(c) === key || langKey(c.lang, c.front) === key));
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
    state.cards.push({ ...fields, interval: 1, ease: 2.5, due: today(), reviews: 0, correct: 0, ...(lang && lang !== "fr" ? { lang } : {}) });
    const deck = stack && stack.custom && state.decks.find(d => d.id === stack.id);
    if (deck) { deck.words.push(key); stack.words.add(key); }   // goes into the custom deck you're in
    $("msg").textContent = "Added “" + front + "” to " + (deck ? "“" + deck.name + "”" : course().name + "'s personal binder") + ".";
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

// Anki's default numbers, in whole days (build 71, the user's choice: no minute steps):
//   new card: Again = again today, Hard/Good = 1 day, Easy = 4 days
//   Again = forgot it: back to 1 day, ease − 0.2
//   Hard  = wait × 1.2 (at least 1 day more), ease − 0.15
//   Good  = (wait + half the days you were late) × ease (at least 1 day more than Hard)
//   Easy  = (wait + the days you were late) × ease × 1.3 (at least 1 day more than Good), ease + 0.15
// Like Anki, a card you answer late counts the extra days you still remembered it.
function schedule(c, grade) {
  let ease = c.ease || 2.5, days;
  if (c.reviews === 0) days = grade === 4 ? 4 : 1;                              // brand-new card
  else if (grade === 1) { days = 1; ease -= 0.2; }                             // forgot it: start over
  else {
    const ivl = c.interval, late = daysLate(c);
    const hard = Math.max(Math.round(ivl * 1.2), ivl + 1);
    const good = Math.max(Math.round((ivl + late / 2) * ease), hard + 1);
    const easy = Math.max(Math.round((ivl + late) * ease * 1.3), good + 1);
    if (grade === 2) { days = hard; ease -= 0.15; }
    else if (grade === 3) days = good;
    else { days = easy; ease += 0.15; }
  }
  return { interval: Math.max(1, Math.round(days)), ease: Math.max(1.3, Math.round(ease * 100) / 100) };
}

// how many days after its due day you're seeing this card (0 if it's on time or early)
function daysLate(c) {
  if (!c.due) return 0;
  const [y, m, d] = c.due.split("-").map(Number), [ty, tm, td] = today().split("-").map(Number);
  return Math.max(0, Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 864e5));
}

// ================= typing the answer (Anki-style) =================
// ⚙ "Type the answer" (state.typeAnswer, per course or deck): in Review and Practice a box under the card asks for the
// answer. Check (or Enter) turns the card over and compares your letters with the answer, letter by letter:
// right letters stay plain, wrong or extra ones are red, missing ones green, and accent slips (e for é) yellow.
// You still choose Again / Hard / Good / Easy yourself; the button that fits is lit up (exact = Good, only accents = Hard,
// else Again). Tapping or swiping the card without typing just shows the answer, like before.
let typed = null;   // the check for the card showing: { ok, accentOnly, typedHTML, rightHTML, text }
const typeOn = () => !!state.typeAnswer[(stack || course()).id] && (mode === "daily" || mode === "practice");
// the language of the side you have to type: the course's word, or the English meaning
const answerLang = () => currentDir === "en" ? (stack && stack.custom ? "answer" : course().name) : "English";

// tidy for comparing: one kind of apostrophe, single spaces, no capitals
const tidyTyped = s => String(s || "").normalize("NFC").replace(/[’ʼ`´]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const baseLetter = ch => ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// compare what you typed with the right answer. Returns { ok, accentOnly, typedHTML, rightHTML }.
// It lines the two up the way a spell checker does (the fewest changes), where a letter with the wrong accent costs
// only half, so "ecole" for "école" shows one yellow letter instead of a red one.
function compareTyped(typedText, right) {
  const a = [...tidyTyped(typedText)], b = [...tidyTyped(right)];
  const cost = (x, y) => x === y ? 0 : baseLetter(x) === baseLetter(y) ? .5 : 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i + j));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost(a[i - 1], b[j - 1]));
  // walk back from the end: each step says what happened to one letter
  const ta = [], tb = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + cost(a[i - 1], b[j - 1])) {
      const k = a[i - 1] === b[j - 1] ? "ok" : baseLetter(a[i - 1]) === baseLetter(b[j - 1]) ? "acc" : "bad";
      ta.unshift([a[i - 1], k]); tb.unshift([b[j - 1], k === "bad" ? "miss" : k]); i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { ta.unshift([a[i - 1], "bad"]); i--; }   // a letter too many
    else { tb.unshift([b[j - 1], "miss"]); j--; }                                             // a letter you left out
  }
  const html = list => list.map(([ch, k]) => k === "ok" ? esc(ch) : '<span class="tc-' + k + '">' + esc(ch === " " ? "␣" : ch) + "</span>").join("");
  const ok = a.join("") === b.join("");
  return { ok, accentOnly: !ok && baseLetter(a.join("")) === baseLetter(b.join("")), typedHTML: html(ta), rightHTML: html(tb) };
}

// the answer to compare with. The course's word: exactly. English: any one of its meanings ("to go, to leave" →
// "go" or "leave" both count), without "to", "the", "a" or anything in brackets. The closest meaning is the one shown.
function checkTyped(card, dir, text) {
  if (dir === "en") return compareTyped(text, card.front);
  const plain = s => tidyTyped(s).replace(/\([^)]*\)/g, "").replace(/^(to|the|a|an) /, "").trim();
  const metas = (card.back || "").split(/[,;\/]| or /).map(plain).filter(Boolean);
  const mine = plain(text);
  const tries = [tidyTyped(card.back || ""), ...metas].map(m => ({ m, r: compareTyped(m === tidyTyped(card.back || "") ? tidyTyped(text) : mine, m) }));
  const score = x => x.r.ok ? 0 : x.r.accentOnly ? .5 : 1 + x.r.typedHTML.split("tc-").length;   // fewest marks wins
  return tries.sort((x, y) => score(x) - score(y))[0].r;
}

// turn the card over: if you typed something, check it first (Show answer, a tap, a swipe up, Enter, Check)
function reveal() {
  if (!current || revealed) return;
  const text = $("typein").value;
  typed = typeOn() && text.trim() ? { ...checkTyped(current, currentDir, text), text } : null;
  $("typein").blur();   // the keyboard goes away, so 1–4 and the buttons work
  revealed = true;
  render();
}

// after turning over: what you typed against the answer, and the grade button that fits lit up
function showTyped(on) {
  const box = $("typeres");
  box.hidden = !on || !typed;
  const suggest = !on || !typed ? 0 : typed.ok ? 3 : typed.accentOnly && mode !== "practice" ? 2 : 1;   // (Practice: Got it or Missed)
  GRADES.forEach((g, i) => $(g).classList.toggle("suggest", suggest === i + 1));
  if (box.hidden) return;
  box.innerHTML = typed.ok ? '<b class="tc-yes">✓ Exactly right</b>'
    : '<div><span class="tl">You typed</span> <span class="tw">' + typed.typedHTML + '</span></div>' +
      '<div><span class="tl">Answer</span> <span class="tw">' + typed.rightHTML + '</span></div>' +
      (typed.accentOnly ? '<div class="tn">Only the accents were off</div>' : "");
}
$("typein").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); reveal(); } });
$("typecheck").onclick = reveal;

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
    // 🔁 Practice = free review: nothing is saved, missed cards come back at the end
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
  if (!revealed) { reveal(); return; }
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
