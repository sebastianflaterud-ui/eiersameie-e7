# Project Memory

## Core
Transaksjonsbanken: Norsk økonomiapp for utleier. All UI på norsk.
Dato: DD.MM.YY. Beløp: 38.265,00 kr. Grønn=inntekt, rød=utgift.
Lys sidebar, lyst innhold. shadcn/ui. Desktop-first.
Kategorier: Privat, Eiersameie E7, Motivus AS, Uklassifisert.
Lovable Cloud backend. Kontonr/KID/ref som TEXT.

## Memories
- [DB schema](mem://features/db-schema) — Tables: transaksjoner, klassifiseringsregler, kontoer, abonnementer, eiere, enheter, leietakere, leieforhold, mellomvaerende, mellomvaerende_bevegelser, investeringer, investering_bidrag, kontrakter, kontrakt_leietakere, kontrakt_hendelser, kontrakt_versjoner, bilag
- [Nav structure](mem://features/navigation) — 18 sidebar items: Dashboard, Transaksjoner, Import, Datavasking, Enheter, Leietakere, Kontrakter, Beleggsoversikt, Leieinntekter, Eiersameie E7, Eiere, Mellomværende, Investeringer, Abonnementer, Skattemeldingsgrunnlag, Regler, Kontoer, Chat
- [Import formats](mem://features/import) — PDF (DNB), CSV, nettbank paste, manual
- [Tax structure](mem://features/tax) — Tomannsbolig, 2 boenheter, all income taxable 22%, 50% rule not met
- [Contracts](mem://features/contracts) — PDF generation via @react-pdf/renderer, kontrakter + kontrakt_leietakere tables, auto-versioning
