/*!
 * Mehta · Landing page — interface do simulador de layout
 */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const P = window.Planner;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');

  const state = {
    step: 1, src: null, dataURL: '', W: 0, H: 0, u: 1, an: null, isSample: false,
    manual: [], drawing: false, front: 'bottom', size: 'auto', purpose: null,
    result: null, opts: null, sel: -1, baseAlerts: [], busy: false
  };

  const stage = $('#stage');
  const svg = $('#plan');

  /* =====================================================================
     Utilidades de interface
     ===================================================================== */
  let toastT;
  function toast(msg, type) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.className = 'toast'; }, 4200);
  }

  function setBusy(on, text) {
    $('#viewerBusy').hidden = !on;
    if (text) $('#busyText').textContent = text;
  }

  function scrollToEl(el) {
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* =====================================================================
     Header, navegação, animações de entrada
     ===================================================================== */
  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  if ('IntersectionObserver' in window) {
    const navIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) $$('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['como-funciona', 'simulador', 'solucoes', 'sobre', 'contato'].forEach(id => { const s = document.getElementById(id); if (s) navIO.observe(s); });

    const rio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
    }), { threshold: 0.12 });
    $$('.reveal').forEach(el => {
      const sibs = $$(':scope > .reveal', el.parentElement);
      el.style.transitionDelay = (sibs.indexOf(el) % 4) * 90 + 'ms';
      rio.observe(el);
    });
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  $('#year').textContent = new Date().getFullYear();

  /* =====================================================================
     Ilustrações isométricas (soluções)
     ===================================================================== */
  function isoSVG(kind) {
    const s = 22, pts = [];
    const P3 = (x, y, z) => [(x - y) * 0.866 * s, (x + y) * 0.5 * s - z * s];
    const poly = (arr, fill, extra = '') => {
      const p = arr.map(a => P3(a[0], a[1], a[2]));
      pts.push(...p);
      return `<polygon points="${p.map(v => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join(' ')}" fill="${fill}" ${extra}/>`;
    };
    const line = (a, b, stroke, w = 1) => {
      const A = P3(a[0], a[1], a[2]), B = P3(b[0], b[1], b[2]);
      pts.push(A, B);
      return `<line x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
    };
    const shadow = (L, W, p = .5) => poly([[-p, -p, 0], [L + p + 1.4, -p, 0], [L + p + 1.4, W + p + 1.4, 0], [-p, W + p, 0]], 'rgba(38,50,58,.09)');
    let b = '';

    if (kind === 'container') {
      const L = 6, W = 2.44, H = 2.6;
      b += shadow(L, W);
      b += poly([[0, W, 0], [L, W, 0], [L, W, H], [0, W, H]], '#FF7300');
      for (let x = .3; x < L - .1; x += .3) b += line([x, W, .14], [x, W, H - .14], 'rgba(120,45,0,.22)', 1.1);
      b += poly([[4.25, W, 1.5], [5.55, W, 1.5], [5.55, W, 2.25], [4.25, W, 2.25]], '#2B2F33');
      b += poly([[4.4, W, 1.7], [4.75, W, 1.7], [4.75, W, 2.05], [4.4, W, 2.05]], '#FF7300');
      b += poly([[L, 0, 0], [L, W, 0], [L, W, H], [L, 0, H]], '#D35C00');
      b += line([L, W / 2, .12], [L, W / 2, H - .12], 'rgba(60,20,0,.5)', 1.4);
      [.35, .8, 1.64, 2.09].forEach(y => { b += line([L, y, .25], [L, y, H - .25], 'rgba(255,214,180,.6)', 1.3); });
      b += poly([[0, 0, H], [L, 0, H], [L, W, H], [0, W, H]], '#FF9B52');
      b += line([0, W, H], [L, W, H], '#B84F00', 1.5) + line([L, 0, H], [L, W, H], '#B84F00', 1.5) + line([L, W, 0], [L, W, H], '#B84F00', 1.5);
    } else if (kind === 'modulo') {
      const L = 6, W = 3, H = 2.7;
      b += shadow(L, W);
      for (const z0 of [0, H]) {
        b += poly([[0, W, z0], [L, W, z0], [L, W, z0 + H], [0, W, z0 + H]], '#FFFFFF');
        [[.6, 2.0], [2.5, 3.9]].forEach(([a, c]) => {
          b += poly([[a, W, z0 + 1.0], [c, W, z0 + 1.0], [c, W, z0 + 2.05], [a, W, z0 + 2.05]], '#9DB4C6');
          b += poly([[a + .15, W, z0 + 1.5], [a + .55, W, z0 + 2.0], [a + .3, W, z0 + 2.0], [a + .15, W, z0 + 1.8]], 'rgba(255,255,255,.6)');
        });
        b += poly([[4.6, W, z0 + .12], [5.5, W, z0 + .12], [5.5, W, z0 + 2.2], [4.6, W, z0 + 2.2]], '#516672');
        b += poly([[L, 0, z0], [L, W, z0], [L, W, z0 + H], [L, 0, z0 + H]], '#DCDEE9');
        b += poly([[L, .8, z0 + 1.0], [L, 2.2, z0 + 1.0], [L, 2.2, z0 + 2.0], [L, .8, z0 + 2.0]], '#8FA6B8');
        b += line([0, W, z0], [L, W, z0], '#516672', 2) + line([L, 0, z0], [L, W, z0], '#516672', 2);
        [[0, W], [L, W], [L, 0]].forEach(([x, y]) => { b += line([x, y, z0], [x, y, z0 + H], '#516672', 2.6); });
        b += line([0, W, z0 + H], [L, W, z0 + H], '#516672', 2) + line([L, 0, z0 + H], [L, W, z0 + H], '#516672', 2);
      }
      b += poly([[0, 0, 2 * H], [L, 0, 2 * H], [L, W, 2 * H], [0, W, 2 * H]], '#F1F2F7', 'stroke="#516672" stroke-width="2"');
      b += poly([[3.6, .6, 2 * H], [5.0, .6, 2 * H], [5.0, 1.6, 2 * H], [3.6, 1.6, 2 * H]], '#C9CEDA');
      b += poly([[5.0, .6, 2 * H], [5.0, 1.6, 2 * H], [5.0, 1.6, 2 * H + .5], [5.0, .6, 2 * H + .5]], '#AEB5C4');
      b += poly([[3.6, 1.6, 2 * H], [5.0, 1.6, 2 * H], [5.0, 1.6, 2 * H + .5], [3.6, 1.6, 2 * H + .5]], '#BCC3D0');
      b += poly([[3.6, .6, 2 * H + .5], [5.0, .6, 2 * H + .5], [5.0, 1.6, 2 * H + .5], [3.6, 1.6, 2 * H + .5]], '#DDE1EA');
    } else {
      const L = 8, W = 5.2, H = 3.2, r = 1.5;
      b += shadow(L, W, .6);
      b += poly([[0, W, 0], [L, W, 0], [L, W, H], [0, W, H]], '#ECEBF5');
      for (let x = .4; x < L; x += .4) b += line([x, W, .05], [x, W, H - .4], 'rgba(81,102,114,.16)', 1);
      b += poly([[1.2, W, 0], [2.2, W, 0], [2.2, W, 2.2], [1.2, W, 2.2]], '#516672');
      b += poly([[0, W, H - .35], [L, W, H - .35], [L, W, H - .1], [0, W, H - .1]], '#FF7300');
      b += poly([[0, 0, H], [L, 0, H], [L, W / 2, H + r], [0, W / 2, H + r]], '#3D4E58');
      b += poly([[0, W, H], [L, W, H], [L, W / 2, H + r], [0, W / 2, H + r]], '#5C7280');
      for (let x = .5; x < L; x += .5) b += line([x, W, H], [x, W / 2, H + r], 'rgba(255,255,255,.13)', 1);
      b += poly([[L, 0, 0], [L, W, 0], [L, W, H], [L, W / 2, H + r], [L, 0, H]], '#D6D4EA');
      b += poly([[L, 1.1, 0], [L, 4.1, 0], [L, 4.1, 2.6], [L, 1.1, 2.6]], '#8E8BC2');
      for (let z = .3; z < 2.6; z += .3) b += line([L, 1.1, z], [L, 4.1, z], 'rgba(255,255,255,.35)', 1);
      b += poly([[L, 0, H - .35], [L, W, H - .35], [L, W, H - .1], [L, 0, H - .1]], '#E56700');
      b += line([L, 0, H], [L, W / 2, H + r], '#2B3A44', 1.6) + line([L, W / 2, H + r], [L, W, H], '#2B3A44', 1.6) + line([0, W / 2, H + r], [L, W / 2, H + r], '#2B3A44', 1.2);
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const p = 8;
    return `<svg viewBox="${(x0 - p).toFixed(1)} ${(y0 - p).toFixed(1)} ${(x1 - x0 + 2 * p).toFixed(1)} ${(y1 - y0 + 2 * p).toFixed(1)}" xmlns="${NS}" aria-hidden="true">${b}</svg>`;
  }
  $$('[data-iso]').forEach(el => { el.innerHTML = isoSVG(el.dataset.iso); });

  /* =====================================================================
     Formulário do simulador
     ===================================================================== */
  const ORDER = ['canteiro', 'escritorio', 'alojamento', 'deposito', 'refeitorio', 'vestiario', 'comercial', 'eventos', 'sala', 'saude', 'outro'];
  const chipsEl = $('#purposeChips');
  ORDER.forEach(k => {
    const p = P.PURPOSES[k];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.v = k;
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.innerHTML = `<svg class="ic"><use href="#${p.icon}"/></svg><span>${esc(p.label)}</span>`;
    chipsEl.appendChild(b);
  });
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (b) setPurpose(b.dataset.v, true);
  });
  function setPurpose(k, focusOther) {
    state.purpose = k;
    $$('.chip', chipsEl).forEach(c => c.setAttribute('aria-checked', String(c.dataset.v === k)));
    $('#purposeOther').hidden = k !== 'outro';
    if (k === 'outro' && focusOther) $('#purposeOther').focus();
  }

  function bindSeg(el, cb) {
    $$('button', el).forEach(x => { x.setAttribute('role', 'radio'); x.setAttribute('aria-checked', String(x.classList.contains('on'))); });
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      setSeg(el, b.dataset.v);
      cb(b.dataset.v);
    });
  }
  function setSeg(el, v) {
    $$('button', el).forEach(x => { const on = x.dataset.v === v; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
  }
  bindSeg($('#frontSeg'), v => { state.front = v; renderAreas(); });
  bindSeg($('#sizeSeg'), v => { state.size = v; });

  const clampInt = (v, a, b) => { v = Math.round(+v); if (!isFinite(v)) v = a; return clamp(v, a, b); };
  $$('[data-step-for]').forEach(b => b.addEventListener('click', () => {
    const inp = document.getElementById(b.dataset.stepFor);
    inp.value = clampInt((+inp.value || 0) + (+b.dataset.d), +inp.min, +inp.max);
  }));
  ['lotsN', 'countN'].forEach(id => $('#' + id).addEventListener('change', e => {
    e.target.value = clampInt(e.target.value, +e.target.min, +e.target.max);
  }));

  $('#desc').addEventListener('input', e => { $('#descCount').textContent = e.target.value.length; });

  const widthVal = () => {
    const v = parseFloat(String($('#widthM').value).replace(',', '.'));
    return v >= 3 ? v : null;
  };
  $('#widthM').addEventListener('input', () => {
    $('#toStep2').disabled = !(state.an && widthVal());
    renderAreas();
  });

  /* =====================================================================
     Upload da planta
     ===================================================================== */
  const fileInput = $('#fileInput');
  const dz = $('#dropzone');
  fileInput.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
    fileInput.value = '';
  });
  dz.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  [dz, stage].forEach(t => {
    ['dragenter', 'dragover'].forEach(ev => t.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => t.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    t.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && state.step !== 3) handleFile(f);
    });
  });

  const fmtSize = b => b > 1048576 ? fmt(b / 1048576, 1) + ' MB' : fmt(Math.max(1, b / 1024)) + ' KB';

  async function handleFile(f) {
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
    const isImg = /^image\/(png|jpe?g|webp|gif|bmp)$/i.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name);
    if (!isPdf && !isImg) return toast('Formato não suportado. Envie PDF, JPG, PNG ou WEBP.', 'err');
    if (f.size > 20 * 1024 * 1024) return toast('Arquivo muito grande (máximo de 20 MB).', 'err');
    if (state.step !== 1) goStep(1);
    setBusy(true, isPdf ? 'Convertendo o PDF…' : 'Carregando a planta…');
    try {
      const canvas = isPdf ? await pdfToCanvas(f) : await imgToCanvas(f);
      setPlan(canvas, {
        name: f.name,
        meta: `${isPdf ? 'PDF' : 'Imagem'} · ${fmtSize(f.size)} · ${canvas.width}×${canvas.height}px`,
        sample: false,
        jpeg: !isPdf && /jpe?g/i.test(f.type)
      });
    } catch (err) {
      console.error(err);
      toast(isPdf ? 'Não foi possível ler o PDF (é preciso estar conectado à internet). Tente exportar como imagem.' : 'Não foi possível ler este arquivo. Tente outro formato.', 'err');
    } finally {
      setBusy(false);
    }
  }

  function toCanvas(src, w, h, maxD = 2000) {
    const s = Math.min(1, maxD / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  function imgToCanvas(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(toCanvas(img, img.naturalWidth, img.naturalHeight)); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('imagem inválida')); };
      img.src = url;
    });
  }

  let pdfjsPromise = null;
  function loadPdfJs() {
    if (pdfjsPromise) return pdfjsPromise;
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    pdfjsPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = base + 'pdf.min.js';
      s.onload = async () => {
        const lib = window.pdfjsLib;
        if (!lib) { pdfjsPromise = null; return rej(new Error('pdf.js indisponível')); }
        try {
          const code = await fetch(base + 'pdf.worker.min.js').then(r => r.text());
          lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        } catch (e) {
          lib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
        }
        res(lib);
      };
      s.onerror = () => { pdfjsPromise = null; rej(new Error('falha ao carregar pdf.js')); };
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  }

  async function pdfToCanvas(file) {
    const lib = await loadPdfJs();
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = Math.min(4, 2000 / Math.max(vp0.width, vp0.height));
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    return c;
  }

  /* ---------- planta de exemplo (desenhada em canvas) ---------- */
  function drawSamplePlan() {
    const W = 1600, H = 1100, S = 24, X0 = 200, Y0 = 150, LW = 24 * S, LD = 30 * S;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const INK = '#2f2f2f';
    const ln = (x1, y1, x2, y2, w = 1.5, col = INK) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const txt = (s, x, y, size = 18, weight = 600, align = 'center', color = INK) => {
      g.font = `${weight} ${size}px Arial, Helvetica, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, x, y);
    };

    // rua
    const sy1 = Y0 + LD + 60, sy2 = sy1 + 84;
    ln(0, sy1, W, sy1, 2); ln(0, sy2, W, sy2, 2);
    g.setLineDash([26, 18]); ln(0, (sy1 + sy2) / 2, W, (sy1 + sy2) / 2, 1.2, '#777'); g.setLineDash([]);
    txt('RUA PROJETADA', W - 230, sy1 + 21, 18, 700, 'center', '#666');

    // lotes
    g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(X0, Y0, LW * 2, LD);
    ln(X0 + LW, Y0, X0 + LW, Y0 + LD, 3);

    // edificação existente (lote 01)
    const bx = X0 + 1.5 * S, by = Y0 + 1.5 * S, bw = 10 * S, bh = 8 * S;
    g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
    g.strokeStyle = '#555'; g.lineWidth = 1.4;
    for (let t = 0; t < bw + bh; t += 10) { g.beginPath(); g.moveTo(bx + t, by); g.lineTo(bx + t - bh, by + bh); g.stroke(); }
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh);
    g.fillStyle = '#fff'; g.fillRect(bx + bw / 2 - 92, by + bh / 2 - 26, 184, 52);
    g.lineWidth = 1.2; g.strokeRect(bx + bw / 2 - 92, by + bh / 2 - 26, 184, 52);
    txt('EDIFICAÇÃO', bx + bw / 2, by + bh / 2 - 10, 16, 700);
    txt('EXISTENTE · 80 m²', bx + bw / 2, by + bh / 2 + 11, 14, 600);

    // árvores (lote 02)
    const tree = (x, y, r) => {
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(x, y, r * .35, 0, Math.PI * 2); g.stroke();
      ln(x - r * .7, y, x + r * .7, y, 1.1); ln(x, y - r * .7, x, y + r * .7, 1.1);
    };
    tree(X0 + 2 * LW - 3.2 * S, Y0 + 3.4 * S, 1.7 * S);
    tree(X0 + 2 * LW - 3.0 * S, Y0 + LD - 6.5 * S, 1.4 * S);

    // cotas
    const dimH = (x1, x2, y, label) => {
      ln(x1, y, x2, y, 1.2, '#444');
      [x1, x2].forEach(x => { ln(x - 7, y + 7, x + 7, y - 7, 1.8, '#444'); ln(x, y - 12, x, y + 12, 1, '#444'); });
      g.font = '600 17px Arial'; const tw = g.measureText(label).width + 16;
      g.fillStyle = '#fff'; g.fillRect((x1 + x2) / 2 - tw / 2, y - 12, tw, 24);
      txt(label, (x1 + x2) / 2, y, 17, 600, 'center', '#333');
    };
    dimH(X0, X0 + LW, Y0 - 40, '24,00');
    dimH(X0 + LW, X0 + 2 * LW, Y0 - 40, '24,00');
    dimH(X0, X0 + 2 * LW, Y0 - 92, '48,00');
    const vx = X0 - 46;
    ln(vx, Y0, vx, Y0 + LD, 1.2, '#444');
    [Y0, Y0 + LD].forEach(y => { ln(vx - 7, y + 7, vx + 7, y - 7, 1.8, '#444'); ln(vx - 12, y, vx + 12, y, 1, '#444'); });
    g.save(); g.translate(vx, Y0 + LD / 2); g.rotate(-Math.PI / 2);
    g.fillStyle = '#fff'; g.fillRect(-34, -12, 68, 24); txt('30,00', 0, 0, 17, 600, 'center', '#333');
    g.restore();

    // identificação dos lotes e acessos
    txt('LOTE 01 · 720,00 m²', X0 + 10, Y0 + LD + 20, 15, 700, 'left', '#444');
    txt('LOTE 02 · 720,00 m²', X0 + LW + 10, Y0 + LD + 20, 15, 700, 'left', '#444');
    [X0 + LW / 2, X0 + LW * 1.5].forEach(x => {
      g.fillStyle = INK; g.beginPath(); g.moveTo(x, Y0 + LD + 10); g.lineTo(x - 11, Y0 + LD + 28); g.lineTo(x + 11, Y0 + LD + 28); g.closePath(); g.fill();
      txt('ACESSO', x, Y0 + LD + 42, 12, 700, 'center', '#444');
    });

    // norte
    const nx = W - 120, ny = 200;
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(nx, ny, 40, 0, Math.PI * 2); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.moveTo(nx, ny - 32); g.lineTo(nx + 13, ny + 18); g.lineTo(nx, ny + 8); g.lineTo(nx - 13, ny + 18); g.closePath(); g.fill();
    txt('N', nx, ny - 60, 22, 800);

    // carimbo
    txt('PLANTA DE SITUAÇÃO', X0, H - 62, 22, 800, 'left');
    txt('Quadra 12 · Lotes 01 e 02 · Escala 1:250 · medidas em metros', X0, H - 34, 15, 500, 'left', '#555');
    return c;
  }

  /* ---------- carregar planta ---------- */
  function setPlan(canvas, info) {
    state.src = canvas; state.W = canvas.width; state.H = canvas.height;
    state.u = Math.max(state.W, state.H) / 1000;
    state.dataURL = info.jpeg ? canvas.toDataURL('image/jpeg', .9) : canvas.toDataURL('image/png');
    state.an = P.analyze(canvas);
    state.manual = []; state.result = null; state.sel = -1; state.isSample = !!info.sample;

    $('#fileName').textContent = info.name;
    $('#fileMeta').textContent = info.meta;
    $('#uploadBlock').hidden = true;
    $('#fileBlock').hidden = false;
    $('#clearDraw').hidden = true;
    $('#report').hidden = true;
    setAttachAvailable(false);

    if (info.sample) {
      prefillSample();
    } else {
      $('#sampleNote').hidden = true;
      $('#widthM').value = '';
      $('#lotsN').value = clamp(state.an.comps.length, 1, 6);
    }

    buildViewer();
    renderAreas();
    updateDetectMsg();
    $('#toStep2').disabled = !widthVal();
    goStep(1);
    if (!info.sample) {
      setTimeout(() => $('#widthM').focus({ preventScroll: true }), 50);
      toast('Planta carregada! Informe a largura do terreno para calibrar a escala.');
    }
  }

  function prefillSample() {
    $('#widthM').value = 48;
    $('#lotsN').value = 2;
    $('#countN').value = 10;
    setPurpose('canteiro');
    state.size = 'auto'; setSeg($('#sizeSeg'), 'auto');
    state.front = 'bottom'; setSeg($('#frontSeg'), 'bottom');
    $('#desc').value = 'Canteiro para obra de 18 meses, com escritório para a equipe de engenharia, almoxarifado, vestiário para 40 operários e refeitório. Precisamos manter área livre para caminhões e estacionamento.';
    $('#descCount').textContent = $('#desc').value.length;
    $('#sampleNote').hidden = false;
  }

  function loadSample() {
    setPlan(drawSamplePlan(), { name: 'exemplo-planta-situacao.png', meta: 'Planta de exemplo · 2 lotes · 48 × 30 m', sample: true });
  }

  function resetAll() {
    state.src = null; state.an = null; state.result = null; state.manual = []; state.sel = -1;
    if (state.drawing) toggleDraw(false);
    svg.innerHTML = ''; svg.setAttribute('hidden', '');
    $('#viewerEmpty').hidden = false;
    $('#uploadBlock').hidden = false;
    $('#fileBlock').hidden = true;
    $('#report').hidden = true;
    $('#toStep2').disabled = true;
    setAttachAvailable(false);
    goStep(1);
  }

  $$('[data-action="upload"]').forEach(b => b.addEventListener('click', () => {
    scrollToEl($('#simulador'));
    if (state.step === 3) return;
    fileInput.click();
  }));
  $$('[data-action^="sample"]').forEach(b => b.addEventListener('click', () => {
    if (state.step === 3) return;
    loadSample();
    if (b.dataset.action === 'sample') scrollToEl($('#simulador'));
  }));
  $('#removeFile').addEventListener('click', resetAll);
  $('#restartBtn').addEventListener('click', () => { resetAll(); scrollToEl($('.sim-card')); });

  /* =====================================================================
     Visualização (SVG)
     ===================================================================== */
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function buildViewer() {
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${state.W} ${state.H}`);
    el('image', { href: state.dataURL, x: 0, y: 0, width: state.W, height: state.H, preserveAspectRatio: 'none' }, svg);
    el('g', { id: 'gAreas' }, svg);
    el('g', { id: 'gDims' }, svg);
    el('g', { id: 'gDraw' }, svg);
    el('g', { id: 'gResult' }, svg);
    svg.removeAttribute('hidden');
    $('#viewerEmpty').hidden = true;
  }

  function pill(parent, x, y, text, o = {}) {
    const u = state.u, fs = (o.size || 13) * u, padX = 9 * u, h = fs * 1.9;
    const g = el('g', null, parent);
    const rect = el('rect', null, g);
    const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs, 'font-weight': 800, 'font-family': 'Mulish, Arial, sans-serif', fill: o.color || '#2B2F33' }, g);
    t.textContent = text;
    let tw = 0;
    try { tw = t.getComputedTextLength(); } catch (e) { tw = 0; }
    if (!tw) tw = text.length * fs * 0.58;
    const w = tw + padX * 2;
    let px = o.anchor === 'middle' ? x - w / 2 : x;
    let py = o.vmiddle ? y - h / 2 : y;
    px = clamp(px, 2 * u, state.W - w - 2 * u);
    py = clamp(py, 2 * u, state.H - h - 2 * u);
    Object.entries({ x: px, y: py, width: w, height: h, rx: h / 2, fill: o.bg || '#fff', stroke: o.stroke || 'none', 'stroke-width': o.stroke ? 1.2 * u : 0 })
      .forEach(([k, v]) => rect.setAttribute(k, v));
    t.setAttribute('x', px + w / 2);
    t.setAttribute('y', py + h / 2);
    return g;
  }

  function drawAccess(parent, x, y, dir) {
    const u = state.u, s = 9 * u, off = s * 1.9;
    const map = { bottom: [0, -off, -90], top: [0, off, 90], left: [off, 0, 0], right: [-off, 0, 180] };
    const [dx, dy, ang] = map[dir] || map.bottom;
    const g = el('g', { transform: `translate(${x + dx} ${y + dy}) rotate(${ang})` }, parent);
    el('circle', { r: s * 1.35, fill: '#2B2F33', opacity: .88 }, g);
    el('path', { d: `M${-s * .5} ${-s * .6}L${s * .7} 0L${-s * .5} ${s * .6}Z`, fill: '#fff' }, g);
  }

  const currentPool = () => (state.manual.length ? P.manualComps(state.an, state.manual) : state.an.comps);

  function renderAreas() {
    if (!state.an || !$('#gAreas')) return;
    const g = $('#gAreas'), u = state.u;
    g.innerHTML = '';
    const pool = currentPool();
    const wv = widthVal();
    const mpc = wv && state.an.comps.length ? P.metersPerCell(state.an.comps, wv) : null;
    const tol = state.an.gh * 0.15;
    const ordered = pool.slice().sort((a, b) => {
      const ay = (a.bbox.y0 + a.bbox.y1) / 2, by = (b.bbox.y0 + b.bbox.y1) / 2;
      return Math.abs(ay - by) > tol ? ay - by : (a.bbox.x0 + a.bbox.x1) / 2 - (b.bbox.x0 + b.bbox.x1) / 2;
    });
    ordered.forEach((c, i) => {
      const rp = P.regionPaths(state.an, c);
      el('path', { d: rp.fill, fill: 'rgba(255,115,0,.12)', class: 'area-in' }, g);
      el('path', { d: rp.outline, fill: 'none', stroke: '#FF7300', 'stroke-width': 2 * u, 'stroke-linecap': 'square', class: 'area-in' }, g);
      const b = P.bboxPx(state.an, c.bbox);
      pill(g, b.x + 8 * u, b.y + 8 * u, `Área ${i + 1}${mpc ? ' · ' + fmt(P.areaOf(state.an, c.cells) * mpc * mpc) + ' m²' : ''}`, { bg: '#FF7300', color: '#fff', size: 12 });
      const edge = { bottom: [b.x + b.w / 2, b.y + b.h], top: [b.x + b.w / 2, b.y], left: [b.x, b.y + b.h / 2], right: [b.x + b.w, b.y + b.h / 2] }[state.front];
      drawAccess(g, edge[0], edge[1], state.front);
    });
    renderDims(state.an.comps, wv);
  }

  function renderDims(pool, wv) {
    const g = $('#gDims');
    g.innerHTML = '';
    if (!pool.length) return;
    const u = state.u, b = P.bboxPx(state.an, P.unionBox(pool));
    let y = b.y - 20 * u;
    if (y < 26 * u) y = b.y + b.h + 20 * u;
    if (y > state.H - 20 * u) y = b.y + 40 * u;
    const x1 = b.x, x2 = b.x + b.w, t = 9 * u;
    el('path', { d: `M${x1} ${y}H${x2}M${x1} ${y - t}V${y + t}M${x2} ${y - t}V${y + t}`, stroke: '#FF7300', 'stroke-width': 2.2 * u, fill: 'none' }, g);
    el('path', { d: `M${x1} ${y}l${12 * u} ${-5 * u}v${10 * u}z M${x2} ${y}l${-12 * u} ${-5 * u}v${10 * u}z`, fill: '#FF7300' }, g);
    pill(g, (x1 + x2) / 2, y, wv ? `${fmt(wv, wv % 1 ? 1 : 0)} m` : 'informe a largura', { anchor: 'middle', vmiddle: true, bg: wv ? '#FF7300' : '#2B2F33', color: '#fff', size: 13 });
  }

  function updateDetectMsg() {
    const m = $('#detectMsg'), n = currentPool().length;
    let txt, warn = false;
    if (state.manual.length) {
      txt = n === 1 ? '1 área definida manualmente: ela será usada como terreno.' : `${n} áreas definidas manualmente: cada uma pode ser considerada um terreno.`;
    } else if (state.an.fallback) {
      warn = true;
      txt = 'Não encontramos limites fechados com clareza. Vamos considerar toda a área desenhada; se preferir, desenhe o terreno manualmente.';
    } else {
      txt = n === 1 ? 'Identificamos 1 área livre delimitada na planta.' : `Identificamos ${n} áreas livres delimitadas na planta. Cada uma pode ser considerada um terreno.`;
    }
    m.className = 'notice' + (warn ? ' warn' : '');
    m.innerHTML = `<svg class="ic"><use href="#${warn ? 'i-alert' : 'i-check'}"/></svg><span>${esc(txt)}</span>`;
  }

  /* ---------- desenho manual de áreas ---------- */
  function toggleDraw(on) {
    state.drawing = on;
    stage.classList.toggle('drawing', on);
    const b = $('#drawBtn');
    b.classList.toggle('on', on);
    b.querySelector('span').textContent = on ? 'Concluir desenho' : 'Desenhar área manualmente';
    updateViewerText();
    if (on) toast('Clique e arraste sobre a planta para marcar cada terreno.');
  }
  $('#drawBtn').addEventListener('click', () => toggleDraw(!state.drawing));
  $('#clearDraw').addEventListener('click', () => {
    state.manual = [];
    $('#clearDraw').hidden = true;
    renderAreas(); updateDetectMsg();
  });

  function svgPt(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    const p = m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
    return { x: clamp(p.x, 0, state.W), y: clamp(p.y, 0, state.H) };
  }

  let drawTmp = null, drag = null;

  svg.addEventListener('pointerdown', e => {
    if (!state.an) return;
    if (state.drawing && state.step <= 2) {
      const p = svgPt(e), u = state.u;
      drawTmp = { x0: p.x, y0: p.y, rect: el('rect', { x: p.x, y: p.y, width: 0, height: 0, fill: 'rgba(255,115,0,.16)', stroke: '#FF7300', 'stroke-width': 2 * u, 'stroke-dasharray': `${8 * u} ${5 * u}` }, $('#gDraw')) };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (state.step === 4 && state.result) {
      const g = e.target.closest && e.target.closest('.ctr');
      if (!g) { select(-1); return; }
      const i = +g.dataset.i, it = state.result.items[i], p = svgPt(e);
      select(i);
      drag = { i, g, dx: p.x - it.x, dy: p.y - it.y, moved: false };
      g.classList.add('dragging');
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });

  svg.addEventListener('pointermove', e => {
    if (drawTmp) {
      const p = svgPt(e);
      const x = Math.min(p.x, drawTmp.x0), y = Math.min(p.y, drawTmp.y0);
      drawTmp.rect.setAttribute('x', x); drawTmp.rect.setAttribute('y', y);
      drawTmp.rect.setAttribute('width', Math.abs(p.x - drawTmp.x0)); drawTmp.rect.setAttribute('height', Math.abs(p.y - drawTmp.y0));
    } else if (drag) {
      const R = state.result, it = R.items[drag.i], p = svgPt(e);
      it.x = clamp(p.x - drag.dx, 0, state.W - it.w);
      it.y = clamp(p.y - drag.dy, 0, state.H - it.h);
      drag.g.setAttribute('transform', `translate(${it.x} ${it.y})`);
      drag.moved = true;
      drag.g.classList.toggle('bad', !R.check(it, drag.i, R.items));
    }
  });

  const endPointer = () => {
    if (drawTmp) {
      const r = drawTmp.rect;
      const rect = { x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height') };
      r.remove(); drawTmp = null;
      if (rect.w > state.W * 0.04 && rect.h > state.H * 0.04) {
        state.manual.push(rect);
        $('#clearDraw').hidden = false;
        renderAreas(); updateDetectMsg();
      } else {
        toast('Área muito pequena. Arraste para desenhar um retângulo maior.', 'err');
      }
    } else if (drag) {
      drag.g.classList.remove('dragging');
      if (drag.moved) {
        // repinta para atualizar a orientação da porta
        const it = state.result.items[drag.i];
        paintSVG(drag.g.querySelector('.ctr-in'), ctrPrims(it, drag.i));
      }
      drag = null;
      refreshConflicts();
    }
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('dblclick', e => {
    const g = e.target.closest && e.target.closest('.ctr');
    if (g && state.step === 4) rotateItem(+g.dataset.i);
  });

  function select(i) {
    state.sel = i;
    $$('.ctr', svg).forEach(g => g.classList.toggle('sel', +g.dataset.i === i));
    $('#rotateBtn').disabled = i < 0;
  }

  function rotateItem(i) {
    const R = state.result;
    if (!R || i < 0) return;
    const it = R.items[i];
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const t = it.w; it.w = it.h; it.h = t;
    it.x = clamp(cx - it.w / 2, 0, state.W - it.w);
    it.y = clamp(cy - it.h / 2, 0, state.H - it.h);
    const g = svg.querySelector(`.ctr[data-i="${i}"]`);
    if (g) {
      g.setAttribute('transform', `translate(${it.x} ${it.y})`);
      paintSVG(g.querySelector('.ctr-in'), ctrPrims(it, i));
    }
    refreshConflicts();
  }
  $('#rotateBtn').addEventListener('click', () => rotateItem(state.sel));

  $('#compareBtn').addEventListener('click', () => {
    const on = !svg.classList.contains('hide-ctr');
    svg.classList.toggle('hide-ctr', on);
    $('#compareBtn').classList.toggle('on', on);
  });

  $('#fsBtn').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
  });

  /* ---------- desenho de um container (compartilhado SVG / PNG) ---------- */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    const ch = v => Math.round((t - v) * p + v);
    return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  }

  function ctrPrims(it, idx) {
    const w = it.w, h = it.h, horiz = w >= h, sh = Math.min(w, h), lg = Math.max(w, h);
    const lot = state.result.lots[it.lot];
    const pr = [];
    if (it.stacked) pr.push({ t: 'rect', x: sh * .16, y: -sh * .16, w, h, r: sh * .06, fill: shade(it.color, -.25), op: .55 });
    pr.push({ t: 'rect', x: 0, y: 0, w, h, r: sh * .06, fill: it.color, stroke: shade(it.color, -.3), sw: Math.max(.8, sh * .05) });
    const n = Math.max(4, Math.round(lg / (sh * .26)));
    const segs = [];
    for (let k = 1; k < n; k++) { const t = lg * k / n; segs.push(horiz ? [t, sh * .14, t, sh * .86] : [sh * .14, t, sh * .86, t]); }
    pr.push({ t: 'lines', segs, stroke: 'rgba(255,255,255,.3)', sw: Math.max(.5, sh * .03) });
    const cx = it.x + w / 2, cy = it.y + h / 2, dw = sh * .62, dt = sh * .13, pos = lg * .12;
    if (horiz) pr.push({ t: 'rect', x: pos, y: lot.center.y < cy ? 0 : h - dt, w: dw, h: dt, fill: '#fff', op: .92 });
    else pr.push({ t: 'rect', x: lot.center.x < cx ? 0 : w - dt, y: pos, w: dt, h: dw, fill: '#fff', op: .92 });
    const r = sh * .27;
    pr.push({ t: 'circle', cx: w / 2, cy: h / 2, r, fill: '#fff' });
    pr.push({ t: 'text', x: w / 2, y: h / 2, s: String(idx + 1), size: r * 1.1, fill: shade(it.color, -.45), weight: 900 });
    if (it.stacked) {
      const bw = sh * .72, bh = sh * .42, bx = w - bw - sh * .06, by = sh * .06;
      pr.push({ t: 'rect', x: bx, y: by, w: bw, h: bh, r: bh / 2, fill: '#2B2F33' });
      pr.push({ t: 'text', x: bx + bw / 2, y: by + bh / 2, s: '2×', size: bh * .66, fill: '#fff', weight: 900 });
    }
    return pr;
  }

  function paintSVG(g, prims) {
    g.innerHTML = '';
    for (const p of prims) {
      if (p.t === 'rect') el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: p.r || 0, fill: p.fill, stroke: p.stroke || 'none', 'stroke-width': p.sw || 0, opacity: p.op == null ? 1 : p.op }, g);
      else if (p.t === 'lines') el('path', { d: p.segs.map(s => `M${s[0].toFixed(2)} ${s[1].toFixed(2)}L${s[2].toFixed(2)} ${s[3].toFixed(2)}`).join(''), stroke: p.stroke, 'stroke-width': p.sw, fill: 'none' }, g);
      else if (p.t === 'circle') el('circle', { cx: p.cx, cy: p.cy, r: p.r, fill: p.fill }, g);
      else if (p.t === 'text') {
        const t = el('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': p.size, 'font-weight': p.weight, 'font-family': 'Mulish, Arial, sans-serif', fill: p.fill }, g);
        t.textContent = p.s;
      }
    }
  }

  function roundRectPath(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  function paintCanvas(g, prims) {
    for (const p of prims) {
      g.globalAlpha = p.op == null ? 1 : p.op;
      if (p.t === 'rect') {
        roundRectPath(g, p.x, p.y, p.w, p.h, p.r || 0);
        g.fillStyle = p.fill; g.fill();
        if (p.stroke) { g.strokeStyle = p.stroke; g.lineWidth = p.sw; g.stroke(); }
      } else if (p.t === 'lines') {
        g.strokeStyle = p.stroke; g.lineWidth = p.sw; g.beginPath();
        p.segs.forEach(s => { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); });
        g.stroke();
      } else if (p.t === 'circle') {
        g.fillStyle = p.fill; g.beginPath(); g.arc(p.cx, p.cy, p.r, 0, Math.PI * 2); g.fill();
      } else if (p.t === 'text') {
        g.fillStyle = p.fill; g.font = `${p.weight} ${p.size}px Mulish, Arial, sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.s, p.x, p.y);
      }
      g.globalAlpha = 1;
    }
  }

  function addRings(g, it) {
    const sh = Math.min(it.w, it.h), o = sh * .14;
    el('rect', { class: 'sel-ring', x: -o, y: -o, width: it.w + 2 * o, height: it.h + 2 * o, rx: o, fill: 'none', stroke: '#2B2F33', 'stroke-width': sh * .06, 'stroke-dasharray': `${sh * .22} ${sh * .12}` }, g);
    el('rect', { class: 'bad-ring', x: -o, y: -o, width: it.w + 2 * o, height: it.h + 2 * o, rx: o, fill: 'rgba(210,59,34,.14)', stroke: '#D23B22', 'stroke-width': sh * .08 }, g);
  }

  function scaleBar(R) {
    const ppm = R.pxPerM, target = state.W * 0.14 / ppm;
    let m = 1;
    [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].forEach(s => { if (s <= target) m = s; });
    return { m, len: m * ppm };
  }

  /* ---------- resultado ---------- */
  function setView(v) {
    v = v || { x: 0, y: 0, w: state.W, h: state.H };
    // ajusta a proporção à área visível, para que tudo que aparece esteja dentro do viewBox
    const r = svg.getBoundingClientRect();
    if (r.width > 10 && r.height > 10) {
      const ar = r.width / r.height;
      if (v.w / v.h < ar) { const nw = v.h * ar; v = { x: v.x - (nw - v.w) / 2, y: v.y, w: nw, h: v.h }; }
      else { const nh = v.w / ar; v = { x: v.x, y: v.y - (nh - v.h) / 2, w: v.w, h: nh }; }
    }
    state.view = v;
    svg.setAttribute('viewBox', `${state.view.x} ${state.view.y} ${state.view.w} ${state.view.h}`);
  }

  // enquadra os terrenos na visualização do resultado
  function fitToLots(R) {
    const u = state.u;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    R.lots.forEach(L => { x0 = Math.min(x0, L.bbox.x); y0 = Math.min(y0, L.bbox.y); x1 = Math.max(x1, L.bbox.x + L.bbox.w); y1 = Math.max(y1, L.bbox.y + L.bbox.h); });
    const px = Math.max((x1 - x0) * .06, 30 * u);
    x0 = Math.max(0, x0 - px); x1 = Math.min(state.W, x1 + px);
    y0 = Math.max(0, y0 - 48 * u); y1 = Math.min(state.H, y1 + 64 * u);
    if ((x1 - x0) * (y1 - y0) > state.W * state.H * .8) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function renderResult(animate) {
    const R = state.result, u = state.u, g = $('#gResult');
    g.innerHTML = '';
    setView(fitToLots(R));
    const V = state.view;
    $('#gAreas').style.display = 'none';
    $('#gDims').style.display = 'none';
    $('#gDraw').innerHTML = '';
    const gl = el('g', null, g), gc = el('g', { id: 'gCtr' }, g), gt = el('g', { class: 'rlbl-layer' }, g);

    R.lots.forEach((L, i) => {
      el('path', { d: L.path, fill: 'rgba(125,122,184,.10)', class: animate ? 'area-in' : null }, gl);
      el('path', { d: L.outline, fill: 'none', stroke: '#7D7AB8', 'stroke-width': 2 * u, 'stroke-linecap': 'square', class: animate ? 'area-in' : null }, gl);
      if (L.cut) el('line', { x1: L.cut.x1, y1: L.cut.y1, x2: L.cut.x2, y2: L.cut.y2, stroke: '#7D7AB8', 'stroke-width': 2.2 * u, 'stroke-dasharray': `${12 * u} ${7 * u}` }, gl);
    });

    R.items.forEach((it, i) => {
      const outer = el('g', { class: 'ctr', 'data-i': i, transform: `translate(${it.x} ${it.y})` }, gc);
      addRings(outer, it);
      const inner = el('g', { class: 'ctr-in' }, outer);
      if (animate && !reduced) inner.style.animationDelay = (200 + i * 55) + 'ms';
      else inner.style.animation = 'none';
      paintSVG(inner, ctrPrims(it, i));
    });

    R.lots.forEach((L, i) => {
      const lbl = `Terreno ${pad2(i + 1)} · ${fmt(L.areaM2)} m²`;
      const above = L.bbox.y - 34 * u > 0;
      pill(gt, L.bbox.x, above ? L.bbox.y - 30 * u : L.bbox.y + 6 * u, lbl, { bg: '#516672', color: '#fff', size: 12 });
      drawAccess(gt, L.access.x, L.access.y, L.access.dir);
      if (L.free) pill(gt, L.free.x, L.free.y, R.freeLabel, { anchor: 'middle', vmiddle: true, bg: 'rgba(255,255,255,.94)', stroke: '#C5C3E0', color: '#516672', size: 11.5 });
    });

    const sb = scaleBar(R), x = V.x + 18 * u, y = V.y + V.h - 22 * u, hh = 7 * u;
    const gs = el('g', null, gt);
    el('rect', { x: x - 10 * u, y: y - 26 * u, width: sb.len + 20 * u, height: 42 * u, rx: 6 * u, fill: 'rgba(255,255,255,.94)', stroke: '#DAD8EC', 'stroke-width': u }, gs);
    for (let k = 0; k < 4; k++) el('rect', { x: x + k * sb.len / 4, y: y - hh / 2, width: sb.len / 4, height: hh, fill: k % 2 ? '#fff' : '#2B2F33', stroke: '#2B2F33', 'stroke-width': .8 * u }, gs);
    const t1 = el('text', { x, y: y - 14 * u, 'font-size': 11 * u, 'font-weight': 800, 'font-family': 'Mulish, Arial, sans-serif', fill: '#2B2F33' }, gs); t1.textContent = '0';
    const t2 = el('text', { x: x + sb.len, y: y - 14 * u, 'text-anchor': 'end', 'font-size': 11 * u, 'font-weight': 800, 'font-family': 'Mulish, Arial, sans-serif', fill: '#2B2F33' }, gs); t2.textContent = `${sb.m} m`;

    select(-1);
    refreshConflicts();
  }

  function refreshConflicts() {
    const R = state.result;
    if (!R) return;
    let bad = 0;
    R.items.forEach((it, i) => {
      const ok = R.check(it, i, R.items);
      if (!ok) bad++;
      const g = svg.querySelector(`.ctr[data-i="${i}"]`);
      if (g) g.classList.toggle('bad', !ok);
    });
    const msgs = state.baseAlerts.slice();
    if (bad) msgs.push(bad === 1 ? '1 container está fora da área útil ou sobreposto (em vermelho). Reposicione para validar.' : `${bad} containers estão fora da área útil ou sobrepostos (em vermelho). Reposicione para validar.`);
    const a = $('#resAlert');
    a.hidden = !msgs.length;
    a.innerHTML = msgs.length ? `<svg class="ic"><use href="#i-alert"/></svg><div>${msgs.map(esc).join('<br>')}</div>` : '';
  }

  /* =====================================================================
     Etapas
     ===================================================================== */
  function canGo(s) {
    if (state.step === 3) return false;
    if (s === 1) return true;
    if (s === 2) return !!(state.an && widthVal());
    if (s === 4) return !!state.result;
    return false;
  }

  function goStep(n, opt = {}) {
    const prev = state.step;
    state.step = n;
    $$('#stepper li').forEach(li => {
      const s = +li.dataset.step;
      li.classList.toggle('is-active', s === n);
      li.classList.toggle('is-done', s < n);
      li.classList.toggle('clickable', s !== n && canGo(s));
    });
    $$('.pane').forEach(p => { p.hidden = +p.dataset.pane !== n; });
    const res = n === 4;
    $('#rotateBtn').hidden = !res;
    $('#compareBtn').hidden = !res;
    if (!res) {
      svg.classList.remove('hide-ctr');
      $('#compareBtn').classList.remove('on');
    }
    if (state.an && n <= 3) setView(null);
    if (state.an && n <= 2) {
      $('#gResult').innerHTML = '';
      $('#gAreas').style.display = '';
      $('#gDims').style.display = '';
      renderAreas();
    }
    if (n === 4 && prev !== 4 && opt.render) renderResult(!!opt.animate);
    if (n !== 1 && state.drawing) toggleDraw(false);
    updateViewerText();
    if (opt.scroll && window.innerWidth < 980) scrollToEl($('.sim-card'));
  }

  $('#stepper').addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const s = +li.dataset.step;
    if (s === state.step || !canGo(s)) return;
    goStep(s, { render: s === 4 });
  });
  $$('[data-go]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.go, { scroll: true })));

  $('#toStep2').addEventListener('click', () => {
    if (!widthVal()) { toast('Informe a largura do terreno em metros.', 'err'); $('#widthM').focus(); return; }
    goStep(2, { scroll: true });
  });

  function updateViewerText() {
    const t = $('#viewerTitle'), h = $('#viewerHint');
    $('.viewer-bar').classList.toggle('live', !!state.an);
    if (!state.an) { t.textContent = 'Visualização da planta'; h.textContent = 'Formatos aceitos: PDF, JPG, PNG e WEBP. Você também pode arrastar o arquivo para cá.'; return; }
    if (state.step === 1) {
      t.textContent = 'Planta enviada · áreas detectadas';
      h.textContent = state.drawing ? 'Clique e arraste sobre a planta para desenhar cada terreno.' : 'Em laranja: áreas livres identificadas. A cota indica a largura usada como escala.';
    } else if (state.step === 2) {
      t.textContent = 'Planta enviada · áreas detectadas';
      h.textContent = 'Preencha os dados do projeto para gerar a distribuição.';
    } else if (state.step === 3) {
      t.textContent = 'Analisando a planta…';
      h.textContent = 'Identificando limites, obstáculos e área útil.';
    } else {
      t.textContent = 'Proposta de distribuição';
      h.textContent = 'Arraste os módulos para ajustar · selecione e use Girar · Comparar mostra a planta original.';
    }
  }

  /* =====================================================================
     Geração da proposta
     ===================================================================== */
  function readForm() {
    const widthM = widthVal();
    if (!widthM) { toast('Informe a largura do terreno (passo 1).', 'err'); goStep(1); $('#widthM').focus(); return null; }
    if (!state.purpose) {
      toast('Selecione a finalidade dos containers.', 'err');
      chipsEl.classList.remove('shake'); void chipsEl.offsetWidth; chipsEl.classList.add('shake');
      return null;
    }
    const lots = clampInt($('#lotsN').value, 1, 6);
    const count = clampInt($('#countN').value, 1, 80);
    $('#lotsN').value = lots; $('#countN').value = count;
    return {
      lots, count, widthM,
      purpose: state.purpose,
      purposeText: state.purpose === 'outro' ? $('#purposeOther').value.trim() : '',
      size: state.size, front: state.front,
      manual: state.manual.slice(),
      desc: $('#desc').value.trim()
    };
  }

  async function generate() {
    if (state.busy || !state.an) return;
    const o = readForm();
    if (!o) return;
    state.busy = true;
    goStep(3, { scroll: true });
    const label = o.purposeText || P.PURPOSES[o.purpose].label;
    $('#pPurpose').textContent = label;

    let res;
    try {
      res = P.plan(state.an, o);
    } catch (err) {
      console.error(err);
      state.busy = false;
      goStep(2);
      toast('Não foi possível analisar esta planta. Tente desenhar a área do terreno manualmente.', 'err');
      return;
    }

    stage.classList.add('scanning');
    const items = $$('#progressList li');
    items.forEach(li => { li.className = ''; });
    const fill = $('#progressFill');
    fill.style.width = '0';
    const dt = reduced ? 80 : 560;
    for (let i = 0; i < items.length; i++) {
      items[i].className = 'run';
      fill.style.width = ((i + .5) / items.length * 100) + '%';
      await wait(dt);
      items[i].className = 'ok';
    }
    fill.style.width = '100%';
    await wait(reduced ? 50 : 260);
    stage.classList.remove('scanning');

    state.result = res;
    state.opts = o;
    state.busy = false;
    fillPane4();
    fillReport();
    goStep(4, { render: true, animate: true });
    $('#report').hidden = false;
    setAttachAvailable(true);
    if (res.unplaced) toast(`Atenção: ${res.unplaced} container(s) não couberam na área útil.`, 'err');
  }
  $('#generateBtn').addEventListener('click', generate);

  function fillPane4() {
    const R = state.result, o = state.opts;
    const label = o.purposeText || R.purposeLabel;
    $('#resTitle').textContent = `${label} · ${R.units} container${R.units !== 1 ? 's' : ''}`;
    $('#resSub').textContent = `Módulos de ${R.sizeLabel} (${R.sizeFeet}) em disposição ${R.layoutName}, em ${R.lots.length} terreno${R.lots.length !== 1 ? 's' : ''}.`;
    const stats = [
      ['Containers', R.unplaced ? `${R.units} de ${R.requested}` : String(R.units), true],
      ['Módulo', R.sizeLabel + (R.autoSize ? ' · auto' : '')],
      ['Área útil', `${fmt(R.areaM2)} m²`],
      ['Ocupação', `${fmt(R.occupancy * 100)}%`],
      ['Área livre', `${fmt(R.freeM2)} m²`],
      ['Terrenos', String(R.lots.length)]
    ];
    $('#stats').innerHTML = stats.map(([k, v, hl]) => `<div class="stat${hl ? ' hl' : ''}"><small>${k}</small><strong>${esc(v)}</strong></div>`).join('');
    $('#legend').innerHTML = R.legend.map(l => `<li><span class="sw" style="background:${l.color}"></span>${esc(l.name)}<b>${l.count}</b></li>`).join('');
    state.baseAlerts = [];
    if (R.stackedCount) state.baseAlerts.push(`${R.stackedCount} container${R.stackedCount > 1 ? 's foram posicionados' : ' foi posicionado'} em 2º nível (empilhado, marcado com 2×) para atender à quantidade solicitada.`);
    if (R.unplaced) state.baseAlerts.push(`${R.unplaced} container${R.unplaced > 1 ? 's não couberam' : ' não coube'} na área útil. Considere módulos menores, outra área ou reduzir a quantidade.`);
  }

  function needNotes(desc, R, o) {
    const t = desc.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const notes = [];
    if (/estacion|vaga|carro|veicul|caminh/.test(t)) notes.push(`Você mencionou veículos/estacionamento: a área livre de aproximadamente ${fmt(R.freeM2)} m² pode receber vagas e manobra, com acesso pela faixa livre da frente.`);
    if (/ar.?cond|climatiz|calor|termic|conforto/.test(t)) notes.push('Os módulos podem receber isolamento térmico e bandeja para ar-condicionado.');
    if (/banheir|sanitar|\bwc\b|chuveir|vestiar/.test(t) && !['vestiario'].includes(o.purpose)) notes.push('Módulos sanitários chegam com instalações hidrossanitárias prontas de fábrica: basta conectar às redes do terreno.');
    if (/expan|ampli|cresc|futur/.test(t)) notes.push('O layout preserva áreas livres que permitem ampliar o conjunto no futuro, com novos módulos acoplados.');
    if (/acessib|pcd|cadeira|rampa/.test(t)) notes.push('Para acessibilidade, recomendamos rampas e módulo sanitário PCD; nossa engenharia detalha na etapa de projeto.');
    if (/empilh|andar|pavim|dois nive|2 nive/.test(t) && !R.stackedCount) notes.push('Os containers Mehta são empilháveis: é possível dobrar a capacidade usando a mesma projeção no terreno.');
    if (/rapid|urgen|prazo|imediat/.test(t)) notes.push('Os módulos chegam prontos (plug and play): após a entrega, basta descarregar, posicionar e conectar.');
    if (/sustent|ambient|ecolog|verde/.test(t)) notes.push('A construção industrializada gera menos resíduos e permite desmontar e reaproveitar a estrutura em outro local.');
    if (/\b\d+\s*(operario|funcionario|pessoa|colaborador|trabalhador|aluno|leito)/.test(t)) notes.push('Para o número de pessoas informado, nossa equipe confirma o dimensionamento de sanitários e áreas de apoio conforme as normas aplicáveis.');
    if (!notes.length) notes.push('Estrutura 100% metálica, desmontável e transportável, entregue com instalações elétricas e hidráulicas prontas.');
    return notes.slice(0, 4);
  }

  function fillReport() {
    const R = state.result, o = state.opts, PP = P.PURPOSES[o.purpose];
    const label = o.purposeText || R.purposeLabel;
    const frontTxt = { bottom: 'parte inferior', top: 'parte superior', left: 'lado esquerdo', right: 'lado direito' }[o.front];
    const nL = R.lots.length, d = R.detected;
    const src = R.manual
      ? (d === 1 ? 'utilizamos a área que você desenhou' : 'utilizamos as áreas que você desenhou')
      : R.fallback
        ? 'consideramos a área total desenhada (não foram encontrados limites fechados)'
        : (d === 1 ? 'identificamos 1 área livre delimitada' : `identificamos ${d} áreas livres delimitadas`);
    let s = `Analisamos a planta enviada e ${src}. Considerando ${nL} terreno${nL > 1 ? 's' : ''}, com área útil estimada de ${fmt(R.areaM2)} m² (escala calibrada por ${fmt(o.widthM, o.widthM % 1 ? 1 : 0)} m de largura), propomos ${R.units} container${R.units > 1 ? 's' : ''} de ${R.sizeLabel} em disposição ${R.layoutName} para uso como ${label.toLowerCase()}.`;
    if (R.autoSize) s += ` O módulo de ${R.sizeLabel} foi escolhido automaticamente por atender à quantidade com o melhor aproveitamento do espaço.`;
    s += ` A ocupação resultante é de ${fmt(R.occupancy * 100)}% da área útil, preservando cerca de ${fmt(R.freeM2)} m² livres.`;
    $('#repSummary').textContent = s;

    const why = PP.why.slice();
    why.push(`Afastamento mínimo de ${fmt(R.setback, 1)} m das divisas, de edificações existentes e de obstáculos identificados na planta.`);
    why.push(`Faixa de acesso de 4 m mantida livre na frente de cada terreno (${frontTxt} da planta).`);
    if (nL > 1) why.push('Quantidade dividida entre os terrenos proporcionalmente à área útil de cada um.');
    $('#repWhy').innerHTML = why.map(w => `<li>${esc(w)}</li>`).join('');

    if (o.desc) { $('#repNeedWrap').hidden = false; $('#repNeed').textContent = `“${o.desc}”`; }
    else $('#repNeedWrap').hidden = true;
    $('#repNotes').innerHTML = needNotes(o.desc || '', R, o).map(n => `<li><svg class="ic"><use href="#i-info"/></svg><span>${esc(n)}</span></li>`).join('');

    const rows = R.legend.map(l => `<tr><td><span class="sw" style="background:${l.color}"></span>${esc(l.name)}</td><td>${l.count}</td><td>${R.sizeLabel}</td><td>${[...l.lots].sort((a, b) => a - b).map(i => 'T' + pad2(i + 1)).join(', ')}</td></tr>`).join('');
    $('#repTable').innerHTML = rows + `<tr><td><b>Total</b></td><td>${R.units}</td><td></td><td></td></tr>`;

    const kv = [
      ['Finalidade', label],
      ['Disposição', R.layoutName],
      ['Área útil', `${fmt(R.areaM2)} m²`],
      ['Área ocupada', `${fmt(R.occupiedM2)} m²`],
      ['Taxa de ocupação', `${fmt(R.occupancy * 100, 1)}%`],
      ['Afastamento das divisas', `${fmt(R.setback, 1)} m`]
    ];
    if (R.stackedCount) kv.push(['Módulos em 2º nível', String(R.stackedCount)]);
    $('#repKv').innerHTML = kv.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  }

  /* =====================================================================
     Exportar imagem (PNG)
     ===================================================================== */
  function canvasPill(g, x, y, text, o) {
    const u = state.u, fs = (o.size || 13) * u, padX = 9 * u, h = fs * 1.9;
    g.font = `800 ${fs}px Mulish, Arial, sans-serif`;
    const w = g.measureText(text).width + padX * 2;
    let px = o.anchor === 'middle' ? x - w / 2 : x, py = o.vmiddle ? y - h / 2 : y;
    px = clamp(px, 2 * u, state.W - w - 2 * u); py = clamp(py, 2 * u, state.H - h - 2 * u);
    roundRectPath(g, px, py, w, h, h / 2);
    g.fillStyle = o.bg; g.fill();
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = 1.2 * u; g.stroke(); }
    g.fillStyle = o.color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, px + w / 2, py + h / 2);
  }

  function drawLogo(g, x, y, hgt) {
    const k = hgt / 205;
    $$('#logo-mehta path').forEach(p => {
      const st = p.getAttribute('style') || p.parentNode.getAttribute('style') || '';
      const m = st.match(/#[0-9a-f]{6}/i);
      g.save(); g.translate(x, y); g.scale(k, k);
      g.fillStyle = m ? m[0] : '#ec7a36';
      g.fill(new Path2D(p.getAttribute('d')));
      g.restore();
    });
  }

  async function downloadPNG() {
    const R = state.result;
    if (!R) return;
    try { await document.fonts.ready; } catch (e) { /* segue */ }
    const W = state.W, H = state.H, u = state.u;
    const band = Math.round(Math.max(120, W * 0.085));
    const c = document.createElement('canvas');
    c.width = W; c.height = H + band;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(state.src, 0, 0, W, H);

    R.lots.forEach(L => {
      g.fillStyle = 'rgba(125,122,184,.10)'; g.fill(new Path2D(L.path));
      g.strokeStyle = '#7D7AB8'; g.lineWidth = 2 * u; g.lineCap = 'square'; g.stroke(new Path2D(L.outline)); g.lineCap = 'butt';
      g.strokeStyle = '#7D7AB8';
      if (L.cut) { g.setLineDash([12 * u, 7 * u]); g.lineWidth = 2.2 * u; g.beginPath(); g.moveTo(L.cut.x1, L.cut.y1); g.lineTo(L.cut.x2, L.cut.y2); g.stroke(); g.setLineDash([]); }
    });
    R.items.forEach((it, i) => { g.save(); g.translate(it.x, it.y); paintCanvas(g, ctrPrims(it, i)); g.restore(); });
    R.lots.forEach((L, i) => {
      const above = L.bbox.y - 34 * u > 0;
      canvasPill(g, L.bbox.x, above ? L.bbox.y - 30 * u : L.bbox.y + 6 * u, `Terreno ${pad2(i + 1)} · ${fmt(L.areaM2)} m²`, { bg: '#516672', color: '#fff', size: 12 });
      if (L.free) canvasPill(g, L.free.x, L.free.y, R.freeLabel, { anchor: 'middle', vmiddle: true, bg: 'rgba(255,255,255,.94)', stroke: '#C5C3E0', color: '#516672', size: 11.5 });
      const s = 9 * u, off = s * 1.9;
      const map = { bottom: [0, -off, -Math.PI / 2], top: [0, off, Math.PI / 2], left: [off, 0, 0], right: [-off, 0, Math.PI] };
      const [dx, dy, ang] = map[L.access.dir] || map.bottom;
      g.save(); g.translate(L.access.x + dx, L.access.y + dy); g.rotate(ang);
      g.globalAlpha = .88; g.fillStyle = '#2B2F33'; g.beginPath(); g.arc(0, 0, s * 1.35, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-s * .5, -s * .6); g.lineTo(s * .7, 0); g.lineTo(-s * .5, s * .6); g.closePath(); g.fill();
      g.restore();
    });
    // escala gráfica
    const sb = scaleBar(R), sx = 18 * u, sy = H - 22 * u, hh = 7 * u;
    roundRectPath(g, sx - 10 * u, sy - 26 * u, sb.len + 20 * u, 42 * u, 6 * u);
    g.fillStyle = 'rgba(255,255,255,.94)'; g.fill(); g.strokeStyle = '#DAD8EC'; g.lineWidth = u; g.stroke();
    for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#fff' : '#2B2F33'; g.fillRect(sx + k * sb.len / 4, sy - hh / 2, sb.len / 4, hh); g.strokeStyle = '#2B2F33'; g.lineWidth = .8 * u; g.strokeRect(sx + k * sb.len / 4, sy - hh / 2, sb.len / 4, hh); }
    g.fillStyle = '#2B2F33'; g.font = `800 ${11 * u}px Mulish, Arial, sans-serif`; g.textBaseline = 'alphabetic';
    g.textAlign = 'left'; g.fillText('0', sx, sy - 10 * u);
    g.textAlign = 'right'; g.fillText(`${sb.m} m`, sx + sb.len, sy - 10 * u);

    // faixa de identificação
    g.fillStyle = '#fff'; g.fillRect(0, H, W, band);
    g.fillStyle = '#FF7300'; g.fillRect(0, H, W, Math.max(4, band * .04));
    const logoH = band * .28, logoW = logoH * 952 / 205, lx = band * .3;
    drawLogo(g, lx, H + band / 2 - logoH / 2, logoH);
    const tx = lx + logoW + band * .32;
    g.fillStyle = '#E6E5EF'; g.fillRect(tx - band * .16, H + band * .26, Math.max(1, u), band * .5);
    const label = state.opts.purposeText || R.purposeLabel;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#2B2F33'; g.font = `900 ${band * .16}px Mulish, Arial, sans-serif`;
    g.fillText('PROPOSTA DE DISTRIBUIÇÃO DE CONTAINERS', tx, H + band * .45);
    g.fillStyle = '#6B7076'; g.font = `600 ${band * .125}px Mulish, Arial, sans-serif`;
    const line2 = `${label} · ${R.units} containers de ${R.sizeLabel} · ${R.lots.length} terreno${R.lots.length > 1 ? 's' : ''} · ocupação de ${fmt(R.occupancy * 100)}%`;
    g.fillText(line2, tx, H + band * .7);
    const leftEnd = tx + Math.max(g.measureText(line2).width, (g.font = `900 ${band * .16}px Mulish, Arial, sans-serif`, g.measureText('PROPOSTA DE DISTRIBUIÇÃO DE CONTAINERS').width));
    g.font = `600 ${band * .11}px Mulish, Arial, sans-serif`;
    const r1 = 'mehta.com.br · (61) 3262-1111', r2 = 'Proposta preliminar · sujeita a validação técnica';
    if (leftEnd + Math.max(g.measureText(r1).width, g.measureText(r2).width) + band * .6 < W) {
      g.textAlign = 'right'; g.fillStyle = '#8A8F95';
      g.fillText(r1, W - band * .3, H + band * .45);
      g.fillText(r2, W - band * .3, H + band * .7);
    }

    c.toBlob(blob => {
      if (!blob) return toast('Não foi possível gerar a imagem.', 'err');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mehta-proposta-layout.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Imagem da proposta baixada.', 'ok');
    }, 'image/png');
  }
  $('#downloadBtn').addEventListener('click', downloadPNG);

  /* =====================================================================
     Orçamento / contato
     ===================================================================== */
  function setAttachAvailable(on) {
    const cb = $('#attach');
    cb.disabled = !on;
    if (!on) cb.checked = false;
    $('#attachLbl').innerHTML = on
      ? `Anexar a proposta gerada no simulador <em>(${esc(summaryLine())})</em>`
      : 'Anexar a proposta gerada no simulador <em>(gere uma proposta primeiro)</em>';
  }
  function summaryLine() {
    const R = state.result, o = state.opts;
    if (!R) return '';
    return `${o.purposeText || R.purposeLabel} · ${R.units} × ${R.sizeLabel}`;
  }

  $('#quoteBtn').addEventListener('click', () => {
    const R = state.result, o = state.opts;
    if (!R) return;
    const lines = [
      'Olá! Gerei uma proposta no simulador de layout:',
      `• Finalidade: ${o.purposeText || R.purposeLabel}`,
      `• ${R.units} containers de ${R.sizeLabel} em ${R.lots.length} terreno(s), disposição ${R.layoutName}`,
      `• Área útil estimada: ${fmt(R.areaM2)} m² · ocupação ${fmt(R.occupancy * 100)}%`
    ];
    if (o.desc) lines.push(`Necessidade: ${o.desc}`);
    $('#cfMsg').value = lines.join('\n');
    $('#attach').checked = true;
    scrollToEl($('#contato'));
    setTimeout(() => $('#cfName').focus({ preventScroll: true }), reduced ? 0 : 700);
  });

  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    let first = null;
    ['cfName', 'cfEmail', 'cfPhone'].forEach(id => {
      const i = $('#' + id);
      const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value.trim()));
      i.classList.toggle('invalid', bad);
      if (bad && !first) first = i;
    });
    if (first) { first.focus(); return toast('Preencha os campos obrigatórios.', 'err'); }
    toast('Solicitação enviada! A equipe Mehta entrará em contato. (versão de apresentação)', 'ok');
    e.target.reset();
    setAttachAvailable(!!state.result);
  });
  $$('#contactForm .input').forEach(i => i.addEventListener('input', () => i.classList.remove('invalid')));

  /* =====================================================================
     Estado inicial
     ===================================================================== */
  goStep(1);
})();
