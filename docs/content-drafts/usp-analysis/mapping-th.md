# TH — USP → Klacks-Erfüllung

> Grundlage: `USP-KLACKS-MAPPING.md` (Backbone-Capability-Inventur, Zeilen 17–30). `klacks-capabilities.md` existiert im Repo nicht mehr; die Backbone-Tabelle ist die gültige Capability-Quelle.
> Legende: ✅ voll · ⚠️ mit Vorbehalt · ❌ Lücke. Regel: „überwacht/geprüft/verfolgt" = Warnung → ✅; „hart gedeckelt/gesperrt/erzwungen" → ⚠️ (Klacks warnt, sperrt Speichern nie); „biometrische Zeiterfassung" → Biometrie existiert nicht.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 36h-Wochenlimit hart gedeckelt, Planung vor Überschreitung gesperrt — Section 26 | Live-Compliance-Warnungen | ⚠️ | „hart gedeckelt/gesperrt" — Klacks warnt, sperrt Speichern nie; als „überwacht/warnt" ehrlich |
| Dreistufige Überstundensätze 1,5×/2,0×/3,0× automatisch zugewiesen | Typisierte Zuschläge | ✅ | Sätze konfigurierbar |
| Pausenpflicht nach 5h automatisch, aufteilbar | Break-Entität, Pausenplanung | ✅ | Pausen als Planobjekt |
| Ruhetag-Abstand max. 6 Tage automatisch eingehalten — Section 28 | Wochenruhe-/Ruhetag-Regel | ✅ | Regel/Warnung |
| PDPA-konforme On-Premise-Speicherung, biometrische Zeiterfassungsdaten bleiben im Firmennetz | On-Premise/Self-Hosting | ⚠️ | On-Premise für Planungs-/Personaldaten ✅; Biometrie erfasst Klacks nicht — umformulieren/streichen |
| Klacksy plant regelbasiert | Klacksy | ✅ | — |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren/Pflegeeinsätze automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| 1-Stunden-Pause nach max. 5h verlässlich dokumentiert | Break-Entität, Pausenplanung | ✅ | Pausen planbar/dokumentiert |
| 36h-Wochenlimit hart gedeckelt, gesperrt — Section 26 | Live-Warnungen | ⚠️ | Warnt, sperrt nicht |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: Patienten- und biometrische Zeiterfassungsdaten bleiben im Haus | On-Premise | ⚠️ | Patientendaten ✅; Biometrie existiert nicht — umformulieren |
| Klacksy schlägt bei Ausfall Ersatz vor | Klacksy | ✅ | — |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Stationsabdeckung | Schedule-Optimizer | ✅ | — |
| Schichtübergabe als Arbeitszeit, 1,5× ab 8h-Tagesgrenze | Konfigurierbare Arbeitszeit + typisierte Zuschläge | ✅ | — |
| 36h-Wochenlimit stationsübergreifend gedeckelt — Section 26 | Live-Warnungen | ⚠️ | „gedeckelt" — warnt, sperrt nicht |
| Qualifikationen pro Station/Abteilung/Funktion | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: Personal- und Patientendaten verlassen Klinik nicht | On-Premise | ✅ | Keine Biometrie behauptet — sauber |
| Klacksy berücksichtigt Qualifikation und 36h-Limit | Klacksy + Warnungen | ✅ | — |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | — |
| 12h-Schichten: 8h regulär / 4h Überstunde getrennt, 1,5× | Konfigurierbare Grenzwerte + typisierte Zuschläge | ✅ | — |
| 36h-Wochenlimit hart gedeckelt — Section 26/144 | Live-Warnungen | ⚠️ | Warnt, sperrt nicht |
| Ruhetag-Abstand max. 6 Tage automatisch eingehalten | Wochenruhe-/Ruhetag-Regel | ✅ | Regel/Warnung |
| Lizenzen geprüft, Warnung vor Ablauf | Qualifikations-Check + Ablauf-Warnung | ✅ | Blockiert nicht bei Ablauf |
| Klacksy prüft Lizenz/Verfügbarkeit/36h | Klacksy | ✅ | — |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | — |
| 36h-Wochenlimit objektübergreifend gedeckelt — Section 26 | Live-Warnungen | ⚠️ | Warnt, sperrt nicht |
| Teams flexibel eingeteilt, ohne 36h einer Person zu überschreiten | Autofill + Live-Warnungen | ✅ | 36h-Aggregation als Warnung; nicht hart durchgesetzt |
| Qualifikationen passend zugeteilt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: volle Datenhoheit auch bei KI-Nutzung | On-Premise + lokales LLM | ✅ | Personaldaten; keine Biometrie behauptet |
| Klacksy optimiert Route/Team/36h-Limit | Klacksy | ✅ | — |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| Ruhepause nach max. 4h Lenkzeit automatisch reserviert, aufteilbar | Break-Entität, Pausenplanung | ✅ | — |
| 36h-Wochenlimit hart gedeckelt — Section 26 | Live-Warnungen | ⚠️ | Warnt, sperrt nicht |
| 8h+2h-Grenze pro Fahrer laufend überwacht | Konfigurierbare Grenzwerte + Warnung | ✅ | Warnung |
| Führerschein-Klassen zugeteilt, Warnung vor Ablauf | Qualifikations-Matching + Ablauf-Warnung | ✅ | Blockiert nicht bei Ablauf |
| Klacksy rechnet Lenk- und Ruhezeiten neu | Klacksy | ✅ | — |

## Fazit

- Zuschläge, Pausen-/Ruhetag-Regeln, Tourenoptimierung und Klacksy sind voll gedeckt. TH hat aber die aggressivste Enforcement-Sprache aller fünf Länder: „36h-Wochenlimit hart gedeckelt/gesperrt" zieht sich durch fast jede Branche.
- Konsequenz: In jeder Branche mindestens eine ⚠️ wegen „hart gedeckelt/gesperrt" (Klacks warnt, sperrt nie) plus die On-Premise-Biometrie-Zeilen (General, Spitex). Durchgängig auf „live überwacht/warnt vor Überschreitung" umformulieren.
- Bilanz TH: 28 ✅ · 8 ⚠️ · 0 ❌.
