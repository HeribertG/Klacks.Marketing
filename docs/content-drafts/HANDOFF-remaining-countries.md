# Handoff: Content-Erstellung für die restlichen 25 Länder

Status: **Reiner Plan, NICHTS ausgeführt.** Keine Otto-Anfrage, kein Fact-Check, kein Content für diese 25 Länder. Dieses Dokument ist bewusst für eine **frische Session ohne Vorkontext** geschrieben — der User will diese Arbeit in einer neuen Session starten lassen, nicht in der, die diesen Plan geschrieben hat.

## Ausgangslage

Von den 30 `land-*`-Länderseiten in `Klacks.Marketing` sind 5 inhaltlich fertig: CH, DE, AT, FR, IT (Content unter `docs/content-drafts/{ch,de,at,fr,it}/`, siehe `HANDOFF.md` in diesem Ordner für den genauen Ablauf, der dabei benutzt wurde). CH ist zusätzlich bereits vollständig ALS SEITE implementiert — echte Routen `/land-ch/spitex` etc., eine Branchen-Registry (`Localization/CountryIndustries.cs`), ein Branchen-Grid (`Shared/CountryIndustryGrid.razor`), Design-Politur — das ist die bewiesene Referenz für Routing/Design, falls diese Session auch die Umsetzung in echte Seiten übernehmen soll (siehe unten "Scope dieser Session").

Für die übrigen 25 Länder fehlt noch aller Content: kein Otto-Brainstorm, kein Fact-Check, kein Text.

Für **BE** und **CZ** liegt bereits rohes, ungeprüftes Otto-Brainstorming in `sources/otto-be.md` und `sources/otto-cz.md` (aus einem abgebrochenen Anlauf derselben Session, die diesen Plan schreibt) — kann als Kopfstart für Schritt 1 wiederverwendet werden, ist aber noch NICHT fact-gecheckt, nicht vertrauenswürdig ungeprüft übernehmen.

## Restliche 25 Länder, in 3 Blöcken (Verifizierbarkeits-Tiers)

**Block A — Europa (14), Rechtstexte online zugänglich, ähnliches Risiko wie beim Pilot:**
BE, CZ, DK, ES, FI, GR, IE, NL, NO, PL, PT, RO, SE, GB

**Block B — Naher Osten (3), Rechtstexte online eingeschränkt zugänglich/oft nicht in Deutsch/Englisch:**
AE, SA, IL

**Block C — Asien (8), Rechtstexte meist nicht in lateinischer Schrift, online kaum direkt prüfbar:**
CN, JP, KR, MY, ID, TH, TW, VN

Block A birgt ungefähr das gleiche Risiko wie der Pilot (bei CH/DE/AT/FR/IT musste trotz guter Quellenlage rund die Hälfte aller Otto-Behauptungen korrigiert werden). Block B und C bergen ein deutlich höheres Risiko für nicht verifizierbare oder falsche Behauptungen — siehe "Wichtige Regel" weiter unten. Empfehlung: Block A zuerst komplett durchziehen, dann B/C.

## Scope dieser Session (User-Vorgabe, ZWINGEND)

- **Nur Content, kein Code.** Kein Routing, kein `MainLayout.razor`/`CountryIndustries.cs`-Update, kein Fable-Design, kein Commit/Push. Das Ergebnis sind ausschliesslich JSON-Dateien unter `docs/content-drafts/`.
- **Keine Übersetzung.** Content-Original bleibt Deutsch, wie bei allen bisherigen `land-*`-Seiten. Übersetzung in die per `LanguageCountryMap` (`MainLayout.razor`) gemappte(n) Sprache(n) ist ein separater, nachgelagerter Schritt.
- Sub-Agenten dürfen NICHT committen/pushen — das explizit in jedem Sub-Agent-Prompt verbieten (bekanntes Risiko).

## Otto-Bridge (technischer Zugang)

SSH-Brücke zu Otto (OpenClaw-Agent auf Hostinger-VPS) ist bereits eingerichtet:
```bash
bash ~/claude-otto-bridge/listen.sh   # nur nötig falls Otto von sich aus schreiben soll, hier nicht gebraucht
cd ~/claude-otto-bridge && ./ask.sh "Nachricht an Otto"   # synchron, Antwort kommt auf stdout
```
Fehlt der SSH-Key, stellt `lib.sh` ihn automatisch aus `C:\SourceCode\Hetzner\openclaw_deployment_key` wieder her. Bekannter Fehler: gelegentlich `EmbeddedAttemptSessionTakeoverError` (parallele Otto-Nutzung durch eine andere Session) — einfach denselben `ask.sh`-Aufruf wiederholen, hat in der Vergangenheit beim zweiten Versuch funktioniert.

**Otto's Antworten IMMER direkt in eine Datei umleiten** (`> docs/content-drafts/sources/otto-xx.md 2>&1`), nicht nur im Terminal anzeigen lassen — Otto-Sessions sind flüchtig, und die eigene Session sollte nicht durch lange Rohtexte im Kontext aufgebläht werden.

## Prozess pro Land (6 Zielseiten: 1 generell + Spitex, Spitäler, Security, Haus-/Putzdienste, Logistik)

Dieser Prozess wurde beim Pilot (CH/DE/AT/FR/IT) entwickelt und ist um einen neuen Schritt (4) erweitert — User-Vorgabe vom 2026-07-14:

1. **Otto recherchiert** (`ask.sh`, EIN Land pro Anfrage, nicht mehrere bündeln — Qualität sinkt sonst spürbar). Gefragt wird: 3-5 branchenneutrale, generelle USP-Punkte (Arbeitsrecht, Datenschutz, was branchenübergreifend für Personaleinsatzplanung in diesem Land relevant ist) PLUS pro Branche (Spitex-Äquivalent, Spitäler, Security, Haus-/Putzdienste, Logistik — jeweils mit landessprachlichem Begriff, z.B. "aide à domicile" für FR) je 2-3 landesspezifische Aufhänger (Gesetz/Tarifvertrag/Besonderheit). Otto soll pro Punkt Fakt + Sicherheits-Einschätzung + Quelle liefern, nur Rohfakten/Stichworte, keine Ausschmückung. Rohtext nach `docs/content-drafts/sources/otto-xx.md`.
2. **Fact-Check** (general-purpose Sub-Agent mit echter Websuche, ein Agent pro Land, parallelisierbar über mehrere Länder). Jede Einzelbehauptung gegen Originalquellen prüfen (Gesetzestexte, offizielle Behörden, Tarifvertragstexte — NICHT auf Otto's eigene "100% gesichert"-Einschätzung verlassen, die war beim Pilot mehrfach falsch trotz sichtbarer `[fetch-timeout]`-Fehler im Otto-Rohtext). Verdikt pro Behauptung: BESTÄTIGT / KORREKTUR NÖTIG (mit korrigiertem Fakt+Quelle) / NICHT VERIFIZIERBAR. Ergebnis nach `docs/content-drafts/sources/final-facts-xx.md` — kondensierte, korrigierte Fakten-Grundlage für den nächsten Schritt (siehe `final-facts-ch.md` etc. als Formatvorlage).
3. **Korrekturen Otto vorlegen** (ein `ask.sh`-Aufruf mit der Korrekturliste), Sign-off einholen — siehe `sources/otto-signoff-request.txt`/`otto-signoff-reply.md` als Formatvorlage.
4. **Ich (die schreibende Session) verfasse den Text** — general-purpose Sub-Agent pro Land (parallelisierbar), schreibt 6 JSON-Dateien exakt im `IndustryPageContent`-Schema (`Localization/PageContentModels.cs`, camelCase-Felder: `pageTitle`, `hero`, `badgeIcon`, `titleHtml`, `subtitle`, `challenges`, `solutions`, `example`, `showRoutePlanning`, `cta` — siehe bestehende Dateien in `docs/content-drafts/ch/*.json` als Stil-/Strukturvorlage). AUSSCHLIESSLICH auf Basis von `final-facts-xx.md`, keine zusätzlichen Fakten erfinden. **Jede der 6 Seiten muss die landestypischen Besonderheiten klar aufgreifen und die USP benennen, die sich daraus ergibt** — nicht generische Textbausteine mit ausgetauschtem Ländernamen.
5. **NEU — Otto kritisiert den fertigen TEXT** (nicht nur die Fakten): den geschriebenen Text (kondensiert — Badge/Titel/Subtitle/Challenge- und Solution-Item-Titel reichen, Otto braucht nicht die vollen JSON-Dateien mit Bildpfaden etc.) per `ask.sh` vorlegen und um Kritik zu Tonalität, Überzeugungskraft und Landes-Relevanz bitten (nicht Faktentreue — die ist durch Schritt 2/3 bereits abgesichert).
6. **Überarbeiten** basierend auf Ottos Kritik, ggf. Schritt 5 wiederholen.
7. **Abnahme**: erst wenn sowohl Otto als auch die schreibende Session mit dem Text zufrieden sind, gilt die Seite als fertig. Kurz im Ergebnis vermerken (z.B. in einem `sources/otto-critique-xx.md`), dass die Kritik-Runde stattgefunden hat und was ggf. geändert wurde — Nachvollziehbarkeit wie beim Fact-Check.
8. **Eigene Nachkontrolle** (nicht überspringen, hat beim Pilot wiederholt echte Fehler gefunden): JSON-Validität (`python3 -c "import json; json.load(open(...))"`), `&amp;`/`&mdash;`-Konsistenz. Nur `pageTitle` darf ein rohes `&` enthalten (wird als Klartext gerendert, nicht als `MarkupString`) — ALLE anderen Textfelder (`badge`, `titleHtml`, `subtitle`, Item-`title`/`text`, `cta`) werden als `MarkupString` gerendert und brauchen `&amp;` für "&" sowie `&mdash;` statt eines rohen Unicode-Gedankenstrichs. Das war beim Pilot der häufigste Fehler der Content-Agenten.

## Wichtige Regel für Block B/C (Golf-Staaten, Asien) — NEU gegenüber dem Pilot

Bei diesen Ländern ist die Wahrscheinlichkeit hoch, dass Otto und/oder die Fact-Check-Agenten für einzelne Branchen-Aufhänger **keine verlässliche Quelle finden** (Gesetzestexte oft nicht online, nicht in lateinischer Schrift, oder Otto's Grounding-Suche schlägt fehl — sichtbare `[fetch-timeout]`-Fehler, trotzdem "100% gesichert" deklariert, mehrfach beobachtet in Wave 4 und im Pilot).

**Regel:** Ein Fact-Check-Verdikt "NICHT VERIFIZIERBAR" bedeutet, die Behauptung wird aus der Schreib-Grundlage für Schritt 4 **gestrichen**, nicht abgeschwächt und trotzdem verwendet. Die betroffene Branchenseite bleibt dann eher generisch (weniger landesspezifische Rechts-Details) statt eine unbelegte Behauptung zu riskieren — Ehrlichkeit hat Vorrang vor Textdichte. Die allgemeine/branchenneutrale Länderseite kommt in der Regel ohne branchenspezifische Rechtsdetails aus (Datenschutz + generelles Arbeitszeitrecht reichen) und sollte für alle 25 Länder machbar sein, auch wenn einzelne Branchenseiten dünner ausfallen.

**Empfehlung:** Nach dem Fact-Check von Block B/C dem User kurz zurückmelden, für welche Länder/Branchen die Faktenlage zu dünn für einen eigenständigen Aufhänger war, bevor Schritt 4 gestartet wird — nicht stillschweigend mit generischem Text auffüllen.

## Wiederverwendbares Material aus Wave 4

Für NL, BE, DK, GR, ES, FI, NO, PL, PT existieren bereits fact-gecheckte **Gesundheitswesen-Fakten** aus einer früheren Runde ("Wave 4", siehe Memory `project_klacks-marketing-country-pages-wave4-2026-07-14.md` und die dort bereits korrigierten Länderseiten `Localization/Content/de/land-*.json`). Diese sind branchenspezifisch (Spitex/Spitäler) und primär für die Spitex/Spitäler-Branchenseiten dieser Länder verwertbar, nicht für die branchenneutrale allgemeine Seite (die braucht generelles Arbeitszeit-/Datenschutzrecht, das Wave 4 nicht recherchiert hat). Vor einem neuen Otto-Brainstorm für diese 9 Länder lohnt sich ein Blick in die bestehenden `land-*.json`, um Doppelarbeit zu vermeiden.

## Output-Struktur (identisch zum Pilot)

```
docs/content-drafts/
├── sources/otto-xx.md, final-facts-xx.md, otto-critique-xx.md   (pro neues Land ergänzen)
├── be/ cz/ dk/ es/ fi/ gr/ ie/ nl/ no/ pl/ pt/ ro/ se/ gb/       (Block A)
├── ae/ sa/ il/                                                   (Block B)
└── cn/ jp/ kr/ my/ id/ th/ tw/ vn/                                (Block C)
```
Jeweils 6 Dateien: `general.json`, `spitex.json`, `spitaeler.json`, `security.json`, `hausdienste.json`, `logistik.json`.

## Nicht Teil dieses Handoffs

Kein Code, kein Routing, kein Commit/Push, keine Übersetzung, keine tatsächliche Ausführung — dieses Dokument ist ausschliesslich der Plan für eine andere/frische Session.
