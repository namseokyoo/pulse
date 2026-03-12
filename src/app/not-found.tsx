import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[13px] text-[var(--color-text-muted)] mb-2">생명력 0%</p>
        <h1 className="text-[48px] font-bold text-[var(--color-vitality-critical)] mb-4">
          404
        </h1>
        <p className="text-[18px] text-[var(--color-text-secondary)] mb-2">
          이 글은 이미 사라졌습니다
        </p>
        <p className="text-[14px] text-[var(--color-text-muted)] mb-8">
          생명력이 다해 사라진 글이거나, 존재하지 않는 페이지입니다.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white text-[14px] font-semibold transition-transform active:scale-95"
        >
          피드로 돌아가기
        </Link>
      </div>
    </div>
  );
}
