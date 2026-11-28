# LernPilot Architektur

Stand: 25. November 2026 · Vorschlag, nicht beschlossen

## 1. Ausgangslage und Entscheidung

Im GitHub-Repository `XiruTheRealBoss/lernpilot` beschreibt die bestehende README React, Vite, TypeScript, Zustand und lokale Speicherung, dazu einen lesenden Classroom-Prototyp und Lyceum-bezogene Dateien. Das gelesene `package.json` bestätigt React/Vite/TypeScript und die Skripte `dev`, `lint`, `build` und `preview`. README-Aussagen wurden nicht durch Code-, Sicherheits- oder Funktionstests bestätigt. Das Repository war bei Einsicht öffentlich und der Standardbranch `main`. Der Stand kann sich ändern.

**Vorschlag:** ein modularer Monolith mit Next.js und TypeScript, Supabase Auth und PostgreSQL. Ein modularer Monolith ist eine gemeinsam betriebene Anwendung, deren Funktionen intern klar getrennt sind. Für ein Anfängerteam ist das zunächst einfacher zu koordinieren als mehrere unabhängige Dienste. Supabase und Next.js sind noch weder bestätigt noch eingerichtet. Alternativ kann das Team den bestehenden Vite-Ansatz ausbauen. Vergleicht vor einer Entscheidung Migrationsaufwand, Funktionen, Betrieb, Datenschutz und Kosten; erhaltet vorhandene Arbeit. Keine Umstellung ohne ausdrückliche Zustimmung.

## 2. Produktgrenzen und Verantwortliche

| Modul | Verantwortung | Öffentliche Aufgabe |
| --- | --- | --- |
| Noten-Center | Projektinitiator | Manuelle Noten, Berechnung, Simulation und inoffizielle PDF-Übersichten |
| Lyceum-Anbindung | Projektinitiator | Nur bei bestätigter Freigabe und Machbarkeit Noten übernehmen |
| Prüfungsgenerator | Projektinitiator | Übungsprüfungen aus zulässigen Materialien und einstellbaren Profilen erstellen |
| School Hub | Icaro | Aufgaben und Termine, zunächst manuell; später freigegebene externe Quellen |
| KI-Tutor | Icaro | Lernunterstützung und später freiwillig gesteuerter Lernkontext |
| Learning Analytics | Projektinitiator und Icaro | Erklärbare Auswertungen und Lernfortschritt |
| UI und Designsystem | Kitaday | Gemeinsame responsive und zugängliche Darstellung |

Gmail wird nicht integriert. Die Grenzen sind fachlich; genaue Ordner und APIs werden erst im abgestimmten Fundament festgelegt. Module greifen über klar definierte Funktionen und Datenverträge aufeinander zu, nicht über versteckte Datenbankzugriffe in fremden Modulen.

## 3. Zielstruktur als Orientierung

```text
Browser (Weboberfläche)
       │ HTTPS
       ▼
Webanwendung: Oberfläche → serverseitige Schnittstellen → Fachmodule
                                              │
                          Datenzugriff / Integrationsadapter / KI-Adapter
                                  │                 │
                        Datenbank und Auth     freigegebene Anbieter
```

Ein mögliches Verzeichnis `src/modules/{grades,exam-generator,school-hub,tutor,analytics}` und `src/shared` ist ein Entwurf, keine Anweisung bestehende Dateien umzuziehen. Benutzeroberfläche, Geschäftsregeln, Persistenz und externe Anbieter trennen. Schützenswerte Schlüssel und Anbieterzugänge gehören nie in Browsercode. Ein Datenbank- oder Technologieaustausch verlangt dokumentierte Migration, Tests und Rückfallplan.

## 4. Datenmodell – fachlicher Entwurf

| Konzept | Zweck und Grenzen |
| --- | --- |
| Nutzerprofil und Schule | Eigentümerschaft und optionaler Schulkontext; keine Annahme, dass alle dieselbe Schule haben |
| Fach, Bewertung, Gewichtungsregel | Einzelnoten mit Quelle, Zeitraum und konfigurierbarer Regel; Berechnung versionierbar und nachvollziehbar |
| Aufgabe und Termin | Eigentümer, Quelle, externe Kennung, Status und Zeit inklusive Zeitzone, soweit erforderlich |
| Prüfungsprofil und Übung | Erlaubte Lernmaterialien und Übungsresultate; keine Behauptung über tatsächliche Prüfungsinhalte |
| Verbindung | Anbieter, Freigabestatus, minimale Metadaten und sicher verwahrte Token, falls tatsächlich benötigt |
| Lernfortschritt | Nur zweckgebundene, erklärbare Werte; Umfang und Aufbewahrung gesondert festlegen |

Jeder Datensatz erhält einen eindeutigen Eigentümer oder eine explizit modellierte Berechtigung. Schulzugehörigkeit allein gibt keinen Zugriff auf fremde Daten. Vor Echtdaten: Löschung einschließlich abgeleiteter Daten, Backups und externer Token sowie Fristen und Verantwortlichkeiten festlegen. IDs, Beziehungen und konkretes Schema sind offen.

## 5. Noten und PDF

Fachlogik separat und ohne UI implementieren. Für gültige Werte gilt als einfaches Grundmodell: `Summe(Note × Gewicht) / Summe(Gewicht)`. Nur die im jeweiligen Schulkontext bestätigten Regeln anwenden: Kategorien, zulässige Skala, fehlende Werte, Gewichtssummen, Rundung und Zeitpunkt der Rundung ausdrücklich konfigurieren. Negative oder ungültige Gewichte, leere Eingaben und Gewichtssumme null verständlich abweisen. Tests mit fiktiven Werten decken bekannte Beispiele und Grenzfälle ab. Simulationen sind sichtbar als solche gekennzeichnet.

PDF-Erzeugung verwendet nur für den Nutzer autorisierte Daten und kennzeichnet jede Ausgabe deutlich: **„Inoffizielle Notenübersicht – kein Zeugnis“**. Layout, Sicherheits- und Drucktests vor Freigabe prüfen.

## 6. Integrationen und KI

| Quelle | Status und Vorgehen |
| --- | --- |
| Lyceum | Prototyp im bestehenden Projekt laut README; Erlaubnis, verfügbare Schnittstelle und Absicherung sind ungeprüft. Mit Schule/Anbieter klären. Kein Umgehen von Zugriffsbeschränkungen, keine Speicherung von Schulpasswörtern. Bis dahin manuelle Eingabe. |
| Google Classroom, Tasks, Calendar | Geplante School-Hub-Quellen; Classroom-Prototyp laut README. Erst offizielle Schnittstellen, benötigte minimale Leseberechtigungen, Richtlinien und Schulfreigaben prüfen. Anfangs lesend; Schreibzugriff nur später nach separater Entscheidung und Berechtigung. |
| Apple Erinnerungen und iCloud Kalender | Direkte Web-App-Anbindung und zulässige Schnittstellen offen. Keine Zusage oder unbestätigte API behaupten. Alternative: manuelle Eingabe, bis eine erlaubte Lösung geprüft ist. |
| KI | Anbieter, Kosten, Datenverarbeitung und Schutzmaßnahmen offen. KI-Adapter serverseitig, Eingaben minimieren, Fehler und Kosten begrenzen; Ausgaben prüfen und als Übung markieren. Keine Trainingsbehauptung: Personalisierung kann über freiwilligen Kontext erfolgen. |

Adapter sollen externe Daten validieren und in gemeinsame interne Formate übersetzen. Fehler, Zeitüberschreitungen, widerrufene Berechtigungen und abgelaufene Tokens sichtbar behandeln. Spätere Synchronisation braucht stabile Quellkennungen, nachvollziehbare Konfliktregeln und Schutz vor Duplikaten; ohne nachgewiesene Zuordnung keine Datensätze automatisch zusammenführen. Verbindung trennen und Token-Widerruf planen und testen.

## 7. Sicherheit, Betrieb und Tests

Vor produktivem Betrieb: Authentifizierung und Autorisierung an jeder geschützten Schnittstelle, Datenzugriff standardmäßig verweigern, Eingaben und Uploads begrenzen, sensible Daten aus Logs entfernen, Schutz vor Missbrauch, angemessene Überwachung ohne Schülerprofile und sichere Verwaltung von Geheimnissen. Falls Supabase gewählt wird, RLS auf allen relevanten Tabellen aktivieren; Policies mit mindestens zwei fiktiven Nutzern und nicht privilegierten Schlüsseln auf Lesen, Schreiben und Änderungen prüfen. Service-Role-Schlüssel umgehen RLS und gehören ausschließlich in geschützte Serverumgebungen.

Entwicklung, Tests und spätere Produktion trennen. Backups, Wiederherstellung, Löschung und Vorfallreaktion vor Echtdatenbetrieb praktisch prüfen. Testschichten: Unit-Tests für Berechnungen, Integrationstests für Zugriffsrechte und Adapterfehler, UI- und Tastaturtests für Kernabläufe, Lint und Build. Keine echten Schülerdaten in Testumgebungen.

## 8. Offene Architekturentscheidungen

1. Bestehenden Code und Datenschutzverhalten vollständig prüfen; Bestandsaufnahme und Risikoanalyse dokumentieren.
2. Vite-Ausbau versus Next.js/Supabase vergleichen, Migrations- und Rückfallplan erarbeiten und gemeinsam beschließen.
3. Authentifizierung, Datenhaltung, Hostingregion, Aufbewahrungsfristen, Löschkonzept, Kosten und Betriebsverantwortung klären.
4. Schulnotenregeln und Importberechtigungen klären; Apple- und Google-Freigaben prüfen.
5. KI-Anbieter, Einwilligungen, Datenfluss und begrenztes MVP gemeinsam auswählen.
