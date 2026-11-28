# Werkzeugentscheidungen

Geprüft am 25. November 2026 anhand offizieller Dokumentation und npm-Metadaten.

- Node 24 LTS und npm 11; konkrete lokale Versionen in README und .nvmrc.
- React 18, Tailwind 3, Motion und Zustand bleiben erhalten. Keine Frameworkmigration.
- Vite 8.3.8 mit React-Plugin 6.3.0. Das bisherige Vite 5 erfüllt die Voraussetzungen des aktuellen Vitest 5 nicht.
- Vitest 5.1.2 benötigt mindestens Vite 6.4 und Node 22.12; Node 24 und Vite 8 erfüllen die abgefragten Peer-Abhängigkeiten.
- ESLint 10.15.0, @eslint/js 10.0.1 und typescript-eslint 8.74.0 mit Flat Config. React-Hooks-Regeln bleiben aktiv. TypeScript bleibt bei 5.9.3.
- Separate Typprüfung für Anwendung/API sowie Werkzeuge/Browsertests; Builds schließen Typprüfung ein.
- Lockdatei und genaue direkte Versionen, Installation über npm ci --ignore-scripts. Keine globalen Installationen oder OS-Änderungen.
- Tests ersetzen Netzwerkanfragen durch Fehler; Browsertests blockieren externe Ziele und melden jeden Versuch.
- npm audit wurde verwendet; konkrete Ergebnisse stehen im Prüfprotokoll. Keine ungeprüften npm-audit-fix--force-Aufrufe.

Quellen:

- [Vite Getting Started](https://vite.dev/guide/)
- [Vitest Getting Started](https://vitest.dev/guide/)
- [Vitest 5 Migration](https://vitest.dev/guide/migration/)
- [ESLint-Konfiguration](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Google Classroom: UTC-Vertrag für Fälligkeiten](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork)

Die höhere Vite-Version ändert das Buildwerkzeug, nicht die gewählte React/Vite-Architektur. Der kleine lokale API-Plugin blieb konzeptionell erhalten und verweigert jetzt alle /api-Aufrufe. Alle Versionsänderungen müssen anhand der Checks beurteilt werden, nicht allein anhand ihrer Aktualität.
