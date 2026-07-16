# Otto-Kritik: K20 Land×Branche-Content-Pack Österreich (at.json industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/at.json`, Sektionen `worktime`,
`compliance`, `industryProfiles` (homecare, healthcare, security, facility, logistics).
Otto-Session: `k20-pack-at` (isoliert).

## Ottos Rohantwort

Otto hat mit Live-Recherche (Web-Grounding, u.a. arbeitsinspektion.gv.at, RIS, lexisnexis.at,
sieda.com) geantwortet, strukturiert nach den fünf vorgelegten Prüfpunkten plus branchenweiser
Qualifikations-Lückenanalyse. Kein pauschales Lob; konkrete §-Verweise für AZG/ARG/Urlaubsgesetz,
schwächere/uncitierte Aussage bei SWÖ-KV-Details. Volltext im Session-Log
(`~/claude-otto-bridge`, Session `k20-pack-at`, run `1ae97aec-ef5f-4ed0-9693-71469c5d838a`).
Hinweis: Erstversuch (Modell `google/gemini-3.5-flash`) lief nach 220s in Timeout, Fallback auf
`anthropic/claude-haiku-4-5` lieferte die Antwort.

## Kritikpunkte, Bewertung, Umsetzung

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 1 | Nachtfenster überall `22:00–05:00` gesetzt — § 12a AZG definiert Nachtzeit als **22:00–06:00**, ebenso NSchG; 05:00-Ende nur branchenspezifische Ausnahme (Bäckereien), kein genereller Default. Belegt mit mehreren Quellen (arbeitsinspektion.gv.at, RIS, lexisnexis.at, sieda.com). | zutreffend, gut belegt, deckt sich exakt mit der im Auftrag benannten Schwachstelle | **umgesetzt**: `nightEnd` in allen 5 Branchen-Presets `05:00` → `06:00` |
| 2 | `maxConsecutiveDays: 6` — keine explizite gesetzliche Obergrenze, aber § 9 ARG (36h-Wochenruhe inkl. Kalendertag) erzwingt faktisch max. 6 aufeinanderfolgende Arbeitstage als sicheren Default; Ausnahmen (Dekadenschicht Bau, gemittelte Schichtzyklen) existieren, sind aber Sonderfälle. | bestätigt bestehenden Wert | kein Änderungsbedarf |
| 3 | `vacationDaysPerYear: 30` — § 2 Urlaubsgesetz: 5 Wochen Mindesturlaub; bei 6-Tage-Woche (Werktage) = 30 Werktage korrekt; bei 5-Tage-Woche wären es 25 Arbeitstage (anderer Zählstandard, gleicher Anspruch). | bestätigt bestehenden Wert (Werktage-Konvention konsistent mit DE-Profil) | kein Änderungsbedarf |
| 4 | `compliance.rosterPublication.minLeadDays: 14` — laut Otto nur für den mobilen SWÖ-Bereich (Spitex) korrekt ("14. des Vormonats"); stationäre Bereiche (Klinik, Behindertenbetreuung) hätten Frist "1. des Vormonats" (≈30 Tage). Vorschlag: Wert erhöhen oder erläuternden `note`-Schlüssel ergänzen. | **abgelehnt** in der vorgeschlagenen Form: (a) `RegionSetupRosterPublication` ist ein einziges regionsweites Feld ohne Branchen-Override — es gibt keinen Ort für einen Branchen-Split; (b) `RegionSetupRosterPublication`/`RegionSetupCompliance` sind `JsonUnmappedMemberHandling.Disallow` — ein `note`-Feld existiert im DTO nicht und würde den Import brechen; (c) die SWÖ-KV-§-15-Behauptung kam ohne zitierte Quelle (anders als die AZG-Punkte mit URL-Belegen) — genau die Art Behauptung, die laut Auftrag mit erhöhter Skepsis zu prüfen ist. | **offen** — nicht umgesetzt, mangels Quellenbeleg und fehlendem Schema-Feld |
| 5 | `facility`-Qualifikation "Reinigungstechnik (Lehrberuf)" — offizieller WKO-Lehrberuf heißt "Reinigungstechnik", die ausübende Person aber "Reinigungstechniker/in"; aktueller Text liest sich wie ein Attribut, nicht wie eine Berufsbezeichnung. | plausibel, reine Präzisierung, kein neues Feld | **umgesetzt**: `de` → "Reinigungstechniker/in (Lehrberuf)"; `en` → "Building cleaning technician (vocational qualification)"; `fr` → "Technicien/ne en nettoyage (formation professionnelle)"; `it` → "Tecnico/a delle pulizie (qualifica professionale)" |
| 6a | homecare/healthcare: GBR-Registrierung (Gesundheitsberufe-Register, § 21 GBRG, 5 Jahre Gültigkeit) als fehlende Pflicht-Voraussetzung für DGKP/PFA, vorgeschlagen als Text-Zusatz im Qualifikationsnamen. | inhaltlich plausibel (Registrierungspflicht existiert), aber: (a) keine "fehlende Qualifikation" im engeren Sinn, sondern ein Attribut bestehender Einträge — beantwortet die gestellte Frage (d) nicht sauber; (b) DTO kennt kein "Registrierungspflicht"/"Gültigkeitsdauer"-Feld, nur `isTimeLimited` (bool); Text in den Namen zu quetschen bricht die Namenskonvention aller anderen Länderprofile (DE/CH/FR/IT nutzen kurze Berufsbezeichnungen ohne Rechtszusätze) und ändert den Import-Natural-Key unnötig invasiv | **offen** — nicht umgesetzt, Schema-Lücke + Konsistenz-Risiko |
| 6b | security: Sicherheitsunterweisung § 14 ASchG (jährlich) und optional Brandschutzbeauftragter (TRVB 117, 5 Jahre) als fehlende Qualifikationen. | Sicherheitsunterweisung nach § 14 ASchG gilt branchenübergreifend für JEDEN Arbeitgeber, keine Security-Spezifik — exakt das Muster, das in der DE-Runde für facility (§12 ArbSchG-Unterweisung) bereits als "branchenübergreifend statt branchenspezifisch" abgelehnt wurde (Präzedenzfall `otto-critique-k20-pack-de.md`, Punkt 4d). Brandschutzbeauftragter nennt Otto selbst als "optional", erfüllt also nicht die Vorgabe "SEHR übliche Pflicht-Qualifikation". | **abgelehnt** — beide Vorschläge, aus denselben Gründen wie der DE-Präzedenzfall bzw. explizite Optionalität |
| 6c | logistics: "Fahrerkarte (digitaler Tachograf)" fehlt — eigenständiges Pflichtdokument nach EU-VO 165/2014 für Berufskraftfahrer mit Tachograf-Pflicht, unterscheidet sich klar von Führerschein C/CE und Code 95 (Weiterbildung), 5 Jahre Gültigkeit. | klar zutreffend, spezifisches EU-weites Pflichtdokument, bislang tatsächlich nicht im Katalog, gleiche Argumentationsklasse wie die bereits akzeptierte "Berufskraftfahrer-Qualifikation Code 95" im DE-Pack | **umgesetzt**: neue Qualifikation "Fahrerkarte (digitaler Tachograf)" hinzugefügt, `isTimeLimited: true` |

## Offene Punkte (nicht umgesetzt, brauchen ggf. separate Entscheidung)

1. `rosterPublication.minLeadDays: 14` — Otto behauptet eine SWÖ-KV-§-15-Differenzierung
   mobil/stationär ohne zitierte Quelle; DTO erlaubt ohnehin keinen Branchen-Split und kein
   `note`-Feld. Müsste mit einer verifizierten SWÖ-KV-Primärquelle neu geprüft werden, bevor der
   Wert geändert wird.
2. GBR-Registrierungspflicht (DGKP/PFA) — inhaltlich echt, aber DTO hat kein Feld für
   Registrierungs-/Gültigkeitsattribute jenseits von `isTimeLimited`; Umsetzung würde entweder ein
   neues Schema-Feld oder eine Namenskonvention-Abweichung erfordern — Grundsatzentscheid nötig.
3. Sicherheitsunterweisung § 14 ASchG bei security — branchenübergreifende Pflicht, kein
   Security-Spezifikum, gleiche Kategorie wie der bereits abgelehnte DE-Punkt zu § 12 ArbSchG.

## Verifikation

```
python3 -c "import json; json.load(open('at.json'))"  → OK
logistics.qualificationCatalog: 5 Einträge (4 bestehend + Fahrerkarte)
nightEnd in allen 5 Branchen-Presets: "06:00" (einheitlich, vorher "05:00")
```

## Gesamturteil

Otto lieferte eine substanzielle, überwiegend gut belegte Kritik mit einem klaren, mehrfach
zitierten Fehlerfund (Nachtfenster-Ende 05:00 statt 06:00 nach § 12a AZG) sowie einer präzisen,
unstrittigen Namenskorrektur (Reinigungstechniker/in) und einem plausiblen neuen Pflichtdokument
für Logistik (Fahrerkarte/Tachograf, EU-VO 165/2014). Der SWÖ-KV-Punkt zu `minLeadDays` blieb ohne
Quellenangabe und wurde entsprechend der Skepsis-Vorgabe nicht übernommen — zusätzlich blockiert
durch fehlende Schema-Unterstützung (kein Branchen-Split, kein `note`-Feld,
`JsonUnmappedMemberHandling.Disallow`). Die security-Vorschläge (Sicherheitsunterweisung,
Brandschutzbeauftragter) wurden konsistent mit dem bereits etablierten DE-Präzedenzfall
zurückgewiesen (branchenübergreifend statt branchenspezifisch bzw. explizit optional). Die
GBR-Registrierungspflicht ist fachlich plausibel, passt aber nicht sauber in das bestehende
Qualifikations-Schema und wurde als offener Grundsatzpunkt dokumentiert statt durch eine
Namenskonvention-Verbiegung umgesetzt.

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/at.json` (nightEnd ×5, Qualifikationsname
facility, neue Qualifikation logistics)
**Nicht verändert:** DTOs unter `Application/DTOs/Setup/` (kein Schema-Feld ergänzt)
