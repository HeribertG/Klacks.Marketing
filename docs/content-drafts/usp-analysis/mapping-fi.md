# FI — USP → Klacks-Erfüllung

> Grundlage: distillierte Capability-Inventur (`USP-KLACKS-MAPPING.md`, Backbone-Tabelle). Legende: ✅ voll gedeckt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.
> Diskriminator: Verb entscheidet. „überwacht/berechnet/gebucht/im Voraus veröffentlicht" = ✅. Vorbehalt v. a. bei absoluten €/h-Zuschlägen (Klacks-Sätze sind Multiplikatoren, keine Fixbeträge) und Spesen-Staffelung.

## General
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Periodenarbeit & Überstunden automatisch (2/3-Wochen, 18 h @ 50 %, dann 100 %) | Periodenabschluss + konfigurierbare Überstunden/Zuschläge | ✅ | Periodensummierung + gestaffelte Überstunden-Multiplikatoren abbildbar. |
| Ruhezeiten & 14-Tage-Ausgleich (9 h verkürzt, 35 h Wochenruhe) | Ruhezeit-Regel-Engine | ✅ | Gedeckt. |
| Dienstplan ≥ 1 Woche im Voraus, Änderungen zustimmungspflichtig markiert | Frist-Sichtbarkeit + Änderungs-Markierung (work_change) | ✅ | Fristsichtbarkeit + Kennzeichnung gedeckt. |
| Sonntagszuschlag 100 % (§ 20) + Überstundenvergütung kombiniert | Typisierte Zuschläge (Multiplikator) | ✅ | Kombination Sonntag + Überstunde abbildbar. |
| On-Premise: KI lokal hostbar (Tietosuojalaki 759/2004) | On-Premise/Self-Hosting, keyless lokales LLM | ✅ | Gedeckt. |
| Klacksy: regelbasiert, plant per Sprache | Klacksy | ✅ | Gedeckt. |

## Häusliche Pflege (spitex)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| 9-h-Ruhe & 14-Tage-Ausgleich (SOTE-Periodenarbeit) | Ruhezeit-Regel-Engine | ✅ | Gedeckt. |
| Essenszeit als bezahlte Arbeitszeit gebucht | Konfigurierbare Pause/Arbeitszeit (bezahlt/unbezahlt) | ✅ | Pause bezahlt buchbar. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| On-Premise: Patientendaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Ersatzsuche | ✅ | Gedeckt. |

## Spitäler (spitaeler)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Überstunden gestaffelt (Stunden 121–138 @ 50 %) | Konfigurierbare Überstunden (Multiplikator) | ✅ | Gedeckt. |
| Freie Tage & Wochenruhe (≥ 2 frei/Woche, 2 aufeinanderfolgend in 3 Wochen, Ø 35 h) | Freitag-/Ruhe-Regeln (freier-Sonntag/n-ter-Wochentag) | ✅ | Grundlogik gedeckt; „2 aufeinanderfolgend in 3 Wochen" ggf. feiner konfigurieren. |
| Qualifikationen & Stationen: nur passend Qualifizierte | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| On-Premise: Personal-/Patientendaten verlassen Klinik nicht | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, achtet auf freie Tage/Wochenruhe | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Security
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Periodenarbeit automatisch berechnet, Überstunden gestaffelt | Periodenabschluss + konfig. Überstunden | ✅ | Gedeckt. |
| Nachtarbeit-Grenzen (8 h belastend, max. 5 aufeinanderfolgende Nachtschichten) | Regel-Engine (Nachtgrenze + max. Folge-Nachtschichten) | ✅ | Als Regel abbildbar. |
| Sonntagszuschlag 100 % + TES-Erhöhung 2,5 % zum 1.9.2026 hinterlegt | Typisierte Zuschläge + datierte Satz-Anhebung (ValidFrom) | ✅ | Datierte Zuschlagsanpassung gedeckt. |
| Rundgänge/Patrouillen-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Klacksy plant per Sprache, prüft Periodenstunden/Nacht | Klacksy + Monitoring | ✅ | Gedeckt. |

## Haus-/Putzdienste (hausdienste)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Mindestlohn 13,22 € + TES-Erhöhung 2,7 % hinterlegt | Referenzsatz hinterlegbar | ✅ | Als Bezugswert hinterlegbar; Klacks rechnet aber keine Löhne aus (kein Payroll). |
| Schichtzuschläge Abend 0,73 €/h, Nacht 1,36 €/h, Sonntag 100 % | Typisierte Zuschläge | ⚠️ | Klacks-Zuschlagssätze sind MULTIPLIKATOREN (%), nicht absolute €/h. Sonntag 100 % ✅; feste €/h-Abend-/Nachtzuschläge passen nicht ins Modell → prüfen/Basissatz-Workaround. |
| Ruhezeit & 14-Tage-Ausgleich (9 h in Schichtarbeit) | Ruhezeit-Regel-Engine | ✅ | Gedeckt. |
| Qualifikationen passend (Spezialreinigung/Maschinen/Sicherheit) | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| Klacksy plant per Sprache, optimiert Route/Team/Zuschläge | Klacksy + Tourenoptimierung | ✅ | Gedeckt. |

## Logistik
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Periodenarbeit & Überstunden automatisch berechnet | Periodenabschluss + konfig. Überstunden | ✅ | Gedeckt. |
| Tagespauschalen zugeordnet (43,80 / 19,90 / 54,00 € nach Reisedauer) | Spesen (expenses) | ⚠️ | Spesen abbildbar, aber automatische Staffelung nach Reisedauer nicht als Kernfunktion belegt. |
| Ruhezeiten & Sonntagszuschlag berücksichtigt | Ruhezeit-Regeln + typisierte Zuschläge | ✅ | Gedeckt. |
| Führerschein-Klassen passend + Warnung vor Ablauf | Qualifikations-Matching (exakt) + Ablauf-Warnung | ✅ | Gedeckt. |
| Klacksy plant per Sprache, rechnet Periodenstunden neu | Klacksy + Autofill | ✅ | Gedeckt. |

**Fazit FI:** Von den sieben Ländern die sauberste Deckung — Periodenarbeit/gestaffelte Überstunden, Ruhezeit-/14-Tage-Logik, freie Tage, Fristmarkierung und datierte TES-Erhöhungen (ValidFrom) sind alle abbildbar. Nur zwei Vorbehalte: (1) die festen €/h-Abend-/Nachtzuschläge des Kiinteistöpalvelualan-TES kollidieren mit dem Multiplikator-Modell der Klacks-Zuschläge, (2) Tagespauschalen-Staffelung nach Reisedauer ist keine belegte Automatik. Empfehlung: Fix-Zuschläge über einen kalkulierten Basissatz abbilden oder Formulierung anpassen; Spesen als „hinterlegbar", nicht „automatisch zugeordnet".
Bilanz: ✅ 34 · ⚠️ 2 · ❌ 0.
