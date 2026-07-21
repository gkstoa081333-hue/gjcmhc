// worker.js — Cloudflare Worker
// 역할 1: /api/ai-summary POST 요청 → OpenAI 호출해 요약 생성
// 역할 2: 그 외 모든 요청 → 정적 파일(env.ASSETS) 그대로 서빙
//
// 필요 설정 (README 참고):
//   - wrangler.jsonc 에 "main": "worker.js" 와 assets binding "ASSETS"
//   - Cloudflare 대시보드 → 프로젝트 → Settings → Variables and Secrets
//     → Secret 추가: OPENAI_API_KEY

const SYSTEM_PROMPT_MSE = `당신은 정신건강복지센터의 정신건강전문요원을 보조하는 임상 문서 작성 도우미입니다.
사례관리 기록지(인적사항, 병력정보, MSE)의 구조화된 입력값을 받아 종합 요약 초안을 작성합니다.

작성 규칙:
1. 격식 있는 임상 기록체(개조식 평서형: "~함", "~됨", "~로 사료됨")를 사용한다.
2. 구성: ① 일반적 배경 요약 ② 발달력·병력 요약 ③ MSE 소견 요약 ④ 주요 위험요인 및 개입 시 고려사항
3. 입력에 없는 내용을 추측하거나 창작하지 않는다. 미입력 항목은 언급하지 않거나 "확인되지 않음"으로 처리한다.
4. 자타해사고 '유' 또는 자살시도력이 있으면 위험요인 항목에서 반드시 언급하고 지속 모니터링 필요성을 기재한다.
5. 진단명 단정, 처방 제안은 하지 않는다. 관찰 소견 수준으로 서술한다.
6. 이름 등 식별정보는 '대상자'로만 지칭한다.
7. 전체 분량은 400~700자 내외.`;

const SYSTEM_PROMPT_OVERVIEW = `당신은 정신건강복지센터의 정신건강전문요원을 보조하는 임상 문서 작성 도우미입니다.
사례관리 기록(MSE), 일반상담 회차, 개별상담 회차를 모두 받아 **대상자의 지금까지 전체 이력**을 종합 요약합니다.

작성 규칙:
1. 격식 있는 임상 기록체(개조식 평서형: "~함", "~됨", "~로 사료됨").
2. 구성:
   ① 인적·발달·병력 요약 (사례관리 기록 기반)
   ② 초기 MSE 소견 (핵심만)
   ③ 상담 경과 (일반상담·개별상담 회차를 **날짜 순**으로 통합해 흐름을 서술 — 언제, 무엇을, 어떤 변화가 있었는지)
   ④ 현재 상태 및 지속 관찰·개입 필요사항
3. 각 상담이 언제 있었는지 날짜를 함께 밝힌다. 예: "2026년 3월 15일 일반상담에서…"
4. 상담 회차 간 상태·기분·문제·조치의 변화 추이를 명시적으로 기술한다. 개선/악화/유지 판단을 근거와 함께 서술한다.
5. 자타해사고, 자살시도, 위험요인이 언급되면 시간순으로 추적하고 현재의 위험도를 서술한다.
6. 입력에 없는 내용은 추측하지 않는다. 미기록 항목은 "기록 없음"으로 처리한다.
7. 진단명 단정, 처방 제안은 하지 않는다. 관찰 수준으로 서술한다.
8. 이름 등 식별정보는 '대상자'로만 지칭한다.
9. 전체 분량은 800~1500자. 회차가 많을수록 자세히.`;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function handleSummary(request, env) {
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  if (!env.OPENAI_API_KEY)
    return json({ error: "서버에 OPENAI_API_KEY가 등록되지 않았습니다. Cloudflare → Settings → Variables and Secrets에서 추가하세요." }, 500);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "잘못된 요청 형식" }, 400);
  }
  const { caseData, mode } = body;
  if (!caseData) return json({ error: "caseData 누락" }, 400);

  // 2차 방어: 개인정보 필드 강제 제거
  if (caseData.s1) { delete caseData.s1.address; delete caseData.s1.phone; }
  delete caseData.title; delete caseData.ownerName;

  const isOverview = mode === 'overview';
  const systemPrompt = isOverview ? SYSTEM_PROMPT_OVERVIEW : SYSTEM_PROMPT_MSE;
  const userIntro = isOverview
    ? "다음은 한 대상자의 사례관리 기록(MSE)과 이후 진행된 일반상담·개별상담 회차 데이터입니다. 시간순으로 통합해 대상자의 지금까지 이력을 요약하세요:\n"
    : "다음 사례관리 기록지 입력값을 요약하세요:\n";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: isOverview ? 2000 : 1000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userIntro + JSON.stringify(caseData, null, 1) },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message || "OpenAI API 오류" }, 502);

  return json({ summary: (data.choices?.[0]?.message?.content || "").trim() });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ai-summary") {
      try { return await handleSummary(request, env); }
      catch (e) { return json({ error: e.message || "서버 오류" }, 500); }
    }
    // 나머지는 정적 파일 그대로
    return env.ASSETS.fetch(request);
  },
};
