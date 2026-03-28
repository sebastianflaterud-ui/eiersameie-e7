
-- Add new columns to enheter
ALTER TABLE enheter ADD COLUMN IF NOT EXISTS boenhet text;
ALTER TABLE enheter ADD COLUMN IF NOT EXISTS skattemessig_type text;
ALTER TABLE enheter ADD COLUMN IF NOT EXISTS markedsleie_estimat numeric;
ALTER TABLE enheter ADD COLUMN IF NOT EXISTS disponert_av text;

-- Create kontrakter table
CREATE TABLE kontrakter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  navn text NOT NULL,
  boenhet text NOT NULL,
  type text NOT NULL DEFAULT 'langtid' CHECK (type IN ('langtid', 'korttid')),
  startdato date NOT NULL,
  sluttdato date,
  oppsigelsestid_mnd integer DEFAULT 2,
  depositum_multiplier numeric DEFAULT 2,
  inkludert_i_leie text DEFAULT 'Strøm, vann, avløp og internett',
  ikke_inkludert text DEFAULT 'Kabel-TV',
  betalingskonto text DEFAULT '1224 18 35675',
  kontrakt_status text NOT NULL DEFAULT 'aktiv' CHECK (kontrakt_status IN ('aktiv', 'oppsagt', 'utløpt', 'utkast')),
  saerlige_bestemmelser text,
  ordensregler text,
  notater text,
  opprettet timestamptz DEFAULT now(),
  oppdatert timestamptz DEFAULT now()
);

ALTER TABLE kontrakter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own kontrakter" ON kontrakter FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kontrakter" ON kontrakter FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kontrakter" ON kontrakter FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kontrakter" ON kontrakter FOR DELETE USING (auth.uid() = user_id);

-- Create kontrakt_leietakere table
CREATE TABLE kontrakt_leietakere (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  kontrakt_id uuid REFERENCES kontrakter(id) ON DELETE CASCADE NOT NULL,
  leietaker_id uuid REFERENCES leietakere(id) NOT NULL,
  enhet_id uuid REFERENCES enheter(id) NOT NULL,
  maanedsleie numeric NOT NULL,
  depositum numeric NOT NULL,
  innflytting date NOT NULL,
  utflytting date,
  aktiv boolean DEFAULT true,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE kontrakt_leietakere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own kontrakt_leietakere" ON kontrakt_leietakere FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kontrakt_leietakere" ON kontrakt_leietakere FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kontrakt_leietakere" ON kontrakt_leietakere FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kontrakt_leietakere" ON kontrakt_leietakere FOR DELETE USING (auth.uid() = user_id);

-- Create kontrakt_hendelser table
CREATE TABLE kontrakt_hendelser (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  kontrakt_id uuid REFERENCES kontrakter(id) ON DELETE CASCADE NOT NULL,
  leietaker_id uuid REFERENCES leietakere(id),
  hendelse_type text NOT NULL CHECK (hendelse_type IN ('leietaker_lagt_til', 'leietaker_fjernet', 'leie_endret', 'kontrakt_opprettet', 'kontrakt_avsluttet', 'oppsigelse', 'annet')),
  beskrivelse text,
  dato date NOT NULL,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE kontrakt_hendelser ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own kontrakt_hendelser" ON kontrakt_hendelser FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kontrakt_hendelser" ON kontrakt_hendelser FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kontrakt_hendelser" ON kontrakt_hendelser FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kontrakt_hendelser" ON kontrakt_hendelser FOR DELETE USING (auth.uid() = user_id);

-- Create kontrakt_versjoner table
CREATE TABLE kontrakt_versjoner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  kontrakt_id uuid REFERENCES kontrakter(id) ON DELETE CASCADE NOT NULL,
  versjon integer NOT NULL,
  endring_beskrivelse text,
  storage_path text NOT NULL,
  generert_dato timestamptz DEFAULT now()
);

ALTER TABLE kontrakt_versjoner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own kontrakt_versjoner" ON kontrakt_versjoner FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kontrakt_versjoner" ON kontrakt_versjoner FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kontrakt_versjoner" ON kontrakt_versjoner FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kontrakt_versjoner" ON kontrakt_versjoner FOR DELETE USING (auth.uid() = user_id);

-- Add kontrakt_id to bilag
ALTER TABLE bilag ADD COLUMN IF NOT EXISTS kontrakt_id uuid REFERENCES kontrakter(id) ON DELETE SET NULL;

-- Create storage bucket for kontrakter
INSERT INTO storage.buckets (id, name, public) VALUES ('kontrakter', 'kontrakter', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS for kontrakter bucket
CREATE POLICY "Users can upload kontrakter" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kontrakter' AND auth.role() = 'authenticated');
CREATE POLICY "Users can view own kontrakter files" ON storage.objects FOR SELECT USING (bucket_id = 'kontrakter' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own kontrakter files" ON storage.objects FOR DELETE USING (bucket_id = 'kontrakter' AND auth.role() = 'authenticated');

-- Update seed function with new enheter and kontrakter
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
    (p_user_id, 'david lange', 'David Lange-Nielsen', 'Eiersameie E7', NULL, NULL, NULL);

  INSERT INTO public.eiere (user_id, navn, type, eierandel_prosent, inntektsandel_prosent, kostnadsandel_prosent, identifikator) VALUES
    (p_user_id, 'Sebastian Flåterud', 'privatperson', 42.63, 46.70, 42.63, '02027545583'),
    (p_user_id, 'Levi Flåterud', 'privatperson', 4.07, 0, 4.07, '16088344158'),
    (p_user_id, 'David Lange-Nielsen', 'privatperson', 32.70, 32.70, 32.70, '13099829790'),
    (p_user_id, 'Motivus AS', 'aksjeselskap', 20.60, 20.60, 20.60, '990144834');

  INSERT INTO public.mellomvaerende (user_id, navn, debitor, kreditor, type, opprinnelig_belop, gjeldende_saldo, startdato, rente_prosent, beskrivelse) VALUES
    (p_user_id, 'Utlegg for Motivus AS — investering E7', 'Motivus AS', 'Sebastian Flåterud', 'lån', 0, 0, '2024-01-01', 0, 'Sebastian la ut for Motivus AS sin andel av påkostinvesteringen i E7. Nedbetales ved at Sebastian beholder Motivus sin leieandel.'),
    (p_user_id, 'Kjøp av økt eierandel — David Lange-Nielsen', 'David Lange-Nielsen', 'Sebastian Flåterud', 'lån', 0, 0, '2024-01-01', 0, 'David kjøpte økt eierandel i E7 men hadde ikke midler. Nedbetales ved at Sebastian beholder Davids leieandel.');

  INSERT INTO public.enheter (user_id, navn, type, beskrivelse, maanedsleie_standard, status, boenhet, skattemessig_type, etasje, markedsleie_estimat, disponert_av) VALUES
    (p_user_id, 'Rom 1', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '1. etasje', 10000, NULL),
    (p_user_id, 'Rom 2', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '1. etasje', 10000, NULL),
    (p_user_id, 'Rom 3', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, NULL),
    (p_user_id, 'Rom 4', 'rom', 'Soverom i hovedbolig', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, NULL),
    (p_user_id, 'Rom 5', 'rom', 'Soverom i hovedbolig', 0, 'ikke_i_bruk', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, 'Sebastian Flåterud'),
    (p_user_id, 'Rom 6', 'rom', 'Soverom i hovedbolig', 0, 'ikke_i_bruk', 'Boenhet 1 — Hovedhus', 'del_av_bofellesskap', '2. etasje', 10000, 'David Lange-Nielsen'),
    (p_user_id, 'Hybel 2', 'hybel', 'Innredet hybel', 0, 'utleid', 'Boenhet 1 — Hovedhus', 'uselvstendig_hybel', NULL, 10000, NULL),
    (p_user_id, 'Hybel 1', 'hybel', 'Separat hybel vegg i vegg med hovedbolig', 18000, 'utleid', 'Boenhet 2 — Bileilighet', 'familieleilighet', NULL, 18000, NULL);

  INSERT INTO public.leietakere (user_id, navn, naavaerende) VALUES
    (p_user_id, 'Camilla de Bruyn Walle', true),
    (p_user_id, 'Ida Kemiläinen Pettersén', true),
    (p_user_id, 'Vegar Kversøy', false),
    (p_user_id, 'Carsten Siegstad Kristensen', false),
    (p_user_id, 'Kjartan Nilsen', true),
    (p_user_id, 'Marius Skancke Walle', true),
    (p_user_id, 'Morten Sagstad', true),
    (p_user_id, 'David Lange-Nielsen', true),
    (p_user_id, 'Betty Shimangus', false),
    (p_user_id, 'Mari Sinnerud', false),
    (p_user_id, 'Eva Cathrine Hildal', false);

  INSERT INTO public.kontrakter (user_id, navn, boenhet, type, startdato, oppsigelsestid_mnd, depositum_multiplier) VALUES
    (p_user_id, 'Bofellesskap Hovedhus', 'Boenhet 1 — Hovedhus', 'langtid', '2024-01-01', 2, 2),
    (p_user_id, 'Bileiligheten', 'Boenhet 2 — Bileilighet', 'langtid', '2024-01-01', 2, 2);
END;
$function$;
