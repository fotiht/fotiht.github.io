/* Story MoE, extra controls: how many experts run per word, where the whole sentence goes,
   and a click on an expert to light up the words it handles. The router is a toy with fixed
   random weights, the same one script.js uses, so k = 2 matches it exactly. */
(() => {
  const router = document.querySelector('[data-router]');
  if (!router || typeof hash !== 'function') return;

  const tokensEl = router.querySelector('[data-tokens]');
  const experts = [...router.querySelectorAll('[data-ex]')];
  const wires = [...router.querySelectorAll('[data-w]')];
  const desc = router.querySelector('[data-desc]');
  const NS = 'http://www.w3.org/2000/svg';
  const BAR = 68;
  let k = 2;
  let pinned = null;

  function logits(word) {
    let seed = hash(word) || 1;
    return [0, 1, 2, 3].map(() => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
      return (seed / 4294967296) * 4 - 2;
    });
  }
  function pick(word, count) {
    const top = logits(word).map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, count);
    const exp = top.map(([v]) => Math.exp(v));
    const sum = exp.reduce((a, b) => a + b, 0);
    return top.map(([, i], n) => ({ expert: i, weight: exp[n] / sum }));
  }

  /* weight bars inside each expert box */
  const bars = experts.map(g => {
    const box = g.querySelector('rect');
    const x = Number(box.getAttribute('x')) + 8;
    const y = Number(box.getAttribute('y')) + 50;
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('class', 'wbar-bg');
    bg.setAttribute('x', x); bg.setAttribute('y', y); bg.setAttribute('width', BAR); bg.setAttribute('height', 4);
    const fill = document.createElementNS(NS, 'rect');
    fill.setAttribute('class', 'wbar');
    fill.setAttribute('x', x); fill.setAttribute('y', y); fill.setAttribute('width', 0); fill.setAttribute('height', 4);
    g.append(bg, fill);
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-pressed', 'false');
    g.setAttribute('aria-label', `Expert ${Number(g.dataset.ex) + 1}: show the words it handles`);
    return fill;
  });

  /* controls */
  const extra = document.createElement('div');
  extra.className = 'moe-extra';
  extra.innerHTML = `
    <div class="moe-k" role="group" aria-label="Experts that run for each word">
      <span>Experts per word</span>
      <button type="button" class="tok" data-k="1" aria-pressed="false">1</button>
      <button type="button" class="tok is-on" data-k="2" aria-pressed="true">2 (the model)</button>
      <button type="button" class="tok" data-k="4" aria-pressed="false">All 4</button>
    </div>
    <p class="moe-meter" role="status" aria-live="polite"></p>
    <div class="moe-bar" aria-hidden="true"><i></i></div>
    <div class="moe-load" aria-label="How many words of the sentence go to each expert"></div>
    <p class="moe-help"></p>`;
  router.querySelector('.router-note').before(extra);
  const meter = extra.querySelector('.moe-meter');
  const meterBar = extra.querySelector('.moe-bar i');
  const load = extra.querySelector('.moe-load');
  const help = extra.querySelector('.moe-help');
  load.innerHTML = [0, 1, 2, 3].map(i => `<div class="moe-col"><span class="n">0</span><i></i><em>Expert ${i + 1}</em></div>`).join('');
  const cols = [...load.children];

  const observer = new MutationObserver(() => schedule());
  const watch = () => observer.observe(tokensEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; apply(); });
  }

  function apply() {
    observer.disconnect();
    const buttons = [...tokensEl.querySelectorAll('.tok')];
    const active = buttons.find(b => b.classList.contains('is-on'));
    if (active) {
      const picks = pick(active.textContent, k);
      const chosen = new Map(picks.map(p => [p.expert, p.weight]));
      experts.forEach((g, i) => {
        g.classList.toggle('on', chosen.has(i));
        g.querySelector('[data-wt]').textContent = chosen.has(i) ? chosen.get(i).toFixed(2) : '0.00';
        bars[i].setAttribute('width', ((chosen.get(i) || 0) * BAR).toFixed(1));
      });
      wires.forEach(w => w.classList.toggle('on', chosen.has(Number(w.dataset.w))));
      const names = picks.map(p => `expert ${p.expert + 1} (${p.weight.toFixed(2)})`).join(', ');
      desc.textContent = `“${active.textContent}” goes to ${names}. ${4 - k ? `The other ${4 - k} do no work for this word.` : 'Every expert runs, so nothing is saved.'}`;
      meter.innerHTML = `This word runs <b>${k} of 4</b> experts, so about <b>${k * 25}%</b> of the expert compute.`;
      meterBar.style.width = `${k * 25}%`;
    }
    const counts = [0, 0, 0, 0];
    const perWord = buttons.map(b => pick(b.textContent, k).map(p => p.expert));
    perWord.forEach(list => list.forEach(e => { counts[e] += 1; }));
    const max = Math.max(1, ...counts);
    cols.forEach((c, i) => {
      c.querySelector('.n').textContent = counts[i];
      c.querySelector('i').style.height = `${Math.round((counts[i] / max) * 44) + 3}px`;
      c.classList.toggle('pin', pinned === i);
    });
    buttons.forEach((b, n) => b.classList.toggle('tok-hit', pinned !== null && perWord[n].includes(pinned)));
    experts.forEach((g, i) => { g.classList.toggle('pinned', pinned === i); g.setAttribute('aria-pressed', String(pinned === i)); });
    help.textContent = pinned === null
      ? 'Tap an expert to light up the words it handles. This router has fixed random weights, so the split is only for show. The trained router learns its weights.'
      : `Expert ${pinned + 1} handles ${counts[pinned]} of the ${buttons.length} words in this sentence. They are underlined in gold.`;
    watch();
  }

  extra.querySelector('.moe-k').addEventListener('click', e => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    k = Number(b.dataset.k);
    extra.querySelectorAll('[data-k]').forEach(x => {
      x.classList.toggle('is-on', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    apply();
  });
  const toggle = g => { const i = Number(g.dataset.ex); pinned = pinned === i ? null : i; apply(); };
  experts.forEach(g => {
    g.addEventListener('click', () => toggle(g));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(g); } });
  });

  apply();
})();
