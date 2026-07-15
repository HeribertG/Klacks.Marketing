# FR — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`klacks-capabilities.md`) und die generischen Muster (`USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.
>
> **Quellen-Hinweis:** ausgewertet wurde der 6-Dateien-Entwurfssatz `docs/content-drafts/fr/*.json` (General + 5 Branchen), nicht die live `land-fr.json` (siehe `usp-fr.md` Kopfnotiz und Fazit unten).

> **KORREKTUR 2026-07-15 (Haupt-Session):** Die im Fazit (Punkt 5) beschriebene Quellen-Divergenz ist **aufgelöst** — `land-fr` steht weiterhin in `Localization/CountryIndustries.cs` (`CountriesWithIndustries`), die 5 Branchen-Unterseiten sind also live geroutet, und die live `Localization/Content/de/land-fr.json` (General) ist jetzt inhaltlich die hier bewertete branchenneutrale Seite — **nicht mehr** die Krankenhaus-Seite (Décret n° 2002-9). Aktueller live `pageTitle`: „Klacks für Frankreich | Personaleinsatzplanung Open Source & On-Premise", live `hero.titleHtml`: „Personaleinsatzplanung, bei der Sie die Kontrolle behalten." — identisch zum hier bewerteten Entwurf `docs/content-drafts/fr/general.json`. Der Entwurf wurde also promoted, aber mit redaktionellen Abschwächungen gegenüber dem hier bewerteten Wortlaut — Diff aller 6 Dateien (draft vs. live, 2026-07-15) ergibt:
>
> - **Risiko 1 (❌ kein Überstunden-Zuschlagstyp, General + Logistik) sprachlich entschärft, Kapazitätslücke bleibt:** General-`solutions` behauptet live nicht mehr, Klacks berechne die Zuschläge — „Klacks dokumentiert jede Arbeitsstunde ab der 36. lückenlos als Basis für die Zuschlagsstaffel (...) — die Sätze selbst berechnet Ihre Lohnabrechnung auf dieser sauberen Stundenbasis." Logistik: Titel jetzt „Stundenbasis für Äquivalenz- und Überstunden" statt „Heures d'équivalence korrekt verrechnet", Text verweist explizit an die Lohnabrechnung. Die eigentliche ❌-Lücke (kein Überstunden-`SurchargeType`) besteht unverändert fort — nur die Live-Formulierung überclaimt sie nicht mehr, das ❌-Verdikt bleibt für die Capability korrekt, ist aber für den aktuellen Live-Text zu streng.
> - **Risiko 4 („Verstösse entstehen gar nicht erst") aus dem Live-Text entfernt** — General, Spitäler UND Spitex: General-`solutions` jetzt „... werden in Echtzeit überwacht, Überschreitungen macht Klacks sofort sichtbar." Spitäler-`solutions` differenziert jetzt sogar exakt nach Pfad: „bei automatisch erstellten Plänen als feste Grenze, bei manuellen Anpassungen macht Klacks Überschreitungen sofort sichtbar" — deckt sich präzise mit dem Autofill-Hard-Veto-vs-manuelle-Warnung-Befund dieses Mappings. Spitex-`solutions`: „Überschreitungen macht Klacks sichtbar, bevor der Dienstplan steht" statt „entstehen gar nicht erst".
> - **Risiko 3 (Logistik-56-Tage-Nachweis / Spitex-Kilometerpauschale) entschärft:** Logistik `hero.subtitle`/`solutions` behauptet jetzt nur noch, die geplanten/erfassten Arbeitszeiten „ergänzen die Fahrtenschreiber-Aufzeichnungen" statt selbst den 56-Tage-Nachweis zu liefern. Spitex `solutions`/`example`/`cta` sprechen durchgehend von „dokumentierten Kilometern als Basis für die Pauschale" statt „Kilometerpauschale automatisch verrechnet" — die Lohnabrechnung berechnet die Pauschale jetzt explizit selbst.
> - **Hausdienste** ebenfalls entschärft: Titel „Coupure-Regeln automatisch geprüft" statt „...eingehalten"; Mindestvergütung für Kurzeinsätze &lt;1h ist jetzt explizit an die Lohnabrechnung delegiert statt implizit "automatisch geprüft".
> - **Risiko 2 (Security-Nachtfenster 21–6 Uhr CCN 1351 vs. angeblich hartcodiert 23:00–06:00) ist NICHT gelöst — im Gegenteil, der Live-Text macht jetzt eine spezifischere, ungeprüfte Konfigurierbarkeits-Behauptung** als der Entwurf: „Der Nachtzuschlag lässt sich auf das tarifliche Zeitfenster von 21 bis 6 Uhr einrichten" (Titel: „Nachtzuschlag konfigurierbar nach CCN 1351"). Ob das Nachtfenster im Code tatsächlich weiterhin hart auf 23:00–06:00 fixiert ist, wurde in dieser Korrektur NICHT neu verifiziert (ausserhalb des Marketing-Repos, siehe Backbone-Capability-Dokument) — falls ja, ist diese Live-Formulierung eine unwahre Konfigurierbarkeits-Aussage und sollte vor Beibehaltung gegen den tatsächlichen `Klacks.Api`-Code geprüft werden. Positiv: die 1%-Ausgleichsruhezeit-Gutschrift ist jetzt korrekt an die Lohnabrechnung delegiert statt als Klacks-Berechnung behauptet.
>
> **Kurzfassung:** Die „## General"-Tabelle unten bewertet jetzt tatsächlich den Live-Stand (die Quellen-Divergenz aus dem ursprünglichen Fazit ist erledigt). Alle ❌/⚠️-Verdikte in diesem Dokument beziehen sich jedoch auf den zum Bewertungszeitpunkt geltenden Entwurfs-Wortlaut; dieser wurde seither in mehreren Punkten (Überstunden-Formulierung, „entstehen gar nicht erst", Kilometerpauschale, Coupure-Mindestvergütung, 56-Tage-Nachweis) ehrlicher formuliert — die zugrunde liegenden Capability-Lücken selbst (kein Überstunden-Zuschlagstyp, kein Tachograf-Zugriff, keine automatische km-Lohnberechnung) bestehen unverändert fort, nur der Marketing-Text überclaimt sie nicht mehr. Einzige Ausnahme mit ungeklärtem bzw. eher verschärftem Risiko: die Security-Nachtfenster-Konfigurierbarkeits-Behauptung.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Zuschlagsstaffelung ab 36. Stunde — +25% (erste 8 Überstunden), danach +50% (Art. L3121-27/36) | Typisierte Zuschläge (`SurchargeType`) | ❌ | Das Zuschlagsmodell kennt nur 5 Kategorien: Night/Weekend1-3/Holiday — **kein eigener Überstunden-Zuschlagstyp**. Eine zweistufige 25%/50%-Überstundenstaffel lässt sich damit nicht abbilden; `OvertimeThreshold` existiert als Feld, wird von der Warn-Engine aber nicht ausgewertet. |
| Jahresarbeitszeit-Modulation bis 1.607h + 48h-Wochengrenze im Blick | Konfigurierbare Grenzwerte (`MaxWeeklyHours`) | ⚠️ | 48h-Wochengrenze als Warnschwelle konfigurierbar ✅; eine echte Jahres-Modulation (1.607h-Referenzzeitraum, automatisch generierte „jours de récupération") ist nicht belegt — kein Jahres-Cap/Ausgleichskonto im Code. |
| Ruhezeiten automatisch geprüft — 11h täglich/35h wöchentlich, „Verstösse entstehen gar nicht erst" | Regel-Engine (`MinRestHours`/`MinRestDays`) | ⚠️ | Grenzwerte konfigurierbar und werden geprüft ✅; aber die Engine **blockiert das Speichern nie** — nur bei GA-generierten Autofill-Plänen sind `MinPauseHours`/`MaxDailyHours` harte Vetos (Stage 0), bei manueller Bearbeitung nur Warnung. „Entstehen gar nicht erst" gilt nicht uneingeschränkt. |
| Dienste automatisch geplant | Schedule-Optimizer / Autofill (GA) | ✅ | Voll gedeckt. |
| Touren optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| On-Premise: volle Datenhoheit (CNIL/RGPD Art. 88) | On-Premise-Stack | ✅ | Voll gedeckt. |
| Open Source: kein Vendor-Lock-in, Quellcode liegt offen | — | ⚠️ | **Ausserhalb der Code-Capability-Inventur** (Lizenz-/Geschäftsmodell-Frage, keine technische Fähigkeit). Anzumerken: alle gesichteten `.ts`/`.cs`-Dateien tragen den Header „Copyright (c) Heribert Gasparoli Private. All rights reserved." — das ist auf den ersten Blick eine proprietäre, keine Open-Source-Lizenzierung. Diese Diskrepanz sollte von der Marketing-/Rechtsseite geklärt werden, bevor die Aussage live geht; dieselbe Formulierung existiert allerdings bereits auf vielen anderen Länderseiten (kein FR-spezifisches Problem). |
| Freie KI-Modell-Wahl (lokal statt Cloud-Profiling) | Keyless lokales LLM (Ollama/LM Studio) | ✅ | Technisch vorhanden; Anmerkung: Default-Provider sind Cloud, lokal ist Opt-in. |
| Klacksy: transparent statt Blackbox, CSE-nachvollziehbar | Klacksy (Skills/Regeln, keine reine LLM-Blackbox-Entscheidung) | ✅ | Voll gedeckt. |

## Häusliche Pflege (Aide à domicile)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Fahrzeiten als Arbeitszeit (CCN BAD) | Wegzeit als bezahlte Arbeitszeit | ✅ | Fachlich gedeckt; Wegzeit wird aber **nicht automatisch** aus dem Optimierungsergebnis gebucht, sondern manuell über den Dialog erfasst. |
| Kilometerpauschale automatisch verrechnet (0,40 €/km) | — | ⚠️ | Distanzdaten sind technisch vorhanden (Routenoptimierer/`DistanceMatrixBuilder`), aber eine automatische **Lohn-Berechnung** einer km-Pauschale ist nicht belegt. Klacks bucht Wegzeit als bezahlte Arbeits*zeit*, keine distanzbasierte Zulage. |
| Amplitude &amp; Sonntagsruhe automatisch eingehalten (12h/13h, 2 freie Sonntage/Monat) | Konfigurierbare Grenzwerte | ⚠️ | „Amplitude" (Tagesspanne inkl. Pausen, nicht reine Arbeitszeit) ist kein eigenes Feld — nur `MaxDailyHours` (reine Arbeitszeit) existiert. **„Freie Sonntage" gibt es explizit nicht als eigene Regel** (nur generisches `MinRestDays` + Wochentag-Flag `WorkOnSunday`) — bekannte Grenze. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy-Match. |
| On-Premise: Daten bleiben im Haus | On-Premise | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Spitäler (Hôpitaux)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 24/7 lückenlose Abdeckung | Schedule-Optimizer | ✅ | Voll gedeckt. |
| Ruhezeiten automatisch geprüft (9h/10h Dauerdienst + 12h FPH-Ruhezeit), „entstehen gar nicht erst" | Regel-Engine + GA-Hard-Vetos (Autofill) | ⚠️ | Grenzwerte konfigurierbar ✅, von der GA bei automatischer Planung als harter Veto respektiert ✅; bei manueller Schichtbearbeitung aber nur Warnung, kein Speicher-Block. Die pauschale Formulierung „entstehen gar nicht erst" trifft nur auf den Autofill-Pfad zu. |
| Qualifikationen &amp; Stationen abgestimmt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy. |
| On-Premise: Daten bleiben im Haus + CNIL-Konformität (keine Geolokalisation/Biometrie) | On-Premise + fehlende Biometrie/GPS | ✅ | Ehrlich: Klacks hat tatsächlich keine Biometrie/kein Live-GPS, passt zur CNIL-Kritik an genau diesen Verfahren. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Springerpool &amp; Ausfälle | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte &amp; Posten lückenlos | Schedule-Optimizer | ✅ | Voll gedeckt. |
| CCN-Zuschläge automatisch berechnet (10%/25% Nacht 21–6 Uhr + 1% Ausgleichsruhezeit/Gutschrift) | Typisierte Zuschläge (Nacht) | ⚠️ | Nachtzuschlag als Satz konfigurierbar ✅, aber das **Nachtfenster ist im Code hart 23:00–06:00**, nicht 21–6 Uhr wie in CCN 1351 gefordert — Diskrepanz von 2 Stunden am Abend. Zusätzlich ist die „1%-Ausgleichsruhezeit als Gutschrift" ein Zeitkonto-/Ruhezeit-Bank-Mechanismus, keine reine Lohn-Zuschlagsberechnung — dafür ist im Capability-Inventar kein Beleg vorhanden (Surcharges sind Beträge, kein Ruhezeit-Guthaben-Konto). |
| Übergangsruhezeit korrekt: 10 Stunden (Wechsel Nacht/Tag) | Regel-Engine (`MinRestHours` pro Vertrag/Gruppe) | ⚠️ | Grundsätzlich konfigurierbar; eine schichttyp-spezifische Differenzierung (10h Standard vs. 24h-Ausnahme nur Luftsicherheit) erfordert granulare Pro-Gruppe-Konfiguration — plausibel, aber nicht separat im Code belegt. |
| Rundgänge optimiert | Geo-Tourenoptimierung (ACO) | ✅ | Fachlich übertragbar von Spitex-Tourenoptimierung; Patrouillen-spezifische Intervall-Logik nicht gesondert belegt, aber Grundmechanik vorhanden. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle in Minuten ersetzt | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (Propreté)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Coupure-Regeln automatisch eingehalten (gestaffelt nach Wochenstunden, inkl. Mindestvergütung &lt;1h) | Konfigurierbare Grenzwerte / Pausen | ⚠️ | Generische Pausen-/Tagesarbeitszeit-Konfiguration existiert; die spezifische, **nach Wochenstunden gestaffelte Coupure-Anzahl-Logik** (1 vs. 2 Coupures je nach Gesamtstunden) ist kein dediziertes Klacks-Konzept — nicht belegt. Mindestvergütung für Kurzeinsätze unter 1h ist eine Lohn-Untergrenze, ebenfalls nicht als automatisierte Prüfung belegt (vgl. PL-Mindestlohn-Fall). |
| Zeitfenster berücksichtigt | Zeitfenster-Konfiguration (Routenoptimierung) | ✅ | Fachlich gedeckt (zeitfenster-bewusste Tourenoptimierung vorhanden). |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Heures d'équivalence korrekt verrechnet (+25% Std. 36–39./43. Woche vs. +50% echte Überstunden ab 40./44. Std.) | Typisierte Zuschläge (`SurchargeType`) | ❌ | Wie im General-Abschnitt: **kein eigener Überstunden-/Äquivalenzstunden-Zuschlagstyp** im Enum (nur Night/Weekend1-3/Holiday). Die zentrale CCN-16-Unterscheidung zwischen +25%-Äquivalenzstunden und +50%-Überstunden lässt sich mit der bestehenden Zuschlags-Engine nicht abbilden. |
| Lenk- &amp; Ruhezeiten automatisch geprüft + 56-Tage-Nachweis stets abrufbar | Live-Compliance-Warnungen + Work-Records | ⚠️ | Ruhezeit-/Höchstarbeitszeit-Warnungen ja (nur Warnung, kein Block); aber **keine Fahrtenschreiber-/Tacho-Datenanbindung** — der gesetzlich geforderte 56-Tage-Nachweis basiert auf Tachograf-Gerätedaten, die Klacks nicht ausliest. Klacks liefert nur die geplante/manuell erfasste Zeitbasis, nicht den Tacho-Nachweis selbst — Formulierung sollte das klarstellen. |
| Führerschein-Klassen passend, warnt vor ablaufenden Nachweisen | Qualifikations-Matching (exakt) | ✅ | Exakt ✅; die Formulierung „warnt vor Ablauf" trifft die tatsächliche Fähigkeit genau — abgelaufene Pflicht-Qualifikation erzeugt hier korrekt nur eine Warnung, kein falsches Blockier-Versprechen. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit | ✅ | Voll gedeckt. |

## Fazit

**Summe:** 26 ✅ · 12 ⚠️ · 2 ❌ (38 USP-Zeilen über General + 5 Branchen).

**Was ehrlich trägt:** On-Premise-Datensouveränität, Geo-Tourenoptimierung (inkl. Wegzeit als Arbeitszeit für Aide à domicile), Autofill/GA, Klacksy, konfigurierbare Tages-/Wochen-Ruhezeit-Grenzwerte mit Warnung, exaktes Qualifikations-Matching mit ehrlicher „warnt vor Ablauf"-Formulierung (Logistik) und das „keine Biometrie/GPS"-Argument (Spitäler) sind durchgehend gedeckt.

**Grösste Risiken:**

1. **Kein eigener Überstunden-Zuschlagstyp (❌, betrifft General UND Logistik).** Sowohl die zentrale Code-du-travail-Zuschlagsstaffel (+25%/+50% ab der 36. Stunde) als auch die CCN-16-Unterscheidung „heures d'équivalence" (+25%) vs. echte Überstunden (+50%) setzen voraus, dass Klacks Überstunden als eigene Zuschlagskategorie berechnen kann. Das `SurchargeType`-Enum kennt nur Night/Weekend1-3/Holiday — keine Überstunden-Kategorie. Das ist die einzige harte, wiederkehrende Lücke in diesem Länder-Set und sollte vor dem Go-Live entweder durch eine Engine-Erweiterung geschlossen oder in der Formulierung auf „Höchstarbeitszeit wird überwacht/gewarnt" statt „Zuschlag korrekt verrechnet" entschärft werden.
2. **Nachtfenster-Diskrepanz Security (21–6 Uhr CCN 1351 vs. hart codiertes 23:00–06:00).** Wie schon in `USP-KLACKS-MAPPING.md` als generisches Muster festgehalten — betrifft hier speziell den französischen Sicherheitssektor mit 2 Stunden Abweichung am Abend.
3. **Logistik-56-Tage-Nachweis und Spitex-Kilometerpauschale sind beides „Klacks hat die Rohdaten, aber nicht die Spezialfunktion"-Fälle:** kein Tachograf-Datenzugriff (Logistik) bzw. keine automatische km-Lohnzulagen-Berechnung (Spitex) — beide sollten als „liefert die Planungs-/Distanzbasis" statt als abgeschlossene Compliance-/Payroll-Funktion formuliert werden.
4. **„Verstösse entstehen gar nicht erst"** taucht in General und Spitäler wörtlich auf und überspitzt die reale Mechanik: nur GA-generierte Autofill-Pläne behandeln `MaxDailyHours`/`MinPauseHours` als harten Veto; manuelle Bearbeitung wird nur gewarnt, nie blockiert.
5. **Quellen-Divergenz:** Die live deployte `land-fr.json` (General) ist inhaltlich eine reine Krankenhaus-Seite (Décret n° 2002-9) und deckt sich nicht mit dem hier bewerteten, branchenneutralen Entwurf `docs/content-drafts/fr/general.json` (Code du travail, CNIL, Open Source). Vor dem Rollout muss geklärt werden, ob der Entwurf die aktuelle Live-Seite ersetzt (wie im Handoff vorgesehen) — sonst bestehen zwei widersprüchliche „General"-Inhalte für FR nebeneinander.
6. **„Open Source"-Aussage** ist keine Code-Capability und daher ausserhalb der Inventur-Bewertung; die im Code durchgängig verwendeten „All rights reserved"-Copyright-Header stehen dazu in einem auf den ersten Blick ungeklärten Spannungsverhältnis (nicht FR-spezifisch, betrifft alle Länderseiten mit dieser Aussage).
