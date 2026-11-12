/* TELC quiz tracker - records attempts and mistakes from existing quizzes */
(function () {
  const file = (location.pathname.split('/').pop() || '');
  const id = file.replace('.html', '');
  let saved = false; // save only once per page load

  function lsGet(k, fb) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; }
  }
  function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  let meta = { id, title: file, level: '?', category: '?' };
  fetch('/quiz-registry.json')
    .then(r => r.json())
    .then(reg => {
      const q = reg.find(x => x.id === id);
      if (q) meta = { id: q.id, title: q.title, level: q.level, category: q.category, file: q.file };
      lsSet('telc_last_opened', meta);
    })
    .catch(() => {});

  function now() { return Date.now(); }

  function saveAttempt(score, total) {
    const attempts = lsGet('telc_attempts', []);
    attempts.push({ quizId: id, title: meta.title, level: meta.level, category: meta.category, score, total, date: now() });
    lsSet('telc_attempts', attempts);
  }

  function saveMistakes(ms) {
    if (!ms || !ms.length) return;
    const all = lsGet('telc_mistakes', []);
    ms.forEach(m => all.push(Object.assign({ quizId: id, title: meta.title, level: meta.level, category: meta.category, date: now() }, m)));
    lsSet('telc_mistakes', all);
  }

  function parseScore(text) {
    if (!text) return null;
    const m = text.match(/(\d+)\s*(?:\/|von)\s*(\d+)/i);
    if (m) return { score: parseInt(m[1], 10), total: parseInt(m[2], 10) };
    return null;
  }

  function extractRadioMistakes() {
    const ms = [];
    document.querySelectorAll('.question-card').forEach(card => {
      const h3 = card.querySelector('h3');
      const qText = h3 ? h3.textContent.trim() : '';
      const selected = card.querySelector('input[type="radio"]:checked');
      const student = selected ? (selected.parentElement.textContent || '').trim() : '(none)';
      let correct = card.dataset.answerKey || '';
      card.querySelectorAll('label').forEach(lab => {
        if (lab.dataset.correct === '1' || lab.classList.contains('correct') ||
            (!correct && lab.style && /green/i.test(lab.style.color || ''))) {
          correct = lab.textContent.trim();
        }
      });
      const isWrong = card.classList.contains('incorrect') || (!card.classList.contains('correct') && selected);
      if (isWrong && correct) {
        ms.push({ question: qText, studentAnswer: student, correctAnswer: correct, type: 'radio' });
      }
    });
    return ms;
  }

  function extractBlankMistakes() {
    const ms = [];
    document.querySelectorAll('.blank[data-answer]').forEach(b => {
      const ua = b.dataset.userAnswer;
      const ans = b.dataset.answer;
      if (ua && ans && ua !== ans) {
        ms.push({ question: 'Blank: ' + (b.textContent || ''), studentAnswer: ua, correctAnswer: ans, type: 'blank' });
      }
    });
    return ms;
  }

  function commit() {
    if (saved) return;
    // Die Quiz-Engine bewertet und speichert bereits selbst.
    if (window.TELC_ENGINE && window.TELC_ENGINE.hasResult()) { saved = true; return; }
    saved = true;
    setTimeout(() => {
      let text = '';
      const res = document.getElementById('telcResult') || document.getElementById('result') || document.querySelector('.result');
      if (res) text = res.innerText || res.textContent || '';
      const parsed = parseScore(text);
      if (parsed) saveAttempt(parsed.score, parsed.total);
      let ms = [];
      if (document.querySelector('.question-card')) ms = ms.concat(extractRadioMistakes());
      if (document.querySelector('.blank')) ms = ms.concat(extractBlankMistakes());
      saveMistakes(ms);
    }, 600);
  }

  function hook() {
    document.querySelectorAll('button').forEach(btn => {
      if (btn.dataset.tracked) return;
      btn.dataset.tracked = '1';
      btn.addEventListener('click', () => {
        const t = ((btn.textContent || '') + ' ' + (btn.getAttribute('onclick') || '')).toLowerCase();
        if (/prüf|submit|antwort|check|auswert|korrig/i.test(t)) {
          commit();
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);
  else hook();
})();
