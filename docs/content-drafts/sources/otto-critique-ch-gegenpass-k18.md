# Otto-Kritik-Runde: Gegenpass K18 — Schweiz (CH)

Mechanismus: `~/claude-otto-bridge/ask.sh` (SSH-Bridge zu Otto/OpenClaw), Session `gegenpass-ch`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist (Enforcement warn/block mit Vorgesetzten-Freigabe, konfigurierbares Nachtfenster, Überstunden-Zuschlagsstaffeln, Zuschlags-Stapelung, Perioden-Caps/rollierende Schnitte, Ruhetag-Rotation, Ausweis-Ablauf-Block, Publikations-Mindestvorlauf, Ereignis-Zähler NUR Nachtdienste/Arbeitstage-pro-Woche/überlange Dienste mit warn/block, Fixbetrag-Zuschläge) + Bitte um Prüfung von Terminologie, Überversprechen, Tonkonsistenz.

## Diff (Localization/Content/de/land-ch.json)

Ein Fundpunkt: Feature-Karte "Ruhezeiten automatisch geplant" — Titel/Text von reiner Nachtzuschlag-Dokumentation auf Ereignis-Zähler (Nachtdienste, warn ab 25. Nacht, optionaler Hardblock mit Vorgesetzten-Freigabe) umgestellt.

## Otto-Kritik

- **(a) Terminologie:** fehlerfrei, CH-Orthografie korrekt (kein ß); Bezug auf Art. 15a ArG (11h-Ruhezeit) und Art. 17b Abs. 2 ArG (25. Nacht-Schwelle) juristisch präzise.
- **(b) Überversprechen:** keines gefunden. Titel-Wechsel "Nachtzuschlag dokumentiert" → "Nachtdienste gezählt" lenkt korrekt auf das tatsächliche Feature (Ereignis-Zähler statt Lohn-Berechnung). "auf Wunsch blockiert..." markiert Opt-in-Charakter klar. Abschlusssatz "Die gesetzliche Zeitgutschrift dokumentieren Sie selbst." zieht ehrliche Grenze (Klacks führt kein automatisches Zeitgutschrift-Konto).
- **(c) Tonkonsistenz:** nüchtern, unaufgeregt, konsistent mit bisherigen CH-Texten.

## Gesamturteil

**Otto: Vollständige Freigabe (GESAMT: einverstanden).** Keine Kritikpunkte.

## Umsetzung

Keine Änderungen nötig — Otto hat den Gegenpass-Text ohne Einwände freigegeben. `land-ch.json` bleibt wie im Working-Tree-Diff.
