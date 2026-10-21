// Qarbon · js/look.js: the atom logo and the star background.
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

// ================= space background: stars, the Milky Way and faint nebulae, drawn on a canvas =================
const sky = $("sky"), twinkle = $("twinkle");
let skyW = 0, skyH = 0, skyDpr = 1, brightStars = [];

// real star colors ("r,g,b"): hot stars are blue-white, cool ones orange, most look white
const STAR_COLORS  = ["155,176,255", "170,191,255", "202,215,255", "248,247,255", "255,244,234", "255,210,161", "255,204,111"];
const STAR_WEIGHTS = [1, 2, 4, 10, 6, 3, 2];   // how common each color is

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
  const bell = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;   // random number between -1 and 1, mostly near 0
  const color = () => { let t = rnd() * 28; return STAR_COLORS.find((c, i) => (t -= STAR_WEIGHTS[i]) < 0) || STAR_COLORS[3]; };

  g.fillStyle = "#030306"; g.fillRect(0, 0, w, h);   // space black (same as --bg)

  // a very faint purple haze in the top-left corner (the rest stays black)
  const big = Math.max(w, h);
  glow(g, .15 * w, 0, .6 * big, "123,108,255", .08);

  // the Milky Way: a band from bottom-left to top-right. t = how far along it, s = how far across it (-1..1)
  const x0 = -.1 * w, y0 = .9 * h, x1 = 1.1 * w, y1 = .1 * h;
  const len = Math.hypot(x1 - x0, y1 - y0), nx = (y0 - y1) / len, ny = (x1 - x0) / len;
  const bandW = Math.min(w, h) * .22;
  const onBand = (t, s) => [x0 + (x1 - x0) * t + nx * s * bandW, y0 + (y1 - y0) * t + ny * s * bandW];
  for (let i = 0; i < 160; i++) {   // soft glowing haze
    const [x, y] = onBand(rnd(), bell() * .8);
    glow(g, x, y, bandW * (.2 + rnd() * .5), rnd() < .5 ? "255,225,200" : "190,200,255", .014);
  }
  for (let i = 0; i < 70; i++) {    // dark dust lanes down the middle
    const [x, y] = onBand(rnd(), bell() * .25);
    glow(g, x, y, bandW * (.08 + rnd() * .2), "3,4,10", .35);
  }
  for (let i = 0; i < w * h / 700; i++) {   // tiny stars packed into the band
    const [x, y] = onBand(rnd(), bell());
    dot(g, x, y, .3 + rnd() * .5, color(), .15 + rnd() * .45);
  }

  // stars everywhere: lots of dim ones, very few bright ones (like a real sky)
  brightStars = [];
  for (let i = 0; i < w * h / 1600; i++) {
    const x = rnd() * w, y = rnd() * h, m = Math.pow(rnd(), 6), c = color();   // m: 0 = dim ... 1 = bright
    if (m > .35) brightStars.push({ x, y, r: .7 + m * 1.3, c, spikes: m > .92, phase: rnd() * 7, speed: .4 + rnd() * 1.2 });
    else dot(g, x, y, .35 + m * 1.5, c, .3 + m * 1.6);
  }
  drawTwinkle(0);
}

// the bright stars live on their own layer, so they can twinkle without redrawing the whole sky
function drawTwinkle(time) {
  const g = twinkle.getContext("2d");
  g.clearRect(0, 0, skyW, skyH);
  brightStars.forEach(s => {
    const a = .75 + .25 * Math.sin(time / 1000 * s.speed + s.phase);
    glow(g, s.x, s.y, s.r * 5, s.c, .3 * a);
    dot(g, s.x, s.y, s.r, s.c, a);
    if (s.spikes) {   // the little cross of light you see on bright stars in telescope photos
      g.strokeStyle = "rgba(" + s.c + "," + .35 * a + ")"; g.lineWidth = .6; g.beginPath();
      g.moveTo(s.x - s.r * 7, s.y); g.lineTo(s.x + s.r * 7, s.y);
      g.moveTo(s.x, s.y - s.r * 7); g.lineTo(s.x, s.y + s.r * 7); g.stroke();
    }
  });
}

drawSky();
window.addEventListener("resize", drawSky);
// twinkle about 12 times a second (smooth enough, easy on the battery); skipped if the phone asks for less motion
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let last = 0;
  const loop = t => { if (t - last > 80) { drawTwinkle(t); last = t; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
