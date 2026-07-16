# Otto-Kritik: K20 Nordics-Pack Norwegen (no.json — worktime/surcharges/compliance/industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/no.json`. Otto-Session: `k20-pack-no` (isoliert).

## Ottos Rohantwort

Ottos komplette Recherche-Toolchain fiel in dieser Runde aus (Gemini-Rate-Limit/Prepaid-Guthaben
aufgebraucht, xAI-Websuche mit ungültigem API-Key). Otto hat das diesmal — anders als bei der
DK-Runde — **korrekt selbst erkannt und transparent als "nicht verifizierbar" gekennzeichnet**, statt
zu fabrizieren (explizite Bitte im Prompt, nach den DK-Fabrikationen keine unbelegten Aussagen mehr zu
treffen, hat gewirkt). Otto hat lediglich einen echten inhaltlichen Hinweis geliefert: den
Sonntags-Rotation-Modellmismatch (Punkt 2 unten). Volltext im Session-Log (`~/claude-otto-bridge`,
Session `k20-pack-no`, run `674523d3-ec82-4b6c-a99c-a39cb155dc99`).

Da Otto keine belastbare Kritik liefern konnte, wurden alle markierten Punkte **unabhängig per
WebSearch/WebFetch direkt gegen Lovdata (arbeidsmiljøloven), Spekter.no und offizielle
Ausbildungsanbieter geprüft.**

## Kritikpunkte, Gegenprüfung, Bewertung

| # | Markierter Punkt | Unabhängige Quelle | Bewertung | Status |
|---|---|---|---|---|
| 1 | healthcare "helkontinuerlig turnus": `maxWeeklyHours=33.6`, `holidayRate=1.3333`, `we1Rate=0.26`, `we2Rate=0.26` — Spekter Del A2? | **Spekter.no direkt** (spekter.no/lonn-og-tariff/.../2-1-lordags-og-sondagstillegg): "Arbeidstiden skal i gjennomsnitt ikke overstige 33,6 timer pr. uke for ansatte som arbeider helkontinuerlig skiftarbeid"; Helligdagstillegg 133 1/3 % (=1.3333); Lørdags-/søndagstillegg Grundsatz 26 % (=0.26) | **alle drei Werte exakt bestätigt**, direkt von spekter.no | kein Änderungsbedarf — bestätigt korrekt |
| 2 | Sonntags-Rotation `restDayRotations minFree=1/windowWeeks=3` — Lesart "Ruhe-Garantie" vs. "mindestens jeder 3. Sonntag DIENST" | **Lovdata AML §10-8** (Basis-Default): "arbeidsfri annenhver søn- og helgedag" (jeden 2. Sonntag frei) als gesetzlicher Standard, mit Kollektivvereinbarung abschwächbar auf "minst hver fjerde uke" Ruhe im 26-Wochen-Schnitt. **Separat**: der Tarif-Passus "arbeid minst hver tredje søndag" (Lovdata TARO Helse-/Omsorgstarif) ist eine **Dienstpflicht-Mindestfrequenz** (Qualifikationsschwelle für den 33,6h-Vollconti-Turnus), **keine Ruhe-Garantie** | **Modell-Mismatch bestätigt**: das aktuelle Feld `MinFree`/`WindowWeeks` im DTO kann nur eine Ruhe-Garantie (Mindest-Freizeit-Frequenz) abbilden. "Arbeid minst hver tredje søndag" ist eine Dienstpflicht-Untergrenze — das Gegenteilige Konzept, kann im bestehenden Schema NICHT korrekt ausgedrückt werden. Der aktuelle Wert `minFree=1/windowWeeks=3` ist weder eine korrekte Umsetzung des AML-Rest-Defaults (der wäre eher `minFree=1/windowWeeks=2`, oder mit Tarifvereinbarung ca. `1/4` im 26-Wochen-Schnitt) noch eine Umsetzung der Tarif-Dienstpflicht-Schwelle (die das Schema gar nicht abbilden kann) | **OFFEN — nicht geändert.** Beide denkbaren Korrekturen (auf AML-Default `1/2` ändern, oder Feld als nicht abbildbar entfernen) wären Grundsatzentscheidungen außerhalb des Scopes eines Fact-Check-Durchlaufs; siehe "Offene Punkte" |
| 3 | `overtime.tiers=[{afterHours:40, rate:0.4}]` nach AML §10-6 | **Lovdata AML §10-6**: "Supplement shall be at least 40 percent" für Überstunden | bestätigt exakt | kein Änderungsbedarf |
| 4 | `maxDailyHours=9` nach AML §10-4 | **Lovdata AML §10-4**: "ordinary working time must not exceed nine hours in 24 hours and 40 hours in seven days" | bestätigt exakt (auch `maxWeeklyHours=40` bestätigt) | kein Änderungsbedarf |
| 5 | `rosterPublication.minLeadDays=14` nach AML §10-3 | **Lovdata AML §10-3**: Arbeidsplan "skal drøftes med arbeidstakernes tillitsvalgte så tidlig som mulig og senest to uker før iverksettelsen" = 2 Wochen = 14 Tage | bestätigt exakt | kein Änderungsbedarf |
| 6 | `vacationDaysPerYear=25` | **Lovdata Ferieloven 1988**: "25 virkedager" gesetzlicher Standard (31 für ≥60-Jährige, Sonderfall) | bestätigt exakt (sicherer gesetzlicher Default, analog zur DK-Logik) | kein Änderungsbedarf |
| 7 | Qualifikationsnamen: Sykepleier, Helsefagarbeider, Vekterutdanning, YSK | Sykepleier/Helsefagarbeider sind Standard-Berufsbezeichnungen (2006er SOSU-analoge Reform); YSK (Yrkessjåførkompetanse) korrekt für EU-Richtlinie 2003/59/EG-Umsetzung; "Vekterutdanning" ist der gängige Kurzname, offizieller Titel laut Securitas/Kursagenten.no ist **"Nasjonal grunnutdanning for vektere"**, inkl. periodischer **"Regodkjenning"** (Re-Zertifizierung) | Sykepleier/Helsefagarbeider/YSK korrekt, keine Änderung; Vekterutdanning-Bezeichnung ungenau (Kurzname statt offizieller Titel), und `isTimeLimited` fehlte trotz dokumentierter Regodkjenning-Pflicht | **umgesetzt**: Name präzisiert auf "Nasjonal grunnutdanning for vektere (Vekterutdanning)", `isTimeLimited: true` ergänzt |
| 8 | Fehlende Pflicht-Qualifikation bei security (polizeiliche Zulassung)? | **Lovdata Vaktvirksomhetsforskriften §5**: Politiattest ist zwingend vor Anstellung/Praktikumsbeginn vorzulegen und zu bewerten ("Politiattest skal bare utstedes når det foreligger konkret tilbud om stilling...") | klar zutreffend, SEHR übliche eigenständige Pflicht-Qualifikation, bisher nicht im Katalog (analog zu DKs Vagtbevis) | **umgesetzt**: neue Qualifikation "Politiattest (vaktvirksomhetsforskriften §5, polizeiliches Führungszeugnis)" hinzugefügt, `isTimeLimited: true` |

## Offene Punkte

1. **restDayRotations Sonntags-Semantik (Punkt 2):** Das DTO-Feld `RegionSetupRestDayRotation`
   (`MinFree`/`WindowWeeks`) modelliert ausschließlich Ruhe-Garantien (Mindestanzahl freier Tage in
   einem Fenster). Die reale norwegische Regel ist zweigeteilt: (a) AML §10-8 gibt einen echten
   gesetzlichen Ruhe-Default vor ("arbeidsfri annenhver søn- og helgedag" = jeder 2. Sonntag frei,
   abschwächbar per Tarifvereinbarung auf ca. jede 4. Woche im 26-Wochen-Schnitt), und (b) der
   Tarif-Passus "arbeid minst hver tredje søndag" ist eine Dienstpflicht-Schwelle, die den Zugang zum
   33,6h-Vollconti-Turnus definiert — keine Ruhe-Garantie, kann im bestehenden Schema nicht korrekt
   abgebildet werden. Der aktuelle Wert (`minFree=1/windowWeeks=3`) trifft keine der beiden echten
   Regeln exakt. Braucht eine bewusste Produktentscheidung (z. B. auf den AML-Default `1/2` korrigieren
   als konservativste sichere Ruhe-Garantie, oder das Feld als "nicht abbildbar" dokumentieren) —
   außerhalb des Scopes dieses Fact-Check-Durchlaufs, da beide Optionen die bestehende Turnus-Semantik
   ändern würden.
2. **Spekter Del A2 vs. andere Tarife:** Die 33,6h/1.3333/0.26-Werte sind exakt von spekter.no
   bestätigt, aber der 33,6h-Wert selbst ist auch in anderen norwegischen Tarifen (z. B.
   KS-Hovedtariffavtale/Helse- und Omsorgsoverenskomsten) identisch geregelt — die Zuordnung
   ausschließlich zu "Spekter Del A2" ist damit nicht falsch, aber ggf. zu eng benannt. Keine
   Änderung, da der Zahlenwert für alle relevanten Tarife identisch ist.

## Verifikation

```
python3 json.load no.json → OK
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests" → 20/20 grün nach diesem Edit
```

## Gesamturteil

Otto konnte in dieser Runde wegen komplettem Tool-Ausfall keine substantielle Kritik liefern, hat das
aber diesmal ehrlich als Unsicherheit gekennzeichnet (Lerneffekt aus dem expliziten DK-Warnhinweis im
Prompt) statt zu fabrizieren. Die eigentliche Fact-Check-Arbeit wurde deshalb komplett unabhängig per
WebSearch/WebFetch gegen Primärquellen (Lovdata, Spekter.no, Sikkerhetsbranchen-Ausbildungsanbieter)
geleistet. Ergebnis: **5 von 6 numerischen Markierungen (Vollconti-Rates, Overtime, maxDailyHours,
minLeadDays, vacationDays) sind exakt korrekt** — keine einzige numerische Korrektur nötig, ein
seltenes, aber belegtes "alles stimmt"-Ergebnis. Zwei echte Lücken wurden gefunden und behoben
(Politiattest fehlte komplett, Vekterutdanning-Benennung/Befristung ungenau). Der einzige
substanzielle Kritikpunkt — der Sonntags-Rotation-Modellmismatch — wurde bestätigt, bleibt aber
bewusst OFFEN, da beide denkbaren Korrekturen eine Produktentscheidung außerhalb des
Fact-Check-Scopes erfordern.

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/no.json` (Sektion `industryProfiles.security.qualificationCatalog`)

---

## Nachtrag 2026-07-16: Gesetzliche Überstunden-Caps ergänzt (PeriodCapScope.OvertimeHours + customWeeks)

Mit der Fertigstellung des Engine-Features `PeriodCapScope.OvertimeHours` inkl. `period:
"customWeeks"` (trailing Fenster von N Wochen) wurde die bisher als "nicht abbildbar" dokumentierte
Lücke (k20-country-pack-authoring-lessons, "Perioden-/Jahres-Überstunden-Caps") für Norwegen
geschlossen. `compliance` in `no.json` hat neu ein `periodCaps`-Array mit drei Einträgen:

| Neuer Cap | Rechtsgrundlage |
|---|---|
| `{ "period": "customWeeks", "customPeriodWeeks": 1, "scope": "overtimeHours", "capHours": 10 }` | Arbeidsmiljøloven §10-6 (4) — Überstunden max **10 h pro 7 Tage** |
| `{ "period": "customWeeks", "customPeriodWeeks": 4, "scope": "overtimeHours", "capHours": 25 }` | Arbeidsmiljøloven §10-6 (4) — max **25 h pro 4 zusammenhängende Wochen** |
| `{ "period": "customWeeks", "customPeriodWeeks": 52, "scope": "overtimeHours", "capHours": 200 }` | Arbeidsmiljøloven §10-6 (4) — max **200 h pro 52 Wochen** |

Quelle (Primärquelle, Gesetzestext): https://lovdata.no/dokument/NL/lov/2005-06-17-62/KAPITTEL_11

Abgebildet ist bewusst die **Grundregel** des §10-6 (4). §10-6 (5) erlaubt per schriftlicher
Tarifvereinbarung erweiterte Grenzen (bis 20 h/7 Tage, 50 h/4 Wochen, 300 h/52 Wochen) — das ist eine
betriebs-/tarifindividuelle Erweiterung, kein gesetzlicher Default, und gehört damit nicht ins
Länder-Preset (Kunden mit Tarifvereinbarung passen die importierten Cap-Zeilen an; der Import ist
idempotent und überschreibt kundeneditierten Zeilen nie).

Verifikationsstatus: Zahlen unabhängig gegen die Primärquelle (Lovdata-Gesetzestext §10-6) verifiziert.
Ottos Web-Recherche ist wieder funktionsfähig (Gegencheck zu SE ATL §8 lieferte deckungsgleiche
Werte), Otto dient wieder als Zweitmeinung.

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/no.json` (Sektion `compliance.periodCaps`, neu angelegt)
