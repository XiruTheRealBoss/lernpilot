# Lokales PostgreSQL-Datenmodell

Stand: 27. November 2026. Migration supabase/migrations/20261127125248_core_infrastructure.sql tatsächlich lokal angewendet; acht Tabellen mit RLS nachgewiesen. **Vollständiger korrigierter RLS-Wiederholungslauf erfolgreich: 16 RLS-Untertests, zusätzlich acht reale API-Untertests; insgesamt 26 gezählte Tests inklusive Elterntests, null Fehler/Skips.**

Die Migration wurde mit CLI 3.4.0 versioniert erzeugt. Kein Cloudprojekt, keine echte Schule oder produktiven Schülerdaten. Eine Schultabelle ist für die derzeit persönliche MVP-Autorisierung nicht erforderlich.

## Tabellen und Datentypen

| Tabelle | Schlüssel, Inhalt und Eigentum |
| --- | --- |
| profiles | id = auth.users.id, optionaler Anzeigename, Auditzeitpunkte; keine zusätzliche E-Mail, Schule oder Rolle |
| subjects | UUID, owner_id, begrenzter Name, eindeutiges Eigentümer-/ID-Paar |
| school_periods | UUID, owner_id, Bezeichnung und gültiger Anfang/Ende als date |
| grade_entries | UUID, Owner/Fach/optionaler Zeitraum, Bezeichnung, Dezimalwert/Skala/Gewicht, recorded_on, Herkunft |
| tasks | UUID, Owner/optionales Fach/optionaler Zeitraum, Titel/Beschreibung, UTC-Frist/Erledigung; API nur manuell |
| calendar_events | UUID, Owner/optionales Fach, Titel, UTC-Anfang/Ende und IANA-Zeitzone |
| exams | UUID, Owner/optionales Fach/optionaler Zeitraum, Titel, reines Prüfungsdatum |
| user_settings | owner_id als Primärschlüssel, Sprache und IANA-Zeitzone |

Fachtabellen referenzieren profiles mit ON DELETE CASCADE. Owner-Paar-FKs verhindern fremde Fach-/Zeitraumverweise auch mit eigener Owner-ID. Referenzierte Fächer/Zeiträume sind nicht still löschbar (aufschiebbares NO ACTION). Kontoentfernung löscht eigene Daten; andere Konten bleiben erhalten.

Begrenzte Texte, NOT NULL, gültige Zeiträume und endliche Audit-/Fachzeitpunkte. PostgreSQL-NaN und infinity/-infinity ausdrücklich berücksichtigt. Noten verwenden exakte Dezimalzahlen innerhalb expliziter Skala und optional positive Gewichte. Keine erfundene Schulskala, Semesteranzahl oder Rundung. Herkunft manual/imported/calculated/simulated ist keine amtliche Bestätigung oder tatsächliche Providerintegration.

date bedeutet reinen Schulkalendertag, timestamptz absoluten Zeitpunkt. Kalender bewahrt IANA-Zeitzone, validiert gegen pg_timezone_names. Die UI darf aus Datumswerten keine erfundene UTC-Uhrzeit machen. Owner-/ID-Indizes für FK/RLS; weitere Indizes für Aufgabenfälligkeit, Kalenderbeginn und Prüfungstag. Keine Zukunftstabellen für KI/Analytics/Provider.

## Zugriffsregeln

RLS auf allen acht öffentlichen Tabellen. anon ohne Tabellenrechte; authenticated nur benötigte Operationen mit Eigentümerregeln. UPDATE mit USING/WITH CHECK. Profile entstehen per Auth-Trigger; normale Clients dürfen eigenes Profil lesen und Anzeigenamen ändern, keine Profile anlegen/löschen oder IDs vergeben.

Jede Regel verlangt eine aktive, signierte, nicht anonyme Auth-Sitzung. private.has_active_session() prüft eigenen session_id-/user_id-Bezug in auth.sessions, exp und not_after. Ein nach Logout widerrufenes JWT genügt nicht mehr trotz zunächst gültiger Signatur.

Nur enger privater Lookup und Auth-Profiltrigger verwenden SECURITY DEFINER: leerer fester search_path, qualifizierte Objekte, kein dynamisches Nutzer-SQL, eingeschränkte EXECUTE-Rechte. Keine Autorisierung aus user_metadata; private nicht über die Data API exponiert.

## Reale Nachweise und Ablaufzeit

Erster echter API-Lauf mit acht Untertests bestanden. Die direkte RLS-Suite bestätigte zunächst Profile, sieben Fach-/Einstellungstabellen, fremde/anonyme Verweigerung, Owner-/FK-Manipulation, Constraints, NaN/unendliche Zeiten, Elternlöschung, ungültiges JWT, direkten Logout-Widerruf und Kontolöschung.

Die getrennte privilegierte Cleanup-Kontrolle zählt verbliebene Fixture-Zeilen aller acht Tabellen. Dies ist ein Lösch-, kein RLS-Nachweis. Normale Zugriffstests verwenden Publickey und A/B-JWTs.

Der erste Ablaufzeit-Test verlangte bei exp + 2 Sekunden zu früh einen HTTP-JWT-Fehler. PostgREST 16 gestattet 30 Sekunden Uhrtoleranz. Korrigiert: vorher lesbare Sentinel-Aufgabe; bei exp + 2 Sekunden keine Daten/erfolgreichen Mutationen durch strengere RLS; nach exp + 32 Sekunden Data-API-401 und Auth-Ablehnung. Keine RLS-/JWT-Regel gelockert. Der vollständige Wiederholungslauf bestand; der echte Ablaufzeitfall dauerte 332,50 Sekunden. [Zeitclaims-Dokumentation](https://docs.postgrest.org/en/v16/references/auth.html#jwt-claims-validation).

## Betrieb

Reduzierter Stack mit PostgreSQL 17, Auth, REST/Gateway und lokaler Mailerfassung. Studio/Storage/Realtime/Edge/Analytics aus. jwt_expiry=300, Rotation aktiv, anonyme Anmeldung und lokale Bestätigungsmails aus. Loopback-Bindungen 54321/54322/54324 geprüft. Container-RAM Stichprobe rund 323 MiB ohne WSL-/Docker-/Windows-Overhead.

npm run test:database startet echte API-/RLS-Tests, npm run test:browser:local reale Browserfälle. Launcher übernehmen Schlüssel ausschließlich im Arbeitsspeicher. Kein manueller privilegierter Schlüsselimport nötig. Seeds getrennt, nicht automatisch.

Abschließende Datenbankkontrolle: Migration 20261127125248 angewendet, alle acht Tabellen mit RLS und auth.users = 0 nach der Testbereinigung. Keine DB-Backup-/Restore-, Last-/Mehrinstanz- oder Produktionsfreigabe. [Testanleitung](../tests/database/README.md), [Prüfstatus](VALIDATION.md), [Start](START_HERE.md).
