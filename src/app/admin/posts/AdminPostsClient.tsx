"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminPost } from "@/types";

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "alive", label: "살아있는" },
  { value: "dead", label: "죽은" },
  { value: "hidden", label: "숨김" },
  { value: "reported", label: "신고됨" },
];

type TogglePostHiddenResponse = {
  success: boolean;
};

interface Props {
  posts: AdminPost[];
  total: number;
  filter: string;
  page: number;
}

export function AdminPostsClient({
  posts: initialPosts,
  total,
  filter,
  page,
}: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggleHidden = async (postId: string, currentHidden: boolean) => {
    setLoadingId(postId);

    const supabase = createClient();
    const adminSupabase = supabase as typeof supabase & {
      rpc: (
        fn: string,
        args?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    const { data } = await adminSupabase.rpc("admin_toggle_post_hidden", {
      p_post_id: postId,
      p_hidden: !currentHidden,
    });

    setLoadingId(null);

    const response = data as TogglePostHiddenResponse | null;

    if (!response?.success) {
      return;
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, is_hidden: !currentHidden } : post
      )
    );
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.value}
            href={`/admin/posts?filter=${item.value}`}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              filter === item.value
                ? "border-red-500/30 bg-red-500/20 text-red-400"
                : "border-[#2a2a2a] bg-[#141414] text-[#a0a0a0] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <span className="ml-auto self-center text-xs text-[#a0a0a0]">
          총 {total.toLocaleString()}건
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#141414]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="px-4 py-3 text-left font-medium text-[#a0a0a0]">
                제목
              </th>
              <th className="w-28 px-4 py-3 text-left font-medium text-[#a0a0a0]">
                작성자
              </th>
              <th className="w-24 px-4 py-3 text-center font-medium text-[#a0a0a0]">
                좋아요/싫어요
              </th>
              <th className="w-16 px-4 py-3 text-center font-medium text-[#a0a0a0]">
                신고
              </th>
              <th className="w-24 px-4 py-3 text-center font-medium text-[#a0a0a0]">
                상태
              </th>
              <th className="w-24 px-4 py-3 text-center font-medium text-[#a0a0a0]">
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#a0a0a0]">
                  게시글 없음
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/post/${post.id}`}
                      target="_blank"
                      className="line-clamp-1 transition-colors hover:text-red-400"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#a0a0a0]">
                    {post.author_nickname}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-green-500">{post.like_count}</span>
                    <span className="text-[#a0a0a0]"> / </span>
                    <span className="text-red-400">{post.dislike_count}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {post.reported_count > 0 ? (
                      <span className="text-red-400">{post.reported_count}</span>
                    ) : (
                      <span className="text-[#444]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        post.is_hidden
                          ? "bg-red-500/20 text-red-400"
                          : post.is_dead
                            ? "bg-[#2a2a2a] text-[#a0a0a0]"
                            : "bg-green-500/20 text-green-500"
                      }`}
                    >
                      {post.is_hidden ? "숨김" : post.is_dead ? "사망" : "활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(post.id, post.is_hidden)}
                      disabled={loadingId === post.id}
                      className={`rounded px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                        post.is_hidden
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      }`}
                    >
                      {loadingId === post.id
                        ? "..."
                        : post.is_hidden
                          ? "해제"
                          : "숨김"}
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
                href={`/admin/posts?filter=${filter}&page=${value}`}
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
    </div>
  );
}
