# AT — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`klacks-capabilities.md`) und die generischen Muster (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.
>
> **Quellen-Hinweis:** Von den 6 geprüften AT-Seiten ist nur **General** (`land-at.json`) live deployed. Die 5 Branchen-Seiten existieren nur als unpromotete Entwürfe (`docs/content-drafts/at/*.json`), nicht unter `Localization/Content/de/land-at-*.json`. Die Bewertung unten gilt für den jeweils vorliegenden Text (live oder Entwurf) — vor Promotion der Entwürfe sollten die unten markierten ⚠️/❌-Stellen korrigiert werden.

> **KORREKTUR 2026-07-15 (Haupt-Session):** Der Quellen-Hinweis oben ist überholt: `"land-at"` steht in `Localization/CountryIndustries.cs` unter `CountriesWithIndustries`, und alle 5 Branchen-Dateien (`land-at-hausdienste.json`, `-logistik.json`, `-security.json`, `-spitaeler.json`, `-spitex.json`) existieren live unter `Localization/Content/de/` — die 5 Branchen-Seiten sind also live, nicht mehr „unpromotete Entwürfe". Zusätzlich haben sich die beiden General-Abschnitte vertauscht: Ein Diff von `general.json` gegen das heutige `land-at.json` zeigt, dass genau dieser (unten als „konkurrierender Entwurf, NICHT live" bewertete) AZG/ARG-fokussierte Text als `land-at.json` promotet wurde; die im Abschnitt „General (LIVE)" bewertete SWÖ-Pflege-fokussierte Fassung (Schwerarbeitstage, SWÖ-Vorlauffristen 1./14., SWÖ-Zuschläge, KA-AZG-17-Wochen für Spitäler) existiert auf der Live-Seite nicht mehr — dieser Abschnitt bewertet inzwischen toten Text, nicht die Live-Seite.
>
> Bei der Promotion wurden mehrere unten kritisierte Überzeichnungen tatsächlich korrigiert. Die Formel „Verstösse entstehen gar nicht erst" wurde auf General, Spitäler und Logistik durchgängig durch „macht … sofort sichtbar" / „überwacht … laufend" ersetzt (General-Zeile 1 unten sowie die Spitäler-KA-AZG-Zeile sind insofern entschärft; der unabhängige Einwand „kein 17-/Mehrwochen-Durchschnitt belegt" bleibt bei Spitäler aber bestehen). Bei Logistik wurde die ❌-Zeile „56-Tage-Nachweispflicht" von „Klacks hält die Nachweise für Fahrtenschreiberdaten strukturiert und jederzeit abrufbar bereit" zu „Klacks dokumentiert die geplanten Arbeits- und Einsatzzeiten lückenlos als Ergänzung zu den separat vorzuhaltenden Fahrtenschreiber-Aufzeichnungen für die 56-Tage-Nachweispflicht" umformuliert — exakt die im Fazit unten vorgeschlagene Korrektur; das Verdikt sollte auf ✅ angehoben werden. Bei Hausdienste wurde die ❌-Zeile „75%-Zuschlag für die 11./12. Arbeitsstunde … werden automatisch vorbereitet" zu „Die 11. und 12. Arbeitsstunde dokumentiert Klacks lückenlos als Stundenbasis — die gestaffelten Zuschlagssätze (75% bzw. 25% Mehrarbeit) hinterlegt die Lohnverrechnung" umformuliert — der Claim eines eigenen Überstunden-Zuschlagstyps wurde entfernt, Titel wechselte von „Zuschläge korrekt berechnet" zu „Stundenbasis für Zuschläge dokumentiert"; das Verdikt sollte auf ✅ (Stundenbasis-Dokumentation ist real belegt) angehoben werden. Bei Spitex wurde „Klacks behält die 30-Tage-Grenze für Rufbereitschaft je Mitarbeitende:r im Blick" zu „die geplanten Rufbereitschafts-Tage dokumentiert Klacks lückenlos pro Person — die Grundlage, um die 30-Tage-Grenze selbst im Blick zu behalten" abgeschwächt — ebenfalls die im Fazit vorgeschlagene „Grundlage liefert Klacks, Klassifikation erfolgt manuell"-Abschwächung; die ⚠️-Anmerkung kann entsprechend entschärft werden. Bei Security wurde „korrekt/automatisch berechnet" zu „vorbereitet" / „lässt sich … hinterlegen" und „fair rotiert … automatisch berücksichtigt" zu „rotieren, mit Zuschlägen und Ruhezeiten berücksichtigt" abgeschwächt (Wörter „fair" und „automatisch" entfernt) — mildert die Formulierung, löst aber die Grundfrage rollierender vs. fixer Ruhetag nicht auf, Verdikt bleibt ⚠️. Alle übrigen Text-Diffs (Anführungszeichen/HTML-Entities, „Fahrer:innen"→„Fahrpersonal", „Ärzt:innen"→„ärztliches Personal") sind kosmetisch bzw. Gendering-Anpassungen und ändern kein Verdikt. Die „Open Source"-Behauptung im General-Badge ist unverändert live und weiterhin ungeklärt (siehe Fazit unten) — durch die Promotion jetzt umso dringlicher zu klären, da sie nicht mehr nur in einem Entwurf steht.
>
> **Neuer, bisher unbewerteter Claim:** General hat gegenüber `general.json` einen komplett neuen `rulesCalendar`-Block bekommen („Landespatron-Tage vorkonfiguriert" — Leopolditag/Rupertitag/Josefitag; „Kalender mischen" über mehrere Bundesländer/Länder; „Sie bestimmen pro Kalender, ob ein Feiertag auf Stunden & Zuschläge wirkt — oder nur als Erinnerung erscheint"). Das ist **kein kosmetischer Diff**, sondern eine neue Sachaussage, die hier noch nicht geprüft ist. Teilweise gedeckt: `USP-KLACKS-MAPPING.md` Zeile 22 bestätigt „Kalender-DSL für Feiertage pro Land/Staat" als ✅ voll erfüllte Backbone-Fähigkeit, was das Vorkonfigurieren/Mischen mehrerer Regionalkalender stützt. Die spezifischere Aussage „pro Kalender wirksam auf Stunden & Zuschläge vs. nur informativ" konnte ich im Code nicht abschliessend verifizieren: `CalendarRule` (`Klacks.Api/Domain/Models/Settings/CalendarRule.cs`, DTO `CalendarRuleResource.cs`) hat Felder `IsMandatory` (fliesst in `HolidaysListCalculator` als `Officially` ein) und `IsPaid`, aber ich habe keinen Codepfad gefunden, der `IsMandatory`/`IsPaid` tatsächlich in die Zuschlags-/Stundenberechnung (`MacroCompilationService`, `SurchargeType.Holiday`) einspeist — dort wird nur ein generisches `data.Holiday`-Flag verwendet, dessen Quelle ich nicht bis zu `CalendarRule.IsMandatory` zurückverfolgen konnte. Diese Zeile braucht also noch eine eigene Verdikt-Zeile (voraussichtlich ⚠️, nicht ❌, da die Grundfähigkeit Kalender-DSL real ist) statt als „kosmetisch" durchzugehen.

## General (LIVE)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Wechselschichten SWÖ-konform geplant, Schwerarbeit mitgezählt, Zuschläge im Blick (Hero) | Kombination aus Regel-Engine + Zuschläge + Custom-Reporting | ⚠️ | Ruhezeit/Wochenarbeitszeit-Teil gedeckt; die Schwerarbeits-Zählung ist nicht als eigene Fähigkeit belegt (siehe unten). |
| Schwerarbeitstage automatisch gezählt (&gt;50% direkte Pflege, ≥12 Tage/Monat) | — | ⚠️ | Rohdaten (Schichttage, Dienstarten) sind in Work-Records erfassbar; ein fertiger Klassifikator für „&gt;50% direkte Pflege" + 12-Tage-Schwelle ist in der Capability-Inventur nicht belegt — müsste als Custom-Auswertung auf bestehenden Daten gebaut werden. |
| Vorlauffristen eingehalten (SWÖ: 1./14. des Vormonats) | Autofill-Wizard | ⚠️ | Autofill erstellt Pläne schnell; eine dedizierte „Dienstplan muss bis Tag X veröffentlicht sein"-Prüfung/Erinnerung ist nicht belegt — das ist ein Prozess-/Termin-Feature, kein Scheduling-Constraint. |
| SWÖ-Zuschläge vorbereitet (Sonn-, Feiertags-, Pflegezuschlag je Bereich) | Typisierte Zuschläge (5 Kategorien) | ⚠️ | Sonn-/Feiertagszuschlag über Weekend-/Holiday-Typ abgedeckt ✅; „Pflegezuschlag" ist keine der 5 `SurchargeType`-Kategorien (Night/Weekend1-3/Holiday) — bräuchte eigene Abbildung (z. B. über Contract-Basislohn), nicht als Zeit-Zuschlag. |
| KA-AZG für Spitäler — 48h/17-Wochen-Höchstarbeitszeit + 11h-Ruhezeit automatisch überwacht | Konfigurierbare Grenzwerte + Ruhezeit-Regel-Engine | ⚠️ | Wöchentliche Höchstarbeitszeit wird pro ISO-Woche geprüft; ein 17-Wochen-Gleitschnitt ist in der Engine nicht belegt (nur `MaxWeeklyHours` pro Einzelwoche). Ruhezeit-Regel ✅. Zudem: Warnung, kein Speicher-Block. |
| On-Premise: Daten bleiben im Haus | On-Premise-Stack | ✅ | Voll gedeckt. |

## General (general.json — konkurrierender Entwurf, NICHT live)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| AZG-/ARG-Grenzen + 36h-Wochenendruhe (inkl. Sonntag) in Echtzeit überwacht, „Verstöße entstehen gar nicht erst" | Konfigurierbare Grenzwerte + Live-Compliance-Warnungen | ⚠️ | Höchstarbeitszeit/Ruhezeit konfigurierbar+warnbar ✅; „Verstöße entstehen gar nicht erst" überzeichnet (nur Warnung, kein Speicher-Block). Zusätzlich: eine „36h-Wochenendruhe, die den Sonntag einschliesst" gibt es nicht als eigene Regel — nur wochentag-agnostisches `MinRestDays` + ein `WorkOnSunday`-Planungsflag (keine Verstoss-Warnung). |
| Dienste automatisch geplant | Autofill-Wizard | ✅ | Voll gedeckt. |
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| On-Premise: volle Datenhoheit | On-Premise-Stack | ✅ | Voll gedeckt. |
| Open Source: nachvollziehbar &amp; anpassbar, Quellcode liegt offen | — | ⚠️🔎 | **Nicht durch die Capability-Inventur verifizierbar.** `klacks-capabilities.md` dokumentiert Funktionsumfang, keine Lizenz-/Source-Verfügbarkeit. Eine „Open Source"-Behauptung braucht eine eigene, separate Bestätigung (Lizenzmodell/Repo-Zugriff für Kunden) — vor Publikation zwingend mit Produkt-/Rechtsseite klären, sonst potenziell falsches Versprechen. |
| Transparenz erleichtert Betriebsrat-Zustimmung nach § 96a ArbVG ggü. Cloud-KI | On-Premise + (behauptete) Open-Source-Transparenz | ⚠️ | Plausibles Argument, aber kein Klacks-Feature im engeren Sinn (kein Audit-/Nachweis-Werkzeug speziell für Betriebsrats-Zustimmungsprozesse belegt) — Inferenz aus On-Premise + Transparenz, nicht separat verifiziert. |

## Häusliche Pflege (spitex — Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Wegzeit als volle Arbeitszeit (SWÖ-KV) | Wegzeit als bezahlte Arbeitszeit | ✅ | Voll gedeckt (Travel-WorkChange-Typen). |
| Schwerarbeit dokumentiert (≥12 Tage/Monat rotierender Schichtdienst inkl. Nacht) | — | ⚠️ | Wie General: Rohdaten erfassbar, kein belegter Fertig-Klassifikator für diese Schwelle. |
| Rufbereitschaft im Rahmen gehalten (max. 30 Tage/3 Monate) | — | ⚠️ | Bereitschaftsdienste sind planbar; eine automatische Zählung/Deckelung „30 Tage je 3-Monats-Fenster" ist in `SchedulingPolicy`/Validation-Builder nicht als Feld belegt — kein Beleg für automatisierte Überwachung dieser konkreten Grenze. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy; abgelaufene Pflichtqualifikation blockiert nicht. |
| SWÖ-konforme Zuschläge &amp; Rufbereitschaft vorbereitet | Typisierte Zuschläge | ⚠️ | Zuschlags-Sätze konfigurierbar; „Pflegezuschlag" nicht modelliert (s. o.), Rufbereitschafts-Grenze nicht belegt. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Spitäler (spitaeler — Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 24/7 lückenlose Abdeckung, automatisch gefüllt | Schedule-Optimizer (Coverage-Sweep) | ✅ | Voll gedeckt. |
| KA-AZG-konform automatisch geprüft (48h/52h, Echtzeit, „Verstöße entstehen gar nicht erst") | Live-Compliance-Warnungen | ⚠️ | Wichtiger Überversprechen-Punkt: Klacks **warnt**, blockiert das Speichern **nie** — „Verstöße entstehen gar nicht erst" ist so nicht haltbar. Zusätzlich kein belegter Mehrwochen-Durchschnitt (nur Einzelwoche). Formulierung auf „wird sichtbar gemacht/gewarnt" abschwächen. |
| Qualifikationen &amp; Stationen | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Springerpool &amp; Ausfälle | Klacksy + Verfügbarkeit + Qualifikations-Matching | ✅ | Voll gedeckt. |

## Security (Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte &amp; Posten lückenlos, automatisch gefüllt | Schedule-Optimizer | ✅ | Voll gedeckt. |
| KV-Zuschläge: 100% am wöchentlichen Ruhetag + anteilige Anwesenheitsbereitschaft | Typisierte Zuschläge / Weekend-Konfiguration | ⚠️ | „Wöchentlicher Ruhetag" ist ggf. ein individueller/rollierender freier Tag, nicht zwingend Sa/So — das Weekend-Zuschlagsmodell arbeitet mit global konfigurierten Kalendertagen (`CALENDAR_WEEKEND_DAYS`), nicht pro-Mitarbeiter-rollierend. „Anwesenheitsbereitschaft anteilig als Arbeitszeit" ist als automatische Teilzeit-Berechnung nicht belegt. |
| Rundgänge optimiert (mobile Dienste, Intervalle eingehalten) | Geo-Tourenoptimierung | ⚠️ | Routen-/Zeitfenster-Optimierung ist belegt; spezifisch „Patrouillen-Intervalle" als eigenes Constraint ist nicht gesondert dokumentiert. |
| 24/7-Rotation fair mit Zuschlägen und Ruhezeiten | GA Soft-Constraints (Fairness) + Regel-Engine | ⚠️ | Ruhezeit-/Zuschlagsregeln ✅; „faire Rotation" ist ein Soft-Constraint (Stage 3/4 der GA-Fitness), nicht garantiert. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle in Minuten ersetzt | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (hausdienste — Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Zuschläge korrekt berechnet: 75% für 11./12. Arbeitsstunde, 25% Mehrarbeit bei Teilzeit | Typisierte Zuschläge (5 Kategorien: Nacht, Weekend1-3, Feiertag) | ❌ | **Kein eigener Überstunden-/Stunden-Positions-Zuschlagstyp.** Die Engine kennt nur Nacht/Wochenende/Feiertag als Zuschlagsgrund, keinen „ab der 11. Arbeitsstunde"-Stundenzähler und keinen Teilzeit-Mehrarbeitszuschlag. Diese Kernaussage der Seite ist mit dem Standard-Feature-Set **nicht abgedeckt** — nur über kundenspezifisches Macro-Skript nachbaubar (nicht Standard). |
| Qualifikationen passend | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Logistik (Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Einsatz- &amp; Lenkzeiten geprüft (§ 16 AZG: 12h/14h KV, Lenkzeit-Wochenschnitt 48h), „Verstöße entstehen gar nicht erst" | Konfigurierbare Grenzwerte + Live-Compliance-Warnungen | ⚠️ | Tages-/Wochenarbeitszeit-Grenzwerte konfigurierbar und warnbar ✅; **„Lenkzeit" wird von Klacks nicht getrennt von allgemeiner Arbeitszeit erfasst** (keine Tacho-/Fahrtenschreiber-Datenquelle im System) — und „Verstöße entstehen gar nicht erst" überzeichnet: Klacks warnt, blockiert das Speichern nie. |
| 56-Tage-Nachweispflicht vorbereitet (Fahrtenschreiberdaten strukturiert/abrufbar) | — | ❌ | **Klacks hat keine Fahrtenschreiber-/Tacho-Datenanbindung.** Es gibt keine Quelle für echte Lenkzeit-Aufzeichnungen im System — Klacks kann nur die geplanten/manuell erfassten Arbeitszeiten vorhalten, nicht die gesetzlich geforderten Tachographendaten „strukturiert und abrufbar" bereitstellen. |
| Führerschein-Klassen passend, Warnung vor ablaufenden Nachweisen | Qualifikations-Matching (exakt) + Gap-Report | ⚠️ | Exakte Zuteilung ✅; Warnung vor Ablauf ✅ (Expired = Warning im Gap-Report); aber eine bereits abgelaufene Pflichtqualifikation blockiert die Zuteilung **nicht** — „passend" gilt nur solange rechtzeitig reagiert wird. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Fazit

**Zahlen:** General (live) 1✅/5⚠️/0❌ · General (Entwurf `general.json`) 3✅/3⚠️(davon 1 🔎)/0❌ · Spitex 5✅/4⚠️/0❌ · Spitäler 4✅/2⚠️/0❌ · Security 3✅/3⚠️/0❌ · Hausdienste 4✅/1⚠️/1❌ · Logistik 3✅/2⚠️/1❌. **Gesamt: 23✅ · 20⚠️ · 2❌** (45 geprüfte Zeilen).

**Vor jeder Promotion von `general.json` klären:** Die „Open Source"-Behauptung ist durch die Capability-Inventur nicht gedeckt/widerlegt — sie betrifft Lizenzmodell, nicht Funktionsumfang, und muss separat vom Produkt-/Rechtsseite bestätigt werden, bevor sie öffentlich behauptet wird. Ausserdem konkurriert `general.json` inhaltlich mit der bereits live geschalteten `land-at.json` (SWÖ-Pflege-Fokus vs. AZG/ARG-Betriebe-Fokus) — vor Deploy muss geklärt werden, welche der beiden General-Seiten für AT massgeblich ist.

**Grösstes Risiko (Hausdienste, ❌):** Die zentrale Zuschlags-Aussage „75% für die 11./12. Arbeitsstunde, 25% Mehrarbeit bei Teilzeit" beschreibt einen **stunden-positionsbasierten Überstundenzuschlag**, den die Zuschlags-Engine (nur Nacht/3×Wochenende/Feiertag, kein Überstundentyp, kein Stacking) nicht abbildet. Das ist keine Nuance, sondern der Kern-USP der Seite — vor Go-Live entweder umformulieren (auf die tatsächlich gedeckten Typen) oder die Engine erweitern.

**Zweitgrösstes Risiko (Logistik, ❌):** Die „56-Tage-Nachweispflicht für Fahrtenschreiberdaten" setzt eine Tachograph-Datenquelle voraus, die es in Klacks nicht gibt (gleiche Lücke wie Biometrie/RFID: keine Geräte-/Sensor-Anbindung). Sollte umformuliert werden auf „Klacks hält die geplanten Einsatz- und Lenkzeiten dokumentiert" statt „Fahrtenschreiberdaten vorgehalten".

**Durchgehendes Muster (⚠️, betrifft General/Spitex/Spitäler/Logistik):** Die Formulierung „automatisch geprüft/überwacht — Verstöße entstehen gar nicht erst" überzeichnet die tatsächliche Enforcement-Logik. Klacks liefert **Live-Warnungen** (SignalR/Pre-Commit/Periodenabschluss), blockiert das Speichern aber **nie**; Monats-/Jahres- bzw. Mehrwochen-Durchschnitte (17-Wochen-KA-AZG, Lenkzeit-Wochenschnitt) sind nicht als Rolling-Average belegt, nur die Einzelwoche. Durchgängig auf „wird sichtbar gemacht / gewarnt" statt „verhindert / entsteht gar nicht" umformulieren.

**Weiterer wiederkehrender Punkt:** Die AT-spezifische „Schwerarbeit"-Zählung (&gt;50% direkte Pflege, ≥12 Tage/Monat) und die „Rufbereitschaft max. 30 Tage/3 Monate"-Grenze sind beides bespoke Compliance-Zähler ohne belegtes Gegenstück in der Capability-Inventur — die Rohdaten (Schichttage, Dienstarten) sind vorhanden, ein fertiger Klassifikator/Zähler dafür ist nicht dokumentiert. Vor Publikation prüfen, ob das über bestehende Reports/Custom-Auswertung abgedeckt ist, oder die Aussage auf „Grundlage liefert Klacks, Klassifikation erfolgt manuell" abschwächen.

**Was ehrlich trägt:** Tourenoptimierung + Wegzeit (Spitex), Coverage-Sweep/Autofill (Spitäler/Security/Hausdienste), Qualifikations-Matching (exakt), Klacksy, On-Premise-Datenhoheit. Diese Kernaussagen sind über alle 6 AT-Seiten hinweg voll gedeckt.
