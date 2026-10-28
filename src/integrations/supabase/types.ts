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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          id: string
          name: string
          org_id: string | null
          type: string
        }
        Insert: {
          balance?: number
          id?: string
          name: string
          org_id?: string | null
          type?: string
        }
        Update: {
          balance?: number
          id?: string
          name?: string
          org_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent: string
          created_at: string
          id: string
          input: Json | null
          latency_ms: number | null
          org_id: string | null
          output: Json | null
          tokens: number | null
        }
        Insert: {
          agent: string
          created_at?: string
          id?: string
          input?: Json | null
          latency_ms?: number | null
          org_id?: string | null
          output?: Json | null
          tokens?: number | null
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          input?: Json | null
          latency_ms?: number | null
          org_id?: string | null
          output?: Json | null
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          org_id: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          balance_due: number
          created_at: string
          email: string | null
          id: string
          name: string
          org_id: string | null
          phone: string | null
          status: string
        }
        Insert: {
          balance_due?: number
          created_at?: string
          email?: string | null
          id?: string
          name: string
          org_id?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          balance_due?: number
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          org_id?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          full_name: string
          hire_date: string
          id: string
          org_id: string | null
          position: string | null
          salary: number
          status: string
        }
        Insert: {
          full_name: string
          hire_date?: string
          id?: string
          org_id?: string | null
          position?: string | null
          salary?: number
          status?: string
        }
        Update: {
          full_name?: string
          hire_date?: string
          id?: string
          org_id?: string | null
          position?: string | null
          salary?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          employee_id: string
          end_date: string
          id: string
          start_date: string
          status: string
          type: string
        }
        Insert: {
          employee_id: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          type?: string
        }
        Update: {
          employee_id?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      org_wallets: {
        Row: {
          created_at: string
          network: string
          org_id: string
          public_key: string
          secret_key: string
        }
        Insert: {
          created_at?: string
          network?: string
          org_id: string
          public_key: string
          secret_key: string
        }
        Update: {
          created_at?: string
          network?: string
          org_id?: string
          public_key?: string
          secret_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_wallets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          currency_default: string
          id: string
          name: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency_default?: string
          id?: string
          name: string
        }
        Update: {
          country?: string
          created_at?: string
          currency_default?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_fiat: number
          amount_token: number | null
          asset_code: string | null
          confirmed_at: string | null
          created_at: string
          currency_fiat: string
          error_message: string | null
          id: string
          org_id: string | null
          status: string
          stellar_tx_hash: string | null
          submitted_at: string | null
          supplier_id: string
        }
        Insert: {
          amount_fiat: number
          amount_token?: number | null
          asset_code?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_fiat?: string
          error_message?: string | null
          id?: string
          org_id?: string | null
          status?: string
          stellar_tx_hash?: string | null
          submitted_at?: string | null
          supplier_id: string
        }
        Update: {
          amount_fiat?: number
          amount_token?: number | null
          asset_code?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_fiat?: string
          error_message?: string | null
          id?: string
          org_id?: string | null
          status?: string
          stellar_tx_hash?: string | null
          submitted_at?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          org_id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          org_id: string
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          asset_pref: string | null
          created_at: string
          id: string
          name: string
          org_id: string | null
          stellar_address: string | null
        }
        Insert: {
          asset_pref?: string | null
          created_at?: string
          id?: string
          name: string
          org_id?: string | null
          stellar_address?: string | null
        }
        Update: {
          asset_pref?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string | null
          stellar_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          client_id: string | null
          currency: string
          description: string | null
          id: string
          occurred_at: string
          org_id: string | null
          payment_id: string | null
          supplier_id: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string
          client_id?: string | null
          currency?: string
          description?: string | null
          id?: string
          occurred_at?: string
          org_id?: string | null
          payment_id?: string | null
          supplier_id?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          client_id?: string | null
          currency?: string
          description?: string | null
          id?: string
          occurred_at?: string
          org_id?: string | null
          payment_id?: string | null
          supplier_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      finalize_payment: {
        Args: { _hash: string; _payment_id: string }
        Returns: undefined
      }
      seed_demo_data: { Args: { _org: string }; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
