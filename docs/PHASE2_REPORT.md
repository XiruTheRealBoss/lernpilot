# LernPilot – finale Home-Integration und Phase 2

Stand: 27. November 2026. **Abnahmestatus: PHASE 2 LOKAL ABGESCHLOSSEN.** Der neueste Home-Umbau von origin/main, das erhaltene Fundament, lokaler Stack, angewendete Migration, echte Authentifizierung, RLS einschließlich Tokenablauf sowie API- und Browser-Datenfluss sind gemeinsam erfolgreich geprüft. Dies ist keine Produktions- oder Echtdatenfreigabe.

## Freigaben und unveränderte Grenzen

Der Projektinitiator bestätigte menschliches Phase-1-Review, Supabase/PostgreSQL und Agenda-Zusammenführung. Dies sind seine Angaben; zusätzliche Nachweise wurden nicht erfunden. React/Vite bleibt, Gmail ausgeschlossen. Projektpakete, WSL-Installation, Windows-Neustart, Docker und zuletzt Supabase-Downloads/lokaler Start wurden jeweils ausdrücklich freigegeben.

Keine echten Schülerdaten, produktiven Schulverbindungen, kostenpflichtigen Dienste oder Cloudprojekte. Kein Commit, Push, GitHub-Merge, Reset/Clean oder Deployment. Das menschliche Review der neuen kombinierten Änderung ist weiterhin ausstehend.

## Arbeitsstand, Integration und Sicherung

Arbeitskopie: C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-integration. Branch: feat/integration-core-infrastructure. Originalcheckout lernpilot-app bleibt erhalten. Lokale Basis: 9fe50000bda4282a26adc0ce70580357930dbbb2; fachlich integrierte Agenda: 535b8ead0ff0f03e2a101ba699aaaaaac5ce7198. Die Eingangsprüfung fand keine neuen nächtlichen Commits gegenüber dem bekannten Agenda-Stand; keine dauerhafte Überwachung behauptet.

Der erneut geprüfte neueste Stand von origin/main ist 39e690f50f56db00a263337f8904e93fdcdf1563, Commit „Home de estudo: dashboard editorial em vez de lista“. Keine weiteren Remote-Commits beim letzten Abgleich. Der neue Home-Umbau wurde jetzt fachlich in den bestehenden Arbeitsbaum integriert und gemeinsam mit dem erhaltenen Phase-2-Fundament geprüft. App verwendet Home; bestehende Agenda-Bausteine für Aufgabenzeilen, Uhr und Kalender bleiben erhalten. Kein Git-Merge-Commit und kein Push. [Remote-/Konfliktauflösung](PHASE2_REMOTE_REVIEW.md).

Home ist jetzt die Hauptansicht mit Wochenleiste, Tagesfortschritt, Fokusaufgabe, nächster Prüfung und stabilen Fachfarben. Kalender, Kurs-/Statusfilter, vollständige spätere/undatierte/erledigte Aufgaben, Notizen, getrennte Demo-Profile, Notenengine/-demo, Prüfungsplanung, Lehrkraftprofile und sichere Ankündigungen bleiben. Die geprüfte Aufgaben-/Datumslogik und Agenda-TaskRow/Uhr/Kalender wurden wiederverwendet; weder Backend noch SQL mussten für den Designwechsel ersetzt werden. Keine Providerreaktivierung, externen Fonts oder Portaliframes. Die frühere Agenda-Integration ist in [INTEGRATION_RESOLUTION](INTEGRATION_RESOLUTION.md), der abschließende Home-Abgleich in [PHASE2_REMOTE_REVIEW](PHASE2_REMOTE_REVIEW.md) dokumentiert. Alte Dashboard-Komponenten bleiben vorläufig für vorhandene Regressionen erhalten; keine vollständige Neuentwicklung.

Geprüfte Archive im übergeordneten backups-Ordner erhalten die Phase-1-/Phase-1.5-Quellen und früheren Integrationsstände. Der unmittelbar vor der neuen Home-Integration gesicherte Phase-2-Stand wurde nochmals in ein frisches Verzeichnis wiederhergestellt und mit allen 136/136 Dateihashes bestätigt. Der neue kombinierte Stand erhält das separate Archiv ../backups/final-home-integration-2026-11-27/source.zip; dessen verification.json ist für endgültige Dateianzahl, Archivhash und Wiederherstellung maßgeblich. Keine .git-Historie, Abhängigkeiten, Builds oder lokalen Geheimnisse im Quellarchiv. [Dateiinventar](PHASE2_FILE_INVENTORY.md), [Commit-Plan](PHASE2_COMMIT_PLAN.md). Eine Quellsicherung ist kein Datenbank-Backup-/Restore-Nachweis.

## Infrastruktur und lokale Zielarchitektur

WSL-Paket 3.0.5.0 mit Betriebsart WSL 2, genehmigter Neustart nachgewiesen. Docker Desktop 4.100.1 / Engine 29.9.3; offizieller Installer mit übereinstimmender SHA-256 und gültiger Docker-Inc-Signatur. Echter lokaler Linux-Containertest Exit 0, Kernel 6.18.58.1-microsoft-standard-WSL2.

Supabase CLI 3.4.0 und reduzierte config.jsonc: fünf Dienste für PostgreSQL, Auth, REST, Gateway und lokale Mailerfassung. Studio, Storage, Realtime, Edge Runtime und Analytics aus. Verifizierte Loopback-Ports: API 127.0.0.1:54321, PostgreSQL 127.0.0.1:54322, Mailerfassung 127.0.0.1:54324. Studio 54323 ist nicht aktiv.

Eine Windows-/CLI-Eigenheit erforderte einen projektgebundenen Proxy für explizite Docker-Loopback-Portbindungen. Der vorhandene Windows-C#-Compiler wird verwendet; keine zusätzlichen Pakete, Daemon- oder Windows-Konfiguration. Tatsächliche Veröffentlichungen werden nach Start geprüft. Vierzehn Infrastrukturregressionen sichern diese Grenze und den neuen öffentlichen Konfigurationsserializer. Die fünf Container verbrauchten in der abschließenden Stichprobe zusammen 353,68 MiB, ohne WSL-/Docker-/Windows-Overhead; kein garantierter Maximalwert. Keine dauerhaften Speicherlimits gesetzt. Abschließend waren 3,71 GiB von 15,74 GiB RAM sowie 272,36 GiB auf C: frei.

React/Vite/TypeScript/Tailwind/Motion/Zustand bleiben. Nativer Node-HTTP-Server, Zod-Verträge und Supabase SDK bilden das gemeinsame Fundament. /?demo lädt nur synthetische lokale Profile; /account die lokale Account-Oberfläche und same-origin API. Der neue Helfer scripts/configure-local-api.ts erstellt ausschließlich validierte öffentliche lokale API-Konfiguration, druckt keinen Schlüssel und überschreibt eine bestehende .env.local nicht (exklusives wx-Schreiben). Drei neue Regressionen prüfen den Serializer und seine Abweisungen. Kein Provider-JWT oder privilegierter Schlüssel im Browser. Reguläre DB-Zugriffe erhalten den Nutzer-JWT bis RLS. [Architektur](ARCHITECTURE.md).

## Tatsächlich angewendetes Datenmodell

Migration supabase/migrations/20261127125248_core_infrastructure.sql angewendet; acht öffentliche Tabellen vorhanden und RLS aktiviert:

| Tabelle | Zweck |
| --- | --- |
| profiles | Auth-ID, optionaler Anzeigename |
| subjects | Eigene Fächer |
| school_periods | Eigene gültige Datumszeiträume |
| grade_entries | Fach/Zeitraum, Wert/Skala/Gewicht, Tag und Herkunft |
| tasks | Eigene manuelle Aufgaben, optionale Fach-/Zeitraumbezüge und UTC-Fristen |
| calendar_events | UTC-Anfang/Ende plus IANA-Zeitzone |
| exams | Eigene Prüfungen mit reinem Datum |
| user_settings | Minimale persönliche Einstellungen |

Owner-FKs verhindern fremde Fach-/Zeitraumbeziehungen. Constraints prüfen Textgrößen, Skalen/Gewichte, Zeiträume, Zeitzonen, Herkunft, NaN und unendliche Zeitwerte. Reine Datumsangaben und absolute UTC-Zeitpunkte bleiben getrennt. Keine schulische Berechnungsregel wird dadurch bestätigt.

RLS verlangt Eigentümer und aktive, nicht anonyme Auth-Sitzung. UPDATE hat USING/WITH CHECK. Enger privater Session-Lookup und Profiltrigger mit festem leerem search_path und begrenzten Grants; keine Autorisierung aus user_metadata. [Details](DATABASE_SCHEMA.md).

## Reale Authentifizierung, Sitzungen und API

Acht echte API-Untertests bestanden: Registrierung, Login, Cookie-/CSRF-Rotation, eigener Task-CRUD, A/B-Isolation, anonyme Ablehnung, veraltete Tab-Identität, tatsächlicher Supabase-Refresh und Logout. Kein Auth-/DB-Mock. Zwei zusätzliche echte Account-Browserfälle auf Desktop/Mobil bestanden.

HttpOnly/SameSiteStrict-Cookie, begrenzter In-Memory-Store, Rotation bei Login, acht Stunden absolut/30 Minuten inaktiv, serialisierter Refresh. Serverneustart verwirft Sitzungen. Lokal HTTP, kein produktiver HTTPS-/Mehrinstanzbetrieb. Logout entfernt lokale Sitzung/Cookie vor Upstream-Widerruf; Fehler wird 503 LOGOUT_REVOCATION_UNCONFIRMED, nicht als erfolgreicher Widerruf ausgegeben. Hintergrund-Widerrufsqueue fehlt.

| API unter /api/v1 | Funktion |
| --- | --- |
| GET /auth/csrf | Voranmeldesitzung/CSRF |
| POST /auth/register und /auth/login | Fiktive .test-Konten |
| GET /auth/me | Geprüfte Sitzung/Identität |
| POST /auth/logout | Lokale Abmeldung/Providerwiderruf |
| GET/POST /tasks | Eigene Aufgaben lesen/anlegen |
| PATCH/DELETE /tasks/:id | Eigene Aufgabe ändern/löschen |

Erfolg: {data:…}; Fehler: {error:{code,message,requestId}}. Owner kommt vom Server, unbekannte Felder werden abgewiesen. X-Lernpilot-User-Id ist Zusatzabgleich mit geprüfter Identität, keine eigene Berechtigung. Origin/Host/CSRF, Größen-/Mengen-/Zeitlimits, lokaler Rate-Limiter und datensparsame Logs. Alte Lyceum-APIs bleiben 410.

## Abschließende Prüfungen und korrigierter Erstfehler

Abschließend bestanden: 110 Frontend-/Fachtests in zwölf Dateien (bisherige 99 plus elf Home-Regressionen), 26 Fakeanbieter-HTTP-Tests, zehn Demo-/Home-/Altpfad-/Accountgrenzen-Browserfälle und zwei reale Account-Browserfälle sowie 14 Infrastrukturprüfungen. Lint, Typecheck und beide Builds bestanden; npm audit meldete null bekannte Schwachstellen. Datenbank-Lint für public/private und Security-Advisors mit Warnungsschwelle bestanden ohne Befund. [Nachweise](VALIDATION.md).

Der echte API-Referenzlauf mit acht Untertests bestand. In der direkten RLS-Suite bestanden zunächst 15 Untertests; allein der letzte Ablaufzeitfall erwartete bei exp + 2 Sekunden fälschlich schon einen HTTP-Fehler. PostgREST 16 erlaubt 30 Sekunden Uhrtoleranz. Test korrigiert, keine RLS-/Tokenregel gelockert: vorher lesbare Sentinel-Aufgabe, bei exp + 2 Sekunden kein Daten-/Schreibzugriff durch strengere RLS, bei exp + 32 Sekunden echte Data-API-401 und Auth-Ablehnung. Der korrigierte echte Gesamtlauf bestand vollständig: 26/26 gezählte Tests (acht API- und 16 RLS-Untertests plus zwei Elterntests), null Fehler oder Skips, 341,15 Sekunden. Der echte Ablaufzeitfall bestand nach 332,26 Sekunden. [Primärquelle](https://docs.postgrest.org/en/v16/references/auth.html#jwt-claims-validation).

Fixture-Servicekey nur für Kontoanlage/Cleanup und getrennte tatsächliche Löschkontrolle. Normale Zugriffe Publickey+A/B-JWT oder anonym. Launcher npm run test:database und npm run test:browser:local übernehmen Schlüssel ausschließlich im Arbeitsspeicher; keine manuelle Kopie privilegierter Schlüssel.

## Risiken, Team und Start

Die lokale Phase-2-Abnahme ist erfolgreich. Der letzte DB-Endzustand bestätigt die angewendete Migration, RLS auf allen acht Tabellen und null Auth-Benutzer nach Testbereinigung. Der neue Remote-Home-Umbau ist jetzt Bestandteil der abschließend geprüften lokalen Fassung. Backend und Migration wurden dafür nicht geändert. Weiterhin keine Produktionsfreigabe: lokales HTTP, In-Memory-Sitzungen, Entwicklungs-CSP, keine Last-/Mehrinstanz-/DB-Backup-/Restoreprüfung, offene Aufbewahrung/Löschung und organisatorische LGPD-/Minderjährigenschutzfragen. Keine bestätigte Schulformel oder vollständige Rechtskonformität. Neues menschliches Review, Commit, Push und Veröffentlichung bleiben gesondert freizugeben.

Projektinitiator: Noten/Fächer/Zeiträume, bestätigte Gewichte/Skalen, später PDF/Lyceum/Prüfungsgenerator. Icaro: manuelle Hub-Aufgaben/Termine, später erlaubte Provider/Tutor. Kitaday: Designsystem und zugängliche responsive UI. Analytics: Projektinitiator+Icaro. Gemeinsame Identität, Verträge, RLS/Datenlebenszyklus: alle. Keine zweite Auth-Lösung je Modul.

Spezialisierte KI-Agenten unterstützten Agenda, DB/RLS, Auth/API und Review; der Hauptagent bleibt verantwortlich. KI-Review ersetzt kein menschliches Review. Exakte Start-/Stoppanleitung: [START_HERE](START_HERE.md).


## Abschließende gemeinsame Prüfung

Der Hauptagent hat Home-Desktop und Home-Mobil sowie die reale Account-Darstellung visuell geprüft; in den betrachteten Ansichten kein blockierender Überlauf. Begrenzte Quellreviews durch Hauptagent und Spezialagent meldeten keine offenen P1-/P2-Befunde; dies ist kein vollständiges Sicherheitszertifikat. Die zehn regulären Browserfälle bestanden in 50,3 Sekunden, die zwei echten Account-Fälle zusätzlich in 20,693 Sekunden. Aktuelle Rohprotokolle liegen unter artifacts/final-integration.

Die vorbereitete Commit-Auswahl soll direkt auf aktuellem origin/main 39e690f50f56db00a263337f8904e93fdcdf1563 aufbauen. Bis zur ausdrücklichen Freigabe werden HEAD, tatsächlicher Index und GitHub nicht für Commit/Push verändert. Siehe [Commit-Plan](PHASE2_COMMIT_PLAN.md), [PR-Entwurf](PHASE2_PR_DRAFT.md), [Teamarbeit](TEAM_DEVELOPMENT.md) und [finalen Integrationsbericht](FINAL_INTEGRATION_REPORT.md). Menschliches Review der finalen Änderung bleibt offen.
