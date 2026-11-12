#!/usr/bin/env node
/*
 * Prüf-Audit für alle Quiz-Dateien.
 *
 * Prüft jede Datei in QUIZES/ strukturell:
 *  - UTF-8-Kodierung (Umlaute)
 *  - Aufgabentyp und Anzahl der Aufgaben
 *  - ob für jede Aufgabe ein Lösungsschlüssel existiert
 *  - ob die Seite eigene Bewertung/Ergebnisanzeige hat
 *  - ob die gemeinsame Engine (Bewertung) und Vorlesen eingebunden sind
 *  - doppelte IDs
 *  - Abgleich mit quiz-registry.json (tote Links, fehlende Einträge)
 *
 * Aufruf:  node tools/audit-quizzes.js   (oder: npm run audit)
 * Ergebnis: Zusammenfassung in der Konsole + tools/audit-report.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const QUIZ_DIR = path.join(ROOT, 'QUIZES');

function readRegistry() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'quiz-registry.json'), 'utf8')); }
  catch (e) { return []; }
}

function count(html, re) {
  return (html.match(re) || []).length;
}

function detectType(html) {
  if (count(html, /class="question-box"/g) && /data-correct=/.test(html)) return 'matching';
  if (count(html, /class="blank"/g) && /data-answer=/.test(html)) return 'blanks';
  if (count(html, /class="question-block"[^>]*data-blank/g)) return 'choice-blocks';
  if (count(html, /class="question-card"/g)) return 'cards';
  if (count(html, /type="radio"/g) && /correctAnswers\s*=/.test(html)) return 'choice';
  return 'unknown';
}

function keyNames(html) {
  const block = (html.match(/correctAnswers\s*=\s*\{([\s\S]*?)\};/) || [, ''])[1];
  const set = new Set();
  for (const m of block.matchAll(/(?:^|\s)([\w]+)\s*:/g)) set.add(m[1]);
  return set;
}

function auditFile(file) {
  const raw = fs.readFileSync(path.join(QUIZ_DIR, file));
  const html = raw.toString('utf8');
  const issues = [];
  const info = { file, size: raw.length, type: 'unknown', questions: 0, answers: 0 };

  const badChars = (html.match(/\uFFFD/g) || []).length;
  if (badChars) issues.push(`${badChars} ungültige UTF-8-Zeichen (Umlaute kaputt)`);

  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim();
  info.title = title;
  if (!title) issues.push('kein <title>');

  const type = detectType(html);
  info.type = type;

  if (type === 'matching') {
    const boxes = count(html, /class="question-box"/g);
    const targets = count(html, /class="[^"]*\bdrop-target\b/g);
    const emptyTargets = count(html, /class="[^"]*empty-drop-target[^"]*"/g);
    const examples = Math.max(0, targets - emptyTargets);
    const keys = count(html, /data-correct="/g);
    const draggables = count(html, /class="draggable/g);
    const tasks = boxes - examples;
    info.questions = tasks;
    info.examples = examples;
    info.answers = draggables;
    if (targets < boxes) issues.push(`${boxes} Aufgaben, aber nur ${targets} Ablagefelder`);
    if (keys < boxes) issues.push(`${boxes} Aufgaben, aber nur ${keys} Lösungen (data-correct)`);
    // Ungleiche Anzahl ist im telc-Format normal (Distraktoren für Teil 1/3).
    if (!draggables) issues.push('keine ziehbaren Antwortkarten gefunden');
  }

  if (type === 'blanks') {
    const blanks = [...html.matchAll(/<span class="blank"[^>]*>/g)].map(m => m[0]);
    const withKey = blanks.filter(b => /data-answer="[^"]+"/.test(b)).length;
    const wordBank = count(html, /class="draggable/g);
    info.questions = blanks.length;
    info.answers = wordBank;
    if (withKey < blanks.length) issues.push(`${blanks.length - withKey} Lücken ohne Lösung (data-answer)`);
    if (wordBank && wordBank < blanks.length) issues.push(`nur ${wordBank} Wörter im Wortkasten für ${blanks.length} Lücken`);
  }

  if (type === 'choice-blocks') {
    const blocks = [...html.matchAll(/class="question-block"[^>]*data-blank="(\d+)"/g)].map(m => m[1]);
    const keys = keyNames(html);
    info.questions = blocks.length;
    info.answers = keys.size;
    const missing = blocks.filter(b => !keys.has(b));
    if (missing.length) issues.push(`ohne Lösungsschlüssel: ${missing.join(', ')}`);
  }

  if (type === 'choice') {
    const names = new Set([...html.matchAll(/name="(q[\w]+)"/g)].map(m => m[1]));
    const keys = keyNames(html);
    info.questions = names.size;
    info.answers = keys.size;
    // Register-Logik: q3_1 → q3_1, q3 → 3
    const missing = [...names].filter(n => !keys.has(n) && !(n.match(/^q(\d+)$/) && keys.has(n.slice(1))));
    if (missing.length) issues.push(`ohne Lösungsschlüssel: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}`);
  }

  if (type === 'cards') {
    const cards = count(html, /class="question-card"/g);
    info.questions = cards;
    const marked = count(html, /color:\s*green|color:\s*#0f0|class="[^"]*correct/g);
    const answerMap = /(?:answers|correctAnswers)\s*=\s*\{[\s\S]*?q\d+\s*:/.test(html);
    info.answerMap = answerMap;
    info.answers = answerMap ? cards : marked;
    if (!answerMap && !marked) issues.push('kein Lösungsschlüssel (weder markiert noch answers-Objekt) – nicht bewertbar');
  }

  if (type === 'unknown') {
    issues.push(/Willkommen zu unserem Test/i.test(html)
      ? 'Platzhalterseite (Willkommensseite) statt Quiz – darf nicht im Register stehen'
      : 'kein bewertbarer Aufgabentyp erkannt');
  }

  // Bewertung: seiten-eigene Funktion oder Engine
  info.localCheck = /prüf|prüfen|korrigier|auswert|submit|checkAnswers|checkBtn|clickDrop/i.test(html);
  info.engine = /quiz-engine\.js/.test(html);
  info.reader = /lesen\.js/.test(html);
  if (!info.engine) issues.push('quiz-engine.js nicht eingebunden');
  if (!info.reader) issues.push('lesen.js nicht eingebunden');

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupIds.length) issues.push(`doppelte IDs: ${dupIds.slice(0, 5).join(', ')}`);

  info.issues = issues;
  return info;
}

function main() {
  const registry = readRegistry();
  const files = fs.readdirSync(QUIZ_DIR).filter(f => f.endsWith('.html')).sort();
  const results = files.map(auditFile);

  const missing = registry.filter(q => !fs.existsSync(path.join(QUIZ_DIR, q.file)));
  const unregistered = files.filter(f => !registry.find(q => q.file === f));
  const realIssues = results.filter(r => r.issues.length);

  const typeCount = {};
  results.forEach(r => { typeCount[r.type] = (typeCount[r.type] || 0) + 1; });
  const engineCoverage = results.filter(r => r.engine).length;
  const readerCoverage = results.filter(r => r.reader).length;
  const localResult = results.filter(r => r.localCheck).length;

  const lines = [];
  lines.push('# Quiz-Audit');
  lines.push('');
  lines.push(`Stand: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push('## Zusammenfassung');
  lines.push('');
  lines.push(`- Quizdateien: **${files.length}**`);
  lines.push(`- Registereinträge: **${registry.length}** (B1 ${registry.filter(q => q.level === 'B1').length}, B2 ${registry.filter(q => q.level === 'B2').length})`);
  lines.push(`- Tote Registereinträge: **${missing.length}**`);
  lines.push(`- Dateien ohne Registereintrag: **${unregistered.length}**`);
  lines.push(`- Einheitliche Bewertung eingebunden: **${engineCoverage}/${files.length}**`);
  lines.push(`- Vorlesen eingebunden: **${readerCoverage}/${files.length}**`);
  lines.push(`- Mit eigener Ergebnisanzeige (vor der Engine): ${localResult}/${files.length}`);
  lines.push(`- Seiten mit echten Auffälligkeiten: **${realIssues.length}**`);
  lines.push('');
  lines.push('Aufgabentypen: ' + Object.entries(typeCount).map(([k, v]) => `${k} (${v})`).join(', '));
  lines.push('');
  if (missing.length) {
    lines.push('## Tote Registereinträge');
    lines.push('');
    lines.push('| ID | Level | Kategorie | Titel |');
    lines.push('| --- | --- | --- | --- |');
    missing.slice(0, 100).forEach(q => lines.push(`| ${q.id} | ${q.level} | ${q.category} | ${q.title} |`));
    lines.push('');
  } else {
    lines.push('Keine toten Links: jeder Registereintrag hat eine Datei, jede Datei einen Eintrag.');
    lines.push('');
  }
  lines.push('## Seiten mit Auffälligkeiten');
  lines.push('');
  if (!realIssues.length) {
    lines.push('Keine – alle Seiten sind strukturell vollständig und bewertbar.');
    lines.push('');
  }
  realIssues.forEach(r => {
    lines.push(`### ${r.file} — ${r.title || 'ohne Titel'}`);
    lines.push(`Typ: ${r.type}, Aufgaben: ${r.questions}, Lösungen: ${r.answers}`);
    r.issues.forEach(i => lines.push(`- ${i}`));
    lines.push('');
  });

  fs.writeFileSync(path.join(__dirname, 'audit-report.md'), lines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(__dirname, 'audit-report.json'), JSON.stringify({
    summary: { files: files.length, registry: registry.length, missing: missing.length, unregistered: unregistered.length, engineCoverage, readerCoverage, localResult, realIssues: realIssues.length, typeCount },
    results,
    missing
  }, null, 2), 'utf8');

  console.log(`Quizdateien: ${files.length}`);
  console.log(`Register: ${registry.length} | tote Einträge: ${missing.length} | ohne Eintrag: ${unregistered.length}`);
  console.log(`Bewertung eingebunden: ${engineCoverage}/${files.length} | Vorlesen: ${readerCoverage}/${files.length}`);
  console.log(`Seiten mit Auffälligkeiten: ${realIssues.length}`);
  console.log('Typen: ' + JSON.stringify(typeCount));
  console.log('Report: tools/audit-report.md');
  if (realIssues.length) {
    console.log('\nAuffälligkeiten:');
    realIssues.slice(0, 15).forEach(r => console.log(`- ${r.file}: ${r.issues.join(' | ')}`));
  }
}

main();
