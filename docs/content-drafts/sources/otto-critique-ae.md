Hallo Claude, hier ist mein Feedback zur Kritik-Runde für die Vereinigten Arabischen Emirate (`ae`).

Die emiratischen Texte sind fachlich und strategisch absolut sensationell! Die Einbindung der gesetzlichen Reduzierung der Soll-Arbeitszeit während des heiligen Monats *Ramadan* (nach dem Arbeitsgesetz *Federal Decree-Law No. 33 of 2021*), die genaue Abbildung der 144-Stunden-Obergrenze je 3 Wochen sowie die Nutzung des MOHRE-Mittagsarbeitsverbots (*حظر العمل وقت الظهيرة* vom 15. Juni bis 15. September) für offene Ladehöfe und Außenreinigungsdienste sind verkäuferisch unschlagbar starke und rechtlich absolut sattelfeste Aufhänger.

Hier sind die wenigen Anpassungen zur Rechtschreibung (Eszett) und zur Beseitigung von Helvetismen im deutschen Basistext für die VAE:

---

### 1) Seite: Allgemein
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Das Zusammenspiel zwischen der automatischen Ramadan-Arbeitszeitverkürzung und den strengen, am 1. Juni 2026 in Kraft getretenen WPS-Lohnschutzfristen (*Ministerial Resolution No. 340 of 2026*) ist ein hervorragendes Argument für emiratische Geschäftsführer.

---

### 2) Seite: Häusliche Pflege
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Die präzise Bezugnahme auf die 56-Stunden-Ausnahmeregelung für kontinuierlichen Schichtbetrieb (*Cabinet Resolution No. 1 of 2022, Art. 15*) beweist ein überragendes Verständnis der lokalen Gesetzgebung in den Emiraten.

---

### 3) Seite: Spitäler
*   **Verbesserungsvorschlag 1 (Helvetismus eliminieren):**
    *   *Alt:* Titel: „Dienstpläne, die auch im Notfall standhalten.“ / Badge: „Für **Spitäler** & Kliniken in den VAE“ / Lösungen: „Wie Klacks **Spitäler** in den VAE entlastet“
    *   *Neu:* Titel: „Dienstpläne, die auch im Notfall standhalten.“ / Badge: „Für **Krankenhäuser** & Kliniken in den VAE“ / Lösungen: „Wie Klacks **Krankenhäuser** in den VAE entlastet“
    *   *Begründung:* Im deutschen Text für den emiratischen Markt sollte der Schweizer Ausdruck „Spitäler“ durch das standarddeutsche „Krankenhäuser“ ersetzt werden, um absolute Professionalität zu wahren.

---

### 4) Seite: Security
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Der Feiertagsausgleich nach Art. 28(2) (Ersatzruhetag oder 50 % Zuschlag) bei gleichzeitiger Einhaltung des 144-Stunden-Deckels ist eine erstklassige administrative Entlastung für emiratische Sicherheitsdienste.

---

### 5) Seite: Haus-/Putzdienste
*   **Verbesserungsvorschlag 1 (Orthografie-Anpassung & Eszett):**
    *   *Alt:* „**Aussenreinigung** planen...“ / „...**Aussen-** und Fensterreinigungs-Einsätze...“ / „Mittagsverbot für **Aussenarbeit**...“
    *   *Neu:* „**Außenreinigung** planen...“ / „...**Außen-** und Fensterreinigungs-Einsätze...“ / „Mittagsverbot für **Außenarbeit**...“
    *   *Begründung:* Standard-Eszett-Regelung für deutsche Basistexte außerhalb der Schweiz.

---

### 6) Seite: Logistik
*   **Verbesserungsvorschlag 1 (Orthografie-Anpassung & Eszett):**
    *   *Alt:* „...Verbot der **Aussenarbeit**...“ / „...Mittagsfenster für **Aussenschichten**...“
    *   *Neu:* „...Verbot der **Außenarbeit**...“ / „...Mittagsfenster für **Außenschichten**...“
    *   *Begründung:* Anpassung an die Standard-Eszett-Regelung.

---

### Gesamturteil

**GESAMT: einverstanden**

*Begründung:* Nach der Bereinigung der Eszett-Fehler bei „Außen“ und dem Ersetzen des Schweizer Helvetismus „Spitäler“ durch „Krankenhäuser“ sind diese Texte strategisch und werblich auf absolutem Top-Niveau und perfekt auf die Regulatorien der VAE abgestimmt.
[agent] run d11fd912-556f-456a-a256-bf9af2dd7f75 ended with stopReason=stop

---
## Umsetzung (Haupt-Session, 2026-07-15)
Alle Vorschläge umgesetzt: „Spitäler"→„Krankenhäuser" über den site-weiten Helvetismus-Sweep (alle Nicht-CH/AT-Seiten); Außen-/ß-Schreibweisen über den erweiterten Orthografie-Sweep (Aussen→Außen, zu Fuß). Otto-Urteil: einverstanden. ABGENOMMEN.


---

## Gegenpass 2026-07-15 (Hard-Block-Opt-in + 144h/3-Wochen-Deckel — Otto-Kritik-Runde)

Otto-Gesamturteil: **GESAMT: Einwände siehe oben** (Terminologie-Details „kippt"/„hart").

Kein Überversprechen gefunden — Opt-in via „Auf Wunsch" durchgehend sauber.

**Eingearbeitet:**
- land-ae-security.json: „blockiert Klacks die Überschreitung hart" → „... strikt" (144h-Deckel).
- land-ae-spitaeler.json: „warnt, bevor der Grenzwert kippt" → „... überschritten wird"; „Überschreitung hart" → „... strikt".
- land-ae-spitex.json: zweimal „kippt" → „überschritten wird" / „erreicht bzw. überschritten wird" (56h-Ausnahme-Grenzen).

**Nur dokumentiert (Otto selbst als optional markiert, nicht übernommen):**
- land-ae.json: Otto nennt „strikt" statt „hart" für Subtitle/Tageslimit als *optionale* Alternative, bewertet den Ist-Zustand aber ausdrücklich als „vollkommen im Rahmen" bzw. „Einverstanden" — deshalb nicht angefasst, um unnötige Inkonsistenz zur bewusst offen gelassenen Otto-Bewertung zu vermeiden.
