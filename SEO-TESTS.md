# SEO-Tests (manuell / curl)

Diese Tests prüfen die SEO/GEO-Endpoints des laufenden Marketing-Servers.

## Test-Befehle

```bash
BASE=https://klacks-software.ch

# 1. llms.txt — muss Industries-Abschnitt enthalten
curl -s "$BASE/llms.txt" | grep -c "Industries"       # soll >= 1
curl -s "$BASE/llms.txt" | grep -ci "homecare"        # soll >= 1
curl -s "$BASE/llms.txt" | grep -ci "hospitality"     # soll >= 1

# 2. llms-full.txt — muss detaillierte Branchen haben
curl -s "$BASE/llms-full.txt" | grep -c "### Homecare"   # soll 1
curl -s "$BASE/llms-full.txt" | grep -c "### Security"   # soll 1
curl -s "$BASE/llms-full.txt" | grep -c "Custom Industries"  # soll 1

# 3. robots.txt — muss alle AI-Crawler enthalten
curl -s "$BASE/robots.txt" | grep -c "GPTBot"          # soll 1
curl -s "$BASE/robots.txt" | grep -c "Google-Extended"  # soll 1
curl -s "$BASE/robots.txt" | grep -c "Amazonbot"        # soll 1

# 4. JSON-LD auf Branchen-Seite — muss FAQPage enthalten
curl -s "$BASE/en/land-gb/spitex" | grep -c "FAQPage"  # soll 1
curl -s "$BASE/en/land-gb/spitex" | grep -c "application/ld+json"  # soll >= 1
```

## Erwartete Ergebnisse

| Test | Soll |
|---|---|
| llms.txt enthält "Industries" | Ja |
| llms.txt enthält "homecare" | Ja |
| llms.txt enthält "hospitality" | Ja |
| llms-full.txt enthält "### Homecare / Spitex" | Ja |
| llms-full.txt enthält "### Custom Industries" | Ja |
| robots.txt enthält "GPTBot" | Ja |
| robots.txt enthält "Google-Extended" | Ja |
| robots.txt enthält "Amazonbot" | Ja |
| /en/land-gb/spitex enthält "FAQPage" | Ja |
| /en/land-gb/spitex enthält "application/ld+json" | Ja |
