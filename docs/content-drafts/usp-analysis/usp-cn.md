# CN — USP-Versprechen (extrahiert aus den Seiten)

## General
- 36-Stunden-Monatsgrenze für Überstunden (加班) tagesaktuell überwacht, Warnung vor Erreichen der Grenze statt erst danach — Art. 41 Arbeitsgesetz (劳动法): 1h/Tag normal, bis 3h/Tag aus besonderem Grund, höchstens 36h/Monat, nur nach Konsultation von Gewerkschaft und Belegschaft
- Überstundenzuschläge automatisch nach 150/200/300 % gestuft, inkl. Regel dass der 300 %-Feiertagszuschlag nie durch Freizeit ersetzt werden darf — Art. 44: mind. 150 % an Werktagen, 200 % an Ruhetagen (Wahlrecht auf Freizeitausgleich), mind. 300 % an gesetzlichen Feiertagen (法定节假日)
- Monats-Soll seit 1.1.2025 aktuell mit 165,3 Stunden gerechnet statt mit dem veralteten Wert von 166,6 Stunden — MOHRSS-Monats-Soll 165,3h (20,67 Tage × 8h), gültig seit 1.1.2025
- On-Premise: biometrische Zeiterfassungsdaten verlassen China nie, CAC-Cross-Border-Sicherheitsprüfung entfällt — PIPL Art. 38 (网信办-Prüfung)
- Wochenplanung legt die korrekte 40-Stunden-Woche zugrunde statt der in Art. 36 Arbeitsgesetz genannten 44h/Woche im Schnitt — State-Council-Verordnung Nr. 174 (1995)
- Provinzielle Lohnunterschiede als Konfiguration pro Standort abgebildet statt hart verdrahtet — kein landesweiter Mindestlohn, 31 Provinzen und Städte legen eigene Sätze in Klassen A/B/C fest
- Klacksy plant regelbasiert und nachvollziehbar nach hinterlegten Skills, keine Blackbox-Entscheidung; KI-Modell lokal hostbar (generisch)

## Häusliche Pflege (spitex)
- Zyklus-Arbeitszeit exakt über den genehmigten Zyklus (Woche, Monat, Quartal oder Jahr) aggregiert, Überstunden erst gemeldet wenn die Zyklus-Sollzeit tatsächlich überschritten ist — umfassendes Arbeitszeitsystem (综合计算工时工作制)
- Genehmigungsauflagen dokumentiert: Zyklus-Daten so bereitgehalten, wie es die Genehmigung des umfassenden Arbeitszeitsystems bei der lokalen Arbeitsbehörde verlangt
- Einsätze automatisch geplant, Reihenfolge hält Zeitfenster ein (generisch)
- Qualifikationen automatisch berücksichtigt (generisch)
- On-Premise: Patienten- und Personaldaten verlassen China nicht, CAC-Cross-Border-Prüfung nach PIPL entfällt
- Klacksy plant per Sprache, prüft Zyklus-Sollzeit, Qualifikation und Verfügbarkeit (generisch)

## Spitäler (spitaeler)
- 值班 (Bereitschaft) und 加班 (echte Überstunden) getrennt erfasst, substantielle Arbeit während des 值班 automatisch als zuschlagspflichtiger 加班 markiert
- 150/200/300 %-Zuschlag korrekt zugeordnet, sobald aus 值班 rechtlich 加班 wird — Art. 44: Werktag 150 %, Ruhetag 200 %, gesetzlicher Feiertag 300 % ohne Freizeitausgleich
- Echter 加班 laufend gegen die gesetzliche Überstundengrenze summiert, über alle Stationen und Rotationen hinweg
- Lückenlose 24/7-Stationsabdeckung, jede Lücke sofort sichtbar und auf Wunsch automatisch gefüllt (generisch)
- On-Premise: Personal- und Patientendaten verlassen Klinik und China nicht, auch nicht zur KI
- Klacksy erkennt bei der Planung automatisch, ob ein Nachtdienst als 值班 oder 加班 einzustufen ist, und schlägt die korrekte Vergütung vor

## Security
- Zyklus-Arbeitszeit über den genehmigten Zyklus (z. B. ein Quartal) korrekt aggregiert, Überstunden erst gemeldet wenn die Zyklus-Sollzeit überschritten ist, statt starr pro Kalendermonat
- 150 %/300 %-Zuschlag automatisch zugeordnet, sobald echter 加班 anfällt — Art. 44: 150 % Werktag, 300 % gesetzlicher Feiertag
- Genehmigungsauflagen dokumentiert, wie sie 人社局 (lokales Arbeits- und Sozialamt) für die Genehmigung des umfassenden Arbeitszeitsystems verlangt
- Objekte & Posten lückenlos besetzt, jede offene Stelle sofort sichtbar (generisch)
- On-Premise: Personal- und Objektdaten verlassen China nicht, CAC-Cross-Border-Prüfung nach PIPL entfällt
- Klacksy prüft bei jeder Zuteilung automatisch den Stand des Zyklus im umfassenden Arbeitszeitsystem und schlägt passende Besetzungen vor

## Haus-/Putzdienste (hausdienste)
- Geteilte Schichten bei 保洁员: aktive Arbeitszeit jedes Einsatzblocks exakt erfasst und automatisch im Dienstplan zusammengeführt
- Zyklus-Arbeitszeit über den genehmigten Zyklus aggregiert, wie es das umfassende Arbeitszeitsystem (综合计算工时工作制) verlangt
- Objekt-Routen optimiert für Auto, Fahrrad oder zu Fuss (generisch)
- Teams flexibel eingeteilt, wechselnde Besetzungen und Aushilfen im Überblick (generisch)
- On-Premise: Personal- und Objektdaten verlassen China nicht, CAC-Cross-Border-Prüfung nach PIPL entfällt
- Klacksy optimiert Route, Team und Zyklus-Erfassung bei geteilten Diensten in einem Schritt

## Logistik
- Ununterbrochene Lenkzeit und Pausenlänge in Echtzeit überwacht, Warnung vor Verstoss — 4-Stunden/20-Minuten-Regel gegen Ermüdungsfahren (疲劳驾驶), Durchführungsbestimmungen zum Strassenverkehrssicherheitsgesetz (道路交通安全法实施条例)
- Strafpunkte vermieden, indem Touren verhindert werden, die zum Verstoss führen würden — 3 Strafpunkte je Verstoss bei Güterfahrzeugen
- Fracht und Personentransport sauber getrennt, jeweils richtige Regel automatisch angewendet — 4h/20min-Regel für Güterfahrzeuge, neue 8h/24h-Regelung ab 1.6.2026 ausschliesslich für Personentransport
- Touren automatisch optimiert (generisch)
- On-Premise: Fahrer- und Kundendaten verlassen China nicht, CAC-Cross-Border-Prüfung nach PIPL entfällt
- Klacksy plant per Sprache, rechnet bei Ausfall alles neu inkl. Lenkzeiten (generisch)
