# ES — USP → Klacks-Erfüllung

> Grundlage: distillierte Capability-Inventur (`USP-KLACKS-MAPPING.md`, Backbone-Tabelle). Legende: ✅ voll gedeckt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.
> Diskriminator: Verb entscheidet. „im Blick/überwacht/geprüft/dokumentiert/eingehalten (Frist)" = Monitoring/Sichtbarkeit = ✅. „begrenzt/gesperrt" = Erzwingung = ⚠️ (Klacks warnt, blockiert Speichern NIE; Jahres-Caps nicht durchgesetzt).

## General
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Ruhezeiten 12 h / 36 h automatisch überwacht (+14-Tage-Akkumulation) | Ruhezeit-Regel-Engine | ✅ | Tages-/Wochenruhe + Akkumulation gedeckt. |
| Registro de Jornada eingebaut (Beginn/Ende jeder Schicht) | Work-Records (planungs-/manuell) | ⚠️ | Dokumentiert Zeiten, aber kein verifizierter Clock-in → als Zeitdokumentation ehrlich, nicht als manipulationssicherer Nachweis. |
| 5-Tage-Frist bei unregelmäßiger Verteilung eingehalten und dokumentiert | Ankündigungsfrist-Sichtbarkeit | ✅ | Sichtbar gemacht/dokumentiert = ehrlich. |
| Überstunden-Limit 80 h/Jahr im Blick + Nachtarbeiter/Minderjährige ausgenommen | Grenzwert-Monitoring + Regel-Konfiguration | ✅ | Jahres-Cap gewarnt (nicht gesperrt); Ausschluss-Regeln konfigurierbar. |
| On-Premise: eigene Infrastruktur, KI lokal hostbar | On-Premise/Self-Hosting, keyless lokales LLM | ✅ | Gedeckt. |
| Klacksy: regelbasiert, plant per Sprache | Klacksy | ✅ | Gedeckt. |

## Häusliche Pflege (spitex)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Wegzeit konvenio-genau erfasst (erster/letzter Weg exkl., STS 1305/2024) | Wegzeit als bezahlte Arbeitszeit | ✅ | Deckungsgleich mit Klacks-Modell (erster/letzter Weg aussen). |
| 35-Stunden-Grenze ab 2026 vorbereitet (2-Monats-Zeitraum) | Konfigurierbares Wochensoll | ✅ | Gedeckt. |
| Ruhezeiten 12 h / 36 h auch bei dichten Touren | Ruhezeit-Regel-Engine | ✅ | Gedeckt. |
| On-Premise: Patientendaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Ersatzsuche | ✅ | Gedeckt. |

## Spitäler (spitaeler)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung, Lücken auto gefüllt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| Ruhezeiten nach Estatuto Marco (12 h nach Guardia, 36 h Wochenruhe) in Echtzeit überwacht | Ruhezeit-Monitoring (Live) | ✅ | Gedeckt. |
| Zeiterfassung ohne Biometrie (AEPD-Leitlinie) | Keine Biometrie (nur planungs-/manuelle Erfassung) | ✅ | Ehrlich: Klacks hat gar keine Biometrie — Versprechen deckt sich mit Realität. |
| On-Premise: Personal-/Patientendaten verlassen Klinik nicht | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, achtet auf Qualifikation/Ruhezeit | Klacksy + Regel-Engine | ✅ | Gedeckt. |
| Springerpool zeigt bei Ausfall verfügbare, qualifizierte Springer | Verfügbarkeits-/Ersatzsuche + Qual-Matching | ✅ | Gedeckt. |

## Security
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer/Autofill | ✅ | Gedeckt. |
| 1.782-Jahresstunden + Ø 162 h/Monat im Blick | Grenzwert-Monitoring | ✅ | Jahres-/Monatsstand überwacht/gewarnt, nicht hart gesperrt — „im Blick" ist ehrlich. |
| Überstunden-Ausgleich in 4 Monaten geplant | Planung + Periodenabschluss | ✅ | Ausgleich planbar; 4-Monats-Fenster wird nicht hart erzwungen. |
| On-Premise: Einsatz-/Kundendaten bleiben im Haus | On-Premise/Self-Hosting | ✅ | Gedeckt. |
| Klacksy plant per Sprache, prüft Jahresstunden-Stand | Klacksy + Monitoring | ✅ | Gedeckt. |
| Ausfälle in Minuten ersetzt, ohne Plan zu kippen | Verfügbarkeits-/Ersatzsuche | ✅ | Gedeckt. |

## Haus-/Putzdienste (hausdienste)
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert (Auto/Rad/Fuß) | Geo-Tourenoptimierung (Profile) | ✅ | Gedeckt. |
| Horas Complementarias auf 30 % (bis 60 %) begrenzt + 3-Tage-Vorlauf | Grenzwert-Monitoring + Fristsichtbarkeit | ⚠️ | Vorlauf/Sichtbarkeit ✅; %-Deckel für Zusatzstunden bei Teilzeit („begrenzt") nicht als durchgesetzte Kappung belegt. |
| Nachtzuschlag 22–06 (z. B. 25 %) automatisch | Typisierte Zuschläge (Multiplikator + Zeitfenster) | ✅ | Gedeckt. |
| Provinz-Konvenios 38 / 37,5 h hinterlegt | Konfigurierbares Wochensoll | ✅ | Gedeckt. |
| Klacksy plant per Sprache, optimiert Route/Team | Klacksy + Tourenoptimierung | ✅ | Gedeckt. |
| Ausfälle schnell aufgefangen | Verfügbarkeits-/Ersatzsuche | ✅ | Gedeckt. |

## Logistik
| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Gedeckt. |
| Tiempo de presencia korrekt getrennt (nur aktive Arbeit ins Überstundenlimit) | Bereitschafts-/Präsenzzeit-Trennung | ⚠️ | Trennung aktive/Präsenzzeit teils abbildbar; die präzise Nur-aktiv-ins-Limit-Rechnung nicht als Automatik belegt → prüfen. |
| Wochenarbeitszeit 48 h/4-Monats-Schnitt + 60 h absolut überwacht | Grenzwert-Monitoring | ✅ | Gedeckt. |
| Lenkzeiten EU 561/2006 (56 h Woche, 90 h/2 Wochen) geprüft | — | ⚠️ | Geplante Lenkzeit überwachbar, aber kein Fahrtenschreiber-/Tachograph-Abgleich. |
| Klacksy plant per Sprache, rechnet bei Ausfall neu | Klacksy + Autofill | ✅ | Gedeckt. |
| Ausfälle aufgefangen, Fahrer in Grenzen angezeigt | Verfügbarkeits-/Ersatzsuche | ✅ | Gedeckt. |

**Fazit ES:** Sehr starke Deckung — Ruhezeit-Monitoring, Wegzeit als Arbeitszeit, konfigurierbare Wochensoll-/Jahresstunden-Grenzwerte, On-Premise und Klacksy sitzen. Besonders ehrlich: „Zeiterfassung ohne Biometrie" trifft die Klacks-Realität exakt (✅). Nur vier Vorbehalte: Registro de Jornada ohne verifizierten Clock-in, der durchgesetzte Horas-Complementarias-Deckel, die feine Präsenzzeit-Rechnung und die Lenkzeit ohne Tachograph. Empfehlung: „begrenzt" → „im Blick/überwacht" und Registro als „dokumentierte Zeitbasis" formulieren.
Bilanz: ✅ 32 · ⚠️ 4 · ❌ 0.
