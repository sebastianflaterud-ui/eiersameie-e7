
-- Delete existing "oppstart" details and event
DELETE FROM eier_historikk_detaljer WHERE historikk_id = '73b841b4-e6b2-4dd6-a759-ef5d7d79ed73';
DELETE FROM eier_historikk WHERE id = '73b841b4-e6b2-4dd6-a759-ef5d7d79ed73';

-- 1. Opprinnelig eierskap: Sebastian 100%
INSERT INTO eier_historikk (id, user_id, dato, type, beskrivelse)
SELECT gen_random_uuid(), user_id, '2023-01-01', 'oppstart', 'Opprinnelig eierskap — Sebastian Flåterud'
FROM eier_historikk WHERE id = '8bfd5cb1-1587-4239-88b5-981d6e891424';

INSERT INTO eier_historikk_detaljer (user_id, historikk_id, eier_navn, andel_for, andel_etter, merknad)
SELECT h.user_id, h.id, 'Sebastian Flåterud', 0, 100, 'Eneeier'
FROM eier_historikk h WHERE h.beskrivelse = 'Opprinnelig eierskap — Sebastian Flåterud';

-- 2. Nov 10, 2023: Salg til Motivus AS (20.6%) og Levi Flåterud (4.4%)
INSERT INTO eier_historikk (id, user_id, dato, type, beskrivelse)
SELECT gen_random_uuid(), user_id, '2023-11-10', 'overføring', 'Salg av ideelle andeler til Motivus AS og Levi Flåterud'
FROM eier_historikk WHERE id = '8bfd5cb1-1587-4239-88b5-981d6e891424';

INSERT INTO eier_historikk_detaljer (user_id, historikk_id, eier_navn, andel_for, andel_etter, merknad)
SELECT h.user_id, h.id, v.eier_navn, v.andel_for, v.andel_etter, v.merknad
FROM eier_historikk h,
(VALUES
  ('Sebastian Flåterud', 100.0, 75.0, 'Solgte 20,6 % til Motivus AS og 4,4 % til Levi Flåterud'),
  ('Motivus AS', 0.0, 20.6, 'Kjøp av ideell andel iht. avtale 10. nov 2023'),
  ('Levi Flåterud', 0.0, 4.4, 'Kjøp av ideell andel iht. avtale 10. nov 2023')
) AS v(eier_navn, andel_for, andel_etter, merknad)
WHERE h.beskrivelse = 'Salg av ideelle andeler til Motivus AS og Levi Flåterud';

-- 3. Dec 4, 2023: Salg til David Lange-Nielsen (26.3%)
INSERT INTO eier_historikk (id, user_id, dato, type, beskrivelse)
SELECT gen_random_uuid(), user_id, '2023-12-04', 'overføring', 'Salg av ideell andel til David Lange-Nielsen'
FROM eier_historikk WHERE id = '8bfd5cb1-1587-4239-88b5-981d6e891424';

INSERT INTO eier_historikk_detaljer (user_id, historikk_id, eier_navn, andel_for, andel_etter, merknad)
SELECT h.user_id, h.id, v.eier_navn, v.andel_for, v.andel_etter, v.merknad
FROM eier_historikk h,
(VALUES
  ('Sebastian Flåterud', 75.0, 48.7, 'Solgte 26,3 % til David Lange-Nielsen'),
  ('David Lange-Nielsen', 0.0, 26.3, 'Kjøp av ideell andel iht. avtale 4. des 2023'),
  ('Motivus AS', 20.6, 20.6, 'Uendret'),
  ('Levi Flåterud', 4.4, 4.4, 'Uendret')
) AS v(eier_navn, andel_for, andel_etter, merknad)
WHERE h.beskrivelse = 'Salg av ideell andel til David Lange-Nielsen';

-- Fix "Justering byggekostnader" starting values to match Dec 4 output
UPDATE eier_historikk_detaljer SET andel_for = 48.7 
WHERE historikk_id = '8bfd5cb1-1587-4239-88b5-981d6e891424' AND eier_navn = 'Sebastian Flåterud';

UPDATE eier_historikk_detaljer SET andel_for = 26.3
WHERE historikk_id = '8bfd5cb1-1587-4239-88b5-981d6e891424' AND eier_navn = 'David Lange-Nielsen';

UPDATE eier_historikk_detaljer SET andel_for = 4.4
WHERE historikk_id = '8bfd5cb1-1587-4239-88b5-981d6e891424' AND eier_navn = 'Levi Flåterud';
