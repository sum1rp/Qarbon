// Qarbon · js/burn.js: B.A.R. Exam (Burn After Reading).
// The script files run in the order index.html lists them, and share one set of variables.

// ================= Burn After Reading =================
// 1. read up to 10 new cards once (no going back)  2. watch them burn up as a meteor
// 3. for each English word, pick the exact French spelling out of 4  4. see how many "survived"
// Right answers count like Good, wrong ones like Hard, and missed words go first in your next Review.
const BURN_SIZE = 10;
let burn = null;   // the current round: { cards, order, i, right, missed }

const pick = list => list[Math.floor(Math.random() * list.length)];
const stripAccents = w => w.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
const isLetter = ch => /\p{L}/u.test(ch || "");

// accent traps: a wrong accent for each accented letter, or an accent to add where none belongs
const WRONG_ACCENT = { "é": ["è", "ê", "e"], "è": ["é", "ê", "e"], "ê": ["é", "è", "e"], "ë": ["é", "e"],
                       "à": ["a", "â"], "â": ["à", "a"], "î": ["i", "ï"], "ï": ["i", "î"], "ô": ["o", "ö"],
                       "ù": ["u", "û"], "û": ["u", "ù"], "ç": ["c"] };
const ADD_ACCENT = { e: ["é", "è", "ê"], a: ["à", "â"], i: ["î"], o: ["ô"], u: ["ù", "û"], c: ["ç"] };

// "être" → "etre" (all accents dropped) or "ètre" (one accent wrong); "porte" → "pôrte" (accent added)
function accentTrap(word) {
  const chars = [...word];
  const accented = chars.map((ch, i) => WRONG_ACCENT[ch] ? i : -1).filter(i => i >= 0);
  if (accented.length) {
    if (Math.random() < .5) return stripAccents(word);
    const i = pick(accented);
    chars[i] = pick(WRONG_ACCENT[chars[i]]);
    return chars.join("");
  }
  const plain = chars.map((ch, i) => ADD_ACCENT[ch] ? i : -1).filter(i => i >= 0);
  if (!plain.length) return null;   // nothing to put an accent on
  const i = pick(plain);
  chars[i] = pick(ADD_ACCENT[chars[i]]);
  return chars.join("");
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

// the 4 answers for one card: correct, accent trap, spelling trap, another real word. All different.
function burnOptions(card) {
  const right = card.front, options = [right];
  const realWords = new Set(state.cards.map(c => c.front));
  // try a maker a few times until it gives something new (traps can come out the same as the answer).
  // Traps must not be real words either: dropping a letter from "avoir" gives "voir", which isn't a mistake.
  const add = (make, real) => {
    for (let t = 0; t < 30; t++) {
      const o = make();
      if (o && !options.includes(o) && (real || !realWords.has(o))) { options.push(o); return true; }
    }
    return false;
  };
  // a spelling trap must change the letters themselves ("l'ideé" only moves the accent, so it doesn't count)
  const letterTrap = () => { const o = spellingTrap(right); return o && stripAccents(o) !== stripAccents(right) ? o : null; };
  if (!add(() => accentTrap(right))) add(letterTrap);   // no accent possible? another spelling trap
  add(letterTrap);
  // a real word from your deck, of the same type (noun, verb...) if there is one
  const sameType = state.cards.filter(c => c.part_of_speech === card.part_of_speech && c.front !== right).map(c => c.front);
  const anyWord = state.cards.filter(c => c.front !== right).map(c => c.front);
  if (!add(() => pick(sameType.length ? sameType : anyWord), true)) add(() => pick(anyWord), true);
  while (options.length < 4 && add(() => spellingTrap(right))) {}   // safety net: always 4 options
  return shuffle(options);
}

// show one of the four Burn panels and hide the rest
function burnShow(panel) {
  ["burn-read", "burn-fire", "burn-test", "burn-end"].forEach(p => { $(p).hidden = p !== panel; });
  scrollTo(0, 0);
}

// the 🔥 Burn tab: pick up to 10 cards you've never studied from this stack and start reading
function startBurn() {
  mode = "burn";
  $("msg").textContent = "";
  // new cards from your binder, or ones a pack could deal (not on a world you haven't reached: js/collection.js)
  const fresh = stackCards().filter(c => active(c) && c.reviews === 0 && (inBinder(c) || worldOpen(c))).slice(0, BURN_SIZE);
  burn = { cards: fresh, order: [], i: 0, right: 0, missed: [] };
  fresh.forEach(c => { c.got = c.got || today(); });   // seen for the first time: they go into your binder (js/collection.js)
  render();
  if (!fresh.length) {   // nothing new left: say so and offer the way back
    burnShow("burn-end");
    $("burn-score").textContent = "No new cards left in this stack.";
    $("burn-missed").textContent = "Pick another stack, or keep going with Review.";
    return;
  }
  $("burn-note").textContent = fresh.length < BURN_SIZE
    ? "Only " + fresh.length + " new card" + (fresh.length === 1 ? "" : "s") + " left in this stack, so this round has " + fresh.length + "."
    : "Read each card carefully. Once they burn, they're gone.";
  burnRead();
}

// read phase: French word, English meaning, and the word read aloud in your chosen voice
function burnRead() {
  const c = burn.cards[burn.i];
  burnShow("burn-read");
  $("burn-count").textContent = "Card " + (burn.i + 1) + " of " + burn.cards.length;
  $("burn-fr").textContent = c.front;
  $("burn-en").textContent = c.back || "";
  $("burn-next").textContent = burn.i + 1 < burn.cards.length ? "Next" : "Burn them";
  speak(c.front);
}

// burn phase: play the meteor animation, then shuffle the cards and start the test
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
    burnQuestion();
  }, wait);
}

// test phase: the English word and 4 French spellings to choose from
function burnQuestion() {
  const c = burn.order[burn.i], box = $("burn-options");
  burnShow("burn-test");
  $("burn-qcount").textContent = "Question " + (burn.i + 1) + " of " + burn.order.length;
  $("burn-prompt").textContent = c.back || "";
  $("burn-feedback").textContent = "";
  box.innerHTML = "";
  burnOptions(c).forEach(o => {
    const b = document.createElement("button");
    b.textContent = o;
    b.onclick = () => burnAnswer(c, o, b);
    box.appendChild(b);
  });
}

// check the answer, color the buttons, save the result, then move on after a moment
function burnAnswer(c, chosen, button) {
  const round = burn, ok = chosen === c.front;   // only the exact spelling, accents included, counts
  [...$("burn-options").children].forEach(b => {
    b.disabled = true;
    if (b.textContent === c.front) b.classList.add("right");
  });
  if (!ok) button.classList.add("wrong");
  $("burn-feedback").textContent = ok ? "Correct! " + c.front : "Not quite. It's spelled: " + c.front;
  applyGrade(c, ok ? 3 : 2);   // right = Good, wrong = Hard
  journeyCheck(true);          // a world reached opens the next one (js/collection.js)
  if (ok) burn.right++;
  else { c.burnMissed = true; burn.missed.push(c); }   // first in line next Review
  save();   // saved after every answer, so a refresh doesn't lose anything
  setTimeout(() => {
    if (burn !== round || mode !== "burn") return;
    burn.i++;
    if (burn.i < burn.order.length) burnQuestion(); else burnEnd();
  }, ok ? 1400 : 2600);   // a little longer when wrong, so you can read the right spelling
}

// results: score, plus every missed word with its correct spelling
function burnEnd() {
  burnShow("burn-end");
  $("burn-score").textContent = burn.right + "/" + burn.order.length + " survived the burn";
  const box = $("burn-missed");
  box.innerHTML = "";
  if (!burn.missed.length) { box.textContent = "Nothing lost to the flames!"; return; }
  box.append("Missed (they'll be first in your next Review):");
  burn.missed.forEach(c => {
    const row = document.createElement("div"); row.className = "row";
    const fr = document.createElement("span"); fr.className = "w"; fr.textContent = c.front;
    const en = document.createElement("span"); en.className = "m"; en.textContent = c.back || "";
    row.append(fr, en);
    box.appendChild(row);
  });
}

$("burn-next").onclick = () => {   // forward only: there's no Back button on purpose
  burn.i++;
  if (burn.i < burn.cards.length) burnRead(); else burnFire();
};
$("burn-hear").onclick = () => speak(burn.cards[burn.i].front);
$("burn-back").onclick = () => setMode("daily");
