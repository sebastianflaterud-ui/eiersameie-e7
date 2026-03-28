
-- Table: mellomvaerende
CREATE TABLE public.mellomvaerende (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  navn text NOT NULL,
  debitor text NOT NULL,
  kreditor text NOT NULL,
  type text NOT NULL DEFAULT 'lån',
  opprinnelig_belop numeric NOT NULL,
  gjeldende_saldo numeric NOT NULL,
  valuta text DEFAULT 'NOK',
  startdato date NOT NULL,
  innfridd_dato date,
  rente_prosent numeric DEFAULT 0,
  beskrivelse text,
  aktiv boolean DEFAULT true,
  opprettet timestamptz DEFAULT now(),
  oppdatert timestamptz DEFAULT now()
);

ALTER TABLE public.mellomvaerende ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mellomvaerende" ON public.mellomvaerende FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mellomvaerende" ON public.mellomvaerende FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mellomvaerende" ON public.mellomvaerende FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mellomvaerende" ON public.mellomvaerende FOR DELETE USING (auth.uid() = user_id);

-- Table: mellomvaerende_bevegelser
CREATE TABLE public.mellomvaerende_bevegelser (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  mellomvaerende_id uuid REFERENCES public.mellomvaerende(id) ON DELETE CASCADE NOT NULL,
  dato date NOT NULL,
  belop numeric NOT NULL,
  type text NOT NULL,
  beskrivelse text,
  transaksjon_id uuid REFERENCES public.transaksjoner(id) ON DELETE SET NULL,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.mellomvaerende_bevegelser ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bevegelser" ON public.mellomvaerende_bevegelser FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bevegelser" ON public.mellomvaerende_bevegelser FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bevegelser" ON public.mellomvaerende_bevegelser FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bevegelser" ON public.mellomvaerende_bevegelser FOR DELETE USING (auth.uid() = user_id);

-- Table: investeringer
CREATE TABLE public.investeringer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  navn text NOT NULL,
  beskrivelse text,
  periode_fra date,
  periode_til date,
  total_investering numeric NOT NULL,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.investeringer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investeringer" ON public.investeringer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investeringer" ON public.investeringer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investeringer" ON public.investeringer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investeringer" ON public.investeringer FOR DELETE USING (auth.uid() = user_id);

-- Table: investering_bidrag
CREATE TABLE public.investering_bidrag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  investering_id uuid REFERENCES public.investeringer(id) ON DELETE CASCADE NOT NULL,
  eier_navn text NOT NULL,
  bidrag_belop numeric NOT NULL,
  bidrag_prosent numeric,
  betalt_av text,
  notater text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.investering_bidrag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bidrag" ON public.investering_bidrag FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bidrag" ON public.investering_bidrag FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bidrag" ON public.investering_bidrag FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bidrag" ON public.investering_bidrag FOR DELETE USING (auth.uid() = user_id);

-- Update seed function with mellomvaerende seed data
CREATE OR REPLACE FUNCTION public.seed_user_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO public.eiere (user_id, navn, type, eierandel_prosent, inntektsandel_prosent, kostnadsandel_prosent) VALUES
    (p_user_id, 'Sebastian Flåterud', 'privatperson', 25, 25, 25),
    (p_user_id, 'Levi', 'privatperson', 25, 25, 25),
    (p_user_id, 'David Lange-Nielsen', 'privatperson', 25, 25, 25),
    (p_user_id, 'Motivus AS', 'aksjeselskap', 25, 25, 25);

  INSERT INTO public.mellomvaerende (user_id, navn, debitor, kreditor, type, opprinnelig_belop, gjeldende_saldo, startdato, rente_prosent, beskrivelse) VALUES
    (p_user_id, 'Utlegg for Motivus AS — investering E7', 'Motivus AS', 'Sebastian Flåterud', 'lån', 0, 0, '2024-01-01', 0, 'Sebastian la ut for Motivus AS sin andel av påkostinvesteringen i E7. Nedbetales ved at Sebastian beholder Motivus sin leieandel.'),
    (p_user_id, 'Kjøp av økt eierandel — David Lange-Nielsen', 'David Lange-Nielsen', 'Sebastian Flåterud', 'lån', 0, 0, '2024-01-01', 0, 'David kjøpte økt eierandel i E7 men hadde ikke midler. Nedbetales ved at Sebastian beholder Davids leieandel.');
END;
$$;
