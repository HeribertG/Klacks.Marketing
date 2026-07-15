# Tiefenanalyse: USP-Umsetzung via region-setup.json — vorkonfigurierte Versionen pro Land × Branche

Stand: 2026-07-15. Quellen: `GAP-ANALYSE-IMPLEMENTIERUNG.md` (K1–K20), `USP-KLACKS-MAPPING.md`, alle 30 `mapping-<xx>.md`, DevKnowledge-Einträge `50f92485` (Handoff) + `e6c24425` (Region-Setup-Recherche), Code-Verifikation gegen `/mnt/c/SourceCode/Klacks.Api` (Explore-Agent, alle Datei:Zeile-Anker dieser Session frisch geprüft). **Nur Analyse — keine Code-Änderung.**

---

## 1. Kernbefund

`region-setup.json` ist heute ein **einmaliger Settings-Seeder pro Installation** — er kann exakt das konfigurieren, was als Setting-Key existiert, genau einmal, ohne Branchen-Begriff. Damit „jedes Land und jede Branche eine vorkonfigurierte Version erhält", muss er zu einem **versionierten, wiederanwendbaren Compliance-Pack** werden. Das erfordert drei architektonische Bausteine, in dieser Abhängigkeitsreihenfolge:

1. **Update-Semantik** (heute: apply-genau-einmal, sogar bei geänderter Datei) — sonst erreicht keine neue Sektion je eine Bestandsinstallation, und jährliche Tarif-/Mindestlohn-Updates (DK/SE/FI/RO…) sind unmöglich.
2. **Entity-Import-Pfad** (heute: nur Settings-Zeilen) — Branchen-Vorkonfiguration besteht fast vollständig aus *Entities* (benannte `SchedulingRule`-Presets, Perioden-Caps, Qualifikationskataloge, Payroll-Group-Configs), nicht aus globalen Settings.
3. **Branchen-Modell über die bestehende Contract→SchedulingRule-Achse** — Klacks hat bereits den perfekten Ankerpunkt: Regeln/Raten hängen pro Vertrag an einer wählbaren `SchedulingRule`, mit Fallback-Kette `Rule → Contract → Settings → Default`. Branchen-Presets = importierte benannte Rules; Landes-Recht = Settings-Ebene. **Es muss keine neue „Instanz-Branche" erfunden werden.**

Zentrale Konsequenz für die Priorisierung: **K20 (Entity-Import) ist kein Welle-2-Punkt, sondern Fundament** — er rückt zusammen mit dem Idempotenz-Fix in Welle 0, weil ohne ihn keine einzige Branchen-Vorkonfiguration ausgeliefert werden kann.

---

## 2. Ist-Zustand (code-verifiziert)

### 2.1 Mechanik des Region-Setups

| Aspekt | Befund | Beleg |
|---|---|---|
| Dateiquelle | Config-Key `RegionSetup:File` (Env: `RegionSetup__File`); nicht gesetzt → No-Op | `RegionSetupFileReader.cs:19-30`, `RegionSetupService.cs:59-64` |
| Trigger | ausschliesslich Startup (`Program.cs:506`), nach Language-Plugin-Discovery; **kein API-Endpoint**, kein Hosted Service | `RegionSetupExtensions.cs:14-19` |
| Idempotenz | Marker `REGION_SETUP_APPLIED` speichert SHA256 des Dateiinhalts, **der Check prüft aber nur `!= null`** — der Hash wird nie verglichen. Geändertes File = komplett ignoriert | `RegionSetupService.cs:66-71, 85, 396-399`; `SettingKeys.cs:55` |
| Schema-Härte | alle DTOs tragen `[JsonUnmappedMemberHandling(Disallow)]` → unbekannte Sektion lässt den **Startup hart scheitern** | `RegionSetupProfile.cs:7` |
| Schreibziel | ausschliesslich `Settings`-Zeilen (Upsert in einer UnitOfWork-Transaktion) + Language-Plugin-Installation (ausserhalb der Transaktion) | `RegionSetupService.cs:87-97, 326-336, 377-394` |
| Zweiter Leser | `DatabaseInitializer.ResolveDemoDataSeedAsync` liest dasselbe Profil (seedDemoData, Default-Sprache) — Schema-Änderungen haben **zwei** Konsumenten | `DatabaseInitializer.cs:190-216` |
| Beispiel-Profile | nur `region-setup.dev.json` (DE/BY) + `deploy/onprem/regions/de.json`; **kein CH-Profil, kein JSON-Schema-File** | `deploy/onprem/regions/README.md` |

### 2.2 Was heute konfigurierbar ist (Sektionen)

`languages` (install/default) · `locale` (country/state/timezone/calendarSelection) · `calendar` (weekendDays/weekStartDay) · `worktime` (12 Grenzwerte inkl. `overtimeThreshold`, `maxDailyHours`…) · `surcharges` (5 Raten-Multiplikatoren; WE1/WE2 mappen auf Legacy-Keys `saRate`/`soRate`!) · `export` (enabledFormats, defaultPayrollTargetSystem, validiert gegen DI-Formatter-Registry) · `seedDemoData`.

**Nicht konfigurierbar** (weil als Fähigkeit nicht existent oder hartkodiert): Nachtzuschlags-Zeitfenster (Literal `"23:00","06:00"` in `MacrosSeed.cs:75`), Überstunden-Zuschläge, Stacking-Modus, Perioden-/Jahres-Caps, Rolling Averages, Enforcement-Modus, Publikationsfristen, Fixbetrag-Zuschläge, Sonntags-Rotationen, TOIL, Lenkzeit, Zähler-Regeln, Presets/Kataloge — d.h. **praktisch alles, was die ~274 ⚠️ der USP-Mappings erzeugt**.

### 2.3 Die tragende Architektur, auf der alles aufsetzen kann

- **Fallback-Kette** in `ClientContractDataProvider.BuildEffectiveData` (`ClientContractDataProvider.cs:127-169`): pro Wert `rule?.X ?? contract.X ?? settings.X` (Settings-Ebene = genau die Keys, die region-setup schreibt). Raten und alle Stundengrenzen durchlaufen sie heute schon.
- **SchedulingRule ist contract-gebunden**, nicht global: beliebig viele benannte Rules (CRUD), Auswahl via `Contract.SchedulingRuleId` (`ClientContractDataProvider.cs:60-69`). Es gibt **keine** Land-/Gruppen-/Branchen-Dimension an der Rule — und es braucht auch keine (siehe 3.3).
- **Branchen-Semantik existiert nur rudimentär**: Enum `QualificationCategory { None, Spitex, Security, Logistics }` (`Domain/Enums/QualificationCategory.cs:5-10`) an Qualifikationen. Kein `industry`-Feld an Instanz, Settings oder Setup-Profil. („Branch" im Code = Filiale.)

---

## 3. Zielbild: vorkonfigurierte Version pro Land × Branche

### 3.1 Was unterscheidet Branchen tatsächlich? (aus den 30 Mappings destilliert)

Die Marketing-Struktur ist 30 Länder × (1 allgemeine + 5 Branchenseiten). Die branchen-spezifischen Zusagen fallen fast vollständig in **Entity-artige Konfiguration**, nicht in globale Settings:

| Branche | Typische Abweichungen vom Landes-Default | K-Kategorien |
|---|---|---|
| Spitex | Sonntags-/Ruhetag-Rotation, Wegzeit/Touren (✅ existiert), CH Art. 17b Zeitgutschrift, Tarif-Raten (z.B. SWÖ AT) | K10, K9, K20 |
| Spitäler | Publikationsfristen, Ausgleichsruhe nach Bereitschaft, Nacht-Raten nach Tarif (PC 330 BE, RTV…), Besetzungs-Soll (DE PpUGV), Bereitschaftskategorien | K15, K12, K17, K20 |
| Security | **abweichende Nachtfenster** (FR 21–06, BE zweistufig 20–22/22–06), harte 12-h-Grenzen (ID/TH), Lizenz-Kataloge (SIA, Bewacherregister, Satpam), Stacking (PL), Ereignis-Zähler (CH 25. Nacht) | K2, K1, K11, K4, K18 |
| Hausdienste | OT-Staffeln (AT 75 % ab 11. Std.), Mittagsverbots-Fenster AE/SA (outdoor), Lohngruppen (RTV DE), Fixbetrag-Zuschläge | K3, K16, K13, K19 |
| Logistik | Lenkzeit-Regeln + Pausen nach Fahrzeit, eigene Nachtfenster (NL 21–05), Fahrer-Qualifikationen (ADR, Tacho-Karte) | K14, K2, K11 |

**Erkenntnis:** Eine Branche ist in Klacks-Begriffen ein **Bündel aus benannten SchedulingRule-Presets + Qualifikationskatalog + Compliance-Zusatzregeln + ggf. Feature-Gates** — exakt das, was der Entity-Import (K20) liefert. Nur wenige Branchen-Abweichungen sind instanzweite Settings (z.B. Feature-Gate „Lenkzeit-UI an").

### 3.2 Drei Architektur-Optionen für die Branchen-Dimension

**Option A — eine Datei pro Land×Branche** (`regions/ch-spitex.json`, 30×6 = 180 Dateien):
Null neue Selektor-Mechanik (`RegionSetup__File` zeigt einfach auf die Datei). Aber massive Duplikation der Land-Basis (Feiertage, Sprachen, Landesrecht gelten pro Land, nicht pro Branche); eine Gesetzesänderung = 6 Dateien anfassen. Nur tragbar, wenn die Dateien aus Templates **generiert** werden — dann ist es aber ohnehin Option B mit Build-Step.

**Option B — eine Datei pro Land mit `industryProfiles`-Blöcken + Selektor** (`RegionSetup__Industry=spitex`):
Zentrale Wartung, ein File pro Land. Neue Merge-/Auswahl-Logik im Service. Schwäche: modelliert Branche als *Instanz*-Eigenschaft — ein Mischbetrieb (Gebäudedienstleister mit Security- und Cleaning-Sparte) passt nicht.

**Option C — Branche = Contract-Eigenschaft über importierte Presets:**
region-setup importiert **alle** Branchen-Presets des Landes als benannte Entities (`SchedulingRule` „CH Spitex GAV", „CH Security 12 %-Nacht", …). Die Zuordnung läuft über den **existierenden** Mechanismus `Contract.SchedulingRuleId`. Branche ist damit pro Mitarbeitergruppe/Vertrag wählbar — Mischbetriebe funktionieren, und die Fallback-Kette (Rule schlägt Settings) liefert Branchen-Override über Landes-Default **ohne neuen Code-Pfad**.

### 3.3 Empfehlung: Hybrid B+C

- **Eine Datei pro Land** (30 Dateien, `deploy/onprem/regions/<xx>.json`). Sektionen `locale/calendar/worktime/surcharges/compliance` = **Landes-Default (Settings-Ebene)**.
- **`industryProfiles` als benannte Preset-Blöcke** in derselben Datei; der Entity-Import legt sie als `SchedulingRule`s (+ Caps, Kataloge) an. Standard: alle importieren (sie stören nicht — sie sind nur wählbare Presets).
- **Optionaler Selektor `RegionSetup__Industry`** (oder Feld `defaultIndustry` im File) für die „vorkonfigurierte Version": setzt das gewählte Preset als Default-Rule für neue Contracts, aktiviert branchen-gebundene Feature-Gates (Lenkzeit, Touren-UI) und filtert ggf. den Qualifikationskatalog. Damit ist die Docker-Auslieferung „CH-Spitex-Version" genau zwei Env-Vars: `RegionSetup__File=/app/setup/ch.json` + `RegionSetup__Industry=spitex`.
- **Architektur-Leitplanke für alle K1–K19-Umsetzungen:** Jeder neue konfigurierbare Wert (Nachtfenster, OT-Staffel, Cap, Enforcement…) MUSS konsequent in die Fallback-Kette eingehängt werden (neues nullable Feld an `SchedulingRule` bzw. Nebentabelle mit Rule-Bezug + Setting-Key als Landes-Default). Dann ist „Branchen-Abweichung vom Landesrecht" automatisch abgebildet — z.B. FR: Settings-Nachtfenster 22–06 (Landesrecht), Security-Preset-Rule überschreibt auf 21–06.

### 3.4 Vom Einmal-Seeder zum gepflegten Compliance-Pack

Die Länder-Dateien sind keine Installations-Artefakte, sondern **fachliche Datenbestände mit Update-Zyklus** (Tarifrunden DK/SE/FI, Mindestlohn-Stichtage RO/PL/DE, Gesetzesreformen BE 2026). Nötige Semantik:

- `version`-Feld im Root; sektionsweise Marker `REGION_SETUP_APPLIED_<SECTION>` **mit Hash-Vergleich pro Sektion** (heutiger Bug: Hash gespeichert, nie verglichen) → geänderte Sektion wird beim nächsten Startup re-applied.
- **Kunden-Edit-Schutz bei Entities:** Import-Marker pro Preset (Natural Key `region-setup:<section>:<presetName>`); Update nur, wenn die Zeile den Marker noch unverändert trägt — vom Kunden editierte Presets nie überschreiben (Konvention aus K20 / „Seed: keine doppelten Types").
- **Datierte Werte** (`validFrom` an Preset-Versionen und Mindestlohn-Staffeln) statt Überschreiben — rückwirkende Abrechnungs-Korrektheit.
- Startup-Apply genügt als Update-Kanal (neues File kommt mit dem Image/Mount, Restart wendet an). Ein Admin-Endpoint „Re-Apply jetzt" ist optionaler Komfort, keine Voraussetzung.
- Ausliefern: **JSON-Schema-Datei** (existiert nicht; `$schema`-URL nur in Recherche-Notiz erwähnt) + CI-Validierung aller 30 Länderdateien gegen das Schema und gegen die Fact-Check-Pipeline (jede Zahl in einem Preset ist eine fachliche Behauptung!).

### 3.5 Zuschlags-Berechnungsebene: die 2-Macro-Lösung

Diskussionsergebnis 2026-07-15 (User-Vorschlag „anderer Macro pro Land/Branche" gegrillt und auf den tragfähigen Kern reduziert). Verifizierte Fakten zum Macro-System:

- **Auswahl pro Shift:** genau ein `Shift.MacroId` (nullable); ohne MacroId werden **keine** Zuschläge berechnet (`WorkMacroService.cs:57,63` — early return). Kein Settings-Default, Befüllung heute nur via Shift-UI/Klacksy-Skill.
- **Input = ein einzelner Work:** `MacroDataProvider.GetMacroDataAsync(work)` liefert nur `Hour/FromHour/UntilHour/Weekday` + Raten + Feiertagsflags. Keine Tages-/Wochen-/Monatssummen über andere Works — „ab der 11. Tagesstunde" bei Split-Shifts ist im Macro **prinzipiell** unerreichbar.
- **Output-Whitelist:** `TryMapSurchargeType` (`MacroCompilationService.cs:95–118`) mappt exakt die 5 Typen Night/WE1–3/Holiday; jeder andere OUTPUT-Kanal wird stillschweigend verworfen. Ein Macro kann keinen Overtime-Zuschlag emittieren; Typ-Missbrauch (OT als WE3) verfälscht Payroll-Lohnart, Reporting und Nachweis.

**Leitsatz: Logik-Varianten minimieren, Daten-Varianten maximieren.** Nicht 30×5 ≈ 150 Land×Branche-Macros (ungetestete Business-Logik als DB-Strings, Fork-Problem: Seed-Updates erreichen sie nie mehr), sondern:

| Ebene | Lösung | Deckt |
|---|---|---|
| Struktur (Rechenlogik) | **2 Macros:** `AllShift` (highest-wins, heutiger, parametrisiert) + `AllShiftAdditive` (Sätze addieren) | Standard überall; additiv KR/VN/PL. Mehrfach-Nachtfenster (BE 20–22/22–06, NL-ORT) besser als C#-Segment-Splitting VOR dem Macro-Aufruf statt dritter Variante |
| Parameter (Zahlen) | IMPORT-Variablen über die Fallback-Kette `Rule → Contract → Settings`: `NightStart/NightEnd` (K2), Sätze (existiert), optional Aggregate `DayHoursBefore/WeekHoursBefore/MonthHoursBefore` (C#-berechnet) | Fenster 21/22/23 Uhr, alle Satz-Unterschiede — **ein** Macro rechnet FR 21–06 und JP 22–05 |
| Aggregat-Logik | **C#, nie Macro:** OT-Staffeln/Perioden-Caps/Zähler. Auch mit Aggregat-IMPORTs bleibt der harte Teil C#: Neuberechnungs-**Kaskade** (Edit an Work A invalidiert Zuschläge aller späteren Works des Tages/der Woche/des Monats; heute berechnet `SurchargeItemSynchronizer` nur den gespeicherten Work; Wechselwirkung mit versiegelten Perioden klären!) + Overtime-Enum + Payroll-Mapping | K3/K4/K5/K18 |

**Macro-Auflösungskette statt manueller Auswahl** (Antwort auf „muss man pro Shift Macros wählen?" — nein, und es sind nie zwei gleichzeitig, die Varianten sind Alternativen):

```
effektiverMacro = shift.MacroId            // Override für Sonderfälle (bleibt, GUID ok — bewusste Wahl)
               ?? rule.MacroId             // Branchen-/Tarif-Preset (neu, nullable FK an SchedulingRule)
               ?? aktiver Macro mit Category = Dienst AND Type = f(stackingMode)   // fachlicher Schlüssel, KEINE GUID
```

**Warum fachlicher Schlüssel statt GUID (Owner-Einwand 2026-07-15, berechtigt):** Macros sind voll CRUD-fähig — eine GUID im Setting kann jederzeit ins Leere zeigen. Schlimmer: `Shift.MacroId` dangelt heute SCHON bei Macro-Löschung (Soft-Delete + Query-Filter → Macro „nicht gefunden" → Shifts berechnen still keine Zuschläge mehr).

**Finales Design `Type` (Funktion) + `Category` (Einsatzgebiet)** — nach Recherche 2026-07-15 (Owner-Entscheid, Breaking Changes erlaubt): `Macro.Type` ist faktisch FREI — Backend wertet es nie aus (nur Anzeige in `ListMacrosSkill`); das FE-Dropdown („Dienste und Beschäftigungen"=0 | „Arbeitsregeln"=1) ist Kosmetik ohne Auswertung; der einzige Filter (`RulesEngineService`, `SCHEDULING_RULE_MACRO_TYPE = 100`) prüft einen Wert, den das Dropdown nie erzeugen kann, und das dahinterliegende Conductor-Subsystem wird von keiner Komponente injiziert (toter Code). Deshalb:

- **Enum `MacroFunction`:** `Custom = 0` (unbegrenzt), `Standard = 1`, `StandardAdditive = 2` (reserviert für Paket C/E). Standard-Auflösung = aktiver Macro mit `Category = Dienst AND Type = Standard`. Generalisiert gratis auf Abwesenheits-Macros (Urlaub/Krankheit — `AbsenceResource.MacroId` hat vermutlich dasselbe stille Default-Problem).
- **Vorteil gegenüber IsDefault-Flag:** Der spätere Modus-Wechsel (`stackingMode: additive`) ist ein reiner LESE-Vorgang — die Auflösung wählt `Type = StandardAdditive`, keine Entity-Zeile muss umgeflaggt werden. Für die Länder-Vorkonfiguration via region-setup ist Lesen-statt-Schreiben klar sauberer.
- **Kunde editiert frei:** Inhalt/Name des Standard-Macros ändern lässt den Type unberührt. Eigenen Macro zum Standard machen = Type umhängen (Unique-Index erzwingt die Reihenfolge).
- **Partial-Unique-Index:** `unique (category, type) WHERE is_deleted = false AND type <> 0` — pro Kategorie genau ein Standard, Customs unbegrenzt. Heute existiert NUR ein nicht-uniquer Index `(IsDeleted, Name)` (`MacroConfiguration.cs`). Migration (Breaking, Owner-freigegeben): alle Types → 0, Seed-AllShift → 1.
- **Referenz-Schutz beim Löschen** (fixt zugleich das bestehende Dangling-Loch): Delete verweigern, solange der Macro von aktiven Shifts referenziert ist, an einer SchedulingRule hängt oder `Type ≠ Custom` trägt — klare Fehlermeldung mit Handlungsanweisung statt still versiegender Zuschläge.
- **Übergangs-Konsequenz (akzeptiert):** Das alte FE-Dropdown schreibt weiter 0/1 mit veralteten Labels — ein zweiter Dienst-Macro mit „Arbeitsregeln"=1 kollidiert laut am Unique-Index. Dropdown-Erneuerung gehört ins geplante Macro-Dialog-Rework (Owner: „muss überarbeitet werden").
- **Produkt-Grundsatz (Owner):** Der Admin kann bewusst ALLES editieren, neu erstellen und löschen — kein Lock-in. Schutzmechanismen dürfen deshalb nur stille Fehler verhindern (Reihenfolge erzwingen: „erst Ersatz zuweisen, dann löschen"), nie Anpassbarkeit nehmen. Jede Regel/jeder Constraint in diesem Dokument ist an diesem Grundsatz zu messen.

Niemand muss je einen Macro von Hand wählen; die Branche übersteuert via importierte Rule (PL-Security additiv), der Shift-Override bleibt für Exoten. `rule.MacroId` darf GUID bleiben, *weil* der Delete-Schutz greift (bewusste Referenz auf einen konkreten Tarif-Macro); Type-Referenz auch dort ist eine offene Option.

**Bug-Befund fehlender Default (Owner-Entscheid 2026-07-15):** Verifiziert: Es gibt heute NIRGENDS einen Macro-Default — weder im FE (`prepareNewShift()` belegt Zeiten/Wochentage/Quantity vor, aber keinen Macro: `Klacks.Ui data-management-shift.service.ts:228–244`; `shift-class.ts:82` = `undefined`) noch im BE (`PostCommandHandler` übernimmt die Resource unverändert). Neue Shifts starten ohne Macro = **stillschweigend ohne Zuschläge**. Die vom Owner gewollte Semantik ist Opt-out: `AllShift` automatisch gesetzt, Planner entfernt ihn bewusst, wenn keine Zuschläge gewünscht. Der Ist-Zustand (Opt-in) ist damit als **Bug** eingestuft, nicht als Design.

Konsequenzen für die Umsetzung:
- **Fix gehört ins BE** (Owner-Vorgabe, sachlich richtig): Ein FE-Default würde von Klacksy-Skills (`CreateShiftSkill`) und jedem API-Client umgangen. Ansatz: beim CREATE (`Handlers/Shifts/PostCommandHandler`) `MacroId == null` → aus `DEFAULT_SHIFT_MACRO`-Setting auflösen (Seed: AllShift-GUID; region-setup übersteuert per `stackingMode`).
- **Opt-out braucht ein sauberes „Keiner":** Default nur beim CREATE anwenden, Updates respektieren `null` — sonst kann der Planner Zuschläge nie mehr abwählen (BE würde das entfernte Macro stur wieder einsetzen). Alternativ explizite „ohne Zuschläge"-Auswahl.
- **Bestandsdaten sind neu zu bewerten:** Vorhandene Shifts ohne MacroId sind ab jetzt Verdachtsfälle (vergessener Macro = fehlende Zuschläge = falsche Lohnbasis), nicht mehr „bewusst zuschlagsfrei". Diagnose-Query lohnt sich (Shifts ohne MacroId × zugewiesene Works). Rückwirkende Bezuschlagung trotzdem nur nach Review — versiegelte/abgerechnete Perioden und tatsächlich gewollt zuschlagsfreie Schichten lassen sich nachträglich nicht automatisch unterscheiden.

Offene Semantik-Frage für die Rule-Ebene der Kette: Dort wird der Macro faktisch **pro Work** (Vertrag der Person) statt pro Shift aufgelöst — fachlich meist richtig (Tarif hängt am Arbeitsvertrag, nicht am Einsatzort), aber eine bewusste Änderung gegenüber heute.

**Umsetzungs-Notiz K3/K4 (2026-07-15 abends):** Die tatsächliche Implementierung hat den `AllShiftAdditive`-Macro NICHT gebaut — zu Recht: Der reale Länderbedarf (KR/VN/PL) ist OT+Nacht-Kumulierung, und OT wird ohnehin im C#-`OvertimeSurchargeCalculator` berechnet (Macro-Scope-Grenze). K4-Stacking ist deshalb eine **C#-Kombination** im `WorkMacroService.ApplyOvertimeStacking` (`SURCHARGE_STACKING_MODE`: highestWins-Default vergleicht Zuschlags-Summen, additive addiert), kein zweiter Macro. `MacroFunctionEnum.StandardAdditive = 2` bleibt reserviert und ungenutzt — er würde erst relevant, falls je ein Land Nacht+Wochenende INNERHALB des Macros addieren muss (kein bekannter Fall). Die „2-Macro-Lösung" dieser Analyse reduziert sich damit in der Praxis auf 1 Macro + C#-Kombinator — noch einfacher als geplant. Grenzen Stufe 1 (dokumentiert): highestWins vergleicht Summen, nicht Stunden-Segmente; WorkChange-Stunden zählen nicht in die OT-Basis; Payroll exportiert OT unter dem pauschalen `SurchargeWageType` (eigene OT-Lohnarten = Folgearbeit mit K8-Config-UI).

---

## 4. Klassifikation K1–K20: Was braucht welchen Konfigurations-Typ?

| K | Lücke | Engine-Neubau nötig? | Config-Typ im region-setup | Branchen-relevant? |
|---|---|---|---|---|
| K1 | Enforcement warn\|block | M (PreCommit-Hebel) | Settings (`compliance.enforcement`) | ja (Security „hart", Pflege „warn") |
| K2 St. 1 | Nachtfenster | S (Macro-Import statt Literal) | Settings (2 Keys) **+ Rule-Felder** für Branchen-Override | **ja** (FR/BE/NL-Security/Logistik) |
| K2 St. 2 | Mehrfach-Fenster | M | JSON-Setting oder Entity (Fenster-Liste) | ja (BE zweistufig) |
| K3/K4 | OT-Typ + Stacking | M/L | Settings (Modus) + Entity (Tier-Staffeln, Rule-bezogen) | ja (AT-Hausdienste 75 %) |
| K5 | Perioden-Caps | M | **Entity** (`PeriodCapRule`, mehrere pro Land) | teils (Contract-Tag-Scope) |
| K6 | Rolling Averages | M (auf K5) | Entity (Erweiterung PeriodCapRule) | kaum |
| K7 | Clock-in | XL / **Nicht-Feature** | nur Feature-Gate | — |
| K8 | Payroll-Packs | XL strategisch | Settings + Entity (`payrollGroupDefaults`) | kaum |
| K9 | TOIL/Zeitkonto | L | Settings (`compensationModes`) | ja (CH-Spitex/Security) |
| K10 | Sonntags-Rotation | M | Entity (Rotations-Regeln) | **ja** (Spitex/Spital) |
| K11 | Qual-Ablauf blockt | **S** | Settings (2 Keys) + Entity (`qualificationCatalog`) | **ja** (Lizenz-Kataloge pro Branche) |
| K12 | Ausgleichsruhe | M/L | Settings (`compensatoryRest`) | ja (Spital-Bereitschaft) |
| K13 | Basislohn/Mindestlohn | M | Settings (datierte Staffel) + Contract-Feld | ja (Lohngruppen-Kataloge) |
| K14 | Lenkzeit St. 1 | M | Settings (`drivingTime`) + Feature-Gate | **ja** (nur Logistik) |
| K15 | Publikationsfristen | S/M | Settings (`rosterPublication`) | ja (Spital/Security-Fristen) |
| K16 | Zeitfenster-Bann AE/SA | M | Entity (Saison-Fenster, Group-Tag-Scope) | **ja** (outdoor) |
| K17 | Bereitschaftskategorien | M/L | Settings (`onCall`-Faktoren) | ja (Spital) |
| K18 | Ereignis-Zähler | M/L | Entity (`counterRules`) | ja (CH 25. Nacht Security) |
| K19 | Fixbetrag-Zuschläge | S/M | Settings (Modus) + Rule-Felder | ja (Tarif-Beträge) |
| K20 | Entity-Import + Presets | **M — FUNDAMENT** | (ist der Mechanismus selbst) | **ja — trägt die Branchen-Dimension** |

Lesart: **8 der 20 Kategorien brauchen Entity-Import** (K2/2, K3, K5, K6, K10, K16, K18, K20) — ohne K20 bleiben sie per region-setup unerreichbar. Und: Config ohne Auswertungs-Engine ist wertlos — jede Kategorie wird als Paar „Engine-Fähigkeit + Config-Anbindung" gebaut, nie Config auf Vorrat.

**Nicht via region-setup lösbar (bewusste Nicht-Features / Redaktion):** K7 Biometrie/Clock-in („ohne Biometrie" ist in 6 Ländern das Datenschutz-Verkaufsargument), K8-Lohn-Benefits (Payroll-Scope-Grenze), K14 St. 2 Tacho-Import, „Open Source"-Claim (Lizenz-Entscheid, Auftrag B).

---

## 5. Schema-v2-Entwurf (konsolidiert, Beispiel `ch.json`)

```jsonc
{
  "$schema": "https://klacks.app/schemas/region-setup.v2.schema.json",
  "version": 2,
  "region": "CH",
  "defaultIndustry": null,                     // oder via Env RegionSetup__Industry
  "languages": { "default": "de", "install": [] },
  "locale":    { "country": "CH", "state": "ZH", "timeZone": "Europe/Zurich",
                 "calendarSelection": { "country": "CH", "state": "ZH" } },
  "calendar":  { "weekendDays": "Saturday,Sunday", "weekStartDay": "Monday" },

  "worktime":  { "maxDailyHours": 12.5, "maxWeeklyHours": 50, "minPauseHours": 11,
                 "overtimeThreshold": 45 },

  "surcharges": {                              // Landes-Default (Settings-Ebene)
    "nightRate": 0.25, "holidayRate": 1.0,
    "nightWindow": { "start": "23:00", "end": "06:00" },          // K2
    "stackingMode": "highestWins",                                 // K4 → wählt Macro-Variante (Abschnitt 3.5)
    "rateModes": { "night": "multiplier" },                        // K19
    "compensationModes": { "night": "timeCredit" },                // K9 (Art. 17b)
    "timeCredit": { "expiryMonths": 3 },
    "overtime": { "basis": "week", "tiers": [ { "afterHours": 45, "rate": 0.25 } ] }  // K3
  },

  "compliance": {                              // Settings + Entities gemischt
    "enforcement": { "defaultMode": "warn",
                     "rules": { "minRestHours": "block" },
                     "allowSupervisorOverride": true },            // K1
    "qualifications": { "expiredMandatoryBlocks": true, "expiryWarningDays": 30 },  // K11
    "periodCaps": [ { "period": "year", "scope": "overtimeHours", "capHours": 140 } ],  // K5 → Entity
    "rollingAverages": [],                                         // K6 → Entity
    "restDayRotations": [ { "dayOfWeek": "sunday", "minFree": 2, "windowWeeks": 4 } ],  // K10 → Entity
    "rosterPublication": { "minLeadDays": 14 },                    // K15
    "counterRules": [ { "event": "nightShift", "period": "year",
                        "threshold": 25, "action": "applySurcharge" } ]  // K18 → Entity
  },

  "wages": { "currency": "CHF", "minimumWage": null },             // K13

  "industryProfiles": {                        // K20 → Entity-Import (SchedulingRules + Kataloge)
    "spitex": {
      "schedulingRulePresets": [
        { "name": "CH Spitex Standard", "maxWeeklyHours": 50, "nightRate": 0.25,
          "validFrom": "2026-01-01" } ],
      "qualificationCatalog": [ { "name": "FaGe", "mandatory": false } ],
      "features": { "tourOptimization": true }
    },
    "security": {
      "schedulingRulePresets": [
        { "name": "CH Security 210h", "nightWindow": { "start": "23:00", "end": "06:00" },
          "counterRules": [ { "event": "nightShift", "period": "year", "threshold": 25 } ] } ],
      "qualificationCatalog": [ { "name": "Bewachungsbewilligung", "mandatory": true } ]
    },
    "logistik": {
      "features": { "drivingTime": true },
      "compliance": { "drivingTime": { "maxDailyDrivingHours": 9,
                                        "breakAfterDrivingHours": 4.5, "breakMinutes": 45 } }  // K14
    }
    // spitaeler, hausdienste analog
  }
}
```

Apply-Semantik v2: Settings-Sektionen → Upsert wie heute, aber pro Sektion hash-verglichen re-anwendbar. Entity-Sektionen (`periodCaps`, `restDayRotations`, `counterRules`, `industryProfiles.*`) → Upsert über Natural Key mit Import-Marker, kunden-editierte Zeilen ausgenommen. `defaultIndustry`/`RegionSetup__Industry` → wählt Default-Preset + Feature-Gates.

---

## 6. Technische Fallen (priorisiert, alle code-verifiziert)

1. **Marker-Bug/-Design:** `ApplyAsync` prüft nur `marker != null` (`RegionSetupService.cs:66-71`) — der gespeicherte SHA256 wird **nie verglichen**. Ohne Fix erreicht keine v2-Sektion irgendeine Bestandsinstallation. → Welle 0, nicht verhandelbar.
2. **`[JsonUnmappedMemberHandling(Disallow)]` + Startup-Apply:** Ein v2-File auf einem alten Binary crasht den **kompletten API-Start**. Deploy-Reihenfolge zwingend: erst Binary, dann File. Alternativ Root-DTO auf tolerant + `version`-Gate (empfohlen: fail-fast nur bei `version` > unterstützt).
3. **Zwei Leser:** `DatabaseInitializer` parst dasselbe File (`DatabaseInitializer.cs:190-216`) — Schema-Änderung muss beide Leser abdecken, sonst Seed-Verhalten inkonsistent.
4. **Settings-Defaults = 0 bei fehlender Zeile** (`ParseDecimal` → 0, `ClientContractDataProvider.cs:213-227`): neue Setting-Keys brauchen echte Code-Defaults, sonst bedeutet „Land hat den Key nicht gesetzt" plötzlich „Grenzwert 0".
5. **Legacy-Key-Mapping** WE1/WE2 → `saRate`/`soRate` (`RegionSetupService.cs:288-292`): bei Schema-v2 nicht „reparieren" (Bestandsdaten!), nur dokumentieren.
6. **Seed-Macro ist eine DB-Zeile:** K2 ändert den Macro-Text (`MacrosSeed.cs:75`) — Bestandsinstallationen brauchen Migration/Re-Import, Kunden-editierte Custom-Macros dürfen nicht überschrieben werden.
7. **Preset ≠ Zuweisung:** Entity-Import kann Rules anlegen, aber niemand hängt sie automatisch an bestehende Contracts. „Vorkonfiguriert" gilt für Neuinstallation + neue Verträge (Default-Rule); Bestands-Zuordnung bleibt Kundenaktion — ehrlich kommunizieren.
8. **Language-Plugin-Install ausserhalb der Transaktion** (`RegionSetupService.cs:77`): bei sektionsweisem Re-Apply Reihenfolge/Fehlerpfade neu durchdenken.
9. **Jede Preset-Zahl ist eine fachliche Behauptung:** 30 Länder-Packs × Branchen brauchen dieselbe Fact-Check-Pipeline wie die Marketing-Texte (Otto-Review), plus `validFrom`-Pflege bei Tarifrunden. Der Content-Aufwand übersteigt langfristig den Code-Aufwand.

---

## 7. Revidierte Umsetzungs-Reihenfolge (gegenüber Gap-Analyse Teil 3)

Änderung: K20-Import-Mechanik und Schema-v2-Grundgerüst rücken nach vorn, weil die Branchen-Vorkonfiguration (User-Vorgabe) ohne sie nicht existiert.

**Welle 0 — Fundament (S+M):**
1. Sektionsweise Marker **mit Hash-Vergleich** + `version`-Feld + JSON-Schema-Datei + CI-Validierung der Länderdateien.
2. **Entity-Import-Mechanik** (K20-Kern): Upsert über Natural Keys, Import-Marker, Kunden-Edit-Schutz, gleiche UnitOfWork-Transaktion. Erste Nutzlast: `schedulingRulePresets` (nur bestehende Rule-Felder — sofort nutzbar für Tarif-Presets wie PC 330, ohne auf K1–K19 zu warten!).
3. `industryProfiles`-Struktur + `RegionSetup__Industry`-Selektor + Feature-Gate-Sektion.

**Welle 1 — Quick Wins (S/M):** K2 St. 1 Nachtfenster (Settings **+ Rule-Felder** `NightStart/NightEnd` für Branchen-Override) · K11 Qual-Ablauf-Block + `qualificationCatalog` · K1 Enforcement · K15 Publikationsfristen · K19 Fixbetrag-Modus. Danach erste vollständige Land×Branche-Pakete für die Pilotländer AT/CH/DE/FR/IT möglich.

**Welle 2 — Compliance-Hebel (M/L):** K5 Perioden-Caps → K6 Rolling Averages (gemeinsame Engine, Entity-Sektion) · K3+K4 OT-Typ + Stacking (löst die einzigen harten Zuschlags-❌ FR/AT) · K12 St. 1 · K10 · K13 · K18 · K14 St. 1 · K16 — Reihenfolge nach Vertical-Priorität (CH-Spitex → K10/K9; AE/SA → K16; DE-Branchen → K13).

**Welle 3 — strategisch (L/XL):** K9 TOIL (vor CH-Push Pflicht) · K17 · K8 Payroll (erst Config-UI + DATEV-Validierung, Packs nur mit Pilotkunde) · K7/K14-Tacho bleiben dokumentierte Nicht-Features.

Pro umgesetzter Welle: Marketing-Gegenpass (vorsichtige Formulierungen wieder verstärken, per-Land-Diff + Otto-Runde + Übersetzungs-Sync) und DevKnowledge-Update.

---

## 8. Offene Entscheidungen (User)

1. **Branchen-Selektor-Semantik:** genau eine Branche pro Instanz (`RegionSetup__Industry`) oder mehrere (Mischbetrieb, Liste)? Empfehlung: Liste erlauben — der Contract-Preset-Mechanismus trägt das ohne Mehraufwand.
2. **Umfang der Auslieferung:** alle Presets eines Landes immer importieren (einfach, empfohlen) oder nur die der gewählten Branche (schlankere Instanz)?
3. **Alt-Marker-Migration:** Bestandsinstallationen mit `REGION_SETUP_APPLIED` — sollen v2-Sektionen dort automatisch nachziehen (empfohlen, per Sektions-Marker) oder nur Neuinstallationen v2 erhalten?
4. **Admin-Endpoint „Setup neu anwenden":** Komfort-Feature ja/nein (Startup-Restart genügt funktional).
5. Aus dem Handoff weiterhin offen: „Open Source"-Claim, CTA-/Demo-Flows, DATEV-Wording (LODAS vs. Lohn+Gehalt).
