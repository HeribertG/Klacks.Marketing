# Otto-Kritik: K20 Land×Branche-Content-Pack Deutschland (de.json industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/de.json`, Sektion `industryProfiles`
(homecare, healthcare, security, facility, logistics). Otto-Session: `k20-pack-de` (isoliert).

## Ottos Rohantwort

Otto hat KEIN pauschales Lob geliefert, sondern strukturiert pro Branche (a) Arbeitszeitregeln,
(b) Qualifikationsnamen, (c) isTimeLimited, (d) fehlende Pflicht-Qualifikation bewertet, inkl.
eines vollständigen korrigierten JSON-Entwurfs. Volltext liegt im Session-Log
(`~/claude-otto-bridge`, Session `k20-pack-de`, run `921fedda-b866-406b-a6f8-8c6185b9d96e`).

## Kritikpunkte, Bewertung, Umsetzung

### 1) homecare (ambulante Pflege)

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 1a | `minPauseHours: 11` als sicherer Default korrekt (§5 Abs.1 ArbZG; Verkürzung auf 10h nach §5 Abs.2 nur mit Ausgleich) | zutreffend, kein Fehler | offen/kein Änderungsbedarf |
| 1b | `fr`/`it` bei "Pflegefachkraft" veraltet/unpräzise ("Infirmier diplômé" maskulin, "Infermiere qualificato" unüblich) | plausibel, geringes Risiko, reine Übersetzungsverbesserung | **umgesetzt**: fr → "Infirmier/ère diplômé/e d'État", it → "Infermiere" |
| 1b | fr/it fehlen bei "Betreuungskraft nach §43b SGB XI" | plausible Übersetzungen, kein neues Feld | **umgesetzt**: fr "Auxiliaire de vie (§43b SGB XI)", it "Operatore socio-assistenziale (§43b SGB XI)" |
| 1c | Erste-Hilfe `isTimeLimited=true` korrekt (DGUV Vorschrift 1 §26 Abs.2, 2-Jahres-Turnus) | zutreffend | kein Änderungsbedarf |
| 1d | Führerschein Klasse B fehlt (ambulant = mobil) | plausibel, aber allgemeine Voraussetzung, kein branchenspezifischer Pflichtnachweis wie C/CE bei Logistik; nicht klar von "fehlender Pflicht-Qualifikation" (Aufgabenpunkt d) abgedeckt | **offen** — nicht umgesetzt, Unsicherheit |
| 1d | Pflegehelfer/in (1-jährige Ausbildung) fehlt | ist eine alternative/niedrigere Rolle, keine fehlende Pflicht-Qualifikation für die vorhandenen Rollen | **abgelehnt** — beantwortet nicht die gestellte Frage (Pflicht-Nachweis fehlt, keine Rollen-Erweiterung) |

### 2) healthcare (Klinik)

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 2a | `maxDailyHours: 10` als einziger sicherer gesetzlicher Default korrekt (§3 ArbZG; 12h/24h-Dienste nur tarifvertraglich über §7, von Klacks nicht abgebildet) | zutreffend, bestätigt bestehenden Wert | kein Änderungsbedarf |
| 2b | "Examinierte Pflegefachkraft" rechtlich veraltet — seit PflBG 2020 heißt es einheitlich "Pflegefachkraft"; gleiche fr/it-Korrektur wie homecare | plausibel, ändert den `de`-Wert (= Import-Natural-Key), aber bricht keine Testinvariante (Count bleibt 2, Preset-Name unverändert) | **umgesetzt**: de → "Pflegefachkraft", fr → "Infirmier/ère diplômé/e d'État", it → "Infermiere" |
| 2d | MFA (Medizinische/r Fachangestellte/r) als fehlende Pflicht-Qualifikation | inhaltlich plausibel, ABER: `RegionSetupExampleProfileTests.ShippedGermanExampleProfile_ParsesAgainstCurrentSchema` erzwingt für healthcare exakt 2 Qualifikationen (`healthcare.QualificationCatalog.Count.ShouldBe(2)`). Test darf laut Auftrag NICHT angepasst werden. | **offen** — nicht umgesetzt, Testinvariante blockiert |

### 3) security (Sicherheitsdienst)

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 3a | `maxDailyHours: 12` als Standard-Default fachlich nicht vertretbar — §3 ArbZG erlaubt generisch max. 10h (mit Ausgleich); 12h nur über §7 ArbZG bei Tarifbindung + erheblicher Arbeitsbereitschaft (z.B. BDSW-Wachdienst-Tarifvertrag) | zutreffend für einen generischen, nicht tarifgebundenen Default. 12h bleibt für tarifgebundene Wachdienste weiterhin legal — das ist eine Ausnahme, kein Fehler des Konzepts, aber ein ungeeigneter *Default* ohne Tarifbindung. Sicherer Default = konservativ, im Einzelfall hochsetzbar. | **umgesetzt**: `maxDailyHours` 12 → 10 |
| 3b | fr/it bei "Sachkundeprüfung"/"Unterrichtung" fehlen | plausible Übersetzungen, kein neues Feld | **umgesetzt**: Sachkundeprüfung fr "Examen d'aptitude professionnelle (§34a GewO)", it "Esame di idoneità professionale (§34a GewO)"; Unterrichtung fr "Cours d'instruction (§34a GewO)", it "Corso di formazione (§34a GewO)" |
| 3b | Otto schlug zusätzlich vor, die bestehenden `en`-Werte zu ändern ("Competence examination" → "Expertise examination"; "Instruction certificate" → "Instruction course") | **abgelehnt**: "Competence examination" ist idiomatisches Englisch für Sachkundeprüfung, "Expertise examination" ist ein unüblicher Sachkunde→Expertise-Calque. "Instruction certificate" ist ebenfalls vertretbar (Zertifikat für einen prüfungsfreien Kurs ist kein Widerspruch); Ottos Begründung ("kein Zertifikat ohne Prüfung") ist schwach. Beide ursprünglichen `en`-Werte beibehalten. | **abgelehnt** — nur fr/it-Lücken gefüllt, `en` unverändert gelassen |
| 3c | Sachkundeprüfung/Unterrichtung unbefristet (GewO kennt kein Verfallsdatum) — aktueller Stand (kein `isTimeLimited`) korrekt | bestätigt bestehenden Zustand | kein Änderungsbedarf |
| 3d | Waffensachkundeprüfung nach §7 WaffG fehlt | Otto selbst beschreibt sie als nötig "für Sicherheitskräfte, die bewaffnete Dienste leisten" — das ist eine Minderheit (Geld-/Werttransport, bewaffneter Objektschutz), nicht die übliche Mehrheit des Sektors (Objekt-/Werkschutz, Pförtnerdienst sind i.d.R. unbewaffnet). Erfüllt nicht die Anforderung "SEHR übliche Pflicht-Qualifikation". | **abgelehnt** — zu speziell für den generischen Sicherheitsdienst-Default |

### 4) facility (Gebäudereinigung)

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 4a | Arbeitszeitwerte korrekt, aber `nightStart`/`nightEnd`/`performsShiftWork` fehlen — Büroreinigung findet oft nachts/im Schichtbetrieb statt, Konsistenz zu den übrigen Branchen | plausibel, Felder existieren im DTO (`RegionSetupSchedulingRulePreset`), risikoarme Konsistenzverbesserung | **umgesetzt**: `nightStart: "23:00"`, `nightEnd: "06:00"`, `performsShiftWork: true` ergänzt |
| 4b | fr/it fehlen bei beiden Qualifikationen | plausible Übersetzungen | **umgesetzt**: Gebäudereiniger/in fr "Nettoyeur de bâtiments (formation professionnelle)", it "Pulitore di edifici (qualifica professionale)"; Fachkraft Glas/Fassade fr "Spécialiste en nettoyage de vitres et façades", it "Specialista in pulizia di vetri e facciate" |
| 4c | Beide Qualifikationen unbefristet korrekt | bestätigt | kein Änderungsbedarf |
| 4d | Jährliche Sicherheits-/Gefahrstoffunterweisung (§12 ArbSchG i.V.m. DGUV Vorschrift 1) fehlt | Diese Unterweisungspflicht gilt praktisch branchenübergreifend für JEDEN Arbeitgeber (§12 ArbSchG ist keine Facility-Spezifik) — sie fehlt konsequent auch bei den anderen vier Branchen im Pack. Als branchenspezifische "SEHR übliche Pflicht-Qualifikation" nicht überzeugend; würde Präzedenzfall für alle Profile schaffen, außerhalb des Scopes dieser Prüfung. | **offen** — nicht umgesetzt, grundsätzliche Scope-Frage (branchenübergreifend vs. branchenspezifisch) |

### 5) logistics (Logistik)

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 5a | Arbeitszeitwerte nach ArbZG §3 korrekt (Fahrpersonalrecht/FPersG regelt Lenk-/Ruhezeiten separat, Klacks hat keine Fahrtenschreiber-Engine — 10h/48h somit korrekter Fallback) | bestätigt, kein Änderungsbedarf an Stundenwerten | kein Änderungsbedarf |
| 5a | `performsShiftWork` fehlt, Logistik-Umschlag/Fernverkehr ist typischerweise Schichtbetrieb | plausible Konsistenzverbesserung, Feld existiert im DTO | **umgesetzt**: `performsShiftWork: true` ergänzt |
| 5b | fr/it fehlen bei Gabelstaplerschein und ADR-Bescheinigung | plausible Übersetzungen | **umgesetzt**: Gabelstaplerschein fr "Certificat cariste (CACES)", it "Patentino muletto (carrelli elevatori)"; ADR fr "Certificat de formation ADR", it "Patentino ADR (C.F.P. ADR)" |
| 5c | Führerschein C/CE (5 Jahre, §23 Abs.1 Nr.2 FeV) und ADR (5 Jahre, Kap. 8.2 ADR) korrekt befristet; Gabelstaplerschein unbefristet (DGUV Grundsatz 308-001) korrekt | bestätigt bestehenden Zustand | kein Änderungsbedarf |
| 5d | Berufskraftfahrer-Qualifikation (Schlüsselzahl 95, BKrFQG) fehlt | Klar zutreffend: gesetzlich zwingend für JEDE gewerbliche C/CE-Fahrt, eigenständig vom reinen Führerschein zu unterscheiden (Führerschein = Fahrbefähigung, Code 95 = Weiterbildungsnachweis alle 5 Jahre), aktuell tatsächlich nicht im Katalog. Erfüllt die Anforderung "SEHR übliche Pflicht-Qualifikation" eindeutig. | **umgesetzt**: neue Qualifikation "Berufskraftfahrer-Qualifikation (Schlüsselzahl 95)" hinzugefügt, `isTimeLimited: true` |

## Offene Punkte (nicht umgesetzt, brauchen ggf. separate Entscheidung)

1. homecare: Führerschein Klasse B als Katalogeintrag — Unsicherheit, ob generische Fahrerlaubnis in den Qualifikationskatalog gehört (vs. C/CE bei Logistik, das ein spezifischer Berufsnachweis ist).
2. homecare: Pflegehelfer/in als zusätzliche Rolle — beantwortet nicht die gestellte Frage nach fehlender Pflicht-Qualifikation.
3. healthcare: MFA als dritte Qualifikation — inhaltlich plausibel, aber blockiert durch Testinvariante (`QualificationCatalog.Count.ShouldBe(2)` in `RegionSetupExampleProfileTests`). Müsste zusammen mit einer bewussten Testanpassung entschieden werden (nicht im Rahmen dieses Auftrags).
4. security: Waffensachkundeprüfung §7 WaffG — zu speziell für den generischen Default, evtl. als optionale zweite Preset-Variante für bewaffnete Dienste denkbar (außerhalb Scope).
5. facility: jährliche Sicherheits-/Gefahrstoffunterweisung — branchenübergreifende Frage, nicht facility-spezifisch, bräuchte Grundsatzentscheid für alle fünf Profile gemeinsam.

## Verifikation

```
python3 json.load de.json           → OK (healthcare: 1 Preset "DE Klinik Standard", 2 Qualifikationen; security maxDailyHours: 10)
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests"
  → Bestanden! : Fehler: 0, erfolgreich: 1, übersprungen: 0, gesamt: 1, Dauer: 737 ms - Klacks.UnitTest.dll (net10.0)
```

## Gesamturteil

Otto hat KEINE pauschale Zustimmung gegeben (kein Wiederholen des "Nonplusultra"-Flatter-Musters
aus früheren Runden), sondern eine klar begründete Detailkritik mit Rechtsgrundlagen geliefert,
inkl. einem konkreten Fehlerfund (security `maxDailyHours: 12` als unsicherer Default). Von den
Vorschlägen wurden 12 als plausibel und engine-kompatibel eingestuft und umgesetzt (Übersetzungen,
ein Stundenwert, zwei Konsistenz-Felder, eine neue Qualifikation bei logistics), 5 kritisch
zurückgewiesen bzw. als offen markiert, weil sie entweder die gestellte Frage nicht beantworten
(Pflegehelfer/in), zu speziell für einen generischen Default sind (Waffensachkunde), eine
Testinvariante verletzen würden (MFA bei healthcare) oder eine branchenübergreifende statt
branchenspezifische Anforderung sind (jährliche Sicherheitsunterweisung bei facility).

Nicht umgesetzt wurde nichts stillschweigend — alle abgelehnten/offenen Punkte sind oben mit
Ein-Zeilen-Begründung dokumentiert.

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/de.json` (Sektion `industryProfiles`)
**Nicht verändert:** `Klacks.UnitTest/Infrastructure/Settings/RegionSetupExampleProfileTests.cs`
