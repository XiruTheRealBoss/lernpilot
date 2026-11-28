# Phase 1.5 – Konfliktmatrix und Zusammenführungsempfehlung

Stand: 26. November 2026. **Nur Analyse und Vorbereitung; kein Merge, Rebase, Commit, Push oder Codeumbau ausgeführt.**

## Prüfbasis und Umfang

- Gemeinsamer Basiscommit: `9fe50000bda4282a26adc0ce70580357930dbbb2`.
- Lokal: Branch `feat/security-quality-foundation`, derselbe HEAD, mit den uncommitteten Phase-1-/Preflight-Dateien.
- Remote geprüft: `535b8ead0ff0f03e2a101ba699aaaaaac5ce7198`.
- Seit der Basis genau ein Commit: „Redesenha a UI: agenda editorial, mais intuitiva“, Autoraccount XiruTheRealBoss.
- Vollständiger Vergleich: **13 Dateien: 5 geändert, 7 entfernt, 1 hinzugefügt**. **11 Dateien überschneiden sich mit lokalen Änderungen**.
- Alle sechs am Remote-HEAD vorhandenen hinzugefügten/geänderten Dateien vollständig gelesen; die sieben entfernten Dateien vollständig über ihren Löschdiff und die lokalen Weiterentwicklungen verglichen.
- Keine Live-Verbindung zu Schule/Google aufgerufen und keine Remote-Anwendung gestartet.

[Commit](https://github.com/XiruTheRealBoss/lernpilot/commit/535b8ead0ff0f03e2a101ba699aaaaaac5ce7198) · [vollständiger Vergleich](https://github.com/XiruTheRealBoss/lernpilot/compare/9fe50000bda4282a26adc0ce70580357930dbbb2...535b8ead0ff0f03e2a101ba699aaaaaac5ce7198)

GitHub wurde über den Connector ausschließlich gelesen; lokale Remoterefs wurden nicht per fetch aktualisiert. Die Angabe „Remote“ bezeichnet hier den gelesenen GitHub-main-Stand, nicht eine neu geschriebene lokale origin/main-Referenz.

## Wichtigste Empfehlung

Die neue Agenda ist die geeignete **Darstellung**, während Phase 1 die weiterzuverwendende **Sicherheits- und Fachgrundlage** liefert. Deshalb nicht pauschal „lokal“ oder „remote“ für komplette Dateien wählen.

Die neue Darstellung in einem später ausdrücklich beauftragten Integrationsschritt an die bestehenden sicheren Stores, reinen Aufgabenregeln und abgeschalteten Schnittstellen anbinden. Kalender, Statusfilter und Notizen nicht stillschweigend verlieren. Alte Komponenten erst entfernen, wenn Verhalten, Referenzen und Tests nachweislich übernommen sind.

Das ist eine Empfehlung zur Teamentscheidung, keine bereits implementierte oder menschlich bestätigte Zusammenführung.

## A. Alle elf überschneidenden Dateien

Zeilenangaben „lokal“ beziehen sich auf den gesicherten Arbeitsstand; „remote“ auf den oben genannten unveränderlichen Commit. Bei entfernten Dateien gibt es am Remote-HEAD keine Zeilennummern.

| Datei | Remote-Änderung | Lokale Phase-1-Arbeit / Konflikt | Konkrete Empfehlung | Prüfbedingung vor späterer Entfernung/Übernahme |
| --- | --- | --- | --- | --- |
| `index.html` | Fraunces ergänzt; externe Google-Font-Verbindungen bleiben (remote 8–13) | Lokale CSP/Referrer-Metadaten und Entfernung sämtlicher externer Fontlinks (lokal 7–8) | Lokale Sicherheitsmetadaten erhalten. Remote-Typografie über vorhandenen Georgia-Fallback oder später geprüfte selbst ausgelieferte Fontdateien umsetzen. Keine Google-Fonts-/preconnect-Zeilen zurückkopieren. | Netzwerkprüfung auch vor Interaktion; keine externen Fonts. Vite-Header und statische Meta-CSP erhalten. |
| `src/App.tsx` | Agenda ersetzt FilterBar/Dashboard/Mitteilungen; alte Hook-/Consent-/iframe-Flows bleiben (remote 27–58, 85–100) | Lokaler ausschließlich fiktiver Einstieg, Profilwahl, vereinfachter Header und GradeDemo (lokal 23–65) | Lokale App als sichere Integrationsbasis behalten. Nur Lições-Darstellung an eine angepasste Agenda übergeben: fiktive tasks/announcements/courses. Profilwahl, Banner, key-basierter Notendemo-Remount und Datenschutz erhalten. Kein alter OAuth-/iframe-Einstieg. | App kompiliert mit lokalem Header/Privacy; ohne ?demo ebenfalls offline; Profile A/B getrennt; Noten-Tab bleibt GradeDemo. |
| `src/components/Announcements/AnnouncementsList.tsx` | Entfernt; Mitteilungen in Agenda.Avisos integriert (remote Agenda 227–243) | Lokale Mitteilungsdarstellung entfernt externe Links und zeigt Datum (lokal 8–10, 32–39) | Avisos-Layout übernehmen, fiktive/offline Kennzeichnung und Datum erhalten. Keine anklickbaren Portal-Links im Demo. Bestehende Datei erst nach Entfernung aller Importe/Tests stilllegen. | Datum, React-Textausgabe und keine externen Linkaktionen; Lade-/Leerverhalten geklärt. |
| `src/components/Dashboard/Dashboard.tsx` | Entfernt, Agenda hat keine Kalenderansicht und keine Zeitaktualisierung | Lokaler Timer für Frist/Mitternacht/Fokus, Aktualisierung vor Statusfilter sowie vollständige Kalender-Ergänzung (lokal 18–63) | Zeitaktualisierung in wiederverwendbaren Hook/Container übernehmen; reine Regeln aus school-hub weiterverwenden. Wochenkalender als sekundäre Ansicht erhalten, solange das Team seine Entfernung nicht ausdrücklich beschließt. Agenda übernimmt die Hauptliste. | Fristwechsel ohne Refresh, Mitternacht, Filterwechsel und Kalender-Vollständigkeit bestehen auf der neuen Darstellung. |
| `src/components/Dashboard/DoneColumn.tsx` | Entfernt, Agenda hat einklappbares „Feitas“ (remote Agenda 58, 110–113) | Lokale Regel: vergangen bedeutet nicht erledigt; groupTasks.done (lokal 11–15) | Agenda „Feitas“ mit vorhandener done-Regel versorgen. Eingeklappte Darstellung und gesperrte Checkbox für extern abgegebene Aufgaben sind sinnvoll; keine überfälligen offenen Aufgaben als erledigt markieren. | Jede Aufgabe genau einmal; lokal erledigt / extern abgegeben / überfällig getrennt prüfen. |
| `src/components/Dashboard/UrgentColumn.tsx` | Entfernt; Agenda trennt Atrasadas/Hoje | Lokale gemeinsame Dringlichkeitsregeln und EmptyState, das andere Komponenten importieren (lokal 4, 13, 32–35) | Agenda-Abschnitte aus bereits aktualisiertem groupTasks.urgent aufteilen: urgency=overdue versus today. EmptyState vorher nach shared verschieben oder alle abhängigen Importe kontrolliert ersetzen. | Eine heute bereits abgelaufene Frist gehört zu Atrasadas; keine kaputten EmptyState-/LaterColumn-Importe. |
| `src/components/Dashboard/WeekColumn.tsx` | Entfernt; Agenda teilt Amanhã/Esta semana | Lokale Auswahl verwendet groupTasks.week (lokal 6, 15) | Aus der geprüften week-Gruppe morgen versus weitere nächste Tage ableiten; Datumssortierung erhalten. Für Kalender/Fristberechnung weiterhin zentrale Helfer benutzen. | Morgen, siebter Tag, späterer Tag und Sommerzeit-Grenzen verlässlich zugeordnet; kein doppelter Eintrag. |
| `src/components/Filters/FilterBar.tsx` | Entfernt; Agenda behält nur Kurs/Suche und überschreibt Status auf todos (remote Agenda 57, 77–96) | Lokaler Statusfilter einschließlich sem_data und Kalender-/Listenumschaltung; Auswahlzustände (lokal 8–13, 26–40, 54–90) | Kurs/Suche in Agenda-Stil übernehmen. Statusfilter und Kalenderwahl als weiterhin funktionierende Optionen erhalten oder deren Abbau explizit zur Entscheidung stellen. Filter immer auf frisch berechnete Statuswerte anwenden. Status-select dabei zugänglich benennen. | Filterstatus nicht heimlich ignoriert; Such-/Kurs-/Statuskombination, leeres Ergebnis und Fristwechsel mit aktivem Filter testen. |
| `src/components/Privacy/Privacy.tsx` | Nur ConsentGate-Typografie verändert (remote 71); alte Google-Imports/clear()-Löschung bleiben im Remote-Bestand | Lokale Demo-spezifische Erklärung und gezielte Profil-/Altdatenlöschung (lokal 1–23); ConsentGate bewusst nicht exportiert | Lokale Implementierung und Aussagen behalten. Gewünschte Fraunces-/editoriale Überschrift höchstens auf die vorhandene Erklärung übertragen. Kein ConsentGate oder alte Datenverarbeitungsbehauptungen allein wegen Typografie zurückbringen. | Löschen von A erhält B und fremde Browserdaten; keine SDK-/Netzwerkaufrufe und keine falsche Behauptung einer Einwilligungsprüfung. |
| `src/components/TaskCard/TaskCard.tsx` | Entfernt; TaskRow ersetzt Karte (remote Agenda 161–224) | Lokale sichere Materialtexte, offline Hinweis und Hinweis bei bereits heute abgelaufener Frist (lokal 48, 56–79) | TaskRow-Darstellung übernehmen, aber Linkaktionen als offline Texte belassen. Aktuelle Zeitwerte und verständliches Label „Prazo encerrado hoje“ übernehmen. Notizen für jede Aufgabe zugänglich machen, auch ohne Beschreibung/Material. Datei erst nach allen abhängigen Imports entfernen. | Notiz an leerer Aufgabe erstellen/wieder öffnen; vorhandene Notiz lesen; alle Collapse-/Checkboxaktionen per Tastatur; keine Portalnavigation. |
| `tailwind.config.ts` | Editoriale Palette, Fraunces/Georgia, neue Schatten | Lokal dunklere Statusfarben für Lesbarkeit (lokal 12,14), bisherige Typografie; reduzierte CSS-Bewegung separat in index.css | Kitadays neue Palette/Familie als Designvorschlag übernehmen, Kontraste je tatsächlichem Hintergrund prüfen. Local-Font-/Fallback-Regel mit index.html abstimmen. Bestehende reduzierte CSS-Bewegung nicht verlieren. | Kontrast, Mobilbreite, Dark Mode und reduced motion auf neuer Agenda prüfen; keine Font-Netzwerkanfrage. |

## B. Die zwei weiteren Remote-Dateien

| Datei | Umfang | Empfehlung |
| --- | --- | --- |
| `src/components/Agenda/Agenda.tsx` | Neue Datei, 243 Zeilen; deshalb kein zeilenweiser lokaler Dateikonflikt, aber zentrale funktionale Überschneidung | Darstellung und zugängliche einklappbare Abschnittsbuttons erhalten. Vor Nutzung Zeitlogik, Filter, Notizen, Linkaktionen und mobile Breite an Phase 1 anpassen; siehe folgende Befunde. Nicht unverändert zum neuen Sicherheitseinstieg erklären. |
| `src/components/Auth/LoginButton.tsx` | Nur Überschrift-Stil verändert; lokal seit Basis nicht verändert | Stiländerung kann als ungenutzte Komponente erhalten werden. Nicht in der aktuellen Demo einblenden und keine Google-Abhängigkeit/Provider reaktivieren. Eine spätere lokale Kontoanmeldung ist ein anderer Ablauf und nicht diese Google-Schaltfläche. |

## C. Funktionale Befunde in der neuen Agenda

Diese Befunde sind aus dem statischen Kontroll-/Datenfluss abgeleitet. Es wurden **keine Agenda-Laufzeit-, Browser-, Netzwerk- oder Merge-Tests** durchgeführt.

1. **Fristablauf innerhalb desselben Tages:** remote Agenda 21–36 und 149–157 verwenden nur Tagesdifferenzen. Eine um 11 Uhr fällige Aufgabe wird um 12 Uhr noch Heute statt Atrasadas genannt. Die geprüften lokalen getUrgencyLevel-/refreshTaskTimes-Regeln berücksichtigen die Uhrzeit. Lokale Regeln wiederverwenden.
2. **Kein Zeit-Tick:** Agenda importiert nur useState (remote 1); die Gruppierung wird bei Render berechnet, ohne Frist-/Mitternacht-/Fokusaktualisierung. Den lokalen Dashboard-Timer funktional übernehmen, nicht erst durch Nutzereingabe aktualisieren.
3. **Statusfilter wird übergangen:** applyFilters(..., {...filters, status:'todos'}) in remote 57 setzt einen bestehenden gespeicherten Statusfilter außer Kraft. UI und Zustand gemeinsam abstimmen; Statusfilter erhalten und nach Neuberechnung anwenden.
4. **Notizen bei einfachen Aufgaben unerreichbar:** hasDetails in remote 167 berücksichtigt weder vorhandene Notizen noch die allgemeine Möglichkeit, eine neue Notiz zu schreiben. Textarea wird nur innerhalb dieses Blocks gerendert (197–218). Selbst `|| note` wäre kein vollständiger Fix, weil dann eine leere Notiz bei einer sonst leeren Aufgabe nicht begonnen werden könnte. Einen Notizbereich für jede Aufgabe zugänglich halten.
5. **Kollabierte „Sem data“/„Mais tarde“ sind kein Datenverlust, aber andere Bedienung:** remote 44–45 zeigt diese Gruppen standardmäßig geschlossen. Bestehende Tests, die direkte Sichtbarkeit erwarten, müssen gezielt expandieren und dann Vollständigkeit belegen. Nicht den Test einfach löschen.
6. **Kalender fehlt:** Kein Wochenkalender/Ansichtswechsel in der Agenda. Das ist eine Funktionsänderung gegenüber Phase 1; zunächst Kalender als Nebenansicht erhalten. Eine spätere bewusste Entfernung braucht Teamentscheidung.
7. **Material-/Portalaktionen:** remote 206,219,237 besitzen echte href-Ausgaben. Im Demo sind diese Aktionen wie lokal zu neutralisieren. Einzelne Mock-URLs allein auf # zu ändern ersetzt keine sichere Darstellungsregel für alle Eingangsdaten.
8. **Kleine Bildschirme:** Die Kombination aus fester min-width am Suchfeld (remote 84) und nicht umbrechendem Terminlabel (remote 187–189) muss mit langen fiktiven Titeln und schmalem Viewport geprüft werden. Das ist ein Prüfbedarf, kein bereits nachgewiesener Layoutfehler.
9. **Ordnung und Zustände:** Innerhalb der Buckets wird keine neue Terminsortierung vorgenommen. Den vorhandenen sortByUrgency-/Datumsvertrag beibehalten; gleichzeitige Aufgaben stabil ordnen. Buttons für Zeilen ohne Details dürfen keine funktionslose Schaltfläche bleiben.

Positiv: klare Abschnittsüberschriften, aria-expanded an einklappbaren Abschnitten, benannte Such-/Kursfelder, erledigte und offene Listen sowie deaktivierte Abgabe-Checkboxen sind gute wiederverwendbare UI-Ansätze.

### Sichere technische Anbindung

Die bestehenden vier geprüften Fachgruppen können die sechs Agenda-Abschnitte plus erledigt speisen, ohne neue doppelte Geschäftsregeln einzuführen:

- urgent → overdue / today anhand der frisch berechneten urgency.
- week → morgen / weitere nächste Tage anhand daysRemaining.
- later → spätere Aufgaben / ohne Datum.
- done → erledigt.

Zeitberechnung und Filterzustand bleiben eine gemeinsame Wahrheit. Pure-Regeltests bleiben unabhängig von der konkreten Karte oder Agenda bestehen.

## D. Sicherheitsgrenzen und strukturelle Konflikte

**Nicht als nachgewiesenen Livezugriff missverstehen:** Solange die lokalen Hooks, API-Handler und Laufzeitsperren erhalten bleiben, macht bloßes Kopieren der Remote-App sie nicht automatisch wieder netzwerkfähig. Es führt zunächst zu offensichtlichen Integrationsfehlern: lokaler Header akzeptiert die alten Props nicht; lokales Privacy exportiert kein ConsentGate; die entfernte OAuth-Bibliothek darf nicht über Remote-Privacy zurückkommen.

Ein Reaktivierungsrisiko entsteht, wenn zusätzlich alte Provider/Hooks/APIs übernommen oder die Sperren zurückgenommen werden. Das ist ausdrücklich nicht empfohlen. Die Remote-App enthält weiterhin die frühere Login-/Consent-/iframe-Verdrahtung; diese ist keine passende Basis für die sichere lokale Demo.

Externe Fontlinks im Remote-index sind ebenfalls keine beobachteten Netzwerkaufrufe dieses Audits. Die lokale Server-CSP könnte sie im Entwicklungsbetrieb blockieren; trotzdem müssen sowohl externe Linkelemente draußen als auch Meta-/Server-CSP erhalten bleiben, damit die Sicherheit nicht von einem bestimmten Hostingheader abhängt.

Unverändert lokal erhalten:

- `src/main.tsx`: kein OAuth-Provider, bekannte alte Geheimnisse gezielt entfernt.
- `src/infrastructure/{runtime,profileStorage,storageValidation}.ts`: gesperrte Anbieter, erlaubte fiktive Profile, getrennte geprüfte Speicherung.
- `api/login.js`, `api/boletim.js`, `api/_lyceum.js`: 410 ohne Body-/Passwortverarbeitung.
- `public/notas.html`: statische Abschaltseite.
- `src/hooks/useAuth.ts`, `useClassroom.ts`, `src/services/classroomApi.ts`: kein Livezugriff.
- `src/modules/grades/**`: extrahierte sichere Notendemo/Engine.
- `src/utils/**`, `src/modules/school-hub/tasks.ts`: UTC-, Datums-, Status- und vollständige Gruppierungsregeln.
- `src/hooks/useTasks.ts`, `useStudy.ts`: profilbezogene Stores.
- `src/index.css`: reduzierte CSS-Bewegung.
- Paket-/Tooling-/Lockdatei und sämtliche fachlich relevanten Regressionen.

Diese Dateien sind nicht Teil des neuen Remote-Diffs; sie müssen deshalb nicht „zugunsten der Agenda“ zurückgesetzt werden.

## E. Zu erhaltende und anzupassende Regressionen

Die zuletzt dokumentierte lokale Baseline umfasst 82 Vitest-Tests in 8 Dateien und vier Browserprüfungen. Sie belegt die lokale Phase-1-Demo, **nicht** eine bereits integrierte Agenda. In diesem Analysepaket wurden keine Tests ausgeführt.

| Bestehender Bereich | Beibehalten / konkret anpassen |
| --- | --- |
| `src/modules/grades/engine.test.ts` und `GradeDemo.test.tsx` | Unverändert fachlich erhalten. App-Integration weiterhin GradeDemo und kein Portaliframe. |
| `src/modules/school-hub/date-regressions.test.ts` | UTC, ungültige Kalenderdaten, Abgaben ohne Termin, kursbezogene IDs und Veröffentlichungsdatum unverändert erhalten. |
| `src/modules/school-hub/tasks.test.ts` | Vollständige, überschneidungsfreie Gruppen und frische Zeitwerte erhalten. Zusatzprüfung für Aufteilung in sechs Agenda-Abschnitte ergänzen, nicht zweite widersprüchliche Regelquelle erzeugen. |
| `src/modules/school-hub/dashboard.test.tsx` | Testabsichten vollständig auf Agenda/ausgelagerten Kalender portieren: aktive Statusfilter nach Neuberechnung, Fristübergang, Mitternacht, undatiert/später in Liste und Kalender. Renderer/Selektoren passend zu neuen zugänglichen Rollen ändern; TaskRow verwendet aktuell keine h3-Aufgabenüberschriften. Solange Dashboard bleibt, bisherige Tests nicht entfernen. |
| `src/modules/school-hub/classroom-security.test.ts` | Direkte API-Sperren und kein ungetrennter Cache bleiben. Agenda darf diese Grenze nicht verändern. |
| `src/infrastructure/profileStorage.test.ts` | Profil A/B, Löschung fremder Daten verhindern, beschädigten Speicher abweisen unverändert erhalten. |
| `src/infrastructure/disabledIntegrations.test.ts` | Kein fetch, kein Bodylesen und 410 unverändert erhalten. |
| `e2e/demo.spec.ts` | Offlinebanner, kein Passwortfeld, Profilwechsel, Notendemo, Datenschutz und Altpfade erhalten. „Projeto de Física…“ liegt in Agenda anfangs in geschlossener Sem-data-Gruppe: Abschnitt öffnen und erst dann Sichtbarkeit prüfen. Neue Notiz-/Collapse-/Tastatur-/Frist-/Statusfilter-/Kalenderabläufe ergänzen. Weiterhin kein externer Request und keine Seitenfehler. |

Zusätzlich beim späteren Integrationsschritt:
- Long-title-/Mobilbreitentest auf allen Agenda-Zuständen, nicht nur Datenschutz.
- Leere Aufgabenbeschreibung mit neuer und schon gespeicherter Notiz.
- Angeklickte Material-/Portalbereiche dürfen im Demo keine Navigation zu Anbietern erzeugen.
- Neue Palette mit relevanten Text-/Hintergrundkombinationen prüfen.
- Keine automatische Wiederbelebung einer gelöschten Sitzung/alten Profilzustände durch geänderte UI.

### Statische Kontrastprobe der Remote-Palette

Aus den konfigurierten sRGB-Farben rechnerisch geprüft (keine Browsermessung): urgente #BF3A30 erreicht ca. 5,44:1 auf Weiß / 4,98:1 auf #F6F5F0; ok #2F7D5B ca. 4,99:1 / 4,57:1; texto-suave #6B6F79 ca. 5,03:1 / 4,61:1. Diese Beispiele erlauben die neue Palette grundsätzlich, ohne automatisch alle Kontraste zu bestätigen. atencao #B07A14 erreicht nur ca. 3,72:1 / 3,41:1 und ist für gewöhnlichen kleinen Text auf diesen Hintergründen ungeeignet. Tatsächliche Nutzung, Fokus-, Dark- und Hoverzustände separat prüfen.

## F. Empfohlene Reihenfolge der späteren Zusammenführung

1. Bereits verifizierten lokalen Quellsnapshot als Rückfallstand behalten und beide Commit-IDs festhalten.
2. Icaro und Kitaday entscheiden Agenda-Hauptansicht, Kalender-/Statusfilter-Erhalt und Fontstrategie; Verantwortlichkeiten festlegen. Kein menschliches Review als schon erfolgt darstellen.
3. In einem ausdrücklich freigegebenen separaten Integrationsarbeitsstand zunächst die sicheren lokalen Einstiege/Stores/API-Sperren behalten.
4. Agenda-Datei als Darstellung übernehmen und an reine Phase-1-Regeln anbinden. Notizen, Kalender, Filter und Offlineaktionen vollständig portieren.
5. Typ-/Importkonflikte bewusst lösen. Alte Komponenten erst entfernen, wenn keine Nutzer, Importe und relevanten Tests mehr davon abhängen. Insbesondere LaterColumn importiert heute noch TaskCard und EmptyState.
6. Alle genannten Regressionen, Lint, Typprüfung, Builds, Netzwerk- und Browsertests ausführen; echte Ergebnisse dokumentieren. Bis dahin keine gemeinsame Version als funktionsfähig bestätigen.
7. Menschliches Teamreview der kombinierten Änderung vor Commit/PR/Merge. Kein automatischer Push oder Deployment.

## G. Erhalt des gelesenen Remote-Stands

Zusätzlich zu den GitHub-Links liegen lesend kopierte Fassungen aller sechs am Remote-HEAD hinzugefügten/geänderten Dateien unter:

`../backups/phase1-2026-11-26_192945/remote-review/agent-analysis/files/`

`manifest.json` nennt die 13 Änderungsdateien, Basis/Remote-SHA und SHA-256 der sechs Kopien. Das ist ein Quellvergleichs-Cache, **kein vollständiges Remote-Repositoryarchiv** und keine geprüfte ausführbare Anwendung. Die sieben entfernten Dateien sind als Löschungen dokumentiert; ihre Basis bleibt im ursprünglichen lokalen Commit verfügbar. Keine Codekopie aus diesem Cache wurde ausgeführt.

## H. Offene Teamentscheidungen

- Neue Agenda als Hauptansicht bestätigen; Kalender und Statusfilter zunächst als Nebenoptionen erhalten?
- Georgia-Fallback sofort akzeptieren oder später lokal ausgelieferte, lizenzgeprüfte Fraunces-Schrift vorsehen?
- Verantwortliche für Fachregeln (Icaro), Design/Bedienung (Kitaday) und sichere gemeinsame Appintegration benennen.
- Phase-1-Sicherheitsbaseline samt angepassten Regressionen als unverzichtbare Übernahmebedingung bestätigen.
- Lokales Supabase-/BFF-Konzept separat bestätigen; der UI-Abgleich allein ist keine Phase-2-Architekturfreigabe.
