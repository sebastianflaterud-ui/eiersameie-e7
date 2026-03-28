
CREATE TABLE public.kalender_hendelser (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  tittel text NOT NULL,
  beskrivelse text,
  dato date NOT NULL,
  gjentakelse text DEFAULT 'ingen',
  kategori text NOT NULL,
  enhet_id uuid REFERENCES public.enheter(id),
  prioritet text DEFAULT 'normal',
  fullfort boolean DEFAULT false,
  fullfort_dato date,
  paaminnelse_dager integer DEFAULT 7,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.kalender_hendelser ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kalender_hendelser" ON public.kalender_hendelser FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kalender_hendelser" ON public.kalender_hendelser FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kalender_hendelser" ON public.kalender_hendelser FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kalender_hendelser" ON public.kalender_hendelser FOR DELETE USING (auth.uid() = user_id);

-- Update seed function to include kalender seed data
CREATE OR REPLACE FUNCTION public.seed_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.kontoer WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.kontoer (user_id, kontonummer, navn, type, eier) VALUES
    (p_user_id, '0540.34.78204', 'Brukskonto', 'brukskonto', 'Sebastian'),
    (p_user_id, '1224.18.35675', 'Felleskonto E7', 'brukskonto', 'Eiersameie'),
    (p_user_id, '1228.39.38512', 'Bufferkonto', 'brukskonto', 'Sebastian'),
    (p_user_id, '1228.43.05084', 'Organics konto', 'brukskonto', 'Sebastian'),
    (p_user_id, '1260.25.98533', 'Aksjesparekonto', 'aksjesparekonto', 'Sebastian'),
    (p_user_id, '1578.09.58992', 'Aksjehandelskonto', 'aksjehandelskonto', 'Sebastian');

  INSERT INTO public.klassifiseringsregler (user_id, monster, motpart, kategori, underkategori, inntektstype, utgiftstype) VALUES
    (p_user_id, 'nav', 'Nav', 'Privat', 'Trygd/Pensjon', 'Trygd', NULL),
    (p_user_id, 'tibber', 'Tibber', 'Eiersameie E7', 'Drift og vedlikehold', NULL, 'Strøm'),
    (p_user_id, 'kiwi', 'Kiwi', 'Privat', 'Mat', NULL, 'Mat'),
    (p_user_id, 'extra', 'Extra', 'Privat', 'Mat', NULL, 'Mat'),
    (p_user_id, 'meny', 'Meny', 'Privat', 'Mat', NULL, 'Mat'),
    (p_user_id, 'apple.com/bill', 'Apple', 'Privat', 'Abonnement', NULL, 'Abonnement'),
    (p_user_id, 'revolut', 'Revolut', 'Privat', 'Overføring', NULL, NULL),
    (p_user_id, 'flytoget', 'Flytoget', 'Privat', 'Transport', NULL, 'Transport'),
    (p_user_id, 'hagkaup', 'Hagkaup', 'Privat', 'Mat', NULL, 'Mat'),
    (p_user_id, 'motivus', 'Motivus AS', 'Motivus AS', 'Lønn', 'Lønn', NULL),
    (p_user_id, 'nesodden kommune', 'Nesodden Kommune', 'Eiersameie E7', 'Drift og vedlikehold', NULL, NULL),
    (p_user_id, 'fair collection', 'Fair Collection', 'Privat', 'Inkasso', NULL, 'Inkasso'),
    (p_user_id, 'intrum', 'Intrum', 'Privat', 'Inkasso', NULL, 'Inkasso'),
    (p_user_id, 'gothia', 'Gothia', 'Privat', 'Inkasso', NULL, 'Inkasso'),
    (p_user_id, 'telenor', 'Telenor Norge', 'Privat', 'Abonnement', NULL, 'Abonnement'),
    (p_user_id, 'if skadeforsikring', 'If Skadeforsikring', 'Privat', 'Forsikring', NULL, 'Forsikring'),
    (p_user_id, 'carsten', 'Carsten Siegstad Kristensen', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'camilla de bruyn', 'Camilla de Bruyn Walle', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'ida kemi', 'Ida Kemiläinen Pettersén', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'vegar kversøy', 'Vegar Kversøy', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'kjartan nilsen', 'Kjartan Nilsen', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'marius skancke', 'Marius Skancke Walle', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'morten sagstad', 'Morten Sagstad', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'david lange', 'David Lange-Nielsen', 'Eiersameie E7', NULL, NULL, NULL),
    (p_user_id, 'jørgen', 'Jørgen Hals Todalshaug', 'Eiersameie E7', NULL, 'Leieinntekt', NULL),
    (p_user_id, 'eva cathrine', 'Eva Cathrine Hildal', 'Eiersameie E7', NULL, 'Leieinntekt', NULL);

  INSERT INTO public.eiere (user_id, navn, type, eierandel_prosent, inntektsandel_prosent, kostnadsandel_prosent, identifikator, sist_endret) VALUES
    (p_user_id, 'Sebastian Flåterud', 'privatperson', 42.63, 46.70, 42.63, '02027545583', '2025-03-07'),
    (p_user_id, 'Levi Flåterud', 'privatperson', 4.07, 0, 4.07, '16088344158', '2025-03-07'),
    (p_user_id, 'David Lange-Nielsen', 'privatperson', 32.70, 32.70, 32.70, '13099829790', '2025-03-07'),
    (p_user_id, 'Motivus AS', 'aksjeselskap', 20.60, 20.60, 20.60, '990144834', '2025-03-07');

  INSERT INTO public.mellomvaerende (user_id, navn, debitor, kreditor, type, opprinnelig_belop, gjeldende_saldo, startdato, rente_prosent, beskrivelse) VALUES
    (p_user_id, 'Utlegg for Motivus AS — investering E7', 'Motivus AS', 'Sebastian Flåterud', 'lån', 0, 0, '2024-01-01', 0, 'Sebastian la ut for Motivus AS sin andel av påkostinvesteringen i E7.'),
    (p_user_id, 'Kjøp av økt eierandel — David Lange-Nielsen', 'David Lange-Nielsen', 'Sebastian Flåterud', 'lån', 0, 0, '2024-01-01', 0, 'David kjøpte økt eierandel i E7 men hadde ikke midler.');

  INSERT INTO public.enheter (user_id, navn, type, beskrivelse, maanedsleie_standard, status, boenhet, skattemessig_type, etasje, markedsleie_estimat, disponert_av) VALUES
    (p_user_id, 'Rom 1', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '1. etasje', 10000, NULL),
    (p_user_id, 'Rom 2', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '1. etasje', 10000, NULL),
    (p_user_id, 'Rom 3', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, NULL),
    (p_user_id, 'Rom 4', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, NULL),
    (p_user_id, 'Rom 5', 'rom', 'Soverom i hovedbolig', 0, 'ikke_i_bruk', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, 'Sebastian Flåterud'),
    (p_user_id, 'Rom 6', 'rom', 'Soverom i hovedbolig', 0, 'ikke_i_bruk', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, 'David Lange-Nielsen'),
    (p_user_id, 'Hybel 2', 'hybel', 'Innredet hybel', 0, 'ledig', 'Boenhet 1 — Hovedhus', 'uselvstendig_hybel', NULL, 10000, NULL),
    (p_user_id, 'Hybel 1', 'hybel', 'Separat hybel vegg i vegg med hovedbolig', 18000, 'utleid', 'Boenhet 2 — Bileilighet', 'familieleilighet', NULL, 18000, NULL);

  INSERT INTO public.leietakere (user_id, navn, naavaerende, personnr, epost, telefon, forfall_dag) VALUES
    (p_user_id, 'Camilla de Bruyn Walle', true, '26029241472', 'Camilladebruynw@hotmail.com', '47018648', 23),
    (p_user_id, 'Eva Cathrine Hildal', true, '19026948439', 'eva.cathrine@hotmail.com', '99348210', 1),
    (p_user_id, 'Ida Kemiläinen Pettersén', true, '15029639830', 'pettersenida@hotmail.com', '93629390', 1),
    (p_user_id, 'Morten Sagstad', true, NULL, NULL, NULL, 1),
    (p_user_id, 'Jørgen Hals Todalshaug', true, '23127447764', 'jorgen@todalshaug.no', '4797660028', 15),
    (p_user_id, 'Vegar Kversøy', false, NULL, NULL, NULL, 1),
    (p_user_id, 'Carsten Siegstad Kristensen', false, NULL, NULL, NULL, 1),
    (p_user_id, 'Betty Shimangus', false, NULL, NULL, NULL, 1),
    (p_user_id, 'Mari Sinnerud', false, NULL, NULL, NULL, 1),
    (p_user_id, 'Kjartan Nilsen', false, NULL, NULL, NULL, 1),
    (p_user_id, 'Marius Skancke Walle', false, NULL, NULL, NULL, 1),
    (p_user_id, 'David Lange-Nielsen', false, NULL, NULL, NULL, 1);

  INSERT INTO public.kontrakter (user_id, navn, boenhet, type, startdato, oppsigelsestid_mnd, depositum_multiplier) VALUES
    (p_user_id, 'Bofellesskap Hovedhus', 'Boenhet 1 — Hovedhus', 'langtid', '2024-01-01', 2, 2),
    (p_user_id, 'Bileiligheten', 'Boenhet 2 — Bileilighet', 'langtid', '2024-01-01', 2, 2);

  INSERT INTO public.leieforhold (user_id, leietaker_id, enhet_id, innflytting, utflytting, avtalt_leie, depositum, forfall_dag, status, notater)
  SELECT p_user_id, l.id, e.id, '2024-08-01', NULL, 18000, 0, 23, 'aktiv', 'Oppstart'
  FROM leietakere l, enheter e WHERE l.user_id = p_user_id AND l.navn = 'Camilla de Bruyn Walle' AND e.user_id = p_user_id AND e.navn = 'Hybel 1';

  INSERT INTO public.leieforhold (user_id, leietaker_id, enhet_id, innflytting, utflytting, avtalt_leie, depositum, forfall_dag, status, notater)
  SELECT p_user_id, l.id, e.id, '2025-11-01', NULL, 10000, 17000, 1, 'aktiv', 'Oppstart'
  FROM leietakere l, enheter e WHERE l.user_id = p_user_id AND l.navn = 'Eva Cathrine Hildal' AND e.user_id = p_user_id AND e.navn = 'Rom 1';

  INSERT INTO public.leieforhold (user_id, leietaker_id, enhet_id, innflytting, utflytting, avtalt_leie, depositum, forfall_dag, status, notater)
  SELECT p_user_id, l.id, e.id, '2024-11-30', '2025-11-30', 9500, 0, 1, 'avsluttet', 'Oppstart'
  FROM leietakere l, enheter e WHERE l.user_id = p_user_id AND l.navn = 'Ida Kemiläinen Pettersén' AND e.user_id = p_user_id AND e.navn = 'Rom 2';

  INSERT INTO public.leieforhold (user_id, leietaker_id, enhet_id, innflytting, utflytting, avtalt_leie, depositum, forfall_dag, status, notater)
  SELECT p_user_id, l.id, e.id, '2025-12-01', '2026-04-30', 9840, 0, 1, 'aktiv', 'Indeksregulering'
  FROM leietakere l, enheter e WHERE l.user_id = p_user_id AND l.navn = 'Ida Kemiläinen Pettersén' AND e.user_id = p_user_id AND e.navn = 'Rom 2';

  INSERT INTO public.leieforhold (user_id, leietaker_id, enhet_id, innflytting, utflytting, avtalt_leie, depositum, forfall_dag, status, notater)
  SELECT p_user_id, l.id, e.id, '2025-11-01', NULL, 10000, 0, 1, 'aktiv', 'Oppstart'
  FROM leietakere l, enheter e WHERE l.user_id = p_user_id AND l.navn = 'Morten Sagstad' AND e.user_id = p_user_id AND e.navn = 'Rom 3';

  INSERT INTO public.leieforhold (user_id, leietaker_id, enhet_id, innflytting, utflytting, avtalt_leie, depositum, forfall_dag, status, notater)
  SELECT p_user_id, l.id, e.id, '2026-01-15', NULL, 10000, 20000, 15, 'aktiv', 'Oppstart'
  FROM leietakere l, enheter e WHERE l.user_id = p_user_id AND l.navn = 'Jørgen Hals Todalshaug' AND e.user_id = p_user_id AND e.navn = 'Rom 4';

  INSERT INTO public.eier_historikk (user_id, dato, type, beskrivelse)
  VALUES (p_user_id, '2025-03-07', 'justering', 'Justering byggekostnader');

  INSERT INTO public.eier_historikk_detaljer (user_id, historikk_id, eier_navn, andel_for, andel_etter, merknad)
  SELECT p_user_id, h.id, v.eier_navn, v.andel_for, v.andel_etter, v.merknad
  FROM eier_historikk h,
  (VALUES
    ('Sebastian Flåterud', 48.80, 47.18, 'Underbidrag til byggekostnader'),
    ('David Lange-Nielsen', 26.30, 28.15, 'Overbidrag til byggekostnader'),
    ('Motivus AS', 20.60, 20.60, 'Bidrag iht. eierandel'),
    ('Levi Flåterud', 4.40, 4.17, 'Underbidrag til byggekostnader')
  ) AS v(eier_navn, andel_for, andel_etter, merknad)
  WHERE h.user_id = p_user_id AND h.beskrivelse = 'Justering byggekostnader';

  INSERT INTO public.eier_historikk (user_id, dato, type, beskrivelse)
  VALUES (p_user_id, '2025-03-07', 'overføring', 'Konvertering midler');

  INSERT INTO public.eier_historikk_detaljer (user_id, historikk_id, eier_navn, andel_for, andel_etter, merknad)
  SELECT p_user_id, h.id, v.eier_navn, v.andel_for, v.andel_etter, v.merknad
  FROM eier_historikk h,
  (VALUES
    ('Sebastian Flåterud', 47.18, 42.63, 'Avtale med David'),
    ('David Lange-Nielsen', 28.15, 32.70, 'Konvertering midler'),
    ('Motivus AS', 20.60, 20.60, 'Uendret'),
    ('Levi Flåterud', 4.17, 4.07, 'Justering for avrunding (total = 100%)')
  ) AS v(eier_namn, andel_for, andel_etter, merknad)
  WHERE h.user_id = p_user_id AND h.beskrivelse = 'Konvertering midler';

  -- Kalender seed data
  INSERT INTO public.kalender_hendelser (user_id, tittel, gjentakelse, kategori, prioritet, paaminnelse_dager, dato) VALUES
    (p_user_id, 'Bytte ventilasjonsfiltre', 'kvartalsvis', 'vedlikehold', 'høy', 14, CURRENT_DATE + interval '30 days'),
    (p_user_id, 'Rengjøre sluk og avløp', 'kvartalsvis', 'vedlikehold', 'normal', 7, CURRENT_DATE + interval '45 days'),
    (p_user_id, 'Sjekke røykvarslere og batterier', 'halvårlig', 'vedlikehold', 'kritisk', 14, CURRENT_DATE + interval '60 days'),
    (p_user_id, 'Sjekke brannslukkingsapparat', 'årlig', 'vedlikehold', 'kritisk', 30, CURRENT_DATE + interval '90 days'),
    (p_user_id, 'Vedlikehold varmtvannsbereder', 'årlig', 'vedlikehold', 'normal', 14, CURRENT_DATE + interval '120 days'),
    (p_user_id, 'Rengjøre takrenner', 'halvårlig', 'vedlikehold', 'normal', 7, CURRENT_DATE + interval '75 days'),
    (p_user_id, 'Sjekke vinduslukking og tetningslister', 'årlig', 'vedlikehold', 'normal', 14, CURRENT_DATE + interval '150 days'),
    (p_user_id, 'Sjekke fuktighet i kjeller/kryprom', 'halvårlig', 'vedlikehold', 'høy', 7, CURRENT_DATE + interval '40 days');

END;
$function$;
