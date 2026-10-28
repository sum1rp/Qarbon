// Qarbon · js/habits.js: 🌍 Habits (build 77): your study time, sessions, the daily goal, streaks and stats.
// The script files run in the order index.html lists them, and share one set of variables.
// The home Earth is this world now: the ring around it fills with today's minutes.

// ================= what counts as study time =================
// Two ways time is counted (the user's choices):
//  1. Being in a study mode counts the whole time you're in it (no pause when you stop touching the screen),
//     but only while Qarbon is on screen. The 🎧 Qpod alone doesn't count.
//  2. A session (started on the Habits page, or the Focus timer, or 📖 Read) counts EVERY second until it stops,
//     whatever you do meanwhile: the Qpod, another app, the phone locked. While one runs, all time goes to its activity.
const ACTS = { review: "Review", decks: "Decks", map: "Solar System", translate: "Translate", bar: "B.A.R. Exam", arcade: "Arcade", focus: "Focus",
               reading: "Reading", study: "Studying", writing: "Writing", listening: "Listening", other: "Other" };
// the mode you're in → its activity (modes not listed, like 🎧 Media and Habits itself, don't count)
const MODE_ACT = { daily: "review", practice: "review", deck: "decks", solar: "map", translate: "translate", burn: "bar", arcade: "arcade", fighter: "arcade", duel: "arcade", focus: "focus", reading: "reading" };
// what you can start a session for, and for how long (0 = open-ended: it runs until you stop it)
const SESSION_ACTS = [["reading", "📖 Reading"], ["study", "✏️ Studying"], ["writing", "✍️ Writing"], ["listening", "🎧 Listening"], ["other", "✨ Other"]];
const SESSION_LENGTHS = [[0, "Until I stop it"], [15, "15 min"], [25, "25 min"], [30, "30 min"], [45, "45 min"], [60, "1 hour"], [90, "1 h 30"]];
const SESSION_CAP = 90 * 60e3;   // an open-ended session stops itself after 1 h 30 (the user's choice), so a forgotten one can't count all night

// this device's name in the records (made once, kept apart from the save so a restored backup doesn't copy it)
const DEVICE = (() => {
  let id = "";
  try { id = localStorage.getItem("qarbon-device") || ""; } catch (e) {}
  if (!/^dev-[\w]{4,30}$/.test(id)) {
    id = "dev-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try { localStorage.setItem("qarbon-device", id); } catch (e) {}
  }
  return id;
})();

// ================= the records =================
// this device's record for a day, made when first needed
function myDay(d) {
  const mine = state.habits[DEVICE] || (state.habits[DEVICE] = {});
  return mine[d] || (mine[d] = { s: {}, r: 0, ok: 0 });
}
// a day added up over every device: { s: { act: seconds }, r, ok, secs }
function dayTotal(d) {
  const out = { s: {}, r: 0, ok: 0, secs: 0 };
  for (const days of Object.values(state.habits)) {
    const x = days[d];
    if (!x) continue;
    for (const [k, v] of Object.entries(x.s)) { out.s[k] = (out.s[k] || 0) + v; out.secs += v; }
    out.r += x.r; out.ok += x.ok;
  }
  return out;
}
const dayMinutes = d => Math.floor(dayTotal(d).secs / 60);
const goalRange = () => GOALS[state.goal] || GOALS["10-20"];
const goalMet = d => dayMinutes(d) >= goalRange()[0];
const goalText = () => goalRange().join("–") + " min";
// a day n days before (or after) the day d, as "2026-10-28" (noon, so a daylight-saving change can't skip a day)
function shiftDay(d, n) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return iso(x); }

// add the time from → to (milliseconds) to an activity, split at midnight so each part lands on its own day
function addTime(act, from, to) {
  while (to > from) {
    const day = new Date(from), next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
    const end = Math.min(to, next), rec = myDay(iso(day));
    rec.s[act] = Math.round(((rec.s[act] || 0) + (end - from) / 1000) * 10) / 10;
    from = end;
  }
  habitsUnsynced = true;
}

// an answer in Review or B.A.R. (applyGrade in js/cards.js): one more card for today's "reviews per day"
function logReview(right) {
  const rec = myDay(today());
  rec.r++;
  if (right) rec.ok++;
  habitsUnsynced = true;
}

// your streak: days in a row with the goal met, up to today (today doesn't break it while you still have time)
function streak() {
  let d = today(), n = 0;
  if (!goalMet(d)) d = shiftDay(d, -1);
  while (goalMet(d)) { n++; d = shiftDay(d, -1); }
  return n;
}
// your longest streak ever
function bestStreak() {
  const days = [...new Set(Object.values(state.habits).flatMap(Object.keys))].filter(goalMet).sort();
  let best = 0, run = 0, prev = "";
  for (const d of days) { run = prev && shiftDay(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}

// ================= sessions =================
// state.session = { act, start, end (0 = open-ended), counted, timer } (cleanSession in js/data.js). It's saved, so a session
// keeps going if iPhone Safari closes the page while it's in the background; time is worked out from the clock, not counted in steps.
let habitNote = "";   // a message for the Habits page, like "Your Reading session ended after 30 min"
const sessionStop = s => s.end || s.start + SESSION_CAP;

// count the session's time up to now (never past its end)
function countSession(now) {
  const s = state.session, to = Math.min(now, sessionStop(s));
  if (to > s.counted) { addTime(s.act, s.counted, to); s.counted = to; }
}

// start a session. mins = its length (0 = until you stop it); timer = it's the Focus timer's (its end = the timer's)
function beginSession(act, mins, timerEnd) {
  if (state.session) endSession("replaced");
  if (!timerEnd && ticking) pauseTimer();   // one timer at a time: a session from the Habits page pauses the Focus timer
  const now = Date.now();
  state.session = { act, start: now, end: timerEnd || (mins ? now + mins * 60e3 : 0), counted: now, timer: !!timerEnd };
  habitNote = "";
  save();
  showSession();
}

// stop the session. why: "stop" (you), "done" (its time ran out), "cap" (open-ended, 1 h 30), "timer", "replaced"
function endSession(why) {
  const s = state.session;
  if (!s) return;
  countSession(Date.now());
  state.session = null;
  const took = Math.round((s.counted - s.start) / 60e3);
  if (why === "done") { habitNote = "Your " + ACTS[s.act] + " session is done: " + mins(took) + "."; try { chime(); } catch (e) {} }
  else if (why === "cap") habitNote = "Your " + ACTS[s.act] + " session stopped itself after 1 h 30 (" + mins(took) + " counted). Start a new one if you're still going.";
  else if (why === "stop") habitNote = "Session saved: " + mins(took) + " of " + ACTS[s.act] + ".";
  save();
  showSession();
  if (mode === "habits" && !$("study").hidden) renderHabits();
}

// the Focus timer (js/timer.js) is a session too: started when a focus part starts, ended when it pauses, ends or is reset.
// While you're reading a book (📖 Read), its time is Reading.
function timerSession(on) {
  if (on) beginSession(state.readingBook ? "reading" : "focus", 0, endAt);
  else if (state.session && state.session.timer) endSession("timer");
}

// ================= the clock: once a second =================
let lastTick = Date.now(), lastHabitSave = Date.now(), metToday = goalMet(today());
// does the mode you're in count right now? (on screen, in a study mode; Focus's breaks don't)
const modeCounts = () => !document.hidden && !$("study").hidden && !!MODE_ACT[mode] && !(mode === "focus" && phase === "break");

function habitTick() {
  const now = Date.now();
  if (state.session) {
    countSession(now);
    const s = state.session;
    if (!s.timer && now >= sessionStop(s)) endSession(s.end ? "done" : "cap");
    // the Focus timer's session: if the timer is gone (the page was closed and opened again), count it up to its end and stop it
    else if (s.timer && !ticking) endSession("timer");
  } else if (modeCounts()) addTime(MODE_ACT[mode], Math.max(lastTick, now - 2000), now);   // (at most 2 s: the page may have been asleep)
  lastTick = now;
  if (now - lastHabitSave > 30000) { lastHabitSave = now; save(); }   // stored every 30 s (and when you leave the app)
  // the goal just met: say so, once a day
  const met = goalMet(today());
  if (met && !metToday) goalCheer();
  metToday = met;
  showSession();
  if (mode === "habits" && !$("study").hidden && !document.hidden) liveToday();
}
setInterval(habitTick, 1000);
// leaving the app or locking the phone: store the time so far (account.js syncs it right after)
document.addEventListener("visibilitychange", () => { habitTick(); if (document.hidden) save(); else lastTick = Date.now(); });
addEventListener("pagehide", () => { habitTick(); save(); });

// "✓ Today's goal met · 🔥 4 days" for a few seconds at the top of the study screen
function goalCheer() {
  const el = $("hb-toast");
  el.textContent = "✓ Today's goal met · 🔥 " + streak() + (streak() === 1 ? " day" : " days");
  el.hidden = false;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(goalCheer.t);
  goalCheer.t = setTimeout(() => { el.hidden = true; }, 3500);
  syncSoon();
}

// m:ss or h:mm:ss
const hms = secs => { secs = Math.max(0, Math.round(secs)); const h = Math.floor(secs / 3600), m = Math.floor(secs / 60) % 60, s = secs % 60;
                        return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0"); };
// what a session says about itself: "📖 Reading · 12:04" (open-ended counts up) or "· 18:20 left"
function sessionLine(s) {
  const now = Date.now(), icon = (SESSION_ACTS.find(a => a[0] === s.act) || ["", "⏱"])[1].split(" ")[0];
  const label = s.timer ? (s.act === "reading" ? "📖 Reading (Focus timer)" : "⏱ Focus timer") : icon + " " + ACTS[s.act];
  return { label, time: s.end ? hms((s.end - now) / 1000) + " left" : hms((now - s.start) / 1000) };
}

// the session bar under the Mode menu, in every mode but Habits (where the session has its own box)
function showSession() {
  const s = state.session, bar = $("sessionbar");
  bar.hidden = !s || mode === "habits" || (s.timer && mode === "focus");   // the Focus page shows its own timer
  if (bar.hidden) return;
  const l = sessionLine(s);
  $("sb-label").textContent = l.label;
  $("sb-time").textContent = l.time;
}
$("sb-open").onclick = () => setMode(state.session && state.session.timer ? "focus" : "habits");
$("sb-stop").onclick = () => { if (state.session && state.session.timer) pauseTimer(); else endSession("stop"); };

// a session saved before the page closed: carry on (or finish it, if its time ran out meanwhile)
if (state.session) habitTick();

// ================= the Habits page =================
let hbMonth = today().slice(0, 7);   // the calendar's month, "2026-10"
let hbRange = 7;                     // minutes by activity: the last 7 or 30 days
let hbPicked = "";                   // the day tapped in the calendar or a chart

const RING_LEN = 2 * Math.PI * 52;   // the today ring's outline (radius 52)
// today's minutes, the ring and the line under it (also every second while the page shows)
function liveToday() {
  const m = dayMinutes(today()), [lo, hi] = goalRange();
  $("hb-min").textContent = m;
  $("hb-goaltxt").textContent = "goal " + goalText();
  $("hb-bar").style.strokeDasharray = RING_LEN;
  $("hb-bar").style.strokeDashoffset = RING_LEN * (1 - Math.min(1, m / hi));
  // the small mark on the ring where the low end is (the part that counts)
  const a = 2 * Math.PI * lo / hi - Math.PI / 2;
  $("hb-lo").setAttribute("cx", 60 + 52 * Math.cos(a)); $("hb-lo").setAttribute("cy", 60 + 52 * Math.sin(a));
  $("hb-today").classList.toggle("met", m >= lo);
  $("hb-status").textContent = m >= hi ? "✓ Goal met, all the way to " + hi + " min. Great day!"
    : m >= lo ? "✓ Goal met! The ring fills on to " + hi + " min."
    : (lo - m) + " more min to " + (streak() ? "keep your streak" : "meet today's goal") + ".";
  const n = streak();
  $("hb-streak").textContent = n;
  $("hb-best").textContent = "Best: " + Math.max(n, bestStreak());
  sessionBox();
}

// the session box: start one, or the one running
function sessionBox() {
  const s = state.session;
  $("hb-start").hidden = !!s;
  $("hb-running").hidden = !s;
  $("hb-note").textContent = habitNote;
  if (!s) return;
  const l = sessionLine(s);
  $("hb-rlabel").textContent = l.label;
  $("hb-rtime").textContent = l.time;
  $("hb-rsub").textContent = s.timer ? "Pause it here or on the Focus page."
    : "Everything counts toward it until you stop" + (s.end ? " or the time runs out" : "") + ", even with Qarbon closed or the phone locked.";
}
setOptions($("hb-act"), SESSION_ACTS, "reading");
setOptions($("hb-len"), SESSION_LENGTHS.map(([v, t]) => [String(v), t]), "0");
$("hb-go").onclick = () => { beginSession($("hb-act").value, Number($("hb-len").value)); renderHabits(); };
$("hb-stop").onclick = () => { if (state.session && state.session.timer) pauseTimer(); else endSession("stop"); };
$("hb-goal").onchange = e => { state.goal = e.target.value; metToday = goalMet(today()); save(); renderHabits(); };

function renderHabits() {
  setOptions($("hb-goal"), Object.keys(GOALS).map(k => [k, k.replace("-", "–") + " min a day"]), state.goal);
  liveToday();
  drawCalendar();
  drawActs();
  drawReviews();
  drawMemory();
  drawForecast();
}

// ----- the calendar: one month, each day shaded by its minutes, ✓ when the goal was met -----
function drawCalendar() {
  const [y, mo] = hbMonth.split("-").map(Number), first = new Date(y, mo - 1, 1), t = today(), [lo, hi] = goalRange();
  $("hb-month").textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  $("hb-next").disabled = hbMonth >= t.slice(0, 7);
  const lead = (first.getDay() + 6) % 7;   // weeks start on Monday
  const days = new Date(y, mo, 0).getDate();
  let html = ["M", "T", "W", "T", "F", "S", "S"].map(d => `<span class="hb-wd">${d}</span>`).join("") + "<span></span>".repeat(lead);
  let met = 0;
  for (let i = 1; i <= days; i++) {
    const d = hbMonth + "-" + String(i).padStart(2, "0"), m = dayMinutes(d);
    // 0 = nothing, 1 = some time, 2 = goal met, 3 = the whole range
    const lvl = d > t ? -1 : m >= hi ? 3 : m >= lo ? 2 : m > 0 ? 1 : 0;
    if (lvl >= 2) met++;
    html += `<button class="hb-day" data-d="${d}" data-l="${lvl}"${d === t ? ' aria-current="date"' : ""}${d > t ? " disabled" : ""}
             aria-label="${d}: ${m} min${lvl >= 2 ? ", goal met" : ""}">${i}</button>`;
  }
  $("hb-cal").innerHTML = html;
  $("hb-calsum").textContent = met + (met === 1 ? " day" : " days") + " with the goal met this month";
  $("hb-cal").querySelectorAll(".hb-day:not([disabled])").forEach(b => { b.onclick = () => pickDay(b.dataset.d); });
  dayDetail();
}
$("hb-prev").onclick = () => { hbMonth = shiftMonth(hbMonth, -1); drawCalendar(); };
$("hb-next").onclick = () => { hbMonth = shiftMonth(hbMonth, 1); drawCalendar(); };
function shiftMonth(ym, n) { const [y, m] = ym.split("-").map(Number), d = new Date(y, m - 1 + n, 1); return iso(d).slice(0, 7); }

// tap a day (calendar or chart): what you did that day, under the calendar
function pickDay(d) { hbPicked = hbPicked === d ? "" : d; drawCalendar(); }
function dayDetail() {
  $("hb-cal").querySelectorAll(".hb-day").forEach(b => b.classList.toggle("picked", b.dataset.d === hbPicked));
  const box = $("hb-detail");
  box.hidden = !hbPicked;
  if (!hbPicked) return;
  const x = dayTotal(hbPicked), name = new Date(hbPicked + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const parts = Object.entries(x.s).filter(([, v]) => v >= 60).sort((a, b) => b[1] - a[1]).map(([k, v]) => ACTS[k] + " " + mins(Math.floor(v / 60)));
  box.textContent = name + ": " + mins(Math.floor(x.secs / 60)) + (goalMet(hbPicked) ? " ✓" : "") +
    (parts.length ? " · " + parts.join(", ") : "") + (x.r ? " · " + x.r + (x.r === 1 ? " card" : " cards") + " answered" : "");
}

// ----- minutes by activity: horizontal bars, the last 7 or 30 days -----
function drawActs() {
  const tot = {};
  for (let i = 0; i < hbRange; i++) for (const [k, v] of Object.entries(dayTotal(shiftDay(today(), -i)).s)) tot[k] = (tot[k] || 0) + v;
  const rows = Object.entries(tot).map(([k, v]) => [k, Math.floor(v / 60)]).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(r => r[1])), all = rows.reduce((n, r) => n + r[1], 0);
  $("hb-acts").innerHTML = rows.length ? rows.map(([k, m]) =>
    `<div class="hb-act"><span>${ACTS[k] || k}</span><i style="--f:${m / max}"></i><b>${mins(m)}</b></div>`).join("")
    : `<p class="hb-empty">Nothing yet. Time in Review, Reading, Focus and the other study modes shows up here.</p>`;
  $("hb-actsum").textContent = all ? mins(all) + " in all, about " + mins(Math.round(all / hbRange)) + " a day" : "";
  document.querySelectorAll("#hb-range button").forEach(b => b.setAttribute("aria-pressed", Number(b.dataset.n) === hbRange));
}
document.querySelectorAll("#hb-range button").forEach(b => { b.onclick = () => { hbRange = Number(b.dataset.n); drawActs(); }; });

// columns for the last or next few days. vals = [{ d, v, label }]; tap one to see its number in the caption
function columns(box, vals, caption, say) {
  const max = Math.max(1, ...vals.map(x => x.v));
  box.innerHTML = vals.map((x, i) => `<button class="hb-col" data-i="${i}" aria-label="${x.label}: ${say(x.v)}"><i style="--f:${x.v / max}"></i><span>${x.short}</span></button>`).join("");
  const show = i => {
    box.querySelectorAll(".hb-col").forEach(b => b.classList.toggle("picked", Number(b.dataset.i) === i));
    caption.textContent = vals[i].label + ": " + say(vals[i].v);
  };
  box.querySelectorAll(".hb-col").forEach(b => { b.onclick = () => show(Number(b.dataset.i)); });
  show(Math.max(0, vals.findIndex(x => x.today)));   // today's number shows first
}
const dayShort = d => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "narrow" });
const dayLong = d => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

// ----- cards answered per day, the last 14 days -----
function drawReviews() {
  const vals = [];
  for (let i = 13; i >= 0; i--) {
    const d = shiftDay(today(), -i), x = dayTotal(d);
    vals.push({ d, v: x.r, ok: x.ok, today: i === 0, short: dayShort(d), label: i === 0 ? "Today" : dayLong(d) });
  }
  columns($("hb-reviews"), vals, $("hb-revcap"), v => v + (v === 1 ? " card" : " cards"));
  const sum = vals.reduce((n, x) => n + x.v, 0);
  $("hb-revsum").textContent = sum ? sum + " cards in 14 days" : "No cards answered in the last 14 days yet.";
}

// ----- how well you remember: right answers in the last 30 days, and your cards by mastery step -----
function drawMemory() {
  let r = 0, ok = 0;
  for (let i = 0; i < 30; i++) { const x = dayTotal(shiftDay(today(), -i)); r += x.r; ok += x.ok; }
  $("hb-ret").textContent = r ? Math.round(100 * ok / r) + "%" : "–";
  $("hb-retsub").textContent = r ? "of " + r + " answers in the last 30 days were right (Hard, Good or Easy)" : "Answer some cards to see how well they stick.";
  // the course's cards in your binder, by their best direction's mastery step (js/cards.js)
  const k = course(), mine = cardsOf(k).filter(c => active(c) && inBinder(c)), steps = [0, 0, 0, 0, 0];
  mine.forEach(c => steps[Math.max(...dirsOf(k).map(d => masteryOf(c, d)))]++);
  const max = Math.max(1, ...steps);
  $("hb-mastery").innerHTML = !mine.length ? `<p class="hb-empty">No cards in your binder yet. Open a pack on the 🪐 Solar System to start.</p>` : steps.map((n, i) =>
    `<div class="hb-act hb-m" data-m="${i}"><span>${MASTERY[i]}</span><i style="--f:${n / max}"></i><b>${n}</b></div>`).join("");
  $("hb-mastsub").textContent = k.name + ": " + mine.length + " cards in your binder";
}

// ----- coming up: cards due each of the next 7 days (today includes any you're behind on) -----
function drawForecast() {
  const k = course(), t = today(), vals = [];
  const sides = cardsOf(k).filter(active).flatMap(c => dirsOf(k).map(d => sideOf(c, d))).filter(x => x.reviews > 0);
  for (let i = 0; i < 7; i++) {
    const d = shiftDay(t, i);
    const v = sides.filter(x => i === 0 ? x.due <= d : x.due === d).length;
    vals.push({ d, v, today: i === 0, short: i === 0 ? "Today" : dayShort(d), label: i === 0 ? "Today (and any you're behind on)" : dayLong(d) });
  }
  columns($("hb-forecast"), vals, $("hb-fcap"), v => v + (v === 1 ? " card due" : " cards due"));
  if (!sides.length) $("hb-fcap").textContent = "Nothing due yet: cards come back here once you've studied them.";
  $("hb-fsub").textContent = k.name + ", your next 7 days";
}

// ================= the home Earth: today's ring =================
// the line under it ("🔥 4-day streak · 12 of 10–20 min today") and a ring around the globe (habitsWorldSVG)
function habitsWorld() {
  const n = streak(), m = dayMinutes(today());
  $("ws-habits").textContent = (n ? "🔥 " + n + "-day streak · " : "") + m + " of " + goalText() + " today";
  $("w-hring").innerHTML = habitsWorldSVG();
}
function habitsWorldSVG() {
  const [lo, hi] = goalRange(), f = Math.min(1, dayMinutes(today()) / hi), C = 2 * Math.PI * 57;
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="57"/>
    <circle class="fill${dayMinutes(today()) >= lo ? " met" : ""}" cx="60" cy="60" r="57" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - f)).toFixed(1)}" transform="rotate(-90 60 60)"/></svg>`;
}
