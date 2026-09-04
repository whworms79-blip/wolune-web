import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Netlify CLI 가 배포 때 만드는 산출물(번들된 함수·정적 파일). 우리 코드가 아니다.
    // 빼지 않으면 `eslint .` 결과가 이 생성물의 에러 310건에 파묻혀 진짜 소스 에러
    // 몇 건이 안 보인다(2026-09-04 검수에서 실제로 그랬다). .gitignore 에도 있다.
    ".netlify/**",
  ]),
]);

export default eslintConfig;
