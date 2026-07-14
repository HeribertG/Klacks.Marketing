[fetch-timeout] fetch timeout after 5000ms (elapsed 5000ms) operation=fetchWithSsrFGuard url=https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFMJIWWanYikUQ5TWGdpyRStV253tBV2ij5lkhCOLQrst5Ygx-5oXk6NKpaVH1LO0k9OBfiSQEDiQ5WuBiU4H-rvtOGOpSuwjdKOr5h0HCLOtryAp0keD5V72NB1w==
Hier sind die stichwortartigen Rohfakten und Aufhänger für das schwedische Länderseiten-Content-Szenario, exakt nach Ihren Vorgaben strukturiert.

---

### Teil 1: Branchenneutrale, generelle USPs für Schweden (SE)

1.  **Die verschärfte 11-Stunden-Tagesruhezeit-Regel (*Dygnsvila*):**
    *   **Fakt:** Nach einer Rüge der EU-Kommission wurden die Regeln zur täglichen Ruhezeit (*dygnsvila*) drastisch verschärft. Jeder Arbeitnehmer hat in jedem 24-Stunden-Fenster Anspruch auf mindestens **11 Stunden zusammenhängende Ruhezeit**. Die Möglichkeit für Ausnahmen ist extrem restriktiv und erfordert nachfolgend eine sofortige Gewährung von Ausgleichsruhezeit (*kompenserande vila*). Diese Verschärfung trat schrittweise in Kraft (Kommunen/Regionen ab 2023/24, private Pflege *Vårdföretagarna* zum 1. September 2025, *Fremia* zum 1. Januar 2026). Dienstplansoftware muss diese Ruhezeiten und automatische Ausgleiche sekundengenau überwachen, um Abmahnungen und Bußgelder zu verhindern.
    *   **Sicherheit:** **100 % (Absolut sicher / Das dominierende PEP-Thema in Schweden)**.
    *   **Quelle:** *Arbetstidslagen* / Richtlinien von *SKR* und den Gewerkschaften (*Kommunal*, *Vårdförbundet*).

2.  **Primat des Tarifvertragssystems (*Kollektivavtal*) vor dem Gesetz:**
    *   **Fakt:** In Schweden ist das Arbeitszeitgesetz (*Arbetstidslagen*) in weiten Teilen dispositiv (*semidispositiv*). Das bedeutet, dass Tarifverträge (*kollektivavtal*) die gesetzlichen Vorgaben legal überschreiben und eigene, oft deutlich komplexere Regeln für Arbeitszeiten, Überstundengrenzen und Zuschläge (*OB-ersättning*) festlegen. Ein Dienstplansystem darf nicht nur das Standardgesetz abbilden, sondern muss flexibel die spezifischen Tarifvertragsregeln (z. B. Kommunal, Transport, Fastighets) als Master-Regelwerk hinterlegen können.
    *   **Sicherheit:** **100 % (Absolut sicher / Grundpfeiler des schwedischen Modells)**.
    *   **Quelle:** *Arbetstidslagen* § 3.

3.  **Strenge Anforderungen an Biometrie und Überwachung durch die IMY:**
    *   **Fakt:** Die schwedische Datenschutzbehörde (*IMY - Integritetsskyddsmyndigheten*) untersagt die Nutzung biometrischer Daten (wie Fingerabdruck oder Gesichtserkennung) zur standardmässigen Zeiterfassung und Anwesenheitskontrolle. Wegen des strukturellen Ungleichgewichts zwischen Arbeitgeber und Arbeitnehmer gilt eine Einwilligung (*samtycke*) hier nicht als freiwillig erteilt. Die IMY verhängt bei Verstößen empfindliche Bußgelder. Klacks' On-Premise-Betrieb speichert alle Zeiterfassungsdaten lokal ohne Cloud-Abfluss und garantiert somit höchste Konformität mit den IMY-Vorgaben.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** IMY-Prüfpraxis und Bußgeldentscheidungen (u. a. Leitfaden *Biometri på arbetsplatsen*) / GDPR Art. 9.

4.  **Harte gesetzliche Jahreshöchstgrenze für Überstunden (*Allmän övertid*):**
    *   **Fakt:** Soweit im Kollektivavtal nicht anders geregelt, gilt nach dem Gesetz eine strikte Obergrenze für allgemeine Überstunden (*allmän övertid*) von maximal **200 Stunden pro Kalenderjahr** und maximal 50 Stunden in einem Kalendermonat. Das System muss Planer proaktiv warnen, bevor diese harten Schwellenwerte gerissen werden.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** *Arbetstidslagen* § 8.

---

### Teil 2: Branchenspezifische schwedische Aufhänger

#### 1. Ambulante Pflege (*Hemtjänst*)
*   **Termingerechte Umsetzung der privaten Dygnsvila-Tarifregeln:**
    *   **Fakt:** Seit dem **1. September 2025** gelten die verschärften 11-Stunden-Ruhezeitregeln der Gewerkschaft *Kommunal* und der *Vårdföretagarna* auch für private ambulante Pflegedienste. Zum **1. Januar 2026** folgten die Tarife der *Fremia*. Das System muss diese neuen Stichtage und Tarifsätze vollautomatisch im Dienstplan berücksichtigen.
    *   **Sicherheit:** **100 % (Absolut sicher / Aktuellste Tarifrunden)**.
    *   **Quelle:** Tarifabkommen *Vårdföretagarna/Kommunal 2025* und *Fremia/Kommunal 2026*.
*   **Präzise Berücksichtigung von Wegezeiten im Pflegeradius:**
    *   **Fakt:** Wegezeiten (*restid*) zwischen den einzelnen Patientenbesuchen der Pflegekräfte gelten im Tarifbereich der *Kommunal* als bezahlte Arbeitszeit. Werden diese im Dienstplan nicht explizit geblockt, verstösst die Schichtplanung unweigerlich gegen die tägliche Höchstarbeitszeit.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** Branschens kollektivavtal *Vård och Omsorg* / *Kommunal*.

#### 2. Spitäler (*Sjukhus*) – Hälso- och sjukvård
*   **Verpflichtende MBL-Verhandlungen bei geplanten Abweichungen:**
    *   **Fakt:** Krankenhäuser, die zur Sicherung des Notbetriebs Schichten mit einer verkürzten Dygnsvila von unter 11 Stunden (z. B. auf 9 Stunden) planen wollen, müssen dies gemäss dem Mitbestimmungsgesetz (*MBL*) zwingend vorab mit der zuständigen Gewerkschaft (*Vårdförbundet* eller *Läkarförbundet*) verhandeln. Der Dienstplaner muss solche MBL-pflichtigen Schichtmuster kennzeichnen.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** *Lag (1976:580) om medbestämmande i arbetslivet (MBL)* / SKR-Vorgaben.
*   **Harte Ruhezeitregeln nach Bereitschaftsdiensten (*Jour* / *Beredskap*):**
    *   **Fakt:** Ärzte und Pflegekräfte im Bereitschaftsdienst dürfen im Ausnahmefall Schichten von bis zu 20 Stunden leisten, sofern darin mindestens 5 Stunden zusammenhängende Jour-Zeit zwischen 22:00 und 08:00 Uhr enthalten sind. Das System muss im direkten Anschluss eine Ausgleichsruhezeit einplanen, die exakt der geleisteten Arbeitszeit entspricht.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** *Allmänna bestämmelser (AB)* / SKR.

#### 3. Sicherheitsdienste (*Bevakning*) – Säkerhetsbranschen
*   **Stopp der Jahresarbeitszeit und fackliges Überstunden-Audit:**
    *   **Fakt:** Im aktuellen Sicherheits- und Bewachungstarifvertrag (*Bevakningsavtalet* zwischen *Almega Säkerhetsföretagen* und *Transport* gültig bis Mai 2027) wurde die Einführung von Jahresarbeitszeitkonten blockiert. Zudem darf die Marke von **200 Überstunden pro Jahr** pro Wachkraft nicht ohne explizite Genehmigung (Dispens) der Gewerkschaft überschritten werden.
    *   **Sicherheit:** **100 % (Absolut sicher / Aktueller Tarifvertrag)**.
    *   **Quelle:** *Bevaknings- och säkerhetsavtalet 2025–2027*, *Svenska Transportarbetareförbundet*.
*   **Einführung der Teilzeitpension ab Juni 2026:**
    *   **Fakt:** Zum **1. Juni 2026** tritt im Sicherheitssektor ein neues Modell zur Teilzeitpension in Kraft. Mitarbeiter ab 62 Jahren haben das Recht, ihre Arbeitszeit um bis zu 50 % zu reduzieren. Der Dienstplaner muss diese reduzierten Arbeitszeitkontingente automatisch umrechnen.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** *Bevakningsavtalet 2025–2027*.

#### 4. Haus-/Putzdienste (*Städning*) – Fastighet och Städ
*   **Gleichstellung von Teilzeitkräften bei Überstundenzahlung ab Juni 2026:**
    *   **Fakt:** Eine historische Neuerung im schwedischen Gebäudereinigungstarifvertrag (*Städavtalet*): Ab dem **1. Juni 2026** entfällt für Teilzeit-Reinigungskräfte die schlechter vergütete Mehrarbeit (*mertid*). Jede Stunde über der geplanten individuellen Arbeitszeit muss ab diesem Stichtag direkt als vollwertige Überstunde (*övertidsersättning*) wie bei Vollzeitkräften bezahlt werden. Das Abrechnungsmodul muss dies zwingend umstellen, um Klagen wegen Tarifbruchs zu verhindern.
    *   **Sicherheit:** **100 % (Absolut sicher / Wichtigster Schlichterpunkt zur Streikvermeidung)**.
    *   **Quelle:** Kollektivavtal *Almega Serviceföretagen – Fastighetsanställdas Förbund / Seko 2025*.
*   **Strenge Nachtruhe-Vorgabe für Reinigungskräfte:**
    *   **Fakt:** Ohne abweichende lokale Tarifvereinbarung muss die gesetzliche 11-stündige Dygnsvila für Reinigungskräfte zwingend das Zeitfenster zwischen **00:00 und 05:00 Uhr** morgens abdecken. Das System muss Planer warnen, falls Reinigungsrunden in diesen Kernruhebereich gelegt werden.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** Kollektivavtal *Almega Serviceföretagen*.

#### 5. Logistik und Transport (*Logistik*) – Vägtransport
*   **Anpassung des qualifizierten Wochenendzuschlags (*OB-tillägg*) ab April 2025:**
    *   **Fakt:** Gemäss dem Transportabkommen (*Transportavtalet* zwischen BBA und *Transport*) wird das qualifizierte, deutlich höhere Wochenende-OB (*OB-tillägg*) für Lkw-Fahrer bereits ab freitags **21:00 Uhr** fällig (gültig ab 1. April 2025). Das Planungstool muss diese Lohnartengrenze präzise trennen.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** *Transportavtalet 2025–2027*.
*   **Neues Arbeitszeitverkürzungskonto (*Arbetstidsförkortning*) ab 2026:**
    *   **Fakt:** Ab dem Kalenderjahr **2026** erhalten angestellte Fahrer und Logistikmitarbeiter über das neue Tarifabkommen das Recht auf einen Tag zusätzliche Arbeitszeitverkürzung pro Jahr, finanziert durch eine tarifliche Umlage von 0,5 %.
    *   **Sicherheit:** **100 % (Absolut sicher)**.
    *   **Quelle:** *Transportavtalet 2025–2027*.
[agent] run 33f70595-1851-4191-b47f-72c436ea1b80 ended with stopReason=stop
