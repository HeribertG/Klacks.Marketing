# Otto-Kritik-Runde: Gegenpass K18 — Israel (IL)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-il`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist + Code-Fakten (generisches Enforcement NUR MaxDailyHours/MaxWeeklyHours/MinRestHours/MinRestDays/MaxConsecutiveDays/PeriodCap/RollingAverage/RestDayRotation/CounterRule; KEINE Fahrzeit-spezifische Regel) + explizite Warnung vor dem Regulation-168-Lenkzeit-Fall (Analogie zu VO 561/2006) + Bitte um Prüfung von IL-Fachterminologie (Regulation 168, Toranut, Globalvertrag, Sabbat-Wochenruhe), Überversprechen, Tonkonsistenz.

## Diff (5 Dateien: land-il.json, land-il-logistik.json, land-il-security.json, land-il-spitaeler.json, land-il-spitex.json)

8 Fundstellen: Lenkzeit Regulation 168, Vorruhe/Wochenruhe (Logistik); 8h-Ruhe, Nachtschicht-Zuschlag (Security, konfigurierbares Nachtfenster), neues Item "Pflichtnachweise" (Ausweis-Ablauf-Block); Toranut-Grenze (Spitäler); 25h-Wochenruhe (Spitex); 36h-Sabbat-Wochenruhe (Basis).

## Otto-Kritik

- **(a) Terminologie:** durchgehend als fachlich exzellent bewertet (Regulation 168, Toranut/תורנות als Bereitschaftsdienst-Fachbegriff, Globalvertrag für Live-In-Pflege, Sabbat-Wochenruhe-Regelung).
- **(b) Überversprechen:** 7 von 8 Fundstellen als "technisch gedeckt" bewertet (Wochenruhe/Vorruhe/8h-Ruhe/25h-Wochenruhe/36h-Wochenruhe → `MinRestHours`/`MinRestDays`; Toranut-Grenze → `MaxDailyHours`; Nachtfenster-Konfigurierbarkeit → Whitelist-Feature; Pflichtnachweise → Ausweis-Ablauf-Block). **Eine Fundstelle als klares Überversprechen identifiziert:** "Lenkzeit nach Regulation 168" — die 12h/24h- und 68h/7-Tage-Grenzen sind reine **Fahrzeit**-Grenzen (Driving-Time); dafür existiert keine Backend-Regel (nur generische Gesamtarbeitszeit-Regeln `MaxDailyHours`/`MaxWeeklyHours`, die Fahr- von Nicht-Fahrzeit nicht unterscheiden können).
- **(c) Tonkonsistenz:** durchgehend "nüchtern, präzise, professionell".

## Gesamturteil

**Otto: "Sehr gutes, hochgradig professionelles Update" mit einem kritischen To-Do** (Lenkzeit-Fahrzeit-Claim entschärfen).

## Umsetzung

**Umgesetzt (1 Fund, echtes Überversprechen ohne Backend-Deckung — bestätigt durch Code-Faktencheck aus der IT-Runde):**
- `land-il-logistik.json`: Satz "Auf Wunsch blockiert Klacks die Überschreitung hart" (bezogen auf die Regulation-168-Fahrzeit-Grenzen) umformuliert zu Ottos Vorschlag: "Auf Wunsch blockiert Klacks die Zuweisung von Schichten, welche die maximalen täglichen und wöchentlichen Gesamteinsatzzeiten überschreiten" — mappt jetzt korrekt auf `MaxDailyHours`/`MaxWeeklyHours` (Gesamteinsatzzeit) statt eine nicht existierende Fahrzeit-Regel zu behaupten.

**Keine Änderung nötig (7 Funde, gegen Code-Map verifiziert grounded):** Wochenruhe/Vorruhe, 8h-Ruhe, Nachtfenster, Pflichtnachweise, Toranut-Grenze, 25h-Wochenruhe, 36h-Sabbat-Wochenruhe.

## Geänderte Dateien
- `Localization/Content/de/land-il-logistik.json`
