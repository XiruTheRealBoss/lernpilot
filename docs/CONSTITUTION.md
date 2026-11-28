# LernPilot Constitution

Stand: 25. November 2026 · Produktgrundsätze erhalten; Phase-1-Architektur gemäß ausdrücklichem Nutzerauftrag festgelegt.

Diese Grundsätze steuern Produkt- und Entwicklungsentscheidungen. Abweichungen werden mit Begründung in einem Issue oder Pull Request dokumentiert und von den betroffenen Teammitgliedern besprochen.

## 1. Zweck und Zielgruppe

LernPilot unterstützt beim Verstehen von Noten, Organisieren des Schulalltags und selbstständigen Lernen. Erste Tests sollen im eigenen Umfeld stattfinden; die Architektur soll später verschiedene Schulen und Notensysteme ermöglichen. Ein Startup ist das langfristige Ziel, ein Geschäftsmodell ist noch offen. Produktideen und technische Möglichkeiten sind Hypothesen, bis sie überprüft sind.

## 2. Verantwortung

Der Projektinitiator verantwortet Noten-Center, Lyceum, gewichtete Berechnung, Simulation, inoffizielle PDF-Übersichten und Prüfungsgenerator. Icaro verantwortet School Hub und KI-Tutor; der Hub umfasst Classroom, Google Tasks, Google Calendar, Apple Erinnerungen und iCloud Kalender. Learning Analytics verantworten beide gemeinsam. Kitaday verantwortet Frontend, UI/UX und Designsystem. Architektur, Datenschutz und Sicherheit tragen alle gemeinsam. Gmail ist ausgeschlossen.

Die verantwortliche Person koordiniert Entscheidungen, andere können nach Abstimmung beitragen. Gemeinsam genutzte Verträge, Datenmodelle und Komponenten werden vor größeren Änderungen besprochen. Wenn sich das Team nicht einigt, bleibt die bestehende Lösung bestehen, bis ein begründeter Vorschlag angenommen wird.

## 3. Sicherheit und Privatsphäre

1. Bis zur ausdrücklichen Freigabe nur fiktive Daten verwenden. Keine echten Noten, Schulzugänge, Schülerprofile, Token oder geheimen Schlüssel in Quellcode, Screenshots, KI-Prompts, Issues, Logs oder Testdaten.
2. Nur notwendige Daten und Berechtigungen anfragen. Zweck, Speicherort, Aufbewahrungsdauer, Löschung, Betroffenenrechte und Drittanbieter vor Echtdatenbetrieb dokumentieren. Echte Konten und Daten erst nach Prüfung mit geeigneten Erwachsenen und Datenschutzfachleuten sowie gegebenenfalls Schule und Erziehungsberechtigten verwenden. Anwendbares Recht und Zustimmungen sind zu klären, nicht pauschal anzunehmen.
3. Authentifizierung und Autorisierung auf dem Server und in der Datenbank durchsetzen; Testkonten dürfen niemals fremde Daten lesen oder ändern. Verschlüsselte Verbindungen und angemessene Schlüsselverwaltung vorsehen. Berechtigungen, Datenlöschung und Widerruf testen.
4. Kein Umgehen von Zugangsbeschränkungen, Schutzmaßnahmen oder Schulregeln. Lyceum nur über erlaubte und freigegebene Wege; Apple-Machbarkeit offen. Ein Prototyp beweist keine Berechtigung.
5. Sicherheitsvorfälle begrenzen und dokumentieren, Zugangsdaten bei Verdacht widerrufen und betroffene Erwachsene beziehungsweise zuständige Stellen einbeziehen. Keine Geheimnisse in den Bericht kopieren.

## 4. Verlässliche Lernhilfe

- Notenregeln je Schule/Fach konfigurierbar machen und Herkunft, Gewichtung und Rundung anzeigen. Fehlende Angaben erzeugen eine verständliche Meldung statt einer erfundenen Zahl.
- Jede PDF-Notenübersicht deutlich als **inoffiziell und nicht als Zeugnis** kennzeichnen. Keine fremden offiziellen Dokumente oder Schulbescheinigungen vortäuschen.
- KI-Ergebnisse können falsch sein: Quellen und Grenzen verständlich machen, Lernende zur Prüfung anleiten. Keine echten Prüfungsfragen oder garantierten Ergebnisse versprechen. Prüfungsprofile aus freiwillig bereitgestellten, zulässigen Materialien; Urheber- und Schulregeln respektieren.
- Personalisierung und Analytics müssen verständlich, zweckgebunden und kontrollierbar sein; zunächst einfache erklärbare Regeln. Keine verdeckte Überwachung oder unnötige Profilbildung. Daten an KI-Anbieter nur nach separater Prüfung weitergeben.

## 5. Qualitätsmaßstab

Bedienung auf Mobilgeräten und Desktop, Tastaturzugänglichkeit, verständliche Fehler sowie angemessener Kontrast und reduzierte Animationen gehören zur Qualität. Fertig bedeutet: Akzeptanzkriterien erfüllt, relevante Tests und Review abgeschlossen, offene Risiken dokumentiert. Ein Demo oder Mock wird als solcher gekennzeichnet. Bestehende Funktionen bleiben erhalten, bis ein abgestimmter Ersatz geprüft ist.

## 6. Entscheidungen und Freigaben

Ein Issue hält Problem, Optionen, Kosten, Risiken, Entscheidung und Verantwortliche fest; ein PR zeigt die konkrete Änderung und Review. Große Architekturwechsel, produktive Bereitstellung, kostenpflichtige Dienste und destruktive Änderungen benötigen ausdrückliche Freigabe. Keine Verträge oder kostenpflichtigen Konten ohne passende erwachsene Unterstützung abschließen. Ein Dokumentenentwurf ist keine Freigabe für Migration, Veröffentlichung oder Umgang mit echten Schülerdaten.

## 7. Verbindliche Entwicklungsgrenze in Phase 1

React/Vite/TypeScript/Tailwind/Motion bleiben; Zustand für lokalen UI-/Demozustand. Keine Next.js-Migration, keine produktive Cloud. Alle Abläufe ausschließlich mit fiktiven Daten; Live-Lyceum/Google deaktiviert. Ein lokales Demo-Profil ersetzt weder Identität noch Autorisierung. Supabase/PostgreSQL und Agenda-Integration sind nach Angabe des Projektinitiators bestätigt; das lokale Phase-2-Fundament ist implementiert und einschließlich echter Auth-/DB-/RLS-/Tokenablauf- und Browserprüfungen lokal nachgewiesen. Das neueste Home-Design verwendet dieses Fundament. Eine Produktionsfreigabe folgt daraus nicht. Vor jeder Installation ausdrückliches Ja einholen. Kein Push, GitHub-Merge oder Deployment ohne eigenen Auftrag.
