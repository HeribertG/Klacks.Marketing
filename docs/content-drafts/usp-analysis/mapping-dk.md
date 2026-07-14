# DK — USP → Klacks-Erfüllung

> Grundlage: distillierte Capability-Inventur (`USP-KLACKS-MAPPING.md`, Backbone-Tabelle). Legende: ✅ voll gedeckt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.
> Diskriminator: Verb entscheidet. „überwacht/geprüft/Warnung/sichtbar" = Monitoring = ✅. „eingehalten/vermieden/nachgeführt/blockieren" = Erzwingung/Automatik = ⚠️ prüfen (Klacks warnt, blockiert Speichern NIE).

## General
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Overenskomst-Regeln flexibel hinterlegt/anpassbar (OK26) | Konfigurierbare Regel-/Zuschlags-Engine | ✅ | Abweichungen ohne Codeänderung hinterlegbar. |
| Ruhezeit 11 h / 35-h-Fridøgn + Verkürzung 8 h bei holddrift | Ruhezeit-Regel-Engine | ⚠️ | 11 h/35 h ✅; automatische holddrift-Verkürzung auf 8 h ist Sonderzyklus → prüfen. |
| Zeiterfassung & 48-h-Nachweis automatisch, 5 Jahre bereit | Work-Records (planungs-/manuell) + 48-h-Monitoring | ⚠️ | 48-h-Schnitt-Warnung ✅; kein verifizierter Clock-in → als dokumentierte Zeitbasis ehrlich, nicht als manipulationssichere Stempelung. |
| Touren & Einsätze automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| On-Premise: Datenhoheit (Datatilsynet) | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy: regelbasiert, plant per Sprache | Klacksy | ✅ | Gedeckt. |

## Häusliche Pflege (spitex)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Fritvalgsordning (Wahlkonto freie Tage/Gehalt/Rente) tagesaktuell | — | ⚠️ | Wahl-/Sparkonto ist HR-/Payroll-Konto, nicht als Klacks-Funktion belegt. |
| 4-Tage-Frist überwacht + 30,85-DKK-Zuschlag | Frist-Monitoring + typisierte Zuschläge | ⚠️ | Fristwarnung ✅; automatische kurzfrist-Umplanungs-Prämie (DKK/Std.) nicht als Mechanismus belegt. |
| Geteilte Dienste (delt tjeneste) automatisch zugeschlagen | Split-Shift-Struktur + typisierte Zuschläge | ✅ | Geteilter Dienst abbildbar, Zuschlag konfigurierbar. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Ersatzsuche | ✅ | Gedeckt. |

## Spitäler (spitaeler)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Schichtwechsel-Ausnahme 8 h + Tillidsrepræsentant-Abstimmung dokumentiert | Ruhezeit-Regel | ⚠️ | 8-h-Verkürzung Sonderfall; Gewerkschafts-Abstimmungs-Workflow nicht abgebildet. |
| 48-h-Schnitt laufend geprüft, Warnung vor Grenze | Grenzwert-Monitoring | ✅ | „Geprüft/Warnung" = ehrlich. |
| Flexibel für jede Overenskomst (versch. Sätze) | Typisierte Zuschläge pro Vertrag | ✅ | Gedeckt. |
| On-Premise: Personal-/Patientendaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, achtet auf Ruhezeit-Grenzen | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Security
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Varskotillæg (525,29 DKK) vermieden statt bezahlt | Frist-Monitoring + typisierte Zuschläge | ⚠️ | Fristwarnung/„Vermeidung" ✅; automatische Tagesprämie-Berechnung nicht belegt. |
| Tarifstufen automatisch nachgeführt (fritvalg auf 10 % zum 1.3.2026) | Konfig. Sätze mit Gültigkeitsdatum (ValidFrom) | ⚠️ | Datierte Satz-Anhebung ✅; fritvalg-Sonderersparnis = Sparkonto, nicht belegt. |
| Zertifikate geprüft, Einsätze nur bei gültigem Ausweis | Qualifikations-Matching + Ablauf-Warnung | ⚠️ | Ablauf-Warnung ✅; abgelaufene Qualifikation BLOCKIERT die Zuteilung NICHT → „nur bei gültigem" umformulieren. |
| Rundgänge/Patrouillen-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Klacksy plant per Sprache, prüft Verfügbarkeit/Fristen | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Haus-/Putzdienste (hausdienste)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Tarifwechsel automatisch nachgeführt (FOA ab 1.4.2026) | Konfigurierbare Tarifzuordnung | ⚠️ | Zuordnung umkonfigurierbar; „automatisch zum Stichtag umgestellt" überzeichnet die Automatik (manuelle Rekonfiguration). |
| 15-37-h-Schnitt überwacht | Grenzwert-Monitoring | ✅ | Gedeckt. |
| Tilkald korrekt vergütet (2-h-Mindestvergütung) | — | ⚠️ | Mindestvergütung/Abruf-Garantie (min. Std.) nicht als Rechenfunktion belegt. |
| Teams flexibel eingeteilt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Klacksy plant per Sprache, optimiert Route/Team | Klacksy + Tourenoptimierung | ✅ | Gedeckt. |

## Logistik
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| 10-h-Grenze bei Nachtarbeit überwacht (Bilag 23) | Grenzwert-Monitoring | ✅ | „Überwacht" = ehrlich. |
| Neue Tarifstufe automatisch hinterlegt (fritvalgskonto auf 10 % zum 1.3.2026) | Konfig. Sätze mit Gültigkeitsdatum | ⚠️ | Lohnerhöhung/Satz datiert hinterlegbar ✅; fritvalgskonto-Sonderersparnis = Sparkonto, nicht belegt. |
| Führerschein-Klassen passend + Warnung vor Ablauf | Qualifikations-Matching (exakt) + Ablauf-Warnung | ✅ | Exakte Zuordnung + Warnung; kein Blockier-Anspruch. |
| Wochenruhe automatisch eingeplant (35 h Fridøgn) | Wochenruhe-Regel | ✅ | Gedeckt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Gedeckt. |

**Fazit DK:** Regel-/Zuschlags-Engine, On-Premise, Klacksy und Tourenoptimierung sind voll gedeckt; DK hat aber überdurchschnittlich viele Vorbehalte. Wiederkehrend problematisch sind (a) tarifliche Sparkonten (Fritvalg/fritvalgskonto — HR/Payroll, nicht abgebildet), (b) kurzfrist-Umplanungs-Prämien (Varsko-/4-Tage-30,85-DKK), deren automatische Berechnung nicht belegt ist, und (c) Ruhezeit-Sonderzyklen (holddrift-8 h). Zusätzlich: Zeiterfassung ohne verifizierten Clock-in und die Zertifikats-Blockade („nur bei gültigem Ausweis") sind zu entschärfen. Empfehlung: Prämien-/Sparkonto-Aussagen zurücknehmen oder als „konfigurierbarer Zuschlag" ehrlich einordnen.
Bilanz: ✅ 25 · ⚠️ 11 · ❌ 0.
