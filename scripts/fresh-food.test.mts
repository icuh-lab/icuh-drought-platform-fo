import {
  buildFreshFoodIndex,
  freshFoodGradeClass,
  freshFoodGradeLabel,
  monthWindow,
  normalizeFreshFoodMonth,
  shortProvinceName,
  topAndBottomProvinces,
  gradeCounts,
  provinceBarRatio,
  freshFoodStatusText,
  formatIndexValue,
  type FreshFoodMonth
} from "../lib/fresh-food";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
  if (!ok) failed++;
}
function checkJson(name: string, actual: unknown, expected: unknown) {
  check(name, JSON.stringify(actual), JSON.stringify(expected));
}

// --- 시도명 축약 ---
// 접미사만 잘라내면 "경상남도" 가 "경상남" 이 된다. 통용 약칭은 규칙이 아니라 표로 잡는다.
check("경상남도는 경남", shortProvinceName("경상남도"), "경남");
check("충청북도는 충북", shortProvinceName("충청북도"), "충북");
check("전라남도는 전남", shortProvinceName("전라남도"), "전남");
check("강원특별자치도는 강원", shortProvinceName("강원특별자치도"), "강원");
check("서울특별시는 서울", shortProvinceName("서울특별시"), "서울");
check("세종특별자치시는 세종", shortProvinceName("세종특별자치시"), "세종");
// 2026-06 응답부터 등장한 신설 시도. 표에 없어도 접미사 규칙으로 버텨야 한다.
check("전남광주통합특별시는 전남광주", shortProvinceName("전남광주통합특별시"), "전남광주");
check("전국은 그대로", shortProvinceName("전국"), "전국");
check("모르는 이름은 원본 유지", shortProvinceName("가나다"), "가나다");

// --- 한 달치 정규화 ---
const july = normalizeFreshFoodMonth(
  {
    baseDate: "2026-07-01",
    provinceData: [
      { code: 32, province: "강원특별자치도", freshVegetableIndex: 101.81, grade: "normal" },
      { code: 99, province: "전국", freshVegetableIndex: 99.94, grade: "normal" },
      { code: 29, province: "세종특별자치시", freshVegetableIndex: 105.37, grade: "high" }
    ],
    summary: { normal: 2, high: 1 }
  },
  "vegetable"
);

check("baseDate 앞 7자리가 기준월", july.baseMonth, "2026-07");
// API 가 code 99 로 전국을 직접 준다. 시도 평균으로 갈음하면 값이 어긋난다.
check("전국은 code 99 를 그대로 쓴다", july.national, 99.94);
check("전국 행은 시도 목록에서 빠진다", july.provinces.length, 2);
check("시도 목록에 전국이 없다", july.provinces.some((p) => p.code === 99), false);
check("시도 표시명은 축약된다", july.provinces[0].name, "강원");
check("원본 이름도 남는다", july.provinces[0].fullName, "강원특별자치도");
check("등급이 함께 온다", july.provinces[1].grade, "high");

// 2025-08 은 216건인데 고유 19행이 반복된 것이다. code 로 접어야 순위가 뒤틀리지 않는다.
const duplicated = normalizeFreshFoodMonth(
  {
    baseDate: "2025-08-01",
    provinceData: [
      { code: 11, province: "서울특별시", freshVegetableIndex: 120.1, grade: "high" },
      { code: 11, province: "서울특별시", freshVegetableIndex: 120.1, grade: "high" },
      { code: 99, province: "전국", freshVegetableIndex: 124.64, grade: "high" },
      { code: 99, province: "전국", freshVegetableIndex: 124.64, grade: "high" }
    ],
    summary: { veryHigh: 216 }
  },
  "vegetable"
);
check("중복 행은 code 로 접는다", duplicated.provinces.length, 1);
check("중복돼도 전국값은 하나", duplicated.national, 124.64);

// 값이 null 인 시도는 막대를 그릴 수 없다.
const withNull = normalizeFreshFoodMonth(
  {
    baseDate: "2026-07-01",
    provinceData: [
      { code: 11, province: "서울특별시", freshVegetableIndex: null, grade: "normal" },
      { code: 99, province: "전국", freshVegetableIndex: 99.94, grade: "normal" }
    ],
    summary: {}
  },
  "vegetable"
);
check("값 없는 시도는 제외", withNull.provinces.length, 0);

// 과일은 필드명이 다르다. 같은 함수가 kind 로 갈라야 한다.
const fruit = normalizeFreshFoodMonth(
  {
    baseDate: "2026-07-01",
    provinceData: [
      { code: 99, province: "전국", freshFruitIndex: 143.58, grade: "veryHigh" },
      { code: 32, province: "강원특별자치도", freshFruitIndex: 151.96, grade: "veryHigh" }
    ],
    summary: { veryHigh: 2 }
  },
  "fruit"
);
check("과일은 freshFruitIndex 를 읽는다", fruit.national, 143.58);
check("과일 시도값도 읽힌다", fruit.provinces[0].value, 151.96);

// 2026-08 처럼 항목이 아예 없는 달.
const empty = normalizeFreshFoodMonth({ baseDate: "2026-08-01", provinceData: [], summary: {} }, "vegetable");
check("빈 달은 전국이 null", empty.national, null);
check("빈 달은 시도도 없다", empty.provinces.length, 0);

// --- 조회할 월 목록 ---
checkJson("13개월 창의 길이", monthWindow(2026, 7, 13).length, 13);
checkJson("창의 시작은 전년 동월", monthWindow(2026, 7, 13)[0], { year: 2025, month: 7 });
checkJson("창의 끝은 선택 월", monthWindow(2026, 7, 13)[12], { year: 2026, month: 7 });
// 연초를 고르면 창이 해를 넘어간다.
checkJson("1월 기준이면 전해 1월부터", monthWindow(2026, 1, 13)[0], { year: 2025, month: 1 });
checkJson("연 경계 직전 달", monthWindow(2026, 1, 13)[11], { year: 2025, month: 12 });
checkJson("창 크기 1", monthWindow(2026, 7, 1), [{ year: 2026, month: 7 }]);

// --- 시계열과 증감률 ---
function month(baseMonth: string, national: number | null): FreshFoodMonth {
  return { baseMonth, national, provinces: [], summary: {} };
}

const series = buildFreshFoodIndex(
  [
    month("2025-07", 104.44),
    month("2025-08", 124.64),
    month("2026-06", 100.84),
    month("2026-07", 99.94)
  ],
  "2026-07",
  "vegetable"
);

check("대표값은 선택 월의 전국값", series?.value, 99.94);
check("기준월이 유지된다", series?.baseMonth, "2026-07");
// 100.84 -> 99.94 = -0.89%
check("전월대비는 직전 달과 비교", series?.monthOverMonthRate?.toFixed(2), "-0.89");
// 104.44 -> 99.94 = -4.31%
check("전년동월대비는 12개월 전과 비교", series?.yearOverYearRate?.toFixed(2), "-4.31");
check("포인트는 값 있는 달만", series?.points.length, 4);
check("포인트는 월 오름차순", series?.points[0].baseMonth, "2025-07");

// 직전 달이 비어 있으면 전월대비를 만들 수 없다. 그 자리에 다른 달을 끌어다 쓰면 거짓말이 된다.
const gapped = buildFreshFoodIndex([month("2026-05", 101.89), month("2026-07", 99.94)], "2026-07", "vegetable");
check("직전 달이 없으면 전월대비는 null", gapped?.monthOverMonthRate, null);
check("전년 동월이 없으면 전년대비도 null", gapped?.yearOverYearRate, null);
check("빈 달은 포인트에서 빠진다", gapped?.points.length, 2);

// 선택 월 자체에 값이 없으면(2026-08) 카드를 그릴 수 없다.
const noBase = buildFreshFoodIndex([month("2026-07", 99.94), month("2026-08", null)], "2026-08", "vegetable");
check("선택 월 값이 없으면 null 을 돌려준다", noBase, null);
check("아무 달도 없으면 null", buildFreshFoodIndex([], "2026-07", "vegetable"), null);

// --- 상·하위 추출 ---
const provinces = [
  { code: 1, name: "가", fullName: "가", value: 105.4, grade: "high" as const },
  { code: 2, name: "나", fullName: "나", value: 101.8, grade: "normal" as const },
  { code: 3, name: "다", fullName: "다", value: 100.3, grade: "normal" as const },
  { code: 4, name: "라", fullName: "라", value: 96.8, grade: "normal" as const },
  { code: 5, name: "마", fullName: "마", value: 95.8, grade: "low" as const }
];
const ranked = topAndBottomProvinces(provinces, 2);
// 펼쳤을 때 쓸 전체 목록. 같은 정렬을 두 번 하지 않도록 여기서 함께 돌려준다.
checkJson("전체 목록도 값 내림차순", ranked.all.map((p) => p.name), ["가", "나", "다", "라", "마"]);
check("전체 목록은 하나도 빠지지 않는다", ranked.all.length, provinces.length);
// 접힌 목록과 펼친 목록의 순서가 어긋나면 펼칠 때 줄이 튄다.
checkJson("접힘 = 펼침의 앞뒤 조각", [...ranked.top, ...ranked.bottom].map((p) => p.name), ["가", "나", "라", "마"]);
checkJson("상위는 값이 큰 순", ranked.top.map((p) => p.name), ["가", "나"]);
// 상위 -> 생략 -> 하위가 이어진 하나의 순위표로 읽혀야 한다. 하위만 오름차순이면
// 생략 줄 다음에 최하위가 튀어나오고 막대가 거꾸로 길어진다.
checkJson("하위도 내림차순으로 이어진다", ranked.bottom.map((p) => p.name), ["라", "마"]);
check("가운데가 생략됐는지 알려준다", ranked.omitted, 1);

// 개수가 적으면 겹쳐서 같은 시도를 두 번 보여주면 안 된다.
const small = topAndBottomProvinces(provinces.slice(0, 3), 2);
checkJson("총 3개면 상위 2개만", small.top.map((p) => p.name), ["가", "나"]);
checkJson("남은 1개가 하위", small.bottom.map((p) => p.name), ["다"]);
checkJson("하위 순서가 값 내림차순", topAndBottomProvinces(provinces, 3).bottom.map((p) => p.value), [96.8, 95.8]);
check("겹치지 않으면 생략 0", small.omitted, 0);

const tiny = topAndBottomProvinces(provinces.slice(0, 1), 2);
checkJson("1개뿐이면 상위에만", tiny.top.map((p) => p.name), ["가"]);
check("하위는 비어 있다", tiny.bottom.length, 0);

// --- 등급 집계 ---
// 응답의 summary 는 전국(code 99) 행까지 세서 시도 수보다 1 크다. 화면이 "19곳" 이라
// 쓰면 실제 시도 18곳과 어긋나므로 시도 목록에서 직접 센다.
checkJson("시도 목록에서 등급을 센다", gradeCounts(provinces), [
  { grade: "high", count: 1 },
  { grade: "normal", count: 3 },
  { grade: "low", count: 1 }
]);
checkJson("없는 등급은 빠진다", gradeCounts([provinces[0]]), [{ grade: "high", count: 1 }]);
checkJson("빈 목록은 빈 배열", gradeCounts([]), []);

// --- 막대 길이 ---
// 지수는 95~110 사이에 몰려 있다. 0 을 바닥으로 그리면 막대가 전부 같은 길이로 보인다.
check("최대값은 꽉 찬다", provinceBarRatio(110, 95, 110), 1);
check("최소값도 눈에 보이게 남긴다", provinceBarRatio(95, 95, 110), 0.15);
check("가운데는 절반쯤", provinceBarRatio(102.5, 95, 110).toFixed(3), "0.575");
// 시도가 하나뿐이거나 값이 전부 같으면 0 으로 나누게 된다.
check("폭이 0 이면 꽉 찬 막대", provinceBarRatio(100, 100, 100), 1);

// --- 등급 표기 ---
check("veryHigh 라벨", freshFoodGradeLabel("veryHigh"), "매우높음");
check("high 라벨", freshFoodGradeLabel("high"), "높음");
check("normal 라벨", freshFoodGradeLabel("normal"), "보통");
check("low 라벨", freshFoodGradeLabel("low"), "낮음");
// 등급이 4단계인데 기존 배지 클래스는 lv1~lv3 뿐이라 낮음 전용 칸이 필요하다.
check("veryHigh 는 lv3", freshFoodGradeClass("veryHigh"), "lv3");
check("high 는 lv2", freshFoodGradeClass("high"), "lv2");
check("normal 은 lv1", freshFoodGradeClass("normal"), "lv1");
check("low 는 lv0", freshFoodGradeClass("low"), "lv0");

// --- 상태 문구 ---
// 이 카드는 목업으로 폴백하지 않는다. "목업 표시" 라고 쓰면 없는 화면을 안내하는 셈이다.
check("성공하면 기준월을 밝힌다", freshFoodStatusText("success", "2026-07"), "API 갱신 2026-07");
check("기준월을 모르면 최신", freshFoodStatusText("success", null), "API 갱신 최신");
check("불러오는 중", freshFoodStatusText("loading", null), "13개월 불러오는 중");
// 조회는 됐는데 그 달이 비어 있는 경우(2026-08)와 아예 못 부른 경우는 다른 말이어야 한다.
check("빈 달", freshFoodStatusText("empty", null), "해당 월 데이터 없음");
check("오류", freshFoodStatusText("error", null), "API 오류 · 데이터를 불러오지 못했습니다");

// --- 지수 표기 ---
// 소수 1자리로 통일해야 한 열에 세로로 늘어놓았을 때 자릿수가 흔들리지 않는다.
check("소수 1자리", formatIndexValue(155.38), "155.4");
check("정수여도 자리를 채운다", formatIndexValue(139), "139.0");
check("한 자리는 그대로", formatIndexValue(99.9), "99.9");
check("반올림", formatIndexValue(104.57), "104.6");

process.exit(failed === 0 ? 0 : 1);
