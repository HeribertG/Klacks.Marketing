# TW — USP → Klacks-Erfüllung

> Grundlage: `USP-KLACKS-MAPPING.md` (Backbone-Capability-Inventur, Zeilen 17–30). `klacks-capabilities.md` existiert im Repo nicht mehr; die Backbone-Tabelle ist die gültige Capability-Quelle.
> Legende: ✅ voll · ⚠️ mit Vorbehalt · ❌ Lücke. Regel: „überwacht/geprüft/verfolgt" = Warnung → ✅; „erzwungen/gesperrt/blockiert/hart gedeckelt" → ⚠️ (Klacks warnt, sperrt Speichern nie); „biometrische Zeiterfassung" → Biometrie existiert nicht.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 休息日-Zuschlagsstaffel (1,34×/1,67×/2,67×) automatisch, getrennt von 例假日-Verdoppelung | Typisierte Zuschläge, Sätze + Zeitfenster frei konfigurierbar | ✅ | Staffelsätze als eigene Kategorien/Multiplikatoren abbildbar |
| 46/54/138-Stunden-Aggregation fortlaufend überwacht (Monat + rollierendes 3-Monats-Limit, 12h/Tag) | Live-Compliance-Warnungen | ✅ | „überwacht" = Warnung; Monats-/3-Monats-Caps werden gewarnt, nicht hart durchgesetzt |
| 11-Stunden-Schichtabstand erzwungen | Ruhezeit-Regel-Engine | ⚠️ | Regel existiert, aber Klacks warnt, blockiert Speichern nie — „erzwungen" → „überwacht/warnt" umformulieren |
| Vier-Wochen-Flex & 12-Tage-Grenze automatisch abgebildet | Regel-Engine (freie Tage / Wochenruhe) | ✅ | Als Regel/Warnung abbildbar; rollierender 4-Wochen-Zyklus ggf. nur teilweise |
| On-Premise-Datenhoheit stärkt PDPA (個人資料保護法), Personaldaten verlassen Netz nicht | On-Premise/Self-Hosting, keyless lokales LLM | ✅ | Bezieht sich auf Personal-/Planungsdaten, keine Biometrie-Behauptung — sauber |
| Klacksy plant regelbasiert, keine Blackbox | Klacksy (Skills/Rezept-Engine) | ✅ | — |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung (OSRM/ORS + ACO) | ✅ | — |
| Wegzeit zwischen Klient:innen als Arbeitszeit erfasst | Wegzeit als bezahlte Arbeitszeit | ✅ | — |
| 8 freie Tage pro 4 Wochen automatisch gesichert | Regel-Engine (freie Tage) | ⚠️ | „gesichert" impliziert Garantie; Klacks warnt, blockiert nicht; rollierender 4-Wochen-Zyklus nur teilweise |
| 休息日-Zuschlag automatisch gestaffelt (1,34×/1,67×/2,67×) | Typisierte Zuschläge | ✅ | — |
| On-Premise: Personal-/Klientendaten bleiben im Netz, auch nicht zur KI | On-Premise + lokales LLM | ✅ | Keine Biometrie behauptet |
| Klacksy schlägt qualifizierten Ersatz vor | Klacksy + Qualifikations-Matching | ✅ | Match exakt/diskret, kein Fuzzy |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Stationsabdeckung | Schedule-Optimizer/Autofill | ✅ | — |
| Überstunden § 24 korrekt abgerechnet (1,34×/1,67×) | Typisierte Zuschläge | ✅ | Zuschlagsberechnung, keine Lohnabrechnung |
| Übergabezeit als Arbeitszeit, frei wählbare Dauer | Konfigurierbare Arbeitszeit | ✅ | — |
| 11-Stunden-Schichtabstand je Station erzwungen | Ruhezeit-Regel-Engine | ⚠️ | Warnt, sperrt Speichern nicht |
| Qualifikationen & Stationen passend zugeteilt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy; abgelaufene Qualifikation blockiert Zuteilung nicht |
| Klacksy berücksichtigt Übergabezeit/Schichtabstand | Klacksy | ✅ | — |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | — |
| 240-zu-288-Stunden-Cap automatisch überwacht | Live-Compliance-Warnungen | ✅ | Monatscap; Warnung, nicht hart durchgesetzt |
| Tagesgrenze & 11-Stunden-Abstand erzwungen | Regel-Engine | ⚠️ | „erzwungen" → warnt, sperrt nicht |
| Personenschutz & Werttransport separat abgebildet | Konfigurierbare Regeln/Kategorien | ✅ | — |
| Zertifikate/Ausweise geprüft, Warnung vor Ablauf | Qualifikations-Check + Ablauf-Warnung | ✅ | Warnung vorhanden; abgelaufenes Zertifikat blockiert Zuteilung aber nicht |
| Klacksy prüft 240/288-Cap | Klacksy + Warnungen | ✅ | Warnung |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | — |
| 休息日-Zuschlag automatisch gestaffelt | Typisierte Zuschläge | ✅ | — |
| Teams flexibel eingeteilt trotz Aushilfen | Schedule-Optimizer/Autofill | ✅ | — |
| Qualifikationen passend zugeteilt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise-Datenhoheit nach PDPA | On-Premise + lokales LLM | ✅ | Personaldaten; keine Biometrie |
| Klacksy wendet Zuschlagsstaffel an | Klacksy | ✅ | — |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert, Zeitfenster eingehalten | Geo-Tourenoptimierung | ✅ | — |
| 10-Stunden-Fahrzeitgrenze fortlaufend überwacht | Konfigurierbare Grenzwerte + Warnung | ✅ | „überwacht" = Warnung; Fahrzeit wird als Arbeitszeit modelliert, kein separater Fahrzeit-Zähler |
| Pausenpflicht (30 Min / Teilpausen) automatisch eingeplant | Break-Entität, Pausenplanung | ✅ | Pausen als Planobjekt |
| 12-Stunden-Gesamtgrenze & 10-Stunden-Ruhe getrennt geprüft | Regel-Engine + Warnungen | ✅ | „geprüft" = Warnung |
| Führerscheine passend zugeteilt, Warnung vor Ablauf | Qualifikations-Matching + Ablauf-Warnung | ✅ | Blockiert nicht bei Ablauf |
| Klacksy rechnet Fahrzeit/Pausen/Ruhezeit neu | Klacksy | ✅ | — |

## Fazit

- Der belastbare Kern (typisierte Zuschläge, On-Premise/PDPA, Tourenoptimierung, Klacksy, Live-Warnungen) ist über alle fünf Branchen voll gedeckt. TW ist stark, weil die On-Premise-Aussagen konsequent auf Personal-/Planungsdaten zielen und keine Biometrie behaupten.
- Einziger wiederkehrender Vorbehalt: „erzwungen/gesichert" beim 11-Stunden-Abstand und den freien Tagen. Klacks warnt, sperrt aber nie — Formulierung auf „überwacht/warnt" ändern.
- Bilanz TW: 32 ✅ · 4 ⚠️ · 0 ❌.
