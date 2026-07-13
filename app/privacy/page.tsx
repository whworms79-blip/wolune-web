// 개인정보처리방침 — 서버 컴포넌트(SSR, SEO 노출).
// ⚠️ 내용은 실제 코드(Firebase·카카오·엔진) 기준으로 작성한 초안이며, 법률 전문가 검토 예정.
// 톤: 법률 문서가 아니라 "당신의 정보를 이렇게 소중히 다뤄요"로 읽히게(밤하늘·달빛).
import type { Metadata } from "next";
import Link from "next/link";
import "./privacy.css";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "Wolune이 어떤 정보를 왜 받고, 어떻게 지키고, 언제 지우는지 — 숨김없이 적었습니다.",
};

// 문의처 — 이 상수만 바꾸면 페이지 전체(문의·권리행사 안내)에 반영된다.
const CONTACT_EMAIL = "jhboat17@naver.com";
const PRIVACY_OFFICER = "조재근";
const EFFECTIVE_DATE = "2026년 7월 14일";
// 동의 버전(CONSENT_VERSION)은 lib/consent.ts 가 단일 출처다 — 여기서 다시 선언하지 않는다.
// (이 페이지는 서버 컴포넌트라, firebase 를 쓰는 consent.ts 를 끌어오지 않는 게 맞다.)

/* ---------- 인라인 아이콘 ---------- */
const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const ChevronLeft = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M15 6l-6 6 6 6" /></svg>);
const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
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

export default function PrivacyPage() {
  return (
    <main className="screen pv">
      <header className="topbar">
        <Link className="topbar__btn" href="/my" aria-label="뒤로">
          <ChevronLeft />
        </Link>
        <h1 className="wl-heading topbar__title">개인정보처리방침</h1>
      </header>

      <div className="screen__scroll pv__scroll">
        {/* 여는 말 — 방침을 '약속'으로 */}
        <section className="wl-card wl-card--gold pv-intro">
          <span className="pv-intro__mark" aria-hidden="true"><Moon /></span>
          <p className="pv-intro__lead">
            사주는 <strong>가장 사적인 이야기</strong>로 시작합니다. 태어난 날, 태어난 시각,
            그리고 요즘의 마음까지요.
          </p>
          <p className="pv-intro__body">
            그래서 Wolune은 <strong>필요한 만큼만 받고, 받은 것은 정확히 적어두고,
            원하실 때 남김없이 지웁니다.</strong> 아래는 우리가 무엇을 왜 받는지,
            어디에 맡기는지, 어떻게 지우는지 — 숨김없이 적은 약속입니다.
          </p>
          <p className="pv-intro__meta">시행일 {EFFECTIVE_DATE}</p>
        </section>

        {/* 한눈에 보기 */}
        <section className="wl-card pv-tldr">
          <span className="wl-section-label">한눈에 보기</span>
          <ul className="pv-tldr__list">
            <li><strong>가입 없이 시작</strong>해요. 처음엔 이름도 이메일도 받지 않습니다.</li>
            <li>받는 건 <strong>사주 계산에 꼭 필요한 것</strong>(생년월일·태어난 시각·태어난 곳·성별)과, 직접 남기신 <strong>무드 기록</strong>뿐이에요.</li>
            <li><strong>광고·분석 추적을 하지 않습니다.</strong> 방문 분석 도구도 붙여두지 않았어요.</li>
            <li>정보를 <strong>팔거나 넘기지 않습니다.</strong> 서비스를 굴리는 데 필요한 곳(구글·카카오 등)에만 맡깁니다.</li>
            <li>언제든 <strong>마이 &gt; 내 데이터 초기화</strong>로 지울 수 있어요.</li>
          </ul>
        </section>

        <Section n="1" title="어떤 정보를, 어떻게 받나요">
          <p>
            Wolune은 <strong>회원가입 절차 없이</strong> 시작합니다. 처음 앱이나 웹을 열면
            이름·이메일 없이 <strong>익명 계정</strong>이 자동으로 만들어지고, 그 계정에
            당신의 기록이 담깁니다.
          </p>

          <h3 className="pv-h3">직접 입력하시는 정보</h3>
          <table className="pv-table">
            <thead>
              <tr><th>항목</th><th>왜 필요한가요</th><th className="pv-req">필수</th></tr>
            </thead>
            <tbody>
              <tr><td>생년월일</td><td>사주 여덟 글자(명식)를 세우는 기준</td><td className="pv-req">필수</td></tr>
              <tr><td>태어난 시각</td><td>시주(時柱) 계산. <strong>“모름”으로 두셔도 됩니다</strong></td><td className="pv-req">선택</td></tr>
              <tr><td>태어난 곳(도시)</td><td>진태양시 보정(그 지역의 실제 태양 위치)</td><td className="pv-req">선택</td></tr>
              <tr><td>성별</td><td>대운(10년 흐름)의 방향을 정하는 데 쓰입니다</td><td className="pv-req">필수</td></tr>
              <tr><td>양력/음력·윤달</td><td>날짜를 정확히 환산하기 위해</td><td className="pv-req">필수</td></tr>
              <tr><td>무드 기록<br/>(감정 점수·태그·메모)</td><td>직접 남기신 기록을 보여드리고, 흐름을 함께 살피기 위해</td><td className="pv-req">선택</td></tr>
            </tbody>
          </table>
          <p className="pv-note">
            무드 기록의 <strong>메모는 자유롭게 쓰는 칸</strong>입니다. 남기신 내용은 그대로
            저장되니, 원치 않는 민감한 이야기는 적지 않으시길 권해요.
          </p>

          <h3 className="pv-h3">계정을 연결하실 때 (선택)</h3>
          <p>
            기기를 바꿔도 기록이 남도록 <strong>카카오·구글 계정 연결</strong>을 선택하실 수 있어요.
            연결하지 않아도 서비스는 그대로 이용하실 수 있습니다.
          </p>
          <table className="pv-table">
            <thead>
              <tr><th>연결 방식</th><th>받는 정보</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>카카오</td>
                <td>카카오 <strong>회원번호</strong>, <strong>닉네임</strong><br/>
                  <span className="pv-dim">(이메일·프로필 사진은 받지 않습니다)</span></td>
              </tr>
              <tr>
                <td>구글</td>
                <td><strong>이메일</strong>, <strong>이름</strong>, <strong>프로필 사진</strong><br/>
                  <span className="pv-dim">(구글이 로그인 시 함께 전달하는 기본 정보)</span></td>
              </tr>
            </tbody>
          </table>

          <h3 className="pv-h3">자동으로 남는 것</h3>
          <ul className="pv-list">
            <li>
              <strong>로그인 상태</strong> — 다시 열었을 때 기록이 남아 있도록 브라우저·기기의
              저장 공간에 보관합니다. (광고·추적용 쿠키는 쓰지 않습니다)
            </li>
            <li>
              <strong>서버 접속 기록</strong> — 사주를 계산하는 서버와 웹 서버에는 요청 기록(접속
              시각, 요청 내용 등)이 일정 기간 남습니다. 계산 요청에는 생년월일·시각·출생지·성별이
              포함됩니다.
            </li>
            <li>
              <strong>분석·광고 도구는 사용하지 않습니다.</strong> 방문자 분석(Google
              Analytics 등)이나 광고 추적 도구를 붙여두지 않았어요.
            </li>
          </ul>
        </Section>

        <Section n="2" title="무엇에 쓰나요">
          <ul className="pv-list">
            <li><strong>사주 계산</strong> — 명식·오행·대운·세운·오늘의 흐름을 계산해 보여드립니다.</li>
            <li><strong>무드저널</strong> — 남기신 기록을 저장하고, 그날의 흐름과 함께 되돌아볼 수 있게 합니다.</li>
            <li><strong>궁합</strong> — 두 사람의 생년월일로 결을 견주어 보여드립니다.</li>
            <li><strong>계정 유지</strong> — 기기를 바꿔도 기록이 이어지도록 합니다.</li>
          </ul>
          <p className="pv-note">
            <strong>광고·마케팅에 쓰지 않고, 프로파일링해 판매하지 않습니다.</strong> 위에
            적은 목적 밖으로 쓰지 않으며, 목적이 달라지면 미리 알리고 동의를 구합니다.
          </p>
        </Section>

        <Section n="3" title="얼마나 보관하고, 어떻게 지우나요">
          <ul className="pv-list">
            <li>
              <strong>보관 기간</strong> — 서비스를 이용하시는 동안 보관합니다. 정해진 기간이
              지나서가 아니라, <strong>당신이 지우기로 하실 때</strong> 지웁니다.
            </li>
            <li>
              <strong>직접 지우기</strong> — <strong>마이 &gt; 내 데이터 초기화</strong>를 누르면
              저장된 사주 정보와 무드 기록이 삭제됩니다.
            </li>
            <li>
              <strong>파기 방법</strong> — 데이터베이스에서 지체 없이 삭제하며, 백업본에 남은
              사본도 순차적으로 삭제됩니다. 서버 접속 기록은 호스팅 사업자의 보관 주기에 따라
              자동으로 삭제됩니다.
            </li>
            <li>
              <strong>계정을 지우고 싶다면</strong> — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 로 알려주시면 계정과 남은
              정보 일체를 삭제해 드립니다.
            </li>
          </ul>
          <p className="pv-note">
            익명으로만 쓰시고 계정을 연결하지 않으셨다면, 앱을 지우거나 브라우저 저장소를
            비우는 순간 그 익명 계정에 다시 접근할 수 없게 됩니다. (그래서 기록을 오래
            간직하고 싶다면 계정 연결을 권해드려요.)
          </p>
        </Section>

        <Section n="4" title="어디에 맡기나요 (처리위탁·제3자)">
          <p>
            Wolune은 <strong>정보를 판매하거나 제3자에게 제공하지 않습니다.</strong> 다만 서비스를
            운영하려면 아래 회사들의 시스템을 빌려 씁니다(처리위탁).
          </p>
          <table className="pv-table">
            <thead>
              <tr><th>맡기는 곳</th><th>맡기는 일</th><th>전달되는 정보</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Google<br/><span className="pv-dim">(Firebase)</span></td>
                <td>계정 인증, 데이터 보관</td>
                <td>사주 입력값, 무드 기록, 연결한 계정 정보</td>
              </tr>
              <tr>
                <td>카카오</td>
                <td>카카오 로그인</td>
                <td>로그인 요청 처리<span className="pv-dim"> (카카오로부터 회원번호·닉네임 수신)</span></td>
              </tr>
              <tr>
                <td>Netlify</td>
                <td>웹 서비스 호스팅</td>
                <td>접속 정보, 로그인 처리 정보</td>
              </tr>
              <tr>
                <td>Render</td>
                <td>사주 계산 · 감정 패턴 계산 서버 호스팅</td>
                <td>
                  계산 요청 정보
                  <span className="pv-dim">
                    {" "}(생년월일·시각·출생지·성별, 감정 패턴을 찾을 때는 기분 점수와
                    그날의 운세 점수)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="pv-note">
            <strong>감정 패턴(통찰) 계산에 대해.</strong> 기록이 충분히 쌓이면, 기분과
            그날의 기운 사이의 경향을 계산 서버에서 찾습니다. 이때 보내는 것은{" "}
            <strong>기분 점수와 그날의 운세 점수뿐입니다.</strong> 적어두신{" "}
            <strong>메모와 태그는 계산 서버로 보내지 않습니다.</strong> 계산 서버는 받은
            값을 <strong>저장하지 않고</strong>, 접속 기록에도 남기지 않습니다.
          </p>
          <p className="pv-note">
            이 회사들의 서버는 <strong>해외에 있을 수 있습니다.</strong> 서비스를 이용하시면
            위 목적 범위에서 정보가 해외로 이전될 수 있다는 점을 알려드립니다. 위탁받은 곳은
            맡긴 목적 밖으로 정보를 쓸 수 없습니다.
          </p>
          <p className="pv-note">
            법령에 따라 수사기관 등이 적법한 절차로 요구하는 경우에만 예외적으로 제공될 수 있습니다.
          </p>
        </Section>

        <Section n="5" title="당신의 권리">
          <p>
            당신은 언제든 자신의 정보에 대해 <strong>열람·정정·삭제·처리정지</strong>를 요구할 수
            있습니다. 대부분은 앱·웹에서 바로 하실 수 있어요.
          </p>
          <table className="pv-table">
            <thead>
              <tr><th>권리</th><th>바로 하는 방법</th></tr>
            </thead>
            <tbody>
              <tr><td>열람</td><td><strong>마이</strong>에서 저장된 사주 정보를, <strong>기록</strong>에서 남긴 무드를 확인</td></tr>
              <tr><td>정정</td><td><strong>사주</strong> 화면에서 생년월일·시각·출생지·성별을 다시 입력</td></tr>
              <tr><td>삭제</td><td><strong>마이 &gt; 내 데이터 초기화</strong></td></tr>
              <tr><td>처리정지·계정 삭제</td><td><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 로 요청 (본인 확인 후 처리)</td></tr>
            </tbody>
          </table>
          <p className="pv-note">
            법정대리인을 통해서도 행사하실 수 있으며, 요청에 대해 <strong>지체 없이(10일 이내)</strong>
            처리하고 결과를 알려드립니다.
          </p>
        </Section>

        <Section n="6" title="정보를 어떻게 지키나요">
          <ul className="pv-list">
            <li><strong>본인만 접근</strong> — 데이터베이스 보안 규칙으로 <strong>자기 계정의 데이터에만</strong> 접근할 수 있게 막아두었습니다. 다른 사람의 사주·기록은 열람할 수 없습니다.</li>
            <li><strong>전송 구간 암호화</strong> — 오가는 모든 통신은 HTTPS로 암호화됩니다.</li>
            <li><strong>최소 수집</strong> — 계산에 필요하지 않은 정보는 처음부터 받지 않습니다.</li>
            <li><strong>서버는 저장하지 않음</strong> — 사주 계산 서버는 계산만 하고 결과나 입력을 따로 저장하지 않습니다.</li>
          </ul>
        </Section>

        <Section n="7" title="만 14세 미만 아동">
          <p>
            Wolune은 <strong>만 14세 미만 아동을 대상으로 하지 않으며</strong>, 만 14세 미만
            아동의 개인정보를 알면서 수집하지 않습니다. 만 14세 미만이라면 법정대리인의 동의
            없이 서비스를 이용하지 말아 주세요.
          </p>
          <p>
            만 14세 미만 아동의 정보가 법정대리인 동의 없이 수집된 것을 알게 되면
            <strong> 지체 없이 삭제</strong>합니다. 그런 사실을 발견하셨다면 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> 로
            알려주세요.
          </p>
        </Section>

        <Section n="8" title="이 방침이 바뀌면">
          <p>
            내용이 바뀌면 <strong>시행 최소 7일 전</strong>에 이 페이지에 공지합니다. 수집 항목이
            늘거나 이용 목적이 달라지는 등 <strong>중요한 변경</strong>이라면
            <strong> 30일 전에 알리고, 필요하면 다시 동의를 구합니다.</strong>
          </p>
          <p className="pv-dim">현재 버전 시행일: {EFFECTIVE_DATE}</p>
        </Section>

        <Section n="9" title="개인정보 보호책임자 · 문의">
          <div className="pv-contact">
            <p>
              정보와 관련해 궁금하거나 불편한 점이 있으면 언제든 알려주세요.
              최대한 빠르게, 사람이 직접 답해드립니다.
            </p>
            <dl className="pv-contact__dl">
              <div><dt>개인정보 보호책임자</dt><dd>{PRIVACY_OFFICER}</dd></div>
              <div><dt>이메일</dt><dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd></div>
            </dl>
            <p className="pv-note">
              개인정보 침해로 도움이 필요하시면 아래 기관에도 문의하실 수 있습니다.<br />
              개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118) · 개인정보분쟁조정위원회
              (kopico.go.kr / 1833-6972) · 대검찰청 사이버수사과 (1301) · 경찰청 사이버수사국 (182)
            </p>
          </div>
        </Section>

        <p className="pv-outro">
          달이 어둠을 몰아내지 않고 은은히 밝히듯, 우리도 당신의 이야기를 함부로 다루지
          않겠습니다.
        </p>
      </div>
    </main>
  );
}
