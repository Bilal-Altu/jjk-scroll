// Fotografiert die Seite an festen Scrollpositionen (headless Edge über DevTools-Protokoll).
// Aufruf: node _dev/shots.mjs [--size=1440x900] [--dpr=1] [--time=3] [--cols=3] [--w=640] t1 t2 …
// Ergebnis: _dev/out/NN.png je Position und _dev/out/sheet.png als Kontaktbogen.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HIER, '..');
const OUT = join(HIER, 'out');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FFMPEG_WINGET = 'C:/Users/bilal/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe';
const FFMPEG = existsSync(FFMPEG_WINGET) ? FFMPEG_WINGET : 'ffmpeg';

const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const [BW, BH] = opt('size', '1440x900').split('x').map(Number);
const DPR = Number(opt('dpr', '1'));
const TIME = opt('time', '3');
const COLS = Number(opt('cols', '3'));
const TW = Number(opt('w', '640'));
const times = args.filter((x) => !x.startsWith('--'));
const PORT = 4790 + Math.floor(Math.random() * 100), CDP = 9400 + Math.floor(Math.random() * 100);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(PORT);

mkdirSync(OUT, { recursive: true });
const profil = mkdtempSync(join(tmpdir(), 'aot-shots-'));
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json()).webSocketDebuggerUrl; } catch { await pause(200); }
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 1;
const wait = new Map(), events = new Set();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.rej(new Error(JSON.stringify(m.error))) : w.res(m.result); }
  else if (m.method) for (const f of events) f(m);
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = id++; wait.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const s = (m, p) => send(m, p, sessionId);
await s('Page.enable'); await s('Runtime.enable');
const logs = [];
events.add((m) => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('ERR ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
});
await s('Emulation.setDeviceMetricsOverride', { width: BW, height: BH, deviceScaleFactor: DPR, mobile: BW < 700 });

const files = [];
for (const [n, t] of times.entries()) {
  await s('Page.navigate', { url: `http://localhost:${PORT}/?t=${t}&time=${TIME}` });
  let ok = false;
  for (let i = 0; i < 150 && !ok; i++) {
    await pause(100);
    try { ok = (await s('Runtime.evaluate', { expression: 'window.__done === true', returnByValue: true })).result.value; } catch {}
  }
  if (!ok) logs.push(`t=${t}: nicht fertig geworden`);
  if (n === 0) { const d = (await s('Runtime.evaluate', { expression: 'JSON.stringify(window.__dbg || null)', returnByValue: true })).result.value; if (d && d !== 'null') logs.push('dbg ' + d); }
  await pause(120);
  const { data } = await s('Page.captureScreenshot', { format: 'png' });
  const f = join(OUT, String(n).padStart(2, '0') + '.png');
  writeFileSync(f, Buffer.from(data, 'base64'));
  files.push(f);
}
ws.close(); edge.kill(); server.close();
await pause(300);
try { rmSync(profil, { recursive: true, force: true }); } catch {}

if (files.length > 1 && !args.includes('--nosheet')) {
  const rows = Math.ceil(files.length / COLS);
  const inputs = files.flatMap((f) => ['-i', f]);
  const th = Math.round(TW * BH / BW / 2) * 2;
  let fc = files.map((_, i) => `[${i}]scale=${TW}:${th}:flags=lanczos,pad=${TW + 6}:${th + 6}:3:3:white[v${i}]`).join(';');
  for (let i = files.length; i < rows * COLS; i++) fc += `;color=white:s=${TW + 6}x${th + 6}:d=1[v${i}]`;
  const layout = Array.from({ length: rows * COLS }, (_, i) => `${(i % COLS) * (TW + 6)}_${Math.floor(i / COLS) * (th + 6)}`).join('|');
  fc += ';' + Array.from({ length: rows * COLS }, (_, i) => `[v${i}]`).join('') + `xstack=inputs=${rows * COLS}:layout=${layout}[o]`;
  execFileSync(FFMPEG, ['-v', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', '[o]', '-frames:v', '1', join(OUT, 'sheet.png')]);
}
console.log(logs.length ? logs.join('\n') : 'keine Fehler');
console.log(files.length + ' Bilder', files.length > 1 ? '→ _dev/out/sheet.png' : '');
