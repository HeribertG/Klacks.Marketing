# Klacksy-Länderseiten — Pilot DE/PL/IE, Faktenherkunft

Audit-Trail zu `de/land-{de,pl,ie}-klacksy.json` (2026-07-30). Folgt der Pipeline aus
DevKnowledge `331b2548-0367-4b4b-a7ef-efbbcb2a8d42`.

## Anlass

Alle 30 `de/land-XX-klacksy.json` waren byte-identisch (gleiche MD5, kein Ländername im Text)
— Commit `c8f20ac` hatte dieselbe Datei 30-mal abgelegt. Damit verstiessen sie gegen die
Pipeline-Vorgabe „jedes Land seine eigene, aus den landesspezifischen Fakten abgeleitete
Klacks-USP — kein generischer Textbaustein mit ausgetauschtem Ländernamen".

## Faktenherkunft

Alle länderspezifischen Aussagen stammen aus den **bereits faktengeprüften und redaktionell
abgenommenen** Länderseiten desselben Repos, nicht aus neuer Recherche:

| Aussage | Quelle im Repo |
| --- | --- |
| Ruhezeiten nach Arbeitszeitgesetz (DE) | `de/land-de.json` |
| Art. 149 Kodeks pracy — Ewidencja czasu pracy (PL) | `de/land-pl.json`, `de/land-pl-*.json` |
| Art. 132 f. Kodeks pracy — 11 h / 35 h Ruhezeit (PL) | `de/land-pl.json` |
| Art. 22¹b Kodeks pracy — biometrische Daten (PL) | `de/land-pl.json` |
| Datenschutzbehörde UODO, Biometrie-Skepsis (PL) | `de/land-pl.json` |
| równoważny czas pracy (PL) | `de/land-pl.json` |
| Section 17 OWTA — Vorlauffrist Dienstplan (IE) | `de/land-ie.json` |
| Section 18A OWTA — Banded Hours (IE) | `de/land-ie.json` |
| Data Protection Commission (IE) | `de/land-ie.json` |
| Nordirland-Grenzregion, Dundalk (IE) | `de/land-ie.json` |

Einzige **neu recherchierte** Aussage:

- **§ 87 Abs. 1 Nr. 6 BetrVG (DE)** — Mitbestimmung des Betriebsrats bei Einführung
  technischer Einrichtungen, die Verhalten oder Leistung überwachen können; gilt nach
  einhelliger Darstellung auch für KI-Systeme. Verifiziert per Websuche gegen den Normtext auf
  `gesetze-im-internet.de` sowie mehrere anwaltliche Fachdarstellungen.
  Verdikt: **BESTÄTIGT**.

## Bewusst gestrichen

- **EU-AI-Act-Fristen.** Die Quellenlage war zum Prüfzeitpunkt widersprüchlich: eine
  TÜV-Darstellung führte den 2. August 2026 noch als verbindlichen Stichtag für Anhang III
  („noch kein beschlossener Rechtsakt"), eine Meldung vom 3. Juli 2026 berichtete dagegen die
  bereits erfolgte Verschiebung auf den 2. Dezember 2027 durch das Digital-Omnibus-Paket
  (EP 16. Juni 2026, Rat 29. Juni 2026).
  Verdikt: **NICHT EINDEUTIG VERIFIZIERBAR ⇒ Behauptung gestrichen**, nicht abgeschwächt
  übernommen (Pipeline-Regel). Auf den Seiten steht kein Datum und keine Frist.
- **Jede Aussage über einen Konformitätsstatus von Klacks.** Weder „AI-Act-konform" noch
  „kein Hochrisiko-System". Ob ein Planungsassistent unter Anhang III Nr. 4
  (Beschäftigung/Personalmanagement) fällt, ist eine Rechtsfrage über das eigene Produkt und
  auf einer Marketingseite nicht zu beantworten.

## Formulierungsregel

**Produkteigenschaften behaupten, keine Rechtsfolgen.** Die nationale Regelung wird *benannt*
(„ist nach § 87 … mitbestimmungspflichtig", „Section 17 OWTA verlangt einen Mindest-Vorlauf"),
und dem gegenübergestellt, was Klacks *tut* (Autonomie-Stufen, Regel-Register,
Ruhezeitprüfung in der Regelmaschine, lokales Modell). Nirgends wird daraus abgeleitet, dass
Klacks eine Rechtspflicht erfüllt.

## Nachkontrolle

- JSON-Validität: OK (alle 3)
- Key-Parität gegen `git show HEAD:` der Vorfassung: identisch, keine fehlenden/zusätzlichen Keys
- Escaping-Sweep: 0 Verstösse (`&mdash;`, `&bdquo;`/`&ldquo;`, `&amp;` als Entities; `§`, `¹`
  direkt als UTF-8 — Bestandskonvention)
- Screenshots: `app-klacksy-de.png` (erlaubtes Asset; die Vorfassung nutzte
  `app-schedule-de.png`, was auf der Klacksy-Seite die falsche Ansicht zeigte)
- `showRoutePlanning`: `false` (Konvention für branchenneutrale Seiten)
- Differenzierung: DE↔PL 11,9 %, DE↔IE 16,2 %, PL↔IE 16,5 % Textähnlichkeit
  (Vorzustand: 100,0 % — byte-identisch)

## Ergebnis des Differenzierungstests

Die offene Frage vor dem Pilot war, ob 16 EU-Länder mit gemeinsamem Recht (DSGVO, AI Act)
überhaupt unterscheidbare Klacksy-Seiten hergeben. Antwort: **ja, aber nicht über die
KI-Regulierung.** Der EU-Rahmen ist überall gleich; die Differenzierung kommt aus dem
nationalen Arbeitsrecht, und dort ist sie deutlich:

- DE — betriebliche Mitbestimmung (§ 87 BetrVG): der Assistent muss erklärbar sein
- PL — Ewidencja czasu pracy und Biometrie-Vermeidung (Art. 22¹b)
- IE — Vorlauffristen und Banded Hours (Section 17/18A OWTA)

Für die verbleibenden 27 Länder ist damit belegt, dass der Ansatz trägt, **sofern** die
jeweilige Länderseite einen vergleichbar konkreten arbeitsrechtlichen Aufhänger enthält. Das
ist vor dem Schreiben je Land zu prüfen; wo er fehlt, ist der generische Fallback ehrlicher als
ein konstruierter Unterschied.
