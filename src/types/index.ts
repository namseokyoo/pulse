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
}

export interface CommentType {
  id: string;
  nickname: string;
  content: string;
  createdAt: Date;
  authorId?: string;
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
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
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
      };
      game_rules: {
        Row: {
          id: boolean;
          vote_time_change_minutes: number;
          daily_free_votes: number;
          reset_eligibility_hours: number;
          initial_ttl_minutes: number;
          updated_at: string;
          change_reason: string | null;
        };
        Insert: {
          id?: boolean;
          vote_time_change_minutes?: number;
          daily_free_votes?: number;
          reset_eligibility_hours?: number;
          initial_ttl_minutes?: number;
          updated_at?: string;
          change_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["game_rules"]["Insert"]>;
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_id: string | null;
          author_id: string;
          content: string;
          is_hidden: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          parent_id?: string | null;
          author_id: string;
          content: string;
          is_hidden?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          parent_id?: string | null;
          author_id?: string;
          content?: string;
          is_hidden?: boolean;
          created_at?: string;
        };
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
      };
      game_rules_history: {
        Row: {
          id: string;
          vote_time_change_minutes: number;
          daily_free_votes: number;
          reset_eligibility_hours: number;
          initial_ttl_minutes: number;
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
          change_reason?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_rules_history"]["Insert"]>;
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
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vote_balance_logs"]["Insert"]>;
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
      };
    };
    Functions: {
      get_game_rules: {
        Args: Record<string, never>;
        Returns: {
          id: boolean;
          vote_time_change_minutes: number;
          daily_free_votes: number;
          reset_eligibility_hours: number;
          initial_ttl_minutes: number;
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
