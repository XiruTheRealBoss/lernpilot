# Prüfprotokoll – lokale Phase 2

Stand: 27. November 2026. **PHASE 2 LOKAL ABGESCHLOSSEN.** Alle nachfolgend genannten Abschlussprüfungen wurden tatsächlich erfolgreich ausgeführt. Nur fiktive lokale Daten; keine Produktionsfreigabe.

## Abschließende Ergebnisse nach Home-Integration

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| WSL/Docker | Neustart bestätigt; WSL 2, Docker Desktop 4.100.1, Engine 29.9.3, echter Linux-Container Exit 0 |
| Installer | Offizielle SHA-256 identisch, Authenticode gültig, Docker Inc. |
| Supabase | Fünf Dienste gestartet, tatsächliche Loopback-Bindung geprüft |
| Migration | 20261127125248_core_infrastructure angewendet |
| Tabellen/RLS | Acht öffentliche Tabellen vorhanden, RLS aktiv |
| Testbereinigung | DB-Endzustand: auth.users = 0 nach allen Tests |
| Frontend/Fachlogik | 110/110 in zwölf Dateien bestanden; bisherige 99 plus elf Home-Regressionen, ursprüngliche 82 fachlich erhalten |
| Fakeanbieter-HTTP | 26/26 bestanden, allein kein Auth-/RLS-Beleg |
| Demo-/Home-/Altpfad-/Accountgrenzen-Browserfälle | 10/10 Desktop/Mobil |
| Reale Account-Browserfälle | 2/2 Desktop/Mobil |
| Infrastrukturprüfungen | 14/14 bestanden, einschließlich drei Public-Config-Regressionen |
| Lint/Typecheck/beide Builds | Abschlusslauf Exit 0: Lint, Typecheck und beide Builds bestanden |
| Echte API | Acht Untertests bestanden, echter SDK/Auth/DB |
| Direkte RLS | 16 RLS-Untertests inklusive echter Ablaufzeitprüfung bestanden |
| Ressourcen | Container-RAM Stichprobe zusammen 353,68 MiB, ohne Host-/VM-Overhead |

Der echte Gesamtlauf bestand mit 26/26 gezählten Tests: acht API- und 16 RLS-Untertests plus zwei Elterntests, null Fehler/Skips, 341,15 Sekunden. Der echte Ablaufzeitfall dauerte 332,26 Sekunden. Weitere Abschlussprüfungen: npm audit ohne bekannte Schwachstellen; DB-Lint public/private mit --fail-on warning und Security-Advisors mit --fail-on warn jeweils Exit 0 ohne Befund. Zehn reguläre Browserfälle: 50,3 Sekunden; reale Browserfälle: 20,693 Sekunden.

## Echte API und Browser

api-flow.test.ts: Registrierung/Login, Cookie-/CSRF-Rotation, eigene Aufgaben-CRUD, A/B-Trennung, fremde IDs, anonyme Ablehnung, veraltete Tab-Identität, tatsächlicher SDK-Refresh und Logout. Beim Refresh wird nur die Serveruhr kontrolliert; echte Auth-/PostgREST-Anfragen und signierte Tokens bleiben unverändert. Ein delegierender Zähler beobachtet erfolgreiche Refreshes ohne Tokenwerte zu speichern/auszugeben.

Zwei reale Account-Browserfälle prüfen den geschützten Ablauf auf Desktop/Mobil gegen lokale Dienste. Zehn reguläre Demo-/Home-/Altpfad-/Accountgrenzen-Fälle erhalten die bisherige fachliche Abdeckung und ergänzen Wochenwahl, Fokus-Erledigung und Prüfungssprung. Die historischen Account-Bilder liegen unter artifacts/phase2; aktuelle Home- und Account-Ansichten wurden ebenfalls visuell kontrolliert. Der Hauptagent hat Desktop- und Mobilbilder tatsächlich betrachtet; in den geprüften Ansichten kein blockierender Überlauf.

## Direkte RLS und korrigierter Ablaufzeitfall

rls.test.ts prüft eigene CRUD-Vorgänge, fremde/anonyme Verweigerung, manipulierte Owner, fremde Fach-/Zeitraum-FKs, NaN/unendliche Datums-/Zeitwerte, Elternlöschung, ungültige JWTs, direkten Logout-Widerruf, Kontolöschung und getrennte tatsächliche Cleanup-Kontrolle. Normale Zugriffe verwenden Publickey+Nutzer-JWT, nicht Adminrechte.

Der erste Ablaufzeittest forderte schon exp + 2 Sekunden einen JWT-HTTP-Fehler. PostgREST 16 dokumentiert 30 Sekunden Uhrtoleranz. Korrigiert: vorher lesbare Sentinel-Aufgabe; bei exp + 2 Sekunden kein Daten-/Schreibzugriff durch strengere RLS; bei exp + 32 Sekunden echte Data-API-401 und Auth-Ablehnung. Tokenlaufzeit und RLS wurden nicht gelockert. [Offizielle Dokumentation](https://docs.postgrest.org/en/v16/references/auth.html#jwt-claims-validation).

Der korrigierte Gesamtlauf hat real auf den von Auth ausgestellten Token gewartet und ist erfolgreich beendet. Die Datenbank-Ablaufprüfung wurde nicht durch eine vorgetäuschte Signatur oder einen Mock ersetzt.

## Windows-/CLI-Korrektur und Befehle

scripts/local-supabase.ts und scripts/local-docker-proxy.cs korrigieren projektgebunden explizite Loopback-Portargumente. Vorhandener Windows-C#-Compiler, kein zusätzliches Paket, keine Daemon-/Windows-Konfiguration. Vierzehn Infrastrukturregressionen prüfen erlaubte CLI-Befehle, Bindungsgrenzen und den ausschließlich öffentlichen lokalen Konfigurationsserializer.

Im Integrationsordner:

- npm run check: Lint, Typecheck, Fach-/Frontendtests und beide Builds.
- npm run test:server: Fakeanbieter-HTTP.
- npm run test:infrastructure: Starter-/Bindungsregressionen.
- npm run test:e2e: bestehende Browserfälle.
- npm run test:database: echte API-/RLS-Suite.
- npm run test:browser:local: echte Account-Browserfälle.

Die letzten beiden Launcher übernehmen nur lokale Schlüssel im Arbeitsspeicher. Privilegierte Schlüssel nicht manuell in Konsole, Dateien oder Screenshots kopieren.

## Protokolle und Grenzen

Aktuelle abschließende Nachweise im ignorierten artifacts/final-integration:

- check.log: 110 Tests, Lint, Typecheck und beide Builds, Exit 0.
- http.log: 26/26 HTTP-Regressionen.
- infrastructure.log: 14/14 Infrastrukturprüfungen.
- database.log: 26/26 reale Tests inklusive Elternzählung; null Fehler/Skips.
- e2e.log: zehn reguläre Browserfälle, alle bestanden.
- live-browser.log: zwei reale Account-Browserfälle, alle bestanden.
- audit.json, db-lint.log und db-advisors.log: Paket-/Datenbankprüfungen ohne Befund.
- db-state.log: Migration, acht RLS-Tabellen und null Auth-Benutzer nach Bereinigung.
- containers.log und memory.log: tatsächliche Bindungen/Ressourcen.

Frühere Nachweise unter artifacts/phase2 bleiben historisch erhalten, einschließlich real-database-first-failure.log. Die offizielle Docker-Installer- und Linux-Containerprüfung ist dort ebenfalls dokumentiert.

Historische Preflight-/Phase-1-Ergebnisse bleiben historische Artefakte. Keine Produktions-, Last-, Mehrinstanz-, DB-Backup-/Restore- oder vollständige Accessibility-/Darkmode-/Physikgerätprüfung behauptet. Ein Paket-Audit ist eine Momentaufnahme. Lokaler Abschluss ersetzt kein menschliches Review und keine Datenschutz-/Produktionsfreigabe.

Die lokale Abnahme umfasst jetzt die integrierte Home-Oberfläche aus origin/main 39e690f50f56db00a263337f8904e93fdcdf1563 und das erhaltene Phase-2-Fundament. Keine weiteren Remote-Commits beim letzten lesenden Abgleich. Keine Backend-/SQL-Änderung für Home.


Die Home-Bilder für Desktop/Mobil wurden vom Hauptagenten tatsächlich betrachtet. Vollständige Accessibility-/Darkmode-/Physikgerätprüfung bleibt ausstehend. Der vorherige Phase-2-Snapshot wurde vor den neuen Änderungen frisch entpackt und mit 136/136 Hashes geprüft. Die abschließende neue Sicherung ist getrennt; deren verification.json und aktuelles Dateiinventar gelten für ihren genauen Umfang.

Die abschließende Suche nach den fünf tatsächlich verwendeten lokalen Schlüsselwerten fand keinen Treffer im ausgewählten Quellstand und in sieben Builddateien. Die Werte wurden nur aus dem lokalen CLI-Status im Arbeitsspeicher übernommen; das Protokoll artifacts/final-integration/secret-scan.json enthält keine Schlüsselwerte. Dies ist eine gezielte Prüfung des geprüften Endstands, kein allgemeiner Geheimnisfreiheitsnachweis.
