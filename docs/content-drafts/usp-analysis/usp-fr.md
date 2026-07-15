# FR — USP-Versprechen (extrahiert aus den Seiten)

> **Quellen-Hinweis:** Die 5 branchenspezifischen FR-Seiten existieren noch nicht live unter `Localization/Content/de/land-fr-{spitex,spitaeler,security,hausdienste,logistik}.json` (nur `land-fr.json` ist deployed). Analysiert wurde stattdessen der fertige, fact-gecheckte 6-Dateien-Entwurfssatz `docs/content-drafts/fr/{general,spitex,spitaeler,security,hausdienste,logistik}.json` (Otto-Sign-off laut `docs/content-drafts/HANDOFF.md`), der laut Handoff die General-Seite `land-fr.json` beim Rollout ersetzen soll. Die aktuell live stehende `land-fr.json` ist eine ältere Wave-4-Einzelseite, die inhaltlich nur Krankenhäuser behandelt (Décret n° 2002-9, 12h-Ruhezeit) — sie überschneidet sich mit der künftigen Spitäler-Unterseite und enthält keine der branchenneutralen Code-du-travail-Aussagen des Entwurfs. Diese Divergenz wird im Fazit unten erneut aufgegriffen.

## General (Entwurf `docs/content-drafts/fr/general.json`)
- Zuschlagsstaffelung ab der 36. Stunde automatisch geprüft — 35-Stunden-Woche, i. d. R. +25% für die ersten acht Überstunden, danach +50% (Art. L3121-27 & L3121-36), über mehrere Teams und abweichende CCN-Sätze hinweg
- Jahresarbeitszeit-Modulation mit 48-Stunden-Grenze im Blick — Modulation der Wochenarbeitszeit bis 1.607 Stunden/Jahr, mit „jours de récupération" (nicht „RTT"), zwingende 48-Stunden-Wochengrenze (Art. L3121-20, L3121-41 bis L3121-47)
- Ruhezeiten automatisch geprüft — tägliche 11-Stunden- und wöchentliche 35-Stunden-Ruhezeit (Art. L3131-1 & L3132-2) in Echtzeit überwacht, „Verstösse entstehen gar nicht erst"
- Dienste automatisch geplant (generisch — Autofill/Schedule-Optimizer, lernt aus bestehenden Mustern)
- Touren optimiert (generisch)
- On-Premise: volle Datenhoheit nach CNIL-Erwartung (RGPD Art. 88) (generisch)
- Open Source: kein Vendor-Lock-in — Quellcode liegt offen, freie Wahl von Betrieb/Anpassung/Partnern
- Freie KI-Modell-Wahl — Klacksy auch mit lokal gehosteten Sprachmodellen betreibbar statt „intransparentem Profiling nach Art. 22 RGPD"
- Klacksy: transparent statt Blackbox — kein Marketing-Chatbot, Vorschläge passen zu Qualifikationen/Code du travail/hinterlegten Regeln, nachvollziehbar für das CSE

## Häusliche Pflege (Entwurf `spitex.json`, Aide à domicile)
- Touren automatisch optimiert (generisch)
- Fahrzeiten als Arbeitszeit (CCN BAD) — seit Avenant n° 43/2020 zur CCN BAD (IDCC 2941) gelten Fahrzeiten zwischen Patient:innen als volle Arbeitszeit
- Kilometerpauschale automatisch verrechnet — 0,40 €/km (Avenant n° 76/2026, seit 1.6.2026 in Kraft)
- Amplitude &amp; Sonntagsruhe automatisch eingehalten — Tagesamplitude max. 12 Stunden (Ausnahme bis 13 Stunden an max. 7 Tagen/Monat), mindestens 2 freie Sonntage pro Monat
- Qualifikationen automatisch berücksichtigt (generisch)
- On-Premise: Daten bleiben im Haus (generisch)
- Ausfälle schnell aufgefangen (generisch)

## Spitäler (Entwurf `spitaeler.json`, Hôpitaux)
- 24/7 lückenlose Abdeckung (generisch)
- Ruhezeiten automatisch geprüft in Echtzeit — 9h/10h-Grenze für Dauerdienst (Décret n° 2002-9, Art. 7) und 12-Stunden-Mindestruhezeit für nicht-medizinisches FPH-Personal (Art. 6), „Verstösse entstehen gar nicht erst"
- Qualifikationen &amp; Stationen abgestimmt (generisch)
- On-Premise: Daten bleiben im Haus + CNIL-Konformität — Herausforderung benennt explizit Sanktionierung von Geolokalisation/biometrischer Zeiterfassung (RGPD Art. 88), Lösung stellt On-Premise/keine-Cloud-KI dagegen
- Klacksy plant per Sprache (generisch)
- Springerpool &amp; Ausfälle (generisch)

## Security (Entwurf `security.json`)
- Objekte &amp; Posten lückenlos (generisch)
- CCN-Zuschläge automatisch berechnet — 10% Nachtzuschlag für Nachtarbeit zwischen 21 und 6 Uhr (CCN Prévention et Sécurité, IDCC 1351), 25% für Flughafensicherheit, zusätzlich 1% Ausgleichsruhezeit pro geleisteter Nachtstunde als Gutschrift (nicht als Bargeld)
- Übergangsruhezeit korrekt: 10 Stunden — beim Wechsel Nacht-/Tagdienst im regulären Sicherheitsgewerbe (Art. 7.01 CCN 1351); 24-Stunden-Regel nur als Sonderfall für Luftsicherheit, nicht verwechselt
- Rundgänge optimiert (generisch — Patrouillen-Routen)
- Klacksy plant per Sprache (generisch)
- Ausfälle in Minuten ersetzt (generisch)

## Haus-/Putzdienste (Entwurf `hausdienste.json`, Propreté)
- Objekt-Routen optimiert (generisch)
- Teams flexibel eingeteilt (generisch)
- Coupure-Regeln automatisch eingehalten — CCN Propreté (IDCC 3043) staffelt geteilte Dienste nach Wochenstunden: &lt;16h max. 1 Coupure/Tag bei 12h Amplitude, 16–24h max. 1 Coupure bei 13h Amplitude, &gt;24h max. 2 Coupures bei 13h Amplitude (Art. 6.2, Avenant n°3/2014), inklusive Mindestvergütung für Kurzeinsätze unter einer Stunde
- Zeitfenster berücksichtigt (generisch — nur zu bestimmten Zeiten zugängliche Objekte)
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)

## Logistik (Entwurf `logistik.json`)
- Touren automatisch optimiert (generisch)
- Heures d'équivalence korrekt verrechnet — CCN Transports routiers (IDCC 16): Stunden 36 bis zur 39./43. Woche als „heures d'équivalence" mit +25%-Zuschlag, nicht kontingentpflichtig; echte Überstunden mit +50% erst ab der 40. (Kurzstrecke) bzw. 44. Stunde (Langstrecke)
- Lenk- &amp; Ruhezeiten automatisch geprüft, 56-Tage-Nachweis stets abrufbar — gesetzliche Lenk-/Ruhezeiten in Echtzeit überwacht; Fahrtenschreiber-Aufzeichnungen für die letzten 56 Tage bei Strassenkontrollen vorlegbar (EU-VO 2020/1054, Art. 36 VO 165/2014), seit 31.12.2024
- Führerschein-Klassen passend, warnt vor ablaufenden Nachweisen (generisch — Qualifikations-Matching)
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)
