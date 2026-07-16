# Otto-Kritik: K20 Nordics-Pack Schweden (se.json — worktime/compliance/industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/se.json`. Otto-Session: `k20-pack-se` (isoliert).

## Ottos Rohantwort

Ottos komplette Recherche-Toolchain war auch in dieser Runde vollständig ausgefallen (Gemini
Prepaid-Guthaben erschöpft, xAI-Websuche ungültiger Key, DevKnowledge-Fetch schlug ebenfalls fehl).
Otto hat — wie schon in der NO-Runde — **korrekt und ehrlich verweigert, unbelegte Aussagen zu
treffen**, und explizit zurückgemeldet, dass es ohne Quellenzugriff nichts Belastbares liefern kann.
Kein einziger Kritikpunkt, keine Fabrikation. Volltext im Session-Log (`~/claude-otto-bridge`, Session
`k20-pack-se`, run `967b5ce6-ab84-41ee-bc5c-19dd9724998f`).

Die komplette Fact-Check-Arbeit wurde deshalb — wie schon bei NO — unabhängig per WebSearch gegen
Primärquellen (Arbetsmiljöverket, Socialstyrelsen, Riksdagen, Länsstyrelsen, BYA) geleistet.

## Kritikpunkte, Gegenprüfung, Bewertung

| # | Markierter Punkt | Unabhängige Quelle | Bewertung | Status |
|---|---|---|---|---|
| 1 | `maxDailyHours=13` für alle 5 Branchen, verallgemeinert aus 24−11 dygnsvila (ATL §13) — zulässiger Branchen-Default? | **Arbetsmiljöverket/SKR**: ATL §13 schreibt "minst 11 timmars sammanhängande ledighet under varje period om 24 timmar" vor; Schweden kodifiziert **keinen** expliziten separaten Tagesobergrenzwert, nur Wochenarbeitszeit (40h) + Dygnsvila (11h Ruhe) + Veckovila. Die 13h ist somit eine **hergeleitete**, nicht eine **explizit kodifizierte** Grenze. | Die Herleitung (24−11=13) ist rechnerisch korrekt und mathematisch die einzig zwingende Obergrenze, die sich aus ATL §13 ergibt — vertretbar als sicherer Branchen-Default, analog zur bei DE/AT/CH etablierten "sicherer gesetzlicher Default"-Logik. Kein kodifizierter 13h-Grenzwert existiert im ATL-Text selbst — das ist eine Nuance, kein Fehler. | kein Änderungsbedarf — Herleitung bestätigt sachlich vertretbar, im Kritikprotokoll als "hergeleitet, nicht kodifiziert" dokumentiert |
| 2 | Nachtfenster 00:00–05:00 als K2-Zuschlagsfenster für alle Branchen — ATL §13 regelt dort eigentlich die Nachtruhe/das Nachtarbeitsverbot, nicht Zuschläge — Zweckentfremdung? | **Arbetsmiljöverket/Suntarbetsliv**: ATL §13n verbietet Arbeit 00:00–05:00 grundsätzlich (Ausnahme: Kollektivvertrag über Nachtarbeit); dieselbe Uhrzeit-Spanne muss zudem laut §13 "delvis" in die Dygnsvila fallen. Der Zeitraum ist also primär ein **Ruhe-/Verbots**-Fenster. | In `se.json` selbst ist **kein** `nightRate`-Feld gesetzt (anders als z. B. `fi.json`), d. h. `nightStart`/`nightEnd` werden hier ausschließlich als Schichtgrenzen-/Ruhezeit-Markierung verwendet, nicht als Lohnzuschlags-Trigger — die vom Auftrag befürchtete Zweckentfremdung (Ruheparagraph als Zuschlagsparagraph) **materialisiert sich im JSON nicht**, da kein Zuschlagsfeld an dieses Fenster gebunden ist. Die Uhrzeitspanne selbst (00–05) ist als Nachtperiode korrekt aus ATL §13 übernommen. | kein Änderungsbedarf — Sorge war berechtigt zu prüfen, trifft aber auf die aktuelle JSON-Struktur nicht zu |
| 3 | `periodCaps windowWeeks=17, maxAverageWeeklyHours=48` (rolling 48h/17 Wochen) korrekt? | **Riksdagen (Prop. 2003/04:180, EU-Arbeitszeitrichtlinie Art. 6)**: Standard-Berechnungsperiode ist **4 Monate** (≈17,3 Wochen), per Kollektivvertrag auf bis zu 12 Monate verlängerbar | 17 Wochen ist eine korrekte, konservative Rundung der gesetzlichen 4-Monats-Standardperiode (identische Logik wie bei DK, das ebenfalls 17 Wochen verwendet) | kein Änderungsbedarf — bestätigt korrekt |
| 4 | `vacationDaysPerYear=25` nach semesterlagen | **Riksdagen/Unionen/Ledarna**: Semesterlagen garantiert **25 Tage** gesetzlich, unabhängig von Alter/Anstellungsform (Kollektivverträge geben oft 30–35 Tage, das ist aber keine gesetzliche Mindestpflicht) | bestätigt exakt, sicherer gesetzlicher Default (gleiche Logik wie DK/NO) | kein Änderungsbedarf |
| 5a | "Undersköterska" als seit 2023 geschützter Titel — korrekt? | **Socialstyrelsen (HSLF-FS 2023:14)**: Undersköterska ist seit **1. Juli 2023** geschützter Titel, Nachweis über Socialstyrelsen/HOSP-Register erforderlich | bestätigt exakt (Datum und Sachverhalt) | kein Änderungsbedarf |
| 5b | "Väktare" mit BYA-Grundausbildung — korrekter Name/Ausbildungsträger? | **BYA.se**: "Väktargrundutbildning, del 1 (VU1)" ist der offizielle Name, 9 Tage/91 Lektionsstunden, davon 88 Stunden **von der Polismyndigheten vorgeschrieben**; danach 160h Praktische Yrkesträning (PYT), dann VU2 | Ausbildungsträger (BYA) korrekt, aber der bisherige JSON-Name "Bewachungsausweis (Väktare, Grundausbildung BYA)" vermischte Ausweis/Zulassung (Länsstyrelsen-Sache) mit reiner Ausbildung (BYA-Sache) — zwei unterschiedliche Rechtsvorgänge in einem Feld | **umgesetzt**: umbenannt zu "Väktargrundutbildung (BYA VU1, polizeilich vorgeschrieben)" (reine Ausbildung), siehe auch Punkt 6 |
| 5c | `locale.state="AB"` für Schweden (Stockholm) korrekt? | AB ist das etablierte ISO/NUTS-Kürzel für Stockholms län (Stockholm County) | bestätigt korrekt | kein Änderungsbedarf |
| 6 | Fehlende Pflicht-Qualifikation bei security (Zulassung durch Behörde)? | **Riksdagen, Lag (1974:191) om bevakningsföretag**: "All personnel must be approved by the County Administrative Board (Länsstyrelsen) before they can work at a security company" — eigenständiger, von der BYA-Ausbildung getrennter Rechtsakt | klar zutreffend, SEHR übliche eigenständige Pflicht-Qualifikation (analog zu DKs Vagtbevis und NOs Politiattest), bisher im Katalog nur implizit/vermischt mit der Ausbildung enthalten | **umgesetzt**: neue Qualifikation "Länsstyrelsens godkännande (personliche Zulassung, Lag om bevakningsföretag)" hinzugefügt, `isTimeLimited: true` |

## Offene Punkte

Keine — alle markierten Punkte wurden entweder bestätigt (kein Änderungsbedarf, teils mit klarstellender
Nuance dokumentiert) oder umgesetzt.

## Verifikation

```
python3 json.load se.json → OK
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests" → 20/20 grün nach diesem Edit
```

## Gesamturteil

Otto konnte wegen komplettem Tool-Ausfall (Gemini-Guthaben erschöpft, xAI-Key ungültig,
DevKnowledge nicht erreichbar) keine Kritik liefern — hat das aber diesmal, wie schon bei NO, korrekt
als "nicht verifizierbar" gekennzeichnet statt zu fabrizieren. Alle 6 markierten Punkte wurden
unabhängig per WebSearch gegen Primärquellen (Arbetsmiljöverket, Socialstyrelsen, Riksdagen,
Länsstyrelsen, BYA) geprüft. Ergebnis: **alle numerischen Werte (13h, 00-05, 17 Wochen, 25 Tage)
bestätigt korrekt bzw. sachlich vertretbar hergeleitet** — insbesondere die beiden explizit als
"zweifelhaft" markierten Punkte (13h-Verallgemeinerung, Nachtfenster-Zweckentfremdung) erwiesen sich
bei genauer Prüfung als unproblematisch (13h ist die einzig zwingende ATL-Herleitung; das
Nachtfenster wird in `se.json` nicht als Zuschlagstrigger verwendet). Eine echte Lücke wurde
gefunden und behoben: die Länsstyrelsen-Personenzulassung fehlte als eigenständige Pflicht-Qualifikation
und war mit der BYA-Ausbildung vermischt — beide wurden sauber getrennt.

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/se.json` (Sektion `industryProfiles.security.qualificationCatalog`)
