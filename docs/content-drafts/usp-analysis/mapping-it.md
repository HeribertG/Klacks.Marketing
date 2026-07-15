# IT — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`USP-KLACKS-MAPPING.md` / `klacks-capabilities.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.
>
> **Quellenlage:** Nur die General-Seite (`land-it.json`) existiert für IT. Die 5 Branchen-Subseiten (spitex, spitaeler, security, hausdienste, logistik) sind für IT nicht angelegt — keine Bewertung möglich, bis die Seiten erstellt wurden. Diese Datei enthält daher nur den General-Abschnitt.

> **KORREKTUR 2026-07-15 (Haupt-Session):** Die 5 Branchen-Subseiten für IT sind seither live gegangen — `Localization/Content/it/land-it-{spitex,spitaeler,security,hausdienste,logistik}.json` existieren nativ (plus `de/`-Locale-Übersetzung), und `land-it` ist in `Localization/CountryIndustries.cs` als Land mit Branchen-Subrouten registriert (`CountriesWithIndustries`). Alle 5 wurden in dieser Session neu bewertet — siehe die vollständigen Abschnitte unten. Zusätzlich: Die General-Seite (`land-it.json`) wurde seit der ursprünglichen USP-Extraktion (`usp-it.md`) umformuliert — die beiden im ursprünglichen Fazit als grösstes/zweitgrösstes Risiko genannten Formulierungen ("Klacks plant den gesetzlichen Ausgleich automatisch innerhalb der 3-Tage-Frist ein" zur Reperibilità-Ruhezeit-Aussetzung; "nur passende Qualifikation") kommen im aktuellen Live-Text (weder in der deutschen Entwurfs- noch in der live-italienischen Fassung) nicht mehr vor — die General-Tabelle unten bewertet damit teilweise nicht mehr live vorhandene Formulierungen; sie bleibt als historischer Beleg stehen, ihre ⚠️-Verdikte sind für den aktuellen Text gegenstandslos. Neu im Live-Text: ein `rulesCalendar`-Block zu gemeindespezifischen Feiertagen (Santo-Patrono je Comune, Legge n. 260/1949, ~7.900 Gemeinden, frei kombinierbare/erweiterbare Kalender, pro Kalender bindend oder nur informativ) — deckt sich mit der bestehenden Kalender-DSL für Feiertage pro Land/Region (bereits in anderen Länderseiten wie DE/USA-Alaska/CH-Kantonen genutzt) und ist ✅ voll gedeckt.

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

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Fahrzeit zwischen Klienten als Arbeitszeit gewertet, Touren so gelegt, dass Strecken kurz bleiben und Zeitfenster eingehalten werden (CGUE „Tyco", C-266/14) | Geo-Tourenoptimierung + Wegzeit als bezahlte Arbeitszeit (Travel-WorkChange-Typen) | ✅ | Voll gedeckt — deckungsgleich mit AT/DE-Spitex. |
| Qualifikationen automatisch berücksichtigt, Warnung vor Ablauf | Qualifikations-Matching (exakt) + Gap-Report | ⚠️ | Exakt ✅, kein Fuzzy-Match; die IT-Formulierung behauptet korrekt nur „Warnung vor Ablauf" (nicht „blockiert bei Ablauf") — ehrlicher formuliert als andere Länder, aber die Grund-Einschränkung (keine Fuzzy-Zuordnung) bleibt. |
| 38-Stunden-Woche nach Art. 51 CCNL Cooperative Sociali automatisch überwacht, Reperibilità (max. 12h/min. 4h, max. 8 Einsätze/Monat, ca. 1,55 €/h nach Art. 58 CCNL) lückenlos dokumentiert | Konfigurierbare Grenzwerte + Live-Compliance-Warnungen + Work-Records | ⚠️ | Wochenarbeitszeit-Grenzwert konfigurierbar und warnbar ✅; ein dedizierter Zähler/Deckel für „max. 8 Reperibilità-Einsätze/Monat" ist in der Capability-Inventur nicht belegt — analog zu AT „Rufbereitschaft max. 30 Tage/3 Monate" (⚠️, Rohdaten vorhanden, kein Fertig-Zähler). |
| On-Premise: Patientendaten verlassen die Firma nicht, auch nicht zur KI | On-Premise-Stack + keyless lokales LLM (Opt-in) | ⚠️ | Hosting ✅ voll on-premise; „auch nicht zur KI" gilt nur nach bewusster Umstellung auf Ollama/LM-Studio — Default-LLM-Provider sind Cloud (analog DE/General). |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen — Klacksy schlägt sofort verfügbaren/qualifizierten Ersatz vor | Klacksy + Verfügbarkeit + Qualifikations-Matching | ✅ | Voll gedeckt. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 24/7-Abdeckung ohne Lücken über alle Abteilungen, Klacks zeigt Lücken sofort und füllt sie auf Wunsch automatisch | Schedule-Optimizer / Coverage-Sweep | ✅ | Voll gedeckt. |
| 11-Stunden-Ruhezeit (seit Legge n. 161/2014 auch für Ärzte) sowie 12h-Schichthöchstdauer (CCNL Comparto Sanità) „in Echtzeit überwacht" | Regel-Engine (`MinRestHours`, `MaxDailyHours`) + Live-Compliance-Warnungen | ✅ | Ehrlich formuliert: Der Text behauptet nur „überwacht", nicht „Verstösse entstehen gar nicht erst" (anders als AT/DE-Spitäler) — das entspricht exakt der realen Warn-Fähigkeit; voll gedeckt für den behaupteten Umfang. |
| Qualifikationen &amp; Abteilungen — passende Qualifikation zugeteilt, Warnung vor Ablauf, je Abteilung/Einheit/Funktion | Qualifikations-Matching (exakt) + Gap-Report | ⚠️ | Exakt ✅, kein Fuzzy-Match; Formulierung nennt korrekt nur „Warnung", nicht „Blockade" bei Ablauf — Grund-Einschränkung (kein Fuzzy) bleibt bestehen. |
| On-Premise: Personal- und Patientendaten verlassen die Struktur nicht, auch nicht zur KI | On-Premise-Stack + keyless lokales LLM (Opt-in) | ⚠️ | Hosting ✅; „auch nicht zur KI" nur nach bewusstem Provider-Wechsel (Cloud-Default). |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Springerpool &amp; Ausfälle — sofort verfügbare/qualifizierte Sostituti vorgeschlagen | Klacksy + Verfügbarkeit + Qualifikations-Matching | ✅ | Voll gedeckt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Alle Posten/Standorte lückenlos besetzt, Lücken sofort sichtbar und auf Wunsch automatisch gefüllt | Schedule-Optimizer (Coverage-Sweep) | ✅ | Voll gedeckt. |
| Reduzierte Ruhezeit (auf 9h, max. 3×/Monat, 12×/Jahr) automatisch sichtbar gemacht, 30-Tage-Ausgleichsfrist überwacht, Warnung vor dem 40–50%-Zuschlag nach Art. 72 CCNL Vigilanza Privata | Regel-Engine (`MinRestHours`) + Live-Compliance-Warnungen | ⚠️ | Ruhezeit-Reduktion als Grenzwert konfigurierbar/warnbar ✅; ein dedizierter Zähler, der ein Reduktions-Ereignis mit einer 30-Tage-Ausgleichsfrist verknüpft und automatisch vor dem CCNL-Zuschlag warnt, ist als eigenständiges Feature in der Capability-Inventur nicht belegt — analog zu AT „Rufbereitschaft max. 30 Tage/3 Monate" (Bausteine vorhanden, kein Fertig-Zähler). |
| Rundgänge/Patrouillen optimiert, Intervalle eingehalten | Geo-Tourenoptimierung | ⚠️ | Routen-/Zeitfenster-Optimierung ist belegt; „Intervalle eingehalten" als eigenständiges Patrouillen-Constraint ist nicht gesondert dokumentiert (gleiche Einschränkung wie AT-Security). |
| Wöchentliche Ruhezeit (Basis 35h, ausnahmsweise Verlängerung auf bis zu 14 Tage) automatisch überwacht | Regel-Engine (Wochenruhe) + Live-Compliance-Warnungen | ⚠️ | 35h-Basis als Wochenwert konfigurierbar/warnbar ✅; ein rollierender 14-Tage-Ausgleichszeitraum ist in der Engine nicht als Mehrwochen-Durchschnitt belegt (nur Einzelwoche) — analog zu PL/NO „14-Tage-Frist". |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle in Minuten ersetzt | Klacksy + Verfügbarkeit + Qualifikations-Matching | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Routen zwischen Standorten optimiert (Auto/Rad/Fuss) | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Teams flexibel eingeteilt (wechselnde Besetzungen, Hilfskräfte, Ferien) | Autofill-Wizard | ✅ | Voll gedeckt. |
| 6.-Arbeitstag-Zuschlag (25% nach Art. 30 CCNL Imprese di Pulizia) automatisch erkannt und als Lohnbasis dokumentiert; Überschreitung des 2-Block-Limits bei geteilten Diensten sichtbar gemacht | Typisierte Zuschläge (5 Kategorien: Nacht, Wochenende 1–3, Feiertag) | ❌ | **Kein eigener Zuschlagstyp für „n-ter Arbeitstag in Folge/in der Woche".** Die Engine kennt nur kalenderbasierte Zuschläge (Nacht/Wochenende/Feiertag), keinen Tageszähler-basierten Zuschlag — strukturell dieselbe Lücke wie AT/DE-Hausdienste („75% für 11./12. Arbeitsstunde" ❌: kein Stunden-/Tagesposition-Zuschlagstyp). Auch ein automatischer Zähler für „max. 2 Arbeitsblöcke/Tag bei geteilten Diensten" ist nicht belegt. |
| Enge Zeitfenster automatisch eingehalten (nur morgens/abends zugängliche Standorte) | Konfigurierbare Schicht-Zeitfenster / Verfügbarkeits-Constraints | ✅ | Voll gedeckt — Standard-Scheduling-Constraint. |
| Klacksy plant per Sprache, optimiert Route/Team/Zuschlagsbasis | Klacksy | ✅ | Klacksy selbst voll gedeckt; die „Zuschlagsbasis"-Teilaussage erbt die Einschränkung der Zuschlagszeile oben. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert (Stopps, Zeitfenster, Leerfahrten reduziert) | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Lenk- &amp; Ruhezeiten „automatisch verifiziert", Verstösse frühzeitig sichtbar | Regel-Engine (`MinRestHours`/`MaxDailyHours` als Annäherung) | ⚠️ | Klacks kennt Ruhezeit-/Tageshöchstarbeitszeit-Regeln generisch, aber keine eigene Lenkzeit-Regelart getrennt von allgemeiner Arbeitszeit (kein 4,5h-Lenksegment/45-Min-Pause-Takt) — identische Einschränkung wie AT/DE-Logistik. |
| 56-Tage-Nachweis „lückenlos" — dokumentierte Arbeits-/Pausenzeiten für aktuellen Tag + 56 Vortage als Ergänzung zu den Fahrtenschreiberdaten (Reg. EU 2020/1054) | Work-Records (planungs-/manuell erfasst) | ❌ | **Keine Fahrtenschreiber-/Tachograph-Datenanbindung.** Die IT-Formulierung ist vorsichtiger als AT/DE („a integrazione delle registrazioni del cronotachigrafo" = Ergänzung, nicht Ersatz), aber die zentrale gesetzliche Nachweispflicht (Reg. EU 2020/1054, „56+1"-Regel) bezieht sich auf echte Fahrtenschreiber-/Tachographendaten, die Klacks nicht ausliest oder speichert — nur geplante/manuell erfasste Arbeitszeiten sind vorhanden. Gleiche Lücke wie AT/DE-Logistik. |
| Führerschein-Klassen passend zugeteilt, Warnung vor Ablauf | Qualifikations-Matching (exakt) + Gap-Report | ⚠️ | Exakt ✅, Warnung vor Ablauf ✅ (Expired = Warning im Gap-Report); eine bereits abgelaufene Pflichtqualifikation blockiert die Zuteilung aber nicht — „passend" gilt nur solange rechtzeitig reagiert wird. |
| Klacksy plant per Sprache, rechnet bei Ausfall neu | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen (qualifiziert, verfügbar, mit Lenkzeit-Reserve) | Klacksy + Verfügbarkeit + Qualifikations-Matching | ✅ | Voll gedeckt; „Lenkzeit-Reserve" beruht auf denselben generischen Grenzwerten wie oben (⚠️), aber die Ersatz-Vorschlagsfunktion selbst ist gedeckt. |

## Fazit

**Zahlen:** General 5 ✅ · 4 ⚠️ · 0 ❌ (9 Zeilen; die ursprüngliche Fazit-Zeile dieser Datei hatte General fälschlich als 4✅/5⚠️ gezählt — korrigiert; zwei der ⚠️-Zeilen betreffen zudem inzwischen gegenstandslos gewordene Formulierungen, siehe Korrektur oben) · Spitex 3 ✅ · 3 ⚠️ · 0 ❌ · Spitäler 4 ✅ · 2 ⚠️ · 0 ❌ · Security 3 ✅ · 3 ⚠️ · 0 ❌ · Hausdienste 5 ✅ · 0 ⚠️ · 1 ❌ · Logistik 3 ✅ · 2 ⚠️ · 1 ❌.

**Gesamt (39 USP-Zeilen über 6 Seiten): 23 ✅ · 14 ⚠️ · 2 ❌.**

**Was ehrlich trägt:** On-Premise-Datensouveränität, Tourenoptimierung + Wegzeit als bezahlte Arbeitszeit (Spitex), Coverage-Sweep (Spitäler/Security), Klacksy (durchgängig ✅ in jeder Sektion), exaktes Qualifikations-Matching als Grundmechanismus, auditierbarer Quellcode, Kalender-DSL für gemeindespezifische Feiertage (General). Bemerkenswert: Die IT-Branchentexte formulieren die Ruhezeit-/Compliance-Überwachung durchgehend als „überwacht/verifiziert/sichtbar gemacht" statt „Verstösse entstehen gar nicht erst" (anders als AT/DE) — das ist die ehrlichere Formulierung und braucht dort keine Abschwächung.

**Grösstes Risiko (Hausdienste, ❌):** Die 6.-Arbeitstag-Zuschlagsaussage (Art. 30 CCNL Imprese di Pulizia, 25%) ist ein tagesposition-basierter Zuschlag, den die Zuschlags-Engine (nur Nacht/3× Wochenende/Feiertag, kalenderbasiert, kein Tageszähler) strukturell nicht abbildet — dieselbe Lückenklasse wie AT/DE-Hausdienste.

**Zweitgrösstes Risiko (Logistik, ❌):** Die „56-Tage-Nachweis"-Aussage benennt zwar korrekt, dass Klacks nur ergänzend zu (nicht anstelle von) Fahrtenschreiberdaten dokumentiert — Klacks hat aber weiterhin keine Tachograph-Anbindung; vor Go-Live sollte die Formulierung noch klarer von der gesetzlichen Reg.-EU-2020/1054-Nachweispflicht abgegrenzt werden, damit „a integrazione" nicht als Erfüllung der Pflicht missverstanden wird.

**Wiederkehrender Vorbehalt:** Bespoke Compliance-Zähler ohne belegtes Gegenstück in der Capability-Inventur (Reperibilità max. 8 Einsätze/Monat, reduzierte-Ruhezeit-30-Tage-Ausgleichsfrist, 14-Tage-Wochenruhe-Verlängerung, 2-Block-Limit bei geteilten Diensten) — Rohdaten/generische Grenzwert-Engine vorhanden, aber kein dedizierter Zähler/Ausgleichsplaner belegt. Gleiches Muster wie in AT (Schwerarbeit, Rufbereitschaft) und im PL/NO-14-Tage-Fall.
