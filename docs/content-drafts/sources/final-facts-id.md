# ID — korrigierte, fact-gecheckte Fakten (Indonesien, Stand nach Fact-Check)

> Verifiziert gegen Primärquellen: UU 13/2003 (Ketenagakerjaan) i.d.F. UU Cipta Kerja (UU 11/2020, UU 6/2023) + PP 35/2021, UU 27/2022 (PDP), UU 22/2009 (LLAJ), Permenaker 2/2015, KEP.233/MEN/2003, Perpol 4/2020, UU 17/2023 (Kesehatan). Otto-Brainstorm war überwiegend korrekt bei Zahlen und Gesetzesnamen; korrigiert wurden Zuordnungen von Regelungen zu Rechtsgrundlagen (Security, Spital) und eine unbelegte Wegezeit-Aussage.

## Teil 1: Allgemein (branchenneutral)

- **Wöchentliches Überstundenlimit angehoben (PP 35/2021, Pasal 26):** Geplante Überstunden (*waktu kerja lembur*) dürfen maximal **4 Stunden pro Tag** und **18 Stunden pro Woche** betragen (Überstunden an wöchentlichen Ruhetagen und gesetzlichen Feiertagen zählen nicht in dieses 18-h-Limit). BESTÄTIGT — PP 35/2021 Pasal 26 ayat (1). Der Vorwert unter UU 13/2003 Pasal 78 ayat (1) huruf b lag bei **3 h/Tag und 14 h/Woche** — die Anhebung durch das Omnibus Law (UU Cipta Kerja) ist damit ebenfalls BESTÄTIGT. Voraussetzung für Überstunden: schriftliche Zustimmung des Arbeitnehmers + schriftliche Anordnung des Arbeitgebers mit Überstundenliste. Quellen: PP 35/2021 Volltext (peraturan.bpk.go.id/Download/154582/PP%20Nomor%2035%20Tahun%202021.pdf; peraturan.bpk.go.id/Home/Details/161904), UU 13/2003 Pasal 78 (jdih.kemnaker.go.id, hukumonline.com/klinik/a/batas-dan-regulasi-lembur-perusahaan-cl4293). Software-Relevanz: Der Planer muss das wochenbezogene 18-h-Konto pro Mitarbeiter absichern.

- **Gestuftes Überstunden-Zuschlagssystem (PP 35/2021, Pasal 31):** BESTÄTIGT, exakt wie Gesetzeswortlaut:
  - **Werktag:** erste Überstunde **1,5×** Stundenlohn, jede weitere **2,0×**.
  - **Ruhetag/gesetzlicher Feiertag, 5-Tage-Woche:** Stunden 1–8 = **2,0×**, 9. Stunde = **3,0×**, Stunden 10–12 = **4,0×**.
  - **Ruhetag/gesetzlicher Feiertag, 6-Tage-Woche:** Stunden 1–7 = **2,0×**, 8. Stunde = **3,0×**, ab 9. Stunde = **4,0×**.
  - Basis „Stundenlohn" = **1/173 × Monatslohn** (PP 35/2021 Pasal 32). Quellen: PP 35/2021 Pasal 31–32 (peraturan.bpk.go.id/Home/Details/161904), wageindicator.org/id-id/.../upah-lembur. Software-Relevanz: progressive 1,5×/2,0×/3,0×/4,0×-Formel mit 5-Tage-/6-Tage-Verzweigung ist manuell fehleranfällig — Kernautomatisierungs-Argument.

- **Gesetzliche Mindestpause während der Schicht (UU 13/2003, Pasal 79 ayat 2 huruf a):** Nach **4 aufeinanderfolgenden Arbeitsstunden** ist eine ununterbrochene Pause von **mindestens 30 Minuten** zwingend; diese Pause zählt **nicht** als Arbeitszeit. BESTÄTIGT — durch UU Cipta Kerja nicht geändert, weiterhin gültig. Quellen: UU 13/2003 Volltext (jdih.kemnaker.go.id/asset/data_puu/peraturan_file_13.pdf), hukumonline.com/klinik/a/begini-aturan-jam-istirahat-kerja.

- **Standard-Arbeitszeit 40 h/Woche in zwei Modellen (UU 13/2003 Pasal 77 jo. PP 35/2021):** 40 Stunden/Woche entweder als **7 h/Tag bei 6-Tage-Woche** oder **8 h/Tag bei 5-Tage-Woche**. BESTÄTIGT (die 5-/6-Tage-Verzweigung ist auch aus den zwei Zuschlagstabellen in PP 35/2021 Pasal 31 ableitbar). Software-Relevanz: Wochen-Soll und Feiertags-Zuschlagstabelle hängen am hinterlegten Betriebsmodell.

- **Biometrie unter „spezifischen personenbezogenen Daten" (UU 27/2022 PDP, Pasal 4):** Biometrische Daten (*data biometrik*) sind in Pasal 4 ausdrücklich als **data pribadi spesifik** (spezifische/sensible personenbezogene Daten) gelistet — neben Gesundheits-, genetischen und Finanzdaten. Sie unterliegen strengerem Schutz und besonderen Einwilligungspflichten. BESTÄTIGT — UU 27/2022 Pasal 4. Quellen: UU 27/2022 (peraturan.bpk.go.id/Details/229798), jdih.komdigi.go.id. Hinweis: Das On-Premise-Argument (lokale Speicherung biometrischer Logs vermeidet Auslands-Cloud-Prüfungen) ist zulässiges Marketing-Framing, das an die realen Cross-Border-Transfer-Pflichten des UU PDP anknüpft — es ist aber kein wörtlicher Gesetzesbefehl „nur On-Premise".

## Häusliche Pflege (Perawat lansia / Home Care)

- **Rechtsunterschied gewerbliche Pflegeagentur vs. private Hausangestellte (Permenaker 2/2015 vs. UU 13/2003):** Für private Hausangestellte (*Pekerja Rumah Tangga*, **PRT**) gilt die **Permenaker Nr. 2 Tahun 2015 tentang Perlindungan PRT** als Mindestschutzstandard; Arbeitszeit und Ruhetage werden hier im individuellen Arbeitsvertrag geregelt (Indonesien hat für PRT bewusst kein Vollarbeitsrecht). Gewerblich organisierte Pflegeagenturen (*Caregiver*-Personal) unterliegen dagegen dem **regulären Arbeitsrecht UU 13/2003** (40-h-Woche, Überstundenlimits, Zuschläge). BESTÄTIGT (Existenz und Regelungsgegenstand). Quellen: Permenaker 2/2015 (peraturan.bpk.go.id/Details/145968; jdih.kemnaker.go.id/asset/data_puu/PERMEN_2_TAHUN_2015.PDF). Software-Relevanz: Das System muss Agentur-Personal (volles UU 13/2003) von reinen PRT-Verträgen (Sonderregime Permenaker 2/2015) unterscheiden.

## Spitäler / Krankenhäuser (Rumah Sakit)

- **Kontinuierlicher Betrieb ist von der Feiertags-Arbeitssperre ausgenommen (KEP.233/MEN/2003):** Gesundheitsdienste (*pelayanan kesehatan*) sind in der Ministerverordnung **KEP.233/MEN/2003** ausdrücklich als „durchgehend zu betreibende" Tätigkeit gelistet (Pasal 3), die — mit Zustimmung des Arbeitnehmers und gegen Überstundenlohn — auch an gesetzlichen Feiertagen arbeiten darf. BESTÄTIGT. Quellen: KEP.233/MEN/2003 (bphn.go.id/data/documents/14pm004.pdf; dokumen.tips „Kepmen 233 2003"), hukumonline.com/klinik/a/aturan-dan-jenis-hak-libur-bagi-karyawan. Software-Relevanz: 24/7-Roster ohne Feiertags-Sperre, aber mit korrekter Feiertags-Zuschlagsberechnung (PP 35/2021 Pasal 31).
- **KORREKTUR zur Otto-Zuordnung:** Otto begründet die dokumentierten Erholungsphasen mit dem **Gesundheitsgesetz UU 17/2023**. UU 17/2023 existiert und regelt u. a. Haftung/Schutz von medizinischem Personal, enthält aber **keine spezifische Arbeitszeit-/Ruhezeit-Norm für Spital-Schichten**; die relevanten Arbeitszeitregeln bleiben UU 13/2003 + PP 35/2021 + KEP.233/MEN/2003. Der Bezug „Haftung → Ruhezeiten im Dienstplan dokumentieren" ist Marketing-Framing, kein Arbeitszeit-Gesetzesfakt. Quelle UU 17/2023: peraturan.bpk.go.id/details/258028.

## Security / Bewachungsdienste (Satpam)

- **Satpam als rechtlich definierte Kategorie (Perpol 4/2020 tentang Pengamanan Swakarsa):** Die Polizeiverordnung **Perpol Nr. 4 Tahun 2020** regelt die Eigensicherung (*Pengamanan Swakarsa*, „Pam Swakarsa"), darunter die Sicherheitseinheit **Satpam** (*Satuan Pengamanan*): Bildung, Aufgaben, Rechte/Pflichten, Ränge und Uniformen. BESTÄTIGT (Existenz + Regelungsgegenstand); löste Perkap 24/2007 ab. Quellen: Perpol 4/2020 (peraturan.go.id/id/peraturan-polri-no-4-tahun-2020; jurnalsecurity.com PDF).
- **KORREKTUR zur Otto-Zuordnung:** Die **12-Stunden-Grenze / der 4-h-Tages-Überstundencap ist NICHT in Perpol 4/2020 geregelt**, sondern folgt aus **PP 35/2021 Pasal 26** (8 h Normalzeit + max. 4 h Überstunden/Tag = effektiv 12 h Tagesmaximum). Perpol 4/2020 definiert nur den Satpam als Berufskategorie und enthält keine Arbeitszeit-/Überstunden-Obergrenzen. Korrekt formuliert: Typische 12-h-Schichten (8+4) schöpfen den gesetzlichen Tages-Überstundencap aus PP 35/2021 voll aus; jede ungeplante Verlängerung verletzt PP 35/2021. Software-Relevanz: Harte Sperre von Schichten > 12 h im Roster.

## Haus-/Putzdienste (Petugas kebersihan / Cleaning)

- **5-Tage- vs. 6-Tage-Woche steuert Feiertags-/Sonntagszuschläge (UU 13/2003 Pasal 77 + PP 35/2021 Pasal 31):** Ob ein Objekt im 5-Tage-Modell (8 h/Tag) oder 6-Tage-Modell (7 h/Tag) betrieben wird, bestimmt die Feiertags-/Ruhetags-Zuschlagstabelle: 5-Tage-Woche → erste **8 Stunden zu 2,0×**; 6-Tage-Woche → erste **7 Stunden zu 2,0×** (danach 3,0× und 4,0×, siehe Teil 1). BESTÄTIGT. **KORREKTUR gegenüber Otto:** Otto schrieb „2,0× für die ersten 5 oder 8 Stunden" — die Zahl **5 ist falsch**; im 6-Tage-Modell sind es die ersten **7** Stunden. Quellen: PP 35/2021 Pasal 31; UU 13/2003 Pasal 77. Software-Relevanz: Betriebsmodell pro Objekt hinterlegen, damit die richtige Zuschlagstabelle greift.

## Logistik / Güterverkehr (Pengemudi kendaraan bermotor umum)

- **Lenkzeit- und Pausenpflicht für Berufsfahrer (UU 22/2009 LLAJ, Pasal 90):** Die Arbeits-/Lenkzeit für Fahrer öffentlicher Kraftfahrzeuge beträgt **maximal 8 Stunden pro Tag**; nach **4 Stunden ununterbrochener Fahrt** ist eine **Ruhepause von mindestens 30 Minuten** zwingend. Unter bestimmten Umständen bis **max. 12 Stunden/Tag inkl. 1 Stunde Ruhezeit**. BESTÄTIGT — UU 22/2009 Pasal 90. Sanktionen bei Verstoß sind verwaltungsrechtlich (UU 22/2009 Pasal 92 — **Präzisierung gegenüber Otto**, der „Pasal 90" auch für die Strafe nennt). Quellen: UU 22/2009 (jdihn.go.id/files/4/2009uu022.pdf), hukumonline.com/klinik/a/waktu-istirahat-pengemudi-kendaraan-bermotor-umum. Software-Relevanz: Tourenplan muss 30-Minuten-Pause nach 4 h und 8-h-Tageslenkzeit erzwingen.

## Gestrichen (nicht verifizierbar)

- **Wegezeit zwischen Patienten = voll vergütungspflichtige Arbeitszeit (Home Care):** Otto behauptet, Fahrtzeiten einer Pflegekraft zwischen zwei Klientenwohnungen gälten in Indonesien rechtlich als voll zu vergütende Arbeitszeit. Dafür ist **keine spezifische indonesische Primärquelle** auffindbar (weder UU 13/2003 noch PP 35/2021 definieren Wegezeit zwischen Einsatzorten ausdrücklich als Arbeitszeit). GESTRICHEN als Rechtsaussage — höchstens als allgemeines Planungsargument („Wegezeiten sollten eingeplant werden") verwendbar, nicht als indonesischer Gesetzesfakt.
- **UU 17/2023 als Grundlage für Spital-Schicht-Ruhezeiten:** siehe Korrektur unter „Spitäler" — als Arbeitszeit-Rechtsgrundlage gestrichen, nur als Haftungs-/Qualitäts-Framing tragbar.

---

## Zusammenfassung Verdikte

- **BESTÄTIGT (voll):** 8 Kernfakten — PP 35/2021 Pasal 26 (4 h/18 h, Vorwert 3 h/14 h), PP 35/2021 Pasal 31/32 (Zuschlagstufen + 1/173), UU 13/2003 Pasal 79 (30-min-Pause nach 4 h), UU 13/2003 Pasal 77 (40 h, 5-/6-Tage), UU 27/2022 Pasal 4 (Biometrie = spezifische Daten), Permenaker 2/2015 (PRT-Sonderregime), KEP.233/MEN/2003 (Gesundheit = Dauerbetrieb), Perpol 4/2020 (Satpam-Definition), UU 22/2009 Pasal 90 (8 h + 30 min nach 4 h).
- **KORRIGIERT (Zuordnung/Detail, Kernzahl bleibt):** 3 — Security-12-h-Cap gehört zu PP 35/2021 (nicht Perpol 4/2020); Spital-Ruhezeit gehört zu UU 13/2003 + KEP.233/MEN/2003 (nicht UU 17/2023); Cleaning-Feiertagszuschlag „erste 5 Stunden" → korrekt „erste 7 Stunden" (6-Tage) bzw. 8 (5-Tage); Logistik-Sanktion Pasal 92 statt 90.
- **GESTRICHEN:** 1 harte Rechtsaussage (Wegezeit = vergütungspflichtige Arbeitszeit) + UU-17/2023-Rechtsgrundlagen-Behauptung.

## Stärkste überlebende USP-Aufhänger

1. **Progressives Überstunden-Zuschlagssystem (PP 35/2021 Pasal 31):** 1,5× / 2,0× / 3,0× / 4,0× mit getrennten 5-Tage- und 6-Tage-Tabellen und Basis 1/173 — eines der komplexesten OT-Systeme der Region, manuell hoch fehleranfällig, ideales Automatisierungs-Argument.
2. **Wochen-Überstundencap 18 h + Tagescap 4 h (PP 35/2021 Pasal 26):** Harte, wochenbezogene Compliance-Grenze pro Mitarbeiter — direkt in Roster-Sperren umsetzbar (Security: 12-h-Schicht schöpft Tagescap voll aus).
3. **Biometrie-On-Premise unter UU PDP (UU 27/2022 Pasal 4):** Fingerabdruck-/Gesichts-Zeiterfassung ist „spezifisches personenbezogenes Datum" — lokale On-Premise-Speicherung als Datenschutz-Verkaufsargument.
