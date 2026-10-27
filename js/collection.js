// Qarbon · js/collection.js: the collection: daily packs (new words arrive in a pack you open card by card) and the binder (your cards, by world).
// The script files run in the order index.html lists them, and share one set of variables.
// The cards themselves (worlds, mastery, the silver edge) are in js/cards.js ("collectible cards"); their looks are in css/styles.css.

// ================= packs: what's in them =================
// A pack is always 10 cards: today's pack, then up to 2 extra packs a day (packCount, on the day packDate), then more tomorrow.
// Each course counts its own packs: French in state.packDate / packCount, Spanish in state.courses.spanish (see prog below).
// A pack takes the course's next cards you haven't seen: first what's left on the worlds you passed, then your current
// world (in the course's order inside a world: the most useful words first), and shows them easiest first, so the hardest
// world comes last.
// About 1 daily pack in 10 swaps its last card for a "rare pull": a Level 6 word (a Nebula or a Black Hole).
const PACK_SIZE = 10, PACKS_PER_DAY = 3, RARE_ODDS = 0.1;

// a course's packs today and its place on the map: { journey, packDate, packCount }. French keeps them at the top of
// your save (state.journey …, where they were before Spanish existed); other courses in state.courses (js/data.js).
const prog = (k = course()) => k.id === COURSE_ID ? state : state.courses[k.id];
// the last world a course has words for (French: the Black Hole, 11; Spanish with 3 Levels so far: Jupiter, 5)
const lastWorld = (k = course()) => k.levels.length * 2 - 1;

// cards a pack can deal: built-in words not seen yet. Since build 71 no card is locked (the user's choice): packs still
// deal in trip order (Earth's words first), but never stop at a world you haven't reached. The map stays the same.
// Your own cards are never in packs (they come straight into Review, see isOwn in js/cards.js).
const worldOpen = c => true;
// a world's own unseen cards: a pack you pick on the map (the world's panel, "Open a Venus pack")
const worldUnseen = w => unseenCards().filter(c => worldOf(c) === w);
const unseenCards = () => stackCards().filter(c => active(c) && !inBinder(c) && !isOwn(c) && worldOpen(c))
  .sort((a, b) => worldIndex(a) - worldIndex(b) || wordOrder.get(wordKey(a)) - wordOrder.get(wordKey(b)));
// cards of this deck that wait on a world you haven't reached yet
const lockedCards = () => stackCards().filter(c => active(c) && !inBinder(c) && !worldOpen(c));
const packsOpened = () => prog().packDate === today() ? prog().packCount : 0;   // packs opened today (in the course you're on)
const packsUsedUp = () => packsOpened() >= PACKS_PER_DAY && unseenCards().length > 0;   // cards left, but that's 3 packs today

// the pack you can open now: { daily: true or false, size }, or null when every card of this deck is in your binder
// or you've opened today's 3 packs
function packReady() {
  const left = unseenCards().length;
  if (!left || packsOpened() >= PACKS_PER_DAY) return null;
  return { daily: !packsOpened(), size: Math.min(PACK_SIZE, left) };
}

// a rare pull: a Level 6 word you haven't seen. If it isn't one of your cards yet, only that one word is added.
// (Only French has a Level 6 so far: Spanish packs have no rares yet.)
function pullRare() {
  const k = course();
  if (k.levels.length < 6 || prog().journey >= 10) return null;   // at the Nebula and the Black Hole, every card your packs deal is already rare
  const rows = parseCSV(PACKS[k.levels[5].id]), col = rows[0].map(h => h.trim().toLowerCase()).indexOf("front");
  const mine = new Map(state.cards.map(c => [wordKey(c), c]));
  const choices = rows.slice(1).filter(r => {
    const c = mine.get(langKey(k.lang, r[col]));
    return !c || (active(c) && !inBinder(c));
  });
  if (!choices.length) return null;
  const row = choices[Math.floor(Math.random() * choices.length)], word = langKey(k.lang, row[col]);
  if (!mine.has(word)) {   // a tiny CSV with just the header and this row ("quoted", so commas inside are kept)
    const quote = v => '"' + String(v || "").replace(/"/g, '""') + '"';
    importCSV(rows[0].map(quote).join(",") + "\n" + row.map(quote).join(","), k.lang);
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
  // big cards also get a blurred copy of the photo behind it: the glow (binder pockets skip it, a hundred blurs would be slow)
  const photo = (size === "mini" ? '' : '<img class="photo bloom" alt="" src="' + w.img + '">') +
    '<img class="photo" alt="" src="' + w.img + '"' + (size === "mini" ? ' loading="lazy"' : '') + '>';
  const inside = size === "mini"
    ? '<div class="art">' + photo + '<div class="foil2"></div><div>' + word + '</div></div>' +
      '<div class="pips"><span>' + pipsHTML(m) + '</span></div><div class="num">' + esc(num || "") + '</div>'
    : '<div class="top"><span class="pill">' + esc(c.part_of_speech || "word") + '</span><span class="topright">' +
        (m ? "" : '<span class="new">New</span>') + '<span class="tier"><img alt="" src="' + w.img + '"><b>' + w.name + '</b></span></span></div>' +
      '<div class="art">' + photo + '<div class="foil2"></div><div>' + word + '</div></div>' +
      '<div class="textbox meaning">' + esc(c.back || "") + '</div>' +
      '<div class="pips"><span>' + pipsHTML(m) + '</span><span class="step">' + MASTERY[m] + '</span></div>';
  return '<div class="qcard' + (size === "mini" ? " qmini" : "") + '" data-type="' + esc(c.part_of_speech || "") + '" data-tier="' + w.id + '" data-m="' + m + '">' +
    '<div class="face"><div class="foil"></div><div class="inner">' + inside + '</div><div class="spark"></div></div></div>';
}
// the back of a card: the silver edge around a dark panel with the logo atom (tier = the world, for its glow).
// mini = the binder's small card shape, without the word "Qarbon" (it would sit on the atom at that size)
const cardBackHTML = (tier, mini) => '<div class="qcard' + (mini ? ' qmini' : '') + ' pk-back" data-tier="' + tier + '"><div class="face"><div class="inner">' + atomSVG(3.4) +
  (mini ? '' : '<div class="brand">Qarbon</div>') + '</div></div></div>';

// ================= the pack's look =================
// The pack is the site's own sky (the real stars of the background, js/look.js), a little brighter, with the logo atom,
// thin silver seals top and bottom, and the world you're at on the Solar System behind it, with its name ("The Moon"):
//   Earth = Earth rising, the Black Hole = the black hole, every other world = its photo, large, low in the pack.
//   Your own decks = just the sky.
let packSkyURL = "";   // drawn once (when the app starts, for the cards' space window, see below)
// the big pack pictures have sharper copies (1000–1500 px) in img/pack/, loaded only when a pack opens; others use the card photo
const PACK_PICS = ["earth", "hole", "venus", "mercury", "saturn", "neptune"];
const packPic = id => PACK_PICS.includes(id) ? "img/pack/" + id + ".jpg" : WORLDS.find(w => w.id === id).img;

// which picture the pack shows: { bg, world } (world = where you are, from WORLDS in js/cards.js)
function packBackground(picked) {
  if (stack && stack.custom) return { bg: "sky" };
  const w = picked || WORLDS[prog().journey];   // a world pack (from the map) shows the world you picked
  return { bg: w.id === "earth" || w.id === "hole" ? w.id : "world", world: w };
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
// every card's space window shows this same sky behind its world (--sky, used by .qcard .art in the styles)
packSkyURL = packSky(300, 420);
document.documentElement.style.setProperty("--sky", "url(" + packSkyURL + ")");

// sub = the small line under the name ("Spanish · 10 cards")
function packHTML(name, sub, look) {
  if (!packSkyURL) packSkyURL = packSky(300, 420);
  const pic = look.world ? packPic(look.world.id) : "";
  return '<div class="pk-pack" data-bg="' + look.bg + '" data-world="' + (look.world ? look.world.id : "") + '" role="button" tabindex="0" aria-label="Open the pack">' +
    '<div class="pk-crimp top"></div><div class="pk-tear"></div><div class="pk-leak"></div><div class="pk-cut"></div><div class="pk-burst"></div>' +
    '<div class="pk-body"><img class="pk-sky" alt="" src="' + packSkyURL + '">' +
      (pic ? '<img class="pk-pic" alt="" src="' + pic + '">' : '') +
      '<div class="pk-gloss"></div><div class="pk-glow"></div><div class="pk-atom">' + atomSVG(3.4) + '</div>' +
      '<div class="pk-name"' + (name.length > 12 ? ' style="font-size:1.15rem"' : '') + '>' + esc(name) + '</div>' +
      '<div class="pk-sub">' + esc(sub) + '</div></div>' +
    '<div class="pk-crimp bottom"></div></div>';
}

// ================= opening a pack =================
let pk = null;   // the pack being opened: { cards, i (the card showing, -1 = still sealed), rare, busy }
const pkStill = matchMedia("(prefers-reduced-motion: reduce)").matches;

// world = a world picked on the map (its panel's "Open a Venus pack"): the pack deals only that world's cards.
// Without one, the pack deals in trip order. Either way it's one of today's 3 packs.
function openPack(world) {
  world = WORLDS.includes(world) ? world : null;   // (a button's click passes an event here: only a world counts)
  journeyCheck(true);   // a world reached since the last answer opens before the pack is dealt
  const ready = packReady();
  const from = world ? worldUnseen(world) : unseenCards();
  if (!ready || !from.length) return;
  const cards = from.slice(0, PACK_SIZE);
  let rare = null;
  if (ready.daily && !world && Math.random() < RARE_ODDS) {   // a world pack stays that world's (no rare pull)
    rare = pullRare();
    if (rare) cards[cards.length - 1] = rare;   // the card it replaces stays for your next pack
  }
  // nothing is used yet: Cancel puts the pack back sealed. The cards go into your binder when you tear it (tearPack)
  cards.sort(easiestFirst);
  if (rare) cards.push(cards.splice(cards.indexOf(rare), 1)[0]);   // the rare always comes last
  pk = { cards, i: -1, rare, busy: false, world };
  const look = packBackground(world);   // the course's pack is named after your world ("The Moon"), your own deck's after the deck
  showSealed(packHTML(look.world ? named(look.world, true) : stack.name, (look.world ? course().name + " · " : "") + cards.length + " cards", look),
             (ready.daily ? "Today's pack" : "Another pack") + (world ? " · " + world.name : ""));
}

// a B.A.R. Exam round opens like a pack (js/burn.js): the same tear and swipes, then the cards burn instead of the end grid.
// It isn't one of today's 3 packs (B.A.R. deals its own new cards). level = "Easy", "Medium" or "Hard", on the pack
function openBarPack(cards, level) {
  pk = { cards: [...cards].sort(easiestFirst), i: -1, rare: null, busy: false, world: null, bar: true };
  const look = { bg: "world", world: WORLDS.find(w => w.id === "sun") };   // the Sun: B.A.R.'s world on home (the user's pick)
  showSealed(packHTML("B.A.R. Exam", (stack || course()).name + " · " + cards.length + " cards · " + level, look), "Burn After Reading");
}

// the sealed pack on the full-screen layer, waiting to be torn (count = the small line above it)
function showSealed(html, count) {
  $("pk-done").hidden = true;
  $("pk-stage").hidden = false;
  $("pk-stage").innerHTML = html;
  $("pk-count").textContent = count;
  $("pk-hint").textContent = "Slide along the top of the pack to tear it open";
  $("pk-close").textContent = "Cancel";
  $("pk-close").hidden = false;
  $("packview").hidden = false;
  document.documentElement.classList.add("packing");
  $("pk-stage").querySelector(".pk-pack").focus({ preventScroll: true });
}

// the pack is torn: its cards are in your binder from now on, and it counts as one of today's packs.
// From here you go through to the end (no Cancel; Close comes back on the last screen).
function tearPack() {
  if (!pk || pk.busy) return;
  pk.busy = true;
  const t = today();
  pk.cards.forEach(c => { c.got = c.got || t; });
  if (pk.rare) pk.rare.pulled = true;
  if (!pk.bar) {   // a B.A.R. pack isn't one of today's 3
    prog().packCount = packsOpened() + 1;
    prog().packDate = t;
  }
  save();
  $("pk-close").hidden = true;
  const pack = $("pk-stage").querySelector(".pk-pack");
  pack.classList.add("open");   // the burst of light, the top flies off, the pack drops away (css)
  for (let k = 0; k < 6; k++) sparks(pack, pack.offsetWidth * (.1 + k * .16), pack.offsetHeight * .059, 6, 1.6);   // a spray along the whole cut
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
  else $("pk-hint").textContent = pk.bar ? "Read it well, then swipe it away. There's no going back" : "Swipe it away for the next card";
  if (pk.bar && !last) speak(c.front, cardLang(c));   // B.A.R. reads each word aloud, like the old reading screen
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
    $("pk-hint").textContent = pk.bar ? "Swipe it away, and the cards burn" : "Swipe it away to see your pack";
    if (pk.bar) speak(c.front, cardLang(c));
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
    if (pk.i < pk.cards.length - 1) showPackCard(pk.i + 1);
    else if (pk.bar) {   // B.A.R.: no end grid, the cards go straight to the burn (js/burn.js)
      const cards = pk.cards;
      $("packview").hidden = true;
      document.documentElement.classList.remove("packing");
      pk = null;
      barPackDone(cards);
    } else packDone();
  }, pkStill ? 0 : 300);
}

// the end: the whole pack as small cards, then study them or open another pack
function packDone() {
  $("pk-stage").hidden = true;
  $("pk-count").textContent = $("pk-hint").textContent = "";
  $("pk-close").textContent = "Close ✕";
  $("pk-close").hidden = false;
  const n = pk.cards.length;
  $("pk-title").textContent = n + " new card" + (n === 1 ? " is" : "s are") + " in your binder" + (pk.rare ? ", one of them rare" : "");
  $("pk-grid").innerHTML = pk.cards.map(c => cardHTML(c, 0, "mini", c === pk.rare ? "★ rare" : "")).join("");
  // another pack: from the same world if you picked one on the map (while it has cards left), else in trip order
  const ready = packReady(), sameWorld = pk.world && worldUnseen(pk.world).length;
  const more = ready && { size: sameWorld ? Math.min(PACK_SIZE, sameWorld) : ready.size };
  pk.next = sameWorld ? pk.world : null;
  $("pk-another").hidden = !more;
  if (more) $("pk-another").textContent = "Open another " + (pk.next ? pk.next.name + " " : "") + "pack (" + more.size + ")";
  const left = PACKS_PER_DAY - packsOpened();
  $("pk-nudge").textContent = more ? "Extra packs are fine: " + left + " more today. Each one adds " + more.size + " words to your reviews over the next days."
                            : packsUsedUp() ? "That's " + PACKS_PER_DAY + " packs today. More packs tomorrow!"
                            : "That's every card you can open in this deck for now.";
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
  pack.querySelector(".pk-leak").classList.toggle("right", fromRight);
}

// sparks (build 76, the user: "more like Pokémon TCG, with a glow on the drag"): little bits of light that fly off
// the end of the cut while you slide, and a spray of them when the pack tears. Each is a tiny <i> that flies
// out (--dx, --dy) and fades, then removes itself. Not with Reduce Motion.
let lastSpark = 0;
function sparks(pack, x, y, n, power) {
  if (pkStill) return;
  for (let k = 0; k < n; k++) {
    const s = document.createElement("i"), a = Math.random() * Math.PI * 2, d = (20 + Math.random() * 50) * power;
    s.className = "pk-spark";
    s.style.left = x + "px"; s.style.top = y + "px";
    s.style.setProperty("--dx", Math.cos(a) * d + "px");
    s.style.setProperty("--dy", Math.sin(a) * d * .7 - 10 * power + "px");   // mostly up and out
    s.style.setProperty("--s", (.5 + Math.random() * .9).toFixed(2));
    s.addEventListener("animationend", () => s.remove());
    pack.appendChild(s);
  }
}
// where the cut ends right now (its glowing tip), in the pack's own pixels
function cutTip(pack, f, fromRight) {
  const w = pack.offsetWidth, y = pack.offsetHeight * .059;
  return [fromRight ? w * (1 - f) : w * f, y];
}
$("pk-stage").addEventListener("pointerdown", e => {
  const pack = e.target.closest(".pk-pack");
  if (!pk || pk.i >= 0 || pk.busy || !pack) return;
  const r = pack.getBoundingClientRect();
  if (e.clientY - r.top > r.height * TEAR_ZONE) return;   // below the top band: a tap there gets the hint (endCut won't see it)
  cut = { x: e.clientX, id: e.pointerId, w: pack.offsetWidth, pack };
  pack.classList.remove("snap");
  pack.classList.add("cutting");   // the pack glows and trembles while you cut (css)
  pack.setPointerCapture(e.pointerId);   // keep following the finger even past the pack's edge
});
$("pk-stage").addEventListener("pointermove", e => {
  if (!cut || e.pointerId !== cut.id) return;
  const f = Math.min(1, Math.abs(e.clientX - cut.x) / (cut.w * .7)), fromRight = e.clientX < cut.x;
  setCut(cut.pack, f, fromRight);
  const now = performance.now();
  if (f > .02 && now - lastSpark > 35) { lastSpark = now; sparks(cut.pack, ...cutTip(cut.pack, f, fromRight), 3, .8 + f); }
  if (f >= 1) { cut.pack.classList.remove("cutting"); cut = null; tearPack(); }
});
function endCut(e) {
  if (!cut || e.pointerId !== cut.id) return;
  const { pack, x } = cut;
  cut = null;
  pack.classList.remove("cutting");
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
// Study them now: back to Review (from the map: Review with ‹ back to the map, like the map's Review button)
$("pk-study").onclick = () => { const fromMap = mode === "solar"; closePack(); if (fromMap) reviewFromMap(); };
$("pk-another").onclick = () => openPack(pk && pk.next);
// Esc = Cancel (before tearing) or Close (at the end), like the button
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("packview").hidden && !$("pk-close").hidden) closePack(); });

// "Today's pack is ready" above the Review card (called by render() in js/cards.js).
// Extra packs only show once you're done with today's cards.
// When this deck's next cards wait on a world you haven't reached, it says so instead (tap = the Solar System).
function packBanner() {
  $("decklinks").hidden = mode !== "daily";   // Binder and List show in Review only (not in Practice)
  const b = $("packbanner"), ready = mode === "daily" && packReady();
  const done = !current && !queue.length;
  const locked = mode === "daily" && !ready && done && !packsUsedUp() && lockedCards().length;
  b.hidden = !(ready && (ready.daily || done)) && !locked;
  $("packrow").hidden = b.hidden;   // the row only takes room while there's a pack (or a lock) to show
  b.dataset.locked = locked ? "1" : "";
  if (b.hidden) return;
  b.classList.toggle("extra", !ready || !ready.daily);
  if (locked) {   // e.g. "🔒 Venus opens when you reach the Moon" · "You're at Earth: 12% of 80% Familiar"
    const here = WORLDS[prog().journey], st = worldStats(prog().journey);
    $("pb-title").textContent = "🔒 " + lockedLine();
    $("pb-sub").textContent = "You're at " + named(here) + ": " + Math.round(st.fam / st.total * 100) + "% of 80% Familiar · tap for your Solar System";
    return;
  }
  $("pb-title").textContent = ready.daily ? "Today's pack is ready" : "Open another pack";
  $("pb-sub").textContent = ready.size + " new cards · " + (ready.daily ? "tap to open" : "adds to your reviews");   // (the deck's name is in the line above)
}
$("packbanner").onclick = () => { if ($("packbanner").dataset.locked) setMode("solar"); else openPack(); };
// Binder and List beside it: this deck in 🗂 Decks, on that tab (Decks always opens on the binder, so List switches after)
$("rv-binder").onclick = () => { setMode("deck"); scrollTo(0, 0); };
$("rv-list").onclick = () => { setMode("deck"); showBinder(false); scrollTo(0, 0); };

// "Venus opens when you reach the Moon": the first locked world of this deck, and the world you need to reach before it
function lockedLine() {
  const next = Math.min(...lockedCards().map(c => WORLDS.indexOf(worldOf(c))));
  return named(WORLDS[next], true) + " opens when you reach " + named(WORLDS[next - 1]);
}

// what the empty Review card says when you're done (render() in js/cards.js)
function packDoneText() {
  if ($("packbanner").dataset.locked) return "Done for today! " + lockedLine() + ".";
  if (packsUsedUp()) return "Done for today! That's " + PACKS_PER_DAY + " packs: more tomorrow.";
  return packReady().daily ? "Your new words are in today's pack, above." : "Done for today! Open another pack above, or 🔁 Practice a world in the Binder.";
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

// 🔁 Practice one world's cards (of the course you're on): only the ones you've collected (silhouettes aren't yours yet).
// startPractice is in js/cards.js; practice never changes your schedule
const practiceCards = w => cardsOf(course()).filter(c => active(c) && inBinder(c) && !isOwn(c) && worldOf(c) === w);
const practiceButton = (id, n) => n ? '<button class="bd-practice" data-practice="' + id + '" aria-label="Practice these ' + n + ' cards">🔁 Practice</button>' : '';
function practiceWorld(w) { startPractice(practiceCards(w), named(w, true)); }
// the Practice buttons in the binder: a world's id, or "own" for the personal binder
function hookPractice(own) {
  $("binder").querySelectorAll("[data-practice]").forEach(b => {
    b.onclick = () => b.dataset.practice === "own" ? startPractice(own.filter(active), "Personal binder")
      : practiceWorld(WORLDS.find(w => w.id === b.dataset.practice));
  });
}

function renderBinder() {
  if (!binderOn) return;
  const dir = dirsOf(stack)[0];
  // the course's cards (built-in words), numbered easiest first; your own cards go in a personal binder at the end
  const numbered = stackCards().filter(c => !isOwn(c)).sort(easiestFirst);
  const own = stackCards().filter(isOwn);   // in the order you added them
  const numberOf = new Map(numbered.map((c, i) => [c, i + 1]));
  if (!numbered.length) { renderPersonal(own, dir); return; }   // one of your own decks: only the personal binder
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
  h += '</div><div class="bd-filters">' + [["all", "All"], ...worlds.map(w => [w.id, w.name]), ["got", "Collected"], ...(own.length ? [["own", "Personal"]] : [])]
    .map(([id, name]) => '<button data-bf="' + id + '" aria-pressed="' + (binderFilter === id) + '">' + esc(name) + '</button>').join("") + '</div>';

  worlds.forEach(w => {
    if (binderFilter !== "all" && binderFilter !== "got" && binderFilter !== w.id) return;   // (also skips them all for "own")
    let list = numbered.filter(c => worldOf(c) === w);
    const first = numberOf.get(list[0]), lastN = numberOf.get(list[list.length - 1]);
    if (binderFilter === "got") list = list.filter(inBinder);
    if (!list.length) return;
    const cut = binderAll || binderFilter !== "all" ? list : list.slice(0, POCKETS);
    h += '<div class="bd-sec"><h3><img alt="" src="' + w.img + '">' + w.name + ' <span>· cards ' + num3(first) + '–' + num3(lastN) + '</span>' +
      practiceButton(w.id, practiceCards(w).length) + '</h3><div class="bd-pockets">' +
      cut.map(c => inBinder(c)
        ? '<button data-card="' + numberOf.get(c) + '" aria-label="' + esc(c.front) + ', ' + MASTERY[masteryOf(c, dir)] + '">' + cardHTML(c, masteryOf(c, dir), "mini", num3(numberOf.get(c))) + '</button>'
        : '<div class="bd-silo" aria-label="Card ' + numberOf.get(c) + ', not collected yet"><img alt="" src="' + w.img + '" loading="lazy">' + num3(numberOf.get(c)) + '</div>').join("") +
      '</div>' + (cut.length < list.length ? '<button class="bd-more">Show all ' + list.length + '</button>' : '') + '</div>';
  });

  // rares you pulled from packs that belong to another deck (they're also in their own deck's binder), in this course's language
  const rares = state.cards.filter(c => c.pulled && !numberOf.has(c) && cardLang(c) === course().lang);
  if (rares.length) {
    h += '<div class="bd-sec"><h3><img alt="" src="img/sgr-a.jpg">Rare pulls <span>· from harder decks, pulled from a pack</span></h3><div class="bd-pockets">' +
      rares.map((c, i) => '<button data-rare="' + i + '" aria-label="' + esc(c.front) + ', rare pull">' + cardHTML(c, masteryOf(c, dir), "mini", "rare") + '</button>').join("") + '</div></div>';
  }
  if (!got.length) h += '<p class="bd-note">Your binder fills up as you open packs: go to Review and open today\'s pack.</p>';
  if (own.length && (binderFilter === "all" || binderFilter === "own")) h += personalHTML(own, dir);
  $("binder").innerHTML = h;

  $("binder").querySelectorAll("[data-bf]").forEach(b => { b.onclick = () => { binderFilter = b.dataset.bf; renderBinder(); }; });
  hookPractice(own);
  const more = $("binder").querySelector(".bd-more");
  if (more) more.onclick = () => { binderAll = true; renderBinder(); };
  $("binder").querySelectorAll(".bd-pockets > button").forEach(b => {
    b.onclick = () => {
      const c = b.dataset.rare ? rares[b.dataset.rare] : b.dataset.own ? own[b.dataset.own] : numbered[b.dataset.card - 1];
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
// Each course has its own trip (French and Spanish both start at Earth). The map shows the course you're on.
// Spanish has Level 1 to Level 3 so far: its worlds after Jupiter say "Soon".
// The cards are the only source of truth: a world is reached when 80% of its built-in cards are Familiar or better
// (their review wait has grown to several days, see masteryOf in js/cards.js). Reaching a world opens the next one to your packs.
// prog().journey = the furthest open world of the course (it stays open, even if you forget some cards later).
const REACH = .8;
// a world's name in a sentence: "the Moon", "the Sun", "the Nebula", "the Black Hole", but "Earth", "Mars" (cap = at the start of a sentence)
const named = (w, cap) => ["moon", "sun", "nebula", "hole"].includes(w.id) ? (cap ? "The " : "the ") + w.name : w.name;
const SOLAR_SIZES = [86, 56, 78, 66, 58, 104, 110, 80, 80, 112, 96, 96];   // each world's size on the map, roughly true to life
const bestStep = c => Math.max(masteryOf(c, "fr"), c.rev ? masteryOf(c, "en") : 0);   // its best direction

// how far along a world is: { total, got (in your binder), fam (Familiar or better), mas (Mastered) }
// the personal binder: your own cards, every one showing (nothing to collect: they come into Review by themselves)
function personalHTML(own, dir) {
  const started = own.filter(inBinder).length;
  return '<div class="bd-sec bd-personal"><h3><span class="bd-atom">' + atomSVG(6.5) + '</span>Personal binder <span>· your own cards · ' +
    started + ' of ' + own.length + ' in Review so far</span>' + practiceButton("own", own.filter(active).length) + '</h3><div class="bd-pockets">' +
    own.map((c, i) => '<button data-own="' + i + '" aria-label="' + esc(c.front) + ', ' + MASTERY[masteryOf(c, dir)] + '">' +
      cardHTML(c, masteryOf(c, dir), "mini", String(i + 1)) + '</button>').join("") + '</div></div>';
}
// one of your own decks: the binder is only the personal binder, with its own little summary on top
function renderPersonal(own, dir) {
  const mastered = own.filter(c => masteryOf(c, dir) === 4).length, pct = own.length ? Math.round(mastered / own.length * 100) : 0;
  $("binder").innerHTML = '<div class="bd-head"><div class="bd-big"><b>' + own.length + '</b><span>cards · ' + mastered + ' mastered · ' +
    state.newPerDay + ' new a day come into Review</span></div><div class="bd-bar"><i style="width:' + pct + '%"></i></div></div>' +
    (own.length ? personalHTML(own, dir) : '<p class="bd-note">No cards in this deck yet.</p>');
  hookPractice(own);
  $("binder").querySelectorAll(".bd-pockets > button").forEach(b => {
    b.onclick = () => {
      const c = own[b.dataset.own];
      $("bd-zoom").innerHTML = cardHTML(c, masteryOf(c, dir), "big");
      $("bd-zoom").hidden = false;
    };
  });
}

function worldStats(i, k = course()) {
  if (!worldWords) sortWorlds();
  const mine = new Map(state.cards.map(c => [wordKey(c), c]));
  const st = { total: worldWords[k.id][i].length, got: 0, fam: 0, mas: 0 };
  worldWords[k.id][i].forEach(w => {
    const c = mine.get(w);
    if (!c || !inBinder(c)) return;
    st.got++;
    const m = bestStep(c);
    if (m >= 2) st.fam++;
    if (m >= 4) st.mas++;
  });
  return st;
}
const reached = (i, k) => { const st = worldStats(i, k); return st.total > 0 && st.fam >= Math.ceil(st.total * REACH); };

// open the next worlds you've earned on a course (the one you're on). quiet = no message (when the app starts).
// Returns true if a world opened.
function journeyCheck(quiet, k = course()) {
  const p = prog(k), from = p.journey;
  while (p.journey < lastWorld(k) && reached(p.journey, k)) p.journey++;
  if (p.journey === from) return false;
  save();
  if (!quiet) {   // "⬆ Earth reached! The Moon is open" for a few seconds above the card
    const el = $("levelup");
    el.textContent = "🪐 " + named(WORLDS[p.journey - 1], true) + " reached! " + named(WORLDS[p.journey], true) + " is next on your trip";
    el.hidden = false;
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    clearTimeout(noteLevelUp.timer);
    noteLevelUp.timer = setTimeout(() => { el.hidden = true; }, 3200);
  }
  return true;
}
courses().forEach(k => journeyCheck(true, k));   // cards you studied before the Solar System existed count from the start

let solarPick = -1, solarSkyURL = "";

// Review opened from the map: ‹ goes back to the map ("Back to Solar System") instead of home, until you go elsewhere
let mapBack = false;
function setMapBack(on) {
  if (mapBack === on) return;
  mapBack = on;
  backLabel(on ? "Back to Solar System" : "Back to home");   // (js/media.js)
}
function reviewFromMap() { chooseStack(course()); setMapBack(true); }

// French | Spanish above the map: switching shows that course's trip (and makes it the course you're on)
function drawCourseSwitch() {
  const box = $("sol-courses");
  box.innerHTML = courses().map(k => '<button data-course="' + k.id + '" aria-pressed="' + (k.id === course().id) + '">' + esc(k.name) + '</button>').join("");
  box.querySelectorAll("button").forEach(b => { b.onclick = () => {
    const k = courses().find(x => x.id === b.dataset.course);
    if (k.id === course().id) return;
    useStack(k);
    solarPick = -1; renderSolar.scrolled = false;   // the panel and the scroll go to where you are on that trip
    renderSolar();
  }; });
}
const CEFR_OF_LEVEL = ["A1", "A1–A2", "A2–B1", "B2", "C1", "C2"];

function renderSolar() {
  journeyCheck(true);   // so the map and "You are here" always agree with the cards
  drawCourseSwitch();
  const k = course(), last = lastWorld(k);
  const stats = WORLDS.map((w, i) => worldStats(i));
  const isReached = i => stats[i].total > 0 && stats[i].fam >= Math.ceil(stats[i].total * REACH);
  const here = prog().journey;
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
  k.levels.forEach((b, n) => {
    const a = pos[n * 2].x, z = pos[n * 2 + 1].x, done = isReached(n * 2) && isReached(n * 2 + 1);
    h += '<div class="sol-lvl' + (done ? " done" : "") + '" style="left:' + (a - 48) + 'px;width:' + (z - a + 96) + 'px">' + esc(b.name) + ' · ' + CEFR_OF_LEVEL[n] + (done ? " ✓" : "") + '</div>';
  });
  WORLDS.forEach((w, i) => {
    const st = stats[i], own = st.total ? st.fam / st.total : 0, circ = 2 * Math.PI * 50, size = SOLAR_SIZES[i];
    const state_ = i > last ? "soon" : isReached(i) ? "reached" : i === here ? "current" : i < here ? "open" : "locked";
    h += '<button class="sol-world ' + state_ + (solarPick === i ? " sel" : "") + '" data-i="' + i + '" style="left:' + pos[i].x + 'px;top:' + pos[i].y + 'px" aria-label="' + w.name + (state_ === "soon" ? ", coming soon" : ', ' + Math.round(own * 100) + '% Familiar' + (state_ === "locked" ? ", not open yet" : "")) + '">' +
      '<span class="sol-orb" style="width:' + size + 'px;height:' + size + 'px">' + (i === here && state_ !== "reached" ? '<span class="sol-here">You are here</span>' : '') +
      '<img alt="" src="' + w.img + '"><svg class="sol-ring" viewBox="0 0 108 108"><circle class="bg" cx="54" cy="54" r="50"/>' +
      '<circle class="got" cx="54" cy="54" r="50" stroke-dasharray="' + (own * circ).toFixed(1) + ' ' + circ.toFixed(1) + '"/></svg>' +
      (state_ === "reached" ? '<span class="sol-badge">✓</span>' : state_ === "locked" ? '<span class="sol-badge lock">🔒</span>' : '') + '</span>' +
      '<span class="sol-nm">' + w.name + '</span><span class="sol-pc">' + (state_ === "soon" ? "Soon" : Math.round(own * 100) + '%') + '</span></button>';
  });
  strip.innerHTML = h;
  // tap a world for its progress below the map. The world you're at ("You are here") goes straight to Review
  // (its progress already shows when the map opens)
  strip.querySelectorAll(".sol-world").forEach(b => { b.onclick = () => {
    const i = Number(b.dataset.i);
    if (i === here) { solarPick = -1; reviewFromMap(); return; }
    solarPick = i; renderSolar();
  }; });
  const done = WORLDS.filter((w, i) => isReached(i)).length;
  $("sol-where").innerHTML = (done === WORLDS.length ? "Every world reached. You made it to the Black Hole!"
    : done === last + 1 ? "Every world so far reached! Level " + (k.levels.length + 1) + " and beyond are coming soon."
    : "You're at <b>" + named(WORLDS[here]) + "</b> · Level " + (Math.floor(here / 2) + 1) + " · " + done + " of " + (last + 1) + " worlds reached");
  solarPanel(solarPick, stats[solarPick], isReached(solarPick));
  if (!renderSolar.scrolled) {   // the first time: bring your world into view
    renderSolar.scrolled = true;
    const t = $("sol-track");
    requestAnimationFrame(() => { t.scrollLeft = pos[here].x - t.clientWidth / 2; });
  }
}

function solarPanel(i, st, isReached) {
  const k = course(), w = WORLDS[i], n = Math.floor(i / 2), level = "Level " + (n + 1), here = prog().journey;
  if (i > lastWorld(k)) {   // a world this course has no words for yet (Spanish after Jupiter)
    $("sol-panel").innerHTML = '<div class="sol-ph"><img alt="" src="' + w.img + '"><div><b>' + w.name + '</b><span>' + level + ' · ' + CEFR_OF_LEVEL[n] + '</span></div></div>' +
      '<p class="sol-note"><b>Coming soon.</b> ' + k.name + ' ' + level + ' isn\'t written yet. ' + k.name + ' has Level 1 to Level ' + k.levels.length +
      ' so far, Earth to ' + named(WORLDS[lastWorld(k)]) + '.</p>';
    return;
  }
  const pct = v => Math.round(v * 100) + "%";
  const bar = (v, goal) => '<div class="sol-bar"><i style="width:' + Math.min(100, v * 100) + '%"></i>' + (goal ? '<span class="goal"></span>' : '') + '</div>';
  const need = Math.max(0, Math.ceil(st.total * REACH) - st.fam);
  const note = isReached ? "<b>Reached.</b> " + pct(st.fam / st.total) + " of its cards are Familiar or better." + (i < WORLDS.length - 1 ? " " + named(WORLDS[i + 1], true) + " is next." : "")
    : i === here ? "<b>You are here.</b> Get " + need + " more card" + (need === 1 ? "" : "s") + " to Familiar (80%) to reach " + named(w) + ". Keep opening packs and reviewing."
    : i < here ? "<b>Open.</b> " + need + " more card" + (need === 1 ? "" : "s") + " to Familiar to reach it."
    : "<b>Not reached yet.</b> Reach " + named(WORLDS[i - 1]) + " first. You can already open its cards in a pack.";
  $("sol-panel").innerHTML =
    '<div class="sol-ph"><img alt="" src="' + w.img + '"><div><b>' + w.name + '</b><span>' + esc(level) + ' · ' + CEFR_OF_LEVEL[n] + ' · ' + st.total + ' cards</span></div></div>' +
    '<div class="sol-stat"><span>Collected</span>' + bar(st.got / st.total) + '<span>' + st.got + '</span></div>' +
    '<div class="sol-stat"><span>Familiar or better</span>' + bar(st.fam / st.total, true) + '<span>' + pct(st.fam / st.total) + '</span></div>' +
    '<div class="sol-stat"><span>Mastered</span>' + bar(st.mas / st.total) + '<span>' + st.mas + '</span></div>' +
    '<p class="sol-note">' + note + '</p>' +
    '<div class="sol-acts"><button id="sol-study">Review ' + k.name + '</button>' + worldPackButton(w) + '<button id="sol-binder">Binder</button>' + (practiceCards(w).length ? '<button id="sol-practice">🔁 Practice</button>' : '') + '</div>' +
    '<p class="sol-packnote" id="sol-packnote"></p>';
  // every world is part of the course: Review it, or open its binder on this world
  $("sol-study").onclick = reviewFromMap;
  $("sol-binder").onclick = () => { chooseStack(course(), true); binderFilter = w.id; renderBinder(); };
  if ($("sol-practice")) $("sol-practice").onclick = () => { chooseStack(course(), true); practiceWorld(w); };
  if ($("sol-pack")) $("sol-pack").onclick = () => {
    if (stack !== course()) useStack(course());   // the pack deals from the course, even if you were in one of your own decks
    if (!packReady()) { $("sol-packnote").textContent = "That's " + PACKS_PER_DAY + " packs today. More packs tomorrow!"; return; }
    openPack(w);
  };
}

// "Open a Venus pack (10)" in a world's panel: a pack of that world's cards you haven't seen yet (any world, even one
// you haven't reached). It's one of today's 3 packs. Nothing left to deal there = no button.
function worldPackButton(w) {
  const left = cardsOf(course()).filter(c => active(c) && !inBinder(c) && !isOwn(c) && worldOf(c) === w).length;
  if (!left) return "";
  return '<button id="sol-pack" class="sol-packbtn">Open ' + (/^[AEIOU]/.test(w.name) ? "an " : "a ") + w.name + " pack (" + Math.min(PACK_SIZE, left) + ")</button>";
}
