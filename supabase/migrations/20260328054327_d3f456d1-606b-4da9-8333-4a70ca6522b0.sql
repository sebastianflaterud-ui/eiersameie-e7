
CREATE TABLE public.fakturaer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  fakturanr text NOT NULL,
  leietaker_id uuid REFERENCES public.leietakere(id) NOT NULL,
  leieforhold_id uuid REFERENCES public.leieforhold(id) NOT NULL,
  enhet_id uuid REFERENCES public.enheter(id),
  maaned text NOT NULL,
  aar integer NOT NULL,
  belop numeric NOT NULL,
  forfall date NOT NULL,
  status text NOT NULL DEFAULT 'ikke_forfalt',
  betalt_belop numeric DEFAULT 0,
  betalt_dato date,
  generert_dato date NOT NULL DEFAULT current_date,
  notater text,
  opprettet timestamptz DEFAULT now(),
  oppdatert timestamptz DEFAULT now()
);

ALTER TABLE public.fakturaer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own fakturaer" ON public.fakturaer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fakturaer" ON public.fakturaer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fakturaer" ON public.fakturaer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fakturaer" ON public.fakturaer FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.faktura_mottakere (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  faktura_id uuid REFERENCES public.fakturaer(id) ON DELETE CASCADE NOT NULL,
  mottaker_navn text NOT NULL,
  kontonummer text NOT NULL,
  belop numeric NOT NULL,
  betalingsreferanse text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.faktura_mottakere ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own faktura_mottakere" ON public.faktura_mottakere FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own faktura_mottakere" ON public.faktura_mottakere FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own faktura_mottakere" ON public.faktura_mottakere FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own faktura_mottakere" ON public.faktura_mottakere FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.faktura_betalinger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  faktura_id uuid REFERENCES public.fakturaer(id) ON DELETE CASCADE NOT NULL,
  transaksjon_id uuid REFERENCES public.transaksjoner(id) ON DELETE SET NULL,
  belop numeric NOT NULL,
  dato date NOT NULL,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.faktura_betalinger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own faktura_betalinger" ON public.faktura_betalinger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own faktura_betalinger" ON public.faktura_betalinger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own faktura_betalinger" ON public.faktura_betalinger FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own faktura_betalinger" ON public.faktura_betalinger FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.faktura_justeringer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  faktura_id uuid REFERENCES public.fakturaer(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  fra_verdi text,
  til_verdi text,
  kommentar text NOT NULL,
  utfort_av text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.faktura_justeringer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own faktura_justeringer" ON public.faktura_justeringer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own faktura_justeringer" ON public.faktura_justeringer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own faktura_justeringer" ON public.faktura_justeringer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own faktura_justeringer" ON public.faktura_justeringer FOR DELETE USING (auth.uid() = user_id);
