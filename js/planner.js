/*!
 * Mehta · Motor de análise de planta e distribuição de containers
 * --------------------------------------------------------------
 * Roda 100% no navegador:
 *  1. lê a imagem da planta e separa "tinta" (linhas, textos, hachuras) do fundo;
 *  2. identifica regiões livres fechadas (terrenos / lotes) e obstáculos;
 *  3. converte pixels em metros a partir da largura informada pelo usuário;
 *  4. distribui os containers conforme a finalidade (perimetral, fileiras, blocos…).
 */
(function (root) {
  'use strict';

  const MOD_W = 2.44; // largura padrão dos módulos (m)
  const SIZES = {
    '3':  { L: 2.99,  label: '3 m',  feet: '10 pés' },
    '6':  { L: 6.06,  label: '6 m',  feet: '20 pés' },
    '12': { L: 12.19, label: '12 m', feet: '40 pés' }
  };

  const C = { orange: '#FF7300', slate: '#516672', indigo: '#7D7AB8', amber: '#E9A23B' };

  const PURPOSES = {
    canteiro: {
      label: 'Canteiro de obra', icon: 'i-helmet', strategy: 'perimeter', gap: 1.0, setback: 1.0, stack: true,
      autoSizes: ['6', '3'], layoutName: 'perimetral', freeLabel: 'Pátio de manobra e materiais',
      mix: [
        { name: 'Escritório de obra', color: C.slate, share: .3 },
        { name: 'Almoxarifado', color: C.orange, share: .3 },
        { name: 'Vestiário / WC', color: C.indigo, share: .2 },
        { name: 'Refeitório', color: C.amber, share: .2 }
      ], mixMode: 'block',
      why: [
        'Containers junto às divisas, liberando o miolo do terreno para manobra de caminhões, estoque de materiais e frente de obra.',
        'Escritório de obra posicionado próximo ao acesso, para controle de entrada e recebimento de materiais.',
        'Vestiários e refeitório agrupados em sequência, concentrando as ligações hidrossanitárias.'
      ]
    },
    escritorio: {
      label: 'Escritório', icon: 'i-briefcase', strategy: 'rows', k: 2, gapAlong: 1.2, corridor: 2.5, start: 'front', setback: 1.0, stack: true,
      autoSizes: ['6', '3'], layoutName: 'em blocos acoplados', freeLabel: 'Área livre / estacionamento',
      mix: [
        { name: 'Escritório', color: C.orange, share: .8 },
        { name: 'Copa / WC', color: C.indigo, share: .2 }
      ], mixMode: 'spread',
      why: [
        'Módulos acoplados lado a lado formando salas maiores, com corredores de circulação de 2,5 m entre os blocos.',
        'Conjunto implantado próximo ao acesso, reduzindo o percurso de colaboradores e clientes.',
        'Módulos de copa e WC distribuídos entre os escritórios para atender todo o conjunto.'
      ]
    },
    alojamento: {
      label: 'Alojamento', icon: 'i-bed', strategy: 'rows', k: 1, gapAlong: 1.5, corridor: 3.0, start: 'back', setback: 1.5, stack: true,
      autoSizes: ['12', '6', '3'], layoutName: 'em fileiras ventiladas', freeLabel: 'Área de convivência',
      mix: [
        { name: 'Dormitório', color: C.orange, share: .75 },
        { name: 'Sanitário / vestiário', color: C.indigo, share: .25 }
      ], mixMode: 'spread',
      why: [
        'Fileiras com afastamento de 3 m entre módulos, garantindo ventilação cruzada e iluminação natural.',
        'Dormitórios implantados nos fundos do terreno, longe do acesso e do ruído da rua.',
        'Módulos sanitários intercalados aos dormitórios para reduzir deslocamentos.'
      ]
    },
    deposito: {
      label: 'Depósito / Almoxarifado', icon: 'i-box', strategy: 'rows', k: 1, gapAlong: 0.6, corridor: 8.0, start: 'back', setback: 1.0, stack: false,
      autoSizes: ['6', '12', '3'], layoutName: 'linear com pátio de carga', freeLabel: 'Área de manobra e carga',
      mix: [
        { name: 'Depósito', color: C.orange, share: .85 },
        { name: 'Controle', color: C.slate, share: .15 }
      ], mixMode: 'block',
      why: [
        'Containers alinhados a partir do fundo do terreno, com portas voltadas para uma faixa de manobra de 8 m.',
        'Layout linear facilita carga, descarga e o controle do estoque.',
        'Módulo de controle no fim da linha, mais próximo do acesso.'
      ]
    },
    refeitorio: {
      label: 'Refeitório', icon: 'i-utensils', strategy: 'rows', k: 3, gapAlong: 1.5, corridor: 3.0, start: 'front', setback: 1.0, stack: false,
      autoSizes: ['6', '12', '3'], layoutName: 'em salões acoplados', freeLabel: 'Área externa',
      mix: [
        { name: 'Salão', color: C.orange, share: .7 },
        { name: 'Cozinha', color: C.amber, share: .15 },
        { name: 'WC', color: C.indigo, share: .15 }
      ], mixMode: 'block',
      why: [
        'Módulos acoplados em blocos de três, formando salões amplos e contínuos.',
        'Cozinha anexa ao salão, com instalações hidráulicas agrupadas.',
        'Corredores de 3 m para fluxo de entrada e saída nos horários de pico.'
      ]
    },
    vestiario: {
      label: 'Vestiário / Banheiro', icon: 'i-shower', strategy: 'rows', k: 2, gapAlong: 1.2, corridor: 2.0, start: 'front', setback: 1.0, stack: false,
      autoSizes: ['6', '3'], layoutName: 'em pares acoplados', freeLabel: 'Área livre',
      mix: [
        { name: 'Vestiário', color: C.orange, share: .5 },
        { name: 'Banheiro', color: C.indigo, share: .5 }
      ], mixMode: 'spread',
      why: [
        'Módulos sanitários acoplados em pares, concentrando as redes de água e esgoto.',
        'Instalações hidrossanitárias chegam prontas de fábrica: basta conectar.',
        'Circulação de 2 m entre os blocos para acesso e manutenção.'
      ]
    },
    comercial: {
      label: 'Comercial / Quiosque', icon: 'i-store', strategy: 'perimeter', gap: 2.0, setback: 1.0, stack: false,
      autoSizes: ['6', '3'], layoutName: 'em U com praça central', freeLabel: 'Praça central',
      mix: [
        { name: 'Loja / quiosque', color: C.orange, share: .85 },
        { name: 'WC', color: C.indigo, share: .15 }
      ], mixMode: 'block',
      why: [
        'Módulos nas bordas do terreno com frentes voltadas para uma praça central de convivência.',
        'Passagens de 2 m entre os módulos para circulação do público.',
        'Banheiros agrupados ao final do conjunto, sem interromper as vitrines.'
      ]
    },
    eventos: {
      label: 'Eventos / Estandes', icon: 'i-flag', strategy: 'perimeter', gap: 2.5, setback: 1.0, stack: false,
      autoSizes: ['3', '6'], layoutName: 'perimetral com área central', freeLabel: 'Área do evento',
      mix: [
        { name: 'Apoio / bilheteria', color: C.slate, share: .12 },
        { name: 'Estande', color: C.orange, share: .73 },
        { name: 'WC', color: C.indigo, share: .15 }
      ], mixMode: 'block',
      why: [
        'Estandes distribuídos no perímetro, liberando a área central para público e palco.',
        'Passagens de 2,5 m entre módulos para fluxo de pessoas e rotas de fuga.',
        'Módulo de apoio e bilheteria posicionado junto ao acesso.'
      ]
    },
    sala: {
      label: 'Sala de aula', icon: 'i-book', strategy: 'rows', k: 1, gapAlong: 2.0, corridor: 4.0, start: 'back', setback: 1.5, stack: true,
      autoSizes: ['12', '6'], layoutName: 'em fileiras com pátio', freeLabel: 'Pátio',
      mix: [
        { name: 'Sala de aula', color: C.orange, share: .75 },
        { name: 'Coordenação', color: C.slate, share: .1 },
        { name: 'WC', color: C.indigo, share: .15 }
      ], mixMode: 'spread',
      why: [
        'Salas em fileiras afastadas 4 m entre si, formando pátios sombreados e bem ventilados.',
        'Implantação a partir dos fundos, afastando as salas do ruído da rua.',
        'Coordenação e sanitários distribuídos para atender todas as salas.'
      ]
    },
    saude: {
      label: 'Saúde', icon: 'i-cross', strategy: 'rows', k: 2, gapAlong: 1.5, corridor: 3.0, start: 'front', setback: 1.0, stack: false,
      autoSizes: ['6', '12', '3'], layoutName: 'em blocos acoplados', freeLabel: 'Área de espera externa',
      mix: [
        { name: 'Consultório', color: C.orange, share: .6 },
        { name: 'Recepção', color: C.slate, share: .2 },
        { name: 'WC', color: C.indigo, share: .2 }
      ], mixMode: 'spread',
      why: [
        'Consultórios acoplados em pares, otimizando instalações e fluxos internos.',
        'Conjunto próximo ao acesso, facilitando a chegada de pacientes.',
        'Corredores de 3 m compatíveis com macas e cadeiras de rodas.'
      ]
    },
    outro: {
      label: 'Outro', icon: 'i-dots', strategy: 'rows', k: 1, gapAlong: 1.5, corridor: 2.5, start: 'front', setback: 1.0, stack: true,
      autoSizes: ['6', '3'], layoutName: 'em fileiras', freeLabel: 'Área livre',
      mix: [{ name: 'Módulo', color: C.orange, share: 1 }], mixMode: 'block',
      why: [
        'Módulos organizados em fileiras regulares, otimizando o aproveitamento do terreno.',
        'Corredores de 2,5 m garantem circulação e acesso para manutenção.',
        'Disposição modular permite ampliar o conjunto no futuro.'
      ]
    }
  };

  // Frente do terreno -> transformação para um quadro onde a frente fica "embaixo"
  const FRONT = {
    bottom: {},
    top: { flipY: true },
    left: { flipX: true, transpose: true },
    right: { transpose: true }
  };

  /* ------------------------------------------------------------------ utilidades de grade */

  function applyFrame(m, w, h, fr) {
    let a = m, W = w, H = h;
    if (fr.flipX) {
      const b = new a.constructor(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b[y * W + x] = a[y * W + (W - 1 - x)];
      a = b;
    }
    if (fr.flipY) {
      const b = new a.constructor(W * H);
      for (let y = 0; y < H; y++) b.set(a.subarray((H - 1 - y) * W, (H - y) * W), y * W);
      a = b;
    }
    if (fr.transpose) {
      const b = new a.constructor(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b[x * H + y] = a[y * W + x];
      a = b; const t = W; W = H; H = t;
    }
    return { m: a, w: W, h: H };
  }

  function invRect(q, fr, w0, h0) {
    let x = q.x, y = q.y, w = q.w, h = q.h;
    if (fr.transpose) { let t = x; x = y; y = t; t = w; w = h; h = t; }
    if (fr.flipY) y = h0 - y - h;
    if (fr.flipX) x = w0 - x - w;
    return { x, y, w, h };
  }

  function invPoint(p, fr, w0, h0) {
    let x = p.x, y = p.y;
    if (fr.transpose) { const t = x; x = y; y = t; }
    if (fr.flipY) y = h0 - y;
    if (fr.flipX) x = w0 - x;
    return { x, y };
  }

  function integral(m, w, h) {
    const W = w + 1, ii = new Int32Array(W * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        row += m[y * w + x];
        ii[(y + 1) * W + (x + 1)] = ii[y * W + (x + 1)] + row;
      }
    }
    return ii;
  }

  function sumRect(ii, w, x, y, cw, ch) {
    const W = w + 1;
    return ii[(y + ch) * W + (x + cw)] - ii[y * W + (x + cw)] - ii[(y + ch) * W + x] + ii[y * W + x];
  }

  // retângulo em coordenadas contínuas (células) totalmente livre?
  function rectFree(ii, w, h, x, y, rw, rh) {
    const x0 = Math.floor(x + 1e-6), y0 = Math.floor(y + 1e-6);
    const x1 = Math.ceil(x + rw - 1e-6), y1 = Math.ceil(y + rh - 1e-6);
    if (x0 < 0 || y0 < 0 || x1 > w || y1 > h) return false;
    const cw = x1 - x0, ch = y1 - y0;
    return sumRect(ii, w, x0, y0, cw, ch) === cw * ch;
  }

  // transformada de distância (chanfro 1 / √2) até a célula bloqueada mais próxima
  function distT(m, w, h) {
    const d = new Float32Array(w * h), BIG = 1e6, D = Math.SQRT2;
    for (let i = 0; i < w * h; i++) d[i] = m[i] ? BIG : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!d[i]) continue;
      const l = x > 0 ? d[i - 1] : 0, u = y > 0 ? d[i - w] : 0;
      const ul = x > 0 && y > 0 ? d[i - w - 1] : 0, ur = x < w - 1 && y > 0 ? d[i - w + 1] : 0;
      d[i] = Math.min(d[i], l + 1, u + 1, ul + D, ur + D);
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; if (!d[i]) continue;
      const r = x < w - 1 ? d[i + 1] : 0, dn = y < h - 1 ? d[i + w] : 0;
      const dr = x < w - 1 && y < h - 1 ? d[i + w + 1] : 0, dl = x > 0 && y < h - 1 ? d[i + w - 1] : 0;
      d[i] = Math.min(d[i], r + 1, dn + 1, dr + D, dl + D);
    }
    return d;
  }

  function dilate(src, w, h, R) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!src[y * w + x]) continue;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= w) continue;
          out[yy * w + xx] = 1;
        }
      }
    }
    return out;
  }

  function bboxOf(cells, gw) {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const i of cells) {
      const x = i % gw, y = (i / gw) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { x0, y0, x1, y1 };
  }

  function largestRemainder(n, weights) {
    const tot = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map(w => n * w / tot);
    const out = raw.map(Math.floor);
    let left = n - out.reduce((a, b) => a + b, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return out;
  }

  /* ------------------------------------------------------------------ 1. análise da imagem */

  function analyze(src) {
    const MAXD = 800, CELL = 4;
    const sc = Math.min(1, MAXD / Math.max(src.width, src.height));
    const aw = Math.max(1, Math.round(src.width * sc)), ah = Math.max(1, Math.round(src.height * sc));
    const cv = document.createElement('canvas'); cv.width = aw; cv.height = ah;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, aw, ah);
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(src, 0, 0, aw, ah);
    const px = cx.getImageData(0, 0, aw, ah).data;

    // luminância + fundo (moda na metade clara do histograma)
    const lum = new Uint8Array(aw * ah), hist = new Uint32Array(256);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {
      const l = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
      lum[j] = l; hist[l]++;
    }
    let bg = 255, best = -1;
    for (let l = 120; l < 256; l++) if (hist[l] > best) { best = hist[l]; bg = l; }
    const thr = Math.max(60, bg - 38);

    // grade de células: "tinta" = linhas, textos, hachuras, símbolos
    const gw = Math.ceil(aw / CELL), gh = Math.ceil(ah / CELL), N = gw * gh;
    const cnt = new Uint16Array(N);
    for (let y = 0; y < ah; y++) {
      const row = ((y / CELL) | 0) * gw;
      for (let x = 0; x < aw; x++) if (lum[y * aw + x] < thr) cnt[row + ((x / CELL) | 0)]++;
    }
    const ink = new Uint8Array(N);
    let inkCells = 0, ix0 = gw, iy0 = gh, ix1 = -1, iy1 = -1;
    for (let i = 0; i < N; i++) if (cnt[i] >= 2) {
      ink[i] = 1; inkCells++;
      const x = i % gw, y = (i / gw) | 0;
      if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y;
    }

    // fechamento: dilata a tinta para vedar pequenas aberturas (portas, falhas de traço)
    const R = 3;
    const bar = dilate(ink, gw, gh, R);
    const lab = new Int32Array(N); // 0 livre · -1 barreira · -2 exterior · >0 região
    for (let i = 0; i < N; i++) if (bar[i]) lab[i] = -1;
    const q = new Int32Array(N);
    let qh = 0, qt = 0;
    const seed = i => { if (lab[i] === 0) { lab[i] = -2; q[qt++] = i; } };
    for (let x = 0; x < gw; x++) { seed(x); seed((gh - 1) * gw + x); }
    for (let y = 0; y < gh; y++) { seed(y * gw); seed(y * gw + gw - 1); }
    while (qh < qt) {
      const i = q[qh++], x = i % gw, y = (i / gw) | 0;
      if (x > 0) seed(i - 1); if (x < gw - 1) seed(i + 1); if (y > 0) seed(i - gw); if (y < gh - 1) seed(i + gw);
    }

    // regiões internas fechadas
    let comps = [], id = 0;
    for (let s = 0; s < N; s++) {
      if (lab[s] !== 0) continue;
      id++; qh = qt = 0; lab[s] = id; q[qt++] = s;
      const cells = [];
      while (qh < qt) {
        const i = q[qh++]; cells.push(i);
        const x = i % gw, y = (i / gw) | 0;
        const nb = [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, y > 0 ? i - gw : -1, y < gh - 1 ? i + gw : -1];
        for (const n of nb) if (n >= 0 && lab[n] === 0) { lab[n] = id; q[qt++] = n; }
      }
      comps.push({ id, cells });
    }
    // desfaz o fechamento: devolve às regiões as células de barreira que não são tinta
    for (const c of comps) {
      let frontier = c.cells.slice();
      for (let r = 0; r < R; r++) {
        const nf = [];
        for (const i of frontier) {
          const x = i % gw, y = (i / gw) | 0;
          const nb = [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, y > 0 ? i - gw : -1, y < gh - 1 ? i + gw : -1];
          for (const n of nb) if (n >= 0 && lab[n] === -1 && !ink[n]) { lab[n] = c.id; nf.push(n); c.cells.push(n); }
        }
        frontier = nf;
      }
      c.area = c.cells.length;
      c.bbox = bboxOf(c.cells, gw);
    }
    const minArea = N * 0.012;
    comps = comps.filter(c => c.area >= minArea).sort((a, b) => b.area - a.area);
    if (comps.length) { const big = comps[0].area; comps = comps.filter(c => c.area >= big * 0.15); }

    const an = { aw, ah, sc, CELL, gw, gh, ink, srcW: src.width, srcH: src.height, k: CELL / sc, comps, fallback: false };

    if (!comps.length) {
      an.fallback = true;
      if (inkCells > 30 && ix1 - ix0 > gw * 0.2 && iy1 - iy0 > gh * 0.2) {
        an.comps = [rectComp(an, ix0 + 1, iy0 + 1, ix1 - 1, iy1 - 1)];
      } else {
        const mx = Math.round(gw * 0.06), my = Math.round(gh * 0.06);
        an.comps = [rectComp(an, mx, my, gw - 1 - mx, gh - 1 - my)];
      }
    }
    return an;
  }

  function rectComp(an, x0, y0, x1, y1) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(an.gw - 1, x1); y1 = Math.min(an.gh - 1, y1);
    const cells = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * an.gw + x; if (!an.ink[i]) cells.push(i); }
    return { cells, area: cells.length, bbox: { x0, y0, x1, y1 }, rect: true };
  }

  // caminhos de preenchimento e contorno de uma região (retângulos manuais ficam limpos)
  function regionPaths(an, c) {
    if (c.rect) {
      const b = bboxPx(an, c.bbox);
      const d = `M${b.x.toFixed(1)} ${b.y.toFixed(1)}h${b.w.toFixed(1)}v${b.h.toFixed(1)}h${(-b.w).toFixed(1)}z`;
      return { fill: d, outline: d };
    }
    return { fill: compPath(an, c.cells), outline: compOutline(an, c.cells) };
  }

  // retângulos desenhados pelo usuário (px da imagem) -> regiões
  function manualComps(an, rects) {
    return rects.map(r => {
      const f = an.sc / an.CELL;
      return rectComp(an, Math.ceil(r.x * f), Math.ceil(r.y * f), Math.floor((r.x + r.w) * f) - 1, Math.floor((r.y + r.h) * f) - 1);
    }).filter(c => c.area > 0).sort((a, b) => b.area - a.area);
  }

  // contorno de uma região como path SVG (em px da imagem original)
  function compPath(an, cells) {
    const k = an.k, gw = an.gw;
    const set = new Uint8Array(an.gw * an.gh);
    let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
    for (const i of cells) { set[i] = 1; const x = i % gw, y = (i / gw) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    let d = '';
    for (let y = y0; y <= y1; y++) {
      let x = x0;
      while (x <= x1) {
        if (!set[y * gw + x]) { x++; continue; }
        const s = x; while (x <= x1 && set[y * gw + x]) x++;
        d += `M${(s * k).toFixed(1)} ${(y * k).toFixed(1)}h${((x - s) * k).toFixed(1)}v${k.toFixed(1)}h${(-(x - s) * k).toFixed(1)}z`;
      }
    }
    return d;
  }

  // somente o contorno (bordas entre células dentro/fora), para traço
  function compOutline(an, cells) {
    const k = an.k, gw = an.gw, gh = an.gh;
    const set = new Uint8Array(gw * gh);
    let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
    for (const i of cells) { set[i] = 1; const x = i % gw, y = (i / gw) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const at = (x, y) => (x >= 0 && y >= 0 && x < gw && y < gh) ? set[y * gw + x] : 0;
    const f = v => (v * k).toFixed(1);
    let d = '';
    for (let y = y0; y <= y1 + 1; y++) {
      let x = x0;
      while (x <= x1) {
        if (at(x, y - 1) === at(x, y)) { x++; continue; }
        const s = x; while (x <= x1 && at(x, y - 1) !== at(x, y)) x++;
        d += `M${f(s)} ${f(y)}H${f(x)}`;
      }
    }
    for (let x = x0; x <= x1 + 1; x++) {
      let y = y0;
      while (y <= y1) {
        if (at(x - 1, y) === at(x, y)) { y++; continue; }
        const s = y; while (y <= y1 && at(x - 1, y) !== at(x, y)) y++;
        d += `M${f(x)} ${f(s)}V${f(y)}`;
      }
    }
    return d;
  }

  function bboxPx(an, b) {
    const k = an.k;
    return { x: b.x0 * k, y: b.y0 * k, w: (b.x1 - b.x0 + 1) * k, h: (b.y1 - b.y0 + 1) * k };
  }

  // área em células contando até o eixo das linhas de divisa (meia célula de "tinta" vizinha)
  function areaOf(an, cells) {
    const gw = an.gw, gh = an.gh, set = new Uint8Array(gw * gh), rim = new Uint8Array(gw * gh);
    for (const i of cells) set[i] = 1;
    let r = 0;
    for (const i of cells) {
      const x = i % gw, y = (i / gw) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, y > 0 ? i - gw : -1, y < gh - 1 ? i + gw : -1];
      for (const n of nb) if (n >= 0 && an.ink[n] && !set[n] && !rim[n]) { rim[n] = 1; r++; }
    }
    return cells.length + r * 0.5;
  }

  function unionBox(pool) {
    const u = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
    for (const c of pool) {
      u.x0 = Math.min(u.x0, c.bbox.x0); u.y0 = Math.min(u.y0, c.bbox.y0);
      u.x1 = Math.max(u.x1, c.bbox.x1); u.y1 = Math.max(u.y1, c.bbox.y1);
    }
    return u;
  }

  // metros por célula a partir da largura total informada
  function metersPerCell(pool, widthM) {
    const u = unionBox(pool);
    return widthM / Math.max(1, u.x1 - u.x0 + 2); // +1 célula ≈ meia espessura das divisas de cada lado
  }

  /* ------------------------------------------------------------------ 2. seleção dos terrenos */

  function splitComp(c, gw) {
    const vertical = (c.bbox.x1 - c.bbox.x0) >= (c.bbox.y1 - c.bbox.y0);
    const coord = i => vertical ? i % gw : (i / gw) | 0;
    const vals = c.cells.map(coord).sort((a, b) => a - b);
    const cut = vals[vals.length >> 1];
    const A = [], B = [];
    for (const i of c.cells) (coord(i) < cut ? A : B).push(i);
    const mk = cells => ({ cells, area: cells.length, bbox: bboxOf(cells, gw), cut: { axis: vertical ? 'x' : 'y', at: cut } });
    return [mk(A), mk(B)].filter(p => p.area > 0);
  }

  function selectLots(pool, n, an) {
    let lots = pool.slice(0, n).map(c => ({ cells: c.cells, area: c.area, bbox: Object.assign({}, c.bbox), rect: c.rect }));
    let guard = 0;
    while (lots.length < n && guard++ < 24) {
      lots.sort((a, b) => b.area - a.area);
      const parts = splitComp(lots.shift(), an.gw);
      if (parts.length < 2) { lots.push(...parts); break; }
      lots.push(...parts);
    }
    const tol = an.gh * 0.15;
    lots.sort((a, b) => {
      const ay = (a.bbox.y0 + a.bbox.y1) / 2, by = (b.bbox.y0 + b.bbox.y1) / 2;
      if (Math.abs(ay - by) > tol) return ay - by;
      return (a.bbox.x0 + a.bbox.x1) / 2 - (b.bbox.x0 + b.bbox.x1) / 2;
    });
    return lots;
  }

  /* ------------------------------------------------------------------ 3. distribuição */

  function prepareLot(lot, an, mpc, P, front) {
    const { x0, y0, x1, y1 } = lot.bbox;
    const W = x1 - x0 + 1, H = y1 - y0 + 1;
    const allowed = new Uint8Array(W * H);
    let areaCells = 0;
    for (const i of lot.cells) {
      if (an.ink[i]) continue;
      const gx = i % an.gw, gy = (i / an.gw) | 0;
      allowed[(gy - y0) * W + (gx - x0)] = 1; areaCells++;
    }
    const F = FRONT[front] || FRONT.bottom;
    const A = applyFrame(allowed, W, H, F);
    const dt = distT(A.m, A.w, A.h);
    const s = P.setback / mpc;
    const usable = new Uint8Array(A.w * A.h);
    for (let i = 0; i < usable.length; i++) usable[i] = dt[i] > s ? 1 : 0;

    // faixa de acesso livre (4 m) no centro da frente do terreno
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) if (A.m[y * A.w + x]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const cxA = (minX + maxX + 1) / 2;
    const half = 2.0 / mpc, depth = Math.min(9 / mpc, 0.32 * (maxY - minY + 1));
    for (let y = Math.max(0, Math.floor(maxY + 1 - depth)); y <= maxY; y++)
      for (let x = Math.max(0, Math.floor(cxA - half)); x < Math.min(A.w, Math.ceil(cxA + half)); x++) usable[y * A.w + x] = 0;

    return { lot, x0, y0, W, H, F, A: { w: A.w, h: A.h }, allowedLocal: allowed, dt, usable, accessA: { x: cxA, y: maxY + 1 }, areaCells };
  }

  function gapOK(c, placed, g) {
    for (const p of placed) {
      const dx = Math.max(p.x - (c.x + c.w), c.x - (p.x + p.w));
      const dy = Math.max(p.y - (c.y + c.h), c.y - (p.y + p.h));
      if (dx < g - 1e-6 && dy < g - 1e-6) return false;
    }
    return true;
  }

  // containers encostados nas divisas, em cadeia a partir do acesso
  function perimeterPlace(U, dt, w, h, Lc, Wc, g, cap, acc) {
    const ii = integral(U, w, h);
    const q = Math.max(1, Wc * 0.3);
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 22000)));
    const cands = [];
    for (const [rw, rh] of [[Lc, Wc], [Wc, Lc]]) {
      const cw = Math.ceil(rw), ch = Math.ceil(rh);
      for (let y = 0; y + ch <= h; y += step) for (let x = 0; x + cw <= w; x += step) {
        if (sumRect(ii, w, x, y, cw, ch) !== cw * ch) continue;
        const cx = x + rw / 2, cy = y + rh / 2;
        cands.push({ x, y, w: rw, h: rh, cx, cy, base: Math.round(dt[(cy | 0) * w + (cx | 0)] / q) });
      }
    }
    const used = new Uint8Array(cands.length), placed = [];
    let ref = acc;
    while (placed.length < cap) {
      let bi = -1, bs = Infinity;
      for (let i = 0; i < cands.length; i++) {
        if (used[i]) continue;
        const c = cands[i];
        const sc = c.base * 1e6 + Math.hypot(c.cx - ref.x, c.cy - ref.y);
        if (sc >= bs) continue;
        if (!gapOK(c, placed, g)) { used[i] = 1; continue; }
        bs = sc; bi = i;
      }
      if (bi < 0) break;
      used[bi] = 1;
      const c = cands[bi];
      placed.push({ x: c.x, y: c.y, w: c.w, h: c.h });
      ref = { x: c.cx, y: c.cy };
    }
    return placed;
  }

  // fileiras (bandas) de containers, com acoplamento k e corredores
  function rowsPlace(U, w, h, Lc, Wc, k, gA, cor, cap) {
    const ii = integral(U, w, h);
    const valid = (x, y, rw, rh) => rectFree(ii, w, h, x, y, rw, rh);
    const out = [];
    let y = 0;
    while (y + Wc <= h + 1e-6 && out.length < cap) {
      const band = [];
      let x = 0;
      while (x + Lc <= w + 1e-6 && out.length + band.length < cap) {
        if (valid(x, y, Lc, Wc)) {
          band.push({ x, y, w: Lc, h: Wc });
          for (let j = 1; j < k && out.length + band.length < cap; j++) {
            const yy = y + j * Wc;
            if (valid(x, yy, Lc, Wc)) band.push({ x, y: yy, w: Lc, h: Wc }); else break;
          }
          x += Lc + gA;
        } else x += 1;
      }
      if (band.length) {
        // centraliza a fileira no espaço livre à direita
        let s = 0;
        while (s < w && band.every(r => valid(r.x + s + 1, r.y, r.w, r.h))) s++;
        const sh = Math.floor(s / 2);
        if (sh) band.forEach(r => { r.x += sh; });
        out.push(...band);
        y += k * Wc + cor;
      } else y += 1;
    }
    return out;
  }

  function placeInLot(pl, P, sk, mpc, cap) {
    if (cap <= 0) return [];
    const L = SIZES[sk].L / mpc, Wd = MOD_W / mpc;
    let rectsA;
    if (P.strategy === 'perimeter') {
      rectsA = perimeterPlace(pl.usable, pl.dt, pl.A.w, pl.A.h, L, Wd, P.gap / mpc, cap, pl.accessA);
    } else {
      let best = null;
      for (const vert of [false, true]) {
        const fr = { flipY: P.start === 'front', transpose: vert };
        const M = applyFrame(pl.usable, pl.A.w, pl.A.h, fr);
        const r = rowsPlace(M.m, M.w, M.h, L, Wd, P.k, P.gapAlong / mpc, P.corridor / mpc, cap)
          .map(q => invRect(q, fr, pl.A.w, pl.A.h));
        const pref = vert ? pl.A.h > pl.A.w : pl.A.w >= pl.A.h;
        if (!best || r.length > best.r.length || (r.length === best.r.length && pref && !best.pref)) best = { r, pref };
      }
      rectsA = best.r;
    }
    return rectsA.map(q => invRect(q, pl.F, pl.W, pl.H));
  }

  // maior "clareira" restante no terreno (para rotular a área livre)
  function freeSpot(pl, rectsLocal, mpc) {
    const W = pl.W, H = pl.H;
    const local = pl.allowedLocal.slice();
    const e = 1.0 / mpc;
    for (const r of rectsLocal) {
      for (let y = Math.max(0, Math.floor(r.y - e)); y < Math.min(H, Math.ceil(r.y + r.h + e)); y++)
        for (let x = Math.max(0, Math.floor(r.x - e)); x < Math.min(W, Math.ceil(r.x + r.w + e)); x++) local[y * W + x] = 0;
    }
    const d = distT(local, W, H);
    let bi = -1, bv = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > bv) { bv = d[i]; bi = i; }
    if (bi < 0 || bv * mpc < 2.2) return null;
    return { x: (bi % W) + 0.5, y: ((bi / W) | 0) + 0.5, r: bv };
  }

  function assignUses(m, P) {
    const mix = P.mix;
    const counts = largestRemainder(m, mix.map(x => x.share));
    if (m > 0 && counts[0] === 0) { const j = counts.findIndex(c => c > 0); counts[j]--; counts[0]++; }
    const seq = [];
    if (P.mixMode === 'spread') {
      const arr = new Array(m).fill(-1);
      for (let j = 1; j < mix.length; j++) {
        for (let t = 0; t < counts[j]; t++) {
          let pos = Math.min(m - 1, Math.floor((t + 0.5) * m / counts[j]));
          let off = 0;
          while (off < m) {
            const a = pos + off, b = pos - off;
            if (a < m && arr[a] === -1) { pos = a; break; }
            if (b >= 0 && arr[b] === -1) { pos = b; break; }
            off++;
          }
          arr[pos] = j;
        }
      }
      for (let i = 0; i < m; i++) seq.push(arr[i] === -1 ? 0 : arr[i]);
    } else {
      mix.forEach((_, j) => { for (let t = 0; t < counts[j]; t++) seq.push(j); });
    }
    return seq;
  }

  function plan(an, o) {
    const P = PURPOSES[o.purpose] || PURPOSES.outro;
    const manual = !!(o.manual && o.manual.length);
    const pool = manual ? manualComps(an, o.manual) : an.comps;
    if (!pool.length) throw new Error('Nenhuma área disponível');
    // a escala vem sempre da área desenhada detectada (a cota informada), mesmo com áreas manuais
    const mpc = metersPerCell(an.comps, o.widthM);
    const lots = selectLots(pool, Math.max(1, o.lots), an);
    const prep = lots.map(l => prepareLot(l, an, mpc, P, o.front));

    // escolha do tamanho do módulo
    const keys = o.size === 'auto' ? P.autoSizes : [o.size];
    let chosen = null, alt = null;
    for (const sk of keys) {
      const caps = prep.map(pl => placeInLot(pl, P, sk, mpc, 9999).length);
      const total = caps.reduce((a, b) => a + b, 0);
      const cand = { sk, caps, total };
      if (total >= o.count) { chosen = cand; break; }
      if (!alt || total > alt.total) alt = cand;
    }
    chosen = chosen || alt;

    // divisão proporcional entre terrenos, respeitando a capacidade de cada um
    const alloc = largestRemainder(o.count, prep.map(p => p.areaCells)).map((a, i) => Math.min(a, chosen.caps[i]));
    let left = o.count - alloc.reduce((a, b) => a + b, 0);
    while (left > 0) {
      let bi = -1, bv = 0;
      chosen.caps.forEach((c, i) => { const room = c - alloc[i]; if (room > bv) { bv = room; bi = i; } });
      if (bi < 0) break;
      alloc[bi]++; left--;
    }

    const k = an.k, ppm = k / mpc;
    const items = [], outLots = [];
    prep.forEach((pl, li) => {
      const rects = placeInLot(pl, P, chosen.sk, mpc, alloc[li]);
      const bb = bboxPx(an, pl.lot.bbox);
      rects.forEach(r => items.push({ x: (r.x + pl.x0) * k, y: (r.y + pl.y0) * k, w: r.w * k, h: r.h * k, lot: li }));
      const acc = invPoint(pl.accessA, pl.F, pl.W, pl.H);
      const fs = freeSpot(pl, rects, mpc);
      let cut = null;
      if (pl.lot.cut) {
        const c = pl.lot.cut;
        cut = c.axis === 'x'
          ? { x1: c.at * k, y1: bb.y, x2: c.at * k, y2: bb.y + bb.h }
          : { x1: bb.x, y1: c.at * k, x2: bb.x + bb.w, y2: c.at * k };
      }
      outLots.push({
        path: regionPaths(an, pl.lot).fill,
        outline: regionPaths(an, pl.lot).outline,
        bbox: bb,
        center: { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 },
        areaM2: areaOf(an, pl.lot.cells) * mpc * mpc,
        access: { x: (acc.x + pl.x0) * k, y: (acc.y + pl.y0) * k, dir: o.front || 'bottom' },
        free: fs ? { x: (fs.x + pl.x0) * k, y: (fs.y + pl.y0) * k } : null,
        cut,
        count: rects.length
      });
    });

    // empilhamento quando a área não comporta todos os módulos
    let stackedCount = 0, unplaced = o.count - items.length;
    if (unplaced > 0 && P.stack && items.length) {
      stackedCount = Math.min(unplaced, items.length);
      for (let i = 0; i < stackedCount; i++) items[i].stacked = true;
      unplaced -= stackedCount;
    }

    // usos (composição) por módulo
    const seq = assignUses(items.length, P);
    const legendMap = new Map();
    items.forEach((it, i) => {
      const u = P.mix[seq[i]] || P.mix[0];
      it.use = u.name; it.color = u.color;
      const units = it.stacked ? 2 : 1;
      const e = legendMap.get(u.name) || { name: u.name, color: u.color, count: 0, lots: new Set() };
      e.count += units; e.lots.add(it.lot);
      legendMap.set(u.name, e);
    });
    const legend = P.mix.map(m => legendMap.get(m.name)).filter(Boolean);

    const S = SIZES[chosen.sk];
    const areaM2 = outLots.reduce((a, l) => a + l.areaM2, 0);
    const occupiedM2 = items.length * S.L * MOD_W;
    const units = items.length + stackedCount;

    // validador para ajustes manuais (arrastar / girar)
    const allowG = new Uint8Array(an.gw * an.gh);
    lots.forEach(l => l.cells.forEach(i => { if (!an.ink[i]) allowG[i] = 1; }));
    const iiG = integral(allowG, an.gw, an.gh);
    const check = (r, idx, list) => {
      const x = r.x / k, y = r.y / k, w = r.w / k, h = r.h / k;
      if (!rectFree(iiG, an.gw, an.gh, x, y, w, h)) return false;
      for (let j = 0; j < list.length; j++) {
        if (j === idx) continue;
        const p = list[j];
        if (r.x < p.x + p.w - 0.5 && p.x < r.x + r.w - 0.5 && r.y < p.y + p.h - 0.5 && p.y < r.y + r.h - 0.5) return false;
      }
      return true;
    };

    return {
      lots: outLots, items, legend,
      sizeKey: chosen.sk, sizeLabel: S.label, sizeFeet: S.feet,
      purposeKey: o.purpose, purposeLabel: P.label, layoutName: P.layoutName, freeLabel: P.freeLabel,
      requested: o.count, units, stackedCount, unplaced,
      areaM2, occupiedM2, freeM2: Math.max(0, areaM2 - occupiedM2), occupancy: areaM2 ? occupiedM2 / areaM2 : 0,
      pxPerM: ppm, mpc, detected: pool.length, manual, fallback: an.fallback && !manual,
      autoSize: o.size === 'auto', setback: P.setback, corridor: P.corridor, check
    };
  }

  root.Planner = { analyze, plan, manualComps, compPath, compOutline, regionPaths, areaOf, bboxPx, unionBox, metersPerCell, PURPOSES, SIZES, MOD_W };
})(window);
