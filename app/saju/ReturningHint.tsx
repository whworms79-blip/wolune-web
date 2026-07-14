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
import { isAnonymous, linkGoogle, onAuthChange } from "../lib/firebase";
import { chartQuery, loadSajuInput } from "../lib/sajuInput";
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

  useEffect(() => onAuthChange(() => setAnon(isAnonymous())), []);
  useEffect(() => {
    setKnown(hasSignedInBefore());
    setProv(lastProvider());
  }, []);

  if (!anon) return null;

  // 로그인에 성공하면 옛 사주가 돌아온다 → 여기서 더 입력할 이유가 없다.
  async function signInGoogle() {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await linkGoogle();
    if (res === "canceled") {
      setBusy(false);
      return;
    }
    if (res === "failed") {
      setBusy(false);
      setError("로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const saved = await loadSajuInput();
    if (saved) {
      router.replace(`/saju/result?${chartQuery(saved).toString()}`);
      return;
    }
    // 로그인은 했는데 사주가 없다(그 계정으로 저장한 적 없음) → 안내만 감추고 계속 입력.
    setBusy(false);
    setAnon(false);
  }

  return (
    <div className={`returning-hint${known ? " returning-hint--known" : ""}`}>
      <p className="wl-body-s returning-hint__text">
        {known
          ? "이 기기에서 로그인하신 적이 있어요. 먼저 로그인하시면 예전 사주와 기록이 그대로 돌아와요."
          : "예전에 로그인해서 쓰신 적이 있다면, 먼저 로그인하시면 기록이 그대로 돌아와요."}
      </p>
      <div className="returning-hint__actions">
        {/* 카카오는 규정상 노란 채움 그대로 → 구글은 테두리형으로 낮춘다(둘이 안 싸우게).
            마지막에 쓴 방법을 먼저 놓는다(어떤 버튼을 앞에 둘지에만 쓴다 — 식별 정보 아님). */}
        {prov === "google" ? (
          <>
            <button
              type="button"
              className="google-btn returning-hint__google"
              onClick={signInGoogle}
              disabled={busy}
            >
              구글 로그인
            </button>
            <KakaoButton disabled={busy} />
          </>
        ) : (
          <>
            <KakaoButton disabled={busy} />
            <button
              type="button"
              className="google-btn returning-hint__google"
              onClick={signInGoogle}
              disabled={busy}
            >
              구글 로그인
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="wl-body-s returning-hint__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
