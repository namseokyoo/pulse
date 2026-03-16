import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("uid")
    .eq("uid", user.id)
    .single();

  if (!adminUser) {
    notFound();
  }

  const navItems = [
    { href: "/admin", label: "대시보드" },
    { href: "/admin/game-rules", label: "게임 설정" },
    { href: "/admin/posts", label: "게시글" },
    { href: "/admin/reports", label: "신고" },
    { href: "/admin/users", label: "회원" },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      <aside className="flex w-56 flex-col border-r border-[#2a2a2a] bg-[#141414]">
        <div className="border-b border-[#2a2a2a] p-4">
          <span className="text-sm font-bold text-red-500">PULSEUP ADMIN</span>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="mb-1 block rounded-lg px-3 py-2 text-sm text-[#a0a0a0] transition-colors hover:bg-[#1e1e1e] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[#2a2a2a] p-4">
          <Link
            href="/"
            className="text-xs text-[#a0a0a0] transition-colors hover:text-white"
          >
            {"<- 사이트로 돌아가기"}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
