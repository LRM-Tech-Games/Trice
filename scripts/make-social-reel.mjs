// Records a ~19.5s 9:16 social reel (1080x1920 — TikTok / Reels / Shorts) from
// a real scripted playthrough. Same technique and footage style as
// scripts/make-preview-video.mjs (see scripts/lib/showcase-recorder.mjs); this
// one targets true 9:16 instead of CrazyGames' 2:3, and burns in a small TRICE
// watermark since a reel gets shared standalone, off any store page.
//
// One-time setup (see make-preview-video.mjs for why these aren't in package.json):
//   npm i -D playwright ffmpeg-static && npx playwright install chromium
//
// Then: node scripts/make-social-reel.mjs
// Output: assets/social/trice-reel-1080x1920.mp4
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { record } from './lib/showcase-recorder.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GAME_URL = 'file://' + path.join(ROOT, 'www', 'index.html');
const TMP_DIR = path.join(ROOT, '.social-tmp');
const OUT_DIR = path.join(ROOT, 'assets', 'social');
mkdirSync(TMP_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const PLAY_MS = 17500;
const DELIVER_W = 1080, DELIVER_H = 1920;
// Captured smaller, same 9:16 ratio, then upscaled 2x on encode: the game caps
// its own board at 440px regardless of viewport, so capturing at the delivery
// size directly would leave a lot of the frame empty (see make-preview-video.mjs).
const CAP_W = 540, CAP_H = 960;

// Small TRICE watermark (L-tromino mark + wordmark), transparent PNG. Sized
// and positioned as a corner badge — the game's own achievement-toast pops up
// centered in that same top margin, so a centered watermark collides with it;
// a small top-left badge stays clear of both the toast and typical Reels/
// TikTok/Shorts UI chrome (which sits bottom + right).
function watermarkSvg(w, h){
  const u = h * 0.4;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${h*0.1},${h*0.1})">
      <rect x="0" y="0" width="${u-2}" height="${u-2}" fill="#ff4136"/>
      <rect x="0" y="${u}" width="${u-2}" height="${u-2}" fill="#0a84ff"/>
      <rect x="${u}" y="${u}" width="${u-2}" height="${u-2}" fill="#ffd60a"/>
    </g>
    <text x="${h*0.1 + u*2.1}" y="${h*0.62}" font-family='"Courier New", ui-monospace, monospace'
      font-size="${h*0.42}" font-weight="700" fill="#ffffff" letter-spacing="${h*0.04}">TRICE</text>
  </svg>`;
}

async function makeWatermark(){
  const w = 300, h = 100;
  const svg = watermarkSvg(w, h);
  const out = path.join(TMP_DIR, 'watermark.png');
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}

function encode(webmPath, watermarkPath){
  const out = path.join(OUT_DIR, `trice-reel-${DELIVER_W}x${DELIVER_H}.mp4`);
  // scale game footage up 2x, overlay the watermark as a top-left corner badge
  // (fixed position: measured empirically — the game's own content starts
  // ~185px down at 1080x1920, leaving that whole top strip clear except for
  // the achievement toast, which is centered, so a left-aligned badge is
  // always clear of it), fade the whole thing out at the very end.
  const filter =
    `[0:v]scale=${DELIVER_W}:${DELIVER_H}:flags=lanczos[game];` +
    `[game][1:v]overlay=40:55:format=auto[comp];` +
    `[comp]fade=t=out:st=19.0:d=0.5[outv]`;
  execFileSync(ffmpegPath, [
    '-y', '-i', webmPath, '-i', watermarkPath, '-t', '19.5',
    '-filter_complex', filter, '-map', '[outv]',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '18',
    '-movflags', '+faststart', '-an', out
  ], { stdio: 'inherit' });
  return out;
}

console.log('recording...');
const webm = await record(GAME_URL, TMP_DIR, CAP_W, CAP_H, PLAY_MS);
console.log('building watermark...');
const watermark = await makeWatermark();
console.log('encoding...');
const out = encode(webm, watermark);
console.log('wrote', out);

rmSync(TMP_DIR, { recursive: true, force: true });
console.log('done');
