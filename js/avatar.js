/* The customizable avatar, drawn as SVG in a 300×600 coordinate space. */
const Avatar = (() => {
  const SKIN = ['#fde3d2', '#f3c6a5', '#e2aa83', '#c68863', '#9a6343', '#6b4430'];
  const HAIR_COLORS = ['#231812', '#5a3a22', '#a8692f', '#e3c27a', '#b1462f', '#9b9b9b', '#6a4c93', '#d77fa1'];
  const EYES = ['#3b2a20', '#3a6ea5', '#4f7a3a', '#7a5a2e', '#5d6470'];
  const UNDER = ['#ece6df', '#2f2a28', '#d9c3b0', '#c9d6df'];
  const HAIR_STYLES = [
    { id: 'long', label: 'Long' },
    { id: 'bob', label: 'Bob' },
    { id: 'short', label: 'Short' },
    { id: 'bun', label: 'Bun' },
    { id: 'curly', label: 'Curly' },
    { id: 'none', label: 'Bald' },
  ];
  const BODIES = [
    { id: 'slim', label: 'Slim', f: 0.9 },
    { id: 'regular', label: 'Regular', f: 1 },
    { id: 'curvy', label: 'Curvy', f: 1.12 },
  ];
  const DEFAULT = { skin: SKIN[1], hairStyle: 'long', hairColor: HAIR_COLORS[1], eyes: EYES[0], body: 'regular', under: UNDER[0] };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const target = amt < 0 ? 0 : 255, t = Math.abs(amt);
    r = Math.round(r + (target - r) * t);
    g = Math.round(g + (target - g) * t);
    b = Math.round(b + (target - b) * t);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function ring(cx, cy, rx, ry, a0, a1, n, r, fill) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
      s += `<circle cx="${(cx + rx * Math.cos(a)).toFixed(1)}" cy="${(cy + ry * Math.sin(a)).toFixed(1)}" r="${r}" fill="${fill}"/>`;
    }
    return s;
  }

  const CAP = 'M110 86 Q104 30 150 28 Q196 30 190 86 Q188 64 176 54 Q160 66 132 58 Q116 66 110 86 Z';

  function hairBack(style, c) {
    switch (style) {
      case 'long': return `<path d="M108 76 Q102 24 150 24 Q198 24 192 76 Q200 140 206 210 Q150 226 94 210 Q100 140 108 76 Z" fill="${c}"/>`;
      case 'bob': return `<path d="M106 78 Q102 24 150 24 Q198 24 194 78 Q198 110 196 134 Q150 144 104 134 Q102 110 106 78 Z" fill="${c}"/>`;
      case 'short': return `<path d="M110 80 Q104 26 150 26 Q196 26 190 80 Z" fill="${c}"/>`;
      case 'bun': return `<circle cx="150" cy="28" r="22" fill="${c}"/><path d="M110 80 Q104 26 150 26 Q196 26 190 80 Z" fill="${c}"/>`;
      case 'curly': return `<ellipse cx="150" cy="80" rx="44" ry="48" fill="${c}"/>` + ring(150, 82, 46, 50, 150, 390, 13, 19, c);
      default: return '';
    }
  }

  function hairFront(style, c) {
    switch (style) {
      case 'long':
      case 'short':
      case 'bun': return `<path d="${CAP}" fill="${c}"/>`;
      case 'bob': return `<path d="${CAP}" fill="${c}"/>` +
        `<path d="M110 84 Q105 110 112 130 L124 128 Q117 104 121 80 Z" fill="${c}"/>` +
        `<path d="M190 84 Q195 110 188 130 L176 128 Q183 104 179 80 Z" fill="${c}"/>`;
      case 'curly': return `<path d="${CAP}" fill="${c}"/>` + ring(150, 70, 38, 40, 195, 345, 8, 13, c);
      default: return '';
    }
  }

  /** Returns the avatar as an SVG string. `viewBox` lets callers crop (e.g. head thumbnails). */
  function svg(cfg, viewBox) {
    const c = Object.assign({}, DEFAULT, cfg || {});
    const f = (BODIES.find(b => b.id === c.body) || BODIES[1]).f;
    const sk = c.skin, skD = shade(sk, -0.14), hc = c.hairColor, hcD = shade(hc, -0.25);
    const bodyT = `translate(150 0) scale(${f} 1) translate(-150 0)`;
    const size = viewBox ? '' : ` width="${STAGE_W}" height="${STAGE_H}"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox || `0 0 ${STAGE_W} ${STAGE_H}`}"${size}>
  <ellipse cx="150" cy="586" rx="78" ry="8" fill="rgba(0,0,0,.08)"/>
  ${hairBack(c.hairStyle, hc)}
  <rect x="139" y="110" width="22" height="56" rx="8" fill="${skD}"/>
  <g transform="${bodyT}">
    <path d="M114 330 L146 330 L144 560 L124 560 Z" fill="${sk}"/>
    <path d="M154 330 L186 330 L176 560 L156 560 Z" fill="${sk}"/>
    <ellipse cx="131" cy="566" rx="16" ry="8" fill="${skD}"/>
    <ellipse cx="169" cy="566" rx="16" ry="8" fill="${skD}"/>
    <path d="M101 178 Q82 245 84 318" stroke="${sk}" stroke-width="20" stroke-linecap="round" fill="none"/>
    <path d="M199 178 Q218 245 216 318" stroke="${sk}" stroke-width="20" stroke-linecap="round" fill="none"/>
    <circle cx="84" cy="325" r="11" fill="${sk}"/>
    <circle cx="216" cy="325" r="11" fill="${sk}"/>
    <path d="M108 160 Q150 150 192 160 Q206 166 204 182 Q200 240 186 292 Q194 318 190 345 L110 345 Q106 318 114 292 Q100 240 96 182 Q94 166 108 160 Z" fill="${sk}"/>
    <path d="M113 188 Q150 197 187 188 L185 222 Q150 231 115 222 Z" fill="${c.under}"/>
    <path d="M110 318 Q150 326 190 318 L191 350 L156 352 L150 341 L144 352 L109 350 Z" fill="${c.under}"/>
  </g>
  <ellipse cx="112" cy="86" rx="6" ry="10" fill="${skD}"/>
  <ellipse cx="188" cy="86" rx="6" ry="10" fill="${skD}"/>
  <ellipse cx="150" cy="78" rx="38" ry="45" fill="${sk}"/>
  <circle cx="128" cy="99" r="6" fill="#f19c9c" opacity=".35"/>
  <circle cx="172" cy="99" r="6" fill="#f19c9c" opacity=".35"/>
  <ellipse cx="136" cy="85" rx="4" ry="5" fill="${c.eyes}"/>
  <ellipse cx="164" cy="85" rx="4" ry="5" fill="${c.eyes}"/>
  <circle cx="137.4" cy="83.4" r="1.3" fill="#fff"/>
  <circle cx="165.4" cy="83.4" r="1.3" fill="#fff"/>
  <path d="M128 74 Q136 70 143 74" stroke="${c.hairStyle === 'none' ? skD : hcD}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M157 74 Q164 70 172 74" stroke="${c.hairStyle === 'none' ? skD : hcD}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M150 89 Q147 97 151 99" stroke="${skD}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M140 107 Q150 114 160 107" stroke="#b05a5a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  ${hairFront(c.hairStyle, hc)}
</svg>`;
  }

  const dataURL = cfg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(cfg));

  return { SKIN, HAIR_COLORS, EYES, UNDER, HAIR_STYLES, BODIES, DEFAULT, svg, dataURL };
})();
