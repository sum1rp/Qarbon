// Qarbon · js/start.js: starts the app (this runs last).
// The script files run in the order index.html lists them, and share one set of variables.

// ================= start =================
syncTimerUI();
show("home");   // (also fills in the little lines under the worlds)
showAccount();
if (auth) setTimeout(syncNow, 500);   // signed in: catch up with your other devices
if (!storageOK) $("msg").textContent = "Heads up: this browser is blocking saving (private window?). Progress won't be kept.";
$("boot").hidden = true;   // only reached if everything above ran without a crash
