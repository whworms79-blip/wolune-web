"use client";

// 익명 상태에서 사주를 새로 입력하려는 사람에게 건네는 한 줄.
//
// 로그아웃하면 새 익명 uid 가 되고, 여기서 사주를 다시 입력하면 **새 계정에 새 사주가**
// 저장된다. 옛 기록은 Firestore 에 멀쩡히 살아 있지만 화면에서 사라져 "없어졌다"고 느낀다.
// 그 순간을 여기서 잡는다 — 겁주지 않고, 강요하지 않고, 그냥 알려준다.
//
// 앱(app/lib/screens/onboarding_screen.dart 의 _ReturningHint)과 문구·동작을 일치시킨다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUid, isAnonymous, linkGoogle, onAuthChange } from "../lib/firebase";
import { armCarryHandoff, disarmCarryHandoff } from "../lib/carryOver";
import { loadSajuInput } from "../lib/sajuInput";
import { hasSignedInBefore, lastProvider, type Provider } from "../lib/returning";
import { KakaoButton } from "../lib/LinkAccount";

export default function ReturningHint() {
  const router = useRouter();
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // ★ 이 기기에서 로그인한 적이 있는 사람(wl_returning)에겐 안내를 더 또렷하게 한다.
  //   웰컴에서 로그인을 뺐으니, **돌아온 사용자를 붙잡는 지점은 여기 하나뿐이다.**
  //   여기가 새 데이터를 만들려는 바로 그 순간이라, 실은 웰컴보다 이 자리가 맞다.
  const [known, setKnown] = useState(false);
  const [prov, setProv] = useState<Provider | null>(null);
  // 로그인은 됐는데 그 계정에 저장된 사주가 없을 때 — 신규 회원에게 건네는 안내로 바꾼다.
  const [newUser, setNewUser] = useState(false);

  useEffect(() => onAuthChange(() => setAnon(isAnonymous())), []);
  useEffect(() => {
    setKnown(hasSignedInBefore());
    setProv(lastProvider());
  }, []);

  // 로그인에 성공하면 옛 사주가 돌아온다 → 있으면 결과 화면으로, 없으면(신규) 폼에 머문다.
  async function signInGoogle() {
    if (busy) return;
    setBusy(true);
    setError("");
    // 전환 시 이어붙이기(CarryOverDialog)가 화면을 떠맡는지 기다릴 준비(전환 아니면 아래에서 해제).
    const handoff = armCarryHandoff();
    const res = await linkGoogle();
    if (res === "canceled") {
      disarmCarryHandoff();
      setBusy(false);
      return;
    }
    if (res === "failed") {
      disarmCarryHandoff();
      setBusy(false);
      setError("로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (res === "switchedToExisting") {
      // ── 옛 계정으로 전환 — 이어붙이기(CarryOverDialog)가 순서의 주인이 될 수 있다. ──
      // carried/returned/conflict 면 그쪽이 새로고침/충돌모달로 화면을 이끈다(이어붙이기 먼저,
      // 결과는 그 다음). 그 경우엔 여기서 손을 뗀다.
      const tookOver = await handoff;
      if (tookOver) return;
      // 새로고침이 없다(양쪽 다 비었거나 캡처/이어붙이기 실패) = 사실상 신규 →
      // 아래 공통 마무리로 떨어진다(빈 폼에 말없이 멈추지 않게).
    } else {
      disarmCarryHandoff(); // linked — 전환 아님. 대기 프라미스 정리.
    }

    // ── 공통 마무리 (linked, 또는 전환인데 이어붙이기가 화면을 안 떠맡은 경우). ──
    // ★ 저장된 사주를 읽기 전에 currentUser(uid) 확정을 명시적으로 기다린다.
    await confirmUid();
    const saved = await loadSajuInput();
    if (saved) {
      // 파라미터 없이 이동 — 결과 페이지가 Firestore 에서 읽는다(개인정보를 URL·기록에 안 남김).
      router.replace("/saju/result");
      return;
    }
    // 로그인은 했는데 사주가 없다(그 계정으로 저장한 적 없음) → 신규 안내로 바꾸고 계속 입력.
    setBusy(false);
    setNewUser(true);
  }

  // 신규 회원 — 로그인은 됐지만 저장된 사주가 없다. 입력을 이어가도록 담백히 안내.
  if (newUser) {
    return (
      <div className="returning-hint">
        <p className="wl-body-s returning-hint__text">
          처음 오셨네요. 아래에 정보를 입력하시면 사주를 볼 수 있어요.
        </p>
      </div>
    );
  }

  if (!anon) return null;

  return (
    <div className={`returning-hint${known ? " returning-hint--known" : ""}`}>
      <p className="wl-body-s returning-hint__text">
        {known
          ? "이 기기에서 로그인하신 적이 있어요. 먼저 로그인하시면 예전 사주와 기록이 그대로 돌아와요."
          : "예전에 로그인해서 쓰신 적이 있다면, 먼저 로그인하시면 기록이 그대로 돌아와요."}
      </p>
      <div className="returning-hint__actions">
        {/* 세로 스택으로 위계를 준다: 카카오(규정상 노란 채움)를 주 CTA로 **위**에, 구글(테두리형)을
            보조로 **아래**에 — 순서는 고정한다(위치가 흔들리지 않게).
            지난번에 쓰신 수단엔 작은 라벨만 붙인다 — 버튼 **위** 캡션이라 카카오 버튼 자체는
            규정대로(색·심볼·문구·모서리) 그대로 둔다. */}
        {prov === "kakao" && (
          <span className="returning-hint__last">지난번에 이 방법을 쓰셨어요</span>
        )}
        <KakaoButton disabled={busy} />
        {prov === "google" && (
          <span className="returning-hint__last">지난번에 이 방법을 쓰셨어요</span>
        )}
        <button
          type="button"
          className="google-btn"
          onClick={signInGoogle}
          disabled={busy}
        >
          구글 로그인
        </button>
      </div>
      {error && (
        <p className="wl-body-s returning-hint__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
