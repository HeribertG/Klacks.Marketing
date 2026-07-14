# GB — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 48-Stunden-Grenze & Opt-out verwaltet — 17-Wochen-Schnitt laufend berechnet | Live-Compliance-Warnungen | ⚠️ | 17-Wochen-Durchschnitt = Mehrwochen-Cap, nicht durchgesetzt; Klacks warnt, blockiert nicht. Opt-out als Feld/Flag darstellbar. |
| Ruhezeiten automatisch eingehalten — 11h Tagesruhe, 24h Wochenruhe (WTR Reg. 10/11) | Regel-Engine (Ruhezeit-/Wochenruhe) | ✅ | Tages-/Wochenruhe voll gedeckt. |
| Zeiterfassung ohne Biometrie-Risiko (keine Gesichtserkennung/Fingerabdruck) | Keine Biometrie/RFID im System | ✅ | Ehrliches Positiv: Klacks hat genau keine Biometrie — das ist die compliance-konforme Story. |
| On-Premise: volle Datenhoheit (UK GDPR, DPA 2018) | On-Premise/Self-Hosting | ✅ | Voll gedeckt. |
| Bereit für Employment Rights Act 2025 — künftige Vorankündigungsfristen | — | ⚠️ | Vorankündigungsfristen nicht als Regel gedeckt (Schwellen ohnehin noch offen). |
| Klacksy: regelbasiert, keine Blackbox | Klacksy | ✅ | Voll gedeckt. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Wegzeit als Arbeitszeit (HMRC v Taylors) | Wegzeit als bezahlte Arbeitszeit | ✅ | Voll gedeckt. |
| National Living Wage £12.71 laufend geprüft, Warnung bei Unterschreiten | Konfigurierbare Werte | ⚠️ | Satz hinterlegbar ✅; automatische Effektivlohn-Untergrenzen-Warnung nicht belegt (Warnungen sind Arbeitszeit-/Ruhe-, keine Lohn-Checks). |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy, kein Blockieren bei Ablauf. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy schlägt Ersatz vor | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 13-Stunden-Limit automatisch eingehalten (Junior Doctor Contract) | Live-Compliance-Warnungen | ⚠️ | Tages-Höchstarbeitszeit-Cap; Klacks warnt, blockiert nicht. |
| Ruhezeiten-Kaskade 48/46/48 laufend geprüft (nach 4 Schichten >10h / 4 Nächten / 7 Schichten) | Regel-Engine (Ruhezeit) | ⚠️ | Tagesruhe ✅; die mehrstufige Kaskade nach komplexen Schicht-Zyklen ist nur teilweise abbildbar. |
| WTR-Verstösse sichtbar vor Veröffentlichung | Live-Compliance-Warnungen (Pre-Commit) | ✅ | „Sichtbar machen vor Veröffentlichung" ist genau, was Klacks kann. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy berücksichtigt Schichtlimits/Ruhezeiten | Klacksy | ✅ | Planung ✅; Schichtlimit nur Warnung. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos | Schedule-Optimizer | ✅ | Voll gedeckt. |
| SIA-Lizenzen automatisch geprüft, Warnung vor Ablauf | Qualifikations-Matching (exakt) | ⚠️ | Exakte Zuordnung ✅; Ablauf-Warnung/Blockade der abgelaufenen Lizenz nicht erzwungen. |
| Nachtarbeiter automatisch erkannt (≥3h 23–06), Gesundheitscheck-Fälligkeit | Zeitfenster-Erkennung | ⚠️ | Nachtfenster/Nachtstatus abbildbar ✅; Gesundheitscheck-Fälligkeits-Tracking nicht belegt. |
| Rundgänge optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| On-Premise: Datenhoheit | On-Premise | ✅ | Voll gedeckt. |
| Klacksy prüft SIA-Lizenz, Nachtarbeitsstatus | Klacksy | ⚠️ | Verfügbarkeit/Nachtstatus ✅; Lizenz-Ablauf siehe oben. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| National Living Wage automatisch aktuell, Warnung | Konfigurierbare Werte | ⚠️ | Satz hinterlegbar ✅; automatische Lohn-Untergrenzen-Warnung nicht belegt. |
| TUPE-Übergänge korrekt abgebildet (Pläne/Bedingungen automatisch übernommen) | Stammdaten/Gruppen | ⚠️ | Keine TUPE-Transfer-Automatik belegt; Übernahme müsste manuell abgebildet werden. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Qualifikationen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| Klacksy optimiert Route, Team, Lohnsätze | Klacksy | ⚠️ | Route/Team ✅; „Lohnsätze" = Payroll-Randbereich. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| GB Domestic Rules — 10h Lenkzeit / 11h Dienstzeit laufend geprüft | Live-Compliance-Warnungen | ⚠️ | Grenzwerte hinterlegbar/warnbar ✅; keine Fahrtenschreiber-/Tacho-Datenanbindung, „einhalten" = warnen. |
| Bereit für Kleintransporter-Tacho-Pflicht (2,5–3,5t, digitaler Fahrtenschreiber) | — | ⚠️ | Keine Fahrtenschreiber-/Tacho-Integration; Klacks plant nur, liest keine Tacho-Daten. |
| Führerschein-Klassen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf nicht erzwungen. |
| On-Premise: Datenhoheit | On-Premise | ✅ | Voll gedeckt. |
| Klacksy rechnet Lenkzeiten mit | Klacksy | ⚠️ | Planung ✅; Lenkzeit-Cap nur Warnung, kein Tacho. |

## Fazit

Kern voll gedeckt: WTR-Ruhezeiten, „Verstösse vor Veröffentlichung sichtbar machen", On-Premise, Tourenoptimierung, Klacksy — und das Biometrie-Argument ist ehrlich (Klacks hat genau keine). **Vorbehalte:** alle Höchstarbeitszeit-/Lenkzeit-Grenzen (17-Wochen-Schnitt, 13h-Limit, Domestic Rules) werden nur überwacht/gewarnt, nicht erzwungen; automatische Lohn-Untergrenzen-Warnungen (NLW), TUPE-Automatik und Tacho-Anbindung sind nicht belegt. Empfehlung: „automatisch eingehalten" → „laufend überwacht und vor Veröffentlichung angezeigt".
