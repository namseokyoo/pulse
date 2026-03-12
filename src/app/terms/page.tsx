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
              Pulse 서비스는 만 14세 이상 누구나 이용하실 수 있습니다.
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
              Pulse는 서비스 개선을 위해 기능을 추가, 수정, 삭제할 수 있습니다.
              중요한 변경사항은 서비스 내 공지를 통해 안내드립니다.
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
