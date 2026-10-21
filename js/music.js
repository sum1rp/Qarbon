// Qarbon · js/music.js: the music player. YouTube / SoundCloud links, and your own music files.
// The script files run in the order index.html lists them, and share one set of variables.
//
// There are three music panels (in the small timer dropdown, in ⏱ Focus, and under the 🎧 Media iPod) but only ONE player:
//   - a YouTube or SoundCloud link plays in an iframe inside #playerhost, laid over whichever panel is showing
//     (placePlayer). It's never moved into a panel, because moving an iframe reloads it and restarts the music.
//   - your own files play in the one <audio id="songaudio">; the panels only show its controls.
// musicKind says which one is in use: "link" or "file".

// ================= links: only YouTube and SoundCloud =================
// You paste a normal link (like youtube.com/watch?v=... or soundcloud.com/artist/track).
// musicEmbed turns it into that site's official "embed" player address, and only accepts
// YouTube and SoundCloud, so nothing else can be loaded into the page.
// key: a short name for the song (or playlist), used to spot the same one again in the Played list.
function musicEmbed(link) {
  let u;
  try { u = new URL(String(link).trim()); } catch (e) { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  const safe = s => /^[\w-]{6,64}$/.test(s || "");   // IDs are letters, numbers, - and _ only

  if (host === "youtube.com" || host === "youtu.be") {
    const list = u.searchParams.get("list");   // a playlist
    const id = host === "youtu.be" ? u.pathname.slice(1)
      : u.searchParams.get("v") || (u.pathname.match(/^\/(shorts|live|embed)\/([^/]+)/) || [])[2];   // a single video
    // enablejsapi=1 lets Qarbon talk to the player: ⏮ ⏭, and asking which song is playing
    const extras = "?playsinline=1&rel=0&enablejsapi=1" + (safe(list) ? "&list=" + list : "");
    const pl = safe(list) ? list : "";
    if (safe(id)) return { kind: "YouTube", playlist: !!pl, list: pl, key: "yt:" + id, src: "https://www.youtube-nocookie.com/embed/" + id + extras };
    if (pl) return { kind: "YouTube", playlist: true, list: pl, key: "ytl:" + pl, src: "https://www.youtube-nocookie.com/embed/videoseries" + extras };
    return null;
  }
  if ((host === "soundcloud.com" || host === "on.soundcloud.com") && u.pathname.length > 1) {
    const page = "https://" + host + u.pathname;   // a track, playlist or artist page
    return { kind: "SoundCloud", playlist: /\/sets\//.test(u.pathname),   // SoundCloud playlists live under /sets/
             key: "sc:" + u.pathname.replace(/\/$/, ""),
             src: "https://w.soundcloud.com/player/?url=" + encodeURIComponent(page) +
                  "&color=%237b6cff&visual=false&show_comments=false" };
  }
  return null;
}

// ================= what's playing, and what has played this session =================
let musicKind = "link";   // "link": the YouTube/SoundCloud link in state.music · "file": one of your own files
// Played this session (newest first, up to 10): { key, kind: "YouTube" | "SoundCloud" | "File", link or fileId, title }.
// Kept only while the page is open: not saved, not synced.
let played = [];
let playedPos = -1;       // which entry of played is the one playing now (-1: none)
let mySongs = [];         // your own music files on this device: { id, name, title, artist, album, cover, added }
let songIndex = -1;       // which of mySongs is loaded in the <audio> (-1: none)
// the list you're playing from (song numbers in mySongs: an album, an artist... chosen on the 🎧 Media iPod).
// ⏮ ⏭ and "3 of 12" stay inside it. null = all your songs, in the order you added them.
let songList = null;
let linkPlaying = false;  // is the YouTube/SoundCloud player playing right now? (the players tell us, see the messages below)
// other parts of the app that want to know when the music changes (the iPod in js/media.js): renderMusic calls each one
const musicWatchers = [];
let shuffleOn = false, repeatMode = "off";   // repeat: "off", "all" (start the list again) or "one" (this song again)
const audio = $("songaudio");

// the link as a short label, for songs whose title we don't know: "youtube.com/watch?v=…"
const shortLink = link => String(link).replace(/^https?:\/\/(www\.|m\.)?/, "").slice(0, 60);
const songName = s => s.title || s.name;

// add a song to Played this session (or update it if it's there already).
// toTop: you just chose it, so it moves to the top; otherwise it stays where it is (just marked as playing).
function notePlayed(entry, toTop) {
  let i = played.findIndex(p => p.key === entry.key);
  if (i >= 0) {
    const old = played[i];
    if (entry.title) old.title = entry.title;
    if (entry.link) old.link = entry.link;
    if (toTop) { played.splice(i, 1); played.unshift(old); i = 0; }
  } else {
    played.unshift(entry);
    if (played.length > 10) played.length = 10;
    i = 0;
  }
  playedPos = i;
  renderMusic();
}

// the name of what's playing now (for the closed Focus dropdown), or "" if nothing is
function nowTitle() {
  if (musicKind === "file") return songIndex >= 0 ? songName(mySongs[songIndex]) + (mySongs[songIndex].artist ? " · " + mySongs[songIndex].artist : "") : "";
  const m = state.music && musicEmbed(state.music);
  if (!m) return "";
  const p = played[playedPos];
  return p && p.kind !== "File" && p.title ? p.title : shortLink(state.music);
}

// ================= building the panels =================
// All the panels get the same controls (filled in here, so index.html stays short). Inside each panel, the buttons
// have classes, not ids, because there are two of each.
function musicPanelHTML() {
  return `
    <div class="playerslot"></div>
    <div class="filecard" hidden>
      <span class="cover"></span>
      <span class="fmeta">
        <b class="ftitle"></b><span class="fartist"></span>
        <input type="range" class="seek" min="0" max="1000" value="0" aria-label="Position in the song">
        <span class="ftimes"><span class="fpos">0:00</span><span class="fcount"></span><span class="fleft"></span></span>
      </span>
    </div>
    <div class="musicnav" hidden>
      <button class="musicprev" aria-label="Previous">⏮ Previous</button>
      <button class="musicplay" aria-label="Pause" hidden>❚❚</button>
      <button class="musicnext" aria-label="Next">Next ⏭</button>
      <button class="musicshuffle" aria-label="Shuffle" aria-pressed="false" hidden>🔀</button>
      <button class="musicrepeat" aria-label="Repeat: off" hidden>🔁</button>
    </div>
    <div class="musicform">
      <input type="url" class="musicurl" placeholder="Paste a YouTube or SoundCloud link" autocomplete="off">
      <button class="musicset">Play</button>
    </div>
    <label class="filebtn">📁 Choose music files
      <input type="file" class="musicfile" accept="audio/*,.mp3,.m4a,.aac,.wav" multiple></label>
    <details class="mymusic" hidden><summary></summary><ol></ol></details>
    <p class="iphone">iPhone: YouTube and SoundCloud pause when the screen locks or you switch apps. Your own files usually keep going.</p>
    <div class="musicmsg"></div>
    <details class="played" hidden><summary></summary><ol></ol></details>
    <button class="musicclear" hidden>Remove music</button>`;
}
const musicPanels = () => [...document.querySelectorAll(".musicpanel")];
musicPanels().forEach(p => { p.querySelector(".musicbody").innerHTML = musicPanelHTML(); });
const fitIfStudying = () => { if (!$("study").hidden && cardShowing()) fitCard(); };
const musicMsg = text => document.querySelectorAll(".musicmsg").forEach(m => { m.textContent = text; });   // the panels and the iPod's

// ================= showing everything in both panels =================
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let coverURL = "";   // the playing song's cover, as a temporary address the <img> can show

function renderMusic() {
  const m = musicKind === "link" && state.music ? musicEmbed(state.music) : null;
  const file = musicKind === "file" && songIndex >= 0 ? mySongs[songIndex] : null;
  // ⏮ ⏭ go through: the playlist (YouTube/SoundCloud), your files, or the Played list
  const hasNav = (m && m.playlist) || (file && mySongs.length > 1) || (!file && played.length > 1);
  $("timer").classList.toggle("hasmusic", !!(m || file));
  musicPanels().forEach(p => {
    p.querySelector(".playerslot").className = "playerslot" + (m ? (m.kind === "YouTube" ? " yt" : " sc") : "");
    p.querySelector(".filecard").hidden = !file;
    if (file) {
      p.querySelector(".cover").innerHTML = coverURL ? `<img alt="" src="${coverURL}">` : "♪";
      p.querySelector(".ftitle").textContent = songName(file);
      p.querySelector(".fartist").textContent = [file.artist, file.album].filter(Boolean).join(" · ");
      const list = playingList();
      p.querySelector(".fcount").textContent = (list.indexOf(songIndex) + 1) + " of " + list.length;
    }
    p.querySelector(".musicnav").hidden = !hasNav && !file;
    p.querySelector(".musicprev").textContent = file ? "⏮" : "⏮ Previous";
    p.querySelector(".musicnext").textContent = file ? "⏭" : "Next ⏭";
    p.querySelector(".musicprev").hidden = p.querySelector(".musicnext").hidden = !hasNav;
    ["musicplay", "musicshuffle", "musicrepeat"].forEach(c => { p.querySelector("." + c).hidden = !file; });
    const playing = file && !audio.paused;
    p.querySelector(".musicplay").textContent = playing ? "❚❚" : "▶";
    p.querySelector(".musicplay").setAttribute("aria-label", playing ? "Pause" : "Play");
    p.querySelector(".musicshuffle").setAttribute("aria-pressed", shuffleOn);
    const rep = p.querySelector(".musicrepeat");
    rep.textContent = repeatMode === "one" ? "🔂" : "🔁";
    rep.setAttribute("aria-label", "Repeat: " + repeatMode);
    rep.classList.toggle("on", repeatMode !== "off");
    p.querySelector(".musicclear").hidden = !(m || file);
    // your music on this phone
    const mine = p.querySelector(".mymusic");
    mine.hidden = !mySongs.length;
    mine.querySelector("summary").textContent = "📁 My music on this phone · " + mySongs.length + (mySongs.length === 1 ? " song" : " songs");
    mine.querySelector("ol").innerHTML = mySongs.map((s, i) =>
      `<li><button class="song${i === songIndex && file ? " cur" : ""}" data-song="${i}"><span class="ic">${i === songIndex && file ? "♪" : "▶"}</span>` +
      `<span class="t">${esc(songName(s))}</span><span class="src">${esc(s.artist || "")}</span></button>` +
      `<button class="songdel" data-del="${i}" aria-label="Remove ${esc(songName(s))} from this phone" title="Remove from this phone">✕</button></li>`).join("");
    // played this session
    const box = p.querySelector(".played");
    box.hidden = !played.length;
    box.querySelector("summary").textContent = "🕘 Played this session · " + played.length;
    box.querySelector("ol").innerHTML = played.map((s, i) => {
      const cur = i === playedPos && (m || file);
      return `<li><button class="song${cur ? " cur" : ""}" data-played="${i}"><span class="ic">${cur ? "♪" : "▶"}</span>` +
             `<span class="t${s.title ? "" : " link"}">${esc(s.title || shortLink(s.link))}</span><span class="src">${cur ? "now" : s.kind}</span></button></li>`;
    }).join("");
  });
  // the closed ⏱ Focus dropdown shows what's playing
  const now = nowTitle();
  $("focusnow").textContent = now || "Add music";
  $("focusnow").classList.toggle("empty", !now);
  updateProgress();
  musicWatchers.forEach(f => f());
}

// the progress bar and times of your own song (about 4 times a second while it plays)
const clock = s => isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00";
function updateProgress() {
  if (musicKind !== "file") return;
  const d = audio.duration, t = audio.currentTime;
  musicPanels().forEach(p => {
    const seek = p.querySelector(".seek");
    if (document.activeElement !== seek) seek.value = d ? Math.round(t / d * 1000) : 0;   // not while you're dragging it
    p.querySelector(".fpos").textContent = clock(t);
    p.querySelector(".fleft").textContent = d ? "−" + clock(d - t) : "";
  });
}

// ================= the YouTube / SoundCloud player =================
// (re)build the one player from the saved link. autoplay is only used right after you press Play,
// because browsers block sound that starts without a tap. If the same link is already loaded, it's left alone
// (so syncing a setting from another device doesn't restart your music).
function showMusic(autoplay) {
  const host = $("playerhost"), m = musicKind === "link" && state.music ? musicEmbed(state.music) : null;
  const src = m ? m.src + (autoplay ? (m.kind === "YouTube" ? "&autoplay=1" : "&auto_play=true") : "") : "";
  if (!autoplay && m && host.dataset.src === m.src) { renderMusic(); return; }
  emptyPlayer();
  linkPlaying = !!(m && autoplay);   // until the player tells us otherwise
  host.dataset.src = m ? m.src : "";
  if (m) {
    const f = document.createElement("iframe");
    f.src = src;
    f.title = m.kind + " player";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";   // fullscreen: YouTube's ⛶ button works
    f.referrerPolicy = "strict-origin-when-cross-origin";   // YouTube needs to know which website the player is on
    f.onload = () => listenToPlayer(f, m);
    host.appendChild(f);
    startPlacing();
  }
  renderMusic();
}

// Keep the player sitting exactly on top of the music panel you can see. When neither panel is
// showing (dropdowns closed, or another page), it's parked off-screen, still playing.
// Moving it this way, instead of moving it into the other panel, is what stops the music restarting.
// It checks on every screen refresh, but only while there is a player (no music = no checking, saves battery).
let placing = false;   // true while the checking loop is running
// an empty player is moved off-screen, so it can't sit invisibly on top of the buttons and block taps
function emptyPlayer() {
  const host = $("playerhost");
  host.innerHTML = "";
  host.dataset.pos = host.dataset.src = "";
  host.style.left = "-10000px";
}
function placePlayer() {
  const host = $("playerhost");
  if (!host.firstChild) { placing = false; return; }   // the music was removed: stop checking
  // a slot counts as visible if it takes up space and isn't inside a closed dropdown
  // (Safari still reports a size for things inside a closed dropdown, so that's checked separately)
  const slot = [...document.querySelectorAll(".playerslot")]
    .find(s => s.getClientRects().length && s.offsetWidth && !s.closest("details:not([open])"));
  const r = slot && slot.getBoundingClientRect();
  const pos = r ? [r.left + scrollX, r.top + scrollY, r.width, r.height] : [-10000, 0, 320, 180];
  const key = pos.map(Math.round).join();
  if (key !== host.dataset.pos) {   // only touch the page when something actually moved
    host.dataset.pos = key;
    [host.style.left, host.style.top, host.style.width, host.style.height] = pos.map(n => Math.round(n) + "px");
  }
  requestAnimationFrame(placePlayer);   // check again on the next screen refresh
}
// start the loop (if it isn't already running)
function startPlacing() {
  if (placing) return;
  placing = true;
  requestAnimationFrame(placePlayer);
}

// ----- asking the player what's playing (for the Played list's titles) -----
// Both sites' players answer messages sent with postMessage (a safe way for a page and an iframe to talk).
// YouTube: after "listening", it keeps sending "infoDelivery" with the video's id and title.
// SoundCloud: after "ready", we ask to hear about "play", then ask for the current sound's title.
// If a player doesn't answer (for example YouTube when index.html is opened from the Mac), the link shows instead.
const YT_ORIGIN = "https://www.youtube-nocookie.com", SC_ORIGIN = "https://w.soundcloud.com";
function listenToPlayer(f, m) {
  if (m.kind === "YouTube")   // say it a few times: the player may not be ready for the first one
    [0, 1000, 3000].forEach(ms => setTimeout(() => {
      if (f.isConnected) f.contentWindow.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YT_ORIGIN);
    }, ms));
}
addEventListener("message", e => {
  const f = $("playerhost").querySelector("iframe");
  if (!f || e.source !== f.contentWindow) return;   // only messages from our own player
  let d;
  try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (err) { return; }
  if (!d) return;
  const m = musicEmbed(state.music);
  // playing or paused? YouTube: playerState 1 = playing. SoundCloud: its play / pause / finish events.
  const was = linkPlaying;
  if (e.origin === YT_ORIGIN && d.info && typeof d.info.playerState === "number") linkPlaying = d.info.playerState === 1;
  if (e.origin === YT_ORIGIN && d.event === "onStateChange" && typeof d.info === "number") linkPlaying = d.info === 1;
  if (e.origin === SC_ORIGIN && ["play", "pause", "finish"].includes(d.method)) linkPlaying = d.method === "play";
  if (linkPlaying !== was) renderMusic();
  if (e.origin === YT_ORIGIN && d.info && d.info.videoData && d.info.videoData.video_id && d.info.videoData.title) {
    const v = d.info.videoData;
    notePlayed({ key: "yt:" + v.video_id, kind: "YouTube", title: v.title,
                 link: "https://www.youtube.com/watch?v=" + v.video_id + (m && m.list ? "&list=" + m.list : "") }, false);
  }
  if (e.origin === SC_ORIGIN) {
    const say = msg => f.contentWindow.postMessage(JSON.stringify(msg), SC_ORIGIN);
    if (d.method === "ready") {
      ["play", "pause", "finish"].forEach(value => say({ method: "addEventListener", value }));
      say({ method: "getCurrentSound" });
    }
    if (d.method === "play") say({ method: "getCurrentSound" });
    if (d.method === "getCurrentSound" && d.value && d.value.permalink_url) {
      const u = new URL(d.value.permalink_url);
      notePlayed({ key: "sc:" + u.pathname.replace(/\/$/, ""), kind: "SoundCloud", title: d.value.title, link: d.value.permalink_url }, false);
    }
  }
});

// ⏮ ⏭ inside a playlist: ask the player to change track, using each site's official message format
function musicCommand(which) {
  const f = $("playerhost").querySelector("iframe"), m = state.music && musicEmbed(state.music);
  if (!f || !m) return;
  if (m.kind === "YouTube")
    f.contentWindow.postMessage(JSON.stringify({ event: "command", func: which === "next" ? "nextVideo" : "previousVideo", args: [] }), YT_ORIGIN);
  else f.contentWindow.postMessage(JSON.stringify({ method: which }), SC_ORIGIN);
}

// ▶❚❚ for whatever is loaded: your song, or the YouTube/SoundCloud player (asked with each site's official message)
function musicToggle() {
  if (musicKind === "file") {
    if (songIndex < 0) return;
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
    return;
  }
  const f = $("playerhost").querySelector("iframe"), m = state.music && musicEmbed(state.music);
  if (!f || !m) return;
  if (m.kind === "YouTube")
    f.contentWindow.postMessage(JSON.stringify({ event: "command", func: linkPlaying ? "pauseVideo" : "playVideo", args: [] }), YT_ORIGIN);
  else f.contentWindow.postMessage(JSON.stringify({ method: "toggle" }), SC_ORIGIN);
}

// play a YouTube/SoundCloud link (pasted, or chosen again from the Played list)
function playLink(link, toTop) {
  stopFile();
  state.music = link;
  save();
  musicKind = "link";
  const m = musicEmbed(link);
  notePlayed({ key: m.key, kind: m.kind, link }, toTop);
  showMusic(true);
  fitIfStudying();   // the player makes the timer panel taller
}

function setMusic(panel) {
  const input = panel.querySelector(".musicurl"), link = input.value.trim();
  if (!musicEmbed(link)) { panel.querySelector(".musicmsg").textContent = "That doesn't look like a YouTube or SoundCloud link."; return; }
  input.value = "";
  musicMsg("");
  playLink(link, true);
}

// ================= your own music files =================
// You pick songs from the iPhone's Files app (or a folder on the Mac). They're kept on this device in IndexedDB
// (see fileStore in js/data.js), never uploaded, and play in Qarbon's own <audio> player. That's also why they
// can show on the lock screen and usually keep playing when the screen locks: they're plain audio, not a video player.

// iPhones only let sound start from a tap. Reading a song from storage takes a moment, and by then Safari may have
// forgotten the tap. So the very first tap plays a split second of silence: after that, this <audio> is allowed to play.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked || audio.src) return;
  audioUnlocked = true;
  const n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);   // a tiny silent WAV file
  const text = (at, t) => [...t].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); text(8, "WAVEfmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); text(36, "data"); v.setUint32(40, n * 2, true);
  audio.src = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  audio.play().then(() => audio.pause()).catch(() => {});
}

// ----- reading a song's tags: the title, artist, album and cover saved inside the file -----
// MP3 files keep them in an "ID3" block at the start; M4A/AAC files in "atoms" (boxes inside boxes).
// If a file has none (or we can't read them), the file name is used instead.
function readTags(buf) {
  const b = new Uint8Array(buf);
  try {
    if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return readID3(b);           // "ID3"
    if (String.fromCharCode(b[4], b[5], b[6], b[7]) === "ftyp") return readMP4(b);    // an MP4/M4A file
  } catch (e) {}
  return {};
}
// text in ID3 tags: byte 0 says how it's written (0 Latin-1, 1 UTF-16 with a byte-order mark, 2 UTF-16, 3 UTF-8)
function id3Text(bytes, enc) {
  let label = ["latin1", "utf-16le", "utf-16be", "utf-8"][enc] || "latin1";
  if (enc === 1 && bytes[0] === 0xFE && bytes[1] === 0xFF) label = "utf-16be";
  if (enc === 1 && (bytes[0] === 0xFE || bytes[0] === 0xFF)) bytes = bytes.subarray(2);
  return new TextDecoder(label).decode(bytes).split("\0")[0].trim();
}
function readID3(b) {
  const version = b[3], flags = b[5];
  const syncsafe = i => (b[i] & 127) << 21 | (b[i + 1] & 127) << 14 | (b[i + 2] & 127) << 7 | (b[i + 3] & 127);   // 7 bits per byte
  const u32 = i => (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
  const end = Math.min(b.length, 10 + syncsafe(6));
  let p = 10;
  if (flags & 0x40) p += version === 4 ? syncsafe(10) : u32(10) + 4;   // skip the "extended header"
  const v22 = version === 2, idLen = v22 ? 3 : 4, head = v22 ? 6 : 10;
  const wanted = v22 ? { TT2: "title", TP1: "artist", TAL: "album", PIC: "cover" }
                     : { TIT2: "title", TPE1: "artist", TALB: "album", APIC: "cover" };
  const tags = {};
  while (p + head < end) {   // each "frame" is one piece of information
    const id = String.fromCharCode(...b.subarray(p, p + idLen));
    if (!/^[A-Z0-9]+$/.test(id)) break;   // padding: no more frames
    const size = v22 ? (b[p + 3] << 16 | b[p + 4] << 8 | b[p + 5]) : version === 4 ? syncsafe(p + 4) : u32(p + 4);
    const data = b.subarray(p + head, p + head + size), what = wanted[id];
    if (what === "cover") tags.cover = id3Picture(data, v22);
    else if (what) tags[what] = id3Text(data.subarray(1), data[0]);
    p += head + size;
  }
  return tags;
}
// a cover picture: [text encoding] [picture format] [picture type] [description] [the picture's bytes]
function id3Picture(d, v22) {
  const enc = d[0];
  let i = 1, type;
  if (v22) { type = "image/" + (String.fromCharCode(d[1], d[2], d[3]).toLowerCase() === "png" ? "png" : "jpeg"); i = 4; }
  else { while (d[i]) i++; type = new TextDecoder("latin1").decode(d.subarray(1, i)) || "image/jpeg"; i++; if (!type.includes("/")) type = "image/" + type.toLowerCase(); }
  i++;   // the picture type (front cover, back cover, ...)
  if (enc === 1 || enc === 2) { while (i + 1 < d.length && (d[i] || d[i + 1])) i += 2; i += 2; }   // a 2-byte-per-letter description
  else { while (i < d.length && d[i]) i++; i++; }
  return { type, data: d.slice(i).buffer };
}
function readMP4(b) {
  const u32 = i => (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0;
  const name = i => String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
  const sizeAt = i => { const s = u32(i); return s === 1 ? u32(i + 8) * 4294967296 + u32(i + 12) : s === 0 ? b.length - i : s; };
  // find the box called want between start and end: each box starts with its size (4 bytes) and name (4 letters)
  const find = (start, end, want) => {
    for (let p = start; p + 8 <= end;) { const s = sizeAt(p); if (s < 8) return null; if (name(p) === want) return [p, p + s]; p += s; }
    return null;
  };
  const moov = find(0, b.length, "moov"), udta = moov && find(moov[0] + 8, moov[1], "udta");
  const meta = udta && find(udta[0] + 8, udta[1], "meta"), ilst = meta && find(meta[0] + 12, meta[1], "ilst");
  if (!ilst) return {};
  const wanted = { "\xa9nam": "title", "\xa9ART": "artist", "\xa9alb": "album", covr: "cover" }, tags = {};
  for (let p = ilst[0] + 8; p + 8 <= ilst[1];) {
    const s = sizeAt(p), what = wanted[name(p)], data = what && find(p + 8, p + s, "data");
    if (data) {
      const bytes = b.subarray(data[0] + 16, data[1]);   // after the data box's type and locale
      if (what === "cover") tags.cover = { type: u32(data[0] + 8) === 14 ? "image/png" : "image/jpeg", data: bytes.slice().buffer };
      else tags[what] = new TextDecoder().decode(bytes).trim();
    }
    if (s < 8) break;
    p += s;
  }
  return tags;
}

// ----- adding, loading and removing songs -----
async function addSongs(files) {
  const added = [];
  for (const file of files) {
    try {
      const data = await file.arrayBuffer(), tags = readTags(data);
      const info = { id: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: file.name.replace(/\.[^.]+$/, ""),
                     type: file.type || "audio/mpeg", title: tags.title || "", artist: tags.artist || "", album: tags.album || "",
                     cover: tags.cover || null, added: Date.now() };
      await fileDo("songs", "readwrite", st => st.put({ type: info.type, data }, info.id));
      await fileDo("songinfo", "readwrite", st => st.put(info, info.id));
      mySongs.push(info);
      added.push(info);
    } catch (e) {
      musicMsg("Couldn't save " + file.name + (e && e.name === "QuotaExceededError" ? ": this device is out of space for Qarbon." : "."));
    }
  }
  if (!added.length) return;
  songList = null;   // play through all your songs
  // ask the browser to keep these files even when space runs low (Safari may otherwise clear them after a while)
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  renderMusic();
  playSong(mySongs.indexOf(added[0]));   // play the first one you added
}
async function loadMySongs() {
  try {
    mySongs = (await fileDo("songinfo", "readonly", st => st.getAll())).sort((a, b) => a.added - b.added);
    renderMusic();
  } catch (e) {}   // no storage here (private window?): no saved songs
}
async function removeSong(i) {
  const s = mySongs[i];
  if (!s) return;
  if (i === songIndex) stopFile();
  try {
    await fileDo("songs", "readwrite", st => st.delete(s.id));
    await fileDo("songinfo", "readwrite", st => st.delete(s.id));
  } catch (e) {}
  mySongs.splice(i, 1);
  if (songIndex > i) songIndex--;
  // the list being played: take this song out, and the songs after it move up one number
  if (songList) songList = songList.filter(n => n !== i).map(n => n > i ? n - 1 : n);
  if (songList && !songList.length) songList = null;
  played = played.filter(p => p.fileId !== s.id);
  renderMusic();
}

// ----- playing them -----
async function playSong(i) {
  const s = mySongs[i];
  if (!s) return;
  let rec;
  try { rec = await fileDo("songs", "readonly", st => st.get(s.id)); } catch (e) {}
  if (!rec) { musicMsg("Couldn't find that song on this device any more."); return; }
  // switching from a YouTube/SoundCloud link: take its player away (the link stays saved for later)
  musicKind = "file";
  emptyPlayer();
  if (audio.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);   // free the last song's memory
  if (coverURL) URL.revokeObjectURL(coverURL);
  coverURL = s.cover ? URL.createObjectURL(new Blob([s.cover.data], { type: s.cover.type })) : "";
  songIndex = i;
  audio.src = URL.createObjectURL(new Blob([rec.data], { type: rec.type }));
  audio.play().catch(() => {});   // if the phone refuses (no tap), ▶ starts it
  musicMsg("");
  notePlayed({ key: "file:" + s.id, kind: "File", fileId: s.id, title: songName(s) }, false);
  // the lock screen and Control Center: the song's name, cover and ⏮ ⏭ (the Media Session API)
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: songName(s), artist: s.artist, album: s.album,
                                                          artwork: coverURL ? [{ src: coverURL, type: s.cover.type }] : [] });
  }
  fitIfStudying();
}
function stopFile() {
  if (musicKind !== "file") return;
  audio.pause();
  songIndex = -1;
  musicKind = "link";
  if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
}
// the list being played (see songList): song numbers in mySongs
const playingList = () => songList || mySongs.map((s, i) => i);
// play the song at place pos of a list (an album, an artist...), and keep ⏮ ⏭ inside that list
function playFrom(list, pos) {
  songList = list;
  playSong(list[pos]);
}
// the next / previous song in the list (shuffle: any other one in it)
function stepSong(dir) {
  const list = playingList();
  if (!list.length) return;
  if (shuffleOn && list.length > 1) { let n; do n = list[Math.floor(Math.random() * list.length)]; while (n === songIndex); return playSong(n); }
  const pos = list.indexOf(songIndex);   // -1 if the song isn't in the list: then ⏭ starts at its beginning
  playSong(list[(pos + dir + list.length) % list.length]);
}
audio.addEventListener("ended", () => {
  if (musicKind !== "file") return;
  if (repeatMode === "one") { audio.currentTime = 0; audio.play().catch(() => {}); }
  else if (shuffleOn || repeatMode === "all" || playingList().indexOf(songIndex) < playingList().length - 1) stepSong(1);
  else renderMusic();   // the end of the list: stop
});
audio.addEventListener("play", renderMusic);
audio.addEventListener("pause", renderMusic);
audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", updateProgress);
audio.addEventListener("error", () => { if (musicKind === "file") musicMsg("This file's format can't play here. MP3, M4A, AAC and WAV work best."); });
if ("mediaSession" in navigator) {
  [["play", () => audio.play()], ["pause", () => audio.pause()], ["previoustrack", () => stepSong(-1)], ["nexttrack", () => stepSong(1)],
   ["seekto", d => { audio.currentTime = d.seekTime; }]].forEach(([action, fn]) => {
    try { navigator.mediaSession.setActionHandler(action, d => { if (musicKind === "file") fn(d); }); } catch (e) {}   // some phones don't have every action
  });
}

// ================= the buttons =================
// ⏮ ⏭: in a YouTube/SoundCloud playlist → through the playlist; your files → through your files;
// otherwise → through Played this session (⏮ = the one played before, ⏭ = the one after)
function playPlayed(i) {
  const s = played[i];
  if (!s) return;
  if (s.kind === "File") { const n = mySongs.findIndex(x => x.id === s.fileId); if (n >= 0) { if (songList && !songList.includes(n)) songList = null; playSong(n); } }
  else playLink(s.link, false);
  playedPos = i;
  renderMusic();
}
function musicStep(dir) {
  const m = musicKind === "link" && state.music && musicEmbed(state.music);
  if (m && m.playlist) return musicCommand(dir > 0 ? "next" : "prev");
  if (musicKind === "file") return stepSong(dir);
  const i = playedPos - dir;   // newest is at the top, so "next" goes up the list
  if (i >= 0 && i < played.length) playPlayed(i);
}

musicPanels().forEach(p => {
  p.querySelector(".musicset").onclick = () => { unlockAudio(); setMusic(p); };
  p.querySelector(".musicurl").addEventListener("keydown", e => { if (e.key === "Enter") setMusic(p); });
  p.querySelector(".musicprev").onclick = () => { unlockAudio(); musicStep(-1); };
  p.querySelector(".musicnext").onclick = () => { unlockAudio(); musicStep(1); };
  p.querySelector(".musicplay").onclick = () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); };
  p.querySelector(".musicshuffle").onclick = () => { shuffleOn = !shuffleOn; renderMusic(); };
  p.querySelector(".musicrepeat").onclick = () => { repeatMode = { off: "all", all: "one", one: "off" }[repeatMode]; renderMusic(); };
  p.querySelector(".seek").addEventListener("input", e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; });
  p.querySelector(".musicfile").addEventListener("click", unlockAudio);
  p.querySelector(".musicfile").addEventListener("change", e => { addSongs([...e.target.files]); e.target.value = ""; });
  // the two lists: tap a song to play it, ✕ to remove one of yours from this phone
  p.addEventListener("click", e => {
    const b = e.target.closest("[data-song], [data-del], [data-played]");
    if (!b) return;
    unlockAudio();
    if (b.dataset.song) { songList = null; playSong(+b.dataset.song); }   // from the panel's list: through all your songs
    else if (b.dataset.del) removeSong(+b.dataset.del);
    else playPlayed(+b.dataset.played);
  });
  p.querySelector(".musicclear").onclick = () => {
    if (musicKind === "file") { stopFile(); audio.removeAttribute("src"); audio.load(); }
    else { state.music = ""; save(); }
    showMusic(false);
    fitIfStudying();
  };
});
showMusic(false);
loadMySongs();
