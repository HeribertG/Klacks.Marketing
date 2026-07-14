# NO — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Drei Arbeitszeit-Regime automatisch erkannt (40/38/36h, AML § 10-4) | Konfigurierbare Grenzwerte pro Vertrag | ⚠️ | Wochengrenzen pro Vertrag/Gruppe hinterlegbar ✅; die **automatische Erkennung**, welches Regime greift, ist nicht belegt (manuell zuordnen). |
| 14-Tage-Frist automatisch eingehalten (AML § 10-3) | — | ⚠️ | Dienstplan-Bekanntgabefrist nicht als Regel gedeckt. |
| Überstundengrenzen überwacht — 10h/7d, 25h/4w, 200h/12M, ≥40% Zuschlag | Live-Compliance-Warnungen + typisierte Zuschläge | ⚠️ | 40%-Zuschlag konfigurierbar ✅; die Mehrwochen-/Jahres-Caps werden nur gewarnt, nicht durchgesetzt. |
| Touren & Einsätze automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| On-Premise: keine biometrische Cloud-Erfassung (Datatilsynet) | Keine Biometrie + On-Premise | ✅ | Ehrliches Positiv: Klacks hat keine Biometrie/Stempeluhr; Planungsdaten bleiben lokal. |
| Klacksy: regelbasiert, KI-Modell lokal hostbar | Klacksy + keyless lokales LLM | ✅ | Voll gedeckt. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Reisezeit als Arbeitszeit erfasst (Arbeidstilsynet/NHO) | Wegzeit als bezahlte Arbeitszeit | ✅ | Voll gedeckt. |
| Delt vakt: 11h-Ruhe per Vereinbarung auf 8h verkürzbar + zwingende Kompensationsruhe | Regel-Engine (Ruhezeit) | ⚠️ | Ruhezeit-Regel konfigurierbar ✅; die zwingende **Kompensationsruhe-Automatik** bei Verkürzung ist nicht belegt. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| On-Premise: Patientendaten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy schlägt Ersatz vor | Klacksy | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Stationsabdeckung | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 33,6-Stunden-Woche automatisch erkannt (jeder 3. Sonntag) | Konfigurierbare Grenzwerte + n-ter-Wochentag-Regel | ⚠️ | Grenzwert hinterlegbar ✅; wöchentlicher Durchschnitt + automatische Regime-Erkennung nur teilweise. |
| Feiertags-/Wochenendzuschläge 133,33% / 26% (ab 12h Vortag), min. 75 NOK/h | Typisierte Zuschläge (Feiertag/Wochenende, Zeitfenster) | ✅ | Multiplikatoren + Zeitfenster konfigurierbar; Mindestbetrag/Std. als Wert hinterlegbar. |
| On-Premise: Personal-/Patientendaten verlassen die Klinik nicht | On-Premise | ✅ | Voll gedeckt. |
| Klacksy berücksichtigt Turnusregime | Klacksy | ⚠️ | Planung ✅; Regime-Erkennung siehe oben. |
| Springerpool & Ausfälle sofort verfügbar | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos besetzt | Schedule-Optimizer | ✅ | Voll gedeckt. |
| Neuer Tarif automatisch hinterlegt (Grundlohn +10,50, Fagbrev +14,50 NOK/h) | Konfigurierbare Werte | ⚠️ | Werte hinterlegbar ✅; „automatisch aktuell" = manuell zu pflegen, kein Tarif-Auto-Update. |
| Teilzeit-/Vollzeit-Überstundenregel korrekt angewendet (merarbeid vs. Zuschlag) | Konfigurierbare Grenzwerte + Zuschläge | ⚠️ | Komplexe Schwellenlogik (Zuschlag erst über Vollzeit-Referenz) nur teilweise abbildbar; Cap-Prüfung = Warnung. |
| Rundgänge optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Klacksy prüft Verfügbarkeit und Dienstplan-Grenzen | Klacksy | ⚠️ | Verfügbarkeit ✅; Grenzen nur Warnung. |
| Ausfälle in Minuten ersetzt | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Mindestlöhne nach Dienstjahren gestaffelt hinterlegt | Konfigurierbare Werte | ⚠️ | Werte hinterlegbar ✅; automatische Staffelung nach Dienstjahren (Seniority-Tier) ist Payroll-Logik, nicht belegt. |
| Nachtzuschlag 21–06, mind. 29 NOK/h zusätzlich | Typisierte Zuschläge (Nacht, Zeitfenster) | ✅ | Nachtfenster + Betrag konfigurierbar. |
| Klacksy optimiert Route und Team | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Mindestlohn ab 2,5t korrekt angewendet (229 NOK/h) | Konfigurierbare Werte | ⚠️ | Satz hinterlegbar ✅; automatische Anwendung = Payroll-Randbereich. |
| Godsoverenskomsten-Tarif automatisch aktuell | Konfigurierbare Werte + Zuschläge | ⚠️ | Zuschläge konfigurierbar ✅; „automatisch aktuell" ist Überversprechen — Tarife manuell pflegen. |
| Führerschein-Klassen passend, Warnung vor Ablauf | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf nicht erzwungen. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Fazit

Die Zuschlags-USPs (Feiertag/Wochenende/Nacht mit Sätzen und Zeitfenstern), Tourenoptimierung, Wegzeit, On-Premise und das ehrliche „keine Biometrie"-Argument tragen sauber. **Vorbehalte:** die drei Arbeitszeit-Regime und das 33,6h-Modell werden nicht automatisch erkannt (manuelle Zuordnung); Überstunden-Caps (25h/4w, 200h/12M) und die 14-Tage-Frist werden nur überwacht bzw. gar nicht als Regel gedeckt; „Tarif automatisch aktuell" und seniority-gestaffelte Löhne sind Überversprechen (Werte manuell pflegen).
