# Otto-Kritik: K20 Land×Branche-Content-Pack Schweiz (ch.json industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/ch.json`, Sektionen `worktime`,
`industryProfiles` (homecare, healthcare, security, facility, logistics). Otto-Session:
`k20-pack-ch` (isoliert).

## Ottos Rohantwort

Erster Versuch lief nach 220s ohne verwertbaren Text in einen Timeout (Grounding-Fetch zu
vertexaisearch.cloud.google.com hing). Zweiter Versuch (max. 2 laut Auftrag) lieferte eine
vollständige, gut mit Artikelnummern belegte Antwort (Art. 9, 10, 15, 15a, 17a, 17b, 17c, 20 ArG;
ArGV 2 Art. 7/9/12/15; Art. 329a OR; VSSU-GAV Art. 10-13). Volltext im Session-Log
(`~/claude-otto-bridge`, Session `k20-pack-ch`, zweiter Run).

## Kritikpunkte, Bewertung, Umsetzung

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 1 | `homecare.restDayRotations`: `windowWeeks: 4, minFree: 2` verletzt Art. 20 Abs. 1 ArG (mind. 1 freier Sonntag je 2 Wochen; ein 4-Wochen-Fenster erlaubt dem Planer, beide freien Sonntage in die zweite Hälfte zu schieben und die 2-Wochen-Frist im ersten Block zu brechen). Zusätzlich ArGV 2 Art. 12 Abs. 1: Spitex braucht ≥26 freie Sonntage/Jahr (keine Spitalausnahme nach Art. 15 ArGV 2). Otto stuft dies explizit als **ArG-Pflicht, nicht bloße GAV-Praxis** ein — beantwortet damit direkt die im Auftrag gestellte Frage. | zutreffend, präzise mit Artikelnummer belegt, `windowWeeks: 2, minFree: 1` ergibt rechnerisch 26 Sonntage/Jahr — konsistent mit beiden zitierten Normen | **umgesetzt**: `windowWeeks` 4 → 2, `minFree` 2 → 1 |
| 2 | `worktime.vacationDaysPerYear: 20` — korrekt als gesetzliches Minimum (Art. 329a Abs. 1 OR: 4 Wochen = 20 Arbeitstage bei 5-Tage-Woche). Otto merkt an: Jugendliche bis 20 haben Anspruch auf 25 Tage, viele GAVs im Gesundheitswesen/VSSU-GAV gewähren ab 50/55 Jahren 25-30 Tage. | bestätigt bestehenden Wert als korrekten gesetzlichen Mindest-Default; Alters-/GAV-Staffelungen sind Einzelfall-Overrides, kein einzelner globaler Wert kann das abbilden | kein Änderungsbedarf |
| 3 | `worktime.maxDailyHours: 10` / alle Branchen-Presets `maxDailyHours: 10` — bei Nachtarbeit gilt nach Art. 17a Abs. 1 ArG zwingend max. 9h (in einem 10h-Fenster), nicht 10h. Alle 5 CH-Branchenprofile haben `performsShiftWork: true` mit Nachtfenster 23:00-06:00. | inhaltlich plausibel für reine Nachtschichten, ABER: `RegionSetupSchedulingRulePreset` hat nur EIN `MaxDailyHours`-Feld für die gesamte Preset (Tag+Nacht gemeinsam), kein separates Nacht-Feld. Strukturell identisch zum bereits akzeptierten DE-Präzedenzfall bei `logistics` (Fahrpersonalrecht/ARV1 regelt Lenkzeiten separat, Klacks hat keine Tachograf-Engine → genereller ArG-Wert bleibt der korrekte Fallback). Denselben Massstab konsequent angewendet: eine granularere Nacht-Sonderregel, die das Schema nicht abbilden kann, wird als unmodelliert dokumentiert statt den generischen (Tages-)Wert künstlich auf den strengeren Nacht-Wert abzusenken — sonst würde legale Tagesarbeit fälschlich auf 9h begrenzt. Zusätzlich: kein Punkt aus der Liste der im Auftrag benannten bekannten Schwachstellen für CH. | **offen** — nicht umgesetzt; strukturell identische Klasse wie das unmodellierte ARV1/Tachograf-Problem bei logistics (DE-Präzedenzfall), `maxDailyHours` bleibt 10 in `worktime` und allen 5 Presets |
| 4 | `minPauseHours: 11` — Otto bezeichnet das Feld als "Terminologie-Fehler": Schweizer Recht nennt das "Pause" (Art. 15 ArG, kurze Unterbrechung) vs. "tägliche Ruhezeit" (Art. 15a ArG, der hier tatsächlich gemeinte 11h-Wert). Vorschlag: Feldname zu `minDailyRestHours` ändern. | Der Zahlenwert (11h) ist laut Otto selbst korrekt — reine Feldnamenskritik. `MinPauseHours` ist ein globales DTO-Feld (`RegionSetupSchedulingRulePreset`), identisch in DE/AT/FR/IT verwendet; eine Umbenennung ist keine länderspezifische Datenkorrektur, sondern eine Schema-/Namensänderung mit Auswirkung auf alle 5 Länderdateien und die C#-Klasse — außerhalb des Scopes dieses Land-Fact-Checks. | **offen** — außerhalb Scope (Schema-Design-Frage, nicht Daten-Korrektur einer einzelnen `ch.json`) |
| 5 | `security.periodCaps` (210h/Monat) — Otto bestätigt Herkunft aus VSSU-GAV Art. 12, weist aber darauf hin, dass es sich NICHT um ein gesetzliches Hard-Cap handelt, sondern um die vertragliche Mehrstunden-Schwelle (25% Lohnzuschlag ab Stunde 211). Fordert, die Engine dürfe hier keinen Hard-Blocker setzen, sondern müsse eine "Surcharging-Regel" triggern. | Zahl selbst (210) von Otto nicht bestritten. Die geforderte automatische Lohnzuschlags-Berechnung ist laut Auftrags-Engine-Grenzen ausdrücklich außerhalb des Scopes ("keine Löhne"); `compliance.enforcement.defaultMode` ist bereits `warn` (kein Hard-Blocker), erfüllt also bereits Ottos Kernanliegen (keine harte Blockade) mit dem vorhandenen Mechanismus. | kein Änderungsbedarf — Wert bestätigt, Lohnzuschlags-Feature ist Nicht-Ziel, Warn-Mode bereits aktiv |
| 6 | `security.counterRules` (`nightShift`, threshold 25, period year) — Otto leitet den Schwellenwert aus Art. 17b ArG her (vorübergehende vs. regelmäßige Nachtarbeit) und bestätigt, dass ab der 25. Nacht der Anspruch auf arbeitsmedizinische Untersuchung (Art. 17c ArG) ausgelöst wird — der Wert 25 bleibt trotz abweichender VSSU-GAV-Zuschlagsregelung die gesetzlich korrekte Jahresschwelle. | bestätigt bestehenden Wert | kein Änderungsbedarf |
| 7 | `security`: fehlende Qualifikation "VSSU-Basisausbildung (20 Stunden)" — laut Otto zwingend vor jedem Solo-Einsatz (VSSU-GAV Art. 10 & 11), da es in der Schweiz keine EFZ/EBA-Grundbildung für private Sicherheit gibt; Einstieg erfolgt ausschließlich über diese Basisausbildung. Direkt die im Auftrag benannte bekannte Schwachstelle ("VSSU-Grundausbildung"). | klar zutreffend, spezifisch benannt, deckt exakt die im Auftrag gestellte Frage ab | **umgesetzt**: neue Qualifikation "VSSU-Basisausbildung (20 Stunden)" hinzugefügt (nicht `isTimeLimited`, da Otto keine Verfallsfrist nennt) |
| 8 | `security`: höherwertige "Sicherheitsfachmann mit eidg. Fachausweis (BP)" als weitere Qualifikation vorgeschlagen. | Laut Ottos eigener Aussage die "höchste Stufe" (Berufsprüfung), kein Einstiegs-/Pflichtnachweis für die Mehrheit des Personals — analog zur bereits an anderer Stelle etablierten Ablehnung zu spezialisierter/optionaler Qualifikationen | **abgelehnt** — zu spezialisiert/nicht "SEHR üblich" für den generischen Default |
| 9 | `homecare`: fehlende Qualifikationen "Pflegehelfer/in SRK" (SRK-Zertifikat, laut Otto "absolutes Standard-Zertifikat für Hilfskräfte im Spitex-Bereich") und "Assistent/in Gesundheit und Soziales (AGS)" (2-jährige eidg. Grundbildung). | beide klar unterhalb der bereits vorhandenen HF-/FaGe-Einträge angesiedelt, decken eine tatsächliche Lücke bei Hilfskraft-Qualifikationen ab, beide mit unmissverständlicher Sprache als Standard bezeichnet | **umgesetzt**: beide Qualifikationen zu `homecare` hinzugefügt |
| 10 | `healthcare`: gleiche AGS-Lücke wie homecare; zusätzlich "dipl. Experte/-in Anästhesie-/Intensiv-/Notfallpflege NDS HF" für Spezialstationen. | AGS-Lücke gilt analog zu homecare. NDS HF ist eine hochspezialisierte Zusatzqualifikation nur für ICU/Anästhesie/Notfall-Teilbereiche, keine "SEHR übliche" Anforderung für den generischen Klinik-Standard | AGS **umgesetzt** zu `healthcare`; NDS HF **abgelehnt** — zu spezialisiert für einen generischen Default |
| 11 | `healthcare`: "Pflegefachperson FH / BSc" als zusätzlicher akademischer Ausbildungsweg neben HF vorgeschlagen. | Beschreibt denselben Rollen-Zielberuf (registrierte Pflegefachperson) über einen anderen Ausbildungsweg, keine funktional andere Rolle — der Katalog modelliert Rollen, nicht Ausbildungswege (Präzedenz: DE-Profil listet "Pflegefachkraft" nur einmal unabhängig vom Ausbildungsweg) | **abgelehnt** — redundant zur bereits vorhandenen HF-Qualifikation |
| 12 | `facility`: leerer Qualifikationskatalog — Otto empfiehlt "Fachmann/-frau für Gebäudereinigung EFZ" (3-jährige Lehre) und "Gebäudereiniger/-in EBA" (2-jährige Lehre) als etablierte Schweizer Berufsabschlüsse. `maxWeeklyHours: 42` bezeichnet Otto als "hervorragend recherchiert" (GAV Reinigungsbranche Deutschschweiz Art. 11/12). | plausibel, füllt eine echte Lücke — CH facility war das einzige Länderprofil mit leerem Qualifikationskatalog (Inkonsistenz zu DE/AT/FR/IT); Arbeitszeitwert von Otto explizit bestätigt | **umgesetzt**: beide Qualifikationen hinzugefügt; `maxWeeklyHours` unverändert (bestätigt) |
| 13 | `logistics`: leerer Qualifikationskatalog — Otto empfiehlt Führerausweis C/CE, CZV-Fähigkeitsausweis (5 Jahre, EU/CH-Chauffeurzulassung), ADR-Bewilligung (5 Jahre), Staplerausweis SUVA-anerkannt (unbefristet). Zusätzlich generische "Logistiker/-in EFZ/EBA" und "Strassentransportfachmann/-frau EFZ" als Berufsabschlüsse. | Die vier fahrspezifischen Dokumente sind konkrete, in DE/AT/FR bereits etablierte Analogien (Code-95-Pendant) und füllen eine echte Lücke. Die generischen Berufslehren (Logistiker/-in, Strassentransportfachmann/-frau) sind in keinem anderen Länderprofil als Katalogeintrag vorhanden (DE/AT/FR/IT logistics fokussieren ausschließlich auf fahr-/handling-spezifische Nachweise, nicht auf die Grundberufslehre) — Konsistenzbruch zum etablierten Muster. | **umgesetzt**: C/CE, CZV, ADR, Staplerausweis hinzugefügt; **abgelehnt**: Logistiker/-in EFZ/EBA und Strassentransportfachmann/-frau EFZ (Konsistenzbruch mit dem branchenübergreifend etablierten Katalog-Muster) |

## Offene Punkte (nicht umgesetzt, brauchen ggf. separate Entscheidung)

1. `maxDailyHours` bei Nachtarbeit (Art. 17a ArG, 9h statt 10h) — strukturell unmodellierte
   Granularität, exakt dieselbe Klasse Problem wie das bereits akzeptierte ARV1/Tachograf-Thema bei
   `logistics`. Würde ein separates "Nacht-Höchststunden"-Feld im DTO erfordern (Grundsatzentscheid,
   nicht Teil dieses Fact-Checks).
2. `minPauseHours`-Feldname ("Pause" vs. "tägliche Ruhezeit") — Schema-weite Namensfrage, betrifft
   alle 5 Länderdateien und die C#-Klasse `RegionSetupSchedulingRulePreset`, kein
   Einzelland-Datenfix.
3. Alters-/GAV-gestaffelte Ferientage (25 Tage <20-Jährige, 25-30 Tage ab 50/55) — kein einzelner
   globaler Wert kann das abbilden; Einzelfall-Overrides sind Sache des Betriebs, nicht des
   Länderprofils.

## Verifikation

```
python3 -c "import json; json.load(open('ch.json'))"  → OK
homecare.restDayRotations: [{"dayOfWeek": "sunday", "minFree": 1, "windowWeeks": 2}]
Qualifikationszahlen: homecare 5, healthcare 3, security 2, facility 2, logistics 4
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests"
  → Bestanden! : Fehler: 0, erfolgreich: 11, übersprungen: 0, gesamt: 11, Dauer: 303 ms
  (deckt alle 5 Länderdateien inkl. Parse- und Semantik-Validierung ab, nicht nur ch.json)
```

## Gesamturteil

Otto lieferte nach einem ersten Timeout-Fehlschlag im zweiten Versuch eine dichte, größtenteils
präzise mit Artikelnummern belegte Kritik. Der wichtigste Fund bestätigt exakt die im Auftrag
benannte Schwachstelle: `restDayRotations` mit `windowWeeks: 4, minFree: 2` verletzt tatsächlich
Art. 20 Abs. 1 ArG und wurde korrigiert. Zwei echte Katalog-Lücken (leere `facility`- und
`logistics`-Qualifikationslisten, fehlende VSSU-Basisausbildung bei `security`, fehlende
Hilfskraft-Qualifikationen bei `homecare`/`healthcare`) wurden mit spezifischen, unstrittig
belegten Einträgen gefüllt. Der `maxDailyHours`-Punkt (Art. 17a ArG, Nachtarbeit) ist inhaltlich
wahrscheinlich richtig, wurde aber bewusst NICHT umgesetzt, weil das DTO-Schema keine
Tag/Nacht-Trennung kennt und eine pauschale Absenkung auf 9h legale Tagesarbeit fälschlich
einschränken würde — dieselbe Argumentationsklasse, die für das unmodellierte
ARV1/Tachograf-Problem bei `logistics` bereits etabliert wurde. Die Feldnamenskritik zu
`minPauseHours` ist eine Schema-Design-Frage jenseits einer einzelnen Länderdatei und wurde
entsprechend nicht umgesetzt. Von 13 bewerteten Punkten: 7 umgesetzt, 3 bestätigt ohne
Änderungsbedarf, 3 als offen dokumentiert (strukturelle Schema-Grenzen bzw. Scope), 3 abgelehnt
(zu spezialisiert bzw. Konsistenzbruch mit dem etablierten Katalog-Muster anderer Länder).

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/ch.json`
**Nicht verändert:** DTOs unter `Application/DTOs/Setup/` (kein Schema-Feld ergänzt/umbenannt)
