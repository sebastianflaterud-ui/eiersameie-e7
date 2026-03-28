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
      bilag: {
        Row: {
          beskrivelse: string | null
          filnavn: string
          filstorrelse: number | null
          filtype: string
          id: string
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
          opprettet?: string | null
          storage_path?: string
          transaksjon_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bilag_transaksjon_id_fkey"
            columns: ["transaksjon_id"]
            isOneToOne: false
            referencedRelation: "transaksjoner"
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
          etasje: string | null
          fasiliteter: string | null
          id: string
          maanedsleie_standard: number | null
          navn: string
          opprettet: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          aktiv?: boolean | null
          areal_kvm?: number | null
          beskrivelse?: string | null
          etasje?: string | null
          fasiliteter?: string | null
          id?: string
          maanedsleie_standard?: number | null
          navn: string
          opprettet?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          aktiv?: boolean | null
          areal_kvm?: number | null
          beskrivelse?: string | null
          etasje?: string | null
          fasiliteter?: string | null
          id?: string
          maanedsleie_standard?: number | null
          navn?: string
          opprettet?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      leieforhold: {
        Row: {
          avtalt_leie: number
          depositum: number | null
          depositumskonto: string | null
          enhet_id: string
          id: string
          innflytting: string
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
          id?: string
          innflytting: string
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
          id?: string
          innflytting?: string
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
          id: string
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
          id?: string
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
          id?: string
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
