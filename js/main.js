// Jujutsu Kaisen – Scroll-Hommage Nº 02.
// Sukuna (Hero, Kling-Loop) → „領域展開“ → Gojo: Kling-Clip vom Porträt ins Auge, Bild für Bild per Scroll,
// danach öffnet sich die Iris zur Infinite Void → Nobara: Kling-Clip, das Scrollen führt den Hammerschlag →
// Besetzung → Abspann. Weiches Scrollen über Lenis.
// Bildebenen liegen in natürlicher Größe (1536 × 1024) und werden per transform platziert;
// Clips liegen als Einzelbilder vor und werden auf einem Canvas gezeichnet.
(() => {
  const qs = new URLSearchParams(location.search);
  const SHOT = qs.has('t');            // Standbild für Screenshots: ?t=… oder ?t=0&sec=gojo&p=0.5, dazu &ago= / &pps=

  const IW = 1536, IH = 1024;
  // Messpunkte in Bildpixeln
  const SUKUNA_FACE = [655, 150];
  const EYE_PUPIL = [765, 445];          // Pupille in der Augen-Nahaufnahme (03)
  const EYE_CLIP_TOP = 13;               // der Gojo-Clip endet auf 03, Ausschnitt 1536 × 864 ab y = 13
  const PUPIL_R = 30;
  const VOID_C = [775, 495];

  // Gojo-Clip (bilder/gojo-seq): 95 Bilder; ruhig bis 26, Kameraflug 26–88, Auge steht ab 88
  const G = { n: 95, w: 1920, h: 1080, calm: 26, flyEnd: 88 };
  const GP = { calm: 0.22, fly: 0.5, last: 0.55, eyeEnd: 0.76 };
  // Nobara-Clip (bilder/nobara-seq): 83 Bilder, Aufprall bei Bild 35
  const N = { n: 83, w: 1600, h: 902, hit: 35 };
  const NP = { start: 0.08, hit: 0.55, end: 0.92 };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const mix = (a, b, k) => a + (b - a) * k;
  const E = {
    out2: (k) => 1 - (1 - k) * (1 - k),
    out3: (k) => 1 - Math.pow(1 - k, 3),
    in2: (k) => k * k,
    inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    sine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const set = (el, k, v) => el.style.setProperty(k, typeof v === 'number' ? v.toFixed(4) : v);
  const vis = (el, on) => { const v = on ? 'visible' : 'hidden'; if (el.style.visibility !== v) el.style.visibility = v; };

  const sec = {};
  $$('[data-sec]').forEach((s) => { sec[s.dataset.sec] = s; });
  const L = { sukuna: $('#l-sukuna'), eye: $('#l-eye'), void: $('#l-void') };
  const heroLines = $$('.hero .ln');
  const dk = $$('.dk span'), dkSub = $$('.dk-sub .ln');
  const gIntro = $$('.g-intro .ln'), gVoid = $$('.g-void .ln');
  const nA = $$('.n-a .ln');
  const rows = $$('.rows li');
  rows.forEach((li) => { li._a = 0; });

  let vw = innerWidth, vh = innerHeight;
  const start = performance.now();
  let last = start, impactAt = -1e9, wasHit = false;

  /* ---------------- Bildfolgen-Spieler ---------------- */
  function makeSeq(cvs, dir, { n, w: W, h: H }) {
    const g = cvs.getContext('2d');
    const imgs = Array.from({ length: n }, (_, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = `bilder/${dir}/${String(i).padStart(3, '0')}.webp`;
      return img;
    });
    const ready = Promise.all(imgs.map((img) => (img.complete ? 0 : new Promise((r) => { img.onload = img.onerror = r; }))));
    let key = '';
    return {
      ready,
      size() {
        const d = Math.min(devicePixelRatio || 1, 2);
        cvs.width = Math.round(vw * d); cvs.height = Math.round(vh * d);
        key = '';
      },
      // Lage von Bild i bei Zoom z, Bildpunkt (fx, fy) ∈ 0..1 auf Bildschirmpunkt (sx, sy), Rand bleibt bedeckt
      place(z, fx, fy, sx, sy) {
        const s = Math.max(vw / W, vh / H) * z;
        const w = W * s, h = H * s;
        return { x: clamp(sx - fx * w, vw - w, 0), y: clamp(sy - fy * h, vh - h, 0), w, h };
      },
      draw(i, z, fx, fy, sx, sy, dx = 0, dy = 0) {
        const pl = this.place(z, fx, fy, sx, sy);
        let k = Math.min(n - 1, Math.max(0, i));
        while (k > 0 && !(imgs[k].complete && imgs[k].naturalWidth)) k--;   // nächstes geladenes Bild davor
        const img = imgs[k];
        if (!img.complete || !img.naturalWidth) return pl;
        const nk = [k, pl.x.toFixed(1), pl.y.toFixed(1), pl.w.toFixed(1), dx | 0, dy | 0, cvs.width].join('|');
        if (nk === key) return pl;
        key = nk;
        const d = cvs.width / vw;
        g.setTransform(d, 0, 0, d, 0, 0);
        g.fillStyle = '#09090b'; g.fillRect(0, 0, vw, vh);
        g.drawImage(img, pl.x + dx, pl.y + dy, pl.w, pl.h);
        return pl;
      },
    };
  }
  const gojoCvs = $('#gseq'), nobaraCvs = $('#nseq');
  const gojoSeq = makeSeq(gojoCvs, 'gojo-seq', G);
  const nobaraSeq = makeSeq(nobaraCvs, 'nobara-seq', N);

  const prog = (el) => { const r = el.getBoundingClientRect(); const t = r.height - vh; return t > 0 ? clamp(-r.top / t) : 0; };
  const enter = (el) => clamp((vh - el.getBoundingClientRect().top) / vh);
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; };
  const lines = (els, k, st = 0.1) => els.forEach((l, i) => set(l, '--r', E.out3(clamp(k * (1 + st * els.length) - i * st))));

  // Bild so legen, dass Bildpunkt (ax, ay) auf Bildschirmpunkt (sx, sy) liegt; mit keep bleibt der Schirm bedeckt
  const cover = () => Math.max(vw / IW, vh / IH);
  function place(el, s, ax, ay, sx, sy, { keep = true, rot = 0 } = {}) {
    let x = sx - ax * s, y = sy - ay * s;
    if (keep) { x = clamp(x, vw - IW * s, 0); y = clamp(y, vh - IH * s, 0); }
    el.style.transform = rot
      ? `translate3d(${sx}px, ${sy}px, 0) rotate(${rot}rad) scale(${s}) translate(${-ax}px, ${-ay}px)`
      : `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  }
  // Bildpunkt beim Zoom von seiner natürlichen Lage (zentriert, cover) zur Zielstelle führen
  function zoomTo(el, zoom, [fx, fy], k, tx, ty) {
    const s0 = cover(), s = s0 * zoom;
    const nx = (vw - IW * s0) / 2 + fx * s0, ny = (vh - IH * s0) / 2 + fy * s0;
    place(el, s, fx, fy, mix(nx, tx, k), mix(ny, ty, k));
  }
  function mask(el, cx, cy, inner, outer) {
    const m = `radial-gradient(circle at ${cx}px ${cy}px, #000 ${inner}px, transparent ${outer}px)`;
    el.style.webkitMaskImage = m; el.style.maskImage = m;
  }
  function noMask(el) { el.style.webkitMaskImage = 'none'; el.style.maskImage = 'none'; }

  function update(now, dt) {
    const intro = SHOT ? 3 : (now - start) / 1000;
    const tall = vh > vw;

    /* ---------- 01 Sukuna ---------- */
    if (onScreen(sec.hero)) {
      const s = sec.hero, p = prog(s);
      heroLines.forEach((l, i) => set(l, '--r', E.out3(clamp((intro - 0.2 - i * 0.12) / 0.9))));
      set(s, '--kin', E.out3(clamp((intro - 0.75) / 0.9)));
      const settle = 0.06 * (1 - E.out3(clamp(intro / 1.6)));
      zoomTo(L.sukuna, 1.02 + settle + 0.32 * E.inOut(p), SUKUNA_FACE, tall ? 1 : E.inOut(p), vw / 2, vh * (tall ? 0.24 : 0.3));
      set(s, '--out', E.in2(seg(p, 0.04, 0.42)));
      set(s, '--dim', 0.75 * E.in2(seg(p, 0.45, 1)));
    }

    /* ---------- 領域展開 ---------- */
    if (onScreen(sec.domain)) {
      const s = sec.domain, p = prog(s);
      const red = seg(p, 0.6, 0.7), out = seg(p, 0.86, 1);
      dk.forEach((k, i) => {
        set(k, '--o', E.out3(seg(p, 0.06 + i * 0.1, 0.22 + i * 0.1)) * (1 - out));
        const c = [mix(236, 212, red), mix(230, 32, red), mix(220, 46, red)].map(Math.round);
        k.style.setProperty('--c', `rgb(${c})`);
      });
      lines(dkSub, seg(p, 0.48, 0.6) * (1 - out));
    }

    /* ---------- 02 Gojo ---------- */
    if (onScreen(sec.gojo)) {
      const s = sec.gojo, p = prog(s);
      lines(gIntro, seg(enter(s), 0.55, 1));
      set(s, '--qin', E.out2(seg(enter(s), 0.85, 1)));
      set(s, '--gout', E.in2(seg(p, 0.12, 0.2)));
      set(s, '--sh', 1 - seg(p, 0.12, 0.2));

      // Teil 1: der Clip – ruhige Phase, dann der Kameraflug ins Auge
      const f = p < GP.calm ? seg(p, 0, GP.calm) * G.calm
        : p < GP.fly ? G.calm + seg(p, GP.calm, GP.fly) * (G.flyEnd - G.calm)
        : G.flyEnd + seg(p, GP.fly, GP.last) * (G.n - 1 - G.flyEnd);
      const fk = seg(f, G.calm, G.flyEnd);
      // Hochformat: vom Gesicht (rechtes Auge) zur Bildmitte, wo der Clip auf dem Auge landet
      const fx = tall ? mix(0.58, 0.498, fk) : 0.5, fy = tall ? mix(0.42, 0.5, fk) : 0.5;
      const eyeOn = p >= GP.last;
      vis(gojoCvs, !eyeOn);
      const pl = eyeOn ? gojoSeq.place(1, fx, fy, vw / 2, vh / 2) : gojoSeq.draw(Math.round(f), 1, fx, fy, vw / 2, vh / 2);

      // Teil 2: dasselbe Auge als Standbild, Zoom in die Pupille, die Void öffnet sich daraus
      const s0 = pl.w / IW;                                   // Maßstab der Augen-Nahaufnahme, deckungsgleich zum Clip
      const P0 = [pl.x + EYE_PUPIL[0] * s0, pl.y + (EYE_PUPIL[1] - EYE_CLIP_TOP) * s0];
      const Z = Math.exp(mix(0, Math.log(16), E.sine(seg(p, GP.last, GP.eyeEnd))));
      const sE = s0 * Z;
      const kc = E.out2(seg(Math.log(Z), 0, Math.log(3)));
      const ex = mix(P0[0], vw / 2, kc), ey = mix(P0[1], vh / 2, kc);
      const rScreen = PUPIL_R * sE * Math.pow(Z / 2.2, 2);
      const full = Z > 2.2 && rScreen > Math.hypot(vw, vh);
      vis(L.eye, eyeOn && !full);
      if (eyeOn && !full) place(L.eye, sE, EYE_PUPIL[0], EYE_PUPIL[1], ex, ey, { keep: false });

      const voidOn = eyeOn && Z > 2.2;
      vis(L.void, voidOn);
      if (voidOn) {
        const rot = 0.1 * seg(Z, 2.2, 16) + 0.22 * seg(p, GP.eyeEnd, 1);
        const cs = Math.cos(rot), sn = Math.sin(rot);
        const need = Math.max((vw * cs + vh * sn) / IW, (vw * sn + vh * cs) / IH);
        const grow = mix(0.4, 1.1, E.out2(seg(Math.log(Z), Math.log(2.2), Math.log(6)))) + 0.14 * seg(p, GP.eyeEnd, 1);
        const sv = need * grow;
        const vx = mix(ex, vw / 2, seg(Z, 3, 6)), vy = mix(ey, vh / 2, seg(Z, 3, 6));
        place(L.void, sv, VOID_C[0], VOID_C[1], vx, vy, { keep: false, rot });
        if (full) noMask(L.void);
        else mask(L.void, VOID_C[0], VOID_C[1], (rScreen * 0.55) / sv, rScreen / sv);
      }
      set(s, '--vin', E.out3(seg(p, 0.74, 0.8)));
      lines(gVoid, seg(p, 0.76, 0.86));
    }

    /* ---------- 03 Nobara ---------- */
    if (onScreen(sec.nobara)) {
      const s = sec.nobara, p = prog(s);
      lines(nA, seg(enter(s), 0.55, 1));
      // Scrollposition → Bild: bis zum Aufprall und danach je eigener Abschnitt, damit der Treffer immer bei NP.hit liegt
      const f = p < NP.hit ? seg(p, NP.start, NP.hit) * N.hit : N.hit + seg(p, NP.hit, NP.end) * (N.n - 1 - N.hit);
      const frame = Math.min(N.n - 1, Math.round(f));
      const hit = frame >= N.hit;
      if (hit && !wasHit) impactAt = now;
      wasHit = hit;
      let ago = now - impactAt;
      if (SHOT) ago = qs.has('pps') ? (p - NP.hit) / parseFloat(qs.get('pps')) * 1000 : parseFloat(qs.get('ago') || '2000');
      const shake = hit ? Math.exp(-ago / 110) : 0;
      const punch = hit ? Math.exp(-ago / 160) : 0;
      const dx = Math.sin(ago * 0.11) * 14 * shake, dy = Math.cos(ago * 0.087) * 10 * shake;
      const push = 0.06 * E.inOut(seg(p, NP.start, NP.end));
      if (tall) {
        // Hochformat: Kamera bei Nobara, ab dem Aufprall harter Schnitt auf den Einschlag
        const fx = hit ? 0.27 : mix(0.66, 0.6, seg(f, 22, N.hit));
        nobaraSeq.draw(frame, 1 + push + 0.05 * punch, fx, 0.4, vw * 0.5, vh * 0.42, dx, dy);
      } else {
        nobaraSeq.draw(frame, 1.02 + push + 0.05 * punch, 0.42, 0.42, vw * 0.42, vh * 0.42, dx, dy);
      }
      set(s, '--flash', hit ? 0.45 * Math.exp(-ago / 170) : 0);
      set(s, '--hit', hit ? 1 : 0);
      set(s, '--slam', hit ? Math.exp(-ago / 140) : 0);
    }

    /* ---------- Besetzung ---------- */
    let best = -1, bd = Infinity;
    rows.forEach((li, i) => { const r = li.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - vh / 2); if (d < bd) { bd = d; best = i; } });
    if (bd > vh * 0.3) best = -1;
    const kk = SHOT ? 1 : 1 - Math.exp(-dt * 10);
    rows.forEach((li, i) => {
      const a = i === best ? 1 : 0;
      li._a += (a - li._a) * kk;
      if (Math.abs(a - li._a) < 0.002) li._a = a;
      set(li, '--a', li._a);
    });
  }

  const resize = () => { vw = innerWidth; vh = innerHeight; gojoSeq.size(); nobaraSeq.size(); };
  addEventListener('resize', resize);
  resize();

  // Sukuna-Loop: läuft nur, solange der Hero in der Nähe ist; nach dem Zurückwechseln in den Tab neu starten
  const videos = $$('video');
  const playVisible = () => videos.forEach((v) => {
    const r = v.closest('section').getBoundingClientRect();
    const near = r.bottom > -vh * 0.5 && r.top < vh * 1.5;
    if (near && v.paused && document.visibilityState === 'visible') v.play().catch(() => {});
    else if (!near && !v.paused) v.pause();
  });
  document.addEventListener('visibilitychange', playVisible);

  // Vollbild für Tablet/Handy; als App vom Startbildschirm läuft die Seite ohnehin im Vollbild
  const fsBtn = $('.fs-btn'), root = document.documentElement;
  const canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  const syncFs = () => { fsBtn.hidden = !canFs || standalone || SHOT || !!(document.fullscreenElement || document.webkitFullscreenElement); };
  fsBtn.addEventListener('click', async () => {
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' }); else root.webkitRequestFullscreen();
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } catch (e) { /* abgelehnt */ }
  });
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  syncFs();

  if (SHOT) {
    const imgs = $$('img');
    Promise.all([document.fonts.ready, gojoSeq.ready, nobaraSeq.ready, ...imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))]).then(() => {
      const target = qs.get('sec') && sec[qs.get('sec')];
      window.scrollTo(0, target ? target.offsetTop + parseFloat(qs.get('p') || '0') * (target.offsetHeight - vh) : parseFloat(qs.get('t')) * vh);
      requestAnimationFrame(() => {
        update(performance.now(), 0.016);
        window.__dbg = { vw, vh, y: scrollY };
        window.__done = true;
      });
    });
    return;
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const lenis = window.Lenis ? new window.Lenis({ lerp: 0.085, smoothWheel: true }) : null;
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 2.2 }); else el.scrollIntoView({ behavior: 'smooth' });
  }));
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (lenis) lenis.raf(now);
    update(now, dt);
    playVisible();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
