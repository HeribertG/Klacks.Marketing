# Klacks.Marketing: Mobile Horizontal-Overflow Fix (2026-09-16)

Owner reported on a real Android/Chrome phone: oversized text, confusing layout, horizontal
scrolling, and the hero product screenshot (with magnifier) missing entirely. Investigated with
code reads, a mechanical census over all 319 `.razor` files, and Playwright measurements at
360/390/414px.

## Census false positives — verify before trusting a regex census

A grep-based census for `text-[Nrem]` classes without a `md:`/`lg:` prefix flagged 8 files as
"unconditional oversized headings". Reading each file line-by-line showed 4 of the 8
(`InstallPageTemplate.razor`, `StatsCounterSection.razor`, `RoutePlanningSection.razor`, plus one
false match) already pair every large size with a responsive variant in the same class string —
the regex matched the base token and missed the adjacent `md:` class next to it. Only
`IndustryPageTemplate.razor:14` (the real bug), `CountryIndustryGrid.razor:9`,
`Datenschutz.razor:9`, and `Impressum.razor:9` were genuine. Lesson: a mechanical census over
Tailwind utility strings is a lead, not a finding — read the actual class list before acting on it.

## Root cause 1: hero `<h1>` fixed at 56px (`IndustryPageTemplate.razor:14`)

No `md:`/`lg:` step-down. A single long unbreakable localized word (German
"Personaleinsatzplanung") forced the hero grid column (`lg:col-span-7`) past the viewport,
measured `document.scrollWidth` 674px on `/land-ch` and 449px on `/land-se` against 360px.
Fixed with a three-step scale (`text-[2.25rem] md:text-[2.75rem] lg:text-[3.5rem]`) plus
`break-words` on the `<h1>` and `min-w-0` on its `lg:col-span-7` wrapper.

## Root cause 2: hero product image hidden below `lg` (`IndustryPageTemplate.razor:25`)

`hidden lg:block` on the wrapper meant the hero screenshot (with the desktop-only mouse
magnifier, see `magnifier.js:260` which already no-ops for non-mouse pointer types) simply did
not render at all below 1024px, instead of degrading to a static image. Removed the wrapper —
no JS change needed, touch users now see the static screenshot.

## Root cause 3: any unbreakable word, anywhere — fixed globally, not per-element

After fixing the two defects above, `/land-ch` still overflowed at 360/390px. Root cause was a
**different** heading entirely — "…ein Blick auf Wochenhöchstarbeitszeit" — a 24-character
unbreakable German compound word in a `.reveal` section, unrelated to the hero. No
`overflow-wrap` was set anywhere on the site, so nothing clipped the ink overflow, and it
propagated to `document.documentElement.scrollWidth` (32px `px-8` padding + 361px word-width =
393px, matching the measured overflow exactly, constant across 360/390 and clearing at 414).

**Fixed at the `body` level** (`tailwind-input.css`, one property added to the global `body`
rule): `overflow-wrap: break-word;`. This only engages when a word doesn't fit its box, so it
has zero visual effect on any text that already fits — a global guard against the same failure
recurring in any heading, in any of the 25 supported languages, anywhere on the site, rather than
chasing individual long words per page. Given 25-language coverage, a per-page audit for long
words is not tractable; the global CSS guard is the only fix that actually closes the bug class.

Before landing on this, the feature-ticker marquee (`FeatureTickerSection.razor`, fixed
bottom bar with a CSS `translateX` loop) was suspected and **disproved** empirically: hiding it
via `page.addStyleTag { display: none !important }` left `scrollWidth` unchanged. Its own ink
overflow is real but correctly clipped by its `overflow-hidden` ancestor — a red herring that
looked plausible from a static code read but didn't survive a live measurement.

## Root cause 4 (not a functional bug, a polish pass): unconditional desktop-scale spacing

After the three defects above were fixed, the owner asked for the broader "mobile-first" claim
in the original bug report to be honored, not just the three reproduced symptoms — a legitimate
scope expansion, confirmed explicitly rather than assumed. A census of `py-*`/`pt-*`/`pb-*`/`gap-*`
utilities across the 9 shared templates found large unconditional values (`py-24`, `py-32`,
`gap-12`, `gap-16`, `gap-20`, etc.) shipped identically to phones and desktops — not a measured
overflow or visibility bug like root causes 1-3, just desktop-scale whitespace/gaps on a 360px
screen. Fixed across 10 files (`IndustryPageTemplate`, `InstallPageTemplate`,
`RoutePlanningSection`, `StatsCounterSection`, `StepsSection`, `CountryIndustryGrid`,
`Datenschutz`, `Impressum`, `Partner`, `Vergleich`) by giving each a smaller mobile base plus an
`md:`/`lg:` variant that restores the exact original value (e.g. `py-24` → `py-14 md:py-24`).

Verified with a full computed-style sweep at 1280px (not a sample — every `pt-*/pb-*/py-*/gap-*`
element on every changed page, 200-290 properties per page) confirming zero deviation from the
pre-change desktop values, so this is additive on mobile only, no desktop regression.

## Census caveat, again — "97% of files have no breakpoints" is not evidence of a bug

An earlier mechanical census (see above) found only 9 of 319 `.razor` files use any `md:`/`lg:`
class. Taken at face value this reads as "97% unresponsive," but ~300 of the other 310 files are
one-line `LandXx.razor` wrapper pages (e.g. `Pages/LandCh.razor`: two `@page` directives and a
single `<IndustryPageTemplate PageKey="land-ch" .../>` call) with no markup of their own to be
responsive or not. All real styling lives in the 9 shared templates, which is exactly where every
fix in this document landed. Don't cite the 97% figure as a defect count without this context.

## Found, not fixed — pre-existing crash on bare `/partner` and `/vergleich`

`Pages/Partner.razor` and `Pages/Vergleich.razor` pass `Culture="@Culture"` (the raw route
parameter) to `<SeoHead>` instead of `Culture="@ResolvedCulture"`. Their `@page` route has no
`{culture}` segment for the bare path (only `/en/partner` etc. do), so `Culture` is `null` there,
and `JsonPageContentProvider.LoadFlatContent` throws `ArgumentNullException` on
`Path.Combine(_contentRoot, null, ...)` — HTTP 500 on `/partner` and `/vergleich` with no
language prefix. `Datenschutz.razor`/`Impressum.razor` already use `ResolvedCulture` and are
unaffected. Confirmed via diff this line was untouched by any commit in this document — pre-
existing, unrelated to the mobile work, not fixed here.

## Verification method

No automated test project exists for Klacks.Marketing. Verification used a throwaway Node
script driving `playwright-core` (already present under `node_modules`, no full `playwright` CLI
installed) headless against the locally running `dotnet run` instance, measuring
`document.documentElement.scrollWidth` against the emulated viewport width at 360/390/414px
across `/land-ch`, `/land-de`, `/land-se`, and an industry sub-page. Script was deleted after use,
not committed — worth promoting to a real committed regression check if mobile overflow recurs.

## Root cause 5: mobile hamburger menu rendered as flowing text, not a list

After deploying root causes 1-4, the owner reported on a real device: "sub-menus appear already
expanded, but unformatted." `MainLayout.razor`'s `.mobile-menu-panel` carries Tailwind's
`flex flex-col gap-5`, but the component's own CSS set `display: block` on the open-state rule
(both the plain rule and the `prefers-reduced-motion: no-preference` animated-collapse rule).
Equal specificity (0-1-0) against Tailwind's `.flex{display:flex}`, and the component rule sits
later in the compiled `site.css`, so `display: block` always won — the panel's `<a>` children
lost their flex-blockification and ran together as inline text instead of a spaced vertical list.

**Pre-existing, not a regression from root causes 1-4**: `flex flex-col gap-5` was added
2026-07-01 in `33ef0cf`, the colliding `display: block` rule the same day in `c54b386` — three
months before this session. `MainLayout.razor` was untouched by any of the mobile-overflow
commits, confirmed via `git log`.

Fixed by changing both `display: block` occurrences to `display: flex` (`tailwind-input.css`).
Verified with Playwright: computed `display` is `flex` (`flex-direction: column`, `gap: 20px`
matching `gap-5`), consecutive links now have `getBoundingClientRect().top` values ~40px apart
instead of collapsing onto one line. Desktop (≥768px, panel always `display:none`) and the
closed mobile state (`opacity: 0`) were regression-checked and remain correct.

Two false leads investigated and ruled out before finding this: (a) the desktop "Industries"
dropdown (`.dropdown-menu`) renders correctly on production, computed styles match Tailwind's
config-overridden `border-radius: 8px` (not the default `0.75rem` — `tailwind.config.js` sets
`borderRadius.xl` to `0.5rem` for this project); (b) production's compiled `site.css` was
byte-identical to a fresh local `npm run build:css`, so this was never a deploy/cache issue.

## Feature 6: collapsible accordions for industries/languages/countries in the mobile menu

After root cause 5 shipped, the owner sent a real-device screenshot: the industries submenu
inside the hamburger panel rendered as a permanently expanded, unstyled-looking list (7 industry
links always shown under "Branchen"), pushing Download/Docs/Store and everything below off-screen
without scrolling. This was pre-existing UX, not a regression — the mobile industries list had
never had a collapse state, unlike the equivalent desktop header dropdown.

Added three independent accordion sections to `MainLayout.razor`'s mobile panel — industries,
languages (25 badges), countries (flags) — each with its own boolean state (`_mobileIndustryOpen`,
`_mobileLanguageOpen`, `_mobileCountryOpen`), all defaulting to collapsed, mirroring the toggle
button + `expand_more`/`expand_less` chevron pattern the desktop header already uses for the same
three menus. All three reset to collapsed on mobile-menu close and on navigation, so the panel
always starts fresh.

**Follow-up UX request in the same session**: rather than a generic "Industries"/"Languages"/
"Countries" label, each collapsed header now shows the *currently selected value* — exactly what
the desktop dropdowns already do (current language code, current country flag). Industries shows
the active industry name on an industry sub-page (e.g. "Spitex" on `/land-ch/spitex`), falling
back to the generic label where none is active (the country's general page). Languages shows the
current language code (e.g. "DE"). Countries shows the current country's flag + display name
(e.g. "Schweiz"). A translated `aria-label` on each button keeps a proper description available
to screen readers despite the terser visible text.

New keys `nav.languages`/`nav.countries` were added to all 25 locale `shared.json` files for the
labels (used as `aria-label`, and as the industries-header fallback text already existed via
`nav.industries`). No existing key needed to change.

Verified with Playwright across the full interaction matrix: independent open/close per section
with no cross-interference, reset to collapsed on menu-close/navigation, correct header text on
both a country general page and an industry sub-page, correct text after a live language switch,
desktop dropdowns (separate state variables) unaffected, no console errors.

## Commits

- `64bf5b0` — hero headline responsive scale, hero image unhidden, 3 heading consistency fixes.
- `789d9d3` — global `overflow-wrap: break-word` guard.
- `104d1ec` — mobile-first spacing pass across 10 files (root cause 4).
- `f0f8a03` — flex layout fix for the mobile hamburger menu (root cause 5).
- `e78cac9` — collapsible mobile accordions + current-value headers (feature 6).

## Deployment

Klacks.Marketing has no tag-based release process (unlike Klacks.Api/Klacks.Ui). The GitHub
Actions workflow "Deploy Klacks.Marketing to Hetzner" triggers on every push to `main` and
deploys directly — pushing these commits ships them immediately.
