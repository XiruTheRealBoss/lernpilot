# LernPilot

LernPilot soll Schülerinnen und Schüler dabei unterstützen, Noten zu verstehen, Schulaufgaben zu organisieren und für Prüfungen zu lernen. Geplant ist eine responsive Web-App, zunächst für die eigene Schule und später für verschiedene Schulen. Das Projekt ist ein Startup-Vorhaben eines Anfänger-Teams; die Dokumente sind eine Arbeitsgrundlage und keine Aussage, dass alle Funktionen bereits fertig sind.

## Bestehender Stand und Zielbild

Das [bestehende Repository](https://github.com/XiruTheRealBoss/lernpilot) enthält laut seiner am 25. November 2026 gelesenen README eine Anwendung mit React, Vite und TypeScript, eine Classroom-Anbindung und einen Lyceum-Prototyp. Diese Angaben sind eine Bestandsaufnahme aus der Dokumentation, keine unabhängige Funktions- oder Sicherheitsprüfung. Die bestehende README beschreibt unter anderem lokale Speicherung, ein Demo und keinen KI- oder Analytics-Betrieb. Sie muss bei Übernahme dieser Datei erhalten oder ihre weiterhin gültigen Betriebsdetails müssen vorher integriert werden.

Ein modularer Monolith mit **Next.js, TypeScript und Supabase** ist als mögliches gemeinsames Ziel vorgeschlagen. Das Team muss Architektur, Migration, Kosten und Erhalt bestehender Funktionen ausdrücklich prüfen und bestätigen. Es gibt noch keinen Auftrag zur Umstellung. Beschriebene Zukunftsfunktionen sind geplant, nicht automatisch verfügbar.

## Bereiche und Team

| Bereich | Verantwortung | Geplanter Nutzen |
| --- | --- | --- |
| Noten-Center und Lyceum | Projektinitiator | Noten manuell erfassen, gewichtete Durchschnitte und Simulation; später freigegebener Import und klar inoffizielle PDF-Übersicht |
| Prüfungsgenerator | Projektinitiator | Übungsprüfungen aus erlaubten Materialien und nachvollziehbaren Prüfungsprofilen |
| School Hub | Icaro | Aufgaben und Termine bündeln; Classroom, Google Tasks und Google Calendar sowie Apple Erinnerungen und iCloud Kalender prüfen |
| KI-Tutor | Icaro | Lernhilfe mit freiwilligem Lernkontext; spätere Personalisierung |
| Learning Analytics | Projektinitiator und Icaro | Nachvollziehbare Lernfortschritte und Empfehlungen |
| Frontend und Design | Kitaday | Designsystem, Navigation, responsive und zugängliche Oberflächen |

Gmail gehört nicht zum geplanten Umfang. Lyceum- und Apple-Verbindungen sind technisch und rechtlich offen; auch Google-Anbindungen hängen von Freigaben und Berechtigungen ab. Bis dahin sind manuelle Eingabe und fiktive Beispieldaten der sichere Ausgangspunkt. Prüfungsfragen sind Übungen, keine Vorhersagen. PDF-Exporte sind keine offiziellen Zeugnisse.

## Dokumentation

- [AGENTS.md](AGENTS.md): Regeln für KI- und Entwicklungsarbeit.
- [Constitution](docs/CONSTITUTION.md): Produktprinzipien, Sicherheit und Entscheidungen.
- [Architektur](docs/ARCHITECTURE.md): Ist-Stand, Zielvorschlag und offene Integrationen.
- [Roadmap](docs/ROADMAP.md): priorisierte Phasen und überprüfbare Übergänge.

## Einstieg in das bestehende Projekt unter Windows

Voraussetzungen: Git, Visual Studio Code und eine zum aktuellen Projekt passende Node.js-LTS-Version. Prüft im Repository, ob eine bestimmte Version vorgegeben ist. Die folgenden Befehle gelten für das bestehende Vite-Projekt, nicht für ein zukünftiges Next.js-Projekt:

```powershell
git clone https://github.com/XiruTheRealBoss/lernpilot.git
cd lernpilot
npm install
npm run dev
```

Die im Terminal angezeigte lokale Adresse öffnen. Für reine UI-Arbeit die im bestehenden README beschriebene Demo `/?demo` mit fiktiven Daten prüfen. Für echte Google-Verbindungen sind zusätzliche Einrichtung und Freigaben nötig; nicht ungeprüft mit echten Schülerdaten experimentieren. Verfügbare Prüfungen laut `package.json`:

```powershell
npm run lint
npm run build
```

Ein Build oder Demo beweist weder die Sicherheit noch die Erlaubnis externer Integrationen. Das Team überprüft vor dem Einfügen dieser Dokumente bestehende Dateien und übernimmt gültige Informationen; nicht blind überschreiben. Nie `.env`-Dateien, Zugangsdaten oder personenbezogene Testdaten committen.

## Zusammenarbeit

Arbeit mit einem Issue und Akzeptanzkriterien beginnen, auf einem eigenen Branch umsetzen und als Pull Request zur Prüfung stellen. Vor Arbeiten an gemeinsamen Schnittstellen, Authentifizierung, Datenbank und Designsystem abstimmen. Details stehen in [AGENTS.md](AGENTS.md) und der [Roadmap](docs/ROADMAP.md).
