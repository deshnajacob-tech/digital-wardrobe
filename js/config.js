/* Shared constants and small helpers. Loaded first. */

// Avatar / stage coordinate space (the avatar SVG viewBox).
const STAGE_W = 300;
const STAGE_H = 600;

// Clothing categories. `box` is where a new piece lands on the avatar:
// it is fitted into box.w × box.h, centred on cx, and aligned by its top,
// bottom or centre to the y coordinate `ay`. `z` sets the default layering.
const CATEGORIES = [
  { id: 'top',       label: 'Tops',        one: 'Top',       z: 3, box: { cx: 150, w: 180, h: 200, anchor: 'top',    ay: 150 } },
  { id: 'bottom',    label: 'Bottoms',     one: 'Bottom',    z: 2, box: { cx: 150, w: 150, h: 290, anchor: 'top',    ay: 280 } },
  { id: 'dress',     label: 'Dresses',     one: 'Dress',     z: 3, box: { cx: 150, w: 190, h: 420, anchor: 'top',    ay: 148 } },
  { id: 'outerwear', label: 'Outerwear',   one: 'Jacket',    z: 4, box: { cx: 150, w: 210, h: 320, anchor: 'top',    ay: 144 } },
  { id: 'shoes',     label: 'Shoes',       one: 'Shoes',     z: 1, box: { cx: 150, w: 96,  h: 50,  anchor: 'bottom', ay: 588 } },
  { id: 'hat',       label: 'Hats',        one: 'Hat',       z: 6, box: { cx: 150, w: 116, h: 60,  anchor: 'bottom', ay: 58  } },
  { id: 'accessory', label: 'Accessories', one: 'Accessory', z: 5, box: { cx: 150, w: 90,  h: 90,  anchor: 'center', ay: 210 } },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) n.append(c);
  return n;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

const canvasToBlob = (c, type = 'image/png', q) => new Promise(r => c.toBlob(r, type, q));

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Share a file via the native share sheet when possible, else download it. */
async function shareOrDownload(blob, name, title) {
  try {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  downloadBlob(blob, name);
}

/** Small promise-based text prompt using <dialog>. Resolves to string or null. */
function askText(title, value = '', okLabel = 'Save') {
  return new Promise(res => {
    const d = $('#prompt-dialog');
    const inp = $('#prompt-input', d);
    $('#prompt-title', d).textContent = title;
    $('#prompt-msg', d).hidden = true;
    $('#prompt-ok', d).textContent = okLabel;
    $('#prompt-ok', d).classList.add('primary');
    inp.hidden = false;
    inp.value = value;
    d.returnValue = '';
    d.onclose = () => res(d.returnValue === 'ok' ? inp.value.trim() : null);
    d.showModal();
    inp.select();
  });
}

/** Confirmation dialog. Resolves to true/false. */
function confirmDialog(title, msg = '', okLabel = 'Delete') {
  return new Promise(res => {
    const d = $('#prompt-dialog');
    $('#prompt-title', d).textContent = title;
    const m = $('#prompt-msg', d);
    m.textContent = msg;
    m.hidden = !msg;
    $('#prompt-input', d).hidden = true;
    $('#prompt-ok', d).textContent = okLabel;
    d.returnValue = '';
    d.onclose = () => res(d.returnValue === 'ok');
    d.showModal();
  });
}
