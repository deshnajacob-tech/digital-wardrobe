/*
 * Dress-up stage: the avatar plus the clothing layers placed on it.
 * Layer = { itemId, x, y, w, rot, flip, z } in avatar units (300×600).
 * Drag to move, pinch/twist to resize/rotate, mouse wheel to resize (shift = rotate).
 */
const Stage = (() => {
  let stageEl, layersEl, avatarEl, toolbar;
  let layers = [];
  let selectedId = null;
  let getItem = () => null;
  let onChange = () => {};
  const nodes = new Map();
  const pointers = new Map();
  const alphaCache = new Map();
  let gesture = null;

  const CLASH = { top: ['dress'], bottom: ['dress'], dress: ['top', 'bottom'] };

  function init(opts) {
    stageEl = $('#stage');
    layersEl = $('#stage-layers');
    avatarEl = $('#stage-avatar');
    toolbar = $('#layer-toolbar');
    getItem = opts.getItem;
    onChange = opts.onChange;

    stageEl.addEventListener('pointerdown', onDown);
    stageEl.addEventListener('pointermove', onMove);
    stageEl.addEventListener('pointerup', onUp);
    stageEl.addEventListener('pointercancel', onUp);
    stageEl.addEventListener('wheel', onWheel, { passive: false });
    toolbar.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b) act(b.dataset.act);
    });
    document.addEventListener('keydown', onKey);
  }

  const catOf = l => { const it = getItem(l.itemId); return it ? it.category : null; };
  const sorted = () => [...layers].sort((a, b) => a.z - b.z);
  const current = () => layers.find(l => l.itemId === selectedId) || null;

  let fit = 'tall';
  function setAvatar(cfg) { avatarEl.innerHTML = Avatar.svg(cfg); fit = fitOf(cfg); }
  const getFit = () => fit;

  /** Move every worn piece back to its default spot for the current figure (keeps layer order). */
  function refit() {
    const old = layers;
    layers = [];
    for (const l of old) {
      const it = getItem(l.itemId);
      if (it) layers.push({ ...defaultLayer(it), z: l.z });
    }
    render();
    onChange();
  }

  function setLayers(list) {
    layers = (list || []).map(l => ({ ...l }));
    selectedId = null;
    render();
  }
  const getLayers = () => layers.map(l => ({ ...l }));
  const isWorn = id => layers.some(l => l.itemId === id);

  function place(n, L) {
    n.style.left = (L.x / STAGE_W * 100) + '%';
    n.style.top = (L.y / STAGE_H * 100) + '%';
    n.style.width = (L.w / STAGE_W * 100) + '%';
    n.style.transform = `translate(-50%, -50%) rotate(${L.rot}deg) scaleX(${L.flip ? -1 : 1})`;
  }

  function render() {
    layers = layers.filter(l => getItem(l.itemId));
    const live = new Set();
    sorted().forEach((L, i) => {
      const it = getItem(L.itemId);
      live.add(L.itemId);
      let n = nodes.get(L.itemId);
      if (!n) {
        n = el('img', { class: 'layer', alt: it.name, draggable: 'false', src: it.url });
        nodes.set(L.itemId, n);
        layersEl.appendChild(n);
      }
      n.style.zIndex = i + 1;
      place(n, L);
      n.classList.toggle('selected', L.itemId === selectedId);
    });
    for (const [id, n] of nodes) if (!live.has(id)) { n.remove(); nodes.delete(id); }
    if (selectedId && !live.has(selectedId)) selectedId = null;
    toolbar.classList.toggle('show', !!selectedId);
  }

  function select(id) { selectedId = id; render(); }

  function defaultLayer(it) {
    const c = CAT[it.category] || CAT.accessory;
    const b = boxFor(it.category, fit);
    const ar = it.w / it.h;
    const w = Math.min(b.w, b.h * ar);
    const h = w / ar;
    const y = b.anchor === 'top' ? b.ay + h / 2 : b.anchor === 'bottom' ? b.ay - h / 2 : b.ay;
    const same = layers.filter(l => catOf(l) === it.category).length;
    const x = b.cx + (it.category === 'accessory' ? (same % 2 ? -1 : 1) * Math.ceil(same / 2) * 40 : 0);
    return { itemId: it.id, x, y, w, rot: 0, flip: false, z: c.z * 100 + layers.length };
  }

  /** Put an item on (replacing clashing pieces), or take it off if already worn. Returns true if now worn. */
  function wear(it) {
    if (isWorn(it.id)) { remove(it.id); return false; }
    const cat = it.category;
    const clash = CLASH[cat] || [];
    if (cat !== 'accessory') layers = layers.filter(l => { const c = catOf(l); return c !== cat && !clash.includes(c); });
    layers.push(defaultLayer(it));
    selectedId = it.id;
    render();
    onChange();
    return true;
  }

  function remove(id) {
    layers = layers.filter(l => l.itemId !== id);
    if (selectedId === id) selectedId = null;
    render();
    onChange();
  }

  function clear() {
    layers = [];
    selectedId = null;
    render();
    onChange();
  }

  /* ---------- hit testing (ignores transparent pixels) ---------- */
  function alphaMap(it) {
    if (alphaCache.has(it.id)) return alphaCache.get(it.id);
    const img = it.img;
    if (!img || !img.complete || !img.naturalWidth) return null;
    const s = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = el('canvas', { width: w, height: h });
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    const a = new Uint8Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    const m = { w, h, data: a };
    alphaCache.set(it.id, m);
    return m;
  }

  function hitTest(px, py) {
    for (const L of sorted().reverse()) {
      const it = getItem(L.itemId);
      if (!it) continue;
      const lh = L.w * it.h / it.w;
      const dx = px - L.x, dy = py - L.y;
      const a = -L.rot * Math.PI / 180;
      let u = dx * Math.cos(a) - dy * Math.sin(a);
      const v0 = dx * Math.sin(a) + dy * Math.cos(a);
      if (L.flip) u = -u;
      u = u / L.w + 0.5;
      const v = v0 / lh + 0.5;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      if (L.itemId === selectedId) return L;
      const m = alphaMap(it);
      if (!m) return L;
      const ix = Math.min(m.w - 1, (u * m.w) | 0), iy = Math.min(m.h - 1, (v * m.h) | 0);
      if (m.data[iy * m.w + ix] > 20) return L;
    }
    return null;
  }

  /* ---------- gestures ---------- */
  function toStage(e) {
    const r = stageEl.getBoundingClientRect();
    return { x: (e.clientX - r.left) * STAGE_W / r.width, y: (e.clientY - r.top) * STAGE_H / r.height };
  }

  function startGesture() {
    const L = current();
    gesture = L ? { start: { ...L }, pts: [...pointers.values()].map(p => ({ ...p })), moved: false } : null;
  }

  function onDown(e) {
    if (e.button > 0) return;
    e.preventDefault();
    const p = toStage(e);
    pointers.set(e.pointerId, p);
    try { stageEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    if (pointers.size === 1) {
      const L = hitTest(p.x, p.y);
      select(L ? L.itemId : null);
    }
    startGesture();
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, toStage(e));
    if (!gesture) return;
    const L = current();
    if (!L) return;
    const pts = [...pointers.values()];
    const s = gesture.start, p0 = gesture.pts;
    if (pts.length !== p0.length) return;
    if (pts.length === 1) {
      L.x = s.x + (pts[0].x - p0[0].x);
      L.y = s.y + (pts[0].y - p0[0].y);
    } else {
      const [a0, b0] = p0, [a1, b1] = pts;
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
      const ang0 = Math.atan2(b0.y - a0.y, b0.x - a0.x);
      const ang1 = Math.atan2(b1.y - a1.y, b1.x - a1.x);
      L.w = clamp(s.w * d1 / d0, 16, 700);
      L.rot = s.rot + (ang1 - ang0) * 180 / Math.PI;
      L.x = s.x + ((a1.x + b1.x) - (a0.x + b0.x)) / 2;
      L.y = s.y + ((a1.y + b1.y) - (a0.y + b0.y)) / 2;
    }
    L.x = clamp(L.x, -50, STAGE_W + 50);
    L.y = clamp(L.y, -50, STAGE_H + 50);
    gesture.moved = true;
    const n = nodes.get(L.itemId);
    if (n) place(n, L);
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    const moved = gesture && gesture.moved;
    if (pointers.size) startGesture();
    else gesture = null;
    if (moved) onChange();
  }

  const changeSoon = debounce(() => onChange(), 300);

  function onWheel(e) {
    const L = current();
    if (!L) return;
    e.preventDefault();
    if (e.shiftKey) L.rot += e.deltaY > 0 ? 4 : -4;
    else L.w = clamp(L.w * (e.deltaY > 0 ? 0.95 : 1.05), 16, 700);
    render();
    changeSoon();
  }

  function onKey(e) {
    if (!selectedId || !stageEl.offsetParent) return;
    if (e.target.closest && e.target.closest('input, textarea, select, dialog')) return;
    const L = current();
    const step = e.shiftKey ? 10 : 2;
    const k = e.key;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); act('remove'); return; }
    if (k === 'Escape') { select(null); return; }
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[k]) {
      e.preventDefault();
      L.x += moves[k][0];
      L.y += moves[k][1];
      render();
      changeSoon();
    }
  }

  function act(a) {
    const L = current();
    if (!L) return;
    const list = sorted();
    const i = list.indexOf(L);
    switch (a) {
      case 'bigger': L.w = clamp(L.w * 1.08, 16, 700); break;
      case 'smaller': L.w = clamp(L.w / 1.08, 16, 700); break;
      case 'rotl': L.rot -= 5; break;
      case 'rotr': L.rot += 5; break;
      case 'flip': L.flip = !L.flip; break;
      case 'forward': if (i < list.length - 1) { const o = list[i + 1]; [L.z, o.z] = [o.z, L.z]; if (L.z === o.z) L.z++; } break;
      case 'back': if (i > 0) { const o = list[i - 1]; [L.z, o.z] = [o.z, L.z]; if (L.z === o.z) L.z--; } break;
      case 'remove': remove(L.itemId); return;
    }
    render();
    onChange();
  }

  /** Draw the current look into a canvas (for saving / sharing). */
  async function renderCanvas(scale, avatarCfg) {
    const c = el('canvas', { width: STAGE_W * scale, height: STAGE_H * scale });
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, '#fbf6f2');
    grad.addColorStop(1, '#efe3d8');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    const av = await loadImg(Avatar.dataURL(avatarCfg));
    g.drawImage(av, 0, 0, c.width, c.height);
    for (const L of sorted()) {
      const it = getItem(L.itemId);
      if (!it) continue;
      const img = it.img && it.img.complete && it.img.naturalWidth ? it.img : await loadImg(it.url);
      const w = L.w * scale, h = w * it.h / it.w;
      g.save();
      g.translate(L.x * scale, L.y * scale);
      g.rotate(L.rot * Math.PI / 180);
      if (L.flip) g.scale(-1, 1);
      g.shadowColor = 'rgba(0,0,0,.18)';
      g.shadowBlur = 3 * scale;
      g.shadowOffsetY = 2 * scale;
      g.drawImage(img, -w / 2, -h / 2, w, h);
      g.restore();
    }
    return c;
  }

  function forget(id) { alphaCache.delete(id); remove(id); }

  return { init, setAvatar, getFit, refit, setLayers, getLayers, isWorn, wear, remove: forget, clear, select, renderCanvas };
})();
