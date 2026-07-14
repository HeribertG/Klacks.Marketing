# VN — USP → Klacks-Erfüllung

> Grundlage: `USP-KLACKS-MAPPING.md` (Backbone-Capability-Inventur, Zeilen 17–30). `klacks-capabilities.md` existiert im Repo nicht mehr; die Backbone-Tabelle ist die gültige Capability-Quelle.
> Legende: ✅ voll · ⚠️ mit Vorbehalt · ❌ Lücke. Regel: „überwacht/geprüft/verfolgt/visualisiert" = Warnung → ✅; „erzwungen/gesperrt/blockiert" → ⚠️ (Klacks warnt, sperrt Speichern nie); „biometrische Zeiterfassung" → Biometrie existiert nicht.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 3-Stufen-Überstunden-Cap (Tag/Monat/Jahr) laufend gegeneinander geprüft, Warnung vor Überschreitung — Art. 107 | Live-Compliance-Warnungen | ✅ | „geprüft/Warnung" = Warnung; Monats-/Jahres-Cap gewarnt, nicht hart durchgesetzt |
| Nacht-Überstunden verschachtelte Formel (Grund + 30% + 20%), kumuliert 210%/270% automatisch — Art. 98 | Typisierte Zuschläge (Nacht + Kombinationen) | ✅ | Multiplikatoren + Zeitfenster konfigurierbar; kombinierte Kategorien abbildbar |
| Nachtzeit 22:00–06:00 + 12h-Ruhezeit zwischen Schichten automatisch berücksichtigt — Art. 106/110 | Nacht-Zeitfenster + Ruhezeit-Regel | ✅ | — |
| Biometrie-Compliance ohne Cross-Border: On-Premise macht Transfer-Dossier (Decree 13/2023) überflüssig | On-Premise/Self-Hosting | ⚠️ | On-Premise für Planungs-/Personaldaten ✅; Klacks erfasst keine Biometrie — Biometrie-Rahmen umformulieren |
| On-Premise: volle Datenhoheit, kein Auslandtransfer | On-Premise + lokales LLM | ✅ | — |
| Klacksy plant regelbasiert | Klacksy | ✅ | — |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| 12-Stunden-Ruhezeit zwischen Schichten automatisch eingehalten, unzulässige Schichtfolgen blockiert — Art. 110 | Ruhezeit-Regel-Engine | ⚠️ | Ruhezeit-Regel ✅; „blockiert" — Klacks warnt, sperrt Speichern nicht — umformulieren |
| Fahrzeit zwischen Einsätzen im Tourenplan erfassbar | Wegzeit als Planungsfunktion | ✅ | Ehrlich als Planungsfunktion deklariert |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: Patientendaten bleiben im Haus | On-Premise | ✅ | Keine Biometrie behauptet |
| Klacksy schlägt bei Ausfall Ersatz vor | Klacksy | ✅ | — |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Erweitertes 300-Stunden-Jahresüberstundenbudget überwacht und Ausschöpfung visualisiert | Live-Warnungen + Anzeige | ✅ | „überwacht/visualisiert" = Warnung/Anzeige; Jahrescap gewarnt, nicht hart durchgesetzt |
| Nacht-Überstunden automatisch berechnet, kumuliert 210%/270% — Art. 98 | Typisierte Zuschläge | ✅ | — |
| 12-Stunden-Schichtruhe eingehalten, unzulässige Schichtfolgen blockiert — Art. 110 | Ruhezeit-Regel-Engine | ⚠️ | „blockiert" — warnt, sperrt nicht |
| Qualifikationen pro Station/Abteilung/Funktion | Qualifikations-Matching (exakt) | ✅ | Exakt, kein Fuzzy |
| On-Premise: Personal-, Patienten- UND biometrische Zeiterfassungsdaten verlassen Klinik nicht | On-Premise | ⚠️ | Personal-/Patientendaten ✅; Biometrie existiert nicht — umformulieren |
| Klacksy berücksichtigt Qualifikation und Jahresbudget | Klacksy | ✅ | — |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Monatliches 40-Stunden-Überstundenlimit im rollierenden Fenster laufend überwacht — Art. 107 | Live-Warnungen | ✅ | Warnung; Monatscap nicht hart durchgesetzt |
| Nacht-Überstunden automatisch berechnet (210%/270%) — Art. 98 | Typisierte Zuschläge | ✅ | — |
| Nachtzeit + 12h-Ruhezeit automatisch berücksichtigt, auch objektübergreifend rollierend — Art. 106/110 | Nacht-Zeitfenster + Ruhezeit-Regel | ✅ | — |
| Objekte lückenlos besetzt, Rundgänge/Patrouillen optimiert | Schedule-Optimizer + Tourenoptimierung | ✅ | — |
| On-Premise: Einsatz-/Personaldaten inkl. biometrischer Zeiterfassung bleiben im Betrieb | On-Premise | ⚠️ | Einsatz-/Personaldaten ✅; Biometrie existiert nicht — umformulieren |
| Klacksy prüft Verfügbarkeit und Monatslimit | Klacksy + Warnungen | ✅ | Warnung |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 30%-Nachtzuschlag für Einsätze 22:00–06:00 automatisch gebucht — Art. 98 | Typisierte Zuschläge (Nacht-Zeitfenster) | ✅ | — |
| Verlängerte Pausenregeln ab 6h (30 Min Tag / 45 Min Nacht) automatisch eingeplant | Break-Entität, Pausenplanung | ✅ | — |
| Überstunden-Cap (40h/Monat, 200h/Jahr) über alle Objekte/Teams laufend verfolgt — Art. 107 | Live-Warnungen | ✅ | „verfolgt" = Warnung; Monats-/Jahres-Cap nicht hart durchgesetzt |
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | — |
| On-Premise: Personaldaten bleiben im Betrieb, auch bei KI | On-Premise + lokales LLM | ✅ | Keine Biometrie behauptet |
| Klacksy optimiert Route/Team/Pausen | Klacksy | ✅ | — |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Neue 4-Stunden-Lenkzeitregel + 15-Min-Pflichtpause ab 1.7.2026 automatisch angelegt — Law 118/2025 | Kalender-/Regel-DSL + Pausenplanung | ✅ | Neue Regel + Pause als Planobjekt konfigurierbar |
| Arbeitszeit 8h/10h-Tages + 48h-Wochengrenze überwacht | Konfigurierbare Grenzwerte + Warnung | ✅ | Warnung |
| Überstunden-Cap (40h/Monat, 200h/Jahr) auch für Fahrer verfolgt — Art. 107 | Live-Warnungen | ✅ | Warnung; nicht hart durchgesetzt |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | — |
| On-Premise: Tour-/Fahrerdaten bleiben im Betrieb, auch bei KI | On-Premise + lokales LLM | ✅ | Keine Biometrie behauptet |
| Klacksy rechnet inkl. Lenkzeiten neu | Klacksy | ✅ | — |

## Fazit

- VN nutzt überwiegend die ehrliche Monitoring-Sprache („geprüft/überwacht/verfolgt/visualisiert") — das passt exakt zu Klacks' Live-Warnungen, auch bei Monats-/Jahres-Caps (200h/300h/40h). Zuschläge (inkl. verschachtelter Nacht-Formeln 210%/270%), Ruhezeiten, Pausen, Tourenoptimierung und Klacksy sind voll gedeckt.
- Wiederkehrende Vorbehalte: „unzulässige Schichtfolgen blockiert" (Spitex/Spitäler — Klacks warnt, sperrt nicht) und die On-Premise-Zeilen mit Biometrie-Framing (General, Spitäler, Security). On-Premise ist real, Biometrie erfasst Klacks nicht.
- Bilanz VN: 31 ✅ · 5 ⚠️ · 0 ❌.
