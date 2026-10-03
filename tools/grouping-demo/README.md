# Grouping demo database

`klacks_marketing_grouping` is a dedicated PostgreSQL database for the marketing videos that show the
address-based grouping of employees. It is derived from `klacks_marketing_demo` (never modified) and contains:

- an empty group tree (no groups, no memberships, no group visibility, no scenarios),
- exactly 69 active employees (type 0) with one current Employee address each (real WGS84 coordinates,
  zip, state, country `CH`); every other client is soft-deleted,
- 5 qualifications (Brandschutz, Staplerschein, HACCP, Pflegeassistenz SRK, FaGe - all with names in 25
  languages) held by those 69 employees, 1-3 each, level 3 (Proficient), valid from 2025-01-01, no end date.

The 12 former members of the group `Winterthur` of the source database are all kept, in Winterthur.
The other 57 are drawn deterministically from employees whose old address was in the same canton.

## Rebuild

```powershell
cd C:\SourceCode\Klacks.Marketing\tools\grouping-demo
.\build-grouping-demo.ps1            # PostgreSQL 17 on localhost:5434, user postgres, password admin
```

The script dumps the source database (`pg_dump -Fc`), drops and recreates the target (aborts if anything is
connected to it), restores, and applies reset, curation and qualifications in one transaction. Parameters:
`-SourceDb`, `-TargetDb` (must start with `klacks_marketing_`, never `klacks_marketing_demo`), `-PgHost`, `-Port`,
`-User`, `-Password`.

To get back to the "no groups" state after a take: `psql -1 -v ON_ERROR_STOP=1 -d klacks_marketing_grouping -f reset-groups.sql`.

## Employees per place (69)

| State | Place | Employees |
|-------|-------|-----------|
| ZH | Winterthur | 14 |
| ZH | Seuzach | 5 |
| ZH | Wiesendangen | 5 |
| ZH | Elsau | 3 |
| ZH | Hettlingen | 2 |
| ZH | Zürich | 20 |
| ZH | Dietikon | 3 |
| ZH | Schlieren | 3 |
| BE | Bern | 6 |
| BE | Köniz | 3 |
| VD | Lausanne | 5 |

Winterthur area = Winterthur + Seuzach + Wiesendangen + Elsau + Hettlingen (29 people).

## Expected tree

State/cluster grouping with the `address_cluster` rule (a city is its own center from a 10% share of its
state's addresses, the largest always):

- ZH (55): centers Zürich (20 = 36%) and Winterthur (14 = 25%); Seuzach and Wiesendangen (5 each = 9.1%) stay
  below 10% and attach to Winterthur, as do Elsau and Hettlingen (nearest center); Dietikon and Schlieren attach to Zürich.
- BE (9): centers Bern (6) and Köniz (3 = 33%).
- VD (5): center Lausanne.

Inside the Winterthur cluster (Winterthur area, 29 people) the sub-cluster rule (about 15% of the cluster's
addresses and at least 3 people) yields Seuzach (5 = 17%) and Wiesendangen (5 = 17%) as sub-clusters; Elsau
(3 = 10%) and Hettlingen (2 = 7%) are too small and attach geographically.

## Qualifications

Every employee holds 1-3 of the 5 qualifications; inside the Winterthur area every qualification has at least
3 holders. Assignment is by position (see the script), so rebuilds give the same counts.
