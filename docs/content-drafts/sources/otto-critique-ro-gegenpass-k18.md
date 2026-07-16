# Otto-Kritik-Runde: Gegenpass K18 — Rumänien (RO)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-ro`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist + Code-Fakten (generisches Enforcement NUR MaxDailyHours/MaxWeeklyHours/MinRestHours/MinRestDays/MaxConsecutiveDays/PeriodCap/RollingAverage/RestDayRotation/CounterRule; KEINE Regel für Vertragsklausel-Prüfungen) + explizite Warnung vor dem "Teilzeit-Überstunden"-Fall (land-ro-spitex.json) + Bitte um Prüfung von RO-Fachterminologie (ICCJ Nr. 415/2025, Codul Muncii, 35h-Ärzte-Woche), Überversprechen, Tonkonsistenz.

## Diff (4 Dateien: land-ro.json, land-ro-security.json, land-ro-spitaeler.json, land-ro-spitex.json)

4 Fundstellen: 12h-Schicht/24h-Ruhe (Security), 35h-Ärzte-Woche (Spitäler), Teilzeit-Überstunden (Spitex), Wochenruhe/ICCJ-Zuschlag (Basis) — alle um Block-Modus-Sätze ergänzt.

## Otto-Kritik

- **land-ro-security.json:** "Grünes Licht" — 12h-Grenze/24h-Ruhezeit korrekt nach Art. 115 Abs. 2 Codul Muncii, backend-gedeckt (`MaxDailyHours`/`MinRestHours`).
- **land-ro-spitaeler.json:** "Gelbes Licht" — Block-Claim backend-gedeckt (`MaxWeeklyHours`), aber Otto bemängelt die (pre-existing) Formulierung "tariflich vereinbarte 35-Stunden-Woche" — die 35h-Woche für Ärzte an öffentlichen Einrichtungen sei gesetzlich (Ordinul Ministrului Sănătății nr. 870/2004), nicht tariflich vorgeschrieben.
- **land-ro-spitex.json:** "Rotes Licht" — doppeltes Problem: (1) Überstunden für Teilzeitkräfte sind nach Art. 105 Abs. 1 lit. c Codul Muncii **grundsätzlich verboten**, keine Vertragsklausel kann das legalisieren (pre-existing Textfehler); (2) der neue Block-Claim ("blockiert Klacks eine solche Zuteilung") behauptet eine vertragsklausel-basierte Prüfung, für die es keine Backend-Regel gibt — echtes Überversprechen.
- **land-ro.json:** "Gelbes/Rotes Licht" — Block-Claim selbst backend-gedeckt (`MinRestDays`/`RestDayRotation`/`MaxConsecutiveDays`), aber Otto bemängelt die (pre-existing) Kopplung "Ruhezeit nicht an Sa/So" mit "150%-Zuschlag nach ICCJ 415/2025" als rechtlich falsch — der Zuschlag gilt laut Otto nur beim Sonderfall kumulierter Ruhezeit nach bis zu 14 Tagen Dauerarbeit, nicht bei einfacher Verschiebung auf andere Wochentage.
- **(c) Tonkonsistenz:** durchgehend sachlich bewertet.

## Gesamturteil

Otto: gemischt — 1× Freigabe, 2× Anmerkung zu pre-existing Text, 1× echtes Überversprechen im neuen Gegenpass-Satz.

## Umsetzung

**Umgesetzt (1 Fund, echtes Überversprechen im Gegenpass-Zusatz):**
- `land-ro-spitex.json`: neuer Satz "Auf Wunsch blockiert Klacks eine solche Zuteilung konsequent..." (bezog sich auf eine nicht existierende Vertragsklausel-Prüfung) umformuliert zu "Auf Wunsch blockiert Klacks das Überschreiten der vertraglich vereinbarten Teilzeit-Wochenstunden konsequent..." — mappt jetzt korrekt auf `MaxWeeklyHours`.

**Keine Änderung nötig (Gegenpass-Zusätze selbst backend-gedeckt):** `land-ro-security.json` (unverändert), `land-ro-spitaeler.json` (Block-Satz bleibt, nur pre-existing Terminologie betroffen), `land-ro.json` (Block-Satz bleibt, nur pre-existing ICCJ-Kopplung betroffen).

**Nicht umgesetzt (pre-existing, ausserhalb Gegenpass-Scope — als Folgepunkte vermerkt):**
1. `land-ro-spitaeler.json`: "tariflich vereinbarte" → laut Otto sollte es "gesetzlich vorgeschriebene" 35-Stunden-Woche heissen (Wortlaut steht identisch in Alt-/Neu-Zeile, nicht Teil des Gegenpasses).
2. `land-ro-spitex.json`: "ohne entsprechende Vertragsklausel" — laut Otto rechtlich falsch (Überstunden bei Teilzeit sind in RO grundsätzlich verboten, keine Klausel kann das legalisieren); pre-existing, nicht Teil des Gegenpasses. **Hinweis: potenziell gravierender, eigenständiger Rechts-Fehler — für eine separate Redaktionsrunde empfohlen, unabhängig von K18.**
3. `land-ro.json`: Kopplung "Ruhezeit nicht an Sa/So" mit "150%-Zuschlag nach ICCJ 415/2025" — laut Otto rechtlich ungenau (Zuschlag gilt nur beim Sonderfall kumulierter Ruhezeit); pre-existing, nicht Teil des Gegenpasses.

## Geänderte Dateien
- `Localization/Content/de/land-ro-spitex.json`
