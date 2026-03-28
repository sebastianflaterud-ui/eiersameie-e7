
ALTER TABLE transaksjoner ADD COLUMN IF NOT EXISTS betaler_eier text;
ALTER TABLE transaksjoner ADD COLUMN IF NOT EXISTS kostnadsbeskrivelse text;
