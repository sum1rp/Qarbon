// Qarbon · js/duels.js: ⚔️ Qarbon World Duels (build 77, Arcade B), 8-bit battles against the worlds of your Solar System.
// Loaded the first time you open it (openDuels in js/arcade.js), then it shares the app's variables like every other file.
//
// Each world is a rival, drawn dot by dot as a turning 8-bit sprite; you're the Qarbon atom.
// Your turn: an English word, answer in the course's language: TRANSLATE (pick of 4, 20 damage) or SPELL (type it, 35;
// only an accent slip or a wrong le / la = 15). Their turn: they show a word, pick its English to block, else they hit you.
// Difficulty (free choice): Review = only your binder's cards of that world · Stretch = mostly your binder, a few new ·
// Challenge = mostly new words (new words only ever come as TRANSLATE), better shiny odds.
// A world grows stronger (level, HP, hit) the more of its cards you've collected and mastered.
// New words you meet are just practice: the answer shows when you miss, your binder and schedule aren't touched.
// Win: one card from the duel goes into your binder, and sometimes (1 in 10; Challenge 1 in 5) a card you already own turns
// shiny (c.shiny). The world gets a WON mark (state.duels, synced). Lose: nothing is taken, the words that got you are listed.

// ================= numbers =================
const DL_YOU = 100, DL_TRANSLATE = 20, DL_SPELL = 35, DL_ALMOST = 15;
const DL_SHINY = { review: .1, stretch: .1, challenge: .2 };   // the user's choice: 1 in 10, Challenge 1 in 5
const DL_LEVELS = [["review", "Review", "Only cards in your binder"],
                   ["stretch", "Stretch", "Your binder plus a few new words"],
                   ["challenge", "Challenge", "Mostly new words, better shiny odds"]];
// each world's attack and what it says when the duel starts
const DL_LINES = {
  earth:   ["TECTONIC SHIFT", "Every trip starts with me. Show me you know the basics."],
  moon:    ["TIDAL PULL", "I only come out at night. Will your words hold up in the dark?"],
  venus:   ["ACID CLOUD", "My clouds hide everything. Your answers had better be clear."],
  mars:    ["DUST STORM", "The red planet doesn't go easy. Bring your best spelling."],
  mercury: ["SOLAR FLARE", "I'm closest to the Sun. Things get hot fast around here."],
  jupiter: ["GREAT RED STORM", "I'm the biggest of them all. Let's see how much you can carry."],
  saturn:  ["RING SPIN", "My rings have been turning for ages. Can you keep up?"],
  uranus:  ["SIDEWAYS SPIN", "I roll on my side. Expect the unexpected."],
  neptune: ["DARK WIND", "The fastest winds in the system. Don't get blown away."],
  sun:     ["CORONA BLAST", "Everything you've learned orbits around me. Prove it."],
  nebula:  ["STAR BIRTH", "New stars are born in me. Rare words too."],
  hole:    ["EVENT HORIZON", "Nothing escapes me. Not even the hardest words."]
};

// ================= pixel worlds, generated dot by dot =================
// Each world is a 48 × 48 grid drawn from math: a sphere lit from the top left, a pattern from seeded noise (continents,
// craters, bands), 4 shades per color and a checkered "dither" between shades, the way old consoles faked smooth light.
const DL_S = 48;
const DL_BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
function dlRng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function dlNoise(seed) {
  const r = dlRng(seed), g = Array.from({ length: 16 * 16 }, r);
  const at = (x, y) => g[((y & 15) * 16) + (x & 15)];
  const smooth = t => t * t * (3 - 2 * t);
  const one = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y) => one(x, y) * .65 + one(x * 2.1 + 5, y * 2.1 + 9) * .35;
}
const dlHex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const dlPal = (...h) => h.map(dlHex);   // a 4-shade palette, dark → light

// what each world looks like: pal = its color sets, paint() picks a set for a spot on the sphere
const DL_LOOKS = {
  earth:   { pal: { sea: dlPal("#0b1f6b", "#1c46b8", "#2f7de0", "#7fc4ff"), land: dlPal("#1d4a12", "#2f7a1f", "#58b23a", "#a9e06a"), cloud: dlPal("#8a96b8", "#c8d0e8", "#f0f4ff", "#ffffff") },
             paint: (u, v, n, n2) => n2(u * 3 + 7, v * 3) > .68 ? "cloud" : n(u * 2.2, v * 2.2 + 3) > .52 ? "land" : "sea" },
  moon:    { pal: { a: dlPal("#2e2e38", "#5d5d6c", "#9c9cad", "#dedeea"), b: dlPal("#1f1f28", "#3e3e4c", "#6e6e80", "#a8a8ba") },
             paint: (u, v, n) => n(u * 3, v * 3) > .6 ? "b" : "a", craters: 7 },
  venus:   { pal: { a: dlPal("#6b4a14", "#b8862e", "#e8c06a", "#fff0b8"), b: dlPal("#5a3a10", "#9a6e24", "#cfa250", "#f2dc98") },
             paint: (u, v, n) => Math.sin(v * 9 + n(u * 2, v * 2) * 5) > 0 ? "a" : "b" },
  mars:    { pal: { a: dlPal("#5a1a08", "#a8401a", "#e0703a", "#ffb07a"), b: dlPal("#3a1006", "#6e2a10", "#a04a24", "#d08050"), cap: dlPal("#8a8aa0", "#c8c8dc", "#eef0ff", "#ffffff") },
             paint: (u, v, n) => v < -.82 ? "cap" : n(u * 2.5, v * 2.5) > .58 ? "b" : "a" },
  mercury: { pal: { a: dlPal("#3a2e28", "#6e5c50", "#a8927e", "#e0ccb8"), b: dlPal("#2a201a", "#4e3e34", "#7a6656", "#b09a86") },
             paint: (u, v, n) => n(u * 4, v * 4) > .62 ? "b" : "a", craters: 9 },
  jupiter: { pal: { a: dlPal("#5a3a1c", "#a8743e", "#e0b07a", "#fff0d0"), b: dlPal("#4a2a14", "#8a5530", "#c08458", "#f0c8a0"), c: dlPal("#6a6050", "#b0a48c", "#e8dcc4", "#ffffff"), spot: dlPal("#5a120c", "#a8301e", "#e0603e", "#ff9a7a") },
             paint: (u, v, n) => { const du = ((u % 6.28) + 6.28) % 6.28 - 3.6, dv = v - .3; if (du * du / .12 + dv * dv / .012 < 1) return "spot";
               const s = Math.sin(v * 14 + n(u * 1.5, v * 3) * 2.5); return s > .45 ? "c" : s > -.2 ? "a" : "b"; } },
  saturn:  { pal: { a: dlPal("#5a4a24", "#a8904e", "#e0c888", "#fff4c8"), b: dlPal("#4a3a1c", "#8a7440", "#c0a668", "#ecd8a0"), ring: dlPal("#4a4030", "#8a7a5a", "#c8b48a", "#f0e2c0") },
             paint: (u, v, n) => Math.sin(v * 11 + n(u, v * 2) * 1.5) > .2 ? "a" : "b", ring: true, scale: .62 },
  uranus:  { pal: { a: dlPal("#105a64", "#2aa0ac", "#6ad8e0", "#c8fbff") }, paint: () => "a", ring: "thin", scale: .8 },
  neptune: { pal: { a: dlPal("#0a1660", "#1c38b0", "#3c6ae8", "#90b4ff"), spot: dlPal("#050a30", "#0e1c68", "#1c3098", "#3c58c8"), streak: dlPal("#7080c0", "#b0c0f0", "#e8f0ff", "#ffffff") },
             paint: (u, v, n) => { const du = ((u % 6.28) + 6.28) % 6.28 - 3, dv = v - .2; if (du * du / .1 + dv * dv / .015 < 1) return "spot"; return Math.abs(v + .35) < .04 && n(u * 3, 1) > .5 ? "streak" : "a"; } },
  sun:     { pal: { a: dlPal("#a8200a", "#f06010", "#ffb020", "#fff4a0"), b: dlPal("#801808", "#c04010", "#f08a18", "#ffd860") },
             paint: (u, v, n) => n(u * 5, v * 5) > .55 ? "b" : "a", glow: true },
  nebula:  { cloud: true, pal: { a: dlPal("#2a0a3a", "#6a1a7a", "#c04aa8", "#ff9ad8"), b: dlPal("#0a1a4a", "#1a3a8a", "#3a7ad0", "#9ad0ff") } },
  hole:    { hole: true, pal: { disk: dlPal("#5a1a00", "#c04a00", "#ff9a20", "#fff0a0") } }
};
const dlNoises = {};   // each world's two noise patterns, made once
const dlNoiseOf = id => dlNoises[id] || (dlNoises[id] = [dlNoise(id.length * 977 + id.charCodeAt(0)), dlNoise(id.charCodeAt(1) * 131 + 7)]);

// draw one frame of a world: rot = how far it has turned, shiny = its rare other colors
function dlDrawWorld(cv, id, rot = 0, shiny = false) {
  const L = DL_LOOKS[id], g = cv.getContext("2d"), img = g.createImageData(DL_S, DL_S), d = img.data;
  const [n, n2] = dlNoiseOf(id);
  const c = DL_S / 2, R = DL_S / 2 * (L.scale || .86);
  const craters = Array.from({ length: L.craters || 0 }, (_, i) => { const r = dlRng(i * 91 + 13); return [r() * 6.28, r() * 1.6 - .8, .1 + r() * .18]; });
  const put = (x, y, rgb) => { const i = (y * DL_S + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; };
  const shade = (pal, level, x, y) => pal[Math.max(0, Math.min(3, Math.floor(level * 4 + DL_BAYER[y & 3][x & 3] / 16 - .5)))];
  const tint = rgb => shiny ? [rgb[2], rgb[0], rgb[1]] : rgb;   // shiny = its colors swapped around, like a rare color variant
  for (let y = 0; y < DL_S; y++) for (let x = 0; x < DL_S; x++) {
    const dx = (x + .5 - c) / R, dy = (y + .5 - c) / R, d2 = dx * dx + dy * dy;
    if (L.cloud) {   // the nebula: a glowing cloud, no sphere
      const r = Math.hypot(x + .5 - c, y + .5 - c) / (DL_S / 2), v = n(x / 9 + rot * .3, y / 9) * (1.25 - r) * 1.3;
      if (v > .25) put(x, y, tint(shade(n2(x / 7, y / 7) > .5 ? L.pal.a : L.pal.b, Math.min(.99, v - .2), x, y)));
      continue;
    }
    if (L.hole) {    // the black hole: a dark middle, a tilted glowing ring around it
      const ex = dx, ey = dy * 3.2, ring = Math.hypot(ex, ey), behind = dy < 0, inDisk = ring > .55 && ring < 1.05;
      const disk = () => tint(shade(L.pal.disk, .35 + .6 * (1 - Math.abs(ring - .8) * 3) * (.6 + .4 * Math.sin(Math.atan2(ey, ex) * 3 + rot * 4)), x, y));
      if (inDisk && behind) put(x, y, disk());
      if (d2 < .2) { put(x, y, Math.abs(Math.sqrt(d2) - .43) < .05 ? tint(dlHex("#ffd890")) : [0, 0, 0]); continue; }
      if (inDisk && !behind) put(x, y, disk());
      continue;
    }
    // rings (Saturn's wide one, Uranus' thin one)
    let rv = null;
    if (L.ring === "thin") { const q = Math.hypot(dx * 3.4, dy * .95); rv = q > 1.15 && q < 1.25 ? .5 : null; }
    else if (L.ring) { const q = Math.hypot(dx, dy * 4.2); rv = q > 1.25 && q < 1.75 && Math.abs(q - 1.52) > .05 ? .25 + (1.75 - q) * .9 : null; }
    if (d2 > 1) {
      if (rv !== null) put(x, y, tint(shade(L.pal.ring || L.pal.a, Math.min(.95, rv + (dx < 0 ? .15 : 0)), x, y)));
      else if (L.glow && d2 < 1.45 && n(x / 3 + rot * 2, y / 3) > .45 + (d2 - 1) * .9) put(x, y, tint(shade(L.pal.a, .55, x, y)));
      continue;
    }
    if (rv !== null && dy > 0 && L.ring !== "thin") { put(x, y, tint(shade(L.pal.ring, Math.min(.95, rv + .1), x, y))); continue; }
    const dz = Math.sqrt(1 - d2), u = Math.atan2(dx, dz) + rot, v = dy;
    let light = L.glow ? .55 + dz * .45 : Math.max(0, -dx * .55 - dy * .5 + dz * .67);
    for (const [cu, cv2, cr] of craters) {
      let du = ((u - cu) % 6.28 + 6.28) % 6.28; if (du > 3.14) du -= 6.28;
      const k = Math.hypot(du * dz, v - cv2);
      if (k < cr) light = Math.max(0, light - (k < cr * .7 ? .28 : -.12));
    }
    put(x, y, tint(shade(L.pal[L.paint(u, v, n, n2)], Math.min(.99, light * .95 + .02), x, y)));
  }
  g.putImageData(img, 0, 0);
}

// you: the Qarbon atom in pixels, its electrons going around
function dlDrawAtom(cv, t) {
  const A = 40, g = cv.getContext("2d"), img = g.createImageData(A, A), d = img.data;
  const put = (x, y, rgb) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= A || y >= A) return; const i = (y * A + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; };
  const ink = dlHex("#f4f4ff"), acc = dlHex("#7b6cff");
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 0; s < 6.28; s += .02) { const ex = Math.cos(s) * 18, ey = Math.sin(s) * 6.5; put(20 + ex * ca - ey * sa, 20 + ex * sa + ey * ca, acc); }
    const s = t * 2 + k * 2.1, ex = Math.cos(s) * 18, ey = Math.sin(s) * 6.5, px = 20 + ex * ca - ey * sa, py = 20 + ex * sa + ey * ca;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) put(px + i, py + j, ink);
  }
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j < 6) put(20 + i, 20 + j, ink);
  g.putImageData(img, 0, 0);
}

// a starry 8-bit sky behind the arena
function dlDrawSky(cv) {
  const w = 96, h = 86, g = cv.getContext("2d"), r = dlRng(42);
  cv.width = w; cv.height = h;
  g.fillStyle = "#05050c"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#9a9ac0";
  for (let i = 0; i < 60; i++) g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
  g.fillStyle = "#f4f4ff";
  for (let i = 0; i < 10; i++) { const x = Math.floor(r() * w), y = Math.floor(r() * h); g.fillRect(x, y, 1, 1); if (i % 3 === 0) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } }
}

// every sprite on screen turns slowly, about 8 frames a second (an old-console speed), only while Duels is showing
const dlLive = new Set();
function dlSprite(id, shiny) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = DL_S; cv.dataset.world = id;
  if (shiny) cv.dataset.shiny = "1";
  dlLive.add(cv); dlDrawWorld(cv, id, 0, !!shiny);
  return cv;
}
let dlTick = 0, dlTimer = 0;
function dlAnimate() {
  if (mode !== "duel" || $("study").hidden || document.hidden) { clearInterval(dlTimer); dlTimer = 0; return; }
  dlTick++;
  for (const cv of dlLive) {
    if (!cv.isConnected) { dlLive.delete(cv); continue; }
    if (cv.dataset.atom) dlDrawAtom(cv, dlTick / 8); else dlDrawWorld(cv, cv.dataset.world, dlTick * .06, !!cv.dataset.shiny);
  }
}
function dlRun() { if (!dlTimer && !calm()) dlTimer = setInterval(dlAnimate, 125); }
document.addEventListener("visibilitychange", () => { if (!document.hidden && mode === "duel") dlRun(); });

// ================= the worlds as rivals =================
const dlEn = c => { const b = (c.back || "").trim(); return b.length > 36 ? b.split(/[;,/]/)[0].trim() : b; };
// world i of the course you're on: its cards (yours and not yet), and how strong it is. It grows with your binder:
// f = half how much of it you've collected, half how well you know what you have (0 → 1)
function dlWorld(i) {
  const k = course(), w = WORLDS[i];
  if (!worldWords) sortWorlds();
  const mine = new Map(state.cards.map(c => [wordKey(c), c]));
  const cards = (worldWords[k.id][i] || []).map(key => mine.get(key)).filter(c => c && active(c) && c.back);
  const binder = cards.filter(inBinder), fresh = cards.filter(c => !inBinder(c));
  const got = binder.length / Math.max(1, cards.length);
  const known = binder.length ? binder.reduce((s, c) => s + bestStep(c), 0) / binder.length / 4 : 0;
  const f = got * .5 + known * got * .5;
  return { i, w, k, cards, binder, fresh, soon: i > lastWorld(k) || !cards.length,
           lv: 3 + i * 4 + Math.round(f * 20), hp: Math.round(60 + i * 8 + f * 60), hit: Math.round(12 + i * 1.2 + f * 8),
           won: (state.duels[k.id] || []).includes(i) };
}
// can you duel world x at this level? Review needs 4 of its cards in your binder
const dlCanPlay = (x, level) => !x.soon && (level === "review" ? x.binder.length >= 4 : x.cards.length >= 4);

// the duel's words: { c, isNew } (isNew = not in your binder yet: only for TRANSLATE and blocking)
function dlPool(x, level) {
  const b = shuffle(x.binder), f = shuffle(x.fresh);
  let take = level === "review" ? b.slice(0, 12)
    : level === "stretch" ? [...b.slice(0, 9), ...f.slice(0, Math.max(3, 6 - b.length))]
    : [...f.slice(0, 9), ...b.slice(0, 3)];
  if (take.length < 4) take = [...take, ...shuffle(x.cards.filter(c => !take.includes(c)))].slice(0, 6);
  return take.map(c => ({ c, isNew: !inBinder(c) }));
}

// ================= the screens =================
let dlLevel = "stretch";   // the difficulty you picked (this visit)
let D = null;              // the duel: { x, level, pool, foe, me, used, right, lost, busy, over }
const dlApp = $("dl-app");

function dlTop(back) {
  return `<div class="dl-top">${back ? `<button class="dl-btn" id="dl-leave">◀ WORLDS</button>` : `<button class="dl-btn" id="dl-arcade">◀ ARCADE</button>`}
    <h2>WORLD DUELS</h2></div>`;
}
function dlHookTop() {
  const l = $("dl-leave"), a = $("dl-arcade");
  if (l) l.onclick = () => { D = null; dlWorlds(); };
  if (a) a.onclick = () => setMode("arcade");
}

// the world picker
function dlWorlds() {
  const k = course();
  dlApp.innerHTML = dlTop(false) + `
    <div class="dl-box dl-intro">Every world on your ${esc(k.name)} map is a rival. Beat one in a word duel to win one of its cards, sometimes a shiny. Lose and nothing is taken.</div>
    <div class="dl-levels" role="group" aria-label="Difficulty">${DL_LEVELS.map(([id, name, about]) =>
      `<button class="dl-btn" data-level="${id}" aria-pressed="${dlLevel === id}">${name}<small>${about}</small></button>`).join("")}</div>
    <div class="dl-grid" id="dl-grid"></div>
    <p class="dl-note">The duels never change your review schedule. A world gets stronger the more of its cards you collect and master.</p>`;
  dlApp.querySelectorAll("[data-level]").forEach(b => { b.onclick = () => { dlLevel = b.dataset.level; dlWorlds(); }; });
  const grid = $("dl-grid");
  WORLDS.forEach((w, i) => {
    const x = dlWorld(i), ok = dlCanPlay(x, dlLevel), b = document.createElement("button");
    b.className = "dl-tile"; b.disabled = !ok;
    b.innerHTML = (x.won ? `<span class="dl-badge">WON</span>` : "") + `<b>${esc(named(w).toUpperCase())}</b>` +
      `<small>${x.soon ? "Soon" : ok ? "Lv " + x.lv : "Collect 4 first"}</small>`;
    b.prepend(dlSprite(w.id));
    if (ok) b.onclick = () => dlStart(i);
    grid.appendChild(b);
  });
  dlHookTop();
}

// ----- a duel -----
function dlStart(i) {
  const x = dlWorld(i);
  if (!dlCanPlay(x, dlLevel)) { dlWorlds(); return; }
  const name = named(x.w).toUpperCase(), [move, hello] = DL_LINES[x.w.id];
  D = { x, name, move, level: dlLevel, pool: dlPool(x, dlLevel), foe: x.hp, me: DL_YOU, used: [], right: [], lost: new Map(), busy: false, over: false };
  const youLv = 1 + Math.floor(cardsOf(course()).filter(inBinder).length / 10);
  dlApp.innerHTML = dlTop(true) + `
    <div class="dl-arena" id="dl-arena">
      <canvas class="dl-sky" id="dl-sky"></canvas>
      <div class="dl-ground g1"></div><div class="dl-ground g2"></div>
      <div class="dl-foe" id="dl-foe"></div>
      <div class="dl-plate foe"><div class="dl-nm"><span>${esc(name)}</span><span>Lv${x.lv}</span></div><div class="dl-hprow"><em>HP</em><div class="dl-hp"><i id="dl-foehp"></i></div></div></div>
      <div class="dl-me" id="dl-me"></div>
      <div class="dl-plate me"><div class="dl-nm"><span>YOU</span><span>Lv${youLv}</span></div><div class="dl-hprow"><em>HP</em><div class="dl-hp"><i id="dl-mehp"></i></div></div><div class="dl-hpnum" id="dl-menum">${DL_YOU}/${DL_YOU}</div></div>
    </div>
    <div class="dl-box dl-dialog" id="dl-dialog" aria-live="polite"></div>
    <div class="dl-moves" id="dl-moves"></div>`;
  $("dl-foe").appendChild(dlSprite(x.w.id));
  const me = document.createElement("canvas"); me.width = me.height = 40; me.dataset.atom = "1"; dlLive.add(me); dlDrawAtom(me, 0);
  $("dl-me").appendChild(me);
  dlDrawSky($("dl-sky"));
  dlHookTop();
  dlRun();
  dlSay(`<b>${esc(name)}</b> challenges you to a duel!`, () => {
    dlSay(`<span class="dl-who">${esc(name)}:</span> ${esc(hello)}`);
    dlMoves([{ label: "FIGHT", sub: "You attack first", go: dlYourTurn }], true);
  });
}

// the text box types itself out; tapping it shows the rest at once
let dlTyping = null;
function dlSay(html, done) {
  const el = $("dl-dialog");
  if (!el) return;
  if (dlTyping) clearInterval(dlTyping.id);
  el.innerHTML = html;
  const nodes = [], walk = n => n.nodeType === 3 ? nodes.push([n, n.textContent]) : n.childNodes.forEach(walk);
  walk(el); nodes.forEach(([n]) => { n.textContent = ""; });
  let i = 0;
  const total = nodes.reduce((s, [, t]) => s + t.length, 0);
  const finish = () => { if (dlTyping) clearInterval(dlTyping.id); nodes.forEach(([n, t]) => { n.textContent = t; }); dlTyping = null; if (done) setTimeout(done, 700); };
  if (calm()) { finish(); return; }
  dlTyping = { finish, id: setInterval(() => {
    i += 2; let left = i;
    for (const [n, t] of nodes) { n.textContent = t.slice(0, Math.max(0, left)); left -= t.length; }
    if (i >= total) finish();
  }, 22) };
  el.onclick = () => { if (dlTyping) dlTyping.finish(); };
}
function dlMoves(list, one) {
  const m = $("dl-moves");
  m.className = "dl-moves" + (one ? " one" : "");
  m.innerHTML = "";
  list.forEach(o => {
    const b = document.createElement("button");
    b.className = "dl-move"; b.dataset.v = o.label; b.disabled = !!o.off;
    b.innerHTML = esc(o.label) + (o.sub ? `<small>${esc(o.sub)}</small>` : "");
    b.onclick = () => { if (!D.busy && !o.off) o.go(b); };
    m.appendChild(b);
  });
  return m;
}
// the next word: one not used yet this round (spell = only words already in your binder)
function dlNext(spell) {
  const ok = it => !spell || !it.isNew;
  let pool = D.pool.filter(it => ok(it) && !D.used.includes(it));
  if (!pool.length) { D.used = D.used.filter(it => !ok(it)); pool = D.pool.filter(ok); }
  const it = pick(pool); D.used.push(it); return it;
}
// 3 wrong choices: the same side of other cards from this world, all different
function dlOthers(c, side) {
  const val = x => side === "front" ? x.front : dlEn(x), out = [], seen = new Set([val(c).toLowerCase()]);
  for (const x of shuffle(D.x.cards)) {
    const v = val(x);
    if (seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase()); out.push(v);
    if (out.length === 3) break;
  }
  return out;
}
const dlMark = v => { const b = [...document.querySelectorAll(".dl-move")].find(x => x.dataset.v === v); if (b) b.classList.add("right"); };

// your turn: attack in the course's language
function dlYourTurn() {
  const lang = course().name, canSpell = D.pool.some(it => !it.isNew);
  dlSay(`Your move. Attack in ${esc(lang)}!`);
  dlMoves([
    { label: "TRANSLATE", sub: `pick the ${lang} · ${DL_TRANSLATE} dmg`, go: dlAttackPick },
    { label: "SPELL", sub: canSpell ? `type the ${lang} · ${DL_SPELL} dmg` : "needs a card from your binder", go: dlAttackSpell, off: !canSpell }
  ]);
}
function dlAttackPick() {
  const it = dlNext(false), c = it.c;
  dlSay(`Which is the ${esc(course().name)} for…<span class="dl-word">${esc(dlEn(c))}</span>` + (it.isNew ? `<span class="dl-newtag">NEW WORD</span>` : ""));
  dlMoves(shuffle([c.front, ...dlOthers(c, "front")]).map(o => ({ label: o, go: btn => {
    D.busy = true;
    if (o === c.front) { btn.classList.add("right"); D.right.push(it); dlHitFoe(DL_TRANSLATE, `YOU used TRANSLATE! <span class="ok">${esc(c.front)}</span> hits!`); }
    else { btn.classList.add("wrong"); dlMark(c.front); D.lost.set(c.front, dlEn(c)); dlMissFoe(`<span class="no">It missed!</span> "${esc(dlEn(c))}" is ${esc(c.front)}.`); }
  } })));
}
function dlAttackSpell() {
  const it = dlNext(true), c = it.c;
  dlSay(`Type the ${esc(course().name)} for…<span class="dl-word">${esc(dlEn(c))}</span>`);
  const m = dlMoves([]);
  m.innerHTML = `<div class="dl-typed"><input id="dl-typed" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${course().lang === "es" ? "el / la …" : "le / la …"}" aria-label="Your answer"><button class="dl-move" id="dl-send">GO</button></div>
    <p class="dl-note">Accents count. ${course().lang === "es" ? "el / la" : "le / la"} can be left out, but a wrong one is only half a hit.</p>`;
  const input = $("dl-typed");
  input.focus();
  const send = () => {
    if (D.busy || !input.value.trim()) return;
    D.busy = true; input.disabled = true;
    const r = dlCheck(input.value, c.front);
    if (r === "ok") { D.right.push(it); dlHitFoe(DL_SPELL, `YOU used SPELL! <span class="ok">${esc(c.front)}</span>. A direct hit!`); }
    else if (r === "almost") { D.right.push(it); dlHitFoe(DL_ALMOST, `Close! It's ${esc(c.front)}. Only a glancing hit.`); }
    else { D.lost.set(c.front, dlEn(c)); dlMissFoe(`<span class="no">It missed!</span> "${esc(dlEn(c))}" is ${esc(c.front)}.`); }
  };
  $("dl-send").onclick = send;
  input.onkeydown = e => { if (e.key === "Enter") send(); };
}
// "ok" = exact (the article may be left out); "almost" = only an accent or a wrong article; else "no"
function dlCheck(typed, answer) {
  const ART = /^(le |la |les |l'|el |los |las |un |une |una |unos |unas )/;
  const norm = s => s.toLowerCase().normalize("NFC").replace(/[’`]/g, "'").replace(/œ/g, "oe").replace(/\s+/g, " ").trim();
  const art = s => (s.match(ART) || [""])[0], bare = s => s.replace(ART, "");
  const flat = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const t = norm(typed), a = norm(answer), wrongArticle = art(t) && art(t) !== art(a);
  if (bare(t) === bare(a)) return wrongArticle ? "almost" : "ok";
  if (flat(bare(t)) === flat(bare(a))) return "almost";
  return "no";
}

// their turn: block by knowing what their word means
function dlTheirTurn() {
  const it = dlNext(false), c = it.c, en = dlEn(c);
  dlSay(`${esc(D.name)} used ${esc(D.move)}! Block it: what does this mean?<span class="dl-word">${esc(c.front)}</span>`);
  dlMoves(shuffle([en, ...dlOthers(c, "back")]).map(o => ({ label: o, go: btn => {
    D.busy = true;
    if (o === en) { btn.classList.add("right"); D.right.push(it); dlBlocked(`<span class="ok">Blocked!</span> ${esc(c.front)} = ${esc(en)}.`); }
    else { btn.classList.add("wrong"); dlMark(en); D.lost.set(c.front, en); dlHitMe(D.x.hit, `<span class="no">Ouch!</span> ${esc(c.front)} means "${esc(en)}".`); }
  } })));
}

// ----- effects -----
function dlCenter(el) { const a = $("dl-arena").getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - a.left + r.width / 2, r.top - a.top + r.height / 2]; }
function dlBolt(from, to, done) {
  const [x1, y1] = dlCenter(from), [x2, y2] = dlCenter(to), b = document.createElement("div");
  b.className = "dl-bolt"; b.style.left = x1 + "px"; b.style.top = y1 + "px";
  $("dl-arena").appendChild(b);
  const a = b.animate([{ transform: "translate(0,0)" }, { transform: `translate(${x2 - x1}px, ${y2 - y1}px)` }], { duration: calm() ? 1 : 420, easing: "steps(7)" });
  a.onfinish = () => { b.remove(); done(); };
}
function dlNumber(el, text, color) {
  const [x, y] = dlCenter(el), n = document.createElement("div");
  n.className = "dl-dmg"; n.textContent = text; n.style.color = color;
  n.style.left = (x - 24) + "px"; n.style.top = (y - 20) + "px";
  $("dl-arena").appendChild(n); setTimeout(() => n.remove(), 1000);
}
function dlBar(id, v, max) { const i = $(id), p = Math.max(0, v) / max; i.style.width = (p * 100) + "%"; i.className = p < .25 ? "low" : p < .5 ? "mid" : ""; }
const dlThen = fn => { if (!D || D.over || !$("dl-arena")) return; D.busy = false; fn(); };
function dlHitFoe(dmg, msg) {
  dlSay(msg);
  const foe = $("dl-foe");
  dlBolt($("dl-me"), foe, () => {
    D.foe -= dmg; dlBar("dl-foehp", D.foe, D.x.hp);
    foe.classList.remove("blink"); void foe.offsetWidth; foe.classList.add("blink");
    dlNumber(foe, "-" + dmg, "#ffd23f");
    setTimeout(() => D.foe <= 0 ? dlWin() : dlThen(dlTheirTurn), 1100);
  });
}
function dlMissFoe(msg) { dlSay(msg); setTimeout(() => dlThen(dlTheirTurn), 1600); }
function dlBlocked(msg) { dlSay(msg); dlBolt($("dl-foe"), $("dl-me"), () => { dlNumber($("dl-me"), "BLOCK", "#3ee08f"); setTimeout(() => dlThen(dlYourTurn), 1000); }); }
function dlHitMe(dmg, msg) {
  dlSay(msg);
  dlBolt($("dl-foe"), $("dl-me"), () => {
    D.me -= dmg; dlBar("dl-mehp", D.me, DL_YOU);
    $("dl-menum").textContent = Math.max(0, D.me) + "/" + DL_YOU;
    const a = $("dl-arena"); a.classList.remove("shake"); void a.offsetWidth; a.classList.add("shake");
    dlNumber($("dl-me"), "-" + dmg, "#ff4f6a");
    setTimeout(() => D.me <= 0 ? dlLose() : dlThen(dlYourTurn), 1200);
  });
}

// ----- the end -----
function dlPrize(c, shiny) {
  const div = document.createElement("div");
  div.className = "dl-prize" + (shiny ? " shiny" : "");
  div.innerHTML = `<div class="dl-tag">${shiny ? "★ SHINY!" : "NEW CARD"}</div><div class="fr">${esc(c.front)}</div><div class="en">${esc(dlEn(c))}</div>`;
  div.insertBefore(dlSprite(worldOf(c).id, shiny), div.children[1]);
  return div;
}
function dlWin() {
  D.over = true;
  $("dl-foe").classList.add("down");
  const x = D.x, k = x.k;
  // the prize: a new word you got right in this duel, else another of this world's cards you don't have yet
  const fresh = (D.right.find(it => it.isNew && !inBinder(it.c)) || {}).c || pick(x.cards.filter(c => !inBinder(c)));
  // and sometimes a card of this world you already own turns shiny
  const owned = x.binder.filter(c => !c.shiny && c !== fresh);
  const shiny = owned.length && Math.random() < DL_SHINY[D.level] ? pick(owned) : null;
  if (fresh) fresh.got = today();
  if (shiny) shiny.shiny = true;
  state.duels[k.id] = [...new Set([...(state.duels[k.id] || []), x.i])].sort((a, b) => a - b);
  save();
  const name = D.name, flawless = D.me === DL_YOU;
  dlSay(`${esc(name)} goes dark! YOU win!`, () => {
    if (!$("dl-arena")) return;   // you went back to the worlds meanwhile
    $("dl-arena").remove();
    dlSay(`<span class="dl-who">${esc(name)}:</span> Well fought. Take this.`);
    const m = $("dl-moves"); m.className = "";
    const n = (fresh ? 1 : 0) + (shiny ? 1 : 0);
    m.innerHTML = `<div class="dl-result"><h3>${n ? "YOU GOT " + (n === 2 ? "2 CARDS" : "A CARD") + "!" : "YOU WIN!"}</h3><div class="dl-prizes" id="dl-prizes"></div>
      <p>${fresh ? "It's in your binder now, and comes up in Review. " : "You already have every card of " + esc(named(x.w)) + ". "}${shiny ? "Lucky: a shiny of a card you already own!" : "Shinies of cards you own drop sometimes."}${flawless ? " Flawless, not one hit taken." : ""}</p>
      <div class="dl-row"><button class="dl-move" id="dl-again">DUEL AGAIN</button><button class="dl-move" id="dl-back">WORLDS</button></div></div>`;
    if (fresh) $("dl-prizes").appendChild(dlPrize(fresh, false));
    if (shiny) $("dl-prizes").appendChild(dlPrize(shiny, true));
    $("dl-again").onclick = () => dlStart(x.i);
    $("dl-back").onclick = () => { D = null; dlWorlds(); };
  });
}
function dlLose() {
  D.over = true;
  const x = D.x, lost = D.lost;
  dlSay(`YOU are out of HP! ${esc(D.name)} wins this one.`, () => {
    const m = $("dl-moves"); if (!m || !$("dl-arena")) return;
    m.className = "";
    m.innerHTML = `<div class="dl-result"><h3>TRY AGAIN!</h3><p>Nothing is taken from your binder. These words got you:</p>
      <ul class="dl-lost">${[...lost].map(([fr, en]) => `<li><span>${esc(fr)}</span><span>${esc(en)}</span></li>`).join("")}</ul>
      <div class="dl-row"><button class="dl-move" id="dl-again">REMATCH</button><button class="dl-move" id="dl-back">WORLDS</button></div></div>`;
    $("dl-again").onclick = () => dlStart(x.i);
    $("dl-back").onclick = () => { D = null; dlWorlds(); };
  });
}

// ----- opening World Duels (from the Arcade or a world's panel on the map; openDuels in js/arcade.js) -----
// world = a world to duel right away (from the map), else the picker (or the duel you left, if it's still going)
function dlOpen(world) {
  arcadeFonts();
  scrollTo(0, 0);
  if (D && D.x.k.id !== course().id) D = null;   // you switched course: its words are different, start over
  if (Number.isInteger(world)) dlStart(world);
  else if (!D || D.over) { D = null; dlWorlds(); }
  dlRun();
}
