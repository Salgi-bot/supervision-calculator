/* Auto-generated v3 ensemble · CONFIDENTIAL */
const SUPER_MODEL = {
  "generated": "2026-04-18",
  "version": "v3-ensemble",
  "n_records": 1122,
  "feature_norm": {
    "log_base_mean": 20.37339043731682,
    "part_mean": 65.14795008912655,
    "part_std": 39.69279542419763
  },
  "super_model": {
    "intercept": 99.93658938778519,
    "coefs": {
      "tier2": 0.02113716538324607,
      "is_metro": -0.013799682567716081,
      "is_gwang": 0.023269975287087134,
      "log_base": 0.041677091715056305,
      "month_sin": -0.017679301146594918,
      "month_cos": 0.009435373676476436,
      "year_rel": 0.002851703941174036,
      "part_z": -0.012019760589444905
    },
    "mae_backtest": 0.6139865151204777
  },
  "top_companies": {
    "(주)태원종합기술단건축사사무소": {
      "n": 31,
      "intercept": 99.79275942194826,
      "coefs": {
        "tier2": 0.5183463375337646,
        "is_metro": -0.11566000380678775,
        "is_gwang": -0.1666924937931001,
        "log_base": -0.48819253726083045,
        "month_sin": 0.15936587233151445,
        "month_cos": 0.011303415648466743,
        "year_rel": 0.03156439702305212,
        "part_z": 0.04425801775755316
      },
      "loocv_mae": 0.2855045491443986,
      "mean": 99.83823741935484,
      "std": 0.30136786051786935
    },
    "(주)나우종합건축사사무소": {
      "n": 26,
      "intercept": 99.99331237749956,
      "coefs": {
        "tier2": 0.5550860191808751,
        "is_metro": 0.08470607534827636,
        "is_gwang": -0.5328737042899965,
        "log_base": 0.27225385017738285,
        "month_sin": -0.17334571990456915,
        "month_cos": -0.0024077002393431126,
        "year_rel": 0.0566467972040051,
        "part_z": -0.1241322592193489
      },
      "loocv_mae": 0.5298324324096112,
      "mean": 99.8042446153846,
      "std": 0.6017922782171963
    },
    "주식회사 케이씨엠엔지니어링": {
      "n": 21,
      "intercept": 99.46004252673048,
      "coefs": {
        "tier2": 0.5888110392269713,
        "is_metro": 0.5566788753533567,
        "is_gwang": 0.15297914475160684,
        "log_base": 0.8542731958139329,
        "month_sin": 0.2682399303144456,
        "month_cos": 0.13116147059236144,
        "year_rel": -0.02775307023754459,
        "part_z": -0.46901427323879336
      },
      "loocv_mae": 0.5978558894863736,
      "mean": 99.91036190476191,
      "std": 0.6903806138183404
    },
    "주식회사 리종합건축사사무소": {
      "n": 17,
      "intercept": 99.63733119342511,
      "coefs": {
        "tier2": -0.06966713343986897,
        "is_metro": 0.6047521486270164,
        "is_gwang": 0.21084808344167233,
        "log_base": 0.2309798103497074,
        "month_sin": 0.15206974449949223,
        "month_cos": 0.3733038026446701,
        "year_rel": 0.06449834285143365,
        "part_z": 0.0012093698548624283
      },
      "loocv_mae": 0.8260628371785802,
      "mean": 99.56237588235295,
      "std": 0.6303730527637849
    },
    "(자)건축사사무소 태백": {
      "n": 31,
      "intercept": 99.31761681946769,
      "coefs": {
        "tier2": -0.009276884666859811,
        "is_metro": -0.00901918699066376,
        "is_gwang": -0.07364598915214912,
        "log_base": -0.14850000703219984,
        "month_sin": -0.313266821512795,
        "month_cos": -0.11283841989482031,
        "year_rel": 0.028241016202271537,
        "part_z": 0.05461424563550147
      },
      "loocv_mae": 0.5168974828153812,
      "mean": 99.17417677419354,
      "std": 0.4980265965614493
    },
    "주식회사 휴먼아키피아종합건축사사무소": {
      "n": 9,
      "intercept": 100.79016877955627,
      "coefs": {
        "tier2": 0.34117471748308287,
        "is_metro": -0.47826699775251486,
        "is_gwang": -0.9112024001451766,
        "log_base": -0.3187192901933232,
        "month_sin": -0.7130419577085364,
        "month_cos": -0.38645040777346457,
        "year_rel": -0.20324281904442182,
        "part_z": -0.4511810749702338
      },
      "loocv_mae": 0.5424725191611626,
      "mean": 100.59204333333332,
      "std": 0.9335498452680516
    }
  },
  "ensemble_backtest": {
    "n": 193,
    "mae_ensemble": 0.6432628812256121,
    "mae_super": 0.6139865151204777,
    "mae_naive": 0.6139413929402053,
    "improvement_vs_naive_pct": -4.775942561061782,
    "top_avg_loocv": 0.5497709516992512,
    "front_win_rate": 0.5025906735751295
  },
  "tier_region_stats": {
    "T1_광역": {
      "n_all": 115,
      "mean_all": 99.90934095652175,
      "std_all": 0.8134780803622049,
      "n_recent": 25,
      "mean_recent": 100.015458,
      "std_recent": 0.9273173208823029
    },
    "T1_수도권": {
      "n_all": 315,
      "mean_all": 99.92853898412699,
      "std_all": 0.7032272641773808,
      "n_recent": 104,
      "mean_recent": 99.95520759615384,
      "std_recent": 0.7100889832814333
    },
    "T1_지방": {
      "n_all": 292,
      "mean_all": 99.90815558219178,
      "std_all": 0.7791985445685428,
      "n_recent": 65,
      "mean_recent": 99.90960215384617,
      "std_recent": 0.8262942906557507
    },
    "T2_광역": {
      "n_all": 103,
      "mean_all": 100.01544349514565,
      "std_all": 0.758715696746564,
      "n_recent": 17,
      "mean_recent": 100.05122294117646,
      "std_recent": 0.656805156788951
    },
    "T2_수도권": {
      "n_all": 159,
      "mean_all": 99.87254823899372,
      "std_all": 0.7832034242237877,
      "n_recent": 27,
      "mean_recent": 99.93274444444445,
      "std_recent": 0.8412093566423086
    },
    "T2_지방": {
      "n_all": 138,
      "mean_all": 99.98326608695652,
      "std_all": 0.7757340447248403,
      "n_recent": 24,
      "mean_recent": 100.04685541666667,
      "std_recent": 0.8312314055872783
    }
  }
};

const _FEATS = ['tier2','is_metro','is_gwang','log_base','month_sin','month_cos','year_rel','part_z'];

function _featVec(ctx) {
  const fn = SUPER_MODEL.feature_norm;
  return {
    tier2:    ctx.tier === 2 ? 1 : 0,
    is_metro: ctx.region === '수도권' ? 1 : 0,
    is_gwang: ctx.region === '광역' ? 1 : 0,
    log_base: Math.log(Math.max(ctx.base, 1)) - fn.log_base_mean,
    month_sin: Math.sin(2*Math.PI*((ctx.month ?? 6)/12)),
    month_cos: Math.cos(2*Math.PI*((ctx.month ?? 6)/12)),
    year_rel:  (ctx.year ?? 2026) - 2023,
    part_z:    (((ctx.participants ?? fn.part_mean)) - fn.part_mean) / fn.part_std,
  };
}

function _apply(m, ctx) {
  const v = _featVec(ctx);
  let s = m.intercept;
  for (const k of _FEATS) s += (m.coefs[k] || 0) * v[k];
  return s;
}

function predictByTop(name, ctx) {
  const m = SUPER_MODEL.top_companies[name];
  return m ? _apply(m, ctx) : null;
}

function predictSuper(ctx) {
  return _apply(SUPER_MODEL.super_model, ctx);
}

/**
 * 앙상블 예측 — Top 업체 LOOCV 역수 가중평균
 */
function predictEnsemble(ctx) {
  const details = {};
  let wsum = 0, psum = 0;
  for (const [name, m] of Object.entries(SUPER_MODEL.top_companies)) {
    const p = _apply(m, ctx);
    const w = 1.0 / Math.max(m.loocv_mae, 0.05);
    details[name] = p;
    wsum += w; psum += p * w;
  }
  const ens = psum / wsum;
  const mae = SUPER_MODEL.ensemble_backtest.mae_ensemble;
  return { ensemble: ens, details, ci95: 1.96 * mae, low: ens - 1.96*mae, high: ens + 1.96*mae };
}

/**
 * 권장 투찰가 — 아이팝이 사정율을 예측해서 하한 바로 위에서 투찰
 * @param ctx  공고 조건
 * @param hazard 낙찰하한율 (%)
 * @param marginEps 사정율 하방 오차 흡수용 여유 (기본 0.002 = 0.2%p)
 */
function recommendBid(ctx, hazard, marginEps) {
  if (marginEps == null) marginEps = 0.002;
  const e = predictEnsemble(ctx);
  const est = ctx.base * e.ensemble / 100;
  const bid = Math.round(est * hazard / 100 * (1 + marginEps));
  return {
    sajeong: e.ensemble, ci95: e.ci95,
    est_price: est,
    bid,
    bid_safe:   Math.round(ctx.base * e.low  / 100 * hazard / 100 * (1 + marginEps)),
    bid_aggro:  Math.round(ctx.base * e.high / 100 * hazard / 100 * (1 + marginEps)),
    detail: e.details,
  };
}

if (typeof module !== 'undefined') module.exports = { SUPER_MODEL, predictEnsemble, predictByTop, predictSuper, recommendBid };


/* ============================================================
 * GAME THEORY v1  ·  정면돌파 사정율 최적 베팅 좌표
 * 전제: 모든 업체가 모든 공고 참여
 * 근거: Monte-Carlo (경쟁자풀=Top50 n≥3, 공고당 400회 시뮬)
 * 사정율 예측 MAE=0.615 vs Naive 0.623 (개선 1.3%) → 사실상 랜덤
 * → 승부는 "최적 베팅 좌표 선택"에서 결정됨
 * ============================================================ */
const GAME_THEORY = {"generated": "2026-04-19", "n_records": 1113, "overall": {"best_B": 100.22, "best_wr": 6.4, "scan": [[99.5, 3.4], [99.52, 4.4], [99.54, 4.4], [99.56, 4.8], [99.58, 3.2], [99.6, 3.2], [99.62, 4.6], [99.64, 4.6], [99.66, 4.4], [99.68, 5.6], [99.7, 6.2], [99.72, 4.4], [99.74, 3.2], [99.76, 5.0], [99.78, 5.4], [99.8, 4.0], [99.82, 3.8], [99.84, 3.6], [99.86, 4.2], [99.88, 6.2], [99.9, 2.6], [99.92, 4.6], [99.94, 2.8], [99.96, 4.4], [99.98, 4.8], [100.0, 4.6], [100.02, 4.2], [100.04, 4.8], [100.06, 4.4], [100.08, 6.2], [100.1, 3.8], [100.12, 5.8], [100.14, 6.0], [100.16, 5.2], [100.18, 4.2], [100.2, 3.4], [100.22, 6.4], [100.24, 5.0], [100.26, 4.2], [100.28, 3.6], [100.3, 5.2], [100.32, 5.0], [100.34, 4.8], [100.36, 5.2], [100.38, 3.4], [100.4, 4.8], [100.42, 4.4], [100.44, 3.0], [100.46, 3.8], [100.48, 4.0], [100.5, 5.6]], "actual_mean": 99.9275, "actual_std": 0.7616}, "tier": {"1": {"best_B": 100.48, "best_wr": 7.2, "scan": [[99.5, 3.2], [99.52, 5.2], [99.54, 4.4], [99.56, 4.6], [99.58, 4.4], [99.6, 4.8], [99.62, 4.6], [99.64, 4.6], [99.66, 4.8], [99.68, 5.8], [99.7, 3.2], [99.72, 4.4], [99.74, 4.6], [99.76, 5.4], [99.78, 3.8], [99.8, 4.2], [99.82, 4.6], [99.84, 5.2], [99.86, 3.6], [99.88, 4.6], [99.9, 3.4], [99.92, 3.8], [99.94, 4.2], [99.96, 4.0], [99.98, 4.0], [100.0, 3.8], [100.02, 4.6], [100.04, 4.6], [100.06, 5.4], [100.08, 5.0], [100.1, 4.6], [100.12, 3.2], [100.14, 4.4], [100.16, 3.0], [100.18, 4.8], [100.2, 5.2], [100.22, 7.0], [100.24, 3.4], [100.26, 4.2], [100.28, 4.6], [100.3, 4.4], [100.32, 6.4], [100.34, 3.8], [100.36, 6.8], [100.38, 5.0], [100.4, 6.4], [100.42, 4.8], [100.44, 3.6], [100.46, 6.2], [100.48, 7.2], [100.5, 6.2]], "N": 713}, "2": {"best_B": 99.68, "best_wr": 7.4, "scan": [[99.5, 3.0], [99.52, 3.2], [99.54, 3.4], [99.56, 4.0], [99.58, 4.4], [99.6, 3.0], [99.62, 5.0], [99.64, 3.6], [99.66, 5.6], [99.68, 7.4], [99.7, 5.0], [99.72, 5.8], [99.74, 5.8], [99.76, 5.2], [99.78, 4.8], [99.8, 4.8], [99.82, 2.8], [99.84, 4.4], [99.86, 4.4], [99.88, 5.4], [99.9, 4.8], [99.92, 5.4], [99.94, 3.6], [99.96, 5.4], [99.98, 3.0], [100.0, 3.2], [100.02, 2.2], [100.04, 3.4], [100.06, 4.0], [100.08, 6.8], [100.1, 6.6], [100.12, 7.4], [100.14, 5.0], [100.16, 5.8], [100.18, 5.6], [100.2, 5.6], [100.22, 5.2], [100.24, 4.8], [100.26, 4.4], [100.28, 2.0], [100.3, 5.4], [100.32, 5.4], [100.34, 5.0], [100.36, 5.0], [100.38, 5.6], [100.4, 5.6], [100.42, 6.2], [100.44, 3.8], [100.46, 4.6], [100.48, 5.0], [100.5, 4.6]], "N": 400}}, "region": {"경기도": {"N": 246, "best_B": 99.66, "best_wr": 9.0}, "서울특별시": {"N": 168, "best_B": 100.18, "best_wr": 9.0}, "전라남도": {"N": 100, "best_B": 99.78, "best_wr": 7.667}, "인천광역시": {"N": 59, "best_B": 100.1, "best_wr": 11.333}, "광주광역시": {"N": 58, "best_B": 100.06, "best_wr": 8.667}, "부산광역시": {"N": 51, "best_B": 100.06, "best_wr": 8.667}, "대구광역시": {"N": 58, "best_B": 99.86, "best_wr": 9.0}}, "top20_style": [{"rank": 1, "key": "(주)태원종합기술단건축사사무소", "n": 31, "mean": 100.00366142435108, "median": 99.89794455627337, "std": 0.4925431070813338, "kind": "반고정"}, {"rank": 2, "key": "(자)건축사사무소 태백", "n": 31, "mean": 99.30177365953442, "median": 99.24652456377409, "std": 0.4772865655699586, "kind": "반고정"}, {"rank": 3, "key": "(주)나우종합건축사사무소", "n": 26, "mean": 100.07555838639864, "median": 100.01341127836804, "std": 0.5014730784854753, "kind": "반고정"}, {"rank": 4, "key": "주식회사 케이씨엠엔지니어링", "n": 21, "mean": 100.05312377194203, "median": 99.99601492236245, "std": 0.7708156989222992, "kind": "가변"}, {"rank": 5, "key": "주식회사 리종합건축사사무소", "n": 17, "mean": 99.77771998482588, "median": 99.84650488888019, "std": 0.5956855539620641, "kind": "반고정"}, {"rank": 6, "key": "주식회사 상엔지니어링건축사사무소", "n": 16, "mean": 99.59222574865863, "median": 99.6844500947699, "std": 0.3634844939642245, "kind": "반고정"}, {"rank": 7, "key": "(주)한국환경종합건축사사무소", "n": 16, "mean": 99.88777000470445, "median": 99.73883572932084, "std": 0.4917006728522451, "kind": "반고정"}, {"rank": 8, "key": "(주)건축사사무소반석", "n": 16, "mean": 100.14768536924414, "median": 100.08073212061025, "std": 0.3826671564350211, "kind": "반고정"}, {"rank": 9, "key": "주식회사예인종합건축사사무소", "n": 15, "mean": 99.85534279333223, "median": 99.58903334147192, "std": 0.8339166280131445, "kind": "가변"}, {"rank": 10, "key": "(주)서원종합건축사사무소", "n": 14, "mean": 99.8487168149512, "median": 99.80012311722214, "std": 0.4877099059098227, "kind": "반고정"}, {"rank": 11, "key": "주식회사 성진건설기술단", "n": 14, "mean": 100.05665503051965, "median": 99.69266174138659, "std": 1.2144066435572276, "kind": "가변"}, {"rank": 12, "key": "(주)부산건축 종합건축사사무소", "n": 13, "mean": 99.52889475507011, "median": 99.25019884686704, "std": 0.5987411371185378, "kind": "반고정"}, {"rank": 13, "key": "주식회사 해밀씨엠", "n": 13, "mean": 100.18930007253208, "median": 100.01919341939602, "std": 0.702949381527627, "kind": "가변"}, {"rank": 14, "key": "주식회사 계림건축사사무소", "n": 13, "mean": 100.2039254406876, "median": 99.84821353637709, "std": 0.8593240982658782, "kind": "가변"}, {"rank": 15, "key": "주식회사 이안종합건축사사무소", "n": 13, "mean": 99.66487444659104, "median": 98.9015640493468, "std": 1.8048744585318446, "kind": "가변"}, {"rank": 16, "key": "주식회사 경호엔지니어링종합건축사사무소", "n": 13, "mean": 99.9280629928135, "median": 100.27640135465215, "std": 0.8987653586295904, "kind": "가변"}, {"rank": 17, "key": "(주)금호이엔씨종합건축사사무소", "n": 13, "mean": 100.33523245394797, "median": 99.82322284740181, "std": 1.1202796579604364, "kind": "가변"}, {"rank": 18, "key": "마인엔지니어링건축사사무소 주식회사", "n": 12, "mean": 99.7487908927228, "median": 99.74359937985791, "std": 0.618710830328847, "kind": "반고정"}, {"rank": 19, "key": "주식회사 건정종합건축사사무소", "n": 11, "mean": 100.62120080295158, "median": 100.78361878867032, "std": 0.5457820752527902, "kind": "반고정"}, {"rank": 20, "key": "(주)진명엔지니어링건축사사무소", "n": 11, "mean": 99.45984189606327, "median": 99.11889799219553, "std": 0.6836390573925181, "kind": "반고정"}], "competitors_n": 20, "note": "특수사업(margin>5%) 제외, 500세대 미만만"};

/**
 * 아이팝 최적 베팅 사정율 — Tier·지역 맞춤
 * @param ctx {tier: 1|2, region?: 시도명}
 * @returns {B: 최적사정율, wr: 기대승률(%), scope: '전체'|'Tier'|'지역', basisN}
 */
function optimalBid(ctx) {
  if (ctx.region && GAME_THEORY.region[ctx.region]) {
    const r = GAME_THEORY.region[ctx.region];
    return { B: r.best_B, wr: r.best_wr, scope: '지역(' + ctx.region + ')', basisN: r.N };
  }
  if (ctx.tier && GAME_THEORY.tier[String(ctx.tier)]) {
    const t = GAME_THEORY.tier[String(ctx.tier)];
    return { B: t.best_B, wr: t.best_wr, scope: 'Tier'+ctx.tier, basisN: t.N };
  }
  const o = GAME_THEORY.overall;
  return { B: o.best_B, wr: o.best_wr, scope: '전체', basisN: GAME_THEORY.n_records };
}

/**
 * 경쟁사 예측사정율 분포 — 히스토그램 buckets
 * 승자 사정율 분포 평균/std에서 각 업체의 "스위트 스팟" 추정
 */
function competitorDistribution(topN) {
  topN = topN || 20;
  return GAME_THEORY.top20_style.slice(0, topN).map(c => ({
    rank: c.rank, key: c.key, n: c.n, mean: c.mean,
    median: c.median, std: c.std, kind: c.kind,
  }));
}

/**
 * 좌표별 기대승률 스캔 커브 (Tier별)
 * @param tier 1|2|null
 * @returns [[B, wr], ...]
 */
function winRateScan(tier) {
  if (tier && GAME_THEORY.tier[String(tier)]) return GAME_THEORY.tier[String(tier)].scan;
  return GAME_THEORY.overall.scan;
}

/**
 * 실전 투찰 공식 — 1등 최대화용
 * @param ctx {tier, region, base, hazard}
 * @returns {sajeong, bid, winrate, est_price, reasoning}
 */
function finalBid(ctx) {
  const opt = optimalBid(ctx);
  const est = ctx.base * opt.B / 100;
  const bid = Math.floor(est * ctx.hazard / 100);  // 하한 바로 위(=사정율×하한)
  // 리스크: 낙찰하한율 기준 투찰가가 기초금액의 hazard 아래로 떨어지면 실격
  const bid_floor_pct = bid / ctx.base * 100;
  const risk = bid_floor_pct < ctx.hazard + 0.05 ? 'HIGH' : bid_floor_pct < ctx.hazard + 0.2 ? 'MED' : 'LOW';
  return {
    sajeong: opt.B, winrate: opt.wr, scope: opt.scope,
    est_price: est, bid,
    bid_floor_pct: Number(bid_floor_pct.toFixed(3)),
    hazard: ctx.hazard,
    risk,
    reasoning: '스코프=' + opt.scope + ' (N=' + opt.basisN + '), 기대승률=' + opt.wr.toFixed(2) + '%, '
             + 'MonteCarlo400회×경쟁자50사 기준 최적좌표',
  };
}

if (typeof module !== 'undefined') {
  module.exports = Object.assign(module.exports || {}, {
    GAME_THEORY, optimalBid, competitorDistribution, winRateScan, finalBid,
  });
}
