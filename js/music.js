// Qarbon · js/music.js: the YouTube / SoundCloud music player.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= music: a YouTube or SoundCloud player inside the timer panel =================
// You paste a normal link (like youtube.com/watch?v=... or soundcloud.com/artist/track).
// musicEmbed turns it into that site's official "embed" player address, and only accepts
// YouTube and SoundCloud, so nothing else can be loaded into the page.
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
    // enablejsapi=1 lets the ⏮ ⏭ buttons send "previous" / "next" to the player
    const extras = "?playsinline=1&rel=0&enablejsapi=1" + (safe(list) ? "&list=" + list : "");
    if (safe(id)) return { kind: "YouTube", playlist: safe(list), src: "https://www.youtube-nocookie.com/embed/" + id + extras };
    if (safe(list)) return { kind: "YouTube", playlist: true, src: "https://www.youtube-nocookie.com/embed/videoseries" + extras };
    return null;
  }
  if ((host === "soundcloud.com" || host === "on.soundcloud.com") && u.pathname.length > 1) {
    const page = "https://" + host + u.pathname;   // a track, playlist or artist page
    return { kind: "SoundCloud", playlist: /\/sets\//.test(u.pathname),   // SoundCloud playlists live under /sets/
             src: "https://w.soundcloud.com/player/?url=" + encodeURIComponent(page) +
                  "&color=%237b6cff&visual=false&show_comments=false" };
  }
  return null;
}

const musicPanels = () => [...document.querySelectorAll(".musicpanel")];
const fitIfStudying = () => { if (!$("study").hidden && cardShowing()) fitCard(); };

// (re)build the one player from the saved link. autoplay is only used right after you press Play,
// because browsers block sound that starts without a tap.
function showMusic(autoplay) {
  const host = $("playerhost"), m = state.music ? musicEmbed(state.music) : null;
  host.innerHTML = "";
  host.dataset.pos = "";
  $("timer").classList.toggle("hasmusic", !!m);
  musicPanels().forEach(p => {
    // each panel reserves a space shaped like the player; ⏮ ⏭ only for playlists
    p.querySelector(".playerslot").className = "playerslot" + (m ? (m.kind === "YouTube" ? " yt" : " sc") : "");
    p.querySelector(".musicnav").hidden = !(m && m.playlist);
    p.querySelector(".musicclear").hidden = !m;
  });
  if (!m) return;
  const f = document.createElement("iframe");
  f.src = m.src + (autoplay ? (m.kind === "YouTube" ? "&autoplay=1" : "&auto_play=true") : "");
  f.title = m.kind + " player";
  f.allow = "autoplay; encrypted-media; picture-in-picture";
  f.referrerPolicy = "strict-origin-when-cross-origin";   // YouTube needs to know which website the player is on
  host.appendChild(f);
}

// Keep the player sitting exactly on top of the music panel you can see. When neither panel is
// showing (timer dropdown closed, or another page), it's parked off-screen, still playing.
// Moving it this way, instead of moving it into the other panel, is what stops the music restarting.
function placePlayer() {
  const host = $("playerhost");
  if (host.firstChild) {
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
  }
  requestAnimationFrame(placePlayer);   // check again on the next screen refresh
}
requestAnimationFrame(placePlayer);

// ⏮ ⏭: ask the player to change track, using each site's official message format
function musicCommand(which) {
  const f = $("playerhost").querySelector("iframe"), m = state.music && musicEmbed(state.music);
  if (!f || !m) return;
  if (m.kind === "YouTube")
    f.contentWindow.postMessage(JSON.stringify({ event: "command", func: which === "next" ? "nextVideo" : "previousVideo", args: [] }),
                                "https://www.youtube-nocookie.com");
  else f.contentWindow.postMessage(JSON.stringify({ method: which }), "https://w.soundcloud.com");
}

function setMusic(panel) {
  const input = panel.querySelector(".musicurl"), note = panel.querySelector(".musicmsg");
  const link = input.value.trim();
  if (!musicEmbed(link)) { note.textContent = "That doesn't look like a YouTube or SoundCloud link."; return; }
  state.music = link;
  save();
  input.value = "";
  musicPanels().forEach(p => { p.querySelector(".musicmsg").textContent = ""; });
  showMusic(true);
  fitIfStudying();   // the player makes the timer panel taller
}

musicPanels().forEach(p => {
  p.querySelector(".musicset").onclick = () => setMusic(p);
  p.querySelector(".musicurl").addEventListener("keydown", e => { if (e.key === "Enter") setMusic(p); });
  p.querySelector(".musicprev").onclick = () => musicCommand("prev");
  p.querySelector(".musicnext").onclick = () => musicCommand("next");
  p.querySelector(".musicclear").onclick = () => {
    state.music = "";
    save();
    showMusic(false);
    fitIfStudying();
  };
});
showMusic(false);
