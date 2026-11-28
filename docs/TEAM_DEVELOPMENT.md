# Gemeinsame Entwicklungsgrundlage

Stand: 27. November 2026. Lokaler Integrationsstand; erst nach ausdrücklich genehmigtem Commit und Push für andere Rechner abrufbar. Keine Produktionsfreigabe. Ausschließlich fiktive Daten.

## Modulverantwortung

| Person | Unabhängig bearbeitbarer Bereich | Gemeinsame Abstimmung nötig |
| --- | --- | --- |
| Projektinitiator | src/modules/grades, exam-generator; später erlaubter Lyceum-Adapter und PDF | Schulregeln, Fach-/Zeitraumverträge, Schema/RLS |
| Icaro | src/modules/school-hub, ai-tutor; später erlaubte externe Adapter | Aufgaben-/Kalenderverträge, Identität, Datenweitergabe |
| Kitaday | src/components/Home, gemeinsame UI, Styling/Designsystem | App-Einstiege, gemeinsam verwendete Komponenten, Barrierefreiheit |
| Projektinitiator + Icaro | src/modules/analytics | Ereignismodell, Einwilligung, Datensparsamkeit |
| Alle | src/shared/contracts, server, supabase, scripts und AGENTS.md | Gegenseitiges Review erforderlich |

Fachregeln nicht in Home oder API-Handler duplizieren. Browser und Server verwenden dieselben Zod-Verträge aus src/shared/contracts. Demo-Stores niemals als Authentifizierung nutzen; reguläre DB-Aufrufe behalten den Nutzer-JWT und RLS. Keine zweite Anmeldung pro Modul. src/App.tsx, src/types/index.ts und hooks/useStudy.ts sind weitere gemeinsame Konfliktschwerpunkte.

Modulgrenzen sind derzeit Konvention, nicht durch vollständige Importregeln erzwungen. Die bestehende Struktur ermöglicht getrennte Arbeit mit koordinierten gemeinsamen Schnittstellen; sie garantiert keine konfliktfreien parallelen Änderungen. Keine große Umstrukturierung nötig. Einige Modulordner sind ausdrücklich nur vorbereitete Grenzen, keine fertigen PDF-/KI-/Integrationsfunktionen. Gmail bleibt ausgeschlossen.

## Frische Windows-Arbeitskopie: einmalige Einrichtung

Diese Schritte sind eine Anleitung für Icaro/Kitaday, keine bereits ausgeführte Installation auf ihren Rechnern. Vor jeder Installation, Image-Download, Systemänderung oder Neustart erst ausdrücklich zustimmen. Auf dem bereits eingerichteten PC nichts erneut installieren.

1. Node 24/npm 11, Git, WSL 2 und Docker Desktop mit Linux-Containern sowie den vorhandenen Windows-.NET-C#-Compiler prüfen. Fehlende Voraussetzungen anhand [LOCAL_INFRASTRUCTURE_SETUP](LOCAL_INFRASTRUCTURE_SETUP.md) getrennt genehmigen und einrichten. macOS/Linux sind mit dem Windowsstarter nicht abgenommen.
2. Erst nach dem genehmigten Push eine normale PowerShell öffnen. Einen eigenen Entwicklungsordner wählen, beispielsweise:

```powershell
cd "$env:USERPROFILE\Documents"
git clone --branch feat/integration-core-infrastructure https://github.com/XiruTheRealBoss/lernpilot.git lernpilot-integration
cd lernpilot-integration
node --version
npm --version
```

3. Nur nach eigener Installationsfreigabe npm ci ausführen. Dadurch werden die festgelegten Projektpakete installiert. Keine Abhängigkeiten spontan aktualisieren.
4. Docker Desktop öffnen und Engine-Bereitschaft abwarten. Installationspfad auswählen:

```powershell
$env:LERNPILOT_DOCKER_EXECUTABLE = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
# Bei systemweiter Installation stattdessen:
# $env:LERNPILOT_DOCKER_EXECUTABLE = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
```

5. Für eine wirklich neue Docker-Umgebung einmalig das projektspezifische Netzwerk erstellen, falls es noch nicht existiert:

```powershell
& $env:LERNPILOT_DOCKER_EXECUTABLE network inspect lernpilot-local
# Nur wenn es ausdrücklich als nicht vorhanden gemeldet wird:
& $env:LERNPILOT_DOCKER_EXECUTABLE network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 lernpilot-local
```

6. Vor dem ersten Image-Download Zustimmung erteilen. Dann npm run supabase:start ausführen. Der sichere Projektstarter erzwingt und prüft Loopback-Portbindungen. Nicht durch direkten CLI-Start umgehen. Keine fremden Docker-Netzwerke oder Container verändern.
7. Migrationsstand prüfen und ausschließlich ausstehende lokale Migrationen anwenden:

```powershell
node scripts/local-supabase.ts migration list
node scripts/local-supabase.ts migration up
```

8. Lokale API-Konfiguration erzeugen:

```powershell
node scripts/configure-local-api.ts
```

Der Helfer liest den lokalen Status ausschließlich in den Prozessspeicher und schreibt nur URL, öffentlichen Anon-Schlüssel und Frontend-Origin nach .env.local. Privilegierte Schlüssel werden verworfen und nichts ausgegeben. Vorhandene .env.local wird nicht überschrieben. Keine Schlüssel zwischen Teammitgliedern teilen und keine VITE_-Schlüsselvariablen verwenden. .env.local ist nicht in Git.

9. API und Frontend in zwei Terminals starten wie in [START_HERE](START_HERE.md). Auf dem eigenen Rechner jeweils im eigenen Clone-Ordner arbeiten. Account: http://127.0.0.1:5174/account; Demo: http://127.0.0.1:5174/?demo.
10. Nur fiktive .test-Konten erstellen. Tests: npm run check, npm run test:server, npm run test:infrastructure, npm run test:e2e; mit lokalem Stack npm run test:database und mit beiden App-Servern npm run test:browser:local.
11. Stoppen: Strg+C in den beiden App-Terminals; danach npm run supabase:stop. Kein db reset für normalen Start/Stop.

Die Ersteinrichtung auf fremden Rechnern ist noch nicht praktisch abgenommen. Quellcodearchiv-Restore und dieser bestehende Windows-PC ersetzen diesen Nachweis nicht.

## Parallel arbeiten

Nach genehmigter Integration in main: neuestes main lesen, eigenen kurzen Modulbranch anlegen, fokussierte Änderungen mit Akzeptanzkriterien, eigene Tests und PR. Solange dieser Fundament-PR offen ist, kann ein Arbeitsbranch bewusst auf dem veröffentlichten Fundamentbranch basieren; Abhängigkeit im PR nennen und spätere Basis gemeinsam abstimmen. Nicht gleichzeitig dieselben Hotspot-Dateien bearbeiten.

Neue Migrationen ausschließlich über node scripts/local-supabase.ts migration new NAME erzeugen. Keine bereits angewendete Migration umschreiben. Tabellenerweiterungen, DTO-Änderungen und RLS gemeinsam prüfen. Vor Merge mindestens ein anderes Teammitglied reviewen lassen; keine automatische Zusammenführung. Zugangsdaten, DB-Inhalte, node_modules, Builds und lokale Archive niemals committen.
