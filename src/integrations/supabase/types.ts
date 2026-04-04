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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brand_configs: {
        Row: {
          brand_name: string | null
          brand_voice: string | null
          color_palette: Json | null
          created_at: string
          default_language: string | null
          id: string
          logo_url: string | null
          updated_at: string
          user_id: string
          visual_style: string | null
        }
        Insert: {
          brand_name?: string | null
          brand_voice?: string | null
          color_palette?: Json | null
          created_at?: string
          default_language?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
          user_id: string
          visual_style?: string | null
        }
        Update: {
          brand_name?: string | null
          brand_voice?: string | null
          color_palette?: Json | null
          created_at?: string
          default_language?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
          user_id?: string
          visual_style?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          content_language: string | null
          created_at: string
          default_visual_style: string | null
          extra_context: string | null
          id: string
          inspiration_account: string | null
          keywords: string[] | null
          name: string
          objective: string | null
          tone: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          content_language?: string | null
          created_at?: string
          default_visual_style?: string | null
          extra_context?: string | null
          id?: string
          inspiration_account?: string | null
          keywords?: string[] | null
          name: string
          objective?: string | null
          tone?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          content_language?: string | null
          created_at?: string
          default_visual_style?: string | null
          extra_context?: string | null
          id?: string
          inspiration_account?: string | null
          keywords?: string[] | null
          name?: string
          objective?: string | null
          tone?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_posts: {
        Row: {
          client_id: string | null
          content_category: string | null
          content_data: Json | null
          created_at: string
          cta: string | null
          description: string | null
          generated_image_url: string | null
          hashtags: string[] | null
          id: string
          main_copy: string | null
          objective: string | null
          original_image_url: string | null
          post_type: string
          story_copy: string | null
          title: string
          user_id: string
          visual_style: string | null
        }
        Insert: {
          client_id?: string | null
          content_category?: string | null
          content_data?: Json | null
          created_at?: string
          cta?: string | null
          description?: string | null
          generated_image_url?: string | null
          hashtags?: string[] | null
          id?: string
          main_copy?: string | null
          objective?: string | null
          original_image_url?: string | null
          post_type: string
          story_copy?: string | null
          title: string
          user_id: string
          visual_style?: string | null
        }
        Update: {
          client_id?: string | null
          content_category?: string | null
          content_data?: Json | null
          created_at?: string
          cta?: string | null
          description?: string | null
          generated_image_url?: string | null
          hashtags?: string[] | null
          id?: string
          main_copy?: string | null
          objective?: string | null
          original_image_url?: string | null
          post_type?: string
          story_copy?: string | null
          title?: string
          user_id?: string
          visual_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      shooting_plans: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          num_days: number | null
          plan_data: Json
          user_id: string
          weekly_plan_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          num_days?: number | null
          plan_data?: Json
          user_id: string
          weekly_plan_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          num_days?: number | null
          plan_data?: Json
          user_id?: string
          weekly_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shooting_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shooting_plans_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          client_id: string | null
          content_language: string | null
          created_at: string
          id: string
          is_archived: boolean
          plan_data: Json
          special_dates: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          client_id?: string | null
          content_language?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          plan_data?: Json
          special_dates?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          client_id?: string | null
          content_language?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          plan_data?: Json
          special_dates?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
