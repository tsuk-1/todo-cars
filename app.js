(() => {
  const KEY = 'todo-anim-v1';
  const $ = (s) => document.querySelector(s);
  const list = $('#list');
  const input = $('#taskInput');
  const composer = $('#composer');
  const MODES = ['pro', 'perso'];
  const PRIO_RANK = { high: 0, med: 1, low: 2 };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- État ----------
  function demo() {
    const t = (text, mode, priority = 'med', done = false, note = '') => ({ id: uid(), text, mode, priority, done, note, created: Date.now() });
    return [
      t('Préparer la réunion de lundi', 'pro', 'high', false, 'Slides + ordre du jour, salle B'),
      t('Répondre aux mails clients', 'pro', 'med'),
      t('Mettre à jour le rapport mensuel', 'pro', 'low', true),
      t('Faire les courses', 'perso', 'med', false, 'Lait, œufs, pâtes'),
      t('Appeler maman', 'perso', 'high'),
      t('Séance de sport', 'perso', 'low', true),
    ];
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.tasks)) return s;
    } catch (e) {}
    return { mode: 'pro', filter: 'all', tasks: demo() };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  let state = load();
  if (state.sort !== 'prio') state.sort = 'manual';
  if (!MODES.includes(state.mode)) state.mode = 'pro';
  let prio = 'med';
  let lastDeleted = null;

  function setupHeader() {
    const h = new Date().getHours();
    $('#hello').textContent = 'Ka-chow ! ' + (h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir');
  }

  // ---------- Vues & tri ----------
  const inView = (t) => t.mode === state.mode;
  const viewTasks = () => state.tasks.filter(inView);
  const matchesFilter = (t) => state.filter === 'all' || (state.filter === 'todo' ? !t.done : t.done);

  function sortTasks(arr) {
    if (state.sort === 'manual') return arr;
    return [...arr].sort((a, b) => (a.done - b.done) || PRIO_RANK[a.priority] - PRIO_RANK[b.priority]);
  }

  // ---------- Rendu ----------
  const ICON_NOTE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>';
  const ICON_DEL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>';

  function makeItem(t, settled = false) {
    const li = document.createElement('li');
    li.className = 'task p-' + t.priority + (t.done ? ' done' : '') + (settled ? ' settled' : '');
    li.dataset.id = t.id;
    li.draggable = state.sort === 'manual';
    li.innerHTML = `
      <span class="grip" aria-hidden="true">⋮⋮</span>
      <button class="check" aria-label="Marquer comme terminée"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
      <div class="body"><span class="text"></span><div class="meta"></div></div>
      <div class="actions">
        <button class="note-btn${t.note ? ' has' : ''}" aria-label="Note" title="Note">${ICON_NOTE}</button>
        <button class="del" aria-label="Supprimer" title="Supprimer">${ICON_DEL}</button>
      </div>`;
    li.querySelector('.text').textContent = t.text;
    const meta = li.querySelector('.meta');
    const chip = (cls, txt) => {
      const c = document.createElement('span');
      c.className = 'chip ' + cls;
      c.textContent = txt;
      meta.appendChild(c);
    };
    if (t.priority === 'high') chip('high', 'Urgent');
    if (t.note) {
      const p = document.createElement('p');
      p.className = 'note';
      p.textContent = t.note;
      li.querySelector('.body').appendChild(p);
    }
    li.addEventListener('animationend', (e) => {
      if (e.target === li && e.animationName === 'taskIn') li.classList.add('settled');
    });
    return li;
  }

  function render() {
    list.innerHTML = '';
    list.classList.toggle('sorted', state.sort !== 'manual');
    sortTasks(viewTasks().filter(matchesFilter)).forEach((t) => list.appendChild(makeItem(t)));
    updateUI();
  }

  function updateUI() {
    const vt = viewTasks();
    const done = vt.filter((t) => t.done).length;
    const pct = vt.length ? Math.round((done / vt.length) * 100) : 0;
    $('#pct').textContent = pct;
    $('#fill').style.width = pct + '%';
    $('#count').textContent = `${done} / ${vt.length}`;
    const left = vt.length - done;
    $('#summary').textContent = vt.length
      ? `${left} restante${left > 1 ? 's' : ''}, ${done} terminée${done > 1 ? 's' : ''}`
      : 'aucune tâche';
    $('#badge-pro').textContent = state.tasks.filter((t) => t.mode === 'pro' && !t.done).length;
    $('#badge-perso').textContent = state.tasks.filter((t) => t.mode === 'perso' && !t.done).length;
    const isEmpty = list.querySelectorAll('.task:not(.leaving)').length === 0;
    if (isEmpty) {
      const allMsg = state.mode === 'pro'
        ? ['🏁', 'Piste dégagée, aucune tâche pro.']
        : ['🌵', 'Rien de prévu à Radiator Springs.'];
      const msgs = {
        all: allMsg,
        todo: ['🏆', 'Tout est fait, tu remportes la Piston Cup !'],
        done: ['🚦', 'Pas encore de tâche terminée.'],
      }[state.filter];
      $('#emptyEmo').textContent = msgs[0];
      $('#emptyText').textContent = msgs[1];
    }
    $('#empty').hidden = !isEmpty;
  }

  function animateOut(li) {
    const h = li.offsetHeight;
    li.style.height = h + 'px';
    li.style.setProperty('--h', h + 'px');
    li.classList.add('leaving');
    setTimeout(() => { li.remove(); updateUI(); }, 300);
  }

  // ---------- Actions ----------
  function addTask(e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) {
      composer.classList.remove('shake'); void composer.offsetWidth; composer.classList.add('shake');
      input.focus();
      return;
    }
    const t = { id: uid(), text, mode: state.mode, priority: prio, done: false, note: '', created: Date.now() };
    state.tasks.unshift(t);
    save();
    input.value = '';
    if (state.filter === 'done') setFilter('all');
    else if (state.sort !== 'manual') render();
    else { list.prepend(makeItem(t)); updateUI(); }
  }

  function toggle(id, li) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save();
    li.classList.toggle('done', t.done);
    if (!matchesFilter(t)) setTimeout(() => animateOut(li), 350);
    else if (state.sort !== 'manual') setTimeout(render, 400);
    updateUI();
    const vt = viewTasks();
    if (t.done && vt.length && vt.every((x) => x.done)) celebrate();
  }

  function removeTask(id, li) {
    const idx = state.tasks.findIndex((x) => x.id === id);
    if (idx < 0) return;
    lastDeleted = { task: state.tasks[idx], idx };
    state.tasks.splice(idx, 1);
    save();
    animateOut(li);
    toast('Tâche supprimée', 'Annuler', () => {
      if (!lastDeleted) return;
      state.tasks.splice(lastDeleted.idx, 0, lastDeleted.task);
      lastDeleted = null;
      save();
      render();
    });
  }

  function clearDone() {
    const n = viewTasks().filter((t) => t.done).length;
    if (!n) { toast('Aucune tâche terminée à retirer'); return; }
    state.tasks = state.tasks.filter((t) => !(inView(t) && t.done));
    save();
    const items = [...list.querySelectorAll('.task.done')];
    items.forEach(animateOut);
    if (!items.length) updateUI();
    toast(`${n} tâche${n > 1 ? 's' : ''} retirée${n > 1 ? 's' : ''}`);
  }

  function editText(span, id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t || span.isContentEditable) return;
    const li = span.closest('.task');
    li.draggable = false;
    span.contentEditable = 'true';
    span.focus();
    const range = document.createRange();
    range.selectNodeContents(span);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
      if (e.key === 'Escape') { span.textContent = t.text; span.blur(); }
    };
    span.addEventListener('keydown', onKey);
    span.addEventListener('blur', () => {
      span.removeEventListener('keydown', onKey);
      span.contentEditable = 'false';
      li.draggable = state.sort === 'manual';
      const v = span.textContent.trim();
      if (v) { t.text = v; save(); }
      span.textContent = t.text;
    }, { once: true });
  }

  function openNote(li, id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    const existing = li.querySelector('.note-edit');
    if (existing) { existing.focus(); return; }
    const body = li.querySelector('.body');
    const p = body.querySelector('.note');
    if (p) p.remove();
    const ta = document.createElement('textarea');
    ta.className = 'note-edit';
    ta.placeholder = 'Ajoute un détail, un lien, un numéro… (Ctrl+Entrée pour valider)';
    ta.value = t.note || '';
    body.appendChild(ta);
    li.draggable = false;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    let cancelled = false;
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { cancelled = true; ta.blur(); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ta.blur();
    });
    ta.addEventListener('blur', () => {
      if (!cancelled) { t.note = ta.value.trim(); save(); }
      li.replaceWith(makeItem(t, true));
    }, { once: true });
  }

  function setMode(m) {
    if (state.mode === m) return;
    state.mode = m;
    save();
    applyMode();
    list.classList.add('swap');
    setTimeout(() => { list.classList.remove('swap'); render(); }, 150);
  }
  function applyMode() {
    document.body.dataset.mode = state.mode;
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
    input.placeholder = state.mode === 'pro' ? 'Une nouvelle tâche pro…' : 'Une nouvelle tâche perso…';
  }

  function setFilter(f) {
    state.filter = f;
    save();
    document.querySelectorAll('#filters button').forEach((b) => b.classList.toggle('active', b.dataset.f === f));
    render();
  }

  // ---------- Thème jour / nuit avec vague ----------
  const themeBtn = $('#themeBtn');
  function updateThemeBtn() {
    themeBtn.textContent = document.documentElement.dataset.theme === 'night' ? '☀️ Jour' : '🌙 Nuit';
  }

  // Une vague qui monte du bas de l'écran : un polygone dont le bord supérieur est une sinusoïde
  function waveFrames() {
    const frames = [];
    const steps = 30, points = 48;
    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const base = 112 - p * 130;
      const amp = 1 + 7 * Math.sin(Math.PI * p);
      const phase = p * Math.PI * 3;
      const pts = ['0% 100%', '100% 100%'];
      for (let k = points; k >= 0; k--) {
        const x = (k / points) * 100;
        const y = base + amp * Math.sin((x / 100) * Math.PI * 3 + phase);
        pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
      }
      frames.push({ clipPath: `polygon(${pts.join(',')})` });
    }
    return frames;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    const apply = () => {
      document.documentElement.dataset.theme = next;
      state.theme = next;
      save();
      updateThemeBtn();
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduced) { apply(); return; }
    document.documentElement.classList.add('theming');
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      document.documentElement.animate(waveFrames(), {
        duration: 1100,
        easing: 'cubic-bezier(.45, .05, .35, 1)',
        pseudoElement: '::view-transition-new(root)',
      });
    });
    vt.finished.finally(() => document.documentElement.classList.remove('theming'));
  }

  // ---------- Drag & drop ----------
  let dragEl = null;
  list.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.task');
    if (!li || state.sort !== 'manual') return;
    dragEl = li;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', li.dataset.id); } catch (err) {}
    requestAnimationFrame(() => li.classList.add('dragging'));
  });
  list.addEventListener('dragover', (e) => {
    if (!dragEl) return;
    e.preventDefault();
    const others = [...list.querySelectorAll('.task:not(.dragging)')];
    const after = others.find((el) => {
      const r = el.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    if ((after || null) === dragEl.nextElementSibling) return;
    after ? list.insertBefore(dragEl, after) : list.appendChild(dragEl);
  });
  list.addEventListener('drop', (e) => e.preventDefault());
  list.addEventListener('dragend', () => {
    if (!dragEl) return;
    dragEl.classList.remove('dragging');
    dragEl = null;
    const order = [...list.children].map((el) => el.dataset.id);
    const slots = [];
    state.tasks.forEach((t, i) => { if (order.includes(t.id)) slots.push(i); });
    const byId = Object.fromEntries(state.tasks.map((t) => [t.id, t]));
    slots.forEach((slot, k) => { state.tasks[slot] = byId[order[k]]; });
    save();
  });

  function celebrate() {
    toast(state.mode === 'pro' ? '🏆 Ka-chow ! Toutes les tâches pro sont faites.' : '🏁 Tout est fait côté perso !');
  }

  // ---------- Toasts ----------
  function toast(msg, actionLabel, action) {
    const wrap = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    let gone = false;
    const hide = () => {
      if (gone) return; gone = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 200);
    };
    if (actionLabel) {
      const b = document.createElement('button');
      b.textContent = actionLabel;
      b.onclick = () => { action(); hide(); };
      el.appendChild(b);
    }
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.firstChild.remove();
    setTimeout(hide, 4000);
  }

  // ---------- Événements ----------
  composer.addEventListener('submit', addTask);
  $('#prio').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    prio = b.dataset.p;
    document.querySelectorAll('#prio button').forEach((x) => x.classList.toggle('active', x === b));
  });
  document.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b && b.dataset.f !== state.filter) setFilter(b.dataset.f);
  });
  $('#sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    save();
    render();
  });
  $('#clearDone').addEventListener('click', clearDone);
  themeBtn.addEventListener('click', toggleTheme);

  list.addEventListener('click', (e) => {
    const li = e.target.closest('.task');
    if (!li) return;
    if (e.target.closest('.check')) toggle(li.dataset.id, li);
    else if (e.target.closest('.del')) removeTask(li.dataset.id, li);
    else if (e.target.closest('.note-btn') || e.target.closest('.note')) openNote(li, li.dataset.id);
  });
  list.addEventListener('dblclick', (e) => {
    const span = e.target.closest('.text');
    if (span) editText(span, span.closest('.task').dataset.id);
  });

  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'n' || e.key === 'N' || e.key === '/') { e.preventDefault(); input.focus(); }
    const i = MODES.indexOf(state.mode);
    if (e.key === 'ArrowLeft' && i > 0) setMode(MODES[i - 1]);
    if (e.key === 'ArrowRight' && i < MODES.length - 1) setMode(MODES[i + 1]);
  });

  // ---------- Init ----------
  setupHeader();
  updateThemeBtn();
  applyMode();
  $('#sortSelect').value = state.sort;
  document.querySelectorAll('#filters button').forEach((b) => b.classList.toggle('active', b.dataset.f === state.filter));
  render();
})();
