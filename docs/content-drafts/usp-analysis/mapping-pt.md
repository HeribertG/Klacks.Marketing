# PT — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Registo de ponto automatisch & normkonform (Beginn/Ende/Pausen, 5 Jahre, einsehbar) Art. 202 | Work-Records (planungs-/manuell) | ⚠️ | Zeiten dokumentierbar, aufbewahrbar, einsehbar ✅; aber kein verifizierter Clock-in — „registo de ponto" impliziert echte Stempelung. |
| Banco de horas grupal — 50h-Woche, 150h-Jahr, 4 Jahre max, nach 65%-Referendum | Live-Compliance-Warnungen | ⚠️ | Wochen-/Jahresgrenzen als Werte hinterlegbar; die 150h-Jahres- und mehrjährige Laufzeit-Überwachung wird nur gewarnt, nicht durchgesetzt. |
| Ruhezeiten & Wochenruhetag — 11h täglich (Art. 214), Wochenruhetag (Art. 232), inkl. Verlegung | Regel-Engine (Ruhezeit/Wochenruhe) | ✅ | Tages-/Wochenruhe inkl. Verlegung gedeckt. |
| On-Premise erleichtert CNPD-Verhältnismässigkeitsprüfung (biometrisch/Arbeitszeit), kein Auslandtransfer | On-Premise + keine Biometrie | ✅ | Voll gedeckt (Klacks hat keine Biometrie, Daten lokal). |
| Klacksy: regelbasiert, keine Blackbox | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen, zeigt wer qualifiziert & verfügbar | Klacksy + Verfügbarkeit + Qualifikation | ✅ | Voll gedeckt (Qualifikation exakt). |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Wegzeit als Arbeitszeit (Art. 197) | Wegzeit als bezahlte Arbeitszeit | ✅ | Voll gedeckt. |
| 11h-Ruhezeit bei Splitting-Diensten in jedem 24h-Fenster | Regel-Engine (Ruhezeit) | ✅ | Tagesruhe-Regel deckt geteilte Dienste. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy schlägt Ersatz vor | Klacksy | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Stationsabdeckung | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 35h- und 40h-Basis automatisch getrennt (SNS öffentlich vs. privat) | Konfigurierbare Grenzwerte pro Trägerschaft | ✅ | Pro Vertrag/Gruppe konfigurierbar. |
| 11h-Ruhezeit nach Bereitschaft automatisch eingeplant (Art. 214) | Regel-Engine (Ruhezeit) | ✅ | Ruhezeit nach Schicht gedeckt. |
| Registo de ponto normkonform (Arbeit + Bereitschaft, 5 Jahre, einsehbar) | Work-Records | ⚠️ | Planungsbasiert; kein verifizierter Clock-in. |
| On-Premise: Personal-/Patientendaten verlassen die Klinik nicht | On-Premise | ✅ | Voll gedeckt. |
| Klacksy berücksichtigt Trägerschaft, Qualifikation, Ruhezeit | Klacksy | ✅ | Voll gedeckt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | Voll gedeckt. |
| Adaptabilitätsregime — 10h/Tag, 50h/Woche, 6-Monats-40h-Schnitt (CCT Cláusula 22) | Konfigurierbare Grenzwerte + Warnungen | ⚠️ | Tages-/Wochengrenze hinterlegbar ✅; der 6-Monats-Durchschnitt wird nur gewarnt, nicht durchgesetzt. |
| Sonntagsrotation — Ruhetag min. 2× in 8 Wochen auf Sonntag | n-ter-Wochentag-/Rotationsregel | ⚠️ | Freier-Sonntag-/n-ter-Wochentag-Logik vorhanden; die spezifische „min. 2 von 8 Wochen"-Quote ist ein komplexer Zyklus, nur teilweise abbildbar. |
| Zertifikate automatisch geprüft, warnt vor Ablauf | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf-Warnung/Blockade nicht erzwungen. |
| Rundgänge/Patrouillen-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Klacksy prüft Zertifikate, Verfügbarkeit, Adaptabilitätsregime | Klacksy | ⚠️ | Verfügbarkeit ✅; Regime-Durchschnitt nur Warnung, Zertifikat-Ablauf siehe oben. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| 30%-Nachtzuschlag für 21:00–06:00 (CCT Cláusula 27) | Typisierte Zuschläge (Nacht, Zeitfenster) | ✅ | Multiplikator + Zeitfenster konfigurierbar. |
| Aktueller CCT (STTEPS 2026-2027) laufend abgebildet, ohne manuelles Nachpflegen | Konfigurierbare Werte | ⚠️ | Überversprechen — CCT-Sätze müssen manuell gepflegt werden; kein Auto-Update. |
| Registo de ponto über wechselnde Objekte/Teams | Work-Records | ⚠️ | Planungsbasiert; kein verifizierter Clock-in. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Klacksy berechnet Route, Team, Nachtzuschlag | Klacksy | ✅ | Voll gedeckt. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| 75%-Strafzuschlag vermieden — tarifliche Grenzen überwacht, Warnung | Live-Compliance-Warnungen + Zuschläge | ⚠️ | Zuschlag konfigurierbar ✅; Grenze wird gewarnt, nicht erzwungen. |
| Neuer CCT 2026 abgebildet, rückwirkende Vergütung ab 1.1.2026 | Konfigurierbare Werte | ⚠️ | Sätze hinterlegbar; „automatisch abgebildet" + rückwirkende Vergütung ist Payroll — nicht gedeckt. |
| Be-/Entladeverbot — Ladezeiten separat, Fahrer keine Lade-Tätigkeit | Tätigkeits-/Schichtkategorien | ⚠️ | Separate Zeiten modellierbar; automatische Ausschluss-Zuteilung nach Tätigkeitsart nicht belegt. |
| Führerschein-Klassen passend, Warnung vor Ablauf | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf nicht erzwungen. |
| Klacksy rechnet Zuschläge und Ladezeiten neu | Klacksy | ⚠️ | Zuschläge ✅; Ladezeit-Ausschlusslogik siehe oben. |

## Fazit

Ruhezeiten (inkl. Wochenruhetag/Verlegung), getrennte 35h/40h-Basis nach Trägerschaft, Nachtzuschlag, Tourenoptimierung, Wegzeit und On-Premise sind ehrlich gedeckt. **Vorbehalte:** „registo de ponto" ist planungs-/manuell-basiert (kein verifizierter Clock-in); banco de horas (150h/Jahr) und das Adaptabilitäts-6-Monats-Mittel werden nur überwacht; „CCT automatisch aktuell/rückwirkende Vergütung" ist Payroll-Überversprechen (manuell pflegen). Die Sonntagsrotation „2 von 8 Wochen" ist nur teilweise als Regel abbildbar.
