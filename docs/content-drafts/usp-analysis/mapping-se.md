# SE — USP → Klacks-Erfüllung

> Grundlage: distillierte Capability-Inventur (`USP-KLACKS-MAPPING.md`, Backbone-Tabelle). Legende: ✅ voll gedeckt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.
> Diskriminator: Verb entscheidet. „überwacht/begrenzt (Monitoring)/hinterlegt/markiert" = ✅. Vorbehalt v. a. bei dygnsvila-Sonderzyklen (task nennt sie explizit), Benefit-/Pensions-Konten und Anspruchs-Accruals.

## General
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Kollektivavtal-Abweichungen von der ATL hinterlegt (statt starr Gesetz) | Konfigurierbare Regel-/Zuschlags-Engine | ✅ | Dispositive Abweichungen ohne Codeänderung hinterlegbar. |
| Überstundengrenzen überwacht (48 h/4 Wo, 50 h/Monat, 200 h/Jahr, ATL § 8) | Grenzwert-Monitoring | ✅ | „Überwacht" ehrlich; Monats-/Jahres-Cap gewarnt, nicht hart gesperrt. |
| Dygnsvila 11 h inkl. Fenster 00–05 Uhr eingehalten (ATL § 13) | Ruhezeit-Regel-Engine | ✅ | Standard-11-h-dygnsvila gedeckt (Sonderzyklen s. Branchen). |
| Zeiterfassung ohne Biometrie (IMY-Beanstandung) | Keine Biometrie (nur planungs-/manuelle Erfassung) | ✅ | Ehrlich: Klacks hat gar keine Biometrie — Versprechen deckt sich mit Realität. |
| Einsätze automatisch optimiert | Geo-Tourenoptimierung/Autofill | ✅ | Gedeckt. |
| On-Premise: Datenhoheit, KI lokal gehostet | On-Premise/Self-Hosting | ✅ | Gedeckt. |

## Häusliche Pflege (spitex)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Dygnsvila je Tarifstichtag (11 h; Verkürzung 9 h nur mit Ausgleich in 14 Tagen) | Ruhezeit-Regel-Engine | ⚠️ | 11-h-Grundlogik + datierte Gültigkeit ✅; gestaffelte Stichtage + 9-h-Ausnahme mit Ausgleichsruhe = Sonderzyklus → prüfen. |
| Jourtid begrenzt (48 h/4 Wo, 50 h/Monat, ATL § 6) | Grenzwert-Monitoring | ✅ | „Begrenzt" = überwacht/gewarnt, keine Sperre. |
| Wegezeit als Arbeitszeit (nur erster/letzter Weg aussen) | Wegzeit als bezahlte Arbeitszeit | ✅ | Deckungsgleich mit Klacks-Modell. |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Gedeckt. |
| On-Premise: Patientendaten verlassen das Haus nie | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Ersatzsuche | ✅ | Gedeckt. |

## Spitäler (spitaeler)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| MBL-Verhandlungspflicht im Blick: wichtigere Musteränderungen markiert | Änderungs-Markierung (work_change) | ✅ | Änderungen markierbar; Hinweis: Markierung/Flag, keine automatische MBL-Bewertung. |
| 20-h-Jourdienst korrekt geplant (Ausnahme von dygnsvila, ≥ 5 h jour 22–08, Ausgleichsruhe) | Ruhezeit-Sonderfall | ⚠️ | Kombinierter 20-h-Jour-Dienst als dygnsvila-Ausnahme = Sonderzyklus → prüfen. |
| 13-h-Grenze (Arbeit + jour + Pausen ≤ 13 h/24 h) automatisch eingehalten | Schichtlängen-Regel | ⚠️ | 13-h-Deckel zur Wahrung der 11-h-dygnsvila ist spezifischer Zyklus → prüfen. |
| OB-Zuschläge nach Tageszeit erkannt und gestaffelt | Typisierte Zuschläge (Zeitfenster + Multiplikator) | ✅ | Gedeckt. |
| On-Premise: Personal-/Patientendaten verlassen Klinik nicht | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, achtet auf dygnsvila | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Security
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Bevakningsavtalet hinterlegt (Laufzeit + neue Bestimmungen) | Konfigurierbare Regel-/Zuschlags-Engine | ✅ | Gedeckt. |
| Deltidspension berücksichtigt (50 % Reduktion ab 62 + 0,1 % Arbeitgeberbeitrag ab 2026) | — | ⚠️ | Arbeitszeitreduktion planbar, aber Pensions-/Arbeitgeberbeitrags-Berechnung (Payroll/HR) nicht belegt. |
| Überstundengrenzen überwacht (48 h/4 Wo, 50 h/Monat, 200 h/Jahr) | Grenzwert-Monitoring | ✅ | Gedeckt. |
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Ausfälle in Minuten ersetzt | Verfügbarkeits-/Ersatzsuche | ✅ | Gedeckt. |
| Klacksy plant per Sprache, prüft Dienstplan-Grenzen | Klacksy + Monitoring | ✅ | Gedeckt. |

## Haus-/Putzdienste (hausdienste)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Mertid-Übergang (ab 1.6.2026 volle Überstundenvergütung 73,63 / 91,39 SEK/h) | Konfigurierbare Zuschläge mit Gültigkeitsdatum (ValidFrom) | ✅ | Datierte Umstellung ✅; Hinweis: absolute SEK/h-Sätze über Basissatz × Multiplikator abbilden (Klacks-Sätze sind Multiplikatoren). |
| Freier Tag (arbetstidsförkortning) ab 2026, anteilig für Teilzeit | — | ⚠️ | Freier Tag planbar, aber automatischer anteiliger Anspruchs-Accrual nicht belegt. |
| Nachtruhe eingehalten (Fenster 00–05 in dygnsvila) | Ruhezeit-Regel | ✅ | Gedeckt. |
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Ausfälle schnell aufgefangen | Verfügbarkeits-/Ersatzsuche | ✅ | Gedeckt. |
| Klacksy plant per Sprache, optimiert Route/Team | Klacksy + Tourenoptimierung | ✅ | Gedeckt. |

## Logistik
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Transportavtalet hinterlegt (Laufzeit + Zuschlag obekväm Freitagabend) | Konfigurierbare Zuschläge | ✅ | Gedeckt. |
| § 12-Grenzen überwacht (48 h/4-Monats-Schnitt, 60 h Einzelwoche) | Grenzwert-Monitoring | ✅ | Gedeckt. |
| Wartezeit von Arbeitszeit getrennt + Fahrtenschreiber-Abgleich | Bereitschafts-/Präsenzzeit-Trennung | ⚠️ | Warte-/Arbeitszeit-Trennung teils abbildbar, aber Fahrtenschreiber-/Tachograph-Abgleich nicht integriert. |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Führerschein-Klassen passend + Warnung vor Ablauf | Qualifikations-Matching (exakt) + Ablauf-Warnung | ✅ | Gedeckt. |
| Klacksy plant per Sprache, rechnet bei Ausfall neu | Klacksy + Autofill | ✅ | Gedeckt. |

**Fazit SE:** Guter Kern — Kollektivavtal-Konfiguration, Grenzwert-Monitoring, OB-Zuschläge, Wegzeit als Arbeitszeit, MBL-Änderungsmarkierung, datierte Tarifumstellungen (ValidFrom), On-Premise und „ohne Biometrie" (✅, trifft Klacks exakt). Die Vorbehalte konzentrieren sich erwartungsgemäß auf die dygnsvila-Sonderzyklen (20-h-Jour, 13-h-Deckel, 9-h-Ausnahme mit Ausgleich) sowie auf zwei HR/Payroll-nahe Punkte: Deltidspension-Beitrag und arbetstidsförkortning-Anspruch. Der Fahrtenschreiber-Abgleich ist nicht integriert. Empfehlung: Sonderzyklen als „unterstützt, konfigurierbar" statt „automatisch eingehalten" formulieren; SEK/h-Sätze über Basissatz abbilden.
Bilanz: ✅ 31 · ⚠️ 6 · ❌ 0.
