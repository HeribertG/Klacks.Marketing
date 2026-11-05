-- Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
-- Seeds the e-mail story of the clip "Mails → Verfügbarkeiten + Keywords" into a copy of klacks_marketing_security_bern_m2:
-- four employees of "Bern Objektschutz" get a private e-mail address and send one mail each (two availabilities, two work wishes for December 2026).
-- The mails are already processed (processed_at set) and sit in the folder of mails assigned to a client, so no background analysis acts on them before Klacksy does.
-- Idempotent: rows are keyed by message_id and by the e-mail address of the client.

BEGIN;

CREATE TEMP TABLE story_mail (first_name text, last_name text, address text, subject text, body text, received timestamptz, uid bigint) ON COMMIT DROP;
INSERT INTO story_mail VALUES
  ('Mia', 'Baer', 'mia.baer@example.com', 'Verfügbarkeit Dezember',
   E'Hallo Sandra\n\nAm 7., 8. und 9. Dezember kann ich nur von 7 bis 15 Uhr arbeiten, wegen der Kinderbetreuung.\n\nLiebe Grüsse\nMia',
   '2026-11-03 08:12:00+01', 9001),
  ('Priya', 'Nair', 'priya.nair@example.com', 'Nicht verfügbar im Dezember',
   E'Hallo Sandra\n\nVom 21. bis 23. Dezember bin ich nicht verfügbar, ich bin an einer Familienfeier.\n\nGruss\nPriya',
   '2026-11-03 13:40:00+01', 9002),
  ('Jonas', 'Vogel', 'jonas.vogel@example.com', 'Wünsche für Dezember',
   E'Hoi Sandra\n\nAm 18. Dezember hätte ich gerne frei. Und vom 21. bis 24. Dezember bitte keine Nachtdienste.\n\nDanke und Gruss\nJonas',
   '2026-11-04 07:55:00+01', 9003),
  ('Lena', 'Rossi', 'lena.rossi@example.com', 'Nachtdienste',
   E'Hallo Sandra\n\nVom 7. bis 11. Dezember übernehme ich gerne die Nachtdienste.\n\nLiebe Grüsse\nLena',
   '2026-11-04 09:20:00+01', 9004);

INSERT INTO communication (id, client_id, type, value, prefix, description, create_time, is_deleted)
SELECT gen_random_uuid(), c.id, 4, m.address, '', '', now(), false
FROM story_mail m
JOIN client c ON c.first_name = m.first_name AND c.name = m.last_name AND NOT c.is_deleted AND c.id_number BETWEEN 5042 AND 5051
WHERE NOT EXISTS (SELECT 1 FROM communication x WHERE x.client_id = c.id AND x.value = m.address AND NOT x.is_deleted);

INSERT INTO received_emails (id, message_id, imap_uid, folder, source_imap_folder, from_address, from_name, to_address, subject, body_text,
                             received_date, is_read, has_attachments, create_time, is_deleted, processed_at, is_auto_generated)
SELECT gen_random_uuid(), '<story-' || m.uid || '@example.com>', m.uid, 'client-assigned', 'INBOX', m.address, m.first_name || ' ' || m.last_name,
       'planung@example.com', m.subject, m.body, m.received, false, false, now(), false, m.received, false
FROM story_mail m
ON CONFLICT (message_id) DO NOTHING;

SELECT c.first_name, c.name, c.id_number, x.value
FROM communication x JOIN client c ON c.id = x.client_id
WHERE x.value LIKE '%@example.com' AND NOT x.is_deleted ORDER BY c.name;
SELECT folder, from_name, subject FROM received_emails WHERE NOT is_deleted ORDER BY received_date;

COMMIT;
