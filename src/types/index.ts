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
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          nickname_changed_at?: string | null;
          free_votes?: number;
          free_votes_reset_at?: string | null;
          paid_votes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          nickname_changed_at?: string | null;
          free_votes?: number;
          free_votes_reset_at?: string | null;
          paid_votes?: number;
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
          expires_at?: string;
          is_dead?: boolean;
          dead_at?: string | null;
          reported_count?: number;
          is_hidden?: boolean;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_id: string | null;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          parent_id?: string | null;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          parent_id?: string | null;
          author_id?: string;
          content?: string;
          created_at?: string;
        };
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
    };
  };
}
