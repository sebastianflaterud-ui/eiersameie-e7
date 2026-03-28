# Transaksjonsbanken — Implementeringsplan

## Oversikt

Personlig økonomiapp for norsk utleier/bedriftseier med import, klassifisering, analyse og skattemeldingsgrunnlag. Alt på norsk med norsk formatering.

---

## Fase 1: Grunnmur

### Database og autentisering

- Sett opp Supabase med e-post/passord-autentisering (Lovable Cloud)
- Opprett alle fire tabeller: `transaksjoner`, `klassifiseringsregler`, `kontoer`, `abonnementer` med RLS
- Database-triggere for `fradragsberettiget`, `skatteaar`, og `oppdatert`
- Seed-data: 6 kontoer og ~25 klassifiseringsregler ved førstegangs pålogging

### App-skjelett

- Innlogging/registrering (norsk UI)
- lys sidebar med 11 navigasjonspunkter (Lucide-ikoner)
- Layout med SidebarProvider, responsivt
- Norsk tallformatering (hjelpefunksjoner for beløp og dato)

---

## Fase 2: Import

### Fire import-faner

1. **Lim inn** — Textarea med tab-separert parser for DNB nettbankdata, kontovalg
2. **CSV** — Drag-and-drop, autodetekt separator, kolonnemapping med intelligent forhåndsutfylling, standardverdier
3. **PDF** — DNB kontoutskrift-parser med pdfjs-dist:
  - Ekstraher kontonummer fra "Kontoutskrift for XXXX.XX.XXXXX"
  - Parse multi-linje transaksjoner (dato, tekst, beløp ut/inn, arkivref)
  - Håndter utenlandsvaluta (ISK, EUR, USD, DKK) med valutakurs på etterfølgende linjer
  - Støtte for flere kontoer i samme PDF
4. **Manuell** — Skjema med dynamiske felter basert på retning (inn/ut)

### Forhåndsvisning og deduplisering

- Duplikat-hash sjekk mot eksisterende transaksjoner med forslag til bruker som tar endelig avgjørelse
- Autoklassifisering med regler før lagring med forslag til bruker som tar endelig avgjørelse.
- Bulk-import med fremdriftsindikator

---

## Fase 3: Datavasking og klassifisering

### Datavasking-side

- Oversiktskort: Totalt / Klassifisert / Uklassifisert / Foreslått med prosentbar
- Triage-kø: Tabell med hurtigknapper (Privat/E7/Motivus), bulkhandlinger, filtre
- Detaljpanel: Alle felter redigerbare, dynamiske felter per retning, regelforslag etter manuell klassifisering

### Klassifiseringsmotor

- Regelbasert matching (inneholder/starter_med/eksakt) med prioritet
- Auto-klassifisering ved import og ved "Kjør regler på nytt"

---

## Fase 4: Transaksjoner, Regler og Kontoer

### Transaksjoner-side

- Full tabell med filterbar (dato, kategori, retning, konto, status, fritekst)
- Kolonnefiltrering per header, sortering, kolonnevisning-presets (Kompakt/Inntekter/Utgifter/Alle)
- Inline-redigering, radekspandering, paginering, fargekoding, statusbadges
- Bulk-handlinger og CSV-eksport

### Regler-side

- CRUD-tabell med inline-redigering og drag-and-drop prioritet
- "Kjør regler på nytt" funksjon

### Kontoer-side

- CRUD-tabell med inline-redigering

---

## Fase 5: Abonnementer

- Separat modul med CRUD-tabell og modal/sidepanel for redigering
- Oppsummeringskort: Totalt månedlig, per kategori (Privat/Motivus/Multis)
- Omregning til månedlig beløp, flervalgfiltre, sortering
- Støtte for ulike valutaer og faktureringsperioder

---

## Fase 6: Analysesider

### Analyse

- Lister med transaksjoner med fler-filter muligheter or sortering på ulike kolonner.
- Filtre gjør det mulig å vise leieinntekter, kostnader til påkost, drift og annet.
- mulighet til endre visning til måned, kanskje horisontalt eller vertikalt. 
- Ulike typer default kolonner basert på type liste man velger å vise (f.eks leieinntekter har ulike kolonner og info enn kanskje driftskostnader Eiersameie.
- CSV og PDF-eksport

---

## Fase 7: AI-chat

- Fullskjerms chat med markdown-rendering (react-markdown)
- Supabase Edge Function som proxy til Lovable AI Gateway
- Kontekst: Henter relevante transaksjoner og abonnementer basert på spørsmålet
- Norsk systemprompt med domene-kunnskap (kategorier, fradrag, eiendomsinfo)
- Foreslåtte spørsmål som klikkbare chips
- Streaming av svar med SSE

---

## Design

- lys sidebar, lyst innholdsområde, shadcn/ui komponenter
- Monospace for tall, grønn inntekt, rød utgift, blå handlingsknapper, gul advarsler
- Desktop-first, responsivt