# Klacks.Marketing + Klacks.Marketplace: mobile-first navigation and page margins (2026-10-08)

Follow-up to `mobile-overflow-fix-2026-09-16.md`. Owner report: the hamburger dropdown does not fit the
viewport (taller than the screen = no way to scroll, too wide = sticks out), pages do not use the full
screen on phones, and Klacks.Marketplace is not mobile-first at all.

## Klacks.Marketing

Root cause of the dropdown: `.mobile-menu-panel` (`Shared/MainLayout.razor`) was `absolute right-8 w-full max-w-sm`.
`w-full` is relative to the nav (= viewport), so on a 360 px phone the panel started at -32 px and was clipped on the
left. The open state also set `max-height: 40rem` with `overflow: hidden`, so a tall menu (accordions expanded, 25
language badges) was cut off with no way to scroll.

Fix:
- Panel classes: `inset-x-4 sm:inset-x-auto sm:right-8 sm:w-96` (16 px gutters on phones, 24 rem popover from `sm`).
- `tailwind-input.css`: open panel gets `max-height: calc(100dvh - 5.5rem)` (with a `100vh` fallback),
  `overflow-y: auto`, `overscroll-behavior: contain`. Both the plain rule and the
  `prefers-reduced-motion: no-preference` animated rule were changed; the animated rule used to hard-code `40rem`.
- Closed animated panel now has `pointer-events: none` (it stays in the DOM with `max-height: 0`).
- Side margins: nav, footer and the 67 standalone `px-8` section paddings in `Shared/` and `Pages/` became
  `px-5 sm:px-8` (nav/footer `px-4 sm:px-8`). Buttons/links (`<button`, `<a `) keep `px-8` on purpose.

## Klacks.Marketplace

`Shared/NavMenu.razor` rendered every link inline at every width (no hamburger), so the bar overflowed on phones.
Now: logo + `CultureSelector` + hamburger below `xl` (1280 px, same breakpoint as Marketing); the account/upload links
render once via a `RenderFragment` (`AccountLinks`) and are shown inline from `xl` and in a full-width dropdown
(`.mobile-nav-panel`, `max-height: calc(100dvh - 4.5rem)`, scrollable) below it. Links close the menu on click.
New resource key `Nav_Menu` (aria-label) added to all 25 `SharedResource.*.resx`.
Other changes: responsive hero (`text-4xl sm:text-5xl md:text-7xl`, `py-14 md:py-24`, wrapping tab buttons, wrapping
pagination), `px-4 sm:px-6` page gutters, admin/my-packages tables scroll horizontally (`overflow-x-auto` instead of
`overflow-hidden`), compact `CultureSelector` on phones (`max-w-[6.5rem]`) so it no longer covers the logo text.

## Verification

Playwright (`playwright-core` from `Klacks.Marketing/node_modules`, system Chrome via `executablePath`, mobile
emulation) against local `dotnet run`: `document.documentElement.scrollWidth == innerWidth` at 360 px on both sites;
Marketing panel at 360x640 / 360x400 / 800x500 stays inside the viewport (`left 16 / right 344`) and scrolls
(`scrollHeight 677 > clientHeight 310..550`, `overflow-y: auto`); Marketplace panel spans 0..360 below the bar.
Not tested: real devices, RTL (ar/he) layout of the new panel, the authenticated Marketplace menu (needs login).

## Gotchas

- `site.css` is committed in both repos: run `npm run build:css` after touching Tailwind classes or CSS.
- Playwright selector for the hamburger: `nav button[class~="xl:hidden"]` (a plain `nav button[aria-expanded]`
  resolves to the invisible desktop dropdown buttons first).
- Stop a running `dotnet run` before `dotnet build` (apphost lock).
- Pushing Klacks.Marketing `main` deploys to Hetzner immediately (no tag process).
