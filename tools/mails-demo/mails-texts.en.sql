-- Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
-- Translates the four story mails of seed-mails.sql to 'en' for the en take of the clip "Mails -> Verfuegbarkeiten + Keywords".
-- Run after seed-mails.sql on the take copy; keyed by the message ids of seed-mails.sql.

BEGIN;
UPDATE received_emails SET subject = 'Availability December', body_text = E'Hi Sandra\n\nOn 7, 8 and 9 December I can only work from 7 am to 3 pm, because of childcare.\n\nBest regards\nMia' WHERE message_id = '<story-9001@example.com>';
UPDATE received_emails SET subject = 'Not available in December', body_text = E'Hi Sandra\n\nFrom 21 to 23 December I am not available, I am at a family celebration.\n\nRegards\nPriya' WHERE message_id = '<story-9002@example.com>';
UPDATE received_emails SET subject = 'Wishes for December', body_text = E'Hi Sandra\n\nI would like to have 18 December off. And from 21 to 24 December no night shifts, please.\n\nThanks and regards\nJonas' WHERE message_id = '<story-9003@example.com>';
UPDATE received_emails SET subject = 'Night shifts', body_text = E'Hi Sandra\n\nFrom 7 to 11 December I am happy to take the night shifts.\n\nBest regards\nLena' WHERE message_id = '<story-9004@example.com>';
COMMIT;
