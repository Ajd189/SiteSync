/* SiteSync Electric. Decorative only: no form, analytics, or network access. */
(() => {
  'use strict';
  const body = document.body;
  if (!body || !body.hasAttribute('data-sitesync-electric') || body.dataset.ssElectricReady) return;
  body.dataset.ssElectricReady = 'true';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 760px)');
  const storageKey = 'sitesync-ambient-motion';
  let userPaused = false;
  try { userPaused = localStorage.getItem(storageKey) === 'off'; } catch { /* Storage may be blocked. */ }
  let frame = 0;
  let lastFrame = 0;
  let clock = 0;
  let width = 0;
  let height = 0;
  let routes = [];
  let resizeTimer = 0;
  const canvas = document.getElementById('ss-circuit-field');
  let ctx = null;
  try { ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null; } catch { /* CSS is the fallback. */ }
  const ns = 'http://www.w3.org/2000/svg';
  const svgElement = (name, attributes) => {
    const element = document.createElementNS(ns, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  };

  // Reuse the existing diagram's paths rather than introducing a second diagram.
  const stage = document.querySelector('.network-stage');
  const original = stage?.querySelector('.connection-lines');
  if (stage && original) {
    const viewBox = original.getAttribute('viewBox') || '0 0 600 460';
    const orbits = svgElement('svg', { class: 'ss-orbits', viewBox, 'aria-hidden': 'true', focusable: 'false' });
    [132, 155, 181].forEach((radius, index) => orbits.append(svgElement('circle', {
      cx: 300, cy: 230, r: radius,
      class: index === 1 ? 'ss-orbit-ticks' : index === 0 ? 'ss-orbit-inner' : ''
    })));
    stage.prepend(orbits);
    const packets = svgElement('svg', { class: 'connection-lines ss-data-packets', viewBox, 'aria-hidden': 'true', focusable: 'false' });
    original.querySelectorAll('path').forEach((path, index) => {
      const copy = svgElement('path', { d: path.getAttribute('d') || '', pathLength: 100 });
      copy.style.animationDelay = `${-index * .83}s`;
      packets.append(copy);
    });
    original.after(packets);
  }

  const footer = document.querySelector('.network-footer');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ss-motion-toggle';
  const icon = document.createElement('span');
  icon.className = 'ss-motion-icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  toggle.append(icon, label);
  if (footer) footer.append(toggle);

  const motionAllowed = () => !userPaused && !reduce.matches && !document.hidden;
  function cancelFrame() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
  }
  function route(points, seed) {
    const segments = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i - 1];
      const [x2, y2] = points[i];
      const length = Math.hypot(x2 - x1, y2 - y1);
      segments.push({ x1, y1, x2, y2, length, start: total });
      total += length;
    }
    return { points, segments, total, seed };
  }
  function pointAt(track, distance) {
    const segment = track.segments.find(part => distance <= part.start + part.length) || track.segments.at(-1);
    const fraction = segment.length ? Math.max(0, Math.min(1, (distance - segment.start) / segment.length)) : 0;
    return { x: segment.x1 + (segment.x2 - segment.x1) * fraction, y: segment.y1 + (segment.y2 - segment.y1) * fraction };
  }
  function resize() {
    if (!ctx || !canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    routes = [];
    const count = compact.matches ? 5 : 11;
    for (let i = 0; i < count; i++) {
      const left = i % 3 === 0;
      const y = height * (.07 + i / count * .91);
      const edge = left ? -50 : width + 50;
      const turn = width * (left ? .05 + (i % 4) * .035 : .93 - (i % 4) * .035);
      const end = width * (left ? .24 + (i % 3) * .045 : .65 - (i % 3) * .05);
      const diagonal = Math.min(65, width * .06) * (i % 2 ? 1 : -1);
      routes.push(route([[edge, y], [turn, y], [turn + (left ? 1 : -1) * Math.abs(diagonal), y + diagonal], [end, y + diagonal]], i));
    }
    draw(clock);
  }
  function draw(time) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const track of routes) {
      ctx.beginPath();
      track.points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.strokeStyle = 'rgba(139,255,105,.115)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const end = track.points.at(-1);
      ctx.beginPath(); ctx.arc(end[0], end[1], 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(157,255,117,.24)'; ctx.stroke();
      const position = ((time * (compact.matches ? 25 : 35) + track.seed * 97) % (track.total + 160)) - 80;
      if (position < 0 || position > track.total) continue;
      // Short segmented trails follow corners instead of cutting diagonally across them.
      for (let step = 0; step < 10; step++) {
        const distance = position - step * 4;
        if (distance < 0) continue;
        const a = pointAt(track, distance);
        const b = pointAt(track, Math.max(0, distance - 4));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(168,255,108,${.58 * (1 - step / 10)})`;
        ctx.lineWidth = step < 2 ? 1.7 : 1.3; ctx.stroke();
      }
      const head = pointAt(track, position);
      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 8);
      glow.addColorStop(0, 'rgba(174,255,116,.45)'); glow.addColorStop(1, 'rgba(174,255,116,0)');
      ctx.fillStyle = glow; ctx.fillRect(head.x - 8, head.y - 8, 16, 16);
      ctx.fillStyle = 'rgba(218,255,184,.85)'; ctx.beginPath(); ctx.arc(head.x, head.y, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  function tick(now) {
    frame = 0;
    if (!motionAllowed() || !ctx) return;
    if (!lastFrame) lastFrame = now;
    const elapsed = now - lastFrame;
    if (elapsed >= 1000 / 30) {
      clock += Math.min(elapsed, 100) / 1000;
      lastFrame = now;
      draw(clock);
    }
    frame = window.requestAnimationFrame(tick);
  }
  function syncMotion() {
    const paused = userPaused || reduce.matches;
    root.dataset.ssMotion = paused ? 'off' : 'on';
    if (document.hidden) root.setAttribute('data-ss-hidden', '');
    else root.removeAttribute('data-ss-hidden');
    toggle.disabled = reduce.matches;
    toggle.setAttribute('aria-label', 'Pause ambient animations');
    toggle.setAttribute('aria-pressed', String(paused));
    icon.textContent = paused ? '▷' : 'Ⅱ';
    label.textContent = reduce.matches ? 'Reduced motion' : paused ? 'Motion off' : 'Motion on';
    toggle.title = reduce.matches ? 'Your device prefers reduced motion' : paused ? 'Resume ambient animations' : 'Pause ambient animations';
    cancelFrame();
    if (motionAllowed() && ctx) frame = window.requestAnimationFrame(tick);
  }
  toggle.addEventListener('click', () => {
    if (reduce.matches) return;
    userPaused = !userPaused;
    try { localStorage.setItem(storageKey, userPaused ? 'off' : 'on'); } catch { /* Optional persistence. */ }
    syncMotion();
  });
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  }, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pagehide', () => {
    cancelFrame();
    window.clearTimeout(resizeTimer);
  });
  window.addEventListener('pageshow', syncMotion);
  if (reduce.addEventListener) reduce.addEventListener('change', syncMotion);
  else reduce.addListener(syncMotion);
  resize();
  syncMotion();
})();
