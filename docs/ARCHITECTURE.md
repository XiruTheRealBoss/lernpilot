# LernPilot Architektur

Stand: 27. November 2026. React/Vite bleibt; keine Next.js-Migration.

## Entscheidung und Nachweis

Der Projektinitiator bestätigt menschliches Phase-1-Review, Supabase/PostgreSQL und Agenda-Zusammenführung. Dies sind seine Angaben; Namen oder zusätzliche Reviewnachweise werden nicht erfunden. Die neue kombinierte Änderung benötigt ihr eigenes Teamreview.

Die separate Arbeitskopie lernpilot-integration, Branch feat/integration-core-infrastructure, bewahrt die ursprüngliche Phase 1 in lernpilot-app. Basis bleibt lokal 9fe50000bda4282a26adc0ce70580357930dbbb2; Agenda-Darstellung wurde fachlich aus 535b8ead0ff0f03e2a101ba699aaaaaac5ce7198 integriert. Kein Git-Historienmerge, Commit oder Push.

React 18, Vite, TypeScript, Tailwind, Motion und Zustand bleiben. Neu: kleiner nativer Node-HTTP-Server, Supabase SDK und gemeinsame Zod-Verträge. Native HTTP vermeidet für diesen Referenzablauf ein weiteres Framework. Gemeinsames Repository mit Modulgrenzen, keine Microservices. Lokaler Supabase-/Auth-/RLS-Betrieb ist durch echte Datenbank-, API- und Browserprüfungen bestätigt. Dies ist keine Produktionsfreigabe. Aktuelle Ergebnisse: PHASE2_REPORT.md und VALIDATION.md.

## Getrennte Einstiege und Datenfluss

- /?demo → App → Home/Kalender/Prüfungen/Lehrkräfte/Notendemo → isolierter lokaler Speicher demo-a oder demo-b.
- /account → separat geladenes Account-Frontend → same-origin /api/v1 → Node-Server → Supabase Auth/Data API mit Nutzer-JWT → PostgreSQL/RLS.

Der Demo-Einstieg lädt kein Account-Modul und ruft keine neue API auf. Demo-Profile sind keine Benutzerkonten. Die Account-Ansicht importiert keine Demo-Stores. Supabase-SDK gehört ausschließlich auf den Server. Der Browser erhält eine undurchsichtige HttpOnly-Sitzungskennung; Provider-Tokens bleiben im Server-Arbeitsspeicher.

Der API-Proxy ist standardmäßig aus; nur LERNPILOT_LOCAL_API=1 aktiviert /api/v1 zum festen Loopback-Ziel. Alte Lyceum-APIs bleiben 410. Google/Lyceum/Apple bleiben gesperrt. Kein Cloud- oder Produktionsbetrieb.

## Modulgrenzen

| Bereich | Aufgabe |
| --- | --- |
| src/components/Home | Neue Home-Darstellung auf vorhandenen Aufgaben-/Datumsregeln |
| src/components/Agenda | Wiederverwendete TaskRow, Kalender und Fristuhr; bestehende Regressionen |
| src/modules/school-hub | Fachregeln für Icaros Aufgaben und Kalender |
| src/modules/grades | Notenengine und fiktive Demo des Projektinitiators |
| src/modules/account | Separater lokaler Anmelde-/Aufgaben-Referenzablauf |
| src/shared/contracts | Zod-Eingaben, DTOs, Antwortverträge |
| server | HTTP, Identität, Sitzungen und Datenzugriff mit Nutzer-JWT |
| supabase | Versionierte Migration, Constraints, RLS, Konfiguration |
| tests/database | Echte lokale A/B/anon-Tests, getrennt von Mocktests |
| scripts/seed-local.ts | Explizite synthetische Konten/Beispieldaten |

Alte Dashboard-Komponenten bleiben für bestehende Regressionen erhalten. Hauptansicht ist Home; Ankündigungen verwenden die bisherige sichere Komponente. Prüfungen, Lehrkraftprofile und Notendemo bleiben vorhanden.

## Datenmodell

Acht private Tabellen: profiles, subjects, school_periods, grade_entries, tasks, calendar_events, exams, user_settings. Keine Schul-/Mandantenverwaltung ohne aktuellen Bedarf. Eigentümerpaar-Fremdschlüssel verhindern Verweise auf fremde Fächer/Zeiträume. Profile benötigen keine Klasse oder Schuladresse.

Reine Schul-/Noten-/Prüfungstage verwenden date, Aufgabenfristen/Kalenderzeitpunkte timestamptz, Zeitzonen sind explizit. Notenherkunft unterscheidet manuell/importiert/berechnet/simuliert. Das Schema bestätigt keine Schulformel. [Details](DATABASE_SCHEMA.md).

## Sitzungen und Referenz-API

Supabase übernimmt Registrierung/Passwortprüfung. Nur fiktive .test-Adressen. Keine eigene Passwortkryptografie. Serverseitige Sitzungen: Rotation bei Login, 8 Stunden absolut, 30 Minuten inaktiv, serialisierte Token-Erneuerung, begrenzter In-Memory-Store. Serverneustart meldet lokale Sitzungen ab; Mehrinstanzbetrieb ist noch ungeeignet.

Mutationen verlangen erlaubte Origin und CSRF. Task-Lesen mit übermitteltem CSRF-Token bindet die Ansicht an die aktuelle Sitzung. Kontowechsel in anderen Tabs verwirft alte UI-Daten. Gewöhnliche Datenzugriffe erhalten Nutzer-JWT und öffentlichen Schlüssel bis zur Datenbank. Zusätzliche RLS-Sitzungsprüfung weist widerrufene JWTs zurück; durch echte Logout- und direkte Data-API-Tests bestätigt.

Referenz: eigene Aufgabe erstellen, lesen, erledigen, löschen. Weitere Fach-APIs folgen in Phase 3. Größen-/Mengenlimits, Timeouts, lokaler Rate-Limiter, datensparsame Logs sind implementiert; kein verteilter Produktionsbetrieb.

## Team und Abschlussgrenze

Projektinitiator: Noten/Lyceum/PDF/Prüfungsgenerator. Icaro: School Hub/Google/Apple/Tutor. Beide: Analytics. Kitaday: Designsystem/UI. Gemeinsame Verträge, DB, Identität und Sicherheit: alle. Gmail ausgeschlossen.

Phase 2 ist erst nach echtem Containerbetrieb, Migration, Auth, A/B-/anon-RLS und API-Datenfluss abgeschlossen. Vor Echtdaten fehlen zusätzlich Datenschutzfreigaben, Aufbewahrung/Löschung, Backup/Restore, produktive Sitzungen, HTTPS, Betrieb und Vorfallprozess. [Prüfstatus](VALIDATION.md), [Startanleitung](START_HERE.md).


## Späterer Remote-Stand

GitHub-main 39e690f ist jetzt inhaltlich integriert und nach vollständiger Wiederholung einschließlich echter DB-/Auth-/RLS-/Browserprüfungen lokal abgenommen. Home verwendet vorhandene Regeln, Kalender und TaskRow. Siehe [Remote-Abgleich](PHASE2_REMOTE_REVIEW.md) und [Teamgrundlage](TEAM_DEVELOPMENT.md). Kein Commit oder Push ohne eigene Zustimmung; kein automatischer Merge.
