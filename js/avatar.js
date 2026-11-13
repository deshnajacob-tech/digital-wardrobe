/* The customizable avatar: a fashion-illustration figure drawn as SVG in a 300×600 space. */
const Avatar = (() => {
  const SKIN = ['#f8dcca', '#efc3a1', '#dca47c', '#c0855c', '#94603f', '#5f3c2a'];
  const HAIR_COLORS = ['#1f1612', '#4a2f1d', '#8a5a33', '#d8b26e', '#a8432c', '#a3a3a3', '#5b4282', '#d77fa1'];
  const EYES = ['#4a3020', '#3d6f9e', '#4f7a43', '#8a6a35', '#5d6470'];
  const UNDER = ['#e9e2da', '#2b2725', '#cdb6a3', '#bfcfdb'];
  const HAIR_STYLES = [
    { id: 'long', label: 'Long' },
    { id: 'bob', label: 'Bob' },
    { id: 'short', label: 'Short' },
    { id: 'bun', label: 'Bun' },
    { id: 'curly', label: 'Curly' },
    { id: 'none', label: 'Bald' },
  ];
  const BODIES = [
    { id: 'slim', label: 'Slim', f: 0.92 },
    { id: 'regular', label: 'Regular', f: 1 },
    { id: 'curvy', label: 'Curvy', f: 1.1 },
  ];
  const DEFAULT = { skin: SKIN[1], hairStyle: 'long', hairColor: HAIR_COLORS[1], eyes: EYES[0], body: 'regular', under: UNDER[0] };

  /* ---------- colour helpers ---------- */
  const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgb2hex = ([r, g, b]) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
  const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const shade = (h, amt) => mix(h, amt < 0 ? '#000000' : '#ffffff', Math.abs(amt));

  let seq = 0;

  /* ---------- body geometry ---------- */
  const BODY = 'M128 146 C118 150 104 152 98 160 C92 166 92 178 96 188 C102 212 106 240 116 266 C112 290 104 312 104 335 ' +
    'C102 380 112 420 120 450 C116 480 120 515 130 552 L142 552 C142 520 146 485 141 455 C146 420 148 390 150 368 ' +
    'C152 390 154 420 159 455 C154 485 158 520 158 552 L170 552 C180 515 184 480 180 450 C188 420 198 380 196 335 ' +
    'C196 312 188 290 184 266 C194 240 198 212 204 188 C208 178 208 166 202 160 C196 152 182 150 172 146 Z';
  const ARM_L = 'M100 158 C88 162 84 178 84 196 C82 230 80 250 82 268 C80 290 78 310 80 330 L92 330 C92 310 94 290 96 268 C98 250 102 225 104 200 Z';
  const ARM_R = 'M200 158 C212 162 216 178 216 196 C218 230 220 250 218 268 C220 290 222 310 220 330 L208 330 C208 310 206 290 204 268 C202 250 198 225 196 200 Z';
  const HAND_L = 'M80 327 C75 340 77 354 83 361 C88 366 94 361 94 352 C95 344 93 336 92 327 Z';
  const HAND_R = 'M220 327 C225 340 223 354 217 361 C212 366 206 361 206 352 C205 344 207 336 208 327 Z';
  const FOOT_L = 'M130 549 C126 562 121 574 123 580 C125 587 136 587 140 582 C143 576 143 562 142 549 Z';
  const FOOT_R = 'M170 549 C174 562 179 574 177 580 C175 587 164 587 160 582 C157 576 157 562 158 549 Z';
  const FACE = 'M150 34 C170 34 182 50 182 74 C182 90 178 100 170 108 C163 115 157 118 150 118 C143 118 137 115 130 108 C122 100 118 90 118 74 C118 50 130 34 150 34 Z';
  const NECK = 'M139 100 L139 128 C139 136 134 142 127 147 L173 147 C166 142 161 136 161 128 L161 100 Z';
  const EAR_L = 'M120 72 C111 68 109 82 112 89 C114 95 119 96 121 92 Z';
  const EAR_R = 'M180 72 C189 68 191 82 188 89 C186 95 181 96 179 92 Z';

  /* ---------- hair ---------- */
  function ring(cx, cy, rx, ry, a0, a1, n, r, fill) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
      s += `<circle cx="${(cx + rx * Math.cos(a)).toFixed(1)}" cy="${(cy + ry * Math.sin(a)).toFixed(1)}" r="${r}" fill="${fill}"/>`;
    }
    return s;
  }

  const SIDE_PART_FRINGE = 'C178 76 172 58 160 50 C150 62 132 68 120 72';

  function hairBack(style, f) {
    switch (style) {
      case 'long': return `<path d="M150 22 C186 22 196 52 194 86 C192 130 200 170 206 214 C190 226 168 228 150 226 C132 228 110 226 94 214 C100 170 108 130 106 86 C104 52 114 22 150 22 Z" fill="${f}"/>`;
      case 'bob': return `<path d="M150 22 C186 22 198 52 196 90 C196 110 198 124 196 134 C180 141 120 141 104 134 C102 124 104 110 104 90 C102 52 114 22 150 22 Z" fill="${f}"/>`;
      case 'short': return `<path d="M150 24 C181 24 192 46 189 84 L111 84 C108 46 119 24 150 24 Z" fill="${f}"/>`;
      case 'bun': return `<circle cx="150" cy="24" r="20" fill="${f}"/><path d="M150 28 C178 28 190 46 188 80 L112 80 C110 46 122 28 150 28 Z" fill="${f}"/>`;
      case 'curly': return `<ellipse cx="150" cy="80" rx="46" ry="50" fill="${f}"/>` + ring(150, 84, 48, 52, 140, 400, 15, 18, f);
      default: return '';
    }
  }

  function hairFront(style, f, hl) {
    const strand = d => `<path d="${d}" fill="none" stroke="${hl}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`;
    switch (style) {
      case 'long': return `<path d="M150 26 C176 26 190 44 190 76 C190 98 186 122 189 152 C182 142 180 120 180 98 ${SIDE_PART_FRINGE} C118 96 116 122 111 152 C107 122 110 98 110 76 C110 44 124 26 150 26 Z" fill="${f}"/>` +
        strand('M158 31 C174 38 184 54 185 80') + strand('M146 31 C130 38 120 52 118 70') + strand('M184 100 C184 118 185 132 187 146');
      case 'bob': return `<path d="M150 26 C176 26 192 46 192 80 C192 100 194 118 192 132 C186 128 182 110 180 96 ${SIDE_PART_FRINGE} C118 96 116 116 108 132 C106 118 108 100 108 80 C108 46 124 26 150 26 Z" fill="${f}"/>` +
        strand('M158 31 C176 38 186 56 187 84') + strand('M144 31 C128 38 118 54 116 74');
      case 'short': return `<path d="M150 28 C175 28 189 44 186 78 C182 64 176 56 168 52 C156 60 136 62 120 66 C118 70 117 74 116 80 C111 46 125 28 150 28 Z" fill="${f}"/>` +
        strand('M150 31 C166 33 178 42 182 58') + strand('M144 33 C132 38 124 46 121 58');
      case 'bun': return `<path d="M150 30 C173 30 187 44 184 74 C180 58 167 46 150 44 C133 46 120 58 116 74 C113 44 127 30 150 30 Z" fill="${f}"/>` +
        strand('M150 31 L150 44') + strand('M156 33 C170 38 179 50 181 64') + strand('M144 33 C130 38 121 50 119 64') + strand('M138 14 C144 8 156 8 162 14');
      case 'curly': return `<path d="M150 30 C174 30 188 44 186 72 C178 60 166 54 150 54 C134 54 122 60 114 72 C112 44 126 30 150 30 Z" fill="${f}"/>` +
        ring(150, 47, 30, 16, 185, 355, 8, 9.5, f);
      default: return '';
    }
  }

  /** Returns the avatar as an SVG string. `viewBox` lets callers crop (e.g. head thumbnails). */
  function svg(cfg, viewBox) {
    const c = Object.assign({}, DEFAULT, cfg || {});
    const k = 'av' + (++seq);
    const f = (BODIES.find(b => b.id === c.body) || BODIES[1]).f;
    const sk = c.skin;
    const skD = shade(sk, -0.13), skDD = shade(sk, -0.28), skL = shade(sk, 0.1);
    const hc = c.hairColor;
    const hcL = shade(hc, 0.18), hcD = shade(hc, -0.2);
    const bald = c.hairStyle === 'none';
    const brow = bald ? shade(sk, -0.45) : mix(hcD, '#2a1d18', 0.25);
    const lip = mix(sk, '#b24a55', 0.5), lipL = mix(lip, '#ffffff', 0.12);
    const und = c.under, undD = shade(und, -0.12);
    const bodyT = `translate(150 0) scale(${f} 1) translate(-150 0)`;
    const size = viewBox ? '' : ` width="${STAGE_W}" height="${STAGE_H}"`;
    const outline = `stroke="${skDD}" stroke-width="1" stroke-opacity=".35" stroke-linejoin="round"`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox || `0 0 ${STAGE_W} ${STAGE_H}`}"${size}>
  <defs>
    <linearGradient id="${k}s" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${skD}"/><stop offset=".3" stop-color="${sk}"/><stop offset=".55" stop-color="${skL}"/><stop offset=".78" stop-color="${sk}"/><stop offset="1" stop-color="${skD}"/>
    </linearGradient>
    <linearGradient id="${k}h" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${hcL}"/><stop offset=".5" stop-color="${hc}"/><stop offset="1" stop-color="${hcD}"/>
    </linearGradient>
    <linearGradient id="${k}u" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${undD}"/><stop offset=".5" stop-color="${und}"/><stop offset="1" stop-color="${undD}"/>
    </linearGradient>
    <radialGradient id="${k}b"><stop offset="0" stop-color="#e8737a" stop-opacity=".32"/><stop offset="1" stop-color="#e8737a" stop-opacity="0"/></radialGradient>
    <radialGradient id="${k}g"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <clipPath id="${k}el"><path d="M126 79 C130 73 140 73 144 79 C140 83.5 130 83.5 126 79 Z"/></clipPath>
    <clipPath id="${k}er"><path d="M156 79 C160 73 170 73 174 79 C170 83.5 160 83.5 156 79 Z"/></clipPath>
  </defs>

  <ellipse cx="150" cy="586" rx="70" ry="9" fill="url(#${k}g)"/>
  ${hairBack(c.hairStyle, `url(#${k}h)`)}

  <g transform="${bodyT}">
    <path d="${ARM_L}" fill="url(#${k}s)" ${outline}/>
    <path d="${ARM_R}" fill="url(#${k}s)" ${outline}/>
    <path d="${HAND_L}" fill="${sk}" ${outline}/>
    <path d="${HAND_R}" fill="${sk}" ${outline}/>
    <path d="M90 340 C91 348 91 354 89 358" fill="none" stroke="${skDD}" stroke-width=".9" stroke-opacity=".4"/>
    <path d="M210 340 C209 348 209 354 211 358" fill="none" stroke="${skDD}" stroke-width=".9" stroke-opacity=".4"/>
    <path d="${BODY}" fill="url(#${k}s)" ${outline}/>
    <path d="${FOOT_L}" fill="url(#${k}s)" ${outline}/>
    <path d="${FOOT_R}" fill="url(#${k}s)" ${outline}/>

    <!-- anatomy hints -->
    <path d="M131 161 C138 165 144 165 148 163" fill="none" stroke="${skDD}" stroke-width="1.1" stroke-opacity=".3" stroke-linecap="round"/>
    <path d="M169 161 C162 165 156 165 152 163" fill="none" stroke="${skDD}" stroke-width="1.1" stroke-opacity=".3" stroke-linecap="round"/>
    <ellipse cx="150" cy="284" rx="1.6" ry="2.6" fill="${skDD}" opacity=".35"/>
    <path d="M126 444 C129 450 134 452 138 450" fill="none" stroke="${skDD}" stroke-width="1" stroke-opacity=".25" stroke-linecap="round"/>
    <path d="M174 444 C171 450 166 452 162 450" fill="none" stroke="${skDD}" stroke-width="1" stroke-opacity=".25" stroke-linecap="round"/>

    <!-- basics -->
    <path d="M121 192 L128 150" stroke="${und}" stroke-width="4" stroke-linecap="round"/>
    <path d="M179 192 L172 150" stroke="${und}" stroke-width="4" stroke-linecap="round"/>
    <path d="M98 194 C115 186 138 190 150 198 C162 190 185 186 202 194 L200.5 226 C170 233 130 233 99.5 226 Z" fill="url(#${k}u)" stroke="${undD}" stroke-width=".8"/>
    <path d="M100 221 C130 228 170 228 200 221" fill="none" stroke="${undD}" stroke-width="1"/>
    <path d="M106 316 C130 323 170 323 194 316 L197 340 C185 350 165 362 156 372 L144 372 C135 362 115 350 103 340 Z" fill="url(#${k}u)" stroke="${undD}" stroke-width=".8"/>
    <path d="M106 322 C130 329 170 329 194 322" fill="none" stroke="${undD}" stroke-width="1"/>
  </g>

  <path d="${NECK}" fill="url(#${k}s)" ${outline}/>
  <path d="M139 104 C145 116 155 116 161 104 L161 122 C155 128 145 128 139 122 Z" fill="${skDD}" opacity=".22"/>
  <path d="${EAR_L}" fill="${skD}" ${outline}/>
  <path d="${EAR_R}" fill="${skD}" ${outline}/>
  <path d="${FACE}" fill="url(#${k}s)" ${outline}/>

  <!-- face -->
  <ellipse cx="130" cy="95" rx="10" ry="6" fill="url(#${k}b)"/>
  <ellipse cx="170" cy="95" rx="10" ry="6" fill="url(#${k}b)"/>
  <path d="M124 70.6 C129 65 138 63.6 145.5 66.2 L145.2 67.7 C138 65.8 130.5 66.6 124.8 71.3 Z" fill="${brow}"/>
  <path d="M176 70.6 C171 65 162 63.6 154.5 66.2 L154.8 67.7 C162 65.8 169.5 66.6 175.2 71.3 Z" fill="${brow}"/>
  <path d="M127 74.5 C132 70.5 140 70.5 144 74.5" fill="none" stroke="${skDD}" stroke-width="1" stroke-opacity=".35"/>
  <path d="M173 74.5 C168 70.5 160 70.5 156 74.5" fill="none" stroke="${skDD}" stroke-width="1" stroke-opacity=".35"/>

  <path d="M126 79 C130 73 140 73 144 79 C140 83.5 130 83.5 126 79 Z" fill="#fbf8f6"/>
  <path d="M156 79 C160 73 170 73 174 79 C170 83.5 160 83.5 156 79 Z" fill="#fbf8f6"/>
  <g clip-path="url(#${k}el)">
    <circle cx="135" cy="78.6" r="3.9" fill="${c.eyes}"/><circle cx="135" cy="78.6" r="1.7" fill="#140d0a"/>
    <circle cx="136.4" cy="77.2" r="1.1" fill="#fff"/>
  </g>
  <g clip-path="url(#${k}er)">
    <circle cx="165" cy="78.6" r="3.9" fill="${c.eyes}"/><circle cx="165" cy="78.6" r="1.7" fill="#140d0a"/>
    <circle cx="166.4" cy="77.2" r="1.1" fill="#fff"/>
  </g>
  <path d="M145 79.4 C140 72.2 130 72.2 125 78.6 L122.4 76.6" fill="none" stroke="#24180f" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M155 79.4 C160 72.2 170 72.2 175 78.6 L177.6 76.6" fill="none" stroke="#24180f" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M128 81.6 C133 84 139 84 143 81" fill="none" stroke="${skDD}" stroke-width=".8" stroke-opacity=".45"/>
  <path d="M172 81.6 C167 84 161 84 157 81" fill="none" stroke="${skDD}" stroke-width=".8" stroke-opacity=".45"/>

  <path d="M148.5 82 C148 89 146.5 93 146 96" fill="none" stroke="${skDD}" stroke-width="1" stroke-opacity=".25" stroke-linecap="round"/>
  <path d="M145.5 96.5 C147.5 99.5 152.5 99.5 154.5 96.5" fill="none" stroke="${skDD}" stroke-width="1.3" stroke-opacity=".55" stroke-linecap="round"/>

  <path d="M140 106 C144 102.6 147 102.6 150 104.4 C153 102.6 156 102.6 160 106 C155 107.6 145 107.6 140 106 Z" fill="${lip}"/>
  <path d="M140 106 C145 107.6 155 107.6 160 106 C157 112.5 143 112.5 140 106 Z" fill="${lipL}"/>
  <path d="M140 106 C145 107.4 155 107.4 160 106" fill="none" stroke="${shade(lip, -0.3)}" stroke-width=".9" stroke-linecap="round"/>
  <ellipse cx="151.5" cy="109.3" rx="3" ry="1" fill="#fff" opacity=".22"/>

  ${hairFront(c.hairStyle, `url(#${k}h)`, hcL)}
</svg>`;
  }

  const dataURL = cfg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(cfg));

  return { SKIN, HAIR_COLORS, EYES, UNDER, HAIR_STYLES, BODIES, DEFAULT, svg, dataURL };
})();
