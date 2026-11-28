# Grades – extrahierte Fachlogik

Verantwortung: Projektinitiator. Phase 1 bleibt eine ausschließlich fiktive Demo.

`engine.ts` extrahiert die Berechnung aus `public/notas.html` des Basiscommits
`9fe50000bda4282a26adc0ce70580357930dbbb2`. Der alte Login und die HTML-Ausgaben
sind nicht mehr auslieferbar. Das Original bleibt in der Git-Historie erhalten.

## Erhaltene, noch unbestätigte Schulannahmen

- Skala und Simulationsbereich: 0–10.
- D-Gruppe: drei reguläre Bewertungen; SM-Gruppe: zwei; zusätzliche bereits
  bewertete Einträge bleiben wie bisher berücksichtigt.
- Nachprüfung ersetzt nur eine niedrigere Prüfungsdurchschnittsnote und ist
  auf sechs begrenzt.
- Jahresmittel aus zwei gleich gewichteten Halbjahreswerten.
- Zielsuche nimmt in allen ausstehenden Bewertungen dieselbe zukünftige Note an.
- Die bisherige Gewichtsnormalisierung und Rundung der Zielsuche bleiben erhalten.

Das ist kein bestätigtes schulübergreifendes Regelmodell. Vor echten Imports
müssen Regeln und Vergleichsfälle freigegeben werden. Die Zielsuche setzt eine
monotone Formel voraus; beliebige Fremdformeln sind dafür noch nicht freigegeben.

## Verbesserungen

Zahlen müssen vollständig und endlich sein. Formeln akzeptieren nur vollständige
Arithmetik, bekannte Bewertungskennungen und `MIN`, `MAX`, `ISNULL`. Ungültige
Syntax, unbekannte Funktionen, Division durch null und übermäßige Größe oder
Verschachtelung erzeugen einen Fehler statt eines scheinbar gültigen Werts.
Ein fehlender bekannter Bewertungswert bleibt für `ISNULL` von null unterscheidbar;
die bisherige Nullbehandlung in arithmetischen Ausdrücken bleibt erhalten.

Importierte Werte, eigene Berechnungen und Simulationen sind getrennt markiert.
Ein selbst berechnetes Jahresmittel wird nicht mehr als offiziell/importiert
bezeichnet. Die Demo zeigt nur synthetisch nachgebildete Importwerte.

`GradeDemo.tsx` verwendet React-Textausgabe, keine HTML-Senken, keinen Netzwerkzugriff
und keine Persistenz. Eingaben werden beim Remount/Neuladen verworfen. Das ist noch
kein eigenständiges dauerhaftes Noten-Center und kein PDF-Export.
