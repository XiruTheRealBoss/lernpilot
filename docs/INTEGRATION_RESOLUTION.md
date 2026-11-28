# Aufgelöste Agenda-Überschneidungen

Stand: 27. November 2026. Fachliche Codeintegration in separater Kopie, kein Git-Historienmerge.

Basis: 9fe50000bda4282a26adc0ce70580357930dbbb2. Gelesener Remote-Stand: 535b8ead0ff0f03e2a101ba699aaaaaac5ce7198. Der Remote-Diff enthält 13 Dateien, davon 11 Überschneidungen mit der lokalen Foundation. Die ursprüngliche Analyse bleibt unter PHASE1_5_CONFLICT_MATRIX.md erhalten.

| Remote-Datei/Änderung | Konkrete Behandlung |
| --- | --- |
| index.html geändert | Lokale CSP/Metadaten erhalten; externe Google-Font-/Preconnect-Links nicht übernehmen. Lokaler Schriftfallback. |
| src/App.tsx geändert | Agenda statt Dashboard; Offline-Daten, getrennte Profile, Filter, Ankündigungen, Notendemo, Prüfungen/Lehrkräfte bleiben. Keine alte OAuth-/Consent-/Portaliframe-Verdrahtung. |
| src/components/Auth/LoginButton.tsx geändert | Remote-Providerlogin nicht als Einstieg übernehmen. Alte unbenutzte Komponente bleibt erhalten, Anbieterhook gesperrt. Neue lokale Supabase-Testanmeldung ist getrennt. |
| src/components/Privacy/Privacy.tsx geändert | Sichere lokale Erklärung und gezielte Datenlöschung erhalten; alten ConsentGate/Providerzustand nicht zurückholen. |
| tailwind.config.ts geändert | Agenda-Palette und Display-Schriftfamilie übernehmen; Georgia-Fallback ohne externe Fonts. Alter Designrahmen bleibt nutzbar. |
| src/components/Agenda/Agenda.tsx neu | Darstellung übernehmen und an gemeinsame Phase 1-Regeln anbinden; keine zweite Deadline-/Statuswahrheit. |
| Announcements/AnnouncementsList.tsx entfernt | Bewusst erhalten; sichere Avisos-Darstellung direkt unter Agenda. |
| Dashboard/Dashboard.tsx entfernt | Als bisherige Komponente für bestehende Regressionen erhalten; App verwendet Agenda. |
| Dashboard/DoneColumn.tsx entfernt | Für erhaltenes Dashboard und alte Prüfabdeckung behalten. |
| Dashboard/UrgentColumn.tsx entfernt | Für erhaltenes Dashboard und alte Prüfabdeckung behalten. |
| Dashboard/WeekColumn.tsx entfernt | Für erhaltenes Dashboard und alte Prüfabdeckung behalten. |
| Filters/FilterBar.tsx entfernt | Als gemeinsame Kurs-/Suche-/Status-/Kalendersteuerung erhalten; Beschriftung/Mobilbreite verbessert. |
| TaskCard/TaskCard.tsx entfernt | Für erhaltene Dashboard-Komponenten behalten; Agenda nutzt neue Zeilen. Keine Sicherheitskorrektur zurücksetzen. |

Alle verkürzten Pfade in der Tabelle liegen unter src/components. „Erhalten“ bedeutet kein unkontrolliertes Wiederherstellen fremder Dateien, sondern die bestehende Foundation-Kopie beibehalten.

## Funktionale Konflikte

- Deadline am selben Tag: volle Uhrzeit/UTC-Regeln aus Phase 1; Timer, Mitternacht und Fokus aktualisieren Werte.
- Statusfilter: frisch berechnete Werte zuerst, vorhandenen Statusfilter danach anwenden; kein erzwungenes todos.
- Kalender: als Nebenansicht erhalten; vollständige Liste darunter enthält auch spätere/undatierte Aufgaben.
- Notizen: jede Zeile ist aufklappbar, auch ohne Beschreibung/Material. Leere und bestehende Notizen erreichbar.
- Kollabierte Gruppen: Mais tarde/Sem data/Feitas werden gezielt geöffnet; Tests prüfen anschließend Inhalt und Isolation.
- Abgegebene Aufgaben: Checkbox bleibt gesperrt; manuelle Erledigung sonst reversibel.
- Materialien/Portal: sichere Textdarstellung, keine reaktivierten Anbieteraktionen.
- Mobile Darstellung: umbrechende Zeilen, benannte Controls, Breitenprüfung im Browser.
- Zugängliche Gruppennamen: explizite Beschriftung mit Abstand zwischen Titel/Anzahl.

Die bisherigen acht Testdateien mit 82 Tests bleiben unverändert. Neue Agenda-Regressionen ergänzen sie. Browserselektoren wurden an Zeilen/aufklappbare Gruppen angepasst; Netzwerk-, Altpfad-, Noten-, Profil- und Datenschutzprüfungen bleiben erhalten.

.team-chat-room ist Verbindungsmetadatum, kein Quellcode: nur in der neuen Kopie ausgeschlossen; im Original unverändert erhalten. Keine Daten/Änderungen anderer Teammitglieder überschrieben. [Nachweise](VALIDATION.md).

## Zusätzliche finale Home-Integration

39e690f50f56db00a263337f8904e93fdcdf1563 nach erneuter Remote-Prüfung ohne weitere Nachfolgecommits integriert. Fünf weitere Änderungspositionen (App, entfernte Remote-Agenda, Home, bits, subjectColor) sind in PHASE2_REMOTE_REVIEW.md mit Funktionserhalt und Konfliktlösung dokumentiert. Die vorherigen 13 Agenda-Positionen bleiben als Herkunftsnachweis erhalten. Home und Account wurden nach der Zusammenführung erneut geprüft; Ergebnisse in FINAL_INTEGRATION_REPORT.md.
