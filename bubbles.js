// js/bubbles.js (variant) — tiny visual/behavior tweaks

const ROOT = document.getElementById('blobs');

const CONFIG = {
  count: 8,               // +1 for a denser look
  minSize: 176,
  maxSize: 348,
  minDur: 15.5,
  maxDur: 27.5,
  minHueDur: 17.5,
  maxHueDur: 29.5,
  edgePadding: 7,         // a bit more padding from edges
  parallax: 9,            // slightly subtler parallax
};

function initBlobs() {
  if (!ROOT) return;
  ROOT.dataset.density = 'medium';

  for (let i = 0; i < CONFIG.count; i++) {
    const el = document.createElement('div');
    el.className = 'blob blob-parallax';

    const sz = rand(CONFIG.minSize, CONFIG.maxSize);
    const pos = randPos(CONFIG.edgePadding);

    el.style.setProperty('--sz', `${sz}px`);
    el.style.setProperty('--x', `${pos.x}px`);
    el.style.setProperty('--y', `${pos.y}px`);
    el.style.setProperty('--rot', `${rand(-7, 7)}deg`);
    el.style.setProperty('--dur', `${rand(CONFIG.minDur, CONFIG.maxDur)}s`);
    el.style.setProperty('--huedur', `${rand(CONFIG.minHueDur, CONFIG.maxHueDur)}s`);

    ROOT.appendChild(el);
  }

  attachParallax();
}

function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randPos(padPercent = 6) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const padX = vw * (padPercent / 100);
  const padY = vh * (padPercent / 100);
  const x = rand(-vw/2 + padX, vw/2 - padX);
  const y = rand(-vh/2 + padY, vh/2 - padY);
  return { x, y };
}

function attachParallax() {
  let rafId = null;
  let targetX = 0, targetY = 0;
  const max = CONFIG.parallax;

  const onMove = (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;
    targetX = dx * max;
    targetY = dy * max;
    if (!rafId) rafId = requestAnimationFrame(applyParallax);
  };

  function applyParallax() {
    rafId = null;
    const blobs = ROOT.querySelectorAll('.blob');
    blobs.forEach((b, i) => {
      const depth = (i + 1) / (blobs.length + 1);
      const px = (targetX * depth).toFixed(2);
      const py = (targetY * depth).toFixed(2);
      const base = `translate(-50%,-50%) translate3d(var(--x,0), var(--y,0),0) rotate(var(--rot,0deg))`;
      b.style.transform = `${base} translate(${px}px, ${py}px)`;
    });
  }

  window.addEventListener('pointermove', onMove, { passive: true });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const blobs = ROOT.querySelectorAll('.blob');
      blobs.forEach((b) => {
        const pos = randPos(CONFIG.edgePadding);
        b.style.setProperty('--x', `${pos.x}px`);
        b.style.setProperty('--y', `${pos.y}px`);
      });
    }, 160);
  });
}

initBlobs();
