# Handoff: Länderseiten-Restrukturierung (general + branchenspezifisch)

Status: **Entscheidungen getroffen (siehe unten), noch nicht umgesetzt.** Umsetzung erfolgt bewusst durch eine ANDERE Session (Otto-Kollaboration, Fable-Design, Sonnet/Opus-Implementierung) — diese Session liefert ausschliesslich diesen Handoff, keine Ausführung.

## Ausgangslage

- 30 Länderseiten (`land-*`) existieren, alle 37 Sprache/Land-Kombinationen sind live verifiziert korrekt (kein Deutsch-Fallback mehr) — siehe Memory `project_klacks-marketing-country-pages-wave4-2026-07-14.md` und die Fortsetzung in dieser Session.
- Die aktuellen `land-*`-Seiten sind inhaltlich **Spitex-/Spital-lastig** — sie nutzen `IndustryPageTemplate.razor` mit auf Pflege/Spital zugeschnittenen USPs, obwohl Klacks fünf Branchen bedient: Spitex, Spitäler, Security, Haus-/Putzdienste, Logistik.
- Daneben existieren fünf generische, länder-unabhängige Branchenseiten: `Spitex.razor`, `Spitaeler.razor`, `Security.razor`, `Hausdienste.razor`, `Logistik.razor` (+ `Index.razor` als Startseite) — diese sind aktuell die einzigen Security/Hausdienste/Logistik-Inhalte, ohne Länderbezug.

## Neue Anforderung (User, wörtlich)

> Pro Land eine generelle Beschreibung mit generellen USP, nicht abgestellt auf eine bestimmte Branche, abgestimmt pro Land. Dann Beschreibung abgestimmt Spitex, Spitäler, Security, Haus-/Putzdienste, Logistik.
>
> Ich möchte, dass du zusammen mit Otto das Ganze machst. Otto schaut/analysiert die Länder, du übernimmst seine Vorschläge und macht zusammen als Brainstorming eine Werbebeschreibung.

Rohentwurf des Users für die generelle (branchenneutrale) Beschreibung — **nur Ideengeber, nicht final**:

```
Open Source · On-Premise · Schweizer Datenschutz
Personaleinsatzplanung, bei der Sie die Kontrolle behalten.
Klacks plant Dienste automatisch, optimiert Touren und steuert sich per KI-Assistent
— On-Premise, Open Source, mit dem KI-Modell Ihrer Wahl.

Planungen sind eine langweilige, zeitraubende Aufgabe. Aber eine gute Planung kann
zwischen Gewinn und Verlust entscheiden.
```

Ziel-Struktur pro Land: **1 generelle Seite + 5 branchenspezifische Seiten** (Spitex, Spitäler, Security, Hausdienste, Logistik), jeweils lokalisiert in der/den für dieses Land gemappten Sprache(n) (siehe `LanguageCountryMap` in `MainLayout.razor` — NICHT alle 21 Sprachen pro Seite, nur die tatsächlich gemappte(n) + Deutsch-Fallback für den Rest).

## Prozess (User-Vorgabe)

1. **Otto** analysiert pro Land die Branchen-Realität (Arbeitsrecht, Marktbesonderheiten) und liefert Vorschläge — wie bei Wave 4.
2. **Ich (Claude)** übernehme Ottos Vorschläge, mache gemeinsames Brainstorming daraus und formuliere die eigentliche Werbebeschreibung.
3. **Fable** (Sub-Agent) macht den Design-Entwurf für die neue Seitenstruktur.
4. **Sonnet** (oder **Opus** bei hoher Komplexität) setzt den Entwurf um.
5. Fact-Check mit derselben Sorgfalt wie Wave 4: Otto liefert Behauptungen, unabhängige Fact-Check-Agenten mit echter Websuche verifizieren jede Einzelbehauptung, bevor sie übernommen wird — das ist der eigentliche Zeit-/Risikotreiber bei ~150 neuen Branchenseiten mit rechtlichen Behauptungen, nicht das Design.

## Harte Constraints

- **`imageGrow`/Lupen-Effekt (`wwwroot/js/magnifier.js`) und `.screenshot-hover-zoom` müssen erhalten bleiben** — auf JEDEM neuen Seitentyp live verifizieren, nicht nur "kompiliert".
- Kein Sub-Agent committet/pusht eigenständig (bekanntes Risiko, siehe Memory `feedback_subagents-can-autonomously-commit-push.md`) — explizit in jedem Sub-Agent-Prompt verbieten.
- Sprachumfang pro Seite: nur die in `LanguageCountryMap` gemappte(n) Sprache(n) + Deutsch-Fallback, NICHT alle 21 Sprachen.

## Entscheidungen (beantwortet, User 2026-07-14)

1. **Seitenarchitektur: eigene Route pro Land×Branche.** Keine Sektionen/Anker auf einer langen Seite.
   ```
   /land-ch              → generelle CH-Seite (branchenneutral)
   /land-ch/spitex       → Spitex CH
   /land-ch/spitaeler    → Spitäler CH
   /land-ch/security     → Security CH
   /land-ch/hausdienste  → Hausdienste CH
   /land-ch/logistik     → Logistik CH
   ```
   Macht ~30 generelle + ~150 Branchenseiten total (über alle Länder, langfristig). Routing/SEO-Konsequenz: neue Sub-Routen unter jedem `land-*`, `LocalizedPageKeys`/`LanguageCountryMap`/Nav-Logik in `MainLayout.razor` müssen die neue Zwei-Ebenen-Struktur abbilden.

2. **Generische Branchenseiten + Startseite: 301-Redirect auf Länder-Version**, sobald die jeweilige Länder-Branchenseite existiert (kein Löschen/404, kein SEO-/Linkverlust). Wichtig: Während der Pilotphase (nur CH fertig) bleiben die generischen Seiten für alle anderen 29 Länder weiterhin die einzige Quelle — der Redirect kann pro Branche erst greifen, sobald ALLE Länder diese Branche abgedeckt haben, oder muss zumindest sprach-/kulturabhängig auf das jeweils passende Land auflösen (z. B. Default-Kultur `de` → `land-de`, nicht `land-ch`). Diese Auflösung ist Teil der Umsetzung, nicht vorentschieden.

3. **Rollout: Pilot zuerst.** Schweiz (de/fr/it) komplett end-to-end (generelle Seite + 5 Branchenseiten, Design + Content + Fact-Check + Live-Verifikation), Template festzurren — **erst danach** auf die restlichen 29 Länder skalieren. Kein Parallel-Rollout auf alle 30 Länder von Anfang an.

## Content bereits fertig (andere Session, 2026-07-14)

Schritte 1, 2 und 5 aus dem Prozess oben (Otto-Brainstorm, Claude-Übernahme, Fact-Check) sind für **CH, DE, AT, FR, IT** bereits abgeschlossen — nicht nur für den Piloten CH, sondern für alle fünf zuerst angefragten Länder. Ergebnis liegt fertig zur Weiterverarbeitung unter:

```
docs/content-drafts/{ch,de,at,fr,it}/{general,spitex,spitaeler,security,hausdienste,logistik}.json
docs/content-drafts/HANDOFF.md          — Übergabe-Notizen zu diesem Content-Batch
docs/content-drafts/sources/            — Otto-Rohtexte, korrigierte Fakten, Sign-off (Audit-Trail)
```

30 fact-gecheckte JSON-Dateien im `IndustryPageContent`-Schema, Original-Sprache Deutsch (wie bei allen bisherigen `land-*`-Seiten). Fact-Check-Befund: deutlich mehr Korrekturbedarf als bei Wave 4 (falsches BAG-Aktenzeichen DE, erfundene 240h-Grenze AT, falsche 15%-Strafgebühr statt 40-50% IT, falsche 120h-Schwelle CH, falsche 24h- statt 11h-Ruhezeit FR — Details in `sources/`).

**Noch offen (Schritte 3+4, Design + Umsetzung):** Fable-Design-Entwurf und Sonnet/Opus-Implementierung der neuen Routen/Templates fehlen noch — dieser Content-Batch ist reines Text-Deliverable, kein Code/Routing wurde angefasst. Für den Piloten (Entscheidung 3 oben) genügt zum Start der `ch/`-Ordner; `de/at/fr/it/` liegen für die Skalierungsphase danach bereit.

Memory-Referenz: `project_klacks-marketing-country-industry-content-pilot-2026-07-14.md`.
