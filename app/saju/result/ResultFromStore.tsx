"use client";

// 무파라미터로 /saju/result 에 들어온 경우 — 로그인/익명 **본인**이 자기 사주를 볼 때.
// URL·브라우저 기록에 개인정보(생년월일·시각·출생지·성별)를 싣지 않기 위해, 파라미터로
// 넘기는 대신 여기서 Firestore(users/{uid}.sajuInput)를 읽어 엔진을 호출한다.
//
//   · 저장된 사주 있음 → 엔진 계산 후 ResultView 로 렌더(파라미터 경로와 같은 화면).
//   · 저장된 사주 없음(익명·미저장) → 입력 화면(/saju)으로.
//
// ⚠ 엔진 호출은 같은 오리진 프록시(/api/engine/chart)를 거친다 — 이 요청 쿼리엔 여전히
//   출생정보가 담기지만, 그건 fetch(XHR)라 **주소창·브라우저 기록엔 남지 않는다**(홈·저널·마이와
//   동일). 이번 변경의 목표는 "화면 이동 URL"에서 개인정보를 빼는 것이다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUid } from "../../lib/firebase";
import { loadSajuInput, chartUrl } from "../../lib/sajuInput";
import { isCompleteChart, type EngineChart } from "./chart";
import type { GlossaryData } from "../../lib/glossary";
import ResultView from "./ResultView";
import { FallbackState, LoadingState } from "./ui";

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; chart: EngineChart }
  | { kind: "error" };

export default function ResultFromStore({ glossary }: { glossary: GlossaryData }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ★ 저장된 사주를 읽기 전에 currentUser(uid) 확정을 명시적으로 기다린다(엉뚱한 계정 방지).
      await confirmUid();
      const saved = await loadSajuInput();
      if (cancelled) return;
      if (!saved) {
        // 저장된 사주가 없다(익명이거나 아직 입력 안 함) → 입력 화면으로.
        router.replace("/saju");
        return;
      }
      try {
        const res = await fetch(chartUrl(saved), { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setPhase({ kind: "error" });
          return;
        }
        const chart = (await res.json()) as unknown;
        if (cancelled) return;
        if (!isCompleteChart(chart)) {
          setPhase({ kind: "error" });
          return;
        }
        setPhase({ kind: "ready", chart });
      } catch {
        if (!cancelled) setPhase({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (phase.kind === "ready") {
    return <ResultView chart={phase.chart} glossary={glossary} />;
  }
  if (phase.kind === "error") {
    return (
      <FallbackState
        title="지금은 사주를 불러오지 못했어요"
        body="계산 서버와 연결이 잠시 원활하지 않아요. 잠시 후 다시 시도해 주세요."
      />
    );
  }
  return <LoadingState />;
}
