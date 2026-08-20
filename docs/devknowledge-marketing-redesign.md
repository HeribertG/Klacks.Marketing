# Klacks.Marketing — Hero-Produkt-Mockup und Redesign-Sektionen (Ticker, Steps, Stats)

Umsetzung der Spec `docs/superpowers/specs/2026-07-30-marketing-hero-redesign-design.md` (2026-07-30): Der statische Hero aller Länder-/Branchenseiten (`Shared/IndustryPageTemplate.razor`) wurde um ein animiertes Produkt-Mockup ergänzt; drei neue Sektionen (Feature-Ticker, 3-Schritte, Kennzahlen-Counter) sind in die Seiten integriert.

## Neue Komponenten (Klacks.Marketing/Shared/)

- `HeroProductMockup.razor` — Produkt-Screenshot-Frame mit Crossfade-Slideshow der `wwwroot/images/app-*-de.png`-Screenshots (ar: `app-*-ar.png`) und klickbaren Progress-Dots. Erstes Bild ist serverseitig `is-active` → No-JS/reduced-motion = statisches Bild; Dots blendet erst JS per `.hero-slideshow-js` ein. Seit 2026-08-20 hat der Frame dieselben Interaktionen wie die anderen Screenshots: Hover-Expand (`screenshot-hover-zoom`) und Cursor-Lupe (`magnify-frame`/`magnify-image`; `magnifier.js` folgt dabei dem `.is-active`-Slide und rechnet dessen exakte Abbildung nach — `object-fit: cover`-Crop via `object-position`, live Ken-Burns-Faktor aus der Computed-Transform-Matrix, Border-Offset via `clientLeft/clientTop` — sonst driftet der Lupen-Inhalt). Die ursprüngliche Browser-Chrome-Leiste (Punkte + URL `app.klacks-software.ch`) und die schwebenden Badge-Karten (Rendering, `.hero-badge`-Styles, `heroBadgePop`-Keyframes) wurden 2026-08-20 entfernt; das `Badges`-Feld bleibt im Content-Modell bestehen, wird aber nicht mehr gerendert.
- `FeatureTickerSection.razor` — nahtloses CSS-Marquee: Inhalt liegt zweimal im Markup (Duplikat `aria-hidden`, nur unter `prefers-reduced-motion: no-preference` sichtbar), pausiert bei `:hover`/`:focus-within`, reduced-motion → statische umbrechende Zeile. Loop (seit 2026-08-20 lückenlos bei jeder Auflösung): die Animation liegt auf den Spuren selbst (`translateX(-100%)` der eigenen Spurbreite statt `-50%` des Containers), `min-width: 100%` pro Spur füllt auch breite Viewports, `space-around` + halbes Gap als Spur-Padding (`padding-inline: 1.25rem`) hält den Abstand über den Loop-Übergang gleichmässig. RTL (ar/he): eigener Keyframe `tickerScrollRtl` (`+100%`), weil die Duplikat-Spur links liegt. Seit 2026-08-20 ist die Sektion fix am unteren Viewport-Rand (`fixed bottom-0 z-40`, Marker-Klasse `feature-ticker-bar`); `body:has(.feature-ticker-bar) footer` in `tailwind-input.css` gibt dem Footer Ausgleichs-Abstand nach unten.
- `StepsSection.razor` — 3 Schritte mit Nummer-Badges im bestehenden `reveal-stagger`-Muster (kein eigenes JS).
- `StatsCounterSection.razor` — Count-up-Zähler; Endwert steht serverseitig formatiert im Markup, JS überschreibt beim Viewport-Eintritt hochzählend.

## Neues JavaScript (wwwroot/js/)

- `hero-slideshow.js` (`window.klacksHeroSlideshow`) — Vanilla-IIFE nach `scroll-reveal.js`-Muster: 6 s/Slide, pausiert außerhalb Viewport (IntersectionObserver) und bei `document.hidden`, idempotenter Init + MutationObserver für Blazor-Server-Client-Navigation, reduced-motion/ein Bild → statisch.
- `stats-counter.js` (`window.klacksStatsCounter`) — Count-up 1,5 s mit easeOutCubic via requestAnimationFrame, IntersectionObserver, reduced-motion → Endwert sofort.
- Init beider in `MainLayout.razor` `OnAfterRenderAsync` via IJSRuntime; Script-Tags in `Pages/_Layout.cshtml`.

## Content-Modell und Provider

- `Localization/PageContentModels.cs`: nullable Properties `HeroMockup`, `Ticker`, `Steps`, `Stats` am `IndustryPageContent` (null → Sektion rendert nicht, rückwärtskompatibel). Neue Typen: `IndustryHeroMockup`, `IndustryMockupImage`, `IndustryIconLabel`, `IndustryTickerSection`, `IndustryStepsSection`, `IndustryStatsSection`, `IndustryStatItem`, `IndustryRedesignContent`.
- Die kulturweit geteilten Inhalte liegen in `Localization/Content/{kultur}/redesign.json` (alle 25 Kulturen, de = Master). `JsonPageContentProvider.LoadIndustryPage` füllt fehlende Sektionen per `ApplyRedesign` nach — bewusst mit der Kultur der **tatsächlich geladenen Datei**, damit Fallback-Seiten (z. B. `/en/land-ch` ohne en-Datei → de-Inhalt) keine Sprachmischung zeigen.
- `redesign.json` erzeugt keine Routen (Sitemap/robots/llms.txt unverändert, keine Verzeichnis-Enumeration im Code).
- Stats-Werte nur aus Belegbarem: 100 % Open Source, 25 Sprachen, 5 Branchen, 30+ Länder.
- Eigene Branchen-Seite `/land-xx/eigene-regeln` (seit 2026-08-20): Der Registry-Eintrag «Andere Branche?» (`CountryIndustries`) zeigt auf Slug `eigene-regeln` statt `klacksy` (Label-Keys unverändert); die Klacksy-Seite bleibt über die Nav erreichbar und `/klacksy` als Legacy-Redirect erhalten (`LegacyProductRoutes.CountryScopedSlugs`). Die Seite nutzt das normale `IndustryPageTemplate` mit eigenem `steps`-Block (überschreibt die generischen Redesign-Steps) und beschreibt den echten Planning-Profile-Setup-Flow aus Klacks.Api (`Application/Skills/PlanningProfile/`): Vorlage kopieren oder von Grund auf → 16 Parameter einzeln per Frage/Antwort mit Bedeutung + Planungsauswirkung (`PlanningProfileParameterCatalog`) → Vorschau → transaktionales Übernehmen. Inhalt: `Localization/Content/{de,en,fr,it}/eigene-regeln.json`, andere Kulturen fallen auf de zurück (Resolution über CountryLessKey). 30 Page-Stubs `Pages/LandXxEigeneRegeln.razor`, Sitemap-Einträge in `SitemapGenerator`.

## CSS (tailwind-input.css → wwwroot/css/site.css)

Basis-Styles außerhalb (Sichtbarkeit, Dot-Farben, statischer Ticker); alle Keyframes (`heroKenBurns`, `tickerScroll`, `tickerScrollRtl`) ausschließlich in `@media (prefers-reduced-motion: no-preference)`. Docker baut kein CSS → `npm run build:css` ausführen und `wwwroot/css/site.css` committen.

## Constraints (weiterhin gültig)

Kein `.reveal` auf Hero und finaler CTA; Lupe (`magnifier.js`, `MagnifiedImage.razor`) und `.screenshot-hover-zoom` unverändert; keine neuen NPM-/NuGet-Abhängigkeiten; `InstallPageTemplate.razor` unberührt.
