(function () {
  'use strict';

  var KEYS = { history: 'kikiprompt.history.v1', chars: 'kikiprompt.chars.v1', platform: 'kikiprompt.platform.v1', draft: 'kikiprompt.draft.v1', theme: 'kikiprompt.theme.v1', mine: 'kikiprompt.mypresets.v1' };
  var MAX_ITEMS = 10, MAX_HISTORY = 100, MAX_CHARS = 30, LONG_PROMPT = 1500;
  var PLATFORMS = (window.KIKIPROMPT_PLATFORMS && window.KIKIPROMPT_PLATFORMS.length) ? window.KIKIPROMPT_PLATFORMS :
    [{ id: 'generic', name: 'Umum', note: '', aspects: null, maxSeconds: 0, refTemplate: '' }];
  var ASPECTS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
  var RESOLUTIONS = ['720p', '1080p', '4K'];

  var state = {
    mode: 'video', lang: 'id', format: 'label', platform: PLATFORMS[0].id, splitN: 2,
    values: { video: {}, character: {}, scene: {} }
  };

  /* ---------- Penyimpanan ---------- */
  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  /* ---------- Definisi kolom ---------- */
  function aspectOptions() { var p = getProfile(); return p.aspects || ASPECTS; }

  var F_ASPECT = { k: 'aspect', id: 'Rasio aspek', en: 'Aspect ratio', type: 'combo', optionsFn: aspectOptions, ph: '16:9', hint: 'Contoh: 16:9 untuk layar lebar, 9:16 untuk video vertikal.' };
  var F_RES = { k: 'resolution', id: 'Resolusi', en: 'Resolution', type: 'combo', options: RESOLUTIONS, hint: '' };
  var F_NEG = { k: 'negative', id: 'Hal yang dihindari', en: 'Avoid', type: 'textarea', ph: 'teks di layar, logo, tangan cacat', hint: 'Unsur yang tidak boleh muncul dalam hasil.' };

  var MODES = {
    video: {
      title: 'Prompt video',
      desc: 'Gunakan format ini untuk satu klip video utuh. Semakin spesifik setiap kolom, semakin terarah hasil yang dibuat oleh aplikasi video AI.',
      guide: [
        'Tulis satu subjek utama per klip. Subjek yang terlalu banyak membuat hasil kurang konsisten.',
        'Pada kolom Aksi, gunakan kata kerja yang jelas, misalnya "berjalan pelan menyusuri pantai".',
        'Pilih satu gerakan kamera saja. Menggabungkan beberapa gerakan sering membuat gambar tidak stabil.',
        'Klip 5 sampai 10 detik paling stabil. Untuk cerita panjang, gunakan tab Scene bertahap.',
        'Gunakan tombol Tambah subjek atau Tambah background bila video memuat lebih dari satu.',
        'Pakai preset sebagai contoh awal, lalu ubah isinya sesuai kebutuhan Anda.'
      ],
      fields: [
        { k: 'style', id: 'Type video', en: 'Video style', type: 'combo', options: ['Drama / live action', 'Sinematik', 'Dokumenter', 'Iklan komersial', 'Animasi 3D', 'Anime', 'Vlog'], hint: 'Gaya visual keseluruhan video.' },
        { k: 'subject', id: 'Subjek', en: 'Subject', type: 'multi', input: 'textarea', addText: 'Tambah subjek', ph: 'Perempuan Asia usia 25 tahun, jaket abu-abu', hint: 'Siapa atau apa yang tampil: jenis kelamin, wajah (Asia, Western, Chinese), pakaian, aksesoris.' },
        { k: 'action', id: 'Aksi / gerakan', en: 'Action', type: 'textarea', ph: 'duduk di dekat jendela lalu menatap hujan', hint: 'Apa yang dilakukan subjek selama video berlangsung.' },
        { k: 'expression', id: 'Ekspresi', en: 'Expression', type: 'text', ph: 'tersenyum tenang', hint: 'Contoh: tersenyum tenang, terkejut, serius.' },
        { k: 'background', id: 'Background', en: 'Background', type: 'multi', input: 'text', addText: 'Tambah background', ph: 'kamar apartemen, hujan di luar', hint: 'Lokasi atau latar tempat kejadian.' },
        { k: 'camera', id: 'Gerakan kamera', en: 'Camera movement', type: 'combo', options: ['Static shot', 'Slow push-in', 'Pan kiri ke kanan', 'Tracking shot', 'Handheld', 'Close-up', 'Wide shot', 'Drone / aerial'], hint: 'Pilih dari daftar atau ketik sendiri.' },
        { k: 'lighting', id: 'Pencahayaan & suasana', en: 'Lighting & mood', type: 'combo', options: ['Golden hour', 'Cahaya alami lembut', 'Low-key dramatis', 'Neon malam hari', 'Mendung, lembut'], hint: 'Arah cahaya dan nuansa emosi.' },
        { k: 'audio', id: 'Audio / dialog', en: 'Audio / dialogue', type: 'textarea', hint: 'Kosongkan jika video tanpa suara.' },
        { k: 'duration', id: 'Durasi', en: 'Duration', type: 'combo', options: ['5 detik', '8 detik', '10 detik', '15 detik'], hint: '' },
        F_ASPECT, F_RES, F_NEG,
        { k: 'extra', id: 'Detail tambahan', en: 'Additional details', type: 'textarea', hint: 'Tekstur, cuaca, atau elemen khusus.' }
      ]
    },
    character: {
      title: 'Karakter / model',
      desc: 'Gunakan format ini untuk membuat gambar karakter yang nantinya dipakai sebagai referensi pada video.',
      guide: [
        'Gunakan latar putih, hijau, atau polos agar karakter mudah dipakai ulang sebagai gambar referensi.',
        'Deskripsikan pakaian dari atas ke bawah: atasan, bawahan, alas kaki.',
        'Untuk konsistensi antar-video, simpan satu gambar karakter dan pakai gambar yang sama setiap kali.',
        'Pose menghadap depan cocok sebagai referensi wajah; pose samping membantu menunjukkan siluet.',
        'Setelah puas, pilih Simpan karakter. Deskripsinya dapat disisipkan ke tab Prompt video atau Scene bertahap.'
      ],
      fields: [
        { k: 'gender', id: 'Gender', en: 'Gender', type: 'combo', options: ['Laki-laki', 'Perempuan'], hint: '' },
        { k: 'face', id: 'Tipe wajah', en: 'Face type', type: 'combo', options: ['Asia', 'Western', 'Chinese', 'Indonesia'], hint: '' },
        { k: 'age', id: 'Perkiraan usia', en: 'Approximate age', type: 'text', ph: '25 tahun', hint: 'Contoh: 25 tahun.' },
        { k: 'outfit', id: 'Pakaian yang dipakai', en: 'Clothing', type: 'textarea', ph: 'blazer hitam, kemeja putih, rok hitam', hint: '' },
        { k: 'accessories', id: 'Aksesoris yang dipakai', en: 'Accessories', type: 'text', hint: 'Kacamata, jam tangan, topi, dan sebagainya.' },
        { k: 'background', id: 'Background', en: 'Background', type: 'combo', options: ['Putih', 'Hijau (green screen)', 'Blank / polos'], hint: '' },
        { k: 'pose', id: 'Posisi', en: 'Pose', type: 'combo', options: ['Menghadap depan', 'Menghadap samping', 'Menghadap belakang', 'Tiga perempat'], hint: '' },
        { k: 'render', id: 'Gaya gambar', en: 'Image style', type: 'combo', options: ['Foto realistis', 'Ilustrasi', 'Render 3D'], hint: '' },
        F_NEG,
        { k: 'extra', id: 'Detail tambahan', en: 'Additional details', type: 'textarea', hint: '' }
      ]
    },
    scene: {
      title: 'Scene bertahap',
      desc: 'Gunakan format ini untuk video dengan beberapa model dan aktivitas yang berubah menurut rentang waktu.',
      guide: [
        'Tulis referensi model dengan jelas, misalnya "gambar 1" dan "gambar 2", sesuai urutan unggahan Anda.',
        'Bagi durasi menjadi rentang yang tidak saling tumpang tindih, misalnya 1-5 detik lalu 6-10 detik.',
        'Satu rentang waktu sebaiknya berisi satu aktivitas utama.',
        'Isi Durasi total, lalu pakai Bagi otomatis agar rentang waktu tersusun rapi.',
        'Gunakan Tambah model atau Tambah background untuk menambah jumlahnya (maksimal 10 per kolom).'
      ],
      fields: [
        { k: 'type', id: 'Type', en: 'Type', type: 'combo', options: ['Drama / live action', 'Sinematik', 'Iklan komersial'], hint: '' },
        { k: 'models', id: 'Model', en: 'Model', type: 'multi', input: 'text', numbered: true, init: 2, addText: 'Tambah model', ph: 'gambar 1, perempuan berjaket biru', hint: 'Contoh: gambar 1, perempuan berjaket biru.' },
        { k: 'camera', id: 'Kamera', en: 'Camera', type: 'combo', options: ['Sesuaikan scene', 'Static shot', 'Tracking shot', 'Handheld'], hint: '' },
        { k: 'background', id: 'Background', en: 'Background', type: 'multi', input: 'text', addText: 'Tambah background', ph: 'kafe dengan jendela besar', hint: 'Lokasi atau gambar latar.' },
        { k: 'duration', id: 'Durasi total', en: 'Total duration', type: 'combo', options: ['5 detik', '10 detik', '15 detik'], hint: 'Dipakai oleh Bagi otomatis dan pemeriksa prompt.' },
        F_ASPECT, F_RES, F_NEG
      ]
    }
  };

  var PRESETS = {
    video: [
      { name: 'Drama emosional', values: { style: 'Drama / live action', subject: ['Perempuan Asia usia 25 tahun, mengenakan jaket abu-abu'], action: 'duduk di dekat jendela, menatap hujan lalu menghela napas pelan', expression: 'sedih namun tenang', background: ['Kamar apartemen dengan jendela besar, hujan di luar'], camera: 'Slow push-in', lighting: 'Mendung, lembut', duration: '8 detik', aspect: '16:9', negative: 'teks di layar, logo, tangan cacat' } },
      { name: 'Iklan produk', values: { style: 'Iklan komersial', subject: ['Botol minum stainless berwarna biru di atas meja kayu'], action: 'kamera bergerak pelan mendekati produk, tetesan embun terlihat di permukaan botol', background: ['Studio bersih dengan latar abu-abu muda'], camera: 'Slow push-in', lighting: 'Cahaya alami lembut', duration: '5 detik', aspect: '1:1', negative: 'teks di layar, logo merek lain' } },
      { name: 'Vlog harian', values: { style: 'Vlog', subject: ['Laki-laki Indonesia usia 22 tahun, kaus putih, memegang kamera'], action: 'berjalan sambil berbicara ke arah kamera', expression: 'ceria', background: ['Jalan kota di pagi hari'], camera: 'Handheld', lighting: 'Golden hour', duration: '10 detik', aspect: '9:16', negative: 'teks di layar' } }
    ],
    character: [
      { name: 'Model perempuan formal', values: { gender: 'Perempuan', face: 'Asia', age: '25 tahun', outfit: 'blazer hitam, kemeja putih, rok hitam selutut', accessories: 'anting kecil', background: 'Putih', pose: 'Menghadap depan', render: 'Foto realistis', negative: 'teks, watermark' } },
      { name: 'Model laki-laki kasual', values: { gender: 'Laki-laki', face: 'Indonesia', age: '27 tahun', outfit: 'kaus putih polos, celana jeans biru, sepatu kets putih', accessories: 'jam tangan hitam', background: 'Putih', pose: 'Menghadap depan', render: 'Foto realistis', negative: 'teks, watermark' } }
    ],
    scene: [
      { name: 'Dialog dua orang', values: { type: 'Drama / live action', models: ['gambar 1, perempuan berjaket biru', 'gambar 2, laki-laki berkemeja putih'], camera: 'Sesuaikan scene', background: ['Kafe dengan jendela besar'], duration: '10 detik', aspect: '16:9', negative: 'teks di layar', rows: [{ range: '1-5', text: 'Model 1 dan Model 2 duduk berhadapan lalu saling menyapa' }, { range: '6-10', text: 'Model 2 tertawa, Model 1 menyerahkan secangkir kopi' }] } }
    ]
  };

  /* ---------- Utilitas ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function label(f) { return state.lang === 'en' ? f.en : f.id; }
  function clean(v) { return (v || '').replace(/\s+/g, ' ').trim(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fieldOf(mode, k) { var fs = MODES[mode].fields; for (var i = 0; i < fs.length; i++) if (fs[i].k === k) return fs[i]; return null; }
  function getProfile() { for (var i = 0; i < PLATFORMS.length; i++) if (PLATFORMS[i].id === state.platform) return PLATFORMS[i]; return PLATFORMS[0]; }
  function defaultRows() { return [{ range: '1-5', text: '' }, { range: '6-10', text: '' }]; }
  function freshValues(mode) { return mode === 'scene' ? { rows: defaultRows() } : {}; }
  function secondsOf(v) { var m = /(\d+)/.exec(v || ''); return m ? parseInt(m[1], 10) : 0; }

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === 'text') e.textContent = props[k];
      else if (k === 'class') e.className = props[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), props[k]);
      else e.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function getList(vals, f) {
    if (!Array.isArray(vals[f.k])) vals[f.k] = typeof vals[f.k] === 'string' && vals[f.k] ? [vals[f.k]] : [];
    var min = f.init || 1;
    while (vals[f.k].length < min) vals[f.k].push('');
    return vals[f.k];
  }

  /* ---------- Toolbar: platform, preset, perpustakaan karakter ---------- */
  function renderToolbar() {
    var tb = $('#toolbar');
    tb.innerHTML = '';

    var pSel = h('select', { id: 'sel-platform' });
    PLATFORMS.forEach(function (p) {
      var o = h('option', { value: p.id, text: p.name });
      if (p.id === state.platform) o.selected = true;
      pSel.appendChild(o);
    });
    pSel.addEventListener('change', function () {
      state.platform = pSel.value;
      writeJSON(KEYS.platform, state.platform);
      renderForm();
    });
    tb.appendChild(h('div', { class: 'tool-row' }, [h('label', { for: 'sel-platform', text: 'Profil platform' }), pSel]));
    var note = getProfile().note;
    if (note) tb.appendChild(h('p', { class: 'tool-note', text: note }));

    var preSel = h('select', { id: 'sel-preset' });
    preSel.appendChild(h('option', { value: '', text: 'Pilih preset' }));
    allPresets().forEach(function (p, i) { preSel.appendChild(h('option', { value: String(i), text: p.name })); });
    var applyBtn = h('button', { type: 'button', class: 'btn small', text: 'Terapkan preset' });
    applyBtn.addEventListener('click', function () {
      if (preSel.value === '') { setStatus('Pilih salah satu preset terlebih dahulu.'); return; }
      state.values[state.mode] = clone(allPresets()[parseInt(preSel.value, 10)].values);
      if (state.mode === 'scene' && !state.values.scene.rows) state.values.scene.rows = defaultRows();
      renderForm();
      setStatus('Preset diterapkan. Silakan ubah isinya sesuai kebutuhan.');
    });
    tb.appendChild(h('div', { class: 'tool-row' }, [h('label', { for: 'sel-preset', text: 'Preset' }), preSel, applyBtn]));
    var saveP = h('button', { type: 'button', class: 'btn small', text: 'Simpan sebagai preset' });
    saveP.addEventListener('click', saveMyPreset);
    var delP = h('button', { type: 'button', class: 'btn ghost small', text: 'Hapus preset saya' });
    delP.addEventListener('click', function () { deleteMyPreset(preSel.value); });
    var rndB = h('button', { type: 'button', class: 'btn small', text: 'Acak ide' });
    rndB.addEventListener('click', onRandom);
    tb.appendChild(h('div', { class: 'tool-row' }, [saveP, delP, rndB]));

    var chars = readJSON(KEYS.chars, []);
    if (state.mode === 'character') {
      var nameIn = h('input', { type: 'text', id: 'char-name', placeholder: 'Nama karakter, misalnya Sinta', maxlength: '40' });
      var saveBtn = h('button', { type: 'button', class: 'btn small', text: 'Simpan karakter' });
      saveBtn.addEventListener('click', function () { saveCharacter(nameIn.value); });
      tb.appendChild(h('div', { class: 'tool-row' }, [h('label', { for: 'char-name', text: 'Perpustakaan karakter' }), nameIn, saveBtn]));
    } else {
      var cSel = h('select', { id: 'sel-char' });
      cSel.appendChild(h('option', { value: '', text: chars.length ? 'Pilih karakter tersimpan' : 'Belum ada karakter tersimpan' }));
      chars.forEach(function (c) { cSel.appendChild(h('option', { value: String(c.id), text: c.name })); });
      var insBtn = h('button', { type: 'button', class: 'btn small', text: 'Sisipkan' });
      insBtn.addEventListener('click', function () { insertCharacter(cSel.value); });
      var delBtn = h('button', { type: 'button', class: 'btn ghost small', text: 'Hapus karakter' });
      delBtn.addEventListener('click', function () { deleteCharacter(cSel.value); });
      tb.appendChild(h('div', { class: 'tool-row' }, [h('label', { for: 'sel-char', text: 'Karakter' }), cSel, insBtn, delBtn]));
    }
  }

  function characterText() {
    var v = state.values.character, parts = [];
    ['gender', 'face', 'age', 'outfit', 'accessories'].forEach(function (k) {
      var t = clean(v[k]);
      if (t) parts.push(k === 'face' ? 'wajah ' + t : t);
    });
    return parts.join(', ');
  }

  function saveCharacter(name) {
    name = clean(name);
    var text = characterText();
    if (!name) { setStatus('Beri nama karakter terlebih dahulu.'); return; }
    if (!text) { setStatus('Isi data karakter terlebih dahulu.'); return; }
    var chars = readJSON(KEYS.chars, []);
    chars.unshift({ id: Date.now(), name: name, text: text });
    if (writeJSON(KEYS.chars, chars.slice(0, MAX_CHARS))) { setStatus('Karakter "' + name + '" tersimpan.'); renderToolbar(); }
    else setStatus('Karakter tidak dapat disimpan di peramban ini.');
  }

  function findChar(id) {
    var chars = readJSON(KEYS.chars, []);
    for (var i = 0; i < chars.length; i++) if (String(chars[i].id) === String(id)) return chars[i];
    return null;
  }

  function insertCharacter(id) {
    var c = id && findChar(id);
    if (!c) { setStatus('Pilih karakter terlebih dahulu.'); return; }
    var f = fieldOf(state.mode, state.mode === 'scene' ? 'models' : 'subject');
    var list = getList(state.values[state.mode], f);
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (!clean(list[i])) { idx = i; break; }
    if (idx < 0) {
      if (list.length >= MAX_ITEMS) { setStatus('Jumlah ' + f.id.toLowerCase() + ' sudah mencapai batas.'); return; }
      list.push(''); idx = list.length - 1;
    }
    list[idx] = c.text;
    renderForm();
    setStatus('Karakter "' + c.name + '" disisipkan.');
  }

  function deleteCharacter(id) {
    var c = id && findChar(id);
    if (!c) { setStatus('Pilih karakter yang akan dihapus.'); return; }
    if (!window.confirm('Hapus karakter "' + c.name + '"?')) return;
    writeJSON(KEYS.chars, readJSON(KEYS.chars, []).filter(function (x) { return String(x.id) !== String(id); }));
    renderToolbar();
    setStatus('Karakter dihapus.');
  }

  /* ---------- Render formulir ---------- */
  function renderForm() {
    var mode = MODES[state.mode];
    $('#mode-title').textContent = mode.title;
    $('#mode-desc').textContent = mode.desc;
    renderToolbar();
    var form = $('#form');
    form.innerHTML = '';
    var vals = state.values[state.mode];

    mode.fields.forEach(function (f) {
      if (f.type === 'multi') { renderMulti(form, f, vals); return; }
      var wrap = document.createElement('div');
      wrap.className = 'field';
      var id = 'f-' + state.mode + '-' + f.k;

      var lab = document.createElement('label');
      lab.setAttribute('for', id);
      lab.textContent = f.id;
      wrap.appendChild(lab);

      if (f.hint) {
        var hint = document.createElement('span');
        hint.className = 'hint';
        hint.id = id + '-hint';
        hint.textContent = f.hint;
        wrap.appendChild(hint);
      }

      var el;
      if (f.type === 'textarea') {
        el = document.createElement('textarea');
      } else {
        el = document.createElement('input');
        el.type = 'text';
        if (f.type === 'combo') {
          var dl = document.createElement('datalist');
          dl.id = id + '-list';
          (f.optionsFn ? f.optionsFn() : f.options).forEach(function (o) {
            var op = document.createElement('option');
            op.value = o;
            dl.appendChild(op);
          });
          wrap.appendChild(dl);
          el.setAttribute('list', dl.id);
        }
      }
      el.id = id;
      if (f.ph) el.setAttribute('placeholder', f.ph);
      if (f.hint) el.setAttribute('aria-describedby', id + '-hint');
      el.value = typeof vals[f.k] === 'string' ? vals[f.k] : '';
      el.addEventListener('input', function () { vals[f.k] = el.value; build(); });
      wrap.appendChild(el);
      var chips = f.type === 'combo' ? (f.optionsFn ? f.optionsFn() : f.options) : KEYWORDS[f.k];
      if (chips && chips.length && (f.type === 'combo' || f.type === 'textarea')) {
        var cbox = h('div', { class: 'chips', role: 'group', 'aria-label': 'Pilihan cepat ' + f.id });
        chips.forEach(function (c) {
          var cb = h('button', { type: 'button', class: 'chip', text: c });
          cb.addEventListener('click', function () {
            var cur = clean(el.value);
            el.value = f.type === 'combo' || !cur ? c : (cur.indexOf(c) >= 0 ? cur : cur + ', ' + c);
            vals[f.k] = el.value;
            build();
          });
          cbox.appendChild(cb);
        });
        wrap.appendChild(cbox);
      }
      form.appendChild(wrap);
    });

    if (state.mode === 'scene') renderRows(form);
    renderGuide();
    build();
  }

  function renderMulti(form, f, vals) {
    var list = getList(vals, f);
    var base = 'f-' + state.mode + '-' + f.k;

    var fs = document.createElement('fieldset');
    fs.className = 'field multi';
    var lg = document.createElement('legend');
    lg.textContent = f.id + (f.numbered || list.length > 1 ? ' (' + list.length + ')' : '');
    fs.appendChild(lg);
    if (f.hint) {
      var hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = f.hint;
      fs.appendChild(hint);
    }

    list.forEach(function (val, i) {
      var item = document.createElement('div');
      item.className = 'multi-item';
      var id = base + '-' + i;

      var l = document.createElement('label');
      l.setAttribute('for', id);
      l.textContent = f.id + (f.numbered || list.length > 1 ? ' ' + (i + 1) : '');
      item.appendChild(l);

      var line = document.createElement('div');
      line.className = 'multi-line';
      var el = document.createElement(f.input === 'textarea' ? 'textarea' : 'input');
      if (f.input !== 'textarea') el.type = 'text';
      el.id = id;
      if (f.ph) el.setAttribute('placeholder', f.ph);
      el.value = val;
      el.addEventListener('input', function () { list[i] = el.value; build(); });
      line.appendChild(el);

      if (list.length > 1) {
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn ghost small';
        del.textContent = 'Hapus';
        del.setAttribute('aria-label', 'Hapus ' + f.id + ' ' + (i + 1));
        del.addEventListener('click', function () { list.splice(i, 1); renderForm(); });
        line.appendChild(del);
      }
      item.appendChild(line);
      fs.appendChild(item);
    });

    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn small';
    add.textContent = f.addText || 'Tambah';
    if (list.length >= MAX_ITEMS) { add.disabled = true; add.title = 'Maksimal ' + MAX_ITEMS + ' item'; }
    add.addEventListener('click', function () {
      list.push('');
      renderForm();
      var el = document.getElementById(base + '-' + (list.length - 1));
      if (el) el.focus();
    });
    fs.appendChild(add);
    form.appendChild(fs);
  }

  function splitDuration(n) {
    var vals = state.values.scene;
    var total = secondsOf(vals.duration);
    if (!total) { setStatus('Isi Durasi total terlebih dahulu, misalnya 10 detik.'); return; }
    n = Math.max(1, Math.min(MAX_ITEMS, n || 2));
    if (n > total) n = total;
    var size = Math.ceil(total / n), start = 1, rows = [], old = vals.rows || [];
    for (var i = 0; i < n && start <= total; i++) {
      var end = Math.min(total, start + size - 1);
      rows.push({ range: start + '-' + end, text: old[i] ? old[i].text : '' });
      start = end + 1;
    }
    vals.rows = rows;
    state.splitN = n;
    renderForm();
    setStatus('Durasi dibagi menjadi ' + rows.length + ' rentang waktu.');
  }

  function renderRows(form) {
    var vals = state.values.scene;
    if (!vals.rows || !vals.rows.length) vals.rows = defaultRows();

    form.appendChild(h('p', { class: 'rows-title', text: 'Aktivitas per rentang waktu (detik)' }));

    var nIn = h('input', { type: 'number', id: 'split-n', min: '1', max: String(MAX_ITEMS), value: String(state.splitN) });
    var splitBtn = h('button', { type: 'button', class: 'btn small', text: 'Bagi otomatis' });
    splitBtn.addEventListener('click', function () { splitDuration(parseInt(nIn.value, 10)); });
    form.appendChild(h('div', { class: 'tool-row', style: 'margin-bottom:12px' }, [
      h('label', { for: 'split-n', text: 'Bagi durasi total menjadi' }), nIn, h('span', { text: 'bagian' }), splitBtn
    ]));

    form.appendChild(h('p', { class: 'tool-note', id: 'timeline-cap' }));
    form.appendChild(h('div', { id: 'timeline', class: 'timeline', 'aria-hidden': 'true' }));
    var box = document.createElement('div');
    box.className = 'rows';
    vals.rows.forEach(function (row, i) {
      var r = document.createElement('div');
      r.className = 'row';

      var left = document.createElement('div');
      var rl = document.createElement('label');
      rl.className = 'range-label';
      rl.setAttribute('for', 'range-' + i);
      rl.textContent = 'Rentang';
      var ri = document.createElement('input');
      ri.type = 'text';
      ri.id = 'range-' + i;
      ri.value = row.range;
      ri.placeholder = '1-5';
      ri.addEventListener('input', function () { row.range = ri.value; build(); });
      left.appendChild(rl);
      left.appendChild(ri);

      var mid = document.createElement('div');
      var tl = document.createElement('label');
      tl.className = 'range-label';
      tl.setAttribute('for', 'act-' + i);
      tl.textContent = 'Aktivitas';
      var ta = document.createElement('textarea');
      ta.id = 'act-' + i;
      ta.value = row.text;
      ta.addEventListener('input', function () { row.text = ta.value; build(); });
      mid.appendChild(tl);
      mid.appendChild(ta);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn ghost small';
      del.textContent = 'Hapus';
      del.setAttribute('aria-label', 'Hapus rentang ' + (row.range || (i + 1)));
      del.addEventListener('click', function () { vals.rows.splice(i, 1); renderForm(); });

      r.appendChild(left);
      r.appendChild(mid);
      r.appendChild(del);
      box.appendChild(r);
    });
    form.appendChild(box);

    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn';
    add.textContent = 'Tambah rentang waktu';
    add.addEventListener('click', function () {
      var last = vals.rows[vals.rows.length - 1];
      var next = '';
      if (last) {
        var m = /(\d+)\s*$/.exec(last.range);
        if (m) { var s = parseInt(m[1], 10) + 1; next = s + '-' + (s + 4); }
      }
      vals.rows.push({ range: next, text: '' });
      renderForm();
      var inputs = $$('.row input[type=text]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });
    form.appendChild(add);
  }

  function renderGuide() {
    var ul = $('#guide-list');
    ul.innerHTML = '';
    MODES[state.mode].guide.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
  }

  /* ---------- Susun prompt ---------- */
  function sceneWord() { return state.lang === 'en' ? 'seconds' : 'detik'; }

  function composeLabeled() {
    var mode = MODES[state.mode];
    var vals = state.values[state.mode];
    var profile = getProfile();
    var lines = [];

    mode.fields.forEach(function (f) {
      if (f.type === 'multi') {
        var list = getList(vals, f);
        list.forEach(function (item, i) {
          var t = clean(item);
          if (!t) return;
          var lb = label(f) + ((f.numbered || list.length > 1) ? ' ' + (i + 1) : '');
          if (state.mode === 'scene' && f.k === 'models' && profile.refTemplate) {
            lb += ' (' + profile.refTemplate.replace('{n}', String(i + 1)) + ')';
          }
          lines.push(lb + ': ' + t);
        });
        return;
      }
      var v = clean(vals[f.k]);
      if (v) lines.push(label(f) + ': ' + v);
    });

    if (state.mode === 'scene') {
      var rows = (vals.rows || []).filter(function (r) { return clean(r.text); });
      if (rows.length) {
        lines.push('');
        lines.push('SCENE:');
        rows.forEach(function (r) {
          var range = clean(r.range);
          lines.push((range ? range + ' ' + sceneWord() + ': ' : '') + clean(r.text));
        });
      }
    }
    return lines.join('\n').replace(/^\n+|\n+$/g, '');
  }

  /* ---------- Format paragraf ---------- */
  function sentence(t) {
    t = clean(t);
    if (!t) return '';
    t = t.replace(/[\s.;:,]+$/, '');
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }

  function joinList(arr) {
    var w = state.lang === 'en' ? 'and' : 'dan';
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return arr[0] + ' ' + w + ' ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', ' + w + ' ' + arr[arr.length - 1];
  }

  function listOf(vals, f) { return getList(vals, f).map(clean).filter(Boolean); }

  function composeProse() {
    var en = state.lang === 'en';
    var vals = state.values[state.mode], profile = getProfile(), out = [];
    function T(idText, enText) { return en ? enText : idText; }
    function push(s) { s = sentence(s); if (s) out.push(s); }
    function pushField(k, idPre, enPre) {
      var v = clean(vals[k]);
      if (v) push(T(idPre, enPre) + v);
    }
    function pushTech() {
      var bits = [], d = clean(vals.duration), a = clean(vals.aspect), r = clean(vals.resolution);
      if (d) bits.push(T('durasi ', 'duration ') + d);
      if (a) bits.push(T('rasio aspek ', 'aspect ratio ') + a);
      if (r) bits.push(T('resolusi ', 'resolution ') + r);
      if (bits.length) push(bits.join(', '));
    }

    if (state.mode === 'video') {
      var style = clean(vals.style), act = clean(vals.action);
      var subs = listOf(vals, fieldOf('video', 'subject'));
      var bgs = listOf(vals, fieldOf('video', 'background'));
      if (style) push(en ? style + ' style video' : 'Video bergaya ' + style);
      if (subs.length) push(T('Menampilkan ', 'Featuring ') + joinList(subs) + (act ? T(', yang ', ', ') + act : ''));
      else if (act) push(act);
      pushField('expression', 'Ekspresi ', 'Expression: ');
      if (bgs.length) push(T('Berlatar ', 'Set in ') + joinList(bgs));
      pushField('camera', 'Gerakan kamera: ', 'Camera movement: ');
      pushField('lighting', 'Pencahayaan dan suasana: ', 'Lighting and mood: ');
      pushField('audio', 'Audio: ', 'Audio: ');
      pushTech();
      pushField('negative', 'Hindari ', 'Avoid ');
      pushField('extra', '', '');
    } else if (state.mode === 'character') {
      var ct = characterText();
      if (ct) push(T('Karakter: ', 'Character: ') + ct);
      pushField('pose', 'Pose ', 'Pose: ');
      pushField('background', 'Latar belakang ', 'Background: ');
      pushField('render', 'Gaya gambar: ', 'Image style: ');
      pushField('negative', 'Hindari ', 'Avoid ');
      pushField('extra', '', '');
    } else {
      var type = clean(vals.type), models = [], sbgs = listOf(vals, fieldOf('scene', 'background'));
      getList(vals, fieldOf('scene', 'models')).forEach(function (m, i) {
        var t = clean(m);
        if (!t) return;
        models.push(t + (profile.refTemplate ? ' (' + profile.refTemplate.replace('{n}', String(i + 1)) + ')' : ''));
      });
      if (type) push(en ? type + ' video' : 'Video ' + type);
      if (models.length) push(T('Model: ', 'Models: ') + models.join('; '));
      if (sbgs.length) push(T('Berlatar ', 'Set in ') + joinList(sbgs));
      pushField('camera', 'Kamera: ', 'Camera: ');
      (vals.rows || []).forEach(function (r) {
        var t = clean(r.text), range = clean(r.range);
        if (!t) return;
        push(range ? T('Pada detik ', 'At seconds ') + range + ': ' + t : t);
      });
      pushTech();
      pushField('negative', 'Hindari ', 'Avoid ');
    }
    return out.join(state.mode === 'scene' ? '\n' : ' ');
  }

  function compose() { return state.format === 'prose' ? composeProse() : composeLabeled(); }

  /* ---------- Pemeriksa prompt ---------- */
  var MOVES = ['pan', 'tilt', 'zoom', 'push', 'pull', 'dolly', 'tracking', 'orbit', 'handheld', 'drone', 'aerial', 'crane'];

  function check(text) {
    if (!text) return null;
    var vals = state.values[state.mode], p = getProfile(), out = [];
    function filled(f) { return getList(vals, f).some(function (x) { return clean(x); }); }

    if (state.mode === 'video') {
      if (!filled(fieldOf('video', 'subject'))) out.push('Subjek belum diisi. Tanpa subjek, aplikasi akan menebak sendiri siapa yang tampil.');
      if (!clean(vals.action)) out.push('Aksi belum diisi. Jelaskan apa yang dilakukan subjek agar video memiliki gerakan yang jelas.');
    }
    if (state.mode === 'scene') {
      if (!filled(fieldOf('scene', 'models'))) out.push('Model belum diisi. Tulis referensi setiap model, misalnya "gambar 1".');
      var any = (vals.rows || []).some(function (r) { return clean(r.text); });
      if (!any) out.push('Belum ada aktivitas pada rentang waktu mana pun.');
    }
    if (state.mode === 'character') {
      if (!clean(vals.gender)) out.push('Gender belum diisi.');
      if (!clean(vals.outfit)) out.push('Pakaian belum diisi. Pakaian yang jelas membantu menjaga konsistensi karakter.');
      if (!clean(vals.background)) out.push('Background belum dipilih. Latar putih atau polos memudahkan pemakaian ulang gambar.');
    }
    if (clean(vals.camera)) {
      var low = vals.camera.toLowerCase();
      var hit = MOVES.filter(function (m) { return low.indexOf(m) >= 0; });
      if (hit.length >= 2) out.push('Gerakan kamera tampak lebih dari satu (' + hit.join(', ') + '). Pilih satu gerakan agar gambar stabil.');
    }
    var secs = secondsOf(vals.duration);
    if (p.maxSeconds && secs > p.maxSeconds) out.push('Durasi ' + secs + ' detik melebihi batas profil ' + p.name + ' (' + p.maxSeconds + ' detik).');
    if (p.aspects && clean(vals.aspect) && p.aspects.indexOf(clean(vals.aspect)) < 0) out.push('Rasio aspek "' + clean(vals.aspect) + '" tidak ada dalam daftar profil ' + p.name + '.');

    if (state.mode === 'scene') {
      var prev = 0, bad = false, over = false;
      (vals.rows || []).forEach(function (r) {
        if (!clean(r.text)) return;
        var m = /^\s*(\d+)\s*[-–]\s*(\d+)\s*$/.exec(r.range || '');
        if (!m) { bad = true; return; }
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a > b || a <= prev) bad = true;
        if (secs && b > secs) over = true;
        prev = b;
      });
      if (bad) out.push('Ada rentang waktu yang formatnya salah, tumpang tindih, atau tidak berurutan. Gunakan pola seperti 1-5 lalu 6-10.');
      if (over) out.push('Ada rentang waktu yang melewati durasi total ' + secs + ' detik.');
    }
    if (text.length > LONG_PROMPT) out.push('Prompt cukup panjang (' + text.length + ' karakter). Ringkas agar pesan utamanya tidak tenggelam.');
    return out;
  }

  function renderCheck(text) {
    var ul = $('#check-list');
    ul.innerHTML = '';
    var res = check(text);
    var items = [], cls = '';
    if (res === null) items = ['Pemeriksaan berjalan otomatis setelah formulir diisi.'];
    else if (!res.length) { items = ['Pemeriksaan dasar terpenuhi. Prompt Anda siap dicoba.']; cls = 'ok'; }
    else items = res;
    items.forEach(function (t) {
      var li = document.createElement('li');
      if (cls) li.className = cls;
      li.textContent = t;
      ul.appendChild(li);
    });
  }

  function build() {
    var text = compose();
    $('#output').value = text;
    $('#count').textContent = text.length + ' karakter · ' + (text ? text.split(/\s+/).length : 0) + ' kata';
    renderCheck(text);
    setStatus('');
    updateMeter();
    updateTimeline();
    saveDraft();
  }

  /* ---------- Draf otomatis ---------- */
  var draftTimer;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      writeJSON(KEYS.draft, { mode: state.mode, lang: state.lang, format: state.format, values: state.values });
    }, 400);
  }

  function sanitizeValues(mode, v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return freshValues(mode);
    Object.keys(v).forEach(function (k) {
      var x = v[k];
      if (k === 'rows' || typeof x === 'string') return;
      if (Array.isArray(x)) v[k] = x.map(String); else delete v[k];
    });
    if (mode === 'scene') {
      var rows = Array.isArray(v.rows) ? v.rows : [];
      v.rows = rows.filter(function (r) { return r && typeof r === 'object'; })
        .map(function (r) { return { range: String(r.range || ''), text: String(r.text || '') }; });
      if (!v.rows.length) v.rows = defaultRows();
    }
    return v;
  }

  function hasText(v, skipKey) {
    if (typeof v === 'string') return clean(v) !== '';
    if (Array.isArray(v)) return v.some(function (x) { return hasText(x, skipKey); });
    if (v && typeof v === 'object') return Object.keys(v).some(function (k) { return k !== skipKey && hasText(v[k], skipKey); });
    return false;
  }

  function restoreDraft() {
    var d = readJSON(KEYS.draft, null), any = false;
    if (!d || typeof d !== 'object' || !d.values || typeof d.values !== 'object') return false;
    ['video', 'character', 'scene'].forEach(function (m) {
      state.values[m] = sanitizeValues(m, d.values[m]);
      if (hasText(state.values[m], 'range')) any = true;
    });
    if (MODES[d.mode]) state.mode = d.mode;
    if (d.lang === 'en' || d.lang === 'id') state.lang = d.lang;
    if (d.format === 'prose' || d.format === 'label') state.format = d.format;
    return any;
  }

  function applyLangUI() {
    $$('.lang-btn').forEach(function (x) {
      var on = x.getAttribute('data-lang') === state.lang;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.documentElement.lang = state.lang;
  }

  function applyFormatUI() {
    $$('.fmt-btn').forEach(function (x) {
      var on = x.getAttribute('data-format') === state.format;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* ---------- Status ---------- */
  var timers = {};
  function setStatus(msg, id) {
    id = id || 'status';
    var el = document.getElementById(id) || $('#' + id);
    if (!el) return;
    el.textContent = msg;
    clearTimeout(timers[id]);
    if (msg) timers[id] = setTimeout(function () { el.textContent = ''; }, 3500);
  }

  /* ---------- Salin, simpan, unduh ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  function requireText() {
    var t = $('#output').value;
    if (!t) { setStatus('Isi formulir terlebih dahulu.'); return null; }
    return t;
  }

  function onCopy() {
    var t = requireText();
    if (!t) return;
    copyText(t).then(function () { setStatus('Prompt berhasil disalin.'); },
      function () { setStatus('Gagal menyalin. Blok teks lalu salin manual.'); });
  }

  function onSave() {
    var t = requireText();
    if (!t) return;
    var list = readJSON(KEYS.history, []);
    list.unshift({ id: Date.now(), mode: state.mode, text: t, at: new Date().toISOString(), fav: false, values: clone(state.values[state.mode]), lang: state.lang });
    if (writeJSON(KEYS.history, list.slice(0, MAX_HISTORY))) { setStatus('Prompt disimpan ke riwayat.'); renderHistory(); }
    else setStatus('Riwayat tidak dapat disimpan di peramban ini.');
  }

  function downloadBlob(text, name, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
  }

  function onDownload() {
    var t = requireText();
    if (!t) return;
    downloadBlob(t + '\n', 'kikiprompt-' + state.mode + '.txt', 'text/plain;charset=utf-8');
    setStatus('File .txt diunduh.');
  }

  /* ---------- Riwayat ---------- */
  function renderHistory() {
    var ul = $('#history-list');
    ul.innerHTML = '';
    var all = readJSON(KEYS.history, []);
    var q = clean($('#history-search').value).toLowerCase();
    var favOnly = $('#history-fav').checked;
    var list = all.filter(function (it) {
      if (favOnly && !it.fav) return false;
      if (q && (it.text + ' ' + MODES[it.mode].title).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    var sv = $('#history-sort').value;
    if (sv === 'old') list.reverse();
    else if (sv === 'fav') list = list.filter(function () { return true; }).sort(function (a, b) { return (b.fav ? 1 : 0) - (a.fav ? 1 : 0); });
    if (!list.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = all.length ? 'Tidak ada riwayat yang cocok dengan pencarian.' : 'Belum ada prompt tersimpan. Setelah menyusun prompt, pilih "Simpan ke riwayat".';
      ul.appendChild(li);
      return;
    }
    list.forEach(function (item) {
      var li = document.createElement('li');
      var meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = (item.fav ? 'Favorit — ' : '') + MODES[item.mode].title + ' — ' + new Date(item.at).toLocaleString('id-ID');
      var pre = document.createElement('pre');
      pre.textContent = item.text;
      var btns = document.createElement('div');
      btns.className = 'btns';

      if (item.values && typeof item.values === 'object') {
        var open = h('button', { type: 'button', class: 'btn small', text: 'Buka di formulir' });
        open.addEventListener('click', function () { reopenFromHistory(item); });
        btns.appendChild(open);
      }
      var copy = h('button', { type: 'button', class: 'btn small', text: 'Salin' });
      copy.addEventListener('click', function () {
        copyText(item.text).then(function () { setStatus('Prompt dari riwayat disalin.', 'history-status'); });
      });
      var fav = h('button', { type: 'button', class: 'btn small' + (item.fav ? ' on' : ''), text: item.fav ? 'Hapus favorit' : 'Favorit', 'aria-pressed': item.fav ? 'true' : 'false' });
      fav.addEventListener('click', function () {
        var cur = readJSON(KEYS.history, []);
        cur.forEach(function (x) { if (x.id === item.id) x.fav = !x.fav; });
        writeJSON(KEYS.history, cur);
        renderHistory();
      });
      var del = h('button', { type: 'button', class: 'btn ghost small', text: 'Hapus' });
      del.addEventListener('click', function () {
        writeJSON(KEYS.history, readJSON(KEYS.history, []).filter(function (x) { return x.id !== item.id; }));
        renderHistory();
      });
      btns.appendChild(copy);
      btns.appendChild(fav);
      btns.appendChild(del);
      li.appendChild(meta);
      li.appendChild(pre);
      li.appendChild(btns);
      ul.appendChild(li);
    });
  }

  function reopenFromHistory(item) {
    state.values[item.mode] = sanitizeValues(item.mode, clone(item.values));
    if (item.lang === 'en' || item.lang === 'id') { state.lang = item.lang; applyLangUI(); }
    setMode(item.mode);
    var area = $('#form-area');
    if (area && area.scrollIntoView) area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStatus('Prompt dari riwayat dibuka di formulir. Silakan ubah lalu simpan lagi.');
  }

  function onExport() {
    var list = readJSON(KEYS.history, []);
    if (!list.length) { setStatus('Belum ada riwayat untuk diekspor.', 'history-status'); return; }
    var data = { app: 'kikiprompt', version: 1, exportedAt: new Date().toISOString(), history: list, characters: readJSON(KEYS.chars, []) };
    downloadBlob(JSON.stringify(data, null, 2), 'kikiprompt-cadangan.json', 'application/json');
    setStatus('Cadangan riwayat dan karakter diunduh.', 'history-status');
  }

  function onImportFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var inH = Array.isArray(data) ? data : data.history;
        var inC = Array.isArray(data.characters) ? data.characters : [];
        if (!Array.isArray(inH)) throw new Error('format');
        var okH = inH.filter(function (x) { return x && typeof x.text === 'string' && MODES[x.mode]; });
        var cur = readJSON(KEYS.history, []), ids = {}, added = 0;
        cur.forEach(function (x) { ids[x.id] = true; });
        okH.forEach(function (x) {
          var id = x.id || Date.now() + added;
          if (ids[id]) return;
          ids[id] = true; added++;
          var entry = { id: id, mode: x.mode, text: x.text, at: x.at || new Date().toISOString(), fav: !!x.fav };
          if (x.values && typeof x.values === 'object' && !Array.isArray(x.values)) { entry.values = x.values; if (x.lang === 'en' || x.lang === 'id') entry.lang = x.lang; }
          cur.push(entry);
        });
        cur.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
        writeJSON(KEYS.history, cur.slice(0, MAX_HISTORY));

        var chars = readJSON(KEYS.chars, []), cids = {}, addedC = 0;
        chars.forEach(function (c) { cids[c.id] = true; });
        inC.forEach(function (c) {
          if (c && typeof c.name === 'string' && typeof c.text === 'string' && !cids[c.id]) { chars.push({ id: c.id || Date.now() + addedC, name: c.name, text: c.text }); cids[c.id] = true; addedC++; }
        });
        writeJSON(KEYS.chars, chars.slice(0, MAX_CHARS));
        renderHistory();
        renderToolbar();
        setStatus('Impor selesai: ' + added + ' prompt dan ' + addedC + ' karakter ditambahkan.', 'history-status');
      } catch (e) {
        setStatus('File tidak dapat dibaca. Gunakan file cadangan dari kikiprompt.', 'history-status');
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Kata kunci cepat ---------- */
  var KEYWORDS = {
    extra: ['35mm film look', 'shallow depth of field', 'bokeh', 'film grain', 'slow motion', 'sharp focus', 'natural skin texture', 'soft rim light'],
    negative: ['teks di layar', 'watermark', 'logo', 'tangan cacat', 'wajah terdistorsi', 'blur', 'subtitle', 'jari berlebih']
  };

  /* ---------- Skor kelengkapan ---------- */
  function updateMeter() {
    var vals = state.values[state.mode], total = 0, done = 0;
    MODES[state.mode].fields.forEach(function (f) {
      if (f.k === 'extra') return;
      total++;
      if (f.type === 'multi' ? getList(vals, f).some(function (x) { return clean(x); }) : clean(vals[f.k])) done++;
    });
    if (state.mode === 'scene') { total++; if ((vals.rows || []).some(function (r) { return clean(r.text); })) done++; }
    var pct = Math.round(done / total * 100);
    $('#meter-fill').style.width = pct + '%';
    $('#meter').setAttribute('aria-valuenow', String(pct));
    $('#meter-text').textContent = 'Kelengkapan formulir: ' + pct + '% (' + done + ' dari ' + total + ' bagian terisi)';
  }

  /* ---------- Garis waktu scene ---------- */
  function updateTimeline() {
    var el = $('#timeline');
    if (!el || state.mode !== 'scene') return;
    var v = state.values.scene, total = secondsOf(v.duration), segs = [], max = 0;
    (v.rows || []).forEach(function (r) {
      var m = /^\s*(\d+)\s*[-–]\s*(\d+)\s*$/.exec(r.range || '');
      if (!clean(r.text) || !m) return;
      var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (a < 1 || a > b) return;
      segs.push([a, b]); max = Math.max(max, b);
    });
    total = Math.max(total, max);
    el.innerHTML = '';
    $('#timeline-cap').textContent = total && segs.length ? 'Garis waktu scene (total ' + total + ' detik)' : '';
    if (!total) return;
    segs.forEach(function (s, i) {
      el.appendChild(h('div', { class: 'seg s' + (i % 4), style: 'left:' + ((s[0] - 1) / total * 100) + '%;width:' + ((s[1] - s[0] + 1) / total * 100) + '%', text: s[0] + '-' + s[1] }));
    });
  }

  /* ---------- Acak ide ---------- */
  var IDEAS = {
    subject: ['Perempuan Asia usia 25 tahun, jaket abu-abu', 'Laki-laki Indonesia usia 30 tahun, kemeja batik', 'Kucing oranye berbulu tebal', 'Pelukis tua berjanggut putih', 'Anak kecil berjas hujan kuning', 'Robot kecil berwarna perak'],
    action: ['berjalan pelan menyusuri pantai saat matahari terbenam', 'menyeduh kopi lalu menatap ke luar jendela', 'melukis di atas kanvas besar', 'berlari kecil melewati genangan air', 'membuka surat lama sambil tersenyum', 'menari sendirian di tengah ruangan kosong'],
    expression: ['tersenyum tenang', 'terkejut lalu tertawa', 'serius dan fokus', 'rindu', 'penuh semangat'],
    bg: ['pantai berpasir putih saat senja', 'kafe kayu dengan jendela besar', 'gang kota yang basah oleh hujan', 'studio seni penuh kanvas', 'sawah hijau di pagi berkabut', 'stasiun kereta tua yang sepi'],
    outfit: ['blazer hitam, kemeja putih, celana panjang', 'kaus putih polos, jeans biru, sepatu kets', 'kebaya modern berwarna hijau zaitun', 'jaket denim, kaus hitam, celana krem', 'kemeja linen biru muda, celana abu-abu'],
    acc: ['kacamata bulat', 'jam tangan hitam', 'topi rajut', 'anting kecil', 'tas selempang cokelat'],
    act: ['Model 1 berjalan masuk lalu menyapa', 'Model 2 menoleh dan tersenyum', 'keduanya duduk berhadapan sambil berbincang', 'Model 1 menyerahkan sebuah hadiah kecil', 'Model 2 tertawa lalu berjalan keluar']
  };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function opts(m, k) { var f = fieldOf(m, k); return f.optionsFn ? f.optionsFn() : f.options; }

  function onRandom() {
    var m = state.mode, v;
    if (m === 'video') {
      v = { style: pick(opts(m, 'style')), subject: [pick(IDEAS.subject)], action: pick(IDEAS.action), expression: pick(IDEAS.expression), background: [pick(IDEAS.bg)], camera: pick(opts(m, 'camera')), lighting: pick(opts(m, 'lighting')), duration: pick(['5 detik', '8 detik', '10 detik']), aspect: pick(opts(m, 'aspect')), negative: 'teks di layar, logo, tangan cacat' };
    } else if (m === 'character') {
      v = { gender: pick(opts(m, 'gender')), face: pick(opts(m, 'face')), age: pick(['22 tahun', '25 tahun', '30 tahun', '35 tahun']), outfit: pick(IDEAS.outfit), accessories: pick(IDEAS.acc), background: pick(opts(m, 'background')), pose: pick(opts(m, 'pose')), render: pick(opts(m, 'render')), negative: 'teks, watermark' };
    } else {
      var total = pick([10, 15]), half = Math.floor(total / 2), a = pick(IDEAS.act), b = pick(IDEAS.act);
      v = { type: pick(opts(m, 'type')), models: ['gambar 1, perempuan berjaket biru', 'gambar 2, laki-laki berkemeja putih'], camera: pick(opts(m, 'camera')), background: [pick(IDEAS.bg)], duration: total + ' detik', aspect: pick(opts(m, 'aspect')), negative: 'teks di layar', rows: [{ range: '1-' + half, text: a }, { range: (half + 1) + '-' + total, text: b === a ? pick(IDEAS.act) : b }] };
    }
    state.values[m] = v;
    renderForm();
    setStatus('Ide acak diterapkan. Ubah sesuai selera Anda, atau klik Acak ide lagi.');
  }

  /* ---------- Preset pribadi ---------- */
  function allPresets() {
    var mine = readJSON(KEYS.mine, []).filter(function (p) { return p && p.mode === state.mode && p.values; });
    return PRESETS[state.mode].concat(mine.map(function (p) { return { name: '★ ' + p.name, values: p.values, mine: p.id }; }));
  }
  function saveMyPreset() {
    if (!hasText(state.values[state.mode], 'range')) { setStatus('Isi formulir terlebih dahulu sebelum menyimpan preset.'); return; }
    var name = clean(window.prompt('Nama preset Anda:') || '').slice(0, 40);
    if (!name) return;
    var list = readJSON(KEYS.mine, []);
    list.unshift({ id: Date.now(), mode: state.mode, name: name, values: clone(state.values[state.mode]) });
    if (writeJSON(KEYS.mine, list.slice(0, 30))) { renderToolbar(); setStatus('Preset "' + name + '" tersimpan.'); }
    else setStatus('Preset tidak dapat disimpan di peramban ini.');
  }
  function deleteMyPreset(idx) {
    var p = idx !== '' && allPresets()[parseInt(idx, 10)];
    if (!p || !p.mine) { setStatus('Pilih salah satu preset buatan Anda (bertanda ★).'); return; }
    if (!window.confirm('Hapus preset "' + p.name.replace('★ ', '') + '"?')) return;
    writeJSON(KEYS.mine, readJSON(KEYS.mine, []).filter(function (x) { return x.id !== p.mine; }));
    renderToolbar();
    setStatus('Preset dihapus.');
  }

  /* ---------- Bagikan lewat tautan ---------- */
  function onShare() {
    if (!requireText()) return;
    var code = btoa(unescape(encodeURIComponent(JSON.stringify({ m: state.mode, l: state.lang, f: state.format, v: state.values[state.mode] }))));
    var url = location.href.split('#')[0] + '#p=' + code;
    copyText(url).then(function () { setStatus('Tautan berbagi disalin.'); },
      function () { location.hash = 'p=' + code; setStatus('Salin tautan dari bilah alamat peramban.'); });
  }
  function loadShared() {
    var m = /^#p=(.+)$/.exec(location.hash || '');
    if (!m) return false;
    try {
      var d = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      if (!d || !MODES[d.m]) return false;
      state.mode = d.m;
      state.values[d.m] = sanitizeValues(d.m, d.v);
      if (d.l === 'en' || d.l === 'id') state.lang = d.l;
      if (d.f === 'prose' || d.f === 'label') state.format = d.f;
      try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Tema ---------- */
  var THEMES = ['auto', 'dark', 'light'], THEME_LABEL = { auto: 'Otomatis', dark: 'Gelap', light: 'Terang' };
  function applyTheme(t) {
    state.theme = t;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    $('#btn-theme').textContent = 'Tema: ' + THEME_LABEL[t];
  }

  /* ---------- Pintasan keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === 'Enter') { e.preventDefault(); onCopy(); }
    else if (e.key === 's' || e.key === 'S') { e.preventDefault(); onSave(); }
  });

  /* ---------- Peristiwa ---------- */
  function setMode(mode) {
    state.mode = mode;
    $$('.tabs button').forEach(function (b) {
      var on = b.getAttribute('data-mode') === mode;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) $('#form-area').setAttribute('aria-labelledby', b.id);
    });
    renderForm();
  }

  $$('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });

  $$('.lang-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      state.lang = b.getAttribute('data-lang');
      applyLangUI();
      build();
    });
  });

  $$('.fmt-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      state.format = b.getAttribute('data-format');
      applyFormatUI();
      build();
    });
  });

  $('#btn-share').addEventListener('click', onShare);
  $('#btn-theme').addEventListener('click', function () {
    var t = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
    applyTheme(t);
    writeJSON(KEYS.theme, t);
  });
  $('#history-sort').addEventListener('change', renderHistory);
  $('#btn-copy').addEventListener('click', onCopy);
  $('#btn-save').addEventListener('click', onSave);
  $('#btn-download').addEventListener('click', onDownload);
  $('#btn-reset').addEventListener('click', function () {
    state.values[state.mode] = freshValues(state.mode);
    renderForm();
    setStatus('Formulir dikosongkan.');
  });
  $('#btn-clear-history').addEventListener('click', function () {
    if (readJSON(KEYS.history, []).length && window.confirm('Hapus seluruh riwayat prompt?')) {
      writeJSON(KEYS.history, []);
      renderHistory();
    }
  });
  $('#history-search').addEventListener('input', renderHistory);
  $('#history-fav').addEventListener('change', renderHistory);
  $('#btn-export').addEventListener('click', onExport);
  $('#btn-import').addEventListener('click', function () { $('#file-import').click(); });
  $('#file-import').addEventListener('change', function (e) {
    onImportFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  /* ---------- Mulai ---------- */
  var savedPlatform = readJSON(KEYS.platform, null);
  if (savedPlatform) { state.platform = savedPlatform; if (getProfile().id !== savedPlatform) state.platform = PLATFORMS[0].id; }
  state.values.scene = freshValues('scene');
  var restored = restoreDraft();
  var shared = loadShared();
  var th = readJSON(KEYS.theme, 'auto');
  applyTheme(THEMES.indexOf(th) >= 0 ? th : 'auto');
  applyLangUI();
  applyFormatUI();
  setMode(state.mode);
  renderHistory();
  if (shared) setStatus('Prompt dari tautan dimuat. Silakan ubah sesuai kebutuhan.');
  else if (restored) setStatus('Draf terakhir dipulihkan.');

  if (window.__KIKI_TEST) window.__kiki = { state: state, compose: compose, composeProse: composeProse, composeLabeled: composeLabeled, check: check, splitDuration: splitDuration, PRESETS: PRESETS, setMode: setMode, MODES: MODES };
})();
