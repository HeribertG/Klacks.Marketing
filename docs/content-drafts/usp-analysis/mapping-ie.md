# IE — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Wochenhöchstarbeitszeit überwacht — 48h-Schnitt über Referenzzeitraum (4/6 Monate) | Live-Compliance-Warnungen | ⚠️ | Mehrmonats-Durchschnitt = nicht durchgesetzter Cap; Klacks warnt, blockiert nicht. |
| Ruhezeiten in Echtzeit — 11h täglich (Sec 11), 24h wöchentlich (Sec 13) | Regel-Engine (Ruhezeit/Wochenruhe) | ✅ | Voll gedeckt. |
| Schichtankündigung mit 24h Vorlauf (Sec 17 OWTA) | — | ⚠️ | Ankündigungsfrist nicht als konfigurierbare Regel gedeckt. |
| Banded-Hours-Anträge dokumentiert — Iststunden über 12 Monate | Work-Records | ⚠️ | Iststunden dokumentierbar (planungsbasiert); ein Banded-Hours-Antrags-Workflow/12-Monats-Aggregat ist nicht belegt. |
| On-Premise: volle Datenhoheit, KI-Modell frei/lokal (DPC) | On-Premise + keyless lokales LLM | ✅ | Voll gedeckt. |
| Open Source: kein Vendor-Lock-in | On-Premise/Self-Hosting | ✅ | Voll gedeckt. |
| Klacksy: regelbasiert, keine Blackbox | Klacksy | ✅ | Voll gedeckt. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Wegzeit als Arbeitszeit (Tyco C-266/14) | Wegzeit als bezahlte Arbeitszeit | ✅ | Voll gedeckt. |
| HSE-Vergütung im Blick — Living Wage + Wegzeitvergütung | Wegzeit ✅; Lohnwerte konfigurierbar | ⚠️ | Wegzeit-Erfassung ✅; Living-Wage-/Vergütungs-Tracking ist Payroll-Randbereich, nur als hinterlegter Wert. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| On-Premise: Patientendaten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy schlägt Ersatz vor | Klacksy | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 6-Monats-Referenzzeitraum automatisch berechnet | Live-Compliance-Warnungen | ⚠️ | Mehrmonats-Durchschnitt = nicht durchgesetzter Cap; nur Warnung. |
| Ersatzruhezeit nach COP8 automatisch vorgeschlagen | Regel-Engine (Ruhezeit) | ⚠️ | Ruhezeit-Regel modellierbar; das **automatische Vorschlagen** von Kompensationsruhe bei Verkürzung ist nicht belegt. |
| NCHD-Diensttage — warnt vor 10-Tage-Grenze | Live-Compliance-Warnungen | ⚠️ | Aufeinanderfolgende Diensttage zählbar + Warnung plausibel; nur Warnung, nicht blockierend. |
| On-Premise: Personal-/Patientendaten verlassen die Klinik nicht | On-Premise | ✅ | Voll gedeckt. |
| Klacksy berücksichtigt Qualifikation und Ruhezeit | Klacksy | ✅ | Planung ✅. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | Voll gedeckt. |
| ERO-Mindestlohn €15,41 automatisch angewendet, zentral anpassbar | Konfigurierbare Werte | ⚠️ | Satz zentral hinterlegbar ✅; „automatische Anwendung"/Lohn-Check = Payroll-Randbereich. |
| Nachtzuschlag €20 pro Nachtschicht | Typisierte Zuschläge | ✅ | Pauschalbetrag pro Nachtschicht als typisierter Zuschlag abbildbar. |
| PSA-Standards im Blick — ERO-Bedingungen dokumentiert | Work-Records | ⚠️ | Dokumentation planungsbasiert; kein Audit-Nachweis-Feature. |
| On-Premise: Einsatz-/Kundendaten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy prüft Zuschlag und Verfügbarkeit | Klacksy | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| ERO-Mindestlohn €14,80 automatisch angewendet | Konfigurierbare Werte | ⚠️ | Satz hinterlegbar ✅; automatische Lohn-Anwendung/Warnung nicht belegt. |
| Nachtzuschlag €1/h zwischen 00–06 (nur ab 3h im Fenster) | Typisierte Zuschläge (Nacht, Zeitfenster) | ✅ | Nachtfenster + Mindestschwelle konfigurierbar. |
| Sonntagsarbeit doppelter Satz €29,60 | Typisierte Zuschläge (Wochenende/Sonntag) | ✅ | Sonntagszuschlag als Multiplikator; Satz hinterlegbar. |
| On-Premise: Personaldaten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy berücksichtigt ERO-Sätze | Klacksy | ⚠️ | Planung ✅; Lohnsätze nur als hinterlegte Werte. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| 60h- und 48h-Grenze überwacht (4-Monats-Ref) | Live-Compliance-Warnungen | ⚠️ | Wochen- und Mehrmonats-Cap; nur Warnung. |
| POA (Period of Availability) getrennt erfasst | Schicht-/Statuskategorien | ⚠️ | Eine eigene POA-Kategorie getrennt von Arbeitszeit ist nicht belegt; müsste als Sonderstatus modelliert werden. |
| Führerschein-Klassen passend, Warnung vor Ablauf | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf nicht erzwungen. |
| On-Premise: Touren-/Fahrerdaten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy rechnet POA mit | Klacksy | ⚠️ | Siehe POA-Vorbehalt oben. |

## Fazit

Ruhezeiten, On-Premise/Open-Source, Tourenoptimierung, Wegzeit und die Zuschlags-USPs (Nacht €20, €1/h, Sonntag doppelt) sind ehrlich gedeckt. **Vorbehalte:** alle 48h-/60h-/6-Monats-Referenzzeiträume werden nur überwacht (nicht durchgesetzt); die 24h-Ankündigungsfrist, COP8-Ersatzruhe-Automatik, Banded-Hours-Workflow und die POA-Kategorie sind nicht belegt und sollten als „konfigurierbar/manuell abbildbar" statt „automatisch" formuliert werden.
