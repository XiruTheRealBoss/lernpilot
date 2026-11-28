# LernPilot Roadmap

Stand: 25. November 2026 · Arbeitsfassung ohne Zeitversprechen

Die Produktplanung ist erfolgt; die technische Vorbereitung läuft. Das vorhandene Repository enthält bereits einen Prototyp. Kein untenstehender Meilenstein gilt allein durch dieses Dokument als abgeschlossen. Reihenfolge und Umfang sind Vorschläge; Aufwand und externe Freigaben sind unsicher. Phasen können sich überlappen, wenn Schnittstellen und Zuständigkeiten vorher abgestimmt sind.

## Phase 0 – Bestand und gemeinsame Entscheidung

**Alle:** Bestehende App, laufende Funktionen, Abhängigkeiten, Sicherheitsrisiken und README prüfen; Demo nur mit fiktiven Daten ausprobieren. Gemeinsam festlegen, was bestehen bleibt. Vite weiterentwickeln oder Next.js/Supabase mit Migrations- und Rückfallplan vergleichen. Kitaday skizziert das Designsystem; Projektinitiator und Icaro vereinbaren Modulgrenzen.

**Abschluss:** Bestandsliste, Architekturentscheidung, priorisierte Issues und dokumentierte Verantwortliche; keine ungeprüfte Migration.

## Phase 1 – Fundament

**Alle:** Branch-/PR-Ablauf, einfache lokale Einrichtung, Prüfungen und Beispieldaten festlegen. Authentifizierung und Datenhaltung erst nach Stack-Entscheidung aufbauen; Trennung der Daten und Zugriffstests einplanen. Kitaday erstellt zugängliche, responsive Basiskomponenten. Gemeinsame Datenverträge abstimmen.

**Abschluss:** Team kann Projekt lokal starten; verfügbare Checks laufen; mindestens zwei fiktive Testidentitäten sind voneinander getrennt, sofern Benutzerkonten implementiert werden. Keine echten Schülerdaten.

## Phase 2 – Kleines nutzbares MVP

**Projektinitiator:** manuelle Noten, bestätigte konfigurierbare Gewichtungen, nachvollziehbare Durchschnitte; Berechnungstests. **Icaro:** manuelle Aufgaben und Termine im School Hub. **Kitaday:** verständliche Oberfläche mit Lade-, Leer- und Fehlerzuständen. **Gemeinsam:** enges MVP und Akzeptanztests festlegen.

**Abschluss:** Ein fiktiver Nutzer kann Daten eingeben, berechnete Ergebnisse prüfen und Aufgaben verwalten; ungültige Eingaben werden verständlich behandelt. Externe Anbindungen sind keine Voraussetzung.

## Phase 3 – Integrationen und Notenübersicht

**Projektinitiator:** Erlaubnis, Schnittstelle und Schulregeln für Lyceum klären; nur nach Freigabe sicheren Import untersuchen. Notensimulation und klar inoffizielle PDF-Übersicht ergänzen. **Icaro:** Classroom-Bestand prüfen und Google Tasks/Calendar mit minimalen Leserechten erproben; Apple Erinnerungen und iCloud Kalender als Machbarkeitsfragen untersuchen. **Kitaday:** Verbindungsstatus, Fehler und Trennen zugänglich gestalten.

**Abschluss:** Jede tatsächlich unterstützte Verbindung ist autorisiert, mit fiktiven oder ausdrücklich freigegebenen Daten getestet und dokumentiert. Sonst bleibt manuelle Eingabe verfügbar. Keine Gmail-Anbindung. Synchronisation und Schreibzugriff sind spätere, separat zu entscheidende Erweiterungen.

## Phase 4 – Lernen mit KI und Analytics

**Projektinitiator:** Übungsprüfungsgenerator und Prüfungsprofile. **Icaro:** KI-Tutor und freiwilliger Lernkontext. **Beide:** erklärbare Auswertung vergangener Übungen und einfacher Lernfortschritt. **Kitaday:** transparente KI- und Analytics-Oberflächen. Vor Anbieterwahl Datenfluss, Kosten, Schutzmaßnahmen und erlaubte Materialien klären. Mindmaps, Flowcharts und Videoempfehlungen sind spätere Ideen, keine MVP-Voraussetzungen.

**Abschluss:** Übungen sind klar als KI-generiert gekennzeichnet, Grenzen sichtbar, und ein fiktiver Ablauf ist auf Fehler und Zugriffsschutz geprüft. Keine Aussage, echte Prüfungsfragen vorhersagen zu können.

## Phase 5 – Freiwillige Erprobung

Zuerst intern mit fiktiven Daten testen. Erst nach dokumentierter Datenschutz- und Sicherheitsprüfung und erforderlichen Freigaben gegebenenfalls eine kleine freiwillige geschlossene Erprobung planen. Geeignete Erwachsene, Schule und bei Bedarf Datenschutzfachleute sowie Erziehungsberechtigte einbeziehen. Fehler, Barrieren und Feedback sammeln; keine feste Teilnehmerzahl als Voraussetzung annehmen.

**Abschluss:** Zugriffsschutz, Einwilligungs- und Löschabläufe sowie Vorfallreaktion geprüft, kritische Probleme behoben und Freigaben dokumentiert. Keine automatische Freigabe für Veröffentlichung.

## Phase 6 – Veröffentlichung und Erweiterung

Erst nach ausdrücklicher Entscheidung Hosting, Kosten, Support, Sicherheit, rechtliche Anforderungen und Veröffentlichung klären. Später zweite Schulen mit eigenen Regelwerken und Berechtigungen evaluieren; kein Portalzugang voraussetzen. Geschäftsmodell und Umfang anhand von Feedback bestimmen.

**Abschluss:** Verantwortlichkeiten, Betrieb, Kosten und messbare Produktziele sind gemeinsam beschlossen; Freigabe zur Produktion liegt ausdrücklich vor.

## Teamrhythmus und nächste konkrete Aufgaben

1. Alle lesen diese fünf Dokumente und gleichen sie mit dem Repository ab; bestehende README-Inhalte vor Ersatz sichern und prüfen.
2. Ein gemeinsames Issue „Bestandsaufnahme und Architekturentscheidung“ mit Akzeptanzkriterien erstellen. Verantwortliche und betroffene Dateien eintragen.
3. Projektinitiator prüft bestehende Notenfunktion und klärt mögliche Schulregeln und Lyceum-Freigabe; Icaro prüft Classroom-Stand und Voraussetzungen für Tasks/Calendar; Kitaday prüft die bestehende Oberfläche und erstellt erste Designprinzipien.
4. Bei einem kurzen regelmäßigen Treffen Ergebnisse, Blocker, Berührungspunkte und nächste Schritte abstimmen. Änderungen jeweils per Branch und PR prüfen lassen.
5. Gemeinsame Architekturentscheidung dokumentieren, bevor ein Fundament-Prompt oder eine Migration beauftragt wird.
