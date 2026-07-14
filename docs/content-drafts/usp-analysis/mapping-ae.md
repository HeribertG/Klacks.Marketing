# AE — USP → Klacks-Erfüllung

Bewertung gegen die Capability-Inventur `../../../../docs/content-drafts/usp-analysis/klacks-capabilities.md` (echter Code).
Legende: ✅ voll erfüllt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Ramadan-Tagesarbeitszeit automatisch −2h für alle, ohne Lohnabzug, ohne manuelle Plananpassung | Konfigurierbare Grenzwert-Engine (SR→Contract→Settings) | ⚠️ | Reduzierte Tages-Sollzeit pro Periode hinterlegbar, aber keine eingebaute Ramadan-Automatik; "ohne Lohnabzug" ist Payroll (nicht abgedeckt). Reframe: "reduzierte Sollzeit pro Ramadan-Periode hinterlegbar". |
| OT- und 144h/3-Wo-Deckel automatisch überwacht, Warnung vor 2h-Tageslimit; Nachtzuschlag 22:00–04:00 auto | Live-Compliance-Warnungen + typisierte Zuschläge | ⚠️ | Tages-/Wochenwerte werden gewarnt; 144h/3-Wochen-Aggregat wird gegen KEINEN Cap geprüft (OvertimeThreshold/MaximumHours nicht ausgewertet). Nachtzuschlag existiert, Fenster aber **23–06 hart im Macro**, nicht 22–04 (kein Setting). |
| WPS-konforme Stundenkonten, direkt für WPS-Lohnauszahlung nutzbar | Work-Records / Perioden-Stundenkonten; Export-Formatter | ⚠️ | Perioden-Stundenbasis vorhanden; aber keine WPS-SIF-Auszahlungsdatei (AE nur Zoho-Books-Order-Export). Reframe: "Stundenbasis für WPS", nicht "WPS-Auszahlung". |
| PDPL-konforme On-Premise-Zeiterfassung: biometrische Stempeldaten bleiben in eigener Infrastruktur | On-Premise-Stack | ❌ | Klacks erfasst/speichert **keine** biometrischen/Stempeldaten. On-Premise gilt für Planungs-/Personaldaten. Biometrie-Claim streichen/umformulieren. |
| Klacksy plant regelbasiert und nachvollziehbar | Klacksy (Skills/Rezepte/Voice) | ✅ | |
| Ausfälle schnell aufgefangen, qualifiziert/verfügbar sofort ersichtlich | Autofill/GA + Qualifikations-Matching | ✅ | Exaktes Matching; fehlende Pflicht-Qual = harter Veto. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung (OSRM/ORS/Nominatim + ACO) | ✅ | |
| 56h-Wochenschnitt laufend geprüft und dokumentiert, dass Ausnahme greift | Perioden-Stundensummen + Warnungen | ⚠️ | Wochenstunden summiert/gewarnt; rollierender Durchschnitts-Cap nicht durchgesetzt; "dokumentiert dass Ausnahme greift" nicht als Feature. Reframe: Wochenschnitt sichtbar machen. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching | ✅ | |
| PDPL On-Premise: Patienten-/Zeiterfassungsdaten verlassen das Haus nicht, auch nicht zur KI | On-Premise-Stack + keyless lokale KI | ✅ | Planungs-/Zeitdaten lokal; lokale KI möglich (Default-Provider Cloud → Opt-in nötig). |
| Klacksy plant per Sprache, schlägt qualifizierten Ersatz vor | Klacksy + GA/Qual | ✅ | |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Stationsabdeckung | Autofill/GA (Coverage-Sweep) | ✅ | |
| Notfall-Überstunden über 2h-Tageslimit gesondert erfasst + Grund dokumentiert | Work-Records / WorkChange + Notizen | ⚠️ | Überstunden/Korrekturen als WorkChange + Notizen erfassbar; keine dedizierte "Notfall-Überstunden"-Kategorie mit Pflicht-Grund. |
| 144h/3-Wo laufend geprüft, auch bei Notfalleinsätzen | Compliance-Warnungen | ⚠️ | Perioden-Summe sichtbar; 3-Wochen-Aggregat-Cap nicht durchgesetzt. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching | ✅ | |
| On-Premise: Personal-/Patientendaten verlassen die Klinik nicht | On-Premise-Stack | ✅ | |
| Klacksy plant per Sprache, berücksichtigt Qualifikation und 144h-Deckel | Klacksy | ⚠️ | Klacksy plant ✅; 144h-Deckel-Garantie inheritiert warn-only/nicht-durchgesetzt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 144h/3-Wo proaktiv überwacht, Warnung VOR der Einteilung, inkl. 2h-Tageslimit | Pre-Commit-Konfliktprüfung + Warnungen | ⚠️ | Pre-Commit-Warnung VOR dem Speichern existiert (nur neu entstehende Verstöße) — für Tages-/Kollisionsregeln ✅; 144h/3-Wochen-Aggregat wird nicht als Cap ausgewertet. |
| Feiertagsdienste automatisch erkannt, Ersatzruhetag oder 50%-Zuschlag vorgeschlagen | Kalender-DSL + Holiday-Zuschlag | ✅ | Feiertagserkennung + Holiday-Zuschlag ✅; "Ersatzruhetag" (TOIL) wird nicht automatisch getrackt. |
| Wachobjekte & Rundgänge über mehrere Objekte mit Ablösungen/Fahrzeiten geplant | Tourenoptimierung + GA | ✅ | |
| On-Premise: volle Datenhoheit | On-Premise-Stack | ✅ | |
| Klacksy plant per Sprache, berücksichtigt 144h-Deckel automatisch | Klacksy | ⚠️ | Inheritiert warn-only. |
| Ausfälle schnell aufgefangen, innerhalb des Deckels ersichtlich | GA/Qual + Warnungen | ⚠️ | Ersatzsuche ✅; "innerhalb des Deckels" warn-only. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Aussen-/Fensterreinigung im Mittagsverbot (15.6.–15.9., 12:30–15:00) automatisch gesperrt, jährlich ohne manuelles Nachtragen | — (kein nativer Zeitfenster-Bann) | ⚠️ | Kalender-DSL berechnet nur Feiertags-DATEN; Validierung kennt kein Tageszeit-Verbot. Approximierbar über Verfügbarkeits-/Break-Sperren, aber nicht automatisch/jährlich. Reframe: sichtbar machen, nicht hart sperren. |
| Bussgeldrisiko bis AED 50.000 vermieden, da Verbotsfenster gar nicht verplanbar | Compliance-Warnungen | ⚠️ | Klacks warnt/macht sichtbar, blockiert das Speichern nie. Reframe. |
| Objekte & Touren automatisch optimiert | Tourenoptimierung | ✅ | |
| Split-Shifts vor/nach dem Verbotsfenster automatisch vorgeschlagen | Autofill/GA | ⚠️ | Split-Shifts als Planungsergebnis möglich, aber Optimizer kennt das Verbotsfenster nicht → nicht automatisch daran ausgerichtet. |
| On-Premise: volle Datenhoheit | On-Premise-Stack | ✅ | |
| Klacksy hält Mittagsverbot automatisch ein | Klacksy | ⚠️ | Kein nativer Zeitfenster-Bann; inheritiert obige Grenze. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Be-/Entladeschichten an unüberdachten Terminals im Mittagsverbot automatisch gesperrt, jährlich | — (kein nativer Zeitfenster-Bann) | ⚠️ | Wie Hausdienste: warnen/sichtbar, nicht hart sperren. |
| Terminalbereiche pro Fläche als überdacht/unüberdacht deklarierbar, nur betroffene gesperrt | — | ⚠️ | Kein eingebautes Überdacht/Unüberdacht-Attribut gefunden; über getrennte Gruppen/Objekte modellierbar (verifizieren). Sperr-Logik ohnehin nicht nativ. |
| Bussgeldrisiko bis AED 50.000 vermieden, da Aussenflächen-Fenster nicht verplanbar | Compliance-Warnungen | ⚠️ | Warnt/sichtbar, verhindert Speichern nie. |
| Touren & Anlieferungen mit Ladezeiten/Personaleinsatz abgestimmt | Tourenoptimierung + GA | ✅ | |
| On-Premise: volle Datenhoheit | On-Premise-Stack | ✅ | |
| Klacksy plant per Sprache, berücksichtigt Mittagsverbot | Klacksy | ⚠️ | Inheritiert Bann-Grenze. |

## Fazit

- **Trägt ehrlich:** On-Premise-Planungsdatenhaltung, Tourenoptimierung, Autofill, Klacksy, Feiertagserkennung + Holiday-Zuschlag, konfigurierbare Tages-/Wochen-Grenzwerte mit Warnung.
- **Entschärfen:** (1) Alle Biometrie/WPS-Stempel-Claims — Klacks hat keine biometrische/Stempel-Erfassung; On-Premise gilt nur für Planungsdaten. (2) 144h/3-Wochen- und 2h-Tageslimit "hart" → Klacks **warnt**, blockiert nie; Aggregat-Caps nicht durchgesetzt. (3) Nachtzuschlag 22–04 → Default ist 23–06 (nur per Macro-Edit änderbar). (4) Mittagsverbot "automatisch gesperrt" → kein nativer Zeitfenster-Bann; sichtbar machen statt sperren.
- **Bilanz:** ✅ 16 · ⚠️ 18 · ❌ 1.
