# Otto-Kritik-Runde: Gegenpass K18 — Griechenland (GR)

Mechanismus: `~/claude-otto-bridge/ask.sh`, Session `gegenpass-gr`, 2026-07-16.

Kontext an Otto: Backend-Feature-Whitelist (siehe otto-critique-ch-gegenpass-k18.md) + Bitte um Prüfung von GR-Fachterminologie (ERGANI, Sechstagewoche-Zuschlag, Gesetz 5239/2025), Überversprechen, Tonkonsistenz.

## Diff (3 Dateien: land-gr.json, land-gr-logistik.json, land-gr-security.json)

Sechstagewoche-Karten (alle 3 Dateien) um Ereignis-Zähler-Satz ("gearbeitete Tage pro Woche... warnt oder blockiert, sobald der 6. Arbeitstag erreicht wird") ergänzt; zusätzlich Nachtfenster-Satz (security) und Ausweis-Ablauf-Block-Satz (logistik, security).

## Otto-Kritik

- **(a) Terminologie:** durchgehend als fachlich fehlerfrei bewertet (40%/115%-Sechstagewoche-Zuschlag nach Gesetz 5053/2023, 8-Stunden-Deckel am 6. Tag, ERGANI Phase B ab 16.11.2026, konfigurierbares Nachtfenster als Match zum "Enforcement"-Feature).
- **(b) Überversprechen:** Hauptkritikpunkt: das nackte "warnt oder blockiert" beim Ereignis-Zähler (Sechstagewoche) klinge nach unumgehbarem Hardblock; Otto verlangt explizite Erwähnung der Vorgesetzten-Freigabe als Override, konsistent mit dem Enforcement-Whitelist-Feature. Gleiche Kritik äusserte Otto auch bei den "hart blockieren"-Sätzen für Führerschein-/Zertifikat-Ausweis-Ablauf (logistik, security).
- **(c) Tonkonsistenz:** als "Otto-konform, direkt, kompetent" bewertet.

## Gesamturteil

**Otto: "Exzellent mit minimalem Korrekturbedarf"** — Freigabe unter Einarbeitung der Vorgesetzten-Freigabe-Klarstellung.

## Umsetzung (mit Whitelist-Gegenprüfung)

**Umgesetzt:** Ereignis-Zähler/Sechstagewoche-Sätze (alle 3 Dateien) um "(Block mit dokumentierter Vorgesetzten-Freigabe überschreibbar)" ergänzt. Grund: "Ereignis-Zähler... Arbeitstage-pro-Woche mit warn/block" UND "Enforcement warn/block mit Vorgesetzten-Freigabe" stehen beide auf der Whitelist, und dieselbe Kombination (Ereignis-Zähler-Block + explizite Freigabe-Erwähnung) ist bereits in den bestehenden Gegenpass-Texten für CH (Nachtdienste-Zähler) und AT (Nachtdienste-Zähler) etabliert — konsistente Anwendung derselben Feature-Beschreibung.

**Abgelehnt:** Ottos Vorschlag, auch bei den "hart blockieren"-Sätzen für Ausweis-Ablauf (Führerschein-Klassen, Zertifikate) eine Vorgesetzten-Freigabe-Klausel zu ergänzen. Grund: "Ausweis-Ablauf-Block" ist auf der Whitelist ein **eigener, von der allgemeinen Enforcement-Freigabe getrennter** Punkt; die identische Formulierung ("auf Wunsch... hart blockieren", ohne Freigabe-Erwähnung) ist bereits in bestehenden, von Otto in früheren Runden freigegebenen Texten etabliert (z. B. `land-ch.json`/gb-security "Auf Wunsch blockiert Klacks die Zuweisung mit abgelaufenem Pflicht-Nachweis komplett", `land-de-logistik.json`/`land-de-security.json` Gegenpass-Sätze aus dieser Runde selbst — von Otto im DE-Durchgang ohne diesen Einwand freigegeben). Eine Freigabe-Klausel dort hinzuzufügen wäre eine unbestätigte Zusatzbehauptung — nicht umgesetzt, um Korpus-Konsistenz zu wahren und keine ungeprüfte Feature-Behauptung einzuführen.

## Geänderte Dateien
- `Localization/Content/de/land-gr.json`
- `Localization/Content/de/land-gr-logistik.json`
- `Localization/Content/de/land-gr-security.json`
