# Sicherheitsgrenzen der lokalen Phase 2

Stand: 27. November 2026. Nur fiktive lokale Entwicklung. Lokale Auth-/RLS-/API-Abnahme einschließlich echter Tokenablaufprüfung erfolgreich; keine Produktions- oder Rechtskonformitätsbehauptung.

## Erhaltene Grenzen

Google, Lyceum und Apple bleiben abgeschaltet. Alte Lyceum-APIs liefern 410 ohne Passwortverarbeitung. Offline-Demo ohne neue Auth-/Provideranfragen, externe Fonts/Frames oder aktive Materiallinks. Getrennte validierte Demo-Speicher, gezielte Löschung und Noten-/Formelvalidierung bleiben erhalten. Demo-Profile sind keine Zugriffskontrolle.

## Infrastruktur und Netz

WSL, Neustart, Docker und Supabase-Container wurden nach getrennten ausdrücklichen Freigaben eingerichtet. Docker-Installer: offizielle Prüfsumme und gültige Docker-Inc-Signatur bestätigt. Ein echter Linux-Container lief erfolgreich.

Fünf Supabase-Dienste veröffentlichen ausschließlich Loopback-Ports 54321/54322/54324. Ein projektgebundener Windows-/CLI-Proxy erzwingt explizite Hostbindungen; tatsächliche Docker-Bindungen werden kontrolliert. Keine Daemon-, BIOS- oder dauerhafte Windows-Speicherkonfiguration geändert. Keine neuen Schulverbindungen oder produktiven Cloudressourcen. Weitere Installationen/Systemänderungen/Neustarts bleiben freigabepflichtig.

Studio, Storage, Realtime, Edge Runtime und Analytics sind aus. 353,68 MiB Container-RAM in der abschließenden Stichprobe schließen WSL-/Docker-/Windows-Overhead aus und sind kein garantierter Maximalverbrauch.

## Identität, Sitzungen und API

- Supabase übernimmt Passwortprüfung, keine eigene Passwortkryptografie. Account-Oberfläche erlaubt nur fiktive .test-Adressen.
- Tokens bleiben im begrenzten Server-Arbeitsspeicher. Browser erhält eine undurchsichtige HttpOnly-/SameSiteStrict-Kennung, keine JWTs im Browserstorage.
- Rotation bei Login, maximal acht Stunden, 30 Minuten Inaktivität, serialisierter Refresh. Serverneustart beendet lokale Sitzungen.
- Origin/Host/CSRF und erwartete Nutzer-ID binden Aktionen an geprüfte Identität. Ein Nutzer-ID-Header allein gewährt keine Rechte.
- Normale DB-Zugriffe verwenden öffentlichen Schlüssel und geprüften Nutzer-JWT. Kein Service-Schlüssel im Server-Referenzablauf oder Frontend.
- Strikte Zod-Eingaben, Owner vom Server, Bodylimit 20 KiB, maximal 100 Aufgaben je Liste, Feld-/Zeitlimits und lokaler Rate-Limiter.
- Logs enthalten Request-ID, grobes Routenmuster, Status/Dauer; keine Bodies, E-Mails, Noten, IPs, Cookies oder Tokens.

Reale Registrierung, Login, Refresh, Aufgaben-CRUD, A/B-Isolation, anonyme Verweigerung und Logout wurden im ersten API-Lauf mit acht Untertests geprüft. Der vollständige reale Lauf mit 26 gezählten Tests ist erfolgreich beendet.

## RLS, Constraints und Ablaufzeit

Migration angewendet; acht Tabellen mit RLS und Eigentümerpaar-FKs. UPDATE mit USING/WITH CHECK. Keine Autorisierung aus veränderbaren user_metadata. Privater Session-Lookup prüft eigene Auth-Sitzung, exp und not_after. SECURITY DEFINER nur für diesen Lookup und Profiltrigger, fixer leerer search_path und eingeschränkte Grants.

PostgREST 16 erlaubt 30 Sekunden Uhrtoleranz. Zusätzliche RLS prüft exp strenger. Der korrigierte echte Test fordert daher bei exp + 2 Sekunden keinen Daten-/Schreibzugriff und nach exp + 32 Sekunden Data-API-401 und Auth-Ablehnung. Der vollständige Wiederholungslauf bestand, einschließlich der tatsächlichen exp-/Clock-Skew-Grenzen. [Primärquelle](https://docs.postgrest.org/en/v16/references/auth.html#jwt-claims-validation).

Fixture-Servicekey nur für Kontoanlage/Cleanup und getrennte tatsächliche Löschkontrolle. Reguläre A/B-/anon-Zugriffe umgehen RLS nicht. Der Launcher übernimmt Schlüssel nur im Arbeitsspeicher; keine manuelle Kopie privilegierter Schlüssel.

## Logout und Ausfälle

Server und UI entfernen lokale geschützte Sitzung/Daten vor dem Upstream-Widerruf. Scheitert dieser, meldet die API 503 LOGOUT_REVOCATION_UNCONFIRMED. Kein fälschlich erfolgreicher Widerruf; Hintergrund-Widerrufsqueue fehlt. Direkter Datenzugriff nach echtem Logout wurde im Erstlauf verweigert. [Supabase-Sitzungen](https://supabase.com/docs/guides/auth/sessions).

## Vor Produktion und echten Daten offen

Lokales HTTP-Cookie ohne Secure, kein Produktionsbetrieb. HTTPS, produktive Geheimnisverwaltung, dauerhafter/mehrinstanzfähiger Sessionstore, verteilte Limits, Backup/Restore und Vorfallprozess separat entwerfen und prüfen. Entwicklungs-CSP erlaubt noch Inline-Skripte/-Styles für Vite/Motion. Keine vollständige Last-, Accessibility-, Darkmode- oder Geräteprüfung.

Vor echten Schülerdaten: Verantwortliche/Kontakt, Zwecke/Datenflüsse, Anbieter/Regionen, Rechte, Aufbewahrung/Löschung einschließlich Backups und Betroffenenrechte festlegen und testen. LGPD-/Minderjährigenschutz mit geeigneten Erwachsenen und Datenschutzfachleuten klären. ANPD betont das im Einzelfall vorrangige Kindeswohl; keine pauschale Rechtskonformität. [ANPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes).

Die neue Änderung benötigt menschliches Teamreview. Commit, Push, Veröffentlichung und kostenpflichtige Dienste bleiben gesondert freizugeben. [Nachweise](VALIDATION.md), [Start](START_HERE.md).

## Erhalt bei abschließender Home-Integration

Der Home-Umbau aus origin/main 39e690f50f56db00a263337f8904e93fdcdf1563 ist integriert. Bestehende Fristuhr, Aufgaben-/Datumsregeln, Kalender, Filter, Notizen, getrennte Demo-Profile und gesperrte Provider werden wiederverwendet. Keine Backend-/SQL-Änderung und kein Datenreset für den Designwechsel. Fachfarben ergänzen Text, Animationen berücksichtigen reduzierte Bewegung; keine neuen externen Materiallinks. Die erneuten realen Auth-/RLS-/API- und Browserläufe bestanden.

scripts/configure-local-api.ts serialisiert ausschließlich validierte lokale öffentliche Konfiguration. Service-Schlüssel werden ignoriert; bestehende .env.local bleibt unverändert, neue Datei wird exklusiv mit wx angelegt. Keine Schlüsselwerte in Konsole oder Berichten. Drei zusätzliche Regressionen sichern diesen Weg. Ein öffentlicher Schlüssel ersetzt weder Auth noch RLS.

Begrenzte Quellreviews meldeten keine offenen P1-/P2-Befunde. Menschliches Review und Produktionsfreigabe bleiben offen. Commit-Planung mit aktuellem origin/main ist keine ausgeführte Commit-/Push-Freigabe.

Die abschließende Suche nach den fünf tatsächlich verwendeten lokalen Schlüsselwerten fand keinen Treffer im ausgewählten Quellstand und in sieben Builddateien. Die Werte wurden nur aus dem lokalen CLI-Status im Arbeitsspeicher übernommen; das Protokoll artifacts/final-integration/secret-scan.json enthält keine Schlüsselwerte. Dies ist eine gezielte Prüfung des geprüften Endstands, kein allgemeiner Geheimnisfreiheitsnachweis.
