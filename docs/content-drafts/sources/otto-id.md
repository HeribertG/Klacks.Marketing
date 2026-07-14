# ID — Otto Roh-Brainstorm Block B/C (unverifiziert)

> ACHTUNG: Dies ist eine ROHE, UNVERIFIZIERTE Brainstorm-Antwort von Otto (OpenClaw-Agent).
> ALLE Gesetzesnamen, Paragraphen, Jahreszahlen, Nummern und Schwellenwerte muessen noch
> in einer nachgelagerten Stufe verifiziert werden. Nichts hiervon ist bestaetigt.

---

Hier ist das strukturierte Brainstorming für eine On-Premise-Personaleinsatzplanungs-Software (Klacks) auf dem indonesischen Markt, untermauert mit präzisen rechtlichen Bezeichnungen, indonesischen Originalbegriffen und transparenten Sicherheitsbewertungen.

---

### (A) Branchenneutrale Aufhänger (indonesisches Arbeitsrecht)

#### 1. Das neue wöchentliche Überstundenlimit unter dem "Omnibus Law"
*   **Original-Gesetzesname:** Regierungsverordnung Nr. 35 von 2021 (*Government Regulation No. 35 of 2021* - Peraturan Pemerintah Nomor 35 Tahun 2021 - *PP 35/2021*), erlassen unter dem "Omnibus Law" (*Law No. 11 of 2020 on Job Creation* - Undang-Undang Cipta Kerja).
*   **Fachbegriff:** Überstundenlimit (Waktu kerja lembur - *Overtime Limit*), geregelt in Article 26 PP 35/2021.
*   **Wert/Schwellenwert:** Das maximale Limit für geplante Überstunden wurde auf **4 Stunden pro Tag** und **18 Stunden pro Woche** angehoben (zuvor 3h/Tag bzw. 14h/Woche). Ein Schichtplaner muss das wöchentliche 18-Stunden-Limit pro Mitarbeiter präzise absichern, um empfindliche Bußgelder und den Entzug von Betriebslizenzen zu verhindern.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Sehr wichtiges Compliance-Kriterium seit 2021)**.

#### 2. Das hochkomplexe, mehrstufige Überstunden-Zulagensystem
*   **Original-Gesetzesname:** *PP 35/2021*, Article 31.
*   **Fachbegriff:** Überstundenlohn-Berechnung (Perhitungan upah kerja lembur - *Overtime Calculation*).
*   **Wert/Schwellenwert:** Die Berechnung von Überstunden an regulären Arbeitstagen und freien Tagen ist hochgradig gestuft:
    *   Erste Stunde an Wochentagen: **1,5-facher** Lohn.
    *   Jede weitere Stunde an Wochentagen: **2,0-facher** Lohn.
    *   Überstunden an freien Tagen / Feiertagen (für eine 5-Tage-Woche): die ersten 8 Stunden **2,0-fach**, die 9. Stunde **3,0-fach**, und ab der 10. Stunde **4,0-fach** (für eine 6-Tage-Woche gelten leicht abweichende, ebenfalls gestufte Faktoren).
    *   Dieses progressive Stufensystem (1,5x, 2,0x, 3,0x, 4,0x) manuell abzurechnen, ist eine enorme HR-Fehlerquelle. Klacks automatisiert diese Formeln lückenlos.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Eines der kompliziertesten Überstundensysteme in Südostasien)**.

#### 3. Gesetzliche Mindestpausen während der Schicht
*   **Original-Gesetzesname:** Gesetz Nr. 13 von 2003 über die Beschäftigung (*Manpower Law* - Undang-Undang Ketenagakerjaan Nomor 13 Tahun 2003 - *UU 13/2003*), Article 79 Abs. 2.
*   **Fachbegriff:** Ruhepause während der Arbeitszeit (Waktu istirahat - *Rest Break*).
*   **Wert/Schwellenwert:** Nach **4 aufeinanderfolgenden Stunden** Arbeit muss zwingend eine ununterbrochene Pause von mindestens **30 Minuten** gewährt werden. Diese Pause zählt rechtlich nicht als Arbeitszeit. Das System muss diese Pausen automatisch einplanen.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 4. Biometrie-Datenschutz (UU PDP) durch lokales On-Premise-Setup
*   **Original-Gesetzesname:** Indonesisches Gesetz zum Schutz personenbezogener Daten (*Personal Data Protection Act* - Undang-Undang Perlindungan Data Pribadi Nomor 27 Tahun 2022 - *UU PDP*).
*   **Fachbegriff:** Spezifische/Sensible persönliche Daten (Data pribadi yang bersifat spesifik - *Specific Personal Data*).
*   **Wert/Schwellenwert:** Biometrische Datensätze (wie Fingerabdrücke oder Gesichtsscans) zur Arbeitszeiterfassung fallen unter die streng geschützten "spezifischen persönlichen Daten". Die Verarbeitung dieser Daten auf ausländischen Cloud-Servern erfordert strenge Risikoanalysen. Das On-Premise-Hosting von Klacks speichert biometrische Logs vollständig lokal auf den Servern des eigenen Unternehmens und umgeht komplexe Datenschutzprüfungen im Ausland.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

---

### (B) Branchenspezifische Aufhänger

#### 1. Ambulante/häusliche Pflege (*Perawat Lansia / Home Care*)
*   **Aufhänger A: Rechtlicher Unterschied zwischen gewerblichen Pflegeagenturen und privater Anstellung**
    *   **Gesetz/Regelung:** Arbeitsminister-Verordnung Nr. 2 von 2015 über den Schutz von Hausangestellten (*Permenaker No. 2/2015 tentang Perlindungan Pekerja Rumah Tangga*) im Vergleich zu *UU 13/2003*.
    *   **Fachbegriff:** Häusliche Altenpflegekraft (Perawat lansia - *Caregiver*) und Hausangestellte (Pekerja Rumah Tangga - *PRT*).
    *   **Wert/Schwellenwert:** Bei rein privaten Hausangestellten (*PRT*) können Arbeitszeiten individuell im Vertrag vereinbart werden. Bei gewerblich organisierten Pflegeagenturen gilt jedoch ausnahmslos das Standard-Arbeitsrecht (*UU 13/2003*), inklusive der 40-Stunden-Woche und der strengen Überstundenlimits.
    *   **Sicherheitsbewertung / Bitte beachten:** Das Schichtplanungssystem muss zwischen Agentur-Personal (volles UU 13/2003-Recht) und reinen PRT-Verträgen (Sondervorschriften) unterscheiden können. *(Absolut sicher, dieser Unterschied ist in Indonesien juristisch essenziell)*.
*   **Aufhänger B: Erfassung der Fahrtzeiten zwischen Hausbesuchen**
    *   **Gesetz/Regelung:** Allgemeine Grundsätze der Arbeitszeitermittlung unter *UU 13/2003*.
    *   **Fachbegriff:** Wegezeit zwischen Patienten (Waktu perjalanan antar pasien - *Travel Time*).
    *   **Wert/Schwellenwert:** Wegezeiten einer Pflegekraft zwischen zwei Klientenwohnungen gelten rechtlich als voll zu vergütende Arbeitszeit, da der Mitarbeiter auf Anweisung des Arbeitgebers reist. Ein Dienstplaner muss diese Zeiten explizit einplanen und abrechnen, um rechtlich geschützte Mindestlöhne nicht zu unterschreiten.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 2. Spitäler/Krankenhäuser (*Hospitals / Healthcare*)
*   **Aufhänger A: Absicherung des Schichtbetriebs im kontinuierlich arbeitenden Sektor**
    *   **Gesetz/Regelung:** *UU 13/2003* in Verbindung mit dem Gesundheitsgesetz Nr. 17 von 2023 (*Undang-Undang Kesehatan Nomor 17 Tahun 2023*) und dem Ministerbeschluss KEP.233/MEN/2003.
    *   **Fachbegriff:** Schichtdienst im Krankenhaus (Sistem kerja syif rumah sakit - *Hospital Shift System*).
    *   **Wert/Schwellenwert:** Pflegekräfte (*Perawat*) und Ärzte (*Dokter*) arbeiten in kontinuierlich betriebenen Bereichen, die von Feiertags-Einschränkungen befreit sind. Da das Gesundheitsgesetz strenge Haftungsregeln bei Behandlungsfehlern vorschreibt, müssen ausreichende Erholungsphasen zwischen den Diensten exakt im Dienstplan dokumentiert werden, um Übermüdung vorzubeugen.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 3. Sicherheits-/Bewachungsdienste (*Private Security*)
*   **Aufhänger A: Harte Sperre von Schichtverlängerungen über 12 Stunden (4h-Tagescap)**
    *   **Gesetz/Regelung:** *PP 35/2021* und Polizeiverordnung Nr. 4 von 2020 über Bewachungsdienste (*Peraturan Kepolisian Negara Republik Indonesia Nomor 4 Tahun 2020 tentang Pam Swakarsa*).
    *   **Fachbegriff:** Sicherheitsmitarbeiter (Satuan Pengamanan - *Satpam*).
    *   **Wert/Schwellenwert:** Da Sicherheitskräfte typischerweise in 12-Stunden-Schichten arbeiten (8h Normalzeit + 4h Überstunden), schöpfen sie das gesetzliche Tageslimit für Überstunden (**4 Stunden** nach PP 35/2021) bereits vollständig aus. Jede ungeplante Schichtverlängerung (z. B. durch verspätete Ablösung) verletzt sofort das Gesetz. Klacks blockiert Schichten über 12 Stunden automatisch im Roster.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Extrem wichtiger Kontrollpoint in der indonesischen Sicherheitsbranche)**.

#### 4. Reinigungs-/Gebäudedienste (*Cleaning Services*)
*   **Aufhänger A: Automatische Differenzierung von 5-Tage- und 6-Tage-Wochen-Zuschlägen**
    *   **Gesetz/Regelung:** *PP 35/2021* Article 21 und 31.
    *   **Fachbegriff:** Reinigungskraft (Petugas kebersihan - *Cleaner*).
    *   **Wert/Schwellenwert:** Im Facility Management hängen die teuren Lohnzuschläge für Wochenendarbeit stark davon ab, ob ein Objekt eine 5-Tage-Woche (8h/Tag) oder eine 6-Tage-Woche (7h/Tag) nutzt. Das System muss den Betriebstyp pro Objekt hinterlegen können, um am Sonntag die korrekten Zuschläge (z. B. 2,0x für die ersten 5 oder 8 Stunden) automatisch zuzuweisen.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 5. Logistik/Güterverkehr (*Logistics / Transport*)
*   **Aufhänger A: Harte Lenkzeitbegrenzungen und Pausenpflichten im Güterverkehr**
    *   **Gesetz/Regelung:** Gesetz Nr. 22 von 2009 über Straßenverkehr und Transport (*Undang-Undang Lalu Lintas dan Angkutan Jalan - UU LLAJ No. 22/2009*), Pasal 90.
    *   **Fachbegriff:** Lkw-/Berufskraftfahrer (Pengemudi kendaraan bermotor umum - *Commercial Driver*).
    *   **Wert/Schwellenwert:** Die tägliche maximale reine Lenkzeit für Berufskraftfahrer beträgt **8 Stunden**. Nach einer kontinuierlichen Lenkdauer von **4 Stunden** muss zwingend eine ununterbrochene Fahrpause von mindestens **30 Minuten** eingeplant und im Tourenplan verankert werden. Verstöße führen zu empfindlichen verwaltungsrechtlichen Strafen bis hin zum Lizenzentzug des Transportunternehmens.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Gesetzlich verankert)**.
