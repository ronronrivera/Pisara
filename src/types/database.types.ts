
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "board_members": {
                  Row: {
                    "board_id": string,"joined_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "board_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "board_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_members_board_id_fkey"
      columns: ["board_id"]
isOneToOne: false
      referencedRelation: "boards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "board_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"boards": {
                  Row: {
                    "created_at": string,"id": string,"link_role": Database["public"]['Enums']["member_role"],"owner_id": string,"share_token": string | null,"thumbnail_url": string | null,"title": string,"updated_at": string,"visibility": Database["public"]['Enums']["board_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"link_role"?: Database["public"]['Enums']["member_role"],"owner_id": string,"share_token"?: string | null,"thumbnail_url"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["board_visibility"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"link_role"?: Database["public"]['Enums']["member_role"],"owner_id"?: string,"share_token"?: string | null,"thumbnail_url"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["board_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "boards_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"display_name": string,"id": string,"is_guest": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name": string,"id": string,"is_guest"?: boolean
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"is_guest"?: boolean
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "board_role":
{ Args: { "b": string }; Returns: Database["public"]['Enums']["member_role"]
                           },
"create_board":
{ Args: { "title"?: string }; Returns: {
              "created_at": string,
"id": string,
"link_role": Database["public"]['Enums']["member_role"],
"owner_id": string,
"share_token": string | null,
"thumbnail_url": string | null,
"title": string,
"updated_at": string,
"visibility": Database["public"]['Enums']["board_visibility"]
            }
                          SetofOptions: {
        from: "*"
        to: "boards"
        isOneToOne: true
        isSetofReturn: false
      } },
// Sharing functions (migration 000005): added by hand while the local DB was down;
// identical to what `supabase gen types` produces.
"join_board":
{ Args: { "token": string }; Returns: { "board_id": string; "role": Database["public"]['Enums']["member_role"] }[] },
"peek_invite":
{ Args: { "token": string }; Returns: { "board_id": string; "title": string; "owner_name": string; "link_role": Database["public"]['Enums']["member_role"] }[] },
"remove_member":
{ Args: { "b": string; "member": string }; Returns: undefined },
"rotate_share_token":
{ Args: { "b": string }; Returns: string },
"set_member_role":
{ Args: { "b": string; "member": string; "new_role": Database["public"]['Enums']["member_role"] }; Returns: undefined },
"share_token_for":
{ Args: { "b": string }; Returns: string },
"delete_stale_guests":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"profile_name_from_meta":
{ Args: { "meta": Json }; Returns: string
                           },
"shares_board_with":
{ Args: { "other": string }; Returns: boolean
                           }
          }
          Enums: {
            "board_visibility": "private"|"link"|"public","member_role": "owner"|"editor"|"viewer"
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
  "public": {
          Enums: {
            "board_visibility": ["private", "link", "public"],"member_role": ["owner", "editor", "viewer"]
          }
        }
} as const
