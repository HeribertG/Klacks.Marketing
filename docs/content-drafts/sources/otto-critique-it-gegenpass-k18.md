# Otto-Kritik-Runde: Gegenpass K18 — Italien (IT)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-it`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist (siehe otto-critique-ch-gegenpass-k18.md) + Bitte um Prüfung von IT-Fachterminologie (CCNL-Varianten, D.Lgs. 66/2003, Reperibilità, Statuto dei Lavoratori), Überversprechen, Tonkonsistenz.

## Diff (6 Dateien: land-it.json, land-it-hausdienste.json, land-it-logistik.json, land-it-security.json, land-it-spitaeler.json, land-it-spitex.json)

Mehrere Karten um Enforcement-Block-Modus-Sätze ("Auf Wunsch blockiert Klacks Verstöße... Vorgesetzten-Freigabe, pro Regelart konfigurierbar") sowie Ausweis-Ablauf-Block-Sätze ("hart blockieren") ergänzt; hausdienste zusätzlich um einen "dritter Arbeitsblock blockieren"-Satz.

## Otto-Kritik

- **(a) Terminologie:** durchgehend "Note 1" — CCNL-Artikel (Art. 30 Pulizia, Art. 72 Vigilanza, Art. 58 Coop Sociali), Legge 161/2014, D.Lgs. 66/2003 Art. 7/9 alle korrekt zitiert.
- **(b) Überversprechen:** Otto behauptet, das generelle "Enforcement warn/block mit Vorgesetzten-Freigabe" sei NUR auf die 3 Ereignis-Zähler-Kategorien (Nachtdienste/Arbeitstage-pro-Woche/überlange Dienste) plus Ausweis-Ablauf-Block beschränkt, und alle generischen Block-Modus-Sätze für Ruhezeiten/Lenkzeiten/Normalarbeitszeit seien Überversprechen. Zusätzlich flaggt Otto den neuen "dritter Arbeitsblock"-Blockierungssatz in hausdienste.
- **(c) Tonkonsistenz:** gut, ausser "hart blockieren" bei Ausweisen (Otto möchte dort auch Freigabe-Erwähnung).

## Gesamturteil

Otto: **"Mangelhaft (Korrektur zwingend erforderlich)"** bei (b) — mit der Behauptung, fast alle Block-Modus-Sätze müssten entfernt/eingeschränkt werden.

## Faktencheck gegen Backend-Code (VOR Umsetzung, da Otto bei Selbstauskünften unzuverlässig ist)

Otto's Kernbehauptung wurde gegen den tatsächlichen Backend-Code geprüft (nicht blind übernommen):

- `Klacks.Api/Domain/Constants/ComplianceRuleNames.cs`: 9 Regeltypen mit generischem, **pro-Regel konfigurierbarem** Enforcement — `MaxDailyHours`, `MaxWeeklyHours`, `MinRestHours`, `MinRestDays`, `MaxConsecutiveDays`, `PeriodCap`, `RollingAverage`, `RestDayRotation`, `CounterRule`.
- `Klacks.Api/Infrastructure/Services/Schedules/ComplianceEnforcementResolver.cs`: jede dieser 9 Regeln liest einen eigenen `COMPLIANCE_ENFORCEMENT_<RULE>`-Setting (Warn/Block) + globales `IsSupervisorOverrideAllowedAsync()`.
- `Klacks.Api/Domain/Enums/CounterEventType.cs`: bestätigt, dass NUR die 3 Ereignis-Zähler-Typen (NightShift, WorkedDayInWeek, ShiftExceedingHours) existieren — deckt sich mit der Whitelist-Einschränkung "Ereignis-Zähler NUR...".

**Ergebnis:** Otto's Kernbehauptung (generelles Block-Modus nur für 3 Ereignis-Zähler + Ausweis-Ablauf) ist **widerlegt** — das generische Enforcement-Feature (Ruhezeit, Höchstarbeitszeit, Wochenarbeitszeit etc., "pro Regelart konfigurierbar") ist real und deckt die betroffenen Sätze (Ruhezeiten, Wochenruhe, Höchstarbeitszeit, 38h-Woche) ab. Zusätzlich: Otto hatte exakt dieselbe Satzformulierung im DE-Durchgang (`land-de.json`, `land-de-spitaeler.json`, `land-de-logistik.json`) bereits vorbehaltlos freigegeben — die IT-Kritik widerspricht der eigenen DE-Bewertung.

**Zwei Otto-Kritiken waren jedoch im Kern korrekt (bei falscher Gesamt-Begründung):**
1. Der neue Satz in `land-it-hausdienste.json` ("Auf Wunsch blockiert Klacks einen dritten Arbeitsblock direkt beim Speichern") behauptet eine Block-Funktion für "Anzahl Arbeitsblöcke pro Tag" (Splitting-Dienst-Grenze) — dafür existiert **weder** unter den 9 ComplianceRuleNames **noch** unter den 3 CounterEventType-Typen eine Regel. Echtes Überversprechen.
2. Der Satz in `land-it-logistik.json` ("Lenk- & Ruhezeiten automatisch geprüft" ... "blockiert Klacks Verstöße gegen diese Grenzen") bezieht sich auf eine Karte, die explizit **Lenkzeiten** (Fahrzeit) mit einschliesst. Für Lenkzeit-Verstöße existiert **keine** der 9 ComplianceRuleNames-Regeln (nur Ruhezeit/Arbeitszeit-Regeln, keine Fahrzeit-Regel) — die generische Blockierungs-Aussage würde hier fälschlich auch Lenkzeit-Enforcement implizieren.

## Umsetzung

**Umgesetzt (2 Funde, echtes Überversprechen ohne Backend-Deckung):**
- `land-it-hausdienste.json`: Satz "Auf Wunsch blockiert Klacks einen dritten Arbeitsblock direkt beim Speichern, statt nur zu warnen." entfernt (kein Backend-Feature für Arbeitsblock-Anzahl-Enforcement vorhanden) — Zeile zurück auf die ursprüngliche (Warn-only/Sichtbarkeits-) Formulierung.
- `land-it-logistik.json`: Gegenpass-Satz von "Auf Wunsch blockiert Klacks Verstöße gegen diese Grenzen konsequent..." auf "Auf Wunsch blockiert Klacks **Ruhezeit**-Verstöße konsequent..." verengt — Block-Claim auf den Ruhezeit-Anteil beschränkt (Backend-gedeckt via `MinRestHours`/`MinRestDays`), Lenkzeit-Anteil bleibt bei reiner Sichtbarkeit/Warnung (wie im pre-existing Text).

**Rückwirkende Korrektur (gleicher Fund) auch in der DE-Runde nachgetragen:** `land-de-logistik.json` hatte denselben VO-561/2006-Lenkzeit-Block-Claim, den Otto in der DE-Runde nicht erkannt hatte — dort ebenfalls auf "Ruhezeit-Verstöße" verengt. Siehe Nachtrag in `otto-critique-de-gegenpass-k18.md`.

**Abgelehnt (durch Faktencheck widerlegt):**
- Otto's Forderung, die generischen "Auf Wunsch blockiert Klacks Verstöße... Vorgesetzten-Freigabe, pro Regelart konfigurierbar"-Sätze in `land-it.json`, `land-it-logistik.json`, `land-it-security.json`, `land-it-spitaeler.json`, `land-it-spitex.json` zu entfernen/einzuschränken — durch `ComplianceRuleNames.cs`/`ComplianceEnforcementResolver.cs` widerlegt (generisches Enforcement deckt Ruhezeit-/Arbeitszeitregeln ab) und im Widerspruch zu Ottos eigener Freigabe identischer Sätze im DE-Durchgang.
- Otto's Forderung, bei "hart blockieren" (Ausweis-Ablauf-Block, logistik + spitaeler + spitex) eine Vorgesetzten-Freigabe-Klausel zu ergänzen — Ausweis-Ablauf-Block ist auf der Whitelist ein von der generischen Enforcement getrennter Punkt; kein Beleg im Code für eine Freigabe-Override-Option bei Qualifikations-Ablauf (`QualificationValidationKeys.cs` zeigt reine Expired/ExpiringSoon-Logik ohne Override-Pfad). Konsistent mit der GR-Runde nicht umgesetzt.

## Geänderte Dateien
- `Localization/Content/de/land-it-logistik.json` (Lenkzeit-Block-Claim auf "Ruhezeit-Verstöße" verengt)
- `Localization/Content/de/land-it-hausdienste.json`: Gegenpass-Zusatz vollständig entfernt (kein Backend-Feature) — Datei dadurch **byte-identisch mit dem Commit-Stand**, taucht in `git diff`/`git status` nicht mehr als geändert auf (Netto-Null-Änderung gegenüber Baseline, kein Fund einer "geänderten Datei" mehr).
