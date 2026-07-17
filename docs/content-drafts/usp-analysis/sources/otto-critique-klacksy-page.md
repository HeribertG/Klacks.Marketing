# Otto-Kritik: /klacksy-Produktseite (2026-07-17)

Session: `OTTO_SESSION=klacksy-page-critique` via `~/claude-otto-bridge/ask.sh`.
Zielgruppe laut Auftrag: Planungsverantwortliche/Admins ohne KI-Vorwissen.

Vollständiger Prompt (mit dem kompletten de-Text und den 4 verbindlichen Fakten
aus `docs/knowledge/klacksy-scenario-usp-and-klacksy-page-2026-07-16.md`, Teil 2)
und Ottos volle Antwort liegen als Rohdaten unter
`/tmp/claude-1000/.../scratchpad/otto-klacksy-request.txt` und
`otto-klacksy-response.txt` (nicht Teil des Repos, hier zusammengefasst).

## Ottos Antwort — Kernpunkte

1. Hero: „Tonalität, Autonomie, Fachvokabular" seien für KI-Laien zu abstrakt;
   Vorschlag: „Schreibstil"/„Selbstständigkeit"/„hausinterne Begriffe".
2. Challenges-Eyebrow „Das Problem mit generischer KI" zu akademisch; Vorschlag
   „Standard-KI"/„herkömmliche Chatbots". Items 2+3 seien bereits sehr gut.
3. Solutions Punkt 1 (Autonomie): Entwurf unterschlage, dass die Stufen **pro
   Benutzer** einstellbar sind; Stufen nicht greifbar genug benannt.
4. Solutions Punkt 2 (Betriebsregeln per Zuruf): sprachlich sehr gut, „Regel-
   Register" sei ein starker Begriff; optionale Präzisierung „per Zuruf" →
   „per einfacher Texteingabe".
5. Solutions Punkt 3 (Fachvokabular-Training): Vorschlag, den Menüpunkt-Namen
   „Klacksy-Training" explizit zu nennen für Vertrauensbildung.
6. Solutions Punkt 4 (Persönlichkeit): Vorschlag, den Ort in der UI zu nennen
   und den Begriff „Soul-Sections-Editor" zu verwenden.
7. Beispiel: „Vorschlagen & Nachfragen" sei keine echte Stufe; Otto schlägt vor,
   das Beispiel auf Stufe 1 „Assisted" umzustellen. Schlusssatz „Schon heute
   reagiert..." sei zu werblich.
8. **CTA (als „zwingende Korrektur" markiert):** Otto behauptet, das Produkt
   sei „aktuell nicht demo-reif", der Playground-/Installations-CTA sei ein
   „schwerer Vertrauensbruch" und müsse durch ein unverbindliches
   Erstgespräch (Discovery) ersetzt werden.
9. Liefert einen kompletten JSON-Rewrite-Vorschlag mit allen obigen Punkten,
   in Schweizer Rechtschreibung.

## Fakten-Check gegen Code/UI (eigene Recherche, nicht nur Otto vertraut)

Geprüft in `Klacks.Ui/src/assets/i18n/de.json` (echte UI-Labels) und gegen die
4 verbindlichen Fakten aus dem Referenz-Dokument.

| # | Ottos Behauptung | Befund | Urteil |
|---|---|---|---|
| 3 | Stufen sind pro Benutzer einstellbar, Entwurf erwähnt das nicht | Stimmt — Fact #2 bestätigt „pro User einstellbar", Original-Text sagte nur „vier einstellbare Stufen" ohne Personenbezug | **Übernommen** |
| 6 | Der Editor heisst „Soul-Sections-Editor", das sollte im Marketingtext stehen | **Falsch.** `AgentSoulSection`/„Soul Sections" ist ausschliesslich ein interner Klassenname (`agent-soul.interface.ts`, `soul-section-types.ts`). Das sichtbare UI-Label ist durchgehend „Klacksy Persönlichkeit" (`setting.personality.headline`, `settings.assistantPersonality`). Ein Nutzer würde „Soul-Sections-Editor" nirgends in der App finden. | **Abgelehnt** — stattdessen den tatsächlichen UI-Namen „Klacksy Persönlichkeit" verwendet |
| 7 | Beispiel sollte auf Stufe 1 „Assisted" umgestellt werden | **Falsch/unpassend.** UI-Level-Texte: Stufe 0 „Vorschlagen" = „Klacksy schlägt nur vor — jede Änderung braucht deine Bestätigung"; Stufe 1 „Assistiert" = „Umkehrbare Aktionen laufen direkt, alles andere braucht Bestätigung." Der Beispieltext („bereitet Vorschläge vor ... finale Entscheidung liegt immer bei der Leitung") beschreibt exakt Stufe 0, nicht Stufe 1 (die bereits reversible Aktionen selbstständig ausführt). Zusätzlich nutzt Otto den internen Enum-Namen „Assisted" (Englisch) statt des deutschen UI-Labels „Assistiert". | **Abgelehnt** — Beispiel korrigiert auf die tatsächlich passende Stufe „Vorschlagen" (exaktes UI-Label) |
| 8 | Produkt „nicht demo-reif", CTA muss auf Discovery-Gespräch umgestellt werden | **Falsch, widerlegt durch Code/Content.** Der Playground-CTA ist etabliertes, seitenweites Muster: identischer Wortlaut („Testen Sie im Playground ... Kostenlos und ohne Registrierung") erscheint in `index.json` (`getStarted.playground.*`: „Eine öffentliche Klacks-Instanz mit Beispieldaten — direkt im Browser, ohne Installation und ohne Registrierung") sowie auf sämtlichen 30 Länderseiten. Keine Grundlage für „nicht demo-reif". | **Abgelehnt** — CTA unverändert gelassen |
| 1, 2 | Vereinfachung von „Tonalität"/„generische KI" für KI-Laien | Stilistisch plausibel und ohne Faktenrisiko. „Tonalität" ist das einzige Wort der Dreiergruppe, das kein reales UI-Label ist (UI sagt „Tonfall"); „Autonomie" dagegen IST das reale UI-Label (`settings.klacksyAutonomy`) — Ottos Vorschlag „Selbstständigkeit" hätte Marketing/UI auseinanderlaufen lassen. | **Teilweise übernommen**: „Tonalität"→„Tonfall" (Hero + Persönlichkeits-Item); „Autonomie" bewusst NICHT umbenannt; „generische KI"→„Standard-KI" in Challenges-Sektion (Eyebrow, Item 1 Titel, Item 3 Text) für Konsistenz mit dem dort bereits vorhandenen „Standard-Chatbots" |
| 4 | „per Zuruf" → „per einfacher Texteingabe" | Referenz-Dokument nennt das Feature explizit „Betriebsregeln per Zuruf" — das ist der etablierte Produktname der Kachel, nicht nur Zufallsformulierung | **Abgelehnt** — Originalbegriff beibehalten |
| 5 | Menüpunkt „Klacksy-Training" explizit im Text nennen | UI-Label stimmt (`klacksyTraining.title`: „Klacksy Training"), aber kein anderer der vier Solutions-Punkte nennt eine exakte UI-Fundstelle im gleichen Stil — Stilbruch. Ausserdem: Fact #4 betont, dass die Route bewusst unverlinkt/separat ist; keine zwingende Notwendigkeit, das auf einer Marketingseite technisch zu verorten. | **Abgelehnt** (Konsistenz-Entscheid, kein Faktenfehler) |
| 7b | Schlusssatz „Schon heute reagiert..." sei zu werblich | Subjektiv, keine Falschbehauptung | **Abgelehnt** (Geschmacksfrage, Satz beibehalten) |

## Otto-Fehlerbilanz für dieses Feature (kumulativ)

Otto lag bei der Klacksy-Seite jetzt **dreimal** falsch bzw. irreführend:
1. (Vorher dokumentiert) Level-Bedeutung vertauscht.
2. (Vorher dokumentiert) Falscher UI-Pfad für Klacksy-Training.
3. (Diese Runde) Erfundener User-Name „Soul-Sections-Editor" für ein Feature,
   das in der UI nur „Klacksy Persönlichkeit" heisst; unbelegte Behauptung
   „Produkt nicht demo-reif" trotz seitenweit etabliertem, produktivem
   Playground-CTA; falsche Stufe im Beispiel-Fix vorgeschlagen.

Empfehlung für künftige Otto-Runden zu diesem Feature: **jede Detailbehauptung
zu UI-Namen, Pfaden und Stufen-Zuordnung ausnahmslos gegen
`Klacks.Ui/src/assets/i18n/de.json` gegenprüfen**, nicht nur gegen die
Kurzfassung der Fakten im Prompt.

## Tatsächlich in `de/klacksy.json` übernommene Änderungen

- `hero.subtitle`: „Tonalität" → „Tonfall"
- `challenges.eyebrow`: „Das Problem mit generischer KI" → „Das Problem mit Standard-KI"
- `challenges.items[0].title`: „Generische KI kennt Ihre Regeln nicht" → „Standard-KI kennt Ihre Regeln nicht"
- `challenges.items[2].text`: „...versteht eine generische KI nicht" → „...versteht eine Standard-KI nicht"
- `solutions.items[0].text` (Autonomie): „...legen Sie fest..." → „...legen Sie für jeden Benutzer fest..." (macht die Pro-User-Einstellbarkeit explizit, Fact #2)
- `solutions.items[3].text` (Persönlichkeit): nennt jetzt den echten UI-Ort/Namen „Klacksy Persönlichkeit" unter Einstellungen, „Tonalität" → „Tonfall"
- `example.text`: erfundene Pseudo-Stufe „Vorschlagen & Nachfragen" → echtes UI-Label „Vorschlagen" (Stufe 0, fachlich korrekt für den beschriebenen Ablauf)

Nicht übernommen (mit Begründung siehe Tabelle oben): CTA-Umbau, „Soul-Sections-
Editor"-Umbenennung, „per Zuruf"→„per einfacher Texteingabe", explizite
Nennung des Menüpunkts „Klacksy-Training" im Text, Umbenennung
„Autonomie"→„Selbstständigkeit", Streichen des Schlusssatzes im Beispiel.

## Anomalie

Keine fehlerhaften Tool-Aufruf-Artefakte (Discord/SQL o.ä.) in dieser Antwort
beobachtet — Otto blieb diesmal beim Text.

## Status

Änderungen sind in `Localization/Content/de/klacksy.json` eingearbeitet.
Diese finale de-Fassung ist die Grundlage für die Übersetzungen in alle
weiteren Sprachverzeichnisse (siehe Validierungstabelle im Session-Report).
