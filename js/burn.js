// Qarbon · js/burn.js: B.A.R. Exam (Burn After Reading).
// The script files run in the order index.html lists them, and share one set of variables.

// ================= Burn After Reading =================
// B.A.R. Exam 2.0 (build 75):
// 0. the start screen: pick a level (Easy / Medium / Hard), see your best score per level and your last 10 rounds
// 1. the round opens like a pack (js/collection.js): tear it, read each card once as you swipe it away (no going back)
// 2. the cards burn up as a meteor  3. the test: 1:30 on the clock, every answer saved for the end
//    Easy = pick the word out of 4 real words · Medium = out of 4 with accent and spelling traps · Hard = type it, accents count
// 4. the results: every answer with the right spelling, the score, and a new best if you beat it
// Right answers count like Good, wrong or unanswered ones like Hard, and missed words go first in your next Review.
const BURN_SIZE = 10, BAR_TIME = 90;   // up to 10 cards a round, 90 seconds for the test
const BAR_LEVEL_INFO = { easy: ["Easy", "4 real words, no tricks"], medium: ["Medium", "accent and spelling traps"], hard: ["Hard", "type it, accents count"] };
let burn = null;   // the current round: { key, level, cards, order, i, answers: [{ c, given }], t0, timer }

const pick = list => list[Math.floor(Math.random() * list.length)];
const stripAccents = w => w.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
const isLetter = ch => /\p{L}/u.test(ch || "");

// accent traps: a wrong accent for each accented letter, or an accent to add where none belongs.
// French has many accents (é è ê à ç …); Spanish has one kind (á é í ó ú) plus ü and ñ, so its traps drop, move or add them.
const WRONG_ACCENT = { "é": ["è", "ê", "e"], "è": ["é", "ê", "e"], "ê": ["é", "è", "e"], "ë": ["é", "e"],
                       "à": ["a", "â"], "â": ["à", "a"], "î": ["i", "ï"], "ï": ["i", "î"], "ô": ["o", "ö"],
                       "ù": ["u", "û"], "û": ["u", "ù"], "ç": ["c"] };
const ADD_ACCENT = { e: ["é", "è", "ê"], a: ["à", "â"], i: ["î"], o: ["ô"], u: ["ù", "û"], c: ["ç"] };
const WRONG_ACCENT_ES = { "á": ["a"], "é": ["e"], "í": ["i"], "ó": ["o"], "ú": ["u", "ü"], "ü": ["u", "ú"], "ñ": ["n"] };
const ADD_ACCENT_ES = { a: ["á"], e: ["é"], i: ["í"], o: ["ó"], u: ["ú"], n: ["ñ"] };
const ES_VOWEL = { a: "á", e: "é", i: "í", o: "ó", u: "ú" };

// "être" → "etre" (all accents dropped) or "ètre" (one accent wrong); "porte" → "pôrte" (accent added).
// Spanish: "canción" → "cancion" (dropped), "cáncion" (moved to another vowel), "año" → "ano"; "mesa" → "mésa" (added)
function accentTrap(word, lang) {
  const es = lang === "es", wrong = es ? WRONG_ACCENT_ES : WRONG_ACCENT, add = es ? ADD_ACCENT_ES : ADD_ACCENT;
  const chars = [...word];
  const accented = chars.map((ch, i) => wrong[ch] ? i : -1).filter(i => i >= 0);
  if (accented.length) {
    if (Math.random() < .5) return stripAccents(word);
    const i = pick(accented);
    const base = stripAccents(chars[i]);
    const others = chars.map((ch, j) => j !== i && ES_VOWEL[ch] ? j : -1).filter(j => j >= 0);
    if (es && ES_VOWEL[base] && others.length && Math.random() < .5) {   // the accent moves to another vowel
      const j = pick(others);
      chars[i] = base; chars[j] = ES_VOWEL[chars[j]];
    } else chars[i] = pick(wrong[chars[i]]);
    return chars.join("");
  }
  const plain = chars.map((ch, i) => add[ch] ? i : -1).filter(i => i >= 0);
  if (!plain.length) return null;   // nothing to put an accent on
  const i = pick(plain);
  chars[i] = pick(add[chars[i]]);
  return chars.join("");
}

// Spanish spelling traps: the letters that sound alike. b ↔ v, ll ↔ y, z/c ↔ s, g ↔ j before e and i,
// a silent h dropped or added, rr ↔ r, qu → k. "vivir" → "bivir", "llave" → "yave", "hacer" → "acer"
const ES_SOUNDS = [
  [/b/g, "v"], [/v/g, "b"], [/ll/g, "y"], [/y(?=[aeiouáéíóú])/g, "ll"], [/z/g, "s"], [/c(?=[eéií])/g, "s"],
  [/s(?=[aou])/g, "z"], [/g(?=[eéií])/g, "j"], [/j(?=[eéií])/g, "g"], [/(^|\s)h/g, "$1"], [/(^|\s)(?=[aeiou])/g, "$1h"],
  [/rr/g, "r"], [/([aeiouáéíóú])r(?=[aeiouáéíóú])/g, "$1rr"], [/qu(?=[eéií])/g, "k"]
];
function soundTrap(word) {
  const art = (word.match(/^(el|la|los|las|un|una) /i) || [""])[0];   // the article stays as it is: "el agua" → "el hagua"
  const w = word.slice(art.length);
  // (fresh copies of each pattern: a /g pattern remembers where it stopped last time)
  const fits = ES_SOUNDS.filter(([re]) => new RegExp(re.source).test(w));
  if (!fits.length) return null;
  const [re, to] = pick(fits);
  const m = pick([...w.matchAll(new RegExp(re.source, "g"))]);   // change just one of the places it fits: the first match from there on
  return art + w.slice(0, m.index) + w.slice(m.index).replace(new RegExp(re.source), to);
}

// "être" → "têre" (two letters swapped), "êttre" (a letter doubled) or "êre" (a letter dropped)
function spellingTrap(word) {
  const chars = [...word];
  const letters = chars.map((ch, i) => isLetter(ch) ? i : -1).filter(i => i >= 0);
  if (!letters.length) return null;
  const i = pick(letters), how = pick(["swap", "double", "drop"]);
  if (how === "swap" && isLetter(chars[i + 1])) [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
  else if (how === "drop" && letters.length > 2) chars.splice(i, 1);
  else chars.splice(i, 0, chars[i]);   // double it
  return chars.join("");
}

// the 4 answers for one card. Medium: correct, accent trap, spelling trap, another real word. Easy: correct + 3 other real words.
// All different. The real words come from cards in the same language (Spanish cards get Spanish words).
function burnOptions(card, level) {
  const right = card.front, options = [right], lang = cardLang(card);
  const sameLang = state.cards.filter(c => cardLang(c) === lang);
  const realWords = new Set(state.cards.map(c => c.front));   // traps are never real words, in any language ("tú" → "tu" is a French card)
  // try a maker a few times until it gives something new (traps can come out the same as the answer).
  // Traps must not be real words either: dropping a letter from "avoir" gives "voir", which isn't a mistake.
  const add = (make, real) => {
    for (let t = 0; t < 30; t++) {
      const o = make();
      if (o && !options.includes(o) && (real || !realWords.has(o))) { options.push(o); return true; }
    }
    return false;
  };
  // a real word from your deck, of the same type (noun, verb...) if there is one
  const sameType = sameLang.filter(c => c.part_of_speech === card.part_of_speech && c.front !== right).map(c => c.front);
  const anyWord = sameLang.filter(c => c.front !== right).map(c => c.front);
  const realWord = () => add(() => pick(sameType.length ? sameType : anyWord), true) || add(() => pick(anyWord), true);
  if (level === "easy") {   // no tricks: three other real words
    for (let k = 0; k < 3; k++) realWord();
    while (options.length < 4 && add(() => spellingTrap(right))) {}   // (a deck with fewer than 4 words: a spelling trap fills in)
    return shuffle(options);
  }
  // a spelling trap must change the letters themselves ("l'ideé" only moves the accent, so it doesn't count)
  // (Spanish: half the time a letter that sounds the same, like b for v)
  const letterTrap = () => {
    const o = lang === "es" && Math.random() < .6 ? soundTrap(right) || spellingTrap(right) : spellingTrap(right);
    return o && stripAccents(o) !== stripAccents(right) ? o : null;
  };
  if (!add(() => accentTrap(right, lang))) add(letterTrap);   // no accent possible? another spelling trap
  add(letterTrap);
  realWord();
  while (options.length < 4 && add(() => spellingTrap(right))) {}   // safety net: always 4 options
  while (options.length < 4 && add(() => pick(anyWord), true)) {}   // (a one-letter word like "y" has only one spelling trap)
  return shuffle(options);
}

// show one of the B.A.R. panels and hide the rest
function burnShow(panel) {
  ["burn-start", "burn-fire", "burn-test", "burn-end"].forEach(p => { $(p).hidden = p !== panel; });
  scrollTo(0, 0);
}

// scores belong to the course or deck you're in (state.bar, js/data.js: best per level + the last 10 rounds, synced)
const barKey = () => (stack || course()).id;
const barScores = () => state.bar[barKey()] || { best: {}, last: [] };
const mmss = secs => Math.floor(secs / 60) + ":" + String(Math.floor(secs % 60)).padStart(2, "0");
const roundText = r => r.right + "/" + r.total + " · " + mmss(r.secs);
// the cards a round can use: new ones from your binder, or ones a pack could deal
const burnFresh = () => stackCards().filter(c => active(c) && c.reviews === 0 && (inBinder(c) || worldOpen(c))).slice(0, BURN_SIZE);

// the B.A.R. Exam mode: the start screen
function startBurn() {
  mode = "burn";
  $("msg").textContent = "";
  barStop();
  render();
  burnStart();
}

// the start screen: the levels (with your best on each), Start, and your last rounds
function burnStart() {
  burnShow("burn-start");
  const sc = barScores();
  $("burn-deck").textContent = (stack || course()).name;
  $("burn-levels").innerHTML = BAR_LEVELS.map(lv => {
    const [name, about] = BAR_LEVEL_INFO[lv], best = sc.best[lv];
    return '<button class="barlevel" data-level="' + lv + '" aria-pressed="' + (state.barLevel === lv) + '">' +
      '<b>' + name + '</b><span>' + about + '</span><em>' + (best ? "Best " + roundText(best) : "No rounds yet") + '</em></button>';
  }).join("");
  $("burn-levels").querySelectorAll(".barlevel").forEach(b => { b.onclick = () => { state.barLevel = b.dataset.level; save(); burnStart(); }; });
  const n = burnFresh().length;
  $("burn-go").disabled = !n;
  $("burn-go").textContent = n ? "Open the pack (" + n + " card" + (n === 1 ? "" : "s") + ")" : "No new cards left";
  $("burn-startnote").textContent = n ? "Read each card once as you swipe it away. Then they burn, and you have " + mmss(BAR_TIME) + "."
                                      : "Every card here has been studied. Open a pack in Review, or pick another deck.";
  $("burn-last").innerHTML = sc.last.length
    ? "<b>Last rounds</b>" + sc.last.map(r => '<div class="row"><span>' + BAR_LEVEL_INFO[r.level][0] + '</span><span>' + roundText(r) + '</span><span>' + esc(r.date) + '</span></div>').join("")
    : "";
}

// Start: the round's cards come in a pack. Tearing it puts them in your binder; the last swipe burns them (barPackDone)
$("burn-go").onclick = () => {
  const cards = burnFresh();
  if (!cards.length) return;
  burn = { key: barKey(), level: state.barLevel, cards, order: [], i: 0, answers: [] };
  openBarPack(cards, BAR_LEVEL_INFO[burn.level][0]);
};

// the pack's last card was swiped away: the round goes on with these cards (the pack sorted them easiest first)
function barPackDone(cards) {
  if (!burn || mode !== "burn") return;
  burn.cards = cards;
  burnFire();
}

// burn phase: play the meteor animation, then shuffle the cards and start the test (and its clock)
function burnFire() {
  const round = burn, meteor = $("meteor");
  burnShow("burn-fire");
  meteor.classList.remove("go"); void meteor.offsetWidth; meteor.classList.add("go");   // restart the animation
  document.documentElement.classList.add("zooming");   // no scrollbars while the meteor flies off-screen
  const wait = matchMedia("(prefers-reduced-motion: reduce)").matches ? 400 : 2200;
  setTimeout(() => {
    document.documentElement.classList.remove("zooming");
    if (burn !== round || mode !== "burn") return;   // you left the round while it was burning
    burn.order = shuffle(burn.cards);
    burn.i = 0;
    burn.t0 = Date.now();
    burn.timer = setInterval(barTick, 250);
    barTick();
    burnQuestion();
  }, wait);
}

// the clock: 1:30 counting down. At 0 the round ends; questions you didn't get to count as missed
function barTick() {
  if (!burn) return;
  if (mode !== "burn") { barStop(); burn = null; return; }   // you left in the middle: the round is dropped
  const left = Math.max(0, BAR_TIME - (Date.now() - burn.t0) / 1000);
  $("burn-timer").textContent = mmss(Math.ceil(left));
  $("burn-timer").classList.toggle("low", left <= 15);
  if (left <= 0) finishRound(true);
}
function barStop() { if (burn && burn.timer) { clearInterval(burn.timer); burn.timer = null; } }

// test phase: the English, then 4 choices (Easy, Medium) or a box to type it in (Hard)
function burnQuestion() {
  const c = burn.order[burn.i], hard = burn.level === "hard", box = $("burn-options");
  burnShow("burn-test");
  const name = isOwn(c) && !c.lang ? "" : courseOf(c).name + " ";
  $("burn-ask").textContent = hard ? "Type the " + name + "word (accents count)" : "Which is the correct " + name + "spelling?";
  $("burn-qcount").textContent = "Question " + (burn.i + 1) + " of " + burn.order.length;
  $("burn-prompt").textContent = c.back || "";
  $("burn-typerow").hidden = !hard;
  box.hidden = hard;
  box.innerHTML = "";
  if (hard) {
    $("burn-type").value = "";
    $("burn-type").focus({ preventScroll: true });
    return;
  }
  burnOptions(c, burn.level).forEach(o => {
    const b = document.createElement("button");
    b.textContent = o;
    b.onclick = () => burnAnswer(o);
    box.appendChild(b);
  });
}

// an answer: kept for the end (no right or wrong yet), and on to the next question
function burnAnswer(given) {
  if (!burn || burn.i >= burn.order.length) return;
  burn.answers.push({ c: burn.order[burn.i], given });
  burn.i++;
  if (burn.i < burn.order.length) burnQuestion(); else finishRound(false);
}
$("burn-typego").onclick = () => burnAnswer($("burn-type").value);
$("burn-type").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); burnAnswer($("burn-type").value); } });

// is an answer right? Choices: the exact spelling. Typed (Hard): the same letters and accents (capitals and spaces don't matter)
const barRight = (c, given, level) => given != null && (level === "hard" ? compareTyped(given, c.front).ok : given === c.front);

// the end of a round (all answered, or the clock ran out): grade every card, keep the score, show the answers
function finishRound(timeUp) {
  barStop();
  const round = burn, secs = Math.min(BAR_TIME, Math.round((Date.now() - round.t0) / 1000));
  const results = round.order.map(c => {
    const a = round.answers.find(x => x.c === c), given = a ? a.given : null, ok = barRight(c, given, round.level);
    applyGrade(c, ok ? 3 : 2);   // right = Good, wrong or not answered = Hard
    if (!ok) c.burnMissed = true;   // first in line next Review
    return { c, given, ok };
  });
  journeyCheck(true);   // a world reached opens the next one (js/collection.js)
  const right = results.filter(r => r.ok).length;
  const r = { id: Date.now(), level: round.level, right, total: results.length, secs, date: today() };
  const sc = state.bar[round.key] || (state.bar[round.key] = { best: {}, last: [] });
  const newBest = betterRound(r, sc.best[r.level]);
  if (newBest) sc.best[r.level] = r;
  sc.last = [r, ...sc.last].slice(0, BAR_KEEP);
  save();
  burnEnd(round, results, r, timeUp, newBest && sc.last.length > 1);
}

// results: the score, a new best, and every answer with the right spelling
function burnEnd(round, results, r, timeUp, newBest) {
  burnShow("burn-end");
  $("burn-score").textContent = r.right + "/" + r.total + " survived the burn";
  $("burn-sub").textContent = BAR_LEVEL_INFO[r.level][0] + " · " + (timeUp ? "time's up" : "done in " + mmss(r.secs)) + (newBest ? " · 🏆 new best!" : "");
  $("burn-missed").innerHTML = results.map(({ c, given, ok }) => {
    let mine;
    if (given == null || given === "") mine = '<span class="none">' + (given == null ? "no time left" : "nothing typed") + '</span>';
    else if (round.level === "hard" && !ok) mine = compareTyped(given, c.front).typedHTML;
    else mine = esc(given);
    return '<div class="row ' + (ok ? "ok" : "bad") + '"><span class="m">' + esc(c.back || "") + '</span>' +
      '<span class="mine">' + (ok ? "✓ " : "✗ ") + mine + '</span>' +
      (ok ? "" : '<span class="w">' + (round.level === "hard" && given ? compareTyped(given, c.front).rightHTML : esc(c.front)) + '</span>') + '</div>';
  }).join("") + (results.some(x => !x.ok) ? '<p class="burnnote">Missed words come first in your next Review.</p>' : "");
}

$("burn-again").onclick = burnStart;
$("burn-back").onclick = () => setMode("arcade");   // B.A.R. lives in the 🕹 Arcade since build 77
