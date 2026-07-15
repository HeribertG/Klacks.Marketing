Hallo Claude, hier ist mein Feedback zur Kritik-Runde für Polen (`pl`).

Polen ist regulatorisch eine extrem harte Nuss, und diese Texte treffen den Nagel auf den Kopf! Die Differenzierung zwischen der *lista obecności* und der gesetzlich geforderten *Ewidencja czasu pracy*, die UODO-Biometrie-Position, die brandneue PIP-Beweislastumkehr bei *umowa zlecenie* ab Juli 2026, die medizinische 7h35m-Sondernorm und das extrem strikte Nachtfenster-Limit für Kraftfahrer sind inhaltliche Meisterleistungen.

Hier sind 3 gezielte Optimierungen für die deutsche Basisfassung:

---

### 1) Seite: Allgemein
*   **Verbesserungsvorschlag 1 (Orthografie-Anpassung & Eszett):**
    *   *Alt:* „...statt einer **blossen** Anwesenheitsliste...“ / „...**Verstösse** gegen Arbeitnehmerrechte...“
    *   *Neu:* „...statt einer **bloßen** Anwesenheitsliste...“ / „...**Verstöße** gegen Arbeitnehmerrechte...“
    *   *Begründung:* Standard-Eszett-Regelung für deutsche Basistexte außerhalb der Schweiz.

---

### 2) Seite: Häusliche Pflege (opieka domowa)
*   **Verbesserungsvorschlag 1 (Orthografie-Anpassung):**
    *   *Alt:* „...für Auto oder zu **Fuss**.“
    *   *Neu:* „...für Auto oder zu **Fuß**.“

---

### 3) Seite: Spitäler (szpitale)
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Die getrennte Abbildung der medizinischen 7h35-Norm (Art. 93 Ustawa o działalności leczniczej) im Gegensatz zur 8h-Norm des Verwaltungsstabs ist ein überragendes, verkaufsstarkes Alleinstellungsmerkmal für polnische Krankenhausleitungen.

---

### 4) Seite: Security (ochrona)
*   **Verbesserungsvorschlag 1 (Korrektur einer rechtlichen Inkonsistenz bei Zuschlägen):**
    *   *Alt:* „Treffen mehrere Zuschläge zusammen, gilt der jeweils höchste Satz, nicht die Summe.“ *(unter Lösungen, Bullet 4)*
    *   *Neu:* „Treffen Überstunden- und Nachtzuschläge zusammen, werden diese gesetzeskonform kumuliert.“
    *   *Begründung:* Nach polnischem Arbeitsrecht (Art. 151(8) KP) schließen sich der Nachtzuschlag und der Überstundenzuschlag ausdrücklich **nicht** aus, sondern müssen addiert werden (kumulative Berechnung). Da dies im Abschnitt „Herausforderungen“ oben bereits korrekt beschrieben wurde, behebt diese Änderung eine widersprüchliche Formulierung in der Lösung.

---

### 5) Seite: Haus-/Putzdienste (sprzątanie)
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Die Koppelung der lückenlosen Zeiterfassung an den Nachweis des gesetzlichen Mindestlohns von 31,40 PLN (auch für *umowa zlecenie*) bietet Reinigungsfirmen perfekten Schutz bei PIP-Kontrollen.

---

### 6) Seite: Logistik
*   **Urteil:** **Einverstanden.**
    *   *Begründung:* Die extrem restriktive 10-Stunden-Gesamtarbeitszeitgrenze, sobald ein Fahrer auch nur eine Minute im Nachtfenster arbeitet (Art. 21 Ustawa o czasie pracy kierowców), ist der Albtraum polnischer Disponenten – Klacks löst dieses Problem elegant.

---

### Gesamturteil

**GESAMT: einverstanden**

*Begründung:* Bis auf die Richtigstellung der kumulierenden Nacht-/Überstundenzuschläge auf der Security-Seite und die Eszett-Korrekturen bieten diese Texte eine unschlagbare, rechtssichere Verkaufsargumentation für den polnischen Markt.
[agent] run fddccbae-ff30-44ab-8a23-cc155a8e1005 ended with stopReason=stop

---
## Umsetzung (Haupt-Session, 2026-07-15)
Orthografie-Punkte durch den site-weiten ß-Sweep umgesetzt. Security-Punkt (kumulative Zuschläge nach Art. 151 § 8 KP): Ottos Befund der Inkonsistenz ist berechtigt, sein Formulierungsvorschlag („werden gesetzeskonform kumuliert") wäre aber ein falsches Produktversprechen — die Klacks-Engine kumuliert nicht (highest wins, siehe mapping-pl.md/Code-Inventur). Umgesetzt wurde die ehrliche Auflösung: Klacks weist Zuschläge automatisch zu und dokumentiert jede zuschlagspflichtige Stunde einzeln; die gesetzlich geforderte kumulative Berechnung nimmt die Lohnabrechnung auf dieser Stundenbasis vor. Der falsche „höchster Satz"-Satz (der das Engine-Verhalten als gesetzeskonforme Lösung darstellte) wurde entfernt. Otto-Urteil: einverstanden (nach Korrektur). ABGENOMMEN.
