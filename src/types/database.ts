/**
 * Supabase の DB スキーマから生成する型定義。
 * 再生成: npm run supabase:gen-types（要 SUPABASE_PROJECT_REF または supabase link）
 * 未実行時はこのプレースホルダーを利用。生成後はこのファイルが上書きされる。
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      chat_messages?: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      chat_rooms?: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
