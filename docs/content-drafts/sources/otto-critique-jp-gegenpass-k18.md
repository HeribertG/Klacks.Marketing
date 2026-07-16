# Otto-Kritik-Runde: Gegenpass K18 — Japan (JP)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-jp`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist + explizite Code-Fakten aus dem IT-Faktencheck (generisches Enforcement deckt NUR MaxDailyHours/MaxWeeklyHours/MinRestHours/MinRestDays/MaxConsecutiveDays/PeriodCap/RollingAverage/RestDayRotation/CounterRule ab; CounterRule NUR NightShift/WorkedDayInWeek/ShiftExceedingHours) + Bitte um Prüfung von JP-Fachterminologie (36協定, 2024-Problem, Ärzte-Niveaus A/B/C), Überversprechen, Tonkonsistenz.

## Diff (3 Dateien: land-jp.json, land-jp-logistik.json, land-jp-spitaeler.json)

Vier Fundstellen: 960h-Jahresgrenze (Logistik, "2024-Problem"), 960h/1.860h Ärzte-Limits (Spitäler), 36-Kyotei-Obergrenzen 45/360/720/100/80h (Basis), 60h-Monatsschwelle (Basis) — alle um "als Perioden-Obergrenze"/"live überwacht" + teils Block-Modus-Satz ergänzt.

## Otto-Kritik

- **(a) Terminologie:** durchgehend korrekt (2024-Problem = 960h-Jahresdeckel Lkw-Fahrer seit 1.4.2024; A/B/C-Niveau-Ärztereform April 2024; 36-Kyotei = Art.-36-Vereinbarung mit 45/360h-Grenze + Sonderklausel-Obergrenzen 720/100/80h; 50%-Zuschlag ab 61. Monatsüberstunde seit 2023 auch für KMU).
- **(b) Überversprechen:** Otto bewertet die 3 neuen Block-Claims (960h Logistik, 960h/1.860h Spitäler, 45/360/720/100/80h Basis) als technisch korrekt gedeckt durch `PeriodCap` bzw. `RollingAverage` (80h-Schnitt über 2-6 Monate). Einzige Anmerkung: der Satzteil "rechnet den 50%-Zuschlag korrekt" (60h-Monatsschwelle) stehe im Widerspruch zu den nur tages-/wochenbasierten Zuschlagsstaffeln — Otto stellt aber selbst klar, dass dieser Satzteil **bereits in der Alt-Version** stand, also kein neuer Gegenpass-Claim ist.
- **(c) Tonkonsistenz:** sachlich, fachlich tief, keine Übertreibung.

## Gesamturteil

**Otto: "fachlich exzellent", Block-Zusagen "technisch zu 100% gedeckt"** (PeriodCap/RollingAverage bestätigt) — einzige Anmerkung betrifft eine pre-existing, nicht geänderte Textstelle.

## Umsetzung

Keine Änderung nötig. Alle 3 neuen Gegenpass-Block-Claims sind gegen den Code-Faktencheck (ComplianceRuleNames: PeriodCap, RollingAverage) verifiziert und korrekt.

Ottos Anmerkung zum 50%-Zuschlag-Satzteil in `land-jp.json` betrifft **pre-existing, unveränderten** Text (von Otto selbst bestätigt: "kein neu hinzugefügtes Überversprechen") — nicht Teil des Gegenpasses. Per Task-Vorgabe nicht umgesetzt, als offener Folgepunkt vermerkt (analog zu den GB/DE-Funden).
