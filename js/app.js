// Qarbon · js/app.js: voices, buttons and keyboard, CSV import, screens and navigation, the settings panel.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= audio: a female or a male voice, in the language of the word =================
// lang = "fr" (French) or "es" (Spanish). French has Amélie and Thomas, Spanish Paulina and Juan (VOICES in js/basics.js).
const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hasSpeech = () => "speechSynthesis" in window;
// the device's voices for a language, the right accent first (Mexico's for Spanish, then Spain's and the others)
const voicesFor = lang => !hasSpeech() ? [] : speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith(lang))
  .sort((a, b) => (b.lang.replace("_", "-") === LOCALE[lang]) - (a.lang.replace("_", "-") === LOCALE[lang]));
const voiceLang = lang => VOICES[lang] ? lang : "fr";   // a card with no language (your own cards) is read in French, as before

function findVoice(lang) {
  const want = plain(VOICES[voiceLang(lang)][state.voice] || VOICES[voiceLang(lang)].female);
  return voicesFor(voiceLang(lang)).find(v => plain(v.name).includes(want));
}

// say a word aloud. lang = its language (the course you're on, if not given)
function speak(text, lang) {
  if (!hasSpeech() || !text) return;
  lang = voiceLang(lang || course().lang);
  const clean = text.replace(/\s*\/\s*/g, ", ").replace(/\.\.\./g, " ");
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = LOCALE[lang];
  u.rate = 0.85;   // 1 = normal speed
  const v = findVoice(lang) || voicesFor(lang)[0];
  if (v) u.voice = v;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
const cardLang = c => c.lang || "fr";   // a card's language (French cards have none)

// ⚙ the line beside the voice choice, for the course you're on
function updateVoiceInfo() {
  const el = $("voiceinfo"), k = course(), lang = voiceLang(k.lang);
  if (!hasSpeech()) { el.textContent = "(this browser has no speech support)"; return; }
  const all = voicesFor(lang), v = findVoice(lang);
  if (!all.length) el.textContent = "(no " + k.name + " voices found yet)";
  else if (v) el.textContent = "(using " + v.name + ")";
  else el.textContent = "(" + VOICES[lang][state.voice] + " isn't installed here, using " + all[0].name + ")";
}

function fillVoices() {
  const sel = $("voice"), names = VOICES[voiceLang(course().lang)];
  sel.innerHTML = '<option value="female">Female (' + names.female + ')</option><option value="male">Male (' + names.male + ')</option>';
  sel.value = state.voice;
  updateVoiceInfo();
}

$("voice").onchange = e => {
  state.voice = e.target.value; save();
  updateVoiceInfo();
  if (current) speak(current.front, cardLang(current));   // quick preview
};

document.addEventListener("click", e => {
  const b = e.target.closest(".speak");
  if (!b || !current) return;
  speak(b.dataset.speak === "example" ? current.example_target : current.front, cardLang(current));   // the French or Spanish word, either side
});

// ================= buttons and keyboard =================
$("show").onclick = reveal;
GRADES.forEach((g, i) => { $(g).onclick = () => rate(i + 1); });
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // on the Focus page, Space starts and pauses the timer (unless you're typing in a box)
  if (!$("focus").hidden && e.key === " " && e.target === document.body) { e.preventDefault(); $("fstart").click(); return; }
  if ($("study").hidden || !$("packview").hidden || !cardShowing() || !current || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); reveal(); }
  else if (revealed && /^[1-4]$/.test(e.key)) {
    const grade = Number(e.key);
    if (mode !== "practice" || grade === 1 || grade === 3) rate(grade);   // practice only has Missed (1) and Got it (3)
  }
});

$("perday").value = String(state.newPerDay);   // ⚙ New cards a day (your own decks)
$("perday").onchange = e => { state.newPerDay = Number(e.target.value); save(); refresh(); };

// ================= import a CSV pack =================
// turns CSV text into cards and adds the ones you don't already have.
// lang = "es" for the Spanish course's words (their cards remember it); nothing for French and your own CSV files.
// Returns how it went: { added, dupes, bad }, or { error } if the file can't be used.
function importCSV(text, lang) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { error: "That file is empty or has no card rows." };

  const head = rows[0].map(h => h.trim().toLowerCase());
  if (!head.includes("front") || !head.includes("back"))
    return { error: "The first row must include 'front' and 'back' columns. Found: " + head.join(", ") };

  // words you already have: by their original word and their current spelling, so edited cards aren't added twice
  const have = new Set(state.cards.flatMap(c => [wordKey(c), langKey(c.lang, c.front)]));
  let added = 0, dupes = 0, bad = 0;
  for (const r of rows.slice(1)) {
    const o = {}; head.forEach((h, i) => { if (h) o[h] = (r[i] || "").trim(); });
    if (!o.front || !o.back) { bad++; continue; }
    const key = langKey(lang, o.front);
    if (have.has(key)) { dupes++; continue; }
    Object.assign(o, { interval: 1, due: today(), reviews: 0, correct: 0 });
    if (lang && lang !== "fr") o.lang = lang;
    state.cards.push(o); have.add(key); added++;
  }
  save();
  return { added, dupes, bad };
}

// the words (fronts) in a CSV as keys (lowercased; "es:" in front for Spanish): this is how a deck knows which cards are its own
function frontsOf(text, lang) {
  const rows = parseCSV(text);
  const col = rows.length ? rows[0].map(h => h.trim().toLowerCase()).indexOf("front") : -1;
  if (col < 0) return [];
  return [...new Set(rows.slice(1).map(r => (r[col] || "").trim()).filter(Boolean).map(w => langKey(lang, w)))];
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
  const r = importCSV(text);   // your own decks: plain cards, any subject
  if (r.error) { say(r.error); return; }
  state.decks.push({ id: "deck-" + Date.now(), name, words, added: today() });
  save();
  renderStacks();
  say("Saved “" + name + "” with " + words.length + " cards" +
      (r.dupes ? " (" + r.dupes + (r.dupes === 1 ? " word was" : " words were") + " already in another deck and will share progress)" : "") +
      ". It'll be here whenever you come back.");
});

// ================= screens: home → choose a stack → study =================
// A stack (deck) is a list of words (keys, see wordKey). A card belongs to a stack if its word is on the list,
// so a word in two stacks shares one set of progress.
// The built-in Levels are stored in js/packs.js (PACKS), so they work offline and when index.html is opened straight
// from the Mac. Since build 64 a language's Levels are one deck, a course (below): you don't pick a Level any more,
// the Solar System decides which words your packs deal. The Levels still name the worlds on the map, in the binder and on cards.
// French has Level 1 to Level 6; Spanish (build 69) has Level 1 to Level 3 so far, with the same meanings as French's.
const BUILT_IN = [
  { id: "beginner150", name: "Level 1",      blurb: "The 150 most useful words to start with" },
  { id: "level2",      name: "Level 2",      blurb: "The next 150 useful words" },
  { id: "level3",      name: "Level 3",      blurb: "300 words for everyday life (A2–B1)" },
  { id: "level4",      name: "Level 4",      blurb: "75 upper-intermediate words: news, work, ideas (B2)" },
  { id: "level5",      name: "Level 5",      blurb: "75 advanced words for reading and debate (C1)" },
  { id: "level6",      name: "Level 6",      blurb: "75 rare, literary words: the Nebulas and Black Holes (C2)" }
];
const SPANISH_LEVELS = [
  { id: "es1", name: "Level 1", blurb: "The 150 most useful words to start with" },
  { id: "es2", name: "Level 2", blurb: "The next 150 useful words" },
  { id: "es3", name: "Level 3", blurb: "300 words for everyday life (A2–B1)" }
];
// lang = the language code on its cards ("fr" cards have none, see langKey in js/data.js); native = its name in itself (Translate);
// wiki = its name on Wiktionary
const COURSE_INFO = [
  { id: COURSE_ID, name: "French",  lang: "fr", native: "Français", levels: BUILT_IN,
    blurb: "Level 1 to Level 6 as one trip: your packs follow the Solar System" },
  { id: "spanish", name: "Spanish", lang: "es", native: "Español",  levels: SPANISH_LEVELS,
    blurb: "Mexican Spanish, Level 1 to Level 3 so far, as one trip: your packs follow the Solar System" }
];
let stack = null;   // the stack you're studying (null only before the app opens: then it counts as the course)

// the key a card is known by in decks: its original word (kept in c.key if you respell it), with its language (cardKey in js/data.js)
const wordKey = cardKey;

// the courses as decks: every word of their Levels in one deck (made once; the id, "french" or "spanish", is what's saved)
let courseStacks = null;
function courses() {
  if (!courseStacks) courseStacks = COURSE_INFO.map(k => ({ ...k, course: true,
    texts: k.levels.map(s => PACKS[s.id].trim()),
    words: new Set(k.levels.flatMap(s => frontsOf(PACKS[s.id], k.lang))) }));
  return courseStacks;
}
// the course you're on (the last one you picked, also while you're in one of your own decks)
const course = () => courses().find(k => k.id === state.courseId) || courses()[0];
// the course a card belongs to, by its language (your own cards with no language count as French's)
const courseOf = c => courses().find(k => k.lang === cardLang(c)) || courses()[0];

// the cards of a deck. A course also keeps your own cards in its language that aren't in any of your decks (cards you
// added by hand or from Translate while on it): they're its personal binder.
function cardsOf(s) {
  if (!s.course) return state.cards.filter(c => s.words.has(wordKey(c)));
  const inDecks = new Set(state.decks.flatMap(d => d.words));
  return state.cards.filter(c => s.words.has(wordKey(c)) || (!inDecks.has(wordKey(c)) && cardLang(c) === s.lang));
}
function stackCards() { return cardsOf(stack || course()); }

// every deck you can pick: the courses (French, Spanish), then your own decks
function allStacks() {
  const mine = state.decks.map(d => ({ id: d.id, name: d.name, custom: true, words: new Set(d.words),
                                        blurb: "Your deck" + (d.added ? " · added " + d.added : "") }));
  return [...courses(), ...mine];
}

// ⚙ the voice list, filled now that the courses are known
fillVoices();
if (hasSpeech()) speechSynthesis.onvoiceschanged = updateVoiceInfo;   // voices often load a moment late

// show one screen and hide the others, with a soft fade in
function show(screen) {
  ["home", "study", "howto", "focus", "reading"].forEach(s => { $(s).hidden = s !== screen; });
  if (screen === "home") { setMapBack(false); worldInfo(); resetWorlds(); }
  miniQpod();   // only on the study screen (js/media.js)
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

// opening the app from home starts on the deck you used last (the French course the first time)
function openApp() {
  const all = allStacks();
  chooseStack(all.find(s => s.id === state.stackId) || all[0]);
}

function renderStacks() {
  const box = $("stacklist"), t = today();
  box.innerHTML = "";
  const currentId = (stack || course()).id;
  allStacks().forEach(s => {
    const mine = cardsOf(s);
    const total = Math.max(s.words.size, mine.length);   // (the course's words are added the first time you open it)
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
  $("deckname").textContent = (stack || course()).name;
  $("stackmsg").textContent = "Renamed to “" + name + "”.";
}

// deleting a deck keeps its cards and their progress, it only removes the deck
// (your own words that aren't in another deck then show in their course's personal binder)
function deleteDeck(id) {
  const d = state.decks.find(x => x.id === id);
  if (!confirm("Delete the deck “" + d.name + "”? Its cards keep their progress.")) return;
  state.decks = state.decks.filter(x => x !== d);
  delete state.directions[id];
  if (stack && stack.id === id) { stack = course(); state.stackId = stack.id; }   // you were in it: back to the course
  save();
  if (mode === "deck") renderDeck(); else renderStacks();
  $("stackmsg").textContent = "Deleted the deck “" + d.name + "”. Its cards keep their progress.";
}

// make s the deck you're on (also used by the map's French | Spanish switch, which stays on the map)
function useStack(s) {
  stack = s;
  state.stackId = s.id;   // remembered, so the app opens this deck next time
  if (s.course && state.courseId !== s.id) { state.courseId = s.id; fillVoices(); }   // the map, packs, Translate and the voice follow it
  save();
  // a course: add any of its words you don't have yet. They're only silhouettes in your binder until a pack deals them.
  if (s.course) s.texts.forEach(t => importCSV(t, s.lang));
}

// switch to a deck. stay = true when you picked it in the Decks tab (you stay there); otherwise Review opens
function chooseStack(s, stay) {
  useStack(s);
  $("msg").textContent = "";
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
  if (open) {   // the direction list belongs to the stack you're in (in the course's language), the voices to the course
    setOptions($("direction"), Object.keys(DIRECTIONS).map(d => [d, dirLabel(d, course().name)]), state.directions[(stack || course()).id] || "fr");
    fillVoices();
    typeBtnText();
  }
  if (cardShowing()) fitCard();   // the panel pushes the card down
}
// the cards' shine can follow the phone's tilt: only offered on phones and tablets (a Mac has no tilt)
const tiltBtnText = () => { $("tiltbtn").textContent = "Card shine follows tilt: " + (state.cardTilt ? "on" : "off"); };
$("tiltbtn").hidden = !window.DeviceOrientationEvent || !matchMedia("(pointer: coarse)").matches;
tiltBtnText();
$("tiltbtn").onclick = async () => {
  if (state.cardTilt) { state.cardTilt = false; startTilt(false); }
  else if (await askTilt()) state.cardTilt = true;
  else $("msg").textContent = "Tilt wasn't allowed. Dragging a card still moves its shine.";
  save();
  tiltBtnText();
};
// ⚙ Type the answer (this deck): a box under the Review card (js/cards.js). Saved per course or deck, and synced
const typeBtnText = () => { $("typebtn").textContent = "Type the answer (" + (stack || course()).name + "): " + (state.typeAnswer[(stack || course()).id] ? "on" : "off"); };
$("typebtn").onclick = () => {
  const id = (stack || course()).id;
  if (state.typeAnswer[id]) delete state.typeAnswer[id]; else state.typeAnswer[id] = true;
  save();
  typeBtnText();
  if (cardShowing()) render();
};
$("gosettings").onclick = () => toggleSettings($("settings").hidden);
$("setdone").onclick = () => toggleSettings(false);
$("direction").onchange = e => {
  state.directions[(stack || course()).id] = e.target.value;
  save();
  $("msg").textContent = "Cards in " + (stack || course()).name + ": " + dirLabel(e.target.value, course().name) + ".";
  refresh();   // rebuild today's review with the new direction
};

// the small lines under the worlds: where you are on the map, cards due, the deck you're on, books you're reading
function worldInfo() {
  const all = allStacks(), s = all.find(x => x.id === state.stackId) || all[0], t = today();
  const cards = cardsOf(s);
  const due = cards.filter(c => active(c) && dirsOf(s).some(d => { const x = sideOf(c, d); return x.reviews > 0 && x.due <= t; })).length;
  // today's pack, if it's still sealed (js/collection.js)
  const packWaiting = s.course && !packsOpened() && cards.some(c => active(c) && !inBinder(c) && !isOwn(c) && worldOpen(c));
  $("ws-daily").textContent = [due ? due + " due" : "", packWaiting ? "today's pack is ready" : ""].filter(Boolean).join(" · ");
  $("ws-deck").textContent = s.name;
  $("ws-solar").textContent = course().name + " · at " + named(WORLDS[prog().journey]);   // where you are on the trip (js/collection.js)
  // under the Moon: always tonight's Moon ("Waxing gibbous · 73% lit tonight", js/worlds.js), then the books you're reading
  const reading = state.books.filter(b => !isFinished(b)).length;
  $("ws-reading").textContent = moonLine() + (reading ? " · " + reading + (reading === 1 ? " book" : " books") : "");
  showClock();
}

// under the Earth: today's date and the time here, like "Thu, Oct 23 · 2:05 PM" (the globe is lit where the Sun is right now).
// It's updated every few seconds while home is showing.
function showClock() {
  const now = new Date();
  $("ws-time").textContent = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + " · " +
                             now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
setInterval(() => { if (!$("home").hidden && !document.hidden) showClock(); }, 5000);

// ----- the home carousel: one world at a time -----
const slides = [...document.querySelectorAll(".slide")];
let world = 0;          // which slide is showing (0 = the Solar System)
let launching = false;  // true while a world is zooming toward you, so taps and swipes wait

// the dots underneath: one per world. Each dot is a big invisible button (easy to hit) with a small dot drawn in it.
$("worlddots").innerHTML = slides.map(s => `<button aria-label="${s.querySelector(".wname").textContent}"></button>`).join("");
const worldDots = [...$("worlddots").children];
// tap a dot, or slide your finger along the row: the world under your finger shows as you go
let dotDrag = null;   // which finger is sliding along the dots
function dotAt(x) {   // the dot nearest to x (a spot on the screen, left to right)
  const d = worldDots.map(b => { const r = b.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - x); });
  return d.indexOf(Math.min(...d));
}
function goDot(x) { const i = dotAt(x); if (i !== world) goWorld(i, i > world ? 1 : -1); }
$("worlddots").addEventListener("pointerdown", e => {
  pauseTour();
  dotDrag = e.pointerId;
  $("worlddots").setPointerCapture(e.pointerId);   // keep following the finger even past the row's ends
  goDot(e.clientX);
});
$("worlddots").addEventListener("pointermove", e => { if (dotDrag === e.pointerId) goDot(e.clientX); });
const dotUp = e => { if (dotDrag === e.pointerId) { dotDrag = null; pauseTour(); } };
$("worlddots").addEventListener("pointerup", dotUp);
$("worlddots").addEventListener("pointercancel", dotUp);
// on a keyboard, Enter on a dot (keyboard clicks have detail 0; taps are handled above)
worldDots.forEach((d, i) => { d.onclick = e => { if (e.detail === 0) { pauseTour(); goWorld(i, i > world ? 1 : -1); } }; });

// show world i. dir = 1: it slides in from the right (going forward), -1: from the left (going back).
// Going past the last world wraps back to the first, and the other way round.
function goWorld(i, dir) {
  if (launching) return;
  i = (i + slides.length) % slides.length;
  const out = slides[world], inn = slides[i];
  if (out !== inn) {
    out.classList.remove("on");                              // fades out…
    out.style.opacity = "";
    out.style.transition = "";
    out.style.transform = `translateX(${-dir * 40}px) scale(.92)`;   // …drifting away from the new one
    inn.style.transition = "none";                           // put the new one just off to the side, with no animation…
    inn.style.transform = `translateX(${dir * 40}px) scale(.92)`;
    void inn.offsetWidth;                                    // (let the browser place it there first)
    inn.style.transition = "";
    inn.style.transform = "";                                // …then let it fade and slide into the middle
    inn.classList.add("on");
  } else {                                                   // same world: just settle back after a short drag
    out.style.transition = out.style.transform = out.style.opacity = "";
  }
  world = i;
  slides.forEach((s, k) => { s.tabIndex = k === i ? 0 : -1; });   // only the showing world can be reached with Tab
  worldDots.forEach((d, k) => d.setAttribute("aria-current", k === i));
}
$("prevworld").onclick = () => { pauseTour(); goWorld(world - 1, -1); };
$("nextworld").onclick = () => { pauseTour(); goWorld(world + 1, 1); };
// on a computer: ← and → move between worlds while the home screen is showing
document.addEventListener("keydown", e => {
  if ($("home").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  pauseTour();   // any key: you're exploring yourself now
  if (e.key === "ArrowLeft") { e.preventDefault(); goWorld(world - 1, -1); }
  if (e.key === "ArrowRight") { e.preventDefault(); goWorld(world + 1, 1); }
});
if (matchMedia("(hover: hover)").matches) $("homehint").textContent = "‹ › or arrow keys to explore · click to enter";
$("homebuild").textContent = BUILD;   // the version, at the bottom of the home screen

// swiping: the world follows your finger a little, and moves on if you swiped more than 45px.
// A "pointer" is a finger, a mouse or a pen; these events work the same for all of them.
let swipeX = null, swipeDx = 0;
const stage = $("stage");
stage.addEventListener("pointerdown", e => {
  pauseTour();
  if (launching) return;
  swipeX = e.clientX; swipeDx = 0;
  stage.setPointerCapture(e.pointerId);   // keep getting the moves even if the finger leaves the stage
});
stage.addEventListener("pointermove", e => {
  if (swipeX === null) return;
  swipeDx = e.clientX - swipeX;
  const s = slides[world];
  s.style.transition = "none";
  s.style.transform = `translateX(${swipeDx * .6}px)`;
  s.style.opacity = Math.max(.25, 1 - Math.abs(swipeDx) / 260);
});
stage.addEventListener("pointerup", () => {
  if (swipeX === null) return;
  pauseTour();   // the 10 quiet seconds count from when the finger lifts
  swipeX = null;
  if (Math.abs(swipeDx) > 45) goWorld(world + (swipeDx < 0 ? 1 : -1), swipeDx < 0 ? 1 : -1);
  else { goWorld(world, 1); if (Math.abs(swipeDx) < 8) enterWorld(); }   // barely moved: that was a tap
});
// the browser took over the touch (you were scrolling up or down): settle back, and don't count it as a tap
stage.addEventListener("pointercancel", () => { swipeX = null; goWorld(world, 1); });
// Enter or Space on the world (a mouse click or a tap is handled by pointerup above; keyboard clicks have detail 0)
slides.forEach(s => s.addEventListener("click", e => { if (e.detail === 0) enterWorld(); }));

// back on the home screen: always start on the Solar System
function resetWorlds() {
  slides.forEach(s => { s.classList.remove("go"); s.style.transition = s.style.transform = s.style.opacity = ""; });
  goWorld(0, 1);
  startTour();
}

// the tour: the carousel moves on to the next world by itself every 5 seconds. Touching it (a swipe, ‹ ›, a dot, a key)
// pauses the tour, and it moves on again once you've left it alone for 10 seconds. It starts again each time you come
// home, and stays off if your phone is set to Reduce Motion.
const TOUR_STEP = 5000, TOUR_IDLE = 10000;
let tourTimer = 0, tourWait = 0;
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function startTour() {
  stopTour();
  if (calm()) return;
  tourTimer = setInterval(() => {
    if ($("home").hidden) return stopTour();                  // you left home: it starts again when you're back
    if (launching || swipeX !== null || dotDrag !== null || document.hidden) return;   // a world is opening, a finger is down, or the page is hidden
    goWorld(world + 1, 1);
  }, TOUR_STEP);
}
function stopTour() { clearInterval(tourTimer); clearTimeout(tourWait); tourTimer = tourWait = 0; }
// you touched it: wait, then go on touring (the first move comes TOUR_IDLE after your last touch)
function pauseTour() {
  stopTour();
  if (!calm()) tourWait = setTimeout(startTour, TOUR_IDLE - TOUR_STEP);
}

// tap a world: it rushes toward you, then the app opens straight into that mode
function enterWorld() {
  if (launching) return;
  launching = true;
  const s = slides[world];
  $("home").classList.add("launching");
  s.classList.add("go");
  document.documentElement.classList.add("zooming");
  // the Sun's supernova takes a little longer than the usual zoom
  const wait = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : s.dataset.mode === "burn" ? 1500 : 700;
  setTimeout(() => {
    $("home").classList.remove("launching");
    document.documentElement.classList.remove("zooming");
    launching = false;
    openApp();   // opens Review on your last deck…
    const m = s.dataset.mode;   // …then switches to the world you tapped
    if (m === "burn") startBurn();
    else if (m !== "daily") setMode(m);
  }, wait);
}

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
