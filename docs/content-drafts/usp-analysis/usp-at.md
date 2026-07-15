# AT — USP-Versprechen (extrahiert aus den Seiten)

> **Quellen-Hinweis:** Nur `Localization/Content/de/land-at.json` (General) ist aktuell live deployed. Die 5 Branchen-Seiten (spitex/spitaeler/security/hausdienste/logistik) existieren für AT **nicht** unter `Localization/Content/de/land-at-*.json` bzw. `Pages/LandAt*.razor` — es gibt nur unpromotete Entwürfe unter `docs/content-drafts/at/{spitex,spitaeler,security,hausdienste,logistik}.json`. Diese Extraktion nutzt deshalb: General = Live-Seite, Branchen = Entwürfe (noch nicht deployed). Zusätzlich existiert unter `docs/content-drafts/at/general.json` ein zweiter, abweichender General-Entwurf (AZG/ARG/§ 96a ArbVG/Open-Source-Fokus für Betriebe allgemein statt SWÖ-Pflege) — dieser ist NICHT live und wird hier nicht separat bewertet, da die Live-Seite bereits existiert und die Aufgabe explizit die Live-Seite nennt.

## General (land-at.json — LIVE)
- Wechselschichten SWÖ-konform geplant, Schwerarbeitstage mitgezählt, Zuschläge automatisch im Blick (Hero-Gesamtversprechen)
- Schwerarbeitstage automatisch gezählt — Wechselschicht-Tage mit &gt;50% direkter Pflege, mind. 12 Tage/Monat, als Grundlage für die jährliche Meldung an die Krankenkasse
- Vorlauffristen eingehalten — Autofill-Wizard plant so, dass die gestaffelten SWÖ-Fristen (1. bzw. 14. des Vormonats) zuverlässig eingehalten werden
- SWÖ-Zuschläge vorbereitet — Sonn-, Feiertags- und Pflegezuschlag je Bereich (mobil/stationär) korrekt vorbereitet, bereit für die Lohnverrechnung
- KA-AZG für Spitäler — 48h/17-Wochen-Höchstarbeitszeit und 11h-Ruhezeit automatisch überwacht
- On-Premise: Daten bleiben im Haus (generisch)

## General (general.json — konkurrierender Entwurf, NICHT live)
> Zweiter General-Entwurf mit anderem Fokus (Betriebe allgemein statt SWÖ-Pflege, AZG/ARG/§ 96a ArbVG/Open Source). Da beide Entwürfe für dieselbe URL/Seite konkurrieren, wird dieser hier ebenfalls geprüft statt stillschweigend ausgeklammert.
- AZG- &amp; ARG-Grenzen automatisch geprüft — Höchstarbeitszeit, Ruhezeiten und die 36-Stunden-Wochenendruhe (inkl. Sonntag) werden in Echtzeit überwacht, „Verstöße entstehen gar nicht erst"
- Dienste automatisch geplant (generisch — Autofill-Wizard)
- Touren automatisch optimiert (generisch)
- On-Premise: volle Datenhoheit (generisch)
- Open Source: nachvollziehbar &amp; anpassbar — „Der Quellcode liegt offen, Sie sehen was Klacks tut und passen an, was Ihr Betrieb braucht"
- Klacksy transparent &amp; nachvollziehbar macht die Betriebsrat-Zustimmung nach § 96a ArbVG leichter erfüllbar als eine intransparente Cloud-KI

## Häusliche Pflege (spitex — Entwurf, noch nicht live)
- Touren automatisch optimiert (generisch)
- Wegzeit als volle Arbeitszeit erfasst — Fahrten zwischen Klient:innen zählen nach SWÖ-KV als volle Arbeitszeit
- Schwerarbeit dokumentiert — mind. 12 Tage/Monat im rotierenden Schichtdienst inkl. Nachtarbeit, lückenlos für die jährliche Meldung
- Rufbereitschaft im Rahmen gehalten — max. 30 Tage innerhalb von 3 Monaten automatisch im Blick
- Qualifikationen automatisch berücksichtigt (generisch)
- SWÖ-konforme Zuschläge &amp; Rufbereitschaft vorbereitet
- On-Premise: Daten bleiben im Haus (generisch)
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)

## Spitäler (spitaeler — Entwurf, noch nicht live)
- 24/7 lückenlose Abdeckung — jede Lücke sofort sichtbar, auf Wunsch automatisch gefüllt
- KA-AZG-konform automatisch geprüft — 48h ohne / 52h mit Opt-out (seit 1.7.2025) je Ärzt:in in Echtzeit überwacht, „Verstöße entstehen gar nicht erst"
- Qualifikationen &amp; Stationen — nur passend qualifiziertes Personal je Station/Abteilung/Funktion
- On-Premise: Daten bleiben im Haus (generisch)
- Klacksy plant per Sprache (generisch)
- Springerpool &amp; Ausfälle — sofort verfügbare, qualifizierte Springer bei Ausfall

## Security (Entwurf, noch nicht live)
- Objekte &amp; Posten lückenlos — jede offene Stelle sofort sichtbar, auf Wunsch automatisch gefüllt
- KV-Zuschläge automatisch berechnet — 100%-Zuschlag am wöchentlichen Ruhetag + anteilige Anwesenheitsbereitschaft, bereit für die Lohnverrechnung
- Rundgänge optimiert — bei mobilen Diensten Routen mit kurzen Wegen und eingehaltenen Intervallen
- 24/7-Rotation fair — Tag-, Nacht- und Wochenenddienste rotiert, mit Zuschlägen und Ruhezeiten automatisch berücksichtigt
- Klacksy plant per Sprache (generisch)
- Ausfälle in Minuten ersetzt (generisch)

## Haus-/Putzdienste (hausdienste — Entwurf, noch nicht live)
- Objekt-Routen optimiert (generisch)
- Teams flexibel eingeteilt (generisch)
- Zuschläge korrekt berechnet — 75%-Zuschlag für die 11./12. Arbeitsstunde (statt der üblichen 50%) und 25%-Mehrarbeitszuschlag bei Teilzeit automatisch vorbereitet
- Qualifikationen passend (generisch — Spezialreinigung/Maschinen/Sicherheitsbereiche)
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)

## Logistik (Entwurf, noch nicht live)
- Touren automatisch optimiert (generisch)
- Einsatz- &amp; Lenkzeiten geprüft — Grenzen nach § 16 AZG (12h, per KV bis 14h bei Lkw &gt;3,5t/Bussen &gt;9 Plätzen; Lenkzeit im Schnitt max. 48 Wochenstunden) in Echtzeit überwacht, „Verstöße entstehen gar nicht erst"
- 56-Tage-Nachweispflicht vorbereitet — Fahrtenschreiberdaten seit 31.12.2024 strukturiert und jederzeit abrufbar gehalten (56 statt 28 Tage)
- Führerschein-Klassen passend — Zuteilung nur mit passender Berechtigung, Warnung vor ablaufenden Nachweisen
- Klacksy plant per Sprache (generisch)
- Ausfälle schnell aufgefangen (generisch)
