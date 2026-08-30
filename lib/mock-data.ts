import type { DroughtReportDetailView } from "@/lib/api-client";

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


export const droughtReportFallback: DroughtReportDetailView[] = [
  {
    reportYm: "2026-05",
    headlineGrade: "심각",
    generatedAt: "2026-08-30T15:39:00",
    articleCount: 748,
    detectedSidoCount: 16,
    detectedSidoNames: ["강원", "경남", "전남"],
    nationwide: [
      { sido: "강원", detected: true, maxGrade: "심각" },
      { sido: "경남", detected: true, maxGrade: "경계" },
      { sido: "전남", detected: true, maxGrade: "경계" }
    ],
    regions: [
      {
        sido: "강원",
        sigungu: "강릉",
        impactFields: [
          {
            impactCode: "A1",
            impactName: "물 공급",
            grade: "심각",
            gradeFinalized: false,
            articleCount: 12,
            representativeTitle: "강릉 상수원 저수율 20%대 진입",
            representativeLink: null,
            keywords: ["저수율", "제한급수"],
            relevanceFlag: false,
            continuityCount: 3,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          },
          {
            impactCode: "A2",
            impactName: "농업",
            grade: "경계",
            gradeFinalized: false,
            articleCount: 7,
            representativeTitle: "영동지역 밭작물 가뭄 피해 확산",
            representativeLink: null,
            keywords: ["밭작물", "관수중단"],
            relevanceFlag: false,
            continuityCount: 1,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          }
        ]
      },
      {
        sido: "경남",
        sigungu: "합천",
        impactFields: [
          {
            impactCode: "A5",
            impactName: "산업",
            grade: "경계",
            gradeFinalized: false,
            articleCount: 5,
            representativeTitle: "합천댐 저수율 하락에 산업단지 비상",
            representativeLink: null,
            keywords: ["합천댐", "산단"],
            relevanceFlag: false,
            continuityCount: 2,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          }
        ]
      },
      {
        sido: "전남",
        sigungu: "고흥",
        impactFields: [
          {
            impactCode: "A4",
            impactName: "수산업",
            grade: "경계",
            gradeFinalized: false,
            articleCount: 4,
            representativeTitle: "고흥 저수지 바닥 드러나 양식장 피해",
            representativeLink: null,
            keywords: ["저수지", "양식장"],
            relevanceFlag: false,
            continuityCount: 1,
            gradeLowerBound: null,
            nextGradeLowerBound: null
          }
        ]
      }
    ],
    detailLoaded: true
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
