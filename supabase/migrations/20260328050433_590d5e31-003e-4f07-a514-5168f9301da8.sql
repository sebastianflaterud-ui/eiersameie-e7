
CREATE TABLE public.eier_historikk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  dato date NOT NULL,
  type text NOT NULL CHECK (type IN ('overføring', 'justering', 'oppstart', 'annet')),
  beskrivelse text NOT NULL,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.eier_historikk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own eier_historikk" ON public.eier_historikk FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own eier_historikk" ON public.eier_historikk FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own eier_historikk" ON public.eier_historikk FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own eier_historikk" ON public.eier_historikk FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.eier_historikk_detaljer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  historikk_id uuid REFERENCES public.eier_historikk(id) ON DELETE CASCADE NOT NULL,
  eier_navn text NOT NULL,
  andel_for numeric NOT NULL,
  andel_etter numeric NOT NULL,
  merknad text,
  opprettet timestamptz DEFAULT now()
);

ALTER TABLE public.eier_historikk_detaljer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own eier_historikk_detaljer" ON public.eier_historikk_detaljer FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own eier_historikk_detaljer" ON public.eier_historikk_detaljer FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own eier_historikk_detaljer" ON public.eier_historikk_detaljer FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own eier_historikk_detaljer" ON public.eier_historikk_detaljer FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.eiere ADD COLUMN IF NOT EXISTS sist_endret date;
