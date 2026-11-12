#!/usr/bin/env node
/*
 * Erzeugt das Quiz-Register neu – ausschließlich aus Dateien, die es
 * wirklich gibt. Dadurch verschwinden tote Links aus Übersichten,
 * Suche, Zähler und Navigation.
 *
 * Aktualisiert:
 *   quiz-registry.json, quiz-registry-b1.json,
 *   telc-sets.js, b1.json, b2.json
 * und entfernt nicht mehr vorhandene Einträge aus index1.html/index2.html.
 *
 * Aufruf: node tools/build-registry.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUIZ_DIR = path.join(ROOT, 'QUIZES');
const OUTSIDE = path.join(ROOT, '..');

const CATEGORY_ORDER = [
  'Lesen Teil 1', 'Lesen Teil 2', 'Lesen Teil 3',
  'Sprachbausteine Teil 1', 'Sprachbausteine Teil 2',
  'Hören'
];

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'quiz-registry.json'), 'utf8'));
const files = new Set(fs.readdirSync(QUIZ_DIR).filter(f => f.endsWith('.html')));

/** Platzhalterseiten (Willkommensseite statt Quiz) gehören nicht ins Register. */
function isQuizPage(file) {
  const html = fs.readFileSync(path.join(QUIZ_DIR, file), 'utf8');
  if (/Willkommen zu unserem Test/i.test(html)) return false;
  return /question-box|class="blank"|question-card|question-block|type="radio"/.test(html);
}

function titleFromFile(file) {
  const html = fs.readFileSync(path.join(QUIZ_DIR, file), 'utf8');
  const t = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
  return t.replace(/\s+/g, ' ').trim();
}

const kept = registry
  .filter(q => files.has(q.file) && isQuizPage(q.file))
  .map(q => ({
    id: q.id,
    file: q.file,
    level: q.level,
    category: q.category,
    title: q.title || titleFromFile(q.file),
    exists: true
  }))
  .sort((a, b) => {
    if (a.level !== b.level) return a.level === 'B1' ? -1 : 1;
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb);
    return Number(a.id) - Number(b.id);
  });

const removed = registry.filter(q => !files.has(q.file) || !isQuizPage(q.file));
const placeholders = registry.filter(q => files.has(q.file) && !isQuizPage(q.file));

const b1 = kept.filter(q => q.level === 'B1');
const b2 = kept.filter(q => q.level === 'B2');

fs.writeFileSync(path.join(ROOT, 'quiz-registry.json'), JSON.stringify(kept, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'quiz-registry-b1.json'), JSON.stringify(b1, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'b1.json'), JSON.stringify(b1.map(q => q.file), null, 4) + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'b2.json'), JSON.stringify(b2.map(q => q.file), null, 4) + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'telc-sets.js'),
  'window.TELC_B1 = ' + JSON.stringify(b1.map(q => q.file)) + ';\n' +
  'window.TELC_B2 = ' + JSON.stringify(b2.map(q => q.file)) + ';\n', 'utf8');

// Kopien im übergeordneten Projektordner mitführen, falls vorhanden.
['b1.json', 'b2.json', 'quiz-registry.json', 'quiz-registry-b1.json'].forEach(name => {
  const target = path.join(OUTSIDE, name);
  if (fs.existsSync(target)) {
    fs.copyFileSync(path.join(ROOT, name), target);
  }
});

// Tote Links aus den Übersichten entfernen.
let removedLinks = 0;
['index1.html', 'index2.html'].forEach(page => {
  const full = path.join(ROOT, page);
  if (!fs.existsSync(full)) return;
  let html = fs.readFileSync(full, 'utf8');
  removed.forEach(q => {
    const re = new RegExp('\\s*<a\\b[^>]*href="/QUIZES/' + q.file.replace('.', '\\.') + '"[^>]*>[\\s\\S]*?</a>', 'g');
    const before = html;
    html = html.replace(re, '');
    if (html !== before) removedLinks++;
  });
  fs.writeFileSync(full, html, 'utf8');
});

console.log(`Register: ${kept.length} gültige Einträge (B1: ${b1.length}, B2: ${b2.length})`);
console.log(`Entfernt: ${removed.length} Einträge (davon ${placeholders.length} Platzhalterseiten ohne Quiz-Inhalt)`);
if (placeholders.length) console.log('  Platzhalter: ' + placeholders.map(p => p.file).join(', '));
console.log(`Tote Links aus Übersichten entfernt: ${removedLinks}`);
