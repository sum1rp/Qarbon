// Qarbon · js/wordfighter.js: 👾 Qarbon Wordfighter (build 77), an 8-bit shooter in the 🕹 Arcade.
// Loaded the first time you open it (openFighter in js/arcade.js), then it shares the app's variables like every other file.
//
// The English word shows at the bottom; shoot the ship carrying it in the course's language (French or Spanish).
// Six ships a wave, swaying in formation; one dives and fires every few seconds, faster each wave. The waves are named
// after the Solar System's worlds. Hit the wrong ship and it dives at you (that alone costs no life); 3 lives, lost to
// collisions and shots. Score: 100 a hit (200 if it was diving) × your streak (up to ×5), +500 for clearing a wave.
// The words come from your binder in the course you're on. Nothing here touches your schedule; missed words are only
// listed at the end. Your best score per course is kept (state.wf, synced).

// ================= the words =================
const WF_MIN = 4;   // the fewest cards in your binder to play with (a wave has up to 6 ships)
// the English for the bottom: a long one is cut at its first comma or semicolon
const wfEnglish = c => { const b = (c.back || "").trim(); return b.length > 36 ? b.split(/[;,/]/)[0].trim() : b; };
const wfKind = c => c.part_of_speech === "noun" ? "noun" : c.part_of_speech === "verb" ? "verb" : "other";
const WF_COLOR = { noun: "#6FB7FF", verb: "#5CE1A6", other: "#FF8FD0" };
const wfCards = () => cardsOf(course()).filter(c => active(c) && inBinder(c) && c.back);
const wfWaveName = i => named(WORLDS[i % WORLDS.length]).toUpperCase();

// ================= drawing =================
const WF_P = 3;   // one sprite pixel = 3 game units
function wfSprite(g, rows, x, y, colors) {
  const w = rows[0].length * WF_P, h = rows.length * WF_P;
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < rows[r].length; c++) {
      const col = colors[rows[r][c]];
      if (col) { g.fillStyle = col; g.fillRect(Math.round(x - w / 2 + c * WF_P), Math.round(y - h / 2 + r * WF_P), WF_P, WF_P); }
    }
}

const wfCv = $("wf-cv"), wfG = wfCv.getContext("2d"), wfField = $("wf-field");
const WF_W = 360;          // the field is 360 game units wide; its height follows the screen
let wfH = 520, wfK = 1;    // height in game units, and screen pixels per game unit

// the field takes the screen's free height (between the top bar and the controls), then the canvas matches it
function wfFit() {
  const below = $("wf-prompt").offsetHeight + $("wf-controls").offsetHeight + 24;
  const free = innerHeight - wfField.getBoundingClientRect().top - below;
  wfField.style.height = Math.round(Math.max(300, Math.min(640, free))) + "px";
  const r = wfField.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  wfK = r.width / WF_W; wfH = r.height / wfK;
  wfCv.width = Math.round(r.width * dpr); wfCv.height = Math.round(r.height * dpr);
  wfG.setTransform(dpr * wfK, 0, 0, dpr * wfK, 0, 0);
  wfG.imageSmoothingEnabled = false;
}
addEventListener("resize", () => { if (mode === "fighter" && !$("study").hidden) wfFit(); });

const wfStars = Array.from({ length: 70 }, () => ({ x: Math.random() * WF_W, y: Math.random() * 900, s: Math.random() < .2 ? 2 : 1, v: 10 + Math.random() * 40 }));

// ================= the game =================
let wf = null;   // the game: { score, lives, wave, combo, enemies, shots, bombs, booms, texts, ship, hurt, prompt, hits, missed, t, nextDive, playing, paused, banner }

function wfNewGame() {
  wf = { score: 0, lives: 3, wave: 0, combo: 0, enemies: [], shots: [], bombs: [], booms: [], texts: [],
         ship: { x: WF_W / 2, tx: WF_W / 2 }, hurt: 0, prompt: null, hits: 0, missed: new Map(), t: 0, nextDive: 2.5,
         playing: true, paused: false, banner: 2, course: course() };
  wfStartWave();
}

// six ships with different words (and different English, so the prompt always points at one ship)
function wfStartWave() {
  const pool = [], fronts = new Set(), backs = new Set();
  for (const c of shuffle(wfCards())) {
    const en = wfEnglish(c).toLowerCase();
    if (fronts.has(c.front) || backs.has(en)) continue;
    fronts.add(c.front); backs.add(en); pool.push(c);
    if (pool.length === 6) break;
  }
  const cols = 3;
  wf.enemies = pool.map((c, i) => {
    const col = i % cols, row = Math.floor(i / cols), hx = WF_W * (col + .5) / cols, hy = 60 + row * 78;
    return { c, kind: wfKind(c), hx, hy, x: hx, y: -40 - row * 40 - col * 20, mode: "enter", t: 0, flash: 0, alive: true, fired: false };
  });
  wf.banner = 2;
  $("wf-wave").textContent = wfWaveName(wf.wave);
  wfPickPrompt();
}

function wfPickPrompt() {
  const alive = wf.enemies.filter(e => e.alive);
  if (!alive.length) { wf.wave++; wf.score += 500; wfFloat(WF_W / 2, wfH / 2, "WAVE CLEAR +500", "#FFD166"); wfStartWave(); return; }
  wf.prompt = alive[Math.floor(Math.random() * alive.length)];
  $("wf-en").textContent = wfEnglish(wf.prompt.c);
}

// ----- controls -----
const wfKeys = {};
const wfActive = () => mode === "fighter" && !$("study").hidden;
addEventListener("keydown", e => {
  if (!wfActive() || ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName) || e.metaKey || e.ctrlKey) return;
  if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); wfFire(); }
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.preventDefault();
  if (e.key === "Enter" && (!wf || !wf.playing)) { e.preventDefault(); wfBegin(); }
  if (e.key === "Enter" && wf && wf.paused) { e.preventDefault(); wfResume(); }
  wfKeys[e.key] = true;
});
addEventListener("keyup", e => { wfKeys[e.key] = false; });

// on the field: drag to fly, a quick tap fires
let wfDrag = null;
wfField.addEventListener("pointerdown", e => {
  if (!wf || !wf.playing || wf.paused) return;
  const r = wfField.getBoundingClientRect();
  wfDrag = { x0: e.clientX, t0: performance.now(), moved: false };
  wf.ship.tx = (e.clientX - r.left) / wfK;
  wfField.setPointerCapture(e.pointerId);
});
wfField.addEventListener("pointermove", e => {
  if (!wfDrag || !wf) return;
  const r = wfField.getBoundingClientRect();
  wf.ship.tx = (e.clientX - r.left) / wfK;
  if (Math.abs(e.clientX - wfDrag.x0) > 12) wfDrag.moved = true;
});
wfField.addEventListener("pointerup", () => {
  if (wfDrag && !wfDrag.moved && performance.now() - wfDrag.t0 < 300) wfFire();
  wfDrag = null;
});
wfField.addEventListener("pointercancel", () => { wfDrag = null; });
$("wf-fire").addEventListener("pointerdown", e => { e.preventDefault(); wfFire(); });
$("wf-fire").addEventListener("click", e => { if (e.detail === 0) wfFire(); });   // Enter/Space on the button (keyboard)

function wfFire() {
  if (!wf || !wf.playing || wf.paused || wf.shots.length >= 2) return;
  wf.shots.push({ x: wf.ship.x, y: wfH - 46 });
  wfBeep(880, .05, "square", .04);
}

// ----- sound: tiny square-wave beeps (the audio starts with the first tap on START) -----
let wfAudio = null;
function wfBeep(f, d, type = "square", vol = .05, slide = 0) {
  if (!wfAudio) return;
  try {
    const o = wfAudio.createOscillator(), v = wfAudio.createGain(), t = wfAudio.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(v).connect(wfAudio.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}

// ----- one step of the game (dt = seconds since the last one) -----
function wfFloat(x, y, text, color) { wf.texts.push({ x, y, text, color, t: 1.2 }); }
function wfBoom(x, y, color) {
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
    wf.booms.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: .5 + Math.random() * .4, color });
  }
}
function wfHitPlayer() {
  if (wf.hurt > 0 || !wf.playing) return;
  wf.lives--; wf.hurt = 1.6; wf.combo = 0;
  wfBoom(wf.ship.x, wfH - 30, "#ffffff"); wfBeep(120, .4, "sawtooth", .08, 40);
  $("wf-lives").textContent = "▲".repeat(Math.max(0, wf.lives));
  if (wf.lives <= 0) wfGameOver();
}
function wfDive(e) {
  e.mode = "dive"; e.t = 0; e.fired = false;
  e.dx = wf.ship.x; e.side = e.x < WF_W / 2 ? 1 : -1;
  wfBeep(500, .25, "triangle", .03, 200);
}

function wfStep(dt) {
  wf.t += dt;
  const s = wf.ship, H = wfH;
  if (wfKeys.ArrowLeft || wfKeys.a) s.tx = s.x - 400 * dt;
  if (wfKeys.ArrowRight || wfKeys.d) s.tx = s.x + 400 * dt;
  s.tx = Math.max(20, Math.min(WF_W - 20, s.tx));
  s.x += (s.tx - s.x) * Math.min(1, dt * 14);
  if (wf.hurt > 0) wf.hurt -= dt;
  if (wf.banner > 0) wf.banner -= dt;

  // the formation sways; one ship at a time swoops down (more often, and faster, each wave)
  const sway = Math.sin(wf.t * .8) * 18, speed = 1 + wf.wave * .12;
  wf.nextDive -= dt;
  if (wf.nextDive <= 0) {
    const home = wf.enemies.filter(e => e.alive && e.mode === "home");
    if (home.length) wfDive(home[Math.floor(Math.random() * home.length)]);
    wf.nextDive = Math.max(1.2, 3.2 - wf.wave * .25);
  }
  for (const e of wf.enemies) {
    if (!e.alive) continue;
    e.flash = Math.max(0, e.flash - dt);
    const hx = e.hx + sway, hy = e.hy + Math.sin(wf.t * 2 + e.hx) * 3;
    if (e.mode === "enter" || e.mode === "return") {
      e.x += (hx - e.x) * Math.min(1, dt * 3); e.y += (hy - e.y) * Math.min(1, dt * 3);
      if (Math.abs(e.x - hx) < 2 && Math.abs(e.y - hy) < 2) e.mode = "home";
    } else if (e.mode === "home") { e.x = hx; e.y = hy; }
    else if (e.mode === "dive") {
      e.t += dt * speed;
      e.y += (140 + e.t * 90) * dt * speed;
      e.x += ((e.dx - e.x) * 1.2 + Math.sin(e.t * 4) * 90 * e.side) * dt;
      if (!e.fired && e.y > H * .38) { e.fired = true; wf.bombs.push({ x: e.x, y: e.y + 12, vx: (s.x - e.x) * .25 }); wfBeep(300, .08, "square", .03); }
      if (e.y > H + 30) { e.y = -30; e.mode = "return"; }
      if (Math.abs(e.x - s.x) < 24 && Math.abs(e.y - (H - 30)) < 20) { wfHitPlayer(); e.y = -30; e.mode = "return"; }
    }
  }

  // your shots
  for (const b of wf.shots) {
    b.y -= 520 * dt;
    for (const e of wf.enemies) {
      if (!e.alive || b.dead || !wf.playing) continue;
      if (Math.abs(b.x - e.x) < 19 && Math.abs(b.y - e.y) < 14) {
        b.dead = true;
        if (e === wf.prompt) {   // the right word
          e.alive = false; wf.hits++; wf.combo++;
          const pts = (e.mode === "dive" ? 200 : 100) * Math.min(wf.combo, 5);
          wf.score += pts;
          wfBoom(e.x, e.y, WF_COLOR[e.kind]); wfFloat(e.x, e.y - 18, "+" + pts, "#FFD166");
          wfBeep(660, .12, "square", .05, 1320);
          wfFlash("good"); wfPickPrompt();
        } else {                 // the wrong word: it shows its English, and dives at you
          e.flash = .5; wf.combo = 0;
          wf.missed.set(wf.prompt.c.front, wfEnglish(wf.prompt.c));
          wfFloat(e.x, e.y - 18, wfEnglish(e.c).toUpperCase(), "#FF5470");
          wfBeep(160, .2, "square", .05, 80); wfFlash("bad");
          if (e.mode === "home") wfDive(e);
        }
      }
    }
  }
  wf.shots = wf.shots.filter(b => !b.dead && b.y > -10);

  // their shots
  for (const b of wf.bombs) {
    b.y += 210 * dt * speed; b.x += b.vx * dt;
    if (Math.abs(b.x - s.x) < 14 && Math.abs(b.y - (H - 30)) < 14) { b.dead = true; wfHitPlayer(); }
  }
  wf.bombs = wf.bombs.filter(b => !b.dead && b.y < H + 10);

  for (const p of wf.booms) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.t -= dt; }
  wf.booms = wf.booms.filter(p => p.t > 0);
  for (const t of wf.texts) { t.y -= 30 * dt; t.t -= dt; }
  wf.texts = wf.texts.filter(t => t.t > 0);
  $("wf-score").textContent = String(wf.score).padStart(6, "0");
}

let wfFlashTimer = 0;
function wfFlash(kind) {
  const p = $("wf-prompt");
  p.classList.remove("good", "bad"); p.classList.add(kind);
  clearTimeout(wfFlashTimer); wfFlashTimer = setTimeout(() => p.classList.remove(kind), 350);
}

// the word under a ship, shrunk to fit if it's long
function wfLabel(g, text, x, y) {
  let size = 18;
  g.font = size + "px VT323, 'Courier New', monospace";
  let tw = g.measureText(text).width;
  if (tw > 112) { size = Math.max(11, Math.floor(size * 112 / tw)); g.font = size + "px VT323, 'Courier New', monospace"; tw = g.measureText(text).width; }
  g.textAlign = "center"; g.textBaseline = "top";
  g.fillStyle = "rgba(3,3,6,.75)"; g.fillRect(x - tw / 2 - 3, y, tw + 6, size - 1);
  g.fillStyle = "#ECECF4"; g.fillText(text, x, y + 1);
}

function wfDraw(dt) {
  const g = wfG, H = wfH;
  g.fillStyle = "#030306"; g.fillRect(0, 0, WF_W, H);
  for (const s of wfStars) {
    s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * WF_W; }
    g.fillStyle = s.s === 2 ? "#cfd0ff" : "#6a6a90"; g.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
  }
  if (!wf) return;
  for (const e of wf.enemies) {
    if (!e.alive) continue;
    const c = e.flash > 0 && Math.floor(e.flash * 20) % 2 ? "#FF5470" : WF_COLOR[e.kind];
    const flap = Math.floor(wf.t * 4) % 2;   // the legs flap
    const rows = WF_SPRITES[e.kind].map((r, i) => i === 6 && flap ? ".".repeat(r.length) : r);
    wfSprite(g, rows, e.x, e.y, { C: c });
    wfLabel(g, e.c.front, e.x, e.y + 14);
  }
  for (const b of wf.shots) { g.fillStyle = "#FFD166"; g.fillRect(Math.round(b.x) - 1, Math.round(b.y), 2, 8); }
  for (const b of wf.bombs) { g.fillStyle = "#FF5470"; g.fillRect(Math.round(b.x) - 2, Math.round(b.y), 4, 4); }
  for (const p of wf.booms) { g.globalAlpha = Math.min(1, p.t * 2); g.fillStyle = p.color; g.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }
  g.globalAlpha = 1;
  if (wf.playing && !(wf.hurt > 0 && Math.floor(wf.hurt * 12) % 2)) {
    const flame = Math.floor(wf.t * 20) % 2 ? "#FFD166" : "#FF8A3D";
    wfSprite(g, WF_SPRITES.ship, wf.ship.x, H - 30, { W: "#E8E8F4", P: "#7b6cff", O: flame });
  }
  g.font = "20px VT323, 'Courier New', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
  for (const t of wf.texts) { g.globalAlpha = Math.min(1, t.t * 1.5); g.fillStyle = t.color; g.fillText(t.text, t.x, t.y); }
  g.globalAlpha = 1;
  if (wf.combo > 1) { g.font = "10px 'Press Start 2P', monospace"; g.textAlign = "left"; g.fillStyle = "#FFD166"; g.fillText("x" + Math.min(wf.combo, 5), 8, H - 14); }
  if (wf.banner > 0 && wf.playing) {
    g.globalAlpha = Math.min(1, wf.banner);
    g.font = "12px 'Press Start 2P', monospace"; g.textAlign = "center"; g.fillStyle = "#ECECF4";
    g.fillText("WAVE " + (wf.wave + 1) + " · " + wfWaveName(wf.wave), WF_W / 2, H * .55);
    g.globalAlpha = 1;
  }
}

// ----- the loop: only while Wordfighter is showing and the page is visible -----
let wfRunning = false, wfLast = 0;
function wfLoop(now) {
  if (!wfActive() || document.hidden) { wfRunning = false; return; }
  const dt = Math.min(.05, (now - wfLast) / 1000); wfLast = now;
  if (wf && wf.playing && !wf.paused) wfStep(dt);
  wfDraw(wf && wf.paused ? 0 : dt);
  requestAnimationFrame(wfLoop);
}
function wfRun() {
  if (wfRunning) return;
  wfRunning = true; wfLast = performance.now();
  requestAnimationFrame(wfLoop);
}

// ----- start, pause, game over -----
function wfBegin() {
  if (wfCards().length < WF_MIN) return;
  try { wfAudio = wfAudio || new (window.AudioContext || window.webkitAudioContext)(); wfAudio.resume(); } catch (e) {}
  $("wf-start").hidden = $("wf-end").hidden = $("wf-pause").hidden = true;
  wfNewGame();
  $("wf-lives").textContent = "▲▲▲";
  wfRun();
}
function wfResume() {
  if (!wf || !wf.paused) return;
  wf.paused = false;
  $("wf-pause").hidden = true;
  wfRun();
}
// leaving Wordfighter (another mode, home, or the app hidden) in the middle of a game pauses it
function wfLeave() {
  if (wf && wf.playing && !wf.paused) { wf.paused = true; $("wf-pause").hidden = false; }
}
document.addEventListener("visibilitychange", () => { if (document.hidden) wfLeave(); else if (wfActive()) wfRun(); });

function wfGameOver() {
  wf.playing = false;
  const k = wf.course, best = state.wf[k.id] || 0, isBest = wf.score > best;
  if (isBest) { state.wf[k.id] = wf.score; save(); }
  setTimeout(() => {
    $("wf-final").textContent = String(wf.score).padStart(6, "0");
    $("wf-new").hidden = !isBest;
    $("wf-sum").textContent = wf.hits + (wf.hits === 1 ? " word" : " words") + " hit · reached " + named(WORLDS[wf.wave % WORLDS.length]) +
                              (isBest ? "" : best ? " · best " + fmtScore(best) : "");
    const ul = $("wf-missed"); ul.innerHTML = "";
    for (const [front, en] of wf.missed) {
      const li = document.createElement("li");
      li.append(Object.assign(document.createElement("span"), { textContent: front }), Object.assign(document.createElement("span"), { textContent: en }));
      ul.appendChild(li);
    }
    $("wf-mtag").hidden = !wf.missed.size;
    $("wf-end").hidden = false;
  }, 900);
}

// ----- opening Wordfighter (from the Arcade; openFighter in js/arcade.js) -----
let wfFonts = false;
function wfOpen() {
  // the pixel fonts (Press Start 2P, VT323) come from Google Fonts, only once you play; offline, Courier stands in
  if (!wfFonts) {
    wfFonts = true;
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";
    document.head.appendChild(l);
    if (document.fonts) document.fonts.ready.then(() => { if (wfActive()) wfFit(); });
  }
  scrollTo(0, 0);
  const k = course(), n = wfCards().length, best = state.wf[k.id];
  $("wf-lab").innerHTML = "SHOOT<br>THE<br>" + k.name.toUpperCase();
  $("wf-course").textContent = k.name.toUpperCase() + " · " + n + " CARDS IN YOUR BINDER";
  $("wf-how").textContent = n >= WF_MIN ? "The English word shows at the bottom. Shoot the ship carrying its " + k.name + " word."
    : "Collect at least " + WF_MIN + " cards first: open a pack on the 🪐 Solar System.";
  $("wf-go").disabled = n < WF_MIN;
  $("wf-best").textContent = best ? "BEST " + fmtScore(best) : "";
  // a game from another course can't go on (its words are different): start fresh
  if (wf && wf.course.id !== k.id) { wf = null; $("wf-pause").hidden = $("wf-end").hidden = true; }
  if (!wf) { $("wf-start").hidden = false; $("wf-en").textContent = "…"; $("wf-score").textContent = "000000"; $("wf-wave").textContent = wfWaveName(0); }
  else if (!wf.playing && $("wf-end").hidden) $("wf-start").hidden = false;
  requestAnimationFrame(() => { wfFit(); wfRun(); });
}

$("wf-go").onclick = wfBegin;
$("wf-again").onclick = wfBegin;
$("wf-resume").onclick = wfResume;
$("wf-back").onclick = () => setMode("arcade");
