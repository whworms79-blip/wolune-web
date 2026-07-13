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
import { KakaoButton } from "../lib/LinkAccount";

export default function ReturningHint() {
  const router = useRouter();
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onAuthChange(() => setAnon(isAnonymous())), []);

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
    <div className="returning-hint">
      <p className="wl-body-s wl-text-secondary returning-hint__text">
        예전에 로그인해서 쓰신 적이 있다면, 먼저 로그인하시면 기록이 그대로 돌아와요.
      </p>
      <div className="returning-hint__actions">
        <KakaoButton disabled={busy} label="카카오로 로그인" />
        <button
          type="button"
          className="wl-btn wl-btn--ghost returning-hint__google"
          onClick={signInGoogle}
          disabled={busy}
        >
          구글로 로그인
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
