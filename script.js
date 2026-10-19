// script.js — fully fixed
const cv = document.getElementById('c'), cx = cv.getContext('2d');
const W = 640, H = 480, GH = 64, PW = 48, BX = 80;
const BASE_SPD = 2.6, BASE_GAP = 152, GR_BASE = 0.42, FV = -7.8;

let state, bird, pipes, coins, powerups, particles, stars;
let score, best = 0, coinCount = 0, fid;
let bgX = 0, cloudX = 0, hillX = 0;
let curSpd, curGap, nightMode, nightAlpha = 0;
let magnetTimer = 0, magnetMax = 180;
let ghostTimer = 0, ghostMax = 240, ghostHue = 0;
let gravFlip = false, gravFlipTimer = 0, gravFlipMax = 300, gravFlipWarn = 0;
let gravFlipWarned = false;
let checkpoint = null, checkpointUsed = false, lastCheckScore = 0;
let flashMsg = '', flashTick = 0, flashCol = '#fff';
let speedFlashTick = 0;

const CKSCORES = [10, 25, 50];

function el(id) { return document.getElementById(id); }
function setBar(id, v, max) { el(id).style.width = Math.max(0, v / max * 100) + '%'; }

function init() {
  state = 'idle';
  bird = { y: H / 2 - 30, vy: 0, frame: 0, tick: 0 };
  pipes = []; coins = []; powerups = []; particles = [];
  score = 0; coinCount = 0; curSpd = BASE_SPD; curGap = BASE_GAP;
  nightMode = false; nightAlpha = 0;
  magnetTimer = 0; ghostTimer = 0;
  gravFlip = false; gravFlipTimer = 0; gravFlipWarn = 0; gravFlipWarned = false;
  checkpoint = null; checkpointUsed = false; lastCheckScore = 0;
  flashMsg = ''; flashTick = 0; speedFlashTick = 0;
  el('sc').textContent = 0; el('cn').textContent = 0;
  el('sp').textContent = '1x'; el('ck').textContent = '—';
  setBar('mf', 0, 1); setBar('gf', 0, 1); setBar('gs', 0, 1);
  stars = Array.from({ length: 50 }, () => ({
    x: Math.random() * W, y: Math.random() * (H - GH - 80),
    s: Math.random() * 1.5 + 0.5, t: Math.random() * Math.PI * 2
  }));
  cancelAnimationFrame(fid);
  loop();
}

// FIX (Bug 4): respawn() didn't exist — flap() always called init() wiping the score
function respawn() {
  checkpointUsed = true;
  score = checkpoint.score;
  bird = { y: H / 2 - 30, vy: 0, frame: 0, tick: 0 };
  pipes = []; coins = []; powerups = []; particles = [];
  magnetTimer = 0; ghostTimer = 0;
  gravFlip = false; gravFlipTimer = 0; gravFlipWarn = 0; gravFlipWarned = false;
  flashMsg = ''; flashTick = 0; speedFlashTick = 0;
  el('sc').textContent = score;
  el('ck').textContent = checkpoint.score + ' ✓';
  setBar('mf', 0, 1); setBar('gf', 0, 1); setBar('gs', 0, 1);
  ramp();
  state = 'playing';
  showMsg('🚩 RESPAWNED AT ' + checkpoint.score + '!', '#aaffaa', 90);
}

function flap() {
  if (state === 'dead') {
    // FIX (Bug 4): use checkpoint respawn when available; full reset otherwise
    if (checkpoint && !checkpointUsed) { respawn(); } else { init(); }
    return;
  }
  if (state === 'idle') state = 'playing';
  bird.vy = gravFlip ? Math.abs(FV) * 0.9 : -Math.abs(FV);
  burst(BX, bird.y, '#fff', 5);
}

cv.addEventListener('click', flap);
document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); flap(); }
});

function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * (gravFlip ? 1 : -1) - 2,
      life: 1, decay: 0.035 + Math.random() * 0.03, col, sz: 3 + Math.random() * 3
    });
  }
}

function showMsg(msg, col = '#fff', ticks = 80) {
  flashMsg = msg; flashCol = col; flashTick = ticks;
}

function spawnPipe() {
  const top = 55 + Math.random() * (H - GH - curGap - 110);
  const moveY = score >= 15;
  pipes.push({ x: W + 10, top, scored: false, moveY, vy: (Math.random() - 0.5) * 1.5 });
  if (Math.random() < 0.72) {
    const cy = top + curGap / 2 + (Math.random() - 0.5) * 50;
    coins.push({ x: W + 10 + PW / 2, y: cy, col: false, anim: Math.random() * Math.PI * 2 });
    if (Math.random() < 0.4)
      coins.push({ x: W + 36 + PW / 2, y: cy - 22, col: false, anim: Math.random() * Math.PI });
  }
  if (Math.random() < 0.18)
    powerups.push({ x: W + 10 + PW / 2, y: top + curGap / 2, type: 'magnet', anim: 0, col: false });
  if (Math.random() < 0.12)
    powerups.push({ x: W + 60 + PW / 2, y: top + curGap / 2 + 20, type: 'star', anim: 0, col: false });
}

function ramp() {
  const lvl = Math.floor(score / 10);
  curSpd = Math.min(BASE_SPD + lvl * 0.3, 6.0);
  curGap = Math.max(BASE_GAP - Math.floor(score / 20) * 18, 100);
  nightMode = score >= 25;
  el('sp').textContent = (curSpd / BASE_SPD).toFixed(1) + 'x';
}

function tryCheckpoint() {
  CKSCORES.forEach(s => {
    if (score >= s && lastCheckScore < s) {
      lastCheckScore = s;
      checkpoint = { score: s }; checkpointUsed = false;
      el('ck').textContent = s;
      showMsg('🚩 CHECKPOINT ' + s + '!', '#aaffaa', 90);
      burst(W / 2, H / 2, '#aaffaa', 20);
    }
  });
}

function killBird() {
  burst(BX, bird.y, '#ff4444', 20);
  burst(BX, bird.y, '#ff8800', 12);
  state = 'dead';
}

function drawSky() {
  const g = cx.createLinearGradient(0, 0, 0, H - GH);
  if (nightMode) {
    g.addColorStop(0, '#020818'); g.addColorStop(1, '#0a1a40');
  } else {
    g.addColorStop(0, '#0d1b6e'); g.addColorStop(0.5, '#1a3a8f'); g.addColorStop(1, '#2a5298');
  }
  cx.fillStyle = g; cx.fillRect(0, 0, W, H - GH);
}

function drawStars() {
  const vis = nightMode ? 1 : 0;
  if (vis === 0 && nightAlpha <= 0) return;
  stars.forEach(s => {
    s.t += 0.04;
    cx.globalAlpha = (0.3 + 0.7 * Math.abs(Math.sin(s.t))) * Math.max(nightAlpha, vis * 0.5);
    cx.fillStyle = '#fff';
    cx.fillRect(Math.round(s.x), Math.round(s.y), Math.round(s.s * 2), Math.round(s.s * 2));
  });
  cx.globalAlpha = 1;
}

function drawMoon() {
  if (!nightMode) return;
  cx.fillStyle = '#fffde0'; cx.beginPath(); cx.arc(W - 70, 55, 26, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#c8d8f0'; cx.beginPath(); cx.arc(W - 56, 44, 20, 0, Math.PI * 2); cx.fill();
}

function drawClouds() {
  cx.fillStyle = nightMode ? 'rgba(100,120,180,0.4)' : 'rgba(255,255,255,0.85)';
  [[60, 80], [220, 55], [390, 88], [560, 65]].forEach(([bx, by]) => {
    // FIX (Bug 6): JS % returns negative for negative operands; force positive modulo
    const mod = W + 130;
    const ox = ((cloudX + bx) % mod + mod) % mod - 60;
    cx.fillRect(ox, by, 60, 16); cx.fillRect(ox + 8, by - 12, 44, 20);
    cx.fillRect(ox + 16, by - 20, 28, 16); cx.fillRect(ox - 4, by + 4, 68, 12);
  });
}

function drawHills() {
  cx.fillStyle = nightMode ? '#0a3010' : '#1a6b28';
  [[0, H - GH - 40, 120, 50], [160, H - GH - 62, 170, 72],
   [360, H - GH - 36, 140, 50], [540, H - GH - 58, 165, 66]].forEach(([hx, hy, hw, hh]) => {
    // FIX (Bug 7): same negative modulo fix for hills
    const mod = W + 220;
    const ox = ((hillX + hx) % mod + mod) % mod - 90;
    cx.beginPath(); cx.moveTo(ox, hy + hh);
    cx.quadraticCurveTo(ox + hw / 2, hy - hh * 0.6, ox + hw, hy + hh); cx.fill();
    cx.fillStyle = nightMode ? '#0f4018' : '#228a30';
    cx.beginPath(); cx.moveTo(ox + hw * 0.2, hy + hh * 0.3);
    cx.quadraticCurveTo(ox + hw / 2, hy - hh * 0.4, ox + hw * 0.8, hy + hh * 0.3); cx.fill();
    cx.fillStyle = nightMode ? '#0a3010' : '#1a6b28';
  });
}

function drawGround() {
  cx.fillStyle = nightMode ? '#3a1f0a' : '#6b3a1f';
  cx.fillRect(0, H - GH, W, GH);
  cx.fillStyle = nightMode ? '#1a4020' : '#3d8b3d';
  cx.fillRect(0, H - GH, W, 14);
  cx.fillStyle = nightMode ? '#123018' : '#2d6b2d';
  for (let i = 0; i < 10; i++) cx.fillRect(i * 72 + ((bgX * 0.5 | 0) % 72), H - GH, 60, 8);
  cx.fillStyle = nightMode ? '#4a2508' : '#8b5a2b';
  for (let i = 0; i < 8; i++) {
    cx.fillRect(i * 90 + ((bgX * 0.3 | 0) % 90), H - GH + 18, 70, 10);
    cx.fillRect(i * 90 + ((bgX * 0.3 | 0) % 90) + 4, H - GH + 28, 62, 8);
  }
  cx.fillStyle = '#000'; cx.fillRect(0, H - GH + 14, W, 2);
  if (gravFlip) {
    cx.fillStyle = nightMode ? '#1a4020' : '#3d8b3d';
    cx.fillRect(0, 0, W, 8);
    cx.fillStyle = 'rgba(255,100,255,0.3)'; cx.fillRect(0, 0, W, 8);
    cx.fillStyle = '#000'; cx.fillRect(0, 8, W, 2);
  }
}

function brickPipe(p) {
  const top = p.top, x = p.x, gap = curGap;
  const C = ['#c84820', '#e05828', '#b03818'];
  function bc(bx, by) { return C[((bx / 8 | 0) + (by / 8 | 0)) % 3]; }
  function sec(px2, py2, pw, ph) {
    if (ph <= 0) return;
    for (let yy = 0; yy < ph; yy += 8)
      for (let xx = 0; xx < pw; xx += 8) {
        cx.fillStyle = bc(xx, yy);
        cx.fillRect(Math.round(px2 + xx), Math.round(py2 + yy),
          Math.min(8, pw - xx) - 1, Math.min(8, ph - yy) - 1);
      }
    cx.strokeStyle = '#000'; cx.lineWidth = 1;
    cx.strokeRect(Math.round(px2), Math.round(py2), pw, ph);
  }
  const cap = 16, cX = x - 6, cW = PW + 12;
  if (ghostTimer > 0) cx.globalAlpha = 0.35;
  sec(x, 0, PW, top);
  cx.fillStyle = '#a03010'; cx.fillRect(Math.round(cX), Math.round(top - cap), cW, cap);
  for (let xx = 0; xx < cW; xx += 8) {
    cx.fillStyle = bc(xx, 0);
    cx.fillRect(Math.round(cX + xx), Math.round(top - cap), Math.min(8, cW - xx) - 1, cap - 1);
  }
  cx.strokeStyle = '#000'; cx.lineWidth = 1.5;
  cx.strokeRect(Math.round(cX), Math.round(top - cap), cW, cap);
  const bot = top + gap, botH = H - GH - bot;
  cx.fillStyle = '#a03010'; cx.fillRect(Math.round(cX), Math.round(bot), cW, cap);
  for (let xx = 0; xx < cW; xx += 8) {
    cx.fillStyle = bc(xx, 0);
    cx.fillRect(Math.round(cX + xx), Math.round(bot), Math.min(8, cW - xx) - 1, cap - 1);
  }
  cx.strokeStyle = '#000'; cx.lineWidth = 1.5;
  cx.strokeRect(Math.round(cX), Math.round(bot), cW, cap);
  sec(x, bot + cap, PW, botH - cap);
  cx.globalAlpha = 1;
}

function drawCoin(c) {
  if (c.col) return;
  c.anim += 0.1;
  const bx = Math.round(c.x), by = Math.round(c.y + Math.sin(c.anim) * 4);
  const sc2 = Math.max(0.15, Math.abs(Math.cos(c.anim * 1.5)));
  const cw = Math.max(2, Math.round(12 * sc2));
  cx.fillStyle = '#ffd700'; cx.fillRect(bx - cw / 2, by - 8, cw, 16);
  cx.fillStyle = '#ffec6e'; cx.fillRect(bx - cw / 2 + 1, by - 6, Math.max(1, cw - 4), 6);
  cx.strokeStyle = '#b8860b'; cx.lineWidth = 1; cx.strokeRect(bx - cw / 2, by - 8, cw, 16);
}

function drawPowerup(pu) {
  if (pu.col) return;
  pu.anim += 0.08;
  const bx = Math.round(pu.x), by = Math.round(pu.y + Math.sin(pu.anim) * 5);
  if (pu.type === 'magnet') {
    const glow = Math.abs(Math.sin(pu.anim));
    cx.fillStyle = `rgba(0,200,255,${0.3 + 0.4 * glow})`; cx.fillRect(bx - 14, by - 14, 28, 28);
    cx.fillStyle = '#00cfff';
    cx.fillRect(bx - 8, by - 10, 6, 14); cx.fillRect(bx + 2, by - 10, 6, 14);
    cx.fillRect(bx - 8, by - 10, 16, 6);
    cx.fillRect(bx - 8, by - 4, 6, 4); cx.fillRect(bx + 2, by - 4, 6, 4);
    cx.strokeStyle = '#fff'; cx.lineWidth = 1;
    cx.strokeRect(bx - 8, by - 10, 6, 14);
    cx.strokeRect(bx + 2, by - 10, 6, 14);
    cx.strokeRect(bx - 8, by - 10, 16, 6);
  } else if (pu.type === 'star') {
    ghostHue = (ghostHue + 2) % 360;
    cx.fillStyle = `hsl(${ghostHue},100%,60%)`;
    const pts = 5, outer = 14, inner = 6;
    cx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI / pts) - Math.PI / 2;
      i === 0 ? cx.moveTo(bx + Math.cos(a) * r, by + Math.sin(a) * r)
              : cx.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r);
    }
    cx.closePath(); cx.fill();
    cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.stroke();
  }
}

function drawCheckpointFlags() {
  CKSCORES.forEach(s => {
    if (score < s) return;
    const active = checkpoint && checkpoint.score === s && !checkpointUsed;
    const used   = checkpoint && checkpoint.score === s && checkpointUsed;
    cx.fillStyle = active ? '#aaffaa' : used ? '#666' : '#888';
    cx.fillRect(W - 24, H - GH - 36, 4, 32);
    cx.fillStyle = active ? '#00cc44' : used ? '#444' : '#666';
    cx.fillRect(W - 20, H - GH - 36, 14, 10);
    if (active) {
      cx.fillStyle = 'rgba(100,255,100,0.18)';
      cx.fillRect(W - 30, H - GH - 44, 26, 44);
    }
  });
}

function drawGravFlipWarning() {
  if (gravFlipWarn <= 0) return;
  cx.globalAlpha = Math.min(1, gravFlipWarn / 30) * 0.8;
  cx.fillStyle = 'rgba(255,50,255,0.15)'; cx.fillRect(0, 0, W, H);
  cx.globalAlpha = Math.min(1, gravFlipWarn / 30);
  cx.fillStyle = '#ff44ff'; cx.font = 'bold 28px monospace'; cx.textAlign = 'center';
  // FIX (Bug 5): condition was backwards — gravFlip=true means gravity just flipped, not restored
  const msg = gravFlip ? '⚠ GRAVITY FLIP!' : '⬇ GRAVITY RESTORED!';
  cx.strokeStyle = '#000'; cx.lineWidth = 4;
  cx.strokeText(msg, W / 2, H / 2 - 10); cx.fillText(msg, W / 2, H / 2 - 10);
  cx.globalAlpha = 1;
  gravFlipWarn--;
}

function drawGravFlipTint() {
  if (!gravFlip) return;
  const pulse = Math.abs(Math.sin(Date.now() * 0.003));
  cx.fillStyle = `rgba(255,0,255,${0.06 + 0.04 * pulse})`; cx.fillRect(0, 0, W, H - GH);
  cx.strokeStyle = `rgba(255,80,255,${0.4 + 0.3 * pulse})`;
  cx.lineWidth = 3; cx.setLineDash([8, 6]);
  cx.strokeRect(2, 2, W - 4, H - GH - 2); cx.setLineDash([]);
}

function drawGhostAura() {
  if (ghostTimer <= 0) return;
  ghostHue = (ghostHue + 3) % 360;
  cx.strokeStyle = `hsla(${ghostHue},100%,70%,0.6)`;
  cx.lineWidth = 3; cx.setLineDash([5, 5]);
  cx.beginPath(); cx.arc(BX, bird.y, 22, 0, Math.PI * 2); cx.stroke();
  cx.setLineDash([]);
}

function drawMagnetAura() {
  if (magnetTimer <= 0) return;
  cx.strokeStyle = `rgba(0,207,255,${0.3 + 0.2 * Math.sin(Date.now() * 0.02)})`;
  cx.lineWidth = 2; cx.setLineDash([4, 4]);
  cx.beginPath(); cx.arc(BX, bird.y, 80, 0, Math.PI * 2); cx.stroke();
  cx.setLineDash([]);
}

function drawBird(y, vy, frame) {
  const bx = BX, by = Math.round(y);
  const angle = Math.min(Math.max(vy * 0.06 * (gravFlip ? -1 : 1), -0.5), 1.0);
  const ghost  = ghostTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0;
  const magnet = magnetTimer > 0 && Math.floor(Date.now() / 150) % 2 === 0;
  cx.save(); cx.translate(bx, by); cx.rotate(angle);
  if (gravFlip) cx.scale(1, -1);
  const bc1 = ghost  ? `hsl(${ghostHue},100%,70%)`         : magnet ? '#00cfff' : '#ff4444';
  const bc2 = ghost  ? `hsl(${(ghostHue+40)%360},100%,60%)`: magnet ? '#009fcc' : '#cc2222';
  cx.fillStyle = bc1;  cx.fillRect(-14, -12, 28, 22);
  cx.fillStyle = bc2;  cx.fillRect(-12, -2, 24, 12);
  cx.fillStyle = ghost ? `hsl(${(ghostHue+80)%360},100%,50%)` : magnet ? '#007faa' : '#8b1a1a';
  cx.fillRect(-10, 4, 20, 6);
  cx.fillStyle = bc1;
  for (let i = 0; i < 6; i++) cx.fillRect(-10 + i * 4, -14, 3, 5);
  cx.fillStyle = ghost ? `hsl(${(ghostHue+120)%360},100%,75%)` : magnet ? '#33dfff' : '#ff6666';
  if      (frame === 0) { cx.fillRect(-18, -6, 8, 8); cx.fillRect(-22, -2, 6, 5); }
  else if (frame === 1) { cx.fillRect(-18, -2, 8, 6); }
  else                  { cx.fillRect(-18, 4, 8, 8);  cx.fillRect(-22, 6, 6, 5); }
  cx.fillStyle = '#fff'; cx.fillRect(6, -9, 12, 11);
  cx.fillStyle = '#111'; cx.fillRect(11, -7, 6, 7);
  cx.fillStyle = '#fff'; cx.fillRect(14, -6, 2, 3);
  cx.fillStyle = '#ff8c00'; cx.fillRect(16, -2, 10, 4); cx.fillRect(14, 2, 8, 3);
  cx.restore();
}

function drawParticles() {
  particles.forEach(p => {
    cx.globalAlpha = p.life; cx.fillStyle = p.col;
    cx.fillRect(Math.round(p.x - p.sz / 2), Math.round(p.y - p.sz / 2), p.sz, p.sz);
  });
  cx.globalAlpha = 1;
}

function drawFlashMsg() {
  if (flashTick <= 0) return;
  cx.globalAlpha = Math.min(1, flashTick / 30);
  cx.fillStyle = flashCol; cx.font = 'bold 22px monospace'; cx.textAlign = 'center';
  cx.strokeStyle = '#000'; cx.lineWidth = 4;
  cx.strokeText(flashMsg, W / 2, H / 2 - 60);
  cx.fillText(flashMsg, W / 2, H / 2 - 60);
  cx.globalAlpha = 1; flashTick--;
}

function drawSpeedFlash() {
  if (speedFlashTick > 0) {
    cx.fillStyle = `rgba(255,200,0,${speedFlashTick / 20 * 0.25})`;
    cx.fillRect(0, 0, W, H); speedFlashTick--;
  }
}

function drawNightOverlay() {
  if (nightMode && nightAlpha < 1) nightAlpha = Math.min(1, nightAlpha + 0.005);
  if (!nightMode && nightAlpha > 0) nightAlpha = Math.max(0, nightAlpha - 0.005);
  if (nightAlpha > 0) {
    cx.fillStyle = `rgba(0,5,30,${nightAlpha * 0.45})`;
    cx.fillRect(0, 0, W, H - GH);
  }
}

function drawHUDOverlay() {
  cx.textAlign = 'center';
  if (state === 'idle') {
    cx.fillStyle = 'rgba(0,0,0,0.55)'; cx.fillRect(W / 2 - 240, H / 2 - 115, 480, 210);
    cx.strokeStyle = '#ff8c00'; cx.lineWidth = 3;
    cx.strokeRect(W / 2 - 240, H / 2 - 115, 480, 210);
    cx.fillStyle = '#ff8c00'; cx.font = 'bold 24px monospace';
    cx.fillText('FLAPPY MARIO v3', W / 2, H / 2 - 74);
    cx.fillStyle = '#fff'; cx.font = '12px monospace';
    cx.fillText('SPACE or TAP to flap', W / 2, H / 2 - 44);
    const lines = [
      ['#ffd700',  'Collect coins  |  Grab 🧲 magnet'],
      ['#ff44ff',  '⚠ Gravity flips every 30 pts — survive!'],
      ['#ffff44',  '⭐ Star = ghost mode — pass through pipes!'],
      ['#aaffaa',  '🚩 Checkpoints at 10 / 25 / 50 — one respawn!'],
      ['#00cfff',  'Speed ramps every 10 pts  |  Night at 25'],
    ];
    lines.forEach(([col, txt], i) => {
      cx.fillStyle = col; cx.fillText(txt, W / 2, H / 2 - 10 + i * 22);
    });
  }
  if (state === 'dead') {
    cx.fillStyle = 'rgba(0,0,0,0.65)'; cx.fillRect(W / 2 - 210, H / 2 - 115, 420, 230);
    cx.strokeStyle = '#ff4444'; cx.lineWidth = 3;
    cx.strokeRect(W / 2 - 210, H / 2 - 115, 420, 230);
    cx.fillStyle = '#ff4444'; cx.font = 'bold 26px monospace';
    cx.fillText('GAME OVER!', W / 2, H / 2 - 72);
    cx.fillStyle = '#fff'; cx.font = '13px monospace';
    ['Score: ' + score, 'Best:  ' + best,
     'Coins: ' + coinCount, 'Speed: ' + el('sp').textContent
    ].forEach((t, i) => cx.fillText(t, W / 2, H / 2 - 32 + i * 26));
    if (checkpoint && !checkpointUsed) {
      cx.fillStyle = '#aaffaa'; cx.font = 'bold 13px monospace';
      cx.fillText('🚩 TAP to respawn at checkpoint ' + checkpoint.score, W / 2, H / 2 + 82);
    } else {
      cx.fillStyle = '#ffe066'; cx.font = '13px monospace';
      cx.fillText('TAP or SPACE to retry', W / 2, H / 2 + 82);
    }
  }
  if (state === 'playing') {
    cx.fillStyle = '#ffd700'; cx.font = 'bold 22px monospace'; cx.textAlign = 'left';
    cx.strokeStyle = '#000'; cx.lineWidth = 3;
    cx.strokeText(score, 14, 32); cx.fillText(score, 14, 32);
    if (gravFlipTimer > 0) {
      cx.fillStyle = `rgba(255,80,255,${0.15 + 0.1 * Math.sin(Date.now() * 0.01)})`;
      cx.fillRect(0, H - GH - 6, W * (gravFlipTimer / gravFlipMax), 6);
    }
  }
}

function loop() {
  const moving = state === 'playing';
  bgX   += moving ? curSpd * 0.8 : 0.3;
  cloudX -= moving ? 0.4 : 0.15; if (cloudX < -W) cloudX += W;
  hillX  -= moving ? 0.6 : 0.2;  if (hillX  < -W) hillX  += W;

  if (state === 'playing') {
    ramp(); tryCheckpoint();
    bird.tick++;
    if (bird.tick % 6 === 0) bird.frame = (bird.frame + 1) % 3;
    const effGR = gravFlip ? -GR_BASE : GR_BASE;
    bird.vy += effGR;
    bird.vy = Math.max(-12, Math.min(bird.vy, 12));
    bird.y += bird.vy;

    if (!pipes.length || pipes[pipes.length - 1].x < W - 220) spawnPipe();
    pipes.forEach(p => {
      p.x -= curSpd;
      if (p.moveY) { p.top += p.vy; if (p.top < 50 || p.top > H - GH - curGap - 80) p.vy *= -1; }
    });
    pipes    = pipes.filter(p => p.x > -80);
    coins    = coins.filter(c => { c.x -= curSpd; return c.x > -20; });
    powerups = powerups.filter(pu => { pu.x -= curSpd; return pu.x > -20; });

    if (magnetTimer > 0) {
      magnetTimer--; setBar('mf', magnetTimer, magnetMax);
      coins.forEach(c => {
        if (c.col) return;
        const dx = BX - c.x, dy = bird.y - c.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 80) { c.x += dx * 0.12; c.y += dy * 0.12; }
      });
    } else setBar('mf', 0, 1);

    if (ghostTimer > 0) { ghostTimer--; setBar('gs', ghostTimer, ghostMax); }
    else setBar('gs', 0, 1);

    if (score > 0 && score % 30 === 0) {
      if (!gravFlipWarned) {
        gravFlipWarned = true;
        gravFlip = !gravFlip; gravFlipTimer = gravFlipMax; gravFlipWarn = 55;
        showMsg(gravFlip ? '⚠ GRAVITY FLIPPED!' : '⬇ GRAVITY RESTORED!', '#ff44ff', 70);
        burst(W / 2, H / 2, '#ff44ff', 18);
      }
    } else { if (score % 30 !== 0) gravFlipWarned = false; }

    if (gravFlipTimer > 0) { gravFlipTimer--; setBar('gf', gravFlipTimer, gravFlipMax); }
    else {
      if (gravFlip) { gravFlip = false; gravFlipWarn = 55; showMsg('⬇ GRAVITY RESTORED!', '#ff44ff', 50); }
      setBar('gf', 0, 1);
    }

    powerups.forEach(pu => {
      if (pu.col) return;
      const dx = BX - pu.x, dy = bird.y - pu.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        pu.col = true;
        if (pu.type === 'magnet') {
          magnetTimer = magnetMax; burst(pu.x, pu.y, '#00cfff', 16);
          showMsg('🧲 MAGNET!', '#00cfff', 60);
        }
        if (pu.type === 'star') {
          ghostTimer = ghostMax; burst(pu.x, pu.y, '#ffff00', 20); burst(pu.x, pu.y, '#fff', 10);
          showMsg('⭐ GHOST MODE!', '#ffff00', 60);
        }
      }
    });

    pipes.forEach(p => {
      if (!p.scored && p.x + PW < BX) {
        p.scored = true; score++; best = Math.max(best, score);
        el('sc').textContent = score; el('bs').textContent = best;
        if (score % 10 === 0) speedFlashTick = 20;
        burst(BX + 20, bird.y, '#ffd700', 8);
      }
      if (ghostTimer > 0) return;
      const hr = 10;
      if (BX + hr > p.x && BX - hr < p.x + PW) {
        if (bird.y - hr < p.top || bird.y + hr > p.top + curGap) killBird();
      }
    });

    coins.forEach(c => {
      if (c.col) return;
      const dx = BX - c.x, dy = bird.y - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < 16) {
        c.col = true; coinCount++; el('cn').textContent = coinCount;
        burst(c.x, c.y, '#ffd700', 10);
      }
    });

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15 * (gravFlip ? -1 : 1);
      p.life -= p.decay; p.sz *= 0.95;
    });
    particles = particles.filter(p => p.life > 0);

    if (gravFlip)  { if (bird.y - 14 <= 0)       killBird(); }
    else           { if (bird.y + 14 >= H - GH)   killBird(); }
    if (!gravFlip && bird.y - 14 <= 0)      killBird();
    if (gravFlip  && bird.y + 14 >= H - GH) killBird();
  }

  // FIX (Bugs 1 & 2): draw pipeline was entirely absent; rAF was never scheduled
  drawSky();
  drawStars();
  drawMoon();
  drawClouds();
  drawHills();
  pipes.forEach(p => brickPipe(p));
  powerups.forEach(pu => drawPowerup(pu));
  coins.forEach(c => drawCoin(c));
  drawGround();
  drawBird(bird.y, bird.vy, bird.frame);
  drawParticles();
  drawCheckpointFlags();
  drawGravFlipTint();
  drawGhostAura();
  drawMagnetAura();
  drawNightOverlay();
  drawGravFlipWarning();
  drawSpeedFlash();
  drawFlashMsg();
  drawHUDOverlay();

  fid = requestAnimationFrame(loop);
}

// FIX (Bug 3): init() was never called — game never started
init();