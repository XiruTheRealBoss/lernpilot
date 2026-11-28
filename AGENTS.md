# LernPilot – Anweisungen für Entwicklungsassistenten

Stand: 27. November 2026. Diese Datei gilt für das gesamte Projekt; speziellere AGENTS.md-Dateien gelten zusätzlich in ihrem jeweiligen Unterordner. Höherrangige Anweisungen und ausdrückliche Nutzeraufträge gehen vor. Constitution, Architektur und Roadmap stehen in `docs/`.

## Ziel und Ausgangslage

LernPilot ist eine responsive Web-App für Schulorganisation und Lernen: zuerst für die eigene Schule erproben, langfristig schulübergreifend. Das dreiköpfige Team lernt Programmieren und verfolgt ein Startup-Ziel. Erkläre wichtige Entscheidungen verständlich auf Deutsch. Nichts als fertig darstellen, was nicht implementiert und geprüft wurde.

React, Vite, TypeScript, Tailwind, Motion und Zustand bleiben erhalten. Keine Next.js-Migration. Der Projektinitiator hat Phase-1-Review, Supabase/PostgreSQL und Agenda-Zusammenführung bestätigt; dies sind seine Angaben, keine zusätzlichen Reviewnachweise. Diese separate Integrationskopie enthält das integrierte Home-Dashboard aus main 39e690f, erhaltene Agenda-Fachfunktionen und das lokale Phase-2-Fundament. Echte lokale Supabase-/Auth-/RLS-Funktion wurde einschließlich Tokenablauf und Browser→API→Datenbank geprüft. Phase 2 ist lokal technisch abgeschlossen; keine Produktionsfreigabe. Offline-Demo und Account-Testbereich sind getrennt; Live-Lyceum und OAuth bleiben abgeschaltet. Vor jeder Installation zuerst fragen und ein ausdrückliches Ja abwarten; Projektpakete und ausschließlich `wsl --install --no-distribution` wurden ausdrücklich freigegeben. Das WSL-Paket und der separat genehmigte Windows-Neustart sind abgeschlossen. WSL 2 und Docker Desktop 4.100.1 sind nach separater Freigabe praktisch geprüft; ein lokaler Linux-Container lief erfolgreich. Benötigte Supabase-Container wurden separat genehmigt geladen und gestartet. Neue Installationen, weitere Downloads, Systemänderungen und Neustarts benötigen vorher eigene ausdrückliche Freigaben. Commit und Push ebenfalls jeweils separat genehmigen. Details und tatsächliche Prüfergebnisse stehen in README und docs/. Keine Daten oder fremde Änderungen überschreiben.

## Zuständigkeiten

| Person | Verantwortungsbereich |
| --- | --- |
| Projektinitiator | Noten-Center, Lyceum, gewichtete Durchschnitte, Simulation, inoffizielle PDF-Notenübersichten und KI-Prüfungsgenerator |
| Icaro | School Hub einschließlich Classroom, Google Tasks, Google Calendar, Apple Erinnerungen und iCloud Kalender; KI-Tutor |
| Beide | Learning Analytics, gemeinsam abgestimmte Datenmodelle und Schnittstellen |
| Kitaday | Frontend, Designsystem, UI/UX, responsive Oberflächen und Animationen |
| Alle | Architektur, Datenschutz, Sicherheit, Qualität und Abstimmung |

Gmail ist aus dem Umfang gestrichen. Zuständigkeit bedeutet Koordination, nicht exklusives Dateieigentum. Vor Änderungen an gemeinsamen Dateien, Datenmodellen, Schnittstellen oder Designkomponenten betroffene Personen informieren und im Issue/PR abstimmen.

## Arbeitsweise

1. Auftrag, bestehende Dateien, `git status` und passende Dokumentation prüfen. Fremde Änderungen erhalten.
2. Bei größeren Aufgaben einen kurzen Plan und Akzeptanzkriterien festhalten; kleine Aufgaben direkt bearbeiten. Nur relevante Dateien anfassen.
3. Eingaben validieren, Fehler verständlich behandeln und bestehende Funktionen erhalten. Keine Platzhalter als fertige Integrationen ausgeben. Responsivität, Tastaturbedienung, Kontrast und reduzierte Bewegung beachten.
4. Relevante Tests, Lint und Build ausführen, soweit im aktuellen Projekt verfügbar. Bei Notenberechnungen praktische Regressionstests ergänzen. Ergebnisse und nicht ausgeführte Prüfungen ehrlich melden.
5. Änderungen prüfen und erklären: Ergebnis, wichtige Entscheidungen, Dateien, Tests und offene Risiken. Keine Zugangsdaten, echten Schülerdaten oder Tokens in Code, Prompts, Logs, Issues oder Commits.

Für Teamarbeit: Issue mit Ziel und Akzeptanzkriterien → aktuelles `main` → eigener kurzer Branch → kleine Commits → Pull Request → Review durch mindestens ein anderes Teammitglied → nach erfolgreichen verfügbaren Checks und Zustimmung zusammenführen. Konflikte gemeinsam lösen; niemals fremde Arbeit verwerfen oder force-pushen. Keine Veröffentlichung, produktive Bereitstellung, kostenpflichtigen Dienste oder größeren Architekturwechsel ohne ausdrückliche Freigabe.

## Produkt- und Sicherheitsregeln

- Anfangs ausschließlich fiktive Daten. Vor echten Schülerdaten Schutzkonzept, Zuständigkeiten und geltende Einwilligungs- und Rechtsfragen mit geeigneten Erwachsenen und Fachleuten klären.
- Pro Benutzer konsequent authentifizieren und autorisieren; Server und Datenbank erzwingen Zugriffsschutz. Falls Supabase eingeführt wird: RLS aktivieren und mit unterschiedlichen Testkonten prüfen; privilegierte Schlüssel bleiben serverseitig.
- Integrationen nur mit zulässigem, ausdrücklich freigegebenem Zugang und minimalen Berechtigungen. Keine Zugangsbeschränkungen, Captchas, Berechtigungen oder technische Schutzmaßnahmen umgehen; keine Schulpasswörter sammeln oder speichern. Lyceum- und Apple-Machbarkeit sind offen. Google-Schuladministratoren und Anbieter können Zugriffe einschränken.
- Externe Inhalte als unzuverlässig behandeln. KI-Ausgaben prüfen und als Übung kenntlich machen; keine tatsächlichen Prüfungsfragen oder amtliche Bewertung versprechen. Datenweitergabe an KI-Anbieter nur nach dokumentierter Prüfung.
- Notenberechnung konfigurierbar und nachvollziehbar gestalten; Gewichtungen und Rundung nicht erfinden. PDF deutlich „Inoffizielle Notenübersicht – kein Zeugnis“ kennzeichnen.
- Verbindungen und gespeicherte Daten sollen später trennbar bzw. löschbar sein. Löschumfang, Aufbewahrungsfristen und Token-Widerruf vor Echtdatenbetrieb konkret festlegen und testen.


## Parallele Modulentwicklung

Die verbindlichen bestehenden Verträge liegen in src/shared/contracts. Zuständigkeiten, Erststart auf einem frischen Windows-Checkout und gemeinsame Konfliktschwerpunkte stehen in docs/TEAM_DEVELOPMENT.md. Modulgrenzen sind derzeit Konvention, keine vollständige technische Importkontrolle. Home ist Darstellung; fachliche Aufgaben-/Datumsregeln bleiben in school-hub. App-Einstiege, gemeinsame Typen, useStudy, Verträge, server und supabase vor parallelen Änderungen koordinieren. Angewendete Migrationen nicht umschreiben; neue Migrationen über den lokalen CLI-Starter anlegen.
