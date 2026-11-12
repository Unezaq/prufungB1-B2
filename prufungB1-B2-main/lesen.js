/*
 * TELC Vorlesen (Text-to-Speech)
 * ------------------------------------------------------------------
 * Liest Prüfungstexte, Aufgaben und Fragen mit einer natürlichen
 * deutschen Stimme vor – ohne Cloud-Dienst, ohne API-Schlüssel und
 * ohne zusätzliche Abhängigkeiten (Web Speech API des Browsers).
 *
 * Funktionen
 *  - Stimmenauswahl, wobei natürliche/neuronale Stimmen zuerst stehen
 *    (Microsoft "Natural"/"Online", Google, Apple "Premium"/"Enhanced")
 *  - Tempo-Regler (0,6× – 1,4×), Pause/Fortsetzen, Stopp
 *  - liest den ganzen Text Abschnitt für Abschnitt und markiert den
 *    gerade gesprochenen Abschnitt
 *  - 🔊-Knopf an jedem Abschnitt liest nur diesen Abschnitt
 *  - markierter Text wird bevorzugt gelesen
 *  - merkt sich Stimme und Tempo
 */
(function () {
  'use strict';
  if (window.TELC_LESEN) return;

  var LS_VOICE = 'telc_voice_uri';
  var LS_RATE = 'telc_voice_rate';
  var synth = window.speechSynthesis || null;

  var state = {
    queue: [],
    index: 0,
    active: false,
    paused: false,
    block: null,
    voice: null,
    rate: 1,
    watchdog: null
  };

  var panel, voiceSelect, rateInput, rateLabel, playBtn, pauseBtn, stopBtn, note;
  var fab;

  /* ------------------------------------------------------------------ */
  /* Stimmen                                                             */
  /* ------------------------------------------------------------------ */

  function voiceScore(v) {
    var score = 0;
    var name = v.name || '';
    var lang = (v.lang || '').replace('_', '-');
    if (/^de(-|$)/i.test(lang)) score += 100;
    else if (/^de/i.test(lang)) score += 70;
    if (/natural|neural|online|premium|enhanced/i.test(name)) score += 60;
    if (/google/i.test(name)) score += 35;
    if (/katja|conrad|killian|seraphina|anna|petra|markus|yannick|vicki|klaus|marlene|hans/i.test(name)) score += 25;
    if (/^de-DE/i.test(lang)) score += 10;
    if (v.localService) score += 5;
    return score;
  }

  function germanVoices() {
    if (!synth) return [];
    var all = synth.getVoices() || [];
    var de = all.filter(function (v) { return /^de/i.test(v.lang || ''); });
    var pool = de.length ? de : all;
    return pool.slice().sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
  }

  function readLS(key, fallback) {
    try { var v = localStorage.getItem(key); return v || fallback; } catch (e) { return fallback; }
  }
  function writeLS(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignorieren */ }
  }

  function fillVoices() {
    if (!voiceSelect) return;
    var voices = germanVoices();
    var saved = readLS(LS_VOICE, '');
    voiceSelect.innerHTML = '';
    if (!voices.length) {
      var opt = document.createElement('option');
      opt.textContent = 'Keine Stimme gefunden';
      voiceSelect.appendChild(opt);
      voiceSelect.disabled = true;
      if (note) note.textContent = 'Dein Browser meldet keine Stimmen. Prüfe die Sprachausgabe des Systems.';
      return;
    }
    voiceSelect.disabled = false;
    voices.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v.voiceURI;
      o.textContent = v.name + ' · ' + v.lang;
      voiceSelect.appendChild(o);
    });
    var preferred = voices.find(function (v) { return v.voiceURI === saved; }) || voices[0];
    voiceSelect.value = preferred.voiceURI;
    state.voice = preferred;
    if (note) {
      var natural = /natural|neural|online|premium|enhanced/i.test(preferred.name);
      note.textContent = natural
        ? 'Natürliche Stimme aktiv: ' + preferred.name
        : 'Tipp: Für eine natürlich klingende Stimme im System „Microsoft Katja/Conrad (Natural)“ oder die Google-Stimme installieren.';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Text finden                                                        */
  /* ------------------------------------------------------------------ */

  function clean(s) {
    return String(s == null ? '' : s).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var SELECTORS = [
    '.question-text',
    '.letter',
    '.QUIZES-text',
    '.question-card',
    '.passage',
    '.post',
    'article'
  ];

  function isExcluded(el) {
    return !!(el.closest('#lesenPanel, .telc-nav, .telc-bottombar, #telcGradeBtn, #telcResultOverlay') ||
      /^(SCRIPT|STYLE|NOSCRIPT|BUTTON)$/.test(el.tagName));
  }

  /** Liefert die Abschnitte, die vorgelesen werden sollen. */
  function collectBlocks() {
    var found = [];
    for (var i = 0; i < SELECTORS.length; i++) {
      var els = Array.prototype.slice.call(document.querySelectorAll(SELECTORS[i]));
      els = els.filter(function (el) {
        return !isExcluded(el) && clean(el.textContent).length > 25;
      });
      // verschachtelte Treffer entfernen
      els = els.filter(function (el) {
        return !els.some(function (other) { return other !== el && other.contains(el); }) &&
          !found.some(function (b) { return b.el.contains(el) || el.contains(b.el); });
      });
      if (els.length) {
        found = found.concat(els.map(function (el) { return { el: el, text: clean(el.textContent) }; }));
        break;
      }
    }

    if (!found.length) {
      // Fallback für Tabellen-Quizze: Überschrift + jede Fragezeile
      var containers = document.querySelectorAll('.QUIZES-container');
      Array.prototype.forEach.call(containers, function (box) {
        var h = box.querySelector('h2');
        if (h && clean(h.textContent)) found.push({ el: h, text: clean(h.textContent) });
        box.querySelectorAll('tr').forEach(function (row) {
          var cell = row.querySelector('td:last-child');
          if (cell && clean(cell.textContent).length > 12) {
            found.push({ el: cell, text: clean(cell.textContent) });
          }
        });
      });
    }

    found = found.filter(function (b) { return b.text.length > 3; });
    return found;
  }

  function splitSentences(text) {
    var parts = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [text];
    var out = [];
    var buffer = '';
    parts.forEach(function (p) {
      var piece = clean(p);
      if (!piece) return;
      buffer = buffer ? buffer + ' ' + piece : piece;
      if (buffer.length > 90 || /[.!?]$/.test(piece)) {
        out.push(buffer);
        buffer = '';
      }
    });
    if (buffer) out.push(buffer);
    // Sehr lange Sätze weiter teilen, damit die Betonung natürlich bleibt.
    var final = [];
    out.forEach(function (s) {
      while (s.length > 260) {
        var cut = s.lastIndexOf(',', 240);
        if (cut < 120) cut = s.lastIndexOf(' ', 240);
        if (cut < 80) cut = 240;
        final.push(s.slice(0, cut + 1).trim());
        s = s.slice(cut + 1).trim();
      }
      if (s) final.push(s);
    });
    return final;
  }

  function highlight(el) {
    if (state.block && state.block !== el) state.block.classList.remove('lesen-speaking');
    state.block = el;
    if (!el) return;
    el.classList.add('lesen-speaking');
    var rect = el.getBoundingClientRect();
    if (rect.top < 70 || rect.bottom > window.innerHeight - 90) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Sprechen                                                            */
  /* ------------------------------------------------------------------ */

  function speakNext() {
    if (!state.active || state.index >= state.queue.length) {
      finish();
      return;
    }
    var item = state.queue[state.index];
    highlight(item.el);

    var u = new SpeechSynthesisUtterance(item.text);
    u.lang = (state.voice && state.voice.lang) || 'de-DE';
    if (state.voice) u.voice = state.voice;
    u.rate = state.rate;
    u.pitch = 1;

    u.onend = function () {
      if (!state.active) return;
      state.index++;
      setTimeout(speakNext, 90);
    };
    u.onerror = function (event) {
      // "interrupted"/"canceled" entstehen bei Stopp/Pause – kein Fehler.
      if (/interrupted|canceled|cancelled/i.test(event.error || '')) return;
      if (state.index < state.queue.length - 1) {
        state.index++;
        setTimeout(speakNext, 150);
      } else {
        finish();
      }
    };

    state.paused = false;
    synth.speak(u);
  }

  function buildQueue(blocks) {
    var queue = [];
    blocks.forEach(function (block) {
      splitSentences(block.text).forEach(function (sentence) {
        queue.push({ text: sentence, el: block.el });
      });
    });
    return queue;
  }

  function start(blocks, label) {
    if (!synth) {
      if (note) note.textContent = 'Dieser Browser unterstützt keine Sprachausgabe.';
      return;
    }
    stop(true);
    if (!blocks || !blocks.length) {
      if (note) note.textContent = 'Kein Text zum Vorlesen gefunden.';
      return;
    }
    state.queue = buildQueue(blocks);
    state.index = 0;
    state.active = true;
    state.paused = false;
    if (playBtn) playBtn.hidden = true;
    if (pauseBtn) { pauseBtn.hidden = false; pauseBtn.textContent = '⏸ Pause'; }
    if (stopBtn) stopBtn.hidden = false;
    if (note) note.textContent = label || 'Liest vor …';

    // Chrome/iOS: Stimmenliste ist manchmal erst nach dem ersten Aufruf gefüllt.
    if (!state.voice) fillVoices();
    synth.cancel();
    setTimeout(speakNext, 60);

    clearInterval(state.watchdog);
    state.watchdog = setInterval(function () {
      // Bekannter Chrome-Fehler: Warteschlange bleibt nach ~15 s hängen.
      if (state.active && !state.paused && !synth.speaking && !synth.pending) {
        state.index++;
        if (state.index < state.queue.length) speakNext();
        else finish();
      }
    }, 4000);
  }

  function finish() {
    state.active = false;
    state.paused = false;
    clearInterval(state.watchdog);
    if (state.block) state.block.classList.remove('lesen-speaking');
    state.block = null;
    if (playBtn) playBtn.hidden = false;
    if (pauseBtn) pauseBtn.hidden = true;
    if (stopBtn) stopBtn.hidden = true;
    if (note) note.textContent = 'Fertig.';
  }

  function stop(silent) {
    state.active = false;
    state.paused = false;
    clearInterval(state.watchdog);
    if (synth) synth.cancel();
    if (state.block) state.block.classList.remove('lesen-speaking');
    state.block = null;
    if (playBtn) playBtn.hidden = false;
    if (pauseBtn) pauseBtn.hidden = true;
    if (stopBtn) stopBtn.hidden = true;
    if (!silent && note) note.textContent = 'Gestoppt.';
  }

  function togglePause() {
    if (!state.active) return;
    if (state.paused) {
      synth.resume();
      state.paused = false;
      pauseBtn.textContent = '⏸ Pause';
    } else {
      synth.pause();
      state.paused = true;
      pauseBtn.textContent = '▶ Weiter';
    }
  }

  /* ------------------------------------------------------------------ */
  /* Oberfläche                                                          */
  /* ------------------------------------------------------------------ */

  function injectStyles() {
    if (document.getElementById('lesenStyles')) return;
    var css = document.createElement('style');
    css.id = 'lesenStyles';
    css.textContent = [
      '.lesen-speaking{background:#fff3bf !important;box-shadow:inset 0 0 0 2px #f2c200;border-radius:8px;',
      'transition:background .25s ease;}',
      '#lesenFab{position:fixed;left:16px;bottom:16px;z-index:9999;display:flex;align-items:center;gap:8px;',
      'background:#0f172a;color:#fff;border:0;border-radius:999px;padding:11px 18px;font:600 14px/1 system-ui,sans-serif;',
      'box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer;}',
      '#lesenFab:hover{background:#1e293b;}',
      '#lesenFab.on{background:#15803d;}',
      '#lesenPanel{position:fixed;left:16px;bottom:70px;z-index:9999;width:min(320px,calc(100vw - 32px));background:#fff;',
      'color:#0f172a;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.3);padding:14px;',
      'font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;}',
      '#lesenPanel[hidden]{display:none;}',
      '#lesenPanel .lp-head{display:flex;justify-content:space-between;align-items:center;font-weight:700;',
      'font-size:14px;margin-bottom:10px;}',
      '#lesenPanel label{display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:8px;}',
      '#lesenPanel select,#lesenPanel input[type=range]{width:100%;margin-top:4px;}',
      '#lesenPanel select{padding:6px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-size:12px;}',
      '#lesenPanel .lp-rate{display:flex;align-items:center;gap:8px;}',
      '#lesenPanel .lp-rate span{min-width:38px;text-align:right;font-variant-numeric:tabular-nums;color:#334155;}',
      '#lesenPanel .lp-actions{display:flex;gap:8px;margin:10px 0 6px;}',
      '#lesenPanel .lp-actions button{flex:1;border:1px solid #cbd5e1;background:#f8fafc;border-radius:9px;',
      'padding:8px 6px;font:600 12px system-ui,sans-serif;cursor:pointer;}',
      '#lesenPanel .lp-actions button#lesenPlay{background:#1f6feb;border-color:#1f6feb;color:#fff;}',
      '#lesenPanel .lp-actions button:hover{filter:brightness(.96);}',
      '#lesenPanel .lp-note{font-size:11px;color:#64748b;margin-top:6px;min-height:14px;}',
      '#lesenPanel .lp-hint{font-size:11px;color:#94a3b8;margin-top:6px;border-top:1px solid #eef2f7;padding-top:6px;}',
      '#lesenClose{border:0;background:transparent;font-size:18px;line-height:1;cursor:pointer;color:#64748b;}',
      '.lesen-inline{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;',
      'border-radius:999px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;cursor:pointer;',
      'font-size:12px;margin:0 6px 0 0;vertical-align:middle;flex:0 0 auto;}',
      '.lesen-inline:hover{background:#e2e8f0;}',
      '@media (max-width:600px){#lesenFab{bottom:calc(96px + env(safe-area-inset-bottom, 0px));}',
      '#lesenPanel{bottom:calc(158px + env(safe-area-inset-bottom, 0px));}}'
    ].join('');
    document.head.appendChild(css);
  }

  function buildPanel() {
    fab = document.createElement('button');
    fab.id = 'lesenFab';
    fab.type = 'button';
    fab.title = 'Text vorlesen (Alt+V)';
    fab.innerHTML = '<span aria-hidden="true">🔊</span><span>Vorlesen</span>';

    panel = document.createElement('div');
    panel.id = 'lesenPanel';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="lp-head"><span>Text vorlesen</span><button type="button" id="lesenClose" aria-label="Schließen">×</button></div>' +
      '<label>Stimme<select id="lesenVoice"></select></label>' +
      '<label>Tempo<div class="lp-rate"><input id="lesenRate" type="range" min="0.6" max="1.4" step="0.05" value="1"><span id="lesenRateVal">1.0×</span></div></label>' +
      '<div class="lp-actions">' +
        '<button type="button" id="lesenPlay">▶ Vorlesen</button>' +
        '<button type="button" id="lesenPause" hidden>⏸ Pause</button>' +
        '<button type="button" id="lesenStop" hidden>⏹ Stopp</button>' +
      '</div>' +
      '<div class="lp-note" id="lesenNote"></div>' +
      '<div class="lp-hint">Tipp: Text markieren und ▶ drücken – dann wird nur die Auswahl gelesen.</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    voiceSelect = panel.querySelector('#lesenVoice');
    rateInput = panel.querySelector('#lesenRate');
    rateLabel = panel.querySelector('#lesenRateVal');
    playBtn = panel.querySelector('#lesenPlay');
    pauseBtn = panel.querySelector('#lesenPause');
    stopBtn = panel.querySelector('#lesenStop');
    note = panel.querySelector('#lesenNote');

    var savedRate = parseFloat(readLS(LS_RATE, '1'));
    state.rate = isNaN(savedRate) ? 1 : Math.min(1.4, Math.max(0.6, savedRate));
    rateInput.value = String(state.rate);
    rateLabel.textContent = state.rate.toFixed(1).replace('.', ',') + '×';

    fab.onclick = function () {
      panel.hidden = !panel.hidden;
      fab.classList.toggle('on', !panel.hidden);
      if (!panel.hidden) {
        fillVoices();
        playBtn.focus();
      }
    };
    panel.querySelector('#lesenClose').onclick = function () {
      panel.hidden = true;
      fab.classList.remove('on');
    };

    voiceSelect.onchange = function () {
      var v = germanVoices().find(function (x) { return x.voiceURI === voiceSelect.value; });
      if (v) {
        state.voice = v;
        writeLS(LS_VOICE, v.voiceURI);
        if (note) note.textContent = 'Stimme: ' + v.name;
        if (state.active) {
          // mit neuer Stimme ab der aktuellen Stelle weitersprechen
          var rest = state.queue.slice(state.index, state.queue.length);
          start(rest, 'Neue Stimme …');
        }
      }
    };

    rateInput.oninput = function () {
      state.rate = parseFloat(rateInput.value);
      rateLabel.textContent = state.rate.toFixed(1).replace('.', ',') + '×';
      writeLS(LS_RATE, String(state.rate));
    };

    playBtn.onclick = function () {
      var selection = clean(window.getSelection ? window.getSelection().toString() : '');
      if (selection.length > 15) {
        start([{ el: null, text: selection }], 'Liest die Auswahl …');
        return;
      }
      var blocks = collectBlocks();
      start(blocks, 'Liest von Anfang an vor …');
    };
    pauseBtn.onclick = togglePause;
    stopBtn.onclick = function () { stop(false); };

    document.addEventListener('keydown', function (e) {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        fab.click();
      }
      if (e.key === 'Escape' && !panel.hidden) {
        panel.hidden = true;
        fab.classList.remove('on');
      }
    });
  }

  /** 🔊-Knopf an jedem Abschnitt. */
  function addInlineButtons() {
    collectBlocks().forEach(function (block) {
      if (!block.el || block.el.dataset.lesenBtn) return;
      block.el.dataset.lesenBtn = '1';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lesen-inline';
      btn.title = 'Diesen Abschnitt vorlesen';
      btn.setAttribute('aria-label', 'Diesen Abschnitt vorlesen');
      btn.textContent = '🔊';
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        panel.hidden = false;
        fab.classList.add('on');
        start([{ el: block.el, text: block.text }], 'Liest Abschnitt vor …');
      };
      block.el.insertBefore(btn, block.el.firstChild);
    });
  }

  function init() {
    if (!synth) return; // ältere Browser: Funktion wird einfach nicht angeboten
    injectStyles();
    buildPanel();
    fillVoices();
    addInlineButtons();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', fillVoices);
    else synth.onvoiceschanged = fillVoices;
    window.addEventListener('beforeunload', function () { if (synth) synth.cancel(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TELC_LESEN = {
    speak: function (text) { start([{ el: null, text: clean(text) }], 'Liest vor …'); },
    stop: stop,
    voices: germanVoices
  };
})();
