# Länderbezug: Scoping und Vorschlag

Ergänzt `marketing-review-2026-07-30.md`. Ausgangsfrage war „echte Ländertexte statt geteilter
Sprachfassungen" — geschätzter Umfang zunächst rund 3 750 Texte. Die Messung ergibt ein
anderes Bild.

## Kernbefund: die relevante Matrix ist zu 87 % gefüllt

Die Site serviert 30 Länder × 25 Sprachen. Die allermeisten dieser Kombinationen sind
inhaltlich gar nicht gemeint: `/ja/land-fr` (japanisch für Frankreich) oder `/th/land-no`
(thailändisch für Norwegen) haben kein reales Publikum.

Welche Kombinationen gemeint sind, steht bereits im Code — `Localization/LanguageCountries.cs`
bildet jede Sprache auf die Länder ab, in denen sie tatsächlich gesprochen wird:

```
de → land-de, land-at, land-ch        fr → land-fr, land-ch, land-be
en → land-gb, land-sa, land-ae, land-ie   it → land-it, land-ch
ar → land-sa, land-ae, land-il        nl → land-nl, land-be
sv → land-se, land-fi                 (18 weitere Sprachen → je 1 Land)
```

Das ergibt **37 Sprache-Land-Paare**. Bei 7 Seiten je Paar (Länderseite + 6 Branchen) ist der
Zielumfang **259 Content-Dateien** — nicht 3 750.

Davon existieren **225**. Es fehlen **34** — und zwar ausschliesslich Dateien eines einzigen
Typs:

| Seitentyp | fehlend |
| --- | --- |
| `land-XX-klacksy` | **34** |
| Länderseiten, Spitex, Spitäler, Security, Hausdienste, Logistik | 0 |

**Der Länderbezug ist also bereits gemacht** — für jede Sprache, für ihr eigenes Land, in
guter Tiefe. Stichproben aus den vorhandenen Dateien:

- `de/land-pl.json`: „Ewidencja czasu pracy", Datenschutzbehörde UODO, „Ustawa o dniach
  wolnych od pracy", Woiwodschaft Lebus, Grenzpendler nach Sachsen
- `de/land-ae.json`: reduzierte Ramadan-Sollzeit, Überstunden-Deckel, WPS-Lohnauszahlung,
  Feiertagsfestlegung durch das Kabinett der VAE

Das sind belegbare, länderspezifische Aussagen, keine Textbausteine.

## Die Lücke bei Klacksy ist eine andere als zunächst angenommen

**Korrektur (nachgemessen):** Die 34 fehlenden Dateien sind real, aber die deutsche „Vorlage"
trägt keinen Länderbezug. Gemessen über alle Seitentypen auf Deutsch:

| Seitentyp | Dateien | verschiedene Inhalte |
| --- | --- | --- |
| `land-XX.json` (Länderseiten) | 30 | **30** |
| `land-XX-spitex` / `-spitaeler` / `-security` / `-hausdienste` / `-logistik` | je 30 | je **30** |
| `land-XX-klacksy` | 30 | **1** |

Alle 30 deutschen `land-XX-klacksy.json` sind **byte-identisch** (gleiche MD5) und enthalten
keinen einzigen Ländernamen. Commit `c8f20ac` („give Klacksy a real, country-scoped page on all
30 lands") hat dieselbe Datei 30-mal abgelegt. Gegenüber der generischen `de/klacksy.json`
unterscheidet sie sich nur redaktionell („Standard-KI" → „generische KI", „Tonfall" →
„Tonalität") — nicht inhaltlich.

**Folge für die Übersetzung:** `/fr/land-fr/klacksy` zeigt heute `fr/klacksy.json` — korrektes
Französisch ohne Frankreich-Bezug. Eine Übersetzung der deutschen Vorlage ergäbe
`fr/land-fr-klacksy.json` mit inhaltlich demselben generischen Text. Der sichtbare Gewinn wäre
null; es entstünden 34 zusätzliche Dateien, die pro Sprache dasselbe sagen wie die bereits
vorhandene generische Fassung. Unter der oben vorgeschlagenen SEO-Regel („hat eigene
Content-Datei") kämen sie sogar als vermeintlich eigenständige Seiten in die Sitemap — das
Gegenteil des Ziels.

Die echte Lücke ist damit nicht Übersetzung, sondern **fehlender länderspezifischer
Klacksy-Inhalt, auch auf Deutsch**. Für diese Seite gibt es belegbares Material — die
KI-Regulierung ist einer der wenigen wirklich länderspezifischen Aspekte eines
KI-Assistenten (EU AI Act in der EU, PDPL in Saudi-Arabien, PIPL in China, UK GDPR nach dem
Brexit). Das ist aber Faktenrecherche und damit die volle Pipeline mit Faktenprüfer, nicht ein
Übersetzungsschritt.

Die drei Optionen stehen unten unter „Vorgehen".

## Was daraus für die SEO-Achse folgt

Die Sitemap sollte an der **Content-Existenz** hängen, nicht an der Sprache-Land-Matrix. Der
Unterschied ist wesentlich: Deutsch ist die Default-Kultur ohne URL-Präfix und hat als einzige
Sprache Inhalt für **alle 30 Länder** (30 Länderseiten + 180 Branchenseiten, gemessen). In
`LanguageCountries` steht für `de` aber nur `land-de, land-at, land-ch`. Würde man die Sitemap
an der Matrix aufhängen, flögen rund 190 Seiten mit einzigartigem, recherchiertem Inhalt heraus
— genau die wertvollsten.

Die richtige Regel ist deshalb „hat diese (Kultur, Seite) eine eigene Content-Datei":

| | heute | mit Regel „eigener Inhalt" |
| --- | --- | --- |
| URLs in `sitemap.xml` | 6 050 | ~385 + Install/Legal |
| Dateigrösse | 15,5 MB | ~1 MB |
| URLs ohne eigenen Inhalt | 4 865 | 0 |

Technisch trägt das Prädikat der Provider bereits: `LoadIndustryPage(culture, key) != null`
heisst genau das. Es müsste nur nach aussen sichtbar werden (etwa als `TryGetOwnIndustryPage`
neben `GetIndustryPage`), dann leiten Sitemap und Canonical sich daraus ab. Vorteil: Sobald
eine neue Content-Datei angelegt wird, kippt die Seite automatisch von „nicht angemeldet" auf
„eigenständig" — bei einer Erweiterung der Matrix muss der Mechanismus nicht angefasst werden.

Die Matrix bleibt trotzdem nützlich, aber für eine andere Frage: **was noch zu übersetzen ist.**

### Für die 685 Mischseiten ist Canonical das falsche Werkzeug

Bei Branchenseiten funktioniert Kanonisieren: `/pl/land-de/klacksy` → `/pl/land-pl/klacksy` ist
dieselbe Sprache und derselbe Text, also ein echtes Duplikat.

Bei den Länder-Hauptseiten nicht: `/pl/land-de` → `/pl/land-pl` würde behaupten, die
Polen-Seite sei das Original der Deutschland-Seite. Das ist inhaltlich falsch, und der
eigentliche Defekt — `lang="pl"` über deutschem Text — bliebe für Besucher bestehen.

Passender ist dort **`noindex`**: die Seite bleibt erreichbar, wird aber nicht als
Suchergebnis angeboten. `SeoHead.razor` gibt heute überhaupt kein `robots`-Meta aus (geprüft),
das wäre also neu — dafür ein kleinerer Eingriff als eine Canonical-Sonderlogik.

## Die Entscheidung, die ansteht

`LanguageCountries.cs` ist heute nach *Sprachgebiet* gebaut („wo wird diese Sprache
gesprochen"). Für den Vertrieb kann eine andere Frage richtiger sein („wen wollen wir in
welcher Sprache ansprechen"). Zwei Beispiele, die heute nicht abgedeckt sind:

- **Englisch als Geschäftssprache:** `en → land-de`, `land-nl`, `land-se` … Ein
  internationaler Betrieb mit Standort Deutschland sucht auf Englisch. Heute liegt dort
  deutscher Text unter `lang="en"`.
- **Migrationssprachen im Pflegemarkt:** `pl → land-de`, `ro → land-it`, `pt → land-ch` —
  Spitex und Spitäler beschäftigen in DACH viel polnisch-, rumänisch- und
  portugiesischsprachiges Personal.

Jedes zusätzliche Paar kostet 7 Dateien. Zehn zusätzliche Paare wären 70 Dateien — immer noch
überschaubar, aber es ist eine Vertriebsentscheidung, keine technische.

## Vorgehen

Für die Klacksy-Seiten stehen drei Optionen zur Wahl:

- **A — 34 Übersetzungen der generischen Fassung.** Schliesst die Datei-Lücke formal. Bringt
  sichtbar nichts, weil jede Sprache denselben Text bereits über `klacksy.json` ausliefert, und
  erzeugt 34 neue Duplikate. Nicht empfohlen.
- **B — die 30 deutschen `land-XX-klacksy.json` entfernen.** Der Fallback greift auf
  `de/klacksy.json`, der sichtbare Text bleibt praktisch gleich, die Struktur wird ehrlich: eine
  generische Klacksy-Seite, unter jedem Land erreichbar, aber nicht 30-mal als eigenständig
  ausgegeben. Billigste Option, beseitigt 30 Duplikate statt 34 zu schaffen. Vorher die
  redaktionell besseren Formulierungen der `land-*`-Fassung in `de/klacksy.json` übernehmen.
- **C — echten länderspezifischen Klacksy-Inhalt erstellen.** Der einzige Weg zu wirklich
  eigenständigen Seiten. Aufhänger wäre die KI- und Datenschutzregulierung je Land. Braucht die
  volle Pipeline inklusive Faktenprüfung (30 Länder auf Deutsch, danach 34 Übersetzungen) —
  eine Grössenordnung mehr Aufwand als A oder B.

Unabhängig davon:

1. **Sitemap und Canonical an die Content-Existenz koppeln** (Achse SEO), plus `noindex` für
   die 685 Mischseiten. Danach meldet die Site nur noch an, was sie wirklich hat.
2. **Matrix bewusst erweitern** — erst wenn entschieden ist, welche Sprache-Land-Paare
   vertrieblich gewollt sind.

Zu beachten: Option A würde unter der SEO-Regel aus Punkt 1 dazu führen, dass 34 generische
Seiten als eigenständig in die Sitemap wandern. A und Punkt 1 arbeiten also gegeneinander.

## Regeln für Schritt 1 (aus der bestehenden Pipeline)

Für Länder-Werbetexte existiert ein dokumentierter, erprobter Prozess — DevKnowledge
`331b2548-0367-4b4b-a7ef-efbbcb2a8d42`, „Länder-/Branchen-Werbetext-Pipeline (Otto + Opus)".
Für die 34 Klacksy-Seiten ist nur dessen **Übersetzungsschritt** nötig, nicht die Faktenkette:
die Landesfakten sind in der deutschen Vorlage bereits recherchiert und faktengeprüft. Alle 34
deutschen Vorlagen existieren (geprüft).

Verbindlich daraus:

- **Deutsch ist das Original**, Übersetzung ist ein rein nachgelagerter Schritt.
- Nur **Textfelder** übersetzen, dazu `pageTitle`, `screenshotAlt`, `screenshotLabel`.
  `hero.screenshotFile` bleibt `app-*-de.png`; `showRoutePlanning`, `icon`, `badgeIcon` und
  alle JSON-Keys bleiben unverändert.
- **HTML-Escaping:** nur `pageTitle` darf ein rohes `&` enthalten. Alle anderen Felder werden
  als `MarkupString` gerendert und brauchen `&amp;`, `&mdash;`, `&middot;`. Umlaute direkt als
  UTF-8.
- **Keine neuen Faktenbehauptungen.** Was in der deutschen Vorlage nicht steht, kommt auch in
  der Übersetzung nicht vor. Der Pipeline-Eintrag hält ausdrücklich fest, dass frei erzeugte
  Länderfakten wiederholt falsch waren (erfundene Paragraphen, Zuschlagssätze, noch nicht in
  Kraft getretene Gesetze).
- **Nachkontrolle pro Datei:** JSON-Validität, Key-Parität gegen die deutsche Quelle,
  Escaping-Sweep.

Die Pipeline hält zudem als User-Vorgabe fest: „Jedes Land seine eigene, aus den
landesspezifischen Fakten abgeleitete Klacks-USP — kein generischer Textbaustein mit
ausgetauschtem Ländernamen." Genau dagegen verstösst der heutige Zustand bei den
Klacksy-Seiten.
