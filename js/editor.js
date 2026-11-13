/*
 * Photo clean-up editor: removes the background from a clothing photo.
 *  - Auto remove: flood-fills from the photo's edges through pixels that match
 *    the dominant border colours (works well on a plain floor, bed or wall).
 *  - Magic wand: tap any area to remove similar, connected colour.
 *  - Erase / Restore brushes for touch-ups.
 * Resolves with a cropped transparent PNG.
 */
const Editor = (() => {
  const MAX = 1024;       // working resolution (longest side)
  const OUT_MAX = 900;    // saved image resolution (longest side)
  const HINTS = {
    wand: 'Tap the background to remove it. Raise sensitivity if bits are left behind.',
    erase: 'Paint over anything that should go.',
    restore: 'Paint to bring back parts of the clothing that were removed.',
  };

  let root, canvas, ctx, stageWrap;
  let W = 0, H = 0, src = null, mask = null, out = null;
  let history = [], tool = 'wand', tol = 40, brush = 28, lastOp = null;
  let resolver = null, drawing = false, lastPt = null, rafId = 0;

  function init() {
    root = $('#editor');
    canvas = $('#editor-canvas');
    stageWrap = $('#editor-stage');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    $('#editor-cat').append(...CATEGORIES.map(c => el('option', { value: c.id }, c.one)));
    $$('[data-tool]', root).forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
    $('#editor-tol').addEventListener('input', e => { tol = +e.target.value; });
    $('#editor-tol').addEventListener('change', () => { if (lastOp === 'auto') autoRemove(false); });
    $('#editor-brush').addEventListener('input', e => { brush = +e.target.value; });
    $('#editor-auto').addEventListener('click', () => autoRemove(true));
    $('#editor-undo').addEventListener('click', undo);
    $('#editor-reset').addEventListener('click', () => { pushHistory(); mask.fill(255); lastOp = 'reset'; requestRender(); });
    $('#editor-cancel').addEventListener('click', () => close(null));
    $('#editor-save').addEventListener('click', save);

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', () => { if (!root.hidden) fit(); });
    document.addEventListener('keydown', e => {
      if (root.hidden) return;
      if (e.key === 'Escape') close(null);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    });
    setTool('wand');
  }

  async function decode(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall back */ }
    }
    const url = URL.createObjectURL(file);
    try { return await loadImg(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  async function open(file, opts = {}) {
    const img = await decode(file);
    const s = Math.min(1, MAX / Math.max(img.width, img.height));
    W = Math.max(1, Math.round(img.width * s));
    H = Math.max(1, Math.round(img.height * s));
    canvas.width = W;
    canvas.height = H;
    const tmp = el('canvas', { width: W, height: H });
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(img, 0, 0, W, H);
    src = tctx.getImageData(0, 0, W, H);
    out = ctx.createImageData(W, H);
    mask = new Uint8ClampedArray(W * H).fill(255);
    history = [];
    lastOp = null;

    $('#editor-name').value = opts.name || '';
    $('#editor-cat').value = opts.category || 'top';
    $('#editor-counter').textContent = opts.counter || '';
    root.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(fit);

    autoRemove(true);
    return new Promise(r => { resolver = r; });
  }

  function fit() {
    const r = stageWrap.getBoundingClientRect();
    const s = Math.min((r.width - 24) / W, (r.height - 24) / H);
    canvas.style.width = Math.max(1, W * s) + 'px';
    canvas.style.height = Math.max(1, H * s) + 'px';
  }

  function close(result) {
    root.hidden = true;
    document.body.classList.remove('modal-open');
    src = mask = out = null;
    history = [];
    const r = resolver;
    resolver = null;
    if (r) r(result);
  }

  function setTool(t) {
    tool = t;
    $$('[data-tool]', root).forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    $('#editor-hint').textContent = HINTS[t];
  }

  /* ---------- history ---------- */
  function pushHistory() {
    history.push(mask.slice());
    if (history.length > 20) history.shift();
  }
  function undo() {
    if (!history.length) return;
    mask = history.pop();
    lastOp = null;
    requestRender();
  }

  /* ---------- rendering ---------- */
  function requestRender() { if (!rafId) rafId = requestAnimationFrame(render); }
  function render() {
    rafId = 0;
    if (!src) return;
    const s = src.data, o = out.data;
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
      o[i] = s[i]; o[i + 1] = s[i + 1]; o[i + 2] = s[i + 2];
      o[i + 3] = (s[i + 3] * mask[p]) / 255;
    }
    ctx.putImageData(out, 0, 0);
  }

  /* ---------- background removal ---------- */
  function flood(seeds, match) {
    const cut = new Uint8Array(W * H);
    const stack = new Int32Array(W * H);
    let sp = 0;
    for (const p of seeds) if (!cut[p] && match(p)) { cut[p] = 1; stack[sp++] = p; }
    const last = W * (H - 1);
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % W;
      let q;
      if (x > 0 && !cut[q = p - 1] && match(q)) { cut[q] = 1; stack[sp++] = q; }
      if (x < W - 1 && !cut[q = p + 1] && match(q)) { cut[q] = 1; stack[sp++] = q; }
      if (p >= W && !cut[q = p - W] && match(q)) { cut[q] = 1; stack[sp++] = q; }
      if (p < last && !cut[q = p + W] && match(q)) { cut[q] = 1; stack[sp++] = q; }
    }
    return cut;
  }

  // Apply a cut region to the mask with a 1px soft edge.
  function applyCut(cut) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (cut[p]) { mask[p] = 0; continue; }
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx >= 0 && xx < W) n += cut[yy * W + xx];
          }
        }
        if (n) mask[p] = Math.min(mask[p], Math.round(255 * (1 - n / 12)));
      }
    }
  }

  function colorMatcher(colors) {
    const d = src.data, t2 = tol * tol;
    return p => {
      const i = p * 4;
      if (d[i + 3] < 10) return true;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      for (const c of colors) {
        const dr = r - c[0], dg = g - c[1], db = b - c[2];
        if (dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11 <= t2 * 0.33) return true;
      }
      return false;
    };
  }

  function autoRemove(push) {
    if (push) pushHistory();
    else if (history.length) mask.set(history[history.length - 1]);
    const d = src.data;
    const border = [];
    for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
    for (let y = 1; y < H - 1; y++) border.push(y * W, y * W + W - 1);

    // Find dominant border colours by coarse bucketing.
    const buckets = new Map();
    for (const p of border) {
      const i = p * 4;
      const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
      let b = buckets.get(k);
      if (!b) buckets.set(k, b = { r: 0, g: 0, b: 0, n: 0 });
      b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; b.n++;
    }
    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
    let cands = sorted.filter(b => b.n >= border.length * 0.03).slice(0, 6);
    if (!cands.length) cands = sorted.slice(0, 1);
    const colors = cands.map(b => [b.r / b.n, b.g / b.n, b.b / b.n]);

    applyCut(flood(border, colorMatcher(colors)));
    lastOp = 'auto';
    requestRender();
  }

  function wandAt(pt) {
    const x0 = clamp(Math.round(pt.x), 0, W - 1), y0 = clamp(Math.round(pt.y), 0, H - 1);
    const d = src.data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Math.max(0, y0 - 2); y <= Math.min(H - 1, y0 + 2); y++)
      for (let x = Math.max(0, x0 - 2); x <= Math.min(W - 1, x0 + 2); x++) {
        const i = (y * W + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
    pushHistory();
    applyCut(flood([y0 * W + x0], colorMatcher([[r / n, g / n, b / n]])));
    lastOp = 'wand';
    requestRender();
  }

  /* ---------- brushes ---------- */
  function stamp(cx, cy, r, val) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    const r2 = r * r;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) mask[y * W + x] = val;
  }

  function strokeTo(pt) {
    const r = (brush / 2) * (W / canvas.getBoundingClientRect().width);
    const val = tool === 'erase' ? 0 : 255;
    if (!lastPt) stamp(pt.x, pt.y, r, val);
    else {
      const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
      const steps = Math.max(1, Math.ceil(dist / (r * 0.4)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        stamp(lastPt.x + (pt.x - lastPt.x) * t, lastPt.y + (pt.y - lastPt.y) * t, r, val);
      }
    }
    lastPt = pt;
    requestRender();
  }

  function toImg(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function onDown(e) {
    if (!src) return;
    e.preventDefault();
    const pt = toImg(e);
    if (tool === 'wand') { wandAt(pt); return; }
    canvas.setPointerCapture(e.pointerId);
    pushHistory();
    drawing = true;
    lastPt = null;
    lastOp = 'brush';
    strokeTo(pt);
  }
  function onMove(e) { if (drawing) strokeTo(toImg(e)); }
  function onUp() { drawing = false; lastPt = null; }

  /* ---------- save ---------- */
  async function save() {
    render();
    const o = out.data;
    let minX = W, minY = H, maxX = -1, maxY = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (o[(y * W + x) * 4 + 3] > 12) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
    if (maxX < 0) { toast('Nothing left – undo or tap “Show all”'); return; }
    const pad = 4;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
    const cw = maxX - minX + 1, ch = maxY - minY + 1;
    const s = Math.min(1, OUT_MAX / Math.max(cw, ch));
    const fin = el('canvas', { width: Math.round(cw * s), height: Math.round(ch * s) });
    fin.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, fin.width, fin.height);
    const blob = await canvasToBlob(fin, 'image/png');
    close({ blob, w: fin.width, h: fin.height, name: $('#editor-name').value.trim(), category: $('#editor-cat').value });
  }

  return { init, open };
})();
