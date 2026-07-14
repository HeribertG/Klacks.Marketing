# SA — Otto Roh-Brainstorm Block B/C (unverifiziert)

> ACHTUNG: Dies ist eine ROHE, UNVERIFIZIERTE Brainstorm-Antwort von Otto (OpenClaw-Agent).
> ALLE Gesetzesnamen, Paragraphen, Jahreszahlen, Nummern und Schwellenwerte muessen noch
> in einer nachgelagerten Stufe verifiziert werden. Nichts hiervon ist bestaetigt.

---

Hier ist das strukturierte Brainstorming für eine On-Premise-Personaleinsatzplanungs-Software (Klacks) auf dem Markt des Königreichs Saudi-Arabien (KSA), untermauert mit präzisen rechtlichen Bezeichnungen, Originalbegriffen und transparenten Sicherheitsbewertungen.

---

### (A) Branchenneutrale Aufhänger (Saudi-Arbeitsrecht)

#### 1. Reduzierte Ramadan-Arbeitszeit für muslimische Mitarbeiter
*   **Original-Gesetzesname:** Saudi-arabisches Arbeitsgesetz (*Saudi Labor Law* / نظام العمل السعودي), erlassen mit dem Königlichen Dekret Nr. M/51 (Art. 98).
*   **Fachbegriff:** Fastenmonat Ramadan (شهر رمضان - *Shahr Ramadan*).
*   **Wert/Schwellenwert:** Während des Ramadan verkürzt sich die gesetzliche Höchstarbeitszeit für muslimische Arbeitnehmer zwingend von 8 Stunden täglich (48 Stunden pro Woche) auf **6 Stunden täglich** (36 Stunden pro Woche) bei vollem Lohnausgleich. Ein Dienstplaner muss die Schichtdauer für diese Mitarbeitergruppe im Roster automatisch anpassen können.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Gesetzlicher Kernstandard)**.

#### 2. Gesetzliche Obergrenze für den Verbleib am Arbeitsplatz
*   **Original-Gesetzesname:** *Saudi Labor Law* (Art. 101).
*   **Fachbegriff:** Aufenthalt am Arbeitsplatz (التواجد في مكان العمل - *Al-Tawajud fi Makan Al-Amal*).
*   **Wert/Schwellenwert:** Kein Arbeitnehmer darf sich an einem Arbeitstag für insgesamt mehr als **12 Stunden** am Arbeitsplatz aufhalten (einschließlich reiner Arbeitszeit, Pausen, Überstunden und Gebetszeiten). Das System muss Planer proaktiv blockieren, wenn die Zeitspanne zwischen Schichtbeginn und Schichtende (inkl. Pausen) 12 Stunden überschreitet.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Gesetzlich verankert)**.

#### 3. Verpflichtender Lohn- und Stundenabgleich über die Qiwa-Plattform (WPS)
*   **Original-Gesetzesname:** Bestimmungen zum Lohnschutzsystem (*Wage Protection System - WPS*) des Ministeriums für Humanressourcen und soziale Entwicklung (MHRSD).
*   **Fachbegriff:** Lohnschutzsystem (نظام حماية الأجور - *Nizam Himayat Al-Ujur*) über das Qiwa-Portal (*منصة قوى*).
*   **Wert/Schwellenwert:** Alle Privatunternehmen müssen Arbeitsstunden, Grundgehälter und Überstundenkonten monatlich über die offizielle Qiwa-Plattform einreichen. Unstimmigkeiten zwischen den gestempelten Stunden und den ausgezahlten Summen führen zur automatischen Herabstufung des behördlichen Status und zur Sperrung von Visa-Diensten. Eine PEP-Software muss Qiwa-konforme Berichte exportieren, um Lohnstrafen zu verhindern.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Hochrelevantes Compliance-Thema)**.

#### 4. SDAIA-Datenschutzauflagen (Biometrie) via On-Premise-Hosting
*   **Original-Gesetzesname:** Saudi-arabisches Gesetz zum Schutz personenbezogener Daten (*Personal Data Protection Law - PDPL*), erlassen durch das Königliche Dekret Nr. M/147, reguliert durch die *Saudi Authority for Data and Artificial Intelligence (SDAIA)*.
*   **Fachbegriff:** Sensible personenbezogene Daten (البيانات الشخصية الحساسة - *Al-Bayanat Al-Shakhsiyyah Al-Hassasah*).
*   **Wert/Schwellenwert:** Biometrische Daten (wie Fingerabdrücke oder Gesichtsscans zur Zeiterfassung) gelten als hochgradig sensibel. Die Speicherung oder Verarbeitung dieser Daten außerhalb des Königreichs (z. B. in ausländischen Clouds) ist ohne extrem schwer zu erhaltende SDAIA-Ausnahmegenehmigungen untersagt. Ein On-Premise-Setup von Klacks gewährleistet, dass alle sensiblen Stempeldaten sicher auf lokalen, physischen Servern in KSA gehostet bleiben.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Entscheidendes Verkaufsargument)**.

---

### (B) Branchenspezifische Aufhänger

#### 1. Ambulante/häusliche Pflege (*Home Care*)
*   **Aufhänger A: Einhaltung der gesetzlichen täglichen Mindestruhezeit**
    *   **Gesetz/Regelung:** *Saudi Labor Law* Art. 101.
    *   **Fachbegriff:** Tägliche Erholungszeit (الراحة اليومية - *Al-Rahah Al-Yawmiyyah*).
    *   **Wert/Schwellenwert:** Da das Gesetz vorschreibt, dass die tägliche Präsenz am Arbeitsplatz maximal 12 Stunden betragen darf (Art. 101), verbleibt eine gesetzliche Ruhezeit von mindestens **12 zusammenhängenden Stunden** pro Tag. Dies betrifft Home-Care-Unternehmen, die 24-Stunden-Pfleger einteilen; eine geteilte Schichtfolge oder Back-to-Back-Schichten ohne diese 12-Stunden-Lücke sind unzulässig.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Logische Konsequenz aus Art. 101)**.
*   **Aufhänger B: Erhöhtes Überstundenlimit in medizinischen Notfällen**
    *   **Gesetz/Regelung:** *Saudi Labor Law* Art. 106.
    *   **Fachbegriff:** Unvermeidbare Notfälle (حالات القوة القاهرة - *Halat Al-Quwwah Al-Qahirah*).
    *   **Wert/Schwellenwert:** In außergewöhnlichen medizinischen Notfällen zur Gewährleistung der Erstversorgung darf das tägliche Überstundenlimit überschritten werden; die reine tägliche Arbeitszeit darf jedoch **11 Stunden** (Art. 101) am Tag nicht überschreiten.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Gesetzliche Ausnahmeregelung)**.

#### 2. Spitäler/Krankenhäuser (*Hospitals*)
*   **Aufhänger A: Ausnahmeregelung für ununterbrochenen Schichtbetrieb (Ärzte und Krankenschwestern)**
    *   **Gesetz/Regelung:** *Saudi Labor Law* Art. 106 (Abweichungen für ununterbrochene Arbeiten).
    *   **Fachbegriff:** Ununterbrochener Schichtdienst (العمل بنظام المناوبات المستمرة - *Al-Amal bi-Nizam Al-Munawabat Al-Mustamirrah*).
    *   **Wert/Schwellenwert:** In kontinuierlich operierenden Kliniken können wöchentliche Ruhetage und Höchstarbeitszeiten flexibel verteilt werden, sofern der wöchentliche Durchschnitt der Arbeitszeit im Referenzzeitraum (meist 3 Wochen) die gesetzliche Arbeitszeitgrenze nicht übersteigt und die Überstunden gemäss Art. 107 mit einem Aufschlag von **50 %** (Gesamtvergütung 150 %) voll vergütet werden.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.
*   **Aufhänger B: Frequenzbegrenzung von Bereitschaftsdiensten**
    *   **Gesetz/Regelung:** Richtlinien des saudi-arabischen Gesundheitsministeriums (*MOH - Ministry of Health*).
    *   **Fachbegriff:** Bereitschaftsdienst / Bereitschaft ( المناوبة - *Al-Munawabah* / *On-Call*).
    *   **Wert/Schwellenwert:** Stationsärzte dürfen im Dienstplan in der Regel nicht zu mehr als **einem 24-Stunden-Bereitschaftsdienst pro Woche** eingeteilt werden, wobei nach Beendigung dieses Dienstes eine ununterbrochene Freiphase von mindestens 24 Stunden im Roster zwingend blockiert werden muss.
    *   **Sicherheitsbewertung:** **Unsicher / bitte prüfen (Die exakten MOH-Richtlinien zu Bereitschaftsfrequenzen hängen stark vom Anstellungsvertrag (MOU/MOH-Direktkontrakt) sowie dem spezifischen Krankenhausstatut ab. Sie variieren zudem stark zwischen öffentlichen MOH-Hospitals und privaten Kliniken)**.

#### 3. Sicherheits-/Bewachungsdienste (*Private Security*)
*   **Aufhänger A: Abbildung von 12-Stunden-Schichten und Höchstpräsenzzeit**
    *   **Gesetz/Regelung:** *Saudi Labor Law* Art. 101 in Verbindung mit den MHRSD-Richtlinien für private Sicherheitsdienste.
    *   **Fachbegriff:** Sicherheitsbeamte (حراس الأمن المدنيين - *Huras Al-Amn Al-Madaniyin*).
    *   **Wert/Schwellenwert:** Da Sicherheitsdienste typischerweise in 12-Stunden-Schichten operieren (8 Stunden regulär + 4 Stunden Überstunden), reizt dies die gesetzliche Höchstgrenze für den Verbleib am Arbeitsplatz von **12 Stunden pro Tag** (Art. 101) voll aus. Das System darf unter keinen Umständen zulassen, dass Wachleute auch nur eine Minute länger eingeteilt werden (z. B. durch verspätete Ablösungen), da dies sofortige WPS- und Inspektionsstrafen nach sich zieht.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Kritischer Punkt bei MHRSD-Prüfungen)**.
*   **Aufhänger B: Zuschlag für Feiertags- und Ruhetagsarbeit**
    *   **Gesetz/Regelung:** *Saudi Labor Law* Art. 107.
    *   **Fachbegriff:** Wöchentlicher Ruhetag (يوم الراحة الأسبوعية - *Yawm Al-Rahah Al-Usbu'iyyah*).
    *   **Wert/Schwellenwert:** Wird ein Sicherheitsmitarbeiter an seinem wöchentlichen Ruhetag (standardmäßig Freitag, es sei denn, ein anderer Tag wurde beim Arbeitsamt angemeldet) eingeteilt, muss jede gearbeitete Stunde zwingend als Überstunde mit einem Aufschlag von **50 %** des Basisstundenlohns (Gesamtauszahlung 150 %) oder durch bezahlte Ersatztage vergütet werden.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 4. Reinigungs-/Gebäudedienste (*Facility Management / Cleaning*)
*   **Aufhänger A: Harter Hitzeschutz durch das Sommer-Mittagsarbeitsverbot**
    *   **Gesetz/Regelung:** Jährliche bindende Verordnung des *Ministry of Human Resources and Social Development (MHRSD)*.
    *   **Fachbegriff:** Verbot von Arbeiten unter direkter Sonneneinstrahlung (حظر العمل تحت أشعة الشمس - *Hazr Al-Amal Tahta Ashi'at Al-Shams*).
    *   **Wert/Schwellenwert:** Vom **15. Juni bis zum 15. September** jeden Jahres ist jegliche Arbeit unter direkter Sonneneinstrahlung (z. B. Außenreinigung von Glasfassaden) zwischen **12:00 Uhr und 15:00 Uhr** streng verboten. Verstöße werden rigide geahndet. Die Dienstplan-Software muss in diesem Zeitraum automatisch Split-Shifts (Vormittag und Spätnachmittag) erzwingen.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / FM-Compliance-Kriterium im KSA-Sommer)**.
*   **Aufhänger B: Überwachung von Mindestgehältern im Rahmen der Saudisierung (Nitaqat)**
    *   **Gesetz/Regelung:** MHRSD Saudisierungsprogramm (*Nitaqat* / *Qiwa* Bestimmungen).
    *   **Fachbegriff:** Mindestgehalt für Saudis (الحد الأدنى لرواتب السعوديين - *Al-Hadd Al-Adna li-Rawatib Al-Saudiyyin*).
    *   **Wert/Schwellenwert:** Um im Nitaqat-Ranking als vollwertige saudische Arbeitskraft gezählt zu werden (wichtig bei FM-Unternehmen zur Erreichung der gesetzlichen Quoten), muss dem saudischen Arbeitnehmer ein Mindestlohn von **SAR 4.000** gezahlt werden. Bei geringerem Lohn zählt er nur zu 50 % oder gar nicht. Schedulers müssen im Personalstamm darauf hingewiesen werden.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Genereller Eckpfeiler der KSA-Personalplanung)**.

#### 5. Logistik/Güterverkehr (*Logistics / Transport*)
*   **Aufhänger A: Maximale tägliche Lenkzeit-Überwachung**
    *   **Gesetz/Regelung:** Vorschriften der Transport General Authority (TGA / *الهيئة العامة للنقل*) zur Vermeidung von Übermüdung.
    *   **Fachbegriff:** Lenkzeiten / Fahrtstunden (ساعات القيادة - *Sa'at Al-Qiyadah*).
    *   **Wert/Schwellenwert:** Die reine Lenkzeit eines Fahrers darf maximal **9 Stunden** pro Tag bzw. **56  Stunden** pro Woche betragen. Die Software muss diese Grenzwerte in den Transportroster einpflegen und Warnungen ausgeben, bevor gesetzliche Überschreitungen drohen.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.
*   **Aufhänger B: Sommer-Mittagsarbeitsverbot für Terminal- und Be- und Entladepersonal**
    *   **Gesetz/Regelung:** MHRSD *Hazr Al-Amal Tahta Ashi'at Al-Shams*.
    *   **Fachbegriff:** Arbeit im Freien (العمل في الأماكن المفتوحة - *Al-Amal fi Al-Amakin Al-Maftuhah*).
    *   **Wert/Schwellenwert:** Das Be- und Entladen an unüberdachten Ladezonen oder Rampen unterliegt im Zeitraum vom 15. Juni bis 15. September (12:00 bis 15:00 Uhr) ebenfalls dem Verbot für Außenarbeiten. Planer müssen die Verladezeiten an Terminals entsprechend takten, um Bußgelder zu vermeiden.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.
