// Qarbon · js/collection.js: the collection: daily packs (new words arrive in a pack you open card by card) and the binder (your cards, by world).
// The script files run in the order index.html lists them, and share one set of variables.
// The cards themselves (worlds, mastery, the silver edge) are in js/cards.js ("collectible cards"); their looks are in css/styles.css.

// ================= packs: what's in them =================
// Today's pack is always 10 cards. Packs you open after it have "Cards per extra pack" cards (⚙, state.newPerDay).
// A pack takes the deck's next cards you haven't seen (in deck order: the most useful words first),
// and shows them easiest first, so the hardest world comes last.
// About 1 daily pack in 10 swaps its last card for a "rare pull": a Level 6 word (a Nebula or a Black Hole).
const DAILY_PACK = 10, RARE_ODDS = 0.1;

const unseenCards = () => stackCards().filter(c => active(c) && !inBinder(c));
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
    '<div class="pk-crimp top"></div><div class="pk-tear"></div>' +
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
  $("pk-hint").textContent = "Tap the pack to tear it open";
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

// card i comes up face down and turns over by itself; the last one waits, glowing, until you tap it
function showPackCard(i) {
  pk.i = i;
  const c = pk.cards[i], last = i === pk.cards.length - 1, w = worldOf(c);
  $("pk-stage").innerHTML = '<div class="pk-flash"></div><div class="pk-flip down pk-in' + (last ? " charged" : "") + '" role="button" tabindex="0">' +
    cardHTML(c, 0, "big") + cardBackHTML(w.id) + '</div>';
  const flip = $("pk-stage").querySelector(".pk-flip");
  flip.setAttribute("aria-label", last ? "Turn over the last card" : c.front + ": " + (c.back || "") + ". Next card");
  $("pk-count").textContent = (i + 1) + " of " + pk.cards.length;
  if (last) $("pk-hint").textContent = c === pk.rare ? "Something rare is glowing… tap to turn it over" : "The hardest card of the pack. Tap to turn it over";
  else {
    setTimeout(() => flip.classList.remove("down"), pkStill ? 0 : 260);
    $("pk-hint").textContent = "Tap for the next card";
  }
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
    $("pk-hint").textContent = "Tap to see your pack";
    return;
  }
  pk.busy = true;
  flip.classList.add("pk-out");
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

$("pk-stage").addEventListener("click", packTap);
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
function packBanner() {
  const ready = mode === "daily" && packReady();
  const showIt = !!ready && (ready.daily || (!current && !queue.length));
  $("packbanner").hidden = !showIt;
  if (!showIt) return;
  $("packbanner").classList.toggle("extra", !ready.daily);
  $("pb-title").textContent = ready.daily ? "Today's pack is ready" : "Open another pack";
  $("pb-sub").textContent = (stack ? stack.name : "All my cards") + " · " + ready.size + " new cards · " + (ready.daily ? "tap to open" : "adds to your reviews");
}
$("packbanner").onclick = openPack;

// ================= the binder =================
// In Decks mode, Binder shows the deck as collectible cards, grouped by world and numbered (easiest first).
// Cards you haven't collected yet are silhouettes. A card's edge upgrades as you master it (js/cards.js, masteryOf).
let binderOn = false, binderFilter = "all", binderAll = false;
const POCKETS = 24;   // pockets shown per world before "Show all"

function showBinder(on) {
  binderOn = on;
  $("tab-list").setAttribute("aria-pressed", String(!on));
  $("tab-binder").setAttribute("aria-pressed", String(on));
  $("decklistview").classList.toggle("binding", on);
  $("binder").hidden = !on;
  binderFilter = "all"; binderAll = false;
  if (on) renderBinder();
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
