// Qarbon · js/worlds.js: the worlds on the home screen, made from real things.
// The script files run in the order index.html lists them, and share one set of variables.
//
//   Solar System the logo atom as a sun, with real planet photos circling it (drawn here, below)
//   Habits      the Earth, live: NASA maps on a turning globe, lit where the Sun really is right now (a ring of today's minutes, js/habits.js)
//   Media       the logo atom wearing headphones · Decks a fan of Qarbon card backs
//   Translate   Bruegel's Tower of Babel · Reading the Moon in tonight's real phase · Focus the Crab Nebula (Hubble photo)
//   Arcade      a glowing arcade cabinet with Wordfighter on its screen (drawn here); B.A.R. Exam's Sun (it goes supernova
//               when you tap it, in the styles) is a tile inside the Arcade since build 77
//
// The Solar System (the first world you see) is drawn right away; the photos of the others load
// just after the home screen appears, so starting the app isn't slower.

const stillMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ================= the Moon: tonight's phase =================
// Meeus's short formula (Astronomical Algorithms, chapter 48): the Moon's "phase angle" from where the Sun and
// Moon are in their orbits. Accurate to about 1%. k = how much of the Moon is lit (0 = new, 1 = full);
// waxing = the lit part is growing, and (seen from the northern hemisphere) it's on the right.
function moonPhase(date) {
  const T = (date / 864e5 + 2440587.5 - 2451545) / 36525, rad = Math.PI / 180;   // centuries since the year 2000
  const D = 297.8501921 + 445267.1114034 * T;    // how far the Moon is ahead of the Sun
  const M = 357.5291092 + 35999.0502909 * T;     // where the Sun is in its (yearly) cycle
  const Mp = 134.9633964 + 477198.8675055 * T;   // where the Moon is in its (monthly) cycle
  const i = 180 - D - 6.289 * Math.sin(Mp * rad) + 2.1 * Math.sin(M * rad) - 1.274 * Math.sin((2 * D - Mp) * rad)
            - .658 * Math.sin(2 * D * rad) - .214 * Math.sin(2 * Mp * rad) - .11 * Math.sin(D * rad);
  const k = (1 + Math.cos(i * rad)) / 2, waxing = ((D % 360) + 360) % 360 < 180;
  const name = k < .02 ? "New Moon" : k > .98 ? "Full Moon" : Math.abs(k - .5) < .04 ? (waxing ? "First quarter" : "Last quarter")
             : (waxing ? "Waxing " : "Waning ") + (k < .5 ? "crescent" : "gibbous");
  return { k, waxing, name };
}
// the line under the Moon on the home screen, like "Waxing gibbous · 73% lit tonight"
function moonLine() {
  const m = moonPhase(new Date());
  return m.name + " · " + Math.round(m.k * 100) + "% lit tonight";
}
// the Moon as a picture: NASA's photo of the full Moon, with the part in shadow masked off.
// The lit part is half the Moon's edge plus the curved "terminator" (the line between day and night), which is
// half an ellipse: c says where it crosses the middle (-1 = left edge, 0 = straight down the middle, 1 = right edge).
function moonSVG() {
  const { k, waxing } = moonPhase(new Date()), r = 46, c = 1 - 2 * k;
  const lit = `M50 ${50 - r} A${r} ${r} 0 0 1 50 ${50 + r} A${Math.abs(c) * r} ${r} 0 0 ${c < 0 ? 1 : 0} 50 ${50 - r}Z`;
  const flip = waxing ? "" : ` transform="translate(100 0) scale(-1 1)"`;   // waning: lit on the left instead
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
      <filter id="moonsoft"><feGaussianBlur stdDeviation="1.1"/></filter>
      <mask id="moonlit"><path d="${lit}" fill="#fff" filter="url(#moonsoft)"${flip}/></mask></defs>
    <image href="img/moon-full.jpg" x="-1" y="-1" width="102" height="102" opacity=".07"/>
    <image href="img/moon-full.jpg" x="-1" y="-1" width="102" height="102" mask="url(#moonlit)"/></svg>`;
}

// ================= Decks: a fan of Qarbon card backs =================
// Five card backs (cardBackHTML in js/collection.js, in the binder's small card shape) fanned out like a hand of cards:
// each one turns 16° more around the same point below the fan, over a soft purple glow. It stays still.
function decksWorldHTML() {
  return '<div class="fan-glow"></div>' +
    [-2, -1, 0, 1, 2].map(k => '<div class="fan-card" style="--k:' + k + '">' + cardBackHTML("earth", true) + '</div>').join("");
}

// ================= the Arcade: a glowing cabinet (the user's pick "A", build 77) =================
// 8-bit pictures as rows of letters: each letter is one pixel, its color looked up by the letter ("." = nothing).
// The same sprites are used by the game itself (js/wordfighter.js): the invaders by word type, and your ship.
const WF_SPRITES = {
  noun: ["..C.....C..", "...C...C...", "..CCCCCCC..", ".CC.CCC.CC.", "CCCCCCCCCCC", "C.CCCCCCC.C", "C.C.....C.C", "...CC.CC..."],
  verb: ["...C...C...", "C..CCCCC..C", "C.CC.C.CC.C", "CCCCCCCCCCC", ".CCCCCCCCC.", "..C.....C..", ".C.......C.", "C.........C"],
  other: ["....CCC....", ".CCCCCCCCC.", "CC..CCC..CC", "CCCCCCCCCCC", "..CC...CC..", ".CC.CCC.CC.", "CC.......CC", "..........."],
  ship: [".....W.....", ".....W.....", "....WPW....", "....WPW....", ".W.WWPWW.W.", ".WWWPPPWWW.", "WWPWWWWWPWW", "WW.WWWWW.WW", "W...O.O...W"]
};
// a sprite as SVG squares, its top left corner at (x, y), each pixel p units big
const pixelSVG = (rows, colors, x, y, p) => rows.map((r, j) => [...r].map((ch, i) => colors[ch]
  ? `<rect x="${(x + i * p).toFixed(2)}" y="${(y + j * p).toFixed(2)}" width="${p}" height="${p}" fill="${colors[ch]}"/>` : "").join("")).join("");
function arcadeWorldSVG() {
  return `<svg viewBox="0 0 100 100" shape-rendering="crispEdges" aria-hidden="true">
    <defs><radialGradient id="ar-glow" r=".5"><stop offset="0" stop-color="#7b6cff" stop-opacity=".55"/><stop offset=".6" stop-color="#3b5bd0" stop-opacity=".14"/><stop offset="1" stop-opacity="0"/></radialGradient>
      <linearGradient id="ar-cab" x1="0" x2="1"><stop offset="0" stop-color="#1a1530"/><stop offset=".5" stop-color="#2a2150"/><stop offset="1" stop-color="#14102a"/></linearGradient></defs>
    <circle cx="50" cy="50" r="62" fill="url(#ar-glow)" shape-rendering="auto"/>
    <path d="M26 8 H74 L76 18 H24 Z" fill="#5a49e6"/>
    <text x="50" y="15.6" font-family="'Courier New', monospace" font-size="6" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="1.2" shape-rendering="auto">ARCADE</text>
    <path d="M24 18 H76 V58 L84 70 V96 H16 V70 L24 58 Z" fill="url(#ar-cab)" stroke="#7b6cff" stroke-width=".8"/>
    <rect x="29" y="22" width="42" height="33" rx="2" fill="#030306" stroke="#9a8cff" stroke-width=".6"/>
    <g class="ar-bugs">${pixelSVG(WF_SPRITES.noun, { C: "#6FB7FF" }, 33, 26, .9)}${pixelSVG(WF_SPRITES.verb, { C: "#5CE1A6" }, 45, 26, .9)}${pixelSVG(WF_SPRITES.noun, { C: "#FF8FD0" }, 57, 26, .9)}</g>
    <rect class="ar-shot" x="49.6" y="38" width=".9" height="4" fill="#FFD166"/>
    ${pixelSVG(WF_SPRITES.ship, { W: "#E8E8F4", P: "#7b6cff", O: "#FFD166" }, 45, 45, .9)}
    <rect x="20" y="70" width="60" height="9" fill="#0d0b1c" stroke="#7b6cff" stroke-width=".5"/>
    <g shape-rendering="auto"><circle cx="32" cy="74.5" r="2.4" fill="#FF5470"/><rect x="31.3" y="70.5" width="1.4" height="4" fill="#ccc"/>
      <circle cx="58" cy="74.5" r="2" fill="#FFD166"/><circle cx="65" cy="74.5" r="2" fill="#5CE1A6"/></g>
  </svg>`;
}

// ================= the Earth: a live globe (WebGL) =================
// WebGL draws with the phone's graphics chip. The "fragment shader" below is a tiny program that runs once for every
// pixel: it works out which point of the globe that pixel shows (latitude, longitude), reads the three NASA maps
// there (land and sea, clouds, city lights), then lights it with the Sun. The Sun sits where it truly is right now
// (the point where it's straight overhead), so the day/night line matches the real world, and the night side
// shows city lights where it's actually night. The globe turns slowly (about one turn every 2 minutes).
const EARTH_FRAG = `
precision highp float;
uniform vec2 res; uniform float t; uniform sampler2D dayMap, cloudMap, nightMap;
uniform vec2 sun;      // (latitude, longitude) of the point where the Sun is straight overhead
void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * res) / (.5 * min(res.x, res.y)) * 1.12;
  float r = length(uv);
  if (r > 1.) {                                                      // just outside the globe: a faint blue halo
    float h = smoothstep(1.06, 1., r);
    gl_FragColor = vec4(vec3(.3, .55, 1.) * h * .35, h * .35); return;
  }
  vec3 n = vec3(uv, sqrt(1. - r * r));                               // the point on the sphere facing this pixel
  float tilt = -.38; vec3 m = vec3(n.x, n.y * cos(tilt) - n.z * sin(tilt), n.y * sin(tilt) + n.z * cos(tilt));   // north tipped toward us
  float centerLon = -1.4 - t * .045;                                 // starts over the Americas, turns eastward
  float lon = centerLon + atan(m.x, m.z), lat = asin(clamp(m.y, -1., 1.));
  vec2 tc = vec2(fract(lon / 6.2832 + .5), .5 - lat / 3.1416);       // where that is on the flat maps
  vec3 day = texture2D(dayMap, tc).rgb, night = texture2D(nightMap, tc).rgb;
  float cloud = texture2D(cloudMap, tc).r;
  // how high the Sun is here: 1 = overhead, 0 = on the horizon, below 0 = night
  float cz = sin(lat) * sin(sun.x) + cos(lat) * cos(sun.x) * cos(lon - sun.y);
  float lit = smoothstep(-.12, .2, cz);                              // a soft day/night line (twilight)
  vec3 surf = mix(day, vec3(.95), cloud * .85);
  vec3 c = surf * (.06 + 1.05 * lit * (.35 + .65 * clamp(cz, 0., 1.)));
  c += night * vec3(1., .82, .55) * (1. - lit) * (1. - cloud * .7) * 1.5;                   // city lights at night
  float ocean = smoothstep(.05, .2, day.b - day.r) * (1. - cloud);
  c += vec3(1., .95, .85) * pow(clamp(cz, 0., 1.), 24.) * ocean * .35 * mix(1., n.z, .5);  // the Sun glinting off the sea
  c += vec3(.3, .55, 1.) * pow(1. - n.z, 2.6) * (.12 + .7 * lit);                          // the blue atmosphere at the edge
  float edge = smoothstep(1., .992, r);
  gl_FragColor = vec4(c * edge, edge);
}`;

// where the Sun is straight overhead right now: [latitude, longitude] in radians (good to about a degree).
// NOAA's formulas: the declination (how far north or south the Sun is, from the season) and the
// "equation of time" (how far the Sun runs ahead of or behind the clock during the year).
function subsolar(date) {
  const dayOfYear = (date - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5, rad = Math.PI / 180;
  const g = 2 * Math.PI / 365 * (dayOfYear - 1 + (date.getUTCHours() - 12) / 24);
  const decl = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g);
  const eot = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g));
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  return [decl, (-(minutes + eot - 720) / 4) * rad];
}

// set up WebGL on a new canvas inside box, with the three maps. Returns a draw(time) function, or null if this
// browser can't do WebGL (then the still photo of the Earth stays).
function makeEarth(box, maps) {
  const cv = document.createElement("canvas");
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true });
  if (!gl) return null;
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }"));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, EARTH_FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  // one rectangle covering the whole canvas: the shader then colors every pixel of it
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = name => gl.getUniformLocation(prog, name);
  ["dayMap", "cloudMap", "nightMap"].forEach((name, i) => {   // hand the three maps to the graphics chip
    gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, maps[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(U(name), i);
  });
  box.appendChild(cv);
  return time => {
    const d = Math.min(devicePixelRatio || 1, 2), W = Math.round(cv.clientWidth * d), H = Math.round(cv.clientHeight * d);
    if (!W) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U("res"), W, H); gl.uniform1f(U("t"), time / 1000);
    gl.uniform2f(U("sun"), ...subsolar(new Date()));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}

// ================= 🎧 Media: the Qarbon atom, wearing headphones =================
// Drawn as an SVG (shapes described in code, sharp at any size) in a 200 x 200 box: the logo's atom with glowing
// orbits in the middle, studio headphones over it, and sound rings coming out of the ear cups.
// The moving parts (orbits turning, the gentle sway, the rings) are CSS animations: see "Media world" in the styles.
function mediaWorldSVG() {
  const orbits = [0, 60, 120].map((angle, i) =>
    `<g transform="rotate(${angle} 100 100)"><ellipse cx="100" cy="100" rx="66" ry="23" fill="none" stroke="url(#mw-orbit)" stroke-width="3.2"/>` +
    `<circle class="mw-e" cx="${[166, 34, 100][i]}" cy="${[100, 100, 77][i]}" r="5.2" fill="#fff" filter="url(#mw-glow)" style="animation-delay:-${i * .8}s"/></g>`).join("");
  // one ear cup, drawn on the left; the right one is the same, mirrored
  const cup = `<g class="mw-cup">
      <path d="M41 74 L35 74 L35 88" fill="none" stroke="url(#mw-metal)" stroke-width="4" stroke-linecap="round"/>
      <rect x="15" y="84" width="30" height="58" rx="14" fill="url(#mw-shell)" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/>
      <rect x="40" y="90" width="11" height="46" rx="5.5" fill="#15131f" stroke="#7b6cff" stroke-width="1.4" stroke-opacity=".75"/>
      <rect x="20" y="92" width="5" height="42" rx="2.5" fill="rgba(255,255,255,.18)"/>
      <g class="mw-ring" fill="none" stroke="#a89dff" stroke-linecap="round">
        <path d="M9 96 Q1 113 9 130" stroke-width="2.2"/><path d="M2 88 Q-10 113 2 138" stroke-width="1.6" style="animation-delay:.4s"/>
      </g></g>`;
  return `<svg viewBox="8 8 184 184" aria-hidden="true">
    <defs>
      <radialGradient id="mw-halo"><stop offset="0" stop-color="#7b6cff" stop-opacity=".35"/><stop offset=".55" stop-color="#2f74c8" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <linearGradient id="mw-orbit" x1="0" x2="1"><stop offset="0" stop-color="#b9b0ff"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8fc2ff"/></linearGradient>
      <linearGradient id="mw-band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4858"/><stop offset=".5" stop-color="#1c1b24"/><stop offset="1" stop-color="#0b0a10"/></linearGradient>
      <linearGradient id="mw-shell" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b4a5a"/><stop offset=".45" stop-color="#1d1c26"/><stop offset="1" stop-color="#08080c"/></linearGradient>
      <linearGradient id="mw-metal" x1="0" x2="1"><stop offset="0" stop-color="#d9dde3"/><stop offset=".5" stop-color="#7d848d"/><stop offset="1" stop-color="#eef1f4"/></linearGradient>
      <filter id="mw-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="100" cy="100" r="108" fill="url(#mw-halo)"/>
    <g class="mw-sway">
      <g class="mw-orbits" filter="url(#mw-glow)">${orbits}</g>
      <circle cx="100" cy="100" r="8" fill="#fff" filter="url(#mw-glow)"/>
      <!-- the headband: a padded arc over the top, with a thin highlight along it -->
      <path d="M36 82 C36 18 164 18 164 82" fill="none" stroke="url(#mw-band)" stroke-width="11" stroke-linecap="round"/>
      <path d="M40 76 C42 26 158 26 160 76" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.6" stroke-linecap="round"/>
      ${cup}<g transform="translate(200 0) scale(-1 1)">${cup}</g>
    </g></svg>`;
}

// ================= 🪐 Solar System: worlds circling the logo atom =================
// An SVG in a 200 x 200 box: the logo's atom in the middle like a sun, three tilted orbits, and five of the card worlds
// (real photos from img/) travelling around them. Each planet moves with <animateMotion> along its orbit's path,
// so it stays upright; the inner ones are faster, like real planets. Paused if the phone asks for less motion.
function solarWorldSVG() {
  const orbit = (rx, ry) => `M${100 - rx} 100 a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
  const orbits = [[50, 17, 14], [74, 25, 24], [98, 33, 38]];   // rx, ry, seconds per trip
  const planets = [["img/earth.jpg", 0, 16, 0], ["img/mars.jpg", 1, 13, 0], ["img/jupiter.jpg", 1, 23, .5],
                   ["img/saturn.jpg", 2, 30, .2], ["img/neptune.jpg", 2, 18, .7]];   // photo, orbit, size, where it starts (0–1)
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs><radialGradient id="sw-halo"><stop offset="0" stop-color="#7b6cff" stop-opacity=".45"/><stop offset=".5" stop-color="#3b5bd0" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <filter id="sw-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle cx="100" cy="100" r="70" fill="url(#sw-halo)"/>
    <g transform="rotate(-14 100 100)">
      ${orbits.map(([rx, ry]) => `<path d="${orbit(rx, ry)}" fill="none" stroke="rgba(200,195,255,.35)" stroke-width=".8"/>`).join("")}
      <g class="sw-atom" filter="url(#sw-glow)"><svg x="76" y="76" width="48" height="48" viewBox="0 0 100 100">${atomSVG(4.5).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>
      ${planets.map(([img, o, size, start]) => `<image href="${img}" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet">` +
        `<animateMotion dur="${orbits[o][2]}s" begin="${-start * orbits[o][2]}s" repeatCount="indefinite" path="${orbit(orbits[o][0], orbits[o][1])}"/></image>`).join("")}
    </g></svg>`;
}

// ================= putting the worlds on the home screen =================
const liveWorlds = [];   // [world element, draw(time)]: the ones that keep moving (the live Earth)

function loadScript(src) {   // add a script file to the page, and tell us when it has run
  return new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
}
function loadImage(src) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}

function setUpWorlds() {
  // the photos: each <img> waits with its address in data-src until now
  document.querySelectorAll(".world img[data-src]").forEach(img => { img.src = img.dataset.src; img.removeAttribute("data-src"); });
  $("w-moon").innerHTML = moonSVG();
  $("w-media").innerHTML = mediaWorldSVG();
  $("w-decks").innerHTML = decksWorldHTML();
  $("w-arcade").innerHTML = arcadeWorldSVG();
  // the Earth: the still photo shows first; the live globe replaces it once its maps have loaded
  loadScript("js/earth-maps.js?v=" + BUILD.match(/build (\d+)/)[1])
    .then(() => Promise.all([EARTH_MAPS.day, EARTH_MAPS.clouds, EARTH_MAPS.night].map(loadImage)))
    .then(maps => {
      const draw = makeEarth($("w-earth"), maps);
      if (!draw) return;   // no WebGL: keep the photo
      draw(performance.now());
      $("w-earth").classList.add("live");   // hides the still photo
      liveWorlds.push([$("w-earth"), draw]);
    })
    .catch(() => {});      // couldn't load the maps (offline before they were ever saved?): keep the photo
}

// redraw the moving worlds about 30 times a second, but only the one you can see: home showing, its slide on,
// and the page not hidden (screen off, other app). If the phone asks for less motion, each is drawn once and stays still.
let worldsLast = 0;
function worldsLoop(t) {
  if (t - worldsLast > 33 && !document.hidden && !$("home").hidden) {
    worldsLast = t;
    liveWorlds.forEach(([el, draw]) => {
      if (!el.closest(".slide").classList.contains("on") || (stillMotion && el.drawn)) return;
      draw(t);
      el.drawn = true;
    });
  }
  requestAnimationFrame(worldsLoop);
}
// the Solar System is the first world you see, so it's drawn at once (its planet photos load with it)
$("w-solar").innerHTML = solarWorldSVG();
if (stillMotion) $("w-solar").querySelector("svg").pauseAnimations();   // less motion: the planets stay where they are

// start once the page has finished loading (so the photos don't slow down the first screen)
function startWorlds() {
  setUpWorlds();
  requestAnimationFrame(worldsLoop);
}
if (document.readyState === "complete") setTimeout(startWorlds, 200);
else addEventListener("load", () => setTimeout(startWorlds, 200));
