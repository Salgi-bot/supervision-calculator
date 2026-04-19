/* 주택건설공사 감리자 입찰 분석기 · v0.1 · EYEPOP Engineering */

let DATA = null;
let COMPANY = null;       // P1: 업체 랭킹
let COMPETITOR = null;    // P2: 구간별 1위 빈도
let chartPass = null;
let chartSajeong = null;

// P1 상태: 현재 필터/정렬/페이지
let rankingState = {
  filter: 'all',
  sortKey: '낙찰건수',
  sortAsc: false,
  showAll: false,  // false=Top10, true=Top30
};

// ============================================================
// 데이터 로드 (embed-first, fetch fallback)
// ============================================================
async function loadData() {
  if (typeof DATA_EMBED !== 'undefined') {
    DATA = DATA_EMBED;
  } else {
    const resp = await fetch('data.json');
    DATA = await resp.json();
  }
  // P1: 업체 랭킹
  if (typeof COMPANY_EMBED !== 'undefined') {
    COMPANY = COMPANY_EMBED;
  } else {
    try {
      const r = await fetch('company-analysis.json');
      COMPANY = await r.json();
    } catch (e) { console.warn('company 데이터 없음', e); }
  }
  // P2: 경쟁자 인덱스
  if (typeof COMPETITOR_EMBED !== 'undefined') {
    COMPETITOR = COMPETITOR_EMBED;
  } else {
    try {
      const r = await fetch('competitor-index.json');
      COMPETITOR = await r.json();
    } catch (e) { console.warn('competitor 데이터 없음', e); }
  }
  console.log('Data loaded:', DATA['메타데이터'], 'Company:', COMPANY?.총_유효건수, 'Competitor:', COMPETITOR?.버킷수);
}

// ============================================================
// 유틸
// ============================================================
function numberFormat(n) { return n.toLocaleString('ko-KR'); }

function randomNormal(mu, sigma) {
  // Box-Muller
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
}

function getBaseQuantile(base) {
  const q = DATA['기초금액_분위_경계'];
  if (base <= q.Q1_max) return 'Q1';
  if (base <= q.Q2_max) return 'Q2';
  if (base <= q.Q3_max) return 'Q3';
  return 'Q4';
}

// ============================================================
// 참여수 예측
// ============================================================
function predictParticipation(tier, region, base) {
  const q = getBaseQuantile(base);
  const key = `T${tier}_${region}_${q}`;
  const fallbackKey = `T${tier}_fallback`;
  const entry = DATA['참여수_예측_테이블'][key] || DATA['참여수_예측_테이블'][fallbackKey];
  return entry;
}

// ============================================================
// Monte Carlo 시뮬
// ============================================================
function monteCarloPass(baseAmount, bid, tier, nSim = 10000) {
  const mu = DATA['사정율_분포']['평균'];
  const sigma = DATA['사정율_분포']['표준편차'];
  const hazard = DATA['하한율'][tier];

  let passCount = 0;
  let tightCount = 0;  // 하한+0.05 이내
  let tchalRatios = [];

  for (let i = 0; i < nSim; i++) {
    const sajeong = randomNormal(mu, sigma);
    const estPrice = baseAmount * sajeong / 100;
    const tchal = bid / estPrice * 100;
    tchalRatios.push(tchal);
    if (tchal >= hazard) {
      passCount++;
      if (tchal <= hazard + 0.05) tightCount++;
    }
  }

  tchalRatios.sort((a, b) => a - b);
  return {
    passRate: passCount / nSim,
    tightRate: tightCount / nSim,
    tchalMean: tchalRatios.reduce((a, b) => a + b, 0) / nSim,
    tchalP5: tchalRatios[Math.floor(nSim * 0.05)],
    tchalP50: tchalRatios[Math.floor(nSim * 0.50)],
    tchalP95: tchalRatios[Math.floor(nSim * 0.95)],
  };
}

// ============================================================
// 1위 확률 추정
// ============================================================
function estimateWinProb(baseAmount, bid, tier, expectedParticipants) {
  const mc = monteCarloPass(baseAmount, bid, tier);
  // P(1위) ≈ P(통과) × P(최저가 | 통과, 경쟁)
  // 경쟁자도 비슷한 전략 시 1/(통과자 수)
  const passAbove = Math.max(1, expectedParticipants * mc.passRate * 0.3);
  const winProb = mc.passRate / passAbove;
  return {
    ...mc,
    winProb: Math.min(winProb, mc.passRate),
  };
}

// ============================================================
// 최적 투찰가 탐색
// ============================================================
function findBestBid(baseAmount, tier, expectedParticipants) {
  const hazard = DATA['하한율'][tier];
  const results = [];

  // 기초 대비 70%~95% 0.05% 단위로 탐색
  // 투찰가는 천원 단위에서 올림 (백원단위 이하 버림 방지)
  for (let rate = 0.700; rate <= 0.950; rate += 0.0005) {
    const rawBid = baseAmount * rate;
    const bid = Math.ceil(rawBid / 1000) * 1000;  // 천원 단위 올림
    const r = estimateWinProb(baseAmount, bid, tier, expectedParticipants);
    results.push({
      bid,
      rawBid,
      bidRate: bid / baseAmount * 100,
      ...r,
    });
  }

  // 전략별 추천
  // 안전(+1σ 가정): 통과율 > 80%, 최대 winProb
  const safe = results.filter(r => r.passRate >= 0.80).sort((a, b) => b.winProb - a.winProb)[0];
  // 균형(평균): 통과율 40~70% 중 최대 winProb
  const balance = results.filter(r => r.passRate >= 0.40 && r.passRate <= 0.70).sort((a, b) => b.winProb - a.winProb)[0];
  // 공격(-0.5σ): 통과율 20~40% 중 최대 winProb
  const aggressive = results.filter(r => r.passRate >= 0.20 && r.passRate < 0.40).sort((a, b) => b.winProb - a.winProb)[0];

  return { results, safe, balance, aggressive };
}

// ============================================================
// 메인 분석 실행
// ============================================================
function cleanName(raw) {
  if (!raw) return '(이름 없음)';
  let s = raw.trim();
  // 외곽 괄호 제거: "(...)", "[...]", "<...>", "{...}"
  s = s.replace(/^\s*[(\[<{]+\s*/, '').replace(/\s*[)\]>}]+\s*$/, '');
  // 중간 괄호는 그대로 (공고 중 일부 괄호 보존 가능)
  // 다만 양쪽 끝에 있는 괄호쌍 한번 더 제거
  s = s.trim().replace(/^\s*[(\[<{]+\s*/, '').replace(/\s*[)\]>}]+\s*$/, '');
  return s.trim() || '(이름 없음)';
}

function analyze() {
  const name = cleanName(document.getElementById('inp-name').value);
  const rawBase = document.getElementById('inp-base').value.replace(/,/g, '');
  const baseAmount = parseInt(rawBase);
  const tier = parseInt(document.getElementById('inp-tier').value);
  const region = document.getElementById('inp-region').value;
  const month = parseInt(document.getElementById('inp-month').value);

  if (!baseAmount || baseAmount < 1e8) {
    alert('기초금액을 입력해주세요 (1억 이상)');
    return;
  }

  // 참여수 예측
  const partInfo = predictParticipation(tier, region, baseAmount);
  const expectedN = partInfo.mean;

  // 최적 투찰가
  const optimal = findBestBid(baseAmount, tier, expectedN);

  // 결과 요약
  const summaryHtml = `
    <div class="result-box highlight">
      <div class="metric"><span class="metric-label">예상 참여수</span>
        <span class="metric-value">${partInfo.median}명 (${partInfo.p25}~${partInfo.p75}명 범위)</span>
      </div>
      <div class="metric"><span class="metric-label">유사 공고 표본</span>
        <span class="metric-value">n=${partInfo.n}건</span>
      </div>
      <div class="metric"><span class="metric-label">수학적 1위 상한</span>
        <span class="metric-value">${(1/expectedN*100).toFixed(2)}%</span>
      </div>
    </div>
    <div class="result-box success">
      <div class="metric"><span class="metric-label">⭐ 균형 전략 (권장)
        <span class="tooltip-icon" data-tip="통과 확률 40-70% 중 1위 확률이 가장 높은 투찰가. 수학적으로 현실적인 최선.">?</span>
      </span></div>
      <div class="metric"><span class="metric-label">투찰가 (클릭하면 복사 📋)</span>
        <span>
          <span class="metric-value large copyable" onclick="copyToClipboard(${optimal.balance.bid})"
                title="클릭하면 숫자만 복사됩니다">${numberFormat(optimal.balance.bid)}원</span>
          <span class="bid-sub">원본: ${numberFormat(Math.round(optimal.balance.rawBid))}원</span>
        </span>
      </div>
      <div class="metric"><span class="metric-label">기초 대비</span>
        <span class="metric-value">${optimal.balance.bidRate.toFixed(3)}%</span>
      </div>
      <div class="metric"><span class="metric-label">통과 확률
        <span class="tooltip-icon" data-tip="사정율 분포에서 무작위로 10,000번 시뮬했을 때, 우리 투찰가가 하한율 이상인 확률. '85점 통과' 가능성.">?</span>
      </span>
        <span class="metric-value">${(optimal.balance.passRate*100).toFixed(1)}%</span>
      </div>
      <div class="metric"><span class="metric-label">추정 1위 확률
        <span class="tooltip-icon" data-tip="통과 × 최저가 조건 동시 만족 확률. 참여자 다수가 비슷한 전략 쓴다 가정. 수학적 상한은 1/참여수.">?</span>
      </span>
        <span class="metric-value">${(optimal.balance.winProb*100).toFixed(2)}%</span>
      </div>
    </div>
  `;
  document.getElementById('result-summary').innerHTML = summaryHtml;

  // 시나리오 표
  let tableHtml = `
    <table>
      <thead>
        <tr><th>전략</th><th>투찰가</th><th>기초%</th><th>통과율</th><th>1위율</th><th>투찰율p5~p95</th></tr>
      </thead>
      <tbody>
  `;
  [['초안전', 0.95], ['안전', 0.85], ['균형', 0.55], ['공격', 0.35]].forEach(([nm, target]) => {
    let s = optimal.results.reduce((best, r) =>
      Math.abs(r.passRate - target) < Math.abs(best.passRate - target) ? r : best
    );
    tableHtml += `
      <tr ${nm === '균형' ? 'class="recommended"' : ''}>
        <td>${nm}</td>
        <td class="copyable" onclick="copyToClipboard(${s.bid})" title="클릭하면 복사">${numberFormat(s.bid)} 📋</td>
        <td>${s.bidRate.toFixed(2)}</td>
        <td>${(s.passRate*100).toFixed(1)}%</td>
        <td>${(s.winProb*100).toFixed(2)}%</td>
        <td>${s.tchalP5.toFixed(2)}~${s.tchalP95.toFixed(2)}</td>
      </tr>
    `;
  });
  tableHtml += `</tbody></table>
    <div class="notes">
      📌 <b>균형 전략</b>이 기본 권장. 경쟁 약할 예상 시 공격, 확실 통과 우선 시 안전.<br>
      📌 통과율이 너무 높으면 (95%+) 가격점수 감점으로 2위 이하 밀림.
    </div>
  `;
  document.getElementById('scenario-table').innerHTML = tableHtml;

  // 차트
  drawPassChart(optimal.results);
  drawSajeongChart(baseAmount);

  // P2: 예상 경쟁업체 Top 5
  renderExpectedCompetitors(tier, region, baseAmount);

  // ★ 정면돌파 슈퍼 예측
  renderSuperPrediction({ tier, region, base: baseAmount, month, year: new Date().getFullYear(), participants: expectedN });
  renderTopFormulas({ tier, region, base: baseAmount, month, year: new Date().getFullYear(), participants: expectedN });
  renderBacktest();
  // 게임이론 기반 최적 좌표 · 경쟁사 분포
  renderOptimalBid({ tier, region, base: baseAmount });
  renderCompetitorDistribution();

  // 로그 저장
  saveLog({
    timestamp: new Date().toISOString(),
    name, baseAmount, tier, region, month,
    recommended: {
      예상참여수: partInfo.median,
      투찰가: optimal.balance.bid,
      기초대비: optimal.balance.bidRate,
      통과율: optimal.balance.passRate,
      추정1위율: optimal.balance.winProb,
    },
  });
}

// ============================================================
// 차트 - 통과율
// ============================================================
function drawPassChart(results) {
  const ctx = document.getElementById('chart-pass').getContext('2d');
  if (chartPass) chartPass.destroy();
  const labels = results.map(r => r.bidRate.toFixed(2));
  chartPass = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '통과 확률', data: results.map(r => r.passRate * 100), borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.2, pointRadius: 0 },
        { label: '추정 1위 확률 ×20', data: results.map(r => r.winProb * 100 * 20), borderColor: '#0f9d58', fill: false, tension: 0.2, pointRadius: 0 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { title: { display: true, text: '투찰가 (기초 대비 %)' } },
        y: { title: { display: true, text: '확률 (%)' }, min: 0, max: 100 }
      }
    }
  });
}

// ============================================================
// 차트 - 사정율 분포
// ============================================================
function drawSajeongChart(baseAmount) {
  const ctx = document.getElementById('chart-sajeong').getContext('2d');
  if (chartSajeong) chartSajeong.destroy();
  const mu = DATA['사정율_분포']['평균'];
  const sigma = DATA['사정율_분포']['표준편차'];

  // Normal PDF
  const xs = [];
  const ys = [];
  for (let s = mu - 3*sigma; s <= mu + 3*sigma; s += 0.05) {
    xs.push(s.toFixed(2));
    const pdf = 1/(sigma * Math.sqrt(2*Math.PI)) * Math.exp(-0.5 * ((s-mu)/sigma)**2);
    ys.push(pdf);
  }

  chartSajeong = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xs,
      datasets: [{
        label: '사정율 확률밀도',
        data: ys,
        borderColor: '#d93025',
        backgroundColor: 'rgba(217,48,37,0.15)',
        fill: true, tension: 0.3, pointRadius: 0,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const s = parseFloat(xs[ctx.dataIndex]);
              const estPrice = baseAmount * s / 100;
              return `예정가 추정: ${numberFormat(Math.round(estPrice))}원`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: '사정율 (%)' } },
        y: { title: { display: true, text: '확률 밀도' } }
      }
    }
  });
}

// ============================================================
// 클립보드 복사
// ============================================================
function copyToClipboard(text) {
  navigator.clipboard.writeText(String(text)).then(() => {
    showToast(`복사됨: ${numberFormat(text)}`);
  }).catch(err => {
    // 폴백
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`복사됨: ${numberFormat(text)}`);
  });
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#202124;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;z-index:9999;opacity:0;transition:opacity 0.2s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 1800);
}

// ============================================================
// 예측 로그 (LocalStorage)
// ============================================================
function saveLog(entry) {
  const logs = JSON.parse(localStorage.getItem('bid_logs') || '[]');
  entry.id = entry.timestamp;
  logs.unshift(entry);
  if (logs.length > 500) logs.splice(500);
  localStorage.setItem('bid_logs', JSON.stringify(logs));
  renderLogs();
}

function updateLogResult(id, 낙찰가, 예정가, 투찰율실측, 업체명) {
  const logs = JSON.parse(localStorage.getItem('bid_logs') || '[]');
  const idx = logs.findIndex(l => l.id === id);
  if (idx < 0) return;
  const log = logs[idx];
  const rec = log.recommended || log.t1 || log.t2;
  const tier = log.tier || 1;
  const myBid = rec.투찰가;
  const hazard = DATA['하한율'][tier];
  const myTchalRatio = myBid / 예정가 * 100;
  const isWin = myBid < 낙찰가 && myTchalRatio >= hazard;

  log.result = {
    낙찰가, 예정가, 투찰율실측,
    '1위_업체': 업체명,
    실측_사정율: 예정가 / log.baseAmount * 100,
    결과_입력일: new Date().toISOString(),
    아이팝_1위_여부: isWin,
    예측_vs_실측: {
      예측투찰율: myTchalRatio,
      실측투찰율: 투찰율실측,
      오차: myTchalRatio - 투찰율실측,
      차액_원: myBid - 낙찰가,
    },
  };
  localStorage.setItem('bid_logs', JSON.stringify(logs));
  renderLogs();
  renderStats();
}

function deleteLog(id) {
  if (!confirm('이 기록을 삭제할까요?')) return;
  const logs = JSON.parse(localStorage.getItem('bid_logs') || '[]');
  const filtered = logs.filter(l => l.id !== id);
  localStorage.setItem('bid_logs', JSON.stringify(filtered));
  renderLogs();
  renderStats();
}

function promptResult(id) {
  const logs = JSON.parse(localStorage.getItem('bid_logs') || '[]');
  const log = logs.find(l => l.id === id);
  if (!log) return;
  const 낙찰가 = prompt('1위 낙찰가 (원):', log.result?.낙찰가 || '');
  if (!낙찰가) return;
  const 예정가 = prompt('예정가격 (원):', log.result?.예정가 || '');
  if (!예정가) return;
  const 투찰율 = prompt('1위 투찰율 (%, 소수점 3자리):', log.result?.투찰율실측 || '');
  if (!투찰율) return;
  const 업체 = prompt('1위 업체명:', log.result?.['1위_업체'] || '');
  updateLogResult(id, parseInt(낙찰가), parseInt(예정가), parseFloat(투찰율), 업체 || '');
}

function renderSingleLog(log) {
  const hasResult = !!log.result;
  const outcomeColor = hasResult ? (log.result.아이팝_1위_여부 ? 'success' : 'warning') : 'highlight';
  // 신버전 (recommended) 기준, 구버전도 호환
  const rec = log.recommended || log.t1 || log.t2;
  if (!rec) return '';

  let resultHtml = '';
  if (hasResult) {
    const r = log.result;
    const diff = r.낙찰가 ? (rec.투찰가 - r.낙찰가) : null;
    resultHtml = `
      <div style="margin-top:4px; padding-top:4px; border-top:1px dashed #ccc; font-size:11px;">
        ✅ 1위 ${numberFormat(r.낙찰가)}원 (${r.투찰율실측}%)
        ${r['1위_업체'] ? ` · <b>${r['1위_업체']}</b>` : ''}
        <br>&nbsp;&nbsp;사정율 ${r.실측_사정율.toFixed(3)}%
        · ${r.아이팝_1위_여부 ? '<b style="color:#0f9d58">🏆 1위</b>' : '2위 이하'}
        ${diff !== null ? ` · 차액 ${diff > 0 ? '+' : ''}${numberFormat(diff)}원` : ''}
      </div>
    `;
  } else {
    resultHtml = '<div style="color:#888;font-size:10px">⏳ 개찰 대기</div>';
  }

  return `
    <div class="log-entry ${outcomeColor}">
      <div><b>${log.name}</b>
        <span style="float:right">
          <button class="mini" onclick="promptResult('${log.id}')">${hasResult ? '✏️' : '📝'}</button>
          <button class="mini" onclick="deleteLog('${log.id}')">🗑</button>
        </span>
      </div>
      <div style="font-size:10px;color:#888">${log.timestamp.slice(0, 16).replace('T', ' ')}</div>
      <div>기초 ${numberFormat(log.baseAmount)}원 · ${log.region}</div>
      <div>→ 예측 ${numberFormat(rec.투찰가)}원 · 통과 ${(rec.통과율*100).toFixed(1)}% · 1위 ${(rec.추정1위율*100).toFixed(2)}%</div>
      ${resultHtml}
    </div>
  `;
}

function groupLogsByYearMonth(logs) {
  // { "2026": { "2026-04": [...], "2026-03": [...] }, "2025": { ... } }
  const byYear = {};
  logs.forEach(log => {
    const ym = log.timestamp.slice(0, 7);  // "2026-04"
    const y = ym.slice(0, 4);
    if (!byYear[y]) byYear[y] = {};
    if (!byYear[y][ym]) byYear[y][ym] = [];
    byYear[y][ym].push(log);
  });
  return byYear;
}

function renderLogGroup(logs, tierId) {
  if (logs.length === 0) return '<div class="notes">기록 없음</div>';
  const byYear = groupLogsByYearMonth(logs);
  const years = Object.keys(byYear).sort().reverse();
  const currentYM = new Date().toISOString().slice(0, 7);

  let html = '';
  years.forEach(year => {
    const yearLogs = Object.values(byYear[year]).flat();
    const yearWins = yearLogs.filter(l => l.result?.아이팝_1위_여부).length;
    const yearCompleted = yearLogs.filter(l => l.result).length;

    // 현재 연도는 펼침, 과거 연도는 접음
    const isCurrentYear = year === currentYM.slice(0, 4);
    const yearId = `${tierId}-y-${year}`;

    html += `
      <div class="year-group">
        <div class="year-header" onclick="toggleGroup('${yearId}')">
          <span class="toggle-arrow" id="arrow-${yearId}">${isCurrentYear ? '▼' : '▶'}</span>
          📅 <b>${year}년</b> · ${yearLogs.length}건 · 1위 ${yearWins}/${yearCompleted || '미확정'}
        </div>
        <div class="year-content" id="${yearId}" style="display:${isCurrentYear ? 'block' : 'none'}">
    `;

    const months = Object.keys(byYear[year]).sort().reverse();
    months.forEach(ym => {
      const monthLogs = byYear[year][ym];
      const monthWins = monthLogs.filter(l => l.result?.아이팝_1위_여부).length;
      const monthCompleted = monthLogs.filter(l => l.result).length;
      const isCurrentMonth = ym === currentYM;
      const monthId = `${tierId}-m-${ym}`;
      const monthLabel = ym.slice(5);  // "04"

      html += `
        <div class="month-group">
          <div class="month-header" onclick="toggleGroup('${monthId}')">
            <span class="toggle-arrow" id="arrow-${monthId}">${isCurrentMonth ? '▼' : '▶'}</span>
            <b>${monthLabel}월</b> · ${monthLogs.length}건 · 1위 ${monthWins}/${monthCompleted || '-'}
          </div>
          <div class="month-content" id="${monthId}" style="display:${isCurrentMonth ? 'block' : 'none'}">
            ${monthLogs.map(renderSingleLog).join('')}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
  });

  return html;
}

function toggleGroup(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(`arrow-${id}`);
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = 'block';
    if (arrow) arrow.textContent = '▼';
  } else {
    el.style.display = 'none';
    if (arrow) arrow.textContent = '▶';
  }
}

function renderLogs() {
  const logs = JSON.parse(localStorage.getItem('bid_logs') || '[]');
  const el = document.getElementById('prediction-log');
  if (logs.length === 0) {
    el.innerHTML = '<div class="notes">기록된 예측이 없습니다.</div>';
    return;
  }

  const t1Logs = logs.filter(l => {
    if (l.tier === 1) return true;
    if (l.tier === 2) return false;
    return !!l.t1 || !l.t2;
  });
  const t2Logs = logs.filter(l => l.tier === 2);

  el.innerHTML = `
    <div class="tier-result-grid">
      <div class="tier-col t1">
        <h3>🎯 Tier 1 · 300세대 미만 (전체 ${t1Logs.length}건)</h3>
        ${renderLogGroup(t1Logs, 't1')}
      </div>
      <div class="tier-col t2">
        <h3>🎯 Tier 2 · 300~500세대 (전체 ${t2Logs.length}건)</h3>
        ${renderLogGroup(t2Logs, 't2')}
      </div>
    </div>
  `;
}

function renderStats() {
  const logs = JSON.parse(localStorage.getItem('bid_logs') || '[]');
  const completed = logs.filter(l => l.result);
  const el = document.getElementById('prediction-stats');
  if (!el) return;
  if (completed.length === 0) {
    el.innerHTML = '<div class="notes">개찰 결과가 입력된 기록이 없습니다. 월 1회 xls 업로드 시 자동 매칭됩니다.</div>';
    return;
  }
  const wins = completed.filter(l => l.result.아이팝_1위_여부).length;
  const errors = completed.map(l => Math.abs(l.result.예측_vs_실측.오차));
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;

  // Tier별 분리 (log.tier 기준)
  const t1Results = completed.filter(l => l.tier === 1);
  const t2Results = completed.filter(l => l.tier === 2);
  const t1Wins = t1Results.filter(l => l.result.아이팝_1위_여부).length;
  const t2Wins = t2Results.filter(l => l.result.아이팝_1위_여부).length;

  // 평균 차액
  const diffs = completed.map(l => l.result.예측_vs_실측.차액_원 || 0).filter(d => d !== 0);
  const avgDiff = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

  el.innerHTML = `
    <div class="result-box highlight">
      <div class="metric"><span class="metric-label">총 예측 / 결과 확인</span>
        <span class="metric-value">${logs.length}건 / ${completed.length}건</span>
      </div>
      <div class="metric"><span class="metric-label">🏆 아이팝 1위 (전체)</span>
        <span class="metric-value">${wins}건 (${(wins/completed.length*100).toFixed(1)}%)</span>
      </div>
      <div class="metric"><span class="metric-label">&nbsp;&nbsp;└ Tier 1 (300세대 미만)</span>
        <span class="metric-value">${t1Wins}/${t1Results.length}건</span>
      </div>
      <div class="metric"><span class="metric-label">&nbsp;&nbsp;└ Tier 2 (300-500세대)</span>
        <span class="metric-value">${t2Wins}/${t2Results.length}건</span>
      </div>
      <div class="metric"><span class="metric-label">투찰율 예측 평균 오차 (MAE)</span>
        <span class="metric-value">${mae.toFixed(3)}%p</span>
      </div>
      <div class="metric"><span class="metric-label">평균 차액 (예측-실측 1위)</span>
        <span class="metric-value">${avgDiff >= 0 ? '+' : ''}${numberFormat(Math.round(avgDiff))}원</span>
      </div>
    </div>
  `;
}

function exportLogs() {
  const logs = localStorage.getItem('bid_logs') || '[]';
  const blob = new Blob([logs], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bid-logs-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importLogs(file) {
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('잘못된 형식');
      if (confirm(`${imported.length}건 기록을 가져옵니다. 기존 기록에 추가됩니다. OK?`)) {
        const existing = JSON.parse(localStorage.getItem('bid_logs') || '[]');
        const merged = [...imported, ...existing];
        // ID 중복 제거
        const seen = new Set();
        const deduped = merged.filter(l => !seen.has(l.id) && seen.add(l.id));
        localStorage.setItem('bid_logs', JSON.stringify(deduped));
        renderLogs();
        renderStats();
        showToast(`${imported.length}건 가져옴`);
      }
    } catch (err) {
      alert('파일 오류: ' + err.message);
    }
  };
  r.readAsText(file);
}

// ============================================================
// 보안: 파일 부재 방어만 유지 (팀원 Mac에 파일 없음)
// macOS Touch ID가 1차 방어, 파일 부재가 2차 방어
// 별도 앱 비밀번호는 redundant — 제거됨
// ============================================================

// ============================================================
// URL 파라미터 자동 입력 (주택건설공사 앱 연동)
// ============================================================
function autoFillFromURL() {
  const params = new URLSearchParams(location.search);
  if (!params.has('base')) return false;

  if (params.get('name')) {
    document.getElementById('inp-name').value = cleanName(decodeURIComponent(params.get('name')));
  }
  const base = parseInt(params.get('base'));
  if (base > 0) {
    document.getElementById('inp-base').value = base.toLocaleString('ko-KR');
  }
  if (params.get('tier') && ['1','2'].includes(params.get('tier'))) {
    document.getElementById('inp-tier').value = params.get('tier');
  }
  if (params.get('region') && ['수도권','광역','지방'].includes(params.get('region'))) {
    document.getElementById('inp-region').value = params.get('region');
  }
  const month = parseInt(params.get('month'));
  if (month >= 1 && month <= 12) {
    document.getElementById('inp-month').value = month;
  }
  // 자동 분석 실행
  setTimeout(() => document.getElementById('btn-calc').click(), 300);
  return true;
}

// ============================================================
// 기초금액 자동 콤마 입력
// ============================================================
function setupBaseInput() {
  const el = document.getElementById('inp-base');
  el.addEventListener('input', (e) => {
    let raw = e.target.value.replace(/[^\d]/g, '');
    if (raw) {
      e.target.value = Number(raw).toLocaleString('ko-KR');
    } else {
      e.target.value = '';
    }
  });
  el.addEventListener('paste', (e) => {
    setTimeout(() => {
      let raw = e.target.value.replace(/[^\d]/g, '');
      e.target.value = raw ? Number(raw).toLocaleString('ko-KR') : '';
    }, 0);
  });
}

// ============================================================
// 초기화
// ============================================================
(async () => {
  // 1. 기존 비밀번호 설정 데이터 정리 (만약 이전 버전에서 설정했다면)
  localStorage.removeItem('bid_password_hash');
  localStorage.removeItem('bid_auth_expiry');
  localStorage.removeItem('bid_auth');

  // 2. 데이터 로드
  await loadData();
  setupBaseInput();
  document.getElementById('btn-calc').addEventListener('click', analyze);
  document.getElementById('btn-export').addEventListener('click', exportLogs);
  const importEl = document.getElementById('import-file');
  if (importEl) {
    importEl.addEventListener('change', (e) => {
      if (e.target.files[0]) importLogs(e.target.files[0]);
    });
  }
  renderLogs();
  renderStats();

  // P1: 업체 랭킹 초기 렌더
  renderCompanyRanking();
  setupRankingFilters();

  // 3. URL 파라미터 자동 입력 (주택건설공사 앱 연동)
  autoFillFromURL();
})();

// ============================================================
// P1: 상위 낙찰업체 랭킹
// ============================================================
function setupRankingFilters() {
  document.querySelectorAll('.ranking-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ranking-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rankingState.filter = btn.dataset.filter;
      renderCompanyRanking();
    });
  });
  const moreBtn = document.getElementById('btn-ranking-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      rankingState.showAll = !rankingState.showAll;
      moreBtn.textContent = rankingState.showAll ? '▲ Top 10만 보기' : '▼ Top 30 보기';
      renderCompanyRanking();
    });
  }
}

function sortByKey(list, key, asc) {
  const arr = [...list];
  arr.sort((a, b) => {
    const va = a[key], vb = b[key];
    if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    return asc ? va - vb : vb - va;
  });
  return arr;
}

function isCompanyActive(c) {
  // 2023년 이후 낙찰 1건 이상
  const years = c.연도분포 || {};
  return Object.keys(years).some(y => parseInt(y) >= 2023);
}

function getMainRegion(c) {
  const d = c.지역분포 || {};
  const entries = Object.entries(d).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : '-';
}

function renderCompanyRanking() {
  const el = document.getElementById('ranking-body');
  if (!el) return;
  if (!COMPANY || !COMPANY.top_30) {
    el.innerHTML = '<div class="notes">업체 데이터 로드 실패</div>';
    return;
  }

  // 필터
  let list = COMPANY.top_30.slice();
  const f = rankingState.filter;
  if (f === 'tier1') list = list.filter(c => c.주력tier === 1);
  else if (f === 'tier2') list = list.filter(c => c.주력tier === 2);
  else if (['수도권', '광역', '지방'].includes(f)) list = list.filter(c => getMainRegion(c) === f);
  else if (f === 'active') list = list.filter(isCompanyActive);

  // 정렬
  list = sortByKey(list, rankingState.sortKey, rankingState.sortAsc);

  // Top N
  const limit = rankingState.showAll ? 30 : 10;
  list = list.slice(0, limit);

  if (list.length === 0) {
    el.innerHTML = '<div class="notes">해당 필터에 맞는 업체 없음</div>';
    return;
  }

  const arrow = (k) => rankingState.sortKey === k
    ? (rankingState.sortAsc ? '▲' : '▼')
    : '';

  let html = `
    <table>
      <thead>
        <tr>
          <th>순위</th>
          <th>업체명</th>
          <th class="sortable" onclick="changeRankingSort('낙찰건수')">낙찰<span class="sort-arrow">${arrow('낙찰건수')}</span></th>
          <th class="sortable" onclick="changeRankingSort('역산사정_중앙')">역산사정<br>중앙<span class="sort-arrow">${arrow('역산사정_중앙')}</span></th>
          <th class="sortable" onclick="changeRankingSort('마진표편')">마진표편<span class="sort-arrow">${arrow('마진표편')}</span></th>
          <th>그룹</th>
          <th>주력Tier</th>
          <th>주력지역</th>
          <th>최근3년</th>
        </tr>
      </thead>
      <tbody>
  `;
  list.forEach((c, i) => {
    const rankClass = c.순위 === 1 ? 'top1' : (c.순위 <= 3 ? 'top3' : '');
    const active = isCompanyActive(c);
    const 역산중앙 = c.역산사정_중앙 != null ? c.역산사정_중앙 : c.평균ratio;
    const 마진표편 = c.마진표편 != null ? c.마진표편 : 0;
    const 그룹 = c.전략그룹 || '-';
    const 타이트 = c.초타이트_저격수 ? '⚡' : '';
    const 그룹색 = {A: '#d93025', B: '#f9ab00', C: '#1a73e8', 'C+': '#9334e6'}[그룹] || '#5f6368';
    html += `
      <tr>
        <td><span class="rank-tag ${rankClass}">${c.순위}</span></td>
        <td>${c.업체명} ${타이트}</td>
        <td>${c.낙찰건수}건</td>
        <td>${역산중앙.toFixed(3)}%</td>
        <td>${마진표편.toFixed(4)}</td>
        <td><span style="color:${그룹색};font-weight:600">${그룹}</span></td>
        <td>T${c.주력tier}</td>
        <td>${getMainRegion(c)}</td>
        <td class="${active ? 'active-dot' : 'inactive-dot'}">${active ? '● 활동' : '○ 휴면'}</td>
      </tr>
    `;
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function changeRankingSort(key) {
  if (rankingState.sortKey === key) {
    rankingState.sortAsc = !rankingState.sortAsc;
  } else {
    rankingState.sortKey = key;
    rankingState.sortAsc = false;
  }
  renderCompanyRanking();
}

// ============================================================
// P2: 예상 경쟁업체 Top 5
// ============================================================
function renderExpectedCompetitors(tier, region, baseAmount) {
  const card = document.getElementById('competitor-card');
  const body = document.getElementById('competitor-body');
  if (!card || !body) return;
  card.style.display = 'block';

  if (!COMPETITOR || !COMPETITOR.버킷) {
    body.innerHTML = '<div class="notes">경쟁자 인덱스 로드 실패</div>';
    return;
  }

  const q = getBaseQuantile(baseAmount);
  const key = `T${tier}_${region}_${q}`;
  const bucket = COMPETITOR.버킷[key];

  const qLabel = {
    'Q1': `최저 (~${numberFormat(DATA['기초금액_분위_경계'].Q1_max)}원)`,
    'Q2': `중저 (~${numberFormat(DATA['기초금액_분위_경계'].Q2_max)}원)`,
    'Q3': `중고 (~${numberFormat(DATA['기초금액_분위_경계'].Q3_max)}원)`,
    'Q4': `최고 (${numberFormat(DATA['기초금액_분위_경계'].Q3_max)}원 이상)`,
  }[q];

  const header = `
    <div class="result-box highlight">
      <div class="metric"><span class="metric-label">분석 구간</span>
        <span class="metric-value">Tier${tier} · ${region} · 기초금액 ${qLabel}</span>
      </div>
      <div class="metric"><span class="metric-label">기간 / 과거 공고 수</span>
        <span class="metric-value">${COMPETITOR.기간} · ${bucket ? bucket.총건수 : 0}건</span>
      </div>
    </div>
  `;

  if (!bucket || bucket.총건수 < 3) {
    body.innerHTML = header + '<div class="result-box warning">⚠ 과거 유사 공고 부족 (3건 미만) — 경쟁 예측 정확도 낮음</div>';
    return;
  }

  let listHtml = '<table><thead><tr><th>순위</th><th>업체명</th><th>1위 건수</th><th>점유율</th></tr></thead><tbody>';
  bucket.top5.forEach((entry, i) => {
    const share = (entry.건수 / bucket.총건수 * 100).toFixed(1);
    const rankClass = i === 0 ? 'top1' : (i < 3 ? 'top3' : '');
    listHtml += `
      <tr>
        <td><span class="rank-tag ${rankClass}">${i+1}</span></td>
        <td>${entry.업체}</td>
        <td>${entry.건수}건</td>
        <td>${share}%</td>
      </tr>
    `;
  });
  listHtml += '</tbody></table>';
  listHtml += `<div class="notes">📌 이 업체들과의 경쟁 가능성 높음. 투찰 시 이들의 평균 사정율·마진 패턴 참조.</div>`;

  body.innerHTML = header + listHtml;
}

// ============================================================
// ★ 정면돌파 슈퍼 예측 렌더
// ============================================================
function renderSuperPrediction(ctx) {
  const card = document.getElementById('super-card');
  const body = document.getElementById('super-body');
  if (!card || !body) return;
  if (typeof SUPER_MODEL === 'undefined') {
    card.style.display = 'block';
    body.innerHTML = '<p class="notes" style="color:var(--danger)">super_predictor.js 미로드</p>';
    return;
  }
  card.style.display = 'block';

  const hazard = DATA['하한율'][ctx.tier];
  const ens = predictEnsemble(ctx);
  const rec = recommendBid(ctx, hazard, 0.002);

  // Top 업체별 예측값 테이블
  let detailRows = '';
  const entries = Object.entries(ens.details).sort((a, b) => a[1] - b[1]);
  for (const [name, p] of entries) {
    const m = SUPER_MODEL.top_companies[name];
    const bid = Math.round(ctx.base * p / 100 * hazard / 100 * 1.002);
    const diffFromEns = p - ens.ensemble;
    const cls = Math.abs(diffFromEns) < 0.1 ? 'recommended' : '';
    detailRows += `
      <tr class="${cls}">
        <td>${name.length > 22 ? name.slice(0, 22) + '…' : name}</td>
        <td>${m.n}</td>
        <td>${m.loocv_mae.toFixed(3)}</td>
        <td>${p.toFixed(3)}%</td>
        <td>${numberFormat(bid)}</td>
      </tr>
    `;
  }
  // 아이팝 앙상블 행
  detailRows += `
    <tr style="background:#e8f0fe;font-weight:700;border-top:2px solid var(--primary)">
      <td>⚔️ 아이팝 앙상블 (권장)</td>
      <td>-</td>
      <td>${SUPER_MODEL.ensemble_backtest.mae_ensemble.toFixed(3)}</td>
      <td>${ens.ensemble.toFixed(3)}%</td>
      <td class="copyable" onclick="copyToClipboard(${rec.bid})" title="클릭 복사">${numberFormat(rec.bid)} 📋</td>
    </tr>
  `;

  body.innerHTML = `
    <div class="result-box highlight">
      <div class="metric"><span class="metric-label">앙상블 예측 사정율</span>
        <span class="metric-value large">${ens.ensemble.toFixed(3)}%</span>
      </div>
      <div class="metric"><span class="metric-label">95% 신뢰구간 (±)</span>
        <span class="metric-value">${ens.low.toFixed(3)} ~ ${ens.high.toFixed(3)}%</span>
      </div>
      <div class="metric"><span class="metric-label">권장 투찰가 (정중앙·하한+0.2%p)</span>
        <span>
          <span class="metric-value large copyable" onclick="copyToClipboard(${rec.bid})" title="클릭 복사">${numberFormat(rec.bid)}원 📋</span>
        </span>
      </div>
      <div class="metric"><span class="metric-label">안전 투찰 (하단 사정율)</span>
        <span class="metric-value copyable" onclick="copyToClipboard(${rec.bid_safe})">${numberFormat(rec.bid_safe)}원 📋</span>
      </div>
      <div class="metric"><span class="metric-label">공격 투찰 (상단 사정율)</span>
        <span class="metric-value copyable" onclick="copyToClipboard(${rec.bid_aggro})">${numberFormat(rec.bid_aggro)}원 📋</span>
      </div>
    </div>
    <h3 style="font-size:13px;margin-top:14px;margin-bottom:6px;color:var(--text-secondary)">
      Top 업체 비교 (이 공고 조건에서 각 업체가 제시할 예상 투찰가)
    </h3>
    <table>
      <thead><tr><th>업체</th><th>n</th><th>LOOCV MAE</th><th>예측 사정율</th><th>예상 투찰가</th></tr></thead>
      <tbody>${detailRows}</tbody>
    </table>
    <div class="notes">
      📌 앙상블 = Top 업체 LOOCV MAE 역수 가중평균. 업체별 예측이 유사할수록 합의 신뢰도 높음.<br>
      📌 권장 투찰가 = 기초금액 × 예측사정율 × 하한율 × 1.002 (하방 오차 여유 0.2%p).<br>
      📌 실제 사정율이 예측보다 낮으면 탈락 → 안전 투찰가로 보수적 접근 가능.
    </div>
  `;
}

// ============================================================
// ★ Top 업체 사정율 공식 카드
// ============================================================
function renderTopFormulas(ctx) {
  const card = document.getElementById('topformula-card');
  const body = document.getElementById('topformula-body');
  if (!card || !body || typeof SUPER_MODEL === 'undefined') return;
  card.style.display = 'block';

  const tops = Object.entries(SUPER_MODEL.top_companies)
    .sort((a, b) => a[1].loocv_mae - b[1].loocv_mae);

  let rows = '';
  for (const [name, m] of tops) {
    const c = m.coefs;
    // 주요 계수 3개만 표시 (abs 크기순)
    const mainCoefs = Object.entries(c)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v.toFixed(3)}`)
      .join(', ');
    rows += `
      <tr>
        <td style="max-width:210px">${name}</td>
        <td>${m.n}</td>
        <td>${m.mean.toFixed(3)}</td>
        <td>${m.std.toFixed(3)}</td>
        <td>${m.intercept.toFixed(3)}</td>
        <td>${m.loocv_mae.toFixed(3)}</td>
        <td style="font-size:11px;text-align:left">${mainCoefs}</td>
      </tr>
    `;
  }

  // 공통 패턴
  const cm = SUPER_MODEL.super_model.coefs;
  const intc = SUPER_MODEL.super_model.intercept;
  body.innerHTML = `
    <div class="result-box warning">
      <b>공통 베이스 사정율(절편):</b> ${intc.toFixed(3)}%<br>
      <b>주요 조정 계수:</b>
      Tier2 ${cm.tier2 >= 0 ? '+' : ''}${cm.tier2.toFixed(3)},
      수도권 ${cm.is_metro >= 0 ? '+' : ''}${cm.is_metro.toFixed(3)},
      광역 ${cm.is_gwang >= 0 ? '+' : ''}${cm.is_gwang.toFixed(3)},
      log(기초) ${cm.log_base >= 0 ? '+' : ''}${cm.log_base.toFixed(3)},
      연도변화 ${cm.year_rel >= 0 ? '+' : ''}${cm.year_rel.toFixed(3)}/년,
      참여수(z) ${cm.part_z >= 0 ? '+' : ''}${cm.part_z.toFixed(3)}
    </div>
    <table>
      <thead><tr><th>업체</th><th>n</th><th>μ</th><th>σ</th><th>절편</th><th>LOOCV MAE</th><th>영향력 Top3 계수</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="notes">
      📌 LOOCV MAE 낮을수록 예측 정교. <b>태원(0.29)·휴먼(0.54)</b>이 가장 일관된 루틴 보유.<br>
      📌 절편 = 그 업체의 "기본 사정율". 계수들은 조건에 따른 ± 조정치.
    </div>
  `;
}

// ============================================================
// ★ 백테스트 카드
// ============================================================
function renderBacktest() {
  const card = document.getElementById('backtest-card');
  const body = document.getElementById('backtest-body');
  if (!card || !body || typeof SUPER_MODEL === 'undefined') return;
  card.style.display = 'block';

  const bt = SUPER_MODEL.ensemble_backtest;
  const improve = bt.improvement_vs_naive_pct;
  const beat = bt.mae_ensemble < bt.top_avg_loocv;
  body.innerHTML = `
    <div class="result-box ${beat ? 'success' : 'warning'}">
      <div class="metric"><span class="metric-label">2024+ 홀드아웃 표본</span>
        <span class="metric-value">n=${bt.n}</span>
      </div>
      <div class="metric"><span class="metric-label">앙상블 MAE</span>
        <span class="metric-value large">${bt.mae_ensemble.toFixed(3)}%</span>
      </div>
      <div class="metric"><span class="metric-label">Ridge 슈퍼 MAE</span>
        <span class="metric-value">${bt.mae_super.toFixed(3)}%</span>
      </div>
      <div class="metric"><span class="metric-label">Naive(기간 평균) MAE</span>
        <span class="metric-value">${bt.mae_naive.toFixed(3)}%</span>
      </div>
      <div class="metric"><span class="metric-label">Top 업체 평균 LOOCV</span>
        <span class="metric-value">${bt.top_avg_loocv.toFixed(3)}%</span>
      </div>
      <div class="metric"><span class="metric-label">⚔️ 게임이론 최적 승률(Tier1/2 평균)</span>
        <span class="metric-value large" style="color:var(--primary)">${((GAME_THEORY.tier['1'].best_wr + GAME_THEORY.tier['2'].best_wr)/2).toFixed(2)}%</span>
      </div>
    </div>
    <div class="notes">
      📌 <b>본질적 경계:</b> 예정가격 = 복수예비가격 15개 중 4개 랜덤추첨 산술평균. 구조적 랜덤.<br>
      📌 <b>앙상블 vs Naive ${improve >= 0 ? '+' : ''}${improve.toFixed(1)}%</b> — 공고 특성으로 사정율 예측 거의 불가(MI<0.05).<br>
      📌 <b>정면돌파 해:</b> 예측 대신 <b>최적 베팅 좌표</b>. 모든 업체 모든 공고 참여 전제에서,
         Monte-Carlo 시뮬로 <b>아이팝이 1등할 기대확률이 가장 높은 사정율 좌표</b>를 산출 — 아래 '아이팝 최적 투찰 좌표' 카드 참조.<br>
      📌 단순 '대등 승산'은 기존 방식(Top 업체 LOOCV 대비). 실전 승률은 <b>좌표 선점</b>으로 결정됨.
    </div>
  `;
}

// ============================================================
// 게임이론 — 아이팝 최적 투찰 좌표
// ============================================================
function renderOptimalBid(ctx) {
  const card = document.getElementById('optimalbid-card');
  if (!card) return;
  card.style.display = '';
  const body = document.getElementById('optimalbid-body');
  const opt = optimalBid(ctx);
  const tierScan = winRateScan(ctx.tier);
  const hazard = ctx.tier === 2 ? 82.95 : 84.95;
  // 투찰가 계산 (하한 바로 위)
  const estPrice = ctx.base * opt.B / 100;
  const bid = Math.floor(estPrice * hazard / 100);
  const bidPct = (bid / ctx.base * 100).toFixed(3);
  // 스캔 Top5
  const sorted = [...tierScan].sort((a,b) => b[1]-a[1]).slice(0,5);
  const scanRows = sorted.map(([B,wr],i) => `
    <tr ${i===0 ? 'style="background:#fff3cd;font-weight:600"' : ''}>
      <td>${i+1}</td><td>${B.toFixed(2)}</td><td>${wr.toFixed(2)}%</td>
    </tr>`).join('');

  // 리스크: 실격 확률 = P(실제 사정율 > B)
  // 실제 사정율 ~ N(99.9275, 0.7616) 정규근사 (1,113건, 특수사업 제외)
  const mu = GAME_THEORY.overall.actual_mean;
  const sd = GAME_THEORY.overall.actual_std;
  // 정규분포 CDF 근사
  const erf = x => { const s=Math.sign(x), a=Math.abs(x); const t=1/(1+0.3275911*a);
    const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-a*a);
    return s*y; };
  const cdf = (v) => 0.5*(1+erf((v-mu)/(sd*Math.SQRT2)));
  const pFail = 1 - cdf(opt.B);   // 실제 사정율이 B보다 큰 확률 = 실격 확률
  const risk = pFail > 0.60 ? ['HIGH', `실격 확률 ${(pFail*100).toFixed(1)}%`, 'var(--warning)']
             : pFail > 0.40 ? ['MED',  `실격 확률 ${(pFail*100).toFixed(1)}%`, 'var(--warning)']
             :                ['LOW',  `실격 확률 ${(pFail*100).toFixed(1)}%`, 'var(--success)'];

  body.innerHTML = `
    <div class="result-box success">
      <div class="metric"><span class="metric-label">스코프</span>
        <span class="metric-value">${opt.scope} · N=${opt.basisN}</span>
      </div>
      <div class="metric"><span class="metric-label">최적 베팅 사정율 (B)</span>
        <span class="metric-value large" style="color:var(--primary)">${opt.B.toFixed(2)}</span>
      </div>
      <div class="metric"><span class="metric-label">1등 기대 확률</span>
        <span class="metric-value large" style="color:var(--success)">${opt.wr.toFixed(2)}%</span>
      </div>
      <div class="metric"><span class="metric-label">예측 예정가격</span>
        <span class="metric-value">${Math.round(estPrice).toLocaleString()} 원</span>
      </div>
      <div class="metric"><span class="metric-label">권장 투찰가 (하한 ${hazard}% 기준)</span>
        <span class="metric-value large">${bid.toLocaleString()} 원</span>
      </div>
      <div class="metric"><span class="metric-label">투찰율 = 기초대비</span>
        <span class="metric-value">${bidPct}%</span>
      </div>
      <div class="metric"><span class="metric-label">리스크</span>
        <span class="metric-value" style="color:${risk[2]}">${risk[0]} · ${risk[1]}</span>
      </div>
    </div>
    <h3 style="margin-top:16px">Tier${ctx.tier||''} 좌표별 기대승률 Top5</h3>
    <table>
      <thead><tr><th>#</th><th>베팅 사정율 B</th><th>기대승률</th></tr></thead>
      <tbody>${scanRows}</tbody>
    </table>
    <div class="notes">
      📌 <b>해석:</b> 모든 업체가 모든 공고에 참여한다는 정면돌파 전제 하에, 경쟁사 Top50이 각자의 스위트 스팟(평균·std)에서 베팅할 때 아이팝이 고정 좌표 B에 베팅하면 이 확률로 1등.<br>
      📌 <b>주의:</b> Tier별 최적 좌표가 다름 → Tier2(하한 82.95%)는 B=${GAME_THEORY.tier['2'].best_B.toFixed(2)}, Tier1은 B=${GAME_THEORY.tier['1'].best_B.toFixed(2)}.<br>
      📌 <b>지역 세분화 추가 상승:</b> 서울/인천/광주는 소규모 고정 전략으로 승률 4~6% 도달. 경기도는 99.70 권장.<br>
      📌 사정율 예측 불가능 구간(MAE 0.62)이므로 <b>단일 최적 좌표에 반복 고정 베팅</b>이 장기 기대가치 최대.
    </div>
  `;
}

function renderCompetitorDistribution() {
  const card = document.getElementById('compdist-card');
  if (!card) return;
  card.style.display = '';
  const body = document.getElementById('compdist-body');
  const list = competitorDistribution(20);

  // 히스토그램: 98.5~101.0 0.25단위 버킷, 각 업체 mean 위치 + 범위(±std)
  const BINS = [];
  for (let x = 98.5; x <= 101.26; x += 0.25) BINS.push(Number(x.toFixed(2)));
  const BIN_W = 0.25;
  function place(mean) {
    const i = BINS.findIndex(b => b > mean);
    return i <= 0 ? 0 : i - 1;
  }
  const counts = new Array(BINS.length).fill(0);
  list.forEach(c => { const i = place(c.mean); if (i>=0) counts[i]++; });
  const max = Math.max(...counts, 1);

  const histBars = BINS.map((b,i) => {
    const h = counts[i] / max * 60;  // px
    const hi = (b >= GAME_THEORY.overall.best_B - BIN_W/2 && b < GAME_THEORY.overall.best_B + BIN_W/2);
    return `<div style="display:inline-block;width:22px;margin:0 1px;vertical-align:bottom;text-align:center">
              <div style="height:${h}px;background:${hi?'var(--primary)':'var(--border)'};border-radius:2px 2px 0 0"></div>
              <div style="font-size:10px;color:#5f6368;transform:rotate(-60deg);transform-origin:top left;white-space:nowrap;margin-top:4px">${b.toFixed(2)}</div>
            </div>`;
  }).join('');

  // 스타일 색상
  function styleColor(k) {
    return k === '고정' ? '#dc3545' : k === '반고정' ? '#fd7e14' : '#0d6efd';
  }

  const rows = list.map(c => `
    <tr>
      <td>${c.rank}</td>
      <td>${c.key.slice(0,26)}</td>
      <td>${c.n}</td>
      <td style="text-align:right">${c.mean.toFixed(3)}</td>
      <td style="text-align:right">${c.median.toFixed(3)}</td>
      <td style="text-align:right">${c.std.toFixed(3)}</td>
      <td><span style="color:${styleColor(c.kind)};font-weight:600">${c.kind}</span></td>
    </tr>`).join('');

  // 아이팝 추천 좌표 강조
  const ipopB = GAME_THEORY.overall.best_B;
  const ipopWr = GAME_THEORY.overall.best_wr;

  body.innerHTML = `
    <div class="result-box">
      <div class="metric"><span class="metric-label">경쟁사 풀</span>
        <span class="metric-value">Top20 (N≥${list[list.length-1].n}회 1위)</span>
      </div>
      <div class="metric"><span class="metric-label">아이팝 권장 좌표 (전체)</span>
        <span class="metric-value large" style="color:var(--primary)">${ipopB.toFixed(2)}</span>
      </div>
      <div class="metric"><span class="metric-label">아이팝 기대승률</span>
        <span class="metric-value" style="color:var(--success)">${ipopWr.toFixed(2)}%</span>
      </div>
    </div>
    <h3 style="margin-top:16px">경쟁사 스위트 스팟 히스토그램 (아이팝 권장좌표 강조)</h3>
    <div style="overflow-x:auto;padding:12px 0 30px">
      <div style="white-space:nowrap;min-height:110px">${histBars}</div>
    </div>
    <table style="margin-top:12px">
      <thead>
        <tr><th>#</th><th>업체</th><th>1등횟수</th><th>평균</th><th>중앙</th><th>표편</th><th>스타일</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="notes">
      📌 <b>고정형(std&lt;0.4):</b> 태원(99.84, std=0.30)만 진짜 고정. 그 좌표 ±0.3 범위 피하는 것이 유리.<br>
      📌 <b>반고정형(std 0.4~0.7):</b> 대부분 Top 업체 — 평균 주변 광범위 산포, 서로 겹침.<br>
      📌 <b>가변형(std&gt;0.7):</b> 계림·이안·경호 등 — 예측 불가, 모든 영역 출현.<br>
      📌 <b>빈 좌표 공략:</b> 평균 100.3~100.5 구간에 경쟁사 밀도 희박 → 아이팝 권장좌표 B=${ipopB.toFixed(2)} 근거.
    </div>
  `;
}

