"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/format";

export function BottomNav() {
  const pathname = usePathname();
  const isFeedActive = pathname === "/";
  const isProfileActive = pathname.startsWith("/profile");
  const isWriteActive = pathname === "/write";
  const isPurchaseActive = pathname === "/purchase";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="하단 네비게이션"
    >
      <div className="mx-auto max-w-[680px] flex items-end overflow-visible">
        <Link
          href="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 text-[11px] font-semibold transition-colors",
            isFeedActive
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          )}
          aria-current={isFeedActive ? "page" : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          피드
        </Link>

        <Link
          href="/purchase"
          className={cn(
            "flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 text-[11px] font-semibold transition-colors",
            isPurchaseActive
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          )}
          aria-current={isPurchaseActive ? "page" : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          구매
        </Link>

        <div className="flex-1 flex flex-col items-center justify-end pb-2">
          <Link
            href="/write"
            className={cn(
              "flex h-14 w-14 -mt-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white",
              "shadow-[var(--shadow-glow-primary)] transition-transform hover:scale-105 active:scale-95",
              isWriteActive && "ring-2 ring-white ring-offset-2 ring-offset-[var(--color-primary)]"
            )}
            aria-label="새 글 작성"
            aria-current={isWriteActive ? "page" : undefined}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        </div>

        <Link
          href="/profile"
          className={cn(
            "flex-1 flex flex-col items-center justify-center min-h-[56px] gap-1 text-[11px] font-semibold transition-colors",
            isProfileActive
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          )}
          aria-current={isProfileActive ? "page" : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          프로필
        </Link>
      </div>
    </nav>
  );
}
