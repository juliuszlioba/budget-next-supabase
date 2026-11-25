
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "bills": {
                  Row: {
                    "active": boolean,"category_id": string,"default_amount": number,"id": string,"is_credit_card": boolean,"name": string,"sort_order": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"category_id": string,"default_amount"?: number,"id"?: string,"is_credit_card"?: boolean,"name": string,"sort_order"?: number,"user_id"?: string
                  }
                  Update: {
                    "active"?: boolean,"category_id"?: string,"default_amount"?: number,"id"?: string,"is_credit_card"?: boolean,"name"?: string,"sort_order"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bills_category_id_user_id_fkey"
      columns: ["category_id","user_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "archived": boolean,"color": string,"created_at": string,"icon": string,"id": string,"is_essential": boolean,"name": string,"sort_order": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_essential"?: boolean,"name": string,"sort_order"?: number,"user_id"?: string
                  }
                  Update: {
                    "archived"?: boolean,"color"?: string,"created_at"?: string,"icon"?: string,"id"?: string,"is_essential"?: boolean,"name"?: string,"sort_order"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"income_entries": {
                  Row: {
                    "amount": number,"id": string,"is_recurring": boolean,"label": string,"month_id": string,"sort_order": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"id"?: string,"is_recurring"?: boolean,"label": string,"month_id": string,"sort_order"?: number,"user_id"?: string
                  }
                  Update: {
                    "amount"?: number,"id"?: string,"is_recurring"?: boolean,"label"?: string,"month_id"?: string,"sort_order"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "income_entries_month_id_user_id_fkey"
      columns: ["month_id","user_id"]
isOneToOne: false
      referencedRelation: "months"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"items": {
                  Row: {
                    "amount": number,"bill_id": string | null,"category_id": string,"created_at": string,"date": string,"id": string,"is_estimate": boolean,"month_id": string,"name": string,"paid": boolean,"parent_item_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"bill_id"?: string | null,"category_id": string,"created_at"?: string,"date": string,"id"?: string,"is_estimate"?: boolean,"month_id": string,"name": string,"paid"?: boolean,"parent_item_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "amount"?: number,"bill_id"?: string | null,"category_id"?: string,"created_at"?: string,"date"?: string,"id"?: string,"is_estimate"?: boolean,"month_id"?: string,"name"?: string,"paid"?: boolean,"parent_item_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_bill_id_user_id_fkey"
      columns: ["bill_id","user_id"]
isOneToOne: false
      referencedRelation: "bills"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "items_category_id_user_id_fkey"
      columns: ["category_id","user_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "items_month_id_user_id_fkey"
      columns: ["month_id","user_id"]
isOneToOne: false
      referencedRelation: "months"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "items_parent_item_id_user_id_fkey"
      columns: ["parent_item_id","user_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"months": {
                  Row: {
                    "created_at": string,"id": string,"month": number,"opening_balance": number | null,"savings": number,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"month": number,"opening_balance"?: number | null,"savings"?: number,"user_id"?: string,"year": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"month"?: number,"opening_balance"?: number | null,"savings"?: number,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_demo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"seed_demo_data":
{ Args: { "uid": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
