# GR — USP → Klacks-Erfüllung

> Grundlage: distillierte Capability-Inventur (`USP-KLACKS-MAPPING.md`, Backbone-Tabelle). Legende: ✅ voll gedeckt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.
> Zentraler Vorbehalt: **ERGANI**. Klacks hat KEINE ERGANI-Schnittstelle und keinen verifizierten Clock-in — es liefert nur die dokumentierte Zeitbasis. Die durchgängige Formel „ohne Risiko der 10.500-€-Busse" ist ein Überversprechen und in allen Branchen zu entschärfen.

## General
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| ERGANI-konforme Zeiterfassung, bereit für ERGANI-II-Abgleich, ohne 10.500-€-Busse | Work-Records (planungs-/manuell) | ⚠️ | Keine ERGANI-Schnittstelle, kein verifizierter Clock-in. Klacks liefert die dokumentierte Zeitbasis für die Meldung — Busse-Garantie streichen, zu „liefert die Zeitbasis für die ERGANI-Meldung" umformulieren. |
| Sechstagewoche: 40 % für 6. Arbeitstag / 115 % Sonn-Feiertag, 8-h-Deckel | Typisierte Zuschläge + Regel | ⚠️ | Sonn-/Feiertag-115 % ✅; der 40-%-Zuschlag speziell für den 6. gearbeiteten Wochentag erfordert Zählung der Arbeitstage/Woche — kein Standard-Zeitfenster-Zuschlag → prüfen. |
| Drei Überstunden-Stufen (+20 / +40 / +120 %) + 45/48-h-Woche | Typisierte Zuschläge (Multiplikatoren) + Grenzwert-Monitoring | ✅ | Stufen als Multiplikatoren abbildbar, Wochengrenze überwacht. Hinweis: „+120 % nicht deklariert" hängt vom ERGANI-Meldestatus ab, den Klacks nicht kennt. |
| 13-h-Tag (37,5-Tage-Jahresgrenze + 11-h-Ruhe) | Ruhezeit-Regel + Jahres-Zählung | ⚠️ | 11-h-Ruhe ✅; die jährliche 37,5-Tage-Zählung der verlängerten Tage nicht als durchgesetzte Grenze belegt. |
| On-Premise: KI-Modell frei wählbar | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy: regelbasiert, plant per Sprache | Klacksy | ✅ | Gedeckt. |

## Häusliche Pflege (spitex)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Jeder Einsatz ERGANI-konform dokumentiert (ab 12.10.2026), ohne Busse | Work-Records | ⚠️ | Dokumentierte Zeitbasis ✅; keine ERGANI-Schnittstelle/kein Clock-in — Busse-Garantie entschärfen. |
| Ruhezeiten 11 h / 24 h über alle Touren geprüft (P.D. 88/1999) | Ruhezeit-Regel-Engine | ✅ | Gedeckt. |
| Zuschlagsstufen (+20 / +40 / +120 %) auch in Teilzeit | Typisierte Zuschläge (Multiplikatoren) | ✅ | Gedeckt. |
| On-Premise: Patientendaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Ersatzsuche | ✅ | Gedeckt. |

## Spitäler (spitaeler)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Stationsabdeckung | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| ERGANI-konform ab 12.10.2026, ohne Busse | Work-Records | ⚠️ | Wie General: keine Schnittstelle/kein Clock-in — entschärfen. |
| Bereitschaftsdienste (24-h-Εφημερία + Ausgleichsruhe, Gesetz 4498/2017) | Ruhezeit-Sonderfall | ⚠️ | 24-h-Bereitschaft + anschließende Ausgleichsruhe ist Sonderzyklus → prüfen. |
| Ruhezeiten 11 h / 24 h auch bei rotierenden Diensten | Ruhezeit-Regel-Engine | ✅ | Gedeckt. |
| On-Premise: Personal-/Patientendaten verlassen Klinik nicht | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, achtet auf Qualifikation/Ruhezeiten | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Security
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Nachtzuschlag 25 % + Sonntag 75 % sauber getrennt | Typisierte Zuschläge (Zeitfenster + Multiplikator) | ✅ | Getrennte Kategorien gedeckt. |
| Sechstagewoche 40 % / 115 % + rechtzeitige ERGANI-Meldung | Typisierte Zuschläge/Regel + Work-Records | ⚠️ | 6.-Tag-40 % speziell (Arbeitstag-Zählung) + ERGANI-Vorabmeldung ohne Schnittstelle → prüfen/entschärfen. |
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Mehrarbeit & Überstunden (+20 / +40 % über 40 h) | Typisierte Zuschläge | ✅ | Gedeckt. |
| Zertifikate geprüft, Einsätze nur an Personal mit gültigem Ausweis | Qualifikations-Matching + Ablauf-Warnung | ⚠️ | Ablauf-Warnung ✅; abgelaufene Qualifikation BLOCKIERT die Zuteilung NICHT → „nur an gültige" umformulieren. |
| Klacksy plant per Sprache, prüft Zuschläge/Zertifikate | Klacksy + Regel-Engine | ✅ | Gedeckt. |

## Haus-/Putzdienste (hausdienste)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| ERGANI-konform ab 12.10.2026, ohne Busse | Work-Records | ⚠️ | Wie oben — entschärfen. |
| Parallelbeschäftigung: 11-h-Tagesruhe bei mehreren Auftraggebern + 13-h-Tage | Ruhezeit-Regel | ⚠️ | Klacks kennt nur den eigenen Plan; arbeitgeberübergreifende Ruhezeit nicht prüfbar; 13-h-Sonderfall ebenfalls → prüfen. |
| Pausen automatisch eingeplant (15 min ab 6 h) | Pausen-Planung | ✅ | Gedeckt. |
| Teams flexibel eingeteilt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Klacksy plant per Sprache, optimiert Route/Team/Pausen | Klacksy + Tourenoptimierung | ✅ | Gedeckt. |

## Logistik
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| ERGANI-konform ab 16.11.2026, ohne Busse | Work-Records | ⚠️ | Wie oben — entschärfen. |
| Sechstagewoche 40 % / 115 % + ERGANI-Meldung | Typisierte Zuschläge/Regel + Work-Records | ⚠️ | 6.-Tag-Zählung + ERGANI-Meldung ohne Schnittstelle → prüfen. |
| Nachtgrenze Fahrpersonal 10 h/24 h (RL 2002/15) überwacht | Grenzwert-Monitoring | ✅ | Geplante Nachtarbeit überwachbar; kein Tachograph-Abgleich nötig für die Grenze selbst. |
| Führerschein-Klassen passend + Warnung vor Ablauf | Qualifikations-Matching (exakt) + Ablauf-Warnung | ✅ | Gedeckt. |
| Klacksy plant per Sprache, rechnet Zuschläge/Nachtgrenze neu | Klacksy + Autofill | ✅ | Gedeckt. |

**Fazit GR:** GR ist das riskanteste der sieben Länder — nicht wegen fehlender Kern-Fähigkeiten (Zuschläge, Ruhezeiten, Tourenoptimierung, On-Premise, Klacksy sind gedeckt), sondern wegen des ERGANI-Narrativs. Die in jeder Branche wiederholte Busse-Garantie („ohne Risiko der 10.500-€-Busse") setzt eine ERGANI-II-Schnittstelle und verifizierten Clock-in voraus, die Klacks nicht hat. Weiter zu entschärfen: der 6.-Tag-Zuschlag (Arbeitstag-Zählung), arbeitgeberübergreifende Ruhezeit und die Zertifikats-Blockade. Empfehlung: ERGANI durchgängig als „dokumentierte Zeitbasis für die Meldung" positionieren, Busse-Formel streichen.
Bilanz: ✅ 24 · ⚠️ 12 · ❌ 0.
