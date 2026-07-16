# Otto-Kritik: K20 Land×Branche-Content-Pack Italien (it.json industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/it.json`, Sektionen `worktime`,
`compliance`, `industryProfiles` (homecare, healthcare, security, facility, logistics).
Otto-Session: `k20-pack-it` (isoliert).

## Ottos Rohantwort

Erste Modellanfrage (`google/gemini-3.5-flash`) scheiterte nach 75s an einem 503-Fehler
("service currently unavailable"), Fallback auf `anthropic/claude-haiku-4-5` im selben Run
lieferte eine vollständige Antwort mit Web-Recherche (D.Lgs. 66/2003, CCNL Multiservizi/Pulizie,
CCNL Sanità). Kein pauschales Lob; ein interner Rechenfehler in Ottos eigener Antwort wurde bei
der Prüfung entdeckt (siehe Punkt 2). Volltext im Session-Log (`~/claude-otto-bridge`, Session
`k20-pack-it`, run `00261ec4-e690-400a-9444-7518de609340`).

## Kritikpunkte, Bewertung, Umsetzung

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 1 | `compliance.periodCaps` (48h/17 Wochen) — Art. 4 D.Lgs. 66/2003 korrekt zitiert, 48h-Wert bestätigt. Kritik: der Gesetzestext nennt normativ "**vier Monate**" als Referenzzeitraum, nicht "17 Wochen" — 17 Wochen ≈ 4,25 Monate sei nur eine Annäherung. Vorschlag: Feld zu `periodMonths: 4` umbenennen. | Otto nennt selbst keine präzisere korrekte Wochenzahl (nur "Approximation... innerhalb der Spanne"), 4 Monate ≈ 17,3 Wochen — 17 ist die naheliegendste ganzzahlige Rundung. `RegionSetupPeriodCap` kennt nur `WindowWeeks` (int), kein `PeriodMonths`-Feld (`JsonUnmappedMemberHandling.Disallow`) — die Engine arbeitet grundsätzlich in Wochen, nicht in Kalendermonaten. | **kein Änderungsbedarf am Wert** (48h/17 Wochen bereits die beste ganzzahlige Wochen-Näherung); **abgelehnt**: Feldumbenennung (Schema kennt nur Wochen-Fenster) |
| 2 | `worktime.vacationDaysPerYear: 20` global korrekt für 5-Tage-Woche (Art. 10 D.Lgs. 66/2003, 4 Wochen Minimum), ABER: `facility`-Branche laufe laut CCNL Multiservizi/Pulizie oft auf 6-Tage-Woche, dort gelte "26 Tage" statt 20. | Otto bestätigt hier zwar den Grundwert 20, seine Alternative "26 Tage bei 6-Tage-Woche" ist aber **rechnerisch inkonsistent**: 4 Wochen × 6 Werktage/Woche = 24, nicht 26 (vgl. Otto selbst zwei Absätze zuvor: "26 Arbeitstage bei 6-Tage-Woche" widerspricht der eigenen Formel). Da die konkrete Zahl einen internen Rechenfehler enthält, ist sie nicht vertrauenswürdig genug für eine Datenänderung — obwohl die zugrunde liegende Beobachtung (facility könnte auf 6-Tage-Basis laufen) an sich plausibel sein könnte. `RegionSetupSchedulingRulePreset.VacationDaysPerYear` existiert als Override-Feld und wäre technisch nutzbar, falls die korrekte Zahl geklärt wird. | **offen** — nicht umgesetzt; Ottos eigene Zahl (26) widerspricht seiner eigenen Rechnung (4×6=24), daher zu unsicher für eine Änderung |
| 3 | `facility.counterRules` (`workedDayInWeek`, threshold 6) — zähle nur, ob der 6. Arbeitstag stattfand, prüfe aber nicht die CCNL-Vereinbarungspflicht mit RSU noch den 25%-Lohnzuschlag. Vorschlag: Felder `requiresApproval`/`note` ergänzen sowie einen zweiten counterRule `consecutiveWorkDays` (threshold 12, Art. 7 D.Lgs. 66/2003) hinzufügen. | `RegionSetupCounterRule` hat nur `Event/Period/Threshold/HoursThreshold` (`Disallow`) — `requiresApproval`/`note` existieren nicht im Schema. `Event` ist zusätzlich auf genau drei Werte beschränkt (`nightShift`, `workedDayInWeek`, `shiftExceedingHours` — laut `RegionSetupService`-Validierung hart geprüft); `consecutiveWorkDays` ist kein gültiger Event-Typ. Der Lohnzuschlag ist ohnehin außerhalb des Scopes ("keine Löhne"). Der bestehende `threshold: 6`-Zähler selbst ist von Otto nicht als falsch, nur als "zu minimal" kritisiert. | **kein Änderungsbedarf am Wert** (threshold 6 bestätigt als korrektes Signal); **abgelehnt**: beide Struktur-Erweiterungen (Schema kennt weder die Zusatzfelder noch den zweiten Event-Typ) |
| 4 | `security`: "Guardia Particolare Giurata (GPG)" mit `isTimeLimited: true` — offizielle Bezeichnung bestätigt, Ernennungsdekret (decreto di nomina) hat 2 Jahre Gültigkeit, Erneuerung 60-90 Tage vor Ablauf bei der Präfektur. Vorschlag: `validityYears`/`renewalAdvanceNotice`-Felder ergänzen. | Name und `isTimeLimited` von Otto ausdrücklich als "KORREKT, Kein Fehler" bestätigt. Zusatzfelder existieren nicht in `RegionSetupQualificationCatalogEntry` (nur `Name`/`IsTimeLimited`). | kein Änderungsbedarf; **abgelehnt**: Zusatzfelder (Schema kennt nur Name + IsTimeLimited) |
| 5 | `homecare`/`healthcare`: OSS + Infermiere unvollständig — es fehle **OSSS** (Operatore Socio-Sanitario Specializzato), eine reale Zwischenstufe zwischen OSS und Infermiere mit ca. 500h Zusatzausbildung (Psychiatrie, Palliativcare u.a.), laut Otto in beiden Branchen üblich. | plausibel, spezifisch benannt, beschreibt eine tatsächlich existierende dritte Qualifikationsstufe (nicht redundant zu OSS oder Infermiere) | **umgesetzt**: neue Qualifikation "OSSS" zu `homecare` UND `healthcare` hinzugefügt |
| 6 | `healthcare.maxDailyHours: 12` — laut Otto als Einzelschicht "zulässig", aber "nicht routinemäßig", müsse von ≥11h Ruhe gefolgt sein (bereits durch `minPauseHours: 11` im selben Preset abgedeckt), und könne rechnerisch mit dem globalen `maxWeeklyHours: 48` kollidieren (5× 12h = 60h > 48h). Empfehlung: `maxConsecutiveDays` auf 5 statt 6 senken, `dailyHours`-counterRule mit `maxPerWeek: 2` ergänzen. | Der beschriebene "Konflikt" tritt nicht ein: `maxDailyHours` und `maxWeeklyHours` wirken als GLEICHZEITIGE, unabhängige Obergrenzen — ein Plan, der beide Grenzen einhält, kann kein 60h-Szenario erzeugen (die 48h-Wochengrenze verhindert das bereits, unabhängig vom Tageswert). Die "5 statt 6"-Empfehlung ist eine unzitierte Einschätzung ("Empfehlung", keine Rechtsnorm). `dailyHours` ist zudem kein gültiger `counterRule`-Event-Typ (nur `nightShift`/`workedDayInWeek`/`shiftExceedingHours`). | **kein Änderungsbedarf** — der beschriebene Konflikt besteht bei gleichzeitig wirkenden Ober­grenzen nicht; **abgelehnt**: `maxConsecutiveDays`-Absenkung (unzitierte Empfehlung) und `dailyHours`-counterRule (ungültiger Event-Typ) |

## Offene Punkte (nicht umgesetzt, brauchen ggf. separate Entscheidung)

1. `facility.vacationDaysPerYear`-Override für mögliche 6-Tage-Woche (CCNL Multiservizi) — Ottos
   konkrete Zahl (26) widerspricht seiner eigenen Rechnung (4 Wochen × 6 Tage = 24). Müsste mit
   einer verifizierten, rechnerisch konsistenten CCNL-Quelle neu geprüft werden, bevor
   `RegionSetupSchedulingRulePreset.VacationDaysPerYear` für `facility` gesetzt wird.
2. `compliance.periodCaps.windowWeeks: 17` — normativ eigentlich "vier Monate", Engine kennt aber
   nur Wochen-Fenster; 17 bleibt die beste ganzzahlige Näherung, keine Handlungsoption ohne
   Schema-Erweiterung.

## Verifikation

```
python3 -c "import json; json.load(open('it.json'))"  → OK
homecare.qualificationCatalog: OSS, OSSS, Infermiere, Erste-Hilfe-Ausbildung (4 Einträge)
healthcare.qualificationCatalog: Infermiere, OSS, OSSS, Erste-Hilfe-Ausbildung (4 Einträge)
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests"
  → Bestanden! : Fehler: 0, erfolgreich: 11, übersprungen: 0, gesamt: 11, Dauer: 347 ms
  (deckt alle 5 Länderdateien inkl. Parse- und Semantik-Validierung ab)
```

## Gesamturteil

Otto lieferte nach einem 503-Fehlschlag im selben Run eine brauchbare Antwort, deren wichtigster
Fund (OSSS als fehlende Zwischenqualifikation zwischen OSS und Infermiere) plausibel, spezifisch
und ohne erkennbaren Widerspruch war und übernommen wurde. Bemerkenswert: bei der Prüfung fiel ein
**interner Rechenfehler in Ottos eigener Antwort** auf (4 Wochen × 6 Tage sollte 24 ergeben, Otto
schrieb aber "26 Arbeitstage bei 6-Tage-Woche") — dieser Punkt wurde deshalb konsequent als offen
markiert statt übernommen, obwohl die zugrunde liegende Beobachtung (facility evtl. 6-Tage-Woche)
für sich genommen plausibel sein könnte. Mehrere von Ottos Strukturvorschlägen (Feldumbenennung
`periodMonths`, `requiresApproval`/`note` bei counterRules, ein vierter Event-Typ
`consecutiveWorkDays`/`dailyHours`, Zusatzfelder `validityYears`/`renewalAdvanceNotice` bei
Qualifikationen) wurden zurückgewiesen, weil die betroffenen DTOs
(`RegionSetupPeriodCap`, `RegionSetupCounterRule`, `RegionSetupQualificationCatalogEntry`) strikt
auf ihre vorhandenen Felder begrenzt sind (`JsonUnmappedMemberHandling.Disallow`) und `Event` hart
auf drei Werte validiert wird. Der vermeintliche `maxDailyHours`/`maxWeeklyHours`-Konflikt bei
healthcare erwies sich bei genauerer Prüfung als kein echtes Problem, da beide Obergrenzen
gleichzeitig und unabhängig voneinander wirken.

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/it.json` (neue Qualifikation OSSS in
homecare + healthcare)
**Nicht verändert:** DTOs unter `Application/DTOs/Setup/` (kein Schema-Feld ergänzt)
