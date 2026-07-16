# Otto-Kritik-Runde: Gegenpass K18 — Grossbritannien (GB)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-gb`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist (siehe otto-critique-ch-gegenpass-k18.md) + Bitte um Prüfung von UK-Terminologie, Überversprechen, Tonkonsistenz.

## Diff (Localization/Content/de/land-gb-security.json)

Feature-Karte "Nachtarbeiter automatisch erkannt" → "Nachtdienste automatisch gezählt": Text von reiner Rechtsstatus-Erkennung ("Night Worker" nach Working Time Regulations) auf Ereignis-Zähler mit konfigurierbarer Schwelle + Warnung umgestellt.

## Otto-Kritik

- **(a) UK-Terminologie:** korrekt — Working Time Regulations, Night-Worker-Schwellenlogik, gesetzlicher Gesundheitscheck (health assessment) fachlich richtig verknüpft.
- **(b) Überversprechen:** Otto bewertet die Änderung ausdrücklich als Korrektur eines vorherigen Überversprechens ("erkennt automatisch, wer als Night Worker gilt" implizierte eine Rechtsstatus-Bewertung, die Klacks nicht leistet). Die neue Formulierung ("zählt... warnt, sobald hinterlegte Schwelle erreicht ist") entspricht exakt dem Ereignis-Zähler-Feature (warn, konfigurierbare Schwelle).
- **(c) Tonkonsistenz:** sachlich, keine werbliche Übertreibung.
- **Zusatzfund (aus Scope):** Otto wies auf eine inkonsistente, unveränderte Zeile im selben File hin (`example.text`, Zeile 36: "Klacks erkennt Nachtarbeiter automatisch..."), die denselben veralteten Claim ausserhalb des Gegenpass-Diffs enthält.

## Gesamturteil

**Otto: Freigabe empfohlen.** Keine Einwände gegen die Gegenpass-Änderung selbst.

## Umsetzung

Keine Änderung an der Gegenpass-Stelle nötig — von Otto ohne Einwand freigegeben.

Der Zusatzfund (Zeile 36, `example.text`) liegt **ausserhalb** des Gegenpass-Diffs dieser Runde (Task-Vorgabe: nur an den Gegenpass-Stellen ändern, nichts anderes anfassen). Nicht umgesetzt — als offener Folgepunkt für eine spätere, separate Konsistenz-Runde vermerkt.
