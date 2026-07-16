# Otto-Kritik: K20 Nordics-Pack Finnland (fi.json — worktime/surcharges/compliance/industryProfiles)

Fact-Check-Runde für `Klacks.Api/deploy/onprem/regions/fi.json`. Otto-Session: `k20-pack-fi` (isoliert).

## Ottos Rohantwort

Auch in dieser (letzten) Runde war Ottos komplette Recherche-Toolchain ausgefallen (xAI-Key ungültig,
Gemini-Guthaben erschöpft). Otto hat konsequent — wie schon bei NO und SE — **ehrlich verweigert**,
unbelegte Rechtsaussagen zu treffen, und stattdessen eine reine Struktur-Konsistenzprüfung ohne
externe Quellen geliefert. Dabei einen echten, wertvollen Fund geliefert: **Lähihoitaja fehlt bei
`healthcare`, obwohl identisch strukturiertes `homecare` es führt** — eine Inkonsistenz, die rein aus
dem Datei-Vergleich selbst folgt, ohne Rechtsquelle nötig. Volltext im Session-Log
(`~/claude-otto-bridge`, Session `k20-pack-fi`, run `29a9dda6-e4e7-4618-9a05-8c4f25161bbc`).

Alle rechtlich markierten Punkte wurden unabhängig per WebSearch gegen finnische Primärquellen
(Minilex, KT/Kunta- ja hyvinvointialuetyönantajat, Tehy, Tyosuojelu.fi, Poliisi.fi, Finlex) geprüft.

## Kritikpunkte, Gegenprüfung, Bewertung

| # | Markierter Punkt | Unabhängige Quelle | Bewertung | Status |
|---|---|---|---|---|
| 1 | facility `nightRate=1.36` `fixedPerHour` (TES kiinteistöpalveluala) — Betrag+Modus korrekt? | **Code-Fakt** (`RegionSetupSurcharges.cs`/`CompanyRuleParameterCatalog.cs`): `rateModes.night="fixedPerHour"` ist ein gültiger, dokumentierter Modus — bedeutet laut XML-Doc "Value must be 'multiplier' (default), 'fixedPerHour' or 'fixedPerShift'": der `NightRate`-Wert wird dann als **EUR-Festbetrag pro Stunde** interpretiert (nicht als Multiplikator). Modus ist also inhaltlich korrekt gewählt. Der exakte Betrag (1,36 €) selbst konnte über WebSearch **nicht** direkt aus dem TES-PDF (kiinteistöpalvelualan työehtosopimus 2023-2025/2025-2028) verifiziert werden — die Suchergebnisse verweisen nur auf die PDF-Dokumente, ohne die Zahl im Snippet zu liefern | Modus bestätigt korrekt (Code-Fakt); Betrag weder bestätigt noch widerlegt | **OFFEN** — Modus kein Änderungsbedarf; exakter EUR-Betrag nicht unabhängig verifizierbar, keine Änderung ohne belastbare Gegenevidenz |
| 2 | `holidayRate=1.0`, `we2Rate=1.0` für sunnuntaityö nach §20/§33 — 100 % Zuschlag korrekt? | **Minilex.fi**: "Sunnuntaityöstä tulee maksaa palkkaa, joka on korotettu 100 %:lla" (Sunntagsarbeit muss mit 100 % erhöhtem Lohn vergütet werden — kaksinkertainen palkka/doppelter Lohn) | Bestätigt exakt: Rate=1.0 im Default-Modus "multiplier" ist laut Code-Fakt (Seed-Daten `ContractsSeed.cs` verwenden Rate als additiven Zuschlag, z. B. `HolidayRate=0.15`→15 % zusätzlich) ein additiver Zuschlag, d. h. 1.0 = +100 % = Gesamtlohn 200 % — deckt sich exakt mit der finnischen 100-%-Regel | kein Änderungsbedarf — bestätigt korrekt |
| 3 | SOTE-Branchen periodCaps `windowWeeks=3`, `maxAverageWeeklyHours=40` (Jaksotyöaika 120h/3 Wochen) | **KT (Kunta- ja hyvinvointialuetyönantajat) / Tehy / Heta-liitto**: "Working hours should... not exceed 120 hours in any three-week period" für Sozial-/Gesundheitsbereich; 120h/3 Wochen = Ø40h/Woche | bestätigt exakt | kein Änderungsbedarf |
| 4 | `vacationDaysPerYear=30` unter Berücksichtigung der "arkipäivä"-Zählweise | **Vuosilomalaki (Procountor/Wikipedia/Tyosuojelu.fi)**: 2,5 Tage/Monat Vollzeit-Akkumulation nach 1 Jahr Beschäftigung = 30 Tage/Jahr, gezählt in "arkipäivä" (Werktage inkl. Samstag, wie in SE/DK) | bestätigt exakt, 30 ist der korrekte gesetzliche Vollanspruch bei der finnischen Zählweise | kein Änderungsbedarf |
| 5a | Qualifikationsnamen Lähihoitaja/Sairaanhoitaja/Vartija/Puhdistuspalvelujen ammattitutkinto — korrekt/üblich? | Alle vier sind Standardbezeichnungen der finnischen Berufsbildung (Sairaanhoitaja=AMK-Pflegefachperson, Lähihoitaja=zweijährige Berufsausbildung, Puhdistuspalvelujen ammattitutkinto=offizielle Berufsprüfung Reinigungsdienstleistung) | bestätigt korrekt | kein Änderungsbedarf an den Namen selbst |
| 5b | Otto-Fund: Lähihoitaja fehlt bei `healthcare`, ist aber bei `homecare` vorhanden, obwohl identische periodCaps (3W/40h) und `maxWeeklyHours` (48) | reine Struktur-Konsistenzprüfung (kein Rechtsquellen-Bedarf): Lähihoitaja ist in finnischen Krankenhäusern (Sairaala) ebenso Standardpersonal wie in der häuslichen Pflege — keine sachliche Begründung für die Asymmetrie gefunden | Otto-Fund bestätigt zutreffend | **umgesetzt**: Lähihoitaja-Qualifikation zu `healthcare` hinzugefügt (identisch zu `homecare`) |
| 6 | Fehlende Pflicht-Qualifikation bei security (polizeiliche Zulassung)? | **Poliisi.fi/Finlex (Laki yksityisistä turvallisuuspalveluista 1085/2015)**: "Vartijaksi hyväksyminen" (Zulassung als Wachperson) durch Poliisihallitus ist ein eigenständiger Rechtsakt, getrennt von der Ausbildung, **Gültigkeit max. 5 Jahre** | klar zutreffend, SEHR übliche eigenständige Pflicht-Qualifikation mit konkret belegter Befristung (analog zu DKs Vagtbevis, NOs Politiattest, SEs Länsstyrelsens godkännande) — bisher mit der Ausbildung vermischt in einem Feld | **umgesetzt**: bestehende Qualifikation umbenannt zu reiner Ausbildung "Wachperson-Grundausbildung (Vartijan peruskoulutus)"; neue Qualifikation "Vartijaksi hyväksyminen (Zulassung durch Poliisihallitus, Gesetz 1085/2015)" hinzugefügt, `isTimeLimited: true` |

## Offene Punkte

1. **facility nightRate=1.36 EUR/h (Punkt 1):** Modus (`fixedPerHour`) ist per Code-Fakt korrekt
   gewählt; der exakte EUR-Betrag selbst ließ sich über WebSearch nicht aus dem
   Kiinteistöpalvelualan-TES-PDF verifizieren (Suchmaschine lieferte nur PDF-Links, keine
   extrahierbaren Zahlen). Keine Änderung ohne Gegenbeleg — bräuchte direkten PDF-Abgleich
   (z. B. via WebFetch auf die TES-PDF-URL), außerhalb des Zeitrahmens dieser Runde.

## Verifikation

```
python3 json.load fi.json → OK
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests" → 20/20 grün nach diesem Edit
```

### Sammel-Verifikation aller 4 Nordics-Länder (nach allen Edits dk/no/se/fi)

```
python3 json.load auf dk.json, no.json, se.json, fi.json → alle 4 OK
dotnet test --filter "FullyQualifiedName~RegionSetupExampleProfileTests" → 20/20 grün (Basis: 20/20, unverändert)
```

## Gesamturteil

Otto lieferte in dieser Runde erneut keine belastbare Rechtskritik (kompletter Tool-Ausfall), hat
das aber korrekt transparent gemacht und stattdessen einen eigenständigen, quellenfreien
Struktur-Konsistenzfund geliefert (Lähihoitaja-Asymmetrie), der sich bei Prüfung als zutreffend
erwies. Die gesamte rechtliche Fact-Check-Arbeit wurde unabhängig per WebSearch geleistet: **3 von 4
markierten numerischen/inhaltlichen Punkten (Sonntagszuschlag, Jaksotyöaika, Urlaubstage) exakt
bestätigt**, ein Punkt (nightRate-Betrag) bleibt mangels verifizierbarer Quelle OFFEN (Modus jedoch
per Code-Fakt bestätigt). Zwei echte Lücken behoben: fehlende Lähihoitaja-Qualifikation bei
healthcare, fehlende eigenständige Poliisihallitus-Zulassung bei security (mit klar belegter
5-Jahres-Befristung).

**Datei geändert:** `Klacks.Api/deploy/onprem/regions/fi.json` (Sektionen
`industryProfiles.healthcare.qualificationCatalog`, `industryProfiles.security.qualificationCatalog`)
