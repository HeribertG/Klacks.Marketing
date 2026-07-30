# Klacks.Marketing — Bestandsaufnahme 2026-07-30

Die Zahlen unten sind gemessen: Code gelesen, die Fallback-Kette nachsimuliert, Seiten lokal
gerendert (`dotnet run`, HTTP 200) und die HTML-Ausgaben verglichen. Was ich **nicht** geprüft
habe, steht am Schluss — insbesondere habe ich keine Seite im Browser gesehen.

## 0. Ausgangslage: es liegt bereits ein Umbau im Working Tree

Uncommittet (Stand heute 11:27–13:43), umgesetzte Spec
`docs/superpowers/specs/2026-07-30-marketing-hero-redesign-design.md`:

- 4 neue Komponenten (`HeroProductMockup`, `FeatureTickerSection`, `StepsSection`, `StatsCounterSection`)
- 2 neue JS-Dateien (`hero-slideshow.js`, `stats-counter.js`)
- 25 neue `redesign.json` (eine pro Kultur)
- 7 geänderte Dateien (Provider, Modelle, Template, Layout, CSS)

**Technisch ist der Stand vollständig und fehlerfrei.** Verifiziert:

| Prüfung | Ergebnis |
| --- | --- |
| `dotnet build` | 0 Fehler, 0 Warnungen |
| Alle 4 Sektionen rendern (`/land-ch`) | ja — Slideshow, Ticker, Steps, Stats je im HTML nachgewiesen |
| CSS gebaut und synchron | ja — `site.css` 11:45 > `tailwind-input.css` 11:33, alle 4 Keyframes enthalten |
| 25 × `redesign.json` valide | ja, identischer Key-Satz, gleiche Item-Zahlen |
| Referenzierte Screenshots vorhanden | ja, alle 7 |
| RTL-Pfad `/ar/land-ae` | korrekt — `dir="rtl"`, `rtl.css`, 3 arabische Slides, Ticker-Duplikatspur |
| Erstes Slide serverseitig `is-active` | ja (No-JS/reduced-motion zeigt statisches Bild) |

„Fehlerfrei" heisst hier: es baut, rendert und degradiert sauber. Zur **gestalterischen
Wirkung** siehe Abschnitt 0b — die ist eine andere Frage, und die Antwort fällt weniger gut aus.

## 0b. Visueller Befund: das Mockup trägt den Hero nicht

Nachgereicht per Playwright-Screenshot (1440×900, nach 3,5 s) auf `/land-ch`, `/en/land-gb`,
`/ar/land-ae`. Das Ziel der Spec war „professioneller und beeindruckender". Das wird aus meiner
Sicht noch nicht erreicht:

1. **Das Mockup ist zu klein, um zu wirken.** Bei rund 470 px Breite ist das
   Dienstplan-Raster nicht mehr lesbar — es wird zu grau-gelblichem Rauschen. Ein
   Produkt-Screenshot, den man nicht entziffern kann, verkauft nichts. Das ist der Kern des
   Redesigns und zugleich seine grösste Schwäche. Der dichteste Screenshot (`app-schedule`)
   als erstes Slide verstärkt das noch.
2. **Die Badge-Karte ragt oben aus dem Rahmen** und wird am Viewport-Rand angeschnitten
   (in allen drei Sprachen). Das liest sich als Layout-Fehler, nicht als schwebendes Element.
3. **Nur eine der drei Badges ist sichtbar.** Die versetzten Keyframes lassen zu jedem
   Zeitpunkt höchstens eine erscheinen — der Eindruck „lebendige Oberfläche" entsteht dadurch
   nicht.
4. **Das Hero-Grid ist unbalanciert.** Die Textspalte ist deutlich höher als das Mockup,
   darunter bleibt eine grosse Leerfläche. Auf Englisch ist der Hero-Text 7 Zeilen lang
   (Deutsch: 5), dort kippt es noch stärker.
5. **Der Ticker klebt ohne Abstand am Hero** und hat keine Fade-Kante. Das rechts
   angeschnittene Wort wirkt wie ein Fehler statt wie eine Laufschrift.
6. **Deutsche Navigation bricht um:** „Klacksy KI" und „Regeln & Kalender" gehen auf zwei
   Zeilen und lassen die Kopfzeile gedrängt wirken. Auf Englisch passt dieselbe Leiste in eine
   Zeile.

Was gut funktioniert: Typografie und Farbführung des Heros, die RTL-Spiegelung auf
`/ar/land-ae` (Navigation rechts, Mockup links, Pfeile gespiegelt, arabische Screenshots),
und die Ticker-Sektion als Idee.

## 1. Der grösste Befund: 6 050 URLs, 559 Texte, 385 eigenständige Seiten

Die Site emittiert in `sitemap.xml` **6 050 URLs** — gemessen, nicht geschätzt:
**15,5 MB, 151 250 hreflang-Links** (innerhalb der Google-Limits von 50 000 URLs / 50 MB,
aber sehr gross).

Davon sind 5 250 Länder-/Branchen-URLs (210 PageKeys × 25 Kulturen). Ich habe die
Fallback-Kette des `JsonPageContentProvider` nachsimuliert und am gerenderten HTML
gegengeprüft:

| Kennzahl | Wert |
| --- | --- |
| speisende Content-Dateien | 559 |
| URLs mit eigenem Inhalt | **385** |
| URLs, die sich einen Text mit anderen teilen | 4 865 |
| grösste Gruppe | 30 URLs aus *einer* Datei |
| Gruppen mit ≥ 25 identischen URLs | 146 |

Am laufenden Server verifiziert (nicht abgeleitet):

```
/pl/land-de/klacksy  vs  /pl/land-fr/klacksy   →  100,00 % textidentisch (je 4 910 Zeichen)
/pl/land-de/klacksy  vs  /pl/land-jp/klacksy   →  100,00 % textidentisch
/pl/land-de/spitex   vs  /pl/land-cz/spitex    →  100,00 % textidentisch
```

Identisch sind nicht nur der Fliesstext, sondern auch `<title>` und `meta description`.

**Warum:** `IndustryPageTemplate.razor` rendert jeden sichtbaren Text aus der Content-Datei
und setzt **nirgends** den Ländernamen ein. Die einzigen Unterschiede zwischen
`/pl/land-de/klacksy` und `/pl/land-jp/klacksy` sind interne Links und der JSON-LD-Breadcrumb.

Wichtig zur Einordnung: Das ist zum grossen Teil **so gewollt**. Der Kommentar in
`JsonPageContentProvider` sagt es ausdrücklich — Sprache vor Land, weil polnischer
Spitex-Text ohne Deutschland-Bezug besser liest als deutscher Text. Die inhaltliche
Entscheidung ist vertretbar. Das Problem ist, was die Site Google darüber erzählt.

**Warum es trotzdem schadet:** `SeoHead.razor` setzt `canonical` immer auf die Seite selbst
(`CanonicalUrl => AbsoluteUrl(CultureRecord)`). Die Site meldet damit 4 865-mal „dies ist eine
eigenständige Seite" für byte-gleiche Dokumente, listet jede in der Sitemap und gibt jeder die
volle 25er-hreflang-Matrix. Das ist das Muster, das Google als Doorway Pages einstuft.

## 2. Sprachmischung auf den Länder-Hauptseiten (echter Bug)

**685 der 5 250 URLs (13 %) liefern deutschen Inhalt unter fremdem Sprachpräfix.** Betroffen
sind ausschliesslich die Länder-Hauptseiten: 30 Länder × 25 Kulturen = 750 URLs, von denen nur
65 eine eigene Übersetzung haben.

Verifiziert an `/pl/land-de`:

- `<html lang="pl">`
- Navigation, Footer, Buttons: polnisch (aus `pl/shared.json`)
- H1 und gesamter Fliesstext: **deutsch** — „Personaleinsatzplanung, bei der Sie die Kontrolle behalten."

Also keine saubere Fallback-Seite, sondern eine Mischseite mit falscher Sprachdeklaration.

**Ursache** (`JsonPageContentProvider.CountryLessKey`): Die Kette ist bewusst
Sprache-vor-Land — `land-de-spitex` fällt korrekt auf `pl/spitex.json`. Bei einer
Länder-Hauptseite gibt es aber nichts abzuschneiden: `CountryLessKey("land-de")` liefert
`null`, weil der Key kein Branchen-Suffix hat. Damit fällt Schritt 2 der Kette aus und es geht
direkt auf `de/land-de.json`. Die Branchenseiten haben den Schutz, die Hauptseiten nicht.

Anders als Befund 1 ist das nicht beabsichtigt — es ist eine Lücke in derselben Logik, die
sonst greift. Und es trifft ausgerechnet die Einstiegsseite jedes Landes.

## 3. Screenshots existieren nur auf Deutsch und Arabisch

`wwwroot/images/app-*.png` gibt es als `-de` und `-ar`. Die App ist laut `SupportedCultures`
in **de/en/fr/it** produktiv (`IsCore: true`).

Am HTML verifiziert:

| Seite | Slideshow zeigt |
| --- | --- |
| `/ar/land-ae` | 3 × arabische Screenshots ✓ |
| `/en/land-gb` | 4 × **deutsche** Screenshots |
| `/he/land-il` | 4 × **deutsche** Screenshots — bei `dir="rtl"` |

Zwei getrennte Punkte:

- **en/fr/it**: Core-Sprachen mit englischer H1 („Workforce scheduling where you stay in
  control") über deutschen App-Screenshots. Durch das neue, grössere Mockup fällt das stärker
  auf als beim alten statischen Hero.
- **he**: RTL-Layout mit LTR-Screenshots — die Seite ist gespiegelt, die Screenshots darin
  nicht. Für `ar` wurde das gelöst, für `he` nicht (es gibt keine hebräischen Screenshots).

## 4. Content-Abdeckung

| Kultur | Content-Dateien |
| --- | --- |
| de | 221 |
| en | 36 |
| fr / ar | 29 |
| it / nl / sv | 23 |
| die übrigen 18 | je 17 |

17 Dateien = 11 generische + eigenes Land + 5 Branchen. Ausser Deutsch hat keine Sprache
Inhalt zu einem *anderen* Land als ihrem eigenen.

## 5. Code-Struktur (nachrangig)

242 `.razor`-Dateien unter `Pages/`, zusammen nur 2 450 Zeilen — jede ist 8 Zeilen
Boilerplate, die an `IndustryPageTemplate` delegiert. Konsolidierbar auf eine parametrisierte
Route, aber der Nutzen ist gering und der Eingriff berührt `KnownPageRoutes`,
`SitemapGenerator` und den 404-Guard. Aufräumarbeit, kein Problem.

## Einschätzung

Die Site hat 6 050 URLs, hinter denen 559 Texte stehen. Die letzten Wochen haben mehr Seiten
gebracht, aber nicht mehr Inhalt — und die SEO-Signale (self-canonical, volle hreflang-Matrix,
Sitemap-Eintrag) behaupten für jede einzelne, sie sei eigenständig. Das ist aus meiner Sicht
der Punkt mit dem grössten Hebel, unabhängig davon, wie die Seite aussieht.

Priorisiert:

1. **Duplicate-Content-Signale korrigieren.** Ohne einen einzigen neuen Text: `canonical` der
   Kopien auf eine gewählte Kanon-Variante zeigen lassen und die Sitemap auf die URLs
   reduzieren, die eigenen Inhalt haben.

   Das naheliegende Ziel ist `/{kultur}/{DefaultCountryFor(kultur)}/{slug}` — für `pl/klacksy`
   also `/pl/land-pl/klacksy`. Genau dorthin leitet `LegacyProductRoutes` bereits um
   (verifiziert: `/pl/klacksy` → 301 → `/pl/land-pl/klacksy`), es ist also kein Canonical auf
   einen Redirect.

   **Aufwand nicht unterschätzen:** Der vorhandene `SameForEveryCountry`-Schalter in
   `SeoHead.razor` reicht dafür *nicht*. Er baut `{DefaultCountry}/{EffectiveRoutePath}` — bei
   einer Branchenseite ist `EffectiveRoutePath` schon `land-de/klacksy`, das Ergebnis wäre
   `land-pl/land-de/klacksy`. Er wurde für die Legal-Seiten gebaut, wo der Pfad nur
   `impressum` ist. Es braucht eine neue Verzweigung, die den *Slug* statt des vollen Pfads
   verwendet — überschaubar, aber kein Umlegen eines Flags.

2. **Länder-Hauptseiten-Fallback reparieren** (Befund 2, 13 % der URLs, kleiner Eingriff).
   Entweder einen Sprach-Master für Länderseiten einführen, oder unübersetzte Länderseiten pro
   Kultur gar nicht ausliefern und nicht listen.

3. **Screenshots für en/fr/it erzeugen** — Produktionsaufwand ausserhalb des Codes, aber der
   sichtbarste Qualitätsgewinn für die drei Core-Sprachen.

4. **Redesign committen** — technisch fertig und geprüft.

5. Optional: 242 Boilerplate-Dateien konsolidieren.

Punkt 1 und 2 sind Korrekturen an vorhandener Logik, keine Neuentwicklung.

## Was ich nicht geprüft habe

- **Alles unterhalb des Heros.** Die Screenshots in Abschnitt 0b sind Viewport-Aufnahmen
  (1440×900). Steps-, Stats- und die weiteren Sektionen habe ich im HTML nachgewiesen, aber
  nicht im Bild gesehen. Auch keine mobile Breite geprüft.
- **Inhaltliche Qualität der 24 Übersetzungen** — nur strukturelle Validität geprüft.
- **Performance / Lighthouse.** Der Hero lädt 4 Screenshots à 77–348 KB.
- **Ob die Site indexiert wird** — laut Projektstand ist sie nicht deployed, die
  SEO-Befunde sind damit heute latent und nicht akut.
