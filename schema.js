// schema.js — 사례관리 기록지 서식 스키마 (HWP 원본 구조)
// ★ 서식 문항을 바꾸려면 이 파일만 수정하세요.
/* ================================================================
   2. 서식 스키마 (HWP 원본 구조)  — v1과 동일
================================================================ */
const TIPS = {
  famAssess:{t:'가족구성원에 대한 사정',b:'면담 시 부계·모계 3대까지 정보를 수집합니다. 가족의 정신·신체 질환 병력을 포괄적으로 파악하고, 면담 내용을 바탕으로 가계도를 작성합니다(직계가족 외 영향력 있는 친척 포함, 구성원 간 상호관계 표시).'},
  develop:{t:'발달력',b:'발달력 정보는 대상자뿐 아니라 가족 면담을 통해서도 사정할 수 있습니다. 면담 내용을 각색하지 말고 주요 상황을 명확히 기록하는 것이 중요합니다.'},
  history:{t:'병력',b:'발병 시기는 입원치료 시작 시점이 아니라 증상이 나타나기 시작한 시점입니다. 첫 발병부터 현재까지 증상 변화, 문제행동, 환경적 요인, 생활에 미치는 영향을 시간 순서대로 질문하여 사정합니다.'},
  suicide:{t:'자살시도력',b:'과거 자살시도 유무·횟수·방법, 시도 후 대처방법을 파악합니다. 현재 자살위험성 평가를 실시합니다(자살사고, 자살계획, 자살위험성, 지지체계 등).'},
  appearance:{t:'일반적인 외모',b:'관찰사항을 기록합니다. 전반적인 인상 외에도 병들어 보이는지, 실제 나이에 맞게 보이는지 등을 기록합니다.'},
  attitude:{t:'태도',b:'검사 요구에 잘 응하는지, 말투나 행동거지에서 달라진 점이 없는지 파악합니다.'},
  behavior:{t:'정신운동행동',b:'계속 움직이거나 손을 가만히 두지 못하는가 등 신체 움직임을 기술하고, 정신운동성 지연이나 움직임의 전반적 저조, 목적 없는 행동이 없는지 평가합니다.'},
  speech:{t:'언어',b:'속도(빠른가?), 음량(큰 소리로 대화하는가?), 양(결핍, 함구, 압박받아 말하는 듯한가?), 특성(더듬는가, 발음이 분명한가?)을 파악합니다.'},
  mood:{t:'기분',b:'감정의 깊이는 정확히 알 수 없지만 관찰을 통해 변화를 표현할 수 있습니다. "기분은 어떻습니까? 감정이 쉽게 변합니까?"'},
  affect:{t:'정동',b:'대상자의 말과 얼굴 표정이 일치하는지 관찰하여 파악합니다.'},
  perception:{t:'지각장애',b:'"무슨 소리가 들리나요?" "무슨 냄새가 나지는 않나요?" "다른 사람이 보이시나요?" 등으로 파악합니다.'},
  thought:{t:'사고',b:'"당신의 생각이 소리로 되어 들린 적이 있습니까?" "자신만 특별히 주목받고 있다고 생각합니까?" "다른 사람들이 자신을 해치려 한다고 생각합니까?" 등의 질의로 파악합니다.'},
  cognition:{t:'인지',b:'지남력: "오늘은 몇 년 몇 월 며칠입니까? / 이곳이 어디인가요? / 저는 누구일까요?" · 최근기억: "아침식사로 무엇을 드셨습니까?" · 과거기억: "초등학교 시절 친구들은 어떠했습니까?" · 주의집중: 100-7 연속뺄셈, \'가\'로 시작하는 단어 5개 · 추상적사고: 속담 질의'},
  judgment:{t:'판단력',b:'"극장에서 영화 관람 도중 연기 냄새가 날 때 무엇을 어떻게 할 것인가?"'},
  insight:{t:'병식',b:'"정신적으로 문제가 있다고 봅니까?" "당신의 병을 어떻게 이해하고 있습니까?" "치료받아야 하는(받는) 이유를 아십니까?"'}
};

const S1 = [
  {k:'consultDate',label:'작성일',type:'date'},
  {k:'informant',label:'정보제공자',type:'text',ph:'본인, 모, 배우자 등'},
  {k:'consultType',label:'상담구분',type:'chip1',opts:['초기상담','재상담','전화','내소','방문','기타']},
  {k:'age',label:'나이 (만)',type:'text',ph:'예: 34'},
  {k:'gender',label:'성별',type:'chip1',opts:['남','여']},
  {k:'insurance',label:'의료보장',type:'chip1',opts:['건강보험','의료급여 1종','의료급여 2종','기타']},
  {k:'mDisability',label:'정신장애 등급',type:'chip1',opts:['중증','경증','해당없음']},
  {k:'oDisability',label:'기타장애',type:'text'},
  {k:'body',label:'신장 / 체중',type:'text',ph:'예: 170cm / 65kg'},
  {k:'phone',label:'전화번호',type:'text'},
  {k:'address',label:'주소',type:'text',w2:1},
  {k:'edu',label:'학력',type:'text'},
  {k:'marriage',label:'결혼',type:'chip1',opts:['미혼','기혼','이혼','사별','기타']},
  {k:'religion',label:'종교',type:'text'},
  {k:'military',label:'군대력',type:'chip1',opts:['미필','군필','면제','해당없음']},
  {k:'housing',label:'주거형태',type:'chip1',opts:['자가','전세','월세','임대']},
  {k:'famType',label:'가족형태',type:'chip1',opts:['독거','부부','기타']},
  {k:'onsetYear',label:'발병연도',type:'text',tip:'history'},
  {k:'onsetAge',label:'발병나이',type:'text'},
  {k:'famHist',label:'가족력',type:'chipN',opts:['배우자','자녀','부모','조부모','형제/자매','기타','없음'],tip:'famAssess',w2:1},
  {k:'diagnosis',label:'진단력',type:'text'},
  {k:'treatment',label:'치료력',type:'text'},
  {k:'admission',label:'입원력',type:'text'},
  {k:'physical',label:'신체질환',type:'chipN',opts:['고혈압','당뇨','기타','없음']},
  {k:'suiAge',label:'자살시도 나이',type:'text',tip:'suicide'},
  {k:'suiMethod',label:'시도방법',type:'chipN',opts:['음독','질식','추락','흉기','화상','운수사고','기타','미상'],danger:1},
  {k:'probType',label:'문제유형',type:'chipN',opts:['경제적 문제','이성문제','신체/정신적 문제','직장 문제','외로움/고독','가정불화','학교성적/진로','친구/동료문제','기타'],w2:1},
  {k:'job',label:'현 직업',type:'text'},
  {k:'jobHist',label:'직업력',type:'text'},
  {k:'referral',label:'센터를 알게 된 동기',type:'textarea',w2:1},
  {k:'genogram',label:'가계도 메모',type:'textarea',tip:'famAssess',ph:'주요 가족관계 메모 (가계도 앱과 연동)',w2:1},
];

const S2 = [
  {g:'영유아기',age:'0~3세',tip:'develop',items:[
    {k:'pregnancy',label:'임신',type:'chip1',opts:['wanted','unwanted','기타']},
    {k:'birth',label:'출생 시 상태',type:'chip1',opts:['자연분만(순산)','자연분만(난산)','제왕절개','기타']},
    {k:'growth',label:'발육 상태',type:'chip1',opts:['정상발달','발육이상']},
    {k:'caregiver',label:'주양육자',type:'chip1',opts:['부','모','(외)조부모','기타']},
  ]},
  {g:'아동기',age:'3~11세',items:[
    {k:'discipline',label:'훈육 방식',type:'chip1',opts:['지지적','엄격함','무관심']},
    {k:'cStudy',label:'학습 태도',type:'chip1',opts:['근면','보통','열등','기타']},
    {k:'cRelation',label:'대인 관계',type:'chip1',opts:['주도적','적응적','회피적','기타']},
    {k:'cEtc',label:'기타',type:'text'},
  ]},
  {g:'청소년기',age:'11~19세',items:[
    {k:'tStudy',label:'학습 태도',type:'chip1',opts:['근면','보통','열등','기타']},
    {k:'tRelation',label:'대인 관계',type:'chip1',opts:['주도적','적응적','회피적','기타']},
    {k:'tIssues',label:'특이사항',type:'chipN',opts:['전학','가출','음주','흡연','이성문제','폭력','써클활동','기타','없음']},
    {k:'tEtc',label:'기타',type:'text'},
  ]},
  {g:'성인기',age:'19세 이상',items:[
    {k:'aRelation',label:'대인 관계',type:'chip1',opts:['주도적','적응적','회피적','기타']},
    {k:'dating',label:'이성 교제',type:'chip1',opts:['없음','있음']},
    {k:'aDetail',label:'상세내용',type:'textarea'},
  ]},
];

const INSIGHT = [
  {n:'Ⅰ',d:'질병의 전적인 부정'},
  {n:'Ⅱ',d:'병들었으나 도움이 필요한 상태라는 인식이 조금 있으며, 동시에 그렇지 않다고 생각함 (부정)'},
  {n:'Ⅲ',d:'병들었음을 인정하나 그 원인이 기질적·외적 요인 혹은 타인에게 있다고 함'},
  {n:'Ⅳ',d:'병들었으나 그 원인이 자신 속의 알 수 없는 무엇 때문이라고 여김'},
  {n:'Ⅴ',d:'지적 통찰 — 병들었음을 인정하고 증상·적응실패가 자신의 비합리적 정서와 심리적 장애 때문임을 알지만, 이해나 지식이 행동화되지 않음'},
  {n:'Ⅵ',d:'진실된 감정적 통찰 — 자신과 중요 인물들의 동기·느낌을 잘 알고, 그 앎이 행동으로 옮겨져 근본적인 행동 변화가 일어남'},
];

const S3 = [
  {g:'1. 외관 · 2. 태도 · 3. 행동',items:[
    {k:'appearance',label:'1. 외관 (관찰 기록)',type:'textarea',tip:'appearance',ph:'전반적 인상, 위생상태, 나이에 맞는 외양 여부 등'},
    {k:'attitude',label:'2. 태도',type:'chipN',tip:'attitude',opts:['협조적','순종적','방어적','회피','경청','조심스러운','무관심','적대적인','장난스러운','빈정대는']},
    {k:'behavior',label:'3. 행동',type:'chipN',tip:'behavior',opts:['상동증','매너리즘','과활동','긴장증','거부증','동작모방','지체','활동저조','강박행위','틱','안절부절못함','자동증','보속증','특이사항 없음']},
  ]},
  {g:'4. 언어',tip:'speech',items:[
    {k:'spSpont',label:'(1) 자발성',type:'chip1',opts:['자발적','비자발적']},
    {k:'spProd',label:'(2) 언어생산성',type:'chip1',opts:['정상','증가','감소','언어빈곤','압박']},
    {k:'spSpeed',label:'(3) 속도',type:'chip1',opts:['정상','빠른','느린']},
    {k:'spPitch',label:'(4) 음의 고저',type:'chip1',opts:['정상','높음','낮음']},
    {k:'spTone',label:'(5) 톤 (Tone)',type:'chip1',opts:['정상','큰','속삭임','단조로운','중얼거림']},
    {k:'spDisorder',label:'(6) 언어장애',type:'chipN',opts:['구음장애','속화증','실어증','말더듬','반향언어증','없음']},
  ]},
  {g:'5. 기분 · 6. 지각',items:[
    {k:'mood',label:'(1) 기분 (mood)',type:'chipN',tip:'mood',opts:['걱정하는','우울한','의기양양','절망적인','화','다행감','황홀감','불쾌감','슬픔','긴장한','안정']},
    {k:'affectFit',label:'(2) 정서 (affect) 적절성',type:'chip1',tip:'affect',opts:['적절한','부적절한']},
    {k:'affect',label:'정서 특성',type:'chipN',opts:['둔마·무딘','무미건조','불안정','제한적인','두려운','초조','해당없음']},
    {k:'perception',label:'6. 지각 (환각)',type:'chipN',tip:'perception',opts:['환시','환청','환후','환촉','환미','없음'],danger:1},
  ]},
  {g:'7. 사고',tip:'thought',items:[
    {k:'thFit',label:'(1) 사고형태 및 과정 — 적절성',type:'chip1',opts:['적절한','부적절한']},
    {k:'thProcess',label:'사고과정',type:'chipN',opts:['논리적','비논리적','연상이완','사고비약','내용의 일관성','지리멸렬','사고차단','사고지연','우회적인','사고의 이탈']},
    {k:'thContent',label:'(2) 사고내용 이상',type:'chip1',opts:['유','무']},
    {k:'thContentList',label:'사고내용 (해당 항목)',type:'chipN',opts:['자폐적','양가적','마술적','강박','건강염려증','공포증','관계사고','피해','과대','애정/색정'],cond:['thContent','유']},
    {k:'delusion',label:'망상',type:'chip1',opts:['유','무'],danger:1},
    {k:'harmThought',label:'자타해사고',type:'chip1',opts:['유','무'],danger:1,risk:1},
  ]},
  {g:'8. 인지',tip:'cognition',special:'cognition'},
  {g:'9. 판단력 · 10. 병식',items:[
    {k:'judgment',label:'9. 판단력',type:'textarea',tip:'judgment',ph:'예: 신분증 분실 시 대처 질문에 대한 응답 기록'},
    {k:'insight',label:'10. 병식',type:'insight',tip:'insight'},
  ]},
];

const SERIAL7 = [93,86,79,72,65];
/* ================================================================
   일반상담(GS) 서식 — MHIS 서식에서 실무 핵심만 추림
   제외한 것: 접수번호(자동), 이동/의료기관 확보시간, 대상자 인적사항(케이스에 있음),
              상담자(로그인 계정), 정보제공자 상세(내부/외부 세부), 회원등록 관련
   추가한 것: 조치는 첨부 서식이 1·2순위 중복이라 다중선택 1개로 통합
================================================================ */
const GS = [
  {g:'상담 정보', items:[
    {k:'date',    label:'상담일시',   type:'date'},
    {k:'time',    label:'소요시간(분)', type:'text', ph:'예: 60'},
    {k:'urgency', label:'응급성',     type:'chip1', opts:['비응급','응급']},
    {k:'informant', label:'정보제공자', type:'text', ph:'본인, 모, 배우자 등'},
  ]},
  {g:'상담 유형', items:[
    {k:'history', label:'상담이력', type:'chip1', opts:['최초상담','재상담']},
    {k:'method',  label:'상담유형(방법)', type:'chip1', opts:['방문','내소','전화','현장','기타']},
    {k:'kind',    label:'상담구분', type:'chip1', opts:['일반상담','위기상담','자살상담','기타']},
    {k:'route',   label:'정보취득경로', type:'chip1', opts:['행정기관','의료기관','본인','가족','기타']},
    {k:'referral', label:'의뢰경로', type:'text', ph:'예: 행정기관 - 행정복지센터'},
  ]},
  {g:'문제 및 진단', items:[
    {k:'probType', label:'문제종류', type:'chipN',
      opts:['자살상담','정신건강','알코올·약물','정서·행동','가족문제','경제문제','외로움·고독','기타'], w2:1},
    {k:'mhIssue', label:'정신건강문제 분류', type:'chipN',
      opts:['우울','불안','조현','조울','알코올','치매','기타 우울증','해당없음'], w2:1},
  ]},
  {g:'내용', items:[
    {k:'content', label:'상담내용', type:'textarea', ph:'주호소, 증상, 배경 등', w2:1},
    {k:'result',  label:'상담결과', type:'textarea', ph:'현재 상태 파악, 향후 계획 등', w2:1},
  ]},
  {g:'조치', items:[
    {k:'action', label:'주요 조치 (복수선택)', type:'chipN',
      opts:['지속상담','치료연계','경찰·119 의뢰','서비스 연계','정보제공','응급출동','기타조치'], w2:1},
    {k:'endType', label:'조치·종결형태', type:'chip1',
      opts:['지속상담','종결','타 기관 이관','대상자 거부','연락두절','기타']},
    {k:'nextPlan', label:'다음 조치', type:'textarea', ph:'다음 상담 일정, 연계 계획 등', w2:1},
  ]},
];

/* ================================================================
   개별상담(IS) 자유양식 — 최소 필드
================================================================ */
const IS = [
  {g:'개별상담', items:[
    {k:'date',    label:'상담일시', type:'date'},
    {k:'title',   label:'제목',     type:'text', ph:'예: 3회차 - 직장 스트레스'},
    {k:'content', label:'내용',     type:'textarea', ph:'상담 내용을 자유롭게 기록', w2:1},
  ]},
];
