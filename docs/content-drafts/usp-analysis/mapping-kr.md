# KR — USP → Klacks-Erfüllung

Bewertung gegen die Capability-Inventur `../../../../docs/content-drafts/usp-analysis/klacks-capabilities.md` (echter Code).
Legende: ✅ voll erfüllt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 52-Stunden-Cap pro Mitarbeitendem überwacht, Warnung vor Überschreitung | Grenzwert-Engine (MaxWeeklyHours) + Warnungen | ✅ | Wochen-Cap wird als Warnung geprüft; Hinweis: warnt, blockiert nicht. |
| Zuschläge automatisch kumuliert statt einzeln, bis 200% (OT 50% + Nacht 50%) | Typisierte Zuschläge | ⚠️ | Klacks **stackt nicht** — "höchster Satz gewinnt", nicht additiv; Nachtzuschlag ✅, aber OT-Prämie kein typisierter Zuschlag. Additive Kumulierung nicht out-of-the-box (nur per Custom-Macro). Reframe. |
| Pausenzeiten automatisch: min. 30 Min. bei >4h, 1 Std. bei >8h | Grenzwert-Engine (MinPauseHours) + GA | ⚠️ | Mindestpause konfigurierbar; die gestaffelte "30min ab 4h / 1h ab 8h"-Schwellenlogik ist nicht nativ. |
| PIPA-konforme Biometrie-Erfassung On-Premise, keine Auslandsübermittlung | On-Premise-Stack | ❌ | Keine Biometrie/Erfassung; On-Premise gilt für Planungsdaten. Claim streichen/umformulieren. |
| On-Premise: volle Datenhoheit, KI-Modell frei wählbar, lokal hostbar | On-Premise-Stack + keyless lokale KI | ✅ | Default-Provider Cloud → Opt-in für lokal. |
| Klacksy plant regelbasiert und nachvollziehbar | Klacksy | ✅ | |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren/Einsatzrouten automatisch optimiert | Geo-Tourenoptimierung | ✅ | |
| Geplante Einsätze automatisch gegen RFID-Besuchsstempel (NHIS-Meldung) abgeglichen | — | ❌ | Kein RFID/Stempel, keine NHIS-Integration. Streichen/umformulieren (z.B. Soll/Ist der geplanten Einsätze, ohne RFID). |
| Wöchentlicher bezahlter Ruhetag (주휴일) + 50/100%-Zuschlag bei Arbeit | Ruhetag-Regel + typisierte Zuschläge | ⚠️ | Bezahlter Wochenruhetag via MinRestDays/Vertragstag planbar; Zuschlag über Weekend/Holiday-Surcharge mappbar (falls Tag entsprechend konfiguriert), nicht automatisch für beliebigen Ruhetag. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching | ✅ | |
| On-Premise: Pflege-/Personendaten bleiben im Haus | On-Premise-Stack | ✅ | |
| Klacksy schlägt bei Ausfall Ersatz vor | Klacksy + GA | ✅ | |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 24h-Grenze für Assistenzärzte (28h im Notfall) ab 21.2.2026 überwacht | Grenzwert-Engine + Warnungen | ✅ | Tages-Höchstarbeitszeit als SR hinterlegbar + Warnung; warnt, blockiert nicht. |
| Bussgeld-Risiko (5 Mio. KRW) durch automatische 24h-Überwachung reduziert | Compliance-Warnungen | ✅ | Ehrlich, da überwacht/warnt; Hinweis: warnt, blockiert nicht. |
| 11h-Mindestruhe zwischen zwei Arbeitstagen automatisch eingeplant | Ruhezeit-Regel (MinRestHours) + GA | ✅ | |
| Qualifikationen stations-/abteilungsübergreifend | Qualifikations-Matching | ✅ | |
| On-Premise: Personal-/Patientendaten verlassen die Klinik nicht | On-Premise-Stack | ✅ | |
| Klacksy berechnet Ruhezeit und Grenze mit | Klacksy | ✅ | Ruhezeit/Tagescap sind native SR-Werte. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| MOEL-Genehmigung (§63) zur Befreiung pro Mitarbeitendem hinterlegt | — | ⚠️ | Kein dediziertes §63-Ausnahme-Feld gefunden; über Vertrag/Attribut abbildbar. Verifizieren. |
| Nachtzuschlag (50%) 22:00–06:00 auch bei §63-befreiten Wachleuten weiter berechnet | Typisierte Zuschläge (Night) | ⚠️ | Nachtzuschlag existiert ✅, Fenster aber **23–06 hart**, nicht 22–06 (kein Setting). |
| Objekte & Posten lückenlos besetzt | Autofill/GA | ✅ | |
| 24h-Wechselschichten über mehrere Objekte geplant | GA + Tourenoptimierung | ✅ | |
| On-Premise: Einsatz-/Kundendaten bleiben im Betrieb | On-Premise-Stack | ✅ | |
| Klacksy prüft Befreiung und Nachtzuschlag mit | Klacksy | ⚠️ | §63-Befreiung/Nachtfenster-Bezug siehe oben. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Wartezeit zwischen zwei Einsätzen einer geteilten Schicht (분할근무) als vergütungspflichtige Arbeitszeit erfasst | Work-Records / WorkChange | ⚠️ | Zeit als bezahlte Arbeitszeit erfassbar; keine automatische Split-Shift-Wartezeit-Logik. |
| 52-Stunden-Cap automatisch überwacht | Grenzwert-Engine (MaxWeeklyHours) + Warnungen | ✅ | |
| Objekt-Routen optimiert, auch bei geteilten Schichten | Tourenoptimierung | ✅ | |
| Teams flexibel eingeteilt | Autofill/GA | ✅ | |
| On-Premise: Einsatzdaten bleiben im Betrieb | On-Premise-Stack | ✅ | |
| Klacksy optimiert Route und Wartezeit mit | Klacksy + Route | ✅ | Wartezeit-Erfassung inheritiert Work-Manualität, aber machbar. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Tourenoptimierung | ✅ | |
| 11h-Mindestruhe zwischen zwei Arbeitstagen automatisch geprüft | Ruhezeit-Regel (MinRestHours) + Warnungen | ✅ | |
| Roster-Stunden gegen Sicherheitsfrachtraten (안전운임제) gespiegelt, als Übermüdungshinweis | Perioden-Stundensummen | ⚠️ | Roster-Stunden sichtbar; keine Frachtraten-Daten/Integration. "Hinweis aus Stunden" = reine Stundensicht. Reframe. |
| Qualifikationen & Berechtigungen passend zugeteilt, Warnung vor Ablauf | Qualifikations-Matching | ⚠️ | Exakte Zuteilung ✅; **abgelaufene** Pflicht-Qual blockiert NICHT (nur Warnung); proaktive Vor-Ablauf-Warnung nicht bestätigt. |
| Ausfälle schnell aufgefangen — qualifiziert/verfügbar/innerhalb der Ruhezeit | GA/Qual + Ruhezeit-Regel | ✅ | Ruhezeit ist native. |
| Klacksy plant per Sprache, rechnet bei Ausfall alles neu | Klacksy | ✅ | |

## Fazit

- **Trägt ehrlich:** 52h-Wochen-Cap-Warnung, 11h-Ruhezeit, Autofill, Tourenoptimierung, Klacksy, Qualifikations-Matching, On-Premise-Planungsdaten. KR-Spitäler sind durchgehend gut gedeckt.
- **Entschärfen:** (1) RFID-Besuchsstempel/NHIS-Abgleich (❌) — existiert nicht. (2) PIPA-"Biometrie-Erfassung" (❌) — keine Biometrie. (3) "Zuschläge kumuliert bis 200%" → Klacks stackt NICHT (höchster Satz gewinnt); OT-Prämie kein typisierter Zuschlag. (4) Nachtzuschlag 22–06 → Default 23–06. (5) §63-Befreiung und Split-Shift-Wartezeit nur teilweise; Sicherheitsfrachtraten nicht integriert.
- **Bilanz:** ✅ 25 · ⚠️ 9 · ❌ 2.
