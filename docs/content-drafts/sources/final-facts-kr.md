# KR — Südkorea: korrigierte, fact-gecheckte Fakten (Primärquellen-Prüfung Otto-Brainstorm)

> Verifiziert gegen Labor Standards Act (근로기준법, elaw.klri.re.kr / law.go.kr), MOEL (고용노동부),
> PIPA, MOHW/전공의법, MOLIT-안전운임 sowie NHIS-재가급여-RFID-System.
> Otto deklarierte alles als "100 % sicher" — mehrere Zahlen/Gesetzeszitate waren jedoch falsch.
> Nur bestätigte oder korrigierte Fakten unten; Fehlerhaftes im Abschnitt "Gestrichen/Korrigiert".

## Teil 1: Allgemein (branchenneutral)

- **52-Stunden-Woche** (주 52시간 근무제, *Ju-osip-i-sigan geunmu-je*): max. 40h regulär + max. 12h Überstunden = 52h/Woche. Rechtsgrundlage § 50 Abs. 1 (Normalarbeitszeit) i.V.m. § 53 Abs. 1 LSA (Überstundenlimit). Seit 1.7.2021 auf alle Betriebe mit ≥5 Beschäftigten anwendbar; vom koreanischen Verfassungsgericht bestätigt. Ein harter Schicht-Cap pro Mitarbeiter ist der stärkste GTM-Treiber. (Labor Standards Act §§ 50, 53; MOEL)
- **Sanktion bei Überschreitung:** bis zu **2 Jahre Haft ODER Geldstrafe bis 10 Mio. KRW** (§ 110 LSA). KORREKTUR: Otto nannte 20 Mio. KRW — falsch, der Rahmen ist 10 Mio. KRW.
- **Zuschläge Überstunden & Nacht** (연장근로수당 / 야간근로수당): je mind. **50 %** Aufschlag auf den Normallohn; Nachtarbeit definiert als **22:00–06:00**. Treffen Überstunde und Nachtarbeit zusammen, werden die Zuschläge kumuliert → **Gesamtvergütung 200 %** (100 % Basis + 50 % ÜStd + 50 % Nacht). (§ 56 LSA)
- **Pausenzeiten** (휴게시간, *Hyugae-sigan*): mind. **30 Min bei >4h**, mind. **1 Stunde bei >8h** Arbeit, jeweils während der Arbeitszeit zu gewähren. (§ 54 LSA)
- **PIPA & Biometrie** (개인정보 보호법 / 민감정보): Biometrische Daten zur eindeutigen Identifikation (Fingerabdruck, Gesichtsscan) gelten als **sensible Daten** und erfordern gesonderte Einwilligung; grenzüberschreitende Übermittlung ist restriktiv (Zustimmung/Angemessenheit, PIPC-Aufsicht). On-Premise-Hosting (Klacks) hält biometrische Zeiterfassungsdaten lokal im Betrieb und umgeht die Cross-Border-Hürde. (Personal Information Protection Act; PIPC)

## Häusliche Pflege (재가급여 / 요양보호사)

- **Staatliches RFID-Besuchsnachweis-System** (재가급여전자관리시스템, RFID 태그): Häusliche Pflegekräfte (요양보호사) müssen Beginn/Ende jedes Hausbesuchs per RFID-Tag erfassen, der im Haushalt des Leistungsempfängers installiert ist; die Daten gehen an die **NHIS (국민건강보험공단)**. Nur so registrierte Zeiten werden von der Langzeitpflegekasse rückvergütet. Klacks kann Ist-Stempeldaten gegen die geplanten Dienste abgleichen. Rechtsrahmen: Langzeitpflegeversicherung (노인장기요양보험법) + NHIS-Vorgaben. (NHIS / Long-Term Care Insurance)
- **Wöchentlicher bezahlter Ruhetag** (주휴일, *Juhyuil*): mind. 1 bezahlter Ruhetag/Woche (§ 55 LSA). Arbeit an diesem Feiertag löst Zuschlag aus: **+50 % bis 8h**, **+100 % ab der 9. Stunde** — Rechtsgrundlage für den Zuschlag ist § 56 Abs. 2 LSA (nicht § 55). Werte bestätigt.

## Spitäler / Krankenhäuser

- **Assistenzärzte — Verkürzung der Dauerschicht ab 21.2.2026** (전공의법 / 연속수련): Ab **21. Februar 2026** sinkt die max. kontinuierliche Dienstzeit von **36h auf 24h**; in Notfällen ausnahmsweise bis **28h**. Verstoßende Ausbildungskrankenhäuser: **Ordnungsgeld 5 Mio. KRW (과태료)**. KORREKTUR ggü. Otto: nicht "Entzug der Ausbildungslizenz", sondern 5-Mio.-KRW-Bußgeld; die 28h-Notfallgrenze ist korrekt (die im Pilot genannten 30h galten nur für das Vorab-Modellprojekt). (Medical Resident Act 전공의의 수련환경 개선 및 지위 향상을 위한 법률; MOHW)
- **11h Mindestruhe zwischen Diensten auch im Gesundheitswesen:** Krankenhäuser zählen zu den "Sonderausnahme-Branchen" nach § 59 LSA; adoptieren sie die Ausnahmevereinbarung, müssen sie **11 zusammenhängende Ruhestunden** zwischen zwei Arbeitstagen gewähren. Ein durchsetzbarer Ruhe-Cap ist hier gleich doppelt relevant. (§ 59 LSA)

## Security / Bewachungsdienste

- **Sondergenehmigung für Überwachungs-/intermittierende Arbeit** (감시적·단속적 근로자, *Gamsijeog·Dansokjeog geunloja*): Sicherheitsdienste in 24h-Wechselschichten können mit **MOEL-Genehmigung** von den Regelungen zu Arbeitszeit, Pausen und Ruhetagen (inkl. 52-Stunden-Woche) **befreit** werden (§ 63 LSA). Klacks muss diese Befreiung pro Mitarbeiter hinterlegen können.
- **Nachtzuschlag bleibt zwingend:** § 63 nimmt Arbeitszeit/Pausen/Ruhetage aus, NICHT die Nachtarbeitsvergütung — der **50-%-Nachtzuschlag (22:00–06:00)** ist auch für befreite Wachleute weiter zu zahlen und muss vom System berechnet werden. (§ 56 i.V.m. § 63 LSA)

## Haus-/Putzdienste (Gebäudereinigung)

- **Bezahlte Bereitschafts-/Wartezeit** (대기시간, *Daegi-sigan*): Zeit, in der der Arbeitnehmer unter Weisung/Aufsicht des Arbeitgebers auf Arbeit wartet (typisch bei geteilten Reinigungsschichten, 분할근무), gilt gesetzlich als **volle Arbeitszeit** und ist zu vergüten. Rechtsgrundlage: **§ 50 Abs. 3 LSA** (Otto-Zitat korrekt). Präzise Erfassung dieser Intervalle verhindert Nachzahlungsklagen. (§ 50 Abs. 3 LSA)

## Logistik / Güterverkehr

- **11h zusammenhängende Ruhezeit für Fahrer:** KORREKTUR der Rechtsgrundlage — die 11-Stunden-Regel steht NICHT im Güterkraftverkehrsgesetz (화물자동차 운수사업법), sondern in **§ 59 LSA**: Der Landverkehr (육상운송, außer Linien-Personenverkehr) ist eine der fünf "Sonderausnahme-Branchen"; bei Nutzung der Ausnahmevereinbarung müssen **mind. 11 zusammenhängende Ruhestunden** zwischen zwei Arbeitstagen gewährt werden. Die 11h-Zahl ist korrekt, die Gesetzeszuordnung Ottos war falsch. (§ 59 LSA)
  - Hinweis: Das Güterkraftverkehrsgesetz selbst regelt separat **15 Min Pause nach 2h Dauerfahrt** (nicht die 11h) — falls als zusätzlicher Aufhänger gewünscht.
- **Sicherheitsfrachtratensystem reaktiviert** (안전운임제, *Anjeon un-im-je*): In Kraft seit **1. Februar 2026**, befristet bis 31.12.2028 (3 Jahre); gilt für **Export-/Import-Container und Zement**. Regelt Mindestfrachtvergütungen zur Vermeidung von Übermüdung/Raserei. WICHTIG/ehrlich: Es ist primär eine **Tarif-/Vergütungs­regulierung** (KRW pro Fahrt/km), kein direkter Schichtzeit-Cap — als Scheduling-Software-Aufhänger nur mittelbar (Roster-Stunden mit kalkulierten Safe-Rate-Fahrten abgleichen). (MOLIT 안전운임 고시)

## Gestrichen / korrigiert (nicht wie von Otto behauptet)

- **20 Mio. KRW Geldstrafe für 52h-Verstoß** → GESTRICHEN. Korrekt: 10 Mio. KRW (§ 110 LSA).
- **Zuschlag-Rechtsgrundlage § 55 für Ruhetagsarbeit** → korrigiert auf § 56 Abs. 2 (§ 55 regelt nur den Anspruch auf den Ruhetag).
- **"Entzug der Ausbildungslizenz" bei Assistenzarzt-Verstoß** → GESTRICHEN, unbelegt. Belegt: 5 Mio. KRW Ordnungsgeld.
- **11h-Ruhe aus dem Güterkraftverkehrsgesetz** → korrigiert: Rechtsgrundlage ist § 59 LSA (Landverkehr als Sonderausnahme-Branche).
- **Safe-Rates als "extrem wichtig für die Roster-Konformität"** → abgeschwächt: reine Vergütungsregel, kein Arbeitszeitlimit; nur mittelbarer Scheduling-Bezug.

---

## Bilanz

- **BESTÄTIGT (11):** 52h-Woche (§§50/53), Kumul-Zuschläge ÜStd+Nacht 200 % (§56), Pausen 30min/1h (§54), PIPA-Biometrie-Sensibilität, RFID-Pflegebesuchsnachweis/NHIS, Ruhetagszuschlag-Werte 50/100 %, Assistenzarzt 36→24h/28h ab 21.2.2026, § 63-Security-Befreiung + fortbestehender Nachtzuschlag, § 50(3)-Wartezeit, 11h-Ruhe-Wert, Safe-Rates Feb-2026-Container/Zement.
- **KORRIGIERT (4):** Sanktion 20→10 Mio. KRW; Ruhetagszuschlag-Zitat § 55→§ 56(2); Assistenzarzt-Sanktion Lizenzentzug→5 Mio. KRW Bußgeld; 11h-Ruhe Güterkraftverkehrsgesetz→§ 59 LSA.
- **GESTRICHEN (2):** "20 Mio. KRW"-Strafhöhe; "Entzug der Ausbildungslizenz".

### Stärkste überlebende USP-Aufhänger
1. **Strafbewehrter 52-Stunden-Hard-Cap (§§ 50/53, bis 2 J. Haft):** Geschäftsführerhaftung macht einen lückenlosen, pro-Mitarbeiter durchgesetzten Schicht-Cap zum härtesten Verkaufsargument in Korea.
2. **PIPA-konforme On-Premise-Biometrie:** Biometrische Zeiterfassung als sensible Daten + strenge Cross-Border-Regeln → lokales Hosting löst die Compliance-Barriere sofort — zentrales IT-Argument.
3. **Assistenzarzt-Dauerschicht 36→24h ab 21.2.2026 (§ + 5 Mio. KRW):** brandaktueller, gesetzlich erzwungener Klinik-Cap — plus § 59-11h-Ruhe im Gesundheitswesen; unmittelbar planungsrelevant.
