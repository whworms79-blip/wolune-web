"use client";

import { useEffect } from "react";

// 화면 진입 시 엔진을 미리 깨우는 fire-and-forget 예열(렌더 없음).
// Render 무료 인스턴스가 잠들어 있어도 사용자가 사주를 제출할 즈음엔 깨어 있도록 한다.
export default function EngineWarmup() {
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/engine/warm", { cache: "no-store", signal: c.signal }).catch(() => {});
    return () => c.abort();
  }, []);
  return null;
}
