/* Vector Search: a toy HNSW map. 64 points in 2D, three layers, a greedy walk down the layers
   and a small beam search at the bottom. It shows the idea only; the real index is in the repo. */
(() => {
  const root = document.querySelector('[data-ann]');
  if (!root) return;

  const svg = root.querySelector('[data-ann-svg]');
  const slider = root.querySelector('[data-ann-ef]');
  const efOut = root.querySelector('[data-ann-ef-out]');
  const readout = root.querySelector('[data-ann-readout]');
  const randomBtn = root.querySelector('[data-ann-random]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 400, H = 330, N = 64, K = 3;

  function mulberry(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry(11);

  const pts = [];
  for (let tries = 0, gap = 28; pts.length < N; tries++) {
    if (tries > 4000) { gap -= 2; tries = 0; }
    const p = { x: 18 + rand() * (W - 36), y: 16 + rand() * (H - 32) };
    if (pts.every(q => Math.hypot(q.x - p.x, q.y - p.y) > gap)) pts.push(p);
  }

  const order = pts.map((_, i) => i).sort(() => rand() - 0.5);
  const level = new Array(N).fill(0);
  order.slice(0, 3).forEach(i => { level[i] = 2; });
  order.slice(3, 14).forEach(i => { level[i] = 1; });
  const entry = order[0];

  const links = [3, 3, 2];
  const adj = [0, 1, 2].map(() => new Map());
  const edges = [[], [], []];
  for (let l = 0; l < 3; l++) {
    const ids = pts.map((_, i) => i).filter(i => level[i] >= l);
    ids.forEach(i => adj[l].set(i, new Set()));
    ids.forEach(i => {
      ids.filter(j => j !== i)
        .sort((a, b) => Math.hypot(pts[a].x - pts[i].x, pts[a].y - pts[i].y) - Math.hypot(pts[b].x - pts[i].x, pts[b].y - pts[i].y))
        .slice(0, links[l])
        .forEach(j => { adj[l].get(i).add(j); adj[l].get(j).add(i); });
    });
    adj[l].forEach((set, i) => set.forEach(j => { if (i < j) edges[l].push([i, j]); }));
  }

  const make = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    (parent || svg).appendChild(el);
    return el;
  };

  const gEdges = make('g', { class: 'ann-edges' });
  [0, 1, 2].forEach(l => edges[l].forEach(([a, b]) =>
    make('line', { class: 'e' + l, x1: pts[a].x, y1: pts[a].y, x2: pts[b].x, y2: pts[b].y }, gEdges)));
  const gTrail = make('g', { class: 'ann-trail' });
  const gNodes = make('g', { class: 'ann-nodes' });
  const nodeEls = pts.map((p, i) => make('circle', { class: 'n' + level[i], cx: p.x, cy: p.y, r: [3.6, 5.2, 7.4][level[i]] }, gNodes));
  const gRings = make('g', { class: 'ann-rings' });
  const query = make('rect', { class: 'ann-query', x: -6, y: -6, width: 12, height: 12, transform: 'translate(0 0) rotate(45)' });

  let q = { x: 262, y: 206 };
  let timer = null;

  const dist = (id, p) => Math.hypot(pts[id].x - p.x, pts[id].y - p.y);

  function search(ef) {
    const seen = new Set([entry]);
    const steps = [{ node: entry, kind: 'hop' }];
    let cur = entry;
    for (let l = 2; l >= 1; l--) {
      for (let moved = true; moved;) {
        moved = false;
        let best = cur, bd = dist(cur, q);
        adj[l].get(cur).forEach(n => { seen.add(n); const d = dist(n, q); if (d < bd) { bd = d; best = n; } });
        if (best !== cur) { cur = best; moved = true; steps.push({ node: cur, kind: 'hop' }); }
      }
    }
    const byDist = (a, b) => a[0] - b[0];
    const visited = new Set([cur]);
    seen.add(cur);
    const cand = [[dist(cur, q), cur]];
    let best = [[dist(cur, q), cur]];
    while (cand.length) {
      cand.sort(byDist);
      const [d, c] = cand.shift();
      if (best.length >= ef && d > best[ef - 1][0]) break;
      steps.push({ node: c, kind: 'look' });
      adj[0].get(c).forEach(n => {
        if (visited.has(n)) return;
        visited.add(n); seen.add(n);
        const dn = dist(n, q);
        if (best.length < ef || dn < best[best.length - 1][0]) {
          cand.push([dn, n]);
          best.push([dn, n]); best.sort(byDist);
          if (best.length > ef) best.length = ef;
        }
      });
    }
    return { steps, found: best.slice(0, K).map(x => x[1]), looked: seen.size };
  }

  const exact = () => pts.map((_, i) => i).sort((a, b) => dist(a, q) - dist(b, q)).slice(0, K);

  function clear() {
    clearTimeout(timer);
    gTrail.replaceChildren();
    gRings.replaceChildren();
    nodeEls.forEach(el => el.classList.remove('hop', 'look'));
  }

  function place() { query.setAttribute('transform', `translate(${q.x} ${q.y}) rotate(45)`); }

  function finish(result) {
    const truth = exact();
    const hits = result.found.filter(i => truth.includes(i)).length;
    truth.forEach(i => make('circle', { class: 'ring-true', cx: pts[i].x, cy: pts[i].y, r: 12 }, gRings));
    result.found.forEach(i => make('circle', { class: 'ring-found', cx: pts[i].x, cy: pts[i].y, r: 9.5 }, gRings));
    const miss = hits < K ? ' Raise ef to catch the rest.' : '';
    readout.textContent = `The search looked at ${result.looked} of ${N} points. Exact search looks at all ${N}. It found ${hits} of the ${K} true nearest neighbours.${miss}`;
  }

  function run(animate) {
    clear();
    place();
    const ef = Number(slider.value);
    efOut.textContent = ef;
    const result = search(ef);
    let prev = null;
    const apply = (step) => {
      const el = nodeEls[step.node];
      if (step.kind === 'hop') {
        el.classList.add('hop');
        if (prev !== null) make('line', { class: 'trail', x1: pts[prev].x, y1: pts[prev].y, x2: pts[step.node].x, y2: pts[step.node].y }, gTrail);
        prev = step.node;
      } else if (!el.classList.contains('hop')) {
        el.classList.add('look');
      }
    };
    if (!animate || reduceMotion) {
      result.steps.forEach(apply);
      finish(result);
      return;
    }
    readout.textContent = 'Searching...';
    let i = 0;
    timer = setInterval(() => {
      if (i < result.steps.length) { apply(result.steps[i]); i += 1; return; }
      clearInterval(timer);
      finish(result);
    }, 230);
  }

  svg.addEventListener('click', e => {
    const box = svg.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const y = ((e.clientY - box.top) / box.height) * H;
    if (x < 0 || y < 0 || x > W || y > H) return;
    q = { x, y };
    run(true);
  });
  slider.addEventListener('input', () => run(false));
  randomBtn.addEventListener('click', () => {
    q = { x: 24 + Math.random() * (W - 48), y: 22 + Math.random() * (H - 44) };
    run(true);
  });

  /* tabs */
  const tablist = root.closest('.moe').querySelector('[role="tablist"]');
  if (tablist) {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const activate = (tab) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tablist.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) activate(t); });
    tablist.addEventListener('keydown', e => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(tabs.indexOf(document.activeElement) + step + tabs.length) % tabs.length];
      activate(next); next.focus();
    });
  }

  run(false);
})();
