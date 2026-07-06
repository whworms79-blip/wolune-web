// 엔진 예열(warm-up) 프록시 — Render 무료 인스턴스의 콜드스타트 완화용.
// 화면 진입 시 클라이언트가 이걸 한 번 때리면, 서버가 엔진 /healthz 를 깨워
// 사용자가 사주를 제출할 즈음엔 엔진이 이미 깨어 있게 한다(무료 keep-warm의 일부).
// 엔진 실주소는 서버 전용 env(WOLUNE_ENGINE_URL)에만 있고 브라우저엔 노출되지 않는다.
export const dynamic = "force-dynamic";

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

export async function GET() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${ENGINE}/healthz`, {
      cache: "no-store",
      signal: controller.signal,
    });
    return Response.json({ warmed: res.ok });
  } catch {
    // 8초 안에 못 깨워도(콜드), 요청은 이미 Render에 도달해 기동을 시작시켰다.
    return Response.json({ warmed: false });
  } finally {
    clearTimeout(timer);
  }
}
