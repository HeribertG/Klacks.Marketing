# Otto-Kritik-Runde: Gegenpass K18 — China (CN)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-cn`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist + Code-Fakten (PeriodCap Teil des generischen Enforcement warn/block+Vorgesetzten-Freigabe; Zuschlags-Stapelung separates bestätigtes Feature) + Bitte um Prüfung von CN-Fachterminologie (加班/jiābān, 值班/zhíbān, Art. 41/44 Arbeitsgesetz, MOHRSS, PIPL Art. 38), Überversprechen, Tonkonsistenz.

## Diff (3 Dateien: land-cn.json, land-cn-security.json, land-cn-spitaeler.json)

4 Fundstellen: Zuschlags-Stapelung (security, spitaeler, land-cn.json Payments-Item) + Perioden-Cap-Block für die 36h-Monatsgrenze (land-cn.json Schedule-Item).

## Otto-Kritik

- **(a) Terminologie:** durchgehend "arbeitsrechtlich exakt" bewertet (Art. 44 Nr. 1/3 Arbeitsgesetz für 150%/300%-Zuschlag, 值班 vs. 加班-Abgrenzung, Art. 41 Tagesgrenzen 1h/3h, "ohne Freizeitausgleich" bei Feiertagszuschlag juristisch korrekt).
- **(b) Überversprechen:** keines gefunden. Zuschlags-Stapelung (kumulativ/höchster Satz) und PeriodCap-Block (36h-Monatsgrenze, Vorgesetzten-Freigabe, pro Regelart konfigurierbar) beide "eins zu eins" mit dem Backend-Feature-Set übereinstimmend bewertet.
- **(c) Tonkonsistenz:** durchgehend "sachlich, nüchtern, kein Hype".
- Otto bestätigte zusätzlich als Querprüfung die unveränderten MOHRSS-165,3h- und PIPL-Art.-38-Kontextzeilen als korrekt.

## Gesamturteil

**Otto: "Uneingeschränkte Freigabe zum PR-Review."**

## Umsetzung

Keine Änderung nötig — alle 4 Fundstellen von Otto ohne Einwand freigegeben und gegen die Code-Map (PeriodCap, Zuschlags-Stapelung) verifiziert grounded.
