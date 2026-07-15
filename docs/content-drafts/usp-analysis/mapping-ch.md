# CH — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`klacks-capabilities.md`, alleinige Wahrheitsquelle). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Wochenhöchstarbeitszeit 45h/50h + Überstundenzuschlag-Schwelle (ab 60. Std./Jahr Büro, ab 1. Std. übrige Branchen) | Konfigurierbare Grenzwerte (`MaxWeeklyHours`) + typisierte Zuschläge | ⚠️ | Kern ✅: 45h/50h-Wochengrenze konfigurierbar, 50h ist sogar der harte CH-Default. Sub-Anspruch ✗: kein eigener Überstunden-Zuschlagstyp und keine Jahres-Überstundenzähler — die branchendifferenzierte "ab der 60. Stunde"-Zuschlagslogik ist nicht belegt. |
| Ruhezeiten & Nachtzuschlag — 11h Ruhe, 10% Zeitbonus ab 25. Nacht/Jahr, als Freizeit statt Auszahlung | Regel-Engine (Ruhezeit) + Nacht-Zuschlagstyp | ⚠️ | Kern ✅: 11h-Ruhezeit ist sogar der harte CH-Default; Nachtfenster 23–06h passt für CH exakt (anders als bei JP/IL). Sub-Anspruch ✗: kein Jahres-Zähler für "ab der 25. Nacht", und **kein Zeitgutschrift-/Arbeitszeitkonto-Mechanismus** — Surcharge-`Amount` fliesst als Wage-Type in den Payroll-Export, nicht als Freizeit-Ledger. Siehe Risiko 1. |
| Touren & Einsätze automatisch optimiert | Schedule-Optimizer/Autofill + Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| On-Premise: volle Datenhoheit, KI-Modell frei wählbar (nDSG) | On-Premise-Stack + keyless lokales LLM | ✅ | Voll gedeckt (Hinweis: Default-Provider sind Cloud, Opt-in für lokales Modell nötig — Anspruch selbst bleibt korrekt, da "frei wählbar" nicht "standardmässig lokal" behauptet). |
| Klacksy: regelbasiert, keine Blackbox | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit + GA-Lückenfüllung | ✅ | Voll gedeckt. |
| (Beispiel) Nachtzuschlag-/Wochenhöchstarbeitszeit-Erkennung inkl. automatischem Ausgleichsvorschlag | Live-Compliance-Warnungen + Zuschlags-Engine | ⚠️ | Erkennung ✅ (Warnung); ein automatischer "Ausgleichsvorschlag" ist als eigenständiges Feature nicht belegt. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Wegzeit als Arbeitszeit, nur Erst-/Letztfahrt aussen vor (ArGV1 Art. 13) | WorkChange Travel-Typen (Start/End/Within) | ⚠️ | Wegzeit-als-Arbeitszeit-Prinzip ✅; die konkrete Art.-13-Unterscheidung (nur "Within" bezahlt, "Start"/"End" nicht) ist gegen die Inventur nicht sauber verifiziert — laut Beleg zählen TravelStart/End/Within alle "positiv zu den Stunden". Vor Publikation gegen den echten Code prüfen. Zudem: Buchung erfolgt manuell im Dialog, nicht automatisch aus der Tourenoptimierung. |
| Freie Sonntage automatisch geplant — mind. jeder zweite Sonntag frei + Ausgleich | Regel-Engine | ❌ | Capability-Doc explizit: **"Freie Sonntage gibt es nicht als eigene Regel"** — nur wochentag-agnostisches `MinRestDays` + ein `WorkOnSunday`-Planungsflag (dient der Zuteilung, nicht der Verstoss-Warnung). Kein automatischer Alternierungs-Rhythmus, kein Compliance-Check. Bausteine vorhanden (Flag + `ContractWeekday`-Veto in der GA für Personen-Constraints), aber keine automatische "jeder-zweite-Sonntag"-Garantie. |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy; abgelaufene Pflicht-Qualifikation blockiert die Zuteilung nicht. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache + Ersatzvorschlag | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |
| BGAP-Vorbereitung (45h, Vorlaufzeit, Pikett-Kompensation) | Konfigurierbare Grenzwerte / — | ⚠️ | 45h-Höchstarbeitszeit ✅ konfigurierbar; "mehr Vorlaufzeit bei der Dienstplanung" (Publikationsfrist) als eigene Regel nicht belegt; "geregelte Pikett-Kompensation" — kein dediziertes On-Call-/Pikett-Feature in der Inventur (`WorkChangeType` kennt Correction/Replacement/Travel/Briefing/Debriefing, kein Pikett-Typ). Generische Bausteine (Shift/Travel) könnten es abbilden, ist aber nicht belegt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer/Autofill | ✅ | Voll gedeckt. |
| Assistenzarzt-Stunden — 50h/Woche + 140h/Jahr Überzeit, "Verstösse entstehen gar nicht erst" | Konfigurierbare Grenzwerte + Live-Compliance-Warnungen | ⚠️ | 50h-Wochengrenze ✅ konfigurierbar/gewarnt; 140h-Jahresgrenze ✗ nicht durchgesetzt (kein Jahres-Cap, `MaximumHours` wird nicht ausgewertet); "Verstösse entstehen gar nicht erst" ist der klassische Hart-Sperren-Überclaim — Klacks **warnt**, blockiert das Speichern nie. Umformulieren zu "wird sichtbar gemacht/gewarnt". |
| Pikett korrekt unterschieden (Präsenz vs. zuhause inkl. Anfahrt) | — | ⚠️ | Kein dediziertes On-Call-/Pikett-Feature in der Inventur belegt; Wegzeit-als-Arbeitszeit-Baustein existiert generisch, eine automatische Präsenz-/Rufpikett-Unterscheidung mit unterschiedlicher Stundenbehandlung ist nicht dokumentiert. Vor Publikation verifizieren. |
| Qualifikationen & Stationen abgestimmt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy; abgelaufene Pflicht-Qual blockiert nicht. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache (inkl. Qualifikation, Höchstarbeitszeit) | Klacksy + GA-Vetos | ✅ | Qualifikation (`MissingQualification`) und Tages-/Vertrags-Höchstarbeitszeit sind harte GA-Vetos; Wochenwert eher Warnung als Veto, insgesamt tragfähig. |
| Nachtzuschlag automatisch berechnet (Art. 17b, als Freizeitgutschrift) | Nacht-Zuschlagstyp | ⚠️ | Zuschlagsberechnung ✅ (Nachtfenster 23–06h passt exakt für CH); "als Freizeitgutschrift statt Auszahlung" ✗ nicht belegt — kein Zeitgutschrift-/Arbeitszeitkonto-Mechanismus, `SurchargeItem.Amount` ist auf Payroll-Wage-Type ausgelegt. Siehe Risiko 1. |

*Hinweis:* der 24h-Ersatzruhetag nach Sonntagseinsätzen (Challenges) wird in den Solutions nicht erneut versprochen — inhaltlich dieselbe "freie Sonntage"-Lücke wie bei Spitex, hier aber nicht behauptet, daher keine eigene Zeile.

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos | Schedule-Optimizer | ✅ | Voll gedeckt. |
| Zeitbonus automatisch aufs Arbeitszeitkonto gebucht (Nacht 23–06h + Sonntag, aveGAV VSSU) | Typisierte Zuschläge (Nacht/Weekend) | ⚠️ | Zuschlagsberechnung ✅ (Nachtfenster 23–06h exakt passend); "aufs Arbeitszeitkonto gebucht" ✗ — kein Arbeitszeitkonto/Zeitgutschrift-Ledger belegt, nur ein Zuschlags-`Amount` pro Eintrag. Siehe Risiko 1. |
| 210-Stunden-Schwelle im Blick (monatlich, 25%-Zuschlag, 3-Monats-Ausgleichsfrist) | `OvertimeThreshold`-Feld | ❌ | Feld existiert im Contract-Modell, wird aber laut Inventur **"von der Warn-Engine nicht ausgewertet"**; zusätzlich kein eigener Überstunden-Zuschlagstyp für den 25%-Satz und keine 3-Monats-Ausgleichsfrist-Logik. Klare Lücke — trotz vorsichtiger "Klacks warnt"-Formulierung im Text ist die Warnung selbst nicht verdrahtet. |
| Zertifikate automatisch geprüft (nur gültiger Ausweis, Warnung vor Ablauf) | Qualifikations-Matching (exakt) | ⚠️ | Fehlende Pflicht-Qualifikation ist ein harter GA-Veto ✅; eine bereits **abgelaufene** Pflicht-Qualifikation blockiert die Zuteilung laut Inventur jedoch NICHT (nur Warnung) — im Widerspruch zu "nur Personal mit gültigem Ausweis". |
| Rundgänge optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache (inkl. Zertifikate, Verfügbarkeit, Jahressollstunden) | Klacksy | ✅ | Voll gedeckt (Zertifikats-Caveat siehe oben). |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| 42-Stunden-Woche automatisch überwacht (aveGAV Reinigung, 100%-Pensum) | Konfigurierbare Grenzwerte (`MaxWeeklyHours`) | ✅ | Voll gedeckt. |
| Pausen bei Splitting-Diensten ab 5,5h automatisch eingeplant | `MinPauseHours` (harter GA-Veto) | ⚠️ | `MinPauseHours` existiert als konfigurierbarer, sogar hart durchgesetzter Wert (GA-Veto) ✅; ob die 5,5h-Schwellen-**Bedingung** (Pause nur ab dieser Tagesdauer) so abgebildet ist oder `MinPauseHours` als generischer Fixwert wirkt, ist nicht verifiziert. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Qualifikationen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy; abgelaufene Pflicht-Qual blockiert nicht. |
| Klacksy plant per Sprache (Route, Team, Pausen) | Klacksy | ✅ | Voll gedeckt. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Lenk- & Ruhezeiten nach ARV1 — 9h-Grenze, Pause nach 4,5h Lenkzeit, "Verstösse entstehen gar nicht erst" | Konfigurierbare Grenzwerte + Live-Compliance-Warnungen | ⚠️ | Klacks kennt **Arbeitszeit**-Grenzwerte (`MaxDailyHours`, `MinPauseHours`), aber keine dedizierte **Lenkzeit**-Erfassung (Fahren vs. Laden/Warten) und keine Fahrtenschreiber-/Tacho-Anbindung — die ARV1-Lenkzeitlogik ist bestenfalls durch generische Grenzwerte angenähert, nicht eigens implementiert. "Verstösse entstehen gar nicht erst" ist zudem der Hart-Sperren-Überclaim (Klacks warnt nur). |
| 56-Tage-Nachweis dokumentiert | Work-Records + Datenaufbewahrung (Default 3650 Tage) | ⚠️ | Aufbewahrungsdauer ✅ weit ausreichend; die Nachweise beziehen sich aber auf generische Work-Einträge, nicht auf separat erfasste Lenkzeiten (siehe oben) — "Nachweis zu Lenk- und Ruhezeiten" im engen ARV1-Sinn nicht belegt. |
| Bereit für Kleintransporter-Regel 2026 (2,5–3,5t, grenzüberschreitend) | — | ⚠️ | Keine Fahrzeug-/Gewichtsklassen-Modellierung in der Inventur belegt; generische Schicht-/Tourenplanung ist fahrzeugunabhängig, könnte das abbilden, ist aber nicht als Feature dokumentiert. |
| Führerschein-Klassen passend, Warnung vor Ablauf | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅ als Qualifikationstyp modellierbar; abgelaufene Pflicht-Qualifikation blockiert die Zuteilung laut Inventur nicht, nur Warnung — im Widerspruch zu "nur Fahrern mit passender Berechtigung". |
| Klacksy plant per Sprache (inkl. Neuberechnung der Lenkzeiten) | Klacksy | ⚠️ | Klacksy selbst ✅; die "Lenkzeiten"-Neuberechnung erbt die oben genannte Lücke (keine dedizierte Lenkzeit-Erfassung). |

## Zusammenfassung nach Seite

| Seite | ✅ | ⚠️ | ❌ |
|---|--:|--:|--:|
| General | 4 | 3 | 0 |
| Spitex | 3 | 3 | 1 |
| Spitäler | 3 | 4 | 0 |
| Security | 3 | 2 | 1 |
| Hausdienste | 4 | 2 | 0 |
| Logistik | 1 | 5 | 0 |
| **Total** | **18** | **19** | **2** |

## Fazit

**Wichtige Einordnung:** CH schneidet zahlenmässig nicht besser ab als der Block-A/EU-Durchschnitt — nicht weil die Engine schlechter zu CH passt, sondern weil sie besser passt: die CH-orientierten Hardcoded-Defaults der Compliance-Engine (`MinRestHours=11, MaxDailyHours=10, MaxWeeklyHours=50`) und das Nachtfenster 23–06h **stimmen für CH exakt** (anders als bei JP/IL mit 22–05/22–06). Der Punkteschnitt ist niedriger, weil die CH-Texte feinkörnigere juristische Detail-Ansprüche formulieren (Jahres-Zähler, Zeitgutschrift, Pikett-Differenzierung), nicht weil das Fundament schwächer wäre.

**Risiko 1 — Zeitgutschrift/Arbeitszeitkonto (grösstes systemisches Risiko):** Drei ⚠️ (General Nachtzuschlag, Spitäler Nachtzuschlag Art. 17b, Security Zeitbonus) hängen an derselben Lücke: Art. 17b ArG verlangt eine **Zeit**-Kompensation (Freizeit), Klacks berechnet einen Zuschlags-`Amount`, der als Payroll-Wage-Type (`SurchargeWageType`) exportiert wird — kein dokumentiertes Zeitgutschrift-/Arbeitszeitkonto-Ledger. Vor Publikation klären, ob "als Freizeit, nicht als Auszahlung" so gehalten werden kann, oder umformulieren zu "Zuschlag wird automatisch berechnet" ohne Aussage zur Auszahlungsform.

**Risiko 2 — Freie Sonntage (❌, Spitex):** Die stärkste Einzelaussage der Spitex-Seite ("mindestens jeder zweite Sonntag frei… automatisch geplant") ist gegen die Inventur explizit falsch — es gibt laut Capability-Doc keine solche Regel, nur ein generisches `MinRestDays` plus ein nicht warnendes `WorkOnSunday`-Planungsflag. Muss vor Live-Gang entweder entschärft ("Sonntagsarbeit wird sichtbar geplant") oder als Feature nachgezogen werden.

**Risiko 3 — Logistik ist die schwächste Seite (1 ✅ / 5 ⚠️):** Die zentrale ARV1-Aussage beruht auf **Lenkzeit**, die Klacks nicht dediziert erfasst (nur generische Arbeitszeit-/Pausen-Grenzwerte, kein Tacho/Fahrzeugmodell). Kombiniert mit dem Hart-Sperren-Überclaim ("Verstösse entstehen gar nicht erst", auch bei Spitäler-Assistenzärzten) ist das die am wenigsten belastbare Seite der sechs — vor Publikation mit Fachbereich gegenchecken oder auf "Arbeitszeit statt Lenkzeit" umformulieren.

**Durchgängig ehrlich trägt:** Wochen-/Tages-Grenzwerte, Ruhezeit (11h-Default), Nachtzuschlag-Berechnung (Fenster passt für CH), Tourenoptimierung, On-Premise-Datenhoheit, Klacksy, exaktes Qualifikations-Matching (mit dem bekannten Abgelaufen-blockiert-nicht-Vorbehalt in jeder Branche).
