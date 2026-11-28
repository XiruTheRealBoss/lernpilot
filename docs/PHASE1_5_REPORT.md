# LernPilot Phase 1.5 – Sicherung, Synchronisationsanalyse und Infrastrukturvorbereitung

Stand: 26. November 2026 (America/Sao_Paulo).
**Vorbereitung abgeschlossen. Keine Zusammenführung, Installation oder Phase-2-Implementierung ausgeführt. Ein menschliches Teamreview ist nicht nachgewiesen und wurde nicht behauptet.**

## 1. Sicherungsstatus und Speicherort

Die Sicherung wurde vor Erstellung der Phase-1.5-Dokumente im neuen Verzeichnis angelegt:

`C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\backups\phase1-2026-11-26_192945`

| Nachweis | Tatsächliches Ergebnis |
| --- | --- |
| Relevante Quell-/Dokumentationsdateien im ZIP | 91 |
| Sämtliche geänderten/ungetrackten Dateien des Ausgangsstands | 83 von 83 enthalten |
| Ursprünglich erfasste Arbeitsdateien | 92, einschließlich einer bewusst ausgeschlossenen Metadatendatei |
| Archivgröße | 162.926 Bytes |
| Wiederherstellung | In neuen Ordner restore-check extrahiert |
| Wiederhergestellte Dateien | 91/91 mit gleichen Größen und SHA-256 |
| Originalarbeitsstand beim Sicherungsschritt | Alle 92 Dateien, Git-Status, Branch und HEAD unverändert |
| Source-ZIP SHA-256 | 5de88a3a993c82d116de8e68c57eccfbbafbdf9003e92d4417196f11c10e5f62 |

Enthalten sind auch alle ungetrackten Module, Tests und Dokumente einschließlich Phase-2-Preflight. Ausgeschlossen wurden node_modules, dist, Test-/Browserartefakte und ignorierte Geheimnisdateien. Die unkritische .env.example ist enthalten; .team-chat-room wurde als lokale Verbindungsmetadatei bewusst ausgelassen. Keine geänderte/ungetrackte relevante Datei musste ausgeschlossen werden.

Die Auswahl wurde auf bekannte Token-/Privatschlüssel-Muster geprüft, ohne Inhalte auszugeben. Das ist keine absolute Garantie gegen jede unbekannte Geheimnisform. Es wurde kein Git-Historienbundle erstellt, damit keine ungeprüften historischen Geheimnisse/Git-Konfigurationen in die Sicherung geraten. Das Quellarchiv stellt den relevanten tatsächlichen Arbeitsstand wieder her; bestehende Git-Historie und Commit-IDs bleiben im unveränderten Repository vorhanden.

Dateien im Sicherungsordner:
- source.zip: tatsächlicher Quellsnapshot.
- manifest.json: alle Archivpfade, Größen, Hashes und Ausschlüsse.
- snapshot.json: ursprünglicher Branch, HEAD, Git-Status und Dateihashes.
- tracked-changes.patch: zusätzlicher Git-Diff; allein kein Ersatz für die ungetrackten Dateien.
- verification.json: Restore- und Unverändertheitsnachweis direkt nach Sicherung.
- restore-check/: tatsächliche Wiederherstellung.
- README.md: genaue Erklärung und Wiederherstellung ohne Überschreiben.
- remote-review/agent-analysis/: gesonderter Vergleichscache des später gelesenen Remote-Änderungsstands.

Die Sicherung ist eine lokale Kopie auf demselben Gerät. Sie liegt im bestehenden OneDrive-Verzeichnispfad; dessen automatische Synchronisation wurde nicht geprüft. Es wurde keine zusätzliche externe Übertragung durch den Assistenten veranlasst. Eine unabhängige Offsite-Sicherung ist dadurch nicht nachgewiesen.

[Archiv](../../backups/phase1-2026-11-26_192945/source.zip) · [Sicherungsanleitung](../../backups/phase1-2026-11-26_192945/README.md).

## 2. GitHub-Abgleich

- Lokaler Branch: feat/security-quality-foundation.
- Lokaler HEAD/Basis: 9fe50000bda4282a26adc0ce70580357930dbbb2.
- Tatsächliches origin-Repository: https://github.com/XiruTheRealBoss/lernpilot.git.
- GitHub main bei anfänglicher und abschließender Abfrage: 535b8ead0ff0f03e2a101ba699aaaaaac5ce7198.
- Ein zusätzlicher Commit von Account XiruTheRealBoss: Agenda-/UI-Umbau.
- **13 Remote-Dateien: 5 geändert, 7 entfernt, 1 neu. Elf überschneiden sich mit lokalen Änderungen.**

GitHub wurde nur gelesen. Lokale origin/main-Refs wurden nicht mit fetch aktualisiert. Es gab keinen Pull, Merge, Rebase, Checkout, Reset, Clean, Commit oder Push. Die genannten Konflikte sind geplante Integrationsfragen, keine bereits durchgeführten Mergekonflikte.

Alle sechs vorhandenen neuen/geänderten Remote-Dateien sind zusätzlich kopiert. Ihre SHA-256-Prüfsummen und Git-Blob-Prüfsummen wurden gegen den unveränderlichen Remote-Baum geprüft: 6/6 stimmen. Der Cache ist ausdrücklich **kein vollständiges Remote-Repositoryarchiv**. Die sieben Löschungen sind dokumentiert; ihre Basisdateien bleiben im Originalcommit und lokalen Snapshot erhalten.

[Commit](https://github.com/XiruTheRealBoss/lernpilot/commit/535b8ead0ff0f03e2a101ba699aaaaaac5ce7198) · [vollständiger Vergleich](https://github.com/XiruTheRealBoss/lernpilot/compare/9fe50000bda4282a26adc0ce70580357930dbbb2...535b8ead0ff0f03e2a101ba699aaaaaac5ce7198).

## 3. Konfliktmatrix und konkrete Strategie

Die [vollständige Konfliktmatrix](PHASE1_5_CONFLICT_MATRIX.md) behandelt alle elf Überschneidungen einzeln und zusätzlich Agenda.tsx und LoginButton.tsx. Keine ganze Datei pauschal als „lokal gewinnt“ oder „remote gewinnt“ übernehmen.

| Bereich | Empfohlene spätere Zusammenführung |
| --- | --- |
| App-Einstieg | Sichere lokale App als Grundlage; neue Agenda nur als Lições-Darstellung anbinden |
| Agenda und Aufgabenregeln | Neue kompakte UI erhalten; lokale reine Frist-/Gruppenlogik und Zeitaktualisierung verwenden |
| Kalender/Statusfilter/Notizen | Bestehende Funktionen erhalten; keine stille Entfernung wegen Layoutwechsel |
| Entfernte Karten-/Spaltenkomponenten | Erst stilllegen, wenn Verhalten, alle Importe und Tests übernommen sind |
| Fonts/Palette | Editoriales Design prüfen; Schrift lokal oder Systemfallback, keine externen Fontlinks im Demo |
| Datenschutz und Noten | Lokale gezielte Löschung, Erklärungen und GradeDemo erhalten; kein alter Consent-/iframe-Fluss |
| Anbieterzugriff | Alle lokalen OAuth-/Portal-/API-Sperren erhalten; alte Endpunkte bleiben 410 |

Wesentliche statische Agenda-Befunde: Fristen innerhalb desselben Tages werden nur nach Kalendertag gruppiert; kein Frist-/Mitternachtstick; gespeicherter Statusfilter wird auf todos überschrieben; Notizen sind bei sonst einfachen Aufgaben nicht erreichbar; Kalender fehlt. Material-/Portal-Linkaktionen müssen für die Demo neutralisiert bleiben. Diese Punkte wurden nicht durch Ausführen des Remote-Codes geprüft.

Das Kopieren nur der Remote-App bei unveränderten gesperrten lokalen Hooks reaktiviert nicht automatisch Anbieterzugriffe; zunächst entstehen Header-/ConsentGate-/Importkonflikte. Das Reaktivierungsrisiko entsteht durch zusätzliche Übernahme alter Provider/Hooks/API-Pfade oder Rücknahme der Sperren. Diese Unterscheidung ist wichtig.

Spätere Integrationsreihenfolge: gesicherten Ausgangsstand behalten → Teamentscheidung → separater Integrationsarbeitsstand → Agenda-Verhalten mit Regressionen festlegen → sichere lokale Fach-/Speichergrenzen anbinden → Referenzen/Komponenten gezielt ablösen → Lint/Typecheck/Tests/Builds/Offline-Nachweis → menschliches Review. Nichts davon wurde als Codeänderung ausgeführt.

## 4. Sicherheitskorrekturen und Regressionstests für die Agenda

Erhalten: Notenengine und GradeDemo-Tests; UTC-/Kalender-/Abgabestatusregressionen; reine school-hub-Gruppentests; Classroom- und Alt-API-Sperren; Profil-/Speichervalidierung und gezielte Löschung.

Anpassen: Dashboard-Rendererprüfungen auf Agenda und gegebenenfalls erhaltenen Kalender portieren. Bisherige Testabsichten bleiben: alle Aufgaben sichtbar/erreichbar, jede genau einmal, Fristwechsel und Mitternacht ohne Refresh, Statusfilter nach Neuberechnung. Eingeklappte Später-/Ohne-Datum-Gruppen in Browser-/Komponententests gezielt öffnen, statt Vollständigkeitsprüfungen zu löschen.

Ergänzen: leere Aufgabe mit neuer/vorhandener Notiz, Tastaturbedienung, lange Titel/schmaler Viewport, lokale Materialtexte ohne Navigation, neue Palette sowie kein Auth-/Portalzugriff im Demo. Die bisherige Browser-Suite muss auf neue zugängliche Rollen/Abschnittsbuttons angepasst werden; die Noten-/Profil-/410-Nachweise bleiben.

## 5. Windows-/Docker-/Supabase-Voraussetzungen

Lesende Abfragen ergaben:

| Punkt | Tatsächlicher Stand |
| --- | --- |
| Windows/Architektur | Windows 11 Home 26H2, Build 26300.10075, X64 |
| Physischer/verfügbarer RAM | 15,74 GiB / 2,39 GiB zum Messzeitpunkt |
| C: gesamt/frei | 457,64 GiB / 255,64 GiB; System und Projekt liegen dort |
| WSL | EXE vorhanden, Umgebung meldet nicht installiert |
| Docker Desktop/CLI | Nicht an PATH, All-users- oder Per-user-Standardpfaden verfügbar |
| Supabase CLI | Nicht installiert; Kandidat 3.4.0/Windows-x64 lesend geprüft |
| Node/npm | 24.22.3 / 11.19.1 vorhanden |
| Virtualisierung | Hypervisor aktiv, gesonderte CPU-/SLAT-Flags widersprüchlich; nicht abschließend bestätigt |
| LanmanServer | Running/Automatic; nicht geändert |

Die aktuelle freie RAM-Menge ist knapp; vor Containerstart offene Arbeit speichern, nicht benötigte Programme normal schließen und erneut messen. Es wurden keine fremden Prozesse beendet. Der genaue RAMbedarf des Stacks wurde nicht gemessen, weil nichts gestartet wurde.

Docker verlangt für den WSL-2-Weg unter anderem unterstütztes 64-Bit-Windows, WSL ab 2.1.5, SLAT/Firmwarevirtualisierung und 8 GB System-RAM. Home verwendet Linux-Container. Die reine RAM-Mindestgröße ist erfüllt; die vollständige Installation/Laufzeitfähigkeit ist damit noch nicht nachgewiesen. [Docker-Voraussetzungen](https://docs.docker.com/desktop/setup/install/windows-install/).

Keine BIOS-/Sicherheitsänderung aus widersprüchlichen Flags ableiten. Windows-Wartungsstatus und passende Docker-Version beim späteren Download prüfen. Für lokale Supabase-Nutzung unter Windows ist eine Containerlaufzeit vorzubereiten; Node 24 erfüllt die dokumentierte npm-CLI-Voraussetzung Node >=20. Neue CLI-/Containerkompatibilität ist mangels Installation noch nicht praktisch bestätigt. [Supabase-CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

## 6. Verständliche Installationsanleitung

[LOCAL_INFRASTRUCTURE_SETUP.md](LOCAL_INFRASTRUCTURE_SETUP.md) enthält die vollständigen, **noch nicht ausgeführten** Schritte:

1. Team-/Gerätefreigabe und Lizenzbedingungen klären; keine kostenpflichtige Option kaufen.
2. Virtualisierungsanzeige, freien RAM und Speicherplatz lesend prüfen.
3. Nach Genehmigung WSL über die offizielle Microsoft-Anleitung installieren; nötigen Neustart koordinieren; WSL-Version und Distribution mit Version 2 prüfen.
4. Docker Desktop vom offiziellen Anbieter, x86_64, Per-user/WSL-2/Linux-Container installieren; Client/Engine/Containertyp prüfen.
5. In einem neuen, eindeutig getrennten Probeordner die gepinnte Supabase CLI projektlokal vorbereiten; keine globalen Updates.
6. Nur lokal initialisieren; Projektkennung/Ports prüfen; kein login/link/db push/Cloudprojekt.
7. Erst nach den Freigaben die lokale Probe starten, die lokale Studio-Adresse öffnen und wieder normal stoppen. Keine Schlüssel oder Zugangsausgaben teilen und keine Reset-/Prune-/Volume-Löschbefehle benutzen.

Die Anleitung enthält exakte PowerShell-Befehle, erwartete Ergebnisse, Stopppunkte und Quellen. Sie ist keine Installationserlaubnis und kein praktischer Einrichtungsnachweis. Die aktuelle Demo benötigt Docker/Supabase weiterhin nicht.

## 7. Kompakte Teamreview-Vorlage und offene Entscheidungen

[PHASE1_5_TEAM_REVIEW.md](PHASE1_5_TEAM_REVIEW.md) ist für Icaro/Kitaday vorbereitet, aber nicht verschickt. Sie enthält Phase-1-Änderungen, Sicherheitsgrenzen, Tests, Auswirkungen auf ihre Module und Entscheidungsfelder. Menschliches Review ist ausdrücklich offen.

Zu bestätigen:
- Tatsächlicher Phase-1-Teamreviewstatus und Verantwortliche für die Integration.
- Agenda als Hauptansicht bei zunächst erhaltenem Kalender/Statusfilter/Notizen.
- Font-/Kontraststrategie und unverzichtbare Sicherheits-/Regressionstests.
- Lokales Supabase/Auth/PostgreSQL/RLS und der vorgeschlagene kleine Server/BFF.
- Freigabe für WSL/Docker samt Geräte-/Lizenzvoraussetzungen.

Projektinitiator: Noten-Center, Lyceum, Berechnung/Simulation, PDF, Prüfungsgenerator. Icaro: School Hub, Anbieter, Tutor. Kitaday: UI/UX/Designsystem. Analytics: Projektinitiator und Icaro. Infrastruktur: alle. Gmail ausgeschlossen.

## 8. Tatsächlich ausgeführte Prüfungen und Grenzen

In Phase 1.5 ausgeführt: Quellauswahl/Geheimnismusterprüfung, Archivierung, Extraktion, 91 Größen-/Hashvergleiche, Nachweis aller 83 geänderten/ungetrackten Dateien, Unverändertheitsvergleich der 92 ursprünglichen Dateien und Gitmetadaten, read-only GitHub-Vergleich, Remote-Datei-Prüfsummen, statische Funktions-/Kontrastanalyse, Windows-/Ressourcenabfragen und offizielle Dokumentationsrecherche.

Die letzten App-Prüfläufe stammen aus dem unmittelbar vorausgehenden Preflight am 26.11.2026: 82 Vitest-Tests/8 Dateien, vier Browserprüfungen, Lint, Typecheck, Entwicklungs-/Produktionsbuild bestanden. Ihre Logs wurden gelesen; der Anwendungsquellstand ist unverändert. **Keine neuen App-Testläufe in Phase 1.5** und keine behaupteten Agenda-, RLS- oder Containertests.

Keine Installation, Windows-Systemänderung, Diensteinrichtung, Live-Schulverbindung, echten Schülerdaten, Cloudaktivierung, kostenpflichtigen Dienste oder Veröffentlichung. Zwei spezialisierte Teilagenten unterstützten getrennt Konfliktanalyse und Infrastrukturprüfung; der Hauptagent erstellte/verifizierte die Sicherung und prüfte beide Dokumente.

## 9. Dateien und Übergabe

Neu im Checkout, ausschließlich Dokumentation:
- docs/PHASE1_5_REPORT.md
- docs/PHASE1_5_CONFLICT_MATRIX.md
- docs/LOCAL_INFRASTRUCTURE_SETUP.md
- docs/PHASE1_5_TEAM_REVIEW.md

Zusätzlich neue Sicherungs-/Prüfdateien im oben genannten Geschwisterordner backups/. Bestehende Anwendungs- und Dokumentationsdateien wurden nicht überschrieben. Die beiden Phase-2-Preflight-Dokumente bleiben als historische Prüfbasis erhalten; ihr damaliges „noch kein Backup“ wird durch diesen späteren Bericht ergänzt, nicht rückwirkend umgeschrieben.

Nächster Schritt ist das tatsächliche Teamreview. Erst danach kann eine gesondert freigegebene Integration/Installation folgen. Phase 2 selbst bleibt unimplementiert.

## 10. Vorhandene Demo exakt öffnen und beenden

1. Falls sie bereits läuft, vorhandenen Browser-Tab neu laden; kein zweites npm run dev starten.
2. Sonst Windows-Taste drücken, PowerShell suchen und öffnen.
3. Nacheinander eingeben:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-app"
npm run dev
```

4. Auf Local: warten. Die dort gezeigte Adresse mit /?demo öffnen, normalerweise http://127.0.0.1:5173/?demo.
5. Terminal geöffnet lassen; dort zum Beenden Strg+C drücken.
6. Keine Docker-/Supabase-Installation für diese Demo nötig. Eine kombinierte Agenda-/Phase-1-Version und eine authentifizierte Phase-2-App gibt es noch nicht.
