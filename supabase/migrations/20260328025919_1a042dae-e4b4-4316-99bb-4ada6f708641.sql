
-- Create eiere table
CREATE TABLE public.eiere (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  navn text NOT NULL,
  type text NOT NULL CHECK (type IN ('privatperson', 'aksjeselskap')),
  orgnr text,
  eierandel_prosent numeric NOT NULL,
  inntektsandel_prosent numeric NOT NULL,
  kostnadsandel_prosent numeric NOT NULL,
  aktiv boolean DEFAULT true,
  gyldig_fra date,
  gyldig_til date,
  notater text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.eiere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own eiere" ON public.eiere FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own eiere" ON public.eiere FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own eiere" ON public.eiere FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own eiere" ON public.eiere FOR DELETE USING (auth.uid() = user_id);

-- Create bilag table
CREATE TABLE public.bilag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaksjon_id uuid REFERENCES public.transaksjoner(id) ON DELETE SET NULL,
  filnavn text NOT NULL,
  filtype text NOT NULL,
  filstorrelse integer,
  storage_path text NOT NULL,
  beskrivelse text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.bilag ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bilag" ON public.bilag FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bilag" ON public.bilag FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bilag" ON public.bilag FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bilag" ON public.bilag FOR DELETE USING (auth.uid() = user_id);

-- Add oppgjør columns to transaksjoner
ALTER TABLE public.transaksjoner ADD COLUMN er_oppgjor boolean DEFAULT false;
ALTER TABLE public.transaksjoner ADD COLUMN oppgjor_til text;

-- Create storage bucket for bilag
INSERT INTO storage.buckets (id, name, public) VALUES ('bilag', 'bilag', false);

-- Storage policies for bilag bucket
CREATE POLICY "Authenticated users can upload bilag" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bilag' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own bilag files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bilag' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own bilag files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bilag' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Update seed function to include eiere
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

  INSERT INTO public.eiere (user_id, navn, type, eierandel_prosent, inntektsandel_prosent, kostnadsandel_prosent) VALUES
    (p_user_id, 'Sebastian Flåterud', 'privatperson', 25, 25, 25),
    (p_user_id, 'Levi', 'privatperson', 25, 25, 25),
    (p_user_id, 'David Lange-Nielsen', 'privatperson', 25, 25, 25),
    (p_user_id, 'Motivus AS', 'aksjeselskap', 25, 25, 25);
END;
$function$;

-- Create triggers for transaksjoner (were missing)
CREATE OR REPLACE TRIGGER set_fradragsberettiget_trigger
  BEFORE INSERT OR UPDATE ON public.transaksjoner
  FOR EACH ROW EXECUTE FUNCTION public.set_fradragsberettiget();

CREATE OR REPLACE TRIGGER set_skatteaar_trigger
  BEFORE INSERT ON public.transaksjoner
  FOR EACH ROW EXECUTE FUNCTION public.set_skatteaar();

CREATE OR REPLACE TRIGGER update_oppdatert_transaksjoner
  BEFORE UPDATE ON public.transaksjoner
  FOR EACH ROW EXECUTE FUNCTION public.update_oppdatert_column();
