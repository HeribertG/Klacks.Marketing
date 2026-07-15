# DE — USP → Klacks-Erfüllung

> Bewertet gegen die Capability-Inventur (`klacks-capabilities.md` / `USP-KLACKS-MAPPING.md`). Legende: ✅ voll · ⚠️ teilweise/mit Vorbehalt · ❌ Lücke.
>
> **Scope-Hinweis:** DE ist in `CountryIndustries.cs` nicht als Land mit Branchen-Subrouten registriert — General ist live, die 5 Branchen sind unpromotete, noch nicht gerouteten Entwürfe (`docs/content-drafts/de/*.json`). Die Bewertung unten deckt trotzdem alle 6, damit spätere Promotion der Entwürfe nicht ungeprüft live geht.

> **KORREKTUR 2026-07-15 (Haupt-Session):** Scope-Korrektur zuerst: `Localization/CountryIndustries.cs` listet `land-de` in `CountriesWithIndustries` — die 5 Branchen-Subrouten (spitex/spitaeler/security/hausdienste/logistik) sind LIVE und geroutet, keine unpromoteten Entwürfe mehr. Die „— Entwurf"-Zusätze in den Abschnittsüberschriften unten und der Scope-Hinweis oben sind veraltet. Ein Diff aller 6 Entwurf- gegen Live-JSONs (`docs/content-drafts/de/*.json` vs. `Localization/Content/de/land-de*.json`) zeigt, dass der Editorial-Pass mehrere der unten unter „Grösste Risiken" genannten Überzeichnungen tatsächlich entschärft hat — nicht durch neue Code-Fähigkeiten, sondern durch ehrlichere Wortwahl: (1) „Verstösse entstehen gar nicht erst" wurde in General/Spitäler/Logistik ersatzlos durch „jede Unterschreitung wird sofort sichtbar gemacht" ersetzt (Monitoring- statt Präventions-Sprache, wie in VN) → die drei Ruhezeiten-Zeilen sollten jetzt ✅ statt ⚠️ lauten. (2) Spitäler: „zeigt, ob die Pflegepersonaluntergrenze eingehalten ist" wurde zu „zeigt Soll- und Ist-Besetzung als Grundlage für die PpUGV" — exakt die in Fazit-Punkt 1 vorgeschlagene Entschärfung → PpUGV-Zeile Spitäler jetzt ✅ (General nennt PpUGV in keinem der beiden Textstände wörtlich; diese Zeile bleibt dort unverändert capability-basiert ⚠️). (3) „auch nicht zur KI" wurde in General/Spitäler/Spitex durch „das KI-Modell wählen Sie selbst — auch lokal gehostet, ganz ohne dass … Daten das Haus verlassen" ersetzt (Opt-in statt Blanket-Zusage) → die drei On-Premise/KI-Zeilen dort jetzt ✅. (4) Spitex und Hausdienste: „Mindestlöhne/Lohngruppen … sind hinterlegt" wurde durch „Geleistete Stunden … lückenlos dokumentiert … Basis für die Lohnabrechnung … Die Sätze selbst legt der Gesetzgeber/Tarifvertrag fest, Klacks berechnet sie nicht" ersetzt — die falsche Lohnsatz-Behauptung ist weg; die neue, engere Formulierung (Stunden-Dokumentation je qualifikationsgebundener Schicht) ist über `Shift.RequiredQualifications` + `Work`-Stunden real gedeckt (gegen `Klacks.Api/Domain/Models/Schedules/Shift.cs` und `Work.cs` geprüft; `Contract.cs` hat weiterhin **kein** Basislohn-Feld) → beide Zeilen jetzt ✅ statt ❌. (5) Logistik: „56-Tage-Nachweis & Smart Tachograph 2" (inkl. Page-Title) wurde zu „dokumentiert die geplanten Lenk- und Ruhezeiten … als Ergänzung zu den separat vorzuhaltenden Fahrtenschreiber-Aufzeichnungen" — keine Tacho-Anbindung mehr behauptet, nur noch ergänzende Planungs-Doku → Zeile jetzt ✅ statt ❌. (6) Security: „tarifgerecht" bei den 12h-Schichten wurde zu „dokumentiert die branchenüblichen Zuschläge" — die Zusage einer Verifikation gegen den spezifischen Manteltarifvertrag ist weg → Zeile jetzt ✅ statt ⚠️.
>
> Unverändert bleiben: DATEV-Export ⚠️ (Wortlaut leicht verengt auf „Lohn-Bewegungsdaten", aber die 5/11-Felder-Lücke besteht weiter) und Bewacherregister/Sachkunde ⚠️ (abgelaufene Pflicht-Qualifikation blockiert weiterhin nicht — nur umformuliert, Kernlücke unverändert). Wichtig: Die Code-Lücken aus dem Fazit sind NICHT verschwunden — es gibt weiterhin kein PpUGV-Modul, keine Tachograph-Anbindung, und `Contract.cs` weiterhin nur Zuschlags-Multiplikatoren (`NightRate, HolidayRate, WE1/2/3Rate`), kein Basislohn-Feld. Verändert hat sich nur, dass die Live-Texte diese Lücken jetzt nicht mehr überdecken, sondern explizit umschiffen (z.B. „Klacks berechnet sie nicht"). Neu und hier nicht bewertet: General (`land-de.json`) hat einen zusätzlichen `rulesCalendar`-Abschnitt (Feiertagsregeln bis auf Gemeinde-Ebene, länderübergreifende Kalender-Mischung, konfigurierbare Zuschlags-Wirkung) — plausibel durch die bestehende Kalender-Regel-DSL gedeckt, aber in dieser Tabelle nicht verifiziert.

## General (land-de.json — LIVE)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Recovery-Engine bei Ausfall — beste, rechtssichere Ersatzoptionen aus Springerpool ohne Telefonrunde | Autofill/GA + Eligibility-Matching + Verfügbarkeit | ✅ | Voll gedeckt: GA berücksichtigt Qualifikation, Verfügbarkeit, Ruhezeit als Vetos. |
| ArbZG-Ruhezeiten automatisch geprüft — 11h in Echtzeit überwacht, „Verstösse entstehen gar nicht erst" | Regel-Engine (`MinRestHours`) + GA-Veto | ⚠️ | Für GA-generierte Vorschläge stimmt es (Stage-0-Veto auf `MinPauseHours`); bei manueller Bearbeitung ist es nur eine **Warnung**, das Speichern wird NIE blockiert. „Verstösse entstehen gar nicht erst" ist als Vollzusage zu stark. |
| PpUGV-Mindestbesetzung im Blick — pro Schicht angezeigt, vor Meldung/Sanktion | — (keine PpUGV-spezifische Regel im Code) | ⚠️ | **Grösstes Risiko:** Es gibt kein PpUGV-spezifisches Compliance-Modul (keine hinterlegten Pflegepersonaluntergrenzen-Schwellen, keine 21-Bereiche-Logik). Erreichbar nur über generische Schicht-Bedarfs-/Coverage-Konfiguration (Soll-Kopfzahl pro Schicht/Qualifikation), die der Nutzer selbst mit den PpUGV-Werten befüllen müsste — reine Warnung, keine Meldung an Kassen/Behörden, keine Blockade. |
| Wunschdienste berücksichtigt | GA Stage 3 Soft-Constraints (Blacklist-/Präferenz-Logik) | ✅ | Voll gedeckt. |
| DATEV-Export — Bewegungsdaten/Buchungsstapel direkt, ohne Doppelerfassung | DATEV-LuG-Formatter (`DatevLugBewegungsdatenFormatter`) | ⚠️ | Export-Pfad existiert und ist DE die einzige echt validierte Länder-Payroll-Route, aber laut Inventur [MVP]: nur Felder 1–5 von 11 befüllt, Lohnart-Nummern/Ausfallschlüssel sind Platzhalter bis der Steuerberater sie liefert. „Ohne Doppelerfassung" stimmt für die Datenübergabe, aber kein Beleg für vollständige Feldabdeckung. |
| On-Premise: Daten bleiben im Haus, auch nicht zur KI | On-Premise-Stack + keyless lokales LLM (Opt-in) | ⚠️ | Datenhosting (DB/Dateien) ✅ voll on-premise. Die Zusatzaussage „auch nicht zur KI" stimmt nur, wenn bewusst auf Ollama/LM-Studio umgestellt wird — **Default-LLM-Provider sind Cloud** (OpenAI/Anthropic/Google/DeepSeek `is_enabled=true`). Ohne diese Umstellung telefoniert Klacksy in die Cloud. |
| Klacksy: eingebetteter Assistent, Vorschläge nur passend zu Qualifikationen/Arbeitszeit | Klacksy (250 Skills, Regel-/Rezept-Engine) | ✅ | Voll gedeckt. |

## Häusliche Pflege (spitex — Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Wegezeit korrekt vergütet | Wegzeit als bezahlte Arbeitszeit (Travel-WorkChange-Typen) | ✅ | Voll gedeckt. |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; kein Fuzzy, abgelaufene Pflicht-Qualifikation blockiert Zuteilung nicht. |
| Pflegemindestlohn nach Qualifikationsstufe (7. PflegeArbbV gestaffelt, inkl. Zuschlägen) | — | ❌ | Kein Basislohn-/Stundenlohn-Feld im Modell: `Contract.cs` enthält nur Zuschlags-Multiplikatoren (`NightRate, HolidayRate, WE1/2/3Rate`), **kein** `HourlyRate`/`BaseWage`-Feld je Qualifikationsstufe. Ein gestaffelter Mindestlohn nach Qualifikation ist damit nicht hinterlegbar — nur die Nacht-/Wochenend-/Feiertagszuschläge (generisch, nicht stufenspezifisch) sind real. |
| On-Premise: Daten bleiben im Haus, auch nicht zur KI | On-Premise + keyless lokales LLM (Opt-in) | ⚠️ | Wie General: Hosting ✅, „auch nicht zur KI" nur mit bewusstem Provider-Wechsel. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit + Autofill | ✅ | Voll gedeckt. |

## Spitäler (spitaeler — Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung | Schedule-Optimizer / Coverage-Sweep | ✅ | Voll gedeckt. |
| ArbZG-Ruhezeiten (11h §5 + 48h-Bereitschaft §7) automatisch geprüft, „Verstösse entstehen gar nicht erst" | Regel-Engine (`MinRestHours`, `MaxWeeklyHours`) + GA-Veto | ⚠️ | Gleiche Einschränkung wie General: GA-Vorschläge sind ruhezeit-konform, manuelle Bearbeitung wird nur gewarnt, nie blockiert. Zusätzlich: Monats-/Zyklus-Durchschnitt für Bereitschaftsdienst (48h-Grenze über Referenzzeitraum) wird nicht als Perioden-Cap durchgesetzt. |
| PpUGV-Mindestbesetzung im Blick, vor Meldung/Vergütungsabschlag (§137i SGB V) | — | ⚠️ | Wie General: kein PpUGV-spezifisches Modul; nur generische Bedarfs-/Coverage-Anzeige, keine Anbindung an Meldeprozess oder Vergütungsabschlag-Berechnung. |
| On-Premise: Daten bleiben im Haus, auch nicht zur KI | On-Premise + keyless lokales LLM (Opt-in) | ⚠️ | Wie General. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Springerpool &amp; Ausfälle | Klacksy + Verfügbarkeit + Autofill | ✅ | Voll gedeckt. |

## Security (Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte &amp; Posten lückenlos | Schedule-Optimizer | ✅ | Voll gedeckt. |
| Bewacherregister &amp; Sachkunde automatisch geprüft — nur mit gültiger Registrierung zugeteilt, Warnung vor Ablauf | Qualifikations-Matching (exakt, als Pflicht-Qualifikation modellierbar) | ⚠️ | Fehlende Pflicht-Registrierung sperrt die Zuteilung (Veto) ✅; aber eine **abgelaufene** Pflicht-Qualifikation blockiert laut Inventur NICHT — sie wird nur gemeldet, der Mitarbeitende bleibt zuweisbar. „Nur mit gültiger Registrierung zugeteilt" ist für den Ablauffall zu stark formuliert. |
| 12-Stunden-Schichten korrekt geplant, tarifgerecht mit Zuschlägen/Ruhezeiten | Konfigurierbare `MaxDailyHours` (GA-Veto) + Zuschläge | ⚠️ | 12h als Tages-Cap ist ein GA-Stage-0-Veto ✅ für automatisch generierte Pläne; bei manueller Schichterfassung nur Warnung. Zuschlagsberechnung selbst ist Standard-Engine (Nacht/WE/Feiertag), keine Verifikation gegen den spezifischen Manteltarifvertrag. |
| Rundgänge optimiert | Geo-Tourenoptimierung | ✅ | Mechanismus ist generisch (Multi-Stopp-Routenoptimierung), auf Fuss-/Objektrundgänge übertragbar. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle in Minuten ersetzt | Klacksy + Verfügbarkeit + Autofill | ✅ | Voll gedeckt. |

## Haus-/Putzdienste (hausdienste — Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Teams flexibel eingeteilt | Autofill | ✅ | Voll gedeckt. |
| Wegezeiten korrekt erfasst (§3 Abs. 2.2 RTV, bis 3h als volle Arbeitszeit) | Wegzeit als bezahlte Arbeitszeit (Travel-WorkChange) | ⚠️ | Wegzeit wird generisch als bezahlte Arbeitszeit erfasst ✅; die spezifische RTV-Deckelung „bis zu drei Stunden" als automatischer Cap ist im Code nicht belegt — Erfassung ist manuell/planungsbasiert, kein automatisches Kappen bei Überschreitung. |
| Mindestlöhne nach Lohngruppe (RTV: Unterhalts- bis Glasreinigung, 15,00–18,40 €/h) | — | ❌ | Wie spitex-Pflegemindestlohn: kein Basislohn-/Lohngruppen-Feld im Modell. `Contract.cs` kennt nur Zuschlags-Multiplikatoren, keine Grundlohn-Tabelle nach Lohngruppe. Nicht hinterlegbar wie beschrieben. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit + Autofill | ✅ | Voll gedeckt. |

## Logistik (Entwurf)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Touren automatisch optimiert | Geo-Tourenoptimierung | ✅ | Voll gedeckt. |
| Lenk- &amp; Ruhezeiten geprüft (Art. 6/7 VO 561/2006), „Verstösse entstehen gar nicht erst" | Regel-Engine (`MinRestHours`/`MaxDailyHours` als Annäherung) | ⚠️ | Klacks kennt Ruhezeit-/Tageshöchstarbeitszeit-Regeln generisch, aber keine eigene Lenkzeit-Regelart (4,5h-Lenkzeit-Segment, 45-Min-Pause-Takt); nur annäherbar über generische Grenzwerte. Manuelle Änderungen werden nur gewarnt, nie blockiert. |
| 56-Tage-Nachweis &amp; Smart Tachograph 2 | — | ❌ | Keine Fahrtenschreiber-/Tachograph-Datenanbindung im Code (kein Import/Sync von Tacho-Geräten), keine belegte 56-Tage-spezifische Aufbewahrungslogik über die generische Datenhaltung hinaus. Work-Records sind planungs-/manuell-basiert, keine Tacho-Quelle. |
| Führerschein-Klassen passend, Warnung vor Ablauf | Qualifikations-Matching (exakt) | ⚠️ | Exakt ✅; Ablauf einer Pflicht-Qualifikation blockiert die Zuteilung nicht, nur Meldung im Gap-Report. |
| Klacksy plant per Sprache | Klacksy | ✅ | Voll gedeckt. |
| Ausfälle schnell aufgefangen | Klacksy + Verfügbarkeit + Autofill | ✅ | Voll gedeckt. |

## Fazit

**Summe (38 USP-Zeilen über 6 Seiten):** ~21 ✅ · ~14 ⚠️ · 3 ❌.

**Was ehrlich trägt:** Autofill/Recovery-Engine bei Ausfall, Tourenoptimierung (Spitex/Hausdienste/Security), Klacksy (durchgängig ✅ in jeder Sektion), Wegzeit als bezahlte Arbeitszeit, exaktes Qualifikations-Matching als Grundmechanismus.

**Grösste Risiken / Umformulierungs-Bedarf:**
1. **PpUGV-Mindestbesetzung** (General + Spitäler) ist die DE-spezifischste und am stärksten exponierte Aussage — es existiert **kein** PpUGV-Modul im Code, nur generische Bedarfs-/Coverage-Konfiguration. „Zeigt … ob die Pflegepersonaluntergrenze eingehalten ist" sollte auf „Sie hinterlegen die PpUGV-Sollbesetzung als Schichtbedarf, Klacks zeigt Abweichungen" entschärft werden.
2. **„Verstösse entstehen gar nicht erst"** (Ruhezeiten in General/Spitäler/Logistik, sinngemäss auch Security) ist die immer wiederkehrende Überzeichnung: Klacks warnt, blockiert das Speichern aber nie — nur GA-generierte Vorschläge sind hart ruhezeit-konform, manuelle Änderungen nicht.
3. **Mindestlohn-/Lohngruppen-Behauptungen** (7. PflegeArbbV-Stufen in Spitex, RTV-Lohngruppen in Hausdienste) sind eine echte Lücke: Klacks hat **kein Basislohn-Feld**, nur Zuschlags-Multiplikatoren. Diese beiden Entwürfe dürfen so nicht live gehen, bevor entweder ein Lohngruppen-Feld ergänzt oder die Formulierung auf „Zuschläge" statt „Mindestlohn hinterlegt" reduziert wird.
4. **56-Tage-Nachweis/Smart Tachograph 2** (Logistik-Entwurf) behauptet eine Tachograph-Anbindung, die es nicht gibt — vor Live-Schaltung streichen oder auf generische Zeit-Dokumentation umformulieren.
5. **DATEV-Export** und **„auch nicht zur KI"** sind reale, aber nicht vollständige Fähigkeiten (DATEV MVP nur 5/11 Felder; KI bleibt nur lokal bei bewusstem Provider-Wechsel) — beide sollten mit einem Nebensatz relativiert werden, gerade weil DE der einzige Markt mit einem tatsächlich validierten Payroll-Formatter-Anspruch ist.
