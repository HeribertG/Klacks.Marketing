# BE — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md`, generische Muster aus echtem Code). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Paritair Comité automatisch berücksichtigt (Zuschläge, Arbeitszeitgrenzen, Planungsfristen des PC) | Konfigurierbare Grenzwert-Engine + typisierte Zuschläge | ⚠️ | Zuschläge/Grenzwerte pro PC frei konfigurierbar ✅ — aber es gibt keine vorgefertigten PC-Packs (manuell einrichten), und Planungs-/Publikationsfristen sind nicht als Regel abbildbar. |
| Dienstpläne je Betriebsstätte in richtiger Sprache (NL/FR/DE), Sprachgesetz | UI-i18n (25 Sprachen inkl. RTL) | ⚠️ | UI mehrsprachig ✅, aber mehrsprachige **Dienstplan-Dokument-Ausgabe** pro Betriebsstätte in Landessprache ist nicht belegt. |
| Abweichungsregister lückenlos — Vollzeitvermutung entsteht gar nicht erst | Planänderungs-/Änderungshistorie (work_change) | ⚠️ | Planänderungen werden dokumentiert (planungsbasiert). „Vollzeitvermutung entsteht gar nicht erst" ist eine Rechtsfolge — Klacks dokumentiert/warnt, verhindert sie nicht. |
| Reform 2026 automatisch eingehalten — 7-Werktage-Publikationsfrist + Teilzeit-Mindestarbeitszeit | Konfigurierbare Grenzwerte | ⚠️ | Publikationsfrist nicht als Regel gedeckt; Mindestarbeitszeit als Grenzwert hinterlegbar, aber Klacks warnt nur, „einhalten" ≠ blockieren. |
| Freiwillige Überstunden sauber getrennt — erste 240 abgaben-/steuerfrei | Überstunden-Zählung | ❌ | Steuer-/Sozialabgaben-Befreiung ist Lohnbuchhaltung — nicht gedeckt (kein BE-Payroll-Pack). |
| Klacksy: regelbasiert, keine Blackbox | Klacksy (250 Skills, Rezept-Engine) | ✅ | Voll gedeckt. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung (OSRM/ORS + ACO) | ✅ | Voll gedeckt. |
| Wegzeit korrekt als Arbeitszeit erfasst | Wegzeit als bezahlte Arbeitszeit + Geo | ✅ | Voll gedeckt. |
| 50%-Zuschlag bei geteilten Diensten (onderbroken dienst) nach PC-330-Barema | Typisierte Zuschläge | ⚠️ | Split-Shift-Zuschlag konfigurierbar ✅; „Lohnbarema" ist Payroll, nicht gedeckt. |
| Rimpelregeling automatisch eingeplant — altersabhängige Freistellung 2/4/6h ab 45/50/55 | — | ⚠️ | Keine altersabhängige Freistellungs-Automatik belegt; müsste manuell als Verfügbarkeitsregel gepflegt werden. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakte Zuordnung ✅; kein Fuzzy-Match, abgelaufene Qualifikation blockiert nicht. |
| Klacksy plant per Sprache, schlägt Ersatz vor | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer / Autofill | ✅ | Voll gedeckt. |
| Trimesterschnitt automatisch überwacht (11h/50h, 38h-Schnitt über Trimester) | Live-Compliance-Warnungen | ⚠️ | Mehrwochen-Durchschnitt = nicht durchgesetzter Cap; Klacks warnt, blockiert nicht. |
| Immer nur der höchste Zuschlag — 26/56/20%, nicht kumulierbar | Typisierte Zuschläge | ⚠️ | Zuschläge + Zeitfenster konfigurierbar ✅; „nur höchster" (Max-Modus) Stacking nicht verifiziert — steht im Widerspruch zu kumulativer Logik anderer Länder. |
| Qualifikationen & Stationen | Qualifikations-Matching (exakt) | ⚠️ | Exakte Zuordnung ✅; kein Fuzzy, kein Blockieren bei Ablauf. |
| On-Premise: Daten verlassen die Klinik nicht | On-Premise/Self-Hosting + keyless lokales LLM | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache, berücksichtigt Trimesterschnitt | Klacksy | ✅ | Planung ✅; Trimester-Überwachung nur Warnung (siehe oben). |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 37h-Jahresschnitt automatisch überwacht | Live-Compliance-Warnungen | ⚠️ | Jahres-Durchschnitt = nicht durchgesetzter Cap; nur Warnung. |
| Ruhezeiten korrekt eingehalten — 12h nach Schicht, 36h nach max. 6 Tagen | Regel-Engine (Ruhezeit-/Wochenruhe-Regeln) | ✅ | Tages-/Wochenruhe gedeckt; „36h nach max. 6 Tagen" ist Wochenruhe-Logik ✅. |
| Änderungsprämie automatisch gezählt — Basisplan 22.–25., warnt vor 4. Änderung | Änderungshistorie + Warnungen | ⚠️ | Änderungen zählbar/warnbar; feste Publikationsfenster (22.–25.) nicht als Regel gedeckt. |
| Zweigeteilter Nachtzuschlag 12% (20–22) / 22,5% (22–06) | Typisierte Zuschläge (Nacht, Zeitfenster konfigurierbar) | ✅ | Zwei Nachtfenster mit eigenen Sätzen abbildbar. |
| Klacksy prüft Ruhezeiten, Jahresschnitt, Zuschläge | Klacksy | ✅ | Planung ✅; Jahresschnitt nur Warnung. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Anwesenheit elektronisch & lückenlos, auditsicher (Programmawet) + €7-Smartphone-Pauschale | Work-Records (planungs-/manuell) | ⚠️ | Kein verifizierter Clock-in / kein checkin@work-Terminal; Records sind planungsbasiert. €7-Pauschale = Payroll, nicht gedeckt. Als „auditsichere biometrische Erfassung" **überzogen**. |
| Mobilitätspauschale €0,1075/km automatisch berechnet | Geo-Distanz vorhanden | ⚠️ | Distanz-Daten vorhanden ✅; €/km-Vergütung ist Payroll-Berechnung, kein typisierter Zuschlag. |
| Mindestdauern automatisch eingehalten (1h, 18h/Woche, 3h/Tag) | Konfigurierbare Grenzwerte | ⚠️ | Grenzwerte hinterlegbar ✅; „einhalten/erzwingen" → Klacks warnt nur. |
| Teams flexibel eingeteilt | Autofill/Schedule-Optimizer | ✅ | Voll gedeckt. |
| Klacksy optimiert Route, Team, Anwesenheitserfassung | Klacksy + Geo | ⚠️ | Route/Team ✅; „Anwesenheitserfassung" siehe Vorbehalt oben. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Mahlzeitscheck-Anspruch automatisch geprüft (€3,09, 6 Monate, ≥4h) | — | ❌ | Meal-Voucher-Anspruch = Lohn-/Benefit-Berechnung, nicht gedeckt. |
| Arbeitszeitrahmen wahrheitsgemäss dokumentiert | Work-Records | ⚠️ | Geplante Zeiten dokumentierbar; „Alibi-24/7 sanktioniert" ist Rechtsfolge — Klacks warnt/dokumentiert, erzwingt nicht. |
| 240h-Freigrenze bei Überstunden im Blick | Überstunden-Zählung | ❌ | Abgaben-/Steuerfreiheit = Payroll, nicht gedeckt. |
| Führerschein-Klassen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakte Zuordnung ✅; Ablauf-Warnung/Blockade nicht erzwungen. |
| Klacksy rechnet alles neu inkl. Überstunden und Mahlzeitschecks | Klacksy | ⚠️ | Planung/Überstunden ✅; Mahlzeitschecks nicht gedeckt. |

## Fazit

Der belastbare Kern (Tourenoptimierung, Wegzeit als Arbeitszeit, typisierte Zuschläge, Ruhezeit-Regeln, On-Premise, Klacksy) ist voll gedeckt. **Überversprochen** sind: „auditsichere elektronische Anwesenheitserfassung" (kein Clock-in/Terminal), belgische Payroll-Automatiken (Mahlzeitschecks, €7-/€/km-Pauschalen, Steuerfreigrenzen) und die PC-„Automatik" (manuell zu konfigurieren). Publikations-/Änderungsfristen und das Sprachgesetz-Dokument sind nicht als Regel/Ausgabe gedeckt. Empfehlung: Cap- und Fristen-Formulierungen von „einhalten/erzwingen" auf „live überwachen/sichtbar machen" umstellen; Payroll-Claims streichen.
