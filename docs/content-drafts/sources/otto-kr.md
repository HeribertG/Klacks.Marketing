# KR — Otto Roh-Brainstorm Block B/C (unverifiziert)

> ACHTUNG: Dies ist eine ROHE, UNVERIFIZIERTE Brainstorm-Antwort von Otto (OpenClaw-Agent).
> ALLE Gesetzesnamen, Paragraphen, Jahreszahlen, Nummern und Schwellenwerte muessen noch
> in einer nachgelagerten Stufe verifiziert werden. Nichts hiervon ist bestaetigt.

---

Hier ist das strukturierte Brainstorming für eine On-Premise-Personaleinsatzplanungs-Software (Klacks) auf dem südkoreanischen Markt, untermauert mit präzisen rechtlichen Bezeichnungen, koreanischen Originalbegriffen und transparenten Sicherheitsbewertungen.

---

### (A) Branchenneutrale Aufhänger (koreanisches Arbeitsrecht)

#### 1. Das unumstößliche "52-Stunden-Wochenlimit" mit strafrechtlichem Haftungsrisiko
*   **Original-Gesetzesname:** Südkoreanisches Gesetz über Mindestarbeitsbedingungen (*Labor Standards Act* - 근로기준법 - *Geunlo Gijun-beob*), Artikel 53 Abs. 1.
*   **Fachbegriff:** 52-Stunden-Arbeitswoche (주 52시간 근무제 - *Ju Osip-i-sigan Geunmu-je*).
*   **Wert/Schwellenwert:** Die maximale wöchentliche Arbeitszeit beträgt streng limitiert **52 Stunden** (40 Stunden regulär + maximal **12 Stunden Überstunden**). Verstöße gegen dieses Limit können für Geschäftsführer zu strafrechtlichen Konsequenzen (bis zu 2 Jahre Gefängnis oder 20 Mio. KRW Geldstrafe) führen. Ein Dienstplaner muss bei der Schichteinteilung so programmiert sein, dass er harte Sperren einbaut, um die 52-Stunden-Schwelle pro Mitarbeiter lückenlos abzusichern.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Größter GTM-Treiber für Schichtplanungssoftware in Südkorea)**.

#### 2. Kumulativer Zuschlagssprung bei Nacht- und Überstunden
*   **Original-Gesetzesname:** *Geunlo Gijun-beob* Artikel 56.
*   **Fachbegriff:** Überstundenvergütung (연장근로수당 - *Yeonjang Geunlo Sudang*) und Nachtarbeitsvergütung (야간근로수당 - *Yagan Geunlo Sudang*).
*   **Wert/Schwellenwert:** Überstunden sowie Nachtarbeit (Arbeit zwischen 22:00 und 06:00 Uhr) erfordern jeweils einen Zuschlag von mindestens **50 %** auf den Basislohn. Treffen beide Fälle zusammen (z. B. Überstunden in der Nacht), sind die Zuschläge kumulativ zu berechnen, was zu einer Gesamtvergütung von **200 %** führt (100 % Basis + 50 % Überstundenzuschlag + 50 % Nachtzuschlag). Das System muss diese Überlappungen fehlerfrei berechnen.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Gesetzlicher Standard)**.

#### 3. Gesetzliche Mindestpausenzeiten während der Schicht
*   **Original-Gesetzesname:** *Geunlo Gijun-beob* Artikel 54.
*   **Fachbegriff:** Pausenzeit (휴ге시간 - *Hyuge Sigan*).
*   **Wert/Schwellenwert:** Arbeitnehmern muss während der Arbeitszeit bei einer Arbeitsdauer von mehr als 4 Stunden eine Pause von mindestens **30 Minuten**, und bei mehr als 8 Stunden eine Pause von mindestens **1 Stunde** gewährt werden. Pausenzeiten müssen während der Schicht liegen, nicht am Anfang oder Ende.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Gesetzlich verankert)**.

#### 4. PIPA-konforme lokale Biometrie-Zeiterfassung via On-Premise-Hosting
*   **Original-Gesetzesname:** Südkoreanisches Datenschutzgesetz (*Personal Information Protection Act* - PIPA - 개인정보 보호법).
*   **Fachbegriff:** Sensible persönliche Informationen (민감정보 - *Mingam Jeongbo*).
*   **Wert/Schwellenwert:** Biometrische Daten (wie Fingerabdrücke oder Gesichtsscans) zur Zeiterfassung gelten als hochsensible Daten. Die Übermittlung dieser Daten auf Server außerhalb Südkoreas unterliegt extrem restriktiven gesetzlichen Hürden und erfordert gesonderte Genehmigungen der Aufsichtsbehörde (PIPC). On-Premise-Hosting (Klacks) speichert biometrische Signaturen vollständig lokal auf Servern im eigenen Unternehmen und löst diese Compliance-Barriere sofort.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Zentrales IT-Argument)**.

---

### (B) Branchenspezifische Aufhänger

#### 1. Ambulante/häusliche Pflege (*Yoyang Bohosa / Home Care*)
*   **Aufhänger A: Abstimmung mit der nationalen RFID-Zeiterfassung**
    *   **Gesetz/Regelung:** Alten-Langzeitpflegeversicherungsgesetz (*Long-Term Care Insurance Act* - 노인장기요양보험법 - *Noin Janggi Yoyang Boheom-beob*).
    *   **Fachbegriff:** Elektronische RFID-Visitenkarte (RFID 태그 - *RFID Tae-geu*).
    *   **Wert/Schwellenwert:** Häusliche Pflegekräfte (*Yoyang Bohosa*) müssen ihre Besuche vor Ort beim Patienten per RFID-Tag über ein staatliches System (NHIS) verifizieren. Das Dienstplan- und Zeiterfassungssystem von Klacks muss diese Ist-Stempeldaten mit den geplanten Diensten abgleichen, da nur exakt registrierte Zeiten von der staatlichen Kasse rückvergütet werden.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Marktstandard in Korea)**.
*   **Aufhänger B: Zuschlagspflichtige Wochenruhetagsarbeit**
    *   **Gesetz/Regelung:** *Geunlo Gijun-beob* Artikel 55.
    *   **Fachbegriff:** Wöchentlicher bezahlter Ruhetag (주휴일 - *Juhyuil*).
    *   **Wert/Schwellenwert:** Wird eine häusliche Pflegekraft am wöchentlichen bezahlten Ruhetag eingesetzt (meist Sonntag, kann im Vertrag abweichen), steht ihr für Schichten bis zu 8 Stunden ein gesetzlicher Zuschlag von **50 %** zu. Übersteigt die Schicht an diesem Tag 8 Stunden, greift ab der 9. Stunde ein Zuschlag von **100 %**.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 2. Spitäler/Krankenhäuser (*Hospitals / Healthcare*)
*   **Aufhänger A: Die drastische Schichtverkürzung für Assistenzärzte ab Februar 2026**
    *   **Gesetz/Regelung:** Gesetz zur Verbesserung der Ausbildungsbedingungen und des Status von Assistenzärzten (*Medical Resident Act* - 전공의의 수련환경 개선 및 지위 향상을 위한 법률 - *Jeongongi-beob*).
    *   **Fachbegriff:** Maximale kontinuierliche Ausbildungszeit (연속수련 - *Yeonsok Suryeon*).
    *   **Wert/Schwellenwert:** Ein Meilenstein im koreanischen Kliniksektor: Ab **21. Februar 2026** wird die gesetzlich zulässige kontinuierliche Höchstarbeitszeit für Assistenzärzte im Schichtdienst von **36 Stunden auf maximal 24 Stunden** (in medizinischen Akutfällen bis max. 28 Stunden) herabgesetzt. Das Klinik-Dienstplansystem muss diese neue Obergrenze zwingend erzwingen, um Strafen und den Entzug von Ausbildungslizenzen für das Krankenhaus zu verhindern.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Topaktuelles Thema im koreanischen Medizinsektor)**.

#### 3. Sicherheits-/Bewachungsdienste (*Private Security*)
*   **Aufhänger A: Befreiung von Schichtzeit-Caps durch MOEL-Sondergenehmigung**
    *   **Gesetz/Regelung:** *Geunlo Gijun-beob* Artikel 63 (Spezialausnahmen für Überwachungsarbeit).
    *   **Fachbegriff:** Überwachungs- und intermittierende Arbeiter (감시적·단속적 근로자 - *Gamsijeog·Dansokjeog Geunloja*).
    *   **Wert/Schwellenwert:** Sicherheitsdienste, die in 24-Stunden-Wechselschichten (*24시간 격일제 근무*) operieren, können durch Genehmigung des Arbeitsministeriums (MOEL) von den Standardstundenlimits (52-Stunden-Woche) und dem wöchentlichen bezahlten Ruhetag befreit werden. Das Abrechnungsmodul von Klacks muss diese Befreiung im System pro Mitarbeiter hinterlegen können, während der gesetzliche **Nachtarbeitszuschlag von 50 %** (22:00 bis 06:00 Uhr) weiterhin zwingend berechnet werden muss.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Standard-Praxis in der koreanischen Sicherheitsbranche)**.

#### 4. Reinigungs-/Gebäudedienste (*Cleaning Services*)
*   **Aufhänger A: Vergütungspflichtige Bereitschafts- und Wartezeiten bei geteilten Schichten**
    *   **Gesetz/Regelung:** *Geunlo Gijun-beob* Artikel 50 Abs. 3 in Verbindung mit höchstrichterlicher Rechtsprechung.
    *   **Fachbegriff:** Bereitschafts-/Wartezeit (대기시간 - *Daegi Sigan*).
    *   **Wert/Schwellenwert:** Reinigungskräfte arbeiten oft in geteilten Schichten (*Bunhal Geunmu*). Wenn Mitarbeiter zwischen zwei Reinigungszyklen im Objekt warten müssen und nicht frei über ihre Zeit verfügen können, gilt diese Zeit rechtlich voll als zu vergütende Arbeitszeit (*Daegi Sigan*). Das Zeiterfassungssystem muss diese Intervalle exakt erfassen, um Nachzahlungsklagen zu verhindern.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Häufiger Streitpunkt bei Kontrollen des MOEL)**.

#### 5. Logistik/Güterverkehr (*Logistics / Transport*)
*   **Aufhänger A: Harte 11-stündige Erholungszeit zwischen Schichten für Lkw-Fahrer**
    *   **Gesetz/Regelung:** Ausführungsbestimmungen zum Transportgesetz für gewerbliche Güterkraftfahrzeuge (*Trucking Transport Business Act* - 화물자동차 운수사업법 - *Hwamul Jadongcha Unsu Sa-eob-beob*).
    *   **Fachbegriff:** Kontinuierliche Ruhezeit (연속휴식시간 - *Yeonsok Hyusik Sigan*).
    *   **Wert/Schwellenwert:** Fahrer von schweren Nutzfahrzeugen (Sattelzugmaschinen, Stückguttransporte) müssen nach Beendigung einer Schicht zwingend eine ununterbrochene Ruhezeit von mindestens **11 zusammenhängenden Stunden** erhalten, bevor sie die nächste Fahrt im Roster antreten dürfen.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Streng kontrollierter Verkehrsstandard)**.
*   **Aufhänger B: Das reaktivierte "Safe Rates"-Mindestlohnsystem ab Februar 2026**
    *   **Gesetz/Regelung:** Gesetz zur Wiedereinführung des Sicherheitsfrachtratensystems (*Safe Rates System*).
    *   **Fachbegriff:** Sicherheitsfrachtrate (안전운임제 - *Anjeon Un-im-je*).
    *   **Wert/Schwellenwert:** Reaktiviert im Juli 2025 und in Kraft seit **1. Februar 2026**. Das System regelt Mindestvergütungen für Lkw-Fahrer (zunächst für Container- und Zementtransporte), um Übermüdung und Rasen zu verhindern. Der Roster von Logistikanbietern muss geplante Stunden direkt mit den Safe-Rates-Vorgaben abgleichen, um rechtliche Konformität zu wahren.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Extrem wichtig für die Transportkalkulation in Korea)**.
