// Records the ~19.5s CrazyGames preview videos (landscape 1920x1080 + portrait
// 1080x1620) from a real scripted playthrough — not a screen recording, a
// synthetic-but-real game session driven by the same PointerEvent technique
// used throughout this project's own testing, so every clear/combo/achievement
// on screen actually happened.
//
// One-time setup (NOT part of the game's own dependencies — this needs a
// ~280MB browser download, so it's kept out of package.json on purpose):
//   npm i -D playwright ffmpeg-static && npx playwright install chromium
//
// Then:
//   node scripts/make-preview-video.mjs           # both formats
//   node scripts/make-preview-video.mjs landscape  # just one
//   node scripts/make-preview-video.mjs portrait
//
// Output: assets/preview/trice-preview-{landscape-1920x1080,portrait-1080x1620}.mp4
import { chromium } from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'child_process';
import { mkdirSync, readdirSync, renameSync, statSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GAME_URL = 'file://' + path.join(ROOT, 'www', 'index.html');
const TMP_DIR = path.join(ROOT, '.preview-tmp');
const OUT_DIR = path.join(ROOT, 'assets', 'preview');
mkdirSync(TMP_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const PLAY_MS = 17500;   // scripted-gameplay budget; + ~1.5s intro/menu + fades = ~19.5s final

// Runs entirely inside the page: skip the tutorial, pick Relaxed, then greedily
// place pieces (favoring line clears, especially multi-line) with a real
// multi-step drag so the motion reads naturally on camera.
async function showcase(durationMs){
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function fire(el, type, x, y){
    el.dispatchEvent(new PointerEvent(type, { bubbles:true, cancelable:true, clientX:x, clientY:y, pointerId:1 }));
  }
  function cells(){ return document.querySelectorAll('.cell'); }
  function boardFilled(){ return [...cells()].map(c => c.classList.contains('filled')); }
  function readPiece(slot){
    const mini = slot.querySelector('.mini');
    const m = /repeat\((\d+)/.exec(mini.style.gridTemplateColumns);
    const w = m ? +m[1] : 1;
    const kids = [...mini.children];
    const h = kids.length / w;
    const coords = [];
    kids.forEach((k, idx) => { if (!k.classList.contains('e')) coords.push([Math.floor(idx / w), idx % w]); });
    return { coords, w, h };
  }
  function fullLinesAfter(board, coords, r0, c0){
    const b = board.slice();
    coords.forEach(([dr, dc]) => { b[(r0+dr)*6 + (c0+dc)] = true; });
    let n = 0;
    for (let r = 0; r < 6; r++){ let f = true; for (let c = 0; c < 6; c++) if (!b[r*6+c]){ f = false; break; } if (f) n++; }
    for (let c = 0; c < 6; c++){ let f = true; for (let r = 0; r < 6; r++) if (!b[r*6+c]){ f = false; break; } if (f) n++; }
    return n;
  }
  function scorePlacement(board, coords, r0, c0){
    const nLines = fullLinesAfter(board, coords, r0, c0);
    let adj = 0;
    coords.forEach(([dr, dc]) => {
      const r = r0+dr, c = c0+dc;
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([rr,cc]) => {
        if (rr < 0 || rr > 5 || cc < 0 || cc > 5) { adj += 1; return; }
        if (board[rr*6+cc]) adj += 2;
      });
    });
    return nLines*nLines*1000 + adj;
  }
  function bestMove(){
    const board = boardFilled();
    let best = null;
    [...document.querySelectorAll('.slot')].forEach(slot => {
      const p = readPiece(slot);
      for (let r0 = 0; r0 <= 6 - p.h; r0++){
        for (let c0 = 0; c0 <= 6 - p.w; c0++){
          let ok = true;
          for (const [dr, dc] of p.coords){ if (board[(r0+dr)*6 + (c0+dc)]) { ok = false; break; } }
          if (!ok) continue;
          const s = scorePlacement(board, p.coords, r0, c0);
          if (!best || s > best.s) best = { s, slot, p, r0, c0 };
        }
      }
    });
    return best;
  }
  async function dragMove(mv){
    const slot = mv.slot, mini = slot.querySelector('.mini');
    const grab = mv.p.coords[0];
    const mr = mini.getBoundingClientRect();
    const startX = mr.left + (grab[1] + 0.5) * (mr.width / mv.p.w);
    const startY = mr.top + (grab[0] + 0.5) * (mr.height / mv.p.h);
    const tr = cells()[(mv.r0+grab[0])*6 + (mv.c0+grab[1])].getBoundingClientRect();
    const endX = tr.left + tr.width/2, endY = tr.top + tr.height/2;
    fire(slot, 'pointerdown', startX, startY);
    for (let i = 1; i <= 7; i++){
      const t = i/7;
      fire(slot, 'pointermove', startX + (endX-startX)*t, startY + (endY-startY)*t);
      await sleep(28);
    }
    fire(slot, 'pointerup', endX, endY);
  }

  document.querySelector('#intro-skip')?.click();
  await sleep(650);
  if (!document.querySelector('#menu').classList.contains('hidden')){
    await sleep(550);
    document.querySelector('.modebtn[data-mode="relaxed"]').click();
  }
  await sleep(350);

  const t0 = performance.now();
  while (performance.now() - t0 < durationMs){
    if (!document.querySelector('#overlay').classList.contains('hidden')){
      document.querySelector('#again').click();
      await sleep(400);
      continue;
    }
    if (document.querySelectorAll('.cell.clearing').length){ await sleep(80); continue; }
    const mv = bestMove();
    if (!mv){ await sleep(150); continue; }
    await dragMove(mv);
    await sleep(230);
  }
  await sleep(500);
}

async function record(width, height){
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: TMP_DIR, size: { width, height } }
  });
  const page = await context.newPage();
  await page.goto(GAME_URL);
  await page.waitForTimeout(300);
  await page.evaluate(showcase, PLAY_MS);
  await context.close();
  await browser.close();
  const files = readdirSync(TMP_DIR).filter(f => f.endsWith('.webm'));
  const newest = files.map(f => ({ f, t: statSync(path.join(TMP_DIR, f)).mtimeMs })).sort((a,b) => b.t - a.t)[0].f;
  const dest = path.join(TMP_DIR, `capture-${width}x${height}.webm`);
  renameSync(path.join(TMP_DIR, newest), dest);
  return dest;
}

function encode(webmPath, label, deliverW, deliverH, needsScale){
  const out = path.join(OUT_DIR, `trice-preview-${label}-${deliverW}x${deliverH}.mp4`);
  const vf = needsScale
    ? `scale=${deliverW}:${deliverH}:flags=lanczos,fade=t=out:st=19.0:d=0.5`
    : 'fade=t=out:st=19.0:d=0.5';
  execFileSync(ffmpegPath, [
    '-y', '-i', webmPath, '-t', '19.5', '-vf', vf,
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '19',
    '-movflags', '+faststart', '-an', out
  ], { stdio: 'inherit' });
  return out;
}

const which = process.argv[2] || 'both';

if (which === 'both' || which === 'landscape'){
  console.log('recording landscape...');
  const webm = await record(1920, 1080);
  const out = encode(webm, 'landscape', 1920, 1080, false);
  console.log('wrote', out);
}
if (which === 'both' || which === 'portrait'){
  console.log('recording portrait...');
  // captured smaller (board is capped at 440px regardless of viewport past a
  // point, so a native 1080-wide capture leaves ~50% of the frame empty) then
  // upscaled 1.5x on encode so the game actually fills the frame.
  const webm = await record(720, 1080);
  const out = encode(webm, 'portrait', 1080, 1620, true);
  console.log('wrote', out);
}

rmSync(TMP_DIR, { recursive: true, force: true });
console.log('done');
