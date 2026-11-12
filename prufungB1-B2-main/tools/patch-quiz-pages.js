#!/usr/bin/env node
/*
 * Bindet die gemeinsamen Skripte (quiz-engine.js, lesen.js) in alle
 * Quiz-Seiten ein. Idempotent: bereits eingebundene Seiten bleiben
 * unverändert.
 *
 * Aufruf: node tools/patch-quiz-pages.js
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'QUIZES');
const inject = '<script src="/quiz-engine.js"></script>\n<script src="/lesen.js"></script>\n';

let patched = 0;
let skipped = 0;

fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(file => {
  const full = path.join(dir, file);
  let html = fs.readFileSync(full, 'utf8');
  if (/quiz-engine\.js/.test(html) && /lesen\.js/.test(html)) { skipped++; return; }

  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, inject + '</body>');
  } else {
    html += '\n' + inject;
  }
  fs.writeFileSync(full, html, 'utf8');
  patched++;
});

console.log(`Eingebunden: ${patched} Seiten, unverändert: ${skipped}`);
