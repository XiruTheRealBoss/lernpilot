# LernPilot Schritt für Schritt öffnen

Stand: 27. November 2026. Die Integrationsfassung enthält Home-Demo und lokalen Account-Bereich. Eine für echte Schuldaten freigegebene Produktions-App existiert noch nicht. Ausschließlich erfundene Daten verwenden.

## Home-Demo ohne Konto

1. Windows-Taste drücken, PowerShell suchen und normal öffnen.
2. Ausführen:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-integration"
npm run dev
```

3. Terminal offen lassen und http://127.0.0.1:5174/?demo im Browser öffnen.
4. Demo A/B sind getrennte lokale Profile, keine Benutzerkonten. Docker/Supabase sind hierfür nicht nötig.
5. Beenden: Strg+C im Terminal drücken, Browser-Tab schließen.

## Lokale Anwendung mit Benutzerkonten

Node 24/npm 11, Projektpakete, WSL 2, Docker und Supabase-Images sind auf diesem PC bereits vorhanden. Nichts erneut installieren oder herunterladen. Die ignorierte .env.local ist bereits mit dem lokalen öffentlichen Schlüssel eingerichtet. Nicht überschreiben und keine Schlüssel in den Chat kopieren.

1. Docker Desktop über das Windows-Startmenü öffnen. Warten, bis die Engine läuft. Keine Cloud-Anmeldung oder kostenpflichtigen Funktionen aktivieren.
2. PowerShell öffnen und ausführen:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-integration"
$env:LERNPILOT_DOCKER_EXECUTABLE = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
npm run supabase:start
npm run supabase:status
```

3. Der lokale Starter prüft die Portbindungen. Bei Fehlern nicht auf direkten CLI-Start ausweichen; siehe [Infrastruktur](LOCAL_INFRASTRUCTURE_SETUP.md). Die Migration ist auf diesem PC bereits angewendet. Kein db reset ausführen.
4. Im selben Terminal den API-Server starten und offen lassen:

```powershell
npm run dev:api
```

5. Zweites PowerShell-Terminal öffnen:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-integration"
$env:LERNPILOT_LOCAL_API = '1'
npm run dev
```

6. http://127.0.0.1:5174/account öffnen. Über die Registrierung ein erfundenes Konto mit einer Adresse wie mein-test@example.test und einem neuen Passwort mit mindestens zwölf Zeichen erstellen. Keine Schuladresse oder andernorts verwendeten Passwörter verwenden. Beschriftungen sind derzeit portugiesisch.
7. Anmelden, Aufgaben erstellen, erledigen und löschen. Über die Oberfläche abmelden. Automatische Testkonten werden nach den Prüfungen gelöscht und sind keine nutzbaren Demo-Zugänge.
8. Beenden: in beiden Server-Terminals Strg+C drücken. Im Integrationsordner anschließend:

```powershell
npm run supabase:stop
```

9. Das stoppt den Stack ohne Datenreset. Optional Docker Desktop über dessen Menü beenden. Kein wsl --shutdown nötig.

Bei belegten Ports nur selbst gestartete alte LernPilot-Server mit Strg+C beenden. Keine fremden Prozesse schließen. Fehlende Pakete oder Images erfordern vor neuen Installationen/Downloads erneut ausdrückliche Zustimmung. Ein API-Neustart beendet die im Arbeitsspeicher gehaltenen Anwendungssitzungen; danach erneut anmelden.

## Produktionsvorschau der Demo

1. PowerShell öffnen und in denselben Integrationsordner wechseln.
2. npm run build ausführen, anschließend npm run preview.
3. http://127.0.0.1:4174/?demo öffnen.
4. Beenden mit Strg+C. Dies veröffentlicht nichts und ist kein eingerichteter Account-Produktionsbetrieb.

## Alte Phase-1-Demo

1. PowerShell öffnen.
2. Ausführen:

```powershell
cd "C:\Users\crist\OneDrive\Documents\ChatGPT\Lernpilot projekt\lernpilot-app"
npm run dev
```

3. http://127.0.0.1:5173/?demo öffnen. Diese unveränderte Fassung enthält die neue Agenda nicht.
4. Beenden: Strg+C im Terminal.

## Prüfungen wiederholen

Im Integrationsordner: npm run check, npm run test:server, npm run test:infrastructure und npm run test:e2e. Mit laufender Supabase-Umgebung zusätzlich npm run test:database; echter Tokenablauf benötigt rund fünfeinhalb Minuten. Mit laufender API und Frontend zusätzlich npm run test:browser:local. Teststarter lesen lokale Schlüssel nur in den Prozessspeicher. Keine privilegierten Schlüssel manuell eintragen.

Auf einem anderen Computer sind Installationen und .env.local nicht automatisch vorhanden. Erst Voraussetzungen und Freigaben prüfen. Keine geheimen Dateien oder Docker-Datenverzeichnisse ins Repository kopieren.

## Erster Start auf einem anderen Rechner

Die oben genannten vorhandenen Pakete und .env.local gelten nur für diesen PC. Icaro und Kitaday verwenden die vollständige [Ersteinrichtung und Modulabstimmung](TEAM_DEVELOPMENT.md), sobald der Feature-Branch nach ausdrücklicher Zustimmung veröffentlicht wurde. Keine vorhandene .env.local überschreiben oder zwischen Rechnern teilen.
