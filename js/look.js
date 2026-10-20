// Qarbon · js/look.js: the constellation logo and the star background.
// The script files run in the order index.html lists them, and share one set of variables.

// ================= the "Qarbon Constellation" logo =================
// Qarbon Constellation logo. Returns an SVG string.
// Each letter sits on a 7-wide x 10-tall grid: s = star positions, l = lines joining star indexes.
const QARBON_GLYPHS = {
  Q: { w: 7.5, s: [[3.5,0],[6,1.6],[6.6,5],[5.2,8.8],[2,9],[0.5,5.2],[1.1,1.6],[4.6,7.4],[7.4,10.6]],
       l: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[7,8]] },
  A: { w: 7, s: [[0,10],[3.5,0],[7,10],[1.7,5.4],[5.3,5.4]], l: [[0,1],[1,2],[3,4]] },
  R: { w: 6.2, s: [[0,10],[0,0],[4.4,0.3],[6,2.6],[4.4,5],[0,5],[6,10]], l: [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6]] },
  B: { w: 6.2, s: [[0,10],[0,0],[4,0.2],[5.4,2.4],[3.8,5],[0,5],[5.2,6.4],[6.2,8.4],[4.4,10]],
       l: [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[6,7],[7,8],[8,0]] },
  O: { w: 7, s: [[3.5,0],[6.6,2.4],[7,6.2],[4.8,9.8],[1.6,9.4],[0,6],[0.6,2.2]], l: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]] },
  N: { w: 6.4, s: [[0,10],[0,0],[6.4,10],[6.4,0]], l: [[0,1],[1,2],[2,3]] }
};
const QARBON_STAR_SIZES = [1, .55, .8, .45, .7, .6, .9, .5, .75]; // fixed so the logo is identical every time
let qarbonLogoCount = 0;

function qarbonLogo({ small = false } = {}) {
  const gap = 3, pad = 1.6;
  let x = pad, k = 0;
  const stars = [], lines = [];
  for (const ch of "QARBON") {
    const g = QARBON_GLYPHS[ch];
    const pts = g.s.map(([sx, sy]) => [x + sx, pad + sy]);
    pts.forEach(([px, py], i) => stars.push({
      x: px, y: py,
      r: (small ? .55 : .42) + QARBON_STAR_SIZES[(k + i) % QARBON_STAR_SIZES.length] * (small ? .55 : .45)
    }));
    g.l.forEach(([a, b]) => lines.push([pts[a], pts[b]]));
    k += g.s.length;
    x += g.w + gap;
  }
  const W = +(x - gap + pad).toFixed(1), H = 10 + pad * 2 + 1;
  const id = "qarbonGrad" + (qarbonLogoCount++); // unique id, since the logo appears more than once
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Qarbon">
    <defs>
      <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0">
        <stop offset="0" stop-color="#b9a9ff"/><stop offset=".5" stop-color="#6fc3ff"/><stop offset="1" stop-color="#ff9be6"/>
      </linearGradient>
      <filter id="${id}Glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${small ? .35 : .45}" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g stroke="url(#${id})" stroke-width="${small ? .28 : .16}" stroke-linecap="round" opacity=".55">`;
  for (const [[x1, y1], [x2, y2]] of lines) svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  svg += `</g><g fill="url(#${id})" filter="url(#${id}Glow)">`;
  for (const s of stars) svg += `<circle cx="${s.x.toFixed(2)}" cy="${s.y.toFixed(2)}" r="${s.r.toFixed(2)}"/>`;
  svg += `</g></svg>`;
  return svg;
}

// draw it: big on the home screen, small in the top bar (both are generated, so no font files are needed)
$("homelogo").innerHTML = qarbonLogo();
$("logo").innerHTML = qarbonLogo({ small: true });

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
