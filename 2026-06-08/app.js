/* ======================================================
   Pastel Playful — navigation + reveals + count-up
   DOM contract matches all decks. Extends with metric counters.

   Slide-transition contract (set per-slide via CSS):
     - The active slide gets   data-active="true"
     - The leaving slide gets  data-state="leaving" data-dir="fwd|bwd"
     - The entering slide gets data-state="entering" data-dir="fwd|bwd"
     - First load: entering slide also has data-initial="true"
     - States clear after --d-transition (CSS variable, default 880ms)
   ====================================================== */

(() => {
  const deck = document.getElementById('deck');
  const track = document.getElementById('track');
  const slides = Array.from(track.querySelectorAll('.slide'));
  const cur = document.getElementById('cur');
  const tot = document.getElementById('tot');
  const bar = document.getElementById('bar');
  const prevBtn = document.querySelector('[data-action="prev"]');
  const nextBtn = document.querySelector('[data-action="next"]');

  let index = 0;
  const total = slides.length;
  const pad = (n) => String(n + 1).padStart(2, '0');

  if (tot) tot.textContent = pad(total - 1);

  /* ---------- Metric count-up ---------- */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    if (el.dataset.counted === 'true') return;
    el.dataset.counted = 'true';
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const v = target * easeOutCubic(t);
      el.textContent = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function runCountersIn(slide) {
    slide.querySelectorAll('[data-count]').forEach(countUp);
  }

  /* ---------- Slide transition helpers ---------- */
  function transitionMs() {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--d-transition').trim();
    if (!v) return 880;
    if (v.endsWith('ms')) return parseFloat(v);
    if (v.endsWith('s')) return parseFloat(v) * 1000;
    return parseFloat(v) || 880;
  }

  let stateTimer = null;
  function clearStates() {
    slides.forEach((s) => {
      s.removeAttribute('data-state');
      s.removeAttribute('data-dir');
    });
  }

  function go(to, { initial = false } = {}) {
    const next = Math.max(0, Math.min(total - 1, to));
    if (!initial && next === index) return;

    const fromIdx = index;
    const direction = next >= fromIdx ? 'fwd' : 'bwd';

    if (stateTimer) {
      clearTimeout(stateTimer);
      clearStates();
    }

    if (!initial && fromIdx !== next) {
      slides[fromIdx].setAttribute('data-state', 'leaving');
      slides[fromIdx].setAttribute('data-dir', direction);
    }

    slides[fromIdx].setAttribute('data-active', 'false');
    index = next;

    slides[index].removeAttribute('data-initial');
    slides[index].setAttribute('data-active', 'false');
    void slides[index].offsetWidth;
    if (initial) slides[index].setAttribute('data-initial', 'true');
    slides[index].setAttribute('data-state', 'entering');
    slides[index].setAttribute('data-dir', direction);
    slides[index].setAttribute('data-active', 'true');

    track.style.transform = `translateX(-${index * 100}vw)`;
    if (cur) cur.textContent = pad(index);
    if (bar) bar.style.width = `${((index + 1) / total) * 100}%`;
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === total - 1;

    runCountersIn(slides[index]);
    history.replaceState(null, '', `#${index + 1}`);

    stateTimer = setTimeout(() => {
      clearStates();
      stateTimer = null;
    }, transitionMs() + 60);
  }

  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': case ' ':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(total - 1); break;
      case 'f': case 'F':
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
        break;
    }
  });

  prevBtn?.addEventListener('click', prev);
  nextBtn?.addEventListener('click', next);

  let touchStart = null;
  deck.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, t: Date.now() };
  }, { passive: true });
  deck.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dt = Date.now() - touchStart.t;
    if (Math.abs(dx) > 60 && dt < 600) (dx < 0 ? next : prev)();
    touchStart = null;
  });

  function initialFromHash() {
    const m = window.location.hash.match(/^#(\d+)$/);
    if (!m) return 0;
    const n = parseInt(m[1], 10) - 1;
    return isNaN(n) ? 0 : Math.max(0, Math.min(total - 1, n));
  }

  slides.forEach((s, i) => s.setAttribute('data-active', i === 0 ? 'true' : 'false'));
  go(initialFromHash(), { initial: true });

  window.addEventListener('resize', () => {
    track.style.transition = 'none';
    track.style.transform = `translateX(-${index * 100}vw)`;
    requestAnimationFrame(() => { track.style.transition = ''; });
  });
})();
