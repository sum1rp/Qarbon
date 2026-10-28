// Qarbon · js/timer.js: the study timer.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= study timer =================
// One timer, shown in two places: the dropdown on the flashcards page and the big clock on the Focus page.
let phase = "focus";       // "focus" or "break"
let cycle = 0;             // focus sessions finished in the current round
let remaining = 0, endAt = 0, ticking = null, actx = null;
const fmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
const tm = () => state.timerMode === "custom" ? state.customTimer : TIMER_MODES[state.timerMode];
const isLongBreak = () => phase === "break" && tm().every > 1 && cycle > 0 && cycle % tm().every === 0;
const phaseSeconds = () => 60 * (phase === "focus" ? tm().focus : isLongBreak() ? tm().long : tm().short);
const phaseName = () => phase === "focus" ? "Focus" : isLongBreak() ? "Long break" : "Break";
const RING = 2 * Math.PI * 54;   // the length of the Focus page ring's outline (its radius is 54)

function showTime() {
  // "Focus 2/4" when the style has long breaks, so you know how far into the round you are
  const name = phaseName() + (tm().every > 1 && phase === "focus" ? " " + (cycle % tm().every + 1) + "/" + tm().every : "");
  $("time").textContent = $("ftime").textContent = fmt(remaining);
  $("phase").textContent = $("fphase").textContent = name;
  $("timer").classList.toggle("onbreak", phase === "break");
  $("focus").classList.toggle("onbreak", phase === "break");
  $("sessions").textContent = state.sessions ? "· " + state.sessions + " done" : "";
  $("fsessions").textContent = state.sessions ? state.sessions + " focus session" + (state.sessions === 1 ? "" : "s") + " done" : "";
  // the ring empties as time passes: dashoffset 0 = full ring, RING = empty
  const done = 1 - remaining / Math.max(1, phaseSeconds());
  $("fring").style.strokeDasharray = RING;
  $("fring").style.strokeDashoffset = RING * done;
  document.title = ticking ? fmt(remaining) + " · " + phaseName() + " · Qarbon" : "Qarbon";
}

// the Start/Pause/Resume label, on both pages
const setStartLabel = text => { $("tstart").textContent = $("fstart").textContent = text; };
// timer messages, on both pages
const timerNote = text => { $("msg").textContent = $("fmsg").textContent = text; };

function chime() {
  if (!actx) return;
  [660, 880, 1100].forEach((f, i) => {
    const t = actx.currentTime + i * 0.25;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + 0.7);
  });
}

// update the time left, and count focus seconds toward the book you're reading (if any)
function updateRemaining() {
  const before = remaining;
  remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
  if (phase === "focus" && state.readingBook) readSecs += Math.max(0, before - remaining);
}

function tick() {
  updateRemaining();
  showTime();
  if (remaining === 0) finishPhase();
}

function startTimer() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {}
  endAt = Date.now() + remaining * 1000;
  ticking = setInterval(tick, 500);
  if (phase === "focus" && typeof timerSession === "function") timerSession(true);   // a focus part is a 🌍 Habits session (js/habits.js)
  $("timer").classList.remove("done");
  setStartLabel("Pause");
  showTime();
}

function pauseTimer() {
  updateRemaining();
  clearInterval(ticking); ticking = null;
  if (typeof timerSession === "function") timerSession(false);
  setStartLabel("Resume");
  showTime();
}

// back to the start of a fresh round (used by Reset, switching style, and restoring a backup)
function resetTimer() {
  clearInterval(ticking); ticking = null;
  if (typeof timerSession === "function") timerSession(false);
  phase = "focus"; cycle = 0;
  remaining = phaseSeconds();
  $("timer").classList.remove("done");
  setStartLabel("Start");
  showTime();
}

// Skip: jump straight to the next part. A skipped focus session isn't counted as done.
function skipPhase() {
  clearInterval(ticking); ticking = null;
  if (typeof timerSession === "function") timerSession(false);
  phase = phase === "focus" ? "break" : "focus";
  remaining = phaseSeconds();
  setStartLabel("Start");
  showTime();
  timerNote(phaseName() + " is ready: " + Math.round(remaining / 60) + " min. Press Start.");
}

// the timer style lists (dropdown and Focus page) and the Custom boxes, matching what's saved
function syncTimerUI() {
  const styles = [...Object.entries(TIMER_MODES).map(([k, m]) => [k, m.label]), ["custom", "Custom…"]];
  ["tmode", "ftmode"].forEach(id => setOptions($(id), styles, state.timerMode));
  Object.keys(CUSTOM_LIMITS).forEach(k => { $("c-" + k).value = state.customTimer[k]; });
  $("fcustom").hidden = state.timerMode !== "custom";
  resetTimer();
}

function chooseTimerMode(value) {
  state.timerMode = value;
  save();
  syncTimerUI();
}

// a focus or break ran out: chime, then line up the next phase (press Start when you're ready)
function finishPhase() {
  clearInterval(ticking); ticking = null;
  if (typeof timerSession === "function") timerSession(false);
  const wasFocus = phase === "focus";
  if (wasFocus) { state.sessions = (state.sessions || 0) + 1; cycle++; save(); }
  try { chime(); } catch (e) {}
  phase = wasFocus ? "break" : "focus";
  remaining = phaseSeconds();
  showTime();
  setStartLabel("Start");
  timerNote(wasFocus
    ? "Focus session complete (" + state.sessions + " so far). " + phaseName() + " is ready: " + Math.round(remaining / 60) + " min. Press Start."
    : "Break over. Next focus session is ready. Press Start.");
  if (wasFocus && state.readingBook) askChapter(false);   // reading a book? ask how far you got
}

// opening the timer under the Review card: scroll down so its buttons show above the answer buttons
$("timer").addEventListener("toggle", () => {
  if ($("timer").open) $("tcontrols").scrollIntoView({ block: "nearest", behavior: "smooth" });
});
$("tstart").onclick = $("fstart").onclick = () => ticking ? pauseTimer() : startTimer();
$("treset").onclick = $("freset").onclick = resetTimer;
$("fskip").onclick = skipPhase;
$("tmode").onchange = $("ftmode").onchange = e => chooseTimerMode(e.target.value);
// Custom lengths: kept within their limits, and used right away if the timer isn't running
Object.keys(CUSTOM_LIMITS).forEach(k => {
  $("c-" + k).onchange = e => {
    const [lo, hi] = CUSTOM_LIMITS[k];
    state.customTimer[k] = Math.min(hi, Math.max(lo, Math.round(Number(e.target.value)) || lo));
    e.target.value = state.customTimer[k];
    save();
    if (!ticking) resetTimer(); else timerNote("New lengths start with the next part.");
  };
});
