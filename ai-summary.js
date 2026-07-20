// AI 요약 초안 생성 — 맛하루의 Netlify Functions 패턴 재사용
// 환경변수: OPENAI_API_KEY (Netlify > Site settings > Environment variables)
// 주의: 클라이언트가 이름·주소·전화번호를 제거한 뒤 전송하지만,
//       이 함수에서도 한 번 더 방어적으로 개인정보 필드를 제거한다.

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };

  try {
    const { caseData } = JSON.parse(event.body || "{}");
    if (!caseData) return { statusCode: 400, headers, body: JSON.stringify({ error: "caseData 누락" }) };

    // 2차 방어: 개인정보 필드 강제 제거
    if (caseData.s1) {
      delete caseData.s1.address;
      delete caseData.s1.phone;
    }
    delete caseData.nameEnc;
    delete caseData._name;

    const systemPrompt = `당신은 정신건강복지센터의 정신건강전문요원을 보조하는 임상 문서 작성 도우미입니다.
사례관리 기록지(인적사항, 병력정보, MSE)의 구조화된 입력값을 받아 종합 요약 초안을 작성합니다.

작성 규칙:
1. 격식 있는 임상 기록체(개조식 평서형: "~함", "~됨", "~로 사료됨")를 사용한다.
2. 구성: ① 일반적 배경 요약 ② 발달력·병력 요약 ③ MSE 소견 요약 ④ 주요 위험요인 및 개입 시 고려사항
3. 입력에 없는 내용을 추측하거나 창작하지 않는다. 미입력 항목은 언급하지 않거나 "확인되지 않음"으로 처리한다.
4. 자타해사고 '유' 또는 자살시도력이 있으면 위험요인 항목에서 반드시 언급하고 지속 모니터링 필요성을 기재한다.
5. 진단명 단정, 처방 제안은 하지 않는다. 관찰 소견 수준으로 서술한다.
6. 이름 등 식별정보는 '대상자'로만 지칭한다.
7. 전체 분량은 400~700자 내외.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "다음 사례관리 기록지 입력값을 요약하세요:\n" + JSON.stringify(caseData, null, 1) },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "OpenAI API 오류");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary: data.choices[0].message.content.trim() }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
