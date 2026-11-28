# PR-Entwurf – noch nicht auf GitHub erstellt

Titel: feat: integrate latest dashboard and complete core infrastructure
Basis: main
Kopf: feat/integration-core-infrastructure

Das neue Home-Dashboard aus 39e690f wird mit dem bestehenden sicheren Phase-2-Fundament verbunden. Wochenwahl, Fortschritt und Prüfungseinstieg stehen neben Kalender, Filtern, Notizen und vollständigen Aufgabengruppen zur Verfügung. Demo und Account bleiben getrennt; Google/Lyceum/Apple werden nicht reaktiviert.

Die gemeinsame Grundlage umfasst Node-API, Supabase Auth/PostgreSQL, acht RLS-Tabellen, Nutzertrennung, sichere Sitzungen und den projektgebundenen Windows-Loopback-Starter. Für neue Windows-Arbeitskopien gibt es Teamanleitung und einen Helfer, der ausschließlich den öffentlichen lokalen Schlüssel konfiguriert und bestehende .env.local nicht überschreibt.

Validierung: tatsächliche Abschlusszahlen und Artefakte in docs/VALIDATION.md und docs/FINAL_INTEGRATION_REPORT.md. Keine geheimen Dateien, Datenbankinhalte, Abhängigkeiten, Builds oder lokalen Archive im Commit. Der ursprüngliche Phase-1-Quellstand bleibt erhalten.

Reviewbedarf: Kitaday prüft Home/Design/Barrierefreiheit; Icaro Aufgaben/Kalender und Hub-Verträge; Projektinitiator Noten/Prüfungsregeln; alle Auth/API/RLS, lokale Einrichtung und gemeinsame Schnittstellen. KI-Review ersetzt kein menschliches Review.

Grenzen: ausschließlich lokale Entwicklung mit fiktiven Daten, Windowsstarter auf diesem PC geprüft, Ersteinrichtung auf einem zweiten Rechner noch unbestätigt. Lokales HTTP und In-Memory-Sitzungen sind keine Produktionsarchitektur. Echtdaten, Schulverbindungen, PDF/KI und produktiver Betrieb sind nicht freigegeben. Gmail ausgeschlossen.

Kein automatischer Merge oder Deployment. Vor Commit und anschließend vor Push jeweils ausdrückliche Nutzerzustimmung erforderlich. Dieser Entwurf ist keine tatsächliche PR-Erstellung oder bereits erfolgte menschliche Abnahme.
