// 콜드스타트 방지 — Render 무료 엔진은 15분 무접속 시 잠든다.
// 12분마다 엔진 /healthz 를 깨워(Netlify Scheduled Function) 항상 warm 유지.
// (Render 무료 720h/월 < 750h 한도 이내라 계속 무료)
export default async () => {
  try {
    await fetch("https://wolune-engine.onrender.com/healthz", {
      signal: AbortSignal.timeout(30000), // 콜드스타트 중이면 느릴 수 있음
    });
  } catch (_) {
    // 깨우는 게 목적이라 응답 결과는 무시(콜드스타트 첫 요청은 실패해도 됨)
  }
  return new Response("ok");
};

// 12분 간격(15분 슬립 전에 깨움). 크론.
export const config = { schedule: "*/12 * * * *" };
