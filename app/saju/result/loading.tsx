// 결과 서버 렌더(엔진 호출) 동안 보이는 로딩 화면.
import "./result.css";

export default function Loading() {
  return (
    <main className="screen">
      <div className="result-loading">
        <div className="loader" aria-hidden="true">
          <span className="loader__ring" />
          <span className="loader__mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <h2 className="wl-title-m">진태양시로 정밀하게 계산하고 있어요</h2>
        <p className="wl-body-s wl-text-secondary">잠시만요, 당신의 흐름을 읽는 중</p>
      </div>
    </main>
  );
}
