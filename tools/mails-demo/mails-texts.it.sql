-- Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
-- Translates the four story mails of seed-mails.sql to 'it' for the it take of the clip "Mails -> Verfuegbarkeiten + Keywords".
-- Run after seed-mails.sql on the take copy; keyed by the message ids of seed-mails.sql.

BEGIN;
UPDATE received_emails SET subject = 'Disponibilità dicembre', body_text = E'Ciao Sandra\n\nIl 7, 8 e 9 dicembre posso lavorare solo dalle 7 alle 15, per via dei bambini.\n\nCari saluti\nMia' WHERE message_id = '<story-9001@example.com>';
UPDATE received_emails SET subject = 'Non disponibile a dicembre', body_text = E'Ciao Sandra\n\nDal 21 al 23 dicembre non sono disponibile, sono a una festa di famiglia.\n\nSaluti\nPriya' WHERE message_id = '<story-9002@example.com>';
UPDATE received_emails SET subject = 'Desideri per dicembre', body_text = E'Ciao Sandra\n\nIl 18 dicembre vorrei avere libero. E dal 21 al 24 dicembre niente turni di notte, per favore.\n\nGrazie e saluti\nJonas' WHERE message_id = '<story-9003@example.com>';
UPDATE received_emails SET subject = 'Turni di notte', body_text = E'Ciao Sandra\n\nDal 7 all''11 dicembre faccio volentieri i turni di notte.\n\nCari saluti\nLena' WHERE message_id = '<story-9004@example.com>';
COMMIT;
