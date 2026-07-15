Hallo Claude, hier ist mein Feedback zur Kritik-Runde für Großbritannien (`gb`).

Die Detailtreue dieser Seiten ist absolut überragend. Die Integration des *Employment Rights Act 2025*, der *Working Time Regulations 1998* (inklusive der Serco-Leisure-ICO-Entscheidung von 2024), der *TUPE-Übertragungsregeln*, der *SIA-Lizenzen* und der hochspezifischen *GB Domestic Drivers' Hours Rules* ist genial.

Da es sich um den deutschen Basistext für den britischen Markt handelt, müssen lediglich einige Schweizer „ss“-Schreibweisen in das deutsche Standard-Eszett („ß“) überführt werden:

---

### 1) Seite: Allgemein
*   **Verbesserungsvorschlag 1 (Orthografie-Anpassung):**
    *   *Alt:* „...verhängte **Massnahmen**...“ / „...keine **rechtmässige** Grundlage...“
    *   *Neu:* „...verhängte **Maßnahmen**...“ / „...keine **rechtmäßige** Grundlage...“
    *   *Begründung:* Standard-Eszett-Regelung für deutsche Basistexte außerhalb der Schweiz.
*   **Verbesserungsvorschlag 2 (Orthografie-Anpassung):**
    *   *Alt:* „...**ausserhalb** davon...“ / „...jeder **Verstoss**...“
    *   *Neu:* „...**außerhalb** davon...“ / „...jeder **Verstoß**...“

---

### 2) Seite: Häusliche Pflege (Domiciliary Care)
*   **Verbesserungsvorschlag 1 (Orthografie-Anpassung):**
    *   *Alt:* „...in **Grossbritannien**...“ / „...**Verstösse** gegen den...“
    *   *Neu:* „...in **Großbritannien**...“ / „...**Verstöße** gegen den...“

---

### 3) Seite: Spitäler
*   **Verbesserungsvorschlag 1 (Orthografie-Anpassung):**
    *   *Alt:* „...und **Verstösse** über Reports...“ / „...WTR-**Verstösse** sichtbar...“
    *   *Neu:* „...und **Verstöße** über Reports...“ / „...WTR-**Verstöße** sichtbar...“

---

### 4) Seite: Security
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Die Definition des „Night Worker“ nach den WTR-Vorgaben und die Koppelung an den gesetzlichen Gesundheitscheck ist eine meisterhafte, praxisrelevante Argumentation.

---

### 5) Seite: Haus-/Putzdienste
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Die Hervorhebung der TUPE-Übergänge (Übernahme bestehender Verträge und Schichten bei Dienstleisterwechsel) trifft den operativen Kern von B2B-Reinigungsunternehmen im UK perfekt.

---

### 6) Seite: Logistik
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Die klare Gegenüberstellung der reinen Binnenregeln (*GB Domestic Rules*) und der grenzüberschreitenden Tacho-Pflicht ab Juli 2026 löst ein echtes, akutes Koordinationsproblem britischer Flottenbetreiber.

---

### Gesamturteil

**GESAMT: einverstanden**

*Begründung:* Diese Seiten sind ein Musterbeispiel für extrem präzisen, rechts- und praxisbezogenen B2B-Nutzenvertrieb im UK. Sie demonstrieren unmissverständlich, dass Klacks die britischen Compliance-Hürden zutiefst durchdrungen hat.
[agent] run 0d55acf8-7ed1-498f-a08c-53cdd673433e ended with stopReason=stop

---
## Umsetzung (Haupt-Session, 2026-07-15)
Alle Orthografie-Vorschläge über den site-weiten ß-Sweep umgesetzt (Maßnahmen, rechtmäßig, außerhalb, Verstoß/Verstöße, Großbritannien). Otto-Urteil: einverstanden. ABGENOMMEN.


---

## Gegenpass 2026-07-15 (Hard-Block-Opt-in + rollierender 17-Wochen-Schnitt — Otto-Kritik-Runde)

Otto-Gesamturteil: **GESAMT: Einwände siehe oben** (Präzisionskorrekturen im Sicherheits-/Pflege-Vokabular sowie zur Vorbeugung von Auto-Scheduling-Missverständnissen).

Überversprechen-Check: Otto identifiziert eine Lese-Unschärfe (nicht als bestehendes Überversprechen, sondern als Vorsichtsmaßnahme) — „eingeplant wird nur, wer..." könnte als automatische Zuweisung statt als reine Validierungsschranke gelesen werden.

**Eingearbeitet:**
- land-gb-logistik.json: „eingeplant wird nur, wer einen gültigen Führerschein hat" → „eingeplant werden kann nur, wer..." (schließt Fehllesung als Auto-Scheduling aus).
- land-gb-security.json: analog „eingeplant wird nur" → „eingeplant werden kann nur" (SIA-Lizenz).
- land-gb-spitex.json: „eingeplant wird nur, wer einen gültigen Ausweis hat" → „eingeplant werden kann nur, wer einen gültigen Nachweis hat" (Domiciliary-Care-Personal weist sich über Schulungszertifikate nach, nicht über physischen Ausweis).

**Nur dokumentiert:** keine.
