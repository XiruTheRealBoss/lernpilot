# Phase 1 – Arbeitsplan und Akzeptanz

Basiscommit: 9fe50000bda4282a26adc0ce70580357930dbbb2. Remotevergleich beim Start: unverändert.
Separater Checkout lernpilot-app; sauberer Ausgangsstatus; Branch feat/security-quality-foundation.

## Umsetzung

1. Bestehende Anwendung und alle fünf Projektdokumente prüfen und erhalten.
2. Tests zuerst: alte Zahlen-/Formel- und Datumsfehler reproduzieren.
3. Live-OAuth, Lyceum-Passwortverarbeitung und direkte Alt-API-Aufrufe abschalten.
4. Isolierte fiktive Profile und gezielte Speicherbereinigung einführen.
5. Notenengine und School-Hub-Regeln extrahieren, bestehende Oberflächen behalten.
6. Kompatible Werkzeuge, feste Versionen und npm-Skripte bereitstellen.
7. Lint, Typecheck, Unit-/Komponenten-, Browsertests und Builds prüfen.
8. Änderungen und verbleibende Risiken dokumentieren.

## Dateieigentum der Umsetzung

- Grades-Teilagent: src/modules/grades und sichere Abschaltseite public/notas.html.
- School-Hub-Teilagent: Datums-/Normalisierungshilfen, Dashboard, School-Hub-Modul und gesperrter Classroom-Adapter.
- Hauptagent: Runtime/Persistenz, Einstieg, API-Abschaltung, Tooling, Dokumente und Integration.
- Unabhängiger Review-Agent: ausschließlich lesende Prüfung, keine Änderungen.

Kommunikation über diese Zuordnung verhindert gleichzeitige Änderungen an denselben Dateien. Der Hauptagent integriert und prüft alles. Keine Benachrichtigung anderer Teammitglieder oder GitHub-Mutation wurde ohne Auftrag ausgeführt; Teamreview bleibt vor Merge erforderlich.

## Erfolgskriterien

Quellcode lokal; Demo ausschließlich fiktiv; null externe Requests; alte APIs antworten 410; Profile getrennt; Formel-/Datum-/Aufgabenfehler geprüft; alle verfügbaren Checks erfolgreich. Ergebnisse werden ausschließlich nach tatsächlichem Lauf in VALIDATION festgehalten.

Nicht im Umfang: produktive Cloud, neue Anbieter, KI-Funktionen, vollständiges Designsystem, echte Nutzer-/Schülerdaten, Push, Merge, Veröffentlichung.
