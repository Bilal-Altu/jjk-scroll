// Jujutsu Kaisen – Scroll-Hommage Nº 02.
// Sukuna (Hero) → „領域展開“ → Gojo: Zoom vom Porträt ins Auge, die Iris öffnet sich zur Infinite Void →
// Nobara: Kling-Clip als Bildfolge, das Scrollen steuert den Hammerschlag Bild für Bild → Besetzung → Abspann.
// Weiches Scrollen über Lenis.
// Alle Bildebenen liegen in natürlicher Größe (1536 × 1024) und werden per transform platziert.
(() => {
  const qs = new URLSearchParams(location.search);
  const SHOT = qs.has('t');            // Standbild für Screenshots: ?t=2.1 (Bildschirmhöhen), &ago=ms nach dem Treffer

  const IW = 1536, IH = 1024;
  // Messpunkte in Bildpixeln
  const SUKUNA_FACE = [655, 150];
  const GOJO_EYE = [948, 380];           // rechtes Auge (vom Betrachter), Pupille
  const EYE_PUPIL = [765, 445];          // Pupille in der Nahaufnahme
  const EYE_K = 0.16;                    // Iris Porträt (r 32) : Iris Nahaufnahme (r 200)
  const PUPIL_R = 30;
  const VOID_C = [775, 495];
  // Nobara-Bildfolge (bilder/nobara-seq, aus dem Kling-Clip ab 1,6 s): 83 Bilder, Aufprall bei Bild 35
  const SEQ_N = 83, SEQ_HIT = 35, SEQ_W = 1600, SEQ_H = 902;
  const P_START = 0.08, P_HIT = 0.55, P_END = 0.92;

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
  const L = {
    sukuna: $('#l-sukuna'), portrait: $('#l-portrait'), eye: $('#l-eye'), void: $('#l-void'),
  };
  const heroLines = $$('.hero .ln');
  const dk = $$('.dk span'), dkSub = $$('.dk-sub .ln');
  const gIntro = $$('.g-intro .ln'), gVoid = $$('.g-void .ln');
  const nA = $$('.n-a .ln');
  const rows = $$('.rows li');
  rows.forEach((li) => { li._a = 0; });

  let vw = innerWidth, vh = innerHeight;
  const start = performance.now();
  let last = start, impactAt = -1e9, wasHit = false;

  const seqCvs = $('#seq'), seqG = seqCvs.getContext('2d');
  const seq = Array.from({ length: SEQ_N }, (_, i) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = `bilder/nobara-seq/${String(i).padStart(3, '0')}.webp`;
    return img;
  });
  const seqReady = Promise.all(seq.map((img) => (img.complete ? 0 : new Promise((r) => { img.onload = img.onerror = r; }))));
  let seqKey = '';
  function sizeSeq() {
    const d = Math.min(devicePixelRatio || 1, 2);
    seqCvs.width = Math.round(vw * d); seqCvs.height = Math.round(vh * d);
    seqKey = '';
  }
  // Bild i mit Zoom z so zeichnen, dass Bildpunkt (fx, fy) (0..1) auf Bildschirmpunkt (sx, sy) liegt
  function drawSeq(i, z, fx, fy, sx, sy, dx, dy) {
    let k = i;
    while (k > 0 && !(seq[k].complete && seq[k].naturalWidth)) k--;   // nächstes geladenes Bild davor
    const img = seq[k];
    if (!img.complete || !img.naturalWidth) return;
    const key = [k, z.toFixed(4), fx.toFixed(3), sx | 0, sy | 0, dx | 0, dy | 0, vw, vh].join('|');
    if (key === seqKey) return;
    seqKey = key;
    const d = seqCvs.width / vw;
    const s = Math.max(vw / SEQ_W, vh / SEQ_H) * z;
    const w = SEQ_W * s, h = SEQ_H * s;
    const x = clamp(sx - fx * w, vw - w, 0) + dx, y = clamp(sy - fy * h, vh - h, 0) + dy;
    seqG.setTransform(d, 0, 0, d, 0, 0);
    seqG.fillStyle = '#09090b'; seqG.fillRect(0, 0, vw, vh);
    seqG.drawImage(img, x, y, w, h);
  }

  const prog = (el) => { const r = el.getBoundingClientRect(); const t = r.height - vh; return t > 0 ? clamp(-r.top / t) : 0; };
  const enter = (el) => clamp((vh - el.getBoundingClientRect().top) / vh);
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; };
  const lines = (els, k, st = 0.1) => els.forEach((l, i) => set(l, '--r', E.out3(clamp(k * (1 + st * els.length) - i * st))));

  // Bild so legen, dass Bildpunkt (ax, ay) auf Bildschirmpunkt (sx, sy) liegt; mit cover bleibt der Schirm bedeckt
  const cover = () => Math.max(vw / IW, vh / IH);
  function place(el, s, ax, ay, sx, sy, { keep = true, rot = 0, dx = 0, dy = 0 } = {}) {
    let x = sx - ax * s, y = sy - ay * s;
    if (keep) { x = clamp(x, vw - IW * s, 0); y = clamp(y, vh - IH * s, 0); }
    el.style.transform = rot
      ? `translate3d(${sx + dx}px, ${sy + dy}px, 0) rotate(${rot}rad) scale(${s}) translate(${-ax}px, ${-ay}px)`
      : `translate3d(${x + dx}px, ${y + dy}px, 0) scale(${s})`;
    return { s, x, y, at: (px, py) => [x + px * s, y + py * s] };
  }
  // Bildpunkt beim Zoom von seiner natürlichen Lage (zentriert, cover) zur Zielstelle führen
  function zoomTo(el, zoom, [fx, fy], k, tx, ty, opts = {}) {
    const c = cover(), s0 = c, s = c * zoom, [alx, aly] = opts.align || [0.5, 0.5];
    const nx = (vw - IW * s0) * alx + fx * s0, ny = (vh - IH * s0) * aly + fy * s0;
    return place(el, s, fx, fy, mix(nx, tx, k), mix(ny, ty, k), opts);
  }
  function mask(el, cx, cy, inner, outer) {
    const m = `radial-gradient(circle at ${cx}px ${cy}px, #000 ${inner}px, transparent ${outer}px)`;
    el.style.webkitMaskImage = m; el.style.maskImage = m;
  }

  function update(now, dt) {
    const intro = SHOT ? 3 : (now - start) / 1000;

    /* ---------- 01 Sukuna ---------- */
    if (onScreen(sec.hero)) {
      const s = sec.hero, p = prog(s);
      heroLines.forEach((l, i) => set(l, '--r', E.out3(clamp((intro - 0.2 - i * 0.12) / 0.9))));
      set(s, '--kin', E.out3(clamp((intro - 0.75) / 0.9)));
      const settle = 0.06 * (1 - E.out3(clamp(intro / 1.6)));
      const tall = vh > vw;
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
      const s = sec.gojo, p = prog(s), c = cover();
      lines(gIntro, seg(enter(s), 0.55, 1));
      set(s, '--qin', E.out2(seg(enter(s), 0.85, 1)));
      set(s, '--gout', E.in2(seg(p, 0.08, 0.16)));

      // ein durchgehender Zoom M (bezogen aufs Porträt), logarithmisch für gleichmäßiges Tempo
      const u = seg(p, 0.08, 0.64);
      const M = Math.exp(mix(Math.log(1.04), Math.log(34), E.sine(u)));
      const toCenter = E.out2(seg(u, 0, 0.32));
      const P = zoomTo(L.portrait, M, GOJO_EYE, toCenter, vw / 2, vh / 2);
      const [ex, ey] = P.at(...GOJO_EYE);

      // Nahaufnahme des Auges: deckungsgleich auf der Pupille, weiche Kreismaske wächst mit
      const se = P.s * EYE_K;
      const eyeOn = M > 2.1 && p < 0.7;
      vis(L.eye, eyeOn);
      if (eyeOn) {
        place(L.eye, se, ...EYE_PUPIL, ex, ey, { keep: false });
        const rho = 230 * Math.pow(M / 2.1, 1.4);
        mask(L.eye, EYE_PUPIL[0], EYE_PUPIL[1], rho * 0.5, rho);
        L.eye.style.opacity = E.out2(seg(M, 2.1, 2.9)).toFixed(3);
      }
      vis(L.portrait, M < 8.5);

      // Infinite Void: öffnet sich aus der Pupille, dreht sich langsam
      const voidOn = M > 7.5;
      vis(L.void, voidOn);
      if (voidOn) {
        const rot = 0.1 * seg(M, 7.5, 34) + 0.22 * seg(p, 0.64, 1);
        const cs = Math.cos(rot), sn = Math.sin(rot);
        const need = Math.max((vw * cs + vh * sn) / IW, (vw * sn + vh * cs) / IH);
        const grow = mix(0.4, 1.06, E.out2(seg(Math.log(M), Math.log(7.5), Math.log(34)))) + 0.14 * seg(p, 0.64, 1);
        const sv = need * grow;
        const vx = mix(ex, vw / 2, seg(M, 20, 34)), vy = mix(ey, vh / 2, seg(M, 20, 34));
        place(L.void, sv, ...VOID_C, vx, vy, { keep: false, rot });
        const rScreen = PUPIL_R * se * Math.pow(M / 7.5, 2.6);
        const full = rScreen > Math.hypot(vw, vh);
        if (full) { L.void.style.webkitMaskImage = 'none'; L.void.style.maskImage = 'none'; }
        else mask(L.void, VOID_C[0], VOID_C[1], (rScreen * 0.55) / sv, rScreen / sv);
      }
      set(s, '--sh', 1 - seg(p, 0.08, 0.16) + 0.0);
      set(s, '--vin', E.out3(seg(p, 0.64, 0.72)));
      lines(gVoid, seg(p, 0.66, 0.78));
    }

    /* ---------- 03 Nobara ---------- */
    if (onScreen(sec.nobara)) {
      const s = sec.nobara, p = prog(s);
      lines(nA, seg(enter(s), 0.55, 1));
      // Scrollposition → Bild: bis zum Aufprall und danach je eigener Abschnitt, damit der Treffer immer bei P_HIT liegt
      const f = p < P_HIT
        ? seg(p, P_START, P_HIT) * SEQ_HIT
        : SEQ_HIT + seg(p, P_HIT, P_END) * (SEQ_N - 1 - SEQ_HIT);
      const frame = Math.min(SEQ_N - 1, Math.round(f));
      const hit = frame >= SEQ_HIT;
      if (hit && !wasHit) impactAt = now;
      wasHit = hit;
      let ago = now - impactAt;
      if (SHOT) ago = qs.has('pps') ? (p - P_HIT) / parseFloat(qs.get('pps')) * 1000 : parseFloat(qs.get('ago') || '2000');
      const shake = hit ? Math.exp(-ago / 110) : 0;
      const punch = hit ? Math.exp(-ago / 160) : 0;
      const dx = Math.sin(ago * 0.11) * 14 * shake, dy = Math.cos(ago * 0.087) * 10 * shake;
      const push = 0.06 * E.inOut(seg(p, P_START, P_END));
      if (vh > vw) {
        // Hochformat: Kamera bei Nobara, ab dem Aufprall harter Schnitt auf den Einschlag
        const fx = hit ? 0.27 : mix(0.66, 0.6, seg(f, 22, SEQ_HIT));
        drawSeq(frame, 1 + push + 0.05 * punch, fx, 0.4, vw * 0.5, vh * 0.42, dx, dy);
      } else {
        drawSeq(frame, 1.02 + push + 0.05 * punch, 0.42, 0.42, vw * 0.42, vh * 0.42, dx, dy);
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

  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; sizeSeq(); });
  sizeSeq();

  // Liegt zu einem Bild ein Video in bilder/video/, ersetzt es das Standbild (stumm, Endlosschleife)
  const videos = [];
  const swapVideos = () => Promise.all($$('img[data-video]').map((img) => new Promise((done) => {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.className = img.className; v.id = img.id; v.width = IW; v.height = IH;
    v.addEventListener('loadeddata', () => {
      img.replaceWith(v); videos.push(v);
      const key = Object.keys(L).find((k) => L[k] === img); if (key) L[key] = v;
      v.play().catch(() => {}); done();
    }, { once: true });
    v.addEventListener('error', done, { once: true });
    v.src = `bilder/video/${img.dataset.video}.mp4`;
  })));
  const playVisible = () => videos.forEach((v) => {
    const r = v.parentElement.getBoundingClientRect();
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
    Promise.all([document.fonts.ready, seqReady, ...imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))]).then(() => {
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
  swapVideos();
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
    if (videos.length) playVisible();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
