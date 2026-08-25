import { splitParts, PART_SIZE } from "../lib/archive-upload";

let failed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      got  ${a}\n      want ${e}`);
  if (!ok) failed++;
}

check("PART_SIZE는 5MB", PART_SIZE, 5 * 1024 * 1024);
check("빈 파일도 파트 1개", splitParts(0), [{ partNumber: 1, start: 0, end: 0 }]);
check("1바이트 → 파트 1개", splitParts(1), [{ partNumber: 1, start: 0, end: 1 }]);
check("정확히 5MB → 파트 1개", splitParts(PART_SIZE), [{ partNumber: 1, start: 0, end: PART_SIZE }]);
check("5MB+1 → 파트 2개", splitParts(PART_SIZE + 1), [
  { partNumber: 1, start: 0, end: PART_SIZE },
  { partNumber: 2, start: PART_SIZE, end: PART_SIZE + 1 },
]);
check("12MB → 파트 3개", splitParts(12 * 1024 * 1024).length, 3);
check("파트 번호는 1부터 연속", splitParts(12 * 1024 * 1024).map((p) => p.partNumber), [1, 2, 3]);

process.exit(failed === 0 ? 0 : 1);
