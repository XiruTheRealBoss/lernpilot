# LernPilot

Stand: 27. November 2026. Phase 2 ist lokal technisch abgeschlossen; keine Produktionsfreigabe. React/Vite/TypeScript bleiben erhalten. Das neueste Home-Dashboard aus GitHub-main 39e690f und der getrennte Account-Bereich sind integriert und geprüft.

## Öffnen

Die ausführliche [Schritt-für-Schritt-Anleitung](docs/START_HERE.md) erklärt Docker/Supabase, API, Frontend, Demo und Beenden. Eine für echte Schuldaten freigegebene App existiert noch nicht.

Nur Home-Offline-Demo: PowerShell öffnen:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-integration"
npm run dev
```

http://127.0.0.1:5174/?demo öffnen. Beenden: Strg+C. Für Benutzerkonten die zwei Server und den lokalen Stack gemäß Startanleitung starten; Einstieg http://127.0.0.1:5174/account. Vorhandene Installationen/Images nicht wiederholen. Keine echten Daten verwenden.

## Tatsächliche Prüfungen

110 Frontend-/Fachtests (99 bisherige + elf neue Home-Fälle), 26 HTTP-Regressionen, zehn Demo-/Home-Browserprüfungen, zwei echte Desktop-/Mobil-Accountabläufe und 14 Infrastrukturtests bestanden. Echter Datenbank-/API-Lauf: 24 Untertests plus zwei Elterntests, insgesamt 26/26. Reale Authentifizierung, Registrierung, Refresh, Logout, Tokenablauf, RLS auf acht Tabellen, Constraints und getrennte Benutzerzugriffe bestätigt. Lint, Typprüfung, beide Builds, SQL-Lint und Datenbank-Sicherheitsprüfung erfolgreich. npm audit: keine bekannten Befunde.

[Finaler Integrationsbericht](docs/FINAL_INTEGRATION_REPORT.md), [Phase-2-Bericht](docs/PHASE2_REPORT.md), [Prüfprotokoll](docs/VALIDATION.md), [Sicherheit](docs/SECURITY.md), [Architektur](docs/ARCHITECTURE.md), [Schema](docs/DATABASE_SCHEMA.md), [Infrastruktur](docs/LOCAL_INFRASTRUCTURE_SETUP.md).

## Git und Team

Lokaler Branch feat/integration-core-infrastructure. Kein Commit, Push oder Merge ausgeführt. Vor Commit und Push jeweils ausdrückliche Zustimmung. Originalcheckout lernpilot-app bleibt unverändert erhalten. GitHub-main 39e690f wurde erneut geprüft: keine neueren Commits. Das Home-Design ist mit Kalender, Filtern, Notizen und vorhandener Fachlogik tatsächlich integriert; siehe [Remote-Abgleich](docs/PHASE2_REMOTE_REVIEW.md) und [Commit-Vorbereitung](docs/PHASE2_COMMIT_PLAN.md).

Projektinitiator: Noten/Lyceum/PDF/Prüfungsgenerator. Icaro: School Hub/Google/Apple/Tutor. Kitaday: UI/Design. Analytics: Projektinitiator und Icaro. Gemeinsame Auth-, API- und RLS-Verträge gemeinsam abstimmen. Menschliches Review dieser kombinierten Änderung steht aus.

Liveintegrationen, KI, PDF und produktiver Betrieb sind nicht Bestandteil dieser Phase. Gmail bleibt ausgeschlossen. Schulgebundene Notenformeln sind unbestätigte Demo-Regeln.

Für neue Arbeitskopien: [Team-Einrichtung](docs/TEAM_DEVELOPMENT.md). Erst nach genehmigtem Commit/Push abrufbar.
