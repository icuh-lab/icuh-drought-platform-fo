/**
 * 신선식품물가지수(채소·과일)의 순수 변환 로직.
 *
 * open-api 는 월 1건씩만 준다. 추세선은 프론트가 여러 달을 모아 만들고, 증감률도
 * 그 시계열에서 계산한다. 네트워크는 api-client 가 맡고 여기는 값만 다룬다.
 */

export type FreshFoodKind = "vegetable" | "fruit";
export type FreshFoodGrade = "low" | "normal" | "high" | "veryHigh";

/** 응답의 시도 한 줄. 지수 필드명이 채소·과일에 따라 달라 인덱스 시그니처로 받는다. */
export type RawFreshFoodProvince = {
  code: number;
  province: string;
  grade: string;
  freshVegetableIndex?: number | null;
  freshFruitIndex?: number | null;
};

export type RawFreshFoodMonth = {
  baseDate: string;
  provinceData: RawFreshFoodProvince[];
  summary: Record<string, number>;
};

export type FreshFoodProvince = {
  code: number;
  /** 화면 표시용 약칭 */
  name: string;
  /** 응답 원본 이름 */
  fullName: string;
  value: number;
  grade: FreshFoodGrade;
};

export type FreshFoodMonth = {
  /** "YYYY-MM" */
  baseMonth: string;
  /** 전국(code 99) 값. 시도 평균이 아니다. */
  national: number | null;
  provinces: FreshFoodProvince[];
  summary: Record<string, number>;
};

export type FreshFoodPoint = {
  baseMonth: string;
  value: number;
};

export type FreshFoodIndex = {
  kind: FreshFoodKind;
  baseMonth: string;
  value: number;
  monthOverMonthRate: number | null;
  yearOverYearRate: number | null;
  points: FreshFoodPoint[];
  provinces: FreshFoodProvince[];
  summary: Record<string, number>;
};

/** 전국 합계 행의 코드. 시도가 아니라 별도 항목이다. */
const NATIONAL_CODE = 99;

/**
 * 접미사만 잘라내면 "경상남도" 가 "경상남" 이 된다. 통용 약칭은 규칙으로 안 나오므로
 * 표로 잡고, 표에 없는 신설 시도만 접미사 규칙으로 넘긴다.
 */
const PROVINCE_SHORT_NAMES: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전북특별자치도: "전북",
  전라북도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주"
};

/** 표에 없는 이름에서 떼어낼 행정구역 접미사. 긴 것부터 시도해야 "통합특별시" 가 먼저 잡힌다. */
const PROVINCE_SUFFIXES = ["통합특별자치시", "통합특별시", "특별자치도", "특별자치시", "특별시", "광역시", "자치도", "자치시"];

export function shortProvinceName(fullName: string) {
  const mapped = PROVINCE_SHORT_NAMES[fullName];
  if (mapped) return mapped;

  for (const suffix of PROVINCE_SUFFIXES) {
    if (fullName.endsWith(suffix) && fullName.length > suffix.length) {
      return fullName.slice(0, -suffix.length);
    }
  }

  return fullName;
}

function normalizeGrade(value: string): FreshFoodGrade {
  if (value === "veryHigh" || value === "very_high" || value === "very-high") return "veryHigh";
  if (value === "high") return "high";
  if (value === "low") return "low";
  return "normal";
}

export function freshFoodGradeLabel(grade: FreshFoodGrade) {
  if (grade === "veryHigh") return "매우높음";
  if (grade === "high") return "높음";
  if (grade === "low") return "낮음";
  return "보통";
}

/** 기존 배지 클래스는 lv1~lv3 뿐이라 "낮음" 자리로 lv0 을 새로 쓴다. */
export function freshFoodGradeClass(grade: FreshFoodGrade) {
  if (grade === "veryHigh") return "lv3";
  if (grade === "high") return "lv2";
  if (grade === "low") return "lv0";
  return "lv1";
}

function readIndexValue(province: RawFreshFoodProvince, kind: FreshFoodKind) {
  const value = kind === "fruit" ? province.freshFruitIndex : province.freshVegetableIndex;
  return typeof value === "number" ? value : null;
}

/**
 * 한 달치 응답을 화면이 쓰는 모양으로 바꾼다.
 *
 * 같은 code 가 여러 번 오는 달이 있다(2025-08 은 19 행이 216 건으로 부풀어 있다).
 * 접지 않으면 순위와 등급 집계가 통째로 뒤틀린다.
 */
export function normalizeFreshFoodMonth(raw: RawFreshFoodMonth, kind: FreshFoodKind): FreshFoodMonth {
  const seen = new Set<number>();
  let national: number | null = null;
  const provinces: FreshFoodProvince[] = [];

  for (const row of raw.provinceData) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);

    const value = readIndexValue(row, kind);
    if (value === null) continue;

    if (row.code === NATIONAL_CODE) {
      national = value;
      continue;
    }

    provinces.push({
      code: row.code,
      name: shortProvinceName(row.province),
      fullName: row.province,
      value,
      grade: normalizeGrade(row.grade)
    });
  }

  return {
    baseMonth: raw.baseDate.slice(0, 7),
    national,
    provinces,
    summary: raw.summary ?? {}
  };
}

/** 선택 월을 오른쪽 끝으로 두고 과거 방향으로 `count` 개월을 센다. */
export function monthWindow(year: number, month: number, count: number) {
  const window: { year: number; month: number }[] = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    // 0-based 로 내렸다가 되돌려야 연 경계가 자연히 넘어간다.
    const index = year * 12 + (month - 1) - offset;
    window.push({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }

  return window;
}

function shiftMonth(baseMonth: string, offset: number) {
  const [year, month] = baseMonth.split("-").map(Number);
  const index = year * 12 + (month - 1) + offset;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function rateOfChange(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * 여러 달을 모아 대표값·증감률·추세선을 만든다.
 *
 * 비교 대상 달이 비어 있으면 증감률은 null 이다. 가장 가까운 다른 달로 대신하면
 * "전월대비" 라는 라벨이 거짓이 된다.
 */
export function buildFreshFoodIndex(months: FreshFoodMonth[], baseMonth: string, kind: FreshFoodKind): FreshFoodIndex | null {
  const byMonth = new Map<string, FreshFoodMonth>();
  for (const month of months) byMonth.set(month.baseMonth, month);

  const base = byMonth.get(baseMonth);
  if (!base || base.national === null) return null;

  const valueAt = (key: string) => byMonth.get(key)?.national ?? undefined;

  return {
    kind,
    baseMonth,
    value: base.national,
    monthOverMonthRate: rateOfChange(base.national, valueAt(shiftMonth(baseMonth, -1))),
    yearOverYearRate: rateOfChange(base.national, valueAt(shiftMonth(baseMonth, -12))),
    points: months
      .filter((month): month is FreshFoodMonth & { national: number } => month.national !== null)
      .map((month) => ({ baseMonth: month.baseMonth, value: month.national }))
      .sort((left, right) => left.baseMonth.localeCompare(right.baseMonth)),
    provinces: base.provinces,
    summary: base.summary
  };
}

/**
 * 카드에 붙일 상태 문구.
 *
 * 다른 지표와 달리 이 카드는 목업으로 폴백하지 않는다. 시계열과 시도 순위까지
 * 지어내면 화면이 없는 데이터를 있는 것처럼 보여주게 된다. 그래서 "목업 표시" 가
 * 아니라 무엇이 없는지를 밝힌다.
 */
export function freshFoodStatusText(status: "loading" | "success" | "empty" | "error", latestDate: string | null) {
  if (status === "success") return `API 갱신 ${latestDate ?? "최신"}`;
  if (status === "loading") return "13개월 불러오는 중";
  // 조회는 됐는데 그 달이 비어 있는 것(2026-08)과 아예 못 부른 것은 다른 상황이다.
  if (status === "empty") return "해당 월 데이터 없음";
  return "API 오류 · 데이터를 불러오지 못했습니다";
}

/**
 * 지수 표기.
 *
 * 소수 1자리로 고정한다. 공용 숫자 포맷터는 최대 자릿수만 정해서 139.0 이 "139" 로
 * 나오는데, 한 열에 세로로 늘어놓으면 그 줄만 자릿수가 어긋나 보인다.
 */
export function formatIndexValue(value: number) {
  return value.toFixed(1);
}

/** 가장 짧은 막대도 이만큼은 남긴다. 0 이 되면 이름만 뜬 빈 줄로 보인다. */
const MIN_BAR_RATIO = 0.15;

/**
 * 막대 길이 비율.
 *
 * 지수는 95~110 사이에 몰려 있어서 0 을 바닥으로 잡으면 모든 막대가 같은 길이로
 * 보인다. 그 달의 최소~최대를 양 끝으로 늘려야 지역 차이가 드러난다.
 */
export function provinceBarRatio(value: number, min: number, max: number) {
  if (max <= min) return 1;
  return MIN_BAR_RATIO + (1 - MIN_BAR_RATIO) * ((value - min) / (max - min));
}

/** 심각한 쪽이 앞에 오도록 고정한다. */
const GRADE_ORDER: FreshFoodGrade[] = ["veryHigh", "high", "normal", "low"];

/**
 * 등급별 시도 수.
 *
 * 응답의 `summary` 를 쓰지 않는 이유는 그쪽이 전국(code 99) 행까지 세기 때문이다.
 * 그대로 표시하면 시도 수보다 하나 많은 숫자가 화면에 나온다.
 */
export function gradeCounts(provinces: FreshFoodProvince[]) {
  return GRADE_ORDER.map((grade) => ({
    grade,
    count: provinces.filter((province) => province.grade === grade).length
  })).filter((entry) => entry.count > 0);
}

/**
 * 19 개 시도를 다 늘어놓는 대신 양 끝만 보여준다. 가운데가 몇 개 잘렸는지도 함께
 * 돌려줘 화면이 "생략됨" 을 밝힐 수 있게 한다.
 */
export function topAndBottomProvinces(provinces: FreshFoodProvince[], count: number) {
  const sorted = [...provinces].sort((left, right) => right.value - left.value);
  const top = sorted.slice(0, count);
  // 상위에 이미 들어간 것을 하위에 또 넣으면 같은 시도가 두 번 나온다.
  const rest = sorted.slice(top.length);
  // 정렬을 뒤집지 않는다. 상위 -> 생략 -> 하위가 이어진 하나의 순위표로 읽혀야 한다.
  const bottom = rest.slice(-count);

  // all 은 펼쳤을 때 쓴다. 같은 정렬을 화면에서 다시 하지 않도록 여기서 함께 넘긴다.
  return { all: sorted, top, bottom, omitted: rest.length - bottom.length };
}
