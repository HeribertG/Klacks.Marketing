# SA — USP → Klacks-Erfüllung

Bewertung gegen die Capability-Inventur `../../../../docs/content-drafts/usp-analysis/klacks-capabilities.md` (echter Code).
Legende: ✅ voll erfüllt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 8h/Tag bzw. 48h/Woche überwacht, zusätzlich max. 6 aufeinanderfolgende Arbeitstage | Grenzwert-Engine + Warnungen; MaxConsecutiveDays (Warnung + GA-Veto) | ✅ | Tages-/Wochen-Warnung + Konsekutivtage als harter Veto im Auto-Planer. |
| Ramadan 6h/36h automatisch für muslimische Mitarbeitende, ohne manuelle Umstellung | Konfigurierbare Grenzwert-Engine | ⚠️ | Reduzierte Sollzeit pro Person/Periode hinterlegbar; keine eingebaute Ramadan-/Religions-Automatik; Payroll-Aspekt offen. |
| 12-Stunden-Grenze hart durchgesetzt, inkl. Pausen, Gebets- und Essenszeiten | Compliance-Warnungen + GA-Veto | ⚠️ | MaxDailyHours warnt; Auto-Planer vetot den Tagescap; manuelles Speichern wird **nie** blockiert. "Hart durchgesetzt" → warnen. |
| Überstundenzuschlag 50% (150%) auto, wahlweise als Freizeitausgleich | Typisierte Zuschläge (Night/Weekend/Holiday) | ⚠️ | Überstunden-Prämie ist **kein** typisierter Zuschlag-Typ; Überstunden werden erkannt/gewarnt, Prämie nur per editierbarem Macro (nicht validiert); Freizeitausgleich (TOIL) nicht getrackt. |
| Nitaqat-Saudisierungsquote: GOSI-Gehaltsschwellen (1,0/0,5) | — | ❌ | Keine Quoten-/GOSI-/Lohnsummen-Logik; Klacks ist kein HR/Payroll-System. |
| On-Premise: sensible biometrische Zeiterfassungsdaten bleiben in KSA | On-Premise-Stack | ❌ | Keine Biometrie; On-Premise gilt für Planungsdaten. Claim streichen/umformulieren. |
| Open Source, KI-Modell frei wählbar, On-Premise-Betrieb | On-Premise-Stack + keyless lokale KI | ✅ | Default-LLM-Provider sind Cloud → Opt-in für lokal. |
| Klacksy plant per Sprachbefehl nach Skills/Regeln, keine Blackbox | Klacksy | ✅ | |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert, Zeitfenster Auto/zu Fuss eingehalten | Geo-Tourenoptimierung (Modi car/foot, optional zeitfenster-bewusst) | ✅ | |
| 12h-Grenze bei 24h-Betreuungsketten automatisch blockiert, >12h verhindert | Warnungen + GA-Veto | ⚠️ | Warnt; Auto-Planer vetot Tagescap; manuell nie blockiert. "Blockiert/verhindert" → warnen. |
| Ausnahme-Höchstarbeitszeit max. 10h/60h laufend geprüft | Grenzwert-Engine + Warnungen | ✅ | Tages-/Wochen-Warnung. |
| Qualifikationen automatisch, jeder Einsatz nur an passend Qualifizierte | Qualifikations-Matching | ✅ | Fehlende Pflicht-Qual = Veto (exakt). |
| On-Premise: Patientendaten bleiben in KSA | On-Premise-Stack | ✅ | Kein Biometrie-Wort. |
| Klacksy schlägt Ersatz vor, ohne die 12h-Grenze zu verletzen | Klacksy | ⚠️ | Klacksy plant ✅; "ohne 12h zu verletzen" inheritiert warn-only für manuelle Einträge. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung, Lücke automatisch gefüllt | Autofill/GA | ✅ | |
| 3-Wochen-Durchschnitt berechnet + überwacht, Warnung vor Abweichung 8h/48h | Perioden-Stundensummen | ⚠️ | Perioden-Summen (Woche/2-Wo/Monat) vorhanden; kein 3-Wochen-Durchschnitts-Cap; Drift nur gegen Sollstunden, nicht gegen gesetzlichen Schnitt. |
| 9-Stunden-Tagesgrenze für nicht-durchgehende Tätigkeit korrekt eingeplant | Grenzwert-Engine (MaxDailyHours) | ✅ | Pro Vertrag/Rule konfigurierbar. |
| Überstundenzuschlag 50% (150%) auto | Typisierte Zuschläge | ⚠️ | OT-Prämie kein typisierter Zuschlag-Typ; nur per Macro. |
| Qualifikationen pro Station/Abteilung/Funktion | Qualifikations-Matching | ✅ | |
| On-Premise: Personal-/Patientendaten verlassen die Klinik nicht | On-Premise-Stack | ✅ | |
| Klacksy berücksichtigt Qualifikation und 3-Wochen-Durchschnitt | Klacksy | ⚠️ | 3-Wochen-Schnitt-Bezug nicht durchgesetzt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt, offene Stelle automatisch gefüllt | Autofill/GA | ✅ | |
| 12h-Grenze hart durchgesetzt, inkl. Pausen und Gebetszeiten | Warnungen + GA-Veto | ⚠️ | Warnt, blockiert manuell nicht. Reframe. |
| Freitagsruhe automatisch eingeplant: min. 24 zusammenhängende Stunden, voll bezahlt | Ruhetag-Regel (MinRestDays) + GA; Vertragstag/Wochentag-Flag | ✅ | Wochenruhe generisch; fester Freitag über Vertragstag/Verfügbarkeit modellierbar; "voll bezahlt" ist Payroll, Planungsseite ✅. |
| Ruhetagsarbeit: 50%-Zuschlag oder bezahlter Ersatztag | Typisierte Zuschläge | ⚠️ | Über Weekend-Zuschlag mappbar (falls Freitag als Wochenendtag konfiguriert); "Ersatztag" (TOIL) nicht getrackt. |
| Rundgänge optimiert, kurze Wege bei mobilen Diensten | Tourenoptimierung | ✅ | |
| On-Premise: sensible biometrische Zeiterfassungsdaten bleiben in KSA | On-Premise-Stack | ❌ | Keine Biometrie. |
| Klacksy prüft 12h-Grenze und Freitagsruhe automatisch | Klacksy | ⚠️ | 12h inheritiert warn-only. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen automatisch optimiert | Tourenoptimierung | ✅ | |
| Sommer-Mittagsverbot erzwungen: Split-Shifts 15.6.–15.9. im Fenster 12–15 Uhr | — (kein nativer Zeitfenster-Bann) | ⚠️ | Approximierbar über Verfügbarkeits-Sperren, nicht automatisch/jährlich; "erzwungen" → warnen. |
| Teams flexibel eingeteilt, Ausfälle im Überblick, Einteilung vorgeschlagen | Autofill/GA | ✅ | |
| Nitaqat-Mindestlohn dokumentiert (GOSI ab SAR 4.000) | — | ❌ | Keine Lohn-/Quoten-Dokumentation. |
| Qualifikationen passend zugeteilt (Spezialreinigung, Maschinen, Sicherheit) | Qualifikations-Matching | ✅ | |
| Klacksy optimiert Route, Team und Pausen | Klacksy + Route/GA | ✅ | |
| Installation direkt auf eigener Infrastruktur | On-Premise-Stack | ✅ | |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert, weniger Leerfahrten | Tourenoptimierung | ✅ | |
| TGA-Lenkzeiten in Echtzeit (9h/56h/90h-2Wo), Verstösse entstehen gar nicht erst | Grenzwert-Engine + Warnungen | ⚠️ | Keine native Lenkzeit-Domäne; Tages-/Wochenwerte als generische Grenzen + Warnung; 90h/2-Wochen-Aggregat nicht durchgesetzt; "entstehen gar nicht erst" → warnen. |
| Pausen-/Ruhezeiten automatisch: 45min nach 4,5h, 11h Tagesruhe, 48h Wochenruhe | Grenzwert-Engine + GA | ⚠️ | 11h-Tagesruhe / 48h-Wochenruhe als SR ✅; "45min-Pause nach 4,5h Fahrt" (Segment-Pausen-Einfügung) ist nicht nativ. |
| Sommer-Mittagsverbot an unüberdachten Rampen (12–15 Uhr) berücksichtigt | — | ⚠️ | Kein nativer Zeitfenster-Bann + kein Überdacht-Attribut. |
| Führerschein-Klassen passend zugeteilt, Warnung vor ablaufenden Nachweisen | Qualifikations-Matching | ⚠️ | Zuteilung nach exakter Qual ✅; **abgelaufene** Pflicht-Qual blockiert NICHT (nur Warnung); proaktive Vor-Ablauf-Warnung nicht bestätigt. |
| Klacksy rechnet bei Ausfall alles neu inkl. Lenkzeiten und Mittagsverbot | Klacksy | ⚠️ | Inheritiert Lenkzeit-/Bann-Grenzen. |

## Fazit

- **Trägt ehrlich:** Tages-/Wochen-/Konsekutivtage-Grenzwerte (mit GA-Veto), Tourenoptimierung, Autofill, Klacksy, Feiertags-/Ruhetag-Logik, On-Premise-Planungsdaten.
- **Entschärfen:** (1) Nitaqat/GOSI-Quote und Mindestlohn-Doku — Klacks ist kein HR/Payroll-System (❌). (2) Biometrie-Claims → keine biometrische Erfassung. (3) "12h/10h hart durchgesetzt/blockiert" → warnen; 3-Wochen-/90h-Aggregate nicht durchgesetzt. (4) OT-Zuschlag 50% → kein typisierter Zuschlag, nur per Macro. (5) Sommer-Mittagsverbot → kein nativer Zeitfenster-Bann.
- **Bilanz:** ✅ 20 · ⚠️ 17 · ❌ 4.
