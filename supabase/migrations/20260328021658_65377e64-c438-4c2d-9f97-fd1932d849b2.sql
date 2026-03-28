
-- Create tables for Transaksjonsbanken

-- 1. Kontoer table
CREATE TABLE public.kontoer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kontonummer text NOT NULL,
  navn text,
  type text,
  eier text,
  aktiv boolean DEFAULT true,
  UNIQUE(user_id, kontonummer)
);

ALTER TABLE public.kontoer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kontoer" ON public.kontoer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kontoer" ON public.kontoer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kontoer" ON public.kontoer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kontoer" ON public.kontoer FOR DELETE USING (auth.uid() = user_id);

-- 2. Transaksjoner table
CREATE TABLE public.transaksjoner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dato date NOT NULL,
  bokforingsdato date,
  konto text,
  beskrivelse_bank text NOT NULL,
  beskrivelse_egen text,
  belop numeric NOT NULL,
  retning text NOT NULL CHECK (retning IN ('inn', 'ut')),
  motpart_bank text,
  motpart_egen text,
  kategori text NOT NULL DEFAULT 'Uklassifisert'
    CHECK (kategori IN ('Privat', 'Eiersameie E7', 'Motivus AS', 'Uklassifisert')),
  underkategori text,
  kostnadstype text,
  inntektstype text,
  betalt_av text,
  leie_for text,
  leieperiode text,
  enhet text,
  utgiftstype text,
  leverandor text,
  fradragsberettiget boolean DEFAULT false,
  skatteaar integer,
  kilde text NOT NULL CHECK (kilde IN ('pdf', 'csv', 'nettbank_lim', 'manuell')),
  arkivref text,
  kid text,
  valuta text DEFAULT 'NOK',
  valutakurs numeric,
  original_belop numeric,
  klassifisering_status text DEFAULT 'foreslått'
    CHECK (klassifisering_status IN ('auto', 'foreslått', 'manuell', 'bekreftet')),
  duplikat_hash text,
  notater text,
  opprettet timestamptz DEFAULT now(),
  oppdatert timestamptz DEFAULT now()
);

ALTER TABLE public.transaksjoner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transaksjoner" ON public.transaksjoner FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transaksjoner" ON public.transaksjoner FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transaksjoner" ON public.transaksjoner FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transaksjoner" ON public.transaksjoner FOR DELETE USING (auth.uid() = user_id);

-- 3. Klassifiseringsregler table
CREATE TABLE public.klassifiseringsregler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  monster text NOT NULL,
  monster_type text DEFAULT 'inneholder'
    CHECK (monster_type IN ('inneholder', 'starter_med', 'eksakt')),
  motpart text,
  kategori text,
  underkategori text,
  kostnadstype text,
  inntektstype text,
  utgiftstype text,
  prioritet integer DEFAULT 0,
  aktiv boolean DEFAULT true,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.klassifiseringsregler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own regler" ON public.klassifiseringsregler FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own regler" ON public.klassifiseringsregler FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own regler" ON public.klassifiseringsregler FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own regler" ON public.klassifiseringsregler FOR DELETE USING (auth.uid() = user_id);

-- 4. Abonnementer table
CREATE TABLE public.abonnementer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  navn text NOT NULL,
  leverandor text NOT NULL,
  beskrivelse text,
  kategori text NOT NULL DEFAULT 'Privat'
    CHECK (kategori IN ('Privat', 'Motivus AS', 'Multis EHF')),
  type text,
  belop_original numeric NOT NULL,
  valuta text DEFAULT 'NOK',
  belop_nok numeric NOT NULL,
  faktureringsperiode text DEFAULT 'månedlig'
    CHECK (faktureringsperiode IN ('månedlig', 'kvartalsvis', 'halvårlig', 'årlig')),
  trekkdato integer,
  betalingskort text,
  nettside text,
  aktiv boolean DEFAULT true,
  startdato date,
  sluttdato date,
  notater text,
  opprettet timestamptz DEFAULT now(),
  oppdatert timestamptz DEFAULT now()
);

ALTER TABLE public.abonnementer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own abonnementer" ON public.abonnementer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own abonnementer" ON public.abonnementer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own abonnementer" ON public.abonnementer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own abonnementer" ON public.abonnementer FOR DELETE USING (auth.uid() = user_id);

-- Triggers

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_oppdatert_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.oppdatert = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_transaksjoner_oppdatert
  BEFORE UPDATE ON public.transaksjoner
  FOR EACH ROW EXECUTE FUNCTION public.update_oppdatert_column();

CREATE TRIGGER update_abonnementer_oppdatert
  BEFORE UPDATE ON public.abonnementer
  FOR EACH ROW EXECUTE FUNCTION public.update_oppdatert_column();

-- Fradragsberettiget trigger
CREATE OR REPLACE FUNCTION public.set_fradragsberettiget()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kategori = 'Eiersameie E7' AND NEW.underkategori = 'Drift og vedlikehold' THEN
    NEW.fradragsberettiget = true;
  ELSE
    NEW.fradragsberettiget = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_transaksjoner_fradragsberettiget
  BEFORE INSERT OR UPDATE ON public.transaksjoner
  FOR EACH ROW EXECUTE FUNCTION public.set_fradragsberettiget();

-- Skatteår trigger
CREATE OR REPLACE FUNCTION public.set_skatteaar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.skatteaar IS NULL THEN
    NEW.skatteaar = extract(year FROM NEW.dato);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_transaksjoner_skatteaar
  BEFORE INSERT ON public.transaksjoner
  FOR EACH ROW EXECUTE FUNCTION public.set_skatteaar();

-- Seed data function (called after first login)
CREATE OR REPLACE FUNCTION public.seed_user_data(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Only seed if user has no kontoer yet
  IF EXISTS (SELECT 1 FROM public.kontoer WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- Seed kontoer
  INSERT INTO public.kontoer (user_id, kontonummer, navn, type, eier) VALUES
    (p_user_id, '0540.34.78204', 'Brukskonto', 'brukskonto', 'Sebastian'),
    (p_user_id, '1224.18.35675', 'Felleskonto E7', 'brukskonto', 'Eiersameie'),
    (p_user_id, '1228.39.38512', 'Bufferkonto', 'brukskonto', 'Sebastian'),
    (p_user_id, '1228.43.05084', 'Organics konto', 'brukskonto', 'Sebastian'),
    (p_user_id, '1260.25.98533', 'Aksjesparekonto', 'aksjesparekonto', 'Sebastian'),
    (p_user_id, '1578.09.58992', 'Aksjehandelskonto', 'aksjehandelskonto', 'Sebastian');

  -- Seed klassifiseringsregler
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
    (p_user_id, 'morten sagstad', 'Morten Sagstad', 'Eiersameie E7', NULL, 'Leieinntekt', NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
