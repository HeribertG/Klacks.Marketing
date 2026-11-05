-- Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
-- Translates the four story mails of seed-mails.sql to 'fr' for the fr take of the clip "Mails -> Verfuegbarkeiten + Keywords".
-- Run after seed-mails.sql on the take copy; keyed by the message ids of seed-mails.sql.

BEGIN;
UPDATE received_emails SET subject = 'Disponibilité décembre', body_text = E'Bonjour Sandra\n\nLes 7, 8 et 9 décembre, je ne peux travailler que de 7 h à 15 h, à cause de la garde des enfants.\n\nMeilleures salutations\nMia' WHERE message_id = '<story-9001@example.com>';
UPDATE received_emails SET subject = 'Pas disponible en décembre', body_text = E'Bonjour Sandra\n\nDu 21 au 23 décembre, je ne suis pas disponible, je suis à une fête de famille.\n\nSalutations\nPriya' WHERE message_id = '<story-9002@example.com>';
UPDATE received_emails SET subject = 'Souhaits pour décembre', body_text = E'Salut Sandra\n\nLe 18 décembre, j''aimerais être en congé. Et du 21 au 24 décembre, pas de service de nuit, s''il te plaît.\n\nMerci et salutations\nJonas' WHERE message_id = '<story-9003@example.com>';
UPDATE received_emails SET subject = 'Services de nuit', body_text = E'Bonjour Sandra\n\nDu 7 au 11 décembre, je prends volontiers les services de nuit.\n\nMeilleures salutations\nLena' WHERE message_id = '<story-9004@example.com>';
COMMIT;
