-- Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
-- Seeds the work availabilities of the clip M3 v2 "Der Dezember steht" into a throw-away copy of klacks_marketing_security_bern_m3 (never into the master):
-- Mia Baer can only work 07-15 h on 7, 8 and 9 December (hours 7..14 available; the day rule blocks the other hours), Priya Nair is not available
-- on 21, 22 and 23 December (all 24 hours unavailable). The days touch no planning command and no vacation of lib/security-demo.mjs, so the
-- AutoWizard has to hold them (availability is dropped only on days with a command, a break or a vacation).
-- Idempotent: the rows of both people in December are replaced.

BEGIN;

CREATE TEMP TABLE story_availability (first_name text, last_name text, day date, hour int, is_available boolean) ON COMMIT DROP;
INSERT INTO story_availability
SELECT 'Mia', 'Baer', d::date, h, true
FROM generate_series('2026-12-07'::date, '2026-12-09'::date, interval '1 day') d, generate_series(7, 14) h;
INSERT INTO story_availability
SELECT 'Priya', 'Nair', d::date, h, false
FROM generate_series('2026-12-21'::date, '2026-12-23'::date, interval '1 day') d, generate_series(0, 23) h;

DELETE FROM client_availability a
USING client c
WHERE a.client_id = c.id AND a.date BETWEEN '2026-12-01' AND '2026-12-31'
  AND ((c.first_name = 'Mia' AND c.name = 'Baer') OR (c.first_name = 'Priya' AND c.name = 'Nair'));

INSERT INTO client_availability (id, client_id, date, hour, is_available, create_time, is_deleted)
SELECT gen_random_uuid(), c.id, s.day, s.hour, s.is_available, now(), false
FROM story_availability s
JOIN client c ON c.first_name = s.first_name AND c.name = s.last_name AND NOT c.is_deleted;

DO $$
BEGIN
  IF (SELECT count(*) FROM client_availability a JOIN client c ON c.id = a.client_id
      WHERE NOT a.is_deleted AND a.date BETWEEN '2026-12-01' AND '2026-12-31') <> 3 * 8 + 3 * 24 THEN
    RAISE EXCEPTION 'expected 96 availability rows for Mia Baer and Priya Nair in December';
  END IF;
END $$;

COMMIT;
