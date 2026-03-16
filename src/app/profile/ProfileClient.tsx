"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileHeader } from "@/components/pulse/ProfileHeader";
import { FilterTabs } from "@/components/pulse/FilterTabs";
import { PostList } from "@/components/pulse/PostList";
import { VoteBalance } from "@/components/pulse/VoteBalance";
import { BottomNav } from "@/components/layout/BottomNav";
import { createClient } from "@/lib/supabase/client";
import type { PostType } from "@/types";

const PROFILE_TABS = [
  { value: "alive", label: "살아있는 글" },
  { value: "dead", label: "죽은 글" },
];

interface ProfileClientProps {
  nickname: string;
  balance: number;
  alivePosts: PostType[];
  deadPosts: PostType[];
  userId: string;
}

export function ProfileClient({ nickname, balance, alivePosts, deadPosts, userId }: ProfileClientProps) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const [tab, setTab] = useState("alive");
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(nickname);
  const [currentNickname, setCurrentNickname] = useState(nickname);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveNickname = async () => {
    if (!newNickname.trim() || newNickname.trim() === currentNickname) {
      setIsEditingNickname(false);
      return;
    }
    if (newNickname.trim().length < 2 || newNickname.trim().length > 20) {
      setNicknameError("닉네임은 2-20자 사이여야 합니다.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ nickname: newNickname.trim(), nickname_changed_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      setNicknameError("닉네임 변경에 실패했습니다.");
      return;
    }

    setCurrentNickname(newNickname.trim());
    setIsEditingNickname(false);
    setNicknameError(null);
    router.refresh();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.rpc("delete_account");
      if (error) {
        setDeleteError("계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setIsDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setDeleteError("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-20 bg-[var(--color-background)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[680px] px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-[18px] font-bold tracking-[0.05em] text-[var(--color-text-primary)]">PULSE</span>
          </Link>
          <VoteBalance balance={balance} variant="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-[680px] px-4 pb-24">
        {/* 닉네임 수정 모달 */}
        {isEditingNickname && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)]">
              <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-4">
                닉네임 변경
              </h2>
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                maxLength={20}
                className="w-full p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] text-[16px] mb-2"
                autoFocus
              />
              {nicknameError && (
                <p className="text-[13px] text-[var(--color-danger)] mb-2">{nicknameError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setIsEditingNickname(false); setNewNickname(currentNickname); setNicknameError(null); }}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] text-[14px] font-semibold"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveNickname}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)]">
              <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
                계정 삭제
              </h2>
              <p className="text-[14px] text-[var(--color-text-secondary)] leading-6 mb-4">
                정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>
              {deleteError && (
                <p className="text-[13px] text-[var(--color-danger)] mb-3">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteError(null); }}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] text-[14px] font-semibold disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-danger)] text-white text-[14px] font-semibold disabled:opacity-50"
                >
                  {isDeleting ? "삭제 중..." : "탈퇴하기"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 프로필 헤더 */}
        <ProfileHeader
          nickname={currentNickname}
          balance={balance}
          onEdit={() => setIsEditingNickname(true)}
        />

        {/* 글 목록 탭 */}
        <FilterTabs
          options={PROFILE_TABS.map((t) => ({
            value: t.value,
            label: t.value === "alive"
              ? `${t.label} (${alivePosts.length})`
              : `${t.label} (${deadPosts.length})`,
          }))}
          selected={tab}
          onChange={setTab}
        />

        <div className="mt-4">
          {tab === "alive" ? (
            <PostList posts={alivePosts} type="alive" empty={alivePosts.length === 0} />
          ) : (
            <PostList posts={deadPosts} type="dead" empty={deadPosts.length === 0} />
          )}
        </div>

        {/* 로그아웃 */}
        <div className="mt-8 text-center space-y-3">
          <button
            onClick={handleSignOut}
            className="text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
          >
            로그아웃
          </button>
          <div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors underline"
            >
              계정 삭제
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
