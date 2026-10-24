// Qarbon · js/basics.js: error catcher, version number, small helpers and settings lists.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= error catcher: any problem shows up on the page itself =================
function showError(msg) {
  const b = document.getElementById("boot");
  if (!b) return;
  b.hidden = false;
  b.classList.add("err");
  b.textContent = "Something broke: " + msg + "  —  open the console (Chrome: Cmd+Option+J) and tell Claude what it says.";
}
window.addEventListener("error", e => showError((e.message || "unknown error") + (e.lineno ? " (line " + e.lineno + ")" : "")));
window.addEventListener("unhandledrejection", e => showError(String((e.reason && e.reason.message) || e.reason)));

// ================= basics =================
const BUILD = "Qarbon 2.16.1 (build 65)";   // bump together with ?v= in index.html
const KEY = "flashcards-v1";   // same key as before, so existing progress carries over
const $ = id => document.getElementById(id);
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const today = () => iso(new Date());
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); }

const VOICES = { female: "Amélie", male: "Thomas" };
const PER_DAY_CHOICES = [10, 20, 30];
// card directions, chosen per deck in ⚙ settings
const DIRECTIONS = { fr: "French → English", en: "English → French", both: "Both directions" };
// the French course (Level 1 to Level 6 as one deck, build 64) and the deck ids it replaced (the six Levels and "All my cards")
const COURSE_ID = "french";
const OLD_STACKS = ["beginner150", "level2", "level3", "level4", "level5", "level6", "all"];
// minutes for each timer style. Pomodoro: 25 focus, 5 break, a longer 15 break after every 4th focus.
// "every" = how many focus sessions before a long break (1 = no long breaks). "Custom" uses state.customTimer.
const TIMER_MODES = {
  pomodoro: { label: "Pomodoro 25/5",       focus: 25, short: 5,  long: 15, every: 4 },
  p50:      { label: "Long Pomodoro 50/10", focus: 50, short: 10, long: 30, every: 3 },
  p52:      { label: "52/17",               focus: 52, short: 17, long: 17, every: 1 },
  p90:      { label: "Deep work 90/20",     focus: 90, short: 20, long: 20, every: 1 },
  m15:      { label: "15 min",              focus: 15, short: 3,  long: 3,  every: 1 },
  m30:      { label: "30 min",              focus: 30, short: 5,  long: 5,  every: 1 },
  hour:     { label: "1 hour",              focus: 60, short: 10, long: 10, every: 1 }
};
const CUSTOM_LIMITS = { focus: [1, 180], short: [1, 60], long: [1, 90], every: [1, 12] };   // [smallest, largest]
