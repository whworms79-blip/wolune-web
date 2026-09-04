// 계정 삭제 안내 — 서버 컴포넌트(SSR, 로그인 없이도 열린다).
//
// 왜 이 페이지가 필요한가: Google Play 정책은 계정을 만드는 앱에 **앱 안의 삭제 경로**와
// **앱 밖에서도 접근 가능한 웹 URL** 둘 다를 요구한다. 앱을 이미 지운 사람도 자기 계정을
// 지울 방법이 있어야 하기 때문이다. 그래서 이 페이지는 로그인 여부와 무관하게 열리고,
// 로그인해서 직접 지우는 길과 메일로 요청하는 길을 함께 안내한다.
//
// 톤: 방침 페이지와 같다 — 겁주지 않고 사실만, 무엇이 지워지고 무엇이 남는지 정확히.
import type { Metadata } from "next";
import Link from "next/link";
import "../../privacy/privacy.css";

export const metadata: Metadata = {
  title: "계정 삭제",
  description:
    "Wolune 계정을 지우는 방법과, 삭제하면 무엇이 사라지는지 안내합니다.",
};

// 방침 페이지와 같은 문의처를 쓴다(한 곳이 바뀌면 같이 바뀌어야 하는 값).
const CONTACT_EMAIL = "jhboat17@naver.com";

const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const ChevronLeft = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M15 6l-6 6 6 6" /></svg>);
const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pv-section">
      <h2 className="pv-section__title">
        <span className="pv-section__num">{n}</span>
        {title}
      </h2>
      <div className="pv-section__body">{children}</div>
    </section>
  );
}

export default function AccountDeletePage() {
  return (
    <main className="screen pv">
      <header className="topbar">
        <Link className="topbar__btn" href="/my" aria-label="뒤로">
          <ChevronLeft />
        </Link>
        <h1 className="wl-heading topbar__title">계정 삭제</h1>
      </header>

      <div className="screen__scroll pv__scroll">
        <section className="wl-card wl-card--gold pv-intro">
          <span className="pv-intro__mark" aria-hidden="true"><Moon /></span>
          <p className="pv-intro__lead">
            언제든 <strong>완전히 지울 수 있습니다.</strong>
          </p>
          <p className="pv-intro__body">
            떠나기로 하셨다면 붙잡지 않겠습니다. 다만 무엇이 사라지는지는 정확히 알려드릴게요 —
            되돌릴 수 없는 일이니까요.
          </p>
        </section>

        <Section n="1" title="지금 바로 지우기">
          <p>
            앱 또는 웹에서 <strong>마이 → 데이터 관리 → 계정 삭제</strong>를 누르면 됩니다.
            확인 한 번을 거치면 즉시 삭제됩니다.
          </p>
          <p>
            로그인 상태라면 아래 버튼으로 바로 이동할 수 있어요.
          </p>
          <p>
            <Link className="wl-btn wl-btn--ghost" href="/my">
              마이로 이동
            </Link>
          </p>
        </Section>

        <Section n="2" title="앱을 이미 지우셨다면">
          <p>
            앱이 없어도 계정은 남아 있습니다. 이 페이지에서 웹으로 로그인해 위와 같이 지우거나,
            아래로 요청해 주세요.
          </p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}?subject=Wolune 계정 삭제 요청`}>{CONTACT_EMAIL}</a>
            {" — "}
            로그인에 쓰신 <strong>카카오 또는 구글 계정</strong>을 알려주시면 본인 확인 후
            <strong> 영업일 기준 3일 이내</strong> 삭제하고 회신드립니다.
          </p>
        </Section>

        <Section n="3" title="무엇이 지워지나요">
          <ul className="pv-tldr__list">
            <li>사주 입력 정보 — 생년월일·태어난 시각·태어난 곳·성별</li>
            <li>무드저널 기록 전부 — 날짜·기분·태그·메모</li>
            <li>개인정보 수집·이용 동의 기록</li>
            <li>카카오·구글 계정 연결 정보</li>
            <li>로그인 계정 자체(Firebase 인증 계정)</li>
          </ul>
          <p>
            <strong>전부 즉시, 완전히 삭제됩니다.</strong> 보관 기간을 두지 않고 백업본에도
            남기지 않습니다. 되돌릴 방법은 없습니다 — 같은 카카오·구글 계정으로 다시 로그인해도
            예전 기록은 돌아오지 않고 새로 시작합니다.
          </p>
        </Section>

        <Section n="4" title="남는 것이 있나요">
          <p>
            사주 계산 서버의 접속 기록에는 <strong>요청 시각과 응답 상태</strong>만 남습니다.
            생년월일·태어난 곳은 그 기록에 남지 않도록 처리하고 있습니다.
          </p>
          <p>
            로그인하지 않고 쓰신 익명 기록은 계정과 연결되어 있지 않아, 계정 삭제와 별개로
            <strong> 마이 → 내 데이터 초기화</strong>로 지우실 수 있습니다.
          </p>
        </Section>

        <Section n="5" title="계정 삭제와 데이터 초기화의 차이">
          <p>
            <strong>내 데이터 초기화</strong>는 사주와 기록만 지우고 계정은 남깁니다. 다시
            로그인하면 그 계정으로 돌아와, 새로 입력해 이어서 쓰실 수 있습니다.
          </p>
          <p>
            <strong>계정 삭제</strong>는 계정 자체를 없앱니다. 같은 소셜 계정으로 다시 들어와도
            처음 오신 분으로 시작합니다.
          </p>
        </Section>

        <p className="pv-outro">
          궁금한 점은 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 로 알려주세요.{" "}
          <Link href="/privacy">개인정보처리방침</Link>도 함께 보실 수 있어요.
        </p>
      </div>
    </main>
  );
}
