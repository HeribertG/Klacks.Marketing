# IT — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md` / `klacks-capabilities.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.
>
> **Quellenlage:** Nur die General-Seite (`land-it.json`) existiert für IT. Die 5 Branchen-Subseiten (spitex, spitaeler, security, hausdienste, logistik) sind für IT nicht angelegt — keine Bewertung möglich, bis die Seiten erstellt wurden. Diese Datei enthält daher nur den General-Abschnitt.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 11 Stunden Riposo giornaliero garantiert (Art. 7 D.Lgs. 66/2003) | Regel-Engine — `MinRestHours` (Ruhezeit zwischen Schichten) | ✅ | Ruhezeit-Grenzwert konfigurierbar und wird geprüft; voll gedeckt wie bei anderen Ländern (vgl. PL "Ruhezeiten automatisch geprüft"). |
| Reperibilità-Tracking mit **automatischem** 3-Tage-Ausgleich der ausgesetzten Ruhezeit | Live-Compliance-Warnungen (`ScheduleValidationBuilder`, `TargetHoursDriftDetector`) | ⚠️ | Klacks **erkennt/warnt** bei Ruhezeit-Verstössen (live + Pre-Commit + Periodenabschluss), aber es gibt **keinen belegten Mechanismus, der eine Ausgleichsruhezeit automatisch innerhalb einer 3-Tage-Frist einplant**. Der einzige Drift-Detector vergleicht gegen `GuaranteedHours` (Soll-Stunden, Schwelle hardcoded 12h), nicht gegen eine gesetzliche Ausgleichsfrist. Analog zu PL "Ausgleichsruhezeit automatisch eingeplant" (⚠️) und PL "14-Tage-Ausgleichsfrist im Blick" (⚠️) — Formulierung von "plant automatisch ein" auf "erkennt und macht den Verstoss sichtbar" abschwächen. |
| Recovery-Engine: fällt eine Fachkraft aus, findet Klacks sofort qualifizierten Ersatz, **ohne** dass eine Ruhezeit-Verletzung entsteht | Autofill/GA — `MinPauseHours` als Stage-0-Hard-Veto | ✅ | Für GA-generierte Zuweisungen korrekt: `MinPauseHours` ist ein harter Veto in Stage 0, der Optimizer schlägt keine ruhezeitverletzende Ersatzbesetzung vor. Gilt für den Autofill-Pfad; manuelle Nachbearbeitung wird nur gewarnt, nicht blockiert (an dieser Stelle nicht das beworbene Szenario). |
| Autofill-Wizard plant Reperibilità-Rotationen unter Einhaltung der 11h-Ruhezeit automatisch mit ein | Autofill/GA — `MinPauseHours` als Stage-0-Hard-Veto | ✅ | Deckt sich mit der GA-Constraint-Ebene (Bereich 4a der Inventur); voll gedeckt für den Autofill-Pfad. |
| Qualifikationsgenaue Einsatzplanung — nur passende Qualifikation wird vorgeschlagen | Qualifikations-Matching (exakt) + Missing-Mandatory-Veto | ⚠️ | Fehlende Pflicht-Qualifikation blockiert die Zuteilung (Veto) ✅; aber eine **abgelaufene** Pflicht-Qualifikation blockiert laut Inventur NICHT ("Zertifikat gerade abgelaufen" wird nur gemeldet) — "nur passende Qualifikation" ist bei Ablaufdatum nicht ganz zutreffend. Kein Fuzzy-Matching. |
| On-Premise-Souveränität — volle Kontrolle über Dienstpläne, Ruhezeit-Nachweise, Protokolle in eigener IT-Umgebung | On-Premise/Self-Hosting-Stack | ✅ | Voll gedeckt (kompletter Docker-Stack, DB + Dateien lokal). |
| Freie LLM-Architektur — auch lokal gehostete Sprachmodelle, keine Daten an externe APIs | Keyless lokales LLM (Ollama/LM Studio) | ⚠️ | Technisch vorhanden und funktionsfähig ✅; aber **Default-LLM-Provider sind Cloud** (OpenAI/Anthropic/Google/DeepSeek `is_enabled=true`) — ohne bewusste Umstellung auf Ollama/LM Studio telefoniert Klacksy in die Cloud. Formulierung "lässt sich betreiben" ist korrekt, "ohne dass Daten abfliessen" gilt nur nach Opt-in-Konfiguration. |
| Auditierbarer Quellcode — vollständig einsehbare Codebasis für IT-Audits und Gewerkschaften | Open-Source-Charakter der Codebasis | ✅ | Faktische Lizenz-/Verfügbarkeitsaussage, nicht Teil der Capability-Inventur, aber durch das reale Repo gedeckt. |
| Klacksy: integrierter Assistent, Dienstzeiten/Schichttausch/Qualifikations-Konflikte per Chat, Vorschläge passend zu Qualifikation & Ruhezeit | Klacksy (Skills, Regelsystem) | ⚠️ | Klacksy selbst voll gedeckt (250 Skills, Rezept-Engine, Chat) ✅; die Aussage "Vorschläge passen zu ... Ruhezeit-Vorgaben" erbt aber dieselbe Einschränkung wie oben — Ruhezeit ist eine Warnung, keine harte Sperre ausserhalb des GA-Pfads. |

## Häusliche Pflege (spitex)
*Seite existiert für IT nicht — Bewertung ausstehend, bis die Seite erstellt wurde.*

## Spitäler (spitaeler)
*Seite existiert für IT nicht — Bewertung ausstehend, bis die Seite erstellt wurde.*

## Security
*Seite existiert für IT nicht — Bewertung ausstehend, bis die Seite erstellt wurde.*

## Haus-/Putzdienste (hausdienste)
*Seite existiert für IT nicht — Bewertung ausstehend, bis die Seite erstellt wurde.*

## Logistik
*Seite existiert für IT nicht — Bewertung ausstehend, bis die Seite erstellt wurde.*

## Fazit

Nur 9 USP-Zeilen bewertbar (General-Seite ist die einzige existierende IT-Seite): **4 ✅ · 5 ⚠️ · 0 ❌**. Der tragende Kern (11h-Ruhezeit-Regel, GA-Hard-Veto für Autofill/Reperibilità-Rotationen, On-Premise, auditierbarer Quellcode) ist ehrlich gedeckt. **Grösstes Risiko:** die Formulierung "Klacks plant den gesetzlichen Ausgleich automatisch innerhalb der 3-Tage-Frist ein" — das ist nicht belegt; Klacks warnt/erkennt Ruhezeit-Verstösse, es gibt aber keine automatische Ausgleichsplanung gegen eine gesetzliche Frist (analog zum PL-14-Tage-Fall). **Zweitgrösstes Risiko:** "nur passende Qualifikation" ignoriert, dass eine abgelaufene Pflicht-Qualifikation die Zuteilung nicht blockiert. **Wichtigste Lücke in der Content-Pipeline:** die 5 Branchen-Subseiten für IT fehlen komplett — vor einer vollständigen Freigabe müssen diese analog zu PL erst erstellt werden.
