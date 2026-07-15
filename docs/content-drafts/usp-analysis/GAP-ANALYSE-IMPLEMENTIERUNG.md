# Gap-Analyse: Was fehlt Klacks, um alle Marketing-USP-Versprechen voll zu erfüllen — und wie implementiert man es länderspezifisch via region-setup.json

Stand: 2026-07-15. Quellen: `USP-KLACKS-MAPPING.md` (Backbone + Master-Tabelle), alle 30 `mapping-<xx>.md` (25 Länder + Pilotländer at/ch/de/fr/it, inkl. KORREKTUR-Notiz in `mapping-vn.md`), `klacks-capabilities.md` (Code-Inventur), Region-Setup-Recherche 2026-07-15. Alle Aussagen über den heutigen Code-Stand wurden gegen den echten Code in `/mnt/c/SourceCode/Klacks.Api` nachverifiziert (Datei:Zeile-Referenzen in Teil 2).

**Design-Vorgabe (User):** Es ist nicht sinnvoll, alle Fähigkeiten für alle Länder zu bauen und global zu aktivieren. Das `region-setup.json`-Profil pro Land steuert, welche Regeln, Zuschlagsmodi, Zeitfenster und Enforcement-Stufen gelten. Jede Lücke unten hat deshalb einen konkreten JSON-Sektions-Vorschlag.

**Verifizierte Code-Anker (Kurzreferenz):**

| Behauptung | Beleg |
|---|---|
| Nachtfenster hart 23:00–06:00 | `Klacks.Api/Infrastructure/Persistence/Seed/MacrosSeed.cs:75` — `NightHours = TimeOverlap("23:00", "06:00", StartTime, EndTime)` im Seed-Macro `AllShift` |
| Kein Zuschlag-Stacking (höchster Satz gewinnt) | `MacrosSeed.cs:87–119` — Kaskade `IF HasHoliday AndAlso HolidayRate > NRate THEN …` wählt pro Segment das Maximum, addiert nie |
| Kein Überstunden-Zuschlagstyp | `Klacks.Api/Domain/Enums/SurchargeType.cs:5–12` — genau `Night=1, Weekend1..3, Holiday=5`, kein `Overtime` |
| `OvertimeThreshold`/`MaximumHours` nicht ausgewertet | `SchedulingRule.cs:27/:31` definieren die Felder; `Application/Services/Schedules/ScheduleValidationBuilder.cs` (Methoden `AddRestViolations:18, AddOvertime:44, AddConsecutiveDays:74, AddWeeklyOvertime:110, AddMinRestDays:142, AddCollisions:176`) referenziert **keines** der beiden Felder (grep leer) |
| Wochenprüfung nur pro ISO-Einzelwoche | `ScheduleValidationBuilder.cs:110–140` (`AddWeeklyOvertime` iteriert `MondayOf(...)` in 7-Tage-Schritten, kein Rolling Window) |
| Kein Basislohnfeld im Vertrag | `Domain/Models/Associations/Contract.cs:17–33` — nur `GuaranteedHours/MaximumHours/MinimumHours` + 5 Raten-Multiplikatoren, kein `BaseWage`/`HourlyRate` |
| Freie Sonntage kein Regeltyp | `SchedulingRule.cs:13` (`MinRestDays`, wochentag-agnostisch) + `:61` (`WorkOnSunday` = Planungsflag, keine Verstoss-Warnung) |
| region-setup schreibt nur Settings | `Application/DTOs/Setup/RegionSetupProfile.cs:8–29` (Sektionen languages/locale/calendar/worktime/surcharges/export); `Infrastructure/Services/Settings/RegionSetupService.cs:57` (`ApplyAsync`), `:106` (`BuildPlan`); Idempotenz-Marker `SettingKeys.cs:55` (`REGION_SETUP_APPLIED`) |
| Payroll-Formatter-Registry additiv | `Domain/Interfaces/Exports/IPayrollExportFormatter.cs:12`; region-setup validiert `defaultPayrollTargetSystem` bereits gegen die DI-Registry |

---

## Teil 1: Konsolidierte Versprechens-Liste

Verdichtung der ~950 bewerteten USP-Zeilen (Bilanz Master-Tabelle: ~620 ✅ · ~274 ⚠️ · 12 ❌) auf 20 wiederkehrende Kategorien. „Betroffene Länder" = Länder, deren Mapping mindestens eine ⚠️/❌-Zeile dieser Kategorie enthält (Pilotländer at/ch/de/fr/it eingeschlossen).

> **Hinweis zur Lesart:** Die Block-B/C-Bewerter haben „überwacht/geprüft" konsequent als ✅ gewertet (Monitoring ist real); Block-A und Nahost strenger. Wo ein Mapping etwas als ✅ „abbildbar" markiert, das der Code-Inventur widerspricht (z.B. TW/GR „Zuschlags-Zeitfenster frei konfigurierbar", FI/GR „OT-Staffel als Multiplikator abbildbar"), gilt die Code-Inventur: Zeitfenster und OT-Staffeln sind heute NUR per Custom-Macro-Edit erreichbar, nicht per Setting/UI. Diese Fälle sind unten als betroffen mitgezählt (dokumentierte Korrektur analog `mapping-vn.md`).

| # | Versprechens-Kategorie | Status heute | Betroffene Länder | Was konkret fehlt |
|---|---|---|---|---|
| K1 | **Caps hart sperren/erzwingen** („Verstösse entstehen gar nicht erst", „blockiert", „gar nicht verplanbar") | ⚠️ | praktisch alle 30 (explizit hart formuliert: at, ch, de, fr, ae, sa, il, th, id, ro, nl, tw, vn, cn, be, gb) | Warn-Engine blockiert das Speichern NIE; harte Vetos existieren nur im GA-Autofill-Pfad (Stage 0). Fehlt: Opt-in-Modus `warn → block` pro Regel für den manuellen Editier-/Speicherpfad |
| K2 | **Nachtzuschlag-Zeitfenster landesspezifisch** (22–04 AE, 22–05 JP, 22–06 IL/KR/VN/RO/ES, 21–06 FR-Security/NO/PT, 21–05 NL, zweistufig 20–22/22–06 BE) | ⚠️ | ae, jp, il, kr, vn, fr, ro, pt, no, nl, be, es, gr, se (14+; ch/gb passen zufällig auf 23–06) | Fenster ist String-Literal im Seed-Macro, kein Setting, kein UI-Feld, keine region-setup-Anbindung; mehrstufige Fenster (BE, NL-ORT 5 Stufen) gar nicht |
| K3 | **Eigener Überstunden-Zuschlagstyp** (gestufte OT-Prämien: AT 75 %, FR 25/50 %, IL 125/150 %, VN 150/200/300 %, CN 150 %, JP 50 % ab 60 h, CH 25 %, GR 20/40/120 %, FI/TW-Staffeln …) | ❌ | at, ch, fr, sa, il, jp, cn, kr, vn, pl, ro, cz, gr, fi, tw, my, th, id, no, dk, be, se, es (fast alle) | `SurchargeType` kennt keinen Overtime-Typ; `OvertimeThreshold` wird von keiner Engine ausgewertet; „ab der n-ten Stunde"-Positionslogik fehlt komplett. Einzige harte ❌ in FR (2×) und AT (Hausdienste) |
| K4 | **Zuschlag-Stacking kumulativ** (OT+Nacht addiert: KR bis 200 %, VN 210/270 %, PL 50/100+20 %) | ❌ | kr, vn, pl (Gegenstück BE „nur höchster" ist heute korrekt) | Engine ist fest „highest wins"; kein konfigurierbarer Stacking-Modus |
| K5 | **Monats-/Jahres-/Zyklus-Grenzwerte auswerten** (36協定 45/360/960 h JP, 36 h/Monat CN, 40/200/300 h VN, 46/54/138 h TW, 144 h/3 Wo AE, 416 h/Jahr CZ, 80 h/Jahr ES, 50/200 h SE, 200 h/12 M NO, 150 h banco PT, 140 h/Jahr CH, 1.607 h FR, 综合计算工时-Zyklen CN) | ❌ | jp, cn, vn, tw, th, ae, sa, ch, fr, cz, es, se, no, pt, gr, pl, ie, gb, at | `MaximumHours`-Felder existieren, aber KEIN Code prüft aufsummierte Monats-/Jahresstunden dagegen; `ClientPeriodHours`-Summen sind da, die Cap-Auswertung fehlt |
| K6 | **Rollierende Mehrwochen-/Mehrmonats-Durchschnitte** (17 Wo GB, 4/6 Mon IE, 16 Wo NL, 4 Mon ES/SE, Trimester/Jahr BE, 26 Wo CZ, 6 Mon PT, 17 Wo KA-AZG AT, 3 Wo SA/AE, 1–4 Mon PL, Quartal/Jahr CN) | ❌ | gb, ie, nl, es, se, be, cz, pt, at, sa, ae, no, cn, pl | Wochenprüfung nur pro ISO-Einzelwoche; kein Rolling-Window, kein frei definierbarer Referenzzeitraum |
| K7 | **Zeiterfassung per Gerät** (Biometrie, RFID/NHIS, Stempeluhr, Terminal/Kiosk, checkin@work, verifizierter Clock-in für ERGANI/registo de ponto/Ewidencja) | ❌ (strategisch) | ❌-Claims: ae, sa, il, kr, cn; Framing-⚠️: my, th, id, vn, be, gr, pt, pl, ro, es; Positiv-Nutzung („ohne Biometrie"): gb, no, pl, es, nl, se | Keinerlei Ist-Erfassung per Gerät (Suche nach fingerprint/punch/kiosk/nfc/rfid: null Treffer). Trägt 11 der 12 harten ❌ der Master-Tabelle |
| K8 | **Payroll-Packs & Lohn-Benefits über DE/DATEV hinaus** (WPS-SIF AE, Nitaqat/GOSI SA, Mahlzeitschecks + 240 h-Steuerfreigrenze BE, Fritvalg-Konten DK, ERGANI-Meldung GR, Provinzlöhne CN, Asien-Packs generell) | ❌ | be (3×❌), sa (2×❌), ae, dk, gr, cn + alle Asien-Länder ohne Formatter (jp, kr, tw, my, th, id, vn); de (DATEV nur MVP 5/11 Felder) | Formatter-Registry ist additiv vorhanden, aber keine Packs für Asien/Nahost ausser IL/AE/TR; Benefit-/Steuer-Logik ist bewusst kein Klacks-Scope (Schichtplaner, kein Payroll) |
| K9 | **Zeitgutschrift/Arbeitszeitkonto statt Geldzuschlag** (CH Art. 17b „10 % als Freizeit", FR 1 % repos compensateur, SA Freizeitausgleich, AE Ersatzruhetag/TOIL, CN „300 % nie durch Freizeit ersetzbar") | ❌ | ch (3 Seiten), fr, sa, ae, cn | `SurchargeItem.Amount` ist ein Betrag für den Payroll-Wage-Type-Export; kein Zeit-Ledger, kein TOIL-Konto, keine Auszahlungs-vs-Freizeit-Wahl |
| K10 | **Freie-Sonntage-/personenbezogene Ruhetag-Rotation** (CH „jeder 2. Sonntag frei" — einziges hartes ❌ der CH-Seiten, FR 2 freie Sonntage/Monat, PT 2 von 8 Wochen, NO jeder 3. Sonntag, IL Ruhetag nach Religion, KR 주휴일) | ⚠️/❌ | ch (❌), fr, pt, no, il, at, kr | Kein Regeltyp „n von m Sonntagen frei"; nur wochentag-agnostisches `MinRestDays` + `WorkOnSunday`-Planungsflag; Wochenendtage sind globales Setting, nicht pro Person/Religion |
| K11 | **Abgelaufene Pflicht-Qualifikation blockiert Zuteilung** („nur mit gültigem Ausweis/Lizenz") + Fuzzy-Matching | ⚠️ | alle 30 (wiederkehrendste ⚠️-Zeile überhaupt; explizit „nur gültig": de, ch, id, dk, gr, nl, sa, il) | `Expired` bei Pflicht-Qualifikation erzeugt Warning statt Error-Veto — Agent bleibt zuweisbar. Fuzzy-/Ersatz-Matching existiert nicht (bewusst; niedrigere Priorität) |
| K12 | **Ausgleichsruhezeit automatisch EINPLANEN mit Frist** (IT 3 Tage, PL 14 Tage, IE COP8, SE 14 Tage nach 9 h-Verkürzung, CZ 11→8 h-Ausgleich, DK holddrift 8 h, GR Εφημερία, NL 8 h nach Bereikbaarheitsdienst, RO Gardă-Nachholung, NO Kompensationsruhe) | ❌ | it, pl, ie, se, cz, dk, gr, nl, ro, no | Engine warnt bei Ruhezeit-Verstoss, plant aber keinen Ausgleich ein und trackt keine gesetzliche Ausgleichsfrist |
| K13 | **Basislohn-/Mindestlohnfeld** (PflegeArbbV-Stufen + RTV-Lohngruppen DE — 2 harte ❌, NLW GB, ERO IE, 31,40 PLN PL, Seniority-Staffeln NO, Stichtags-Umstellung RO, RM-4.000-Gating MY, Provinzlöhne CN) | ❌ | de (2×❌), gb, ie, pl, no, ro, my, fi, cn | `Contract` hat kein Basis-/Stundenlohn-Feld; Mindestlohn-Hinterlegung, Effektivlohn-Warnung und lohnschwellen-abhängiges Zuschlags-Gating (MY) sind unmöglich |
| K14 | **Lenkzeit-Domäne + Tachograph** (EU 561/2006, ARV1 CH, § 16 AZG AT, GB Domestic Rules, Reg. 168 IL, 56-Tage-Nachweis) | ❌ (strategisch) | Logistik-Seiten fast aller Länder: at (❌), ch, de (❌), fr, pl, ro, es, se, gb, cz, sa, il, cn, jp, th, ie | Keine Trennung Lenkzeit vs. Arbeitszeit, keine Segment-Pausenlogik („45 min nach 4,5 h Fahrt"), kein Tacho-Datenimport (2 harte ❌: at/de 56-Tage-Nachweis) |
| K15 | **Publikations-/Ankündigungsfristen für Dienstpläne** (BE 7 Werktage + Reform 2026, IE 24 h, NO 14 Tage, CZ 2 Wochen, DK 4 Tage, NL 4 Tage, ES 5 Tage, FI 1 Woche, GB ERA 2025, CH BGAP, AT SWÖ 1./14. Vormonat) | ⚠️ | be, ie, no, gb, ch, at, dk (als Lücke); nl, cz, es, fi (heute schon als „Sichtbarkeit" ✅ formuliert) | Kein Regeltyp „Plan muss bis X Tage vor Beginn publiziert sein"; keine Frist-Warnung, kein Publikations-Status |
| K16 | **Saisonale Tageszeit-Verbotsfenster** (Mittagsverbot 12:30–15:00, 15.6.–15.9., AE + SA, inkl. „nur unüberdachte Flächen") | ❌ | ae (2 Seiten), sa (2 Seiten) | Kalender-DSL berechnet nur Feiertags-DATEN; kein Tageszeit-Bann als Planungs-Constraint, kein Überdacht-Attribut |
| K17 | **Bereitschafts-/Pikett-Zeitkategorien** (CH Präsenz- vs. Rufpikett, CN 值班↔加班-Klassifizierung, ES tiempo de presencia, IE POA, JP 手待時間, AT Rufbereitschaft 30 Tage/3 Mon) | ⚠️ | ch, cn, es, ie, jp, at, (se, cz teils ✅) | `WorkChangeType` kennt Correction/Replacement/Travel/Briefing/Debriefing — keine On-Call-Kategorie mit eigener Anrechnungs-/Vergütungslogik |
| K18 | **Ereignis-Zähler-Regeln** (CH „ab der 25. Nacht/Jahr", GR 6.-Arbeitstag-40 % + 37,5 13-h-Tage/Jahr, AT Schwerarbeitstage ≥12/Monat, GB Nachtarbeiter-Erkennung ≥3 h + Gesundheitscheck-Fälligkeit, NL Schiphol max. 10 Startzeiten + Q4-15 %-Trigger, JP 5-Tage-Pflichturlaub, DK Änderungs-/Varsko-Prämien) | ❌ | ch, gr, at, gb, nl, jp, dk, be (Änderungsprämie) | Keine generische „zähle Ereignis X über Zeitraum Y, ab Schwelle Z Aktion"-Regel; jede dieser Zusagen ist heute unbelegt |
| K19 | **Feste Geldbetrag-Zuschläge** (FI 0,73/1,36 €/h, NO min. 29/75 NOK/h, IE €20/Nachtschicht + €1/h, DK 30,85/525,29 DKK, SE SEK/h-Sätze, BE €/km + €7-Pauschale) | ⚠️ | fi, no, ie, dk, se, be | Zuschlags-Raten sind ausschliesslich Multiplikatoren (0.10 = 10 %); Fixbetrag pro Stunde/Schicht/Tag passt nicht ins Modell (Workaround „Basissatz kalkulieren" ist fehleranfällig) |
| K20 | **Länder-/Tarif-Preset-Packs** („Paritair Comité automatisch berücksichtigt" BE, „CCT automatisch aktuell" PT, Overenskomst-/Tarifstufen-Umstellung DK/NO/SE/FI) | ⚠️ | be, pt, dk, no, se, fi (+ alle: Erstkonfigurations-Aufwand) | region-setup schreibt heute NUR globale Settings — keine `SchedulingRule`-Datensätze, keine Zuschlags-Profile pro Tarif/Branche, keine datierten Satz-Umstellungen. „Automatisch aktuell" ist ohne Preset-Import ein Überversprechen |

**Sonstige Einzelfälle** (je 1 Land, in Teil 2 nur als Randnotiz): DE PpUGV-Besetzungs-Soll (über generische Coverage-Konfiguration abbildbar, kein eigenes Modul), GB TUPE-Übernahme-Automatik, BE Rimpelregeling (altersabhängige Freistellung) + Sprachgesetz-Dokumentausgabe, FR km-Pauschale 0,40 €/km (→ K19/K8), FR Amplitude 12/13 h (Tagesspanne inkl. Pausen ≠ `MaxDailyHours` — kleines neues Feld `MaxDailySpanHours`, Aufwand S), Wegzeit-Autobuchung aus Tourenoptimierung (ch/fr/jp — heute manueller Dialog), CZ 3-Personen-Gleichzeitigkeits-Limit, Urlaubs-Accrual (JP 5-Tage-Pflicht, CZ DPP, SE arbetstidsförkortning), „Open Source"-Claim (at/fr — Lizenzfrage, keine Code-Fähigkeit, separat mit Produkt-/Rechtsseite klären).

---

## Teil 2: Implementierungskonzepte pro Lücke

Alle Konzepte folgen Clean Architecture: neue Regeln als Domain-Modelle/Enums, Auswertung in Application-Services, Persistenz/Settings in Infrastructure, Commands/Queries via IMediator (Handler-Pattern), UI-Erweiterungen in den bestehenden Settings-Komponenten.

### Querschnitt zuerst: Idempotenz-Marker-Falle (Voraussetzung für ALLE neuen Sektionen)

**Problem:** `RegionSetupService.ApplyAsync` (`RegionSetupService.cs:57`) läuft strikt GENAU EINMAL, gesteuert über das Setting `REGION_SETUP_APPLIED` (`SettingKeys.cs:55`) mit SHA256-Marker. Jede neue JSON-Sektion greift bei **Bestandsinstallationen nie** — ApplyAsync wird komplett übersprungen.

**Lösung (Aufwand S):** Feingranulare Marker pro Sektion (`REGION_SETUP_APPLIED_COMPLIANCE`, `REGION_SETUP_APPLIED_SURCHARGE_WINDOWS`, …). `BuildPlan` (`:106`) prüft pro Sektion: Marker fehlt UND Sektion im File vorhanden → anwenden. Der bestehende Gesamt-Marker bleibt für Alt-Sektionen gültig (Abwärtskompatibilität). Zusätzlich ein `version`-Feld im Root-DTO einführen (heute keine Schema-Versionierung), damit künftige Breaking Changes des Schemas fail-fast erkannt werden. Da `RegionSetupProfile` `[JsonUnmappedMemberHandling(Disallow)]` trägt (`RegionSetupProfile.cs:7`), lehnen ALTE Binaries neue Sektionen hart ab — neue Sektionen dürfen deshalb erst ausgerollt werden, wenn die Ziel-Version deployed ist (Deploy-Reihenfolge dokumentieren).

---

### K1 — Regel-Enforcement-Modus `warn | block` (Opt-in pro Regel)

**Was fehlt:** Alle Zeitverstösse sind `Warning`; nur Kollisionen, Reisezeit und fehlende (nicht abgelaufene) Pflicht-Qualifikation sind `Error`. Auch Errors blockieren das Speichern nicht („Never blocks the save"). Der GA hat harte Stage-0-Vetos (`MaxDailyHours`, `MinPauseHours`, `MaxConsecutiveDays`, `MaximumHoursContractCap` — `Stage0HardConstraintChecker.cs`), der manuelle Pfad nicht.

**Implementierungsansatz:**
- Neues Domain-Enum `RuleEnforcementMode { Warn, Block }` + Konfigurations-Map pro Regelart (`MaxDailyHours`, `MaxWeeklyHours`, `MinRestHours`, `MinRestDays`, `MaxConsecutiveDays`, künftig `PeriodCap`, `RollingAverage`).
- `PreCommitConflictChecker` (bestehender Baseline-vs-Augmented-Diff, `Infrastructure/Services/Schedules/PreCommitConflictChecker.cs`) ist der richtige Hebel: Er meldet heute nur *neu entstehende* Verstösse — genau diese werden bei `Block` als abweisender Fehler (HTTP 409/422 mit Verstoss-Liste) aus dem Save-Command-Handler zurückgegeben. Bestehende Altverstösse blockieren nie (sonst wird die Instanz unbedienbar).
- Supervisor-Override-Flag im Command (`overrideBlock: true` + Audit-Log-Eintrag), damit Notfälle (Spital!) nie hart scheitern — das ist auch die ehrliche Marketing-Formulierung: „blockiert, mit dokumentiertem Übersteuern".
- UI: Badge im Speichern-Dialog; Settings-Karte „Enforcement" in `settings/scheduling-rules/`.

**region-setup.json-Anbindung** (neue Sektion `compliance`, neues DTO `RegionSetupCompliance.cs`):

```json
"compliance": {
  "enforcement": {
    "defaultMode": "warn",
    "rules": {
      "maxDailyHours": "block",
      "minRestHours": "block",
      "maxWeeklyHours": "warn",
      "maxConsecutiveDays": "warn"
    },
    "allowSupervisorOverride": true
  }
}
```

→ Neue Setting-Keys `COMPLIANCE_ENFORCEMENT_<RULE>` analog zu den `SCHEDULING_*`-Keys (`SettingKeys.cs:31–46`), geschrieben über eine `AddComplianceSettings`-Methode nach dem Muster `AddWorktimeSettings`. Damit erzwingt z.B. TH/ID/SA die 12-h-Tagesgrenze hart, während DE/CH beim Warn-Modus bleiben.

**Aufwand: M.** Risiken: UX (Block darf Massen-Operationen/Bulk-Ops nicht unbrauchbar machen → nur neue Verstösse blocken); Klacksy-Skills, die Works schreiben, müssen den Block-Fehler sauber an den Chat zurückgeben; Idempotenz-Falle (siehe Querschnitt).

---

### K2 — Konfigurierbares Nachtzuschlag-Zeitfenster (inkl. Mehrfach-Fenster)

**Was fehlt:** Das Fenster ist ein String-Literal im Seed-Macro (`MacrosSeed.cs:75`). Kein Setting, kein UI-Feld. Länderbedarf: 22–04 (AE), 22–05 (JP), 22–06 (IL/KR/VN/RO/ES), 21–06 (FR-Security/NO/PT), 21–05 (NL-Logistik), zweistufig 20–22 @12 % + 22–06 @22,5 % (BE-Security).

**Implementierungsansatz:**
- Stufe 1 (einfaches Fenster): Macro-Variablen `NightStart`/`NightEnd` als IMPORT-Werte statt Literal; `MacroDataProvider` (`Infrastructure/Services/Macros/MacroDataProvider.cs`) liefert sie aus der bestehenden Fallback-Kette `SchedulingRule → Contract → Settings → Default("23:00","06:00")`. Seed-Macro-Text anpassen: `NightHours = TimeOverlap(NightStart, NightEnd, StartTime, EndTime)`. Bestandsinstallationen: Seed-Macro-Update per Migration ODER dokumentierter Re-Import (Macros sind DB-Zeilen — vorhandene Custom-Macros nicht überschreiben!).
- Stufe 2 (Mehrfach-Fenster mit eigenen Sätzen, BE/NL): Liste typisierter Fenster (`SurchargeWindow { Type, Start, End, Rate }`) statt eines Einzelwerts; Macro-Schleife oder — sauberer — Segment-Splitting in C# vor dem Macro-Aufruf (`WorkMacroService.cs`). Deckt zugleich die NL-ORT-5-Stufen-Tabelle.

**region-setup.json-Anbindung** (Erweiterung des bestehenden `RegionSetupSurcharges.cs`):

```json
"surcharges": {
  "nightRate": 0.25,
  "nightWindow": { "start": "22:00", "end": "05:00" },
  "additionalWindows": [
    { "type": "night2", "start": "20:00", "end": "22:00", "rate": 0.12 }
  ]
}
```

→ Setting-Keys `SURCHARGE_NIGHT_START`, `SURCHARGE_NIGHT_END` (Stufe 1) bzw. JSON-Setting `SURCHARGE_ADDITIONAL_WINDOWS` (Stufe 2).

**Aufwand: S (Stufe 1) / M (Stufe 2).** Risiken: Duplizierte Zuschlags-Logik FE/BE (Wizard-Schätzung kennt das Fenster ebenfalls); Custom-Kunden-Macros mit hartem Literal bleiben unberührt (akzeptiert, dokumentieren); Mitternachts-Splitting existiert bereits und muss mit variablen Fenstern weiter stimmen (Testfall 22–04!). Höchste Abdeckung pro Aufwandseinheit in dieser Liste.

---

### K3 + K4 — Überstunden-Zuschlagstyp + Stacking-Modus

**Was fehlt:** `SurchargeType.cs:5–12` hat keinen Overtime-Typ; `OvertimeThreshold` (`SchedulingRule.cs:27`) wird nirgends ausgewertet (grep über Warn-Engine + Macro-Services leer); die Macro-Kaskade `MacrosSeed.cs:87–119` nimmt strikt das Maximum (kein Stacking). Benötigt werden: (a) „ab der n-ten Tages-/Wochenstunde Satz X, ab der m-ten Satz Y" (AT 75 % ab 11. Std., FR 25 % Std. 36–43 / 50 % ab 44, IL 125/150 %, VN 150 %), (b) Monats-/Jahresschwellen (JP 50 % ab 60 h/Monat — hängt an K5), (c) kumulativ mit Nacht (KR 200 %, VN 210/270 %, PL).

**Implementierungsansatz:**
- Enum erweitern: `Overtime1 = 6, Overtime2 = 7, Overtime3 = 8` (drei Stufen decken alle gefundenen Staffeln; VN braucht 3). Rein additiv — `SurchargeItem` (Check-Constraint) und `TryMapSurchargeType` (`MacroCompilationService.cs`) erweitern.
- Schwellenberechnung NICHT ins BASIC-Macro pressen (Tages-/Wochen-Kumulation über mehrere Works übersteigt den Macro-Scope), sondern als C#-Application-Service `OvertimeSurchargeCalculator` der VOR/NEBEN dem Macro läuft: summiert Ist-Stunden des Tages/der Woche (Datenbasis `PeriodHoursService`/Work-Aggregation existiert), splittet den Work in Normal-/OT1-/OT2-Segmente und erzeugt `SurchargeItem`s mit den neuen Typen. Konfiguration: `OvertimeThreshold`-Kette endlich auswerten + neue Staffel-Definition.
- Stacking-Modus als Konfigurationswert `SurchargeStackingMode { HighestWins, Additive }`: bei `Additive` addiert der Berechnungspfad Night+Overtime statt Maximum. Umsetzung als zweite Seed-Macro-Variante (`AllShiftAdditive`) ODER als C#-Nachverarbeitung der Segment-Raten — letzteres bevorzugt (eine Wahrheit, testbar in `Klacks.UnitTest`).

**region-setup.json-Anbindung:**

```json
"surcharges": {
  "stackingMode": "additive",
  "overtime": {
    "basis": "day",
    "tiers": [
      { "afterHours": 10, "rate": 0.75 },
      { "afterHours": 12, "rate": 1.00 }
    ]
  }
}
```

(FR: `"basis": "week"`, tiers ab 35/43 h; VN: 3 tiers; BE: `"stackingMode": "highestWins"` — heutiges Verhalten bleibt Default.)

**Aufwand: M/L.** Abhängigkeiten: K5 für Monats-basierte Schwellen (JP 60 h). Risiken: Payroll-Export mappt `SurchargeWageType` heute pauschal — neue Typen brauchen eigene Wage-Type-Zuordnung in `PayrollExportGroupConfig`; Wizard-1-Schätzung kennt die neuen Typen nicht (bewusste Vereinfachung dokumentieren); PL-Marketing-Text ist bereits als „faktisch falsch" markiert — bis zur Umsetzung MUSS die Umformulierung (highest-wins) bleiben.

---

### K5 — Perioden-Cap-Engine (Monat/Jahr/frei definierter Zyklus)

**Was fehlt:** Kein Code prüft aufsummierte Monats-/Jahresstunden gegen `MaximumHours` (verifiziert: `ScheduleValidationBuilder.cs` referenziert das Feld nicht; laut Inventur nur Plausibilitäts-Check min>max und Lohn-Macros). `ClientPeriodHours` summiert bereits Woche/2-Wochen/Monat (`PeriodHoursService.cs`) — die Auswertung gegen gesetzliche Caps fehlt.

**Implementierungsansatz:**
- Neues Domain-Modell `PeriodCapRule { Period (Month/Quarter/Year/CustomWeeks), Scope (TotalHours/OvertimeHours), CapHours, WarnAtPercent }` als eigene Tabelle (nicht weitere nullable Spalten auf `SchedulingRule` stapeln — mehrere Caps pro Land nötig: VN hat Tag+Monat+Jahr gleichzeitig).
- Application-Service `PeriodCapEvaluator`: nutzt `ClientPeriodHours`-Cache + On-Demand-Jahresaggregat; produziert `ScheduleValidationNotificationDto`s in denselben drei Pfaden wie heute (SignalR-Background, Pre-Commit, Periodenabschluss). „Overtime"-Scope braucht die OT-Abgrenzung aus K3 (Stunden über Soll) — Stufe 1 kann mit `TotalHours` starten und deckt JP/TW/AE/CZ/ES bereits.
- Ampel-UI („36協定-Ampel"): Prozent-Ausschöpfung pro Mitarbeiter im Schedule-Header — genau das, was JP/VN/TW-Seiten versprechen („Ausschöpfung visualisiert").
- 综合计算工时 (CN): `CustomWeeks`-Periode mit definiertem Startdatum deckt genehmigte Quartals-/Jahres-Zyklen; „OT erst nach Zyklus-Soll" = Scope `OvertimeHours` gegen Zyklus-`GuaranteedHours`.

**region-setup.json-Anbindung** (in `compliance` oder eigener Sektion):

```json
"compliance": {
  "periodCaps": [
    { "period": "month", "scope": "overtimeHours", "capHours": 45, "warnAtPercent": 80 },
    { "period": "year",  "scope": "overtimeHours", "capHours": 360, "warnAtPercent": 80 },
    { "period": "year",  "scope": "overtimeHours", "capHours": 960, "appliesTo": "contractTag:36kyotei-special" }
  ]
}
```

→ Hier reicht ein Settings-Key NICHT mehr: das sind Entity-Zeilen. region-setup braucht dafür den Entity-Import-Pfad (siehe K20) — Repository-Aufrufe in derselben UnitOfWork-Transaktion, idempotent über einen deterministischen Natural Key (z.B. `region:{period}:{scope}:{cap}`).

**Aufwand: M** (Stufe 1 TotalHours) / **L** (OT-Scope + CustomWeeks). Grösste Einzelhebel-Lücke: macht die Monats-/Jahres-Zusagen von 19 Ländern von „Summen sichtbar" zu „Warnung vor gesetzlichem Cap" ehrlich. Kombiniert mit K1 sogar „block".

---

### K6 — Rollierende Mehrwochen-Durchschnitte

**Was fehlt:** `AddWeeklyOvertime` (`ScheduleValidationBuilder.cs:110`) iteriert feste ISO-Wochen. GB (48 h im 17-Wochen-Schnitt), IE (4/6 Monate), NL (16 Wochen), ES/SE (4 Monate), BE (Trimester), CZ (26 Wochen), AT KA-AZG (17 Wochen) brauchen ein gleitendes Fenster.

**Implementierungsansatz:** Gleiche Infrastruktur wie K5 — `PeriodCapRule` um `RollingWindowWeeks` + `MaxAverageWeeklyHours` erweitern; `PeriodCapEvaluator` berechnet den Durchschnitt über das Fenster endend am geprüften Tag (Datenbasis Wochen-Summen aus `ClientPeriodHours`; Performance: nur für Clients mit Änderungen im Zeitraum neu rechnen, wie es der `ScheduleTimelineBackgroundService` heute schon scoped).

**region-setup.json:**

```json
"compliance": {
  "rollingAverages": [
    { "windowWeeks": 17, "maxAverageWeeklyHours": 48 }
  ]
}
```

**Aufwand: M** (auf K5 aufsetzend, sonst L). Risiko: Randbedingungen (Beschäftigungsbeginn mitten im Fenster, Abwesenheiten als Neutraltage — GB-WTR rechnet Urlaubs-/Krankheitstage speziell; erste Version dokumentiert vereinfachen).

---

### K7 — Zeiterfassung/Clock-in (strategische Entscheidung)

**Was fehlt:** Keinerlei Geräte-Ist-Erfassung (Biometrie/RFID/Stempel/Kiosk/GPS — Code-Suche null Treffer). Trägt 11 der 12 harten ❌ (AE/SA/IL/KR/CN-Biometrie, KR-RFID/NHIS).

**Empfehlung — als bewusste Nicht-Feature-Entscheidung dokumentieren:** Klacks' Identität ist Planungs- und Nachweis-System, KEIN Anwesenheits-Sensor. Sechs Länder-Seiten (GB, NO, PL, ES, NL, SE) nutzen „ohne Biometrie" bereits erfolgreich als Datenschutz-POSITIV-Argument (IMY-/Datatilsynet-/AEPD-Beanstandungen von Biometrie!) — Biometrie einzubauen würde dieses ehrliche Differenzierungsmerkmal zerstören. Die 12 ❌ werden redaktionell gelöst (Umformulierung, grösstenteils schon geschehen).
**Alternative auf der Roadmap (falls Markt es erzwingt): Terminal-/Import-API statt eigener Hardware** — ein `POST /api/clock-events`-Endpoint (Handler/Mediator, neues Domain-Modell `ClockEvent { ClientId, Timestamp, Direction, SourceDeviceId, Signature }`), der Fremd-Terminals (die der Kunde on-premise betreibt) andocken lässt und Soll/Ist-Abgleich gegen den Plan liefert. Damit bleiben biometrische Rohdaten beim Terminal-Hersteller/Kunden, Klacks speichert nur Zeitstempel — konsistent mit der On-Premise-Story. Deckt GR-ERGANI-, PT-registo-, BE-checkin@work-Narrative als „liefert die Ist-Zeitbasis".

**region-setup.json:** `"features": { "clockEventsApi": true }` (Feature-Gate pro Land, Default aus).

**Aufwand: XL** (auch die API-Variante: neues Bounded-Context-Modell, Abgleich-UI, Manipulationsschutz). Keine kurzfristige Umsetzung; Marketing bleibt bei der Umformulierungs-Strategie.

---

### K8 — Payroll-Packs über DE/DATEV hinaus

**Was fehlt:** Registry (`IPayrollExportFormatter.cs:12`) ist additiv und per region-setup (`export.defaultPayrollTargetSystem`, validiert gegen DI-Registry) bereits länderspezifisch wählbar. Fehlend: Asien-Packs komplett (JP/KR/TW/MY/TH/ID/VN/CN), AE WPS-SIF; DATEV selbst ist MVP (Felder 1–5/11); `PayrollExportGroupConfig` hat keine Edit-UI (nur DB-Seeding); Benefit-/Steuer-Logik (BE Mahlzeitschecks/240 h, DK Fritvalg, SA GOSI/Nitaqat) ist Lohnbuchhaltung und bleibt AUSSERHALB des Scopes (Reframe: „Klacks liefert die Stunden-/Zuschlagsbasis, das Lohnsystem rechnet").

**Implementierungsansatz:** (1) Zuerst die Config-UI für `PayrollExportGroupConfig` (TargetSystem, Wage-Types, Absence-Mapping) — ohne sie ist jedes neue Pack praktisch tot. (2) DATEV-Feldabdeckung mit Steuerberater validieren (Blocker ist fachlich, nicht technisch). (3) Neue Packs strikt nachfragegetrieben, je Pack ein Formatter + Registrierung (rein additiv, Muster `DatevLugBewegungsdatenFormatter.cs`). Priorität nach Markteintritt, nicht auf Vorrat.

**region-setup.json** (Sektion existiert — nur erweitern):

```json
"export": {
  "enabledFormats": ["csv", "xlsx"],
  "defaultPayrollTargetSystem": "GenericDelimited",
  "payrollGroupDefaults": {
    "baseWageType": "1000",
    "surchargeWageTypes": { "night": "2010", "holiday": "2030", "overtime1": "2040" },
    "delimiter": ";",
    "encoding": "UTF-8"
  }
}
```

→ `payrollGroupDefaults` seedet eine Default-`PayrollExportGroupConfig` (Entity-Import-Pfad, K20) und löst das „fehlende Zeile → leere Wage-Types"-Problem bei Neuinstallationen.

**Aufwand:** Config-UI **M**; pro Länderpack **L** (Format-Recherche + Validierung dominiert); Gesamtambition **XL/strategisch**. Risiko: unvalidierte Packs schaffen Support-Last — kein Pack ohne Pilotkunden ausliefern.

---

### K9 — Zeitgutschrift/Arbeitszeitkonto (TOIL) statt Geldzuschlag

**Was fehlt:** `SurchargeItem.Amount` ist ein Geld-orientierter Wert, der als `SurchargeWageType` in den Payroll-Export fliesst. CH Art. 17b verlangt ZEIT-Kompensation (10 % Zeitgutschrift), FR repos compensateur, SA/AE Ersatzruhetag.

**Implementierungsansatz:**
- Neues Feld `CompensationMode { Payout, TimeCredit }` pro Zuschlags-Typ (in der Raten-Fallback-Kette, analog `NightRate`).
- Neues Domain-Modell `TimeCreditEntry { ClientId, SourceWorkId, Hours, EarnedOn, ExpiresOn?, ConsumedByBreakId? }` — ein einfaches Ledger. Bei `TimeCredit` erzeugt die Zuschlagsberechnung statt eines Payroll-Betrags einen Ledger-Eintrag (Stunden = Segment × Rate).
- Konsum: Gutschrift wird über einen bestehenden Abwesenheits-/Break-Typ „Zeitausgleich" abgebaut; Saldo-Anzeige beim Client (analog `GuaranteedHours`-Soll/Ist). Verfall (`ExpiresOn`) deckt die „3-Monats-Ausgleichsfrist" (CH-Security 210 h) als Warnung.
- Payroll-Export: TimeCredit-Einträge NICHT als Lohnart exportieren (oder als Info-Spalte) — Abgrenzung sauber halten.

**region-setup.json:**

```json
"surcharges": {
  "compensationModes": { "night": "timeCredit", "holiday": "payout" },
  "timeCredit": { "expiryMonths": 3 }
}
```

**Aufwand: L.** Abhängigkeit: sauberes Zusammenspiel mit `PeriodHoursService` (Gutschriften dürfen Ist-Stunden nicht doppelt zählen). Deckt das grösste systemische CH-Risiko (3 Seiten) + FR/SA/AE.

---

### K10 — Freie-Sonntage-/n-ter-Wochentag-Regeln (personenbezogen)

**Was fehlt:** Kein Regeltyp „mindestens n freie Sonntage in m Wochen" (`SchedulingRule.cs` hat nur `MinRestDays:13` + `WorkOnSunday:61` als Planungsflag ohne Warnung). CH „jeder 2. Sonntag frei" ist das einzige harte ❌ der CH-Seiten; dazu FR (2/Monat), PT (2 von 8 Wochen), NO (jeder 3. Sonntag), IL (Ruhetag nach Religion — personenspezifischer Tag), KR 주휴일.

**Implementierungsansatz:**
- Neuer Regeltyp `WeeklyRestDayRule { DayOfWeek, MinFreeCount, WindowWeeks, PerPerson? }` (Domain), ausgewertet im `ScheduleValidationBuilder` (neue Methode `AddRestDayRotation` neben `AddMinRestDays:142`) UND als GA-Soft/Hard-Constraint (Stage 0-Veto optional via K1-Enforcement, sonst Stage 3), damit „automatisch geplant" für den Autofill-Pfad wahr wird.
- Personenbezogener Ruhetag (IL): `DayOfWeek` pro Client übersteuern (Feld am Client/Contract `WeeklyRestDay`), Zuschlags-Mapping des Ruhetags folgt diesem Feld statt dem globalen `CALENDAR_WEEKEND_DAYS`.

**region-setup.json:**

```json
"compliance": {
  "restDayRotations": [
    { "dayOfWeek": "sunday", "minFree": 2, "windowWeeks": 4 }
  ],
  "personalRestDayEnabled": true
}
```

**Aufwand: M** (Warnung + GA-Soft-Constraint) / **L** (personenbezogener Ruhetag inkl. Zuschlags-Umbau). Die Kalender-Rule-DSL hat seit 2026-07-13 bereits n-ten-Wochentag-Support für FEIERTAGE — dieser Regeltyp ist davon getrennt (Scheduling, nicht Kalender), Namenskollision in Doku vermeiden.

---

### K11 — Qualifikations-Ablauf blockiert Zuteilung (Opt-in)

**Was fehlt:** `EligibilityMatcher.EvaluateRequirement` klassifiziert `Expired`, aber nur `Missing` bei Pflicht-Qualifikation wird Error/GA-Veto; `Expired` bleibt Warning (`EligibilityMatrixBuilder.cs` — Error→Veto). „Nur mit gültigem Ausweis" (DE Bewacherregister, ID Satpam, DK, GR, NL, CH) ist damit falsch.

**Implementierungsansatz:** Ein Setting `QUALIFICATION_EXPIRED_MANDATORY_BLOCKS (bool)`; wenn true, wird `Expired` bei `IsMandatory` in `EligibilityMatrixBuilder` wie `Missing` behandelt (Error → GA-Veto → mit K1 auch Save-Block). Zusätzlich proaktive Vor-Ablauf-Warnung `QUALIFICATION_EXPIRY_WARNING_DAYS (int)` — mehrere Mappings (SA/KR-Logistik) merken an, dass die Vor-Ablauf-Warnung nicht bestätigt ist; als Zeitraum-Check im Gap-Report trivial nachzurüsten. **Fuzzy-Matching bewusst NICHT bauen** (kein Land verspricht es hart; exaktes Matching ist als ehrliche Formulierung etabliert).

**region-setup.json:**

```json
"compliance": {
  "qualifications": { "expiredMandatoryBlocks": true, "expiryWarningDays": 30 }
}
```

**Aufwand: S.** Bester Aufwand/Nutzen-Quotient der Liste: eine Verhaltensänderung an exakt einer Stelle, entfernt die wiederkehrendste ⚠️-Zeile aller 30 Mappings. Risiko: Bestandspläne mit abgelaufenen Quals erzeugen plötzlich Errors → nur für NEUE Zuweisungen anwenden (Pre-Commit-Diff-Prinzip).

---

### K12 — Ausgleichsruhezeit automatisch einplanen (mit Frist)

**Was fehlt:** Engine warnt bei Ruhezeit-Verstoss, plant aber nichts ein und kennt keine Ausgleichsfrist (IT 3 Tage, PL 14 Tage, SE 14 Tage, IE COP8, CZ, DK, GR, NL, RO, NO).

**Implementierungsansatz:**
- Stufe 1 (Frist-Tracking, M): Bei erkannter Ruhezeit-Verkürzung eine `CompensatoryRestObligation { ClientId, ShortfallHours, DueDate }` erzeugen; offene Obligationen im Validation-Feed + Periodenabschluss melden („Ausgleich fällig bis X"). Erfüllung wird erkannt, wenn im Fenster eine Ruhephase ≥ (Standard + Shortfall) liegt.
- Stufe 2 (Auto-Einplanung, L): GA-Erweiterung — offene Obligationen als zusätzliche Blocker-/Bedarfs-Slots in den `SlotConstraintFilter` einspeisen (Keyword-FREE-Mechanik existiert bereits als Sperr-Ebene); manueller Pfad bekommt einen „Ausgleich einplanen"-Vorschlags-Button (Klacksy-Skill).

**region-setup.json:**

```json
"compliance": {
  "compensatoryRest": { "enabled": true, "deadlineDays": 14, "autoPlan": false }
}
```

**Aufwand: M (Stufe 1) / L (Stufe 2).** Marketing kann nach Stufe 1 ehrlich „Frist wird überwacht" sagen; „automatisch eingeplant" erst nach Stufe 2.

---

### K13 — Basislohn-/Mindestlohnfeld

**Was fehlt:** `Contract.cs:17–33` hat kein Lohnfeld. DE-Entwürfe (PflegeArbbV-Stufen, RTV-Lohngruppen) sind deswegen harte ❌; GB/IE/PL/NO/RO versprechen Mindestlohn-Hinterlegung/Warnung; MY braucht lohnschwellen-abhängiges Zuschlags-Gating (RM 4.000).

**Implementierungsansatz:**
- `Contract.BaseHourlyWage (decimal?)` + `Currency` (Fallback-Kette wie üblich, region-setup liefert Default-Currency); optional `WageGroup (string)` für Tarif-Lohngruppen (RTV/PflegeArbbV als Katalog via K20-Presets).
- Mindestlohn als Vergleichswert: Setting `MINIMUM_WAGE` (+ optional datierte Staffel `[{validFrom, amount}]` — deckt RO-Stichtag 4.050→4.325). Neue Warnung „BaseWage < MinimumWage" (Plausibilitäts-Check beim Contract-Speichern + Perioden-Report). KEINE Effektivlohn-Berechnung (Payroll-Grenze!) — nur Feld-gegen-Feld.
- MY-Gating: `SurchargeEligibilityWageCeiling` — Zuschlags-Berechtigung pro Person aus `BaseHourlyWage`-Vergleich (kleiner Filter im Raten-Provider `BuildEffectiveData`).

**region-setup.json:**

```json
"wages": {
  "currency": "EUR",
  "minimumWage": { "hourly": 15.00, "schedule": [ { "validFrom": "2026-07-01", "hourly": 15.50 } ] },
  "surchargeEligibilityWageCeiling": null
}
```

**Aufwand: M** (Feld + Warnung) — die Payroll-Verwendung des Felds (Export als Basis-Lohnsatz) ist separat und optional. Risiko: Scope-Creep Richtung Lohnbuchhaltung aktiv abwehren; das Feld ist Referenzwert, keine Abrechnung.

---

### K14 — Lenkzeit/Tachograph (strategische Entscheidung)

**Was fehlt:** Keine Lenkzeit-Domäne (Fahren ≠ Laden/Warten), keine Segment-Pausenlogik („45 min nach 4,5 h Fahrt"), kein Tacho-Import. Betrifft die Logistik-Seite praktisch jedes Landes; harte ❌ nur bei AT/DE (56-Tage-Tacho-Nachweis).

**Empfehlung — zweistufig, Tacho-Hardware NICHT anfassen:**
- Stufe 1 (M, plannerisch): Schicht-Segment-Typ „Lenkzeit" (analog Travel-WorkChange) + zwei neue Regelfelder `MaxDrivingHoursPerDay`, `RequiredBreakAfterDrivingHours/BreakMinutes` im Validation-Builder. Damit werden „Lenkzeit geplant und überwacht"-Formulierungen ehrlich; der Plan weist Lenk-Segmente getrennt aus.
- Stufe 2 (XL, strategisch): Tacho-Datei-Import (.ddd) für Soll/Ist-Abgleich — nur bei echter Logistik-Vertical-Priorisierung. Der „56-Tage-Nachweis" bleibt bis dahin redaktionell gestrichen (Tacho-Daten hält der Fahrtenschreiber selbst vor, nicht Klacks — rechtlich ohnehin korrekt).

**region-setup.json:**

```json
"compliance": {
  "drivingTime": { "enabled": true, "maxDailyDrivingHours": 9, "breakAfterDrivingHours": 4.5, "breakMinutes": 45 }
}
```

**Aufwand: M (Stufe 1) / XL (Stufe 2).**

---

### K15 — Publikations-/Ankündigungsfristen

**Was fehlt:** Kein Regeltyp „Dienstplan muss n Tage/Werktage vor Periodenbeginn publiziert sein" (BE 7 Werktage, IE 24 h, NO 14 Tage, DK 4 Tage, CZ 2 Wochen, GB ERA 2025 offen).

**Implementierungsansatz:** Klacks hat bereits Lock-Level (`None → Confirmed → Approved → Closed`) — `Approved` kann als „publiziert" interpretiert werden. Neue Regel `RosterPublicationRule { MinLeadDays, CountWorkdaysOnly }`: Hintergrund-Check warnt, wenn Schichten innerhalb der Frist noch nicht `Approved` sind, und markiert kurzfristige Änderungen NACH Publikation (Basis für DK-Varsko-/NL-Verschuivings-Prämien via K18-Zähler). Werktage-Zählung nutzt die bestehende Kalender-DSL (Feiertage pro Land/Staat).

**region-setup.json:**

```json
"compliance": {
  "rosterPublication": { "minLeadDays": 14, "countWorkdaysOnly": false }
}
```

**Aufwand: S/M.** Deckt BE/IE/NO/DK/CZ/CH/AT-Fristen mit einem einzigen generischen Mechanismus.

---

### K16 — Saisonale Tageszeit-Verbotsfenster (AE/SA Mittagsverbot)

**Was fehlt:** Kein Planungs-Constraint „12:30–15:00 zwischen 15.6. und 15.9. für Aussenarbeit gesperrt"; kein Überdacht-Attribut.

**Implementierungsansatz:** `RestrictedTimeWindowRule { SeasonFrom (MM-DD), SeasonTo, DailyStart, DailyEnd, AppliesToGroupTag }` — Auswertung im Validation-Builder (Warnung; mit K1 blockierend) UND als GA-Slot-Filter (analog Break-Blocker), damit der Optimizer Split-Shifts automatisch um das Fenster herum legt (das AE-Versprechen „Split-Shifts automatisch vorgeschlagen"). „Überdacht/unüberdacht" NICHT als neues Fachattribut bauen — über Gruppen-/Shift-Tags scopen (`AppliesToGroupTag: "outdoor"`), Kunde taggt betroffene Objekte.

**region-setup.json:**

```json
"compliance": {
  "restrictedTimeWindows": [
    { "seasonFrom": "06-15", "seasonTo": "09-15", "dailyStart": "12:30", "dailyEnd": "15:00", "appliesToGroupTag": "outdoor" }
  ]
}
```

**Aufwand: M.** Nur 2 Länder, aber dort Kern-USP zweier Branchenseiten (Hausdienste/Logistik) inkl. Bussgeld-Story.

---

### K17 — Bereitschafts-/Pikett-Zeitkategorien

**Was fehlt:** Keine On-Call-Kategorie in `WorkChangeType` (Correction/Replacement/Travel/Briefing/Debriefing); keine Anrechnungslogik Präsenz- vs. Rufbereitschaft (CH), 值班 vs. 加班 (CN), tiempo de presencia (ES), POA (IE), 手待時間 (JP).

**Implementierungsansatz:** Neuer Schicht-/WorkChange-Typ `OnCall` mit Anrechnungsfaktor (`CountsAsWorkPercent`: 100 = Präsenzpikett, 0–x = Rufbereitschaft) + optionaler Vergütungsfaktor (CZ „10 % vergütet" ist heute schon via Zuschlag abbildbar). `PeriodHoursService` rechnet OnCall-Zeit mit dem Faktor in die Ist-Stunden; Perioden-Caps (K5) können OnCall ein-/ausschliessen (ES: „nur aktive Arbeit ins Überstundenlimit"). Automatische Re-Klassifizierung „substantielle Arbeit während 值班 → 加班" bleibt manuell (Umbuchung), wird NICHT versprochen.

**region-setup.json:**

```json
"worktime": {
  "onCall": { "enabled": true, "presenceCountsPercent": 100, "standbyCountsPercent": 25, "includeInPeriodCaps": false }
}
```

**Aufwand: M/L.** Abhängigkeit: K5 (Cap-Scope).

---

### K18 — Generische Ereignis-Zähler-Regeln

**Was fehlt:** „Ab der 25. Nacht/Jahr" (CH), 6.-Arbeitstag-Zuschlag + 37,5 13-h-Tage/Jahr (GR), Schwerarbeitstage ≥12/Monat (AT), Nachtarbeiter-Status ≥3 h im Fenster + Gesundheitscheck-Fälligkeit (GB), max. 10 Dienstantrittszeiten/Periode (NL), 5-Tage-Pflichturlaub (JP), Änderungs-Prämien-Zähler (BE/DK) — alles Varianten von „zähle Ereignis X pro Person über Zeitraum Y, ab Schwelle Z: Warnung/Zuschlag/Status".

**Implementierungsansatz:** Eine datengetriebene `CounterRule { EventType (NightShift/WorkedDayOfWeek/ShiftExceedingHours/PlanChangeAfterPublication/DistinctStartTimes/VacationDaysTaken), Period (Month/Year/Rolling), Threshold, Action (Warn/ApplySurchargeType/SetFlag) }`-Engine im Validation-Pfad. Events sind aus Work-Records ableitbar (kein neues Tracking nötig). Die Surcharge-Action verdrahtet GR-6.-Tag und CH-25.-Nacht mit K3-Typen.

**region-setup.json:**

```json
"compliance": {
  "counterRules": [
    { "event": "nightShift", "period": "year", "threshold": 25, "action": "applySurcharge", "surchargeType": "night" },
    { "event": "workedDayInWeek", "threshold": 6, "action": "applySurcharge", "surchargeType": "overtime1" }
  ]
}
```

**Aufwand: M/L** (generische Engine; jede Event-Ableitung einzeln klein). Hoher Long-Tail-Wert: deckt ~10 verstreute Einzel-⚠️ aus 8 Ländern mit einem Mechanismus.

---

### K19 — Feste Geldbetrag-Zuschläge (Fixbetrag statt Multiplikator)

**Was fehlt:** Raten sind Multiplikatoren (bestätigte Falle: 0.10 = 10 %). FI (0,73/1,36 €/h), NO (29/75 NOK/h Mindestbeträge), IE (€20/Nachtschicht), DK (30,85 DKK/h, 525 DKK/Tag) brauchen absolute Beträge pro Stunde/Schicht/Tag.

**Implementierungsansatz:** `SurchargeRateMode { Multiplier, FixedPerHour, FixedPerShift }` pro Zuschlags-Typ in der Raten-Kette; Berechnungspfad (`WorkMacroService`/C#-Nachverarbeitung) interpretiert `Amount` entsprechend. Kombi-Modus „max(Multiplikator, Mindestbetrag)" (NO: 26 % aber min. 75 NOK/h) als optionales `minimumPerHour`.

**region-setup.json:**

```json
"surcharges": {
  "rateModes": { "night": "fixedPerHour" },
  "nightRate": 1.36,
  "minimumsPerHour": { "holiday": 75.0 }
}
```

**Aufwand: S/M.** Abhängigkeit: Payroll-Export-Spalten (Betrag vs. Prozent) prüfen. Entfernt den FI-Hauptvorbehalt (sauberstes Land, 34✅/2⚠️ — mit K19 nahezu 100 %).

---

### K20 — Länder-/Tarif-Preset-Packs: region-setup als Entity-Importer

**Was fehlt:** region-setup schreibt heute AUSSCHLIESSLICH Settings + installiert Language-Plugins (verifiziert: `RegionSetupService.cs`, Recherche-Doc). Keine `SchedulingRule`-Datensätze, keine Zuschlags-Profile pro Branche/Tarif, keine `PeriodCapRule`s (K5), keine `PayrollExportGroupConfig` (K8), keine Qualifikations-Kataloge (offener Wunsch lt. Knowledge-Doc). „Paritair Comité/CCT/Overenskomst automatisch berücksichtigt" (BE/PT/DK/NO/SE/FI) braucht genau das: vorkonfigurierte benannte Regel-Sets.

**Implementierungsansatz:**
- Entity-Import-Pfad im `RegionSetupService`: neue Sektion wird in `BuildPlan` fail-fast validiert, Entities in DERSELBEN UnitOfWork-Transaktion upserted (Muster existiert für Settings, `:377–394` laut Recherche). Idempotenz über deterministische Natural Keys (`region-setup:{sectionName}:{presetName}`) statt GUIDs — Re-Apply (sektionsweiser Marker, Querschnitt oben) darf keine Duplikate erzeugen und darf vom Kunden editierte Presets NICHT überschreiben (Update nur, wenn Row noch den Import-Marker trägt; Konvention aus „Seed: keine doppelten Types" beachten).
- Presets referenzieren die neuen Fähigkeiten K1–K19 — das Setup-File wird damit zur vollständigen Länder-Compliance-Beschreibung.
- Datierte Satz-Umstellungen (DK/SE/FI Tarifstichtage): `validFrom` pro Preset-Version; die Raten-Kette wählt den zum Arbeitstag gültigen Satz (SE-Mapping bestätigt ValidFrom-Konzept als vorhanden für Zuschläge — verifizieren, sonst hier nachrüsten).

**region-setup.json:**

```json
"schedulingRulePresets": [
  {
    "name": "PC 330 Spitäler",
    "maxDailyHours": 11, "maxWeeklyHours": 50, "minPauseHours": 11, "minRestDays": 1,
    "nightRate": 0.35, "holidayRate": 0.56,
    "validFrom": "2026-01-01"
  }
],
"qualificationCatalog": [ { "name": "SIA Licence", "mandatoryFor": ["security"] } ]
```

**Aufwand: M** (Import-Mechanik) + Content-Aufwand pro Land (Redaktion/Fachprüfung, fortlaufend). Risiken: die Idempotenz-/Override-Semantik ist der heikelste Teil (Migrations-Falle, Kunde-editiert-Preset); Presets sind FACHLICHE Behauptungen — jede Zahl braucht dieselbe Fact-Check-Pipeline wie die Marketing-Texte.

---

## Teil 3: Priorisierung

### Matrix: Länder-Abdeckung × Aufwand

| Lücke | Länder betroffen | Aufwand | Hebel (Abdeckung/Aufwand) |
|---|---:|---|---|
| K11 Qual-Ablauf-Block (Opt-in) | 30 | **S** | ★★★★★ |
| K2 Nachtfenster-Setting (Stufe 1) | 14+ | **S** | ★★★★★ |
| Querschnitt: sektionsweise Idempotenz-Marker | (alle) | **S** | ★★★★★ (Voraussetzung) |
| K1 Enforcement `warn\|block` | 30 | **M** | ★★★★★ |
| K5 Perioden-Caps (Stufe 1: TotalHours) | 19 | **M** | ★★★★☆ |
| K19 Fixbetrag-Zuschläge | 6 | **S/M** | ★★★☆☆ |
| K15 Publikationsfristen | 7–11 | **S/M** | ★★★☆☆ |
| K6 Rolling Averages | 14 | **M** (auf K5) | ★★★★☆ |
| K3+K4 OT-Zuschlagstyp + Stacking | 23 | **M/L** | ★★★★☆ |
| K12 Ausgleichsruhe (Stufe 1 Frist) | 10 | **M** | ★★★☆☆ |
| K10 Freie-Sonntage-Rotation | 7 | **M** | ★★★☆☆ |
| K18 Ereignis-Zähler | 8 | **M/L** | ★★★☆☆ |
| K14 Lenkzeit (Stufe 1, ohne Tacho) | 16 (Logistik) | **M** | ★★★☆☆ |
| K16 Zeitfenster-Bann | 2 | **M** | ★★☆☆☆ (aber Kern-USP AE/SA) |
| K2 Stufe 2 Mehrfach-Fenster | 2–4 | **M** | ★★☆☆☆ |
| K17 Bereitschaftskategorien | 7 | **M/L** | ★★☆☆☆ |
| K9 TOIL/Zeitkonto | 5 | **L** | ★★☆☆☆ (systemisches CH-Risiko) |
| K13 Basislohnfeld | 9 | **M** | ★★★☆☆ (löst 2 DE-❌) |
| K20 Preset-Packs/Entity-Import | alle | **M**+Content | ★★★★☆ (Enabler) |
| K12 Stufe 2 Auto-Einplanung | 10 | **L** | ★★☆☆☆ |
| K8 Payroll-Packs | 10+ | **XL** | strategisch |
| K7 Clock-in/Terminal-API | 12+ | **XL** | strategisch (empfohlen: Nicht-Feature) |
| K14 Stufe 2 Tacho-Import | 16 | **XL** | strategisch |

### Empfohlene Reihenfolge

**Welle 0 — Voraussetzung (S):**
Sektionsweise Idempotenz-Marker + `version`-Feld im region-setup-Schema. Ohne das erreicht KEINE neue Sektion Bestandsinstallationen.

**Welle 1 — Quick Wins (S/M, decken zusammen fast jede Länderseite):**
1. **K2 Nachtfenster-Setting** (S) — entfernt den meistgenannten Zuschlags-Vorbehalt (14+ Länder) mit einer Macro-Variable + 2 Setting-Keys.
2. **K11 Qual-Ablauf-Block** (S) — entfernt die häufigste ⚠️-Zeile aller 30 Mappings; macht „nur mit gültigem Ausweis" wahr.
3. **K1 Enforcement warn|block** (M) — verwandelt die Kategorie-1-Umformulierung („warnt statt sperrt") in ein echtes Opt-in-Feature; danach dürfen TH/ID/SA/RO wieder „blockiert" schreiben (mit Override-Fussnote).
4. **K15 Publikationsfristen** (S/M) + **K19 Fixbetrag-Zuschläge** (S/M) — kleine generische Mechanismen, je 6–11 Länder.

**Welle 2 — Die grossen Compliance-Hebel (M/L):**
5. **K5 Perioden-Caps** (M) → direkt danach **K6 Rolling Averages** (M) — gemeinsame Engine; macht 36協定/JP, 综合计算工时/CN, GB-17-Wochen, IE/ES/SE/BE-Referenzzeiträume ehrlich „überwacht mit Cap-Warnung".
6. **K3+K4 Überstunden-Zuschlagstyp + Stacking** (M/L) — löst die einzigen harten Zuschlags-❌ (FR 2×, AT) und den PL/KR/VN-Stacking-Konflikt.
7. **K20 Preset-Packs/Entity-Import** (M) — ab hier lohnt er sich, weil K1/K5/K3-Konfigurationen pro Land/Tarif ausgeliefert werden können; region-setup wird zur vollständigen Länder-Compliance-Datei.
8. **K12 Stufe 1** (M), **K10 Sonntags-Rotation** (M), **K13 Basislohnfeld** (M), **K18 Zähler-Engine** (M/L), **K14 Lenkzeit Stufe 1** (M), **K16 Zeitfenster-Bann** (M) — nach Vertical-/Markt-Priorität (CH-Spitex braucht K10, AE/SA brauchen K16, DE-Branchen-Promotion braucht K13).

**Welle 3 — Gross/strategisch (L/XL):**
9. **K9 TOIL-Ledger** (L) — vor einem CH-Marketing-Push Pflicht (Art. 17b zieht sich durch 3 CH-Seiten).
10. **K12 Stufe 2 Auto-Einplanung** (L), **K17 Bereitschaftskategorien** (M/L).
11. **K8 Payroll-Packs** (XL) — nachfragegetrieben, erst Config-UI (M) + DATEV-Validierung, dann Packs je Pilotkunde.
12. **K7 Clock-in** und **K14 Tacho** (XL) — als bewusste Nicht-Features dokumentiert lassen; „ohne Biometrie" ist in 6 Ländern das Datenschutz-Verkaufsargument. Falls Markt es erzwingt: Terminal-/Import-API statt eigener Hardware/Biometrie.

### Strategische Kernaussagen

1. **Das Setup-File ist die Architektur-Antwort auf „nicht alles für alle bauen":** Jede neue Fähigkeit wird als konfigurierbare Regel gebaut und pro Land über `region-setup.json` aktiviert/parametriert (Enforcement-Modi, Zeitfenster, Caps, Zähler, Presets). Kein Land bekommt Regeln, die es nicht braucht; die Engine bleibt generisch.
2. **Zwei Lücken sind keine Lücken, sondern Positionierung:** Biometrie/Clock-in (K7) und echte Lohnbuchhaltung (Teil von K8) widersprechen der Produktidentität (Datenschutz-Positiv-Argument bzw. „Schichtplaner, kein Payroll"). Sie bleiben Umformulierungs-Aufgaben der Redaktion, nicht Entwicklungs-Aufgaben.
3. **Vier kleine Änderungen (Welle 0+1) entschärfen die grosse Mehrheit der ~274 ⚠️:** Idempotenz-Fix, Nachtfenster, Qual-Ablauf-Block, Enforcement-Modus. Danach sind die verbleibenden Vorbehalte fast ausschliesslich Monats-/Jahres-Aggregate (Welle 2, K5/K6) und Spezial-Zähler (K18).
