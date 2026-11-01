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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          file_url: string | null
          id: string
          label: string
          project_id: string | null
          type: string | null
          updated_at: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          file_url?: string | null
          id?: string
          label: string
          project_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Update: {
          file_url?: string | null
          id?: string
          label?: string
          project_id?: string | null
          type?: string | null
          updated_at?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          area_sf: number | null
          contact_id: string | null
          created_at: string | null
          direct_cost_subtotal: number
          id: string
          line_items: Json
          notes: string | null
          overhead_amount: number
          pre_tax_total: number
          profit_amount: number
          project_id: string | null
          status: string
          subtotal: number
          system_id: string | null
          tax_amount: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          area_sf?: number | null
          contact_id?: string | null
          created_at?: string | null
          direct_cost_subtotal?: number
          id?: string
          line_items?: Json
          notes?: string | null
          overhead_amount?: number
          pre_tax_total?: number
          profit_amount?: number
          project_id?: string | null
          status?: string
          subtotal?: number
          system_id?: string | null
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Update: {
          area_sf?: number | null
          contact_id?: string | null
          created_at?: string | null
          direct_cost_subtotal?: number
          id?: string
          line_items?: Json
          notes?: string | null
          overhead_amount?: number
          pre_tax_total?: number
          profit_amount?: number
          project_id?: string | null
          status?: string
          subtotal?: number
          system_id?: string | null
          tax_amount?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number | null
          contact_id: string | null
          created_at: string | null
          deposit_applied: number
          due_date: string | null
          estimate_id: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          line_items: Json
          notes: string | null
          paid: boolean
          paid_date: string | null
          payment_terms: string | null
          project_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_applied: number
          tax_rate: number
          terms: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          balance_due?: number | null
          contact_id?: string | null
          created_at?: string | null
          deposit_applied?: number
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          line_items?: Json
          notes?: string | null
          paid?: boolean
          paid_date?: string | null
          payment_terms?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_applied?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_paid?: number
          balance_due?: number | null
          contact_id?: string | null
          created_at?: string | null
          deposit_applied?: number
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          line_items?: Json
          notes?: string | null
          paid?: boolean
          paid_date?: string | null
          payment_terms?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_applied?: number
          tax_rate?: number
          terms?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          id: string
          image_url: string | null
          phase: string | null
          project_id: string | null
          taken_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          id?: string
          image_url?: string | null
          phase?: string | null
          project_id?: string | null
          taken_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          caption?: string | null
          id?: string
          image_url?: string | null
          phase?: string | null
          project_id?: string | null
          taken_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          contact_id: string | null
          contract_value: number | null
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          id: string
          image_url: string | null
          notes: string | null
          project_id: string | null
          receipt_date: string
          tax_deductible: boolean | null
          tax_year: string | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          project_id?: string | null
          receipt_date: string
          tax_deductible?: boolean | null
          tax_year?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          project_id?: string | null
          receipt_date?: string
          tax_deductible?: boolean | null
          tax_year?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          application_notes: string | null
          coats: number | null
          cost_per_unit: number | null
          coverage_rate: number | null
          coverage_unit: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          labor_rate_per_sf: number | null
          manufacturer: string | null
          min_charge: number | null
          name: string
          prep_tier_notes: string | null
          substrate_notes: string | null
          sundries_pct: number
          typical_equipment: string | null
          updated_at: string | null
          user_id: string
          waste_factor: number
        }
        Insert: {
          application_notes?: string | null
          coats?: number | null
          cost_per_unit?: number | null
          coverage_rate?: number | null
          coverage_unit?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          labor_rate_per_sf?: number | null
          manufacturer?: string | null
          min_charge?: number | null
          name: string
          prep_tier_notes?: string | null
          substrate_notes?: string | null
          sundries_pct?: number
          typical_equipment?: string | null
          updated_at?: string | null
          user_id?: string
          waste_factor?: number
        }
        Update: {
          application_notes?: string | null
          coats?: number | null
          cost_per_unit?: number | null
          coverage_rate?: number | null
          coverage_unit?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          labor_rate_per_sf?: number | null
          manufacturer?: string | null
          min_charge?: number | null
          name?: string
          prep_tier_notes?: string | null
          substrate_notes?: string | null
          sundries_pct?: number
          typical_equipment?: string | null
          updated_at?: string | null
          user_id?: string
          waste_factor?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          company_address: string | null
          company_name: string
          created_at: string
          default_deposit_pct: number
          default_overhead_pct: number
          default_profit_pct: number
          default_tax_rate: number
          default_waste_factor: number
          id: string
          license_number: string | null
          minimum_charge: number
          mobilization_fee: number
          sundries_pct: number
          terms_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_address?: string | null
          company_name?: string
          created_at?: string
          default_deposit_pct?: number
          default_overhead_pct?: number
          default_profit_pct?: number
          default_tax_rate?: number
          default_waste_factor?: number
          id?: string
          license_number?: string | null
          minimum_charge?: number
          mobilization_fee?: number
          sundries_pct?: number
          terms_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          company_address?: string | null
          company_name?: string
          created_at?: string
          default_deposit_pct?: number
          default_overhead_pct?: number
          default_profit_pct?: number
          default_tax_rate?: number
          default_waste_factor?: number
          id?: string
          license_number?: string | null
          minimum_charge?: number
          mobilization_fee?: number
          sundries_pct?: number
          terms_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_owns: {
        Args: { _id: string; _table: unknown; _user: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
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
    Enums: {
      app_role: ["admin", "manager", "user"],
    },
  },
} as const
