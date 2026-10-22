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
// The Visualizer: { viz: true, title: "Visualizer" } (see "the Visualizer" below)
// Each row: { label, go: what choosing it does, more: true if it opens another menu (shows ›), value: text on the right,
//             dim: true for a line you can't choose (like "No songs yet"), playing: true for the song that's playing,
//             pick: true for Add Files… and Album Art's rows (they open the phone's file or photo picker) }
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
  return { title: "Qpod", items: () => [
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
    { label: "Album Art", more: true, go: () => ipOpen(artMenu(id)) },
    { label: "Remove from Phone", more: true, go: () => ipOpen(removeMenu(id)) }
  ] };
}
// a picture for the song (or its whole album), or back to the cover from the file's tags (see "album art" in js/music.js)
function artMenu(id) {
  return { title: "Album Art", items: () => {
    const s = mySongs[songAt(id)];
    if (!s) return [{ label: "Removed", dim: true }];
    const album = albumSongs(s), ids = album.map(x => x.id), rows = [];
    if (album.length > 1) rows.push({ label: "This Song…", pick: true, go: () => pickArt([id]) },
                                    { label: "Whole Album…", value: String(album.length), pick: true, go: () => pickArt(ids) });
    else rows.push({ label: "Choose Picture…", pick: true, go: () => pickArt([id]) });
    if (s.art) rows.push({ label: s.cover ? "Original Art" : "Remove Picture", go: () => setSongArt([id], null) });
    if (album.length > 1 && album.some(x => x !== s && x.art)) rows.push({ label: "Original for Album", go: () => setSongArt(ids, null) });
    return rows;
  } };
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
    { label: "Visualizer", value: VIZ_LOOKS[state.ipodViz], go: () => { nextLook(); renderMedia(); } },
    { label: "Remove Music", dim: !nowPlaying(), go: clearMusic },   // the same as the music panel's Remove music
    { label: "About", more: true, go: () => ipOpen(aboutScreen()) }
  ] };
}
// About: like the real one (name, songs, videos, version), plus the iPhone note about playing in the background
function aboutScreen() {
  return { title: "About", info: () => `
    <b class="ip-aname">Qpod</b>
    <dl><dt>Songs</dt><dd>${mySongs.length}</dd><dt>Videos</dt><dd>${videoLinks().length}</dd>
        <dt>Version</dt><dd>${esc(BUILD.replace("Qarbon ", ""))}</dd></dl>
    <p><b>On iPhone:</b> YouTube and SoundCloud pause when the screen locks or you switch apps. Your own files usually keep playing.</p>
    <p><b>YouTube tip:</b> play the video full screen (its ⛶ button), lock the phone, then press ▶ on the lock screen. It keeps playing, and the screen being off saves battery.</p>
    <p><b>Full screen:</b> tap the corner button or hold MENU to leave it. On a Mac, F switches it on and off.</p>
    <p><b>Visualizer:</b> press the center on Now Playing, or tap the bottom-left button. Your own songs only.</p>` };
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
function ipBack() {
  if (ipStack.length > 1) { ipStack.pop(); ipScrub = false; ipLeaveBox(); renderMedia(); }
  else if (miniFrom) miniBack();   // MENU on the main menu: back to the mode the mini Qpod brought you from
}
// leaving the Add a Link screen: let go of the link box (closes the iPhone keyboard)
function ipLeaveBox() { if (document.activeElement === $("ip-link")) $("ip-link").blur(); }
const rowsOf = s => s.form ? FORM_ROWS : IP_ROWS;   // how many rows show on this screen

// the wheel turned one step (+1 clockwise = down / forward / louder, -1 = up / back / quieter)
function ipTurn(step) {
  const s = ipTop();
  if (s.now || s.viz) {                           // (in the Visualizer the wheel always moves through the song)
    if (nowPlaying() !== "file") return;          // YouTube/SoundCloud: their own players handle the song
    if (canVolume && !ipScrub && !s.viz) {        // a Mac: the wheel is the volume
      audio.volume = Math.min(1, Math.max(0, Math.round((audio.volume + step * .05) * 100) / 100));
      ipShowVol = Date.now();
    } else if (audio.duration) {                  // move through the song: 1/60th of it per step (at least 2 seconds)
      audio.currentTime = Math.min(audio.duration - .5, Math.max(0, audio.currentTime + step * Math.max(2, audio.duration / 60)));
      ipShowScrub = Date.now();
    }
    ipClick();
    if (s.viz) vizKick(); else renderNow();
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
let ipPickWaiting = false;   // a row that opens a picker was pressed on the wheel: its go() runs on the "click" that follows
function ipSelect(fromWheel) {
  const s = ipTop();
  ipClick();
  // Now Playing: on a Mac the first press switches the wheel from the volume to moving through the song, the next one
  // opens the Visualizer. On an iPhone the wheel already moves through the song, so one press opens it.
  if (s.now) {
    if (canVolume && !ipScrub && nowPlaying() === "file") { ipScrub = true; ipShowScrub = Date.now(); renderNow(); }
    else openViz();
    return;
  }
  if (s.viz) {                                    // the Visualizer: the next look
    nextLook();
    return vizKick();
  }
  if (s.info) return;                             // a page of text: nothing to choose
  const row = s.items()[s.sel];
  if (!row || row.dim || !row.go) return;
  // browsers only open a file picker from a "click" (or a key), so the wheel's press waits for its click (see below)
  if (row.pick && fromWheel) { ipPickWaiting = row.go; return; }
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
  $("ip-title").textContent = s.title;
  $("ip-state").innerHTML = nowPlaying() ? (isPlaying() ? ICONS.play : ICONS.pause) : "";
  // YouTube plays in the screen; SoundCloud too in full screen (the screen is wide enough for its player there)
  const inScreen = nowPlaying() === "YouTube" || (ipFull && nowPlaying() === "SoundCloud");
  $("ip-list").hidden = !!(s.now || s.info || s.viz);
  $("ip-viz").hidden = !s.viz;
  $("ip-vz").setAttribute("aria-pressed", !!s.viz);
  $("ip-now").hidden = !s.now || inScreen;            // a song, SoundCloud under the iPod, or "Nothing playing"
  $("ip-video").hidden = !s.now || !inScreen;         // a video (or SoundCloud's player), in the screen
  $("ip-video").classList.toggle("ip-sc", nowPlaying() === "SoundCloud");
  $("ip-form").hidden = !s.form;
  $("ip-text").hidden = !s.info;
  if (!s.viz) ipod.classList.remove("ip-nohead");
  if (s.now) return renderNow();
  if (s.viz) return vizKick();
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
// tap or drag along the progress bar (or the Visualizer's waveform: el) to jump to that spot in the song
const ipPos = document.querySelector("#ip-now .ip-pos");
function seekTo(e, el = ipPos) {
  if (nowPlaying() !== "file" || !audio.duration) return;
  const r = el.getBoundingClientRect();
  audio.currentTime = Math.min(audio.duration - .5, Math.max(0, (e.clientX - r.left) / r.width * audio.duration));
  ipShowScrub = Date.now();
  if (ipTop().viz) vizKick(); else renderNow();
}
ipPos.addEventListener("pointerdown", e => { ipPos.setPointerCapture(e.pointerId); seekTo(e); });
ipPos.addEventListener("pointermove", e => { if (ipPos.hasPointerCapture(e.pointerId)) seekTo(e); });
// hide the volume / scrub bar again 2 seconds after the wheel stops (in the Visualizer: its scrub line)
setInterval(() => {
  if (mode !== "media" || !ipTop() || !(ipShowVol || ipShowScrub)) return;
  if (ipTop().now) renderNow();
  if (ipTop().viz && Date.now() - ipShowScrub < 2600) vizKick();   // (only just after scrubbing: no redrawing a paused song)
}, 500);

// the battery: the real level where the browser tells us (Chrome on a Mac); iPhones don't, so it shows full
if (navigator.getBattery) navigator.getBattery().then(b => {
  const show = () => { $("ip-batt").style.setProperty("--lvl", b.level); $("ip-batt").classList.toggle("low", b.level < .2); };
  show();
  b.addEventListener("levelchange", show);
}).catch(() => {});

// ================= the Visualizer: pictures of your own songs =================
// Opened from Now Playing with the center button (like the real iPod's Now Playing screens), or the button in the
// iPod's bottom-left corner. Inside it the wheel moves through the song, the center switches the look, MENU goes back.
// Looks (state.ipodViz): "wave", the whole song as a SoundCloud-style waveform that fills in purple as it plays;
// "itunes", bars and a glowing wave moving with the music, like iTunes' visualizer in the 2000s; and "space", a slow flight
// through stars and nebulas (see "space" below). The center button goes through them in that order.
//
// The safe way: the playing <audio> is NEVER connected to Web Audio. (An iPhone pauses Web Audio when the screen locks,
// so your music would stop.) Instead the song's bytes, already stored on this device, are decoded once on the side into
// plain numbers, "the analysis": how loud each slice of the song is, and how much bass, middle and treble each 30th of a
// second has. Drawing only looks those numbers up for the spot the song is at (audio.currentTime).
// The analysis is small (about 1.5 MB for a 10-minute song), so it's kept in IndexedDB ("songviz") for next time.
const VIZ_RATE = 11025;   // samples per second to analyze (a quarter of CD quality: plenty for pictures, 4× less work)
const VIZ_FPS = 30;       // analysis frames per second (the iTunes look moves at this speed)
const VIZ_FFT = 512;      // samples per frame for splitting the sound into pitches (an "FFT", see makeFFT)
const VIZ_BANDS = 20;     // bars in the iTunes look, from deep bass (left) to treble (right)
const VIZ_COLS = 800;     // slices of the whole-song waveform
const VIZ_PTS = 64;       // points along the glowing wave
const VIZ_V = 1;          // the analysis' version: change it when the analysis changes, so saved ones are made again
const VIZ_LOOKS = { wave: "Waveform", itunes: "iTunes", space: "Space" };
// the next look (the center button in the Visualizer, and Settings › Visualizer), with its name showing for a moment
function nextLook() {
  const k = Object.keys(VIZ_LOOKS);
  state.ipodViz = k[(k.indexOf(state.ipodViz) + 1) % k.length];
  save();
  vizKey = "";
  vizLabelAt = performance.now();
}
// the waveform's played part: "gamma purple", an electric violet (top of the bars, bottom, and their reflection)
const VIZ_PURPLE = { top: "#d08cff", base: "#7a2cff", under: "rgba(150,80,255,.36)" };
const vizScreen = () => ({ viz: true, title: "Visualizer" });

// An FFT ("fast Fourier transform") splits a short piece of sound into its pitches: how much of each it has.
// makeFFT(N) prepares the tables once and returns a function that does it to re (the samples) and im (zeros), in place.
function makeFFT(N) {
  const bits = Math.log2(N), rev = new Uint16Array(N), cos = new Float32Array(N / 2), sin = new Float32Array(N / 2);
  for (let i = 0; i < N; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= (i >> b & 1) << (bits - 1 - b); rev[i] = r; }
  for (let i = 0; i < N / 2; i++) { cos[i] = Math.cos(2 * Math.PI * i / N); sin[i] = -Math.sin(2 * Math.PI * i / N); }
  return (re, im) => {
    for (let i = 0; i < N; i++) {
      const j = rev[i];
      if (j > i) { let x = re[i]; re[i] = re[j]; re[j] = x; x = im[i]; im[i] = im[j]; im[j] = x; }
    }
    for (let size = 2; size <= N; size *= 2) {
      const half = size / 2, step = N / size;
      for (let i = 0; i < N; i += size) for (let k = 0; k < half; k++) {
        const c = cos[k * step], s = sin[k * step], a = i + k, b = a + half;
        const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  };
}

// the 99th-percentile value of a list (the "nearly loudest", so one loud click doesn't make everything else look quiet)
function nearTop(list) {
  const some = [];
  for (let i = 0; i < list.length; i += Math.max(1, Math.floor(list.length / 20000))) some.push(list[i]);
  some.sort((a, b) => a - b);
  return some[Math.floor(some.length * .99)] || 0;
}

// read, decode and analyze one song. note(phase, fraction) tells the screen how far along it is.
async function analyzeSong(id, note) {
  note("decode", 0);
  const rec = await fileDo("songs", "readonly", st => st.get(id));
  if (!rec) throw new Error("This song isn't on this device any more.");
  const t0 = performance.now();
  // decoding = turning the compressed file (MP3, M4A…) back into sound samples. An OfflineAudioContext does it on the side:
  // it never plays anything, and has nothing to do with the <audio> that's playing your music.
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  let off;
  try { off = new Off(1, VIZ_RATE, VIZ_RATE); } catch (e) { off = new Off(1, 44100, 44100); }   // older Safari: only normal rates
  const buf = await new Promise((ok, fail) => off.decodeAudioData(rec.data, ok, fail));
  const t1 = performance.now();
  // mix the channels into one ("mono"), and if it came out at a higher rate, average groups of samples down to about VIZ_RATE
  let s = buf.getChannelData(0), rate = buf.sampleRate;
  for (let c = 1; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < s.length; i++) s[i] += d[i]; }
  const k = Math.max(1, Math.round(rate / VIZ_RATE));
  if (k > 1) {
    const m = new Float32Array(Math.floor(s.length / k));
    for (let i = 0; i < m.length; i++) { let a = 0; for (let j = 0; j < k; j++) a += s[i * k + j]; m[i] = a / k; }
    s = m; rate /= k;
  }
  const n = s.length, dur = n / rate;
  // the whole-song waveform: how loud each of VIZ_COLS slices is (the "RMS", a kind of average loudness)
  const cols = new Float32Array(VIZ_COLS);
  for (let c = 0; c < VIZ_COLS; c++) {
    const a = Math.floor(c * n / VIZ_COLS), b = Math.max(a + 1, Math.floor((c + 1) * n / VIZ_COLS));
    let sum = 0;
    for (let i = a; i < b && i < n; i++) sum += s[i] * s[i];
    cols[c] = Math.sqrt(sum / (b - a));
  }
  // the frames: for each 30th of a second, how strong each band of pitches is, how loud it is, and the shape of the wave
  const frames = Math.max(1, Math.floor(dur * VIZ_FPS));
  const db = new Float32Array(frames * VIZ_BANDS), lv = new Float32Array(frames), wave = new Int8Array(frames * VIZ_PTS);
  // where each band starts in the FFT's output, spaced evenly in octaves (like piano keys) from 40 Hz to near the top
  const bin = rate / VIZ_FFT, edges = [];
  for (let b = 0; b <= VIZ_BANDS; b++)
    edges.push(Math.max(b ? edges[b - 1] + 1 : 1, Math.round(40 * Math.pow(rate * .45 / 40, b / VIZ_BANDS) / bin)));
  const fft = makeFFT(VIZ_FFT), re = new Float32Array(VIZ_FFT), im = new Float32Array(VIZ_FFT);
  const hann = Float32Array.from({ length: VIZ_FFT }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / VIZ_FFT));   // softens the edges of each piece
  for (let f = 0; f < frames; f++) {
    const mid = Math.floor(f * rate / VIZ_FPS), start = mid - VIZ_FFT / 2;
    let sum = 0;
    for (let i = 0; i < VIZ_FFT; i++) { const x = s[start + i] || 0; re[i] = x * hann[i]; im[i] = 0; sum += x * x; }
    lv[f] = Math.sqrt(sum / VIZ_FFT);
    fft(re, im);
    for (let b = 0; b < VIZ_BANDS; b++) {
      let p = 0;
      for (let j = edges[b]; j < edges[b + 1]; j++) p += re[j] * re[j] + im[j] * im[j];
      // in decibels (closer to how ears hear loudness), plus 3 dB per octave, so the treble isn't drowned out by the bass
      db[f * VIZ_BANDS + b] = 10 * Math.log10(p / (edges[b + 1] - edges[b]) + 1e-12) + 3 * Math.log2(edges[b] * bin / 40);
    }
    // the wave's shape: 64 points from the middle of the frame, made as tall as fits (its height comes from the loudness)
    let big = 1e-9;
    for (let q = 0; q < VIZ_PTS; q++) big = Math.max(big, Math.abs(s[mid - VIZ_PTS + 2 * q] || 0));
    for (let q = 0; q < VIZ_PTS; q++) wave[f * VIZ_PTS + q] = Math.round((s[mid - VIZ_PTS + 2 * q] || 0) / big * 127);
    if (f % 500 === 499) { note("analyze", f / frames); await new Promise(r => setTimeout(r)); }   // let the page breathe
  }
  // scale everything to 0–255 (one byte each): the bands over the top 45 dB, loudness and the waveform up to their near-top
  const topDb = nearTop(db), topLv = nearTop(lv) || 1, topCol = Math.max(...cols) || 1;
  const bands = Uint8Array.from(db, v => Math.max(0, Math.min(255, (v - topDb + 45) / 45 * 255)));
  const level = Uint8Array.from(lv, v => Math.min(255, Math.sqrt(v / topLv) * 255));   // the square root lifts the quiet parts
  return { v: VIZ_V, dur, frames, cols: Uint8Array.from(cols, v => v / topCol * 255), bands, level, wave,
           ms: { decode: Math.round(t1 - t0), analyze: Math.round(performance.now() - t1) } };
}

// the analyses: the last 3 songs in memory, the rest in IndexedDB, and the one being made (one at a time is plenty)
const vizCache = new Map();   // song id → its analysis, or { failed: true }
const vizJobs = new Map();    // song id → the promise of its analysis
let vizWork = null;           // the one being made: { id, phase: "decode" or "analyze", p: how far, 0 to 1 }
function vizFor(id) {
  if (vizCache.has(id)) return Promise.resolve(vizCache.get(id));
  if (!vizJobs.has(id)) vizJobs.set(id, (async () => {
    let a = null;
    try { a = await fileDo("songviz", "readonly", st => st.get(id)); } catch (e) {}
    if (!a || a.v !== VIZ_V) {
      try {
        a = await analyzeSong(id, (phase, p) => { vizWork = { id, phase, p }; vizWaitShow(); });
        fileDo("songviz", "readwrite", st => st.put(a, id)).catch(() => {});   // save it for next time (if there's room)
      } catch (e) { a = { failed: true }; }
    }
    vizWork = null;
    vizCache.set(id, a);
    if (vizCache.size > 3) vizCache.delete(vizCache.keys().next().value);   // forget the oldest
    vizJobs.delete(id);
    drawViz();
    return a;
  })());
  return vizJobs.get(id);
}

// ----- drawing -----
// where the pictures are drawn: the canvas in the Qpod's screen, or (Space full screen) the one covering the whole screen
let vizCv = $("ip-vcanvas"), vizG = vizCv.getContext("2d");
let vizRAF = 0, vizLast = 0;   // the animation loop (iTunes look only) and when it last drew
let vizKey = "";               // the waveform look only redraws when this changes (size, position, song)
let vizTrail = [];             // the iTunes look: the glowing wave's last few shapes, drawn fainter and fainter (its trail)
let vizLabelAt = 0;             // when the look was last switched (its name shows for 1.5 seconds)
let vizLabelTimer = 0;          // the timer that hides it again
let vizSince = 0, vizSong = "", vizT = 0;   // when the song's name appeared (the iTunes look fades it), which song, the last time drawn
const vizPeaks = new Float32Array(VIZ_BANDS);   // the little caps above the bars, which fall slowly
const vizShowing = () => mode === "media" && !$("study").hidden && ipStack.length && ipTop().viz && !document.hidden;

// a message instead of the picture (title, words, and a bar: p = 0 to 1, -1 = working but can't tell how far, null = no bar)
function vizMessage(title, words, p) {
  $("ip-vwait").hidden = false;
  $("ip-vwtitle").textContent = title;
  $("ip-vwnote").textContent = words;
  const bar = $("ip-vwbar");
  bar.hidden = p == null;
  bar.classList.toggle("ip-busy", p === -1);
  bar.style.setProperty("--p", p > 0 ? p : 0);
}
// while a song is being read: "Reading the song…" (no way to know how far), then "Drawing the waveform… 40%"
function vizWaitShow() {
  if (!vizShowing() || !vizWork || mySongs[songIndex] && mySongs[songIndex].id !== vizWork.id) return;
  if (vizWork.phase === "decode") vizMessage("Reading the song…", "Only the first time: it's kept for next time.", -1);
  else vizMessage((state.ipodViz === "wave" ? "Drawing the waveform… " : "Working… ") + Math.round(vizWork.p * 100) + "%",
                  "Only the first time: it's kept for next time.", vizWork.p);
}

function drawViz() {
  if (!vizShowing()) return;
  const look = state.ipodViz, what = nowPlaying(), file = what === "file" ? mySongs[songIndex] : null;
  if (spaceFull && (look !== "space" || !file)) return setSpaceFull(false);   // another look, or not your song: back to the Qpod
  $("ip-viz").classList.toggle("ip-it", look !== "wave");   // every look but the waveform is on a black screen
  ipod.classList.toggle("ip-nohead", look === "space");      // Space fills the whole screen: no title bar
  if (!file) return vizMessage(what ? "Your own songs only" : "Nothing playing",
    what ? what + " doesn't let Qarbon read its sound, so the Visualizer only works with songs from your phone."
         : "Play one of your songs, then come back here.", null);
  const a = vizCache.get(file.id);
  if (!a) { vizFor(file.id); vizWork && vizWork.id === file.id ? vizWaitShow() : vizMessage("Reading the song…", "", -1); return; }
  if (a.failed) return vizMessage("Can't draw this song", "Its sound couldn't be read here, but it still plays.", null);
  $("ip-vwait").hidden = true;
  if (vizSong !== file.id) { vizSong = file.id; vizSince = performance.now(); vizPeaks.fill(0); vizKey = ""; }
  $("ip-vsong").textContent = songName(file);
  $("ip-vartist").textContent = [file.artist || "Unknown Artist", file.album].filter(Boolean).join(" · ");
  // the canvas is drawn at the screen's real pixels (2 or 3 per CSS pixel on an iPhone), so it's sharp.
  // On the whole screen at most 2 (stars don't need more, and it's less work for the battery)
  const dpr = Math.min(spaceFull ? 2 : 3, devicePixelRatio || 1), w = Math.round(vizCv.clientWidth * dpr), h = Math.round(vizCv.clientHeight * dpr);
  if (!w || !h) return;
  if (vizCv.width !== w || vizCv.height !== h) { vizCv.width = w; vizCv.height = h; vizKey = ""; }
  if (look === "wave") drawWave(a);
  else { if (look === "itunes") drawBars(a); else drawSpace(a); vizOverlay(a); }
  // the look's name, for a moment after switching
  const label = $("ip-vlabel"), on = performance.now() - vizLabelAt < 1500;
  label.textContent = VIZ_LOOKS[look];
  label.classList.toggle("ip-show", on);
  // once more afterwards, so a paused song's label fades too (one timer, not one per picture)
  if (on && !vizLabelTimer) vizLabelTimer = setTimeout(() => { vizLabelTimer = 0; vizKick(); }, 1600 - (performance.now() - vizLabelAt));
}

// SoundCloud style: one bar per 3 pixels, the part played in gamma purple, with a pale reflection under it
function drawWave(a) {
  const g = vizG, W = vizCv.width, H = vizCv.height, px = W / vizCv.clientWidth;
  const d = audio.duration || a.dur, t = Math.min(audio.currentTime, d), split = Math.round(d ? t / d * W : 0);
  const scrub = Date.now() - ipShowScrub < 2000;
  const key = [W, H, split, scrub, Math.floor(t), vizSong].join();
  if (key === vizKey) return;   // nothing moved a whole pixel: no need to draw
  vizKey = key;
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, W, H);
  const pitch = 3 * px, bw = 2 * px, n = Math.floor(W / pitch), x0 = (W - n * pitch + pitch - bw) / 2;
  const base = Math.round(H * .7), up = H * .62, down = H * .25;   // the line the bars stand on, their most up and down
  const bars = [];
  for (let i = 0; i < n; i++) {
    const c0 = Math.floor(i * VIZ_COLS / n), c1 = Math.max(c0 + 1, Math.floor((i + 1) * VIZ_COLS / n));
    let m = 0;
    for (let c = c0; c < c1; c++) m = Math.max(m, a.cols[c]);
    bars.push(m / 255);
  }
  const paint = (top, under, x1, x2) => {
    g.save();
    g.beginPath(); g.rect(x1, 0, x2 - x1, H); g.clip();
    g.fillStyle = top;
    bars.forEach((v, i) => { const h = Math.max(px, v * up); g.fillRect(x0 + i * pitch, base - h, bw, h); });
    g.fillStyle = under;
    bars.forEach((v, i) => g.fillRect(x0 + i * pitch, base + px, bw, Math.max(px, v * down)));
    g.restore();
  };
  const purple = g.createLinearGradient(0, base - up, 0, base);
  purple.addColorStop(0, VIZ_PURPLE.top); purple.addColorStop(1, VIZ_PURPLE.base);
  const grey = g.createLinearGradient(0, base - up, 0, base);
  grey.addColorStop(0, "#b4b9c0"); grey.addColorStop(1, "#8b9199");
  paint(purple, VIZ_PURPLE.under, 0, split);
  paint(grey, "#dcdfe3", split, W);
  // the times, in little black tags on the line like SoundCloud's: where you are, and the whole song
  const fs = Math.round(W * .045);
  g.font = `700 ${fs}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  g.textBaseline = "middle";
  const tag = (text, x, right) => {
    const w = g.measureText(text).width + fs * .7, h = fs * 1.35, left = right ? x - w : x;
    g.fillStyle = "rgba(0,0,0,.82)"; g.fillRect(left, base - h, w, h);
    g.fillStyle = "#fff"; g.fillText(text, left + fs * .35, base - h / 2 + px * .5);
  };
  // scrubbing with the wheel: a line marks the spot, and the time tag rides along with it
  if (scrub) {
    g.fillStyle = VIZ_PURPLE.base; g.fillRect(split - px, 0, 2 * px, base + down);
    const text = clock(t), w = g.measureText(text).width + fs * .7;
    tag(text, Math.min(W - w, Math.max(0, split - w / 2)), false);
  } else {
    tag(clock(t), 0, false);
    tag(clock(d), W, true);
  }
}

// iTunes style: a black screen, bars along the bottom with caps that fall slowly, and a glowing wave across the middle
// that leaves a fading trail (its last few shapes, each fainter).
function drawBars(a) {
  const g = vizG, W = vizCv.width, H = vizCv.height, u = W / 100;
  const t = Math.min(audio.currentTime, a.dur), fx = t * VIZ_FPS;
  const f0 = Math.min(a.frames - 1, Math.floor(fx)), f1 = Math.min(a.frames - 1, f0 + 1), mix = fx - Math.floor(fx);
  const at = (arr, i, per) => (arr[f0 * per + i] * (1 - mix) + arr[f1 * per + i] * mix);   // between two frames, for smoothness
  if (Math.abs(t - vizT) > 1) { vizPeaks.fill(0); vizTrail = []; }   // jumped (the wheel, ⏮): start again
  const moved = t !== vizT;
  vizT = t;
  const level = at(a.level, 0, 1) / 255, hue = (t * 10) % 360;   // the colors drift slowly round the rainbow as the song goes on
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  const mid = H * .4;
  // a soft glow behind, swelling with the beat
  const glow = g.createRadialGradient(W / 2, mid, 0, W / 2, mid, W * .6);
  glow.addColorStop(0, `hsla(${hue},90%,55%,${.35 * level})`); glow.addColorStop(1, "hsla(0,0%,0%,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "lighter";   // light adds up like real light: where lines cross, they glow brighter
  // the wave now (tapering off at both ends), added to its trail
  const amp = H * .32 * (.15 + .85 * level), pts = new Float32Array(VIZ_PTS);
  for (let q = 0; q < VIZ_PTS; q++) pts[q] = at(a.wave, q, VIZ_PTS) / 127 * amp * Math.sin(Math.PI * q / (VIZ_PTS - 1));
  if (moved || !vizTrail.length) { vizTrail.push(pts); if (vizTrail.length > 6) vizTrail.shift(); }
  const line = (p, sign) => {
    g.beginPath();
    let x0 = 0, y0 = mid;
    g.moveTo(0, mid);
    for (let q = 1; q < VIZ_PTS; q++) {
      const x = q / (VIZ_PTS - 1) * W, y = mid + sign * p[q];
      g.quadraticCurveTo(x0, y0, (x0 + x) / 2, (y0 + y) / 2);   // smooth curves between the points
      x0 = x; y0 = y;
    }
    g.lineTo(W, mid);
  };
  g.lineJoin = g.lineCap = "round";
  vizTrail.forEach((p, i) => {
    const age = vizTrail.length - 1 - i, fade = Math.pow(.55, age);   // 0 = now, older ones fainter
    // the wave and a mirrored one in another color; each drawn wide and faint, then thin and bright = a glow
    [[1, hue, 1], [-1, hue + 150, .55]].forEach(([sign, hu, alpha]) => {
      line(p, sign);
      (age ? [[2.4, .5]] : [[7, .12], [3.2, .25], [1.1, .95]]).forEach(([wid, al]) => {
        g.lineWidth = wid * u * .5; g.strokeStyle = `hsla(${hu},100%,${al > .4 ? 80 : 60}%,${al * alpha * fade})`; g.stroke();
      });
    });
  });
  // the bars: bass on the left, treble on the right, each a little further round the rainbow
  const bw = W / VIZ_BANDS, floor = H - 2 * u, tall = H * .42;
  for (let b = 0; b < VIZ_BANDS; b++) {
    const v = Math.pow(at(a.bands, b, VIZ_BANDS) / 255, 1.6), hb = hue + b * 9;
    vizPeaks[b] = v > vizPeaks[b] ? v : Math.max(v, vizPeaks[b] - .015);
    const x = b * bw + bw * .17, w = bw * .66, h = Math.max(u * .4, v * tall);
    const col = g.createLinearGradient(0, floor - tall, 0, floor);
    col.addColorStop(0, `hsla(${hb},95%,62%,.95)`); col.addColorStop(1, `hsla(${hb},95%,45%,.3)`);
    g.fillStyle = col; g.fillRect(x, floor - h, w, h);
    g.fillStyle = `hsla(${hb},100%,85%,.9)`; g.fillRect(x, floor - vizPeaks[b] * tall - 1.6 * u, w, .9 * u);
  }
  g.globalCompositeOperation = "source-over";
}

// on the black looks (iTunes and space): the song's name for the first few seconds, like iTunes showed it,
// and while scrubbing with the wheel, a thin progress line along the bottom with the time
function vizOverlay(a) {
  const g = vizG, W = vizCv.width, H = vizCv.height, u = W / 100, t = Math.min(audio.currentTime, a.dur);
  const age = performance.now() - vizSince;
  if (age < 5000) {
    const file = mySongs[songIndex], fs = W * .05;
    g.globalAlpha = Math.min(1, (5000 - age) / 1200);
    g.fillStyle = "#fff"; g.textBaseline = "top";
    g.font = `700 ${fs}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    g.fillText(songName(file), 3 * u, 3 * u, W - 6 * u);
    g.font = `400 ${fs * .85}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    g.fillStyle = "rgba(255,255,255,.75)";
    g.fillText(file.artist || "Unknown Artist", 3 * u, 3 * u + fs * 1.3, W - 6 * u);
    // Space: how to fill the whole screen, and how to come back from it
    if (state.ipodViz === "space") {
      g.font = `700 ${fs * .8}px "Helvetica Neue", Helvetica, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom";
      g.fillStyle = "rgba(255,255,255,.8)"; g.fillText(spaceFull ? "Tap to go back to the Qpod" : "Tap to fill the screen", W / 2, H - 3 * u);
      g.textAlign = "left";
    }
    g.globalAlpha = 1;
  }
  if (Date.now() - ipShowScrub < 2000) {
    g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(0, H - .8 * u, W, .8 * u);
    g.fillStyle = "#fff"; g.fillRect(0, H - .8 * u, t / a.dur * W, .8 * u);
    const fs = W * .045;
    g.font = `700 ${fs}px "Helvetica Neue", Helvetica, Arial, sans-serif`; g.textBaseline = "bottom"; g.textAlign = "right";
    g.fillText(clock(t) + " / " + clock(a.dur), W - 2 * u, H - 2 * u);
    g.textAlign = "left";
  }
}

// ----- space: a slow flight through stars and nebulas -----
// Near stars streak past, far ones twinkle, and real Hubble nebulas (the Crab and the Helix, from img/) float by among
// painted clouds. The music only nudges it: a little faster when it's louder, the clouds glow with the bass, a soft
// flash on big bass hits.
// Stars are points in 3D: x, y and z (how far away). Each picture they come a little closer (z goes down), and are drawn at
// x / z, y / z from the middle, so near ones spread out and speed up, like flying forward. Passed ones start again far away.
const vizSpace = { stars: [], clouds: [], last: 0, sprites: null, photos: [] };
// a painted nebula: many soft coloured blobs added together on a small canvas, made once
function nebulaSprite(hue, seed) {
  const c = document.createElement("canvas"), n = 256; c.width = c.height = n;
  const g = c.getContext("2d");
  let r = seed;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  g.globalCompositeOperation = "lighter";
  // the cloud: big faint blobs, then smaller brighter ones along a few curving "filaments"
  const blob = (x, y, rad, h, l, al) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `hsla(${h},90%,${l}%,${al})`); gr.addColorStop(1, `hsla(${h},90%,${l - 15}%,0)`);
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  for (let i = 0; i < 18; i++) blob(n / 2 + (rnd() - .5) * n * .4, n / 2 + (rnd() - .5) * n * .3, n * (.15 + rnd() * .15), hue + (rnd() - .5) * 50, 45, .07);
  for (let f = 0; f < 5; f++) {
    let x = n / 2 + (rnd() - .5) * n * .3, y = n / 2 + (rnd() - .5) * n * .25, a = rnd() * 7;
    const h = hue + (rnd() - .5) * 90;
    for (let i = 0; i < 26; i++) {
      a += (rnd() - .5) * .8; x += Math.cos(a) * n * .018; y += Math.sin(a) * n * .014;
      blob(x, y, n * (.02 + rnd() * .05), h, 60 + rnd() * 20, .10 + rnd() * .14);
    }
  }
  // dark dust lanes: soft holes cut out of the glow
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 14; i++) {
    const x = n / 2 + (rnd() - .5) * n * .5, y = n / 2 + (rnd() - .5) * n * .4, rad = n * (.03 + rnd() * .07);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // fade the square's edges, and a few stars inside the cloud
  const edge = g.createRadialGradient(n / 2, n / 2, n * .2, n / 2, n / 2, n * .5);
  edge.addColorStop(0, "rgba(0,0,0,0)"); edge.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = edge; g.fillRect(0, 0, n, n);
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(255,255,255,${.4 + rnd() * .6})`; g.fillRect(n * .2 + rnd() * n * .6, n * .2 + rnd() * n * .6, 1.2, 1.2); }
  return c;
}
// a Hubble photo with its square edges faded away, so only the nebula shows
function photoSprite(src) {
  const c = document.createElement("canvas"), n = 256; c.width = c.height = n;
  const img = new Image();
  img.onload = () => {
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0, n, n);
    g.globalCompositeOperation = "destination-in";
    const gr = g.createRadialGradient(n / 2, n / 2, n * .25, n / 2, n / 2, n * .5);
    gr.addColorStop(0, "#000"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
  };
  img.src = src;
  return c;
}
function spaceInit() {
  if (!vizSpace.sprites) vizSpace.sprites = [[275, 11], [200, 97], [320, 5], [20, 41], [180, 77]].map(([h, s]) => nebulaSprite(h, s));
  if (!vizSpace.photos.length) vizSpace.photos = [photoSprite("img/crab-nebula.jpg"), photoSprite("img/helix-nebula.jpg")];
  for (let i = 0; i < 260; i++) vizSpace.stars.push(newStar(Math.random()));
  for (let i = 0; i < 4; i++) vizSpace.clouds.push(newCloud(.45 + i * .17));
}
const newStar = z => ({ x: (Math.random() - .5) * 2.4, y: (Math.random() - .5) * 2.4, z: z || 1, tw: Math.random() * 6 });
function newCloud(z) {
  const photo = Math.random() < .5;   // half the clouds are Hubble photos
  return { x: (Math.random() - .5) * 1.4, y: (Math.random() - .5) * 1.0, z: z || 1, size: .6 + Math.random() * .7,
           sprite: photo ? vizSpace.photos[Math.floor(Math.random() * 2)] : vizSpace.sprites[Math.floor(Math.random() * vizSpace.sprites.length)],
           spin: (Math.random() - .5) * .2, rot: Math.random() * 6 };
}

function drawSpace(a) {
  if (!vizSpace.stars.length) spaceInit();
  const g = vizG, W = vizCv.width, H = vizCv.height, cx = W / 2, cy = H / 2, F = Math.min(W, H) * .9;
  const now = performance.now(), dt = Math.min(.05, (now - (vizSpace.last || now)) / 1000); vizSpace.last = now;
  const t = Math.min(audio.currentTime, a.dur), f = Math.min(a.frames - 1, Math.floor(t * VIZ_FPS));
  const level = a.level[f] / 255;
  let bass = 0; for (let b = 0; b < 4; b++) bass += a.bands[f * VIZ_BANDS + b] / 255 / 4;
  // how fast we fly (in "depth" per second): never very fast
  const speed = .07 + .12 * level * level, cloudSpeed = speed * .6;
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "rgba(0,0,4,.65)";   // keeping a little of the last picture makes the streaks longer
  g.fillRect(0, 0, W, H);
  // nebulas, far ones first
  g.globalCompositeOperation = "lighter";
  vizSpace.clouds.sort((p, q) => q.z - p.z).forEach(c => {
    c.z -= cloudSpeed * dt; c.rot += c.spin * dt;
    if (c.z < .2) Object.assign(c, newCloud(1));
    const s = c.size * F / c.z, x = cx + c.x * F / c.z, y = cy + c.y * F / c.z;
    // fade in far away, out before it fills the screen; the bass makes them glow a little
    const alpha = Math.min(1, (1 - c.z) * 2.5) * Math.min(1, (c.z - .2) * 4) * .85 * (.82 + .35 * bass);
    g.globalAlpha = Math.max(0, Math.min(1, alpha));
    g.save(); g.translate(x, y); g.rotate(c.rot); g.drawImage(c.sprite, -s / 2, -s / 2, s, s); g.restore();
  });
  g.globalAlpha = 1;
  // stars
  vizSpace.stars.forEach(s => {
    const z0 = s.z;
    s.z -= speed * dt;
    if (s.z < .02) { Object.assign(s, newStar(1)); return; }
    const x = cx + s.x * F / s.z, y = cy + s.y * F / s.z;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) { Object.assign(s, newStar(1)); return; }
    const near = 1 - s.z, px = W / vizCv.clientWidth;
    let bright = Math.min(1, near * 1.4);
    bright = Math.min(1, .35 + bright) * (.6 + .4 * Math.sin(now / 500 + s.tw));   // twinkling
    if (near > .3) {   // a near star: a streak from where it was to where it is
      const x0 = cx + s.x * F / z0, y0 = cy + s.y * F / z0;
      g.strokeStyle = `hsla(${210 + s.tw * 10},80%,${80 + 20 * level}%,${bright})`;
      g.lineWidth = Math.max(px * .6, near * 2.2 * px);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
    } else {
      const r = Math.max(px * .5, near * near * 2.4 * px);
      g.fillStyle = `rgba(235,240,255,${bright})`;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
  // a soft flash of light in the middle on big bass hits
  if (bass > .55) {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, W * .5);
    gr.addColorStop(0, `rgba(170,140,255,${(bass - .55) * .35})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  g.globalCompositeOperation = "source-over";
}

// the animation loop, only for the moving looks (iTunes and space) while the song plays, on screen, and the page isn't hidden (saves battery).
// The waveform look doesn't need one: it redraws when the song's time moves (timeupdate, about 4 times a second).
function vizKick() {
  if (!vizShowing()) return;
  if (state.ipodViz === "wave" || audio.paused || musicKind !== "file") return drawViz();
  if (!vizRAF) vizRAF = requestAnimationFrame(vizFrame);
}
function vizFrame(now) {
  vizRAF = 0;
  if (!vizShowing() || state.ipodViz === "wave" || audio.paused || musicKind !== "file") return drawViz();
  if (now - vizLast > 1000 / VIZ_FPS - 4) { vizLast = now; drawViz(); }   // 30 pictures a second is plenty
  vizRAF = requestAnimationFrame(vizFrame);
}

// opening it: from Now Playing it goes on top; from anywhere else Now Playing goes under it, so MENU goes back there
function openViz() {
  if (!ipTop().now) ipOpen(nowScreen());
  ipOpen(vizScreen());
}
// the corner button: open it, or back to Now Playing if it's showing
$("ip-vz").addEventListener("click", () => { ipClick(); unlockAudio(); if (ipTop().viz) ipBack(); else openViz(); });
// tap or drag along the waveform to jump there (the waveform look; the iTunes look has nowhere to point at)
vizCv.addEventListener("pointerdown", e => {
  if (state.ipodViz !== "wave" || !$("ip-vwait").hidden) return;
  vizCv.setPointerCapture(e.pointerId);
  seekTo(e, vizCv);
});
vizCv.addEventListener("pointermove", e => { if (vizCv.hasPointerCapture(e.pointerId)) seekTo(e, vizCv); });
// keep it in step: the song's time moving, playing, pausing, jumping, the page coming back, the window changing size
["timeupdate", "play", "pause", "seeked"].forEach(ev => audio.addEventListener(ev, vizKick));
document.addEventListener("visibilitychange", vizKick);
addEventListener("resize", vizKick);

// ================= the click wheel: turning and pressing =================
// A "pointer" is a finger or a mouse. While it's down on the wheel we follow its angle around the center:
// every 18° (20 steps per turn) is one step. If it barely moved, it was a press: which button depends on where.
const ipWheel = $("ip-wheel");
// the Qarbon atom on the center button (the logo's atomSVG from js/look.js), on every color
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
ipWheel.addEventListener("click", () => { if (ipPickWaiting) { const go = ipPickWaiting; ipPickWaiting = false; go(); } });
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
  const back = () => spaceFull ? setSpaceFull(false) : ipFull && ipStack.length === 1 ? setFull(false) : ipButton("menu");
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
$("modeselect").addEventListener("change", () => { if (mode === "media") $("modeselect").blur(); else { setFull(false); setSpaceFull(false); } });

// ================= Space full screen, and the mini Qpod =================
// Space full screen: tapping the Space look on the Qpod's screen draws it on a canvas covering the whole screen (#spacefull).
// Tapping it again (or Esc on a Mac) goes back to the Qpod. Only drawing moves: the music is the same, so it never restarts.
let spaceFull = false;
function setSpaceFull(on) {
  if (on === spaceFull) return;
  spaceFull = on;
  $("spacefull").hidden = !on;
  document.documentElement.classList.toggle("spacefull-on", on);   // no scrolling the page under it
  vizCv = on ? $("spacefull") : $("ip-vcanvas");
  vizG = vizCv.getContext("2d");
  vizSince = performance.now();   // the song's name (and how to come back) shows again
  vizKick();
}
$("ip-vcanvas").addEventListener("click", () => {
  if (state.ipodViz === "space" && $("ip-vwait").hidden && nowPlaying() === "file") { ipClick(); setSpaceFull(true); }
});
$("spacefull").addEventListener("click", () => { ipClick(); setSpaceFull(false); });

// The mini Qpod: a small see-through (Clear) Qpod with the Qarbon atom on its screen, floating at the side of the screen.
// It shows in the other modes while music is loaded. Tap it to go back to the Qpod;
// drag it up or down, or to the other side: it snaps to the nearest side and stays there (state.qpodPos, this device).
// Swipe it off the side (or press Delete / Esc on it) to put it away: the music keeps playing, and the music panel of
// the mode you're in still pauses or stops it. It comes back when you open the Qpod, or after the music is removed.
const qmini = $("qpodmini");
$("qpodmini-skin").insertAdjacentHTML("beforeend", `<span class="qm-atom">${atomSVG(8)}</span>`);
let miniAway = false;   // swiped away (until you open the Qpod again, or nothing is loaded any more)
function miniQpod() {
  if (miniFrom && (mode !== "media" || $("study").hidden)) miniForget();
  if (mode === "media" || !nowPlaying()) miniAway = false;
  const show = !$("study").hidden && mode !== "media" && !!nowPlaying() && !miniAway;
  qmini.hidden = !show;
  if (!show) return;
  qmini.classList.toggle("qm-playing", isPlaying());   // its atom turns while music plays
  if (!qmini.classList.contains("qm-drag")) placeMini();
}
const MINI_GAP = 12;   // pixels from the screen's edge
function placeMini() {
  const p = state.qpodPos, w = qmini.offsetWidth, h = qmini.offsetHeight;
  qmini.style.left = (p.side === "left" ? MINI_GAP : innerWidth - w - MINI_GAP) + "px";
  qmini.style.top = Math.round(MINI_GAP + p.y * Math.max(0, innerHeight - h - 2 * MINI_GAP)) + "px";
}
// { pointer's start x/y, the widget's start left/top, moved: dragged far enough to not be a tap,
//   vx: how fast it's going sideways (pixels per millisecond), lastX / lastT: the last move }
let miniDrag = null;
qmini.addEventListener("pointerdown", e => {
  qmini.setPointerCapture(e.pointerId);
  miniDrag = { x: e.clientX, y: e.clientY, left: qmini.offsetLeft, top: qmini.offsetTop, moved: false, vx: 0, lastX: e.clientX, lastT: e.timeStamp };
});
qmini.addEventListener("pointermove", e => {
  if (!miniDrag) return;
  const dx = e.clientX - miniDrag.x, dy = e.clientY - miniDrag.y;
  if (!miniDrag.moved && Math.hypot(dx, dy) < 8) return;
  miniDrag.moved = true;
  qmini.classList.add("qm-drag");
  if (e.timeStamp > miniDrag.lastT) miniDrag.vx = (e.clientX - miniDrag.lastX) / (e.timeStamp - miniDrag.lastT);
  miniDrag.lastX = e.clientX; miniDrag.lastT = e.timeStamp;
  // sideways it can go past the edges (to swipe it away); up and down it stays on the screen
  qmini.style.left = Math.min(innerWidth, Math.max(-qmini.offsetWidth, miniDrag.left + dx)) + "px";
  qmini.style.top = Math.min(innerHeight - qmini.offsetHeight, Math.max(0, miniDrag.top + dy)) + "px";
});
function miniUp(e) {
  if (!miniDrag) return;
  const drag = miniDrag;
  miniDrag = null;
  qmini.classList.remove("qm-drag");
  if (!drag.moved) { if (e.type === "pointerup") miniTap(); return; }
  // let go mostly past an edge, or flicked fast toward one: put it away. (Only a finger still moving when it lets go is a
  // flick: one that stopped first was just moving it.)
  if (e.timeStamp - drag.lastT > 80) drag.vx = 0;
  const w = qmini.offsetWidth, left = qmini.offsetLeft;
  if (left < -w * .3 || left > innerWidth - w * .7 || Math.abs(drag.vx) > .8) return miniPutAway(drag.vx ? drag.vx > 0 : left > innerWidth / 2);
  {   // otherwise snap to the nearest side, and remember where
    const h = qmini.offsetHeight;
    state.qpodPos = { side: qmini.offsetLeft + qmini.offsetWidth / 2 < innerWidth / 2 ? "left" : "right",
                      y: Math.min(1, Math.max(0, (qmini.offsetTop - MINI_GAP) / Math.max(1, innerHeight - h - 2 * MINI_GAP))) };
    save();
    placeMini();
  }
}
// put it away: it slides off that side (right = true) and hides; the music goes on
function miniPutAway(right) {
  miniAway = true;
  qmini.style.left = (right ? innerWidth + 20 : -qmini.offsetWidth - 20) + "px";
  setTimeout(() => { if (miniAway) qmini.hidden = true; }, 260);
}
qmini.addEventListener("keydown", e => {   // on the keyboard: Delete, Backspace or Esc puts it away
  if (["Delete", "Backspace", "Escape"].includes(e.key)) { e.preventDefault(); qmini.blur(); miniPutAway(state.qpodPos.side === "right"); }
});
qmini.addEventListener("pointerup", miniUp);
qmini.addEventListener("pointercancel", miniUp);
qmini.addEventListener("click", e => { if (!e.detail) miniTap(); });   // Enter or Space on the keyboard (a real click was the pointer)
// tap: back to the Qpod in 🎧 Media, remembering the mode you came from (miniFrom),
// so ‹ (or MENU on the Qpod's main menu) takes you back there instead of to the home screen
let miniFrom = "";
let miniBook = null;   // the book that was open in the reader (switching modes closes it, saving your place)
function miniTap() {
  miniFrom = mode;
  miniBook = mode === "reading" && reader ? reader.b : null;
  setMode("media");
  const name = $("modeselect").querySelector(`option[value="${miniFrom}"]`);
  backLabel("Back to " + (name ? name.textContent.replace(/^\S+\s/, "") : "where you were"));   // "🃏 Review" → "Back to Review"
}
// back to that mode just as you left it (the same card, the same page): only the mode changes, nothing is rebuilt
function miniBack() {
  setFull(false);
  setSpaceFull(false);
  const book = miniBook;
  mode = miniFrom;
  render();   // render calls miniQpod, which forgets miniFrom now that you've left the Qpod
  if (book && state.books.includes(book)) openReader(book);   // the same book, at the place it saved (book.place)
}
// left the Qpod some other way (the Mode menu, home...): ‹ goes home again
function miniForget() {
  miniFrom = "";
  miniBook = null;
  backLabel("Back to home");
}
// what ‹ says when you hover it (or a screen reader reads it)
function backLabel(text) { $("gohome").title = text; $("gohome").setAttribute("aria-label", text); }
addEventListener("resize", () => { if (!qmini.hidden) placeMini(); });

// keep the iPod in step with the music: renderMusic (js/music.js) calls these after every change
musicWatchers.push(renderMedia, miniQpod);
audio.addEventListener("timeupdate", renderNow);
audio.addEventListener("volumechange", renderNow);
