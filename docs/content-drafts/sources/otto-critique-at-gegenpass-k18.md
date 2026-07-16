# Otto-Kritik-Runde: Gegenpass K18 — Österreich (AT)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-at`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist (siehe otto-critique-ch-gegenpass-k18.md) + Bitte um Prüfung von AT-Fachterminologie (SWÖ-KV, Schwerarbeitsregelung, Rufbereitschaft), Überversprechen, Tonkonsistenz.

## Diff (Localization/Content/de/land-at-spitex.json)

Drei neue Items: (1) `items`-Karte "Vorlauffrist nach SWÖ-KV einhalten" (Pain Point), (2) `solutions`-Karte "Nachtdienste als Ereignis-Zähler überwacht", (3) `solutions`-Karte "Publikationsfrist automatisch geprüft".

## Otto-Kritik

1. **"1. bzw. 14. des Vormonats" unpräzise für Spitex:** SWÖ-KV § 7 Abs. 5 unterscheidet stationär (1.) vs. mobiler Bereich/Spitex (ausschliesslich 14.). Da die Datei Spitex-spezifisch ist, sollte nur der 14. genannt werden.
2. **Terminologie "Veröffentlichung"/"Publikationsfrist" unüblich:** im österreichischen Arbeitsrecht/SWÖ-KV korrekt: "Dienstplanankündigung"/"Ankündigungsfrist".
3. **"Ereignis-Zähler" zu technisch/Entwickler-Jargon** für Marketing-Text; zudem verschweigt die Formulierung "warnt oder blockiert" das eigentliche Verkaufsargument (Vorgesetzten-Freigabe als Überschreib-Option), was das Feature härter wirken lässt als es ist.
4. **Doppelung/Stolpersatz** in Publikationsfrist-Text ("prüft... automatisch: Für Dienstpläne lässt sich... hinterlegen").

Alle vier Punkte fallen in Ottos Kernkompetenz (Landes-Terminologie/-Recht + Ton) und fordern keine neuen Feature-Behauptungen — sie präzisieren bzw. verdeutlichen bestehende Whitelist-Features (Publikations-Mindestvorlauf in Tagen, Ereignis-Zähler Nachtdienste mit warn/block + Vorgesetzten-Freigabe).

## Gesamturteil

**Otto: Freigabe unter Vorbehalt der 3 Korrekturen** (Frist-Präzision, AT-Terminologie, Ereignis-Zähler-Jargon + Freigabe-Feature sichtbar machen).

## Umsetzung

Alle 3 Kritikpunkte als berechtigt bewertet und umgesetzt (`land-at-spitex.json`):

1. „Vorlauffrist nach SWÖ-KV einhalten" → „Ankündigungsfrist nach SWÖ-KV einhalten"; Text auf „im mobilen Bereich bis spätestens zum 14. des Vormonats festgelegt" präzisiert (kein „1. bzw." mehr).
2. „Nachtdienste als Ereignis-Zähler überwacht" → „Nachtdienste erfassen und überwachen"; Text ergänzt um „Blockaden lassen sich mit dokumentierter Vorgesetzten-Freigabe überschreiben" (Freigabe-Feature jetzt sichtbar statt versteckt).
3. „Publikationsfrist automatisch geprüft" → „Ankündigungsfrist automatisch prüfen"; Text entdoppelt und „Dienstplanankündigung"/„gesetzliche SWÖ-Frist (14. des Vormonats)" verwendet.

Alle Änderungen bleiben innerhalb der Whitelist (Publikations-Mindestvorlauf in Tagen; Ereignis-Zähler Nachtdienste mit warn/block; Enforcement mit Vorgesetzten-Freigabe) — keine neuen Feature-Behauptungen.
