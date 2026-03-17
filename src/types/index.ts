// ============================================================
// Pulse Types — Phase 1
// ============================================================

// ---- Shared UI Types ----

export interface PostType {
  id: string;
  title: string;
  content: string;
  nickname: string;
  vitality: number; // 0-100 (calculated from expires_at)
  likes: number;
  dislikes: number;
  expiresAt: Date;
  createdAt: Date;
  survivedMinutes?: number; // dead posts: actual survival duration
  isDead?: boolean;
  authorId?: string;
  initialTtlMinutes?: number; // game_rules.initial_ttl_minutes 스냅샷
  editedAt?: Date;
  isDeleted?: boolean;
}

export interface CommentType {
  id: string;
  nickname: string;
  content: string;
  createdAt: Date;
  authorId?: string;
  editedAt?: Date;
  isDeleted?: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
}

export type VoteType = "like" | "dislike";
export type ReportReason = "abuse" | "adult" | "spam" | "other";
export type SortOption = "latest" | "vitality-asc" | "vitality-desc";

export interface GameRules {
  voteTimeChangeMinutes: number;
  dailyFreeVotes: number;
  initialTtlMinutes: number;
}

// ---- Database Types (Supabase) ----

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          nickname_changed_at: string | null;
          free_votes: number;
          free_votes_reset_at: string | null;
          paid_votes: number;
          consented_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          nickname_changed_at?: string | null;
          free_votes?: number;
          free_votes_reset_at?: string | null;
          paid_votes?: number;
          consented_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          nickname_changed_at?: string | null;
          free_votes?: number;
          free_votes_reset_at?: string | null;
          paid_votes?: number;
          consented_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          author_nickname: string;
          title: string;
          content: string;
          like_count: number;
          dislike_count: number;
          initial_ttl_minutes: number;
          expires_at: string;
          is_dead: boolean;
          dead_at: string | null;
          reported_count: number;
          is_hidden: boolean;
          edited_at: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          author_nickname?: string;
          title: string;
          content: string;
          like_count?: number;
          dislike_count?: number;
          initial_ttl_minutes?: number;
          expires_at?: string;
          is_dead?: boolean;
          dead_at?: string | null;
          reported_count?: number;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          author_nickname?: string;
          title?: string;
          content?: string;
          like_count?: number;
          dislike_count?: number;
          initial_ttl_minutes?: number;
          expires_at?: string;
          is_dead?: boolean;
          dead_at?: string | null;
          reported_count?: number;
          is_hidden?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      game_rules: {
        Row: {
          id: boolean;
          vote_time_change_minutes: number;
          daily_free_votes: number;
          reset_eligibility_hours: number;
          initial_ttl_minutes: number;
          report_hide_threshold: number;
          updated_at: string;
          change_reason: string | null;
        };
        Insert: {
          id?: boolean;
          vote_time_change_minutes?: number;
          daily_free_votes?: number;
          reset_eligibility_hours?: number;
          initial_ttl_minutes?: number;
          report_hide_threshold?: number;
          updated_at?: string;
          change_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["game_rules"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_id: string | null;
          author_id: string;
          author_nickname: string;
          content: string;
          edited_at: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          parent_id?: string | null;
          author_id: string;
          author_nickname?: string;
          content: string;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          parent_id?: string | null;
          author_id?: string;
          author_nickname?: string;
          content?: string;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          is_hidden?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          uid: string;
          granted_at: string;
          granted_by: string | null;
        };
        Insert: {
          uid: string;
          granted_at?: string;
          granted_by?: string | null;
        };
        Update: {
          uid?: string;
          granted_at?: string;
          granted_by?: string | null;
        };
        Relationships: [];
      };
      game_rules_history: {
        Row: {
          id: string;
          vote_time_change_minutes: number;
          daily_free_votes: number;
          reset_eligibility_hours: number;
          initial_ttl_minutes: number;
          report_hide_threshold: number | null;
          change_reason: string | null;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: string;
          vote_time_change_minutes: number;
          daily_free_votes: number;
          reset_eligibility_hours: number;
          initial_ttl_minutes: number;
          report_hide_threshold?: number | null;
          change_reason?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_rules_history"]["Insert"]>;
        Relationships: [];
      };
      vote_logs: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          vote_type: "like" | "dislike";
          votes_used: number;
          vote_source: "free" | "paid";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          vote_type: "like" | "dislike";
          votes_used?: number;
          vote_source: "free" | "paid";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          vote_type?: "like" | "dislike";
          votes_used?: number;
          vote_source?: "free" | "paid";
          created_at?: string;
        };
        Relationships: [];
      };
      vote_balance_logs: {
        Row: {
          id: string;
          user_id: string;
          change_type: "daily_reset" | "vote_spend" | "purchase" | "refund";
          free_change: number;
          paid_change: number;
          free_after: number;
          paid_after: number;
          reference_id: string | null;
          reference_type: string | null;
          payment_order_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          change_type: "daily_reset" | "vote_spend" | "purchase" | "refund";
          free_change?: number;
          paid_change?: number;
          free_after: number;
          paid_after: number;
          reference_id?: string | null;
          reference_type?: string | null;
          payment_order_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vote_balance_logs"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "post" | "comment";
          target_id: string;
          reason: "abuse" | "adult" | "spam" | "other";
          detail: string | null;
          status: "pending" | "reviewed" | "dismissed";
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: "post" | "comment";
          target_id: string;
          reason: "abuse" | "adult" | "spam" | "other";
          detail?: string | null;
          status?: "pending" | "reviewed" | "dismissed";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      payment_orders: {
        Row: {
          id: string;
          profile_id: string;
          product_type: "paid_votes" | "nickname_change_pass";
          product_qty: number;
          amount_krw: number;
          provider: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          idempotency_key: string;
          status:
            | "created"
            | "paid"
            | "fulfilled"
            | "cancel_requested"
            | "cancelled"
            | "refund_pending"
            | "refunded"
            | "failed";
          paid_at: string | null;
          fulfilled_at: string | null;
          failed_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          product_type: "paid_votes" | "nickname_change_pass";
          product_qty: number;
          amount_krw: number;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          idempotency_key: string;
          status?:
            | "created"
            | "paid"
            | "fulfilled"
            | "cancel_requested"
            | "cancelled"
            | "refund_pending"
            | "refunded"
            | "failed";
          paid_at?: string | null;
          fulfilled_at?: string | null;
          failed_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_orders"]["Insert"]>;
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          payment_order_id: string | null;
          provider: string;
          provider_event_id: string | null;
          event_type: string;
          payload: Record<string, unknown>;
          received_at: string;
          processed_at: string | null;
          process_result: string | null;
        };
        Insert: {
          id?: string;
          payment_order_id?: string | null;
          provider?: string;
          provider_event_id?: string | null;
          event_type: string;
          payload: Record<string, unknown>;
          received_at?: string;
          processed_at?: string | null;
          process_result?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payment_events"]["Insert"]>;
        Relationships: [];
      };
      user_entitlements: {
        Row: {
          id: string;
          profile_id: string;
          payment_order_id: string;
          entitlement_type: "paid_votes" | "nickname_change_pass";
          granted_qty: number;
          remaining_qty: number;
          status: "active" | "consumed" | "revoked" | "expired";
          expires_at: string | null;
          created_at: string;
          consumed_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          payment_order_id: string;
          entitlement_type: "paid_votes" | "nickname_change_pass";
          granted_qty: number;
          remaining_qty: number;
          status?: "active" | "consumed" | "revoked" | "expired";
          expires_at?: string | null;
          created_at?: string;
          consumed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_entitlements"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      get_game_rules: {
        Args: Record<string, never>;
        Returns: {
          id: boolean;
          vote_time_change_minutes: number;
          daily_free_votes: number;
          reset_eligibility_hours: number;
          initial_ttl_minutes: number;
          report_hide_threshold: number;
          updated_at: string;
          change_reason: string | null;
        };
      };
      cast_vote: {
        Args: {
          p_user_id: string;
          p_post_id: string;
          p_vote_type: "like" | "dislike";
          p_votes_used?: number;
        };
        Returns: {
          success: boolean;
          error?: string;
          free_votes?: number;
          paid_votes?: number;
          like_count?: number;
          dislike_count?: number;
          expires_at?: string;
          is_dead?: boolean;
        };
      };
      submit_report: {
        Args: {
          p_reporter_id: string;
          p_target_type: "post" | "comment";
          p_target_id: string;
          p_reason: "abuse" | "adult" | "spam" | "other";
          p_detail?: string;
        };
        Returns: { success: boolean; error?: string };
      };
      edit_post: {
        Args: {
          p_post_id: string;
          p_title: string;
          p_content: string;
        };
        Returns: { success: boolean; error?: string };
      };
      delete_post: {
        Args: { p_post_id: string };
        Returns: { success: boolean; error?: string };
      };
      edit_comment: {
        Args: { p_comment_id: string; p_content: string };
        Returns: { success: boolean; error?: string };
      };
      delete_comment: {
        Args: { p_comment_id: string };
        Returns: { success: boolean; error?: string };
      };
      delete_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      admin_get_stats: {
        Args: Record<string, never>;
        Returns: {
          success: boolean;
          error?: string;
          alive_posts?: number;
          today_votes?: number;
          total_users?: number;
          pending_reports?: number;
        };
      };
      admin_update_game_rules: {
        Args: {
          p_vote_time_change_minutes: number;
          p_daily_free_votes: number;
          p_reset_eligibility_hours: number;
          p_initial_ttl_minutes: number;
          p_report_hide_threshold: number;
          p_change_reason: string;
        };
        Returns: { success: boolean; error?: string };
      };
      admin_list_posts: {
        Args: { p_filter?: string; p_page?: number; p_per_page?: number };
        Returns: {
          success: boolean;
          error?: string;
          total?: number;
          page?: number;
          per_page?: number;
          data?: AdminPost[];
        };
      };
      admin_toggle_post_hidden: {
        Args: { p_post_id: string; p_hidden: boolean };
        Returns: { success: boolean; error?: string };
      };
      admin_list_reports: {
        Args: { p_status?: string; p_page?: number; p_per_page?: number };
        Returns: {
          success: boolean;
          error?: string;
          total?: number;
          page?: number;
          per_page?: number;
          data?: AdminReport[];
        };
      };
      admin_review_report: {
        Args: { p_report_id: string; p_action: string; p_hide_target?: boolean };
        Returns: { success: boolean; error?: string };
      };
      admin_list_users: {
        Args: { p_page?: number; p_per_page?: number; p_search?: string };
        Returns: {
          success: boolean;
          error?: string;
          total?: number;
          page?: number;
          per_page?: number;
          data?: AdminUser[];
        };
      };
      admin_get_user_detail: {
        Args: { p_user_id: string };
        Returns: {
          success: boolean;
          error?: string;
          profile?: AdminUserDetail["profile"];
          recent_posts?: AdminUserDetail["recent_posts"];
          recent_votes?: AdminUserDetail["recent_votes"];
        };
      };
      fulfill_payment_order: {
        Args: { p_order_id: string; p_provider_payment_id: string };
        Returns: Record<string, unknown>;
      };
      refund_payment_order: {
        Args: { p_order_id: string };
        Returns: Record<string, unknown>;
      };
    };
  };
}

// ---- Admin Types ----

export interface AdminUsers {
  uid: string;
  granted_at: string;
  granted_by: string | null;
}

export interface GameRulesHistory {
  id: string;
  vote_time_change_minutes: number;
  daily_free_votes: number;
  reset_eligibility_hours: number;
  initial_ttl_minutes: number;
  report_hide_threshold: number | null;
  change_reason: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface AdminStats {
  alive_posts: number;
  today_votes: number;
  total_users: number;
  pending_reports: number;
}

export interface AdminPost {
  id: string;
  title: string;
  author_nickname: string;
  like_count: number;
  dislike_count: number;
  reported_count: number;
  is_dead: boolean;
  is_hidden: boolean;
  created_at: string;
}

export interface AdminReport {
  id: string;
  target_type: "post" | "comment";
  target_id: string;
  reason: "abuse" | "adult" | "spam" | "other";
  detail: string | null;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  reporter_nickname: string;
  target_preview: string | null;
}

export interface AdminUser {
  id: string;
  nickname: string;
  created_at: string;
  free_votes: number;
  paid_votes: number;
  post_count: number;
}

export interface AdminUserDetail {
  profile: {
    id: string;
    nickname: string;
    free_votes: number;
    paid_votes: number;
    created_at: string;
  };
  recent_posts: {
    id: string;
    title: string;
    like_count: number;
    dislike_count: number;
    is_dead: boolean;
    is_hidden: boolean;
    created_at: string;
  }[];
  recent_votes: {
    post_id: string;
    vote_type: "like" | "dislike";
    votes_used: number;
    vote_source: "free" | "paid";
    created_at: string;
    post_title: string | null;
  }[];
}

export interface AdminListResponse<T> {
  success: boolean;
  total: number;
  page: number;
  per_page: number;
  data: T[];
}
