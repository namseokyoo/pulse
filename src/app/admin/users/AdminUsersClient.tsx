"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AdminUser, AdminUserDetail } from "@/types";

type UserDetailResponse =
  | ({
      success: true;
    } & AdminUserDetail)
  | {
      success: false;
    };

interface Props {
  users: AdminUser[];
  total: number;
  search: string;
  page: number;
}

export function AdminUsersClient({ users, total, search, page }: Props) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/admin/users?search=${encodeURIComponent(searchInput)}&page=1`);
  };

  const handleViewDetail = async (userId: string) => {
    setLoadingUserId(userId);

    const supabase = createClient();
    const adminSupabase = supabase as typeof supabase & {
      rpc: (
        fn: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data } = await adminSupabase.rpc("admin_get_user_detail", {
      p_user_id: userId,
    });

    setLoadingUserId(null);

    const response = data as UserDetailResponse | null;

    if (!response?.success) {
      return;
    }

    setSelectedUser({
      profile: response.profile,
      recent_posts: response.recent_posts ?? [],
      recent_votes: response.recent_votes ?? [],
    });
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="닉네임 검색..."
          className="w-64 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-1.5 text-sm text-white placeholder-[#444] focus:border-red-500/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg border border-[#2a2a2a] bg-[#141414] px-4 py-1.5 text-sm text-[#a0a0a0] transition-colors hover:text-white"
        >
          검색
        </button>
        {search ? (
          <Link
            href="/admin/users"
            className="self-center px-3 py-1.5 text-xs text-[#a0a0a0] hover:text-white"
          >
            초기화
          </Link>
        ) : null}
        <span className="ml-auto self-center text-xs text-[#a0a0a0]">
          총 {total.toLocaleString()}명
        </span>
      </form>

      <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#141414]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="px-4 py-3 text-left font-medium text-[#a0a0a0]">
                닉네임
              </th>
              <th className="w-40 px-4 py-3 text-left font-medium text-[#a0a0a0]">
                가입일
              </th>
              <th className="w-20 px-4 py-3 text-center font-medium text-[#a0a0a0]">
                글 수
              </th>
              <th className="w-32 px-4 py-3 text-center font-medium text-[#a0a0a0]">
                투표권 (무료/유료)
              </th>
              <th className="w-20 px-4 py-3 text-center font-medium text-[#a0a0a0]">
                상세
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#a0a0a0]">
                  회원 없음
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] last:border-0"
                >
                  <td className="px-4 py-3 text-white">{user.nickname}</td>
                  <td className="px-4 py-3 text-xs text-[#a0a0a0]">
                    {new Date(user.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-center text-[#a0a0a0]">
                    {user.post_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-white">{user.free_votes}</span>
                    <span className="text-[#444]"> / </span>
                    <span className="text-blue-400">{user.paid_votes}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleViewDetail(user.id)}
                      disabled={loadingUserId === user.id}
                      className="rounded border border-[#2a2a2a] bg-[#1e1e1e] px-2 py-1 text-xs text-[#a0a0a0] transition-colors hover:text-white disabled:opacity-50"
                    >
                      {loadingUserId === user.id ? "..." : "보기"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, index) => index + 1).map(
            (value) => (
              <Link
                key={value}
                href={`/admin/users?search=${encodeURIComponent(search)}&page=${value}`}
                className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors ${
                  value === page
                    ? "bg-red-500 text-white"
                    : "border border-[#2a2a2a] bg-[#141414] text-[#a0a0a0] hover:text-white"
                }`}
              >
                {value}
              </Link>
            )
          )}
        </div>
      ) : null}

      {selectedUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="max-h-[80vh] w-[600px] overflow-y-auto rounded-xl border border-[#2a2a2a] bg-[#141414] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-white">{selectedUser.profile.nickname}</h2>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-[#a0a0a0] transition-colors hover:text-white"
              >
                X
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#1e1e1e] p-3">
                <div className="mb-1 text-xs text-[#a0a0a0]">무료 투표권</div>
                <div className="font-bold text-white">
                  {selectedUser.profile.free_votes}
                </div>
              </div>
              <div className="rounded-lg bg-[#1e1e1e] p-3">
                <div className="mb-1 text-xs text-[#a0a0a0]">유료 투표권</div>
                <div className="font-bold text-white">
                  {selectedUser.profile.paid_votes}
                </div>
              </div>
              <div className="rounded-lg bg-[#1e1e1e] p-3">
                <div className="mb-1 text-xs text-[#a0a0a0]">가입일</div>
                <div className="text-xs text-white">
                  {new Date(selectedUser.profile.created_at).toLocaleDateString(
                    "ko-KR"
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#a0a0a0]">
                최근 글
              </h3>
              {selectedUser.recent_posts.length === 0 ? (
                <p className="text-xs text-[#444]">없음</p>
              ) : (
                <div className="space-y-1">
                  {selectedUser.recent_posts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <Link
                        href={`/post/${post.id}`}
                        target="_blank"
                        className="mr-2 flex-1 line-clamp-1 text-white hover:text-red-400"
                      >
                        {post.title}
                      </Link>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                          post.is_hidden
                            ? "bg-red-500/20 text-red-400"
                            : post.is_dead
                              ? "bg-[#2a2a2a] text-[#a0a0a0]"
                              : "bg-green-500/20 text-green-500"
                        }`}
                      >
                        {post.is_hidden ? "숨김" : post.is_dead ? "사망" : "활성"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#a0a0a0]">
                최근 투표
              </h3>
              {selectedUser.recent_votes.length === 0 ? (
                <p className="text-xs text-[#444]">없음</p>
              ) : (
                <div className="space-y-1">
                  {selectedUser.recent_votes.map((vote, index) => (
                    <div
                      key={`${vote.post_id}-${vote.created_at}-${index}`}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className={
                          vote.vote_type === "like"
                            ? "text-green-500"
                            : "text-red-400"
                        }
                      >
                        {vote.vote_type === "like" ? "좋아요" : "싫어요"}{" "}
                        {vote.votes_used}
                      </span>
                      <span className="line-clamp-1 flex-1 text-[#a0a0a0]">
                        {vote.post_title ?? vote.post_id}
                      </span>
                      <span className="shrink-0 text-[#444]">
                        {new Date(vote.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
