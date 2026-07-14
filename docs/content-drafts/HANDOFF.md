# Handoff: fertige Werbetexte für Länder-/Branchen-Restrukturierung (Pilot CH/DE/AT/FR/IT)

Status: **Content fertig, fact-gecheckt, Otto-Sign-off eingeholt. NICHT umgesetzt** (kein Code, kein Routing, kein Commit). Umsetzung ist bewusst Aufgabe einer anderen Session (Arbeitsteilung, User-Vorgabe 2026-07-14).

Vorgänger-Dokument: `country-industry-restructure-handoff.md` (im selben `docs/`-Ordner) — dort stehen die bereits getroffenen Architektur-Entscheidungen (verschachtelte Routen `/land-ch/spitex`, 301-Redirect für die generischen Branchenseiten, Sprachumfang nur `LanguageCountryMap`-Sprachen + Deutsch-Fallback, Pilot-Reihenfolge CH zuerst dann Rollout). Diese Session hat **zusätzlich** DE/AT/FR/IT-Content mitgeliefert, weil in einer parallelen Antwort derselbe User "CH, DE, AT, FR, IT" als Piloten-Länder für die Content-Erstellung bestätigt hatte — das Rollout/die Implementierungsreihenfolge bleibt trotzdem beim Vorgänger-Dokument (CH zuerst umsetzen, Template festzurren, DE/AT/FR/IT-Content liegt aber bereits fertig für den Rollout danach bereit).

## Was hier liegt

```
docs/content-drafts/
├── HANDOFF.md              (dieses Dokument)
├── sources/                (Nachvollziehbarkeit / Audit-Trail)
│   ├── otto-*.md            Otto's Rohfakten-Brainstorming pro Land (vor Fact-Check)
│   ├── final-facts-*.md     Korrigierte, fact-gecheckte Fakten pro Land (tatsächliche Schreibgrundlage)
│   ├── otto-signoff-request.txt   Die Korrekturliste, die Otto zum Sign-off vorgelegt wurde
│   └── otto-signoff-reply.md      Otto's Zustimmung + Zusammenfassung
├── ch/  general.json, spitex.json, spitaeler.json, security.json, hausdienste.json, logistik.json
├── de/  (gleiche 6 Dateien)
├── at/  (gleiche 6 Dateien)
├── fr/  (gleiche 6 Dateien)
└── it/  (gleiche 6 Dateien)
```
30 Content-Dateien total, alle syntaktisch validiert (`python3 -c "import json; json.load(...)"`), alle im exakten `IndustryPageContent`-Schema aus `Localization/PageContentModels.cs` (camelCase-Felder).

## Prozess (falls für spätere Länder wiederholt)

1. Otto-Brainstorming (`~/claude-otto-bridge/ask.sh`) pro Land: allgemeine branchenneutrale USP + 5 branchenspezifische Aufhänger (Spitex, Spitäler, Security, Haus-/Putzdienste, Logistik).
2. **5 parallele Fact-Check-Subagenten** (general-purpose, Websuche), je 1 Land, prüften JEDE Einzelbehauptung gegen Originalquellen (Fedlex, Legifrance, RIS/Jusline, Normattiva, Gesetze/CCNL/KV-Texte). Ergebnis: deutlich mehr Korrekturbedarf als in der Wave-4-Runde vom selben Tag — u. a. ein falsches BAG-Aktenzeichen (DE), eine erfundene "240h/Jahr"-Grenze (AT), eine falsche "15%"-Strafgebühr statt 40-50% (IT), eine falsche "120h"-Schwelle (CH), und ein inhaltlich wichtiger Fehler bei FR (Ärzte-Ruhezeit nach 24h-Dienst ist 11h, nicht 24h wie ursprünglich behauptet).
3. Korrekturen wurden Otto vorgelegt, er hat ihnen vollumfänglich zugestimmt (`sources/otto-signoff-reply.md`).
4. **5 parallele Content-Agenten** (general-purpose), je 1 Land, haben je 6 JSON-Dateien geschrieben — ausschliesslich basierend auf den `final-facts-*.md`, mit expliziten Verboten für die bekannten Fehler.
5. Nachbearbeitung durch diese Session: ein Faktenfehler in `ch/spitaeler.json` korrigiert (Otto's "42+4"-Beispiel war nur für das Universitätsspital Zürich belegt, ein Agent hatte daraus "viele Spitäler" verallgemeinert — auf "einzelne Spitäler, etwa das USZ" korrigiert), plus mehrere `&amp;`/`&mdash;`-Konsistenzfixes (rohe Unicode-Zeichen bzw. unescapte `&` in MarkupString-Feldern, v. a. in den FR-Dateien).

## Wichtig für die Umsetzungs-Session

- **Sprachumfang**: alle 30 Dateien sind aktuell NUR Deutsch (Content-Original), wie bei allen bisherigen `land-*`-Seiten. Übersetzung in die jeweils gemappte(n) Sprache(n) (CH: fr/it, AT: nur de, FR: fr falls gewünscht, IT: it falls gewünscht — siehe `LanguageCountryMap`) ist ein separater, noch nicht begonnener Schritt.
- **Dateinamen/Keys sind Vorschläge, keine Festlegung**: diese Session hat `general.json` + `spitex.json`/`spitaeler.json`/`security.json`/`hausdienste.json`/`logistik.json` pro Land-Ordner gewählt, rein zur Übersicht. Die tatsächliche `PageKey`-Namenskonvention für die verschachtelten Routen (`/land-ch/spitex` etc.) legt die Umsetzungs-Session fest.
- **`imageGrow`/Lupen-Effekt und `.screenshot-hover-zoom`**: nicht Teil dieser Content-Session, aber laut Vorgänger-Handoff live auf jedem neuen Seitentyp zu verifizieren, nicht nur "kompiliert".
- **Screenshots**: alle Dateien referenzieren nur bereits existierende Bilder (`app-schedule-de.png`, `app-timeline-de.png`, `app-calendar-de.png`, `app-klacksy-de.png`) — keine neuen Bild-Assets nötig für den ersten Wurf.
- **`ch/spitaeler.json`** enthält bewusst weiterhin den "42+4"-USZ-Verweis als Einzelbeispiel (nicht als Branchenstandard) — bei einer möglichen Kunden-/PR-Prüfung durch USZ selbst vorher gegenchecken, ob die öffentliche Nennung so gewünscht ist.
- **301-Redirect-Strategie für die 5 generischen Branchenseiten** (`Spitex.razor` etc.) ist laut Vorgänger-Handoff noch offen und Teil der Umsetzung, nicht dieser Content-Session.

## Restliche 25 Länder

Für die übrigen 25 `land-*`-Länder existiert noch kein Content — siehe `HANDOFF-remaining-countries.md` für den Plan (Länderliste in 3 Blöcken, identischer Prozess, Verifizierbarkeits-Regel für Golf-Staaten/Asien). Reiner Plan, nichts davon wurde ausgeführt.

## Nicht Teil dieser Session (bewusst ausgeklammert)

- Kein Code, kein Routing, kein `MainLayout.razor`/`LanguageCountryMap`-Update.
- Kein Fable-Design-Entwurf.
- Kein Commit, kein Push.
- Keine Übersetzung in andere Sprachen als Deutsch.
- Kein Rollout auf die übrigen 25 Länder (Content dafür existiert noch nicht).
