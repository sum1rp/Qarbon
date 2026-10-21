// Qarbon · js/media.js: 🎧 Media mode, a 2005 iPod Video (the 5th generation, "iPod with video").
// The script files run in the order index.html lists them, and share one set of variables.
//
// It has no player of its own: it drives the same ONE player as the music panels (js/music.js):
// your files play in the one <audio>, and a YouTube video is shown in the iPod's screen by giving it a
// .playerslot there (placePlayer lays the one iframe over it). So switching modes never restarts the music.

// ================= the screens =================
// What the iPod shows is a pile ("stack") of screens: the main menu at the bottom, the one you're on at the top.
// MENU takes the top one off (back), choosing something puts a new one on.
// A menu screen: { title, items: a function that returns the rows, sel: the chosen row, top: the first row showing }
// Now Playing: { now: true, title: "Now Playing" }
// Add a Link: a menu with form: true (the link box shows above its rows). A page of text (About): { title, info: () => html }
// Each row: { label, go: what choosing it does, more: true if it opens another menu (shows ›), value: text on the right,
//             dim: true for a line you can't choose (like "No songs yet"), playing: true for the song that's playing,
//             pick: true for Add Files… (it opens the phone's file picker) }
const IP_ROWS = 7;                 // rows that fit on the screen under the title bar
const FORM_ROWS = 3;               // rows under the link box on the Add a Link screen
let ipStack = [];
const ipTop = () => ipStack[ipStack.length - 1];
const ipod = $("ipod");
// Can the wheel be the volume? Only on a computer. iPhones and iPads never let a page change the volume (some even
// say it worked when nothing changed), so on them, and on any touch screen, the wheel moves through the song instead.
const onIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const canVolume = !onIOS && !matchMedia("(pointer: coarse)").matches &&
                  (() => { const a = new Audio(); a.volume = .5; return a.volume === .5; })();
let ipScrub = false;               // Now Playing: true = the wheel moves through the song (on a Mac the wheel is the volume until you press the center)
let ipShowVol = 0, ipShowScrub = 0;  // when the volume / scrub bar was last touched (they hide again after 2 seconds)
let ipFull = false;                // full screen: the iPod fills the whole screen (see "full screen" below)

// the songs grouped by a tag ("artist" or "album"): [[name, [song numbers]], ...] sorted by name
function ipGroups(tag, unknown) {
  const map = new Map();
  mySongs.forEach((s, i) => { const k = s[tag] || unknown; if (!map.has(k)) map.set(k, []); map.get(k).push(i); });
  return [...map].sort((a, b) => a[0].localeCompare(b[0]));
}
const byTitle = list => list.slice().sort((a, b) => songName(mySongs[a]).localeCompare(songName(mySongs[b])));

// a menu of songs: choosing one plays it, and ⏮ ⏭ then go through this same list ("3 of 12")
function songsMenu(title, list) {
  return { title, items: () => list.length
    ? list.map((n, pos) => ({ label: songName(mySongs[n]), playing: musicKind === "file" && songIndex === n,
                              go: () => { playFrom(list, pos); ipOpen(nowScreen()); } }))
    : [{ label: "No songs yet", dim: true }, addFilesRow()] };
}
const nowScreen = () => ({ now: true, title: "Now Playing" });
const SKINS = { white: "White", fiber: "Qarbon Fiber", silver: "Silver", red: "Red", blue: "Blue", green: "Green", u2: "U2", neon: "Neon", clear: "Clear" };

function mainMenu() {
  return { title: "iPod", items: () => [
    { label: "Now Playing", more: true, go: () => ipOpen(nowScreen()) },   // always at the top
    { label: "Music", more: true, go: () => ipOpen(musicMenu()) },
    { label: "Videos", more: true, go: () => ipOpen(videosMenu()) },
    { label: "Add Music", more: true, go: () => ipOpen(addMenu()) },
    { label: "Shuffle Songs", go: () => { if (shuffleSongs()) ipOpen(nowScreen()); } },
    { label: "Settings", more: true, go: () => ipOpen(settingsMenu()) }
  ] };
}
function musicMenu() {
  return { title: "Music", items: () => [
    { label: "Playlists", more: true, go: () => ipOpen(playlistsMenu()) },
    { label: "Artists", more: true, go: () => ipOpen(groupMenu("Artists", "artist", "Unknown Artist")) },
    { label: "Albums", more: true, go: () => ipOpen(groupMenu("Albums", "album", "Unknown Album")) },
    { label: "Songs", more: true, go: () => ipOpen(songsMenu("Songs", byTitle(mySongs.map((s, i) => i)))) },
    { label: "Shuffle Songs", go: () => { if (shuffleSongs()) ipOpen(nowScreen()); } },
    { label: "On This Phone", value: String(mySongs.length), more: true, go: () => ipOpen(phoneMenu()) }
  ] };
}
// Artists or Albums: one row each, opening its songs (an album in its own order, an artist by album)
function groupMenu(title, tag, unknown) {
  return { title, items: () => {
    const groups = ipGroups(tag, unknown);
    if (!groups.length) return [{ label: "No songs yet", dim: true }];
    return groups.map(([name, list]) => ({ label: name, more: true, go: () => ipOpen(songsMenu(name, list)) }));
  } };
}
// two automatic playlists, like the iPod's "smart playlists"
function playlistsMenu() {
  return { title: "Playlists", items: () => [
    { label: "Recently Added", more: true, go: () => ipOpen(songsMenu("Recently Added",
        mySongs.map((s, i) => i).sort((a, b) => mySongs[b].added - mySongs[a].added).slice(0, 25))) },
    { label: "Played This Session", more: true, go: () => ipOpen(playedMenu()) }
  ] };
}
// what played this session (your files and links), newest first
function playedMenu() {
  return { title: "Played", items: () => played.length
    ? played.map((p, i) => ({ label: p.title || shortLink(p.link), playing: i === playedPos && !!nowPlaying(),
                              go: () => { playPlayed(i); ipOpen(nowScreen()); } }))
    : [{ label: "Nothing yet", dim: true }] };
}
// Videos: your YouTube and SoundCloud links (the one set now, and any played this session), then Add a Link…
// videoLinks: [{ p: the Played entry (or the saved link), i: its place in played, or -1 }]
function videoLinks() {
  const links = played.map((p, i) => ({ p, i })).filter(x => x.p.kind !== "File");
  if (state.music && !links.some(x => x.p.link === state.music))
    links.unshift({ p: { link: state.music, kind: musicEmbed(state.music) ? musicEmbed(state.music).kind : "" }, i: -1 });
  return links;
}
function videosMenu() {
  return { title: "Videos", items: () => {
    const links = videoLinks();
    const rows = links.map(({ p, i }) => ({ label: p.title || shortLink(p.link), value: p.kind === "SoundCloud" ? "☁" : "",
      playing: musicKind === "link" && p.link === state.music,
      go: () => { if (i >= 0) playPlayed(i); else playLink(p.link, true); ipOpen(nowScreen()); } }));
    return [...(links.length ? rows : [{ label: "No videos yet", dim: true }]), addLinkRow()];
  } };
}

// ----- adding music from inside the iPod (the same as the music panel under it, for full screen) -----
const addLinkRow = () => ({ label: "Add a Link…", more: true, go: () => ipOpen(linkScreen()) });
const addFilesRow = () => ({ label: "Add Files…", pick: true, go: pickFiles });
function addMenu() {
  return { title: "Add Music", items: () => [
    addLinkRow(),
    addFilesRow(),
    { label: "On This Phone", value: String(mySongs.length), more: true, go: () => ipOpen(phoneMenu()) }
  ] };
}
// Add Files…: the phone's file picker (the hidden <input type="file"> inside the iPod); addSongs plays the first one
function pickFiles() { unlockAudio(); $("ip-file").click(); }
$("ip-file").addEventListener("change", e => { wantJump(); addSongs([...e.target.files]); e.target.value = ""; });

// Add a Link: the link box above two rows. Paste reads the clipboard (the iPhone asks first: tap its "Paste" bubble).
function linkScreen() {
  formMsg("Tap the box to type or paste, or choose Paste.");
  return { title: "Add a Link", form: true, items: () => [
    { label: "Paste", go: pasteLink },
    { label: "Play", go: submitLink }
  ] };
}
function formMsg(text, wrong) { $("ip-fmsg").textContent = text; $("ip-fmsg").classList.toggle("ip-wrong", !!wrong); }
async function pasteLink() {
  try {
    $("ip-link").value = (await navigator.clipboard.readText()).trim();
    submitLink();
  } catch (e) { formMsg("Couldn't read the clipboard. Tap the box, then paste.", true); }
}
function submitLink() {
  const box = $("ip-link"), link = box.value.trim();
  if (!link) return formMsg("Paste or type a link first.", true);
  if (!musicEmbed(link)) return formMsg("That isn't a YouTube or SoundCloud link.", true);
  box.value = "";
  box.blur();
  unlockAudio();
  playLink(link, true);
  ipStack.pop();          // MENU from Now Playing goes back to where you came from, not to the link box
  ipOpen(nowScreen());
}
// keys in the link box: Enter (Go on the iPhone keyboard) plays it, Esc lets go of the box (then the arrow keys scroll again)
$("ip-link").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); submitLink(); }
  if (e.key === "Escape") { e.preventDefault(); $("ip-link").blur(); }
});

// On This Phone (your own music files): choose a song to play it or remove it from this phone
function phoneMenu() {
  return { title: "On This Phone", items: () => mySongs.length
    ? mySongs.map((s, i) => ({ label: songName(s), more: true, playing: musicKind === "file" && songIndex === i,
                               go: () => ipOpen(songMenu(s.id)) }))
    : [{ label: "No songs yet", dim: true }, addFilesRow()] };
}
// one song: songs are found by their id, because the numbers move when one is removed
const songAt = id => mySongs.findIndex(s => s.id === id);
function songMenu(id) {
  return { title: songName(mySongs[songAt(id)]), items: () => songAt(id) < 0 ? [{ label: "Removed", dim: true }] : [
    { label: "Play", go: () => { songList = null; playSong(songAt(id)); ipOpen(nowScreen()); } },
    { label: "Remove from Phone", more: true, go: () => ipOpen(removeMenu(id)) }
  ] };
}
// are you sure? (like the real iPod's "Reset All Settings": Cancel first, so a quick double press is safe)
function removeMenu(id) {
  return { title: "Remove Song", items: () => [
    { label: songName(mySongs[songAt(id)] || { name: "" }), dim: true },
    { label: "Cancel", go: ipBack },
    { label: "Remove", go: () => { if (songAt(id) >= 0) removeSong(songAt(id)); ipStack.length -= 2; renderMedia(); } }
  ] };
}

const onOff = b => b ? "On" : "Off";
function settingsMenu() {
  return { title: "Settings", items: () => [
    { label: "Shuffle", value: shuffleOn ? "Songs" : "Off", go: () => { shuffleOn = !shuffleOn; renderMusic(); } },
    { label: "Repeat", value: { off: "Off", one: "One", all: "All" }[repeatMode],
      go: () => { repeatMode = { off: "all", all: "one", one: "off" }[repeatMode]; renderMusic(); } },
    { label: "Clicker", value: onOff(state.ipodClick), go: () => { state.ipodClick = !state.ipodClick; save(); renderMedia(); } },
    { label: "Color", value: SKINS[state.ipodSkin], go: () => {
        const k = Object.keys(SKINS); state.ipodSkin = k[(k.indexOf(state.ipodSkin) + 1) % k.length]; save(); renderMedia(); } },
    { label: "Full Screen", value: onOff(ipFull), go: () => setFull(!ipFull) },
    { label: "Remove Music", dim: !nowPlaying(), go: clearMusic },   // the same as the music panel's Remove music
    { label: "About", more: true, go: () => ipOpen(aboutScreen()) }
  ] };
}
// About: like the real one (name, songs, videos, version), plus the iPhone note about playing in the background
function aboutScreen() {
  return { title: "About", info: () => `
    <b class="ip-aname">${state.ipodSkin === "fiber" ? "Qpod" : "iPod"}</b>
    <dl><dt>Songs</dt><dd>${mySongs.length}</dd><dt>Videos</dt><dd>${videoLinks().length}</dd>
        <dt>Version</dt><dd>${esc(BUILD.replace("Qarbon ", ""))}</dd></dl>
    <p><b>On iPhone:</b> YouTube and SoundCloud pause when the screen locks or you switch apps. Your own files usually keep playing.</p>
    <p><b>Full screen:</b> tap the corner button or hold MENU to leave it. On a Mac, F switches it on and off.</p>` };
}

// what's loaded now: "file", "YouTube", "SoundCloud", or "" for nothing
function nowPlaying() {
  if (musicKind === "file") return songIndex >= 0 ? "file" : "";
  const m = state.music && musicEmbed(state.music);
  return m ? m.kind : "";
}
// Shuffle Songs: shuffle on, all your songs, start with a random one. false if there are none.
function shuffleSongs() {
  if (!mySongs.length) return false;
  shuffleOn = true;
  playFrom(mySongs.map((s, i) => i), Math.floor(Math.random() * mySongs.length));
  return true;
}

// ================= moving around =================
function ipOpen(screen) { screen.sel = screen.sel || 0; screen.top = screen.top || 0; ipStack.push(screen); ipScrub = false; ipLeaveBox(); renderMedia(); }
function ipBack() { if (ipStack.length > 1) { ipStack.pop(); ipScrub = false; ipLeaveBox(); renderMedia(); } }
// leaving the Add a Link screen: let go of the link box (closes the iPhone keyboard)
function ipLeaveBox() { if (document.activeElement === $("ip-link")) $("ip-link").blur(); }
const rowsOf = s => s.form ? FORM_ROWS : IP_ROWS;   // how many rows show on this screen

// the wheel turned one step (+1 clockwise = down / forward / louder, -1 = up / back / quieter)
function ipTurn(step) {
  const s = ipTop();
  if (s.now) {
    if (nowPlaying() !== "file") return;          // YouTube/SoundCloud: their own players handle the song
    if (canVolume && !ipScrub) {                  // a Mac: the wheel is the volume
      audio.volume = Math.min(1, Math.max(0, Math.round((audio.volume + step * .05) * 100) / 100));
      ipShowVol = Date.now();
    } else if (audio.duration) {                  // move through the song: 1/60th of it per step (at least 2 seconds)
      audio.currentTime = Math.min(audio.duration - .5, Math.max(0, audio.currentTime + step * Math.max(2, audio.duration / 60)));
      ipShowScrub = Date.now();
    }
    ipClick();
    renderNow();
    return;
  }
  if (s.info) {                                   // a page of text: scroll it by about a row per step
    const t = $("ip-text"), was = t.scrollTop;
    t.scrollTop += step * t.clientHeight / 6;
    if (t.scrollTop !== was) ipClick();
    return;
  }
  const n = s.items().length, sel = Math.min(n - 1, Math.max(0, s.sel + step));
  if (sel === s.sel) return;                      // the end of the list: no click, like the real one
  s.sel = sel;
  if (sel < s.top) s.top = sel;                   // keep the chosen row on screen
  if (sel >= s.top + rowsOf(s)) s.top = sel - rowsOf(s) + 1;
  ipClick();
  renderMedia();
}
// the center button. fromWheel: pressed with a finger or mouse on the wheel (not a key or a tap on the screen)
let ipPickWaiting = false;   // Add Files… was pressed on the wheel: the file picker opens on the "click" that follows
function ipSelect(fromWheel) {
  const s = ipTop();
  ipClick();
  if (s.now) {                                    // Now Playing: switch the wheel between volume and moving through the song
    if (nowPlaying() === "file") { ipScrub = canVolume ? !ipScrub : true; ipShowScrub = Date.now(); renderNow(); }
    return;
  }
  if (s.info) return;                             // a page of text: nothing to choose
  const row = s.items()[s.sel];
  if (!row || row.dim || !row.go) return;
  // browsers only open a file picker from a "click" (or a key), so the wheel's press waits for its click (see below)
  if (row.pick && fromWheel) { ipPickWaiting = true; return; }
  unlockAudio();
  row.go();
  renderMedia();
}
// the four buttons on the wheel
function ipButton(which) {
  ipClick();
  unlockAudio();
  if (which === "menu") return ipBack();
  if (which === "play") return musicToggle();
  // ⏮: a song that's been playing a few seconds starts again; otherwise the one before
  if (which === "prev" && musicKind === "file" && audio.currentTime > 3) { audio.currentTime = 0; return; }
  musicStep(which === "next" ? 1 : -1);
}

// ================= the clicker: a tiny tick from the speaker, made with Web Audio =================
// Web Audio is the browser's sound kit: here a 4-millisecond burst of noise that fades out fast (sounds like "tk").
let ipSound = null;
function ipClick() {
  if (!state.ipodClick) return;
  try {
    if (!ipSound) ipSound = new (window.AudioContext || window.webkitAudioContext)();
    if (ipSound.state === "suspended") ipSound.resume();
    const len = Math.round(ipSound.sampleRate * .004), buf = ipSound.createBuffer(1, len, ipSound.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ipSound.createBufferSource(), vol = ipSound.createGain();
    src.buffer = buf; vol.gain.value = .35;
    src.connect(vol).connect(ipSound.destination);
    src.start();
  } catch (e) {}   // no Web Audio: just no tick
}

// ================= drawing it =================
const ICONS = {
  play: '<svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 10 10"><path d="M2 1h2.2v8H2zM5.8 1H8v8H5.8z" fill="currentColor"/></svg>',
  more: '<svg viewBox="0 0 6 10"><path d="M1 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
};
function isPlaying() { return musicKind === "file" ? songIndex >= 0 && !audio.paused : !!(linkPlaying && nowPlaying()); }

function renderMedia() {
  if (mode !== "media") return;
  if (!ipStack.length) ipOpen(mainMenu());
  if (ipJump && nowPlaying() && Date.now() - ipJump < 5000) { ipJump = 0; ipStack.length = 1; ipOpen(nowScreen()); return; }
  ipod.dataset.skin = state.ipodSkin;
  // the Color dropdown: the mini iPod and name of the chosen skin, and which one is ticked in the list
  $("ip-colormini").dataset.skin = state.ipodSkin;
  $("ip-colorname").textContent = SKINS[state.ipodSkin];
  $("ip-colorlist").querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", b.dataset.pick === state.ipodSkin));
  const s = ipTop();
  // the main menu's name: "Qpod" on the Qarbon Fiber iPod, "iPod" on the others
  $("ip-title").textContent = s === ipStack[0] && state.ipodSkin === "fiber" ? "Qpod" : s.title;
  $("ip-state").innerHTML = nowPlaying() ? (isPlaying() ? ICONS.play : ICONS.pause) : "";
  // YouTube plays in the screen; SoundCloud too in full screen (the screen is wide enough for its player there)
  const inScreen = nowPlaying() === "YouTube" || (ipFull && nowPlaying() === "SoundCloud");
  $("ip-list").hidden = !!(s.now || s.info);
  $("ip-now").hidden = !s.now || inScreen;            // a song, SoundCloud under the iPod, or "Nothing playing"
  $("ip-video").hidden = !s.now || !inScreen;         // a video (or SoundCloud's player), in the screen
  $("ip-video").classList.toggle("ip-sc", nowPlaying() === "SoundCloud");
  $("ip-form").hidden = !s.form;
  $("ip-text").hidden = !s.info;
  if (s.now) return renderNow();
  if (s.info) {   // a page of text: only redrawn when it changes, so the wheel's scrolling isn't lost
    const html = s.info();
    if ($("ip-text").dataset.html !== html) { $("ip-text").dataset.html = html; $("ip-text").innerHTML = html; }
    return;
  }
  // the menu: only the rows that fit, plus a scroll bar if there are more
  const items = s.items(), rows = rowsOf(s);
  s.sel = Math.min(s.sel, Math.max(0, items.length - 1));
  while (s.sel >= 0 && items[s.sel] && items[s.sel].dim && s.sel < items.length - 1) s.sel++;
  s.top = Math.min(s.top, Math.max(0, items.length - rows));
  const list = $("ip-list");
  list.classList.toggle("ip-scrolls", items.length > rows);
  list.classList.toggle("ip-underform", !!s.form);
  list.innerHTML = items.slice(s.top, s.top + rows).map((r, k) => {
    const i = s.top + k;
    return `<div class="ip-row${i === s.sel && !r.dim ? " ip-on" : ""}${r.dim ? " ip-dim" : ""}${r.playing ? " ip-playing" : ""}" data-row="${i}">` +
           `<span class="ip-l">${esc(r.label)}</span>${r.value ? `<span class="ip-v">${esc(r.value)}</span>` : ""}` +
           `${r.more ? `<span class="ip-more">${ICONS.more}</span>` : ""}</div>`;
  }).join("") + (items.length > rows
    ? `<div class="ip-scroll"><i style="top:${s.top / items.length * 100}%;height:${rows / items.length * 100}%"></i></div>` : "");
}

// Now Playing: the cover, the song, "3 of 12" and the progress bar (also called about 4 times a second while it plays)
function renderNow() {
  if (mode !== "media" || !ipTop().now) return;
  const what = nowPlaying(), box = $("ip-now");
  $("ip-state").innerHTML = what ? (isPlaying() ? ICONS.play : ICONS.pause) : "";
  if (!$("ip-video").hidden) { $("ip-vtitle").textContent = nowTitle(); return; }   // YouTube (or SoundCloud in full screen)
  const file = what === "file" ? mySongs[songIndex] : null, recent = Date.now() - 2000;
  const scrubbing = file && (ipScrub || (!canVolume && ipShowScrub > recent));
  box.classList.toggle("ip-scrub", !!scrubbing);
  box.classList.toggle("ip-volume", !!(file && canVolume && !ipScrub && ipShowVol > recent));
  const key = file ? "f" + songIndex + coverURL : what + nowTitle();
  if (box.dataset.key !== key) {   // the song changed: redraw the text and cover (otherwise only the bar moves)
    box.dataset.key = key;
    const art = file && coverURL ? `<img alt="" src="${coverURL}">` : `<span class="ip-noart">♪</span>`;
    $("ip-art").innerHTML = art + `<span class="ip-refl">${art}</span>`;
    $("ip-song").textContent = file ? songName(file) : what ? nowTitle() : "Nothing playing";
    $("ip-artist").textContent = file ? file.artist || "Unknown Artist" : what === "SoundCloud" ? "Player below" : "Choose a song in Music";
    $("ip-album").textContent = file ? file.album || "" : "";
  }
  // "3 of 12": where this song is in the list being played (worked out every time: the same song can be in a new list)
  const list = playingList();
  $("ip-count").textContent = file ? (list.indexOf(songIndex) + 1) + " of " + list.length : what === "SoundCloud" ? "SoundCloud" : "";
  const d = file ? audio.duration : 0, t = file ? audio.currentTime : 0;
  box.querySelector(".ip-pos").style.setProperty("--p", d ? t / d : 0);
  box.querySelector(".ip-pos").hidden = $("ip-times").hidden = !file;
  $("ip-played").textContent = clock(t);
  $("ip-left").textContent = d ? "-" + clock(d - t) : "";
  box.querySelector(".ip-vol .ip-bar").style.setProperty("--p", audio.volume);
}
// tap or drag along the progress bar to jump to that spot in the song
const ipPos = document.querySelector("#ip-now .ip-pos");
function seekTo(e) {
  if (nowPlaying() !== "file" || !audio.duration) return;
  const r = ipPos.getBoundingClientRect();
  audio.currentTime = Math.min(audio.duration - .5, Math.max(0, (e.clientX - r.left) / r.width * audio.duration));
  ipShowScrub = Date.now();
  renderNow();
}
ipPos.addEventListener("pointerdown", e => { ipPos.setPointerCapture(e.pointerId); seekTo(e); });
ipPos.addEventListener("pointermove", e => { if (ipPos.hasPointerCapture(e.pointerId)) seekTo(e); });
// hide the volume / scrub bar again 2 seconds after the wheel stops
setInterval(() => { if (mode === "media" && ipTop() && ipTop().now && (ipShowVol || ipShowScrub)) renderNow(); }, 500);

// the battery: the real level where the browser tells us (Chrome on a Mac); iPhones don't, so it shows full
if (navigator.getBattery) navigator.getBattery().then(b => {
  const show = () => { $("ip-batt").style.setProperty("--lvl", b.level); $("ip-batt").classList.toggle("low", b.level < .2); };
  show();
  b.addEventListener("levelchange", show);
}).catch(() => {});

// ================= the click wheel: turning and pressing =================
// A "pointer" is a finger or a mouse. While it's down on the wheel we follow its angle around the center:
// every 18° (20 steps per turn) is one step. If it barely moved, it was a press: which button depends on where.
const ipWheel = $("ip-wheel");
// the Qarbon atom on the center button (the logo's atomSVG from js/look.js); the styles only show it on Qarbon Fiber
ipWheel.querySelector(".ip-center").innerHTML = `<span class="ip-atom">${atomSVG(5)}</span>`;
const IP_STEP = Math.PI / 10;
let ipDrag = null;   // { last angle, turned so far, start x/y, moved: turned enough to count as turning, zone: the button under it }
function wheelSpot(e) {
  const r = ipWheel.getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
  return { a: Math.atan2(y, x), dist: Math.hypot(x, y) / (r.width / 2) };
}
// which button a spot is on: the middle, or by its angle (0° = right, 90° = down)
function wheelZone(p) {
  if (p.dist < .38) return "center";
  const deg = p.a * 180 / Math.PI;
  return deg > -135 && deg < -45 ? "menu" : deg >= -45 && deg <= 45 ? "next" : deg > 45 && deg < 135 ? "play" : "prev";
}
ipWheel.addEventListener("pointerdown", e => {
  const p = wheelSpot(e);
  ipDrag = { last: p.a, acc: 0, x: e.clientX, y: e.clientY, moved: false, zone: wheelZone(p) };
  ipPickWaiting = false;
  ipWheel.setPointerCapture(e.pointerId);
  ipWheel.classList.toggle("ip-press-c", ipDrag.zone === "center");
  if (state.ipodClick && !ipSound) ipClick();   // the first touch wakes up Web Audio (it has to start from a tap)
  // full screen: holding MENU for 0.7 seconds leaves it
  if (ipFull && ipDrag.zone === "menu") {
    const drag = ipDrag;
    drag.hold = setTimeout(() => { if (ipDrag === drag && !drag.moved) { drag.held = true; ipClick(); setFull(false); } }, 700);
  }
});
ipWheel.addEventListener("pointermove", e => {
  if (!ipDrag) return;
  const p = wheelSpot(e);
  if (p.dist < .25) { ipDrag.last = p.a; return; }   // too close to the middle: the angle jumps around there
  let d = p.a - ipDrag.last;
  if (d > Math.PI) d -= 2 * Math.PI;                  // crossing from +180° to -180° (or back) is a small move, not a big one
  if (d < -Math.PI) d += 2 * Math.PI;
  ipDrag.last = p.a;
  ipDrag.acc += d;
  if (Math.abs(ipDrag.acc) > IP_STEP * .6) {
    ipDrag.moved = true; clearTimeout(ipDrag.hold);
    ipWheel.classList.add("ip-turning"); ipWheel.classList.remove("ip-press-c");
  }
  while (Math.abs(ipDrag.acc) >= IP_STEP) {
    const step = Math.sign(ipDrag.acc);
    ipDrag.acc -= step * IP_STEP;
    ipTurn(step);
  }
});
function wheelUp(e) {
  if (!ipDrag) return;
  clearTimeout(ipDrag.hold);
  const tap = !ipDrag.moved && !ipDrag.held && Math.hypot(e.clientX - ipDrag.x, e.clientY - ipDrag.y) < 14;
  ipWheel.classList.remove("ip-turning", "ip-press-c");
  if (tap && e.type === "pointerup") {
    if (ipDrag.zone === "center") ipSelect(true);
    else ipButton(ipDrag.zone);
  }
  ipDrag = null;
}
ipWheel.addEventListener("pointerup", wheelUp);
ipWheel.addEventListener("pointercancel", wheelUp);
// Add Files… chosen with the center button: the click that follows the press opens the file picker
ipWheel.addEventListener("click", () => { if (ipPickWaiting) { ipPickWaiting = false; pickFiles(); } });
// a mouse's scroll wheel or a trackpad turns it too (on a Mac)
let ipWheelAcc = 0;
ipWheel.addEventListener("wheel", e => {
  e.preventDefault();
  ipWheelAcc += e.deltaY;
  while (Math.abs(ipWheelAcc) >= 40) { const s = Math.sign(ipWheelAcc); ipWheelAcc -= s * 40; ipTurn(s); }
}, { passive: false });
// the buttons themselves are for the keyboard (Tab to one, then Enter); fingers and mice go through the wheel above
ipWheel.querySelectorAll("button").forEach(b => b.addEventListener("click", e => {
  if (e.detail) return;   // a real click (detail > 0) was already handled by the wheel
  if (b.dataset.ip === "center") ipSelect(); else ipButton(b.dataset.ip);
}));
// tapping a row on the screen chooses it (an extra the real one didn't have, but handy on a phone)
$("ip-list").addEventListener("click", e => {
  const r = e.target.closest("[data-row]");
  if (!r) return;
  const s = ipTop(), i = +r.dataset.row;
  if (s.items()[i] && s.items()[i].dim) return;
  s.sel = i;
  ipSelect();
});
// keys on a Mac: ↑ ↓ scroll, Enter = center, Esc or Delete = MENU, Space = ▶❚❚, ← → = ⏮ ⏭, F = full screen on/off.
// In full screen, Esc on the main menu leaves full screen.
document.addEventListener("keydown", e => {
  if (mode !== "media" || $("study").hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;   // typing in a box (like the link box)
  // not while using another button (a wheel button already does Enter / Space itself)
  if (e.target !== document.body && (!e.target.closest("#ipod") || ["Enter", " "].includes(e.key))) return;
  const back = () => ipFull && ipStack.length === 1 ? setFull(false) : ipButton("menu");
  const k = { ArrowUp: () => ipTurn(-1), ArrowDown: () => ipTurn(1), Enter: () => ipSelect(), Escape: back,
              Backspace: back, " ": () => ipButton("play"), ArrowLeft: () => ipButton("prev"), ArrowRight: () => ipButton("next"),
              f: () => setFull(!ipFull), F: () => setFull(!ipFull) }[e.key];
  if (k) { e.preventDefault(); k(); }
});

// ================= full screen =================
// The iPod fills the whole screen: a layer fixed to the screen (iPhones only allow real full screen for videos).
// Only classes change, nothing is moved, so the music never restarts: the one player just follows the iPod's screen.
// The styles ("#media.ip-full") size it to the visible screen, inside the notch and home bar, and hide the rest of the page.
let ipScrollY = 0;   // where the page was scrolled, to go back there afterwards
function setFull(on) {
  if (on === ipFull) return;
  ipFull = on;
  if (on) ipScrollY = scrollY;
  $("media").classList.toggle("ip-full", on);
  $("ip-fs").setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
  $("ip-fs").title = on ? "Exit full screen" : "Full screen";
  // let go of the button you pressed (it's hidden now), so the keys work the iPod straight away
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  scrollTo(0, on ? 0 : ipScrollY);
  renderMedia();
}
// the corner button switches it on and off
$("ip-fs").addEventListener("click", () => { ipClick(); setFull(!ipFull); });

// ================= under the iPod: its color =================
// the Color dropdown's list: one button per skin, each with a mini iPod in that skin's colors (the same CSS as the big one)
$("ip-colorlist").innerHTML = Object.entries(SKINS).map(([k, name]) =>
  `<button role="radio" aria-checked="false" data-pick="${k}"><span class="ip-mini" data-skin="${k}" aria-hidden="true"><i></i></span>${name}</button>`).join("");
$("ip-colorlist").addEventListener("click", e => {
  const b = e.target.closest("[data-pick]");
  if (!b) return;
  state.ipodSkin = b.dataset.pick;
  save();
  $("ip-color").open = false;   // close the dropdown once you've chosen
  renderMedia();
});
// The music panel under the iPod is run by js/music.js, like the other two. When you start something from it
// (a link, a song from your lists, new files), the iPod jumps to Now Playing. Songs take a moment to load,
// so this only notes "jump when it starts" (ipJump), and renderMedia does it once the music has changed.
let ipJump = 0;   // when you asked (0 = no jump waiting); it's forgotten after 5 seconds
const wantJump = () => { ipJump = Date.now(); };
// { capture: true }: hear the tap on the way down to the button, before the button's own code starts the music
$("ip-music").addEventListener("click", e => { if (e.target.closest(".musicset, [data-song], [data-played]")) wantJump(); }, { capture: true });
$("ip-music").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches(".musicurl")) wantJump(); }, { capture: true });
$("ip-music").addEventListener("change", e => { if (e.target.matches(".musicfile")) wantJump(); }, { capture: true });

// after choosing 🎧 Media in the Mode menu, let go of the menu, so the arrow keys scroll the iPod (not change the mode).
// Another mode: full screen ends (it belongs to Media)
$("modeselect").addEventListener("change", () => { if (mode === "media") $("modeselect").blur(); else setFull(false); });

// keep the iPod in step with the music: renderMusic (js/music.js) calls these after every change
musicWatchers.push(renderMedia);
audio.addEventListener("timeupdate", renderNow);
audio.addEventListener("volumechange", renderNow);
