import { readFileSync } from "node:fs";
import { canonicalRegionCode, parentCityCode, sidoName, type FireRegionMap } from "../lib/fire-region";
import { FIRE_REGION_NAMES } from "../lib/fire-region-names";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${actual}, want ${expected})`);
  if (!ok) failed++;
}

// --- 일반구 -> 시 병합 ---
check("수원 장안구는 수원시로", canonicalRegionCode("41111"), "41110");
check("창원 마산회원구도 창원시로", canonicalRegionCode("48127"), "48120");
check("청주 청원구도 청주시로", canonicalRegionCode("43114"), "43110");
check("시 코드 자체는 그대로", canonicalRegionCode("41110"), "41110");

// 끝자리가 0 이 아니어도 자치구는 합치면 안 된다. 규칙이 아니라 목록으로 판단하는 이유.
check("서울 광진구는 자치구라 그대로", canonicalRegionCode("11215"), "11215");
check("서울 강북구도 그대로", canonicalRegionCode("11305"), "11305");
check("서울 금천구도 그대로", canonicalRegionCode("11545"), "11545");
check("광진구는 상위 시가 없다", parentCityCode("11215"), null);

// --- 행정구역 개편 ---
check("강릉시는 강원특별자치도 코드로", canonicalRegionCode("42150"), "51150");
check("양양군도 마찬가지", canonicalRegionCode("42830"), "51830");
check("군위군은 경북에서 대구로", canonicalRegionCode("47720"), "27720");

// --- 시도 이름 ---
check("서울", sidoName("11110"), "서울");
check("강원특별자치도도 강원", sidoName("51150"), "강원");
check("옛 강원 코드도 강원", sidoName("42150"), "강원");
check("군위군은 대구", sidoName("27720"), "대구");
check("합천군은 경남", sidoName("48890"), "경남");
check("세종", sidoName("36110"), "세종");
check("제주", sidoName("50110"), "제주");
check("모르는 코드는 빈 문자열", sidoName("99999"), "");

// --- 운영 API 가 주는 코드를 빠짐없이 덮는가 ---
// 이름이나 경계가 하나라도 비면 화면에 코드가 그대로 노출되거나 지도에 구멍이 난다.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/fire-region-codes.json", import.meta.url), "utf8")) as {
  codes: string[];
};
const geo = JSON.parse(readFileSync(new URL("../public/korea-sigungu.json", import.meta.url), "utf8")) as FireRegionMap;

check("픽스처는 운영에서 받은 181 개", fixture.codes.length, 181);

const missingName = fixture.codes.filter((code) => !FIRE_REGION_NAMES[code]);
check("이름 없는 코드 없음", missingName.length, 0);
if (missingName.length > 0) console.log("   이름 누락:", missingName.join(", "));

const missingPath = fixture.codes.filter((code) => !geo.paths[code]);
check("경계 없는 코드 없음", missingPath.length, 0);
if (missingPath.length > 0) console.log("   경계 누락:", missingPath.join(", "));

const missingSido = fixture.codes.filter((code) => sidoName(code) === "");
check("시도 못 붙이는 코드 없음", missingSido.length, 0);
if (missingSido.length > 0) console.log("   시도 누락:", missingSido.join(", "));

// 지도는 API 미제공 지역(광주·전남·전북)까지 그려야 전국 윤곽이 나온다.
const uncovered = Object.keys(geo.paths).filter((code) => !fixture.codes.includes(code));
check("API 미제공 지역도 경계는 가지고 있다", uncovered.length > 0, true);
console.log(`   지도 ${Object.keys(geo.paths).length} 개 중 ${fixture.codes.length} 개가 지수 보유, ${uncovered.length} 개는 미제공 표시`);

// 이름 테이블은 지도와 같은 코드 집합이어야 툴팁이 비지 않는다.
const pathWithoutName = Object.keys(geo.paths).filter((code) => !FIRE_REGION_NAMES[code]);
check("경계는 있는데 이름 없는 코드 없음", pathWithoutName.length, 0);
if (pathWithoutName.length > 0) console.log("   이름 누락:", pathWithoutName.join(", "));

check("viewBox 가 있다", geo.width > 0 && geo.height > 0, true);

process.exit(failed === 0 ? 0 : 1);
