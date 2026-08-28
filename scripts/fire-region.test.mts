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

// 전남광주통합특별시 출범. 경계는 옛 광주(29)·전남(46)을 쓰는데 API 는 12 로 준다.
// 군 단위는 끝 세 자리까지 밀려서 접두 두 자리만 바꾸면 틀린다.
check("광주 동구는 통합 코드로", canonicalRegionCode("29110"), "12210");
check("광주 광산구도", canonicalRegionCode("29200"), "12330");
check("전남 목포시는 끝자리 유지", canonicalRegionCode("46110"), "12110");
check("전남 광양시는 끝자리도 밀림", canonicalRegionCode("46230"), "12190");
check("전남 고흥군도 밀림", canonicalRegionCode("46770"), "12740");
check("전남 신안군은 마지막", canonicalRegionCode("46910"), "12870");

// 전북특별자치도. 경계에는 45110 전주시가 없고 일반구 둘로 쪼개져 있다.
check("전주시 완산구는 전주시로 합쳐 새 코드로", canonicalRegionCode("45111"), "52110");
check("덕진구도 같은 전주시로", canonicalRegionCode("45113"), "52110");
check("전주시 일반구는 상위 시를 가진다", parentCityCode("45111"), "45110");
check("전북 군산시", canonicalRegionCode("45130"), "52130");
check("전북 부안군", canonicalRegionCode("45800"), "52800");

// 인천 개편(2026-07). 중구·동구가 제물포구로 합쳐지고 서구가 서해구·검단구로 쪼개졌다.
// 새 경계 데이터가 없어 쪼개진 쪽은 근사로 둔다. 영종구·검단구는 그릴 경계가 없다.
check("인천 중구는 제물포구로", canonicalRegionCode("28110"), "28125");
check("인천 동구도 제물포구로", canonicalRegionCode("28140"), "28125");
check("인천 서구는 서해구로", canonicalRegionCode("28260"), "28275");
check("미추홀구는 그대로", canonicalRegionCode("28177"), "28177");

// --- 시도 이름 ---
check("전남광주통합은 통합 명칭으로", sidoName("12110"), "전남광주");
check("옛 광주 자치구도 통합 명칭", sidoName("12210"), "전남광주");
check("전북특별자치도는 전북", sidoName("52110"), "전북");
check("서울", sidoName("11110"), "서울");
check("강원특별자치도도 강원", sidoName("51150"), "강원");
check("옛 강원 코드도 강원", sidoName("42150"), "강원");
check("군위군은 대구", sidoName("27720"), "대구");
check("합천군은 경남", sidoName("48890"), "경남");
check("세종", sidoName("36110"), "세종");
check("제주", sidoName("50110"), "제주");
check("모르는 코드는 빈 문자열", sidoName("99999"), "");

// --- 다시 구운 이름 테이블 ---
// 코드만 옮긴 지역은 경계 데이터의 이름이 그대로 맞고, 개편으로 이름이 바뀐 곳만 덮어쓴다.
check("목포시 이름은 그대로", FIRE_REGION_NAMES["12110"], "목포시");
check("광주 광산구도 그대로", FIRE_REGION_NAMES["12330"], "광산구");
check("전주시는 일반구를 합친 이름", FIRE_REGION_NAMES["52110"], "전주시");
check("중구·동구가 합쳐진 곳은 제물포구", FIRE_REGION_NAMES["28125"], "제물포구");
check("서구는 서해구", FIRE_REGION_NAMES["28275"], "서해구");
check("옛 코드는 남지 않는다", FIRE_REGION_NAMES["46110"], undefined);

// --- 운영 API 가 주는 코드를 빠짐없이 덮는가 ---
// 이름이나 경계가 하나라도 비면 화면에 코드가 그대로 노출되거나 지도에 구멍이 난다.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/fire-region-codes.json", import.meta.url), "utf8")) as {
  codes: string[];
};
const geo = JSON.parse(readFileSync(new URL("../public/korea-sigungu.json", import.meta.url), "utf8")) as FireRegionMap;

check("픽스처는 운영에서 받은 229 개", fixture.codes.length, 229);

/**
 * 아직 경계를 못 그리는 코드. 인천 개편으로 새로 생겼는데 국가공간정보 시군구 경계에는
 * 아직 없다. 새 경계 자료가 나오면 이 목록을 비우고 지도를 다시 구우면 된다.
 */
const NO_BOUNDARY_YET = ["28155", "28290"]; // 영종구, 검단구

const missingName = fixture.codes.filter((code) => !FIRE_REGION_NAMES[code] && !NO_BOUNDARY_YET.includes(code));
check("이름 없는 코드 없음", missingName.length, 0);
if (missingName.length > 0) console.log("   이름 누락:", missingName.join(", "));

const missingPath = fixture.codes.filter((code) => !geo.paths[code] && !NO_BOUNDARY_YET.includes(code));
check("경계 없는 코드 없음", missingPath.length, 0);
if (missingPath.length > 0) console.log("   경계 누락:", missingPath.join(", "));

// 알려진 구멍이 늘어나면 알아채야 한다. 줄어들면 목록을 지우라는 신호다.
const actualGap = fixture.codes.filter((code) => !geo.paths[code]);
check("경계 못 그리는 곳은 영종·검단 둘뿐", actualGap.join(","), NO_BOUNDARY_YET.join(","));

const missingSido = fixture.codes.filter((code) => sidoName(code) === "");
check("시도 못 붙이는 코드 없음", missingSido.length, 0);
if (missingSido.length > 0) console.log("   시도 누락:", missingSido.join(", "));

// 개편된 시도가 실제로 들어오는지. 여기가 비면 예전처럼 지역이 통째로 사라진 것이다.
check("전남광주통합 27 개", fixture.codes.filter((code) => code.startsWith("12")).length, 27);
check("전북 14 개", fixture.codes.filter((code) => code.startsWith("52")).length, 14);
check("폐지된 광주 코드는 없다", fixture.codes.some((code) => code.startsWith("29")), false);
check("폐지된 전남 코드도 없다", fixture.codes.some((code) => code.startsWith("46")), false);
check("폐지된 전북 코드도 없다", fixture.codes.some((code) => code.startsWith("45")), false);

// 경계만 있고 API 에 없는 곳은 '미제공'으로 그려진다(원천이 이따금 빠뜨리는 울릉군 등).
const uncovered = Object.keys(geo.paths).filter((code) => !fixture.codes.includes(code));
console.log(`   지도 ${Object.keys(geo.paths).length} 개 중 ${fixture.codes.length - actualGap.length} 개가 지수 보유, ${uncovered.length} 개는 미제공 표시`);

// 이름 테이블은 지도와 같은 코드 집합이어야 툴팁이 비지 않는다.
const pathWithoutName = Object.keys(geo.paths).filter((code) => !FIRE_REGION_NAMES[code]);
check("경계는 있는데 이름 없는 코드 없음", pathWithoutName.length, 0);
if (pathWithoutName.length > 0) console.log("   이름 누락:", pathWithoutName.join(", "));

check("viewBox 가 있다", geo.width > 0 && geo.height > 0, true);

process.exit(failed === 0 ? 0 : 1);
