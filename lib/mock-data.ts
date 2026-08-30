export type ViewKey = "home" | "forecast" | "reports" | "detail" | "api";
export type ForecastKey = "cabbage" | "onion" | "hydro";

export const kpis = [
  {
    tag: "예측 · 농산물",
    region: "강릉",
    name: "고랭지배추 도매가격",
    value: "14,200",
    unit: "원/10kg망",
    delta: "+6.3%",
    direction: "up",
    error: "4.1%",
    spark: [13100, 13400, 13600, 13750, 13900, 14350, 14200],
    target: "cabbage" as ForecastKey
  },
  {
    tag: "예측 · 농산물",
    region: "합천",
    name: "양파 도매가격",
    value: "1,180",
    unit: "원/kg",
    delta: "-2.1%",
    direction: "down",
    error: "3.7%",
    spark: [1252, 1240, 1228, 1215, 1205, 1205, 1180],
    target: "onion" as ForecastKey
  },
  {
    tag: "예측 · 에너지",
    region: "합천댐",
    name: "수력발전량",
    value: "4.8",
    unit: "GWh",
    delta: "계획대비 94%",
    direction: "down",
    error: "5.2%",
    spark: [5.4, 5.2, 5.1, 4.9, 4.7, 4.9, 4.8],
    target: "hydro" as ForecastKey
  },
  {
    tag: "지수 · 물가",
    region: "전국",
    name: "신선식품물가지수",
    value: "121.7",
    unit: "2020=100",
    delta: "+1.8%",
    direction: "up",
    error: null,
    spark: [118.1, 119.3, 118.7, 119.6, 120.4, 121.1, 121.7],
    target: "cabbage" as ForecastKey
  }
];

export const forecasts = {
  cabbage: {
    label: "강릉 고랭지배추",
    current: "14,200",
    unit: "원 / 10kg망",
    error: "4.1%",
    source: "농림축산식품부 도매시장 거래정보 (강릉 출하분)",
    sub: "강릉 출하 물량 기준 · 2026-08-05 · 전일대비 +6.3%",
    actual: [11900, 12050, 11980, 12200, 12150, 12400, 12300, 12550, 12480, 12700, 12800, 12650, 12900, 13050, 12980, 13200, 13350, 13280, 13100, 13400, 13600, 13520, 13750, 13900, 13820, 14050, 14350, 14180, 14320, 14200],
    predicted: [14380, 14520, 14700, 14850, 15020, 15210, 15400],
    band: [380, 500, 620, 750, 880, 1010, 1140]
  },
  onion: {
    label: "합천 양파",
    current: "1,180",
    unit: "원 / kg",
    error: "3.7%",
    source: "농림축산식품부 도매시장 거래정보 (합천 출하분)",
    sub: "합천 출하 물량 기준 · 2026-08-05 · 전일대비 -2.1%",
    actual: [1310, 1305, 1298, 1302, 1290, 1285, 1292, 1278, 1270, 1275, 1264, 1258, 1262, 1250, 1245, 1252, 1240, 1236, 1228, 1232, 1220, 1215, 1210, 1205, 1198, 1205, 1192, 1188, 1205, 1180],
    predicted: [1172, 1165, 1158, 1152, 1147, 1141, 1136],
    band: [28, 36, 44, 53, 62, 71, 80]
  },
  hydro: {
    label: "수력발전량",
    current: "4.8",
    unit: "GWh / 일",
    error: "5.2%",
    source: "한국수자원공사 합천댐 발전실적 · 저수현황",
    sub: "합천댐 · 2026-08-05 · 계획대비 94%",
    actual: [5.9, 5.8, 6.0, 5.7, 5.6, 5.8, 5.5, 5.4, 5.6, 5.3, 5.2, 5.4, 5.1, 5.0, 5.2, 4.9, 4.8, 5.0, 4.7, 4.6, 4.8, 4.5, 4.7, 4.9, 5.2, 5.4, 5.1, 4.9, 4.7, 4.8],
    predicted: [4.7, 4.6, 4.5, 4.5, 4.4, 4.6, 4.7],
    band: [0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76]
  }
};

export const fireRisk = [
  { name: "강릉", sido: "강원", value: 78, delta: "+5", series: [61, 64, 68, 70, 73, 76, 78] },
  { name: "합천", sido: "경남", value: 61, delta: "+2", series: [52, 54, 55, 58, 60, 59, 61] },
  { name: "고흥", sido: "전남", value: 42, delta: "-1", series: [38, 40, 39, 41, 43, 42, 42] }
];


export const reports = [
  {
    id: "r1",
    title: "고흥 유자·마늘 재배지 관수 차질 확대",
    level: 3,
    levelName: "심각",
    date: "2026-08-04",
    regions: ["고흥", "전남"],
    summary: "고흥 일대 밭작물 재배지에서 관정 수위 저하로 관수 중단 사례가 늘고 있으며, 일부 지역은 급수차 지원이 시작됐습니다.",
    count: 14,
    body: [
      "전남 고흥 일대에서 지속된 강수 부족으로 유자·마늘 재배지의 관수에 차질이 발생하고 있습니다. 지역 농가들은 관정 수위 저하로 하루 중 관수 가능 시간이 크게 줄었다고 밝혔습니다.",
      "군은 급수차를 투입해 긴급 용수를 공급하고 있으며, 밭작물 중에서도 생육 초기 단계 작물의 피해가 두드러진 것으로 나타났습니다.",
      "기상 전망상 향후 2주간 유의미한 강수가 예보되지 않아, 관수 제한 조치가 확대될 가능성이 제기되고 있습니다."
    ],
    keywords: ["관수", "관정", "급수차", "유자", "마늘", "생육지연"],
    pins: [{ name: "고흥", note: "관수 차질 집중 발생 — 유자·마늘 재배지 중심" }],
    mentionedRegions: [
      {
        sidoName: "전남",
        sigunguName: "고흥군",
        sigunguCode: "46770",
        regionCode: "46770",
        regionName: "고흥",
        impactCode: "agriculture",
        impactName: "농업",
        note: "고흥군 농업 부문 관수 차질 언급",
        damageDetail: "관정 수위 저하, 급수차 지원, 유자·마늘 재배지 생육 지연"
      }
    ],
    visualSummary: {
      articleCount: 14,
      sourceCount: 3,
      mentionedRegionCount: 1,
      impactFields: [{ impactCode: "agriculture", impactName: "농업", count: 1 }]
    },
    sources: ["고흥 밭작물 관수 중단 확산", "고흥군 급수차 긴급 투입", "관정 수위 저하로 농가 부담 가중"]
  },
  {
    id: "r2",
    title: "합천댐 저수율 하락, 농업용수 배분 조정 논의",
    level: 2,
    levelName: "보통",
    date: "2026-08-03",
    regions: ["합천", "경남"],
    summary: "합천댐 저수율이 평년 대비 낮은 수준을 유지하면서, 농업용수 배분 순번을 조정하는 방안이 논의되고 있습니다.",
    count: 9,
    body: [
      "경남 합천댐의 저수율이 평년보다 낮은 수준을 이어가면서 농업용수 공급 계획 조정이 검토되고 있습니다.",
      "관계 기관은 저수율 추이를 주 단위로 점검하며, 필요 시 배분 순번 조정과 절수 안내를 병행할 계획이라고 밝혔습니다."
    ],
    keywords: ["저수율", "농업용수", "급수조정", "발전방류", "절수"],
    pins: [{ name: "합천", note: "합천댐 저수율 하락 — 배분 조정 검토" }],
    mentionedRegions: [
      {
        sidoName: "경남",
        sigunguName: "합천군",
        sigunguCode: "48890",
        regionCode: "48890",
        regionName: "합천",
        impactCode: "agriculture",
        impactName: "농업",
        note: "합천군 농업용수 배분 조정 언급",
        damageDetail: "저수율 하락, 농업용수 배분 순번 조정, 절수 안내"
      }
    ],
    visualSummary: {
      articleCount: 9,
      sourceCount: 2,
      mentionedRegionCount: 1,
      impactFields: [{ impactCode: "agriculture", impactName: "농업", count: 1 }]
    },
    sources: ["합천댐 저수율 평년 하회", "농업용수 배분 조정 검토 착수"]
  },
  {
    id: "r3",
    title: "강릉 안반데기 고랭지 채소 생육 지연 관측",
    level: 1,
    levelName: "경미",
    date: "2026-08-01",
    regions: ["강릉", "강원"],
    summary: "안반데기 일대 고랭지 배추 재배지에서 결구가 예년보다 더디다는 관측이 보고됐으나, 현재까지 출하량 영향은 제한적입니다.",
    count: 5,
    body: [
      "강원 강릉 안반데기 일대 고랭지 배추 재배지에서 토양 수분 부족으로 결구가 예년보다 더디게 진행되고 있다는 관측이 보고됐습니다.",
      "다만 현 시점에서는 출하량에 미치는 영향이 제한적이라는 평가가 우세하며, 관계 기관은 관수 지도를 강화하고 있습니다."
    ],
    keywords: ["고랭지", "생육지연", "토양수분", "결구", "배추"],
    pins: [{ name: "강릉", note: "안반데기 고랭지 배추 생육 지연 관측" }],
    mentionedRegions: [
      {
        sidoName: "강원",
        sigunguName: "강릉시",
        sigunguCode: "42150",
        regionCode: "42150",
        regionName: "강릉",
        impactCode: "agriculture",
        impactName: "농업",
        note: "강릉 안반데기 고랭지 채소 생육 지연 언급",
        damageDetail: "토양 수분 부족, 결구 지연, 관수 지도"
      }
    ],
    visualSummary: {
      articleCount: 5,
      sourceCount: 2,
      mentionedRegionCount: 1,
      impactFields: [{ impactCode: "agriculture", impactName: "농업", count: 1 }]
    },
    sources: ["안반데기 고랭지 배추 결구 지연 관측", "고랭지 채소 관수 지도 강화"]
  }
];

export type ApiParam = {
  name: string;
  in: "query" | "path" | "header";
  required: boolean;
  example: string;
  type?: string;
  description?: string;
  defaultValue?: string;
};

export type ApiResponseField = {
  name: string;
  type: string;
  description: string;
};

export type ApiCatalogItem = {
  group: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  name: string;
  description: string;
  params: ApiParam[];
  body?: string;
  responseFields?: ApiResponseField[];
};

export const apiCatalog: ApiCatalogItem[] = [
  {
    group: "농산물",
    method: "GET",
    path: "/api/v1/agrimarket/market-price",
    name: "월간 시장 가격 및 반입량 예측 정보",
    description: "특정 지역의 특정 연월에 대한 농산물 예측 가격, 반입량 및 전년 대비 변동 추이를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 대상 연도 (YYYY)", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 대상 월 (M)", defaultValue: "7" },
      { name: "location", in: "query", required: false, example: "강릉", type: "String", description: "조회 대상 지역명", defaultValue: "강릉" }
    ],
    responseFields: [
      { name: "data.year", type: "String", description: "예측 연도" },
      { name: "data.month", type: "String", description: "예측 월" },
      { name: "data.location", type: "String", description: "지역명" },
      { name: "data.priceInfo", type: "Object", description: "가격 관련 예측 정보 (하한/상한가, 전년평균, 변동률 등)" },
      { name: "data.volumeInfo", type: "Object", description: "반입량 관련 예측 정보 (하한/상한량, 전년평균, 변동률 등)" }
    ]
  },
  {
    group: "농산물",
    method: "GET",
    path: "/api/v1/agrimarket/daily-price",
    name: "일자별 가격 예측 정보",
    description: "특정 연월의 일자별 농산물 가격 예측치와 전년 대비 변동 정보를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 대상 연도 (YYYY)", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 대상 월 (M)", defaultValue: "7" },
      { name: "location", in: "query", required: false, example: "강릉", type: "String", description: "조회 대상 지역명", defaultValue: "강릉" }
    ],
    responseFields: [
      { name: "data.location", type: "String", description: "지역명" },
      { name: "data.item", type: "String", description: "품목명" },
      { name: "data.variety", type: "String", description: "품종명" },
      { name: "data.calendarData", type: "List", description: "일자별 예측 데이터 상세 리스트" },
      { name: "data.calendarData[].predictionDate", type: "LocalDate", description: "예측 기준 일자" },
      { name: "data.calendarData[].predictedPrice", type: "Integer", description: "예측 가격" },
      { name: "data.calendarData[].changeDescription", type: "String", description: "변동 내용 설명" }
    ]
  },
  {
    group: "농산물",
    method: "GET",
    path: "/api/v1/agrimarket/daily-market",
    name: "일간 시장 반입량 및 가격 트렌드",
    description: "특정 연월의 일별 시장 반입량과 평균 도매가격 추이를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 대상 연도 (YYYY)", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 대상 월 (M)", defaultValue: "7" },
      { name: "location", in: "query", required: false, example: "강릉", type: "String", description: "조회 대상 지역명", defaultValue: "강릉" }
    ],
    responseFields: [
      { name: "data.monthlyTrend", type: "List", description: "일별 트렌드 데이터 리스트" },
      { name: "data.monthlyTrend[].trendDate", type: "LocalDate", description: "데이터 기준 일자" },
      { name: "data.monthlyTrend[].marketVolume", type: "Long", description: "시장 반입량" },
      { name: "data.monthlyTrend[].avgWholesalePrice", type: "Integer", description: "평균 도매가격" }
    ]
  },
  {
    group: "신선식품",
    method: "GET",
    path: "/api/v1/freshfood/fresh-vegetable",
    name: "신선 채소 물가지수",
    description: "지역별 신선 채소 물가지수 현황과 등급별 요약 통계를 제공합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 연도" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 월" }
    ],
    responseFields: [
      { name: "data.baseDate", type: "String", description: "데이터 기준 일자 (YYYY-MM-DD)" },
      { name: "data.provinceData", type: "List", description: "지역별 물가지수 및 등급 정보" },
      { name: "data.provinceData[].code", type: "Number", description: "지역 코드" },
      { name: "data.provinceData[].province", type: "String", description: "시도명" },
      { name: "data.provinceData[].freshVegetableIndex", type: "Number", description: "신선 채소 물가지수" },
      { name: "data.provinceData[].grade", type: "String", description: "등급" },
      { name: "data.summary", type: "Object", description: "등급별 지역 수 카운트 (veryHigh, high, normal, low, veryLow)" }
    ]
  },
  {
    group: "신선식품",
    method: "GET",
    path: "/api/v1/freshfood/fresh-fruit",
    name: "신선 과실 물가지수",
    description: "지역별 신선 과실 물가지수 현황과 등급별 요약 통계를 제공합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 연도" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 월" }
    ],
    responseFields: [
      { name: "data.baseDate", type: "String", description: "데이터 기준 일자 (YYYY-MM-DD)" },
      { name: "data.provinceData", type: "List", description: "지역별 물가지수 및 등급 정보" },
      { name: "data.provinceData[].freshFruitIndex", type: "Number", description: "신선 과실 물가지수" },
      { name: "data.summary", type: "Object", description: "등급별 지역 수 카운트 (veryHigh, high, normal, low, veryLow)" }
    ]
  },
  {
    group: "수력발전",
    method: "GET",
    path: "/api/v1/hydropower/monthly-predict",
    name: "댐별 월간 예측 정보",
    description: "특정 댐의 월간 예상 발전량 및 예상 저수량 범위를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 대상 연도 (YYYY)", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 대상 월 (M)", defaultValue: "7" },
      { name: "damName", in: "query", required: false, example: "소양강", type: "String", description: "조회 대상 댐 명칭", defaultValue: "소양강" }
    ],
    responseFields: [
      { name: "data.damName", type: "String", description: "댐 이름" },
      { name: "data.damCode", type: "String", description: "댐 코드" },
      { name: "data.predictedPowerGenerationDto", type: "Object", description: "예상 발전량 정보 (하한/상한)" },
      { name: "data.predictedWaterStorageDto", type: "Object", description: "예상 저수량 정보 (하한/상한)" }
    ]
  },
  {
    group: "수력발전",
    method: "GET",
    path: "/api/v1/hydropower/monthly-comparison",
    name: "댐별 월간 비교 데이터",
    description: "특정 댐의 전년 동월 및 전월 대비 발전량, 평균 저수량 비교 데이터를 제공합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 대상 연도 (YYYY)", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 대상 월 (M)", defaultValue: "7" },
      { name: "damName", in: "query", required: false, example: "소양강", type: "String", description: "조회 대상 댐 명칭", defaultValue: "소양강" }
    ],
    responseFields: [
      { name: "data.damName", type: "String", description: "댐 이름" },
      { name: "data.damCode", type: "String", description: "댐 코드" },
      { name: "data.hydroGenerationLastYearMonthDto", type: "Object", description: "전년 동월 대비 발전량 실적 및 변동률" },
      { name: "data.hydroGenerationLastMonthDto", type: "Object", description: "전월 대비 발전량 실적 및 변동률" },
      { name: "data.averageWaterStorageLastMonthDto", type: "Object", description: "전월 대비 평균 저수량 및 변동률" }
    ]
  },
  {
    group: "수력발전",
    method: "GET",
    path: "/api/v1/hydropower/monthly-generation",
    name: "댐별 월간 발전 실적",
    description: "선택한 연도의 월별 계획 발전량 대비 실제 발전량 실적 리스트를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 대상 연도 (YYYY)", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 대상 월 (M)", defaultValue: "7" },
      { name: "damName", in: "query", required: false, example: "소양강", type: "String", description: "조회 대상 댐 명칭", defaultValue: "소양강" }
    ],
    responseFields: [
      { name: "data.damName", type: "String", description: "댐 이름" },
      { name: "data.monthlyGenerationDto", type: "List", description: "월별 발전 실적 리스트" },
      { name: "data.monthlyGenerationDto[].year", type: "String", description: "실적 연도" },
      { name: "data.monthlyGenerationDto[].month", type: "String", description: "실적 월" },
      { name: "data.monthlyGenerationDto[].plannedMwh", type: "Integer", description: "계획 발전량 (MWh)" },
      { name: "data.monthlyGenerationDto[].actualMwh", type: "Integer", description: "실제 발전량 (MWh)" }
    ]
  },
  {
    group: "수력발전",
    method: "GET",
    path: "/api/v1/hydropower/monthly-reservoir",
    name: "댐별 월간 저수 현황",
    description: "선택한 연도의 월별 평균 수위 및 저수량 현황 리스트를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "조회 대상 연도 (YYYY)", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "조회 대상 월 (M)", defaultValue: "7" },
      { name: "damName", in: "query", required: false, example: "소양강", type: "String", description: "조회 대상 댐 명칭", defaultValue: "소양강" }
    ],
    responseFields: [
      { name: "data.damName", type: "String", description: "댐 이름" },
      { name: "data.damCode", type: "String", description: "댐 코드" },
      { name: "data.monthlyReservoirStatusDto", type: "List", description: "월별 저수 현황 리스트" },
      { name: "data.monthlyReservoirStatusDto[].waterLevelElm", type: "Integer", description: "평균 수위 (EL.m)" },
      { name: "data.monthlyReservoirStatusDto[].waterStorageMcm", type: "Integer", description: "저수량 (백만m3)" }
    ]
  },
  {
    group: "산불위험",
    method: "GET",
    path: "/api/v1/wild-fire-risk/forecast",
    name: "산불 위험 지수 예보",
    description: "특정 일시 기준 향후 3일간의 시군구별 산불 위험 등급 예보를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "연도", defaultValue: "2024" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "월", defaultValue: "7" },
      { name: "day", in: "query", required: false, example: "1", type: "String", description: "일", defaultValue: "1" }
    ],
    responseFields: [
      { name: "data", type: "List", description: "3일치 예보 데이터 리스트" },
      { name: "data[].targetDate", type: "String", description: "예보 타겟 일자" },
      { name: "data[].targetTime", type: "String", description: "예보 타겟 시간" },
      { name: "data[].regionData", type: "List", description: "지역별 위험 지수 및 등급 (very_high, high, moderate, low)" },
      { name: "data[].regionData[].regionCode", type: "String", description: "시군구 지역 코드" },
      { name: "data[].regionData[].riskLevel", type: "String", description: "위험 등급" },
      { name: "data[].regionData[].indexValue", type: "Number", description: "위험 지수" }
    ]
  },
  {
    group: "산불위험",
    method: "GET",
    path: "/api/v1/wild-fire-risk/news-article",
    name: "산불 관련 뉴스 기사",
    description: "특정 연월에 발생한 산불 관련 주요 뉴스 기사 및 감성 분석 키워드를 조회합니다.",
    params: [
      { name: "year", in: "query", required: false, example: "2024", type: "String", description: "연도" },
      { name: "month", in: "query", required: false, example: "7", type: "String", description: "월" }
    ],
    responseFields: [
      { name: "data[].id", type: "int", description: "고유 ID" },
      { name: "data[].publishDate", type: "String", description: "발행 일자" },
      { name: "data[].title", type: "String", description: "기사 제목" },
      { name: "data[].linkUrl", type: "String", description: "기사 원문 링크" },
      { name: "data[].provinceName", type: "String", description: "광역지자체명" },
      { name: "data[].cityName", type: "String", description: "기초지자체명" },
      { name: "data[].category", type: "String", description: "뉴스 카테고리" },
      { name: "data[].sentiment", type: "String", description: "감정 분류 (긍정/부정/중립)" },
      { name: "data[].keywords", type: "String", description: "기사 핵심 키워드" }
    ]
  }
];
