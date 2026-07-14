# NL — USP → Klacks-Erfüllung

> Grundlage: distillierte Capability-Inventur (`USP-KLACKS-MAPPING.md`, Backbone-Tabelle). Legende: ✅ voll gedeckt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.
> Diskriminator: Verb entscheidet. „überwacht/eingehalten (Frist)/sichtbar/berechnet" = ✅. „gar nicht erst eingeplant" = Erzwingung = ⚠️ (Klacks warnt, blockiert Speichern NIE; lange Durchschnittsfenster nicht durchgesetzt).

## General
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| ATW-Höchstarbeitszeit überwacht (12 h/Dienst, 60 h/Woche, 4-/16-Wochen-Schnitt) — Verstösse gar nicht erst eingeplant | Grenzwert-Monitoring (Live-Warnung) | ⚠️ | Grenzen werden überwacht/gewarnt; Speichern wird NIE blockiert, 16-Wochen-Schnitt nicht hart erzwungen → „gar nicht erst eingeplant" entschärfen. |
| Rusttijden 11 h / 36 h automatisch (ATW 5:3/5:5) | Ruhezeit-Regel-Engine | ✅ | Gedeckt. |
| Oproepkrachten: 4-Tage-Frist + kurzfristige Absage mit Lohnanspruch sichtbar | Ankündigungsfrist-Sichtbarkeit | ✅ | Sichtbar gemacht = ehrlich. |
| Keine biometrische Zeiterfassung nötig (AVG Art. 9) | Keine Biometrie (nur planungs-/manuelle Erfassung) | ✅ | Ehrlich: Klacks hat gar keine Biometrie — Versprechen deckt sich mit Realität. |
| On-Premise: Datenhoheit, Personaldaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy: regelbasiert, plant per Sprache | Klacksy | ✅ | Gedeckt. |

## Häusliche Pflege (spitex)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| ORT nach Zeitfenster berechnet (5 Stufen CAO VVT, ab 1.1.2026) | Typisierte Zuschläge (Zeitfenster + Multiplikator) | ✅ | 5 Stufen (Werktag-Abend/Nacht, Sa-Tag/Nacht, So/Feiertag) auf Nacht-/Wochenend-/Feiertag-Kategorien abbildbar. |
| €25-Tagesvergütung automatisch erkannt (zusätzlicher Arbeitstag) | Spesen/Zuschlag | ⚠️ | Konditionale Tagesvergütung abbildbar, aber automatische Erkennung „Tag über vereinbarte Tage hinaus" nicht belegt. |
| Oproepkrachten: 4-Tage-Frist eingehalten, Absagen mit Lohnanspruch sichtbar | Ankündigungsfrist-Sichtbarkeit | ✅ | Gedeckt. |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| On-Premise: Patientendaten verlassen das Haus nie | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Ersatzsuche | ✅ | Gedeckt. |

## Spitäler (spitaeler)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 8-h-Ruhezeit nach nächtlicher Bereikbaarheidsdienst (wenn gearbeitet) | Ruhezeit-Sonderfall | ⚠️ | Konditionale 8-h-Ruhe nach nachts geleistetem Bereitschaftsdienst → prüfen. |
| Oproepvrije dagen (≥ 14 in 28-Tage-Fenster + 2 freie Wochenenden) | Freitag-/Ruhe-Regeln | ⚠️ | 2 freie Wochenenden nahe ✅; rollierende 14/28-Tage-Zählung rufbereitschaftsfreier Tage nicht als Standard-Regeltyp belegt → prüfen. |
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Qualifikationen pro Station/Abteilung/Funktion | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| On-Premise: Personal-/Patientendaten verlassen Klinik nicht | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, achtet auf Qualifikation/Ruhezeit | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Security
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Rooster donnerstags veröffentlicht (Woche 1 konkret, 2–4 als Fenster) | Frist-/Veröffentlichungslogik | ✅ | Veröffentlichung/Frist abbildbar; gestaffelte Fenster-Genauigkeit ggf. manuell. |
| Verschuivingstoeslag gestaffelt (5/10/20 % nach Vorlauf) | Typisierte Zuschläge | ⚠️ | Zuschlag gestaffelt nach Änderungs-Vorlauf (Tage bis Dienst) nicht als automatischer Mechanismus belegt. |
| Schiphol: max. 10 verschiedene Dienstantrittszeiten je Periode, Warnung | — | ⚠️ | Sehr spezifische Zähl-Regel (max. 10 Startzeiten/Periode) nicht als Regeltyp belegt. |
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Zertifikate geprüft, Einsätze nur mit gültigem Ausweis | Qualifikations-Matching + Ablauf-Warnung | ⚠️ | Ablauf-Warnung ✅; Zuteilung wird bei Ablauf nicht blockiert → „nur mit gültigem" umformulieren. |
| Klacksy plant per Sprache, prüft Zertifikate/Rooster-Fristen | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Haus-/Putzdienste (hausdienste)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Toeslagtabelle CAO Schoonmaak (Nacht 50/30 %, Tag 0/50 %, Abend 30/50 %, Feiertag 150 %) + Zeitfenster | Typisierte Zuschläge (Multiplikator + Zeitfenster) | ✅ | Als Multiplikatoren + Zeitfenster abbildbar. |
| Q4-Meerarbeit früh erkannt (15 %-Contractaanbod-Pflicht ab 2026) | — | ⚠️ | Quartals-Durchschnittsauswertung („15 % mehr als vereinbart") als Trigger nicht belegt. |
| Oproepkrachten: 4-Tage-Frist eingehalten, Absagen sichtbar | Ankündigungsfrist-Sichtbarkeit | ✅ | Gedeckt. |
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Teams flexibel eingeteilt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Klacksy plant per Sprache, optimiert Route/Team/Zuschläge | Klacksy + Tourenoptimierung | ✅ | Gedeckt. |

## Logistik
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Overuren nach Reform 2026 (alle Stunden über individuell vereinbarte Arbeitszeit) | Konfigurierbare Überstunden-Schwelle pro Person | ✅ | Individuelle Schwelle konfigurierbar. |
| Wochenend-/Feiertagszuschläge (150 % Sa, 200 % So/Feiertag) | Typisierte Zuschläge | ✅ | Gedeckt. |
| Nachtzuschlag eintägiger Fahrten 19 % (21–05) + Samenloop (nur höherer Zuschlag) | Typisierte Zuschläge + Overlap-Regel | ⚠️ | 19 %-Nachtzuschlag ✅; Samenloop-Auflösung (nur der höhere von überlappenden Zuschlägen) nicht als belegte Automatik. |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Rijbewijs-Klassen passend + Warnung vor Ablauf | Qualifikations-Matching (exakt) + Ablauf-Warnung | ✅ | Gedeckt. |
| Klacksy plant per Sprache, rechnet Toeslagen neu | Klacksy + Autofill | ✅ | Gedeckt. |

**Fazit NL:** Solider Kern (Ruhezeiten, Zuschlagstabellen als Multiplikatoren + Zeitfenster, Fristsichtbarkeit, individuelle Überstunden-Schwelle, On-Premise, Klacksy). Ehrlich stark: „keine biometrische Zeiterfassung nötig" trifft Klacks exakt (✅). Die NL-typischen Vorbehalte sind spezifische Detail-Mechaniken, die als Automatik behauptet werden: Verschuivingstoeslag-Staffelung nach Vorlauf, Schiphol-Startzeiten-Zählung, Q4-15 %-Trigger, Samenloop-Auflösung, €25-Tages-Erkennung — sowie die harte ATW-Formel „gar nicht erst eingeplant" (Klacks warnt nur) und die Zertifikats-Blockade. Empfehlung: diese als „unterstützt/sichtbar gemacht" statt „automatisch berechnet/verhindert" formulieren.
Bilanz: ✅ 28 · ⚠️ 9 · ❌ 0.
