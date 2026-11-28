# Lokale Infrastruktur unter Windows

Stand: 27. November 2026. WSL 2, Docker Desktop und die reduzierte lokale Supabase-Umgebung sind nach jeweils ausdrücklicher Zustimmung eingerichtet. Keine Neuinstallation erforderlich.

## Tatsächlich überprüft

| Komponente | Ergebnis |
| --- | --- |
| Windows | Windows 11 Home x64, Build 26300 |
| WSL | Paket 3.0.5.0, Standardmodus 2, Linux-Kernel 6.18.58.1; Docker-Container praktisch ausgeführt |
| Windows-Funktionen | VirtualMachinePlatform aktiviert; keine Ubuntu-Distribution erforderlich |
| Neustart | Separat genehmigt und durch neue Startzeit bestätigt |
| Docker | Desktop 4.100.1, Engine 29.9.3, Linux/WSL-2-Backend |
| Installer | Offizieller Docker-Download; SHA-256 gegen offizielle Checksummen und gültige Authenticode-Signatur Docker Inc. geprüft |
| Node/npm | 24.22.3 / 11.19.1 |
| Supabase | CLI 3.4.0, SDK 2.119.2; fünf lokale Container laufen |
| Datenbank | PostgreSQL 17, Migration 20261127125248 angewendet, acht öffentliche Tabellen mit RLS |
| Ressourcen | 15,74 GiB Gesamt-RAM; nach Wiederaufnahme 3,31 GiB frei und 271,67 GiB freier Speicher auf C: |

Gemessene Container-RAM-Werte bei Wiederaufnahme: REST 45,44 MiB, Mailpit 25,12 MiB, Auth 13,88 MiB, Kong 120,2 MiB, PostgreSQL 118 MiB. Das sind Momentaufnahmen und schließen WSL-/Docker-Verwaltungsaufwand nicht ein. Während des ersten Downloads wurden zeitweise rund 2,90 GiB freier System-RAM beobachtet. Keine dauerhaften RAM-Limits oder Windows-Einstellungen wurden zusätzlich geändert.

## Ressourcenschonende Konfiguration

supabase/config.jsonc startet nur PostgreSQL, Auth, REST, Kong und Mailpit. Studio, Storage, Realtime, Edge Functions, Analytics und Pooler sind deaktiviert. Automatisches Seed ist aus. JWT-Laufzeit beträgt 300 Sekunden für echte Ablaufprüfungen; E-Mail-Bestätigung ist ausschließlich für lokale fiktive Konten aus. Keine Produktionskonfiguration.

## Windows-Portproblem und Projektlösung

Mit CLI 3.4.0 auf diesem Docker-/WSL-System wurden Ports trotz der Bridge-Option host_binding_ipv4=127.0.0.1 zunächst öffentlich gebunden. Der Stack wurde sofort ohne Datenreset gestoppt. Eine nur für dieses Projekt geltende Docker-Befehlsweiterleitung setzt veröffentlichte Ports ausdrücklich auf 127.0.0.1. Sie verändert weder Docker-Installation noch globalen PATH, Firewall oder Docker-Daemon.

scripts/local-docker-proxy.cs wird mit dem bereits vorhandenen Windows-.NET-C#-Compiler nach artifacts/local-docker-shim kompiliert. scripts/local-supabase.ts verwendet diese Weiterleitung nur im gestarteten Kindprozess und prüft danach die echten Docker-Bindings. Auch bei gescheitertem Start werden verbliebene Projektcontainer geprüft. Unsichere oder unprüfbare Zustände führen zum Projektstop ohne Datenreset. Falls der Stop scheitert, meldet der Starter den verbleibenden Zustand ausdrücklich als unbestätigt.

Dies ist ein eigener Windows-Workaround, keine offizielle Supabase-Option. Bei CLI-/Docker-Updates erneut prüfen. Ohne vorhandenen Compiler wird abgebrochen, nichts installiert. macOS/Linux wurden mit diesem Starter nicht abgenommen. [Upstream-Problem](https://github.com/supabase/cli/issues/1397), [CLI-Quellcode v3.4.0](https://github.com/supabase/cli/blob/v3.4.0/apps/cli/src/command-internal/db-bootstrap/docker-create-args.ts).

## Start und Stop

1. Docker Desktop im Startmenü öffnen und Engine-Bereitschaft abwarten.
2. Normale PowerShell öffnen:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-integration"
$env:LERNPILOT_DOCKER_EXECUTABLE = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
npm run supabase:start
npm run supabase:status
```

3. Ausschließlich diesen Starter verwenden, nicht direkten CLI-Start. Erwartete Bindings: API 127.0.0.1:54321, PostgreSQL 127.0.0.1:54322, Mailpit 127.0.0.1:54324. Auth/REST haben nur interne Ports.
4. Migration ist bereits angewendet. Kein db reset und keine erneute Initialisierung.
5. Anwendung wie in [START_HERE](START_HERE.md) starten.
6. Stop ohne Datenreset: npm run supabase:stop.

Keine rohen CLI-Statusausgaben weitergeben: Sie können privilegierte lokale Schlüssel enthalten. Der Projektstarter filtert sensible Ausgaben. Reale Tests erhalten Fixture-Schlüssel ausschließlich im Prozessspeicher. .env.local enthält nur lokale URL, öffentlichen Schlüssel und Frontend-Origin; keine Service-Role-Schlüssel.

## Installationshistorie und Genehmigungsgrenzen

1. WSL ausschließlich über wsl --install --no-distribution installiert; anschließend separat genehmigter Windows-Neustart und WSL-Prüfung.
2. Offiziellen Docker-Installer heruntergeladen, Integrität geprüft, benutzerspezifisch mit WSL-2-Backend installiert. Keine automatische Lizenzannahme durch den Agenten.
3. Nach separater Download-/Startfreigabe offizielle Supabase-Images geladen und lokale Migration angewendet. Vorhandene Images jetzt weiterverwenden.

Neue Installationen, fehlende Image-Downloads, weitere Systemeinstellungen und Neustarts benötigen weiterhin vorher ein ausdrückliches Ja. Keine kostenpflichtigen Dienste oder produktiven Cloud-Projekte. Keine BIOS-Änderung und keine Abschaltung von Windows-Sicherheit.

Offizielle Grundlagen: [Microsoft WSL](https://learn.microsoft.com/windows/wsl/install), [Docker Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [Supabase lokale Entwicklung](https://supabase.com/docs/guides/local-development).
