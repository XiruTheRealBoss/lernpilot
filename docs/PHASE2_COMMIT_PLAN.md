# Commit-, Push- und PR-Vorbereitung

Stand: 27. November 2026. Commit und Push sind noch NICHT genehmigt. Kein Commit, Push, PR, Merge oder Deployment ausgeführt. Der normale Git-Index bleibt unverändert.

## Konkreter Commit

Titel: feat: integrate latest dashboard and complete core infrastructure
Feature-Branch: feat/integration-core-infrastructure.
Geprüftes origin/main: 39e690f50f56db00a263337f8904e93fdcdf1563.
Derzeitiger Feature-HEAD: 9fe50000bda4282a26adc0ce70580357930dbbb2, nachweislich Vorfahr des aktuellen main; keine lokalen Zwischencommits zu erhalten.

Der vorbereitete Commit soll direkt auf dem aktuellen main basieren. So entstehen keine künstlichen Add/Add-Konflikte der bereits auf main vorhandenen Home-Dateien. Ein alternativer Index unter artifacts/final-integration wird aus main und der ausdrücklich geprüften Dateiauswahl aufgebaut. Er verändert weder den normalen Index noch Arbeitsdateien oder den Feature-Branch. Review-Patch und Commit-Vorschlag werden dort gespeichert; Dateiinventar und Hashes stehen in PHASE2_FILE_INVENTORY.json.

Nach ausdrücklicher Commit-Zustimmung: ursprünglichen Feature-HEAD, Remote-Basis, leeren normalen Index und Dateihashes erneut prüfen. Erst dann den lokalen Feature-Zeiger auf das geprüfte main vorziehen (nur Fast-Forward des bisherigen Vorfahren), den geprüften Baum ohne Arbeitsdateiänderung in den normalen Index übernehmen und den normalen Git-Commit mit obigem Titel erstellen. Keine alten Commits oder uncommitteten Dateien verwerfen. Falls zwischenzeitlich fremde Änderungen vorliegen: anhalten und neu abgleichen. Lokales main wird nicht verändert.

## Dateiauswahl

Enthalten: integriertes Home-Design, erhaltene Phase-1-/Agenda-Funktionen, bisherige Core-Infrastruktur, sichere lokale Supabase-Konfiguration, Node-API, Zod-Verträge, Migration, Tests und Dokumentation. Wiederverwendbare alte Dashboard-/Agenda-Komponenten bleiben bewusst erhalten.

Ausgeschlossen: Zugangsdaten, private Schlüssel, .env.local, .git, node_modules, dist, artifacts, Testresultate, Supabase-Laufzeitdateien, Datenbankinhalte und lokale Sicherungen. Die bereits im Arbeitsbaum fehlende und ignorierte .team-chat-room ist Verbindungsmetadatum; ihre Entfernung wird im vorbereiteten Baum ausdrücklich berücksichtigt, damit eine neue Arbeitskopie dieses lokale Metadatum nicht erneut erhält. Kein bestehender Quellcode wird deswegen gelöscht.

## Separater Push

Erst NACH erfolgreichem lokalen Commit dessen Hash und Ergebnis zeigen und eigene ausdrückliche Push-Zustimmung einholen. Unmittelbar vorher main und den Feature-Branch erneut lesend prüfen. Kein fremdes Feature-Branch-HEAD überschreiben und niemals Force-Push.

Ziel: origin im Repository XiruTheRealBoss/lernpilot, ausschließlich refs/heads/feat/integration-core-infrastructure.
Geplanter Befehl nach Zustimmung: git push --set-upstream origin HEAD:refs/heads/feat/integration-core-infrastructure.

## Pull Request

Lokaler Titel-/Beschreibungsvorschlag: PHASE2_PR_DRAFT.md. Basis main, Kopf feat/integration-core-infrastructure. Erst nach Push wird ein tatsächlicher PR möglich; bisher keine PR-URL und kein menschliches Review. Kein automatischer Merge. Falls main weitergezogen ist, Mergefähigkeit erneut prüfen. Keine Veröffentlichung oder Deployment.

## Noch fehlende Commit-Identität

Git-Autorname und Commit-E-Mail sind derzeit nicht konfiguriert. Der Nutzer wurde nach den gewünschten Angaben gefragt. Keine Identität erfunden und keine globale Einstellung geändert. Ein lokaler Commit benötigt neben der ausdrücklichen Zustimmung diese Angaben; eine GitHub-NoReply-Adresse ist möglich.
