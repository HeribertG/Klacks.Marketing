# ID — USP → Klacks-Erfüllung

> Grundlage: `USP-KLACKS-MAPPING.md` (Backbone-Capability-Inventur, Zeilen 17–30). `klacks-capabilities.md` existiert im Repo nicht mehr; die Backbone-Tabelle ist die gültige Capability-Quelle.
> Legende: ✅ voll · ⚠️ mit Vorbehalt · ❌ Lücke. Regel: „überwacht/geprüft/verfolgt" = Warnung → ✅; „erzwungen/gesperrt/blockiert/harte Sperre" → ⚠️; „biometrische Zeiterfassung" → Biometrie existiert nicht.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 18-Stunden-Wochenlimit automatisch überwacht (4h-Tagesgrenze, schriftliche Freigabe) — PP 35/2021 | Konfigurierbare Grenzwerte + Live-Warnungen | ✅ | „überwacht" = Warnung; Wochen-Überstundenkonto gewarnt, nicht durchgesetzt; Freigabe-Workflow nicht belegt → Note |
| Progressive Zuschläge 1,5×/2,0×/3,0×/4,0×, richtige Tabelle 5/6-Tage, Basis 1/173 | Typisierte Zuschläge + Vertrags-/Regelvarianten | ✅ | Multiplikatoren konfigurierbar; 5/6-Tage als Regelvariante; „Basis 1/173" ist Satzberechnung, keine Payroll |
| Gesetzliche Schichtpause nach 4h automatisch, unbezahlt korrekt herausgerechnet | Break-Entität, Pausenplanung | ✅ | Pausen als Planobjekt, unbezahlt abbildbar |
| Touren & Einsätze automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| On-Premise: biometrische Daten bleiben im Haus (PDP data pribadi spesifik) | On-Premise/Self-Hosting | ⚠️ | On-Premise für Planungs-/Personaldaten ✅; Biometrie erfasst Klacks nicht — umformulieren/streichen |
| Klacksy: regelbasiert, keine Blackbox | Klacksy | ✅ | — |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Agentur-Personal nach UU 13/2003 (40h-Woche + Überstunden), getrennt von PRT-Verträgen | Konfigurierbare Grenzwerte pro Vertrag/Gruppe | ✅ | Getrennte Grenzwerte pro Vertragstyp abbildbar |
| Progressive Zuschläge 1,5×/2,0×/3,0×/4,0× | Typisierte Zuschläge | ✅ | — |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Keine Biometrie behauptet |
| Klacksy schlägt sofort verfügbaren Ersatz vor | Klacksy | ✅ | — |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Stationsabdeckung | Schedule-Optimizer | ✅ | — |
| Feiertagszuschlag progressiv, richtige Tabelle 5/6-Tage | Typisierte Zuschläge + Regelvariante | ✅ | — |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Keine Biometrie behauptet |
| Klacksy berücksichtigt Qualifikation und Zuschläge | Klacksy | ✅ | — |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Harte 12-Stunden-Sperre im Roster — Schichten über 12h automatisch blockiert | Live-Compliance-Warnungen | ⚠️ | „harte Sperre/blockiert" — Klacks warnt, sperrt Speichern NIE — auf „warnt bei Überschreitung" umformulieren |
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | — |
| Überstunden-Zuschläge 1,5×/2,0× bis 12h-Tagescap | Typisierte Zuschläge | ✅ | — |
| Zertifikate geprüft — Einsätze nur an Personal mit gültigem Satpam-Ausweis, Warnung vor Ablauf | Qualifikations-Check + Ablauf-Warnung | ⚠️ | Warnung vor Ablauf ✅; „nur an gültigen Ausweis zugeteilt" — abgelaufenes Zertifikat blockiert die Zuteilung NICHT — umformulieren |
| On-Premise: volle Datenhoheit | On-Premise | ✅ | — |
| Klacksy prüft Tagescap/Zuschläge/Zertifikate | Klacksy + Warnungen | ✅ | Warnung |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | — |
| Richtige Zuschlagstabelle je Objekt (5/6-Tage, PP 35/2021) automatisch | Typisierte Zuschläge + Regelvariante pro Objekt | ✅ | — |
| Pausen automatisch eingeplant (30 Min nach 4h) | Break-Entität, Pausenplanung | ✅ | — |
| Teams flexibel eingeteilt | Autofill/Schedule-Optimizer | ✅ | — |
| On-Premise: volle Datenhoheit | On-Premise | ✅ | — |
| Klacksy optimiert Route, Team und Pausen | Klacksy | ✅ | — |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| 8-Stunden-Lenkzeitgrenze überwacht, Warnung vor Überschreitung (UU 22/2009) | Konfigurierbare Grenzwerte + Warnung | ✅ | Warnung; Lenkzeit wird als Arbeitszeit modelliert |
| 30-Minuten-Pause nach 4h automatisch eingeplant | Break-Entität, Pausenplanung | ✅ | — |
| Führerschein-Klassen passend, Warnung vor Ablauf | Qualifikations-Matching + Ablauf-Warnung | ✅ | Blockiert nicht bei Ablauf |
| On-Premise: volle Datenhoheit | On-Premise | ✅ | — |
| Klacksy rechnet bei Ausfall neu inkl. Lenkzeit und Pausen | Klacksy | ✅ | — |

## Fazit

- Zuschlags-Tabellen (progressiv, 5/6-Tage), Pausenplanung, Tourenoptimierung und Klacksy sind voll gedeckt — ID ist inhaltlich stark, weil die meisten On-Premise-Aussagen sauber auf Personal-/Patientendaten zielen.
- Zwei klare Überversprechen in Security: die „harte 12-Stunden-Sperre" (Klacks warnt, sperrt nie) und „Einsätze nur an gültigen Satpam-Ausweis" (abgelaufene Qualifikation blockiert die Zuteilung nicht). Plus die General-On-Premise-Zeile mit Biometrie-Framing.
- Bilanz ID: 32 ✅ · 3 ⚠️ · 0 ❌.
