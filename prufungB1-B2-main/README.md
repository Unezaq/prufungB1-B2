# TELC B1 / B2 – Prüfungsvorbereitung

Interaktive Vorbereitung auf die telc-Prüfung **Deutsch B1 und B2**.
Das Projekt enthält echte Prüfungsteile (Lesen, Sprachbausteine, Hören) als
Übungen, ein Dashboard mit Fortschritt, ein Fehlerheft, einen Prüfungssimulator
und einen Studienplaner.

Alles läuft lokal mit Node.js – ohne Build-Schritte und ohne externe Dienste.

```bash
npm start          # http://localhost:3000
```

---

## Prüfungsaufbau (telc B1 / B2)

| Prüfungsteil | B1 | B2 | In diesem Projekt |
| --- | --- | --- | --- |
| Lesen Teil 1 | 5 Aufgaben | 5 Aufgaben | Zuordnung von Texten zu Situationen |
| Lesen Teil 2 | 5 Aufgaben | 5 Aufgaben | Multiple Choice |
| Lesen Teil 3 | 10 Aufgaben | 10 Aufgaben | Zuordnung / Anzeigen |
| Sprachbausteine Teil 1 | 10 Lücken | 10 Lücken | Multiple Choice im Brief |
| Sprachbausteine Teil 2 | 10 Lücken | 10 Lücken | Lückentext mit Wortkasten |
| Hören | 3 Teile | 3 Teile | Aufgaben + Vorlesefunktion |

Bestehensgrenze: **60 %** je Prüfungsteil – diese Grenze zeigt die Auswertung an.

## Bestand

- **168 Quiz-Seiten** in `QUIZES/` (B1: 23, B2: 145), jede mit vollständigem Lösungsschlüssel
- Register `quiz-registry.json` – jede Übersicht, Suche und Navigation liest daraus
- 2 Platzhalterseiten (reine Willkommensseiten) wurden aus dem Register entfernt

## Was geprüft und repariert wurde

1. **Tote Links entfernt.** Das Register enthielt 63 Einträge, zu denen keine
   Datei existierte (u. a. `250.html`, `286.html`). Diese Einträge und die
   zugehörigen Schaltflächen in `index1.html` / `index2.html` sind entfernt.
   Register und Dateibestand sind jetzt deckungsgleich.
2. **Einheitliche, echte Bewertung** über `quiz-engine.js`:
   - berechnet für jeden Aufgabentyp die Punktzahl aus dem tatsächlichen Zustand
     der Seite (platzierte Karten, gesetzte Wörter, gewählte Antworten)
   - zeigt Ergebnis mit Punktzahl, Prozent und Bestanden/Nicht bestanden
   - zählt vorgegebene Beispielaufgaben nicht mit und überspringt sie
   - liest Lösungsschlüssel auch aus älteren Seiten (`answers = {q1: "b"}`)
   - entfernt vorab grün markierte Lösungen, die bisher schon vor der Abgabe sichtbar waren
   - speichert jeden Versuch in `telc_attempts` / `telc_mistakes`, damit Dashboard,
     Fehlerheft und Statistik echte Daten erhalten
3. **Vorlesen mit natürlicher Stimme** (siehe unten) auf allen Quiz-Seiten.
4. **Prüf-Audit** (`npm run audit`) als nachvollziehbarer Qualitätsnachweis.

## Vorlesen (Text-to-Speech)

Jede Quiz-Seite hat unten links den Knopf **🔊 Vorlesen** (Tastenkürzel `Alt + V`):

- liest Prüfungstexte, Aufgaben und Fragen Abschnitt für Abschnitt vor und
  markiert den gerade gesprochenen Abschnitt
- **🔊** an jedem Abschnitt liest nur diesen Abschnitt
- Text markieren und ▶ drücken liest nur die Auswahl
- Stimmenauswahl, Tempo 0,6× – 1,4×, Pause/Fortsetzen, Stopp
- Stimme und Tempo werden gespeichert

Natürliche Stimmen werden automatisch zuerst angeboten: neuronale/Online-Stimmen
(Microsoft „Katja/Conrad Natural“, Google Deutsch) vor lokalen Systemstimmen.
Welche Stimmen verfügbar sind, bestimmt das Betriebssystem bzw. der Browser:

- **Windows + Edge/Chrome:** deutsche Stimmen sind vorinstalliert; für die
  natürlichen Varianten in Windows unter *Einstellungen → Zeit und Sprache →
  Sprache → Sprachausgabe* die deutschen Pakete hinzufügen.
- **macOS:** Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte →
  Stimmen verwalten („Anna – Premium“).
- **Chrome:** zusätzlich die Google-Stimmen (Internetverbindung nötig).

Die Sprachausgabe des Browsers ist datenschutzfreundlich (kein API-Schlüssel,
kein Upload der Texte bei lokalen Stimmen) und funktioniert ohne Zusatzpakete.

## Qualitätssicherung

```bash
npm run audit
```

Das Audit prüft alle Quiz-Dateien und schreibt `tools/audit-report.md`:

- UTF-8-Kodierung (Umlaute), Titel
- Aufgabentyp und Anzahl der Aufgaben
- vollständiger Lösungsschlüssel je Aufgabe
- doppelte IDs
- Einbindung von Bewertung und Vorlesen
- Abgleich mit dem Register (tote Links / fehlende Einträge)

Nach Änderungen an Quiz-Dateien:

```bash
npm run audit:publish   # Skripte einbinden, Register neu bauen, Audit
```

## Projektstruktur

```
prufungB1-B2-main/
├── server.js              lokaler HTTP-Server (Port 3000, ohne Abhängigkeiten)
├── QUIZES/                168 Quiz-Seiten (B1/B2)
├── quiz-registry.json      Register: ID, Level, Kategorie, Titel, Datei
├── quiz-engine.js          einheitliche Bewertung + Ergebnis + Speicherung
├── lesen.js                Vorlesen mit natürlicher Stimme
├── quiz-tracker.js         protokolliert Versuche (Fallback ohne Engine)
├── telc.js                 Navigation, Timer, Antwort-Anzeige
├── app.js                  Dashboard, Statistik, Empfehlungen
├── tools/                  Audit, Register-Aufbau, Seiten-Patch
└── index1.html/index2.html Übersichten B1 / B2
```

## Grenzen (bewusst offen)

- Die Lesetexte stammen aus gescannten Prüfungssätzen und enthalten teilweise
  OCR-Reste (fehlende Anführungszeichen, einzelne falsche Wörter). Sie sind
  nicht fachredaktionell überarbeitet.
- Es gibt keine echten Audiodateien für den Prüfungsteil Hören. Die
  Vorlesefunktion liest die Texte und Aufgaben vor und ersetzt die Tonspur
  beim Üben.
- Fortschritt, Fehlerheft und Einstellungen liegen im `localStorage` des
  Browsers; es gibt keine Benutzerkonten und keine Serverdatenbank.
