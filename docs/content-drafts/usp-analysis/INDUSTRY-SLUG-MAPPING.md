# Branchen-Slug-Mapping: Marketing ↔ Region-Setup

Kurze Referenz, welcher Marketing-Branchen-Slug welchem `region-setup.json`
`industryProfiles`-Slug entspricht. Ausführliche technische Doku (Schema,
Beispiele, Import-Semantik) steht in
`Klacks.Api/deploy/onprem/regions/README.md`, Abschnitt „Canonical industry
slugs".

Owner-Entscheid: Die Setup-Slugs bleiben englisch. Die Marketing-Site nutzt
eigene, Schweizerdeutsch geprägte Slugs für ihr Routing
(`Klacks.Marketing/Localization/CountryIndustries.cs`) — beide Seiten sind
über die folgende Tabelle fest verdrahtet, nicht identisch benannt.

| Marketing-Slug | Setup-Slug (`industryProfiles.<slug>`) | Branche |
| --- | --- | --- |
| `spitex` | `homecare` | Ambulante Pflege / Spitex |
| `spitaeler` | `healthcare` | Spitäler / Kliniken (stationär) |
| `security` | `security` | Sicherheitsdienste (Bewachung, Überwachung) |
| `hausdienste` | `facility` | Hausdienste / Reinigung, Gebäudeservice |
| `logistik` | `logistics` | Logistik (Lager, Transport) |

## Verwendung

- Die 30 Länderseiten der Marketing-Site (`CountryIndustries.cs`) nutzen die
  linke Spalte für Routing/i18n-Keys (`industries.<slug>.title/text`).
- `region-setup.json`-Profile (z. B. `deploy/onprem/regions/de.json`) nutzen
  die rechte Spalte als Key im `industryProfiles`-Dictionary.
- Die Keys sind technisch frei wählbar (der Importer akzeptiert jeden
  String), aber alle bisher gebauten Content-Packs und künftige
  Länderprofile verwenden ausschliesslich die fünf kanonischen Setup-Slugs
  aus der rechten Spalte — neue Profile sollten dieselben Slugs
  wiederverwenden, damit Länderprofile untereinander vergleichbar bleiben.
- `security` ist zufällig auf beiden Seiten identisch benannt; das ist Zufall
  (kürzestmögliches Wort in beiden Sprachen), keine Regel.
