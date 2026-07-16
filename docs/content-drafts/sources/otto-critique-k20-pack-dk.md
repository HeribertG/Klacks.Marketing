# Otto-Kritik: K20 Nordics-Pack Dänemark (dk.json — worktime/compliance/industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/dk.json`. Otto-Session: `k20-pack-dk` (isoliert).
Ottos Lauf ist mid-run von `google/gemini-3.5-flash` auf `anthropic/claude-haiku-4-5` failover-gegangen
(Timeout nach 220s); die Web-Recherche-Tools sind dabei teils fehlgeschlagen (xAI-API-Key-Fehler,
Gemini-Fetch-Timeout). Alle Otto-Behauptungen wurden deshalb zusätzlich unabhängig per WebSearch
gegengeprüft — mit klarem Ergebnis: **zwei von Ottos "kritischen Fehlern" waren selbst falsch
(fabriziert/veraltet)**.

## Ottos Rohantwort

Volltext im Session-Log (`~/claude-otto-bridge`, Session `k20-pack-dk`, run
`91ea8d9e-13a4-4462-92fa-9be09119f0bc`).

## Kritikpunkte, Gegenprüfung, Bewertung

| # | Otto-Kritik | Unabhängige Gegenprüfung (WebSearch) | Bewertung | Status |
|---|---|---|---|---|
| 1 | `rosterPublication.minLeadDays=4` korrekt für Varsko-Schwelle | nicht separat verifiziert, Otto selbst bestätigt | plausibel, keine Änderung vorgeschlagen | kein Änderungsbedarf |
| 2 | facility `periodCaps windowWeeks=2` sei **"kritisch falsch"** — Serviceoverenskomst verlange 4+ Wochen (Otto zitierte unscharf "4 bis 26 Wochen") | **WIDERLEGT**: BL-Rengøringsoverenskomsten/Serviceoverenskomst (3F/DI, 2023-2028) legt explizit "37 Stunden im Schnitt über eine Periode von **mindestens 2 Wochen**" fest — der bestehende Wert ist korrekt | Otto lag falsch (unscharfe/erfundene Quellenangabe nach Tool-Ausfall) | **abgelehnt** — kein Änderungsbedarf, Wert bestätigt korrekt |
| 3 | logistics Nachtfenster 01:00–05:00 sachlich korrekt, aber die Referenz "Bilag 23" sei falsch/irreführend (richtig: Lov om arbejdstid for mobile lønmodtagere) | Im JSON selbst steht keine Rechtsgrundlagen-Referenz als Textfeld — "Bilag 23" war nur eine Kurzbezeichnung im Prüfauftrag, keine JSON-Payload | Zeitfenster-Wert selbst unbestritten korrekt | kein Änderungsbedarf am JSON; Auftragstext-Referenz "Bilag 23" ggf. präziser "Lov om arbejdstid for mobile lønmodtagere §1" |
| 4 | `defaultWorkingHours=7.4` korrekt (37h/5 Tage) | konsistent mit Serviceoverenskomst-Normalarbeitszeit 37h/Woche | bestätigt | kein Änderungsbedarf |
| 5a | SSA solle `isTimeLimited: true` bekommen (angeblich 5-Jahres-STPS-Reautorisierung) | STPS-Suche liefert **keine belastbare Quelle** für eine periodische Reautorisierungspflicht bei SSA; dänische Gesundheitsautorisation ist im Regelfall unbefristet (nur bei Fehlverhalten entziehbar) | unbelegt, widerspricht dem in DE/AT/CH/FR/IT etablierten Muster (nur Kurzzeit-Zertifikate wie Erste-Hilfe sind `isTimeLimited`) | **abgelehnt** — keine Änderung, Beleglage zu schwach |
| 5b | SSH ("Sozial- und Gesundheitshelfer/in") existiere **nicht** als offizielle dänische Bezeichnung, solle entfernt/umbenannt werden | **WIDERLEGT, klare Fabrikation**: "Social- og sundhedshjælper" (SOSU-hjælper/SSH) ist eine reguläre, bundesweite EUD-Ausbildung (14 Monate, sosuh.dk, FOA, UG.dk, Wikipedia) — existiert eindeutig, ist die Basisstufe unterhalb SSA | Otto hat hier fabriziert (vermutlich Folge des Tool-Ausfalls/Modell-Failovers) | **abgelehnt** — SSH bleibt unverändert im Katalog |
| 5c | "Rengøringstekniker" korrekt, `isTimeLimited` korrekt `false` | bestätigt bestehenden Zustand | kein Änderungsbedarf | kein Änderungsbedarf |
| 5d | "Wach-Grundkurs" solle als "Grundlæggende Vagt (AMU 49697)" präzisiert werden, `isTimeLimited: true` (3–5 Jahre) | **BESTÄTIGT**: AMU-Kursnummer 49697 real (amukurs.dk, aarhustech.dk); Kurs erfordert zusätzlich polizeiliche Vorab-Zustimmung | plausibel, aber Kursnummer selbst nicht Teil des Namensfelds gemacht (Formulierungsentscheid) | **teilweise umgesetzt**: Name auf "Wach-Grundkurs (Grundlæggende Vagt, AMU)" präzisiert; `isTimeLimited` beim Kurs selbst NICHT gesetzt (Kurszertifikat läuft nicht ab — die zeitliche Befristung betrifft die separate Polizeigenehmigung, s. Punkt 8) |
| 6 | `vacationDaysPerYear=25` sei **falsch/zu niedrig**, Ferieloven verlange 30 Tage (6 Wochen) | **WIDERLEGT**: Ferieloven garantiert 25 Tage/5 Wochen als gesetzlicher Anspruch (2,08 Tage/Monat); eine 6. Ferieuge (Feriefridage) ist eine ZUSÄTZLICHE, tarifvertraglich unterschiedlich geregelte Leistung, kein gesetzlicher Standard für alle Beschäftigten | Otto lag falsch — 25 ist der korrekte, sichere gesetzliche Default (gleiche Logik wie bei DE: gesetzliches Minimum statt bestbezahlter Tarifvertrag) | **abgelehnt** — kein Änderungsbedarf, Wert bestätigt korrekt |
| 7 | homecare/healthcare: Erste-Hilfe-Bezeichnung zu vage, sollte "Sygeplejefaglig Førstehjælp" o.ä. heißen | generisches Erste-Hilfe-Zertifikat ist branchenübergreifend konsistent zu allen 5 K20-Länderpacks (DE/AT/CH/FR/IT) — Sonderbezeichnung würde Muster brechen ohne belegten Mehrwert | schwach begründet, keine harte Quelle für spezifischeren Namen | **abgelehnt** — Konsistenz mit bestehendem Muster |
| 8 | security: "Politigodkendelse" (polizeiliche Zulassung/Vagtbevis) fehle als eigenständige Pflicht-Qualifikation | **BESTÄTIGT**: Vagtvirksomhedsloven §7 verlangt personalisierte polizeiliche Zulassung + "personlegitimationskort" (Vagtbevis) für jede Wachperson, unabhängig vom Ausbildungskurs; Unternehmens-Autorisation läuft laut §5 nach bis zu 5 Jahren ab | klar zutreffend, SEHR übliche eigenständige Pflicht-Qualifikation, bisher nicht im Katalog | **umgesetzt**: neue Qualifikation "Personallegitimationskort (Vagtbevis, polizeiliche Genehmigung §7)" hinzugefügt, `isTimeLimited: true` |

## Offene Punkte

Keine — alle markierten Punkte wurden entweder bestätigt (kein Änderungsbedarf), unabhängig widerlegt
(abgelehnt) oder umgesetzt.

## Verifikation

```
python3 json.load dk.json → OK
```

Gesamt-Testlauf siehe `otto-critique-k20-pack-fi.md` (Sammel-Verifikation nach allen 4 Ländern).

## Gesamturteil

Otto lieferte in dieser Runde **zwei fabrizierte "kritische Fehler"** (facility-Referenzperiode,
Ferieloven-Urlaubstage) — beide durch unabhängige WebSearch klar widerlegt. Ursache vermutlich der
mid-run-Failover von Gemini auf Claude-Haiku nach Tool-Ausfällen (xAI-Key ungültig, Gemini-Fetch-Timeout),
wodurch die zweite Analysehälfte ohne verlässliche Recherche auskommen musste. Von den ursprünglich
8 Kritikpunkten waren nach Gegenprüfung nur 2 tatsächlich zutreffend und engine-konform umsetzbar
(Wach-Grundkurs-Präzisierung, fehlende Politigodkendelse bei security); 2 wurden explizit **als falsch
widerlegt** (nicht nur "unsicher"), 1 aus Beleg-Schwäche abgelehnt (SSA-Befristung), 1 aus
Konsistenzgründen abgelehnt (Erste-Hilfe-Umbenennung), 2 brauchten keine JSON-Änderung (minLeadDays,
Nachtfenster-Referenz).

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/dk.json` (Sektion `industryProfiles.security.qualificationCatalog`)
**Lektion:** Bei Otto-Ausfällen/Failover MUSS die Web-Recherche unabhängig gegengeprüft werden, bevor
Korrekturen übernommen werden — Otto kann bei gescheiterter Recherche mit hoher Sicherheit falsche
"Fakten" formulieren (SSH "existiert nicht", Ferieloven "30 Tage").
