// Generates the 3 CrazyGames cover images from real in-game board data.
// Run: node scripts/make-covers.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const BG = '#050505';
const GRIDBG = '#000000';
const GRIDLINE = '#2b2b2b';
const GREEN = '#28c840';
const YELLOW = '#ffd60a';
const RED = '#ff4136';
const BLUE = '#0a84ff';

// exact board state captured from a real (uncleared) play session — row-major, 36 cells
const BOARD = [
  'rgb(40, 200, 64)','rgb(40, 200, 64)','rgb(255, 214, 10)','rgb(255, 214, 10)','rgb(255, 214, 10)',null,
  'rgb(255, 214, 10)','rgb(255, 214, 10)','rgb(10, 132, 255)','rgb(10, 132, 255)',null,null,
  'rgb(40, 200, 64)','rgb(255, 65, 54)','rgb(255, 65, 54)','rgb(40, 200, 64)',null,null,
  'rgb(40, 200, 64)','rgb(255, 65, 54)','rgb(40, 200, 64)','rgb(40, 200, 64)',null,null,
  'rgb(40, 200, 64)',null,'rgb(40, 200, 64)',null,'rgb(255, 65, 54)','rgb(40, 200, 64)',
  null,null,null,null,'rgb(40, 200, 64)','rgb(40, 200, 64)'
];

function boardGroup(x, y, size){
  const gap = size * 0.014;
  const cell = (size - gap * 7) / 6;
  let g = `<g transform="translate(${x},${y})">`;
  g += `<rect x="${-gap*1.4}" y="${-gap*1.4}" width="${size+gap*2.8}" height="${size+gap*2.8}" fill="none" stroke="#3a3a3a" stroke-width="${size*0.007}"/>`;
  for (let r = 0; r < 6; r++){
    for (let c = 0; c < 6; c++){
      const cx = gap + c * (cell + gap);
      const cy = gap + r * (cell + gap);
      const col = BOARD[r*6+c];
      if (!col){
        g += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" fill="${GRIDBG}" stroke="${GRIDLINE}" stroke-width="${size*0.0016}"/>`;
      } else {
        const inset = cell * 0.02;
        const b = cell - inset*2;
        const bevel = b * 0.11;
        g += `<rect x="${cx}" y="${cy}" width="${cell}" height="${cell}" fill="${GRIDBG}"/>`;
        g += `<rect x="${cx+inset}" y="${cy+inset}" width="${b}" height="${b}" fill="${col}"/>`;
        g += `<rect x="${cx+inset}" y="${cy+inset}" width="${b}" height="${bevel}" fill="#ffffff" opacity="0.28"/>`;
        g += `<rect x="${cx+inset}" y="${cy+inset+b-bevel}" width="${b}" height="${bevel}" fill="#000000" opacity="0.30"/>`;
      }
    }
  }
  g += `</g>`;
  return g;
}

function tromino(x, y, s){
  const u = s / 2, gap = s * 0.02;
  return `<g transform="translate(${x},${y})">
    <rect x="0" y="0" width="${u-gap/2}" height="${u-gap/2}" fill="${RED}"/>
    <rect x="0" y="${u+gap/2}" width="${u-gap/2}" height="${u-gap/2}" fill="${BLUE}"/>
    <rect x="${u+gap/2}" y="${u+gap/2}" width="${u-gap/2}" height="${u-gap/2}" fill="${YELLOW}"/>
  </g>`;
}

function bgTexture(w, h){
  let g = '';
  const step = Math.max(w, h) / 14;
  for (let x = step; x < w; x += step) g += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#111111" stroke-width="1"/>`;
  for (let y = step; y < h; y += step) g += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#111111" stroke-width="1"/>`;
  return g;
}

const FONT = `"Courier New", ui-monospace, monospace`;

function square(w, h){ // 800x800
  const boardSize = Math.round(w * 0.72);
  const bx = (w - boardSize) / 2, by = h * 0.238;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${BG}"/>
    ${bgTexture(w,h)}
    ${tromino(w*0.30, h*0.052, h*0.072)}
    <text x="${w*0.5+h*0.05}" y="${h*0.115}" text-anchor="middle" font-family='${FONT}' font-size="${h*0.098}" font-weight="700" fill="#fff" letter-spacing="${h*0.006}">TRICE</text>
    <text x="${w*0.5}" y="${h*0.175}" text-anchor="middle" font-family='${FONT}' font-size="${h*0.026}" font-weight="700" fill="${GREEN}" letter-spacing="${h*0.004}">FIT &#183; CLEAR &#183; CHASE THE COMBO</text>
    ${boardGroup(bx, by, boardSize)}
  </svg>`;
}

function portrait(w, h){ // 800x1200
  const boardSize = Math.round(w * 0.82);
  const bx = (w - boardSize) / 2, by = h * 0.205;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${BG}"/>
    ${bgTexture(w,h)}
    ${tromino(w*0.295, h*0.045, h*0.052)}
    <text x="${w*0.5+h*0.036}" y="${h*0.086}" text-anchor="middle" font-family='${FONT}' font-size="${h*0.070}" font-weight="700" fill="#fff" letter-spacing="${h*0.004}">TRICE</text>
    <text x="${w*0.5}" y="${h*0.128}" text-anchor="middle" font-family='${FONT}' font-size="${h*0.019}" font-weight="700" fill="${GREEN}" letter-spacing="${h*0.003}">FIT &#183; CLEAR &#183; CHASE THE COMBO</text>
    ${boardGroup(bx, by, boardSize)}
    <text x="${w*0.5}" y="${h*0.965}" text-anchor="middle" font-family='${FONT}' font-size="${h*0.017}" font-weight="700" fill="#6a6a6a" letter-spacing="${h*0.0025}">FREE &#183; NO DOWNLOAD &#183; PLAY IN BROWSER</text>
  </svg>`;
}

function landscape(w, h){ // 1920x1080
  const boardSize = Math.round(h * 0.76);
  const bx = w - boardSize - 70, by = (h - boardSize) / 2;
  const tx = w * 0.085;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${BG}"/>
    ${bgTexture(w,h)}
    ${tromino(tx, h*0.30, h*0.10)}
    <text x="${tx+h*0.135}" y="${h*0.435}" font-family='${FONT}' font-size="${h*0.155}" font-weight="700" fill="#fff" letter-spacing="${h*0.008}">TRICE</text>
    <text x="${tx}" y="${h*0.545}" font-family='${FONT}' font-size="${h*0.036}" font-weight="700" fill="${GREEN}" letter-spacing="${h*0.004}">FIT &#183; CLEAR &#183; CHASE THE COMBO</text>
    <text x="${tx}" y="${h*0.635}" font-family='${FONT}' font-size="${h*0.026}" font-weight="700" fill="#9a9a9a" letter-spacing="${h*0.002}">A BLOCKY GRID PUZZLE FOR ONE MORE ROUND</text>
    ${boardGroup(bx, by, boardSize)}
  </svg>`;
}

const outDir = fileURLToPath(new URL('../assets/covers/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const jobs = [
  { name: 'cover-landscape-1920x1080.png', svg: landscape(1920, 1080), w: 1920, h: 1080 },
  { name: 'cover-portrait-800x1200.png',   svg: portrait(800, 1200),   w: 800,  h: 1200 },
  { name: 'cover-square-800x800.png',      svg: square(800, 800),      w: 800,  h: 800  },
];

for (const j of jobs){
  await sharp(Buffer.from(j.svg), { density: 300 })
    .resize(j.w, j.h)
    .flatten({ background: BG })
    .removeAlpha()
    .png()
    .toFile(outDir + j.name);
  console.log('wrote', j.name);
}
