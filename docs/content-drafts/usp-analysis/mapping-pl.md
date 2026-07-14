# PL — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Vollständige Ewidencja czasu pracy — lückenlos nach Art. 149 statt Unterschriftenliste | Work-Records (planungs-/manuell) | ⚠️ | Zeiten dokumentierbar/aufbewahrbar ✅; kein verifizierter Clock-in — als „rechtssichere Erfassung" gegen PIP nur so weit ehrlich, wie die Zeiten wahrheitsgemäss eingetragen werden. |
| Ruhezeiten automatisch geprüft — 11h täglich, 35h wöchentlich inkl. Sonntag | Regel-Engine (Ruhezeit/Wochenruhe/freier Sonntag) | ✅ | Voll gedeckt. |
| Równoważny czas pracy — bis 12h/Tag, 1-Monats-Abrechnungszeitraum | Konfigurierbare Grenzwerte | ⚠️ | 12h-Tagesarbeitszeit konfigurierbar ✅; der 1-Monats-Abrechnungs-Durchschnitt wird nicht durchgesetzt (nur Warnung). |
| Keine biometrische Zeiterfassung nötig (Art. 22¹b) | Keine Biometrie im System | ✅ | Ehrliches Positiv: Klacks hat keine Biometrie. |
| On-Premise: volle Datenhoheit, KI-Modell frei (UODO) | On-Premise + keyless lokales LLM | ✅ | Voll gedeckt. |
| Klacksy: regelbasiert, keine Blackbox | Klacksy | ✅ | Voll gedeckt. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Wegzeit als Arbeitszeit erfasst | Wegzeit als bezahlte Arbeitszeit | ✅ | Voll gedeckt. |
| Belastbare Nachweise gegen Umqualifizierung (Zeiten/Orte/Weisungen lückenlos) | Work-Records | ⚠️ | Dokumentation planungsbasiert; kein verifizierter, manipulationssicherer Nachweis. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Zwei Normen parallel geplant (7h35/37h55 vs. 8h/40h) | Konfigurierbare Grenzwerte pro Vertrag/Gruppe | ✅ | Unterschiedliche Normen pro Personalgruppe konfigurierbar. |
| Dyżur medyczny bis 24h + zwingende 11h-Ruhe direkt danach | Regel-Engine (Ruhezeit zwischen Schichten) | ✅ | 24h-Bereitschaft planbar; 11h-Ruhe nach Schicht als Ruhezeit-Regel gedeckt. |
| Verkürzte Wochenruhe (24h) — 14-Tage-Ausgleichsfrist im Blick | Live-Compliance-Warnungen | ⚠️ | Ausgleichsfrist-Tracking = Warnung; kein durchgesetzter Automatismus. |
| Stationen & Qualifikationen abgestimmt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 24-Stunden-Schichten im äquivalenten System, 1–4-Monats-Abrechnung (Art. 137) | Konfigurierbare Grenzwerte + Schichtmodelle | ⚠️ | 24h-Schicht konfigurierbar ✅; Mehrmonats-Abrechnungsdurchschnitt nicht durchgesetzt. |
| Ausgleichsruhezeit automatisch eingeplant nach jeder verlängerten Schicht | Regel-Engine (Ruhezeit) | ⚠️ | Ruhezeit-Regel modellierbar; automatisches Einplanen der Ausgleichsruhe nicht belegt. |
| Zuschläge kumulativ — 50/100% Überstunden + 20% Nacht | Typisierte Zuschläge | ⚠️ | Zuschläge konfigurierbar ✅; der **kumulative** Stacking-Modus ist nicht verifiziert (steht im Gegensatz zu „nur höchster" in anderen Ländern) — Stacking-Logik prüfen. |
| On-Premise: volle Datenhoheit | On-Premise | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Stunden nachweisbar erfasst (Mindeststundenlohn 31,40 PLN nachweisen) | Work-Records | ⚠️ | Zeiten dokumentierbar; kein verifizierter Clock-in; Lohn-Check = Payroll-Randbereich. |
| Mindeststundenlohn 31,40 PLN hinterlegt, auch umowa zlecenie | Konfigurierbare Werte | ⚠️ | Wert hinterlegbar ✅; automatische Lohn-Untergrenzen-Warnung nicht belegt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| 10-Stunden-Nachtgrenze automatisch begrenzt | Live-Compliance-Warnungen | ⚠️ | Nachtarbeits-Cap; Klacks warnt, blockiert das Speichern nicht. |
| Kleintransporter 2,5–3,5t: Lenkzeitregeln (4,5h/45min/9–10h) | — | ⚠️ | Lenkzeit-Grenzen als Regel warnbar; keine Fahrtenschreiber-/Tacho-Datenanbindung. |
| Führerschein-Klassen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf nicht erzwungen. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Fazit

Ruhezeiten (inkl. freier Sonntag), zwei parallele Arbeitszeit-Normen, Wegzeit, Tourenoptimierung, On-Premise und das „keine Biometrie"-Argument sind ehrlich gedeckt. **Vorbehalte:** die Zeiterfassung ist planungs-/manuell-basiert (kein Clock-in) — „lückenlose Ewidencja" nur so gut wie die Eintragungen; Abrechnungszeiträume/Nachtgrenze werden nur überwacht; Ausgleichsruhe-Automatik und Mindestlohn-Warnung sind nicht belegt. **Zu prüfen:** der behauptete kumulative Zuschlags-Modus (Überstunde + Nacht) gegen die tatsächliche Stacking-Logik der Zuschlags-Engine.
