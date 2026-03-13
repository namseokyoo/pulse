export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-20 bg-[var(--color-background)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-[680px] px-4 h-14 flex items-center">
          <div className="h-5 w-20 bg-white/8 rounded animate-pulse" />
        </div>
      </header>
      <main className="mx-auto max-w-[680px] px-4 py-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-white/5 bg-[var(--color-surface)] p-5 mb-4 animate-pulse"
          >
            <div className="h-5 bg-white/8 rounded mb-3 w-3/4" />
            <div className="h-4 bg-white/5 rounded mb-2 w-full" />
            <div className="h-4 bg-white/5 rounded mb-4 w-2/3" />
            <div className="h-2 bg-white/5 rounded-full" />
          </div>
        ))}
      </main>
    </div>
  );
}
