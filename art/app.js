/* ═══════════════════════════════════════════════════════════════════
   app.js — 这幅画怎么长出来，以及它什么时候展开。

   时间轴：
     0.0s  墨在纸上洇开
     ~2s   远山出现（一层层由浅到深）
     ~4s   近处植物
     ~6s   落款出现 → 提示浮现
     等待   若 20 秒无人触碰，长卷自己轻轻开一线又停住，像提醒
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.getElementById("paint");
  const ctx = canvas.getContext("2d", { alpha: false });
  const stage = document.getElementById("canvasStage");
  const curtain = document.getElementById("curtain");
  const colophon = document.getElementById("colophon");
  const hero = document.getElementById("hero");
  const hint = document.getElementById("hint");
  const clockEl = document.getElementById("clock");
  const scrollEl = document.getElementById("scroll");
  const rail = document.getElementById("scrollRail");
  const inner = document.getElementById("scrollInner");
  const closeBtn = document.getElementById("closeBtn");

  let W = 0, H = 0;
  let staticLayer = null;      // the finished painting
  let rain = null;
  let t0 = performance.now();
  let hasMoved = false;

  /* ── 时辰：决定这幅画的墨色 ──────────────────────────────────── */
  function phaseOf(hour) {
    if (hour < 5)      return "night";
    if (hour < 8)      return "dawn";
    if (hour < 16)     return "day";
    if (hour < 19)     return "dusk";
    return "night";
  }

  // 四个时辰各一套墨。同一座山，换一种说法。
  // 关键：纸要足够亮、近处要足够黑——否则树冠和山体糊成同一层灰。
  const INK = {
    dawn:  { sky: "#fbf7ee", far: [198, 202, 192], mid: [172, 172, 158], near: [42, 38, 30],  mist: "255,252,246", tree: [58, 54, 44] },
    day:   { sky: "#faf7ef", far: [204, 207, 199], mid: [178, 177, 165], near: [46, 41, 33],  mist: "255,253,248", tree: [62, 57, 47] },
    dusk:  { sky: "#fbf3e8", far: [206, 194, 182], mid: [180, 162, 148], near: [50, 40, 34],  mist: "255,248,238", tree: [66, 54, 46] },
    night: { sky: "#f3f1ea", far: [178, 180, 184], mid: [140, 140, 146], near: [30, 30, 36],  mist: "248,247,242", tree: [40, 40, 48] }
  };

  function getInk() {
    const h = new Date().getHours();
    return INK[phaseOf(h)];
  }

  /* ── 画一整幅 ────────────────────────────────────────────────── */
  function paintScene(target, w, h, seeds) {
    const g = target.getContext("2d");
    const ink = getInk();

    g.fillStyle = ink.sky;
    g.fillRect(0, 0, w, h);

    // 一层看天气的薄光：右上角的一抹暖，别盖住左下的字
    const warm = g.createRadialGradient(w * 0.78, h * 0.10, 0, w * 0.78, h * 0.10, Math.max(w, h) * 0.7);
    warm.addColorStop(0, "rgba(255,243,220,.42)");
    warm.addColorStop(1, "rgba(255,243,220,0)");
    g.fillStyle = warm;
    g.fillRect(0, 0, w, h);

    const horizon = h * 0.60;

    // 三层远山，由远及近。远山几乎溶于雾，近处才落墨。
    WC.mountain(g, 0, w, horizon - h * 0.20, {
      color: ink.far, depth: 0.5, height: h * 0.24,
      alpha: 0.22, seed: seeds.a, depthTo: h * 0.26
    });
    WC.mist(g, horizon - h * 0.24, w, h * 0.20, ink.mist, 0.9);

    WC.mountain(g, 0, w, horizon - h * 0.07, {
      color: ink.mid, depth: 0.9, height: h * 0.17,
      alpha: 0.24, seed: seeds.b, depthTo: h * 0.22
    });
    WC.mist(g, horizon - h * 0.10, w, h * 0.15, ink.mist, 0.75);

    WC.mountain(g, 0, w, horizon + h * 0.02, {
      color: ink.mid, depth: 1, height: h * 0.075,
      alpha: 0.22, seed: seeds.c, depthTo: h * 0.10
    });

    // 水面：一片更亮的水，让靠近的岸有底
    const waterTop = horizon + h * 0.075;
    const waterBot = h * 0.82;
    const water = g.createLinearGradient(0, waterTop, 0, waterBot);
    water.addColorStop(0, "rgba(251,249,243,.0)");
    water.addColorStop(0.30, "rgba(248,246,239,.78)");
    water.addColorStop(1, "rgba(244,241,233,.95)");
    g.fillStyle = water;
    g.fillRect(0, waterTop, w, waterBot - waterTop);

    for (let i = 0; i < 16; i++) {
      const y = waterTop + 10 + Math.random() * (waterBot - waterTop) * 0.7;
      const len = WC.rand(w * 0.05, w * 0.24);
      const x = WC.rand(-len * 0.2, w);
      g.save();
      g.globalAlpha = WC.rand(0.05, 0.12);
      g.strokeStyle = ink.mid;
      g.lineWidth = WC.rand(0.5, 1.3);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + len, y + WC.rand(-1, 1));
      g.stroke();
      g.restore();
    }

    // 近岸：一带土坡，几棵树。这是全画最重的一笔。
    // 坡从画面右下方升起，左侧留给竖排的题字。
    const bankTop = h * 0.795;
    g.save();
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) {
      const t = x / w;
      // 左低右高，中间略沉 —— 一条不规则的岸
      const y = bankTop + h * 0.035 * (1 - t) +
                WC.noise1(x * 0.004, 77) * h * 0.012 +
                Math.sin(t * 3.1) * h * 0.006;
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fillStyle = "#ece7db";
    g.fill();
    g.restore();

    // 岸的轮廓线：一笔浅浅的墨
    g.save();
    g.globalAlpha = 0.22;
    g.strokeStyle = ink.tree;
    g.lineWidth = 1.2;
    g.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const t = x / w;
      const y = bankTop + h * 0.035 * (1 - t) +
                WC.noise1(x * 0.004, 77) * h * 0.012 +
                Math.sin(t * 3.1) * h * 0.006;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    g.restore();

    // 近岸：一排树。左边留白给竖排题字，右岸树成一组收住画面。
    const narrow = w < 760;
    const baseY = bankTop + h * 0.012;
    const trees = [
      { x: w * 0.315, y: baseY + h * 0.030, hgt: h * 0.30, kind: "round" },
      { x: w * 0.395, y: baseY + h * 0.022, hgt: h * 0.22, kind: "poplar" },
      { x: w * 0.815, y: baseY + h * 0.020, hgt: h * 0.34, kind: "round" },
      { x: w * 0.885, y: baseY + h * 0.012, hgt: h * 0.27, kind: "willow" },
      { x: w * 0.945, y: baseY + h * 0.026, hgt: h * 0.20, kind: "poplar" }
    ];
    trees.forEach((t, i) => {
      if (narrow && t.x > w * 0.5) return;         // 手机上只留左边一组
      WC.tree(g, t.x, t.y, t.hgt, {
        kind: t.kind, color: ink.tree, seed: seeds.d + i * 13,
        weight: 0.85 + (t.hgt / (h * 0.34)) * 0.3,
        leafAlpha: 0.24, accentAlpha: 0.14
      });
    });

    // 岸线已经画在坡上了，这里不再重复

    // 落款：一枚小小的红印，不是装饰，是签名
    // 卷打开时底部会被遮住，所以印落在偏上的位置；也避开右岸的树
    const sealSize = Math.max(24, Math.min(28, w * 0.019));
    const sealX = w - Math.max(46, w * 0.045) - sealSize;
    const sealY = h * 0.665;
    g.save();
    g.globalAlpha = 0.84;
    g.fillStyle = "#a8322a";
    g.beginPath();
    if (g.roundRect) g.roundRect(sealX, sealY, sealSize, sealSize, 3);
    else g.rect(sealX, sealY, sealSize, sealSize);
    g.fill();
    g.fillStyle = "#f6f1e4";
    g.font = Math.round(sealSize * 0.56) + "px 'Serif SC', serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(CONTENT.sealText || "鸟", sealX + sealSize / 2, sealY + sealSize * 0.53);
    g.restore();
  }

  function buildStatic() {
    staticLayer = document.createElement("canvas");
    staticLayer.width = W;
    staticLayer.height = H;
    // Seed is stable per session: the mountain you saw is the mountain you keep.
    if (!buildStatic.seeds) {
      buildStatic.seeds = {
        a: WC.rand(0, 999), b: WC.rand(0, 999),
        c: WC.rand(0, 999), d: WC.rand(0, 999)
      };
    }
    paintScene(staticLayer, W, H, buildStatic.seeds);
  }

  /* ── 尺寸 ────────────────────────────────────────────────────── */
  function resize() {
    W = Math.floor(stage.clientWidth * DPR);
    H = Math.floor(stage.clientHeight * DPR);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = stage.clientWidth + "px";
    canvas.style.height = stage.clientHeight + "px";
    buildStatic();
    if (!rain) rain = WC.createRain(W, H, Math.round((W * H) / 24000));
    else rain.reset(W, H);
  }

  /* ── 雨：只在画上，不抢戏 ────────────────────────────────────── */
  let lastFrame = performance.now();
  function tick(now) {
    const dt = Math.min(64, now - lastFrame);
    lastFrame = now;

    ctx.drawImage(staticLayer, 0, 0);

    if (!RM) {
      rain.update(dt);
      rain.draw(ctx, "58,52,40");
    }
    requestAnimationFrame(tick);
  }

  /* ── 开场序列 ────────────────────────────────────────────────── */
  function reveal() {
    requestAnimationFrame(() => {
      curtain.classList.add("gone");
      setTimeout(() => { hero.classList.add("show"); colophon.classList.add("show"); }, RM ? 0 : 2200);
      setTimeout(() => { hint.classList.add("show"); }, RM ? 0 : 3400);
      if (!RM) {
        setTimeout(() => {
          if (!hasMoved) hint.style.opacity = "1";
        }, 16000);
      }
    });
  }

  /* ── 长卷 ────────────────────────────────────────────────────── */
  function buildScroll() {
    const html = [];
    html.push('<div class="scroll-head">');
    html.push('<div class="t1">' + CONTENT.name + '</div>');
    html.push('<div class="t2">' + CONTENT.motto + '</div>');
    html.push('<div class="rule"></div>');
    html.push('</div>');

    CONTENT.chapters.forEach((ch, ci) => {
      html.push('<section class="seg" data-ci="' + ci + '">');
      html.push('<div class="seg-mark"><span class="num">' + ch.num + '</span>');
      html.push('<span class="line"></span>');
      html.push('<span class="en">' + ch.en + '</span></div>');
      html.push('<h2>' + ch.title + '</h2>');
      ch.paras.forEach(p => {
        if (p.t === "verse") html.push('<p class="verse">' + p.v + '</p>');
        else html.push('<p' + (p.t === "lead" ? ' class="lead"' : '') + '>' + p.v + '</p>');
      });

      if (ch.works) {
        ch.works.forEach((wk, wi) => {
          html.push('<div class="work" data-ci="' + ci + '" data-wi="' + wi + '">');
          html.push('<div class="work-t"><span class="work-name">' + wk.name + '</span>');
          html.push('<span class="work-en">' + wk.en + '</span></div>');
          html.push('<div class="work-d">' + wk.desc + '</div>');
          html.push('<div class="work-panel"><p>' + wk.detail + '</p>');
          if (wk.tags) html.push('<div class="work-tags">' + wk.tags.map(t => '<span>' + t + '</span>').join('') + '</div>');
          if (wk.link) html.push('<a class="work-go" href="' + wk.link + '" target="_blank" rel="noopener">look closer ↗</a>');
          html.push('</div></div>');
        });
      }

      if (ch.traces) {
        html.push('<div class="trace">');
        ch.traces.forEach(tr => {
          const inner2 = tr.label + '<span class="note"> · ' + tr.note + '</span>';
          if (tr.href) html.push('<a href="' + tr.href + '"' + (tr.href.startsWith("http") ? ' target="_blank" rel="noopener"' : '') + '>' + inner2 + '</a>');
          else html.push('<button type="button" data-copy="' + tr.note + '">' + inner2 + '</button>');
        });
        html.push('</div>');
      }

      if (ci === CONTENT.chapters.length - 1) {
        html.push('<div class="seal"><svg viewBox="0 0 64 64" aria-hidden="true">' +
          '<rect x="2" y="2" width="60" height="60" rx="5" fill="#a8322a" opacity=".92"/>' +
          '<text x="32" y="41" text-anchor="middle" font-family="Serif SC,serif" font-size="30" fill="#f6f1e4">' +
          (CONTENT.sealText || "鸟") + '</text></svg></div>');
      }

      html.push('</section>');
    });

    inner.innerHTML = html.join("");

    // open works on click
    inner.querySelectorAll(".work").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        const wasOpen = el.classList.contains("open");
        inner.querySelectorAll(".work.open").forEach(o => o.classList.remove("open"));
        if (!wasOpen) el.classList.add("open");
      });
    });

    // copy helper
    inner.querySelectorAll("[data-copy]").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-copy");
        navigator.clipboard?.writeText(v).then(() => {
          const n = btn.querySelector(".note");
          if (!n) return;
          const old = n.textContent;
          n.textContent = " · 已复制";
          setTimeout(() => (n.textContent = old), 1400);
        }).catch(() => {});
      });
    });

    // reveal on scroll
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, root: rail, rootMargin: "0px 0px -8% 0px" });
    inner.querySelectorAll(".seg").forEach(s => io.observe(s));
  }

  let scrollOpen = false;
  let lastFocus = null;

  function openScroll() {
    if (scrollOpen) return;
    hasMoved = true;
    scrollOpen = true;
    lastFocus = document.activeElement;
    scrollEl.classList.add("open");
    scrollEl.setAttribute("aria-hidden", "false");
    hint.classList.remove("show");
    hero.classList.remove("show");
    colophon.classList.remove("show");
    rail.scrollTop = 0;
    setTimeout(() => closeBtn.focus({ preventScroll: true }), 400);
  }

  function closeScroll() {
    if (!scrollOpen) return;
    scrollOpen = false;
    scrollEl.classList.remove("open");
    scrollEl.setAttribute("aria-hidden", "true");
    hero.classList.add("show");
    colophon.classList.add("show");
    hint.classList.add("show");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ── 事件 ────────────────────────────────────────────────────── */
  function bind() {
    // the whole painting is the button
    stage.addEventListener("click", openScroll);
    stage.addEventListener("touchstart", () => { hasMoved = true; }, { passive: true });
    stage.addEventListener("pointermove", () => { hasMoved = true; }, { passive: true });

    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeScroll(); });

    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && scrollOpen) { e.preventDefault(); closeScroll(); }
    });

    let rTimer = null;
    addEventListener("resize", () => {
      clearTimeout(rTimer);
      rTimer = setTimeout(resize, 180);
    });

    // 时辰
    function tickClock() {
      const d = new Date();
      clockEl.textContent = String(d.getHours()).padStart(2, "0") + ":" +
                            String(d.getMinutes()).padStart(2, "0");
    }
    tickClock();
    setInterval(tickClock, 30000);
  }

  /* ── 启动 ────────────────────────────────────────────────────── */
  function boot() {
    resize();
    buildScroll();
    bind();
    requestAnimationFrame(tick);
    // give fonts a beat, then lift the curtain
    (document.fonts ? document.fonts.ready : Promise.resolve())
      .then(() => setTimeout(reveal, RM ? 120 : 700));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
