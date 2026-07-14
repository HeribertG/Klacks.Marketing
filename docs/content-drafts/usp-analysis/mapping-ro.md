# RO — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Tägliche Zeiterfassung ITM-fest (Art. 119, Beginn/Ende je AN) | Work-Records (planungs-/manuell) | ⚠️ | Tägliche Zeiten dokumentierbar/vorlegbar ✅; kein verifizierter Clock-in. |
| Ohne biometrische Daten (ANSPDCP sanktioniert Biometrie) | Keine Biometrie im System | ✅ | Ehrliches Positiv: Klacks hat keine Biometrie. |
| 48h-Ruhezeit & ICCJ-Zuschlag 150% im Blick (Art. 137) | Regel-Engine (Wochenruhe) + typisierte Zuschläge | ✅ | 48h-Wochenruhe als Regel; 150%-Zuschlag bei Nichtgewährung konfigurierbar. |
| Überstunden-Ausgleich fristgerecht (90 Tage, sonst ≥75%) | Live-Compliance-Warnungen + Zuschläge | ⚠️ | 75%-Zuschlag konfigurierbar; die 90-Tage-Ausgleichsfrist wird nur überwacht, nicht erzwungen. |
| Dokumentation gegen Schwarzarbeits-Bussgelder (40.000 RON/Person) | Work-Records | ⚠️ | Dokumentation planungsbasiert; Abschreckungswirkung nur so gut wie die Eintragungen (kein Clock-in). |
| Klacksy: regelbasiert, keine Blackbox | Klacksy | ✅ | Voll gedeckt. |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Wegzeit vertragskonform abgebildet (nur wenn Vertrag es vorsieht, Art. 111) | Wegzeit als Arbeitszeit (konfigurierbar) | ✅ | Wegzeit-als-Arbeitszeit pro Vertrag ein-/ausschaltbar. |
| Teilzeit-Überstunden verhindert (Art. 105) | Live-Compliance-Warnungen | ⚠️ | „Verhindert" = Enforcement; Klacks warnt, blockiert das Speichern nicht. |
| Vertragsklauseln im Blick — fehlt Klausel → gilt als Vollzeit | — | ⚠️ | Automatische Rechts-Umqualifizierung nicht gedeckt; Klacks kann höchstens dokumentieren/warnen. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 24h-Ruhezeit nach Gardă automatisch geplant (Ord. MS 870/2004) | Regel-Engine (Ruhezeit nach Schicht) | ✅ | Ruhezeit-Regel nach Bereitschaftsdienst gedeckt. |
| Nachholung bei Unterbesetzung — 24h-Ruhe entfällt/verschoben, Tagesnorm nachholen | — | ⚠️ | Komplexe bedingte Nachhol-Logik nicht modelliert. |
| 35-Stunden-Woche im Blick (7h/Tag) | Live-Compliance-Warnungen | ⚠️ | Wochengrenze als Wert hinterlegbar; Durchschnittsüberwachung = Warnung, nicht durchgesetzt. |
| Qualifikationen & Stationen | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos | Schedule-Optimizer | ✅ | Voll gedeckt. |
| 12h-Grenze & 24h-Ruhe erzwungen, 24/24 unzulässig (Art. 115) | Konfigurierbare Grenzwerte + Ruhezeit-Regel | ⚠️ | 24h-Ruhe als Regel ✅; die 12h-Grenze „erzwungen" ist Überversprechen — Klacks warnt, blockiert nicht. |
| 12h/24h- und 12h-Nacht/48h-frei-Modelle abgebildet (Art. 116) | Schichtmodelle/Rotationen | ✅ | Rotationsmodelle planbar. |
| Pausenregelung je Betriebsvereinbarung ab 6h (Art. 134), bezahlt/unbezahlt | Konfigurierbare Pausenregeln | ✅ | Bezahlte/unbezahlte Pausen konfigurierbar. |
| Zertifikate automatisch geprüft | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf nicht erzwungen. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Mindestlohn zum Stichtag umgestellt (4.050 → 4.325 RON, HG 146/2026) | Konfigurierbare Werte | ⚠️ | Wert/Stichtag hinterlegbar ✅; automatische zeitgesteuerte Umstellung = Payroll, nicht belegt. |
| Nachtarbeit 22–06 (≥3h) — 25% Zuschlag oder 1h kürzere Arbeitszeit | Typisierte Zuschläge (Nacht, Zeitfenster) | ✅ | Nachtzuschlag konfigurierbar; Alternative „1h kürzer" als Regel abbildbar. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Qualifikationen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Lenk-/Pausenzeiten überwacht (9h/10h, 45min nach 4,5h) | Live-Compliance-Warnungen | ⚠️ | Grenzen als Regel warnbar; keine Fahrtenschreiber-/Tacho-Datenanbindung. |
| 10h-Grenze bei Nachtfahrten (4h Nachtfenster 0–7) | Live-Compliance-Warnungen | ⚠️ | Nachtarbeits-Cap; nur Warnung. |
| Bereit für Kleintransporter-Regel ab Juli 2026 (2,5–3,5t, Tacho/Entsende) | — | ⚠️ | Keine Tacho-/Entsende-Integration; Klacks plant nur. |
| Führerschein-Klassen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf nicht erzwungen. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |

## Fazit

48h-Wochenruhe, Ruhezeit nach Gardă, Rotationsmodelle (12/24, 12-Nacht/48-frei), Pausenkonfiguration, Nachtzuschlag, Tourenoptimierung, konfigurierbare Wegzeit und das „keine Biometrie"-Argument sind ehrlich gedeckt. **Vorbehalte:** Enforcement-Formulierungen (12h-Grenze „erzwungen", Teilzeit-Überstunden „verhindert", Auto-Umqualifizierung zu Vollzeit) überzeichnen — Klacks warnt/dokumentiert, blockiert nie. Zeiterfassung ist planungsbasiert (kein Clock-in), Lenkzeiten ohne Tacho-Anbindung, Mindestlohn-Stichtags-Umstellung ist Payroll (manuell). Empfehlung: Enforcement-Verben durchgängig auf „überwachen/warnen" umstellen.
