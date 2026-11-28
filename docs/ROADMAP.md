# LernPilot Roadmap

Stand: 27. November 2026. Keine Integrations-/Terminversprechen.

## Phase 1 und 1.5

Sichere React/Vite-Demo und lokale Sicherung vorhanden. Menschliches Phase 1-Review laut Angabe des Projektinitiators freigegeben. Originalcheckout unverändert erhalten. Neue Agenda aus GitHub `535b8ea` wird mit der Foundation in separater Kopie integriert; aktuelle Nachweise in [VALIDATION](VALIDATION.md).

## Phase 2 – Core Infrastructure: lokal technisch abgeschlossen

Supabase/PostgreSQL und Agenda sind laut Projektinitiator bestätigt. Implementiert: gemeinsames Schema/Migration/RLS-Testcode, Sitzungs-/API-Grenze, Zod-Verträge und separater Account-Einstieg. Projektpakete nach ausdrücklichem Ja installiert.

WSL 2, Docker und reduzierte Supabase-Umgebung nach separaten Freigaben eingerichtet. Migration angewendet; echte Auth-, Ablauf-, A/B-/anon-RLS-, API- und Browserprüfungen erfolgreich. Das neueste Home-Design ist integriert und lokal geprüft. Menschliches Review der kombinierten Änderung steht aus. Commit und Feature-Branch-Push benötigen jeweils ausdrückliche Zustimmung. [Bericht](PHASE2_REPORT.md).

## Phase 3 – Manuelles Kern-MVP

Erst nach Phase 2-Abnahme:

- Projektinitiator: Noten-Center an Fächer/Schulzeiträume anbinden; bestätigte konfigurierbare Skalen/Gewichte/Rundung, nachvollziehbare Berechnung und Grenzfalltests. Bestehende Engine wiederverwenden.
- Icaro: manuelle Aufgaben/Termine über bestehende geschützte Verträge; Pagination/Filter und später erlaubte Integrationsadapter. Keine zweite Anmeldung bauen.
- Kitaday: gemeinsame Felder/Buttons/Statusanzeigen, zugängliche Lade-/Leer-/Fehlerzustände, mobile Account-/Agenda-Oberflächen und Kontrast/Darkmode.
- Projektinitiator + Icaro: gemeinsame Ereignis-/Fachverträge; Analytics zunächst nur freiwillig und erklärbar.
- Alle: RLS bei jeder Tabelle testen, API-Datenzugriff mit Nutzeridentität, Datenlebenszyklus und Reviews.

Abnahme: fiktive Nutzer verwalten eigene manuelle Daten zuverlässig; keine fremden IDs/Beziehungen, keine ungeprüften Schulregeln.

## Weitere Phasen

4. Notensimulation und deutlich inoffizielle PDF-Übersicht. Lyceum nur nach zulässiger Machbarkeits-/Zugangsfreigabe ohne Passwortsammlung. Icaro: Classroom/Tasks/Calendar erst mit minimalem freigegebenem OAuth; Apple/iCloud getrennte Machbarkeit. Schreibsynchronisation separat entscheiden.

5. Übungsprüfungsgenerator (Projektinitiator), KI-Tutor (Icaro), Analytics (beide). Vorher Datenfluss/Kosten/Erlaubnis prüfen; keine echten Prüfungsfragen oder amtliche Bewertung versprechen.

6. Freiwillige Erprobung erst nach Schutzkonzept und erforderlichen organisatorischen/rechtlichen Freigaben mit geeigneten Erwachsenen/Fachleuten. Löschung/Restore/Berechtigungen praktisch testen.

7. Veröffentlichung nur mit ausdrücklichem Auftrag und Betriebskonzept, HTTPS, Support und Kostenfreigabe. Spätere Schulen benötigen bestätigte Regelprofile und passende Berechtigungen.

Gmail ausgeschlossen. React/Vite bleibt; keine Next.js-Migration. Keine Produktiv- oder kostenpflichtigen Dienste in diesem Auftrag.
