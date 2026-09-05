# git 훅

## 설치 (저장소를 새로 받으면 한 번)

```
cp tools/hooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push
```

`.git/hooks/` 는 git 이 추적하지 않으므로, 클론할 때마다 위 한 줄을 실행해야 한다.

## pre-push — `[skip ci]` 없는 푸시를 막는다

이 저장소는 **Netlify git 자동배포**가 붙어 있다. `[skip ci]` 없이 푸시하면 Netlify 가
서버에서 빌드를 돌리고 **프로덕션 배포로 청구한다(1회 15 크레딧)**.

배포는 항상 로컬 빌드 업로드로만 한다:

```
npx netlify-cli deploy --prod --build
```

2026-09-05 에 이 규칙을 어겨, 실패한 서버 빌드 3건이 크레딧을 태웠다.
(실패 사유는 `NEXT_PUBLIC_KAKAO_JS_KEY` 를 비밀 노출로 오인한 스캐너였고,
 지금은 Netlify 환경변수 `SECRETS_SCAN_OMIT_KEYS` 로 예외 처리했다.)

정말 자동배포를 원할 때만: `git push --no-verify`
