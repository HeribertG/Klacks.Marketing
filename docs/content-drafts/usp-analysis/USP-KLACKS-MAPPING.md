# USP → Klacks-Fähigkeit — Erfüllungs-Liste

**Zweck:** Für jede Länder-/Branchenseite prüfen, ob die dort versprochene USP durch eine **echte** Klacks-Fähigkeit gedeckt ist (kein Überversprechen). Ehrlichkeits-Check.

**Methode:** Sonnet-Subagenten extrahieren die USP-Versprechen je Seite (`usp-<xx>.md`); Bewertung gegen die Capability-Inventur aus echtem Code (`klacks-capabilities.md`). Dieses Dokument wird **inkrementell** befüllt und nach jedem Land gespeichert.

**Legende:** ✅ voll erfüllt · ⚠️ teilweise / mit Vorbehalt · ❌ Lücke (Klacks kann das (noch) nicht) · 🔎 Verifikation gegen Capability-Inventur ausstehend

**Status:** ✅ FERTIG — Capability-Inventur (`klacks-capabilities.md`), 25× USP-Extraktion (`usp-<xx>.md`), 25× Länder-Bewertung (`mapping-<xx>.md`), Master-Übersicht unten.

---

## Generische USP-Muster → Klacks-Fähigkeit (Backbone, gegen Code-Inventur bewertet)

Diese Muster tragen praktisch jede Länder-USP. Verdikt basiert auf `klacks-capabilities.md` (echter Code):

| USP-Muster (kommt in fast jedem Land vor) | Deckende Klacks-Fähigkeit | Status |
|---|---|---|
| Gestufte Zuschläge (Wochenende, Feiertag; z.B. 1,5×/2,0×/3,0×) automatisch korrekt zuweisen | Typisierte Zuschläge: 5 Kategorien (Nacht, 3× Wochenende, Feiertag), Sätze als Multiplikatoren konfigurierbar | ✅ für Standardfälle |
| Nachtzuschlag mit landesspezifischem Zeitfenster (22–04 AE, 22–05 JP, 22–06 IL/KR …) | Nacht-Zuschlagstyp | ⚠️ **Nachtfenster ist im Code hart 23:00–06:00** (kein Setting) → abweichende Fenster nicht abgebildet; Formulierung nicht auf ein exaktes Fenster festnageln |
| Kumulierte/gestapelte Zuschläge (Überstunde + Nacht) bzw. Überstunden-**Prämie** | Typisierte Zuschläge | ⚠️ **kein Stacking — „höchster Satz gewinnt"**, und **kein eigener Überstunden-Zuschlagstyp**. (Löst den PL↔BE-Widerspruch: BE-Spitäler „nur höchster" ist korrekt, **PL-Security „kumulativ" ist falsch** → korrigieren) |
| Landesspezifische Arbeitszeit-/Ruhezeit-Grenzwerte hinterlegen (ohne Codeänderung) | Konfigurierbare Grenzwert-Engine (`SchedulingRule → Contract → Settings → Default`) + Kalender-DSL für Feiertage pro Land/Staat | ✅ voll erfüllt |
| Datensouveränität: Personal-/Planungsdaten bleiben im Land / im Haus, KI lokal | On-Premise/Self-Hosting (kompletter Docker-Stack lokal), keyless lokales LLM + self-hosted Whisper, DSGVO-Löschung/Retention/Verschlüsselung | ✅ voll erfüllt |
| Planung per Sprache / KI-Assistent | Klacksy (250 Skills, Rezept-Engine, Voice STT/TTS, 25 UI-Sprachen inkl. RTL) | ✅ voll erfüllt |
| Automatische Dienstplan-/Tourenerstellung | Schedule-Optimizer / Autofill | ✅ voll erfüllt |
| Wegzeit zwischen Einsätzen als Arbeitszeit + Tourenoptimierung (Spitex) | Echte Geo-Tourenoptimierung (OSRM/OpenRouteService/Nominatim + ACO + Turn-by-turn/Leaflet), Wegzeit als bezahlte Arbeitszeit | ✅ voll erfüllt |
| Ruhezeiten zwischen Schichten / wöchentliche Ruhe / freie Sonntage / gestufte Ruhetage | Regel-Engine (Ruhezeit-, Wochenruhe-, freier-Sonntag-, n-ter-Wochentag-Regeln) | ✅ (Tages-/Wochenlogik); ⚠️ komplexe Sonderzyklen ggf. nur teilweise |
| Qualifikations-/Lizenz-gerechte Einsatzzuteilung | Qualifikations-Matching (**exakt/diskret**) | ⚠️ erfüllt für exakte Zuordnung; **kein Fuzzy-Match**, und abgelaufene Pflicht-Qualifikation **blockiert die Zuteilung NICHT** |
| **Harte Höchstarbeitszeit / Überstunden-Cap live „sperren/blockieren" (v.a. Monats-/Jahreswerte)** | Live-Compliance-**Warnungen** (SignalR + Pre-Commit + Periodenabschluss) | ⚠️ **wichtig:** Klacks **warnt**, **blockiert das Speichern NIE**; Monats-/Jahres-`MaximumHours` werden **nicht durchgesetzt**. „live überwachen/warnen" ✅ — „hart sperren/erzwingen" ❌. Formulierung anpassen: *warnen/sichtbar machen*, nicht *verhindern* |
| **Biometrische/RFID/Stempeluhr-Zeiterfassung, deren Daten On-Premise bleiben** | — | ❌ **Lücke:** Klacks hat **keine Biometrie, keine Stempeluhr/Terminal/Kiosk, kein NFC/RFID, kein Live-GPS**. Zeiterfassung ist rein manuell/planungsbasiert. On-Premise gilt für *Planungs-/Personaldaten*, nicht für *biometrische Erfassung* (die es nicht gibt). USPs mit „biometrischer Zeiterfassung"/„RFID-Nachweis" **umformulieren oder streichen** |
| Landesspezifischer Lohn-Export / Payroll (Asien/Nahost) | Payroll-Packs = Export-Formatter | ❌ **Lücke:** keine echte Lohnbuchhaltung; nur DE/DATEV (MVP), **keine Asien-Packs**, Nahost nur punktuell (IL/AE). Nicht als „Lohnabrechnung" behaupten |
| Vollständiger, gerichtsfester Arbeitszeit-**Nachweis** (z.B. IL Amendment 24, JP) | Work-Records (planungs-/manuell erfasst) | ⚠️ Klacks liefert eine dokumentierte Planungs-/Zeitbasis, aber **keinen verifizierten Clock-in** (keine Stempelung/Biometrie). Als „lückenlose Dokumentation der geplanten/erfassten Zeiten" ehrlich, nicht als „manipulationssicherer Stempelnachweis" |

**Kernaussage (ehrlich):** Klacks' Compliance-/Regel-/Zuschlags-/On-Premise-/Klacksy-USPs sind **voll gedeckt** — das ist der belastbare Kern fast jeder Länderseite. **Drei wiederkehrende Überversprechen** sind zu entschärfen: (1) „hartes Sperren/Erzwingen" von Caps → Klacks **warnt** nur, blockiert nie, Monats-/Jahres-Caps nicht durchgesetzt; (2) „biometrische/RFID-Zeiterfassung" → existiert nicht (nur On-Premise-Hosting der Planungsdaten); (3) länderspezifische „Lohnabrechnung" ausserhalb DE → nur Export-Formatter, keine Asien-Packs.

---

---

## Länder-Mapping — Ergebnis (25 Länder bewertet)

Detail je Land in `mapping-<xx>.md` (USP-Versprechen → Klacks-Fähigkeit → ✅/⚠️/❌ → Anmerkung). Summe der Verdikte über alle 25 Länder (~906 USP-Zeilen): **~620 ✅ · ~274 ⚠️ · 12 ❌**. Kein Land hat einen tragenden USP, der komplett unhaltbar wäre — die ⚠️ sind überwiegend **Umformulierungen** (Enforcement→Monitoring), die 12 ❌ sind eng umrissene Falschversprechen (Biometrie/RFID/länderspezifische Payroll-Quoten).

> Hinweis zu den ⚠️-Zahlen: verschiedene Bewerter-Agenten haben die „hart-sperren→warnen"-Regel unterschiedlich streng gezählt (Block-A-EU tendenziell mehr ⚠️). Die Richtung ist eindeutig, die absoluten ⚠️-Zahlen sind nur indikativ.

| Land | ✅ | ⚠️ | ❌ | Grösstes Risiko / Umformulierungs-Bedarf |
|---|--:|--:|--:|---|
| 🇦🇪 AE | 16 | 18 | 1 | Biometrie-On-Prem (❌); Mittagsverbot/144h-3-Wo-Cap „erzwungen"→warnen |
| 🇸🇦 SA | 20 | 17 | 4 | Biometrie, Nitaqat/GOSI-Quote, Mindestlohn-Doku (❌); Art.101-„sperren"→warnen |
| 🇮🇱 IL | 19 | 16 | 1 | Biometrie (❌); Amendment-24-Nachweis = Planungsbasis, kein Stempel-Clock-in |
| 🇯🇵 JP | 25 | 10 | 0 | 36協定/960h Jahres-Cap nur sichtbar machen; Nachtfenster 22–05 ≠ 23–06 |
| 🇰🇷 KR | 25 | 9 | 2 | RFID-NHIS + Biometrie (❌); „kumuliert bis 200%" (kein Stacking) |
| 🇨🇳 CN | 16 | 20 | 1 | Biometrie (❌); 综合计算工时-Zyklusaggregation + 36h/Monat nur teilweise |
| 🇹🇼 TW | 32 | 4 | 0 | sehr sauber; 休息日-Staffel voll gedeckt |
| 🇲🇾 MY | 33 | 3 | 0 | sehr sauber; Biometrie nur im On-Prem-Satz eingebettet (umformulieren) |
| 🇮🇩 ID | 32 | 3 | 0 | sehr sauber; Security-12h „harte Sperre"→warnen |
| 🇹🇭 TH | 28 | 8 | 0 | 36h-Wochen-Cap durchgängig „hart gesperrt"→warnen |
| 🇻🇳 VN | 31 | 5 | 0 | 3-Stufen-Cap (Monats-/Jahreswerte) nur sichtbar machen |
| 🇧🇪 BE | 14 | 19 | 3 | Mahlzeitscheck + 240h-Steuerfreigrenze + ÜStd-Steuerbefreiung (❌ Payroll) |
| 🇬🇧 GB | 19 | 17 | 0 | 17-Wochen-Schnitt/Publikationsfrist nur warnen; „keine Biometrie" = ✅ ehrlich |
| 🇮🇪 IE | 21 | 16 | 0 | 24h-Ankündigungsfrist nicht als Regel; Caps→warnen |
| 🇳🇴 NO | 22 | 14 | 0 | 14-Tage-Frist nicht gedeckt; Caps→warnen |
| 🇵🇱 PL | 22 | 14 | 0 | **PL-Security „kumulative Zuschläge" faktisch falsch** (highest-wins) → korrigieren |
| 🇵🇹 PT | 21 | 15 | 0 | banco de horas 150h/registo de ponto nur warnen |
| 🇷🇴 RO | 19 | 17 | 0 | „12h erzwungen"/Teilzeit-ÜStd-„verhindert"→warnen |
| 🇨🇿 CZ | 31 | 5 | 0 | sehr sauber |
| 🇩🇰 DK | 25 | 11 | 0 | Fritvalg-Sparkonten (Payroll), Varsko-Prämie, holddrift-Sonderzyklus |
| 🇪🇸 ES | 32 | 4 | 0 | sehr sauber; „registro de jornada ohne Biometrie" = ✅ ehrlich |
| 🇫🇮 FI | 34 | 2 | 0 | am saubersten; nur feste €/h-Zuschläge (Multiplikator-Konflikt) |
| 🇬🇷 GR | 24 | 12 | 0 | **riskantest:** 10.500-€-Bussgeld-Garantie braucht ERGANI-II + Clock-in → Formel streichen |
| 🇳🇱 NL | 28 | 9 | 0 | „keine Biometrie" = ✅ ehrlich; Oproep-/ORT-Fristen teils nur warnen |
| 🇸🇪 SE | 31 | 6 | 0 | dygnsvila-Sonderzyklus „automatisch"→teilweise/konfigurierbar |

### Top-Umformulierungen für die Redaktion (nach Häufigkeit × Risiko)

1. **Caps „hart sperren/erzwingen/gar nicht einplanen" → „live überwachen / sichtbar machen / warnen".** Klacks blockiert das Speichern NIE; Monats-/Jahres-Caps werden nicht ausgewertet (Tages-/Wochen-/Konsekutiv-Caps sind GA-Vetos + Warnung). Betrifft fast jedes Land.
2. **„Biometrische/RFID/Stempel-Zeiterfassung, deren Daten On-Premise bleiben" → „On-Premise-Hosting der Planungs-/Personaldaten".** Klacks hat keine Biometrie/RFID/Stempeluhr/GPS. Die 12 ❌ hängen fast alle hier (AE/SA/IL/KR/CN + KR-RFID). GB/NO/PL/ES/NL/SE nutzen „**ohne** Biometrie" bereits korrekt als Positiv-Argument.
3. **GR:** Die „ohne Risiko der 10.500-€-Busse"-Garantie streichen/umformulieren („liefert die dokumentierte Zeitbasis für die ERGANI-Meldung") — Klacks hat keine ERGANI-II-Anbindung und keinen verifizierten Clock-in.
4. **PL-Security:** „kumulative Zuschläge (Überstunde + Nacht)" ist gegen die Engine (highest-wins) **falsch** → korrigieren; BE-Spitäler „nur höchster" bleibt korrekt.
5. **Nachtzuschlag-Fenster** nicht auf ein exaktes landesspezifisches Fenster festnageln (Code fix 23:00–06:00); **abgelaufene Pflicht-Qualifikation** „blockiert Zuteilung" → nur „warnt vor Ablauf".
6. **BE Payroll-Benefits** (Mahlzeitschecks, Steuerfreigrenzen) und **DK Fritvalg-Sparkonten**: keine Lohnbuchhaltung → als Planungs-/Zuschlags-Feature framen, nicht als Payroll.

### Was durchgängig ehrlich trägt (belastbarer Kern jeder Seite)

On-Premise-Datensouveränität + lokale KI · typisierte Zuschläge (Standardfälle) · konfigurierbare Tages-/Wochen-Grenzwerte mit Warnung · Feiertags-/Ruhezeit-/freie-Sonntag-Regeln · echte Geo-Tourenoptimierung + Wegzeit als bezahlte Arbeitszeit (Spitex) · Autofill/GA · Klacksy (Sprache/Skills, 25 Sprachen inkl. RTL) · exaktes Qualifikations-Matching.
