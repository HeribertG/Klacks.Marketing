# IL — USP → Klacks-Erfüllung

Bewertung gegen die Capability-Inventur `../../../../docs/content-drafts/usp-analysis/klacks-capabilities.md` (echter Code).
Legende: ✅ voll erfüllt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenloses, exportierbares Arbeitszeitbuch gegen Amendment-24-Beweislast und 60-OT-Vermutung | Work-Records (exportierbar) | ⚠️ | Work-Records exportierbar, aber manuell/planungsbasiert; **kein verifizierter Clock-in/Stempel**. Ehrlich als "Dokumentation der geplanten/erfassten Zeiten", nicht als manipulationssicherer Stempelnachweis. |
| Überstundenzuschläge automatisch: erste 2h 125%, weitere 150% (bei 42h/8,6h-Schwelle) | Typisierte Zuschläge | ⚠️ | Gestufte OT-Prämie ist kein typisierter Zuschlag-Typ; per Macro skriptbar, nicht validiert. |
| Sabbat-/Wochenruhe geprüft, Hinweis auf Genehmigung + 150% + Ersatzruhetag | Ruhezeit-Regeln + Warnungen + Zuschläge | ⚠️ | 36h-Wochenruhe-Prüfung über generische Werte ✅; aber 150%-Prämie OT-artig (Macro), religionsbezogener Ruhetag nicht First-Class, Genehmigungs-Hinweis/Ersatzruhetag nicht als Feature. |
| On-Premise: biometrische und personenbezogene Daten verlassen das Haus nicht | On-Premise-Stack | ❌ | Biometrie-Claim; Klacks hält keine biometrischen Daten. Reframe auf Planungs-/Personaldaten. |
| Klacksy plant regelbasiert und nachvollziehbar | Klacksy | ✅ | |
| Ausfälle schnell aufgefangen, qualifiziert/verfügbar ersichtlich | GA + Qualifikations-Matching | ✅ | |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Globalvertrag korrekt geführt: Live-In als Globalvertrags-Fall markiert, Pauschale statt OT | Vertragsmodell (Contract) | ⚠️ | Als Vertragstyp/Feld markierbar; keine automatische "Ausnahme vom Arbeitszeitgesetz"-Logik (man würde für sie schlicht keine OT tracken). Verifizieren. |
| 25h-Wochenruhe geprüft, terminiert nach Religion/Nationalität | Ruhezeit-Regeln (MinRestHours/MinRestDays) | ⚠️ | Wochenruhe-Stunden konfigurierbar/prüfbar; aber religions-/personenspezifischer Ruhe-TAG nicht First-Class (Wochenendtage sind globales Setting, nicht pro Person). |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching | ✅ | |
| On-Premise: Klient:innendaten verlassen die Organisation nicht | On-Premise-Stack | ✅ | |
| Klacksy meldet fehlende Ruhezeiten sofort | Klacksy + Compliance-Warnungen | ✅ | Ruhezeit-Warnung existiert. |
| Ausfälle schnell aufgefangen | GA/Qual | ✅ | |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lückenlose 24/7-Abdeckung, automatisch gefüllt | Autofill/GA | ✅ | |
| Toranut-Grenze (18h, Peripherie 21h) in Echtzeit überwacht, Verstöße entstehen gar nicht erst | Grenzwert-Engine + Warnungen | ⚠️ | Tagescap als SR + Warnung; "Verstöße entstehen gar nicht erst" → warnen, nicht blockieren. |
| Qualifikationen pro Station/Abteilung/Funktion | Qualifikations-Matching | ✅ | |
| On-Premise: Personal-/Patient:innendaten verlassen die Klinik nicht | On-Premise-Stack | ✅ | |
| Klacksy berücksichtigt Qualifikation und 18/21h-Grenze | Klacksy | ⚠️ | Cap-Garantie warn-only. |
| Springerpool: Ausfälle sofort mit qualifizierten Springern aufgefangen | GA/Qual | ✅ | |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekte & Posten lückenlos, automatisch gefüllt | Autofill/GA | ✅ | |
| 8h-Ruhe zwischen Arbeitstagen geprüft, ungewollte Zusammenlegung verhindert | Ruhezeit-Regel (MinRestHours) + Warnungen | ⚠️ | Prüfbar/Warnung ✅; "verhindert" → warnt, blockiert nicht. |
| Nachtschicht-Grenze 7h, jede Stunde über Grenze mit 125/150% verzuschlagt | Typisierte Zuschläge (Night) | ⚠️ | Nachtzuschlag existiert, Fenster aber **23–06 hart**, nicht 22–06; OT-Prämie 125/150 kein typisierter Zuschlag; 7h-Nachtgrenze kein spezifisches Feld. |
| Rundgänge optimiert | Tourenoptimierung | ✅ | |
| Klacksy prüft Ruhezeit und Nachtschicht-Grenze | Klacksy | ⚠️ | Inheritiert obige Grenzen. |
| Ausfälle in Minuten mit qualifiziertem Ersatz | GA/Qual | ✅ | |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Objekt-Routen optimiert für Auto, Rad oder zu Fuß | Tourenoptimierung (Modi car/bike/foot) | ✅ | |
| Teams flexibel eingeteilt trotz wechselnder Besetzungen/Ausfälle | Autofill/GA | ✅ | |
| Studienfonds-Grundlage lückenlos dokumentiert, ohne Nachzahlungsrisiko | Work-Records / Stundenbasis | ⚠️ | Stunden-Basis dokumentierbar/exportierbar; Fonds-Beitragsberechnung ist Payroll (nicht abgedeckt). |
| Qualifikationen passend eingeteilt | Qualifikations-Matching | ✅ | |
| Klacksy optimiert Route und Team | Klacksy + Route/GA | ✅ | |
| Ausfälle schnell aufgefangen, Personal/Route sofort ersichtlich | GA + Route | ✅ | |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Lenkzeit nach Regulation 168 (12h/24h, 68h/7d) in Echtzeit geprüft, Verstöße entstehen gar nicht erst | Grenzwert-Engine + Warnungen | ⚠️ | Generische Tages-/Wochengrenzen + Warnung; keine native Lenkzeit-Domäne; "entstehen gar nicht erst" → warnen; 68h/7d-Aggregat teils nur Pre-Commit. |
| Pflichtpause: 30min nach spätestens 4h ununterbrochener Fahrt | Grenzwert-Engine + GA | ⚠️ | MinPauseHours = Mindestpause; "30min nach 4h Fahrt" (Segment-Pausen-Einfügung) nicht nativ. |
| Vorruhe 7h, Wochenruhe 25h, min. 52 Ruhetage/Jahr | Ruhezeit-Regeln | ⚠️ | Tages-/Wochenruhe ✅; "7h Vorruhe vor Fahrtantritt" und "52 Ruhetage/Jahr" (Jahresaggregat) nicht als spezifische Regeln. |
| Touren automatisch optimiert | Tourenoptimierung | ✅ | |
| Klacksy rechnet Lenk- und Ruhezeiten bei Ausfall neu | Klacksy | ⚠️ | Inheritiert obige Grenzen. |
| Ausfälle schnell aufgefangen, Ersatz innerhalb der Lenkzeitgrenzen | GA + Warnungen | ⚠️ | Lenkzeitgrenzen warn-only/nicht nativ. |

## Fazit

- **Trägt ehrlich:** Autofill/Springerpool, Tourenoptimierung, Klacksy, Qualifikations-Matching, Ruhezeit-Prüfung mit Warnung, On-Premise-Planungsdaten, exportierbare Zeit-Dokumentation.
- **Entschärfen:** (1) Amendment-24-Nachweis ehrlich als Dokumentation geplanter/erfasster Zeiten (kein Stempel/Biometrie). (2) Biometrie-Claim (General) streichen. (3) OT-Zuschläge 125/150% und Nachtfenster 22–06 → kein typisierter Zuschlag / Default 23–06. (4) Toranut/Lenkzeit "Verstöße entstehen gar nicht erst" → warnen. (5) Studienfonds-/Globalvertrags-Logik nur teilweise (Stundenbasis ja, Payroll nein).
- **Bilanz:** ✅ 19 · ⚠️ 16 · ❌ 1.
