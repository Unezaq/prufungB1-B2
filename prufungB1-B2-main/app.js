/* TELC Learning Platform - shared app logic */
const STORAGE_KEYS = {
  attempts: 'telc_attempts',
  mistakes: 'telc_mistakes',
  lastOpened: 'telc_last_opened',
  goals: 'telc_goals',
  settings: 'telc_settings'
};

function loadJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

const Store = {
  getAttempts() { return loadJSON(STORAGE_KEYS.attempts, []); },
  addAttempt(a) { const arr = this.getAttempts(); arr.push(a); saveJSON(STORAGE_KEYS.attempts, arr); },
  getMistakes() { return loadJSON(STORAGE_KEYS.mistakes, []); },
  addMistakes(ms) { const arr = this.getMistakes(); ms.forEach(m => arr.push(m)); saveJSON(STORAGE_KEYS.mistakes, arr); },
  getLastOpened() { return loadJSON(STORAGE_KEYS.lastOpened, null); },
  setLastOpened(q) { saveJSON(STORAGE_KEYS.lastOpened, q); },
  getGoals() { return loadJSON(STORAGE_KEYS.goals, { daily: 5 }); },
  setGoals(g) { saveJSON(STORAGE_KEYS.goals, g); },
  getSettings() { return loadJSON(STORAGE_KEYS.settings, { level: 'all' }); },
  setSettings(s) { saveJSON(STORAGE_KEYS.settings, s); }
};

let REGISTRY = [];
async function loadRegistry() {
  if (REGISTRY.length) return REGISTRY;
  try {
    const res = await fetch('/quiz-registry.json');
    REGISTRY = await res.json();
  } catch (e) { REGISTRY = []; }
  return REGISTRY;
}

function quizById(id) { return REGISTRY.find(q => q.id === String(id)); }

function levelBadge(level) {
  return `<span class="badge ${level.toLowerCase()}">${level}</span>`;
}

function formatPct(n) { return (Math.round(n * 10) / 10).toFixed(1) + '%'; }

function renderSidebar(active) {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const items = [
    { key: 'dashboard', href: '/dashboard.html', icon: 'fa-gauge-high', label: 'Dashboard' },
    { key: 'b1', href: '/b1.html', icon: 'fa-graduation-cap', label: 'B1 Preparation' },
    { key: 'b2', href: '/b2.html', icon: 'fa-graduation-cap', label: 'B2 Preparation' },
    { key: 'library', href: '/library.html', icon: 'fa-book-open', label: 'All Quizzes' },
    { key: 'simulator', href: '/simulator.html', icon: 'fa-stopwatch', label: 'Exam Simulator' },
    { key: 'mistakes', href: '/mistakes.html', icon: 'fa-triangle-exclamation', label: 'Mistake Notebook' },
    { key: 'analytics', href: '/analytics.html', icon: 'fa-chart-line', label: 'Analytics' },
    { key: 'planner', href: '/planner.html', icon: 'fa-calendar-check', label: 'Study Planner' },
    { key: 'settings', href: '/settings.html', icon: 'fa-gear', label: 'Settings' }
  ];
  el.innerHTML = `
    <div class="brand"><span class="dot"></span> TELC Prep</div>
    ${items.map(it => `<a class="nav-item ${active===it.key?'active':''}" href="${it.href}"><i class="fas ${it.icon}"></i> ${it.label}</a>`).join('')}
  `;
}

function renderMobileNav(active) {
  const el = document.getElementById('mobileNav');
  if (!el) return;
  const items = [
    { key: 'dashboard', href: '/dashboard.html', icon: 'fa-house', label: 'Home', active: active === 'dashboard' },
    { key: 'library', href: '/library.html', icon: 'fa-message', label: 'Quiz', active: active === 'library' },
    { key: 'add', href: '#', icon: 'fa-plus', label: 'Add', isAdd: true },
    { key: 'notifications', href: '/mistakes.html', icon: 'fa-bell', label: 'Mistakes', active: active === 'mistakes' },
    { key: 'profile', href: '/settings.html', icon: 'fa-user', label: 'Profile', active: active === 'settings' }
  ];
  el.innerHTML = items.map(it => {
    if (it.isAdd) {
      return `<button class="nav-item nav-add" type="button" aria-label="${it.label}" title="${it.label}"><i class="fas ${it.icon}" aria-hidden="true"></i></button>`;
    }
    return `<a class="nav-item ${it.active?'active':''}" href="${it.href}" aria-label="${it.label}"${it.active ? ' aria-current="page"' : ''}>
      <i class="fas ${it.icon}" aria-hidden="true"></i>
      <span class="nav-label">${it.label}</span>
    </a>`;
  }).join('');
  const addBtn = el.querySelector('.nav-add');
  if (addBtn) addBtn.onclick = (e) => { e.preventDefault(); toast('Nouvelle fonction bientôt disponible'); };
}

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function openQuiz(q) {
  Store.setLastOpened({ id: q.id, title: q.title, level: q.level, category: q.category, file: q.file });
  window.location.href = '/QUIZES/' + q.file;
}

// Stats helpers
function computeStats() {
  const attempts = Store.getAttempts();
  const total = attempts.length;
  const completedQuizzes = new Set(attempts.map(a => a.quizId)).size;
  const avgAcc = total ? (attempts.reduce((s,a) => s + (a.total ? a.score/a.total : 0), 0) / total * 100) : 0;
  // by category
  const byCat = {};
  attempts.forEach(a => {
    const key = a.level + ' · ' + a.category;
    if (!byCat[key]) byCat[key] = { attempts: 0, score: 0, total: 0 };
    byCat[key].attempts++;
    byCat[key].score += a.score || 0;
    byCat[key].total += a.total || 0;
  });
  Object.keys(byCat).forEach(k => {
    const c = byCat[k];
    c.accuracy = c.total ? (c.score / c.total * 100) : 0;
  });
  // by level
  const byLevel = { B1: {attempts:0,score:0,total:0}, B2: {attempts:0,score:0,total:0} };
  attempts.forEach(a => {
    if (!byLevel[a.level]) return;
    byLevel[a.level].attempts++;
    byLevel[a.level].score += a.score||0;
    byLevel[a.level].total += a.total||0;
  });
  Object.keys(byLevel).forEach(k => {
    const c = byLevel[k];
    c.accuracy = c.total ? (c.score/c.total*100) : 0;
  });
  return { total, completedQuizzes, avgAcc, byCat, byLevel, attempts };
}

// Weakness detection: lowest accuracy categories with >=1 attempt
function weakestCategories(n=3) {
  const { byCat } = computeStats();
  return Object.entries(byCat)
    .filter(([k,v]) => v.total >= 3)
    .sort((a,b) => a[1].accuracy - b[1].accuracy)
    .slice(0, n)
    .map(([k,v]) => ({ name: k, ...v }));
}

// Recommendation: next quiz not completed, preferably in weakest category or last opened
function recommendNext() {
  const attempts = Store.getAttempts();
  const done = new Set(attempts.map(a => a.quizId));
  const last = Store.getLastOpened();
  // try same category as last opened but not done
  let pool = REGISTRY.filter(q => !done.has(q.id) && q.exists);
  if (last) {
    const sameCat = pool.filter(q => q.category === last.category && q.level === last.level);
    if (sameCat.length) pool = sameCat;
  }
  if (!pool.length) pool = REGISTRY.filter(q => q.exists);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Chart helper (simple bar)
function drawBarChart(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0,0,w,h);
  const keys = Object.keys(data);
  if (!keys.length) {
    ctx.fillStyle = '#9aa7bf'; ctx.font = '14px sans-serif'; ctx.textAlign='center';
    ctx.fillText('No data yet', w/2, h/2); return;
  }
  const pad = 30;
  const barW = (w - pad*2) / keys.length * 0.6;
  const gap = (w - pad*2) / keys.length;
  keys.forEach((k, i) => {
    const val = data[k];
    const bh = (val / 100) * (h - pad*2);
    const x = pad + i * gap + (gap - barW)/2;
    const y = h - pad - bh;
    const grad = ctx.createLinearGradient(0, y, 0, y+bh);
    grad.addColorStop(0, '#4f8cff'); grad.addColorStop(1, '#7c5cff');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, bh);
    ctx.fillStyle = '#9aa7bf'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(k.length > 10 ? k.slice(0,10)+'…' : k, x + barW/2, h - 8);
    ctx.fillStyle = '#e8ecf4'; ctx.fillText(Math.round(val) + '%', x + barW/2, y - 4);
  });
}