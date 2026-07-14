# Klacks — Faktentreue Fähigkeits-Inventur (Bewertungsgrundlage USP-Abgleich)

Stand: 2026-07-15. Quelle: echter Code in `/mnt/c/SourceCode/Klacks.Api` (.NET 10), `/mnt/c/SourceCode/Klacks.Ui` (Angular), `/mnt/c/SourceCode/Klacks.ScheduleOptimizer` sowie Deploy-/Compose-Dateien. Sekundär: DevKnowledge-Store.

**Zweck:** KEIN Marketing. Dokumentiert, was Klacks im Code TATSÄCHLICH kann — mit ehrlichen Grenzen. Jede Aussage ist mit Datei-Pfad/Klasse belegt. Wo eine im Marketing plausible Fähigkeit fehlt, ist sie als GRENZE benannt.

**Legende:** [IMPL] = im Code implementiert und belegt · [MVP] = vorhanden, aber unvollständig/unvalidiert · [GEPLANT] = nur Doku/ADR, nicht im Code · [FEHLT] = im Code nicht gefunden.

---

## 1. Regel-/Kalender-Engine (Feiertags-Datums-DSL)

**Wichtige Klarstellung:** Im Code existieren ZWEI getrennte "Rule"-Konzepte, die der Marketing-Sprachgebrauch oft vermischt:
- `CalendarRule` = Feiertags-Datums-DSL (rechnet aus, *wann* ein Feiertag fällt). Das ist dieser Bereich.
- `SchedulingRule`/`SchedulingPolicy` = numerische Arbeitszeit-Grenzwerte (Höchstarbeitszeit, Ruhezeiten). Das ist Bereich 2 — **keine DSL, sondern typisierte Zahlenfelder**.

Die Regeltypen "Höchstarbeitszeit, Ruhezeit, wöchentliche Ruhe, n-ter Wochentag" sind NICHT in der Kalender-DSL kodierbar. Die DSL berechnet ausschließlich Feiertagsdaten.

### (a) Was es kann [IMPL]
Positionsbasierte String-Grammatik zur Berechnung von Feiertagsdaten pro Jahr. Unterstützte Regeltypen:
- **Fixes Datum** (`MM.DD`)
- **Fixes Datum + Wochentag-Verschiebung** (Offset + Operator `+`/`-`/`&` + Wochentag-Code → "nächster/vorheriger Wochentag")
- **Oster-relativ** (`EASTER`, `EASTER+50`, `EASTER-2`, mit Wochentag-Nachjustierung); Ostern via Gauß'scher Osterformel
- **Islamischer Kalender** (`HIJRI_DD_MM[±offset]`)
- **Lunar-/Mondkalender** (`LUNAR_DD_MM[±offset]`)
- **SubRule / SO-SA-Divergenz** (`SA+1;SU+2` — "observed"-Verschiebung, wenn Feiertag auf Wochenende fällt)
- Status pro Regel: `OfficialHoliday`/`UnofficialHoliday`/`NotAHoliday` je nach `IsMandatory`-Flag; zusätzlich `IsPaid`.
- Validierungs-Endpoint testet eine Regel gegen ein Jahr und gibt berechnetes Datum + Wochentag zurück.

### (b) Konfigurierbarkeit
**Voll DB-getrieben, pro Land/Staat frei hinterlegbar.** Jede DB-Zeile = ein Feiertag für eine `Country|State`-Kombination mit Feldern `Rule` (DSL-String), `SubRule`, mehrsprachigem Namen, `IsMandatory`, `IsPaid`. UI-Editor (Modal mit Freitext-Feldern + Hilfe-Tab) vorhanden. Bulk-Import beliebiger nationaler Regelsätze per JSON über Klacksy-Skill `ImportCalendarRulesSkill` (validiert jede Regel vor Speicherung). → Beliebige nationale Feiertagskalender sind hinterlegbar.

### (c) Grenzen
- **Kein visueller Rule-Builder** — Nutzer muss die positionsbasierte Freitext-Syntax kennen (nur Hilfe-Tab/Manual).
- **Fragiler Positions-Parser** (feste Substring-Indizes); Fehlformate → Exceptions, nur durch try/catch abgefangen.
- **Kein "n-ter Wochentag eines Monats" als First-Class-Konstrukt** (z. B. US-Thanksgiving "4. Donnerstag November") — nur über Fixdatum-Anker + Verschiebung annäherbar.
- Backend- und Frontend-Parser sind **dupliziert** (zwei Implementierungen derselben Grammatik → Divergenzrisiko).
- Feiertage fließen NICHT als eigene harte Constraint-Ebene in den Schedule-Optimizer (siehe Bereich 4c).

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Domain/Services/Holidays/HolidaysListCalculator.cs` — `ComputeHolidays`, `ConvertDate`, `ApplySubRules`, `CalculateEaster`, `CalculateHijriRelatedDate`, `CalculateLunarRelatedDate`, `ConstructDate`, `IsHoliday`
- `/mnt/c/SourceCode/Klacks.Api/Domain/Services/Holidays/{HijriCalendar.cs, LunarCalendar.cs}`
- `/mnt/c/SourceCode/Klacks.Api/Domain/Models/Settings/CalendarRule.cs`
- `/mnt/c/SourceCode/Klacks.Api/Application/Handlers/Settings/CalendarRule/ValidateRuleQueryHandler.cs`
- `/mnt/c/SourceCode/Klacks.Api/Application/Skills/ImportCalendarRulesSkill.cs`
- `/mnt/c/SourceCode/Klacks.Ui/src/app/domain/models/calendar/calendar-rule-class.ts` (`HolidaysListHelper`)
- `/mnt/c/SourceCode/Klacks.Ui/src/app/presentation/workplace/settings/calendar-rules/`

---

## 2. Arbeitszeit-Validierung / Compliance-Warnungen

### (a) Was es kann [IMPL]
Echte, laufende Validierungs-Engine, die pro Klient Verstöße meldet. Geprüfte Regeln (in `ScheduleValidationBuilder`):

| Prüfung | gegen Grenzwert |
|---|---|
| Ruhezeit zwischen Schichten | `MinRestHours` |
| Tages-Höchstarbeitszeit | `MaxDailyHours` |
| Aufeinanderfolgende Arbeitstage | `MaxConsecutiveDays` |
| Wöchentliche Höchstarbeitszeit | `MaxWeeklyHours` (ISO-Woche) |
| Wöchentliche Mindest-Ruhetage | `MinRestDays` |
| Kollisionen (Doppelbelegung) | Zeit-Overlap → Severity **Error** |
| Reisezeit zwischen Schichten | berechnete Fahrzeit × `TravelTimeWarningFactor=1.5` (nur mit Maps-API-Key) |
| Qualifikations-Lücken | fehlende Pflicht = Error, zu niedrig/abgelaufen = Warning |

Drei Ausführungspfade: (1) **Live/Hintergrund** via SignalR (`ScheduleTimelineBackgroundService`), (2) **Pre-Commit** vor dem Speichern (`PreCommitConflictChecker`, Baseline-vs-Augmented-Diff → meldet nur *neu* entstehende Verstöße), (3) **Periodenabschluss** (`PeriodValidationLoader`, max. 500 Issues). Perioden-Ist-Stunden werden pro Woche/2-Wochen/Monat summiert (`PeriodHoursService`), inkl. `GuaranteedHours` (Soll). Soll-/Ist-Drift-Warnung via `TargetHoursDriftDetector`.

### (b) Konfigurierbarkeit
**Grenzwerte über 3-stufige Fallback-Kette frei konfigurierbar:** `SchedulingRule (pro Vertrag) → Contract → globale Settings → Hardcoded-Default` (Muster `rule?.X ?? contract.X ?? defaults.X`). Editierbare Felder u. a. `MaxDailyHours, MaxWeeklyHours, MinPauseHours, MinRestDays, MaxConsecutiveDays, MaxWorkDays, OvertimeThreshold, MaximumHours, MinimumHours, GuaranteedHours`. Globale Defaults über Setting-Keys (`SCHEDULING_MAX_DAILY_HOURS` etc.). Vollständiger UI-Editor vorhanden. → **Beliebige nationale Grenzwerte** (z. B. CH ArG 50 h/Woche) sind pro Vertrag/Rule oder global hinterlegbar; dieselbe `SchedulingPolicy` speist Validator UND Planungs-Wizard.

### (c) Grenzen — KRITISCH für ehrliches USP
- **Keine harte Live-Deckelung ("Cap"). Die Engine BLOCKIERT das Speichern nicht.** Alle Zeitverstöße (Überstunden, Ruhezeit, Wochenruhe) sind reine `Warning`. Nur Kollisionen, Reisezeit-Unterschreitung und fehlende Pflicht-Qualifikation sind `Error`. Qualifikations-Doc sagt explizit "Never blocks the save".
- **`MaximumHours`/`MinimumHours` werden NICHT als Perioden-Cap durchgesetzt.** Trotz vorhandener Felder + Settings prüft KEIN Code aufsummierte Monats-/Jahresstunden gegen `MaximumHours`. Verwendung nur in Plausibilitäts-Check (min>max) und Lohn-Macros.
- **Kein echter Jahres-Cap / Jahres-Überstundenkonto.** Die einzige Soll-/Ist-Überwachung (`TargetHoursDriftDetector`) vergleicht gegen `GuaranteedHours` (Soll), NICHT gegen `MaximumHours` (gesetzliche Obergrenze); Schwelle **12 h ist hardcoded**.
- **Live-Editier-Check meldet nur Teilmenge:** Wöchentliche Höchstarbeitszeit und Mindest-Ruhetage laufen NUR im Pre-Commit/Periodenabschluss, nicht sofort beim Editieren.
- `OvertimeThreshold`/`MaxWorkDays`/`MaxOptimalGap` sind als Felder/Settings vorhanden, werden aber von der Warn-Engine **nicht** ausgewertet.
- **"Freie Sonntage" gibt es nicht als eigene Regel** — nur generisches `MinRestDays` (wochentag-agnostisch) + pro-Wochentag-`WorkOnSunday`-Flag (dient der Planung, nicht als Verstoß-Warnung).
- Hardcoded Fallback-Defaults (CH-orientiert, überschreibbar): `MinRestHours=11, MaxDailyHours=10, MaxConsecutiveDays=6, MaxWeeklyHours=50, MinRestDays=2`.

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Application/Services/Schedules/ScheduleValidationBuilder.cs` — `AddRestViolations`, `AddOvertime`, `AddConsecutiveDays`, `AddWeeklyOvertime`, `AddMinRestDays`, `AddCollisions`
- `/mnt/c/SourceCode/Klacks.Api/Domain/Models/Scheduling/{SchedulingPolicy.cs, SchedulingRule.cs}`, `Domain/Constants/SchedulingPolicyDefaults.cs`, `Domain/Constants/SettingKeys.cs`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/Associations/ClientContractDataProvider.cs` (`BuildEffectiveData`)
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/{ScheduleTimelineBackgroundService.cs, Schedules/PreCommitConflictChecker.cs, PeriodClosing/PeriodValidationLoader.cs, PeriodHours/PeriodHoursService.cs}`
- `/mnt/c/SourceCode/Klacks.Api/Application/Services/Assistant/Triggers/TargetHoursDriftDetector.cs`
- UI: `/mnt/c/SourceCode/Klacks.Ui/src/app/presentation/workplace/settings/scheduling-rules/`

---

## 3. Typisierte Zuschläge (Surcharges)

### (a) Was es kann [IMPL]
Typisiertes Zuschlagsmodell mit **fünf Kategorien** (`SurchargeType` enum): `Night(1)`, `Weekend1(2)`, `Weekend2(3)`, `Weekend3(4)`, `Holiday(5)`. Jeder Zuschlag als eigene Zeile (`SurchargeItem` mit `Type`, `Amount`, genau einem Parent Work/Break/WorkChange via Check-Constraint). Berechnung über eine **nutzereditierbare BASIC-artige Macro-Skriptsprache** (nicht hardcodierte C#-Regeln). Das Seed-Macro `AllShift`:
- **Nachtfenster fix `23:00–06:00`** (String-Literal im Macro).
- **Feiertag** über importiertes `Holiday`-Flag.
- **Wochenende** über konfigurierbare `WeekendDay1/2` (ISO-Wochentage).
- **Kein Stacking — "höchster Satz gewinnt":** pro Segment das Maximum aus Night/Holiday/Weekend-Rate, nicht additiv.
- Mitternachtsübergreifende Schichten werden korrekt in zwei Segmente gesplittet.

### (b) Konfigurierbarkeit
- **Sätze frei konfigurierbar:** Raten aus Fallback-Kette `SchedulingRule → Contract → globale Settings`. Contract-Felder `NightRate, HolidayRate, WE1Rate, WE2Rate, WE3Rate`. DB-Werte sind **Multiplikatoren** (0.10 = 10 %, nicht Prozent — bestätigte Falle). Raten gelten auch für Klienten ohne aktiven Vertrag (`BuildFromDefaults`).
- **UI für Sätze vorhanden**, aber nur **2 Wochenend-Stufen** (`saRate`, `soRate`, geklemmt 0–100). `WE3Rate` existiert im Backend + Macro, aber **ohne UI**.
- **Wochenendtage frei konfigurierbar** über Setting `CALENDAR_WEEKEND_DAYS` (Settings-UI); **Wochenstart** über `CALENDAR_WEEK_START_DAY`.

### (c) Grenzen
- **Nachtfenster hart im Macro-Text (`23:00–06:00`)** — kein Settings-Feld "Nachtbeginn/-ende", kein "22–06"-Preset. Änderung nur durch Editieren des Macro-Skripts (technisch möglich, aber kein UI-Parameter). Standard ist 23:00, nicht 22:00.
- **Max. 2 Wochenend-Tage** werden von den Zuschlags-Macros unterschieden; ein 3. Wochenendtag fällt auf keinen Satz (`WE3Rate` praktisch tot).
- **Kein Stacking** — Länder, die Nacht+Feiertag additiv verlangen, sind ohne Custom-Macro nicht abgedeckt.
- Custom-Kunden-Macros mit hartcodiertem Wochentag (6/7) respektieren das konfigurierbare Wochenende nicht (akzeptierte Lücke).
- Wizard-1-Schätzung kennt keinen Holiday-Zuschlag (bewusste Vereinfachung).

**MEMORY-Abgleich (typed-surcharges 2026-07-08):** Umgesetzt (A) Wochenendtage + (B) Wochenstart konfigurierbar. Offen (C) 3. Wochenend-Satz ohne UI, Nachtfenster nicht als Setting; (D) Holiday-Engine FE/BE-Duplikation, Holiday-Zuschlag fehlt in Schätzung.

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Domain/Enums/SurchargeType.cs`, `MacroTypeEnum.cs`
- `/mnt/c/SourceCode/Klacks.Api/Domain/Models/Schedules/SurchargeItem.cs`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/Schedules/WorkMacroService.cs`, `Infrastructure/Services/Macros/MacroCompilationService.cs` (`TryMapSurchargeType`), `MacroDataProvider.cs`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Persistence/Seed/MacrosSeed.cs` (Macro `AllShift`, Nachtfenster)
- `/mnt/c/SourceCode/Klacks.Api/Domain/Models/Associations/Contract.cs`
- UI: `settings/contracts/`, `settings/scheduling-rules/`, `settings/scheduling-defaults-setting/`

---

## 4. Schedule-Optimizer / Autofill (GA)

**Klarstellung:** Es gibt ZWEI GA-Codebasen. Produktiv ist die **Backend-Engine** `Klacks.ScheduleOptimizer` (Namespace `TokenEvolution`), aufgerufen via `WizardJobRunner`, gestreamt per SignalR. Der Frontend-"Conductor"-GA (`Klacks.Ui/.../automation/conductor/`) ist **verifiziert orphan/experimentell** (kein produktiver Consumer) und kennt kein Qualifikationskonzept — nicht mit der Produktion verwechseln.

### (a) Was es kann [IMPL]
Echter genetischer Algorithmus (Wizard 1 "Planner"): Population-basiert, Tournament-Selektion, Elitismus, Block-Crossover, gewichtete Mutation, Early-Stopping. Gemischte Initialpopulation (Auction/Coverage-First/Greedy/Random). Coverage-Sweep nach jeder Generation treibt Untersupply gegen 0.

**Optimiert wird über lexikografische 5-Stufen-Fitness** (strikt Stage 0 → 4):
- Stage 0: Anzahl harter Constraint-Verletzungen (minimieren)
- Stage 1: garantierte Stunden je Mitarbeiter, roster-rang-gewichtet (top-down)
- Stage 2: Vollzeit-Abdeckung (symmetrisch)
- Stage 3: Soft-Constraints (Schichttyp-Rotation früh→spät→nacht, Blacklist-Präferenzen, Standort-Kontinuität, optimaler Intraday-Gap)
- Stage 4: Kosmetik (Fairness, Mindeststunden, Symmetrie)

**Respektiert Regeln & Qualifikationen als HARTE VETOS (Stage 0):** `MissingQualification`, `BreakBlocker`, `ContractDay`, `ContractWeekday`, `ExistingWorkOverlap`, `OverlappingShift`, `MaxConsecutiveDays`, `MaxDailyHours`, `MaximumHoursContractCap`, `MinPauseHours`, `PerformsShiftWork`, `BlacklistedShift`, Keyword-Commands (FREE/OnlyEarly/NoLate). **Sealed/locked works** und **Verfügbarkeiten** fließen als Sperren ein (Verfügbarkeit ist die schwächste Ebene, wird an Keyword/Break-Tagen unterdrückt; Qualifikation nie). Belegt durch Unit-Tests (`EligibilityVetoTests`).

### (b) Konfigurierbarkeit
Voll parametrisierbar über `TokenEvolutionConfig` (PopulationSize=50, MaxGenerations=200, MutationRate=0.25, CrossoverRate=0.7, ElitismCount=2, 5 Mutations-Gewichte, InitAuctionRatio=0.5, RandomSeed, MaxRuntime) + Fitness-Stage-Gewichte. Per-Request-Overrides via `WizardTrainingOverrides`. Autoresearch-Tuning-Loops vorhanden. Roster-Priorität wählbar (user-defined vs. nach GuaranteedHours). Scheduling-Defaults aus globaler Settings-Tabelle.

### (c) Grenzen
- **Calendar-/Feiertagsregeln fließen NICHT als eigene Constraint-Ebene in den GA.** Der GA kennt Breaks (Urlaub/Krank), Keyword-Commands, Verfügbarkeiten, Vertragstage, Wochentags-Flags — aber keine `CalendarRule`-Feiertage als harte Planungsregel.
- **Heuristisch/stochastisch, zeitbudgetiert:** 90 s Soft + 20 s Hard-Cancel. Kein garantiertes Optimum; bei zu vielen Agenten/Shifts "TimedOut" mit Best-so-far.
- Fitness-Stage-Gewichte nur global (nicht pro Request übersteuerbar).
- Wizard 2 (Harmonizer, Mamdani-Fuzzy) und Wizard 3 (Holistic/LLM-Committee) existieren; Wizard 3 ist die experimentellste Ebene.

### (d) Belege
- `/mnt/c/SourceCode/Klacks.ScheduleOptimizer/TokenEvolution/TokenEvolutionLoop.cs`, `TokenEvolutionConfig.cs`, `Fitness/TokenFitnessEvaluator.cs`, `Initialization/SlotConstraintFilter.cs`, `Auction/Controller/Stage0HardConstraintChecker.cs`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/Schedules/WizardJobRunner.cs`, `Application/Services/Schedules/{WizardContextBuilder.cs, WizardTrainingOverrides.cs}`
- `/mnt/c/SourceCode/Klacks.UnitTest/ScheduleOptimizer/TokenEvolution/EligibilityVetoTests.cs`

---

## 5. Qualifikations-/Skill-Matching

### (a) Was es kann [IMPL]
- **Person hält Qualifikationen** (`ClientQualification`: `QualificationId`, `Level`, `ValidFrom`, `ValidUntil`).
- **Shift fordert Qualifikationen** (`ShiftRequiredQualification`: `MinLevel`, `IsMandatory`).
- **Matching date- und level-aware, exakt/diskret:** Match erfordert exakt gleiche `QualificationId`, `Level >= MinLevel`, Datum im Gültigkeitsfenster. Klassifiziert unerfüllte Anforderungen als `Missing`/`Expired`/`InsufficientLevel`.
- **Hard vs. Soft klar getrennt:** Nur **fehlende Pflicht-Qualifikation** (Error) sperrt die Zuweisung (Veto in GA). Optionale/abgelaufene/zu-niedrige Quals = Warning → Agent bleibt zuweisbar, wird nur im Gap-Report ausgewiesen (unfüllbare Slots + zugewiesene-unqualifiziert).

### (b) Konfigurierbarkeit
Pro Qualifikation: Level, Gültigkeit von/bis; pro Shift: MinLevel + Mandatory-Flag. Katalog-CRUD vorhanden. Die Hard/Soft-Grenze ist **fest verdrahtet** (nicht per Setting): fehlende Pflicht = Veto, sonst Warning.

### (c) Grenzen
- **KEIN Fuzzy-Skill-Matching.** Prüfung ist strikt exakt/diskret (ID-Gleichheit + numerischer Level-Vergleich + Datumsfenster). Keine Ähnlichkeits-/Ersatz-Logik ("Skill A deckt B teilweise ab"). Achtung: die "Fuzzy"-Komponenten (`FuzzyBiddingAgent`, Mamdani-Engine, `HarmonyScorer`) betreffen **Bid-/Harmonie-Scoring**, NICHT Skill-Matching.
- **Edge-Case:** Eine *abgelaufene* Pflicht-Qualifikation erzeugt keinen Error-Veto → Agent bleibt zuweisbar, wird nur gemeldet. ("Zertifikat gerade abgelaufen" blockiert nicht.)
- Nur `>= MinLevel` (Überqualifikation immer ok, kein "genau dieser Level").

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Application/Services/Schedules/EligibilityMatcher.cs` (`EvaluateRequirement`, `FindMandatoryGaps`), `EligibilityMatrixBuilder.cs` (Error→Veto), `QualificationGapReportBuilder.cs`
- `/mnt/c/SourceCode/Klacks.Api/Application/Commands/Qualifications/{SetClientQualificationCommand.cs, SetShiftRequiredQualificationCommand.cs}`

---

## 6. Zeiterfassung / Arbeitsnachweis (Work-Records)

### (a) Was es kann [IMPL]
- Datenmodell: `Work`, `WorkChange`, `Break` (alle erben von `ScheduleEntryBase`) mit `WorkTime`/`ChangeTime` (decimal Stunden), `Surcharges`, `StartTime`/`EndTime`, `LockLevel`, `SealedAt`/`SealedBy`, `AnalyseToken` (What-If-Szenarien).
- `WorkChangeType`: Correction, Replacement, Travel (Start/End/Within), Briefing, Debriefing.
- **Erfassung ist manuell/planungsbasiert** (REST-CRUD, Bulk-Ops, Dialoge, Klacksy-Skills). Stundenformel (bestätigt): `Hours = SUM(Work.WorkTime) + SUM(Break.WorkTime) + WorkChanges` (Travel/Correction +, Replacement verschiebt zwischen Kunden). Ergebnis gecacht als `ClientPeriodHours`, Recalc via Hintergrund-Service + SignalR.
- Sperr-/Freigabe-Workflow: `None → Confirmed → Approved → Closed` + versiegelte Perioden.

### (b) Konfigurierbarkeit
Zahlungsintervall (Weekly/Biweekly/Monthly), Wochenstart, Garantiestunden pro Client, Gruppen-Scope, Szenarien via `AnalyseToken`.

### (c) Grenzen — KRITISCH für ehrliches USP
- **KEINE biometrische Erfassung.** Wortgenaue Suche (`fingerprint`, `biometric`, `face`) über Backend + Frontend: **null Treffer.** [FEHLT]
- **KEINE Stempeluhr / kein Kiosk-/Terminal-/Punch-Clock-Modus.** Suche (`stamp`, `punch`, `kiosk`, `timeclock`, `clock-in/out`, `nfc`, `rfid`, `badge`): **null Treffer.** [FEHLT]
- **Keine automatische Ist-Zeit-Erfassung durch Geräte / kein "Kommen/Gehen"-Live-Tracking.** Zeit entsteht ausschließlich durch geplante/manuell erfasste Einträge.
- Klacks ist damit ein **Planungs- und Abrechnungs-Nachweis** (Soll/geplant + Korrekturen), **keine Anwesenheits-Messung per Sensor.**

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/PeriodHours/PeriodHoursService.cs` (`CalculatePeriodHoursForClientsAsync`)
- `/mnt/c/SourceCode/Klacks.Api/Domain/Models/Schedules/{Work,WorkChange,Break,ClientPeriodHours,ScheduleEntryBase}.cs`, `Domain/Enums/{WorkChangeType,WorkLockLevel}.cs`
- `/mnt/c/SourceCode/Klacks.Api/Presentation/Controllers/UserBackend/Schedules/WorksController.cs`
- Frontend-Dialoge: `/mnt/c/SourceCode/Klacks.Ui/src/app/presentation/workplace/schedule/dialogs/`

---

## 7. Routen-/Tourenplanung + Wegzeit als Arbeitszeit (Spitex)

### (a) Was es kann [IMPL] — mit echter Kartenintegration
**Anders als oft vermutet: es gibt ECHTE geografische Routenoptimierung, nicht nur abstraktes ACO.**
- **Distanz-/Dauer-Matrix aus realen Kartendiensten** (3-stufig): (1) OpenRouteService (mit API-Key, echte Distanzen + Fahrzeiten, Profile car/cycling/foot), (2) OSRM public server (ohne Key, echte Straßendistanzen), (3) Haversine-Fallback (Luftlinie).
- **Geocoding real** via Nominatim/OpenStreetMap (Rate-Limiting, Cache, Adressvalidierung); Client-Adressen tragen Lat/Lng.
- **Optimierung:** Ant-Colony-Optimization (100 Ameisen, 200 Iterationen) auf der realen Distanzmatrix + 2-opt lokale Verbesserung, fixe Start-/Endpunkte, Rundreise-Erkennung. Berücksichtigt On-Site-Zeit (Briefing + WorkTime + Debriefing) pro Stopp. Optional zeitfenster-bewusst. Liefert **Turn-by-turn-Directions**. Transportmodi car/bike/foot/mix.
- **Kartendarstellung im Frontend** via Leaflet 1.9.4 + markercluster (Client-Standorte-Dashboard).
- **Wegzeit = bezahlte Arbeitszeit:** WorkChange-Typen `TravelStart/End/Within` zählen positiv zu den Stunden des Kunden (in `PeriodHoursService`).

### (b) Konfigurierbarkeit
Kartendienst (OpenRouteService-API-Key als verschlüsseltes Setting; sonst OSRM public), Transportmodus pro Container/Item, Start-/End-Base (Filialen), Geschwindigkeits-Heuristiken (Konstanten), Briefing/Debriefing/WorkTime je Shift, Zeitblöcke. Matrix-Cache 7 Tage, Geocoding-Cache 30 Tage. ACO-Parameter derzeit hart im Code (aber Autoresearch-Tuning vorhanden).

### (c) Grenzen
- **KEIN Live-GPS / kein Geräte-Tracking.** Routen basieren auf hinterlegten Adress-Koordinaten, nicht auf Echtzeit-Mitarbeiterposition. [FEHLT]
- **Wegzeit wird NICHT automatisch aus der Optimierung gebucht** — der bezahlte `TravelWithin`-WorkChange wird **manuell** über den Dialog erfasst. Kein Handler erzeugt Reise-WorkChanges aus dem Optimierungsergebnis.
- **Abhängigkeit von öffentlichen Diensten** ohne ORS-Key: OSRM-Demo-Server (nur driving mit echten Zeiten; Fuß/Rad nur Schätzung) + Nominatim mit striktem Rate-Limit (~1 Req/1,1 s) → praktische Grenze bei Batch-Geocoding.
- ACO rechenintensiv bei sehr vielen Stopps; keine parametrische Abschaltung ohne Codeänderung.

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Domain/Services/RouteOptimization/{AntColonyOptimizer.cs, RouteOptimizationService.cs, DistanceMatrixBuilder.cs, TravelTimeCalculator.cs}`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/GeocodingService.cs` (Nominatim)
- `/mnt/c/SourceCode/Klacks.Api/Presentation/Controllers/UserBackend/RouteOptimizationController.cs`
- Wegzeit: `PeriodHoursService.cs` (Travel-Typen), `Domain/Enums/WorkChangeType.cs`
- Frontend: `package.json` (leaflet 1.9.4), `domain/services/route-optimization.service.ts`, `dashboard-clients-locations.component.ts`

---

## 8. On-Premise / Self-Hosting + Datensouveränität

### (a) Was es kann [IMPL]
- **Vollständiger Self-Hosting-Stack (Docker)** mit Ein-Kommando-Installer für Windows + Linux (`deploy/onprem/install.ps1`/`.sh`). Installer generiert Secrets + self-signed Zertifikat, pinnt Version, wartet auf Health. Services: `postgres` (pgvector/pg17), `klacks-api`, `klacks-ui`, `klacks-updater`, `nginx-proxy`. Persistente Volumes (Uploads, Dokumente, DataProtection). **DB + Dateien laufen lokal.**
- **Lokales, keyless LLM möglich (opt-in):** Seed enthält `ollama` (`localhost:11434`, `requires_api_key=false`) und `lm-studio` (`localhost:1234`, keyless), angebunden über generischen OpenAI-kompatiblen Provider. `RequiresApiKey`-Flag durchgängig modelliert; Onboarding akzeptiert keyless Provider.
- **Self-hosted Whisper STT** (`whisper-stt`-Container, lokales Modell-Volume, `api_key=NULL`); **keyless TTS** via Edge TTS.
- **DSGVO-Funktionen:** Hard-Delete bei Account-Löschung (`UserDataEraser`), automatische Aufbewahrungs-Purge (`DataRetentionBackgroundService`, Setting `DATA_RETENTION_DAYS`, Default 3650 Tage), ASP.NET DataProtection mit persistenten Filesystem-Keys, Settings-Verschlüsselung (API-Keys at rest).

### (b) Konfigurierbarkeit
Provider DB-getrieben, zur Laufzeit über UI anlegbar (kein Recompile). Retention-Tage per Setting. Onprem-Config über `.env` + Image-Tags. Whisper optional via Compose-Profil.

### (c) Grenzen
- **Nicht air-gapped out-of-the-box:** Install/Auto-Update zieht Images von ghcr.io + github.com. Vollständig offline erfordert manuelles Image-Spiegeln.
- **Default-aktivierte LLM-Provider sind CLOUD** (OpenAI, Anthropic, Google, DeepSeek `is_enabled=true`); Ollama/LM-Studio sind `is_enabled=false` (Opt-in). **Ohne bewusste Umstellung telefoniert Klacksy in die Cloud.**
- **Apertus ist im ausgelieferten Code CLOUD, nicht lokal** (`https://api.apertus.ai/v1/`, `requires_api_key=true`). (Open-Weights theoretisch selbst hostbar, aber Config ist Cloud.)
- Optionale Anreicherungs-Features rufen externe APIs (Nager.Date Feiertage, Open-Meteo Wetter, Serper/Tavily Websuche) — Kern-App läuft ohne, sie sind Cloud-abhängig, wenn genutzt.

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/deploy/onprem/{install.ps1, install.sh, docker-compose.yml, .env.example, README.md}`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Persistence/Seed/LLMSeed.cs` (ollama/lm-studio keyless; apertus cloud)
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/{UserDataEraser.cs, DataRetentionBackgroundService.cs}`, `Domain/Services/Settings/SettingsEncryptionService.cs`
- `/mnt/c/SourceCode/docker-compose-server.yml` (whisper-stt), `Klacks.Api/deploy/whisper-stt-provider.sql`

---

## 9. Klacksy (KI-Assistent)

### (a) Was es kann [IMPL]
- **Skills (Aktions-Bausteine):** 250 registrierte `[SkillImplementation]`-Attribute (List/Update/Get/Delete/Add/Create/Set…). Registry + LLM-Bridge.
- **LLM-Provider:** dedizierte Function-Calling-Adapter für OpenAI, Anthropic, Gemini, Mistral; generischer OpenAI-kompatibler Pfad für alle übrigen. Kuratierter Katalog (12) + Seed-Katalog (Qwen, Baidu Ernie, Zhipu GLM, Kimi, Azure, Ollama, LM Studio…). Provider-Auto-Discovery + Connectivity-Test, Capability-Detection pro Modell, Orchestrator mit Fallback.
- **Sprachsteuerung / Voice:** STT (Deepgram nova-3 WebSocket-Streaming, Groq Whisper, AssemblyAI, Browser Web Speech, Custom-REST/self-hosted Whisper); TTS (Edge keyless, OpenAI, ElevenLabs, Google). Wake-Words je Sprachpaket. Voice-Shell-UI in Angular.
- **Skills/Rezepte (Skill-Kombination):** datengetriebene Rezept-Engine (`RecipeEngineService`), 28 geseedete Rezepte, Schrittarten `ask/search/guard/mutate/verify`, semantisches Matching mit Confirmation-Gate + Multi-Turn-Slot-Filling. Neue Rezepte ohne Recompile (DB/Seed-JSON).
- **Planung per freiem Ziel:** `PlanningAgent` zerlegt Freitext-Ziel in 1–7 atomare Skill-Calls mit dem billigsten aktivierten LLM.
- Weiteres: Auto-Memory-Extraktion, Konversations-Kompaktierung, Onboarding/Greeting, MCP-Skill-Exposure, Klacksy-Training-UI, einstellbarer Autonomiegrad.

### (b) Konfigurierbarkeit
Provider/Modelle DB-getrieben, per UI editierbar, mit Priorität + Default. STT/TTS per Settings-Card wählbar (inkl. self-hosted). Rezepte + Synonyme pro Sprache in DB/JSON. Autonomiegrad + HITL-Pause bei nicht-reversiblen Schritten.

### (c) Grenzen
- Dedizierte Function-Calling-Adapter nur für 4 Familien (OpenAI/Anthropic/Gemini/Mistral); übrige über generischen Pfad → Tool-Calling-Qualität modellabhängig.
- `LLMCapabilityService` nutzt String-Heuristiken auf Modell-IDs → neuere Modellnamen matchen Vision/Code-Zweige teils nicht sauber.
- `PlanningAgent` als "Phase 2 / autonomy-roadmap" gekennzeichnet — Reifegrad prüfen.
- Voice-Default ist Cloud-STT; lokale/keyless Voice erfordert bewusste Konfiguration.
- 250 = registrierte Skills; Exposure-Policy filtert (nicht alle zwangsläufig produktiv freigegeben).

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Application/Skills/` (258 .cs), `Domain/Services/Assistant/Skills/SkillRegistry.cs`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/Assistant/Providers/`, `Application/Constants/KnownLlmProviderCatalog.cs`
- `/mnt/c/SourceCode/Klacks.Api/Domain/Services/Assistant/RecipeEngineService.cs`, `Application/Skills/Definitions/recipe-seeds.json`
- `/mnt/c/SourceCode/Klacks.Api/Application/Services/Assistant/Planning/PlanningAgent.cs`
- Frontend: `/mnt/c/SourceCode/Klacks.Ui/src/app/presentation/voice-shell/`

---

## 10. Periodenabschluss / Lohn-Export / Länder-Payroll-Packs

**Wichtiger Reframe (verifiziert):** Klacks ist ein **Schichtplaner, kein Payroll-System**. Die "Länder-Payroll-Packs" sind **Export-Formatter in die Import-Formate fremder Lohn-/Buchhaltungssoftware** — keine Lohnberechnung.

### (a) Was es kann [IMPL]
- **Periodenabschluss (Sealing):** versiegelt Zeitraum (optional pro Gruppe), setzt Work+Break auf `Closed`, schreibt Audit-Log, dispatcht post-commit `PeriodClosedEvent`. Reopen möglich. Issue-Validierung + Audit-/Export-Log. UI vorhanden.
- **Drei Export-Familien** (Strategy-Pattern):
  1. **Order-/Booking-Exporte:** CSV, JSON, XML, DATEV, BMD (AT), Movein (IL), Omega (SK), SIE4b (SE), Temeljnica (HR/SI), Zoho Books (AE).
  2. **Payroll-Länderpacks (mitarbeiterzentriert):** DATEV LuG Bewegungsdaten (DE), Merit Palk (EE), PAXML (SE), AbaConnect/Abacus (CH), Pohoda (CZ), Winmentor (RO), Brightpay (IE/UK), Logo Bordro (TR), + Generic Delimited (CSV) + Generic XLSX.
  3. **Client-Period-Exporte:** XML, CSV, JSON.
- **Auto-Export bei gruppen-skopiertem Abschluss** (`PayrollExportOnPeriodClosedHandler`, idempotent, Artefakt in Object-Storage). Manueller On-Demand-Export via Controller + Exports-Tab.

### (b) Konfigurierbarkeit
- Formate an-/abschaltbar per UI (CSV fixed). Format-Overrides (Delimiter/Encoding/Datumsformat) als whitelisted JSON-Patch per UI.
- **Pro-Gruppe-Payroll-Config** (`PayrollExportGroupConfig`): TargetSystem, Delimiter, Encoding, `BaseWageType`, `SurchargeWageType`, `AbsenceMappingJson` (Absence→Lohnart/Ausfallschlüssel) — datenseitig frei hinterlegbar, nicht hardcodiert.
- **Neuen Länderpack = rein additiv** (neuen `IPayrollExportFormatter` registrieren + TargetSystem zeigen lassen). Default-Zielsystem global per Setting.

### (c) Grenzen — KRITISCH für ehrliches USP
- **KEINE UI zum Editieren der `PayrollExportGroupConfig`.** Kein Save-Command, kein Screen für Target-System/Lohnart-Nummern/Absence-Mapping pro Gruppe. Konfiguration erfordert **direkten DB-Eingriff / Seeding**. Fehlt die Zeile → Defaults mit leeren Wage-Types.
- **DATEV-Feldabdeckung ist MVP/unvalidiert:** Formatter füllt nur Felder 1–5 von 11; Rest leer; Lohnart-Nummern/Ausfallschlüssel sind **Platzhalter bis der Steuerberater sie liefert** (nicht ohne DATEV-Konto validierbar). **Kein Länderpack ist voll validiert.** [MVP]
- Auto-Export nur bei Group-skopiertem Close (Full-Close ohne GroupId triggert nichts). Feature-gated & standardmäßig aus (kein Seed aktiviert `payroll-export-de`). Nur ein Zielsystem pro Gruppe.
- **Nahost: nur punktuell** vorhanden — IL (Movein), AE (Zoho Books, Order-Export), TR (Logo Bordro, Payroll). **Asien i.e.S. (IN/CN/JP/SG/…): NICHT vorhanden.** [FEHLT]
- **[MVP] Shipped-but-thin:** AT (BMD), CZ (Pohoda), SK (Omega) u. a. existieren als Formatter im Code, sind aber **nicht gegen die realen Vendor-Formate** (BMD NTCS, Stormware POHODA, KROS OLYMP) validiert.
- **[GEPLANT] Nur ADR/Doku, kein Formatter im Code:** Polen (PL, Comarch ERP Optima) — reine ADR-Recherche, keine Implementierung.

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Api/Application/Handlers/PeriodClosing/ClosePeriodByGroupCommandHandler.cs`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Events/Handlers/PayrollExportOnPeriodClosedHandler.cs`
- `/mnt/c/SourceCode/Klacks.Api/Infrastructure/Services/Exports/` (13 Länder-Formatter, u. a. `DatevLugBewegungsdatenFormatter.cs`, `AbaConnectChExportFormatter.cs`)
- `/mnt/c/SourceCode/Klacks.Api/Domain/Models/Exports/Payroll/PayrollExportGroupConfig.cs`, `Domain/Interfaces/Exports/IPayrollExportFormatter.cs`
- UI: `/mnt/c/SourceCode/Klacks.Ui/src/app/presentation/workplace/period-closing/`

---

## 11. Mehrsprachigkeit / Lokalisierung / RTL

### (a) Was es kann [IMPL]
- **4 Kern-Sprachen** fest im UI-Bundle: de, en, fr, it (`de.json` = **3186 Keys**).
- **21 installierbare Sprachpakete** (Voll-UI-Plugins) mit je eigenem `translations.json`: ar, cs, da, el, es, fi, he, id, ja, ko, ms, nb, nl, pl, pt, ro, sv, th, vi, zh-CN, zh-TW. Verifiziert: `ar` und `es` = je 3186 Keys (identisch zur Core-Basis) → **echte Voll-UI-Übersetzung, nicht nur Voice-Synonyme.** **Gesamt: 25 Sprachen mit voller UI-Übersetzung.**
- Jedes Paket bündelt zusätzlich Klacksy-/Geo-Lokalisierung (Skill-/Rezept-Synonyme, Wake-Words, Phonetik, Sentiment, Navigation-Intents, Kalenderregeln, Länder-/Staaten-Namen, Docs).
- Install/Uninstall zur Laufzeit (kein Recompile), Setting-Prefix `INSTALLED_LANGUAGE_`.
- **RTL-Unterstützung:** `DirectionService` setzt `document.dir = rtl|ltr` reaktiv; RTL-Liste `[ar, yi, he, fa, ur]`. Direction aus Paket-Metadaten. Ausgelieferte RTL-Pakete: `ar` + `he` (mit `direction: rtl`).

### (b) Konfigurierbarkeit
Sprachpakete zur Laufzeit installier-/deinstallierbar (Marketplace/Settings). Fallback-Reihenfolge + Default-Sprache konfigurierbar. Neue Pakete via Repo-Tooling (`create-language-pack`). RTL automatisch aus Locale/Manifest.

### (c) Grenzen
- **RTL real nur für 2 Sprachen ausgeliefert (ar, he).** Für fa, ur, yi kennt die Direction-Liste RTL, aber es existiert **kein Sprachpaket** — RTL würde greifen, aber ohne übersetzte Texte.
- RTL ist Direction-Steuerung (`dir`-Attribut); ob jede Komponente (Canvas-Grid, PDF-Report) visuell sauber spiegelt, ist **nicht garantiert** (kein Vollständigkeitsnachweis).
- Coverage=100 stammt aus dem Manifest (deklariert), nicht aus Laufzeit-Key-Abgleich (Stichprobe ar/es bestätigt es aber).

### (d) Belege
- `/mnt/c/SourceCode/Klacks.Ui/src/assets/i18n/{de,en,fr,it}.json`
- `/mnt/c/SourceCode/Klacks.Api/Plugins/Languages/` (21 Pakete), `Application/Constants/LanguagePluginConstants.cs`
- `/mnt/c/SourceCode/Klacks.Ui/src/app/application/services/direction.service.ts` (RTL-Liste)
- `/mnt/c/SourceCode/Klacks.Api/Application/Commands/Settings/Languages/{Install,Uninstall}LanguagePluginCommand.cs`

---

## Generische Klacks-USP-Muster

Die wiederkehrenden Stärken, die praktisch jede Länder-USP tragen können — jede mit Code-Beleg:

1. **Konfigurierbare Regel-/Grenzwert-Engine (nationale Werte hinterlegbar).** Arbeitszeit-Grenzwerte (Ruhezeit, Tages-/Wochen-Höchstarbeitszeit, Konsekutivtage, Ruhetage) sind über die 3-stufige Kette `SchedulingRule → Contract → Settings → Default` frei einstellbar, mit UI. Feiertage über die Kalender-DSL pro Land/Staat frei hinterlegbar. → *Ein Klacks passt sich an jedes nationale Arbeitsrecht an, ohne Codeänderung.* Beleg: `ClientContractDataProvider`, `SchedulingRule.cs`, `CalendarRule.cs`. **Einschränkung für ehrliche USP:** Es sind **Warnungen, keine harten Caps** (siehe Bereich 2c).

2. **Typisierte, konfigurierbare Zuschläge.** 5 Kategorien (Nacht, 3× Wochenende, Feiertag), Sätze als Multiplikatoren pro Vertrag/Regel/Setting frei einstellbar, konfigurierbare Wochenendtage/Wochenstart. Beleg: `SurchargeType.cs`, `MacrosSeed.cs`, `Contract.cs`. **Einschränkung:** Nachtfenster hart im Macro (23–06), nur 2 Wochenend-UI-Stufen, kein Stacking.

3. **On-Premise-Datensouveränität + optional lokale KI.** Kompletter Docker-Self-Hosting-Stack, DB + Dateien lokal, DSGVO-Löschung/Retention/Verschlüsselung, **keyless lokales LLM** (Ollama/LM Studio) und self-hosted Whisper technisch verdrahtet. Beleg: `deploy/onprem/`, `LLMSeed.cs`, `UserDataEraser.cs`, `DataRetentionBackgroundService.cs`. **Einschränkung:** nicht air-gapped; Default-LLM-Provider sind Cloud (Opt-in nötig).

4. **Live-Compliance-Warnungen bei Regelverstoß.** Echte Verstoß-Erkennung (Ruhezeit, Über-/Höchstarbeitszeit, Kollisionen, Qualifikation, Reisezeit) live via SignalR + Pre-Commit + Periodenabschluss. Beleg: `ScheduleValidationBuilder.cs`, `ScheduleTimelineBackgroundService.cs`, `PreCommitConflictChecker.cs`. **Wichtige Ehrlichkeits-Grenze:** rein informativ, **blockiert nie das Speichern**; keine Monats-/Jahres-Cap-Durchsetzung.

5. **Klacksy (KI-Assistent, mehrsprachig, sprachgesteuert).** 250 Skills, Rezept-Engine, Planung per freiem Ziel, Voice (STT/TTS, self-hosted-fähig), 25 UI-Sprachen inkl. RTL. Beleg: `Application/Skills/`, `RecipeEngineService.cs`, `PlanningAgent.cs`, `Plugins/Languages/`. *Trägt USP "Bedienung in Landessprache + KI-Automatisierung".*

**Ergänzend (starkes Spitex-USP):** Echte geografische Tourenoptimierung (OSRM/OpenRouteService/Nominatim + ACO + Turn-by-turn + Leaflet) mit Wegzeit als bezahlter Arbeitszeit. Beleg: `RouteOptimizationService.cs`, `WorkChangeType.cs`.

---

## Bekannte Grenzen (was Klacks NICHT kann)

Für ehrliche USP-Formulierungen dürfen folgende Fähigkeiten NICHT behauptet werden:

- **Keine biometrische Zeiterfassung** (Fingerabdruck/Gesicht) — im Code nicht vorhanden. [FEHLT]
- **Keine Stempeluhr / kein Terminal-/Kiosk-/Punch-Clock-Modus / kein NFC/RFID-Badge** — Zeiterfassung ist rein manuell/planungsbasiert. [FEHLT]
- **Kein Live-GPS-/Geräte-Tracking** von Mitarbeitenden — Routen nutzen hinterlegte Adress-Koordinaten, keine Echtzeitposition. [FEHLT]
- **Keine harte Deckelung / kein Speicher-Block** bei Arbeitszeit-Verstößen — nur Warnungen; **Monats-/Jahres-Höchststunden (`MaximumHours`) werden nicht durchgesetzt.**
- **Keine echte Lohnbuchhaltung** — Klacks ist Schichtplaner; Payroll-Packs sind reine Export-Formatter in fremde Import-Formate, **kein Länderpack voll validiert** (DATEV nur MVP, Felder 1–5/11).
- **Keine Payroll-/Export-Packs für Asien i.e.S.** (Indien/China/Japan/Singapur…) — Nahost nur punktuell (IL/AE/TR). [FEHLT]
- **Payroll-Gruppenkonfiguration nur per DB** — keine UI für Target-System/Lohnart/Absence-Mapping.
- **Kein Fuzzy-Skill-Matching** — Qualifikationsprüfung ist exakt/diskret (ID + Level + Datum); abgelaufene Pflicht-Qual blockiert nicht, wird nur gemeldet.
- **Feiertage sind keine harte Constraint-Ebene im Schedule-Optimizer** — der GA plant ohne Kalender-DSL-Feiertage als Veto.
- **Kein visueller Kalender-Rule-Builder** — Feiertagsregeln nur als Freitext-DSL; kein "n-ter Wochentag im Monat"-Token.
- **Nachtzuschlag-Zeitfenster nicht als Setting** (23–06 hart im Macro); nur 2 Wochenend-UI-Stufen; kein additives Zuschlag-Stacking.
- **RTL real nur ar + he** ausgeliefert; visuelle Spiegelung nicht komponentenweit garantiert.
- **Nicht air-gapped** — Installation/Updates benötigen ghcr.io/github; Default-LLM-Provider sind Cloud; Apertus ist im ausgelieferten Code Cloud, nicht lokal.
