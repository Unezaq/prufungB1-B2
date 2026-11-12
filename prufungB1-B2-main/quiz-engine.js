/*
 * TELC Quiz-Engine
 * ------------------------------------------------------------------
 * Einheitliche, nachvollziehbare Auswertung für alle Quiz-Seiten.
 *
 * Die bestehenden Quiz-Dateien wurden zu unterschiedlichen Zeiten gebaut
 * und bewerten sehr unterschiedlich: manche zeigen gar keine Punktzahl,
 * manche markieren die richtige Antwort schon vor der Abgabe grün.
 * Diese Engine liest den tatsächlichen Zustand der Seite (gewählte
 * Antworten, gesetzte Wörter, platzierte Karten), berechnet eine echte
 * Punktzahl, zeigt ein Ergebnis-Fenster und speichert den Versuch für
 * Dashboard, Fehlerheft und Statistik.
 *
 * Sie ergänzt die Seiten, sie ersetzt sie nicht: die vorhandenen
 * Prüf-Buttons funktionieren weiterhin.
 */
(function () {
  'use strict';
  if (window.TELC_ENGINE) return;

  var VERSION = '1.0.0';
  var STORE_ATTEMPTS = 'telc_attempts';
  var STORE_MISTAKES = 'telc_mistakes';
  var meta = null;
  var lastResult = null;
  var lastSavedAt = 0;
  var overlay = null;

  var registryReady = fetch('/quiz-registry.json')
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      var id = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
      meta = list.find(function (q) { return q.id === id; }) || null;
      return list;
    })
    .catch(function () { return []; });

  /* ------------------------------------------------------------------ */
  /* Hilfsfunktionen                                                     */
  /* ------------------------------------------------------------------ */

  function clean(s) {
    return String(s == null ? '' : s).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Vergleichsform: Groß-/Kleinschreibung, Anführungszeichen und Satzzeichen zählen nicht. */
  function norm(s) {
    return clean(s)
      .toLowerCase()
      .replace(/[„“”‚‘’"'`´]/g, '')
      .replace(/[.,;:!?()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var inlineAnswerMaps = null;

  /**
   * Liest Antwortschlüssel aus den Inline-Skripten der Seite.
   * Ältere Quizze speichern die Lösung nur in einer lokalen Variablen
   * (z. B. `const answers = { q1: "b" }`) – ohne diesen Schlüssel wäre
   * die Seite nicht bewertbar.
   */
  function parseInlineAnswerMaps() {
    if (inlineAnswerMaps) return inlineAnswerMaps;
    var merged = {};
    Array.prototype.forEach.call(document.querySelectorAll('script:not([src])'), function (script) {
      var text = script.textContent || '';
      var match = text.match(/(?:const|let|var)?\s*(?:answers|correctAnswers)\s*=\s*\{([\s\S]*?)\}/);
      if (!match) return;
      match[1].replace(/([\w]+)\s*:\s*["']([^"']*)["']/g, function (all, key, value) {
        if (!(key in merged)) merged[key] = value;
        return all;
      });
    });
    inlineAnswerMaps = merged;
    return merged;
  }

  function correctAnswersObject() {
    var parsed = parseInlineAnswerMaps();
    var globalMap = null;
    try { if (typeof correctAnswers !== 'undefined' && correctAnswers) globalMap = correctAnswers; } catch (e) { /* nicht vorhanden */ }
    if (!globalMap) globalMap = window.correctAnswers || null;
    if (!globalMap) return Object.keys(parsed).length ? parsed : null;
    return Object.assign({}, parsed, globalMap);
  }

  function short(text, max) {
    var t = clean(text);
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  }

  function readLS(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function writeLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* Speicher voll / privat */ }
  }

  /* ------------------------------------------------------------------ */
  /* Antwortschlüssel: Karten-Quizze vorbereiten                         */
  /* ------------------------------------------------------------------ */

  /*
   * In den älteren Quizzen ist die richtige Antwort dauerhaft grün
   * eingefärbt – man sieht die Lösung also, bevor man antwortet.
   * Hier wird die Lösung einmalig gelesen, am Element gespeichert und
   * die sichtbare Markierung entfernt.
   */
  function normalizeCards() {
    document.querySelectorAll('.question-card').forEach(function (card) {
      var labels = Array.prototype.slice.call(card.querySelectorAll('label'));
      var key = '';
      labels.forEach(function (lab) {
        var isGreen = (lab.style && /green/i.test(lab.style.color || '')) || lab.classList.contains('correct');
        if (isGreen) lab.dataset.correct = '1';
        if (lab.dataset.correct === '1') key = clean(lab.textContent);
      });
      if (key) card.dataset.answerKey = key;
      labels.forEach(function (lab) {
        if (lab.dataset.correct === '1') {
          lab.style.color = '';
          lab.classList.remove('correct');
        }
      });
      // Alte Auswertung darf die Lösung nicht mehr über die Farbe verraten.
      if (!card.querySelector('input[type="radio"]')) {
        var radios = card.querySelectorAll('input');
        if (!radios.length) return;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Bewertung                                                           */
  /* ------------------------------------------------------------------ */

  function gradeMatching(items) {
    var boxes = Array.prototype.slice.call(document.querySelectorAll('.question-box[data-correct]'))
      .filter(function (box) { return box.dataset.example !== '1'; });
    if (!boxes.length) return;

    var drags = Array.prototype.slice.call(document.querySelectorAll('.draggable'));
    if (!drags.length) return;

    /*
     * Zwei Prüfungsformate:
     *  a) Mehr Antwortkarten als Texte (Lesen Teil 1/2): 5 Texte, 10 Titel –
     *     die überzähligen Titel sind Distraktoren, bewertet wird pro Text.
     *  b) Mehr Texte als Karten (Lesen Teil 3): 12 Anzeigen, 10 Situationen –
     *     zwei Anzeigen bleiben unbenutzt, bewertet wird pro Situation.
     */
    if (boxes.length >= drags.length) {
      boxes.forEach(function (box) {
        var target = box.querySelector('.drop-target') || box.querySelector('.email-subject');
        var given = target ? clean(target.textContent) : '';
        var answer = clean(box.dataset.correct);
        var questionText = clean((box.querySelector('.question-text') || box).textContent);
        items.push({
          n: items.length + 1,
          q: short(questionText, 110),
          given: given,
          correct: answer,
          ok: given !== '' && norm(given) === norm(answer),
          el: box
        });
      });
      return;
    }

    drags.forEach(function (drag) {
      var given = clean(drag.textContent);
      if (!given) return;
      var target = drag.closest('.drop-target');
      var placedBox = target ? target.closest('.question-box') : null;
      var placedText = placedBox ? clean((placedBox.querySelector('.question-text') || placedBox).textContent) : '';
      var rightBox = boxes.find(function (b) { return norm(b.dataset.correct) === norm(given); });
      var rightText = rightBox ? clean((rightBox.querySelector('.question-text') || rightBox).textContent) : '';
      var ok = !!(placedBox && norm(placedBox.dataset.correct) === norm(given));

      items.push({
        n: items.length + 1,
        q: short(given, 110),
        given: placedBox ? short(placedText, 90) : '',
        correct: rightBox ? short(rightText, 90) : '(keine passende Anzeige)',
        ok: ok,
        el: placedBox || drag
      });
    });
  }

  function gradeBlanks(items) {
    var blanks = Array.prototype.slice.call(document.querySelectorAll('.blank[data-answer]'));
    blanks.forEach(function (blank, i) {
      var given = clean(blank.dataset.userAnswer || blank.textContent);
      var answer = clean(blank.dataset.answer);
      // Die Lücke zeigt anfangs ihre Nummer an – das ist keine Antwort.
      if (/^\d+$/.test(given) && !blank.dataset.userAnswer) given = '';
      var context = blank.closest('p') || blank.parentElement;
      items.push({
        n: items.length + 1,
        q: 'Lücke ' + (i + 1) + (context ? ' · ' + short(context.textContent, 70) : ''),
        given: given,
        correct: answer,
        ok: given !== '' && norm(given) === norm(answer),
        el: blank
      });
    });
  }

  function gradeRadioGroups(items) {
    var key = correctAnswersObject();
    if (!key) return;
    var groups = [];
    var seen = {};
    document.querySelectorAll('input[type="radio"][name]').forEach(function (input) {
      if (!seen[input.name]) { seen[input.name] = []; groups.push(input.name); }
      seen[input.name].push(input);
    });
    groups.forEach(function (name) {
      var inputs = seen[name];
      var checked = inputs.find(function (i) { return i.checked; });
      var given = checked ? clean(checked.value) : '';
      var answer = null;
      if (key[name] != null) {
        answer = key[name];
      } else {
        var m = name.match(/^q(\d+)$/);
        if (m && key[m[1]] != null) answer = key[m[1]];
      }
      if (answer == null) return; // kein Schlüssel → nicht bewertbar
      var row = inputs[0].closest('tr') || inputs[0].closest('.question-block') || inputs[0].closest('label');
      var label = '';
      if (row) label = clean(row.textContent);
      if (!label) label = 'Frage ' + name;
      var blankMatch = name.match(/^q(\d+)$/);
      items.push({
        n: items.length + 1,
        q: short(label, 110) || ('Lücke ' + (blankMatch ? blankMatch[1] : name)),
        given: given,
        correct: clean(answer),
        ok: given !== '' && norm(given) === norm(answer),
        el: row
      });
    });
    // Zuordnungs-Blöcke (.question-block data-blank) mit Einzelauswahl
    document.querySelectorAll('.question-block[data-blank]').forEach(function (block) {
      var id = block.dataset.blank;
      var checked = block.querySelector('input[type="radio"]:checked');
      var answer = key[id] != null ? key[id] : key[Number(id)];
      if (answer == null) return;
      var given = checked ? clean(checked.value) : '';
      if (groups.some(function (g) { return seen[g][0] && block.contains(seen[g][0]); })) return; // schon erfasst
      items.push({
        n: items.length + 1,
        q: 'Lücke ' + id,
        given: given,
        correct: clean(answer),
        ok: given !== '' && norm(given) === norm(answer),
        el: block
      });
    });
  }

  function optionText(card, value) {
    var label = Array.prototype.slice.call(card.querySelectorAll('label')).find(function (l) {
      var input = l.querySelector('input');
      return input && input.value === value;
    });
    return label ? clean(label.textContent) : '';
  }

  function gradeCards(items) {
    var map = parseInlineAnswerMaps();
    document.querySelectorAll('.question-card').forEach(function (card) {
      var checked = card.querySelector('input[type="radio"]:checked');
      var firstInput = card.querySelector('input[type="radio"]');
      var name = checked ? checked.name : (firstInput ? firstInput.name : '');
      var given = checked ? clean(checked.value) : '';
      var answer = card.dataset.answerKey || (name && map[name]) || '';
      if (!answer) return; // keine Lösung hinterlegt – nicht bewertbar

      // Anzeige als Antworttext statt als Buchstabe
      var correctText = optionText(card, answer) || answer;
      var givenText = optionText(card, given) || given;
      var select = card.querySelector('select');
      if (!given && select && select.value) { given = clean(select.value); givenText = given; }

      items.push({
        n: items.length + 1,
        q: short((card.querySelector('h3') || card).textContent, 110),
        given: givenText,
        correct: correctText,
        ok: given !== '' && (norm(given) === norm(answer) || norm(givenText) === norm(correctText)),
        el: card
      });
    });
  }

  /** Prüft, ob die Seite überhaupt bewertbare Aufgaben enthält. */
  function hasGradeableContent() {
    return !!(document.querySelector('.question-box[data-correct]') ||
      document.querySelector('.blank[data-answer]') ||
      document.querySelector('.question-card') ||
      (correctAnswersObject() && document.querySelector('input[type="radio"][name]')));
  }

  function grade() {
    var items = [];
    gradeMatching(items);
    gradeBlanks(items);
    gradeCards(items);
    gradeRadioGroups(items);
    if (!items.length) return null;

    var score = items.filter(function (i) { return i.ok; }).length;
    var unanswered = items.filter(function (i) { return !i.given; }).length;
    lastResult = {
      items: items,
      score: score,
      total: items.length,
      unanswered: unanswered,
      percent: Math.round((score / items.length) * 100),
      date: Date.now()
    };
    markFeedback();
    render();
    persist();
    return lastResult;
  }

  /* ------------------------------------------------------------------ */
  /* Rückmeldung direkt in der Seite                                     */
  /* ------------------------------------------------------------------ */

  function markFeedback() {
    if (!lastResult) return;
    lastResult.items.forEach(function (item) {
      if (!item.el) return;
      item.el.classList.remove('telc-ok', 'telc-fail');
      item.el.classList.add(item.ok ? 'telc-ok' : 'telc-fail');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Ergebnis-Fenster                                                    */
  /* ------------------------------------------------------------------ */

  function render() {
    if (!lastResult) return;
    var r = lastResult;
    var level = meta ? meta.level : null;
    var passed = r.percent >= 60;

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'telcResultOverlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'false');
      overlay.setAttribute('aria-label', 'Ergebnis');
      document.body.appendChild(overlay);
    }

    var rows = r.items.map(function (item) {
      var given = item.given ? escapeHtml(item.given) : '<em>keine Antwort</em>';
      return '<li class="' + (item.ok ? 'ok' : 'fail') + '">' +
        '<span class="tr-n">' + item.n + '</span>' +
        '<div class="tr-body"><div class="tr-q">' + escapeHtml(item.q) + '</div>' +
        '<div class="tr-a">Deine Antwort: ' + given + '</div>' +
        (item.ok ? '' : '<div class="tr-c">Richtig: ' + escapeHtml(item.correct) + '</div>') +
        '</div></li>';
    }).join('');

    overlay.innerHTML =
      '<div class="tr-card">' +
        '<div class="tr-head">' +
          '<div class="tr-score">' + r.score + ' / ' + r.total + '</div>' +
          '<div class="tr-meta">' +
            '<div class="tr-pct">' + r.percent + ' %</div>' +
            '<div class="tr-verdict ' + (passed ? 'pass' : 'fail') + '">' +
              (passed ? 'Bestanden' : 'Noch nicht bestanden') +
              (level ? ' · ' + level : '') +
            '</div>' +
            '<div class="tr-threshold">telc-Bestehensgrenze: 60 %' +
              (r.unanswered ? ' · ' + r.unanswered + ' unbeantwortet' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<ul class="tr-list">' + rows + '</ul>' +
        '<div class="tr-actions">' +
          '<button type="button" data-act="close" class="tr-btn">Schließen</button>' +
          '<button type="button" data-act="retry" class="tr-btn primary">Nochmal versuchen</button>' +
        '</div>' +
      '</div>';

    overlay.querySelector('[data-act="close"]').onclick = closeOverlay;
    overlay.querySelector('[data-act="retry"]').onclick = function () {
      closeOverlay();
      document.querySelectorAll('.telc-ok, .telc-fail').forEach(function (el) {
        el.classList.remove('telc-ok', 'telc-fail');
      });
      var firstInput = document.querySelector('input[type="radio"]');
      if (firstInput) firstInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    overlay.classList.add('open');

    var overlayClick = function (e) { if (e.target === overlay) closeOverlay(); };
    overlay.onclick = overlayClick;
  }

  function closeOverlay() {
    if (overlay) overlay.classList.remove('open');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------ */
  /* Speichern für Dashboard / Fehlerheft / Statistik                    */
  /* ------------------------------------------------------------------ */

  function persist() {
    if (!lastResult || !meta) return;
    if (Date.now() - lastSavedAt < 1500) return;
    lastSavedAt = Date.now();

    var attempt = {
      quizId: meta.id,
      title: meta.title,
      level: meta.level,
      category: meta.category,
      score: lastResult.score,
      total: lastResult.total,
      date: lastResult.date,
      source: 'telc-engine'
    };
    var attempts = readLS(STORE_ATTEMPTS, []);
    var previous = attempts.length ? attempts[attempts.length - 1] : null;
    // Doppelklick auf "Prüfen" soll keinen zweiten Versuch erzeugen.
    if (previous && previous.quizId === attempt.quizId && attempt.date - previous.date < 15000) {
      attempts[attempts.length - 1] = attempt;
    } else {
      attempts.push(attempt);
    }
    writeLS(STORE_ATTEMPTS, attempts);

    var mistakes = lastResult.items.filter(function (i) { return !i.ok; }).map(function (i) {
      return {
        quizId: meta.id,
        title: meta.title,
        level: meta.level,
        category: meta.category,
        question: i.q,
        studentAnswer: i.given || '(keine Antwort)',
        correctAnswer: i.correct,
        type: 'engine',
        date: lastResult.date
      };
    });
    if (mistakes.length) {
      writeLS(STORE_MISTAKES, readLS(STORE_MISTAKES, []).concat(mistakes));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Verdrahtung                                                         */
  /* ------------------------------------------------------------------ */

  var CHECK_RE = /prüf|prüfen|korrigier|auswert|check|abgeben|fertig|submit/i;

  function isCheckButton(el) {
    if (!el || el.tagName !== 'BUTTON' && el.tagName !== 'A' && el.tagName !== 'INPUT') return false;
    if (el.id === 'lesenPlay' || el.id === 'lesenStop' || el.closest('#lesenPanel')) return false;
    var text = clean(el.textContent) + ' ' + (el.getAttribute('onclick') || '') + ' ' + (el.value || '');
    return CHECK_RE.test(text);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('button, a, input[type="button"]') : null;
    if (!isCheckButton(btn)) return;
    // Nach dem Seiten-eigenen Handler auswerten (der setzt Markierungen/Klassen).
    setTimeout(function () { grade(); }, 60);
  }, true);

  // Seiten ohne eigenen Prüf-Button bekommen einen "Auswerten"-Knopf.
  function addFallbackButton() {
    if (document.getElementById('telcGradeBtn')) return;
    var hasButton = Array.prototype.slice.call(document.querySelectorAll('button')).some(isCheckButton);
    if (hasButton) return;
    var btn = document.createElement('button');
    btn.id = 'telcGradeBtn';
    btn.type = 'button';
    btn.innerHTML = '✓ Auswerten';
    btn.onclick = function () { grade(); };
    document.body.appendChild(btn);
  }

  function injectStyles() {
    if (document.getElementById('telcEngineStyles')) return;
    var css = document.createElement('style');
    css.id = 'telcEngineStyles';
    css.textContent = [
      '.telc-ok{outline:3px solid #22c55e !important;outline-offset:2px;border-radius:10px;}',
      '.telc-fail{outline:3px solid #ef4444 !important;outline-offset:2px;border-radius:10px;}',
      '#telcGradeBtn{position:fixed;left:16px;bottom:78px;z-index:9998;background:#1f6feb;color:#fff;border:0;',
      'border-radius:999px;padding:10px 16px;font:600 14px/1 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer;}',
      '#telcGradeBtn:hover{background:#1558c0;}',
      '#telcResultOverlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:none;align-items:center;',
      'justify-content:center;padding:16px;z-index:10050;}',
      '#telcResultOverlay.open{display:flex;}',
      '.tr-card{background:#fff;color:#0f172a;width:min(620px,100%);max-height:88vh;overflow:auto;border-radius:16px;',
      'box-shadow:0 24px 70px rgba(0,0,0,.35);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;}',
      '.tr-head{display:flex;gap:18px;align-items:center;padding:20px 22px;border-bottom:1px solid #e2e8f0;}',
      '.tr-score{font-size:34px;font-weight:800;color:#1d4ed8;white-space:nowrap;}',
      '.tr-pct{font-size:20px;font-weight:700;}',
      '.tr-verdict{font-weight:600;}',
      '.tr-verdict.pass{color:#15803d;}',
      '.tr-verdict.fail{color:#b91c1c;}',
      '.tr-threshold{font-size:12px;color:#64748b;}',
      '.tr-list{list-style:none;margin:0;padding:8px 14px 0;}',
      '.tr-list li{display:flex;gap:10px;padding:10px 8px;border-bottom:1px solid #f1f5f9;align-items:flex-start;}',
      '.tr-n{min-width:22px;height:22px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:12px;',
      'display:flex;align-items:center;justify-content:center;font-weight:700;flex:0 0 auto;margin-top:1px;}',
      '.tr-list li.ok .tr-n{background:#dcfce7;color:#15803d;}',
      '.tr-list li.fail .tr-n{background:#fee2e2;color:#b91c1c;}',
      '.tr-q{font-weight:600;margin-bottom:2px;}',
      '.tr-a{font-size:13px;color:#475569;}',
      '.tr-c{font-size:13px;color:#15803d;font-weight:600;}',
      '.tr-a em{color:#94a3b8;font-style:normal;}',
      '.tr-actions{display:flex;gap:10px;justify-content:flex-end;padding:16px 22px;}',
      '.tr-btn{border:1px solid #cbd5e1;background:#fff;color:#0f172a;padding:9px 16px;border-radius:10px;',
      'font:600 13px system-ui,sans-serif;cursor:pointer;}',
      '.tr-btn.primary{background:#1f6feb;border-color:#1f6feb;color:#fff;}',
      '.tr-btn:hover{filter:brightness(.96);}',
      '@media (max-width:600px){#telcGradeBtn{bottom:calc(150px + env(safe-area-inset-bottom, 0px));}}',
      '@media (max-width:520px){.tr-head{flex-direction:column;align-items:flex-start;gap:6px;}}'
    ].join('');
    document.head.appendChild(css);
  }

  /**
   * In Zuordnungs-Quizzen sind einige Aufgaben als Beispiel vorgegeben.
   * Sie werden vor der ersten Eingabe markiert, damit die Punktzahl nur
   * die echten Aufgaben zählt.
   */
  function markExamples() {
    document.querySelectorAll('.question-box[data-correct]').forEach(function (box) {
      var target = box.querySelector('.drop-target') || box.querySelector('.email-subject');
      if (target && !target.classList.contains('empty-drop-target')) box.dataset.example = '1';
    });
  }

  function init() {
    injectStyles();
    normalizeCards();
    markExamples();
    addFallbackButton();
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closeOverlay();
    });
    registryReady.then(function () { if (lastResult) render(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TELC_ENGINE = {
    version: VERSION,
    grade: grade,
    hasResult: function () { return !!lastResult; },
    result: function () { return lastResult; },
    score: function () { return lastResult ? lastResult.score : 0; },
    total: function () { return lastResult ? lastResult.total : 0; },
    mistakes: function () {
      if (!lastResult) return [];
      return lastResult.items.filter(function (i) { return !i.ok; }).map(function (i) {
        return {
          question: i.q,
          studentAnswer: i.given || '(keine Antwort)',
          correctAnswer: i.correct,
          type: 'engine'
        };
      });
    }
  };
})();
