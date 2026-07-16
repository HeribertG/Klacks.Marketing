# Otto-Kritik-Runde: Gegenpass K18 — Deutschland (DE)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-de`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist (siehe otto-critique-ch-gegenpass-k18.md) + Bitte um Prüfung von deutscher Fachterminologie (ArbZG, GewO, VO 561/2006), Überversprechen, Tonkonsistenz.

## Diff (4 Dateien)

- `land-de-logistik.json`: Lenk-/Ruhezeiten-Karte + Führerschein-Klassen-Karte — beide um Opt-in-Blockmodus-Satz ("Auf Wunsch blockiert Klacks... dokumentierter Vorgesetzten-Freigabe") bzw. Ausweis-Ablauf-Block-Satz ergänzt.
- `land-de-security.json`: Bewacherregister/Sachkunde-Karte — Ausweis-Ablauf-Block-Satz ergänzt.
- `land-de-spitaeler.json`: Ruhezeiten-Karte — Opt-in-Blockmodus-Satz ergänzt.
- `land-de.json`: ArbZG-Ruhezeiten-Karte — Opt-in-Blockmodus-Satz ergänzt.

## Otto-Kritik

- **(a) Terminologie:** Für alle 5 Fundstellen als fachlich korrekt bewertet (ArbZG §§3/5/6/7, GewO §§11b/34a). Eine Anmerkung: im VO-561/2006-Kontext (land-de-logistik.json) sei „Tageshöchstarbeitszeit-Grenzen" unpräzise, korrekter wäre „Tageslenkzeit-Grenzen" (Art. 6 regelt Lenkzeiten, nicht Arbeitszeit).
- **(b) Überversprechen:** keines gefunden. Alle neuen Block-Modus-Sätze durch „Auf Wunsch" / „lässt sich... auf Wunsch hart blockieren" klar als Opt-in markiert; „nur mit dokumentierter Vorgesetzten-Freigabe" entspricht exakt dem Enforcement-Feature.
- **(c) Tonkonsistenz:** durchgehend sachlich, konsistent mit bestehenden DE-Texten.

## Gesamturteil

**Otto: Freigabe empfohlen** ("Sehr starker und präziser Diff. Die Anpassungen können so übernommen werden.").

## Umsetzung

Otto's Terminologie-Anmerkung zu „Tageshöchstarbeitszeit-Grenzen" betrifft eine **pre-existing, unveränderte** Textstelle in `land-de-logistik.json` (Wortlaut steht identisch in Alt- und Neu-Zeile des Diffs — nicht Teil des Gegenpasses). Per Task-Vorgabe (nur an Gegenpass-Stellen ändern, nichts anderes anfassen) **nicht umgesetzt** — als offener Folgepunkt für eine spätere, separate Redaktionsrunde vermerkt.

### Nachtrag (Faktencheck während der IT-Runde, gleicher Sessionlauf)

Bei der Otto-Kritik-Runde für Italien wurde der Backend-Code geprüft (`ComplianceRuleNames.cs`, `ComplianceEnforcementResolver.cs`, `CounterEventType.cs`): das generische Enforcement-Feature deckt 9 konkrete Regeltypen ab (u. a. `MinRestHours`, `MaxDailyHours`), aber **keine Lenkzeit-spezifische Regel** (VO 561/2006 Art. 6 regelt Fahrzeit, nicht Ruhezeit oder allgemeine Arbeitszeit). Der in dieser DE-Runde freigegebene Satz „Auf Wunsch blockiert Klacks Verstöße gegen diese Grenzen konsequent" in `land-de-logistik.json` bezog sich auf „Ruhezeit- und Tageshöchstarbeitszeit-Grenzen, angelehnt an Art. 6 und 7 der VO 561/2006" — d. h. er implizierte auch eine Blockierung von Lenkzeit-Verstößen, für die es keine Backend-Regel gibt. Otto hatte dies in der DE-Runde nicht erkannt (selbst-widersprüchlich: in der IT-Runde flaggte Otto denselben Satztyp fälschlich komplett, hier aber gar nicht).

**Korrektur nachträglich umgesetzt:** Der Gegenpass-Satz in `land-de-logistik.json` wurde auf „Auf Wunsch blockiert Klacks **Ruhezeit**-Verstöße konsequent..." verengt (vorher: „...Verstöße gegen diese Grenzen..."), um keine Lenkzeit-Blockierung mehr zu implizieren. Die pre-existing Terminologie-Stelle („Tageshöchstarbeitszeit-Grenzen") bleibt unverändert (weiterhin ausserhalb Gegenpass-Scope).
