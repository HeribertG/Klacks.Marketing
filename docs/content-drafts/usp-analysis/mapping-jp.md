# JP — USP → Klacks-Erfüllung

Bewertung gegen die Capability-Inventur `../../../../docs/content-drafts/usp-analysis/klacks-capabilities.md` (echter Code).
Legende: ✅ voll erfüllt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Dienste automatisch regelbasiert geplant, lernt aus bestehenden Mustern | Schedule-Optimizer (GA) | ✅ | GA mit Init-Heuristiken/Autoresearch-Tuning; "lernt aus Mustern" ist kein echtes ML aus Historie, aber gemischte Initialpopulation/Coverage-Sweep. |
| 36協定-Obergrenzen als Live-Ampel: Warnung vor 45/360h und 720/100/80h | Perioden-Stundensummen | ⚠️ | Monats-/Jahresstunden werden summiert/sichtbar; aber **kein** eingebauter 36協定-Schwellen-Alarm (OvertimeThreshold/MaximumHours werden nicht ausgewertet). Reframe: Summen sichtbar machen, nicht "Ampel vor gesetzlichem Cap". |
| 60-Stunden-Schwelle/Monat überwacht, 50%-Zuschlag berechnet | Perioden-Summen + Zuschläge | ⚠️ | Monatsstunden sichtbar; 60h-Schwellen-Alarm nicht eingebaut; 50%-OT-Prämie kein typisierter Zuschlag (per Macro). |
| 5-Tage-Pflichturlaub pro Anspruchsberechtigtem im 12-Monats-Zeitraum getrackt | Abwesenheits-/Urlaubsverwaltung | ⚠️ | Abwesenheiten vorhanden; ein spezifischer 5-Tage-Pflichtabnahme-Zähler ist ableitbar, aber nicht als Feature bestätigt. Verifizieren. |
| On-Premise: Daten bleiben in Japan, KI-Modell frei wählbar, lokal hostbar (APPI Art. 28) | On-Premise-Stack + keyless lokale KI | ✅ | Kein Biometrie-Wort; Default-Provider Cloud → Opt-in für lokal. |
| Open Source, kein Vendor-Lock-in | On-Premise-Stack | ✅ | |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | |
| Wegezeit als Arbeitszeit im Tagesroster (reine An-/Rückfahrt ausgenommen) | Travel-WorkChange = bezahlte Arbeitszeit | ✅ | Zählt positiv zu den Stunden; Hinweis: manuell erfasst, nicht auto aus der Optimierung gebucht. |
| 25%-Nachtzuschlag für 22:00–05:00 automatisch berechnet | Typisierte Zuschläge (Night) | ⚠️ | Nachtzuschlag existiert, Fenster aber **23–06 hart im Macro**, nicht 22–05; nur per Macro-Edit änderbar (kein Setting). |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching | ✅ | |
| On-Premise: Patientendaten bleiben im Haus | On-Premise-Stack | ✅ | |
| Klacksy plant per Sprache, schlägt bei Krankheit Ersatz vor | Klacksy + GA | ✅ | |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Autofill/GA | ✅ | |
| Ärzte-Jahresobergrenzen 960h (A) / 1.860h (B/C) tagesaktuell überwacht | Perioden-Stundensummen | ⚠️ | Jahresstunden summierbar/sichtbar; **kein** Jahres-Cap-Alarm (MaximumHours nicht durchgesetzt). |
| 9h-Ruheintervall nach 28h-Dauerdienst automatisch eingeplant | Ruhezeit-Regel (MinRestHours) + GA | ✅ | Ruhezeit-Wert konfigurierbar, Auto-Planer respektiert ihn; 28h-Dauerdienst als solcher kein spezifischer Trigger. |
| Qualifikationen pro Station/Abteilung/Funktion | Qualifikations-Matching | ✅ | |
| On-Premise: Personal-/Patientendaten verlassen die Klinik nicht | On-Premise-Stack | ✅ | |
| Klacksy berücksichtigt Qualifikation und Jahresobergrenze | Klacksy | ⚠️ | Jahres-Cap warn-only/nicht durchgesetzt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Ruhezeit und reaktionspflichtige Wartezeit (手待時間) in der Schlafphase getrennt, Wartezeit als bezahlte Arbeitszeit | Work-Records / WorkChange | ⚠️ | Zeit als bezahlte Arbeitszeit modellierbar; aber keine automatische Trennung Bereitschaft/aktive Wartezeit. |
| Objekte & Posten lückenlos besetzt | Autofill/GA | ✅ | |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching | ✅ | |
| Rundgänge/Patrouillen-Routen optimiert | Tourenoptimierung | ✅ | |
| On-Premise: Einsatz-/Kundendaten verlassen Japan nicht | On-Premise-Stack | ✅ | |
| Klacksy prüft Qualifikation und Verfügbarkeit | Klacksy | ✅ | |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Schichten im Nachtfenster 22:00–05:00 automatisch gesplittet, 25% anteilig | Typisierte Zuschläge (Night, Segment-Split) | ⚠️ | Mitternachts-/Fenster-Splitting + anteiliger Zuschlag ✅; ABER Nachtfenster **23–06 hart**, nicht 22–05 (nur per Macro-Edit). |
| Objekt-Routen optimiert | Tourenoptimierung | ✅ | |
| Teams flexibel eingeteilt | Autofill/GA | ✅ | |
| On-Premise: Objekt-/Personaldaten bleiben in Japan | On-Premise-Stack | ✅ | |
| Klacksy optimiert Route und Team | Klacksy + Route/GA | ✅ | |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Tourenoptimierung | ✅ | |
| 960h-Jahresgrenze ("2024-Problem") pro Fahrer überwacht, Warnung vor Erreichen | Perioden-Stundensummen | ⚠️ | Jahresstunden sichtbar; kein Jahres-Cap-Alarm. |
| Tägliche Bindungszeit (13/15h) und 9h-Mindestruhe im Plan gepflegt, inkl. Ausnahmen | Grenzwert-Engine (MaxDailyHours/MinRestHours) | ✅ | Als SR konfigurierbar + Warnung/GA-Veto. |
| 4h-Lenkzeit & 30min-Pause automatisch, aufteilbar | Grenzwert-Engine + GA | ⚠️ | Mindestpause konfigurierbar; "30min nach 4h Lenkzeit, aufteilbar" (Segment-Pausen-Logik) nicht nativ. |
| On-Premise: Fahrer-/Tourdaten bleiben in Japan | On-Premise-Stack | ✅ | |
| Klacksy rechnet Bindungszeit und Ruhezeit mit | Klacksy | ✅ | Bindungszeit/Ruhe sind native SR-Werte. |

## Fazit

- **Trägt ehrlich:** Autofill, Tourenoptimierung + Wegezeit als bezahlte Arbeitszeit, Klacksy, Qualifikations-Matching, Tages-Höchstarbeitszeit/Ruhezeit (SR mit Warnung + GA-Veto), On-Premise/APPI-Datenhaltung.
- **Entschärfen:** (1) 36協定-/960h-/1.860h-/60h-Caps sind Monats-/Jahresaggregate → Klacks zeigt/summiert die Werte, alarmiert aber nicht gegen den gesetzlichen Cap (Reframe auf "Summen/Trend sichtbar"). (2) Nachtzuschlag 22–05 → Default 23–06 (nur per Macro). (3) 手待時間-Trennung und segmentierte Lenkzeit-Pausen nicht automatisch. Kein ❌ — JP-Seiten sind größtenteils vorsichtig als "überwacht/Warnung" formuliert.
- **Bilanz:** ✅ 25 · ⚠️ 10 · ❌ 0.
