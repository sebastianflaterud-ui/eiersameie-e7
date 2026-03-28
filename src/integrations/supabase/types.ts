export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      abonnementer: {
        Row: {
          aktiv: boolean | null
          belop_nok: number
          belop_original: number
          beskrivelse: string | null
          betalingskort: string | null
          faktureringsperiode: string | null
          id: string
          kategori: string
          leverandor: string
          navn: string
          nettside: string | null
          notater: string | null
          oppdatert: string | null
          opprettet: string | null
          sluttdato: string | null
          startdato: string | null
          trekkdato: number | null
          type: string | null
          user_id: string
          valuta: string | null
        }
        Insert: {
          aktiv?: boolean | null
          belop_nok: number
          belop_original: number
          beskrivelse?: string | null
          betalingskort?: string | null
          faktureringsperiode?: string | null
          id?: string
          kategori?: string
          leverandor: string
          navn: string
          nettside?: string | null
          notater?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          sluttdato?: string | null
          startdato?: string | null
          trekkdato?: number | null
          type?: string | null
          user_id: string
          valuta?: string | null
        }
        Update: {
          aktiv?: boolean | null
          belop_nok?: number
          belop_original?: number
          beskrivelse?: string | null
          betalingskort?: string | null
          faktureringsperiode?: string | null
          id?: string
          kategori?: string
          leverandor?: string
          navn?: string
          nettside?: string | null
          notater?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          sluttdato?: string | null
          startdato?: string | null
          trekkdato?: number | null
          type?: string | null
          user_id?: string
          valuta?: string | null
        }
        Relationships: []
      }
      betalingsmottakere: {
        Row: {
          belop: number
          id: string
          kontonummer: string | null
          leieforhold_id: string
          mottaker_navn: string
          opprettet: string | null
          user_id: string
        }
        Insert: {
          belop: number
          id?: string
          kontonummer?: string | null
          leieforhold_id: string
          mottaker_navn: string
          opprettet?: string | null
          user_id: string
        }
        Update: {
          belop?: number
          id?: string
          kontonummer?: string | null
          leieforhold_id?: string
          mottaker_navn?: string
          opprettet?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "betalingsmottakere_leieforhold_id_fkey"
            columns: ["leieforhold_id"]
            isOneToOne: false
            referencedRelation: "leieforhold"
            referencedColumns: ["id"]
          },
        ]
      }
      bilag: {
        Row: {
          beskrivelse: string | null
          filnavn: string
          filstorrelse: number | null
          filtype: string
          id: string
          kontrakt_id: string | null
          opprettet: string | null
          storage_path: string
          transaksjon_id: string | null
          user_id: string
        }
        Insert: {
          beskrivelse?: string | null
          filnavn: string
          filstorrelse?: number | null
          filtype: string
          id?: string
          kontrakt_id?: string | null
          opprettet?: string | null
          storage_path: string
          transaksjon_id?: string | null
          user_id: string
        }
        Update: {
          beskrivelse?: string | null
          filnavn?: string
          filstorrelse?: number | null
          filtype?: string
          id?: string
          kontrakt_id?: string | null
          opprettet?: string | null
          storage_path?: string
          transaksjon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bilag_kontrakt_id_fkey"
            columns: ["kontrakt_id"]
            isOneToOne: false
            referencedRelation: "kontrakter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilag_transaksjon_id_fkey"
            columns: ["transaksjon_id"]
            isOneToOne: false
            referencedRelation: "transaksjoner"
            referencedColumns: ["id"]
          },
        ]
      }
      eier_historikk: {
        Row: {
          beskrivelse: string
          dato: string
          id: string
          opprettet: string | null
          type: string
          user_id: string
        }
        Insert: {
          beskrivelse: string
          dato: string
          id?: string
          opprettet?: string | null
          type: string
          user_id: string
        }
        Update: {
          beskrivelse?: string
          dato?: string
          id?: string
          opprettet?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      eier_historikk_detaljer: {
        Row: {
          andel_etter: number
          andel_for: number
          eier_navn: string
          historikk_id: string
          id: string
          merknad: string | null
          opprettet: string | null
          user_id: string
        }
        Insert: {
          andel_etter: number
          andel_for: number
          eier_navn: string
          historikk_id: string
          id?: string
          merknad?: string | null
          opprettet?: string | null
          user_id: string
        }
        Update: {
          andel_etter?: number
          andel_for?: number
          eier_navn?: string
          historikk_id?: string
          id?: string
          merknad?: string | null
          opprettet?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eier_historikk_detaljer_historikk_id_fkey"
            columns: ["historikk_id"]
            isOneToOne: false
            referencedRelation: "eier_historikk"
            referencedColumns: ["id"]
          },
        ]
      }
      eiere: {
        Row: {
          aktiv: boolean | null
          eierandel_prosent: number
          epost: string | null
          gyldig_fra: string | null
          gyldig_til: string | null
          id: string
          identifikator: string | null
          inntektsandel_prosent: number
          kostnadsandel_prosent: number
          navn: string
          notater: string | null
          opprettet: string | null
          orgnr: string | null
          sist_endret: string | null
          telefon: string | null
          type: string
          user_id: string
        }
        Insert: {
          aktiv?: boolean | null
          eierandel_prosent: number
          epost?: string | null
          gyldig_fra?: string | null
          gyldig_til?: string | null
          id?: string
          identifikator?: string | null
          inntektsandel_prosent: number
          kostnadsandel_prosent: number
          navn: string
          notater?: string | null
          opprettet?: string | null
          orgnr?: string | null
          sist_endret?: string | null
          telefon?: string | null
          type: string
          user_id: string
        }
        Update: {
          aktiv?: boolean | null
          eierandel_prosent?: number
          epost?: string | null
          gyldig_fra?: string | null
          gyldig_til?: string | null
          id?: string
          identifikator?: string | null
          inntektsandel_prosent?: number
          kostnadsandel_prosent?: number
          navn?: string
          notater?: string | null
          opprettet?: string | null
          orgnr?: string | null
          sist_endret?: string | null
          telefon?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      enheter: {
        Row: {
          aktiv: boolean | null
          areal_kvm: number | null
          beskrivelse: string | null
          boenhet: string | null
          disponert_av: string | null
          etasje: string | null
          fasiliteter: string | null
          id: string
          maanedsleie_standard: number | null
          markedsleie_estimat: number | null
          navn: string
          opprettet: string | null
          skattemessig_type: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          aktiv?: boolean | null
          areal_kvm?: number | null
          beskrivelse?: string | null
          boenhet?: string | null
          disponert_av?: string | null
          etasje?: string | null
          fasiliteter?: string | null
          id?: string
          maanedsleie_standard?: number | null
          markedsleie_estimat?: number | null
          navn: string
          opprettet?: string | null
          skattemessig_type?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          aktiv?: boolean | null
          areal_kvm?: number | null
          beskrivelse?: string | null
          boenhet?: string | null
          disponert_av?: string | null
          etasje?: string | null
          fasiliteter?: string | null
          id?: string
          maanedsleie_standard?: number | null
          markedsleie_estimat?: number | null
          navn?: string
          opprettet?: string | null
          skattemessig_type?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      faktura_betalinger: {
        Row: {
          belop: number
          dato: string
          faktura_id: string
          id: string
          opprettet: string | null
          transaksjon_id: string | null
          user_id: string
        }
        Insert: {
          belop: number
          dato: string
          faktura_id: string
          id?: string
          opprettet?: string | null
          transaksjon_id?: string | null
          user_id: string
        }
        Update: {
          belop?: number
          dato?: string
          faktura_id?: string
          id?: string
          opprettet?: string | null
          transaksjon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faktura_betalinger_faktura_id_fkey"
            columns: ["faktura_id"]
            isOneToOne: false
            referencedRelation: "fakturaer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faktura_betalinger_transaksjon_id_fkey"
            columns: ["transaksjon_id"]
            isOneToOne: false
            referencedRelation: "transaksjoner"
            referencedColumns: ["id"]
          },
        ]
      }
      faktura_justeringer: {
        Row: {
          faktura_id: string
          fra_verdi: string | null
          id: string
          kommentar: string
          opprettet: string | null
          til_verdi: string | null
          type: string
          user_id: string
          utfort_av: string | null
        }
        Insert: {
          faktura_id: string
          fra_verdi?: string | null
          id?: string
          kommentar: string
          opprettet?: string | null
          til_verdi?: string | null
          type: string
          user_id: string
          utfort_av?: string | null
        }
        Update: {
          faktura_id?: string
          fra_verdi?: string | null
          id?: string
          kommentar?: string
          opprettet?: string | null
          til_verdi?: string | null
          type?: string
          user_id?: string
          utfort_av?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faktura_justeringer_faktura_id_fkey"
            columns: ["faktura_id"]
            isOneToOne: false
            referencedRelation: "fakturaer"
            referencedColumns: ["id"]
          },
        ]
      }
      faktura_mottakere: {
        Row: {
          belop: number
          betalingsreferanse: string | null
          faktura_id: string
          id: string
          kontonummer: string
          mottaker_navn: string
          opprettet: string | null
          user_id: string
        }
        Insert: {
          belop: number
          betalingsreferanse?: string | null
          faktura_id: string
          id?: string
          kontonummer: string
          mottaker_navn: string
          opprettet?: string | null
          user_id: string
        }
        Update: {
          belop?: number
          betalingsreferanse?: string | null
          faktura_id?: string
          id?: string
          kontonummer?: string
          mottaker_navn?: string
          opprettet?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faktura_mottakere_faktura_id_fkey"
            columns: ["faktura_id"]
            isOneToOne: false
            referencedRelation: "fakturaer"
            referencedColumns: ["id"]
          },
        ]
      }
      fakturaer: {
        Row: {
          aar: number
          belop: number
          betalt_belop: number | null
          betalt_dato: string | null
          enhet_id: string | null
          fakturanr: string
          forfall: string
          generert_dato: string
          id: string
          leieforhold_id: string
          leietaker_id: string
          maaned: string
          notater: string | null
          oppdatert: string | null
          opprettet: string | null
          status: string
          user_id: string
        }
        Insert: {
          aar: number
          belop: number
          betalt_belop?: number | null
          betalt_dato?: string | null
          enhet_id?: string | null
          fakturanr: string
          forfall: string
          generert_dato?: string
          id?: string
          leieforhold_id: string
          leietaker_id: string
          maaned: string
          notater?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          status?: string
          user_id: string
        }
        Update: {
          aar?: number
          belop?: number
          betalt_belop?: number | null
          betalt_dato?: string | null
          enhet_id?: string | null
          fakturanr?: string
          forfall?: string
          generert_dato?: string
          id?: string
          leieforhold_id?: string
          leietaker_id?: string
          maaned?: string
          notater?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fakturaer_enhet_id_fkey"
            columns: ["enhet_id"]
            isOneToOne: false
            referencedRelation: "enheter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fakturaer_leieforhold_id_fkey"
            columns: ["leieforhold_id"]
            isOneToOne: false
            referencedRelation: "leieforhold"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fakturaer_leietaker_id_fkey"
            columns: ["leietaker_id"]
            isOneToOne: false
            referencedRelation: "leietakere"
            referencedColumns: ["id"]
          },
        ]
      }
      investering_bidrag: {
        Row: {
          betalt_av: string | null
          bidrag_belop: number
          bidrag_prosent: number | null
          eier_navn: string
          id: string
          investering_id: string
          notater: string | null
          opprettet: string | null
          user_id: string
        }
        Insert: {
          betalt_av?: string | null
          bidrag_belop: number
          bidrag_prosent?: number | null
          eier_navn: string
          id?: string
          investering_id: string
          notater?: string | null
          opprettet?: string | null
          user_id: string
        }
        Update: {
          betalt_av?: string | null
          bidrag_belop?: number
          bidrag_prosent?: number | null
          eier_navn?: string
          id?: string
          investering_id?: string
          notater?: string | null
          opprettet?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investering_bidrag_investering_id_fkey"
            columns: ["investering_id"]
            isOneToOne: false
            referencedRelation: "investeringer"
            referencedColumns: ["id"]
          },
        ]
      }
      investeringer: {
        Row: {
          beskrivelse: string | null
          id: string
          navn: string
          opprettet: string | null
          periode_fra: string | null
          periode_til: string | null
          total_investering: number
          user_id: string
        }
        Insert: {
          beskrivelse?: string | null
          id?: string
          navn: string
          opprettet?: string | null
          periode_fra?: string | null
          periode_til?: string | null
          total_investering: number
          user_id: string
        }
        Update: {
          beskrivelse?: string | null
          id?: string
          navn?: string
          opprettet?: string | null
          periode_fra?: string | null
          periode_til?: string | null
          total_investering?: number
          user_id?: string
        }
        Relationships: []
      }
      kalender_hendelser: {
        Row: {
          beskrivelse: string | null
          dato: string
          enhet_id: string | null
          fullfort: boolean | null
          fullfort_dato: string | null
          gjentakelse: string | null
          id: string
          kategori: string
          opprettet: string | null
          paaminnelse_dager: number | null
          prioritet: string | null
          tittel: string
          user_id: string
        }
        Insert: {
          beskrivelse?: string | null
          dato: string
          enhet_id?: string | null
          fullfort?: boolean | null
          fullfort_dato?: string | null
          gjentakelse?: string | null
          id?: string
          kategori: string
          opprettet?: string | null
          paaminnelse_dager?: number | null
          prioritet?: string | null
          tittel: string
          user_id: string
        }
        Update: {
          beskrivelse?: string | null
          dato?: string
          enhet_id?: string | null
          fullfort?: boolean | null
          fullfort_dato?: string | null
          gjentakelse?: string | null
          id?: string
          kategori?: string
          opprettet?: string | null
          paaminnelse_dager?: number | null
          prioritet?: string | null
          tittel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kalender_hendelser_enhet_id_fkey"
            columns: ["enhet_id"]
            isOneToOne: false
            referencedRelation: "enheter"
            referencedColumns: ["id"]
          },
        ]
      }
      klassifiseringsregler: {
        Row: {
          aktiv: boolean | null
          id: string
          inntektstype: string | null
          kategori: string | null
          kostnadstype: string | null
          monster: string
          monster_type: string | null
          motpart: string | null
          opprettet: string | null
          prioritet: number | null
          underkategori: string | null
          user_id: string
          utgiftstype: string | null
        }
        Insert: {
          aktiv?: boolean | null
          id?: string
          inntektstype?: string | null
          kategori?: string | null
          kostnadstype?: string | null
          monster: string
          monster_type?: string | null
          motpart?: string | null
          opprettet?: string | null
          prioritet?: number | null
          underkategori?: string | null
          user_id: string
          utgiftstype?: string | null
        }
        Update: {
          aktiv?: boolean | null
          id?: string
          inntektstype?: string | null
          kategori?: string | null
          kostnadstype?: string | null
          monster?: string
          monster_type?: string | null
          motpart?: string | null
          opprettet?: string | null
          prioritet?: number | null
          underkategori?: string | null
          user_id?: string
          utgiftstype?: string | null
        }
        Relationships: []
      }
      kontoer: {
        Row: {
          aktiv: boolean | null
          eier: string | null
          id: string
          kontonummer: string
          navn: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          aktiv?: boolean | null
          eier?: string | null
          id?: string
          kontonummer: string
          navn?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          aktiv?: boolean | null
          eier?: string | null
          id?: string
          kontonummer?: string
          navn?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kontrakt_hendelser: {
        Row: {
          beskrivelse: string | null
          dato: string
          hendelse_type: string
          id: string
          kontrakt_id: string
          leietaker_id: string | null
          opprettet: string | null
          user_id: string
        }
        Insert: {
          beskrivelse?: string | null
          dato: string
          hendelse_type: string
          id?: string
          kontrakt_id: string
          leietaker_id?: string | null
          opprettet?: string | null
          user_id: string
        }
        Update: {
          beskrivelse?: string | null
          dato?: string
          hendelse_type?: string
          id?: string
          kontrakt_id?: string
          leietaker_id?: string | null
          opprettet?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kontrakt_hendelser_kontrakt_id_fkey"
            columns: ["kontrakt_id"]
            isOneToOne: false
            referencedRelation: "kontrakter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrakt_hendelser_leietaker_id_fkey"
            columns: ["leietaker_id"]
            isOneToOne: false
            referencedRelation: "leietakere"
            referencedColumns: ["id"]
          },
        ]
      }
      kontrakt_leietakere: {
        Row: {
          aktiv: boolean | null
          depositum: number
          enhet_id: string
          id: string
          innflytting: string
          kontrakt_id: string
          leietaker_id: string
          maanedsleie: number
          opprettet: string | null
          user_id: string
          utflytting: string | null
        }
        Insert: {
          aktiv?: boolean | null
          depositum: number
          enhet_id: string
          id?: string
          innflytting: string
          kontrakt_id: string
          leietaker_id: string
          maanedsleie: number
          opprettet?: string | null
          user_id: string
          utflytting?: string | null
        }
        Update: {
          aktiv?: boolean | null
          depositum?: number
          enhet_id?: string
          id?: string
          innflytting?: string
          kontrakt_id?: string
          leietaker_id?: string
          maanedsleie?: number
          opprettet?: string | null
          user_id?: string
          utflytting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kontrakt_leietakere_enhet_id_fkey"
            columns: ["enhet_id"]
            isOneToOne: false
            referencedRelation: "enheter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrakt_leietakere_kontrakt_id_fkey"
            columns: ["kontrakt_id"]
            isOneToOne: false
            referencedRelation: "kontrakter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrakt_leietakere_leietaker_id_fkey"
            columns: ["leietaker_id"]
            isOneToOne: false
            referencedRelation: "leietakere"
            referencedColumns: ["id"]
          },
        ]
      }
      kontrakt_versjoner: {
        Row: {
          endring_beskrivelse: string | null
          generert_dato: string | null
          id: string
          kontrakt_id: string
          storage_path: string
          user_id: string
          versjon: number
        }
        Insert: {
          endring_beskrivelse?: string | null
          generert_dato?: string | null
          id?: string
          kontrakt_id: string
          storage_path: string
          user_id: string
          versjon: number
        }
        Update: {
          endring_beskrivelse?: string | null
          generert_dato?: string | null
          id?: string
          kontrakt_id?: string
          storage_path?: string
          user_id?: string
          versjon?: number
        }
        Relationships: [
          {
            foreignKeyName: "kontrakt_versjoner_kontrakt_id_fkey"
            columns: ["kontrakt_id"]
            isOneToOne: false
            referencedRelation: "kontrakter"
            referencedColumns: ["id"]
          },
        ]
      }
      kontrakter: {
        Row: {
          betalingskonto: string | null
          boenhet: string
          depositum_multiplier: number | null
          id: string
          ikke_inkludert: string | null
          inkludert_i_leie: string | null
          kontrakt_status: string
          navn: string
          notater: string | null
          oppdatert: string | null
          opprettet: string | null
          oppsigelsestid_mnd: number | null
          ordensregler: string | null
          saerlige_bestemmelser: string | null
          sluttdato: string | null
          startdato: string
          type: string
          user_id: string
        }
        Insert: {
          betalingskonto?: string | null
          boenhet: string
          depositum_multiplier?: number | null
          id?: string
          ikke_inkludert?: string | null
          inkludert_i_leie?: string | null
          kontrakt_status?: string
          navn: string
          notater?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          oppsigelsestid_mnd?: number | null
          ordensregler?: string | null
          saerlige_bestemmelser?: string | null
          sluttdato?: string | null
          startdato: string
          type?: string
          user_id: string
        }
        Update: {
          betalingskonto?: string | null
          boenhet?: string
          depositum_multiplier?: number | null
          id?: string
          ikke_inkludert?: string | null
          inkludert_i_leie?: string | null
          kontrakt_status?: string
          navn?: string
          notater?: string | null
          oppdatert?: string | null
          opprettet?: string | null
          oppsigelsestid_mnd?: number | null
          ordensregler?: string | null
          saerlige_bestemmelser?: string | null
          sluttdato?: string | null
          startdato?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      leieforhold: {
        Row: {
          avtalt_leie: number
          depositum: number | null
          depositumskonto: string | null
          enhet_id: string
          forfall_dag: number | null
          id: string
          innflytting: string
          kontrakt_id: string | null
          leiekontrakt_signert: boolean | null
          leietaker_id: string
          notater: string | null
          opprettet: string | null
          oppsigelse_dato: string | null
          oppsigelse_grunn: string | null
          status: string
          user_id: string
          utflytting: string | null
        }
        Insert: {
          avtalt_leie: number
          depositum?: number | null
          depositumskonto?: string | null
          enhet_id: string
          forfall_dag?: number | null
          id?: string
          innflytting: string
          kontrakt_id?: string | null
          leiekontrakt_signert?: boolean | null
          leietaker_id: string
          notater?: string | null
          opprettet?: string | null
          oppsigelse_dato?: string | null
          oppsigelse_grunn?: string | null
          status?: string
          user_id: string
          utflytting?: string | null
        }
        Update: {
          avtalt_leie?: number
          depositum?: number | null
          depositumskonto?: string | null
          enhet_id?: string
          forfall_dag?: number | null
          id?: string
          innflytting?: string
          kontrakt_id?: string | null
          leiekontrakt_signert?: boolean | null
          leietaker_id?: string
          notater?: string | null
          opprettet?: string | null
          oppsigelse_dato?: string | null
          oppsigelse_grunn?: string | null
          status?: string
          user_id?: string
          utflytting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leieforhold_enhet_id_fkey"
            columns: ["enhet_id"]
            isOneToOne: false
            referencedRelation: "enheter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leieforhold_kontrakt_id_fkey"
            columns: ["kontrakt_id"]
            isOneToOne: false
            referencedRelation: "kontrakter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leieforhold_leietaker_id_fkey"
            columns: ["leietaker_id"]
            isOneToOne: false
            referencedRelation: "leietakere"
            referencedColumns: ["id"]
          },
        ]
      }
      leietakere: {
        Row: {
          epost: string | null
          fodselsdato: string | null
          forfall_dag: number | null
          id: string
          konto_id: string | null
          naavaerende: boolean | null
          navn: string
          notater: string | null
          opprettet: string | null
          personnr: string | null
          telefon: string | null
          user_id: string
        }
        Insert: {
          epost?: string | null
          fodselsdato?: string | null
          forfall_dag?: number | null
          id?: string
          konto_id?: string | null
          naavaerende?: boolean | null
          navn: string
          notater?: string | null
          opprettet?: string | null
          personnr?: string | null
          telefon?: string | null
          user_id: string
        }
        Update: {
          epost?: string | null
          fodselsdato?: string | null
          forfall_dag?: number | null
          id?: string
          konto_id?: string | null
          naavaerende?: boolean | null
          navn?: string
          notater?: string | null
          opprettet?: string | null
          personnr?: string | null
          telefon?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mellomvaerende: {
        Row: {
          aktiv: boolean | null
          beskrivelse: string | null
          debitor: string
          gjeldende_saldo: number
          id: string
          innfridd_dato: string | null
          kreditor: string
          navn: string
          oppdatert: string | null
          opprettet: string | null
          opprinnelig_belop: number
          rente_prosent: number | null
          startdato: string
          type: string
          user_id: string
          valuta: string | null
        }
        Insert: {
          aktiv?: boolean | null
          beskrivelse?: string | null
          debitor: string
          gjeldende_saldo: number
          id?: string
          innfridd_dato?: string | null
          kreditor: string
          navn: string
          oppdatert?: string | null
          opprettet?: string | null
          opprinnelig_belop: number
          rente_prosent?: number | null
          startdato: string
          type?: string
          user_id: string
          valuta?: string | null
        }
        Update: {
          aktiv?: boolean | null
          beskrivelse?: string | null
          debitor?: string
          gjeldende_saldo?: number
          id?: string
          innfridd_dato?: string | null
          kreditor?: string
          navn?: string
          oppdatert?: string | null
          opprettet?: string | null
          opprinnelig_belop?: number
          rente_prosent?: number | null
          startdato?: string
          type?: string
          user_id?: string
          valuta?: string | null
        }
        Relationships: []
      }
      mellomvaerende_bevegelser: {
        Row: {
          belop: number
          beskrivelse: string | null
          dato: string
          id: string
          mellomvaerende_id: string
          opprettet: string | null
          transaksjon_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          belop: number
          beskrivelse?: string | null
          dato: string
          id?: string
          mellomvaerende_id: string
          opprettet?: string | null
          transaksjon_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          belop?: number
          beskrivelse?: string | null
          dato?: string
          id?: string
          mellomvaerende_id?: string
          opprettet?: string | null
          transaksjon_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mellomvaerende_bevegelser_mellomvaerende_id_fkey"
            columns: ["mellomvaerende_id"]
            isOneToOne: false
            referencedRelation: "mellomvaerende"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mellomvaerende_bevegelser_transaksjon_id_fkey"
            columns: ["transaksjon_id"]
            isOneToOne: false
            referencedRelation: "transaksjoner"
            referencedColumns: ["id"]
          },
        ]
      }
      transaksjoner: {
        Row: {
          arkivref: string | null
          belop: number
          beskrivelse_bank: string
          beskrivelse_egen: string | null
          betaler_eier: string | null
          betalt_av: string | null
          bokforingsdato: string | null
          dato: string
          duplikat_hash: string | null
          enhet: string | null
          er_oppgjor: boolean | null
          fradragsberettiget: boolean | null
          id: string
          inntektstype: string | null
          kategori: string
          kid: string | null
          kilde: string
          klassifisering_status: string | null
          konto: string | null
          kostnadsbeskrivelse: string | null
          kostnadstype: string | null
          leie_for: string | null
          leieperiode: string | null
          leverandor: string | null
          motpart_bank: string | null
          motpart_egen: string | null
          notater: string | null
          oppdatert: string | null
          oppgjor_til: string | null
          opprettet: string | null
          original_belop: number | null
          retning: string
          skatteaar: number | null
          underkategori: string | null
          user_id: string
          utgiftstype: string | null
          valuta: string | null
          valutakurs: number | null
        }
        Insert: {
          arkivref?: string | null
          belop: number
          beskrivelse_bank: string
          beskrivelse_egen?: string | null
          betaler_eier?: string | null
          betalt_av?: string | null
          bokforingsdato?: string | null
          dato: string
          duplikat_hash?: string | null
          enhet?: string | null
          er_oppgjor?: boolean | null
          fradragsberettiget?: boolean | null
          id?: string
          inntektstype?: string | null
          kategori?: string
          kid?: string | null
          kilde: string
          klassifisering_status?: string | null
          konto?: string | null
          kostnadsbeskrivelse?: string | null
          kostnadstype?: string | null
          leie_for?: string | null
          leieperiode?: string | null
          leverandor?: string | null
          motpart_bank?: string | null
          motpart_egen?: string | null
          notater?: string | null
          oppdatert?: string | null
          oppgjor_til?: string | null
          opprettet?: string | null
          original_belop?: number | null
          retning: string
          skatteaar?: number | null
          underkategori?: string | null
          user_id: string
          utgiftstype?: string | null
          valuta?: string | null
          valutakurs?: number | null
        }
        Update: {
          arkivref?: string | null
          belop?: number
          beskrivelse_bank?: string
          beskrivelse_egen?: string | null
          betaler_eier?: string | null
          betalt_av?: string | null
          bokforingsdato?: string | null
          dato?: string
          duplikat_hash?: string | null
          enhet?: string | null
          er_oppgjor?: boolean | null
          fradragsberettiget?: boolean | null
          id?: string
          inntektstype?: string | null
          kategori?: string
          kid?: string | null
          kilde?: string
          klassifisering_status?: string | null
          konto?: string | null
          kostnadsbeskrivelse?: string | null
          kostnadstype?: string | null
          leie_for?: string | null
          leieperiode?: string | null
          leverandor?: string | null
          motpart_bank?: string | null
          motpart_egen?: string | null
          notater?: string | null
          oppdatert?: string | null
          oppgjor_til?: string | null
          opprettet?: string | null
          original_belop?: number | null
          retning?: string
          skatteaar?: number | null
          underkategori?: string | null
          user_id?: string
          utgiftstype?: string | null
          valuta?: string | null
          valutakurs?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_user_data: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
