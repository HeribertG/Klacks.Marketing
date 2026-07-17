# Otto-Kritik: Scenario/What-if-USP „Planänderungen risikofrei testen" (2026-07-17)

Session: `OTTO_SESSION=scenario-usp-critique` via `~/claude-otto-bridge/ask.sh`.
Gegenstand: der neue `solutions.items`-Eintrag (Icon `science`) in allen 30
Länder-Drafts unter `docs/content-drafts/<xx>/general.json` — strukturgleicher
Text, nur der landesspezifische Arbeitszeit-/Ruhezeit-Rechtsbegriff variiert.

Verbindliche Fakten, gegen die jede Otto-Aussage geprüft wurde (aus dem
Auftrag, code-verifiziert): isolierte Plan-Kopie; Zuschläge/Spesen und
Compliance-Prüfungen laufen live identisch zum echten Plan; Original bleibt
bis zur Übernahme unangetastet; keine künstliche Obergrenze der
Szenario-Anzahl; KEINE Seite-an-Seite-Vergleichs-UI mehrerer Varianten.

5 Batches à 6 Länder, Rohtexte und Ottos vollständige Antworten liegen unter
`/tmp/claude-1000/.../scratchpad/otto-batches/batch{1..5}.txt` und
`reply{1..5}.txt` (nicht Teil des Repos, hier zusammengefasst und bewertet).

## Batch 1: ae, at, be, ch, cn, cz

Otto: Rechtsbegriffe für alle 6 Länder korrekt platziert (ae 144h-Deckel, at
AZG/ARG, ch ArG-11h, cn Art. 41, cz generisch "Ruhezeiten"). Einziger
inhaltlicher Einwand: bei **be** vermische "Paritair Comité" Niederländisch
in den deutschen Satz, besser "Paritätischer Ausschuss". Stilkritik bei allen
6: "dreifache Wiederholung" des Wortstamms „Szenario".

**Bewertung:** be-Einwand **abgelehnt** — `land-be.json` (production, gavel-
Item „Paritair Comité individuell abgebildet") verwendet „Paritair Comité"
und „PC 330/317/121/140.03" bereits durchgängig unübersetzt; eine Verdeutschung
im science-Item würde Inkonsistenz mit der etablierten Landesterminologie
schaffen. Kein Fund bei ae/at/ch/cn. cz-Punkt (generischer Rechtsbegriff) real,
siehe Gesamt-Fazit unten.

## Batch 2: de, dk, es, fi, fr, gb

Otto bestätigt de (11h-Ruhezeit), dk (11h-Ruhezeit), es (Art. 34.3 ET), fi
(§§ 25/27) als „präzise". Bei **fr** und **gb** bewertet Otto die generische
Formulierung „die gesetzlichen Ruhezeiten" explizit als „sicher und
verständlich" bzw. „vollkommen passend" — Otto sieht hier **keinen**
Verbesserungsbedarf.

**Bewertung:** Otto irrt bei fr/gb — beide Länder haben in ihrer eigenen
Produktionsseite (`land-fr.json` Item „Zuschlagsstaffeln berechnet,
Ruhezeiten überwacht": „tägliche 11-Stunden- ... Ruhezeit (Art. L3131-1 &
L3132-2)"; `land-gb.json` Item „Ruhezeiten automatisch eingehalten": „11-
Stunden-Tagesruhe ... nach WTR Reg. 10 & 11") bereits einen präzisen,
etablierten Rechtsbegriff — den das science-Item bisher NICHT nutzte. Das ist
ein eigener Fund (nicht von Otto), siehe Gesamt-Fazit.

## Batch 3: gr, id, ie, il, it, jp

Otto bestätigt it (11h-Ruhezeit / D.Lgs. 66/2003), jp (36協定, korrekt als
authentische Lokalisierung mit Kanji gelobt), il (Sabbat-/Wochenruhe als
„kulturell/rechtlich hochpräzise"). Bei **ie** hält Otto „die gesetzlichen
Ruhezeiten" für „optimal passend" — wie bei fr/gb übersieht Otto die bereits
vorhandene spezifische Referenz.

**Bewertung:** ie-Fund (eigene Recherche): `land-ie.json` Item „Ruhezeiten in
Echtzeit überwacht" nennt „tägliche Ruhezeit von mindestens 11
zusammenhängenden Stunden (Section 11)" — sollte ins science-Item übernommen
werden. gr/id: kein etablierter spezifischer Rechtsbegriff in den jeweiligen
Produktionsseiten vorhanden (verifiziert per Grep über die volle
`land-gr.json`/`land-id.json`) — Ottos Behauptung, Griechenlands Tagesruhe
betrage „standardmäßig 11 Stunden", ist möglicherweise sachlich richtig,
aber **nicht durch unsere eigenen Landestexte belegt** — nicht übernommen,
um keinen unbelegten neuen Rechtsbegriff einzuführen.

## Batch 4: kr, my, nl, no, pl, pt

Wichtigster Batch: Otto findet hier echte Grammatikfehler.
- **kr:** „der 52-Stunden-Cap" — Otto hält „der" für falsch, empfiehlt
  sächlich „das Cap".
- **nl:** „Rusttijden und Zuschläge werden…" — Artikel vor „Rusttijden" fehlt.
- **no:** „gesetzliche Ruhezeiten und Zuschläge werden…" — Artikel fehlt
  („die gesetzlichen Ruhezeiten").
- **pl:** „Ruhezeiten und Zuschläge werden…" — Artikel fehlt.
- **pt:** „Ruhezeiten und Zuschläge werden…" — Artikel fehlt.

**Bewertung — kr abgelehnt, nl/no/pl/pt übernommen:**
Für kr habe ich `land-kr.json` (production) direkt geprüft: dort steht
bereits „…wie Klacks **den** 52-Stunden-Cap überwacht" (Akkusativ maskulin)
— „der 52-Stunden-Cap" ist also die bereits etablierte, konsistente
Genus-Wahl auf der ganzen kr-Seite. Otto's Vorschlag „das Cap" würde
Inkonsistenz erzeugen und wurde **abgelehnt**.
Für nl/no/pl/pt habe ich den fehlenden Artikel per direktem Textvergleich
(Python-Extraktion der Klausel zwischen „durchspielen —" und „werden
dabei") gegen alle 30 Länder bestätigt: nur diese 4 Texte (plus cz, das
Otto in Batch 1 nicht als Grammatikfehler, sondern nur als „generisch"
einstufte) begannen ohne Artikel. **Übernommen** — Artikel ergänzt. Bei
pl/pt zusätzlich eigener Fund: `land-pl.json`/`land-pt.json` haben bereits
präzise Zitate („11-stündige … Ruhezeit (Art. 132 Kodeks pracy)" bzw.
„(Art. 214 CT)"), die ich zusätzlich zum Artikel-Fix eingearbeitet habe
(ging über Ottos Fund hinaus).

## Batch 5: ro, sa, se, th, tw, vn

Otto bestätigt alle 6 Rechtsbegriffe als präzise (ro Art. 137/48h, sa Art.
101, se ATL § 13, th Section 27, tw § 34 LSA, vn Art. 110) — deckt sich mit
eigener Verifikation gegen die jeweiligen Produktionsseiten. Keine
Textänderung nötig.

## Otto-Fehlerbilanz für dieses Feature

| # | Ottos Behauptung | Befund | Urteil |
|---|---|---|---|
| — | „Dreifache Wiederholung" des Wortstamms „Szenario" — in **allen 30** Antworten wiederholt | **Falsch.** Direkte Zählung (`text.count('Szenario')` + `count('Szenarien')`) über alle 30 Drafts ergibt exakt **2** Vorkommen (1× „Szenario", 1× „Szenarien"), nie 3. Otto hat sich in jeder einzelnen der 30 Einzelbewertungen verzählt. | **Abgelehnt** — kein Fund, keine Textänderung |
| be | „Paritair Comité" sollte übersetzt werden | Widerspricht der bereits etablierten, unübersetzten Verwendung in `land-be.json` | **Abgelehnt** |
| kr | „der 52-Stunden-Cap" grammatikalisch falsch, sollte „das Cap" heißen | Widerspricht der bereits etablierten maskulinen Verwendung („den 52-Stunden-Cap") in `land-kr.json` | **Abgelehnt** |
| fr, gb, ie | Generische Formulierung „die gesetzlichen Ruhezeiten" sei „optimal"/„sicher" | Alle drei Länder haben bereits präzise Rechtszitate in ihrer eigenen Produktionsseite, die Otto nicht erkannt/genutzt hat | Otto-Einschätzung **verworfen**, eigener Fund stattdessen übernommen (Zitate ergänzt) |
| nl, no, pl, pt | Fehlender Artikel vor dem Rechtsbegriff | Verifiziert durch direkten Klauselvergleich über alle 30 Länder — korrekt | **Übernommen** |
| gr | Griechische Tagesruhe „standardmäßig 11 Stunden" | Plausibel, aber nicht durch eigene Landestexte belegt (keine Fundstelle in `land-gr.json`) | **Nicht übernommen** — kein neuer, unbelegter Rechtsbegriff eingeführt |
| ro–vn (Batch 5), de/dk/es/fi (Batch 2), ae/at/ch/cn (Batch 1), gr/id/il/it/jp (Batch 3) | Rechtsbegriffe korrekt | Deckt sich mit eigener Verifikation gegen `land-<xx>.json` | Keine Aktion nötig |

**Fazit:** Otto ist in diesem Durchgang bei jeder Einzelantwort (30/30) einer
falschen Zählung („dreifach" statt zweifach) aufgesessen, und hat bei 3 von 8
inhaltlich relevanten Ländern (be, kr, und implizit fr/gb/ie durch
Nicht-Erkennen) entweder eine falsche Korrektur vorgeschlagen oder eine
vorhandene Verbesserungsmöglichkeit übersehen. Die einzig verlässlich
korrekten, direkt übernommenen Otto-Funde sind die 4 echten Artikel-Fehler
(nl, no, pl, pt) — für cz wurde derselbe Fehlertyp eigenständig nachgezogen,
da Otto ihn in Batch 1 nicht als Grammatikfehler benannt hatte.

## Nachtrag: eigener Fund nach Otto-Runde (ro)

Bei der Vorbereitung der Sprachpaket-Übersetzungen (Schritt 3) fiel ein
zusätzlicher, von Otto nicht erwähnter Fall auf: `land-ro.json` (production)
zitiert für die 48-Stunden-Wochenruhe bereits „(Art. 137)" (Item „Repaus de
48 de ore & sporul ICCJ sub control": „…gilt in der Regel Samstag/Sonntag
(Art. 137)"). Der ursprüngliche breitere Suchpattern (`Art\. 3[0-9]`) hatte
dreistellige Artikelnummern übersehen; ein Nachlauf mit `Art\.\s?\d+` über
alle 30 `land-<xx>.json` bestätigte, dass dies der einzige übersehene Fall
war (alle anderen 29 Länder konsistent). **Übernommen** — RO-Klausel auf
„die 48-Stunden-Ruhezeit (Art. 137) und Zuschläge" ergänzt, in Draft und
production de-master gleichermaßen.

## Nachtrag 2: eigener Fund beim Vorbereiten der Übersetzungen (gr)

Beim Terminologie-Abgleich für die Griechisch-Übersetzung fiel auf, dass
`Localization/Content/el/land-gr.json` (production, Abschnitt „example")
bereits den etablierten Begriff „11ωρη ημερήσια ανάπαυση" (11-Stunden-
Tagesruhe) enthält — unabhängig vom deutschen Master, der an dieser Stelle
einen komplett anderen Beispieltext hat (`de/land-gr.json` „example" behandelt
den 6. Arbeitstag, nicht die Tagesruhe). Das griechische Sprachpaket
etabliert also einen Fakt, den der deutsche Master nicht zeigt. Gemäß Auftrag
(„Rechtsbegriffe exakt so verwenden, wie sie in der jeweiligen Zieldatei
bereits vorkommen") wurde dieser Fund genutzt, um sowohl den deutschen
Draft/Master als auch die künftige griechische Übersetzung zu präzisieren:
„die gesetzliche Tagesruhe" &rarr; „die 11-Stunden-Tagesruhe" (kein
Artikel-Zitat verfügbar, nur die Stundenzahl ist belegt).

Dieser Fund zeigt gleichzeitig ein strukturelles Risiko: nicht jede
Sprachversion ist eine reine Übersetzung des deutschen Masters — `en/
land-il.json` (bereits vom Hauptagent separat behandelt) und teilweise
`el/land-gr.json` (nur der „example"-Abschnitt, nicht `solutions`) enthalten
eigenständig redigierte Inhalte. Für den `solutions`-Block selbst (wo das
science-Item eingefügt wird) stimmen bei allen 30 Ländern in allen
Sprachversionen die Icon-Reihenfolgen mit dem deutschen Master überein — nur
`en/land-il.json` ist dort eine echte Ausnahme (geprüft, siehe Abschlussbericht).

## Angewendete Textänderungen (10 von 30 Ländern)

| Land | Vorher (Klausel) | Nachher | Quelle des Funds |
|---|---|---|---|
| cz | „— Ruhezeiten und Zuschläge werden…" | „— die Ruhezeiten und Zuschläge werden…" | Eigene Verifikation (Artikel-Fehler, gleicher Typ wie Otto bei nl/no/pl/pt fand) |
| nl | „— Rusttijden und Zuschläge werden…" | „— die Rusttijden (ATW Art. 5:3) und Zuschläge werden…" | Otto (Artikel) + eigener Fund (Zitat aus `land-nl.json`) |
| no | „— gesetzliche Ruhezeiten und Zuschläge werden…" | „— die gesetzlichen Ruhezeiten und Zuschläge werden…" | Otto |
| pl | „— Ruhezeiten und Zuschläge werden…" | „— die 11-stündige Ruhezeit (Art. 132 Kodeks pracy) und Zuschläge werden…" | Otto (Artikel) + eigener Fund (Zitat aus `land-pl.json`) |
| pt | „— Ruhezeiten und Zuschläge werden…" | „— die 11-stündige Ruhezeit (Art. 214 CT) und Zuschläge werden…" | Otto (Artikel) + eigener Fund (Zitat aus `land-pt.json`) |
| fr | „— die gesetzlichen Ruhezeiten und Zuschläge werden…" | „— die 11-Stunden-Ruhezeit (Art. L3131-1) und Zuschläge werden…" | Eigener Fund (Otto sah keinen Bedarf) |
| gb | „— die gesetzlichen Ruhezeiten und Zuschläge werden…" | „— die 11-Stunden-Ruhezeit nach WTR Reg. 10 und Zuschläge werden…" | Eigener Fund (Otto sah keinen Bedarf) |
| ie | „— die gesetzlichen Ruhezeiten und Zuschläge werden…" | „— die 11-Stunden-Ruhezeit (Section 11) und Zuschläge werden…" | Eigener Fund (Otto sah keinen Bedarf) |
| ro | „— die 48-Stunden-Ruhezeit und Zuschläge werden…" | „— die 48-Stunden-Ruhezeit (Art. 137) und Zuschläge werden…" | Eigener Fund, nach der Otto-Runde entdeckt (siehe Nachtrag 1) |
| gr | „— die gesetzliche Tagesruhe und Zuschläge werden…" | „— die 11-Stunden-Tagesruhe und Zuschläge werden…" | Eigener Fund aus `el/land-gr.json` (siehe Nachtrag 2) |

20 Länder unverändert gelassen (ae, at, be, ch, cn, de, dk, es, fi, id, il,
it, jp, kr, my, sa, se, th, tw, vn) — Rechtsbegriff bereits korrekt und mit
den jeweiligen Produktionsseiten konsistent, keine echte Otto- oder
Eigen-Beanstandung.
