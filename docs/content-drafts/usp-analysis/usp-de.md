# DE — USP-Versprechen (extrahiert aus den Seiten)

> **Quellen-Hinweis:** Nur `Localization/Content/de/land-de.json` (General) ist aktuell live deployed. DE ist in `Localization/CountryIndustries.cs` (`CountriesWithIndustries`) **nicht registriert** — anders als bei PL/CH/BE/etc. existieren für DE **keine** Branchen-Subrouten (`land-de-spitex` usw.); der Content-Provider würde dafür ohnehin keine Datei finden. Die 5 Branchen-Seiten (spitex/spitaeler/security/hausdienste/logistik) liegen nur als unpromotete Entwürfe unter `docs/content-drafts/de/{spitex,spitaeler,security,hausdienste,logistik}.json` vor. Diese Extraktion nutzt deshalb: General = Live-Seite, Branchen = Entwürfe (noch nicht deployed, noch nicht einmal geroutet). Zusätzlich existiert unter `docs/content-drafts/de/general.json` ein zweiter, abweichender General-Entwurf (Open-Source/On-Premise/DSGVO-Art.-88-Fokus, DATEV, kein PpUGV-Schwerpunkt) — dieser ist NICHT live und wird hier nicht separat bewertet, da die Live-Seite bereits existiert und die Aufgabe explizit die Live-Seite nennt.

## General (land-de.json — LIVE)
- Recovery-Engine bei Ausfall — Klacks berechnet sofort die besten, rechtssicheren Ersatzoptionen aus dem Springerpool, ohne Telefonrunde
- ArbZG-Ruhezeiten automatisch geprüft — die 11-stündige Ruhezeit zwischen Diensten wird in Echtzeit überwacht, „Verstösse entstehen gar nicht erst"
- PpUGV-Mindestbesetzung im Blick — Klacks zeigt pro Schicht, ob die Pflegepersonaluntergrenze eingehalten ist, bevor es zur Meldung oder Sanktion kommt
- Wunschdienste berücksichtigt — die Autofill-Engine respektiert hinterlegte Mitarbeiterwünsche
- DATEV-Export — Bewegungsdaten und Buchungsstapel gehen direkt im DATEV-Format an die Lohnbuchhaltung, ohne Doppelerfassung
- On-Premise: Daten bleiben im Haus — Personal- und Patientendaten verlassen das Haus nicht, auch nicht zur KI
- Klacksy: eingebetteter Assistent (kein Marketing-Chatbot) — Dienstzeiten, Schichttausch-Anfragen und Qualifikations-Konflikte per Chat, Vorschläge nur passend zu tatsächlichen Qualifikationen und Arbeitszeit-Vorgaben (generisch)

## Häusliche Pflege (spitex — Entwurf, noch nicht live, noch nicht geroutet)
- Touren automatisch optimiert (generisch)
- Wegezeit korrekt vergütet — Wege zwischen Patient:innen zählen als bezahlte Arbeitszeit (generisch)
- Qualifikationen automatisch berücksichtigt (generisch)
- Pflegemindestlohn nach Qualifikationsstufe — die gestaffelten Mindestlöhne der 7. PflegeArbbV sind je Qualifikationsstufe hinterlegt, inklusive Zuschlägen für Nacht-, Wochenend- und Feiertagsdienste
- On-Premise: Daten bleiben im Haus, auch nicht zur KI (generisch)
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)

## Spitäler (spitaeler — Entwurf, noch nicht live, noch nicht geroutet)
- Lückenlose 24/7-Abdeckung — jede Lücke sofort sichtbar, auf Wunsch automatisch gefüllt
- ArbZG-Ruhezeiten automatisch geprüft — die 11-Stunden-Ruhezeit nach § 5 ArbZG und die 48-Stunden-Grenze für Bereitschaftsdienst nach § 7 ArbZG werden in Echtzeit überwacht, „Verstösse entstehen gar nicht erst"
- PpUGV-Mindestbesetzung im Blick — Klacks zeigt pro Schicht, ob die Pflegepersonaluntergrenze eingehalten ist, bevor es zur Meldung oder zum Vergütungsabschlag nach § 137i SGB V kommt
- On-Premise: Daten bleiben im Haus, auch nicht zur KI (generisch)
- Klacksy plant per Sprache (generisch)
- Springerpool &amp; Ausfälle (generisch)

## Security (Entwurf, noch nicht live, noch nicht geroutet)
- Objekte &amp; Posten lückenlos (generisch)
- Bewacherregister &amp; Sachkunde automatisch geprüft — Klacks teilt Einsätze nur Personal mit gültiger Registrierung nach § 11b GewO und, wo nötig, Sachkundeprüfung nach § 34a GewO zu, und warnt vor ablaufenden Nachweisen
- 12-Stunden-Schichten korrekt geplant — nach § 7 Abs. 1 Nr. 1a ArbZG i. V. m. dem einschlägigen Manteltarifvertrag, tarifgerecht mit Zuschlägen und Ruhezeiten automatisch berücksichtigt
- Rundgänge optimiert (generisch)
- Klacksy plant per Sprache (generisch)
- Ausfälle in Minuten ersetzt (generisch)

## Haus-/Putzdienste (hausdienste — Entwurf, noch nicht live, noch nicht geroutet)
- Objekt-Routen optimiert (generisch)
- Teams flexibel eingeteilt (generisch)
- Wegezeiten korrekt erfasst — Wegezeiten zwischen mehreren Objekten am selben Tag zählen nach § 3 Abs. 2.2 RTV Gebäudereinigung bis zu drei Stunden als volle Arbeitszeit
- Mindestlöhne nach Lohngruppe — die Lohngruppen des Lohntarifvertrags Gebäudereinigung (Unterhalts- bis Glasreinigung, ab 1.1.2026 15,00–18,40 €/h) sind hinterlegt, inklusive Zuschlägen
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)

## Logistik (Entwurf, noch nicht live, noch nicht geroutet)
- Touren automatisch optimiert (generisch)
- Lenk- &amp; Ruhezeiten geprüft — die Grenzen nach Art. 6 und 7 der VO 561/2006 werden in Echtzeit überwacht, „Verstösse entstehen gar nicht erst"
- 56-Tage-Nachweis &amp; Smart Tachograph 2 — Klacks dokumentiert Lenk- und Ruhezeiten über den vollen 56-Tage-Zeitraum (EU-Verordnung 2020/1054) und berücksichtigt die Pflicht zum Smart Tachograph 2 im grenzüberschreitenden gewerblichen Verkehr
- Führerschein-Klassen passend — Zuteilung nur mit passender Berechtigung, Warnung vor ablaufenden Nachweisen
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)
