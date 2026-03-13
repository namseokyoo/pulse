"use client";

import type { FilterOption } from "@/types";
import { cn } from "@/lib/utils/format";

export interface FilterTabsProps {
  options: FilterOption[];
  selected: string;
  onChange: (value: string) => void;
}

export function FilterTabs({ options, selected, onChange }: FilterTabsProps) {
  return (
    <div className="flex gap-0 overflow-x-auto no-scrollbar border-b border-[var(--color-border)]">
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex-shrink-0 min-h-[44px] px-4 text-[14px] font-semibold transition-colors duration-100",
              isActive
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
            aria-selected={isActive}
            role="tab"
          >
            {opt.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--color-primary)] shadow-[var(--shadow-glow-primary)]"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
