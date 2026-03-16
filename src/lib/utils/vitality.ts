// ============================================================
// Vitality 계산 유틸리티
// VitalityBar와 VitalityTimer가 공유
// ============================================================

/**
 * expiresAt 기준으로 남은 생명력(0-100)을 계산
 * initialTtlMinutes: 글 생성 시점의 초기 TTL (game_rules.initial_ttl_minutes 스냅샷)
 * 기본값 360은 하위 호환성 유지용
 */
export function calculateVitality(expiresAt: Date, initialTtlMinutes: number = 360): number {
  const now = Date.now();
  const remaining = expiresAt.getTime() - now;
  if (remaining <= 0) return 0;

  const initialMs = initialTtlMinutes * 60 * 1000;
  const vitality = (remaining / initialMs) * 100;
  return Math.min(100, Math.max(0, Math.round(vitality)));
}

/**
 * 생명력 단계 결정
 */
export type VitalityLevel = "high" | "mid" | "low" | "critical";

export function getVitalityLevel(vitality: number): VitalityLevel {
  if (vitality >= 75) return "high";
  if (vitality >= 40) return "mid";
  if (vitality >= 15) return "low";
  return "critical";
}

/**
 * 생명력 단계별 Tailwind 색상 클래스
 */
export function getVitalityColorClass(vitality: number): string {
  const level = getVitalityLevel(vitality);
  const map: Record<VitalityLevel, string> = {
    high: "bg-[var(--color-vitality-high)]",
    mid: "bg-[var(--color-vitality-mid)]",
    low: "bg-[var(--color-vitality-low)]",
    critical: "bg-[var(--color-vitality-critical)]",
  };
  return map[level];
}

/**
 * 생명력 단계별 텍스트 색상
 */
export function getVitalityTextClass(vitality: number): string {
  const level = getVitalityLevel(vitality);
  const map: Record<VitalityLevel, string> = {
    high: "text-[var(--color-vitality-high)]",
    mid: "text-[var(--color-vitality-mid)]",
    low: "text-[var(--color-vitality-low)]",
    critical: "text-[var(--color-vitality-critical)]",
  };
  return map[level];
}

/**
 * 남은 시간을 "5h 30m" / "54m" / "12s" 형식으로 포맷
 */
export function formatTimeRemaining(expiresAt: Date): string {
  const now = Date.now();
  const remaining = Math.max(0, expiresAt.getTime() - now);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * 생존 시간 포맷 (dead posts용)
 */
export function formatSurvivedTime(createdAt: Date, deadAt: Date): string {
  const diffMs = deadAt.getTime() - createdAt.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m 생존` : `${hours}h 생존`;
  }
  return `${minutes}m 생존`;
}
