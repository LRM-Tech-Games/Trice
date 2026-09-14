// Records the ~19.5s CrazyGames preview videos (landscape 1920x1080 + portrait
// 1080x1620) from a real scripted playthrough — see scripts/lib/showcase-recorder.mjs.
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
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { record } from './lib/showcase-recorder.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GAME_URL = 'file://' + path.join(ROOT, 'www', 'index.html');
const TMP_DIR = path.join(ROOT, '.preview-tmp');
const OUT_DIR = path.join(ROOT, 'assets', 'preview');
mkdirSync(TMP_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const PLAY_MS = 17500;   // scripted-gameplay budget; + ~1.5s intro/menu + fades = ~19.5s final

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
  const webm = await record(GAME_URL, TMP_DIR, 1920, 1080, PLAY_MS);
  const out = encode(webm, 'landscape', 1920, 1080, false);
  console.log('wrote', out);
}
if (which === 'both' || which === 'portrait'){
  console.log('recording portrait...');
  // captured smaller (board is capped at 440px regardless of viewport past a
  // point, so a native 1080-wide capture leaves ~50% of the frame empty) then
  // upscaled 1.5x on encode so the game actually fills the frame.
  const webm = await record(GAME_URL, TMP_DIR, 720, 1080, PLAY_MS);
  const out = encode(webm, 'portrait', 1080, 1620, true);
  console.log('wrote', out);
}

rmSync(TMP_DIR, { recursive: true, force: true });
console.log('done');
