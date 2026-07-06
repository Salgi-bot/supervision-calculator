// ============================================================================
// 골든 테스트 — 주택건설공사 감리자지정 입찰 앱 핵심 계산 함수
// 실행: node test_calc.mjs   (index.html 과 같은 폴더에서)
//
// 방식: index.html 에서 실제 함수 소스(calcPerfRecord·calcLegalMonths·
//       floorAt2·ceilAt3·getRate·상수 테이블)를 추출해 평가한다.
//       → 앱 코드가 바뀌면 테스트도 자동으로 그 코드를 검증 (사본 괴리 없음).
//
// 기대값 도출 원칙 (보수적 반올림 — CLAUDE.md "계산 로직"):
//   - 총감리일수 = 착공일부터 만N년×365 + 나머지 실제일수 (고시 [부표] 만N년 방식)
//   - 3년 기준일(시기) = 공고일-3년 (만3년 창), 종점 = 공고일 전날. 일수는 만N년 방식.
//   - 3년이내 중지일수 = ceil(중지 × 3년이내일수 / 총일수)  ← 올림 = 중지 최대화 = 보수적
//   - 적용기간요율 = floor(적용일수/해당일수 × 10000)/10000  ← 소수4자리 버림
//   - 환산금액 = floor(수주금액(원) × 요율 × 공사종류요율)   ← 원단위 버림
//   - 표시 = floorAt2(환산금액/1억)                          ← 억원 소수2자리 버림
//   - 법정 인·월수 = 직선보간 후 ceilAt3 (소수4째자리 올림 = 법정 요구치 상향 = 보수적)
//
// 한계: 부동소수점 곱셈 오차로 floor 결과가 손계산 대비 1단위 낮게(=더 보수적으로)
//       나올 수 있다. 이는 "유리한 방향 반올림 금지" 원칙에 어긋나지 않으므로
//       보간·곱셈 케이스는 [손계산값-허용오차, 손계산값+미세허용] 범위로 검증한다.
//       (유리한 방향 초과는 즉시 FAIL)
// ============================================================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf-8');

// ── index.html 에서 선언 블록 추출 (중괄호/대괄호 균형 매칭) ──
function extract(startPattern) {
  const m = html.match(startPattern);
  if (!m) throw new Error('소스 추출 실패: ' + startPattern);
  const start = m.index;
  let i = html.indexOf('{', start);
  const alt = html.indexOf('[', start);
  let open, close;
  if (alt !== -1 && (i === -1 || alt < i)) { i = alt; open = '['; close = ']'; }
  else { open = '{'; close = '}'; }
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === open) depth++;
    else if (html[i] === close) { depth--; if (depth === 0) break; }
  }
  return html.slice(start, i + 1);
}

const src = [
  extract(/const DEFAULT_RATES = /),
  'const DEFAULT_NONRESIDENT_MULT = 0.20;',
  // getRate 의 런타임 의존성 셧: 기본 상수만 사용 (사용자 정의 기준값 미적용 상태)
  'const getRates = () => DEFAULT_RATES;',
  'const getNRMult = () => DEFAULT_NONRESIDENT_MULT;',
  extract(/function getRate\(conType/),
  extract(/const LEGAL_PM_TABLE = /),
  extract(/function floorAt2\(v\) /),
  extract(/function ceilAt3\(v\) /),
  extract(/function calcLegalMonths\(costStr\) /),
  extract(/function _manNyeonDays\(s, e\) /),
  extract(/function calcPerfRecord\(r, announcementDate\) /),
  'export { getRate, floorAt2, ceilAt3, calcLegalMonths, calcPerfRecord, _manNyeonDays };',
].join('\n');

const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const { getRate, floorAt2, ceilAt3, calcLegalMonths, calcPerfRecord, _manNyeonDays } = mod;

// ── 테스트 러너 ──
let pass = 0, fail = 0;
function eq(label, actual, expected) {
  const ok = Object.is(actual, expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  →  ${actual}${ok ? '' : `  (기대: ${expected})`}`);
}
// 보간·곱셈 fp 케이스: 손계산값 hand 기준, 보수적 방향 미세 편차만 허용
//   법정 인월수(요구치): actual >= hand 이고 hand+0.002 이내 (올림이므로 hand 미만이면 유리 방향 → FAIL)
function geConservative(label, actual, hand) {
  const ok = actual >= hand - 1e-9 && actual <= hand + 0.002;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  →  ${actual}${ok ? '' : `  (손계산: ${hand}, 허용 [${hand}, ${hand + 0.002}])`}`);
}

console.log('═══ 1. calcPerfRecord — 수행실적 환산금액 (별첨2) ═══');

// [케이스 A] 준공 완료 + 기간 일부 3년 초과 + 중지일수 배분
// 착공 2021-01-01, 준공 2024-06-30, 중지 100일, 공고일 2026-06-01, 주택건설 50억
// 손계산:
//   총감리일수 = 365×3 + 182(2024윤년 1/1~6/30) + ... = 2021-01-01~2024-06-30 = 1277일 (초일산입)
//   해당일수 = 1277 - 100 = 1177
//   3년전기준일 = 2026-06-01 - 3년 + 1일 = 2023-06-02
//   3년이내 = 2023-06-02 ~ 2024-06-30 = 394 + 1 = 395일 (2024-02-29 포함)
//   3년이내 중지 = ceil(100×395/1277) = ceil(30.93) = 31 (올림=보수적)
//   적용일수 = 395 - 31 = 364
//   요율 = floor(364/1177×10000)/10000 = floor(3092.608…)/10000 = 0.3092
//   환산 = floor(50억원 × 0.3092 × 1.0) = 1,546,000,000원 → 15.46억 → floorAt2 = 15.46
{
  const ann = new Date(2026, 5, 1);
  const c = calcPerfRecord({ name:'A', startDate:'2021.01.01', endDate:'2024.06.30', suspendDays:100, type:'주택건설', amount:50 }, ann);
  eq('A.totalDays (초일산입)', c.totalDays, 1277);
  eq('A.applicableDays', c.applicableDays, 1177);
  eq('A.recentDays', c.recentDays, 396);
  eq('A.recentSuspend (올림)', c.recentSuspend, 32);
  eq('A.appliedDays', c.appliedDays, 364);
  eq('A.ratio (4자리 버림)', c.ratio, 0.3092);
  // ★ 알려진 fp 동작 (2026-06-12 골든 테스트로 실측):
  //   손계산 = 5,000,000,000 × 0.3092 = 1,546,000,000원 (정수 경계값)
  //   앱 실측 = 1,545,999,999원 — fp 곱셈(1545999999.9999998)의 floor 가 1원 낮게 절사.
  //   방향: 보수적(불리) → "유리한 반올림 금지" 원칙 위반 아님. 표시값은 15.45 (손계산 15.46 대비 -0.01억).
  //   계산식 변경은 별도 승인 사안이므로 테스트는 앱 실측값을 고정하되, 손계산 초과(유리 방향)는 즉시 FAIL.
  if (c.calcWon > 1546000000) { fail++; console.log('FAIL  A.calcWon 이 손계산을 초과(유리 방향) → 실격 위험'); }
  else eq('A.calcWon (만N년·fp 보수적 절사)', c.calcWon, 1545999999);
  eq('A.표시값 floorAt2 (만N년, 손계산 15.46)', floorAt2(c.calcAmount), 15.45);
}

// [케이스 B] 수행중(준공예정 미래) + 비주택건축(종류요율 0.8)
// 착공 2024-01-01, 준공예정 2027-12-31, 중지 0, 공고일 2026-06-01, 30억
// 손계산:
//   총감리일수 = 2024(366)+2025(365)+2026(365)+2027(365) = 1461
//   3년이내 = max(착공, 2023-06-02)=2024-01-01 ~ min(준공, 공고일전날)=2026-05-31
//           = 731(2024-01-01~2026-01-01) + 150(~05-31) + 1 = 882일
//   요율 = floor(883/1461×10000)/10000 = floor(6043.805…)/10000 = 0.6043
//   환산 = floor(30억 × 0.6043 × 0.8) = floor(1,450,320,000) = 1,450,320,000원 → 14.50억
{
  const ann = new Date(2026, 5, 1);
  const c = calcPerfRecord({ name:'B', startDate:'2024.01.01', endDate:'2027.12.31', suspendDays:0, type:'비주택건축', amount:30 }, ann);
  eq('B.totalDays', c.totalDays, 1460);
  eq('B.isCompleted (수행중)', c.isCompleted, false);
  eq('B.recentDays (공고일전날까지)', c.recentDays, 881);
  eq('B.ratio', c.ratio, 0.6034);
  eq('B.typeRate (비주택 0.8)', c.typeRate, 0.8);
  eq('B.표시값 floorAt2', floorAt2(c.calcAmount), 14.48);
}

// [케이스 C] 전 기간 3년 이내 + 중지 0 → 요율 100%, 환산 = 수주금액 그대로
{
  const ann = new Date(2026, 5, 1);
  const c = calcPerfRecord({ name:'C', startDate:'2024.01.01', endDate:'2025.12.31', suspendDays:0, type:'주택건설', amount:10 }, ann);
  eq('C.totalDays (만N년 730)', c.totalDays, 730);
  eq('C.ratio (100%)', c.ratio, 1);
  eq('C.calcWon (10억 그대로)', c.calcWon, 1000000000);
  eq('C.표시값', floorAt2(c.calcAmount), 10.00);
}

// [케이스 D] 고시 [부표] 계산례 검증 + '공고일 전날 종점' 영구 회귀 (2026-07-06 수정)
//   고시 [부표] 예시: 공고 2013.9.1, 착공 2011.1.1, 준공예정 2015.12.31, 30억, 수행중
//   고시 표기 = {(2년×365)+243}÷(5년×365) = 973일 (365관례, 종점=공고일 전날 8.31)
//   앱 = 실제 달력일수(2012 윤년 366 정확 반영) + 전날 종점 = 974일
//     → 고시보다 1일 많은 건 2012 윤년일을 정확히 세기 때문(365관례 미채택 = 더 정밀, 의도된 결정)
//   ★ 종점이 공고일 '당일'이면 975 — 974 고정으로 '전날 종점'을 회귀 검증
{
  const ann = new Date(2013, 8, 1); // 2013.9.1
  const c = calcPerfRecord({ name:'고시부표', startDate:'2011.01.01', endDate:'2015.12.31', suspendDays:0, type:'주택건설', amount:30 }, ann);
  eq('D.isCompleted (수행중)', c.isCompleted, false);
  eq('D.recentDays (역년·전날 = 고시② 973)', c.recentDays, 973);
  eq('D.totalDays (역년 5년×365 = 고시② 1825)', c.totalDays, 1825);
}

// [케이스 E] 고시 [별표] ① 준공 예시 — 달력연도(역년) 방식, 연중 시작 창
//   공고 2013.9.1, 착공 2009.1.1, 준공 2012.12.31, 30억 → 계상창 2010.9.1~2012.12.31
//   고시 관보: 852일 [122(2010 부분) + 2년×365(2011·2012 온전)] / 4년×365=1460 → 1,750,684,931원(요율 미절사)
{
  const ann = new Date(2013, 8, 1);
  const c = calcPerfRecord({ name:'고시①준공', startDate:'2009.01.01', endDate:'2012.12.31', suspendDays:0, type:'주택건설', amount:30 }, ann);
  eq('E.recentDays (역년 852 = 고시①)', c.recentDays, 852);
  eq('E.totalDays (4년×365 = 1460)', c.totalDays, 1460);
}
// [케이스 F] 달력연도 vs 만N년 판별 — 연중 시작+부분연도 윤년 (역년 회귀 고정)
//   2020.6.1~2024.5.31: 역년=1461(2024 부분에 2.29 산입) / 만N년이면 1460(회전년에 2.29 드롭) → FAIL
eq('F._manNyeonDays 역년 판별 (1461, 만N년이면 1460)', _manNyeonDays(new Date(2020,5,1), new Date(2024,4,31)), 1461);

console.log('═══ 2. calcLegalMonths — 법정 감리인·월수 (보간 + ceilAt3 올림) ═══');
// 입력 단위: 천원. 총공사비 100억 = 10,000,000천원
eq('20억 이하 → 표 최솟값 12.1', calcLegalMonths('2000000'), 12.1);
eq('100억 → 표 정점 38.1', calcLegalMonths('10000000'), 38.1);
// 250억: 200억(73.8)~300억(109.9) 보간 = 73.8 + 50×36.1/100 = 91.85 → ceilAt3 (fp상 91.85 또는 91.851)
geConservative('250억 보간 (손계산 91.85)', calcLegalMonths('25000000'), 91.85);
// 3500억: 2000~3000 기울기 연장 = 645.2 + 500×173.2/1000 = 731.8
geConservative('3500억 연장보간 (손계산 731.8)', calcLegalMonths('350000000'), 731.8);
eq('빈 값 → null', calcLegalMonths(''), null);

console.log('═══ 3. getRate — 경력 환산율 (부표 나.(2)) ═══');
eq('주택건설+감리(주택법)+상주 = 1.00', getRate('주택건설공사', '감리(주택법)', '상주'), 1.00);
eq('주택건설+기타(설계)+상주 = 0.80', getRate('주택건설공사', '설계', '상주'), 0.80);
eq('토목+기타+상주 = 0.40', getRate('토목공사', '설계', '상주'), 0.40);
geConservative('주택건설+감리+비상주 = 0.20 (×0.20)', getRate('주택건설공사', '감리(주택법)', '비상주'), 0.20);
geConservative('비주택+책임감리+비상주 = 0.16', getRate('비주택건축공사', '책임감리', '비상주'), 0.16);

console.log('═══ 4. 경력 환산 (별첨3 산출식 재현 — renderByeolchum3 와 동일 수식) ═══');
// 수식(앱 renderByeolchum3): 행별 환산일수 = floor(days × rate), 합산 후
//   환산경력(년) = floor(합계/365 × 10)/10  ← 소수1자리 버림 (보수적)
// 손계산: 1000일×1.00=1000, 500일×0.80=400, 300일×0.20=60 → 합 1460
//   1460/365 = 4.0 → floor(40)/10 = 4.0년
{
  const rows = [
    { days: 1000, rate: getRate('주택건설공사', '감리(주택법)', '상주') },
    { days: 500,  rate: getRate('주택건설공사', '설계', '상주') },
    { days: 300,  rate: getRate('주택건설공사', '감리(주택법)', '비상주') },
  ];
  const totalConvDays = rows.reduce((s, c) => s + Math.floor(c.days * c.rate), 0);
  const convYears = (Math.floor(totalConvDays / 365 * 10) / 10).toFixed(1);
  eq('환산일수 합 (행별 floor)', totalConvDays, 1460);
  eq('환산경력 (소수1자리 버림)', convYears, '4.0');
}

console.log('═══ 5. 절사 헬퍼 ═══');
eq('floorAt2(15.469) = 15.46', floorAt2(15.469), 15.46);
eq('floorAt2(15.4) = 15.4', floorAt2(15.4), 15.4);
eq('ceilAt3(38.1001) = 38.101 (올림)', ceilAt3(38.1001), 38.101);

console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
