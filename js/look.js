// Qarbon · js/look.js: the atom logo and the star background (the real night sky, from js/stars.js).
// The script files run in the order index.html lists them, and share one set of variables.

// ================= the Qarbon logo: "Qarb" + an atom + "n" =================
// The atom is drawn in a 100 x 100 box: three thin orbits (each with one electron) and a nucleus in the middle.
// w = line thickness, measured inside that box, so the atom grows and shrinks with the letters around it.
function atomSVG(w) {
  const electrons = [[96, 50], [4, 50], [50, 33.5]];   // where each orbit's electron sits
  const orbits = [0, 60, 120].map((angle, i) =>
    `<g transform="rotate(${angle} 50 50)"><ellipse cx="50" cy="50" rx="46" ry="16.5" fill="none" stroke="#fff" stroke-width="${w * .75}"/>` +
    `<circle class="e" cx="${electrons[i][0]}" cy="${electrons[i][1]}" r="${w * 1.5}" fill="#fff" style="animation-delay:-${i * .8}s"/></g>`).join("");
  return `<svg class="atom" viewBox="0 0 100 100" aria-hidden="true"><g class="orbits">${orbits}</g>` +
         `<circle cx="50" cy="50" r="${w * 1.6}" fill="#fff"/></svg>`;
}
// the whole logo as HTML: plain letters, so it scales with the font size (set in the styles, .qlogo)
function qarbonLogo({ small = false } = {}) {
  return "Qarb" + atomSVG(small ? 6.5 : 4.5) + "n";   // slightly thicker lines in the small top-bar logo, so it stays clear
}

// draw it: big on the home screen (its orbits turn, see .spin in the styles), small in the top bar
$("homelogo").innerHTML = qarbonLogo();
$("logo").innerHTML = `<span class="qlogo">${qarbonLogo({ small: true })}</span>`;

// ================= space background: the real night sky, drawn on a canvas =================
// The stars come from the Yale Bright Star Catalog (js/stars.js): every star you could see by eye on a dark night,
// each at its true place, brightness and color. The view looks at the north galactic pole, the darkest part of the sky
// (straight out of the Milky Way's disk), so it's real space without the Milky Way's bright glow.
// You can find real patterns in it, like the Big Dipper, Arcturus and the Coma star cluster.
const sky = $("sky"), twinkle = $("twinkle");
let skyW = 0, skyH = 0, skyDpr = 1, brightStars = [];

// a star's temperature (kelvin) → its color as "r,g,b": cool stars orange, hot ones blue-white.
// Mixed a little toward white, the way stars look in a real photo.
function starColor(k) {
  const t = k / 100;
  const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -.1332);
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -.0755);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
  return [r, g, b].map(v => Math.round(.55 * Math.max(0, Math.min(255, v)) + .45 * 245)).join(",");
}

// a "seeded" random number generator: the same sky every time, so it doesn't reshuffle when the screen resizes
function seeded(seed) { return () => (seed = seed * 16807 % 2147483647) / 2147483647; }

function glow(g, x, y, r, rgb, alpha) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, "rgba(" + rgb + "," + alpha + ")");
  grd.addColorStop(1, "rgba(" + rgb + ",0)");
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
function dot(g, x, y, r, rgb, alpha) {
  g.fillStyle = "rgba(" + rgb + "," + Math.min(1, alpha) + ")"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}

// how a star of this magnitude looks: its size and how strongly it shows (magnitude 1 = a bright star)
function starLook(mag) {
  const f = Math.pow(10, -.4 * (mag - 1));   // its brightness compared with a magnitude-1 star
  return { f, r: Math.min(2.1, .45 + .7 * Math.sqrt(f)), a: Math.min(1, .24 + .8 * Math.pow(f, .45)) };
}

function drawSky() {
  // cover the whole screen, even the part under Safari's toolbar, and only redraw if the screen got bigger
  const w = Math.max(innerWidth, screen.width), h = Math.max(innerHeight, screen.height);
  if (w <= skyW && h <= skyH) return;
  skyW = w; skyH = h;
  skyDpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(4e6 / (w * h)));   // sharp on phones, but not too much memory on big screens
  [sky, twinkle].forEach(c => {
    c.width = w * skyDpr; c.height = h * skyDpr; c.style.width = w + "px"; c.style.height = h + "px";
    c.getContext("2d").setTransform(skyDpr, 0, 0, skyDpr, 0, 0);
  });
  const g = sky.getContext("2d"), rnd = seeded(20261020);
  g.fillStyle = "#030306"; g.fillRect(0, 0, w, h);   // space black (same as --bg)

  // where each star lands on the screen: a "stereographic" projection (like a wide-angle lens) around the
  // north galactic pole. About 120° of sky from corner to corner; east is on the left, as on the real sky.
  const rad = Math.PI / 180, ra0 = 192.86 * rad, de0 = 27.13 * rad, sd0 = Math.sin(de0), cd0 = Math.cos(de0);
  const R = Math.hypot(w, h) / 2 / 1.155, cx = w / 2, cy = h / 2;
  const place = (ra, de) => {
    const cosc = sd0 * Math.sin(de) + cd0 * Math.cos(de) * Math.cos(ra - ra0);   // how far from the middle of the view
    if (cosc < -.2) return null;                                                 // behind us
    const k = 2 / (1 + cosc);
    return [cx - k * Math.cos(de) * Math.sin(ra - ra0) * R,
            cy - k * (cd0 * Math.sin(de) - sd0 * Math.cos(de) * Math.cos(ra - ra0)) * R];
  };
  const onScreen = (x, y) => x > -10 && y > -10 && x < w + 10 && y < h + 10;

  // faint background stars, too faint for the catalog: many of them, like in a long-exposure photo
  for (let i = 0; i < w * h / 200; i++) {
    const { r, a } = starLook(6.4 + 3 * Math.pow(rnd(), .6));
    dot(g, rnd() * w, rnd() * h, r, starColor(STAR_TEMPS[Math.floor(rnd() * 8)]), a);
  }

  // the real stars, unpacked from js/stars.js (4 bytes each, see there)
  brightStars = [];
  const bytes = atob(STAR_DATA);
  for (let i = 0; i < bytes.length; i += 4) {
    const b0 = bytes.charCodeAt(i), b1 = bytes.charCodeAt(i + 1), b2 = bytes.charCodeAt(i + 2), b3 = bytes.charCodeAt(i + 3);
    const ra = ((b0 << 4) | (b1 >> 4)) / 4095 * 360, de = (((b1 & 15) << 8) | b2) / 4095 * 180 - 90;
    const p = place(ra * rad, de * rad);
    if (!p || !onScreen(p[0], p[1])) continue;
    const mag = (b3 >> 3) * .25 - 1.5, c = starColor(STAR_TEMPS[b3 & 7]), { f, r, a } = starLook(mag);
    // the brightest ones go on the twinkle layer; the rest are drawn once, here
    if (mag < 3) brightStars.push({ x: p[0], y: p[1], r, a, c, halo: .3 * Math.min(1, f + .15), phase: rnd() * 7, speed: .4 + rnd() * 1.1 });
    else dot(g, p[0], p[1], r, c, a);
  }
  drawTwinkle(0);
}

// the bright stars live on their own layer, so they can twinkle gently without redrawing the whole sky
function drawTwinkle(time) {
  const g = twinkle.getContext("2d");
  g.clearRect(0, 0, skyW, skyH);
  brightStars.forEach(s => {
    const k = .88 + .12 * Math.sin(time / 1000 * s.speed + s.phase);
    glow(g, s.x, s.y, s.r * 6, s.c, s.halo * k);   // a soft halo
    dot(g, s.x, s.y, s.r, s.c, s.a * k);
  });
}

drawSky();
window.addEventListener("resize", drawSky);
// twinkle about 12 times a second (smooth enough, easy on the battery); skipped if the phone asks for less motion
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let last = 0;
  const loop = t => { if (!document.hidden && t - last > 80) { drawTwinkle(t); last = t; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
