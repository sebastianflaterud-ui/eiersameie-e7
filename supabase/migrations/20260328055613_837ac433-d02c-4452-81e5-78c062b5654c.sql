
-- Attach triggers to transaksjoner table (they exist as functions but are NOT connected)

-- 1. set_fradragsberettiget trigger
CREATE TRIGGER trg_set_fradragsberettiget
  BEFORE INSERT OR UPDATE ON public.transaksjoner
  FOR EACH ROW
  EXECUTE FUNCTION public.set_fradragsberettiget();

-- 2. set_skatteaar trigger
CREATE TRIGGER trg_set_skatteaar
  BEFORE INSERT OR UPDATE ON public.transaksjoner
  FOR EACH ROW
  EXECUTE FUNCTION public.set_skatteaar();

-- 3. update_oppdatert_column trigger on transaksjoner
CREATE TRIGGER trg_update_oppdatert_transaksjoner
  BEFORE UPDATE ON public.transaksjoner
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oppdatert_column();

-- 4. update_oppdatert_column trigger on other tables that have oppdatert column
CREATE TRIGGER trg_update_oppdatert_abonnementer
  BEFORE UPDATE ON public.abonnementer
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oppdatert_column();

CREATE TRIGGER trg_update_oppdatert_mellomvaerende
  BEFORE UPDATE ON public.mellomvaerende
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oppdatert_column();

CREATE TRIGGER trg_update_oppdatert_kontrakter
  BEFORE UPDATE ON public.kontrakter
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oppdatert_column();

CREATE TRIGGER trg_update_oppdatert_fakturaer
  BEFORE UPDATE ON public.fakturaer
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oppdatert_column();

-- 5. Fix set_fradragsberettiget to also handle mangler_underlag
CREATE OR REPLACE FUNCTION public.set_fradragsberettiget()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mangler_underlag = true THEN
    NEW.fradragsberettiget = false;
  ELSIF NEW.kategori = 'Eiersameie E7' AND NEW.underkategori = 'Drift og vedlikehold' THEN
    NEW.fradragsberettiget = true;
  ELSE
    NEW.fradragsberettiget = false;
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. Performance indexes on transaksjoner
CREATE INDEX IF NOT EXISTS idx_transaksjoner_dato ON public.transaksjoner(dato);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_kategori ON public.transaksjoner(kategori);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_retning ON public.transaksjoner(retning);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_klassifisering_status ON public.transaksjoner(klassifisering_status);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_duplikat_hash ON public.transaksjoner(duplikat_hash);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_konto ON public.transaksjoner(konto);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_skatteaar ON public.transaksjoner(skatteaar);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_er_oppgjor ON public.transaksjoner(er_oppgjor);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_mangler_underlag ON public.transaksjoner(mangler_underlag);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_user_id ON public.transaksjoner(user_id);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_user_dato ON public.transaksjoner(user_id, dato);
CREATE INDEX IF NOT EXISTS idx_transaksjoner_user_kategori ON public.transaksjoner(user_id, kategori);

-- Indexes on other frequently queried tables
CREATE INDEX IF NOT EXISTS idx_leieforhold_leietaker_id ON public.leieforhold(leietaker_id);
CREATE INDEX IF NOT EXISTS idx_leieforhold_enhet_id ON public.leieforhold(enhet_id);
CREATE INDEX IF NOT EXISTS idx_fakturaer_leietaker_id ON public.fakturaer(leietaker_id);
CREATE INDEX IF NOT EXISTS idx_fakturaer_aar ON public.fakturaer(aar);
CREATE INDEX IF NOT EXISTS idx_bilag_transaksjon_id ON public.bilag(transaksjon_id);
CREATE INDEX IF NOT EXISTS idx_mellomvaerende_bevegelser_mellomvaerende_id ON public.mellomvaerende_bevegelser(mellomvaerende_id);
