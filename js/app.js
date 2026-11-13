/* App shell: profiles / sign-in, views, wardrobe, outfits, avatar settings. */
const App = (() => {
  const VIEWS = ['wardrobe', 'dressup', 'outfits', 'avatar'];
  const S = {
    profiles: [], profile: null,
    items: [], byId: new Map(), outfits: [], avatar: { ...Avatar.DEFAULT },
    filter: 'all', drawer: 'all', view: 'wardrobe',
  };
  const pkey = (k, p = S.profile) => `${k}:${p.id}`;

  // Debounced writes capture the profile key at call time, so switching profiles can't misfile data.
  const putSoonA = debounce((k, v) => DB.put('settings', v, k).catch(console.error), 300);
  const putSoonB = debounce((k, v) => DB.put('settings', v, k).catch(console.error), 400);
  const saveAvatar = () => { if (S.profile) putSoonA(pkey('avatar'), { ...S.avatar }); };
  const saveCurrent = () => { if (S.profile) putSoonB(pkey('current'), { fit: Stage.getFit(), layers: Stage.getLayers() }); };

  async function start() {
    Editor.init();
    Stage.init({
      getItem: id => S.byId.get(id),
      onChange: () => { saveCurrent(); if (S.view === 'dressup') renderDrawer(); },
    });
    wire();
    Stage.setAvatar(S.avatar);

    let profiles = [], active = null;
    try {
      [profiles, active] = await Promise.all([DB.get('settings', 'profiles'), DB.get('settings', 'activeProfile')]);
    } catch (e) {
      console.error(e);
      toast('Storage is unavailable – nothing will be saved');
    }
    S.profiles = profiles || [];
    const p = S.profiles.find(x => x.id === active);
    if (p) await signIn(p);
    else showWelcome();

    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function hydrate(it) {
    it.url = URL.createObjectURL(it.blob);
    it.img = new Image();
    it.img.src = it.url;
    S.byId.set(it.id, it);
    return it;
  }
  const record = ({ url, img, ...rest }) => rest;

  /* ---------- profiles ---------- */
  async function signIn(p) {
    S.items.forEach(i => URL.revokeObjectURL(i.url));
    S.outfits.forEach(o => URL.revokeObjectURL(o.url));
    S.byId.clear();
    S.profile = p;
    DB.put('settings', p.id, 'activeProfile').catch(console.error);

    let items = [], outfits = [], avatar = null, current = null;
    try {
      [items, outfits, avatar, current] = await Promise.all([
        DB.all('items'), DB.all('outfits'), DB.get('settings', pkey('avatar')), DB.get('settings', pkey('current')),
      ]);
    } catch (e) { console.error(e); }
    S.items = items.filter(i => i.profileId === p.id).sort((a, b) => b.createdAt - a.createdAt).map(hydrate);
    S.outfits = outfits.filter(o => o.profileId === p.id).sort((a, b) => b.createdAt - a.createdAt)
      .map(o => ({ ...o, url: URL.createObjectURL(o.thumb) }));
    S.avatar = Object.assign(Avatar.defaultsFor(p.gender), avatar || {});
    S.filter = S.drawer = 'all';

    Stage.setAvatar(S.avatar);
    // `current` was a bare layer array before figures had their own fit.
    const cur = Array.isArray(current) ? { fit: 'tall', layers: current } : (current || { fit: Stage.getFit(), layers: [] });
    Stage.setLayers(cur.layers || []);
    if (cur.fit !== Stage.getFit() && (cur.layers || []).length) Stage.refit();
    hideWelcome();
    updateMe();
    buildAvatarEditor();
    renderWardrobe();
    renderOutfits();
    const v = location.hash.slice(1);
    show(VIEWS.includes(v) ? v : 'wardrobe');
  }

  async function createProfile(name, gender) {
    const p = { id: uid(), name, gender, createdAt: Date.now() };
    const first = S.profiles.length === 0;
    S.profiles.push(p);
    try {
      await DB.put('settings', S.profiles, 'profiles');
      await DB.put('settings', Avatar.defaultsFor(gender), pkey('avatar', p));
      if (first) await claimOrphans(p);
    } catch (e) { console.error(e); }
    await signIn(p);
    toast(`Welcome, ${name}!`);
  }

  // Items saved before profiles existed belong to the first profile created.
  async function claimOrphans(p) {
    const [items, outfits, cur] = await Promise.all([DB.all('items'), DB.all('outfits'), DB.get('settings', 'current')]);
    for (const i of items) if (!i.profileId) { i.profileId = p.id; await DB.put('items', i); }
    for (const o of outfits) if (!o.profileId) { o.profileId = p.id; await DB.put('outfits', o); }
    if (cur) await DB.put('settings', cur, pkey('current', p));
  }

  function switchProfile() {
    S.profile = null;
    DB.put('settings', null, 'activeProfile').catch(console.error);
    showWelcome();
  }

  async function deleteProfile() {
    const p = S.profile;
    if (!(await confirmDialog(`Delete ${p.name}’s profile?`, 'All clothes and saved looks in this profile will be permanently removed from this device.'))) return;
    try {
      for (const i of S.items) await DB.del('items', i.id);
      for (const o of S.outfits) await DB.del('outfits', o.id);
      await DB.del('settings', pkey('avatar'));
      await DB.del('settings', pkey('current'));
      S.profiles = S.profiles.filter(x => x.id !== p.id);
      await DB.put('settings', S.profiles, 'profiles');
    } catch (e) { console.error(e); }
    S.items.forEach(i => URL.revokeObjectURL(i.url));
    S.outfits.forEach(o => URL.revokeObjectURL(o.url));
    S.items = []; S.outfits = []; S.byId.clear();
    Stage.setLayers([]);
    switchProfile();
    toast('Profile deleted');
  }

  function updateMe() {
    const b = $('#me-btn');
    b.hidden = !S.profile;
    if (!S.profile) return;
    $('#me-name').textContent = S.profile.name;
    $('#me-face').innerHTML = Avatar.svg(S.avatar, Avatar.faceBox(S.avatar));
  }

  /* ---------- welcome screen ---------- */
  let pickedGender = null;

  function showWelcome(mode) {
    const create = mode === 'create' || S.profiles.length === 0;
    $('#welcome').hidden = false;
    $('#me-btn').hidden = true;
    document.body.classList.add('modal-open');
    $('#welcome-list').hidden = create;
    $('#welcome-form').hidden = !create;
    $('#welcome-back').hidden = S.profiles.length === 0;
    if (create) {
      $('#welcome-name').value = '';
      pickedGender = null;
      renderGenderPick();
      setTimeout(() => $('#welcome-name').focus(), 50);
    } else {
      renderProfileList();
    }
  }

  function hideWelcome() {
    $('#welcome').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function renderGenderPick() {
    $('#welcome-gender').replaceChildren(...Avatar.GENDERS.map(g => el('button', {
      type: 'button',
      role: 'radio',
      'aria-checked': String(pickedGender === g.id),
      class: 'gender-opt' + (pickedGender === g.id ? ' active' : ''),
      onclick: () => { pickedGender = g.id; renderGenderPick(); },
      html: Avatar.svg(Avatar.defaultsFor(g.id), '0 10 300 590') + `<span>${g.label}</span>`,
    })));
  }

  async function renderProfileList() {
    const list = $('#profile-list');
    list.replaceChildren(...S.profiles.map(p => {
      const base = Avatar.defaultsFor(p.gender);
      const face = el('span', { class: 'me-face', html: Avatar.svg(base, Avatar.faceBox(base)) });
      DB.get('settings', pkey('avatar', p)).then(a => {
        if (a) { const cfg = { ...base, ...a }; face.innerHTML = Avatar.svg(cfg, Avatar.faceBox(cfg)); }
      }).catch(() => {});
      const g = Avatar.GENDERS.find(x => x.id === p.gender);
      return el('button', { class: 'profile-btn', onclick: () => signIn(p) },
        face,
        el('span', {}, el('strong', {}, p.name), el('span', { class: 'muted' }, g ? g.label : '')));
    }));
  }

  /* ---------- navigation ---------- */
  function show(view) {
    S.view = view;
    $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + view));
    $$('.tabbar [data-view]').forEach(b => {
      if (b.dataset.view === view) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $('#view-title').textContent = $('#view-' + view).dataset.title;
    try { history.replaceState(null, '', location.pathname + location.search + '#' + view); } catch (_) { /* ignore */ }
    if (view === 'dressup') { Stage.select(null); renderDrawer(); }
    updateSub();
    window.scrollTo(0, 0);
  }

  function updateSub() {
    const n = S.items.length, o = S.outfits.length;
    $('#view-sub').textContent = {
      wardrobe: n ? `${n} piece${n === 1 ? '' : 's'} digitized` : 'Snap your clothes to digitize them',
      dressup: 'Tap clothes to wear them · drag & pinch to fit',
      outfits: o ? `${o} saved look${o === 1 ? '' : 's'}` : 'Your saved looks live here',
      avatar: 'Make it look like you',
    }[S.view];
  }

  function wire() {
    $$('.tabbar [data-view]').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
    document.addEventListener('click', e => {
      const g = e.target.closest('[data-goto]');
      if (g) show(g.dataset.goto);
    });
    $('#me-btn').addEventListener('click', () => show('avatar'));

    // Welcome screen
    $('#welcome-new').addEventListener('click', () => showWelcome('create'));
    $('#welcome-back').addEventListener('click', () => showWelcome('pick'));
    $('#welcome-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#welcome-name').value.trim();
      if (!name) { toast('Please enter your name'); $('#welcome-name').focus(); return; }
      if (!pickedGender) { toast('Please choose one of the options'); return; }
      createProfile(name, pickedGender);
    });

    for (const id of ['#input-camera', '#input-upload']) {
      $(id).addEventListener('change', e => {
        const files = [...e.target.files];
        e.target.value = '';
        handleFiles(files);
      });
    }
    // Desktop drag & drop
    document.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    document.addEventListener('drop', e => {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      if (S.profile) handleFiles([...e.dataTransfer.files]);
    });

    $('#act-shuffle').addEventListener('click', shuffle);
    $('#act-clear').addEventListener('click', () => Stage.clear());
    $('#act-save').addEventListener('click', saveOutfit);
    $('#act-share').addEventListener('click', shareLook);

    $('#item-cat').append(...CATEGORIES.map(c => el('option', { value: c.id }, c.one)));

    // Click on backdrop closes dialogs
    $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close('cancel'); }));
  }

  /* ---------- adding clothes ---------- */
  async function handleFiles(files) {
    files = files.filter(f => !f.type || f.type.startsWith('image/'));
    if (!files.length || !S.profile) return;
    for (let i = 0; i < files.length; i++) {
      let res;
      try {
        res = await Editor.open(files[i], {
          category: S.filter !== 'all' ? S.filter : 'top',
          counter: files.length > 1 ? `Photo ${i + 1} of ${files.length}` : '',
        });
      } catch (err) {
        console.error(err);
        toast('Couldn’t read that image');
        continue;
      }
      if (!res) continue;
      const count = S.items.filter(x => x.category === res.category).length;
      const it = {
        id: uid(),
        profileId: S.profile.id,
        name: res.name || `${CAT[res.category].one} ${count + 1}`,
        category: res.category,
        blob: res.blob, w: res.w, h: res.h,
        createdAt: Date.now(),
      };
      try { await DB.put('items', it); } catch (e) { console.error(e); toast('Couldn’t save – storage full?'); continue; }
      S.items.unshift(hydrate(it));
      renderWardrobe();
      toast(`${it.name} added to your wardrobe`);
    }
  }

  /* ---------- wardrobe ---------- */
  function chips(container, active, onPick) {
    const counts = {};
    S.items.forEach(i => { counts[i.category] = (counts[i.category] || 0) + 1; });
    container.replaceChildren(
      el('button', { class: 'chip' + (active === 'all' ? ' active' : ''), onclick: () => onPick('all') },
        'All', el('span', { class: 'n' }, String(S.items.length))),
      ...CATEGORIES.map(c => el('button', { class: 'chip' + (active === c.id ? ' active' : ''), onclick: () => onPick(c.id) },
        c.label, el('span', { class: 'n' }, String(counts[c.id] || 0)))),
    );
  }

  function renderWardrobe() {
    chips($('#wardrobe-filters'), S.filter, f => { S.filter = f; renderWardrobe(); });
    const list = S.items.filter(i => S.filter === 'all' || i.category === S.filter);
    $('#wardrobe-grid').replaceChildren(...list.map(it =>
      el('button', { class: 'card', onclick: () => openItem(it) },
        el('div', { class: 'thumb' }, el('img', { src: it.url, alt: it.name, loading: 'lazy' })),
        el('div', { class: 'meta' },
          el('span', { class: 'name' }, it.name),
          el('span', { class: 'sub' }, CAT[it.category] ? CAT[it.category].one : '')))));
    $('#wardrobe-empty').hidden = S.items.length > 0;
    $('#wardrobe-filters').hidden = S.items.length === 0;
    if (S.items.length && !list.length) {
      $('#wardrobe-grid').append(el('p', { class: 'muted' }, 'No pieces in this category yet. Tap the camera to add one.'));
    }
    updateSub();
  }

  function openItem(it) {
    const d = $('#item-dialog');
    $('#item-img').src = it.url;
    $('#item-name').value = it.name;
    $('#item-cat').value = it.category;
    d.returnValue = '';
    d.onclose = async () => {
      const name = $('#item-name').value.trim() || it.name;
      const category = $('#item-cat').value;
      if (name !== it.name || category !== it.category) {
        it.name = name;
        it.category = category;
        DB.put('items', record(it)).catch(console.error);
        renderWardrobe();
      }
      if (d.returnValue === 'wear') {
        show('dressup');
        if (!Stage.isWorn(it.id)) Stage.wear(it);
      } else if (d.returnValue === 'delete') {
        if (await confirmDialog(`Delete “${it.name}”?`, 'It will be removed from your wardrobe. Saved outfit pictures stay.')) deleteItem(it);
      }
    };
    d.showModal();
  }

  async function deleteItem(it) {
    await DB.del('items', it.id).catch(console.error);
    S.items = S.items.filter(x => x.id !== it.id);
    S.byId.delete(it.id);
    Stage.remove(it.id);
    URL.revokeObjectURL(it.url);
    renderWardrobe();
    toast('Deleted');
  }

  /* ---------- dress up ---------- */
  function renderDrawer() {
    chips($('#drawer-filters'), S.drawer, f => { S.drawer = f; renderDrawer(); });
    const list = S.items.filter(i => S.drawer === 'all' || i.category === S.drawer);
    $('#drawer-grid').replaceChildren(...list.map(it =>
      el('button', {
        class: 'tile' + (Stage.isWorn(it.id) ? ' worn' : ''),
        title: it.name,
        'aria-pressed': String(Stage.isWorn(it.id)),
        onclick: () => Stage.wear(it),
      }, el('img', { src: it.url, alt: it.name }))));
    $('#drawer-empty').hidden = S.items.length > 0;
    $('#drawer-filters').hidden = S.items.length === 0;
  }

  function shuffle() {
    if (!S.items.length) { toast('Add some clothes first'); return; }
    const by = c => S.items.filter(i => i.category === c);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const tops = by('top'), bottoms = by('bottom'), dresses = by('dress');
    Stage.clear();
    const useDress = dresses.length && (!(tops.length && bottoms.length) || Math.random() < 0.35);
    if (useDress) Stage.wear(pick(dresses));
    else {
      if (tops.length) Stage.wear(pick(tops));
      if (bottoms.length) Stage.wear(pick(bottoms));
    }
    for (const [c, p] of [['outerwear', 0.4], ['shoes', 0.85], ['hat', 0.3], ['accessory', 0.4]]) {
      const a = by(c);
      if (a.length && Math.random() < p) Stage.wear(pick(a));
    }
    Stage.select(null);
  }

  async function saveOutfit() {
    const layers = Stage.getLayers();
    if (!layers.length) { toast('Dress your avatar first'); return; }
    const name = await askText('Name this look', `Look ${S.outfits.length + 1}`);
    if (name === null) return;
    const c = await Stage.renderCanvas(2, S.avatar);
    const thumb = await canvasToBlob(c, 'image/jpeg', 0.9);
    const o = { id: uid(), profileId: S.profile.id, name: name || `Look ${S.outfits.length + 1}`, layers, fit: Stage.getFit(), thumb, createdAt: Date.now() };
    try { await DB.put('outfits', o); } catch (e) { console.error(e); toast('Couldn’t save the look'); return; }
    S.outfits.unshift({ ...o, url: URL.createObjectURL(thumb) });
    renderOutfits();
    toast('Look saved to Outfits ♡');
  }

  async function shareLook() {
    if (!Stage.getLayers().length) { toast('Dress your avatar first'); return; }
    const c = await Stage.renderCanvas(3, S.avatar);
    shareOrDownload(await canvasToBlob(c, 'image/png'), 'my-look.png', 'My look');
  }

  /* ---------- outfits ---------- */
  function renderOutfits() {
    $('#outfits-grid').replaceChildren(...S.outfits.map(o =>
      el('button', { class: 'card', onclick: () => openOutfit(o) },
        el('div', { class: 'thumb' }, el('img', { src: o.url, alt: o.name, loading: 'lazy' })),
        el('div', { class: 'meta' },
          el('span', { class: 'name' }, o.name),
          el('span', { class: 'sub' }, new Date(o.createdAt).toLocaleDateString())))));
    $('#outfits-empty').hidden = S.outfits.length > 0;
    updateSub();
  }

  function openOutfit(o) {
    const d = $('#outfit-dialog');
    $('#outfit-img').src = o.url;
    $('#outfit-name').textContent = o.name;
    $('#outfit-date').textContent = 'Saved ' + new Date(o.createdAt).toLocaleString();
    d.returnValue = '';
    d.onclose = async () => {
      const r = d.returnValue;
      if (r === 'wear') {
        const kept = o.layers.filter(l => S.byId.has(l.itemId));
        Stage.setLayers(kept);
        if ((o.fit || 'tall') !== Stage.getFit()) Stage.refit();
        saveCurrent();
        show('dressup');
        if (kept.length < o.layers.length) toast('Some pieces were deleted from your wardrobe');
      } else if (r === 'share') {
        shareOrDownload(o.thumb, `${o.name.replace(/[^\w-]+/g, '-')}.jpg`, o.name);
      } else if (r === 'delete') {
        if (await confirmDialog(`Delete “${o.name}”?`)) {
          await DB.del('outfits', o.id).catch(console.error);
          S.outfits = S.outfits.filter(x => x.id !== o.id);
          URL.revokeObjectURL(o.url);
          renderOutfits();
        }
      }
    };
    d.showModal();
  }

  /* ---------- avatar ---------- */
  function buildAvatarEditor() {
    if (!S.profile) return;
    const set = (key, val) => {
      S.avatar[key] = val;
      if (key === 'gender') {
        S.profile.gender = val;
        DB.put('settings', S.profiles, 'profiles').catch(console.error);
      }
      saveAvatar();
      const before = Stage.getFit();
      Stage.setAvatar(S.avatar);
      if (Stage.getFit() !== before && Stage.getLayers().length) Stage.refit();
      updateMe();
      buildAvatarEditor();
    };
    const swatches = (title, key, colors) => el('div', { class: 'ctrl' },
      el('h3', {}, title),
      el('div', { class: 'swatches' }, colors.map(c => el('button', {
        class: 'swatch' + (S.avatar[key] === c ? ' active' : ''),
        style: `background:${c}`, 'aria-label': `${title} ${c}`, onclick: () => set(key, c),
      }))));
    const textOptions = (title, key, opts) => el('div', { class: 'ctrl' }, el('h3', {}, title),
      el('div', { class: 'options' }, opts.map(o => el('button', {
        class: 'option text' + (S.avatar[key] === o.id ? ' active' : ''), onclick: () => set(key, o.id),
      }, o.label))));
    const headOptions = (title, key, opts) => el('div', { class: 'ctrl' }, el('h3', {}, title),
      el('div', { class: 'options' }, opts.map(o => el('button', {
        class: 'option' + (S.avatar[key] === o.id ? ' active' : ''), onclick: () => set(key, o.id),
        html: Avatar.svg({ ...S.avatar, [key]: o.id }, Avatar.headBox(S.avatar)) + `<span>${o.label}</span>`,
      }))));

    $('#avatar-preview').innerHTML = Avatar.svg(S.avatar);
    $('#avatar-controls').replaceChildren(
      el('div', { class: 'profile-card' },
        el('div', {}, el('strong', {}, S.profile.name), el('span', { class: 'muted' }, 'Signed in on this device')),
        el('div', { class: 'row' },
          el('button', { class: 'btn small', onclick: switchProfile }, 'Switch profile'),
          el('button', { class: 'btn small danger-ghost', onclick: deleteProfile }, 'Delete'))),
      textOptions('Style', 'style', Avatar.STYLES),
      textOptions('Gender', 'gender', Avatar.GENDERS),
      swatches('Skin tone', 'skin', Avatar.SKIN),
      textOptions('Body', 'body', Avatar.BODIES),
      headOptions('Hair style', 'hairStyle', Avatar.HAIR_STYLES),
      swatches('Hair colour', 'hairColor', Avatar.HAIR_COLORS),
      headOptions('Facial hair', 'facial', Avatar.FACIAL),
      swatches('Eyes', 'eyes', Avatar.EYES),
      swatches('Basics', 'under', Avatar.UNDER),
    );
  }

  return { start };
})();

App.start();
