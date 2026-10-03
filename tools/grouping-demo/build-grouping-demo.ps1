# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

# Rebuilds the dedicated grouping demo database klacks_marketing_grouping from klacks_marketing_demo.
# Idempotent: the target is dropped and recreated on every run (aborts when something is connected to it).
# The source database is only read (pg_dump), never modified.
#
# Usage: .\build-grouping-demo.ps1 [-SourceDb klacks_marketing_demo] [-TargetDb klacks_marketing_grouping]
#        [-PgHost localhost] [-Port 5434] [-User postgres] [-Password admin] [-PgBin 'C:\Program Files\PostgreSQL\17\bin']
#
# Steps: 1. dump + restore  2. reset groups (reset-groups.sql)  3. keep 69 curated employees with Swiss addresses,
#        soft-delete every other client  4. assign 5 qualifications.
# Steps 2-4 run in one transaction.

param(
    [string]$SourceDb = 'klacks_marketing_demo',
    [string]$TargetDb = 'klacks_marketing_grouping',
    [string]$PgHost = 'localhost',
    [int]$Port = 5434,
    [string]$User = 'postgres',
    [string]$Password = 'admin',
    [string]$PgBin = 'C:\Program Files\PostgreSQL\17\bin'
)

$ErrorActionPreference = 'Stop'
$env:PGPASSWORD = $Password
$env:PGCLIENTENCODING = 'UTF8'

if ($TargetDb -notmatch '^klacks_marketing_' -or $TargetDb -eq $SourceDb -or $TargetDb -eq 'klacks_marketing_demo') {
    throw "Refusing to rebuild '$TargetDb': the target must start with 'klacks_marketing_' and differ from the source and from klacks_marketing_demo."
}

$psql = Join-Path $PgBin 'psql.exe'
$pgDump = Join-Path $PgBin 'pg_dump.exe'
$pgRestore = Join-Path $PgBin 'pg_restore.exe'
$conn = @('-h', $PgHost, '-p', $Port, '-U', $User)
$here = $PSScriptRoot
$work = Join-Path ([IO.Path]::GetTempPath()) 'klacks-grouping-demo'
New-Item -ItemType Directory -Force $work | Out-Null

function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$([IO.Path]::GetFileName($Exe)) failed with exit code $LASTEXITCODE" }
}

$qualificationIds = @(
    '78310b09-3a61-483f-b1bd-e69a761ca207', # Brandschutz
    '6ae94cd1-78e5-42a2-870c-54f4ddbfb9cd', # Staplerschein
    'b9543ec0-6281-4161-b0f8-7f036d48ddae', # HACCP (Lebensmittellogistik)
    '53d33bd0-cd52-48e9-ac0e-618bc94760c7', # Pflegeassistenz SRK
    '72a86d8b-fc16-49da-b5d9-e6feee81c329'  # Fachfrau/-mann Gesundheit (FaGe)
)
$qualificationValues = (0..4 | ForEach-Object { "($_, '$($qualificationIds[$_])'::uuid)" }) -join ",`n  "

# ---------------------------------------------------------------- 1. dump + restore
$connected = & $psql @conn -d postgres -t -A -c "select count(*) from pg_stat_activity where datname = '$TargetDb'"
if ($LASTEXITCODE -ne 0) { throw 'Cannot query pg_stat_activity.' }
if ([int]$connected -gt 0) { throw "Database '$TargetDb' has $connected open connection(s); stop the backend using it first." }

$dumpFile = Join-Path $work 'source.dump'
Write-Host "Dumping $SourceDb ..."
Invoke-Native $pgDump (@('-Fc', '-d', $SourceDb, '-f', $dumpFile) + $conn)

Write-Host "Recreating $TargetDb ..."
Invoke-Native $psql (@('-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', "DROP DATABASE IF EXISTS `"$TargetDb`"", '-c', "CREATE DATABASE `"$TargetDb`"") + $conn)
Invoke-Native $pgRestore (@('--no-owner', '--no-privileges', '-d', $TargetDb, $dumpFile) + $conn)

# ---------------------------------------------------------------- 2-4. curate
$head = @'
-- Capture the former "Winterthur" employees and the replacement pool BEFORE groups and addresses change.
create temp table keep_winterthur as
select distinct gi.client_id
from group_item gi
join "group" g on g.id = gi.group_id
join client c on c.id = gi.client_id
where g.name = 'Winterthur' and not gi.is_deleted and gi.client_id is not null and c.type = 0 and not c.is_deleted;

do $$ begin
  if (select count(*) from keep_winterthur) <> 12 then
    raise exception 'Expected 12 former Winterthur employees, found %', (select count(*) from keep_winterthur);
  end if;
end $$;

create temp table emp_pool as
select c.id as client_id, upper(a.state) as old_state,
       row_number() over (partition by upper(a.state) order by md5(c.id::text)) as rn
from client c
join lateral (
  select x.state from address x
  where x.client_id = c.id and not x.is_deleted
  order by (x.type = 0) desc, x.valid_from desc limit 1
) a on true
where c.type = 0 and not c.is_deleted
  and c.id not in (select client_id from keep_winterthur)
  and upper(a.state) in ('ZH', 'BE', 'VD');

'@

$tail = @"

-- ------------------------------------------------------------------ curated employees
create temp table spec (
  ord int, city text, state text, n int, zips text[], streets text[],
  lat double precision, lon double precision, jitter double precision
);
insert into spec values
 (1,  'Winterthur', 'ZH', 14, array['8400','8401','8404','8405','8406'],
      array['Technikumstrasse','Stadthausstrasse','Zürcherstrasse','Tössfeldstrasse','Rudolfstrasse','Schaffhauserstrasse','Römerstrasse'],
      47.4988, 8.7237, 0.008),
 (2,  'Seuzach', 'ZH', 5, array['8472'], array['Hauptstrasse','Bahnhofstrasse','Oberwiesenstrasse','Hohlandstrasse'], 47.5357, 8.7286, 0.003),
 (3,  'Wiesendangen', 'ZH', 5, array['8542'], array['Dorfstrasse','Hauptstrasse','Oberdorfstrasse','Schulhausstrasse'], 47.5125, 8.7650, 0.003),
 (4,  'Elsau', 'ZH', 3, array['8352'], array['Schulstrasse','Dorfstrasse','Räterschenerstrasse'], 47.4547, 8.7867, 0.003),
 (5,  'Hettlingen', 'ZH', 2, array['8442'], array['Bahnhofstrasse','Dorfstrasse'], 47.5280, 8.6850, 0.002),
 (6,  'Zürich', 'ZH', 20, array['8001','8002','8003','8004','8005','8006','8032','8037','8050'],
      array['Tellstrasse','Birmensdorferstrasse','Sonneggstrasse','Langstrasse','Bahnhofstrasse','Rämistrasse','Seestrasse','Hardstrasse'],
      47.3769, 8.5417, 0.012),
 (7,  'Dietikon', 'ZH', 3, array['8953'], array['Bremgartnerstrasse','Zürcherstrasse','Kirchstrasse'], 47.4017, 8.4008, 0.004),
 (8,  'Schlieren', 'ZH', 3, array['8952'], array['Badenerstrasse','Uitikonerstrasse','Bahnhofstrasse'], 47.3967, 8.4478, 0.004),
 (9,  'Bern', 'BE', 6, array['3005','3006','3007','3008','3011','3012'],
      array['Länggassstrasse','Laupenstrasse','Effingerstrasse','Marktgasse','Muristrasse'], 46.9480, 7.4474, 0.008),
 (10, 'Köniz', 'BE', 3, array['3098'], array['Schwarzenburgstrasse','Landorfstrasse','Weiermattstrasse'], 46.9244, 7.4144, 0.004),
 (11, 'Lausanne', 'VD', 5, array['1003','1004','1005','1006','1007'],
      array['Rue de Bourg','Avenue de Cour','Rue Centrale','Avenue de Rhodanie','Chemin de Montolieu'], 46.5197, 6.6323, 0.008);

create temp table slot as
select s.city, s.state, s.ord, g.n as slot_no,
       row_number() over (order by s.ord, g.n) as seq,
       s.zips, s.streets, s.lat, s.lon, s.jitter
from spec s cross join lateral generate_series(1, s.n) as g(n);

-- Slots 1-12 (the first 12 of the 14 Winterthur slots) take the former Winterthur employees; the rest are
-- drawn from the pool of employees whose old address was in the same canton.
create temp table keep_ranked as
select client_id, row_number() over (order by md5(client_id::text)) as rn from keep_winterthur;

create temp table assign as
select k.client_id, s.city, s.state, s.ord, s.slot_no, s.seq, s.zips, s.streets, s.lat, s.lon, s.jitter
from slot s join keep_ranked k on k.rn = s.seq
where s.seq <= 12
union all
select p.client_id, s.city, s.state, s.ord, s.slot_no, s.seq, s.zips, s.streets, s.lat, s.lon, s.jitter
from (select sl.*, row_number() over (partition by sl.state order by sl.seq) as srn from slot sl where sl.seq > 12) s
join emp_pool p on p.old_state = s.state and p.rn = s.srn;

do `$`$ begin
  if (select count(*) from assign) <> 69 then
    raise exception 'Expected 69 curated employees, got %', (select count(*) from assign);
  end if;
end `$`$;

delete from address where client_id in (select client_id from assign);

insert into address (id, client_id, valid_from, type, address_line1, address_line2, street, street2, street3,
                     zip, city, state, country, latitude, longitude, create_time, current_user_created, is_deleted)
select gen_random_uuid(), a.client_id, timestamptz '2025-01-01 00:00:00+00', 0, '', '',
       a.streets[1 + ((a.slot_no - 1) % cardinality(a.streets))] || ' ' || (3 + (a.seq * 11) % 90),
       '', '',
       a.zips[1 + ((a.slot_no - 1) % cardinality(a.zips))],
       a.city, a.state, 'CH',
       round((a.lat + a.jitter * (((a.seq * 37) % 21) - 10) / 10.0)::numeric, 6)::double precision,
       round((a.lon + a.jitter * (((a.seq * 53) % 21) - 10) / 10.0)::numeric, 6)::double precision,
       now(), 'GroupingDemo', false
from assign a;

update client
set is_deleted = true, deleted_time = now(), current_user_deleted = 'GroupingDemo'
where not is_deleted and id not in (select client_id from assign);

-- ------------------------------------------------------------------ qualifications
delete from client_qualification;

create temp table qual (idx int, id uuid);
insert into qual values
  $qualificationValues;

do `$`$ begin
  if (select count(*) from qualification q join qual x on x.id = q.id where not q.is_deleted) <> 5 then
    raise exception 'One of the 5 demo qualifications does not exist in the source database';
  end if;
end `$`$;

-- Position based: everybody gets qualification seq%5; even positions a second one, every third position a third one.
insert into client_qualification (id, client_id, qualification_id, level, valid_from, valid_until, note, create_time, is_deleted)
select gen_random_uuid(), a.client_id, q.id, 3, date '2025-01-01', null, null, now(), false
from assign a
join qual q on q.idx in (
  a.seq % 5,
  case when a.seq % 2 = 0 then (a.seq + 1) % 5 end,
  case when a.seq % 3 = 0 then (a.seq + 3) % 5 end);
"@

$resetSql = Get-Content -Raw -Encoding UTF8 (Join-Path $here 'reset-groups.sql')
$sqlFile = Join-Path $work 'curate.sql'
[IO.File]::WriteAllText($sqlFile, ($head + "`n" + $resetSql + "`n" + $tail), (New-Object Text.UTF8Encoding($false)))

Write-Host 'Applying reset, curation and qualifications ...'
Invoke-Native $psql (@('-d', $TargetDb, '-1', '-v', 'ON_ERROR_STOP=1', '-f', $sqlFile) + $conn)

Write-Host "Done. Database '$TargetDb' is ready."
