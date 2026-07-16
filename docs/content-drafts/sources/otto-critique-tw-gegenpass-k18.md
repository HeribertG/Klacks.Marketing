# Otto-Kritik-Runde: Gegenpass K18 — Taiwan (TW)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-tw`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist + Code-Fakten (generisches Enforcement NUR MaxDailyHours/MaxWeeklyHours/MinRestHours/MinRestDays/MaxConsecutiveDays/PeriodCap/RollingAverage/RestDayRotation/CounterRule; Ausweis-Ablauf-Block separates Feature ohne bestätigte Freigabe-Option) + Bitte um Prüfung von TW-Fachterminologie (LSA-Paragraphen, 例假/休息日/加倍, PDPA), Überversprechen, Tonkonsistenz — mit explizitem Hinweis auf einen vermuteten Ton-/Konsistenzbruch in `land-tw.json`.

## Diff (5 Dateien: land-tw.json, land-tw-logistik.json, land-tw-security.json, land-tw-spitaeler.json, land-tw-spitex.json)

6 Fundstellen: Ausweis-Ablauf-Block (logistik, security ×2 inkl. Zertifikate), Schichtabstand-Block (security, spitaeler, land-tw.json), freie-Tage-Block (spitex, land-tw.json).

## Otto-Kritik

- **(a) Terminologie:** durchgehend "fachlich und rechtlich absolut korrekt" (LSA-Paragraphen, 例假/休息日/加倍-Unterscheidung, PDPA).
- **(b) Überversprechen:** alle Block-Claims technisch gedeckt — Schichtabstand/freie-Tage-Claims via `MinRestHours`/`MinRestDays`/`MaxConsecutiveDays`/`PeriodCap` (mit Vorgesetzten-Freigabe), Ausweis-Ablauf-Block korrekt OHNE Freigabe-Erwähnung (separates Feature, kein bestätigter Override).
- **(c) Tonkonsistenz:** ein Bruch gefunden — `land-tw.json`, Fundstelle "Vier-Wochen-Flex & 12-Tage-Grenze": Satz endete mit "...blockiert Klacks einen Verstoß gegen die freien Tage **hart**." (ohne Freigabe-Erwähnung), inkonsistent zum identischen Feature-Typ in `land-tw-spitex.json`, der korrekt die Vorgesetzten-Freigabe nennt.

## Gesamturteil

**Otto: "Sehr gut vorbereiteter Entwurf mit minimalem Korrekturbedarf"** — einzige Korrektur: Ton-/Konsistenzangleichung in `land-tw.json`.

## Umsetzung

**Umgesetzt (1 Fund, Ton-/Konsistenzkorrektur, keine neue Feature-Behauptung):**
- `land-tw.json`: Satz "Auf Wunsch blockiert Klacks einen Verstoß gegen die freien Tage hart." ersetzt durch "Auf Wunsch blockiert Klacks einen Verstoß gegen die freien Tage konsequent: Im Block-Modus lässt sich ein neuer Verstoß nur mit dokumentierter Vorgesetzten-Freigabe speichern (pro Regelart konfigurierbar)." — angeglichen an die identische Formulierung in `land-tw-spitex.json` (gleicher Feature-Typ: MinRestDays/MaxConsecutiveDays/PeriodCap).

**Keine Änderung nötig (5 weitere Funde, gegen Code-Map verifiziert grounded):** Ausweis-Ablauf-Block (logistik, security ×2), Schichtabstand-Block (security, spitaeler, land-tw.json Schichtabstand-Satz).

## Geänderte Dateien
- `Localization/Content/de/land-tw.json`
