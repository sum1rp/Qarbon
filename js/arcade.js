// Qarbon · js/arcade.js: 🕹 the Arcade (build 77): its page of games, and loading Wordfighter the first time you open it.
// The script files run in the order index.html lists them, and share one set of variables.
// The games (B.A.R. Exam in js/burn.js, Wordfighter in js/wordfighter.js, later World Duels) never change your review schedule.

// ================= the Arcade page =================
const fmtScore = n => Number(n || 0).toLocaleString("en-US");   // 12,400

function renderArcade() {
  // B.A.R. Exam: your best on the level you play most recently, for the deck you're on
  const sc = barScores(), lv = state.barLevel, best = sc.best[lv] || BAR_LEVELS.map(l => sc.best[l]).find(Boolean);
  $("ar-barbest").textContent = best ? "Best (" + BAR_LEVEL_INFO[best.level][0] + "): " + roundText(best) : "No rounds yet";
  const wf = state.wf[course().id];
  $("ar-wfbest").textContent = wf ? "Best: " + fmtScore(wf) + " (" + course().name + ")" : "No score yet in " + course().name;
  $("ar-bar").classList.remove("go");
  // the tiles' pixel pictures (the sprites are in js/worlds.js)
  $("ar-wfpic").innerHTML = `<svg viewBox="0 0 40 40" shape-rendering="crispEdges">
    ${pixelSVG(WF_SPRITES.noun, { C: "#6FB7FF" }, 4, 5, 1.3)}${pixelSVG(WF_SPRITES.verb, { C: "#5CE1A6" }, 21.7, 5, 1.3)}
    <rect x="19.4" y="19" width="1.2" height="5" fill="#FFD166"/>${pixelSVG(WF_SPRITES.ship, { W: "#E8E8F4", P: "#7b6cff", O: "#FFD166" }, 13, 25, 1.3)}</svg>`;
  $("ar-duelpic").innerHTML = `<svg viewBox="0 0 40 40" shape-rendering="crispEdges">
    <circle cx="27" cy="13" r="9" fill="#5a49e6" shape-rendering="auto"/><circle cx="24" cy="10" r="3" fill="#9a8cff" shape-rendering="auto"/>
    ${pixelSVG(WF_SPRITES.ship, { W: "#E8E8F4", P: "#7b6cff", O: "#FFD166" }, 4, 22, 1.3)}</svg>`;
}

// the line under the Arcade on home
function arcadeLine() {
  const wf = state.wf[course().id];
  $("ws-arcade").textContent = "B.A.R. Exam · Wordfighter" + (wf ? " · best " + fmtScore(wf) : "");
}

// B.A.R. Exam: the Sun goes supernova (1.5 s, the same animation the home Sun had), then the exam opens
let arcadeLaunching = false;
$("ar-bar").onclick = () => {
  if (arcadeLaunching) return;
  arcadeLaunching = true;
  $("ar-bar").classList.add("go");
  setTimeout(() => {
    arcadeLaunching = false;
    $("ar-bar").classList.remove("go");
    if (mode === "arcade") startBurn();
  }, calm() ? 0 : 1500);
};
$("ar-wf").onclick = () => setMode("fighter");

// ================= Wordfighter: loaded the first time it opens =================
// The game is in its own file (js/wordfighter.js), so it doesn't slow down starting Qarbon.
// render() calls this while the mode is "fighter".
function openFighter() {
  if (typeof wfOpen === "function") { wfOpen(); return; }
  $("wf-en").textContent = "Loading…";
  loadScript("js/wordfighter.js?v=" + VERSION)
    .then(() => { if (mode === "fighter") wfOpen(); })
    .catch(() => { $("wf-en").textContent = "Couldn't load the game. Check your connection and try again."; });
}
