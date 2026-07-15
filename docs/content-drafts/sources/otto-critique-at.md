Hallo Claude, hier ist mein Feedback zur Kritik-Runde für Österreich (`at`). 

Da im bereitgestellten Entwurf nur die allgemeine Seite aufgeführt ist, bezieht sich meine Bewertung auf diese Seite. Um den Text sprachlich und behördlich perfekt für österreichische Pflege- und Sozialbetriebe zu lokalisieren, empfehle ich folgende 3 Anpassungen:

---

### Seite: Allgemein (Österreich)

*   **Verbesserungsvorschlag 1 (Orthografie - Rückkehr zum Eszett „ß“):**
    *   *Alt:* „Eine Pflegekraft arbeitet **regelmässig** im Wechselschichtdienst.“
    *   *Neu:* „Eine Pflegekraft arbeitet **regelmäßig** im Wechselschichtdienst.“
    *   *Begründung:* Anders als in der Schweiz ist das Eszett („ß“) in Österreich nach langen Vokalen orthografisch zwingend vorgeschrieben. Die Schweizer Schreibweise wirkt auf österreichische Leser wie ein Copy-Paste-Fehler.
*   **Verbesserungsvorschlag 2 (Offizieller Behördenbegriff):**
    *   *Alt:* „...Meldung an die **Krankenkasse**.“
    *   *Neu:* „...Meldung an die **Österreichische Gesundheitskasse (ÖGK)**.“ (oder „...an den Sozialversicherungsträger“)
    *   *Begründung:* In Österreichs HR- und Pflegemanagement-Kreisen ist „Krankenkasse“ umgangssprachlich. Für die gesetzliche Schwerarbeitsmeldung ist konkret die **ÖGK** der direkte, fachlich korrekte Ansprechpartner.
*   **Verbesserungsvorschlag 3 (Gender-Orthografie für Österreich):**
    *   *Alt:* „...Schwerarbeiter:innen...“, „...Mitarbeiter:in...“, „...Klient:innendaten...“
    *   *Neu:* „...**Schwerarbeitsleistende**...“ (oder „...SchwerarbeiterInnen...“ mit Binnen-I) / „...**Mitarbeitende**...“ / „...**Klientendaten**...“
    *   *Begründung:* Während im deutschen Raum der Doppelpunkt dominiert, ist in Österreichs Behörden und sozialen Institutionen das traditionelle Binnen-I (*MitarbeiterInnen*, *KlientInnen*) oder die geschlechtsneutrale Formulierung (*Mitarbeitende*) die gängigere und barrierefreiere Wahl.

---

### Gesamturteil

**GESAMT: einverstanden**

*Begründung:* Der Text fängt den hochaktuellen Schmerzpunkt der neuen Schwerarbeits-Kategorie ab Jänner 2026 im österreichischen Pflegebereich genial auf. Durch die Verwendung von Begriffen wie „Jänner“, „SWÖ-KV“ und „Krankenanstalten“ (statt Krankenhäusern) wirkt die Seite bereits extrem landesnah und überzeugend.
[agent] run 46a422c2-df22-4f29-8ced-cbfaa6ccd34b ended with stopReason=stop

---
## Umsetzung (Haupt-Session, 2026-07-15)
Alle 3 Vorschläge umgesetzt: regelmäßig (ß), Krankenkasse → Österreichische Gesundheitskasse (ÖGK) an beiden Stellen, Gender-Formen neutralisiert (Schwerarbeitsregelung / pro Person / Klientendaten). Otto-Urteil: einverstanden. ABGENOMMEN.


---

## Gegenpass 2026-07-15 (Zuschlagsstaffeln + Hard-Block-Opt-in + rollierender 48h-/17-Wochen-Schnitt — Otto-Kritik-Runde)

Otto-Gesamturteil: **GESAMT: Einwände siehe oben** (drei sprachlich-fachliche Detailverbesserungen bei Hausdienste, Logistik und Spitex, ansonsten exzellente und rechtssichere Aufwertung).

Überversprechen-Check: keine bestehende Überversprechung gefunden; Otto empfiehlt an zwei Stellen eine präzisierende Schranken-Formulierung, um eine mögliche Fehllesung als automatisches Einplanen vorsorglich auszuschließen.

**Eingearbeitet:**
- land-at-hausdienste.json: „... auf dieser fertig verzuschlagten Basis" → „... auf dieser fertig berechneten Zuschlagsbasis" (weniger umgangssprachlich).
- land-at-logistik.json: „eingeplant wird nur, wer einen gültigen Ausweis hat" → „eingeplant werden kann nur, wer..." (schließt Fehllesung als Auto-Scheduling aus, analog GB).
- land-at-spitex.json: „eingeplant wird nur, wer einen gültigen Ausweis hat" → „eingeplant werden kann nur, wer einen gültigen Nachweis hat" (Pflegekräfte weisen sich über Qualifikationsnachweise/GBR-Registrierung aus, nicht per Ausweis).

**Nur dokumentiert:** keine.
