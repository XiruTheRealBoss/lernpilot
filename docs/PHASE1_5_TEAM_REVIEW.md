# Teamreview-Vorlage für Icaro und Kitaday – Phase 1.5

Stand: 26. November 2026. **Vorbereitet, nicht durchgeführt.**
Diese Datei wurde nicht an Personen gesendet. Reviewer, Datum, Ergebnis und Freigaben sind offen.

## Gemeinsamer Stand in einer Minute

Lokal ist Phase 1 auf feat/security-quality-foundation weiterhin uncommittet (Basis 9fe5000). GitHub main hat zusätzlich den Agenda-Umbau 535b8ea. Beide Arbeiten sind wertvoll und müssen erhalten werden. Es fand kein Merge/Rebase/Commit/Push statt. Die lokale Grundlage wurde vor diesem Dokument gesichert und wiederhergestellt geprüft.

- Quellsicherung: 91 Dateien, einschließlich aller 83 geänderten/ungetrackten Dateien; keine verlorenen Änderungen.
- Alle 91 wiederhergestellten Dateien stimmen in Größe und SHA-256 überein.
- Originale Arbeitsdateien, Branch, HEAD und Git-Status waren beim Sicherungsschritt unverändert.
- Lokale Verbindungsmetadaten, Geheimnisse, Dependencies und generierte Dateien sind nicht im Archiv.

## Was Phase 1 tatsächlich verbessert hat

- Live-Lyceum, Schulpasswortverarbeitung und OAuth abgeschaltet; alte API-Routen geben 410.
- Demo A/B mit getrennten lokalen Daten. Sie sind keine authentifizierten Benutzerkonten.
- Tokenreste gezielt entfernt; keine pauschale Browserdatenspeicher-Löschung.
- Sichere React-Notendemo statt HTML-/Inline-Handlern; strikte Zahlen-/Formelvalidierung und korrektes Ziel 0.
- UTC-Fristen, gültige Kalenderdaten, Heute/Überfällig, Abgaben ohne Termin und vollständige Aufgabenliste korrigiert.
- Zeitwerte vor dem Filtern neu abgeleitet; Frist-/Mitternachtswechsel ohne Anbieterzugriff.
- ESLint, Typecheck, Vitest, Browserregressionen, reproduzierbare Builds und klare Dokumentation.

## Prüfnachweise und Grenzen

Am 26.11.2026 im unmittelbar vorausgehenden Phase-2-Preflight tatsächlich ausgeführt: 82 Vitest-Tests in 8 Dateien, 4 Browserprüfungen, Lint, Typecheck und beide Builds bestanden. Logs: artifacts/phase2-preflight/check.log und e2e.log. Seitdem blieb der Anwendungsquellcode nachweislich unverändert.

In Phase 1.5 neu geprüft: Archivvollständigkeit, Restore und Hashes. Keine erneuten App-Testläufe, keine Tests der noch nicht integrierten Agenda oder der noch nicht vorhandenen Datenbank. Keine Aussage über echte Schulfreigaben, RLS oder Produktion ableiten.

## Auswirkungen auf eure Module

| Person | Was erhalten bleibt | Was beim Abgleich zu prüfen ist |
| --- | --- | --- |
| Icaro | School-Hub-Fachlogik, Kurs-/Aufgabenkennungen, lokale Erledigungen/Notizen, externe Zugriffssperren | Neue Agenda muss dieselben reinen Zeit-/Gruppenfunktionen nutzen; keine zweite abweichende Fristlogik, keine verlorenen Statusfilter oder Notizen |
| Kitaday | Neue Agenda als UI-Zielvorschlag, einklappbare Abschnitte, kompakte Zeilen und redaktionelle Gestaltung | Sicherheitsfunktionen/Offline-Banner erhalten; Schriften lokal oder Systemfonts; zugängliche Bedienelemente; keine scheinbar funktionierenden Portalaktionen |
| Projektinitiator | Extrahierte Notenengine, Herkunftskennzeichnung und fiktive Notenansicht | GradeDemo im Noten-Tab behalten; kein Rückfall auf die alte Passwort-/iframe-Seite |
| Alle | Gemeinsamer React/Vite/TypeScript-Stack, Modulgrenzen, Tests | Entscheidungen zu Architektur, Auth, Datenverträgen, Datenschutz und Infrastruktur gemeinsam reviewen |

KI-Tutor, Prüfungsgenerator, Analytics, Google-/Apple-/Lyceum-Livebetrieb bleiben außerhalb dieser Arbeit. Gmail bleibt ausgeschlossen.

## Vorgeschlagene Zusammenführung – noch nicht ausgeführt

1. Geprüfte Sicherung unverändert aufbewahren.
2. Eine isolierte spätere Integrationskopie/Branch nur nach Teamentscheidung vorbereiten.
3. Die Agenda-Darstellung übernehmen, aber lokale App-Verdrahtung und Sicherheitsgrenzen behalten.
4. Vor UI-Ablösung Agenda-Tests für vollständige Aufgaben, exakte Fristen, Statusfilter, Notizen, Profilwechsel und zugängliche Bedienung anlegen.
5. Bestehende reine Zeit-/Gruppenfunktionen verwenden. Tests der alten Dashboard-Hülle portieren; sicherheits- und fachbezogene Tests erhalten.
6. Erst nach erfolgreichem Verhalten und Tests überflüssige alte UI-Komponenten entfernen. Keinen der beiden Stände blind überschreiben.
7. Lint, Typecheck, Unit-/Browsertests, Offline-Nachweis und beide Builds ausführen; danach menschliches Review. Keine automatische Zusammenführung.

Alle 13 Remote-Dateien und elf Überschneidungen: [Konfliktmatrix](PHASE1_5_CONFLICT_MATRIX.md).

## Supabase-Vorschlag – noch keine Architekturfreigabe

React/Vite bleibt. Vorgeschlagen: nur lokale Supabase Auth/PostgreSQL/RLS und eine kleine geschützte Server-API. Browser erhält eine HttpOnly-Sitzungskennung; Provider-Tokens bleiben serverseitig. RLS beschränkt private Datensätze auf ihren Eigentümer, zusammengesetzte Fremdschlüssel verhindern fremde Beziehungen.

Demo und angemeldete Testanwendung bleiben klar getrennt. Keine Cloud, Kosten, echten Schülerdaten oder produktiven OAuth-Verbindungen. Echte Datenbank-Zugriffstests mit fiktiven Konten A/B sind später Pflicht; Mock-Tests allein genügen nicht.

Detaillierter Entwurf: [Phase-2-Plan](PHASE2_PLAN.md). Voraussetzungen und künftige Installationsschritte: [Lokale Infrastruktur](LOCAL_INFRASTRUCTURE_SETUP.md).

## Entscheidungen zum Ausfüllen

| Entscheidung | Status | Wer / Datum / Ergebnis |
| --- | --- | --- |
| Menschliches Phase-1-Review | Offen | Noch auszufüllen |
| Neue Agenda als UI-Ziel unter Erhalt aller Sicherheits-/Funktionskorrekturen | Vorschlag | Noch auszufüllen |
| Fristen-/Gruppenlogik und übernommene Tests | Vorschlag | Noch auszufüllen |
| Lokales Supabase/Auth/PostgreSQL/RLS | Nicht bestätigt | Noch auszufüllen |
| Kleiner Server/BFF und Sitzungsmodell | Nicht bestätigt | Noch auszufüllen |
| Windows-/WSL-/Docker-Einrichtung nach Lizenz-/Voraussetzungsprüfung | Nicht genehmigt | Noch auszufüllen |
| Benannte Verantwortliche für Datenverträge und spätere Integration | Offen | Noch auszufüllen |

Eine Zustimmung zu dieser lokalen Vorbereitung ist keine Freigabe für echte Schülerdaten, kostenpflichtige Dienste, Cloud, Commit, Push, Merge oder Veröffentlichung.
