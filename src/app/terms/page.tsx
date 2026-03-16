import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto max-w-[680px] px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
            ← 돌아가기
          </Link>
        </div>

        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)] mb-8">
          이용약관
        </h1>

        <div className="space-y-8 text-[var(--color-text-secondary)]">
          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              1. 이용 자격
            </h2>
            <p className="text-[15px] leading-7">
              PulseUp 서비스는 만 14세 이상 누구나 이용하실 수 있습니다.
              14세 미만의 경우 법정대리인의 동의가 필요합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              2. 금지 행위
            </h2>
            <ul className="text-[15px] leading-7 space-y-2 list-disc list-inside">
              <li>타인에 대한 욕설, 비방, 혐오 표현</li>
              <li>음란하거나 성적으로 불쾌한 내용</li>
              <li>스팸, 광고, 반복 게시물</li>
              <li>타인의 개인정보 무단 게시</li>
              <li>허위 사실 유포 및 명예훼손</li>
              <li>서비스 운영을 방해하는 행위</li>
              <li>다계정을 이용한 투표 조작</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              3. 콘텐츠 정책
            </h2>
            <p className="text-[15px] leading-7">
              작성된 글은 생명력 시스템에 따라 자동으로 관리됩니다.
              신고가 5건 이상 누적된 게시물은 자동으로 숨김 처리됩니다.
              커뮤니티 가이드라인 위반 시 서비스 이용이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              4. 개인정보
            </h2>
            <p className="text-[15px] leading-7">
              Google OAuth를 통한 로그인 시 이메일 주소만 수집됩니다.
              서비스 내에서는 닉네임으로만 표시되며, 이메일은 공개되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              5. 서비스 변경
            </h2>
            <p className="text-[15px] leading-7">
              PulseUp은 서비스 개선을 위해 기능을 추가, 수정, 삭제할 수 있습니다.
              중요한 변경사항은 서비스 내 공지를 통해 안내드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              6. 면책조항
            </h2>
            <p className="text-[15px] leading-7">
              PulseUp은 서비스 중단, 데이터 손실, 시스템 장애 등 불가피한 사유로 인한 손해에 대해
              책임을 지지 않습니다. 천재지변, 전쟁, 폭동, 테러 등 불가항력적 사유로 인한
              서비스 중단 시에도 동일하게 적용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              7. 회원 탈퇴 및 데이터 처리
            </h2>
            <p className="text-[15px] leading-7">
              회원은 언제든지 서비스 내 프로필 페이지에서 탈퇴를 신청할 수 있습니다.
              탈퇴 시 모든 계정 데이터(프로필, 게시물, 댓글, 투표 내역)는 즉시 삭제되며,
              삭제된 데이터는 복구할 수 없습니다. 단, 관련 법령에 따라 보관이 필요한
              정보는 해당 기간 동안 안전하게 보관됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              8. 손해배상
            </h2>
            <p className="text-[15px] leading-7">
              회원이 본 약관을 위반하여 PulseUp 또는 제3자에게 손해를 끼친 경우, 해당 회원은
              그 손해를 배상할 책임이 있습니다. PulseUp의 서비스 이용과 관련하여 발생한
              손해에 대해 PulseUp의 배상 책임은 관련 법령이 허용하는 최대 범위 내에서 제한됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              9. 분쟁 해결 및 준거법
            </h2>
            <p className="text-[15px] leading-7">
              본 약관은 대한민국 법률에 따라 해석되고 적용됩니다. 서비스 이용과 관련하여
              분쟁이 발생한 경우, PulseUp과 회원은 상호 협의를 통해 해결하는 것을 우선으로 합니다.
              협의가 이루어지지 않을 경우 민사소송법에 따른 관할 법원을 제1심 법원으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-3">
              10. 개인정보처리방침
            </h2>
            <p className="text-[15px] leading-7">
              PulseUp의 개인정보 수집 및 이용에 관한 사항은{" "}
              <Link href="/privacy" className="text-[var(--color-primary)] underline hover:opacity-80 transition-opacity">
                개인정보처리방침
              </Link>
              에서 확인하실 수 있습니다.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[13px] text-[var(--color-text-muted)]">최종 업데이트: 2026년 3월</span>
          <Link href="/privacy" className="text-[13px] text-[var(--color-primary)] hover:opacity-80 transition-opacity">
            개인정보처리방침 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
