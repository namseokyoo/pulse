import type { Metadata } from "next";
import Link from 'next/link';

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "PulseUp 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto max-w-[680px] px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            ← 돌아가기
          </Link>
        </div>

        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)] mb-8">
          개인정보처리방침
        </h1>

        <div className="space-y-8 text-[var(--color-text-secondary)]">
          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              1. 수집하는 개인정보
            </h2>
            <p className="text-[15px] leading-7 mb-3">
              PulseUp(펄스업)은 서비스 제공을 위해 다음의 개인정보를 수집합니다.
            </p>
            <ul className="text-[15px] leading-7 space-y-2 list-disc list-inside">
              <li>이메일 주소 (Google OAuth를 통해 수집)</li>
              <li>닉네임 (서비스 가입 시 자동 생성, 이후 변경 가능)</li>
              <li>서비스 이용 기록 (게시물, 댓글, 투표 내역)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              2. 수집 목적
            </h2>
            <ul className="text-[15px] leading-7 space-y-2 list-disc list-inside">
              <li>회원 식별 및 서비스 제공</li>
              <li>게시물, 댓글, 투표 기능 제공</li>
              <li>커뮤니티 운영 및 부정 이용 방지</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              3. Google OAuth 소셜 로그인
            </h2>
            <p className="text-[15px] leading-7">
              PulseUp은 Google OAuth를 통한 소셜 로그인을 제공합니다.
              로그인 시 Google의 개인정보처리방침이 함께 적용되며, PulseUp은 Google로부터
              이메일 주소와 기본 프로필 정보(이름)만 수집합니다. 이메일은 서비스 내에서
              공개되지 않으며, 닉네임으로만 표시됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              4. 데이터 보관 및 파기
            </h2>
            <p className="text-[15px] leading-7 mb-3">
              수집된 개인정보는 회원 탈퇴 시 즉시 파기됩니다.
              단, 관련 법령에 따라 보관이 필요한 경우 아래 기간 동안 안전하게 보관 후 파기합니다.
            </p>
            <ul className="text-[15px] leading-7 space-y-2 list-disc list-inside">
              <li>전자상거래 관련 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>서비스 이용 기록, 접속 로그: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              5. 제3자 제공 및 위탁
            </h2>
            <p className="text-[15px] leading-7 mb-3">
              PulseUp은 원칙적으로 사용자의 개인정보를 외부에 제공하지 않습니다.
              단, 서비스 운영을 위해 아래 수탁업체를 이용합니다.
            </p>
            <ul className="text-[15px] leading-7 space-y-2 list-disc list-inside">
              <li>Supabase — 데이터베이스 및 인증 서비스 (미국 소재)</li>
              <li>Vercel — 웹 호스팅 서비스 (미국 소재)</li>
            </ul>
            <p className="text-[15px] leading-7 mt-3">
              상기 수탁업체는 미국에 소재하며, 개인정보가 해외로 이전되어 처리됩니다.
              이전되는 항목은 이메일 주소, 닉네임, 서비스 이용 기록이며,
              각 업체의 보안 정책에 따라 안전하게 관리됩니다.
            </p>
            <p className="text-[15px] leading-7 mt-3">
              각 수탁업체의 개인정보처리방침이 함께 적용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              6. 개인정보보호 책임자
            </h2>
            <p className="text-[15px] leading-7">
              PulseUp의 개인정보보호 책임자는 SidequestLab 운영팀입니다.
              개인정보 관련 문의, 열람, 정정, 삭제 요청은 서비스 내 게시글 또는
              이메일을 통해 연락해주세요. 요청은 10일 이내에 처리됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              7. 개인정보 처리방침 변경
            </h2>
            <p className="text-[15px] leading-7">
              개인정보처리방침이 변경될 경우 서비스 내 공지사항을 통해 사전 안내드립니다.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--color-border)] text-[13px] text-[var(--color-text-muted)]">
          최종 업데이트: 2026년 3월
        </div>
      </div>
    </div>
  );
}
