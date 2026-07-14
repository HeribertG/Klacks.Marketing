# CZ — USP → Klacks-Erfüllung

> Grundlage: distillierte Capability-Inventur (`USP-KLACKS-MAPPING.md`, Backbone-Tabelle). Legende: ✅ voll gedeckt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.
> Diskriminator: Verb entscheidet. „im Blick/überwacht/geprüft/Warnung/sichtbar" = Monitoring = ✅. „sperren/blockieren/erzwingen/eingehalten/hält ein" = Erzwingung = ⚠️ (Klacks warnt, blockiert Speichern NIE; Monats-/Jahres-Caps nicht durchgesetzt).

## General
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Wochensoll je Schichttyp (40/38,75/37,5 h) automatisch berechnet | Konfigurierbare Wochensoll-Grenzwerte (Contract/SchedulingRule) | ✅ | Pro Schichttyp/Vertrag hinterlegbar, ohne Codeänderung. |
| 2-Wochen-Ankündigungsfrist automatisch eingehalten | Ankündigungsfrist-Sichtbarkeit / Vorlauf-Warnung | ✅ | „Eingehalten" = sichtbar gemacht/gewarnt, nicht hart erzwungen. |
| 416-Stunden-Jahresgrenze im Blick (150 h angeordnet) | Live-Grenzwert-Monitoring (SignalR/Pre-Commit) | ✅ | „Im Blick" ist ehrlich; Jahreswert wird gewarnt, NICHT gesperrt. |
| Self-Planung § 87a: 12-h-Obergrenze und Ruhezeiten eingehalten | Ruhezeit-/Schichtlängen-Regeln (Warnung) | ✅ | Warnt bei 12-h-Überschreitung; „hält ein" = warnt, blockiert Speichern nicht. |
| On-Premise: Datenhoheit, KI-Modell frei wählbar | On-Premise/Self-Hosting, keyless lokales LLM, DSGVO-Löschung/Retention | ✅ | Kern-Fähigkeit, voll gedeckt. |
| Klacksy: regelbasiert, keine Blackbox | Klacksy (Skills, Rezept-Engine, Voice STT/TTS) | ✅ | Nachvollziehbar regelbasiert. |

## Häusliche Pflege (spitex)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung (OSRM/ORS + ACO) | ✅ | Kern-Fähigkeit. |
| Neue Kompetenzen qualifikationsgesteuert (ab Kurs) | Qualifikations-Matching (exakt) | ✅ | Exakte Zuordnung gedeckt. |
| 3-Personen-Limit automatisch eingehalten | — | ⚠️ | Keine dokumentierte Kapazitäts-/Gleichzeitigkeitsobergrenze pro Betreuer; „eingehalten" nicht durchgesetzt. |
| Nachtzuschlag je Trägerform (plat 20 %, mzda 10 %) | Typisierte Zuschläge, Sätze pro Vertrag/Gruppe | ✅ | Als Multiplikator konfigurierbar. |
| On-Premise: Daten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Verfügbarkeits-/Ersatzsuche | ✅ | Gedeckt. |

## Spitäler (spitaeler)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 22-h-Ruhezeit nach 24-h-Dienst automatisch geplant | Ruhezeit-Regel-Engine | ⚠️ | Standard-Tages-/Wochenruhe ✅; 22 h nach durchgehendem 24-h-Dienst ist konditionaler Sonderzyklus → prüfen. |
| 416-Stunden-Jahresgrenze im Blick | Grenzwert-Monitoring | ✅ | Warnung, nicht Sperre. |
| Überstundenzuschlag 25 % korrekt berechnet | Typisierte Zuschläge (Multiplikator) | ✅ | Gedeckt. |
| Stationen & Qualifikationen abgestimmt | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| On-Premise: Personal-/Patientendaten verlassen Klinik nicht | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, achtet auf Ruhezeit | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Security
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| 8-h-Nachtgrenze automatisch geprüft (26-Wochen-Schnitt) | Grenzwert-Monitoring | ✅ | „Geprüft" = Warnung; 26-Wochen-Durchschnitt nicht hart erzwungen. |
| DPP/DPČ: 3-Tage-Frist + 10 % Nacht + 10 % Wochenende | Ankündigungsfrist-Sichtbarkeit + typisierte Zuschläge | ✅ | Fristsichtbarkeit + Zuschläge gedeckt. |
| Verkürzte Ruhezeit 11→8 h sauber ausgeglichen | Ruhezeit-Regel | ⚠️ | Konditionaler Ausgleichszyklus (Folge-Ruhezeit verlängern) nicht als Automatik belegt → prüfen. |
| On-Premise: Einsatz-/Kundendaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, prüft Ruhezeit/Verfügbarkeit | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Haus-/Putzdienste (hausdienste)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| 38,75-h-Soll automatisch erkannt + Überstunden 25 % | Konfig. Wochensoll + typisierte Zuschläge | ✅ | Gedeckt. |
| Selbst-Planung mit 12-h-Deckel | Schichtlängen-Regel (Warnung) | ✅ | Warnung, keine Sperre. |
| Urlaubsanspruch für DPP/DPČ berechnet (fiktive 20-h-Woche) | — | ⚠️ | Urlaubs-Accrual/Anspruchsberechnung nicht als Kernfunktion belegt (kein Payroll/HR-Modul). |
| Klacksy plant per Sprache, optimiert Route/Team | Klacksy + Tourenoptimierung | ✅ | Gedeckt. |
| Ausfälle schnell aufgefangen | Verfügbarkeits-/Ersatzsuche | ✅ | Gedeckt. |

## Logistik
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| 56-Tage-Fahrtenschreiber-Nachweis immer griffbereit | — | ⚠️ | Keine Fahrtenschreiber-/Tachograph-Integration; Klacks ist keine Datenquelle für diesen Nachweis. |
| 60-h-Woche im 26-Wochen-Schnitt geprüft (+ Nacht 10 h/24 h) | Grenzwert-Monitoring | ✅ | „Geprüft" = Warnung; Durchschnittsgrenze überwacht, nicht gesperrt. |
| Rufbereitschaft getrennt, 10 % vergütet, Einsatz = Überstunde | Bereitschaft/Verfügbarkeit + typisierte Zuschläge | ✅ | Trennung Bereitschaft/Arbeit abbildbar; Satz konfigurierbar. |
| On-Premise: Tour-/Fahrerdaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Gedeckt. |

**Fazit CZ:** Der belastbare Kern (Wochensoll- und Grenzwert-Monitoring, typisierte Zuschläge nach Trägerform, On-Premise, Klacksy, Tourenoptimierung) ist voll gedeckt. Vier Vorbehalte betreffen (a) durchgesetzte Kapazitäts-/Ruhezeit-Sonderzyklen (3-Personen-Limit, 22 h nach 24 h, 11→8-Ausgleich), die als Zwang formuliert sind, aber nur teilweise/gar nicht durchgesetzt werden, und (b) zwei echte Modul-Lücken: DPP/DPČ-Urlaubs-Accrual und der Fahrtenschreiber-56-Tage-Nachweis. Empfehlung: „eingehalten/hält ein" zu „überwacht/warnt" entschärfen; Fahrtenschreiber-Nachweis nicht als Klacks-Leistung behaupten.
Bilanz: ✅ 31 · ⚠️ 5 · ❌ 0.
