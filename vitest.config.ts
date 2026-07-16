import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 로직/컴포넌트 테스트 전용 — Next 런타임 없이 jsdom 에서 컴포넌트를 렌더한다.
// (동의 게이트의 auth 전환 재판정 검증. 실제 Firebase/카카오는 배포 후 라이브 눈확인.)
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
