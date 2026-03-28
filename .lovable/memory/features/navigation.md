---
name: Navigation structure
description: Sidebar grouped into Eiendom, Utleie, Privatøkonomi, Import og data, Innstillinger
type: feature
---
Sidebar groups:
- Dashboard (/)
- **Eiendom**: Enheter, Leietakere, Kontrakter, Kalender
- **Utleie**: Leieinntekter (inkl. Belegg-fane), Eiersameie (inkl. Eiere-fane), Mellomværende, Investeringer, Skattemeldingsgrunnlag
- **Privatøkonomi**: Abonnementer
- **Import og data**: Transaksjoner, Import, Datavasking
- **Innstillinger**: Regler, Kontoer, Chat

Belegg consolidated into Leieinntekter as tab (BeleggTab component).
Eiere consolidated into Eiersameie as tab (EiereTab component).
Routes /belegg and /eiere removed.
