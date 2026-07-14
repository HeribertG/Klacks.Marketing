# CN — USP → Klacks-Erfüllung

Bewertung gegen die Capability-Inventur `../../../../docs/content-drafts/usp-analysis/klacks-capabilities.md` (echter Code).
Legende: ✅ voll erfüllt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke.

## General

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 36h-Monatsgrenze für Überstunden (加班) tagesaktuell überwacht, Warnung vor Erreichen | Perioden-Stundensummen | ⚠️ | Monatsstunden summierbar/sichtbar; **kein** Monats-OT-Cap-Alarm (OvertimeThreshold/MaximumHours nicht ausgewertet). Reframe: Summen sichtbar machen. |
| Überstundenzuschläge 150/200/300% gestuft; 300% Feiertag nie durch Freizeit ersetzbar | Typisierte Zuschläge | ⚠️ | 200% Ruhetag (=Wochenend-) und 300% Feiertag ✅ über typisierte Zuschläge; aber 150% Werktags-OT-Prämie ist **kein** typisierter Zuschlag-Typ; "300% nie durch Freizeit" nicht erzwingbar. |
| Monats-Soll 165,3h statt 166,6h gerechnet | Grenzwert-/Settings-Wert (GuaranteedHours) | ✅ | Sollstunden-Wert frei konfigurierbar. |
| On-Premise: biometrische Zeiterfassungsdaten verlassen China nie (PIPL Art. 38) | On-Premise-Stack | ❌ | Keine Biometrie; On-Premise gilt für Planungsdaten. |
| Wochenplanung mit 40-Stunden-Woche statt 44h | Grenzwert-Engine (MaxWeeklyHours) | ✅ | Wochen-Grenzwert konfigurierbar. |
| Provinzielle Lohnunterschiede als Konfiguration pro Standort | — | ⚠️ | Klacks speichert **keine** Lohn-/Mindestlohnbeträge (kein Payroll-System). Payroll-Export-Config existiert pro Gruppe, aber ohne Lohnbeträge/ohne UI. Reframe. |
| Klacksy plant regelbasiert; KI-Modell lokal hostbar | Klacksy + On-Premise | ✅ | |

## Häusliche Pflege (spitex)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Zyklus-Arbeitszeit über genehmigten Zyklus (Woche/Monat/Quartal/Jahr) aggregiert, OT erst bei Überschreitung (综合计算工时) | Perioden-Stundensummen | ⚠️ | Perioden-Summen (Woche/2-Wo/Monat) vorhanden; frei definierbarer Zyklus (Quartal/Jahr) + "OT erst nach Zyklus-Soll" nicht als Feature; Aggregat-Cap nicht durchgesetzt. |
| Genehmigungsauflagen dokumentiert, Zyklus-Daten wie von der Behörde verlangt bereitgehalten | Reports / Perioden-Daten | ⚠️ | Stunden-/Perioden-Daten via Reports verfügbar; keine dedizierte Compliance-Dokumentation für die 综合计算工时-Genehmigung. |
| Einsätze automatisch geplant, Reihenfolge hält Zeitfenster ein | Autofill/GA (+ zeitfenster-bewusste Route) | ✅ | |
| Qualifikationen automatisch berücksichtigt | Qualifikations-Matching | ✅ | |
| On-Premise: Patienten-/Personaldaten verlassen China nicht | On-Premise-Stack | ✅ | Kein Biometrie-Wort. |
| Klacksy prüft Zyklus-Sollzeit, Qualifikation und Verfügbarkeit | Klacksy | ⚠️ | Zyklus-Sollzeit-Bezug siehe oben. |

## Spitäler (spitaeler)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| 值班 (Bereitschaft) und 加班 (Überstunden) getrennt erfasst; substantielle Arbeit im 值班 automatisch als 加班 markiert | Work-Records / WorkChange-Typen | ⚠️ | Bereitschaft und Überstunden als getrennte Typen abbildbar; keine automatische Erkennung "substantielle Arbeit → 加班". |
| 150/200/300% zugeordnet, sobald aus 值班 rechtlich 加班 wird | Typisierte Zuschläge | ⚠️ | Ruhetag-/Feiertagszuschlag ✅; Werktags-OT-Prämie 150% kein typisierter Zuschlag. |
| Echter 加班 laufend gegen die Grenze summiert, über alle Stationen/Rotationen | Perioden-Stundensummen | ⚠️ | Stunden summierbar; gegen gesetzliche Monatsgrenze kein Cap-Alarm. |
| Lückenlose 24/7-Abdeckung, automatisch gefüllt | Autofill/GA | ✅ | |
| On-Premise: Personal-/Patientendaten verlassen Klinik und China nicht | On-Premise-Stack | ✅ | |
| Klacksy erkennt automatisch, ob Nachtdienst 值班 oder 加班 ist, und schlägt Vergütung vor | Klacksy | ⚠️ | Keine automatische 值班/加班-Klassifizierung. |

## Security

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Zyklus-Arbeitszeit über genehmigten Zyklus (z.B. Quartal) korrekt aggregiert, OT erst bei Überschreitung | Perioden-Stundensummen | ⚠️ | Wie Spitex: Quartals-/Jahreszyklus + "OT erst nach Zyklus-Soll" nicht als Feature. |
| 150/300% automatisch zugeordnet, sobald echter 加班 anfällt | Typisierte Zuschläge | ⚠️ | Feiertag ✅; Werktags-OT 150% nicht typisiert. |
| Genehmigungsauflagen dokumentiert, wie 人社局 es verlangt | Reports / Perioden-Daten | ⚠️ | Keine dedizierte Compliance-Dokumentation. |
| Objekte & Posten lückenlos besetzt | Autofill/GA | ✅ | |
| On-Premise: Personal-/Objektdaten verlassen China nicht | On-Premise-Stack | ✅ | |
| Klacksy prüft bei jeder Zuteilung den Zyklus-Stand und schlägt Besetzungen vor | Klacksy | ⚠️ | Zyklus-Sollzeit-Bezug siehe oben. |

## Haus-/Putzdienste (hausdienste)

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Geteilte Schichten (保洁员): aktive Arbeitszeit jedes Blocks erfasst und im Plan zusammengeführt | Work-Records + Perioden-Summierung | ⚠️ | Einsatzblöcke erfassbar + Perioden-Summierung; automatische Zusammenführung geteilter Dienste nur teilweise. |
| Zyklus-Arbeitszeit über genehmigten Zyklus aggregiert (综合计算工时) | Perioden-Stundensummen | ⚠️ | Wie oben. |
| Objekt-Routen optimiert für Auto/Fahrrad/zu Fuss | Tourenoptimierung | ✅ | |
| Teams flexibel eingeteilt, wechselnde Besetzungen im Überblick | Autofill/GA | ✅ | |
| On-Premise: Personal-/Objektdaten verlassen China nicht | On-Premise-Stack | ✅ | |
| Klacksy optimiert Route, Team und Zyklus-Erfassung in einem Schritt | Klacksy | ⚠️ | Zyklus-Bezug siehe oben. |

## Logistik

| USP-Versprechen | Klacks-Fähigkeit | Verdikt | Anmerkung |
|---|---|---|---|
| Ununterbrochene Lenkzeit und Pausenlänge in Echtzeit überwacht, Warnung vor Verstoss (4h/20min) | Grenzwert-Engine + Warnungen | ⚠️ | Generische Grenzen + Warnung; keine native Lenkzeit-Domäne; "4h/20min"-Segmentlogik nicht nativ. |
| Strafpunkte vermieden, indem Touren verhindert werden, die zum Verstoss führen | Compliance-Warnungen | ⚠️ | Warnt/macht sichtbar; verhindert das Speichern nie. Reframe. |
| Fracht und Personentransport getrennt, jeweils richtige Regel angewendet | Grenzwert-Engine (SR pro Vertrag/Gruppe) | ✅ | Getrennte Grenzwert-Sätze pro Vertrag/Gruppe/Regel konfigurierbar. |
| Touren automatisch optimiert | Tourenoptimierung | ✅ | |
| On-Premise: Fahrer-/Kundendaten verlassen China nicht | On-Premise-Stack | ✅ | |
| Klacksy plant per Sprache, rechnet bei Ausfall alles neu inkl. Lenkzeiten | Klacksy | ⚠️ | Lenkzeit-Bezug siehe oben. |

## Fazit

- **Trägt ehrlich:** Konfigurierbare Wochen-/Sollstunden (40h/165,3h), getrennte Regelwerke pro Gruppe, Feiertags-/Wochenend-Zuschlag (200/300%), Autofill, Tourenoptimierung, Klacksy, On-Premise-Planungsdaten.
- **Entschärfen:** (1) 综合计算工时 (Zyklus-Aggregation über Quartal/Jahr) ist der Kern-USP und nur teilweise gedeckt — Perioden-Summen ja, frei definierbarer Zyklus + "OT erst nach Zyklus-Soll" + Genehmigungs-Doku nicht als Feature. (2) 值班↔加班-Auto-Klassifizierung existiert nicht. (3) 36h-Monats-OT ist Aggregat → sichtbar machen, nicht "warnen vor Cap". (4) 150% Werktags-OT-Prämie kein typisierter Zuschlag. (5) Biometrie/PIPL-Claim → keine Biometrie. (6) Provinzielle Löhne → kein Payroll-System.
- **Bilanz:** ✅ 16 · ⚠️ 20 · ❌ 1.
