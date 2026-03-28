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
