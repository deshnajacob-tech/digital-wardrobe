/* The customizable avatar: a fashion-illustration figure drawn as SVG in a 300×600 space. */
const Avatar = (() => {
  const GENDERS = [
    { id: 'female', label: 'Woman' },
    { id: 'male', label: 'Man' },
    { id: 'neutral', label: 'Non-binary' },
  ];
  const SKIN = ['#f8dcca', '#efc3a1', '#dca47c', '#c0855c', '#94603f', '#5f3c2a'];
  const HAIR_COLORS = ['#1f1612', '#4a2f1d', '#8a5a33', '#d8b26e', '#a8432c', '#a3a3a3', '#5b4282', '#d77fa1'];
  const EYES = ['#4a3020', '#3d6f9e', '#4f7a43', '#8a6a35', '#5d6470'];
  const UNDER = ['#e9e2da', '#2b2725', '#cdb6a3', '#bfcfdb'];
  const HAIR_STYLES = [
    { id: 'long', label: 'Long' },
    { id: 'bob', label: 'Bob' },
    { id: 'bun', label: 'Bun' },
    { id: 'curly', label: 'Curly' },
    { id: 'short', label: 'Short' },
    { id: 'quiff', label: 'Quiff' },
    { id: 'buzz', label: 'Buzz' },
    { id: 'none', label: 'Bald' },
  ];
  const FACIAL = [
    { id: 'none', label: 'None' },
    { id: 'stubble', label: 'Stubble' },
    { id: 'beard', label: 'Beard' },
  ];
  const BODIES = [
    { id: 'slim', label: 'Slim', f: 0.92 },
    { id: 'regular', label: 'Regular', f: 1 },
    { id: 'curvy', label: 'Fuller', f: 1.1 },
  ];
  const DEFAULT = {
    gender: 'female', skin: SKIN[1], hairStyle: 'long', hairColor: HAIR_COLORS[1],
    eyes: EYES[0], body: 'regular', under: UNDER[0], facial: 'none',
  };
  const PRESETS = {
    female: { hairStyle: 'long' },
    male: { hairStyle: 'quiff', hairColor: HAIR_COLORS[0] },
    neutral: { hairStyle: 'short', hairColor: HAIR_COLORS[2] },
  };
  const defaultsFor = g => Object.assign({}, DEFAULT, PRESETS[g] || {}, { gender: PRESETS[g] ? g : 'female' });

  /* ---------- colour helpers ---------- */
  const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgb2hex = ([r, g, b]) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
  const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const shade = (h, amt) => mix(h, amt < 0 ? '#000000' : '#ffffff', Math.abs(amt));

  let seq = 0;

  /* ---------- body geometry ----------
   * Each figure is described by its left half (neck base → crotch); the right half is mirrored. */
  function symPath(start, segs) {
    const m = x => +(STAGE_W - x).toFixed(2);
    let d = `M${start[0]} ${start[1]}`;
    const ends = [start];
    for (const s of segs) {
      if (s.length === 2) { d += ` L${s[0]} ${s[1]}`; ends.push(s); }
      else { d += ` C${s.join(' ')}`; ends.push([s[4], s[5]]); }
    }
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], p = ends[i];
      d += s.length === 2 ? ` L${m(p[0])} ${p[1]}` : ` C${m(s[2])} ${s[3]} ${m(s[0])} ${s[1]} ${m(p[0])} ${p[1]}`;
    }
    return d + ' Z';
  }

  const FACE_SOFT = 'M150 34 C170 34 182 50 182 74 C182 90 178 100 170 108 C163 115 157 118 150 118 C143 118 137 115 130 108 C122 100 118 90 118 74 C118 50 130 34 150 34 Z';
  const FACE_SQUARE = 'M150 34 C171 34 183 50 183 74 C183 92 181 103 174 111 C167 118 158 121 150 121 C142 121 133 118 126 111 C119 103 117 92 117 74 C117 50 129 34 150 34 Z';

  const FIGURES = {
    female: {
      body: symPath([128, 146], [[118, 150, 104, 152, 98, 160], [92, 166, 92, 178, 96, 188], [102, 212, 106, 240, 116, 266], [112, 290, 104, 312, 104, 335],
        [102, 380, 112, 420, 120, 450], [116, 480, 120, 515, 130, 552], [142, 552], [142, 520, 146, 485, 141, 455], [146, 420, 148, 390, 150, 368]]),
      arm: 0, neck: 11, face: FACE_SOFT, lip: 0.5, blush: 0.32, liner: true,
      brow: 'M124 70.6 C129 65 138 63.6 145.5 66.2 L145.2 67.7 C138 65.8 130.5 66.6 124.8 71.3 Z',
    },
    male: {
      body: symPath([127, 146], [[114, 149, 96, 150, 89, 160], [83, 168, 84, 182, 90, 194], [96, 218, 106, 244, 114, 272], [112, 296, 108, 316, 108, 336],
        [104, 380, 112, 420, 119, 452], [115, 482, 119, 516, 129, 552], [142, 552], [142, 520, 146, 487, 141, 457], [146, 420, 148, 392, 150, 370]]),
      arm: -8, neck: 13.5, face: FACE_SQUARE, lip: 0.2, blush: 0.08, liner: false,
      brow: 'M123 69.6 C130 65.6 139 65 146 66.6 L146 69.4 C139 68.2 131 68.4 124 72 Z',
    },
    neutral: {
      body: symPath([128, 146], [[116, 150, 100, 151, 94, 160], [88, 167, 88, 180, 93, 191], [99, 215, 106, 242, 115, 269], [112, 292, 106, 314, 106, 335],
        [103, 380, 112, 420, 120, 451], [116, 481, 120, 515, 130, 552], [142, 552], [142, 520, 146, 486, 141, 456], [146, 420, 148, 391, 150, 369]]),
      arm: -4, neck: 12, face: FACE_SOFT, lip: 0.35, blush: 0.18, liner: false,
      brow: 'M123.5 70.2 C129 65 138.5 64 146 66.4 L145.8 68.4 C138 66.6 130.5 67.2 124.5 71.6 Z',
    },
  };

  const ARM_L = 'M100 158 C88 162 84 178 84 196 C82 230 80 250 82 268 C80 290 78 310 80 330 L92 330 C92 310 94 290 96 268 C98 250 102 225 104 200 Z';
  const ARM_R = 'M200 158 C212 162 216 178 216 196 C218 230 220 250 218 268 C220 290 222 310 220 330 L208 330 C208 310 206 290 204 268 C202 250 198 225 196 200 Z';
  const HAND_L = 'M80 327 C75 340 77 354 83 361 C88 366 94 361 94 352 C95 344 93 336 92 327 Z';
  const HAND_R = 'M220 327 C225 340 223 354 217 361 C212 366 206 361 206 352 C205 344 207 336 208 327 Z';
  const FOOT_L = 'M130 549 C126 562 121 574 123 580 C125 587 136 587 140 582 C143 576 143 562 142 549 Z';
  const FOOT_R = 'M170 549 C174 562 179 574 177 580 C175 587 164 587 160 582 C157 576 157 562 158 549 Z';
  const EAR_L = 'M120 72 C111 68 109 82 112 89 C114 95 119 96 121 92 Z';
  const EAR_R = 'M180 72 C189 68 191 82 188 89 C186 95 181 96 179 92 Z';

  function neck(w) {
    const a = 150 - w, b = 150 + w;
    return {
      shape: `M${a} 100 L${a} 128 C${a} 136 ${a - 5} 142 ${a - 12} 147 L${b + 12} 147 C${b + 5} 142 ${b} 136 ${b} 128 L${b} 100 Z`,
      shadow: `M${a} 104 C${a + 6} 116 ${b - 6} 116 ${b} 104 L${b} 122 C${b - 6} 128 ${a + 6} 128 ${a} 122 Z`,
    };
  }

  /* ---------- basics (underwear) ---------- */
  function basics(g, fill, line) {
    const seam = d => `<path d="${d}" fill="none" stroke="${line}" stroke-width="1"/>`;
    const boxers = `<path d="M107 316 C130 322 170 322 193 316 L196 338 C197 352 198 366 197 382 L155 386 C153 378 151 372 150 370 C149 372 147 378 145 386 L103 382 C102 366 103 352 104 338 Z" fill="${fill}" stroke="${line}" stroke-width=".8"/>` +
      seam('M106 323 C130 329 170 329 194 323') + seam('M150 372 L150 330');
    if (g === 'male') return boxers;
    if (g === 'neutral') {
      return `<path d="M122 194 L127 150" stroke="${fill}" stroke-width="8" stroke-linecap="round"/>` +
        `<path d="M178 194 L173 150" stroke="${fill}" stroke-width="8" stroke-linecap="round"/>` +
        `<path d="M95 192 C115 184 138 186 150 188 C162 186 185 184 205 192 L198 236 C170 242 130 242 102 236 Z" fill="${fill}" stroke="${line}" stroke-width=".8"/>` +
        seam('M101 230 C130 236 170 236 199 230') + boxers;
    }
    return `<path d="M121 192 L128 150" stroke="${fill}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M179 192 L172 150" stroke="${fill}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M98 194 C115 186 138 190 150 198 C162 190 185 186 202 194 L200.5 226 C170 233 130 233 99.5 226 Z" fill="${fill}" stroke="${line}" stroke-width=".8"/>` +
      seam('M100 221 C130 228 170 228 200 221') +
      `<path d="M106 316 C130 323 170 323 194 316 L197 340 C185 350 165 362 156 372 L144 372 C135 362 115 350 103 340 Z" fill="${fill}" stroke="${line}" stroke-width=".8"/>` +
      seam('M106 322 C130 329 170 329 194 322');
  }

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
      case 'quiff': return `<path d="M150 27 C178 27 189 44 186 76 L114 76 C111 44 122 27 150 27 Z" fill="${f}"/>`;
      case 'buzz': return `<path d="M150 31 C177 31 187 48 185 78 L115 78 C113 48 123 31 150 31 Z" fill="${f}"/>`;
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
      case 'quiff': return `<path d="M117 72 C112 50 116 30 131 18 C145 7 170 8 182 20 C190 30 190 46 185 72 C183 63 180 57 176 54 C166 46 150 44 136 48 C128 52 121 60 117 72 Z" fill="${f}"/>` +
        strand('M130 30 C142 16 164 12 180 24') + strand('M125 42 C139 27 162 22 184 36') + strand('M122 54 C132 42 150 38 168 42');
      case 'buzz': return `<path d="M150 33 C172 33 184 47 184 70 C180 60 170 53 150 53 C130 53 120 60 116 70 C116 47 128 33 150 33 Z" fill="${f}" opacity=".92"/>`;
      case 'bun': return `<path d="M150 30 C173 30 187 44 184 74 C180 58 167 46 150 44 C133 46 120 58 116 74 C113 44 127 30 150 30 Z" fill="${f}"/>` +
        strand('M150 31 L150 44') + strand('M156 33 C170 38 179 50 181 64') + strand('M144 33 C130 38 121 50 119 64') + strand('M138 14 C144 8 156 8 162 14');
      case 'curly': return `<path d="M150 30 C174 30 188 44 186 72 C178 60 166 54 150 54 C134 54 122 60 114 72 C112 44 126 30 150 30 Z" fill="${f}"/>` +
        ring(150, 47, 30, 16, 185, 355, 8, 9.5, f);
      default: return '';
    }
  }

  function facialHair(kind, hc, square) {
    const chin = square ? 121 : 118;
    if (kind === 'stubble') {
      return `<path d="M119 86 C121 104 134 ${chin} 150 ${chin + 1} C166 ${chin} 179 104 181 86 C177 98 168 103 160 101 C155 99 145 99 140 101 C132 103 123 98 119 86 Z" fill="${hc}" opacity=".22"/>`;
    }
    if (kind === 'beard') {
      return `<path d="M118 80 C118 100 128 ${chin + 5} 150 ${chin + 7} C172 ${chin + 5} 182 100 182 80 C178 96 170 104 160 106 C156 113 144 113 140 106 C130 104 122 96 118 80 Z" fill="${hc}"/>` +
        `<path d="M137.5 104 C142 98.5 158 98.5 162.5 104 C157 101.6 143 101.6 137.5 104 Z" fill="${hc}"/>`;
    }
    return '';
  }

  /** Returns the avatar as an SVG string. `viewBox` lets callers crop (e.g. head thumbnails). */
  function svg(cfg, viewBox) {
    const c = Object.assign({}, DEFAULT, cfg || {});
    const fig = FIGURES[c.gender] || FIGURES.female;
    const k = 'av' + (++seq);
    const f = (BODIES.find(b => b.id === c.body) || BODIES[1]).f;
    const sk = c.skin;
    const skD = shade(sk, -0.13), skDD = shade(sk, -0.28), skL = shade(sk, 0.1);
    const hc = c.hairColor;
    const hcL = shade(hc, 0.18), hcD = shade(hc, -0.2);
    const bald = c.hairStyle === 'none';
    const brow = bald && c.facial === 'none' ? shade(sk, -0.45) : mix(hcD, '#2a1d18', 0.25);
    const lip = mix(sk, '#b24a55', fig.lip), lipL = mix(lip, '#ffffff', 0.12);
    const und = c.under, undD = shade(und, -0.12);
    const nk = neck(fig.neck);
    const bodyT = `translate(150 0) scale(${f} 1) translate(-150 0)`;
    const size = viewBox ? '' : ` width="${STAGE_W}" height="${STAGE_H}"`;
    const outline = `stroke="${skDD}" stroke-width="1" stroke-opacity=".35" stroke-linejoin="round"`;
    const hint = (d, o = 0.3) => `<path d="${d}" fill="none" stroke="${skDD}" stroke-width="1.1" stroke-opacity="${o}" stroke-linecap="round"/>`;
    const lash = fig.liner
      ? ['M145 79.4 C140 72.2 130 72.2 125 78.6 L122.4 76.6', 'M155 79.4 C160 72.2 170 72.2 175 78.6 L177.6 76.6', 1.6]
      : ['M145 79.4 C140 72.8 130 72.8 125 78.8', 'M155 79.4 C160 72.8 170 72.8 175 78.8', 1.3];

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
    <radialGradient id="${k}b"><stop offset="0" stop-color="#e8737a" stop-opacity="${fig.blush}"/><stop offset="1" stop-color="#e8737a" stop-opacity="0"/></radialGradient>
    <radialGradient id="${k}g"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <clipPath id="${k}el"><path d="M126 79 C130 73 140 73 144 79 C140 83.5 130 83.5 126 79 Z"/></clipPath>
    <clipPath id="${k}er"><path d="M156 79 C160 73 170 73 174 79 C170 83.5 160 83.5 156 79 Z"/></clipPath>
  </defs>

  <ellipse cx="150" cy="586" rx="70" ry="9" fill="url(#${k}g)"/>
  ${hairBack(c.hairStyle, `url(#${k}h)`)}

  <g transform="${bodyT}">
    <g transform="translate(${fig.arm} 0)">
      <path d="${ARM_L}" fill="url(#${k}s)" ${outline}/>
      <path d="${HAND_L}" fill="${sk}" ${outline}/>
      ${hint('M90 340 C91 348 91 354 89 358', 0.4)}
    </g>
    <g transform="translate(${-fig.arm} 0)">
      <path d="${ARM_R}" fill="url(#${k}s)" ${outline}/>
      <path d="${HAND_R}" fill="${sk}" ${outline}/>
      ${hint('M210 340 C209 348 209 354 211 358', 0.4)}
    </g>
    <path d="${fig.body}" fill="url(#${k}s)" ${outline}/>
    <path d="${FOOT_L}" fill="url(#${k}s)" ${outline}/>
    <path d="${FOOT_R}" fill="url(#${k}s)" ${outline}/>

    ${hint('M131 161 C138 165 144 165 148 163')}
    ${hint('M169 161 C162 165 156 165 152 163')}
    ${c.gender === 'male' ? hint('M116 212 C126 222 140 223 148 216', 0.28) + hint('M184 212 C174 222 160 223 152 216', 0.28) + hint('M150 228 L150 262', 0.15) : ''}
    <ellipse cx="150" cy="284" rx="1.6" ry="2.6" fill="${skDD}" opacity=".35"/>
    ${hint('M126 444 C129 450 134 452 138 450', 0.25)}
    ${hint('M174 444 C171 450 166 452 162 450', 0.25)}
    ${basics(c.gender, `url(#${k}u)`, undD)}
  </g>

  <path d="${nk.shape}" fill="url(#${k}s)" ${outline}/>
  <path d="${nk.shadow}" fill="${skDD}" opacity=".22"/>
  <path d="${EAR_L}" fill="${skD}" ${outline}/>
  <path d="${EAR_R}" fill="${skD}" ${outline}/>
  <path d="${fig.face}" fill="url(#${k}s)" ${outline}/>

  <ellipse cx="130" cy="95" rx="10" ry="6" fill="url(#${k}b)"/>
  <ellipse cx="170" cy="95" rx="10" ry="6" fill="url(#${k}b)"/>
  <path d="${fig.brow}" fill="${brow}"/>
  <path d="${fig.brow}" fill="${brow}" transform="translate(300 0) scale(-1 1)"/>
  ${hint('M127 74.5 C132 70.5 140 70.5 144 74.5', 0.35)}
  ${hint('M173 74.5 C168 70.5 160 70.5 156 74.5', 0.35)}

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
  <path d="${lash[0]}" fill="none" stroke="#24180f" stroke-width="${lash[2]}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${lash[1]}" fill="none" stroke="#24180f" stroke-width="${lash[2]}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M128 81.6 C133 84 139 84 143 81" fill="none" stroke="${skDD}" stroke-width=".8" stroke-opacity=".45"/>
  <path d="M172 81.6 C167 84 161 84 157 81" fill="none" stroke="${skDD}" stroke-width=".8" stroke-opacity=".45"/>

  ${hint('M148.5 82 C148 89 146.5 93 146 96', 0.25)}
  <path d="M145.5 96.5 C147.5 99.5 152.5 99.5 154.5 96.5" fill="none" stroke="${skDD}" stroke-width="1.3" stroke-opacity=".55" stroke-linecap="round"/>

  ${facialHair(c.facial, `url(#${k}h)`, fig.face === FACE_SQUARE)}
  <path d="M140 106 C144 102.6 147 102.6 150 104.4 C153 102.6 156 102.6 160 106 C155 107.6 145 107.6 140 106 Z" fill="${lip}"/>
  <path d="M140 106 C145 107.6 155 107.6 160 106 C157 112.5 143 112.5 140 106 Z" fill="${lipL}"/>
  <path d="M140 106 C145 107.4 155 107.4 160 106" fill="none" stroke="${shade(lip, -0.3)}" stroke-width=".9" stroke-linecap="round"/>
  <ellipse cx="151.5" cy="109.3" rx="3" ry="1" fill="#fff" opacity=".2"/>

  ${hairFront(c.hairStyle, `url(#${k}h)`, hcL)}
</svg>`;
  }

  const dataURL = cfg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(cfg));

  return { GENDERS, SKIN, HAIR_COLORS, EYES, UNDER, HAIR_STYLES, FACIAL, BODIES, DEFAULT, defaultsFor, svg, dataURL };
})();
