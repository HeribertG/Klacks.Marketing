# Otto-Kritik: K20 Land×Branche-Content-Pack Frankreich (fr.json industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/fr.json`, Sektionen `worktime`,
`surcharges`, `compliance`, `industryProfiles` (homecare, healthcare, security, facility,
logistics). Otto-Session: `k20-pack-fr` (isoliert).

## Ottos Rohantwort

Erster Versuch lief nach 220s in einen Timeout, Fallback auf `anthropic/claude-haiku-4-5` lieferte
im selben Run eine vollständige, mit Primärquellen belegte Antwort (legifrance.gouv.fr,
service-public.gouv.fr, INRS, CNAPS, Conventions Collectives IDCC 2941/2264/1351). Kein
pauschales Lob; ein konkreter Zitierfehler im Auftrag selbst wurde gefunden (siehe Punkt 1).
Volltext im Session-Log (`~/claude-otto-bridge`, Session `k20-pack-fr`, run
`40d6477f-8590-41fa-a3ed-2570f5a03ecd`).

## Kritikpunkte, Bewertung, Umsetzung

| # | Otto-Kritik | Bewertung | Status |
|---|---|---|---|
| 1 | `compliance.periodCaps` (44h/12 Wochen) — der Ersteller-Kommentar zitierte Art. L3121-23; laut Otto ist das die falsche Norm: **Art. L3121-22** ist die Standardregel (44h Durchschnitt/12 Wochen), Art. L3121-23 erlaubt eine **Ausnahme auf 46h** nur mit Tarifvertrag. Der JSON-**Wert** 44h selbst bestätigt Otto als korrekten Default. Vorschlag: zweiten periodCaps-Eintrag (46h, `requiresCollectiveAgreement: true`, `remark`) ergänzen. | Zahlenwert bestätigt korrekt — reine Zitierkorrektur (Artikelnummer stand nur im Auftragstext, nicht in der JSON-Datei selbst, daher kein Datenfix nötig). Der strukturelle Vorschlag ist **nicht engine-konform**: `RegionSetupPeriodCap` kennt nur `Period/Scope/CapHours/WarnAtPercent/WindowWeeks/MaxAverageWeeklyHours` (`JsonUnmappedMemberHandling.Disallow`) — weder `remark` noch `requiresCollectiveAgreement` existieren als Felder, und die Engine hat keinen Mechanismus, um "hat der Betrieb einen Tarifvertrag" bedingt auszuwerten; ein zweiter unbedingter periodCaps-Eintrag wäre nur eine widersprüchliche Doppel-Regel. | **kein Änderungsbedarf am Wert** (44h bestätigt); **abgelehnt**: zweiter periodCaps-Eintrag (Schema kennt die nötigen Felder nicht, Engine kann CBA-Bedingtheit nicht abbilden); Zitierkorrektur (L3121-22 statt L3121-23) nur dokumentarisch festgehalten |
| 2 | `worktime.vacationDaysPerYear: 30` "jours ouvrables" — Art. L3141-3: 2,5 jours ouvrables/Monat = 30/Jahr (5 Wochen), jours ouvrables = alle Wochentage außer Sonntag+Feiertage. | bestätigt bestehenden Wert | kein Änderungsbedarf |
| 3 | `homecare`: Qualifikation "DEAES" — korrekt benannter, seit 2021 generalistischer Abschluss (ersetzt DEAVS/DEAMP), aber laut Otto bei privater Aide à domicile "nicht immer" verlangt — teils reicht ein niedrigerschwelliger CAP-Abschluss. Otto selbst formuliert hier durchgehend hedgend ("könnte auch", "nicht immer", "manchmal"). | Otto erreicht selbst keine klare Aussage, ob CAP eine SEHR übliche Pflicht-Qualifikation oder nur eine mögliche Alternative ist — erfüllt die geforderte Sicherheitsschwelle für eine Änderung nicht | **offen** — nicht umgesetzt, Ottos eigene Unsicherheit zu hoch für eine Datenänderung |
| 4 | `security`: "Carte professionnelle (CNAPS)" mit `isTimeLimited: true` — bestätigt korrekt, Gültigkeit 5 Jahre. Zusätzlich fehle **SSIAP 1/2** (Service de Sécurité Incendie et d'Assistance à Personnes), laut Otto "RECHTLICH VORGESCHRIEBEN" für viele Einsätze in Publikumsverkehrsgebäuden (ERP/IGH), Rechtsgrundlage Arrêté vom 2. Mai 2005, 3 Jahre Gültigkeit mit Pflicht-Recycling. | `isTimeLimited` an CNAPS bestätigt; SSIAP-Lücke klar, spezifisch und mit Verordnung belegt — analog zur bereits akzeptierten Klasse "spezifisches Pflichtdokument fehlt" (Code-95, VSSU-Basisausbildung in anderen Länderrunden) | **umgesetzt**: neue Qualifikation "SSIAP 1" hinzugefügt, `isTimeLimited: true` |
| 5 | `surcharges.overtime.tiers` (`afterHours: 35→0.25`, `afterHours: 43→0.5`) — Otto klärt nach anfänglicher Verwirrung selbst: **"Interpretation A ... ist tatsächlich korrekt"** — 8 Überstunden (36.–43. Stunde) mit +25%, ab der 44. Stunde +50%, konsistent mit Art. L3121-22/27ff. Vorschlag: Felder zu `startAt`/`endAt`/`description` umbauen für Eindeutigkeit. | Werte von Otto selbst als korrekt bestätigt (reine Klarheits-/Namenskritik). `RegionSetupOvertimeTier` hat NUR `AfterHours`/`Rate` (`Disallow`) — die vorgeschlagene Umstrukturierung ist nicht im DTO abbildbar. | **kein Änderungsbedarf am Wert** (bestätigt korrekt); **abgelehnt**: Struktur-Umbau (Schema kennt `startAt`/`endAt`/`description` nicht) |
| 6 | Branchenspezifische Arbeitszeit-Nuancen (FPH vs. IDCC 2264 bei healthcare, IDCC 1351 bei security, IDCC 2941 bei homecare) — Otto bestätigt die bestehenden Werte (`maxDailyHours: 10`, `minPauseHours: 10/11`) durchgehend als korrekt für den generischen Default, mit Hinweis auf mögliche Tarifvertrags-Erweiterungen (bis 12h) als Sonderfall. | bestätigt bestehende Werte, keine der genannten Abweichungen ist ein Fehler im generischen Default | kein Änderungsbedarf |
| 7 | `logistics`: Tachograf-Regeln (EU-VO 561/2006) "nicht in JSON abgedeckt" bei Fahrpersonal. | strukturell identisch zum bereits etablierten DE-Präzedenzfall (Fahrpersonalrecht/FPersG bzw. hier EU-VO 561/2006 wird von Klacks nicht separat modelliert, genereller ArG-/Code-du-travail-Wert bleibt korrekter Fallback) | kein Änderungsbedarf — bereits etablierte Ausnahme, kein neuer Fund |
| 8 | `healthcare`: fehlende Qualifikation **AFGSU 1/2** (Attestation de Formation aux Gestes et Soins d'Urgence) — spezifisches, in französischen Krankenhäusern/Kliniken "oft obligatorisches" medizinisches Notfall-Zertifikat, 4 Jahre Gültigkeit, unterscheidet sich von der generischen "Erste-Hilfe-Ausbildung". | plausibel, spezifisch, mit Quelle (sante.gouv.fr, INRS) belegt; ergänzt statt ersetzt die generische Erste-Hilfe-Ausbildung (die branchen- und länderübergreifend als einheitlicher Baustein wiederverwendet wird und daher nicht branchenspezifisch umbenannt werden sollte) | **umgesetzt**: neue Qualifikation "AFGSU 1 oder 2" hinzugefügt, `isTimeLimited: true` |
| 9 | `facility`: "Erste-Hilfe-Ausbildung" sei "zu vage", sollte als PSC1 benannt werden; zusätzlich optional Habilitation Électrique (3 Jahre, "je nach Gebäudetyp"). | PSC1 ist lediglich die offizielle französische Bezeichnung für exakt dasselbe generische Erste-Hilfe-Konzept, das branchen- und länderübergreifend als einheitlicher Baustein verwendet wird — eine facility-spezifische Umbenennung würde die Konsistenz zu homecare/healthcare/security in derselben Datei brechen, ohne eine neue Anforderung zu beschreiben. Habilitation Électrique ist von Otto selbst als gebäudetypabhängig (nicht branchenweit universell) markiert. | **abgelehnt** — beide Punkte: PSC1-Umbenennung bricht Konsistenz ohne inhaltlichen Mehrwert; Habilitation Électrique ist explizit konditional, keine "SEHR übliche" Pflicht-Qualifikation |
| 10 | `logistics`: "Permis C ou CE" mit `isTimeLimited: true` sei "zu pessimistisch" — französischer Führerschein C/CE habe ~15 Jahre Kartengültigkeit statt periodischer Erneuerung wie ein CACES. | Otto bestreitet nicht abschließend, dass eine periodische medizinische Tauglichkeitsprüfung für Berufskraftfahrer existiert (nur "~15 Jahre" ohne klare Quelle für "kein Attest nötig"), und DE/AT/CH führen dieselbe Qualifikation durchgängig als `isTimeLimited: true` (dort unbestritten). Eine Änderung nur in FR würde die Konsistenz zu den drei bereits geprüften Länderprofilen brechen, ohne dass Otto eine belastbare Quelle für die Abweichung nennt. | **offen** — nicht umgesetzt, uneindeutige/uncitierte Behauptung, Konsistenzrisiko zu DE/AT/CH |
| 11 | `logistics`: "Certificat cariste CACES" (R489) sei mit 5 Jahren Gültigkeit `isTimeLimited: true`, aktuell fehlt das Flag. | plausibel und spezifisch mit INRS (CACES R489) belegt; wichtig: das ist eine **französische** Besonderheit (INRS-Empfehlung R489 mit Pflicht-Rezertifizierung), die sich von der bereits geprüften DE-Regel unterscheidet (dort DGUV Grundsatz 308-001 ausdrücklich unbefristet) — kein Widerspruch, da beide Länder unterschiedliche Regeln haben können | **umgesetzt**: `isTimeLimited: true` bei "Certificat cariste (CACES)" ergänzt |

## Offene Punkte (nicht umgesetzt, brauchen ggf. separate Entscheidung)

1. `homecare`: alternative CAP-Qualifikation zu DEAES — Ottos eigene Unsicherheit ("könnte", "nicht
   immer") reicht nicht für eine Datenänderung; müsste mit einer eindeutigeren Quelle (z.B. IDCC
   2941 Wortlaut) neu geprüft werden.
2. `logistics`: `isTimeLimited` bei "Permis C/CE" — Ottos Gegenbehauptung (~15 Jahre Kartengültigkeit)
   ist unzitiert und würde die Konsistenz zu DE/AT/CH brechen, wo dieselbe Qualifikation unbestritten
   als zeitlich begrenzt geführt wird.
3. `compliance.periodCaps`: 46h-Ausnahme bei Tarifvertrag — inhaltlich real (Art. L3121-23), aber
   weder das DTO noch die Engine unterstützen bedingte "hat der Betrieb einen Tarifvertrag"-Logik;
   bräuchte ein neues Schema-Feld, außerhalb des Scopes dieses Fact-Checks.

## Verifikation

```
python3 -c "import json; json.load(open('fr.json'))"  → OK
Qualifikationszahlen: homecare 3, healthcare 3, security 3, facility 1, logistics 4
logistics "Certificat cariste (CACES)": isTimeLimited jetzt true
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests"
  → Bestanden! : Fehler: 0, erfolgreich: 11, übersprungen: 0, gesamt: 11
  (deckt alle 5 Länderdateien inkl. Parse- und Semantik-Validierung ab)
```

## Gesamturteil

Otto lieferte eine solide, mit Primärquellen belegte Antwort und fand dabei einen echten
Zitierfehler im Ersteller-Kommentar (Art. L3121-23 statt L3121-22 für den 44h-Standardwert) — der
Zahlenwert selbst blieb davon unberührt und wurde bestätigt. Zwei konkrete, spezifisch mit
französischen Verordnungen belegte Qualifikationslücken (SSIAP 1 bei security, AFGSU bei
healthcare) wurden gefüllt, ebenso eine französienspezifische Gültigkeits-Korrektur beim
CACES-Staplerschein (INRS R489, bewusst abweichend von der bereits geprüften unbefristeten
deutschen DGUV-Regel — kein Widerspruch, sondern echte Länderdifferenz). Zwei von Ottos
Strukturvorschlägen (periodCaps-Zweitregel für Tarifvertrags-Ausnahme, Overtime-Tier-Umbau zu
startAt/endAt) wurden zurückgewiesen, weil die betroffenen DTOs (`RegionSetupPeriodCap`,
`RegionSetupOvertimeTier`) mit `JsonUnmappedMemberHandling.Disallow` strikt auf die vorhandenen
Felder begrenzt sind und keinen Platz für die vorgeschlagenen Zusatzfelder bieten. Die DEAES- und
Permis-C/CE-Punkte blieben offen, weil Otto selbst keine eindeutige Aussage traf bzw. keine
belastbare Quelle für eine Abweichung von der in DE/AT/CH bereits bestätigten Regel lieferte.

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/fr.json` (neue Qualifikationen healthcare/
security, `isTimeLimited` bei logistics CACES)
**Nicht verändert:** DTOs unter `Application/DTOs/Setup/` (kein Schema-Feld ergänzt)
