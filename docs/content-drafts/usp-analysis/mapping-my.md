# MY — USP → Klacks-Erfüllung

> Grundlage: `USP-KLACKS-MAPPING.md` (Backbone-Capability-Inventur, Zeilen 17–30). `klacks-capabilities.md` existiert im Repo nicht mehr; die Backbone-Tabelle ist die gültige Capability-Quelle.
> Legende: ✅ voll · ⚠️ mit Vorbehalt · ❌ Lücke. Regel: „überwacht/geprüft/verfolgt" = Warnung → ✅; „erzwungen/gesperrt/blockiert/hart gedeckelt" → ⚠️; „biometrische Zeiterfassung" → Biometrie existiert nicht.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 45-Stunden-Woche automatisch überwacht, Mehrstunde als Überstunde markiert (Sec. 60A) | Konfigurierbare Grenzwerte + Live-Warnungen | ✅ | „überwacht" = Warnung; Wochengrenze konfigurierbar |
| Zuschläge 1,5×/2,0×/3,0× getrennt inkl. RM-4.000-Lohnschwelle | Typisierte Zuschläge | ✅ | Sätze konfigurierbar; lohnabhängiges Gating der Zuschlagsberechtigung an RM-4.000 nicht im Backbone belegt → verifizieren |
| Spread-over 10h, 12h-Tageskappe, 104h-Monatslimit automatisch überwacht | Live-Compliance-Warnungen | ✅ | „überwacht" = Warnung; Monatslimit gewarnt, nicht hart durchgesetzt |
| On-Premise: volle Datenhoheit, biometrische Zeiterfassungsdaten bleiben im Haus (PDPA Act A1727) | On-Premise/Self-Hosting | ⚠️ | On-Premise für Planungs-/Personaldaten ✅; Klacks erfasst KEINE Biometrie — biometrischen Rahmen umformulieren/streichen |
| Klacksy plant regelbasiert | Klacksy | ✅ | — |
| Ausfälle schnell aufgefangen | Autofill/Klacksy | ✅ | — |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| Spread-over 10h überwacht, Überhang als Überstunde markiert | Live-Warnungen | ✅ | Warnung |
| Gestufte Zuschläge 1,5×/2,0×/3,0× inkl. RM-4.000-Schwelle | Typisierte Zuschläge | ✅ | Sätze konfigurierbar; Lohnschwellen-Gating verifizieren |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: Patientendaten UND biometrische Zeiterfassungsdaten bleiben im Haus | On-Premise | ⚠️ | Patientendaten ✅; Biometrie existiert nicht — umformulieren |
| Klacksy schlägt bei Ausfall Ersatz vor | Klacksy | ✅ | — |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose Schichtabdeckung (Tag/Spät/Nacht) | Schedule-Optimizer | ✅ | — |
| RM-4.000-Lohnschwelle automatisch berücksichtigt, korrekte Zuschlagsberechtigung je Mitarbeitendem | Typisierte Zuschläge | ⚠️ | Zuschlagssätze ✅; lohnabhängiges Ein-/Ausschalten der Berechtigung pro Person nicht im Backbone belegt → verifizieren |
| Schichtübergabe als Arbeitszeit, in 45h/Überstunden eingerechnet | Konfigurierbare Arbeitszeit | ✅ | — |
| Zuschläge 1,5×/2,0×/3,0× getrennt pro Station/Rotation | Typisierte Zuschläge | ✅ | — |
| On-Premise: Personal- und Patientendaten verlassen Klinik nicht | On-Premise | ✅ | Keine Biometrie behauptet — sauber |
| Klacksy berücksichtigt Qualifikation und Höchstarbeitszeit | Klacksy + Warnungen | ✅ | — |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 12-Stunden-Wachschicht automatisch aufgeteilt: 8h Normal / 4h Überstunde zu 1,5× | Konfigurierbare Grenzwerte + typisierte Zuschläge | ✅ | Überstundenabgrenzung + Satz konfigurierbar |
| Wöchentlicher ganzer Ruhetag automatisch sichergestellt, auch bei Rotation | Wochenruhe-Regel | ✅ | „sichergestellt" = Regel/Warnung; blockiert Speichern nicht |
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | — |
| Zertifikate/Ausweise geprüft, Warnung vor Ablauf | Qualifikations-Check + Ablauf-Warnung | ✅ | Blockiert Zuteilung nicht bei Ablauf |
| Rundgänge/Patrouillen-Routen optimiert | Geo-Tourenoptimierung | ✅ | — |
| Klacksy prüft Zertifikate/Verfügbarkeit/Ruhetag | Klacksy | ✅ | — |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Überstunden (1,5×) und Ruhetagszuschläge (2,0×) durchgehend berechnet, auch oberhalb RM-4.000 | Typisierte Zuschläge | ✅ | — |
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | — |
| Teams flexibel bei wechselnden Besetzungen | Autofill/Schedule-Optimizer | ✅ | — |
| Qualifikationen passend zugeteilt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: volle Datenhoheit, kein Auslandtransfer | On-Premise | ✅ | — |
| Klacksy optimiert Route/Team/Zuschläge | Klacksy | ✅ | — |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| 45-Stunden-Woche und 8h-Tageslimit laufend überwacht | Konfigurierbare Grenzwerte + Warnung | ✅ | Warnung |
| Spread-over-Limit 10h je Tour im Blick | Live-Warnungen | ✅ | Warnung |
| Pausenpflicht (30 Min nach 5h) automatisch berücksichtigt | Break-Entität, Pausenplanung | ✅ | — |
| Führerschein-Klassen zugeteilt, Warnung vor Ablauf | Qualifikations-Matching + Ablauf-Warnung | ✅ | — |
| Klacksy rechnet inkl. Spread-over neu | Klacksy | ✅ | — |

## Fazit

- Zuschlags-, Grenzwert-, Tourenoptimierungs- und Klacksy-Versprechen sind voll gedeckt. Der wiederkehrende Vorbehalt ist die On-Premise-Aussage „biometrische Zeiterfassungsdaten bleiben im Haus" (General + Spitex): On-Premise ist real, Biometrie erfasst Klacks nicht — Framing entschärfen.
- Zusätzlich zu verifizieren: das lohnabhängige RM-4.000-Gating der Zuschlagsberechtigung. Die Zuschlagssätze selbst sind gedeckt; ob die Berechtigung pro Person automatisch an der Lohnschwelle ein-/ausgeschaltet wird, ist nicht belegt.
- Bilanz MY: 33 ✅ · 3 ⚠️ · 0 ❌.
