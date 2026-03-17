"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileHeader } from "@/components/pulse/ProfileHeader";
import { FilterTabs } from "@/components/pulse/FilterTabs";
import { PostList } from "@/components/pulse/PostList";
import { BottomNav } from "@/components/layout/BottomNav";
import { createClient } from "@/lib/supabase/client";
import type { PostType } from "@/types";

const PROFILE_TABS = [
  { value: "account", label: "계정" },
  { value: "alive", label: "살아있는 글" },
  { value: "dead", label: "죽은 글" },
  { value: "orders", label: "구매내역" },
];

interface ProfileClientProps {
  nickname: string;
  email: string;
  freeVotes: number;
  paidVotes: number;
  alivePosts: PostType[];
  deadPosts: PostType[];
  userId: string;
}

export function ProfileClient({ nickname, email, freeVotes, paidVotes, alivePosts, deadPosts, userId }: ProfileClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState("account");
  const [orders, setOrders] = useState<Array<{ id: string; product_qty: number; amount_krw: number; status: string; created_at: string }>>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(nickname);
  const [currentNickname, setCurrentNickname] = useState(nickname);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const trimmedNickname = newNickname.trim();

    if (!isEditingNickname || trimmedNickname.length < 2 || trimmedNickname === currentNickname) {
      setNicknameChecking(false);
      setNicknameError(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setNicknameChecking(true);
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("nickname", trimmedNickname)
        .maybeSingle();

      if (isCancelled) return;

      if (data && data.id !== userId) {
        setNicknameError("이미 사용 중인 닉네임입니다");
      } else {
        setNicknameError(null);
      }
      setNicknameChecking(false);
    }, 500);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNickname, isEditingNickname, newNickname, userId]);

  useEffect(() => {
    const fetchOrders = async () => {
      setOrdersLoading(true);
      const { data } = await supabase
        .from("payment_orders")
        .select("id, product_qty, amount_krw, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setOrders(data as typeof orders);
      setOrdersLoading(false);
    };
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveNickname = async () => {
    if (!newNickname.trim() || newNickname.trim() === currentNickname) {
      setIsEditingNickname(false);
      return;
    }
    if (newNickname.trim().length < 2 || newNickname.trim().length > 20) {
      setNicknameError("닉네임은 2-20자 사이여야 합니다.");
      return;
    }

    const trimmedNickname = newNickname.trim();
    setNicknameChecking(true);
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("nickname", trimmedNickname)
      .maybeSingle();
    setNicknameChecking(false);

    if (existingProfile && existingProfile.id !== userId) {
      setNicknameError("이미 사용 중인 닉네임입니다");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ nickname: trimmedNickname, nickname_changed_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      setNicknameError("닉네임 변경에 실패했습니다.");
      return;
    }

    setCurrentNickname(trimmedNickname);
    setNewNickname(trimmedNickname);
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
        <div className="mx-auto max-w-[680px] px-4 py-3 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-[18px] font-bold tracking-[0.05em] text-[var(--color-text-primary)]">PULSEUP</span>
          </Link>
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
                onChange={(e) => {
                  setNewNickname(e.target.value);
                  setNicknameError(null);
                }}
                maxLength={20}
                className="w-full p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] text-[16px] mb-2"
                autoFocus
              />
              {nicknameChecking && !nicknameError && (
                <p className="text-[13px] text-[var(--color-text-secondary)] mb-2">중복 확인 중...</p>
              )}
              {nicknameError && (
                <p className="text-[13px] text-[var(--color-danger)] mb-2">{nicknameError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setIsEditingNickname(false); setNewNickname(currentNickname); setNicknameError(null); setNicknameChecking(false); }}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] text-[14px] font-semibold"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveNickname}
                  disabled={nicknameChecking || Boolean(nicknameError)}
                  className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
          freeVotes={freeVotes}
          paidVotes={paidVotes}
          onEdit={() => setIsEditingNickname(true)}
        />

        {/* 글 목록 탭 */}
        <FilterTabs
          options={PROFILE_TABS.map((t) => ({
            value: t.value,
            label: t.value === "alive"
              ? `${t.label} (${alivePosts.length})`
              : t.value === "dead"
                ? `${t.label} (${deadPosts.length})`
                : t.label,
          }))}
          selected={tab}
          onChange={setTab}
        />

        <div className="mt-4">
          {tab === "account" && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <p className="text-[12px] text-[var(--color-text-muted)] mb-1">닉네임</p>
                <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{currentNickname}</p>
              </div>
              {email && (
                <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <p className="text-[12px] text-[var(--color-text-muted)] mb-1">이메일</p>
                  <p className="text-[16px] text-[var(--color-text-primary)]">{email}</p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="w-full py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[14px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
              >
                로그아웃
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-3 rounded-xl text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors underline"
              >
                계정 삭제
              </button>
            </div>
          )}
          {tab === "alive" && (
            <PostList posts={alivePosts} type="alive" empty={alivePosts.length === 0} />
          )}
          {tab === "dead" && (
            <PostList posts={deadPosts} type="dead" empty={deadPosts.length === 0} />
          )}
          {tab === "orders" && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">구매 내역</h2>
                <a href="/purchase" className="text-[13px] text-[var(--color-primary)] hover:opacity-80 transition-opacity">투표권 구매 →</a>
              </div>
              {ordersLoading ? (
                <p className="text-[14px] text-[var(--color-text-muted)] py-4 text-center">불러오는 중...</p>
              ) : orders.length === 0 ? (
                <p className="text-[14px] text-[var(--color-text-muted)] py-4 text-center">구매 내역이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      fulfilled: { label: "완료", color: "text-[var(--color-like)]" },
                      refunded: { label: "환불", color: "text-[var(--color-danger)]" },
                      created: { label: "처리중", color: "text-[var(--color-text-muted)]" },
                      paid: { label: "처리중", color: "text-[var(--color-text-muted)]" },
                      failed: { label: "실패", color: "text-[var(--color-danger)]" },
                    };
                    const s = statusMap[order.status] ?? { label: order.status, color: "text-[var(--color-text-muted)]" };

                    return (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">투표권 {order.product_qty}개</p>
                          <p className="text-[12px] text-[var(--color-text-muted)]">{new Date(order.created_at).toLocaleDateString("ko-KR")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{order.amount_krw.toLocaleString()}원</p>
                          <p className={"text-[12px] font-medium " + s.color}>{s.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
