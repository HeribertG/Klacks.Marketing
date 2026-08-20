# Klacks.Marketing — Hero-Produkt-Mockup und Redesign-Sektionen (Ticker, Steps, Stats)

Umsetzung der Spec `docs/superpowers/specs/2026-07-30-marketing-hero-redesign-design.md` (2026-07-30): Der statische Hero aller Länder-/Branchenseiten (`Shared/IndustryPageTemplate.razor`) wurde um ein animiertes Produkt-Mockup ergänzt; drei neue Sektionen (Feature-Ticker, 3-Schritte, Kennzahlen-Counter) sind in die Seiten integriert.

## Neue Komponenten (Klacks.Marketing/Shared/)

- `HeroProductMockup.razor` — Browser-Fenster-Mockup (Chrome-Punkte, URL-Bar `app.klacks-software.ch`) mit Crossfade-Slideshow der `wwwroot/images/app-*-de.png`-Screenshots (ar: `app-*-ar.png`), klickbaren Progress-Dots und bis zu 3 schwebenden Badge-Karten (Material-Symbols-Icons, versetzte Ein-/Ausblend-Keyframes). Erstes Bild ist serverseitig `is-active` → No-JS/reduced-motion = statisches Bild; Dots blendet erst JS per `.hero-slideshow-js` ein.
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

## CSS (tailwind-input.css → wwwroot/css/site.css)

Basis-Styles außerhalb (Sichtbarkeit, Dot-Farben, Badge-Positionen mit `inset-inline-*` für RTL-Spiegelung, statischer Ticker); alle Keyframes (`heroKenBurns`, `heroBadgePop` 12 s-Loop mit 4 s-Versatz, `tickerScroll`, `tickerScrollRtl`) ausschließlich in `@media (prefers-reduced-motion: no-preference)`. Docker baut kein CSS → `npm run build:css` ausführen und `wwwroot/css/site.css` committen.

## Constraints (weiterhin gültig)

Kein `.reveal` auf Hero und finaler CTA; Lupe (`magnifier.js`, `MagnifiedImage.razor`) und `.screenshot-hover-zoom` unverändert; keine neuen NPM-/NuGet-Abhängigkeiten; `InstallPageTemplate.razor` unberührt.
