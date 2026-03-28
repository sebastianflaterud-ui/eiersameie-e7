
-- Create enheter table
CREATE TABLE public.enheter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  navn text NOT NULL,
  type text NOT NULL,
  beskrivelse text,
  maanedsleie_standard numeric,
  areal_kvm numeric,
  etasje text,
  fasiliteter text,
  status text NOT NULL DEFAULT 'ledig',
  aktiv boolean DEFAULT true,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.enheter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own enheter" ON public.enheter FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enheter" ON public.enheter FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enheter" ON public.enheter FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own enheter" ON public.enheter FOR DELETE USING (auth.uid() = user_id);

-- Create leietakere table
CREATE TABLE public.leietakere (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  navn text NOT NULL,
  epost text,
  telefon text,
  personnr text,
  fodselsdato date,
  naavaerende boolean DEFAULT false,
  notater text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.leietakere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own leietakere" ON public.leietakere FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leietakere" ON public.leietakere FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leietakere" ON public.leietakere FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leietakere" ON public.leietakere FOR DELETE USING (auth.uid() = user_id);

-- Create leieforhold table
CREATE TABLE public.leieforhold (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  leietaker_id uuid REFERENCES public.leietakere(id) NOT NULL,
  enhet_id uuid REFERENCES public.enheter(id) NOT NULL,
  innflytting date NOT NULL,
  utflytting date,
  avtalt_leie numeric NOT NULL,
  depositum numeric,
  depositumskonto text,
  leiekontrakt_signert boolean DEFAULT false,
  oppsigelse_dato date,
  oppsigelse_grunn text,
  status text NOT NULL DEFAULT 'aktiv',
  notater text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.leieforhold ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own leieforhold" ON public.leieforhold FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leieforhold" ON public.leieforhold FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leieforhold" ON public.leieforhold FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leieforhold" ON public.leieforhold FOR DELETE USING (auth.uid() = user_id);

-- Update seed function to include enheter and leietakere
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

  INSERT INTO public.enheter (user_id, navn, type, beskrivelse, maanedsleie_standard, status) VALUES
    (p_user_id, 'Hybel 1', 'hybel', 'Separat hybel vegg i vegg med hovedbolig', 18000, 'utleid'),
    (p_user_id, 'Hybel 2', 'hybel', 'Innredet hybel', 0, 'utleid'),
    (p_user_id, 'Rom 1', 'rom', 'Soverom i hovedbolig', 0, 'utleid'),
    (p_user_id, 'Rom 2', 'rom', 'Soverom i hovedbolig', 0, 'utleid'),
    (p_user_id, 'Rom 3', 'rom', 'Soverom i hovedbolig', 0, 'ledig'),
    (p_user_id, 'Rom 4', 'rom', 'Soverom i hovedbolig', 0, 'ledig');

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
END;
$function$;
