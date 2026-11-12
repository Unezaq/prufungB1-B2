/* TELC shared navigation + timer + inactivity */
(function () {
  // --- B1 / B2 quiz file sets (generated) ---
  const B1 = new Set(window.TELC_B1 || []);
  const B2 = new Set(window.TELC_B2 || []);

  function currentFile() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }

  function backTarget() {
    const f = currentFile();
    if (B1.has(f)) return '/index1.html';
    if (B2.has(f)) return '/index2.html';
    // fallback: if path contains index1
    return '/home';
  }

  function sectionTime() {
    const t = (document.title || '') + ' ' + (document.body ? document.body.innerText.slice(0, 500) : '');
    // default 10 minutes
    let secs = 10 * 60;
    if (/hören/i.test(t)) secs = 20 * 60;
    else if (/sprachbausteine/i.test(t)) secs = 10 * 60;
    else if (document.querySelector('.blank')) secs = 10 * 60; // Sprachbausteine (drag-drop)
    else if (document.querySelector('input[type="radio"]')) secs = 15 * 60; // Lesen
    else if (/lesen/i.test(t)) secs = 15 * 60;
    // allow override via body data attribute
    const body = document.body;
    if (body && body.dataset && body.dataset.telcTime) {
      const v = parseInt(body.dataset.telcTime, 10);
      if (!isNaN(v) && v > 0) secs = v;
    }
    return secs;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  const isQuiz = window.location.pathname.indexOf('/QUIZES/') !== -1;

  // Registry for next/prev quiz navigation
  let REG = [];
  if (isQuiz) {
    fetch('/quiz-registry.json').then(r=>r.json()).then(d=>{ REG = d; }).catch(()=>{});
  }

  function injectTopNav() {
    if (document.querySelector('.telc-nav')) return;
    const nav = document.createElement('div');
    nav.className = 'telc-nav';
    const brand = document.createElement('div');
    brand.className = 'brand';
    brand.innerHTML = 'TELC <span>Prüfungstraining</span>';
    const actions = document.createElement('div');
    actions.className = 'nav-actions';
    const home = document.createElement('a');
    home.className = 'telc-btn'; home.href = '/home'; home.innerHTML = '<i class="fas fa-home"></i> Home';
    actions.appendChild(home);
    const back = document.createElement('a');
    back.className = 'telc-btn'; back.href = backTarget(); back.innerHTML = '<i class="fas fa-list"></i> Zurück';
    actions.appendChild(back);
    nav.appendChild(brand); nav.appendChild(actions);
    const body = document.body;
    if (body.firstChild) body.insertBefore(nav, body.firstChild); else body.appendChild(nav);
  }

  function findSubmitBtn() {
    const btns = [...document.querySelectorAll('button')];
    return btns.find(b => /prüf|submit|antwort|check|auswert/i.test(b.textContent || '') || b.getAttribute('onclick'));
  }

  function injectRightPanel() {
    if (document.querySelector('.telc-bottombar')) return;
    const panel = document.createElement('div');
    panel.className = 'telc-bottombar';
    panel.innerHTML = `
      <div class="telc-timer" id="telcTimer">⏱ ${formatTime(sectionTime())}</div>
      <button class="rp-btn" id="rpCheck"><i class="fas fa-check"></i><span>Korrigieren</span></button>
      <button class="rp-btn" id="rpPrev"><i class="fas fa-chevron-left"></i><span>Vorheriges</span></button>
      <button class="rp-btn" id="rpNext"><i class="fas fa-chevron-right"></i><span>Nächstes</span></button>
      <a class="rp-btn" href="${backTarget()}"><i class="fas fa-list"></i><span>Liste</span></a>
      <a class="rp-btn" href="/home"><i class="fas fa-home"></i><span>Home</span></a>
    `;
    document.body.appendChild(panel);

    // timer
    let remaining = sectionTime();
    const interval = setInterval(() => {
      remaining--;
      const el = document.getElementById('telcTimer');
      if (!el) { clearInterval(interval); return; }
      el.textContent = '⏱ ' + formatTime(Math.max(remaining, 0));
      el.classList.remove('warning','danger');
      if (remaining <= 60 && remaining > 0) el.classList.add('warning');
      if (remaining <= 0) { el.classList.add('danger'); el.textContent = '⏱ 00:00'; clearInterval(interval); }
    }, 1000);

    const submitBtn = findSubmitBtn();
    const rpCheck = document.getElementById('rpCheck');
    if (!submitBtn) {
      rpCheck.style.display = 'none';
    } else {
      rpCheck.onclick = () => { submitBtn.click(); };
    }
    document.getElementById('rpPrev').onclick = () => navigateQuiz(-1);
    document.getElementById('rpNext').onclick = () => navigateQuiz(1);

    // Answer reveal: add "Show answer" button to each question card
    document.querySelectorAll('.question-card').forEach(card => {
      if (card.dataset.answerInjected) return;
      card.dataset.answerInjected = '1';
      const h3 = card.querySelector('h3');
      const qText = h3 ? h3.textContent.trim() : '';
      // find correct answer (green label)
      let correctAns = card.dataset.answerKey || '';
      card.querySelectorAll('label').forEach(lab => {
        if (lab.dataset.correct === '1' || lab.classList.contains('correct') ||
            (!correctAns && lab.style && /green/i.test(lab.style.color || ''))) {
          correctAns = lab.textContent.trim();
          lab.dataset.correct = '1';
        }
      });
      const btn = document.createElement('button');
      btn.className = 'btn-show';
      btn.innerHTML = '<i class="fas fa-eye"></i> Antwort anzeigen';
      btn.style.display = 'inline-block';
      btn.onclick = () => {
        const existing = card.querySelector('.answer-reveal');
        if (existing) {
          existing.classList.toggle('open');
          btn.innerHTML = existing.classList.contains('open') ?
            '<i class="fas fa-eye-slash"></i> Antwort ausblenden' :
            '<i class="fas fa-eye"></i> Antwort anzeigen';
          return;
        }
        const reveal = document.createElement('div');
        reveal.className = 'answer-reveal';
        reveal.innerHTML = `
          <div class="q">${qText}</div>
          <div class="sa">Deine Antwort: <span style="color:#fecaca;">${card.querySelector('input[type="radio"]:checked') ? card.querySelector('input[type="radio"]:checked').parentElement.textContent.trim() : '—'}</span></div>
          <div class="ca">Richtige Antwort: <span>${correctAns || '—'}</span></div>
          <button class="btn-show" style="background:var(--telc-red);"><i class="fas fa-times"></i> Schließen</button>
        `;
        reveal.querySelector('button').onclick = () => {
          reveal.classList.remove('open');
          btn.innerHTML = '<i class="fas fa-eye"></i> Antwort anzeigen';
        };
        card.appendChild(reveal);
        setTimeout(() => reveal.classList.add('open'), 10);
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Antwort ausblenden';
      };
      card.appendChild(btn);
    });
  }

  function navigateQuiz(dir) {
    const file = (location.pathname.split('/').pop() || '');
    const id = file.replace('.html','');
    if (!REG.length) {
      fetch('/quiz-registry.json').then(r=>r.json()).then(d=>{ REG=d; doNav(dir,id); }).catch(()=>{});
    } else doNav(dir,id);
  }
  function doNav(dir, id) {
    const cur = REG.find(q => q.id === id);
    const level = cur ? cur.level : null;
    // restrict navigation to the same level (index1 for B1, index2 for B2)
    const list = level ? REG.filter(q => q.level === level) : REG;
    const idx = list.findIndex(q => q.id === id);
    if (idx === -1) return;
    let i = idx + dir;
    while (i >= 0 && i < list.length) {
      if (list[i].exists) { window.location.href = '/QUIZES/' + list[i].file; return; }
      i += dir;
    }
    alert(dir > 0 ? 'Kein weiteres Quiz' : 'Kein vorheriges Quiz');
  }

  function injectNav() {
    if (isQuiz) injectRightPanel();
    else injectTopNav();
  }

  // Inactivity handling (15 min auto logout with 30s warning)
  function injectInactivity() {
    if (!document.getElementById('warningBox')) {
      const wb = document.createElement('div');
      wb.id = 'warningBox';
      document.body.appendChild(wb);
    }
    const warningBox = document.getElementById('warningBox');
    let pingTimeout, logoutTimer, warningTimer, countdownTimer, lastPing = 0;
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    const WARNING_BEFORE_LOGOUT = 30 * 1000;
    let countdownEl = document.getElementById('countdown');
    if (!countdownEl) {
      countdownEl = document.createElement('span');
      countdownEl.id = 'countdown';
      warningBox.appendChild(countdownEl);
    }

    function sendPing() {
      const now = Date.now();
      if (now - lastPing < 10000) return;
      lastPing = now;
      fetch('/ping').catch(() => {});
    }
    function resetTimers() {
      clearTimeout(pingTimeout); clearTimeout(logoutTimer); clearTimeout(warningTimer); clearInterval(countdownTimer);
      if (warningBox) warningBox.style.display = 'none';
      sendPing();
      pingTimeout = setTimeout(sendPing, 60 * 1000);
      warningTimer = setTimeout(() => {
        let remaining = 30;
        if (warningBox) warningBox.style.display = 'block';
        countdownEl.textContent = remaining;
        countdownTimer = setInterval(() => {
          remaining--;
          countdownEl.textContent = remaining;
          if (remaining <= 0) clearInterval(countdownTimer);
        }, 1000);
      }, INACTIVITY_LIMIT - WARNING_BEFORE_LOGOUT);
      logoutTimer = setTimeout(() => {
        fetch('/logout', { method: 'POST' }).then(() => { window.location.href = '/'; }).catch(() => { window.location.href = '/'; });
      }, INACTIVITY_LIMIT);
    }
    ['mousemove','keydown','scroll','click','touchstart'].forEach(evt => document.addEventListener(evt, resetTimers));
    window.addEventListener('pageshow', sendPing);
    window.addEventListener('beforeunload', sendPing);
    resetTimers();
  }

  function init() {
    injectInactivity();
    injectNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
