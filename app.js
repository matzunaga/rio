(() => {
  "use strict";

  /* ---------------------------------------------------------------
     Tunable constants. Everything you might adjust by eye is here.
     --------------------------------------------------------------- */

  // The threads
  const THREAD_COUNT = 110; // on phones this is scaled down a little, see threadCount()
  const THREAD_MIN = 70;
  const BAND_HEIGHT = 1.24; // the river is wider than the screen, so it fills the frame edge to edge
  const DEPTH = 0.85; // perspective: 0 spaces threads evenly, 1 packs them tightly at the far (top) edge
  const FAR_SCALE = 0.32; // far threads are this much of the near ones' width, bend and speed
  const BANK_FADE = 0.35; // threads at the edges keep this much less light than those in the middle
  const SEGMENT_PX = 14; // horizontal distance between points on a thread
  const CORE_WIDTH = 0.9; // thin bright line, in CSS pixels
  const GLOW_WIDTH = 4.5; // wide soft line under it
  const CORE_ALPHA = 0.62;
  const GLOW_ALPHA = 0.16;

  // The one light on the water: a soft glow the threads brighten in as they pass
  const LIGHT_X = 0.64; // across the screen, 0 left to 1 right
  const LIGHT_Y = 0.36; // down the screen, 0 top to 1 bottom
  const LIGHT_RADIUS = 0.55; // share of the longer screen side
  const LIGHT_CATCH = 1.6; // how much brighter a thread gets at the heart of the light
  const LIGHT_REACH_X = 0.3; // how far along a thread the light spreads, share of width
  const LIGHT_REACH_Y = 0.28; // how far across the river it spreads, share of height
  const VIGNETTE = 0.38; // how much the corners darken, in each hour's own color

  // The flow
  const FLOW_SPEED = 0.014; // how fast the pattern drifts downstream, left to right
  const MEANDER_AMPLITUDE = 46; // broad slow bends, in pixels
  const RIPPLE_AMPLITUDE = 11; // finer surface texture, in pixels
  const TURBULENCE = 1; // scales the ripples; live data will nudge this
  const EVOLVE_SPEED = 0.018; // how quickly the shapes themselves change

  // The breath: the whole field swells and settles
  const BREATH_PERIOD = 10; // seconds for one swell and settle
  const BREATH_DRIFT = 0.15; // the period wanders by up to this share, so it never feels mechanical
  const BREATH_BRIGHTNESS = 0.2; // brightness rises and falls by this share
  const BREATH_AMPLITUDE = 0.12; // thread bends grow and shrink by this share
  const BREATH_SPACING = 0.045; // the river widens and narrows by this share

  // The sound
  const SOUND_FILE = "stream.mp3?v=1";
  const SOUND_LEVEL = 0.8; // overall loudness once faded in
  const SOUND_FADE_SECONDS = 8; // from silence after Begin
  const LOOP_CROSSFADE = 4; // seconds the end of the recording overlaps the start of the next pass
  const LOOP_TRIM = 0.25; // seconds skipped at each end of the file, where the encoder pads
  const SWELL_DB = 2.5; // how much louder the swell is than the settle
  const FILTER_SETTLED = 3200; // low-pass cutoff in hertz when the breath settles
  const FILTER_SWELLED = 5200; // and when it swells
  const FILTER_Q = 0.5; // a soft knee, nothing resonant

  // The live river
  const RIVER = {
    id: "USGS-09380000", // a USGS monitoring location that reports discharge, parameter 00060
    name: "Colorado River",
    place: "Lees Ferry, Arizona"
  };
  const WATER_API = "https://api.waterdata.usgs.gov/ogcapi/v1/collections/continuous/items";
  const DATA_REFRESH_MS = 15 * 60 * 1000;
  const DATA_STALE_HOURS = 3; // an older reading counts as no reading
  const DATA_INFLUENCE = 0.2; // the river's flow nudges speed and turbulence by at most this share
  const DATA_EASE_SECONDS = 90; // how long a new reading takes to settle into the field
  const DATA_TIMEOUT_MS = 20 * 1000;
  const RESTING_LINE = "River data is resting. The river continues.";

  // Pausing and the controls
  const PAUSE_FADE_SECONDS = 2; // sound fades out and the river glides to stillness
  const RESUME_FADE_SECONDS = 3; // and both come back
  const CONTROLS_LINGER_MS = 5000; // how long the controls stay after the last touch

  // Beginning
  const IDLE_LEVEL = 0.1; // how present the field is before Begin
  const IDLE_PACE = 0.35; // how fast it moves before Begin
  const RISE_SECONDS = 8; // the field rises into view over this long after Begin

  // Reduced motion slows everything further, it never removes the piece
  const REDUCED_PACE = 0.4;

  // The whole palette follows the local clock. Colors are RGB; the page blends
  // between these moments. top and bottom are the water itself; sky is the
  // color of the sky reflected on it, strongest near the light and fading
  // toward the bottom. skyFade is the color the reflection fades out through,
  // skyFar how strongly it veils the far water at the top, and skyReach how far
  // it spreads around the light. glow and core are the threads, light the glow
  // on the water, edge the tint of the vignette.
  const NIGHT = {
    top: [14, 22, 58], bottom: [24, 30, 84],
    sky: [70, 84, 170], skyAlpha: 0.25,
    skyFade: [70, 84, 170], skyFar: 0.55, skyReach: 0.9,
    glow: [112, 134, 255], core: [206, 216, 255],
    light: [170, 190, 255], lightAlpha: 0.32,
    edge: [6, 9, 30]
  };
  const DAWN = {
    // pale and cool: grey-green water under a pale gold sky, lifted around the light
    top: [150, 190, 194], bottom: [76, 136, 142],
    sky: [250, 226, 166], skyAlpha: 0.85,
    skyFade: [242, 218, 172], skyFar: 0.22, skyReach: 0.68,
    glow: [255, 236, 214], core: [255, 252, 244],
    light: [255, 246, 222], lightAlpha: 0.62,
    edge: [44, 86, 96]
  };
  const DAY = {
    top: [52, 196, 230], bottom: [0, 150, 196],
    sky: [214, 244, 255], skyAlpha: 0.2,
    skyFade: [214, 244, 255], skyFar: 0.55, skyReach: 0.9,
    glow: [168, 244, 255], core: [255, 255, 255],
    light: [236, 252, 255], lightAlpha: 0.5,
    edge: [0, 96, 132]
  };
  const DUSK = {
    // deep and rosy: dark blue-green water under a rose sky, amber at the light
    top: [58, 74, 100], bottom: [16, 52, 64],
    sky: [214, 92, 116], skyAlpha: 0.82,
    // fading through a deep rose-violet keeps the blend into teal from going grey
    skyFade: [128, 54, 128], skyFar: 0.55, skyReach: 0.9,
    glow: [255, 176, 170], core: [255, 226, 214],
    light: [255, 176, 110], lightAlpha: 0.48,
    edge: [14, 22, 40]
  };
  const DAY_KEYS = [
    { hour: 0, palette: NIGHT },
    { hour: 4.5, palette: NIGHT },
    { hour: 6.5, palette: DAWN },
    { hour: 9, palette: DAY },
    { hour: 16, palette: DAY },
    { hour: 18.5, palette: DUSK },
    { hour: 21, palette: NIGHT },
    { hour: 24, palette: NIGHT }
  ];

  /* --------------------------------------------------------------- */

  // For previews only: window.RIO_HOUR set before this script, ?hour=13 on a page
  // address, or #dawn, #day, #dusk or #night
  const HOUR_PREVIEW = (() => {
    if (Number.isFinite(window.RIO_HOUR)) return window.RIO_HOUR % 24;
    const named = { dawn: 6.5, day: 12.5, dusk: 18.5, night: 1 }[location.hash.slice(1)];
    if (named !== undefined) return named;
    const asked = parseFloat(new URLSearchParams(location.search).get("hour"));
    return Number.isFinite(asked) ? asked % 24 : null;
  })();

  const TAU = Math.PI * 2;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.getElementById("river");
  const ctx = canvas.getContext("2d", { alpha: false });
  const beginButton = document.getElementById("begin");
  const mark = document.getElementById("mark");
  const markCard = document.getElementById("markCard");

  // The glyph lives in its own file so it can be redrawn without touching the code.
  // It is placed inside the button so its lines can follow the hour's color.
  fetch("mark.svg", { cache: "no-cache" })
    .then((response) => (response.ok ? response.text() : Promise.reject()))
    .then((text) => {
      const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
      if (svg.nodeName.toLowerCase() !== "svg") return;
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      mark.replaceChildren(document.importNode(svg, true));
    })
    .catch(() => {
      // no glyph file: the button keeps its label and the page carries on
    });

  const view = { w: 1, h: 1, ratio: 1 };
  let threads = [];

  const state = {
    running: false,
    beganAt: 0,
    level: IDLE_LEVEL, // overall presence of the field, 0 to 1
    pace: IDLE_PACE, // overall speed of time in the field
    flowTime: 0, // accumulated, so a change of pace never jumps
    drift: 0, // how far the water has travelled downstream, accumulated for the same reason
    breath: 0, // -1 settled to +1 swelled
    paused: false,
    play: 1, // eases to 0 on pause and back to 1 on resume, so nothing stops or starts at once
    palette: paletteAt(localHour()),
    // live data steers these two, gently, toward their targets
    speedFactor: 1,
    turbulenceFactor: 1,
    speedTarget: 1,
    turbulenceTarget: 1,
    last: 0
  };

  /* Simplex noise in three dimensions (after Stefan Gustavson), seeded once */

  const noise3 = (() => {
    const grad = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i += 1) p[i] = i;
    for (let i = 255; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i += 1) {
      perm[i] = p[i & 255];
      permMod12[i] = perm[i] % 12;
    }
    const F3 = 1 / 3;
    const G3 = 1 / 6;

    return (xin, yin, zin) => {
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t);
      const y0 = yin - (j - t);
      const z0 = zin - (k - t);

      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }

      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 0.5, y3 = y0 - 1 + 0.5, z3 = z0 - 1 + 0.5;
      const ii = i & 255, jj = j & 255, kk = k & 255;

      let n = 0;
      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 > 0) {
        const g = grad[permMod12[ii + perm[jj + perm[kk]]]];
        t0 *= t0;
        n += t0 * t0 * (g[0] * x0 + g[1] * y0 + g[2] * z0);
      }
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 > 0) {
        const g = grad[permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]]];
        t1 *= t1;
        n += t1 * t1 * (g[0] * x1 + g[1] * y1 + g[2] * z1);
      }
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 > 0) {
        const g = grad[permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]]];
        t2 *= t2;
        n += t2 * t2 * (g[0] * x2 + g[1] * y2 + g[2] * z2);
      }
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 > 0) {
        const g = grad[permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]]];
        t3 *= t3;
        n += t3 * t3 * (g[0] * x3 + g[1] * y3 + g[2] * z3);
      }
      return 32 * n; // roughly -1 to 1
    };
  })();

  /* The local clock picks the color of the water */

  function localHour() {
    if (HOUR_PREVIEW !== null) return HOUR_PREVIEW;
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  }

  function mixPalettes(a, b, e) {
    const out = {};
    for (const key of Object.keys(a)) {
      out[key] = Array.isArray(a[key])
        ? a[key].map((c, k) => c + (b[key][k] - c) * e)
        : a[key] + (b[key] - a[key]) * e;
    }
    return out;
  }

  function paletteAt(hour) {
    for (let i = 0; i < DAY_KEYS.length - 1; i += 1) {
      const a = DAY_KEYS[i];
      const b = DAY_KEYS[i + 1];
      if (hour >= a.hour && hour <= b.hour) {
        const span = b.hour - a.hour || 1;
        const u = (hour - a.hour) / span;
        const e = u * u * (3 - 2 * u); // ease so the turn between keyframes is soft
        return mixPalettes(a.palette, b.palette, e);
      }
    }
    return mixPalettes(NIGHT, NIGHT, 0);
  }

  function rgb(c, alpha = 1) {
    return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`;
  }

  // The mark takes the threads' color on dark water and leans toward the hour's
  // deep tone on bright water, so it always reads; text shadows use that deep tone.
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function refreshAccent() {
    const p = paletteAt(localHour());
    const water = p.top.map((c, i) => (c + p.bottom[i]) / 2);
    const light = (0.2126 * water[0] + 0.7152 * water[1] + 0.0722 * water[2]) / 255;
    const bright = Math.min(1, Math.max(0, (light - 0.25) / 0.3));
    const accent = p.glow.map((c, i) => c + (p.edge[i] - c) * bright * 0.85);
    const root = document.documentElement.style;
    root.setProperty("--accent", rgb(accent));
    root.setProperty("--shade", p.edge.map(Math.round).join(", "));
    if (themeColor) themeColor.setAttribute("content", `rgb(${p.top.map(Math.round).join(", ")})`);
  }

  /* Layout */

  function threadCount() {
    // fewer threads on small screens, both for the look and for the phone
    const scale = Math.min(1, view.h / 900);
    return Math.round(THREAD_MIN + (THREAD_COUNT - THREAD_MIN) * scale);
  }

  function buildThreads() {
    const count = threadCount();
    threads = Array.from({ length: count }, (_, i) => {
      const u = (i + 0.5) / count + (Math.random() - 0.5) * (0.6 / count);
      return {
        u, // position across the river, 0 at one bank and 1 at the other
        bank: 1 - BANK_FADE * (1 - Math.sin(Math.PI * Math.min(1, Math.max(0, u)))), // a little fainter near the edges
        seed: Math.random() * 100
      };
    });
  }

  function resize() {
    view.ratio = Math.min(window.devicePixelRatio || 1, 2);
    view.w = Math.max(1, window.innerWidth);
    view.h = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(view.w * view.ratio);
    canvas.height = Math.floor(view.h * view.ratio);
    ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
    buildThreads();
  }

  /* The breath */

  // The breath is a pure function of the clock, so the picture and the sound
  // read the same breath even while the tab is hidden and nothing is drawn.
  // Two slow sines bend the phase so the period wanders by up to BREATH_DRIFT.
  const breathPeriod = BREATH_PERIOD / (reduceMotion ? 0.7 : 1);
  const WANDER_A = { period: 97, phase: 0 };
  const WANDER_B = { period: 61, phase: 1.3 };
  const wanderShare = (BREATH_DRIFT * TAU) / breathPeriod / 2; // half the drift from each sine
  const wanderAmpA = wanderShare / (TAU / WANDER_A.period);
  const wanderAmpB = wanderShare / (TAU / WANDER_B.period);

  function breathAt(seconds) {
    const phase =
      (TAU * seconds) / breathPeriod +
      wanderAmpA * Math.sin((TAU * seconds) / WANDER_A.period + WANDER_A.phase) +
      wanderAmpB * Math.sin((TAU * seconds) / WANDER_B.period + WANDER_B.phase);
    return Math.sin(phase);
  }

  // The piece's own clock. It runs with the page clock, and glides to a halt on
  // pause; between frames (and in a hidden tab) it keeps its last rate.
  const clock = { value: 0, base: performance.now() / 1000, rate: 1 };

  function clockSeconds() {
    return clock.value + (performance.now() / 1000 - clock.base) * clock.rate;
  }

  function stepClock(rate) {
    clock.value = clockSeconds();
    clock.base = performance.now() / 1000;
    clock.rate = rate;
  }

  /* Drawing */

  function draw() {
    const { w, h } = view;
    const t = state.flowTime;
    const breath = state.breath;
    const presence = state.level * (1 + BREATH_BRIGHTNESS * breath);
    const amplitude = 1 + BREATH_AMPLITUDE * breath;
    const band = h * BAND_HEIGHT * (1 + BREATH_SPACING * breath);
    const top = -h * 0.04; // the far water starts just above the screen, so its dense threads show
    const scale = Math.max(w, h) / 1000; // noise coordinates stay the same at any size
    const drift = state.drift;
    const ripple = RIPPLE_AMPLITUDE * TURBULENCE * state.turbulenceFactor;
    const meander = MEANDER_AMPLITUDE * Math.max(0.6, h / 900);

    const p = state.palette;
    const lightX = w * LIGHT_X;
    const lightY = h * LIGHT_Y;
    const lightR = Math.max(w, h) * LIGHT_RADIUS;

    // the water itself
    ctx.globalCompositeOperation = "source-over";
    const water = ctx.createLinearGradient(0, 0, 0, h);
    water.addColorStop(0, rgb(p.top));
    water.addColorStop(1, rgb(p.bottom));
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, w, h);

    // the sky reflected on the water: broad across the far water at the top,
    // strongest around the light, gone by the bottom where the water shows through
    const skyAlpha = p.skyAlpha * (0.4 + 0.6 * state.level);
    const farSky = ctx.createLinearGradient(0, 0, 0, h);
    farSky.addColorStop(0, rgb(p.sky, skyAlpha * p.skyFar));
    farSky.addColorStop(0.25, rgb(p.sky, skyAlpha * p.skyFar * (0.45 / 0.7)));
    farSky.addColorStop(0.5, rgb(p.skyFade, skyAlpha * p.skyFar * (0.2 / 0.7)));
    farSky.addColorStop(0.7, rgb(p.skyFade, 0));
    ctx.fillStyle = farSky;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(lightX, lightY);
    ctx.scale(1.7, 1); // the reflection spreads wider than it is tall
    const nearSky = ctx.createRadialGradient(0, 0, 0, 0, 0, lightR * p.skyReach);
    nearSky.addColorStop(0, rgb(p.sky, skyAlpha));
    nearSky.addColorStop(0.45, rgb(p.sky, skyAlpha * 0.45));
    nearSky.addColorStop(0.7, rgb(p.skyFade, skyAlpha * 0.45 * (0.3 / 0.55)));
    nearSky.addColorStop(1, rgb(p.skyFade, 0));
    ctx.fillStyle = nearSky;
    ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.restore();

    // the one light, resting on the water; it breathes with everything else
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, lightR);
    const lightAlpha = p.lightAlpha * (0.3 + 0.7 * state.level) * (1 + 0.1 * breath);
    glow.addColorStop(0, rgb(p.light, lightAlpha));
    glow.addColorStop(0.35, rgb(p.light, lightAlpha * 0.45));
    glow.addColorStop(1, rgb(p.light, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // threads are light on water: screen blending keeps them luminous on dark and bright alike
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const reachX = w * LIGHT_REACH_X;
    const reachY = h * LIGHT_REACH_Y;
    const stops = [-2.2, -1.4, -0.7, 0, 0.7, 1.4, 2.2].map((k) => lightX + k * reachX);

    const steps = Math.ceil((w + 40) / SEGMENT_PX);
    const ys = new Float32Array(steps + 1);

    for (const thread of threads) {
      // depth: u runs from the far water at the top to the near water at the bottom.
      // Far threads sit closer together, finer, flatter and slower.
      const u = thread.u;
      const baseY = top + band * (u * (1 - DEPTH) + u * u * DEPTH);
      const near = FAR_SCALE + (1 - FAR_SCALE) * Math.min(1, Math.max(0, u));
      const ny = u * 1.4; // the water's own coordinates, so the pattern is squeezed with the distance
      const along = 1 + (1 - near) * 1.4; // far waves look shorter
      const flow = drift * (0.5 + 0.5 * near);
      // each thread brightens and fades on its own slow schedule
      const shimmer = 0.55 + 0.45 * noise3(thread.seed, t * 0.05, 5.1);
      const alpha = presence * thread.bank * shimmer * (0.7 + 0.3 * near);
      if (alpha < 0.004) continue;

      for (let s = 0; s <= steps; s += 1) {
        const x = -20 + s * SEGMENT_PX;
        const nx = (x / (1000 * scale)) * along;
        const big = noise3(nx * 1.1 - flow * 0.6, ny * 1.5, t * EVOLVE_SPEED);
        const fine = noise3(nx * 3.4 - flow, ny * 3.2 + 7.3, t * EVOLVE_SPEED * 2.4 + thread.seed * 0.02);
        ys[s] = baseY + (big * meander + fine * ripple) * amplitude * near;
      }

      ctx.beginPath();
      ctx.moveTo(-20, ys[0]);
      for (let s = 1; s <= steps; s += 1) ctx.lineTo(-20 + s * SEGMENT_PX, ys[s]);

      // along each thread, brightness rises where it passes through the light
      const nearY = (baseY - lightY) / reachY;
      const across = Math.exp(-nearY * nearY);
      let glowStroke;
      let coreStroke;
      if (across < 0.03) {
        // too far from the light to catch it: a plain color is enough, and cheaper
        glowStroke = rgb(p.glow, Math.min(1, GLOW_ALPHA * alpha));
        coreStroke = rgb(p.core, Math.min(1, CORE_ALPHA * alpha));
      } else {
        glowStroke = ctx.createLinearGradient(0, 0, w, 0);
        coreStroke = ctx.createLinearGradient(0, 0, w, 0);
        for (const x of stops) {
          const along = (x - lightX) / reachX;
          const lit = 1 + LIGHT_CATCH * across * Math.exp(-along * along);
          const at = Math.min(1, Math.max(0, x / w));
          glowStroke.addColorStop(at, rgb(p.glow, Math.min(1, GLOW_ALPHA * alpha * lit)));
          coreStroke.addColorStop(at, rgb(p.core, Math.min(1, CORE_ALPHA * alpha * lit)));
        }
      }

      ctx.strokeStyle = glowStroke;
      ctx.lineWidth = GLOW_WIDTH * near;
      ctx.stroke();

      ctx.strokeStyle = coreStroke;
      ctx.lineWidth = CORE_WIDTH * (0.55 + 0.45 * near);
      ctx.stroke();
    }

    // a soft vignette in the hour's own deep tone, never black
    ctx.globalCompositeOperation = "source-over";
    const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    edge.addColorStop(0, rgb(p.edge, 0));
    edge.addColorStop(1, rgb(p.edge, VIGNETTE));
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
  }

  function easeInOut(u) {
    return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - (state.last || now)) / 1000);
    state.last = now;

    if (state.running) {
      const u = Math.min(1, (now - state.beganAt) / (RISE_SECONDS * 1000));
      const e = easeInOut(u);
      state.level = IDLE_LEVEL + (1 - IDLE_LEVEL) * e;
      state.pace = IDLE_PACE + (1 - IDLE_PACE) * e;
    }

    // pausing glides everything to stillness rather than freezing it
    const settle = 1 - Math.exp(-dt / (PAUSE_FADE_SECONDS / 3));
    state.play += ((state.paused ? 0 : 1) - state.play) * settle;
    if (state.paused && state.play < 0.01) state.play = 0; // settle fully, well below what the eye can see
    stepClock(state.play);

    const pace = state.pace * state.play * (reduceMotion ? REDUCED_PACE : 1);
    state.flowTime += dt * pace;
    state.drift += dt * pace * FLOW_SPEED * state.speedFactor;
    state.breath = breathAt(clockSeconds());

    // a new river reading eases in over a minute and a half, never jumps
    const ease = 1 - Math.exp((-dt * state.play) / (DATA_EASE_SECONDS / 3));
    state.speedFactor += (state.speedTarget - state.speedFactor) * ease;
    state.turbulenceFactor += (state.turbulenceTarget - state.turbulenceFactor) * ease;

    // the palette drifts toward the clock's colors, never jumps
    state.palette = mixPalettes(state.palette, paletteAt(localHour()), 1 - Math.exp((-dt * state.play) / 20));

    draw();
    requestAnimationFrame(frame);
  }

  /* The sound: a real stream, looped without a seam, breathing with the field */

  const sound = {
    ctx: null,
    buffer: null,
    breathGain: null,
    filter: null,
    master: null,
    nextVoiceAt: 0, // audio-clock time the next pass of the recording begins
    scheduledUntil: 0, // audio-clock time the breath is written up to
    timer: 0
  };

  // start downloading right away, so Begin rarely has to wait
  const soundData = fetch(SOUND_FILE)
    .then((response) => {
      if (!response.ok) throw new Error(`sound: ${response.status}`);
      return response.arrayBuffer();
    })
    .catch(() => null);

  function decode(ctx, data) {
    // the callback form still matters for older Safari
    return new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject));
  }

  function dbToGain(db) {
    return Math.pow(10, db / 20);
  }

  function equalPowerCurve(fadeIn) {
    const curve = new Float32Array(128);
    for (let i = 0; i < curve.length; i += 1) {
      const u = i / (curve.length - 1);
      curve[i] = fadeIn ? Math.sin((u * Math.PI) / 2) : Math.cos((u * Math.PI) / 2);
    }
    return curve;
  }

  const FADE_IN_CURVE = equalPowerCurve(true);
  const FADE_OUT_CURVE = equalPowerCurve(false);

  // One pass of the recording. Each pass fades in over the tail of the one before
  // and fades out under the head of the one after, with equal-power curves, so the
  // loudness holds steady through the overlap.
  function startVoice(at, fadeIn) {
    const { ctx, buffer } = sound;
    const length = buffer.duration - LOOP_TRIM * 2;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    source.buffer = buffer;
    source.connect(gain);
    gain.connect(sound.breathGain);

    if (fadeIn) {
      gain.gain.value = 0;
      gain.gain.setValueCurveAtTime(FADE_IN_CURVE, at, LOOP_CROSSFADE);
    } else {
      gain.gain.setValueAtTime(1, at);
    }
    gain.gain.setValueCurveAtTime(FADE_OUT_CURVE, at + length - LOOP_CROSSFADE, LOOP_CROSSFADE);

    source.start(at, LOOP_TRIM, length);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };

    sound.nextVoiceAt = at + length - LOOP_CROSSFADE;
  }

  // Write the breath into the gain and the filter a few seconds ahead, in small
  // straight steps, so a slow or throttled timer never leaves the sound unsteered.
  function scheduleBreath() {
    const { ctx } = sound;
    const now = ctx.currentTime;
    // the breath runs on the page clock; map it onto the audio clock each time
    const offset = clockSeconds() - now;
    const until = now + 6;
    let t = Math.max(sound.scheduledUntil, now + 0.05);

    for (; t <= until; t += 0.1) {
      const breath = breathAt(t + offset);
      const lift = (breath + 1) / 2; // 0 settled, 1 swelled
      sound.breathGain.gain.linearRampToValueAtTime(dbToGain(SWELL_DB * (lift - 0.5)), t);
      sound.filter.frequency.linearRampToValueAtTime(
        FILTER_SETTLED * Math.pow(FILTER_SWELLED / FILTER_SETTLED, lift),
        t
      );
    }
    sound.scheduledUntil = t;

    // queue the next pass well before it is needed
    if (sound.nextVoiceAt - now < 30) startVoice(sound.nextVoiceAt, true);
  }

  async function startSound() {
    try {
      // on iPhone, play through the ring/silent switch like a music app
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch (error) {
      // not supported
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    // created inside the Begin tap, which is what lets the browser play it
    const ctx = new AudioContext();
    sound.ctx = ctx;
    ctx.resume().catch(() => {});

    const data = await soundData;
    if (!data) return; // no sound file: the river runs in silence

    try {
      sound.buffer = await decode(ctx, data);
    } catch (error) {
      return;
    }

    sound.filter = ctx.createBiquadFilter();
    sound.filter.type = "lowpass";
    sound.filter.Q.value = FILTER_Q;
    sound.breathGain = ctx.createGain();
    sound.master = ctx.createGain();

    sound.breathGain.connect(sound.filter);
    sound.filter.connect(sound.master);
    sound.master.connect(ctx.destination);

    const start = ctx.currentTime + 0.1;
    const lift = (breathAt(start + clockSeconds() - ctx.currentTime) + 1) / 2;
    sound.breathGain.gain.setValueAtTime(dbToGain(SWELL_DB * (lift - 0.5)), start);
    sound.filter.frequency.setValueAtTime(
      FILTER_SETTLED * Math.pow(FILTER_SWELLED / FILTER_SETTLED, lift),
      start
    );
    sound.scheduledUntil = start;

    // from silence, easing in the way a sound arrives from a distance
    const fade = new Float32Array(256);
    for (let i = 0; i < fade.length; i += 1) {
      const u = i / (fade.length - 1);
      const s = u * u * (3 - 2 * u);
      fade[i] = SOUND_LEVEL * s * s;
    }
    sound.master.gain.value = 0;
    sound.master.gain.setValueCurveAtTime(fade, start, SOUND_FADE_SECONDS);

    startVoice(start, false);
    scheduleBreath();
    sound.timer = setInterval(scheduleBreath, 1000);
    if (state.paused) pauseSound(); // paused while the sound was still loading
  }

  // iPhone can pause the sound for a call or a lock; pick it up again quietly
  function wakeSound() {
    if (sound.ctx && sound.ctx.state !== "running" && sound.ctx.state !== "closed") {
      sound.ctx.resume().catch(() => {});
    }
  }

  document.addEventListener("pointerdown", wakeSound, { passive: true });

  function holdGain(param, at) {
    if (param.cancelAndHoldAtTime) {
      param.cancelAndHoldAtTime(at);
    } else {
      const value = param.value;
      param.cancelScheduledValues(at);
      param.setValueAtTime(value, at);
    }
  }

  let suspendTimer = 0;

  function pauseSound() {
    const { ctx, master } = sound;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    holdGain(master.gain, now);
    master.gain.linearRampToValueAtTime(0, now + PAUSE_FADE_SECONDS);
    clearTimeout(suspendTimer);
    // once silent, stop the audio clock too, which also saves the battery
    suspendTimer = setTimeout(() => {
      if (state.paused) ctx.suspend().catch(() => {});
    }, PAUSE_FADE_SECONDS * 1000 + 150);
  }

  function resumeSound() {
    const { ctx, master } = sound;
    if (!ctx || !master) return;
    clearTimeout(suspendTimer);
    // called inside the tap, which is what lets iPhone start the sound again
    ctx.resume().catch(() => {}).then(() => {
      if (state.paused) return;
      const now = ctx.currentTime;
      holdGain(master.gain, now);
      master.gain.linearRampToValueAtTime(SOUND_LEVEL, now + RESUME_FADE_SECONDS);
    });
  }

  /* The live river: USGS discharge over the past week, read gently */

  const readingLine = document.getElementById("reading");
  const river = { latest: null, lastTry: 0 }; // latest: { cfs, time, low, high }

  function riverURL() {
    const query = new URLSearchParams({
      monitoring_location_id: RIVER.id,
      parameter_code: "00060",
      time: "P7D",
      properties: "time,value",
      skipGeometry: "true",
      f: "json",
      limit: "10000"
    });
    return `${WATER_API}?${query}`;
  }

  function isFresh(reading) {
    return reading && Date.now() - reading.time.getTime() < DATA_STALE_HOURS * 3600 * 1000;
  }

  function describeReading(reading) {
    const cfs = Math.round(reading.cfs).toLocaleString("en-US");
    const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
      reading.time
    );
    return (
      `Right now the ${RIVER.name} at ${RIVER.place}, carries ${cfs} cubic feet ` +
      `per second, measured at ${time}. Its flow gently sets the pace of the water here.`
    );
  }

  function showRiver() {
    const reading = river.latest;

    if (!isFresh(reading)) {
      // no reading, or too old to trust: the field keeps its own rhythm
      state.speedTarget = 1;
      state.turbulenceTarget = 1;
      readingLine.textContent = RESTING_LINE;
      return;
    }

    // where the latest flow sits within this week's range, from 0 to 1
    const span = reading.high - reading.low;
    const level = span > 0 ? (reading.cfs - reading.low) / span : 0.5;
    const nudge = (Math.min(1, Math.max(0, level)) - 0.5) * 2 * DATA_INFLUENCE;
    state.speedTarget = 1 + nudge;
    state.turbulenceTarget = 1 + nudge;

    readingLine.textContent = describeReading(reading);
  }

  async function loadRiver() {
    river.lastTry = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DATA_TIMEOUT_MS);

    try {
      const response = await fetch(riverURL(), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`USGS: ${response.status}`);
      const data = await response.json();

      const points = (data.features || [])
        .map((feature) => ({
          cfs: Number(feature.properties.value),
          time: new Date(feature.properties.time)
        }))
        .filter((point) => Number.isFinite(point.cfs) && !Number.isNaN(point.time.getTime()));

      if (!points.length) throw new Error("USGS: no readings");

      points.sort((a, b) => a.time - b.time);
      const values = points.map((point) => point.cfs);
      const newest = points[points.length - 1];

      river.latest = {
        cfs: newest.cfs,
        time: newest.time,
        low: Math.min(...values),
        high: Math.max(...values)
      };
    } catch (error) {
      // offline, refused or empty: keep the last good reading while it is still fresh
    } finally {
      clearTimeout(timeout);
    }

    showRiver();
  }

  loadRiver();
  setInterval(loadRiver, DATA_REFRESH_MS);
  // a reading can grow stale between fetches, so look again now and then
  setInterval(showRiver, 60 * 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - river.lastTry > DATA_REFRESH_MS) loadRiver();
  });

  /* Staying awake */

  let wakeLock = null;

  async function holdWake() {
    try {
      if ("wakeLock" in navigator && !document.hidden) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch (error) {
      // unsupported or refused: the river runs anyway
    }
  }

  function releaseWake() {
    if (wakeLock) wakeLock.release().catch(() => {});
    wakeLock = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.running && !state.paused) {
      holdWake();
      wakeSound();
    }
  });

  /* Beginning */

  function begin() {
    if (state.running) return;
    state.running = true;
    state.beganAt = performance.now();
    document.body.classList.add("running");
    markCard.hidden = true;
    startSound();
    holdWake();
  }

  beginButton.addEventListener("click", begin);

  /* Pause and resume */

  const pauseButton = document.getElementById("pause");

  function setPaused(paused) {
    if (!state.running || state.paused === paused) return;
    state.paused = paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
    pauseButton.setAttribute("aria-pressed", String(paused));
    if (paused) {
      pauseSound();
      releaseWake();
    } else {
      resumeSound();
      holdWake();
    }
    showControls();
  }

  pauseButton.addEventListener("click", () => setPaused(!state.paused));

  /* The controls rest out of sight and return, slowly, with a touch */

  const infoButton = document.getElementById("infoButton");
  const infoPanel = document.getElementById("infoPanel");
  const closeInfo = document.getElementById("closeInfo");
  let hideTimer = 0;

  function showControls() {
    if (!state.running) return;
    document.body.classList.add("show-controls");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideControls, CONTROLS_LINGER_MS);
  }

  function hideControls() {
    // they stay while paused or while a card is open
    if (state.paused || !infoPanel.hidden || !markCard.hidden) {
      hideTimer = setTimeout(hideControls, CONTROLS_LINGER_MS);
      return;
    }
    document.body.classList.remove("show-controls");
  }

  let lastMove = 0;
  document.addEventListener("pointerdown", showControls, { passive: true });
  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse" || event.timeStamp - lastMove < 250) return;
      lastMove = event.timeStamp;
      showControls();
    },
    { passive: true }
  );

  function setInfo(open) {
    infoPanel.hidden = !open;
    infoButton.setAttribute("aria-expanded", String(open));
    showControls();
  }

  infoButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfo(infoPanel.hidden);
  });

  closeInfo.addEventListener("click", () => setInfo(false));

  document.addEventListener("click", (event) => {
    if (!infoPanel.hidden && !infoPanel.contains(event.target)) setInfo(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && event.target === document.body) {
      event.preventDefault();
      if (!state.running) begin();
      else setPaused(!state.paused);
      return;
    }
    if (event.key === "Escape") {
      if (!infoPanel.hidden) setInfo(false);
      if (!markCard.hidden) {
        markCard.hidden = true;
        mark.setAttribute("aria-expanded", "false");
      }
    }
    showControls();
  });

  mark.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = markCard.hidden;
    markCard.hidden = !open;
    mark.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!markCard.hidden && !markCard.contains(event.target)) {
      markCard.hidden = true;
      mark.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("resize", resize, { passive: true });

  refreshAccent();
  setInterval(refreshAccent, 60 * 1000);
  resize();
  requestAnimationFrame(frame);
})();
