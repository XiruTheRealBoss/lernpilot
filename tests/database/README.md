# Echte lokale Datenbank-, Auth- und API-Tests

Stand: 27. November 2026. Migration angewendet. Echter API-Lauf mit acht Untertests bestanden; korrigierter vollständiger RLS-Lauf bestanden: 16 RLS- und acht API-Untertests plus zwei Elterntests, 26/26 insgesamt, null Fehler/Skips. Keine Mocks ersetzen die Dienste.

## Sicher ausführen

1. Docker Desktop mit WSL-2-/Linux-Backend öffnen.
2. PowerShell normal öffnen:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-integration"
npm run supabase:start
```

Der Projektstarter nutzt die reduzierte Konfiguration und prüft Loopback-Bindungen. Die erforderlichen offiziellen Containerdownloads wurden ausdrücklich freigegeben. Künftig vor zusätzlichen Installationen/Downloads oder Systemänderungen wieder fragen. Kein db reset, keine fremden Volumes oder Cloud-login/link.

3. Echte API-/RLS-Suite starten:

```powershell
npm run test:database
```

4. Zusätzliche reale Account-Browserfälle mit vorhandenem Edge:

```powershell
npm run test:browser:local
```

Launcher prüfen das dedizierte lokale Projekt und URL http://127.0.0.1:54321. Public-/Fixture-Schlüssel gehen nur in den Kindprozess-Arbeitsspeicher; nicht in Konsole, Dateien oder Screenshots kopieren. Fehlender Stack ist ein Fehler, kein erfolgreicher Skip.

Gezielte Fehleranalyse:

```powershell
node scripts/run-local-database-tests.ts api
node scripts/run-local-database-tests.ts rls
```

RLS-Ablaufläufe nicht ungeplant parallel starten. Ein echter Ablaufzeitfall wartet rund fünf Minuten auf ein von Auth ausgestelltes JWT und bis nach dessen PostgREST-Toleranz. Der Gesamtfall ist zeitlich begrenzt. Fehlende Sofortausgabe bedeutet während dieser Wartezeit weder Erfolg noch Hängenbleiben.

## Testumfang

- rls.test.ts: eigene CRUD in sieben Fach-/Einstellungstabellen, eingeschränkte Profile, fremde/anonyme Verweigerung, Owner-Manipulation, fremde FKs bei INSERT/UPDATE, Constraints, NaN/unendliche Zeiten, Referenzlöschung, ungültige JWTs, Logout-Widerruf, Kontolöschung/Cleanup.
- api-flow.test.ts: echter HTTP-Server → SupabaseGateway → Auth/PostgREST/PostgreSQL/RLS. Registrierung/Login, Cookie-/CSRF-Rotation, Task-CRUD, A/B-Trennung, fremde PATCH/DELETE, anonyme Anfragen, veraltete Tab-Identität, wirklicher Refresh und Logout.
- Reale Account-Browserfälle: geschützter Anmelde-/Aufgabenfluss und Isolation auf Desktop/Mobil.

Beim Refresh wird nur die API-Uhr kontrolliert; SDK-Auth und signierte Tokens bleiben echt. Ein delegierender Zähler beobachtet erfolgreichen Refresh ohne Tokenwerte auszugeben.

## Ablaufzeit und Privilegien

Vor exp wird eine tatsächlich lesbare Sentinel-Aufgabe angelegt. Bei exp + 2 Sekunden darf die strengere RLS keine Daten oder erfolgreiche Mutation erlauben. Nach exp + 32 Sekunden werden Data-API-401 und Auth-Ablehnung verlangt. PostgREST 16 dokumentiert 30 Sekunden Toleranz; RLS/Tokenlaufzeit werden dafür nicht gelockert. [Primärquelle](https://docs.postgrest.org/en/v16/references/auth.html#jwt-claims-validation).

Service-Schlüssel ausschließlich für Fixture-Kontoanlage/Cleanup und getrennte privilegierte Löschkontrolle. Alle normalen Zugriffe mit Publickey und Nutzer-JWT oder Publickey ohne Anmeldung. Die Serverkonfiguration erhält keinen Service-Schlüssel.

Einmalige fiktive .test-Konten und zufällige, nicht ausgegebene Passwörter. Cleanup versucht auch bei Fehlern alle eigenen Fixtures zu entfernen und zählt verbliebene Daten. Keine vorhandenen Konten überschreiben/löschen.

## Beenden

Tests zuerst auslaufen lassen. Danach bei Bedarf:

```powershell
npm run supabase:stop
```

Nicht während Prüfungen stoppen. Keine privilegierten Schlüssel dauerhaft manuell setzen. Seeds sind ein eigener expliziter Schritt, keine automatischen Testkonten für reale Schüler.

Protokolle: artifacts/phase2/real-database-tests.log und real-browser-tests.log. Historischer Ablaufzeitfehler: real-database-first-failure.log. Maßgeblich ist [VALIDATION](../../docs/VALIDATION.md).
