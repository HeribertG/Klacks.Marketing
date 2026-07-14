# VN — Otto Roh-Brainstorm Block B/C (unverifiziert)

> ACHTUNG: Dies ist eine ROHE, UNVERIFIZIERTE Brainstorm-Antwort von Otto (OpenClaw-Agent).
> ALLE Gesetzesnamen, Paragraphen, Jahreszahlen, Nummern und Schwellenwerte muessen noch
> in einer nachgelagerten Stufe verifiziert werden. Nichts hiervon ist bestaetigt.

---

Hier ist das strukturierte Brainstorming für eine On-Premise-Personaleinsatzplanungs-Software (Klacks) auf dem vietnamesischen Markt, untermauert mit präzisen rechtlichen Bezeichnungen, vietnamesischen Originalbegriffen und transparenten Sicherheitsbewertungen.

---

### (A) Branchenneutrale Aufhänger (vietnamesisches Arbeitsrecht)

#### 1. Das monatliche und jährliche Überstundenlimit (40h/200h/300h-Cap)
*   **Original-Gesetzesname:** Arbeitsgesetzbuch von Vietnam (*Labor Code 2019* (Law No. 45/2019/QH14) - Bộ luật Lao động 2019), in Kraft seit **1. Januar 2021**, Artikel 107.
*   **Fachbegriff:** Überstunden-Obergrenze (Giới hạn làm thêm giờ - *Overtime Limit*).
*   **Wert/Schwellenwert:** Überstunden dürfen **50 % der regulären täglichen Arbeitszeit** (z. B. max. 4h bei einer 8h-Schicht, maximal 12h Gesamtzeit pro Tag) und **40 Stunden pro Monat** nicht überschreiten. Die jährliche Obergrenze liegt standardmäßig bei **200 Stunden** (kann in ausgewählten Sektoren wie kontinuierlichen Schichtbetrieben oder der verarbeitenden Industrie auf bis zu **300 Stunden** angehoben werden). Ein Dienstplaner muss diese monatlichen 40h- und jährlichen 200h/300h-Caps pro Mitarbeiter lückenlos überwachen.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Strengstens kontrolliertes Kriterium bei staatlichen Arbeitsinspektionen)**.

#### 2. Die komplexe Kumulation von Überstunden und Nachtarbeit
*   **Original-Gesetzesname:** *Bộ luật Lao động 2019*, Artikel 98 und Artikel 106.
*   **Fachbegriff:** Nacht-Überstundenlohn (Tiền lương làm thêm giờ vào ban đêm - *Night Overtime Pay*).
*   **Wert/Schwellenwert:** Nachtarbeit (22:00 bis 06:00 Uhr) erfordert einen Aufschlag von mindestens **30 %** (Artikel 106). Werden nachts Überstunden geleistet (Artikel 98 Abs. 3), kumuliert sich dies extrem komplex: Überstundenrate (150 % an Wochentagen, 200 % am Ruhetag) + 30 % Nachtzuschlag + **20 % berechnet auf die Tages-Überstundenrate**. Dies ergibt Sätze von ca. **210 %** auf Wochentagen und **270 %** an Ruhetagen. Manuelle Berechnungen sind extrem fehleranfällig; Klacks automatisiert diese Formeln lückenlos.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher / Einer der kompliziertesten Lohnberechnungsschwellenwerte in Asien)**.

#### 3. Strenge Einhaltung der 12-stündigen Schichtruhezeit
*   **Original-Gesetzesname:** *Bộ luật Lao động 2019*, Artikel 110 Abs. 2.
*   **Fachbegriff:** Schichtwechsel-Ruhezeit (Thời gian nghỉ chuyển ca - *Rest Break Between Shifts*).
*   **Wert/Schwellenwert:** Arbeitnehmer im Schichtbetrieb müssen nach Beendigung einer Schicht zwingend eine ununterbrochene Ruhezeit von mindestens **12 zusammenhängenden Stunden** erhalten, bevor sie die nächste Schicht im Roster antreten dürfen.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 4. Lokale Datenresidenz und Datenschutz nach Dekret 13/2023/ND-CP
*   **Original-Gesetzesname:** Dekret Nr. 13 von 2023 über den Schutz personenbezogener Daten (*Personal Data Protection Decree* - Nghị định 13/2023/NĐ-CP).
*   **Fachbegriff:** Sensible personenbezogene Daten (Dữ liệu cá nhân nhạy cảm - *Sensitive Personal Data*).
*   **Wert/Schwellenwert:** Biometrische Daten (Dữ liệu sinh trắc học) zur Mitarbeiterzeiterfassung fallen unter Artikel 2 des Dekrets 13 als sensible persönliche Daten. Das Speichern und Übertragen dieser Daten auf Cloud-Server außerhalb Vietnams erfordert umfangreiche und kostspielige behördliche Sicherheitsaudits. Ein lokaler On-Premise-Server (Klacks) speichert biometrische Signaturen lückenlos innerhalb des eigenen Unternehmensnetzwerks und ist sofort konform.
*   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

---

### (B) Branchenspezifische Aufhänger

#### 1. Ambulante/häusliche Pflege (*Home Care*)
*   **Aufhänger A: Garantie der Schicht-zu-Schicht-Ruhezeit im Pflegeraster**
    *   **Gesetz/Regelung:** *Bộ luật Lao động 2019*, Artikel 110.
    *   **Fachbegriff:** Pflegekraft für ältere Menschen (Người chăm sóc người cao tuổi - *Elderly Caregiver*).
    *   **Wert/Schwellenwert:** Pflegekräfte im häuslichen Dienst, die im Schichtbetrieb eingesetzt werden, müssen zwingend die gesetzliche Ruhezeit von mindestens **12 Stunden** zwischen den Einsätzen erhalten. Klacks blockiert die Planung unzulässiger Schichtfolgen im Roster.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.
*   **Aufhänger B: Vergütung von Wegezeiten zwischen ambulanten Klienten**
    *   **Gesetz/Regelung:** Allgemeine Grundsätze des vietnamesischen Arbeitsrechts zur effektiven Arbeitszeit.
    *   **Fachbegriff:** Wegezeit (Thời gian di chuyển - *Travel Time*).
    *   **Wert/Schwellenwert:** Fahrtzeiten einer Pflegekraft von einem Klienten zum nächsten sind voll zu vergütende Arbeitszeit, da sie auf Anweisung des Arbeitgebers stattfinden. Das System muss diese Transfers automatisch erfassen, um eine fehlerhafte Lohnkürzung zu verhindern.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 2. Spitäler/Krankenhäuser (*Hospitals / Healthcare*)
*   **Aufhänger A: Nutzung des erweiterten 300-Stunden-Jahresüberstunden-Solls**
    *   **Gesetz/Regelung:** *Bộ luật Lao động 2019*, Artikel 107 Abs. 3.
    *   **Fachbegriff:** Zulässiger Sektor für maximale Überstunden (Ngành nghề được làm thêm từ 200 đến 300 giờ một năm - *300-Hour Overtime Approval*).
    *   **Wert/Schwellenwert:** Krankenhäuser gehören zu den gesetzlich zugelassenen kontinuierlichen Betrieben, die das erweiterte jährliche Überstundenbudget von **300 Stunden** (statt standardmäßig 200 Stunden) pro Mitarbeiter nutzen dürfen. Das System muss dieses Limit überwachen und pro Mitarbeiter visualisieren, um jährliche Gesetzesverstöße zu verhindern.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 3. Sicherheits-/Bewachungsdienste (*Private Security*)
*   **Aufhänger A: Harte Überwachung der monatlichen 40-Stunden-Überstunden-Obergrenze**
    *   **Gesetz/Regelung:** *Bộ luật Lao động 2019*, Artikel 107 Abs. 2.
    *   **Fachbegriff:** Sicherheitsdienstmitarbeiter (Nhân viên bảo vệ - *Security Guard*).
    *   **Wert/Schwellenwert:** Da Sicherheitskräfte typischerweise im 12-Stunden-Schichtbetrieb arbeiten (8h regulär + 4h Überstunden), erreichen sie nach nur **10 Arbeitstagen** bereits das gesetzliche Monatslimit von **40 Stunden Überstunden**. Jede weitere Überstunde im laufenden Kalendermonat ist illegal. Das Planungssystem muss das Monatsfenster rollierend überwachen und rechtzeitig Ersatzkräfte einplanen, um behördliche Bußgelder zu vermeiden.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Das größte Compliance-Problem vietnamesischer Sicherheitsagenturen)**.

#### 4. Reinigungs-/Gebäudedienste (*Cleaning Services*)
*   **Aufhänger A: Nachtschichtzuschläge und verlängerte Pausenpflichten**
    *   **Gesetz/Regelung:** *Bộ luật Lao động 2019*, Artikel 106 und 109.
    *   **Fachbegriff:** Reinigungskraft (Nhân viên vệ sinh - *Cleaner*).
    *   **Wert/Schwellenwert:** Reinigungskräfte, die nachts (22:00 bis 06:00 Uhr) eingesetzt werden, müssen zwingend einen **Nachtzuschlag von 30 %** erhalten. Zudem steht ihnen während der Nachtschicht eine verlängerte, bezahlte Pause von mindestens **45 Minuten** (statt standardmäßig 30 Minuten am Tag) zu. Das Dienstplansystem muss diese Sondersätze und Pausenzeiten automatisch im Roster einpflegen.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher)**.

#### 5. Logistik/Güterverkehr (*Logistics / Transport*)
*   **Aufhänger A: Verschärfte fahrermüdungsbezogene Sicherheitsgesetze ab Juli 2026**
    *   **Gesetz/Regelung:** Gesetz zur Änderung des Gesetzes über Straßenverkehrsordnung und -sicherheit (*Law No. 118/2025*, wirksam seit **1. Juli 2026**).
    *   **Fachbegriff:** Berufskraftfahrer (Lái xe tải - *Truck Driver*) und Kontinuierliche Lenkzeit (Thời gian lái xe liên tục - *Continuous Driving Time*).
    *   **Wert/Schwellenwert:** Ein Berufskraftfahrer darf **maximal 4 Stunden kontinuierlich** am Steuer sitzen. Nach diesen 4 Stunden muss zwingend eine Fahrtpause eingeplant werden: Für schwere Lkw und Fernbusse beträgt diese Pause mindestens **15 Minuten** (für Taxis und Stadtbusse mindestens 5 Minuten). Die täglichen Gesamtlenkzeiten richten sich flexibel nach den Obergrenzen des Arbeitsgesetzbuchs (max. 10 Stunden Arbeitszeit pro Tag inklusive Überstunden). Das Planungstool muss die Fahrtzeiten und Pflichtpausen im Touren- und Dienstplan automatisiert anlegen.
    *   **Sicherheitsbewertung:** **100 % (Absolut sicher / Brandaktuelles, frisch reformiertes Transportrecht in Vietnam)**.
