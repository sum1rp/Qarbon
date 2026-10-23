// Qarbon · js/collection.js: the collection: daily packs (new words arrive in a pack you open card by card) and the binder (your cards, by world).
// The script files run in the order index.html lists them, and share one set of variables.
// The cards themselves (worlds, mastery, the silver edge) are in js/cards.js ("collectible cards"); their looks are in css/styles.css.

// ================= packs: what's in them =================
// Today's pack is always 10 cards. Packs you open after it have "Cards per extra pack" cards (⚙, state.newPerDay).
// A pack takes the deck's next cards you haven't seen (in deck order: the most useful words first),
// and shows them easiest first, so the hardest world comes last.
// About 1 daily pack in 10 swaps its last card for a "rare pull": a Level 6 word (a Nebula or a Black Hole).
const DAILY_PACK = 10, RARE_ODDS = 0.1;

// cards a pack can deal: not seen yet, and on a world that's open (built-in words follow the Solar System; your own cards are never locked)
function worldOpen(c) {
  if (!wordWorld) sortWorlds();   // (js/cards.js) which world each built-in word is on
  return !wordWorld.has(wordKey(c)) || WORLDS.indexOf(worldOf(c)) <= state.journey;
}
const unseenCards = () => stackCards().filter(c => active(c) && !inBinder(c) && worldOpen(c));
// cards of this deck that wait on a world you haven't reached yet
const lockedCards = () => stackCards().filter(c => active(c) && !inBinder(c) && !worldOpen(c));
const dailyOpened = () => state.packDate === today();

// the pack you can open now: { daily: true or false, size }, or null when every card of this deck is in your binder
function packReady() {
  const left = unseenCards().length;
  if (!left) return null;
  const daily = !dailyOpened();
  return { daily, size: Math.min(daily ? DAILY_PACK : state.newPerDay, left) };
}

// a rare pull: a Level 6 word you haven't seen. If it isn't one of your cards yet, only that one word is added.
function pullRare() {
  if (stack && stack.id === "level6") return null;   // in Level 6 every card is already rare
  const rows = parseCSV(PACKS.level6), col = rows[0].map(h => h.trim().toLowerCase()).indexOf("front");
  const mine = new Map(state.cards.map(c => [wordKey(c), c]));
  const choices = rows.slice(1).filter(r => {
    const c = mine.get(r[col].trim().toLowerCase());
    return !c || (active(c) && !inBinder(c));
  });
  if (!choices.length) return null;
  const row = choices[Math.floor(Math.random() * choices.length)], word = row[col].trim().toLowerCase();
  if (!mine.has(word)) {   // a tiny CSV with just the header and this row ("quoted", so commas inside are kept)
    const quote = v => '"' + String(v || "").replace(/"/g, '""') + '"';
    importCSV(rows[0].map(quote).join(",") + "\n" + row.map(quote).join(","));
  }
  return state.cards.find(c => wordKey(c) === word);
}

// easiest first: by world (Earth → Black Hole), then by difficulty (the same order the binder numbers them in)
const worldIndex = c => WORLDS.indexOf(worldOf(c));
const easiestFirst = (a, b) => worldIndex(a) - worldIndex(b) ||
  harderThan({ d: difficulty(a.front), w: a.front }, { d: difficulty(b.front), w: b.front });

// ================= drawing cards (big ones in a pack, small ones in the binder) =================
// (esc(), which makes text safe to put in HTML, is in js/music.js)
const pipsHTML = m => [0, 1, 2, 3].map(i => '<i class="' + (i < m ? "on" : "") + '"></i>').join("");

// one card as HTML. size "big" = like the Review card, "mini" = a binder pocket (num = its number in the deck)
function cardHTML(c, m, size, num) {
  const w = worldOf(c), word = '<div class="word">' + esc(c.front) + '</div>';
  const photo = '<img class="photo" alt="" src="' + w.img + '"' + (size === "mini" ? ' loading="lazy"' : '') + '>';
  const inside = size === "mini"
    ? '<div class="art">' + photo + '<div class="foil2"></div><div>' + word + '</div></div>' +
      '<div class="pips"><span>' + pipsHTML(m) + '</span></div><div class="num">' + esc(num || "") + '</div>'
    : '<div class="top"><span class="pill">' + esc(c.part_of_speech || "word") + '</span><span class="topright">' +
        (m ? "" : '<span class="new">New</span>') + '<span class="tier"><img alt="" src="' + w.img + '"><b>' + w.name + '</b></span></span></div>' +
      '<div class="art">' + photo + '<div class="foil2"></div><div>' + word + '</div></div>' +
      '<div class="textbox">' + esc(c.back || "") + '</div>' +
      '<div class="pips"><span>' + pipsHTML(m) + '</span><span class="step">' + MASTERY[m] + '</span></div>';
  return '<div class="qcard' + (size === "mini" ? " qmini" : "") + '" data-type="' + esc(c.part_of_speech || "") + '" data-tier="' + w.id + '" data-m="' + m + '">' +
    '<div class="face"><div class="foil"></div><div class="inner">' + inside + '</div><div class="spark"></div><div class="glare"></div></div></div>';
}
// the back of a card: the silver edge around a dark panel with the logo atom (tier = the world, for its glow)
const cardBackHTML = tier => '<div class="qcard pk-back" data-tier="' + tier + '"><div class="face"><div class="inner">' + atomSVG(3.4) +
  '<div class="brand">Qarbon</div></div><div class="glare"></div></div></div>';

// ================= the pack's look =================
// The pack is the site's own sky (the real stars of the background, js/look.js), a little brighter, with the logo atom,
// thin silver seals top and bottom, and the deck's own worlds behind it:
//   Level 1 = Earth rising, Level 6 = the black hole, the other levels = their easiest world large and their hardest world small,
//   your own decks and "All my cards" = just the sky.
let packSkyURL = "";   // drawn once, the first time a pack opens

// which pictures this deck's pack shows: { bg, big, small } (big/small = worlds from WORLDS in js/cards.js)
function packBackground() {
  if (!stack || stack.custom) return { bg: "sky" };
  if (stack.id === "beginner150") return { bg: "earth" };   // Level 1
  if (stack.id === "level6") return { bg: "hole" };
  const ws = WORLDS.filter(w => stackCards().some(c => worldOf(c) === w));
  return ws.length ? { bg: "pair", big: ws[0], small: ws[ws.length - 1] } : { bg: "sky" };
}

// the stars, the same way drawSky() in js/look.js draws them, at the scale of an iPhone 16 screen, but 1.8× brighter
function packSky(w, h) {
  const c = document.createElement("canvas"), g = c.getContext("2d"), BOOST = 1.8;
  c.width = w * 2; c.height = h * 2; g.setTransform(2, 0, 0, 2, 0, 0);
  const rnd = seeded(20261020);
  g.fillStyle = "#030306"; g.fillRect(0, 0, w, h);
  const rad = Math.PI / 180, ra0 = 192.86 * rad, de0 = 27.13 * rad, sd0 = Math.sin(de0), cd0 = Math.cos(de0);
  const R = Math.hypot(393, 852) / 2 / 1.155, cx = w / 2, cy = h / 2;
  const place = (ra, de) => {
    const cosc = sd0 * Math.sin(de) + cd0 * Math.cos(de) * Math.cos(ra - ra0);
    if (cosc < -.2) return null;
    const k = 2 / (1 + cosc);
    return [cx - k * Math.cos(de) * Math.sin(ra - ra0) * R, cy - k * (cd0 * Math.sin(de) - sd0 * Math.cos(de) * Math.cos(ra - ra0)) * R];
  };
  for (let i = 0; i < w * h / 200; i++) {   // faint background stars
    const { r, a } = starLook(6.4 + 3 * Math.pow(rnd(), .6));
    dot(g, rnd() * w, rnd() * h, r * 1.15, starColor(STAR_TEMPS[Math.floor(rnd() * 8)]), a * BOOST);
  }
  const bytes = atob(STAR_DATA);   // the real stars (js/stars.js)
  for (let i = 0; i < bytes.length; i += 4) {
    const b0 = bytes.charCodeAt(i), b1 = bytes.charCodeAt(i + 1), b2 = bytes.charCodeAt(i + 2), b3 = bytes.charCodeAt(i + 3);
    const ra = ((b0 << 4) | (b1 >> 4)) / 4095 * 360, de = (((b1 & 15) << 8) | b2) / 4095 * 180 - 90;
    const p = place(ra * rad, de * rad);
    if (!p || p[0] < -10 || p[1] < -10 || p[0] > w + 10 || p[1] > h + 10) continue;
    const mag = (b3 >> 3) * .25 - 1.5, col = starColor(STAR_TEMPS[b3 & 7]), { f, r, a } = starLook(mag);
    if (mag < 4) glow(g, p[0], p[1], r * 7, col, .45 * Math.min(1, f * 2 + .2));
    dot(g, p[0], p[1], r * 1.3, col, a * BOOST);
  }
  return c.toDataURL();
}

function packHTML(name, size, look) {
  if (!packSkyURL) packSkyURL = packSky(300, 420);
  const pic = look.bg === "earth" ? "img/earth.jpg" : look.bg === "hole" ? "img/sgr-a.jpg" : look.bg === "pair" ? look.big.img : "";
  return '<div class="pk-pack" data-bg="' + look.bg + '" role="button" tabindex="0" aria-label="Open the pack">' +
    '<div class="pk-crimp top"></div><div class="pk-tear"></div><div class="pk-cut"></div>' +
    '<div class="pk-body"><img class="pk-sky" alt="" src="' + packSkyURL + '">' +
      (pic ? '<img class="pk-pic" alt="" src="' + pic + '">' : '') +
      (look.bg === "pair" && look.small !== look.big ? '<img class="pk-pic2" alt="" src="' + look.small.img + '">' : '') +
      '<div class="pk-gloss"></div><div class="pk-glow"></div><div class="pk-atom">' + atomSVG(3.4) + '</div>' +
      '<div class="pk-name"' + (name.length > 12 ? ' style="font-size:1.15rem"' : '') + '>' + esc(name) + '</div>' +
      '<div class="pk-sub">' + size + ' cards</div></div>' +
    '<div class="pk-crimp bottom"></div></div>';
}

// ================= opening a pack =================
let pk = null;   // the pack being opened: { cards, i (the card showing, -1 = still sealed), rare, busy }
const pkStill = matchMedia("(prefers-reduced-motion: reduce)").matches;

function openPack() {
  journeyCheck(true);   // a world reached since the last answer opens before the pack is dealt
  const ready = packReady();
  if (!ready) return;
  const cards = unseenCards().slice(0, ready.size);
  let rare = null;
  if (ready.daily && Math.random() < RARE_ODDS) {
    rare = pullRare();
    if (rare) cards[cards.length - 1] = rare;   // the card it replaces stays for your next pack
  }
  // the cards are in your binder from now on, even if you skip the opening
  const t = today();
  cards.forEach(c => { c.got = t; });
  if (rare) rare.pulled = true;
  if (ready.daily) state.packDate = t;
  save();
  cards.sort(easiestFirst);
  if (rare) cards.push(cards.splice(cards.indexOf(rare), 1)[0]);   // the rare always comes last
  pk = { cards, i: -1, rare, busy: false };
  $("pk-done").hidden = true;
  $("pk-stage").hidden = false;
  $("pk-stage").innerHTML = packHTML(stack ? stack.name : "All my cards", cards.length, packBackground());
  $("pk-count").textContent = ready.daily ? "Today's pack" : "Another pack";
  $("pk-hint").textContent = "Slide along the top of the pack to tear it open";
  $("pk-close").textContent = "Skip ✕";
  $("packview").hidden = false;
  document.documentElement.classList.add("packing");
  $("pk-stage").querySelector(".pk-pack").focus({ preventScroll: true });
}

// tap the sealed pack: the top seal flies off, then the first card comes up
function tearPack() {
  if (!pk || pk.busy) return;
  pk.busy = true;
  $("pk-stage").querySelector(".pk-pack").classList.add("open");
  setTimeout(() => { pk.busy = false; showPackCard(0); }, pkStill ? 0 : 850);
}

// card i comes up face up; the last one waits face down, glowing, until you tap it
function showPackCard(i) {
  pk.i = i;
  const c = pk.cards[i], last = i === pk.cards.length - 1, w = worldOf(c);
  $("pk-stage").innerHTML = '<div class="pk-flash"></div><div class="pk-flip pk-in' + (last ? " down charged" : "") + '" role="button" tabindex="0">' +
    cardHTML(c, 0, "big") + cardBackHTML(w.id) + '</div>';
  const flip = $("pk-stage").querySelector(".pk-flip");
  flip.setAttribute("aria-label", last ? "Turn over the last card" : c.front + ": " + (c.back || "") + ". Next card");
  $("pk-count").textContent = (i + 1) + " of " + pk.cards.length;
  if (last) $("pk-hint").textContent = c === pk.rare ? "Something rare is glowing… tap to turn it over" : "The hardest card of the pack. Tap to turn it over";
  else $("pk-hint").textContent = "Swipe it away for the next card";
  flip.focus({ preventScroll: true });
}

// a tap on the stage: tear the pack, turn over the last card, or go to the next card
function packTap() {
  if (!pk || pk.busy) return;
  if (pk.i < 0) { tearPack(); return; }
  const flip = $("pk-stage").querySelector(".pk-flip");
  if (flip.classList.contains("down") && pk.i === pk.cards.length - 1) {   // the last card, still face down
    flip.classList.remove("down", "charged");
    const c = pk.cards[pk.i];
    if (c === pk.rare) {   // a flash in the world's colors and the "Rare pull" badge
      const fl = $("pk-stage").querySelector(".pk-flash");
      fl.style.setProperty("--fl", worldOf(c).id === "hole" ? "#ff8a3d" : "#ff5d8f");
      fl.classList.add("go");
      const badge = document.createElement("div");
      badge.className = "pk-rare";
      badge.textContent = "RARE PULL · " + worldOf(c).name.toUpperCase();
      $("pk-stage").appendChild(badge);
    }
    $("pk-hint").textContent = "Swipe it away to see your pack";
    return;
  }
  nextPackCard(-1);
}

// the card flies off to the side (dir = -1 left, 1 right), then the next one comes up
function nextPackCard(dir) {
  const flip = $("pk-stage").querySelector(".pk-flip");
  pk.busy = true;
  flip.style.transition = "transform .3s ease-in, opacity .3s ease-in";
  flip.style.transform = "translateX(" + dir * 130 + "%) rotate(" + dir * 14 + "deg)";
  flip.style.opacity = "0";
  setTimeout(() => {
    pk.busy = false;
    if (pk.i === pk.cards.length - 1) packDone(); else showPackCard(pk.i + 1);
  }, pkStill ? 0 : 300);
}

// the end: the whole pack as small cards, then study them or open another pack
function packDone() {
  $("pk-stage").hidden = true;
  $("pk-count").textContent = $("pk-hint").textContent = "";
  $("pk-close").textContent = "Close ✕";
  const n = pk.cards.length;
  $("pk-title").textContent = n + " new card" + (n === 1 ? " is" : "s are") + " in your binder" + (pk.rare ? ", one of them rare" : "");
  $("pk-grid").innerHTML = pk.cards.map(c => cardHTML(c, 0, "mini", c === pk.rare ? "★ rare" : "")).join("");
  const more = packReady();
  $("pk-another").hidden = !more;
  if (more) $("pk-another").textContent = "Open another pack (" + more.size + ")";
  $("pk-nudge").textContent = more ? "Extra packs are fine. Each one adds " + more.size + " words to your reviews over the next days, so a few a week is plenty. Their size is “Cards per extra pack” in ⚙."
                                   : "That's every card in this deck. Your binder is full!";
  $("pk-done").hidden = false;
  $("pk-study").focus({ preventScroll: true });
}

// leave the pack: back to Review, with the new cards in it
function closePack() {
  $("packview").hidden = true;
  document.documentElement.classList.remove("packing");
  pk = null;
  if (mode === "daily") setMode("daily"); else render();
}

// a tap or click: next card (the sealed pack opens by sliding, below; Enter on a keyboard opens it too)
$("pk-stage").addEventListener("click", e => {
  if (swiped) { swiped = false; return; }   // that was the end of a swipe, not a tap
  const pack = e.target.closest(".pk-pack");
  if (pack && pk && pk.i < 0 && !pk.busy && !pack.classList.contains("open")) {   // a tap on the sealed pack: show how to open it
    $("pk-hint").textContent = "Slide your finger along the top of the pack to tear it open";
    pack.classList.remove("nudge"); void pack.offsetWidth; pack.classList.add("nudge");
    return;
  }
  if (pk && pk.i >= 0) packTap();
});

// swiping a card away: it follows your finger (with a little tilt) and flies off once it's far enough or flicked
let swipe = null, swiped = false;   // swipe = { x, id, dx, flip, t (time of the last move), v (speed, px per ms) }
$("pk-stage").addEventListener("pointerdown", e => {
  const flip = e.target.closest(".pk-flip");
  if (!pk || pk.i < 0 || pk.busy || !flip || flip.classList.contains("down")) return;
  swipe = { x: e.clientX, id: e.pointerId, dx: 0, flip, t: performance.now(), v: 0 };
  flip.style.transition = "none";
  flip.setPointerCapture(e.pointerId);
});
$("pk-stage").addEventListener("pointermove", e => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x, now = performance.now();
  swipe.v = (dx - swipe.dx) / Math.max(1, now - swipe.t);
  swipe.dx = dx; swipe.t = now;
  swipe.flip.style.transform = "translateX(" + dx + "px) rotate(" + dx / 20 + "deg)";
});
function endSwipe(e) {
  if (!swipe || e.pointerId !== swipe.id) return;
  const { dx, v, flip } = swipe;
  swipe = null;
  if (Math.abs(dx) < 10) { flip.style.transition = flip.style.transform = ""; return; }   // a tap: the click handles it
  swiped = true;
  const flick = Math.abs(v) > .6 && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 40;
  if (Math.abs(dx) > Math.min(100, flip.offsetWidth * .3) || flick) nextPackCard(Math.sign(dx));
  else { flip.style.transition = "transform .25s ease"; flip.style.transform = ""; }   // not far enough: back to the middle
}
$("pk-stage").addEventListener("pointerup", endSwipe);
$("pk-stage").addEventListener("pointercancel", endSwipe);

// sliding a finger along the top of the sealed pack cuts it open, like a real booster: a glowing cut follows your finger
// along the tear line and the top seal lifts a little. Past 70% of the pack's width (either way) it tears.
// Only the top band counts (the seal and the dashed line, TEAR_ZONE of the pack's height): a slide lower down does nothing.
const TEAR_ZONE = .16;
let cut = null;   // { x: where the slide started, id: which finger, w: the pack's width }
function setCut(pack, f, fromRight) {
  pack.style.setProperty("--cut", f.toFixed(3));
  pack.querySelector(".pk-cut").classList.toggle("right", fromRight);
}
$("pk-stage").addEventListener("pointerdown", e => {
  const pack = e.target.closest(".pk-pack");
  if (!pk || pk.i >= 0 || pk.busy || !pack) return;
  const r = pack.getBoundingClientRect();
  if (e.clientY - r.top > r.height * TEAR_ZONE) return;   // below the top band: a tap there gets the hint (endCut won't see it)
  cut = { x: e.clientX, id: e.pointerId, w: pack.offsetWidth, pack };
  pack.classList.remove("snap");
  pack.setPointerCapture(e.pointerId);   // keep following the finger even past the pack's edge
});
$("pk-stage").addEventListener("pointermove", e => {
  if (!cut || e.pointerId !== cut.id) return;
  const f = Math.min(1, Math.abs(e.clientX - cut.x) / (cut.w * .7));
  setCut(cut.pack, f, e.clientX < cut.x);
  if (f >= 1) { cut = null; tearPack(); }
});
function endCut(e) {
  if (!cut || e.pointerId !== cut.id) return;
  const { pack, x } = cut;
  cut = null;
  pack.classList.add("snap");   // not far enough: the cut slides back
  setCut(pack, 0, false);
}
$("pk-stage").addEventListener("pointerup", endCut);
$("pk-stage").addEventListener("pointercancel", endCut);
$("pk-stage").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); packTap(); } });
// the shine follows your finger over the pack and the cards
$("pk-stage").addEventListener("pointermove", e => {
  const r = $("pk-stage").getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * 100 + "%", y = (e.clientY - r.top) / r.height * 100 + "%";
  $("pk-stage").querySelectorAll(".qcard, .pk-pack").forEach(el => { el.style.setProperty("--mx", x); el.style.setProperty("--my", y); });
});
$("pk-close").onclick = closePack;
$("pk-study").onclick = closePack;
$("pk-another").onclick = openPack;
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("packview").hidden) closePack(); });

// "Today's pack is ready" above the Review card (called by render() in js/cards.js).
// Extra packs only show once you're done with today's cards.
// When this deck's next cards wait on a world you haven't reached, it says so instead (tap = the Solar System).
function packBanner() {
  const b = $("packbanner"), ready = mode === "daily" && packReady();
  const done = !current && !queue.length;
  const locked = mode === "daily" && !ready && done && lockedCards().length;
  b.hidden = !(ready && (ready.daily || done)) && !locked;
  b.dataset.locked = locked ? "1" : "";
  if (b.hidden) return;
  b.classList.toggle("extra", !ready || !ready.daily);
  if (locked) {   // e.g. "🔒 Nebula's cards open when you reach Neptune" · "You're at Earth: 12% of 80% Familiar"
    const next = Math.min(...lockedCards().map(c => WORLDS.indexOf(worldOf(c))));
    const here = WORLDS[state.journey], st = worldStats(state.journey);
    $("pb-title").textContent = "🔒 " + named(WORLDS[next], true) + "'s cards open when you reach " + named(WORLDS[next - 1]);
    $("pb-sub").textContent = "You're at " + named(here) + ": " + Math.round(st.fam / st.total * 100) + "% of 80% Familiar · tap for your Solar System";
    return;
  }
  $("pb-title").textContent = ready.daily ? "Today's pack is ready" : "Open another pack";
  $("pb-sub").textContent = (stack ? stack.name : "All my cards") + " · " + ready.size + " new cards · " + (ready.daily ? "tap to open" : "adds to your reviews");
}
$("packbanner").onclick = () => { if ($("packbanner").dataset.locked) setMode("solar"); else openPack(); };

// what the empty Review card says when you're done (render() in js/cards.js)
function packDoneText() {
  if ($("packbanner").dataset.locked) return "Done for today! Keep reviewing to reach " + named(WORLDS[state.journey]) + ".";
  return packReady().daily ? "Your new words are in today's pack, above." : "Done for today! Open another pack above, or try “Practice”.";
}

// ================= the binder =================
// In Decks mode, Binder shows the deck as collectible cards, grouped by world and numbered (easiest first).
// Cards you haven't collected yet are silhouettes. A card's edge upgrades as you master it (js/cards.js, masteryOf).
let binderOn = true, binderFilter = "all", binderAll = false;   // Decks opens on the binder (setMode in js/cards.js)
const POCKETS = 24;   // pockets shown per world before "Show all"

function showBinder(on) {
  binderOn = on;
  $("tab-list").setAttribute("aria-pressed", String(!on));
  $("tab-binder").setAttribute("aria-pressed", String(on));
  $("decklistview").classList.toggle("binding", on);
  $("binder").hidden = !on;
  binderFilter = "all"; binderAll = false;
  if (on && mode === "deck") renderBinder();
}
$("tab-list").onclick = () => showBinder(false);
$("tab-binder").onclick = () => showBinder(true);

const num3 = n => "#" + String(n).padStart(3, "0");

function renderBinder() {
  if (!binderOn) return;
  const dir = dirsOf(stack)[0];
  const numbered = stackCards().slice().sort(easiestFirst);
  const numberOf = new Map(numbered.map((c, i) => [c, i + 1]));
  const got = numbered.filter(inBinder);
  const worlds = WORLDS.filter(w => numbered.some(c => worldOf(c) === w));
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const mastered = got.filter(c => masteryOf(c, dir) === 4).length;

  let h = '<div class="bd-head"><div class="bd-big"><b>' + pct(got.length, numbered.length) + '%</b><span>' + got.length + ' of ' + numbered.length +
    ' cards collected · ' + mastered + ' mastered</span></div><div class="bd-bar"><i style="width:' + pct(got.length, numbered.length) + '%"></i></div>';
  worlds.forEach(w => {
    const all = numbered.filter(c => worldOf(c) === w), n = all.filter(inBinder).length;
    h += '<div class="bd-world"><img alt="" src="' + w.img + '"><div><div class="bd-row"><span>' + w.name + '</span><span>' + n + ' / ' + all.length + '</span></div>' +
         '<div class="bd-bar"><i style="width:' + pct(n, all.length) + '%"></i></div></div><span>' + pct(n, all.length) + '%</span></div>';
  });
  h += '</div><div class="bd-filters">' + [["all", "All"], ...worlds.map(w => [w.id, w.name]), ["got", "Collected"]]
    .map(([id, name]) => '<button data-bf="' + id + '" aria-pressed="' + (binderFilter === id) + '">' + esc(name) + '</button>').join("") + '</div>';

  worlds.forEach(w => {
    if (binderFilter !== "all" && binderFilter !== "got" && binderFilter !== w.id) return;
    let list = numbered.filter(c => worldOf(c) === w);
    const first = numberOf.get(list[0]), lastN = numberOf.get(list[list.length - 1]);
    if (binderFilter === "got") list = list.filter(inBinder);
    if (!list.length) return;
    const cut = binderAll || binderFilter !== "all" ? list : list.slice(0, POCKETS);
    h += '<div class="bd-sec"><h3><img alt="" src="' + w.img + '">' + w.name + ' <span>· cards ' + num3(first) + '–' + num3(lastN) + '</span></h3><div class="bd-pockets">' +
      cut.map(c => inBinder(c)
        ? '<button data-card="' + numberOf.get(c) + '" aria-label="' + esc(c.front) + ', ' + MASTERY[masteryOf(c, dir)] + '">' + cardHTML(c, masteryOf(c, dir), "mini", num3(numberOf.get(c))) + '</button>'
        : '<div class="bd-silo" aria-label="Card ' + numberOf.get(c) + ', not collected yet"><img alt="" src="' + w.img + '" loading="lazy">' + num3(numberOf.get(c)) + '</div>').join("") +
      '</div>' + (cut.length < list.length ? '<button class="bd-more">Show all ' + list.length + '</button>' : '') + '</div>';
  });

  // rares you pulled from packs that belong to another deck (they're also in their own deck's binder)
  const rares = state.cards.filter(c => c.pulled && !numberOf.has(c));
  if (rares.length) {
    h += '<div class="bd-sec"><h3><img alt="" src="img/sgr-a.jpg">Rare pulls <span>· from harder decks, pulled from a pack</span></h3><div class="bd-pockets">' +
      rares.map((c, i) => '<button data-rare="' + i + '" aria-label="' + esc(c.front) + ', rare pull">' + cardHTML(c, masteryOf(c, dir), "mini", "rare") + '</button>').join("") + '</div></div>';
  }
  if (!got.length) h += '<p class="bd-note">Your binder fills up as you open packs: go to Review and open today\'s pack.</p>';
  $("binder").innerHTML = h;

  $("binder").querySelectorAll("[data-bf]").forEach(b => { b.onclick = () => { binderFilter = b.dataset.bf; renderBinder(); }; });
  const more = $("binder").querySelector(".bd-more");
  if (more) more.onclick = () => { binderAll = true; renderBinder(); };
  $("binder").querySelectorAll(".bd-pockets > button").forEach(b => {
    b.onclick = () => {
      const c = b.dataset.rare ? rares[b.dataset.rare] : numbered[b.dataset.card - 1];
      $("bd-zoom").innerHTML = cardHTML(c, masteryOf(c, dir), "big");
      $("bd-zoom").hidden = false;
    };
  });
}
// the big card closes with a tap anywhere, or Esc
$("bd-zoom").onclick = () => { $("bd-zoom").hidden = true; };
document.addEventListener("keydown", e => { if (e.key === "Escape") $("bd-zoom").hidden = true; });

// ================= the Solar System: your trip from Earth to the Black Hole =================
// The 12 worlds in a row, two per built-in deck (Level 1 = Earth and the Moon … Level 6 = a Nebula and the Black Hole).
// The cards are the only source of truth: a world is reached when 80% of its built-in cards are Familiar or better
// (their review wait has grown to several days, see masteryOf in js/cards.js). Reaching a world opens the next one to your packs.
// state.journey = the furthest open world (it stays open, even if you forget some cards later).
const REACH = .8;
// a world's name in a sentence: "the Moon", "the Sun", "the Nebula", "the Black Hole", but "Earth", "Mars" (cap = at the start of a sentence)
const named = (w, cap) => ["moon", "sun", "nebula", "hole"].includes(w.id) ? (cap ? "The " : "the ") + w.name : w.name;
const SOLAR_SIZES = [86, 56, 78, 66, 58, 104, 110, 80, 80, 112, 96, 96];   // each world's size on the map, roughly true to life
const bestStep = c => Math.max(masteryOf(c, "fr"), c.rev ? masteryOf(c, "en") : 0);   // its best direction

// how far along a world is: { total, got (in your binder), fam (Familiar or better), mas (Mastered) }
function worldStats(i) {
  if (!worldWords) sortWorlds();
  const mine = new Map(state.cards.map(c => [wordKey(c), c]));
  const st = { total: worldWords[i].length, got: 0, fam: 0, mas: 0 };
  worldWords[i].forEach(w => {
    const c = mine.get(w);
    if (!c || !inBinder(c)) return;
    st.got++;
    const m = bestStep(c);
    if (m >= 2) st.fam++;
    if (m >= 4) st.mas++;
  });
  return st;
}
const reached = i => { const st = worldStats(i); return st.total > 0 && st.fam >= Math.ceil(st.total * REACH); };

// open the next worlds you've earned. quiet = no message (when the app starts). Returns true if a world opened.
function journeyCheck(quiet) {
  const from = state.journey;
  while (state.journey < WORLDS.length - 1 && reached(state.journey)) state.journey++;
  if (state.journey === from) return false;
  save();
  if (!quiet) {   // "⬆ Earth reached! The Moon is open" for a few seconds above the card
    const el = $("levelup");
    el.textContent = "🪐 " + named(WORLDS[state.journey - 1], true) + " reached! " + named(WORLDS[state.journey], true) + " is open in your packs";
    el.hidden = false;
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    clearTimeout(noteLevelUp.timer);
    noteLevelUp.timer = setTimeout(() => { el.hidden = true; }, 3200);
  }
  return true;
}
journeyCheck(true);   // cards you studied before the Solar System existed count from the start

let solarPick = -1, solarSkyURL = "";
const CEFR_OF_LEVEL = ["A1", "A1–A2", "A2–B1", "B2", "C1", "C2"];
const deckOfLevel = n => allStacks().find(s => s.id === BUILT_IN[n].id);

function renderSolar() {
  journeyCheck(true);   // so the map and "You are here" always agree with the cards
  const stats = WORLDS.map((w, i) => worldStats(i));
  const isReached = i => stats[i].total > 0 && stats[i].fam >= Math.ceil(stats[i].total * REACH);
  const here = state.journey;
  if (solarPick < 0) solarPick = here;
  const STEP = 150, PAD = 90, H = 300, width = PAD * 2 + STEP * (WORLDS.length - 1);
  const pos = WORLDS.map((w, i) => ({ x: PAD + i * STEP, y: H / 2 + 14 + Math.sin(i * 1.05) * 34 }));
  const strip = $("sol-strip");
  strip.style.width = width + "px";
  if (!solarSkyURL) { solarSkyURL = packSky(width, H); strip.style.backgroundImage = "url(" + solarSkyURL + ")"; }
  // the route: a smooth curve through the worlds, gold up to where you are, dashed beyond
  let d = "M" + pos[0].x + " " + pos[0].y;
  for (let i = 1; i < pos.length; i++) { const a = pos[i - 1], b = pos[i], mx = (a.x + b.x) / 2; d += " C" + mx + " " + a.y + " " + mx + " " + b.y + " " + b.x + " " + b.y; }
  let h = '<svg class="sol-route" viewBox="0 0 ' + width + ' ' + H + '" preserveAspectRatio="none"><defs><clipPath id="sol-done"><rect width="' + pos[here].x + '" height="' + H + '"/></clipPath></defs>' +
    '<path d="' + d + '" class="sol-ahead"/><path d="' + d + '" class="sol-past" clip-path="url(#sol-done)"/></svg>';
  BUILT_IN.forEach((b, n) => {
    const a = pos[n * 2].x, z = pos[n * 2 + 1].x, done = isReached(n * 2) && isReached(n * 2 + 1);
    h += '<div class="sol-lvl' + (done ? " done" : "") + '" style="left:' + (a - 48) + 'px;width:' + (z - a + 96) + 'px">' + esc(b.name) + ' · ' + CEFR_OF_LEVEL[n] + (done ? " ✓" : "") + '</div>';
  });
  WORLDS.forEach((w, i) => {
    const st = stats[i], own = st.total ? st.fam / st.total : 0, circ = 2 * Math.PI * 50, size = SOLAR_SIZES[i];
    const state_ = isReached(i) ? "reached" : i === here ? "current" : i < here ? "open" : "locked";
    h += '<button class="sol-world ' + state_ + (solarPick === i ? " sel" : "") + '" data-i="' + i + '" style="left:' + pos[i].x + 'px;top:' + pos[i].y + 'px" aria-label="' + w.name + ', ' + Math.round(own * 100) + '% Familiar' + (state_ === "locked" ? ", not open yet" : "") + '">' +
      '<span class="sol-orb" style="width:' + size + 'px;height:' + size + 'px">' + (i === here && state_ !== "reached" ? '<span class="sol-here">You are here</span>' : '') +
      '<img alt="" src="' + w.img + '"><svg class="sol-ring" viewBox="0 0 108 108"><circle class="bg" cx="54" cy="54" r="50"/>' +
      '<circle class="got" cx="54" cy="54" r="50" stroke-dasharray="' + (own * circ).toFixed(1) + ' ' + circ.toFixed(1) + '"/></svg>' +
      (state_ === "reached" ? '<span class="sol-badge">✓</span>' : state_ === "locked" ? '<span class="sol-badge lock">🔒</span>' : '') + '</span>' +
      '<span class="sol-nm">' + w.name + '</span><span class="sol-pc">' + Math.round(own * 100) + '%</span></button>';
  });
  strip.innerHTML = h;
  strip.querySelectorAll(".sol-world").forEach(b => { b.onclick = () => { solarPick = Number(b.dataset.i); renderSolar(); }; });
  const done = WORLDS.filter((w, i) => isReached(i)).length;
  $("sol-where").innerHTML = done === WORLDS.length ? "Every world reached. You made it to the Black Hole!"
    : "You're at <b>" + named(WORLDS[here]) + "</b> · Level " + (Math.floor(here / 2) + 1) + " · " + done + " of 12 worlds reached";
  solarPanel(solarPick, stats[solarPick], isReached(solarPick));
  if (!renderSolar.scrolled) {   // the first time: bring your world into view
    renderSolar.scrolled = true;
    const t = $("sol-track");
    requestAnimationFrame(() => { t.scrollLeft = pos[here].x - t.clientWidth / 2; });
  }
}

function solarPanel(i, st, isReached) {
  const w = WORLDS[i], n = Math.floor(i / 2), deck = deckOfLevel(n), here = state.journey;
  const pct = v => Math.round(v * 100) + "%";
  const bar = (v, goal) => '<div class="sol-bar"><i style="width:' + Math.min(100, v * 100) + '%"></i>' + (goal ? '<span class="goal"></span>' : '') + '</div>';
  const need = Math.max(0, Math.ceil(st.total * REACH) - st.fam);
  const note = isReached ? "<b>Reached.</b> " + pct(st.fam / st.total) + " of its cards are Familiar or better." + (i < WORLDS.length - 1 ? " " + named(WORLDS[i + 1], true) + " is open." : "")
    : i === here ? "<b>You are here.</b> Get " + need + " more card" + (need === 1 ? "" : "s") + " to Familiar (80%) to reach " + named(w) + (i < WORLDS.length - 1 ? " and open " + named(WORLDS[i + 1]) : "") + ". Keep opening packs and reviewing."
    : i < here ? "<b>Open.</b> " + need + " more card" + (need === 1 ? "" : "s") + " to Familiar to reach it."
    : "<b>Not open yet.</b> Its cards come in packs once you reach " + named(WORLDS[i - 1]) + ". You can still browse " + deck.name + " in Decks.";
  $("sol-panel").innerHTML =
    '<div class="sol-ph"><img alt="" src="' + w.img + '"><div><b>' + w.name + '</b><span>' + esc(deck.name) + ' · ' + CEFR_OF_LEVEL[n] + ' · ' + st.total + ' cards</span></div></div>' +
    '<div class="sol-stat"><span>Collected</span>' + bar(st.got / st.total) + '<span>' + st.got + '</span></div>' +
    '<div class="sol-stat"><span>Familiar or better</span>' + bar(st.fam / st.total, true) + '<span>' + pct(st.fam / st.total) + '</span></div>' +
    '<div class="sol-stat"><span>Mastered</span>' + bar(st.mas / st.total) + '<span>' + st.mas + '</span></div>' +
    '<p class="sol-note">' + note + '</p>' +
    '<div class="sol-acts"><button id="sol-study">Study ' + esc(deck.name) + '</button><button id="sol-binder">Binder</button>' + (st.got ? '<button id="sol-practice">Practice</button>' : '') + '</div>';
  $("sol-study").onclick = () => chooseStack(deck);
  $("sol-binder").onclick = () => { chooseStack(deck, true); binderFilter = w.id; renderBinder(); };
  if (st.got) $("sol-practice").onclick = () => {
    chooseStack(deck, true);
    startPractice(stackCards().filter(c => active(c) && inBinder(c) && worldOf(c) === w));
  };
}
