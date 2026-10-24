const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

/* Toy top-2 router: each word gets fixed pseudo-random scores for four experts.
   It shows the mechanism only; the trained model's router learns its weights. */
function hash(word) {
  let h = 2166136261;
  for (const ch of word.toLowerCase()) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function route(word) {
  let seed = hash(word) || 1;
  const logits = [0, 1, 2, 3].map(() => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
    return (seed / 4294967296) * 4 - 2;
  });
  const top = logits.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2);
  const exp = top.map(([v]) => Math.exp(v));
  const sum = exp[0] + exp[1];
  return top.map(([, i], k) => ({ expert: i, weight: exp[k] / sum }));
}

const router = document.querySelector('[data-router]');
if (router) {
  const tokensEl = router.querySelector('[data-tokens]');
  const input = router.querySelector('[data-input]');
  const wordEl = router.querySelector('[data-word]');
  const desc = router.querySelector('[data-desc]');
  const experts = [...router.querySelectorAll('[data-ex]')];
  const wires = [...router.querySelectorAll('[data-w]')];
  let current = 0;
  let timer = null;
  let touched = false;

  const show = (word) => {
    const picks = route(word);
    const chosen = new Map(picks.map(p => [p.expert, p.weight]));
    wordEl.textContent = `“${word.length > 14 ? word.slice(0, 13) + '…' : word}”`;
    experts.forEach((g, i) => {
      g.classList.toggle('on', chosen.has(i));
      g.querySelector('[data-wt]').textContent = chosen.has(i) ? chosen.get(i).toFixed(2) : '0.00';
    });
    wires.forEach(w => w.classList.toggle('on', chosen.has(Number(w.dataset.w))));
    const [a, b] = picks;
    desc.textContent = `“${word}” goes to expert ${a.expert + 1} with weight ${a.weight.toFixed(2)} and expert ${b.expert + 1} with weight ${b.weight.toFixed(2)}. The other two experts do no work for this word.`;
  };

  const select = (i) => {
    const buttons = tokensEl.querySelectorAll('.tok');
    if (!buttons.length) return;
    current = (i + buttons.length) % buttons.length;
    buttons.forEach((btn, k) => {
      btn.classList.toggle('is-on', k === current);
      btn.setAttribute('aria-pressed', String(k === current));
    });
    show(buttons[current].textContent);
  };

  const build = () => {
    const words = input.value.match(/[\p{L}\p{N}'’-]+/gu) || [];
    tokensEl.replaceChildren(...words.slice(0, 16).map(word => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tok';
      btn.textContent = word;
      return btn;
    }));
    select(Math.min(current, words.length - 1));
  };

  const stop = () => { touched = true; clearInterval(timer); timer = null; };

  tokensEl.addEventListener('click', e => {
    const btn = e.target.closest('.tok');
    if (!btn) return;
    stop();
    select([...tokensEl.children].indexOf(btn));
  });
  tokensEl.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key) || !e.target.closest('.tok')) return;
    e.preventDefault();
    stop();
    select(current + (e.key === 'ArrowRight' ? 1 : -1));
    tokensEl.children[current].focus();
  });
  input.addEventListener('input', () => { stop(); current = 0; build(); });

  build();
  select(3);

  // Step through the sentence on its own while the figure is on screen, until someone touches it.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (touched) return;
      if (entry.isIntersecting && !timer) timer = setInterval(() => select(current + 1), 1700);
      if (!entry.isIntersecting) { clearInterval(timer); timer = null; }
    }, { threshold: 0.5 }).observe(router);
  }
}

/* Story MoE tabs */
const tablist = document.querySelector('[role="tablist"]');
if (tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const activate = (tab) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tablist.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) activate(t); });
  tablist.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    const next = tabs[(tabs.indexOf(document.activeElement) + step + tabs.length) % tabs.length];
    next.focus();
    activate(next);
  });
}

/* Contact form: send in place, keep what was typed if it fails */
const form = document.querySelector('[data-form]');
if (form && 'fetch' in window) {
  const status = form.querySelector('[data-status]');
  const send = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    send.disabled = true;
    send.textContent = 'Sending…';
    status.dataset.state = '';
    status.textContent = '';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.dataset.state = 'ok';
      status.textContent = 'Thanks, your message was sent. I’ll reply by email.';
    } catch {
      status.dataset.state = 'err';
      status.textContent = 'The message didn’t send. Your text is still here, so try again, or email fxt123@case.edu.';
    } finally {
      send.disabled = false;
      send.textContent = 'Send message';
    }
  });
}

/* Mark the nav link for the section on screen */
const links = [...document.querySelectorAll('.bar nav a')];
const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window && sections.length) {
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + entry.target.id)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));
}

/* Entrances: each section's parts arrive in reading order, once */
const groups = [
  ['.moe', ['.moe-plate', '.tabs', '.moe-body .head', '.pane:not([hidden])', '.cells']],
  ['.files', ['.files > .sub']],
  ['.about', ['.letter-sheet', '.stub']],
  ['.experience', ['.sheet .sub', '.sheet-note', '.group', '.sheet-end']],
  ['.contact', ['.visit']],
  ['.back', ['.pc-msg', '.pc-addr']],
];
const pending = [];
groups.forEach(([root, parts]) => {
  const scope = document.querySelector(root);
  if (!scope) return;
  let i = 0;
  parts.forEach(sel => scope.querySelectorAll(sel).forEach(el => {
    el.classList.add('rv');
    el.style.setProperty('--d', `${Math.min(i++ * 80, 480)}ms`);
    pending.push(el);
  }));
});
document.querySelectorAll('.folder').forEach(folder => {
  const pic = folder.querySelector('.folder-pic');
  const text = folder.querySelector('.folder-text');
  pic.classList.add('rv-pic');
  text.classList.add('rv');
  text.style.setProperty('--d', '160ms');
  pending.push(pic, text);
});
document.querySelectorAll('.item').forEach((item, i) => {
  item.classList.add('rv');
  item.style.setProperty('--d', `${(i % 2) * 70}ms`);
  pending.push(item);
});

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  pending.forEach(el => io.observe(el));
} else {
  pending.forEach(el => el.classList.add('in'));
}
