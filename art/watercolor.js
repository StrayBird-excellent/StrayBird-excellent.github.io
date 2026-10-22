/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?   watercolor.js 鈥?a tiny brush-stroke painting engine.

   The whole idea lives in stroke(): a polyline's direction is averaged
   at every vertex, that average becomes a normal, and a noisy width is
   pushed out along the normal on both sides. The two edges are then
   stitched into one closed shape and filled. Filled shapes beat
   stroke() because their edges can be irregular, their ends can taper,
   and many translucent layers can bleed into each other.

   No dependencies. Works on a 2D canvas at any DPR.
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

const WC = (() => {
  "use strict";

  /* 鈹€鈹€ noise 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

  // Cheap deterministic hash-noise. Smooth, tileable-enough for brush jitter.
  function hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453123;
    return s - Math.floor(s);
  }
  function noise1(x, seed) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return (hash(i + seed * 57.13) * (1 - u) + hash(i + 1 + seed * 57.13) * u) * 2 - 1;
  }
  function noise2(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix + iy * 57.13 + seed * 131.7);
    const b = hash(ix + 1 + iy * 57.13 + seed * 131.7);
    const c = hash(ix + (iy + 1) * 57.13 + seed * 131.7);
    const d = hash(ix + 1 + (iy + 1) * 57.13 + seed * 131.7);
    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
  }

  // Weighted random in [0,1): biases samples toward the middle,
  // which is why brush strokes look *composed* rather than uniform.
  function gaussish(pow = 24) {
    let x, y;
    do {
      x = Math.random();
      y = Math.random();
    } while (y > Math.exp(-pow * (x - 0.5) * (x - 0.5)));
    return x;
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* 鈹€鈹€ geometry 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

  // A smooth curve through arbitrary control points (Catmull-Rom),
  // resampled to npoints so width modulation is evenly spaced.
  function smoothPath(pts, npnts = 24, tension = 0.5) {
    if (pts.length < 2) return pts.slice();
    const out = [];
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    for (let s = 1; s < P.length - 2; s++) {
      const p0 = P[s - 1], p1 = P[s], p2 = P[s + 1], p3 = P[s + 2];
      for (let k = 0; k < npnts; k++) {
        const t = k / npnts, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) =>
          0.5 * (2 * b + (-a + c) * t +
            (2 * a - 5 * b + 4 * c - d) * t2 * tension * 2 +
            (-a + 3 * b - 3 * c + d) * t3 * tension * 2);
        out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // Organic wobble along a path 鈥?the difference between "a line"
  // and "a hand".
  function wobble(pts, amp, freq, seed) {
    return pts.map((p, i) => {
      const n = noise1(i * freq, seed);
      const t = i / (pts.length - 1);
      // taper the wobble to zero at both ends so joins stay clean
      const k = Math.sin(t * Math.PI) * amp;
      return [p[0] + n * k, p[1] + noise1(i * freq + 40, seed) * k * 0.6];
    });
  }

  /* 鈹€鈹€ the brush 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

  /**
   * stroke 鈥?fill a tapered, noisy ribbon along a polyline.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number[][]} pts      centre line
   * @param {object} o
   *   width   px at the widest point
   *   color   any CSS colour
   *   alpha   0..1, multiplied into color
   *   noise   0..1 edge roughness (default .55)
   *   taper   { start, mid, end } width profile 0..1
   *   seed    number for reproducible jitter
   */
  function stroke(ctx, pts, o = {}) {
    if (!pts || pts.length < 3) return;

    const width = o.width ?? 8;
    const noise = o.noise ?? 0.55;
    const seed = o.seed ?? Math.random() * 999;
    const taper = o.taper ?? { start: 0.1, mid: 1, end: 0.15 };
    const N = pts.length;

    const left = [], right = [];
    // Roughness is a small, slow wobble 鈥?plus a second, much finer one that
    // only bites near the ends. Uniform high-frequency noise reads as a torn
    // edge; the eye wants a hand, not a shredder.
    const amp = noise * width * 0.14;
    const spatial = 2.2 / Math.max(0.45, width * 0.12); // wider strokes wobble slower
    const fine = noise * width * 0.045 * Math.min(1, 14 / (width + 3));

    for (let i = 1; i < N - 1; i++) {
      // position along the stroke, 0..1
      const t = i / (N - 1);

      // width profile: start-taper 鈫?body 鈫?end-taper
      let prof;
      if (t < 0.5) prof = lerp(taper.start, taper.mid, t / 0.5);
      else prof = lerp(taper.mid, taper.end, (t - 0.5) / 0.5);
      // eased so the taper isn't linear (linear reads as a cone)
      prof = Math.pow(clamp(prof, 0, 1), 0.6);

      // smooth low-frequency noise (never per-sample random, which reads
      // as a torn paper edge rather than a brush)
      const n = noise1(i * 0.42 * spatial, seed) * 0.7 +
                noise1(i * 1.05 * spatial + 31, seed) * 0.3;
      // fine grain concentrated where the brush lifts off
      const endBias = 0.35 + 0.65 * (1 - Math.sin(t * Math.PI));
      const w = prof * (width * 0.5) + n * amp * prof +
                noise1(i * 3.1, seed + 9) * fine * endBias;

      // average the incoming and outgoing direction 鈫?the normal
      const a1 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
      const a2 = Math.atan2(pts[i][1] - pts[i + 1][1], pts[i][0] - pts[i + 1][0]);
      let a = (a1 + a2) / 2;
      if (a < a2) a += Math.PI;

      // the two edges wobble independently 鈥?one edge dry, one edge wet
      const nl = 1 + noise1(i * 0.7 * spatial + 70, seed) * 0.35;
      const nr = 1 + noise1(i * 0.7 * spatial + 140, seed) * 0.35;
      left.push([pts[i][0] + w * nl * Math.cos(a), pts[i][1] + w * nl * Math.sin(a)]);
      right.push([pts[i][0] - w * nr * Math.cos(a), pts[i][1] - w * nr * Math.sin(a)]);
    }

    if (!left.length) return;

    const alpha = o.alpha ?? 1;
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha = alpha;
    ctx.fillStyle = cssColor(o.color ?? "#3f362a");

    // Quadratic smoothing through the edge points removes the polygon
    // facets that a straight lineTo chain leaves on tight curves.
    const trace = (arr, first) => {
      const p0 = first;
      for (let i = 1; i < arr.length - 1; i++) {
        const mx = (arr[i][0] + arr[i + 1][0]) / 2;
        const my = (arr[i][1] + arr[i + 1][1]) / 2;
        ctx.quadraticCurveTo(arr[i][0], arr[i][1], mx, my);
      }
      ctx.lineTo(arr[arr.length - 1][0], arr[arr.length - 1][1]);
    };

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    trace(left);
    ctx.lineTo(pts[N - 1][0], pts[N - 1][1]);
    trace(right.slice().reverse());
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * dab 鈥?a single brush deposit. Elliptical, noisy, rotated.
   * This is what makes a "wet" wash: many overlapping dabs.
   */
  function dab(ctx, x, y, o = {}) {
    const rx = o.rx ?? 10, ry = o.ry ?? rx;
    const rot = o.rot ?? Math.random() * Math.PI;
    const noise = o.noise ?? 0.5;
    const seed = o.seed ?? Math.random() * 999;
    const steps = 16;

    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = cssColor(o.color ?? "#c9994f");
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const n = 1 + noise * (noise1(i * 0.9, seed) * 0.5 + noise1(i * 0.31 + 17, seed) * 0.5);
      const px = Math.cos(a) * rx * n;
      const py = Math.sin(a) * ry * n;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * wash 鈥?a soft, wide, low-alpha blob. Built from a radial gradient
   * instead of a path so the edge dissolves (wet-in-wet).
   */
  function wash(ctx, x, y, r, color, alpha = 0.1, seed = Math.random() * 99) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    // build a slightly uneven falloff so it never reads as a perfect circle
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const a = alpha * Math.pow(1 - t, 1.6) * (0.85 + 0.15 * noise1(i * 3.1, seed));
      g.addColorStop(t, toRGBA(color, a));
    }
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function toRGBA(color, a) {
    if (Array.isArray(color)) return `rgba(${color[0]},${color[1]},${color[2]},${a})`;
    const m = String(color).match(/^#?([0-9a-f]{6})$/i);
    if (m) {
      const n = parseInt(m[1], 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    return color;
  }

  // Canvas silently ignores an unparsable fillStyle and keeps whatever was
  // there before, which is a nasty way to lose a whole tree. Everything that
  // sets a colour goes through here so arrays always become valid CSS.
  function cssColor(color) {
    if (Array.isArray(color)) return `rgb(${color[0]},${color[1]},${color[2]})`;
    return color;
  }

  /* 鈹€鈹€ scene helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

  /**
   * One tree. Tall thin trees (poplar) and round trees (chestnut) differ
   * only in crown aspect and how many brush passes they get.
   */
  function tree(ctx, x, baseY, h, o = {}) {
    const kind = o.kind ?? "round";
    const ink = o.color ?? "#3a3527";
    const seed = o.seed ?? Math.random() * 999;
    const w = o.weight ?? 1;

    const slender = kind === "poplar" || kind === "willow";
    const crownW = h * (slender ? 0.13 : 0.34);
    const crownH = h * (slender ? 0.92 : 0.62);
    const crownCY = baseY - h * (slender ? 0.5 : 0.68);
    const trunkH = h * (slender ? 0.16 : 0.42);

    // trunk: a single tapered stroke, root slightly widened
    stroke(ctx, smoothPath([[x, baseY], [x + rand(-1.5, 1.5) * w, baseY - trunkH * 0.5],
      [x + rand(-2, 2) * w, baseY - trunkH], [x + rand(-1, 1) * w, crownCY]],
      10), {
      width: (slender ? 2.6 : 5.2) * w,
      color: ink, alpha: o.trunkAlpha ?? 0.55,
      noise: 0.35, taper: { start: 1, mid: 0.8, end: 0.25 }, seed,
    });

    // ── crown, part 1: one soft base mass so leaves read as a whole ──
    // Without this the dabs float apart and the tree looks like smoke.
    // Small trees skip it — below ~200px a base mass reads as a smudge.
    const baseR = (slender ? crownW * 0.9 : crownW * 1.15) * w;
    if (h > 200) {
      for (let i = 0; i < 5; i++) {
        wash(ctx, x + rand(-crownW * 0.22, crownW * 0.22),
          crownCY + rand(-crownH * 0.16, crownH * 0.16),
          baseR * rand(0.75, 1.15),
          ink, (o.baseAlpha ?? 0.05) * w, seed + i * 7);
      }
    }

    // ── crown, part 2: leaf clusters as short directional dabs ──
    // Many small dabs at low alpha read as separate leaves; fewer big ones
    // read as a smudge.
    const passes = Math.round((slender ? 130 : 190) * w * (h > 260 ? 1 : 0.7));
    for (let i = 0; i < passes; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.pow(Math.random(), 0.62);         // denser toward the core
      const px = x + Math.cos(ang) * crownW * rad;
      const py = crownCY + Math.sin(ang) * crownH * 0.52 * rad;
      // light comes from the upper-left, same rule as the whole site
      const lit = clamp(0.5 - (px - x) / (crownW * 2) - (py - crownCY) / (crownH * 1.6), 0, 1);
      // edge dabs shrink so the silhouette frays instead of cutting off
      const edge = 1 - Math.pow(rad, 2.4) * 0.6;
      const leafW = (slender ? 3.0 : h * 0.026) * edge * rand(0.7, 1.35) * w;
      const base = o.leafAlpha ?? 0.30;
      dab(ctx, px, py, {
        rx: leafW,
        ry: leafW * rand(0.45, 0.72),
        rot: rand(-0.8, 0.3) + (slender ? Math.PI * 0.10 : 0),
        color: ink,
        alpha: (base * 0.35 + base * lit) * (o.crownAlpha ?? 1),
        noise: 0.55, seed: seed + i,
      });
    }

    // ── crown, part 3: a handful of dark accents where the mass is deepest ──
    if (h > 150) {
      for (let i = 0; i < 12; i++) {
        const ang = rand(-0.5, 1.5);
        const rad = rand(0.45, 0.85);
        const px = x + Math.cos(ang) * crownW * rad * 0.75;
        const py = crownCY + Math.sin(ang) * crownH * 0.42 * rad;
        const s = h * (slender ? 0.012 : 0.020) * rand(0.7, 1.25) * w;
        dab(ctx, px, py, {
          rx: s, ry: s * rand(0.5, 0.75),
          rot: rand(-0.4, 0.3), color: ink,
          alpha: (o.crownAlpha ?? 1) * (o.accentAlpha ?? 0.16), noise: 0.65, seed: seed + 200 + i,
        });
      }
    }
  }

  /**
   * mountain 鈥?a ridge built from overlapping soft washes, lightest at
   * the horizon. Three depths is enough to read as distance.
   */
  function mountain(ctx, x0, x1, yTop, o = {}) {
    const col = o.color ?? [200, 196, 186];
    const depth = o.depth ?? 1;      // 0 far 鈥?1 near
    const alpha = (o.alpha ?? 0.14) * depth;
    const seed = o.seed ?? 42;
    const N = Math.max(3, Math.round((x1 - x0) / 30) + 3);
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = lerp(x0 - 30, x1 + 30, t);
      // Ridged noise: a few dominant peaks plus small detail. Layering two
      // octaves of |n| keeps the silhouette painterly instead of jagged.
      const ridge =
        1 - Math.abs(noise1(t * 1.6 + seed, seed) * 0.72 + noise1(t * 4.3, seed) * 0.28);
      // peaks taper toward the frame edges so the ridge never looks cut off
      const edge = Math.sin(Math.PI * clamp(t, 0, 1) * 0.5 + 0.001);
      pts.push([x, yTop - ridge * (o.height ?? 60) * (0.55 + 0.45 * edge)]);
    }
    const path = smoothPath(pts, 14);
    const bottom = yTop + (o.depthTo ?? 200);
    const poly = path.concat([[x1 + 30, bottom], [x0 - 30, bottom]]);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = Array.isArray(col) ? `rgb(${col.join(",")})` : col;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (const p of poly) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dry-brush texture just under the ridge, where the mist is thinnest.
    for (let k = 0; k < 9; k++) {
      const from = randInt(1, Math.max(1, path.length - 8));
      const seg = path.slice(from, from + randInt(3, 7));
      stroke(ctx, seg.map(p => [p[0], p[1] + rand(1, 14)]), {
        width: rand(1.0, 3.0) * (0.5 + depth),
        color: Array.isArray(col) ? `rgb(${col.join(",")})` : col,
        alpha: alpha * 1.6, noise: 0.6, seed: seed + k,
      });
    }
  }

  /**
   * mist 鈥?horizontal bands of near-white that push the far layers back.
   */
  function mist(ctx, y, w, h, color = "255,252,245", strength = 1) {
    ctx.save();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(0.42, `rgba(${color},${0.55 * strength})`);
    g.addColorStop(0.58, `rgba(${color},${0.6 * strength})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, h);
    ctx.restore();
  }

  /* 鈹€鈹€ rain 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

  /* rain 鈥?wait鈥?name collision with the module namespace, so it lives
     here as a factory instead of a bare function. */
  function createRain(w, h, count = 90) {
    const drops = [];
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        len: rand(8, 26),
        speed: rand(0.9, 2.4),
        alpha: rand(0.04, 0.13),
        drift: rand(-0.25, -0.05),
      });
    }
    return {
      update(dt, wind = 0) {
        for (const d of drops) {
          d.y += d.speed * dt * 0.06 * 10;
          d.x += (d.drift + wind) * dt * 0.06;
          if (d.y > h + 30) {
            d.y = -30;
            d.x = Math.random() * w;
          }
          if (d.x < -30) d.x = w + 20;
        }
      },
      draw(ctx, color = "58,52,40") {
        ctx.save();
        ctx.lineCap = "round";
        for (const d of drops) {
          ctx.strokeStyle = `rgba(${color},${d.alpha})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.len * 0.18, d.y + d.len);
          ctx.stroke();
        }
        ctx.restore();
      },
      reset(w2, h2) {
        for (const d of drops) {
          d.x = Math.random() * w2;
          d.y = Math.random() * h2;
        }
      },
    };
  }

  /* 鈹€鈹€ public 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€ */

  return {
    stroke, dab, wash, tree, mountain, mist,
    smoothPath, wobble, createRain,
    noise1, noise2, gaussish,
    rand, randInt, pick, clamp, lerp, toRGBA,
  };
})();
