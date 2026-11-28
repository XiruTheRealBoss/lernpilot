# Phase 2 – Abnahmestand und nächste Schritte

Stand: 27. November 2026. Phase 2 ist lokal technisch abgeschlossen. Ausgeführte Nachweise und Grenzen stehen in PHASE2_REPORT.md und VALIDATION.md.

Erledigt: ursprüngliche Foundation erhalten, Agenda integriert, gemeinsame Verträge/Node-API/Account-Frontend geschaffen, reduzierte Supabase-Konfiguration, Migration mit acht geschützten Tabellen angewendet. WSL, Neustart, Docker, Image-Downloads und Stackstart wurden jeweils ausdrücklich genehmigt. Keine wiederholte Installation bei Wiederaufnahme.

Abnahme: echte Registrierung/Anmeldung/Refresh/Logout, Datenbank-Constraints, A/B-/anonyme RLS-Zugriffe, Benutzer-Fremdschlüssel, Tokenablauf, Kontolöschung und Browser→API→Datenbank bestätigt. Bestehende 99 Frontend-, 26 HTTP- und acht Browserprüfungen erhalten und erneut bestanden. Nach der Home-Integration insgesamt 110 Frontend-, zehn Demo-/Home-Browser-, zwei echte Account-Browser- und 14 Infrastrukturtests bestanden.

Zusätzlich abgeschlossen: Home aus main 39e690f mit vorhandener Geschäftslogik verbunden; vollständige Qualitätsprüfung erneut ausgeführt. Siehe FINAL_INTEGRATION_REPORT.md.

Noch offen: menschliches Review der kombinierten Änderung, ausdrückliche Zustimmung zu lokalem Commit und anschließend separat zum Feature-Branch-Push. Kein automatischer Merge.

Phase 3: manuelles Noten-Center und Aufgaben/Termine auf gemeinsamem Fundament; Projektinitiator verantwortet Noten, Icaro Hub und Tutor, Kitaday UI/Design, Analytics gemeinsam. DTOs, RLS, Datum-/Zeitzonenregeln und Datenlöschung gemeinsam reviewen. Keine zweite Auth-/Speicherlösung pro Modul.

Nicht freigegeben: echte Schülerdaten, Schulverbindungen, OAuth, Gmail, KI-Datenweitergabe, produktive Bereitstellung, kostenpflichtige Dienste oder weitere Systemänderungen. Neue Installation und Neustart benötigen vorher ausdrücklich Zustimmung.
