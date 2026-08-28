/**
 * 산불위험지수 지도에 쓸 시군구 경계를 굽는다.
 *
 *   npx tsx scripts/build-fire-map.mts
 *
 * 산출물 두 개를 커밋한다.
 *   public/korea-sigungu.json   경계(SVG path)
 *   lib/fire-region-names.ts    시군구 코드 -> 한글 지역명
 *
 * 원본은 21MB 짜리 shapefile 이라 npm run build 에는 넣지 않는다.
 * 행정구역이 개편돼 코드가 바뀔 때만 다시 돌리면 된다.
 *
 * 자료: 국가공간정보포털 시군구 경계(TL_SCCO_SIG). 좌표계 EPSG:5179(UTM-K).
 * 이미 미터 단위 평면좌표라 투영 계산 없이 선형 변환만 하면 SVG 좌표가 된다.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalRegionCode, parentCityCode, RENAMED_REGION_NAMES } from "../lib/fire-region";

/** 원본을 그대로 받아쓸 수 있는 미러. 다른 사본을 쓰려면 FIRE_MAP_SOURCE 로 덮어쓴다. */
const SOURCE = process.env.FIRE_MAP_SOURCE ?? "https://raw.githubusercontent.com/siestageek/datasets/master/sig/TL_SCCO_SIG";

/** Douglas-Peucker 허용 오차(m). 키우면 파일이 작아지고 해안선이 뭉개진다. */
const TOLERANCE_M = 450;
/** 이보다 작은 섬은 버린다. 다만 시군구마다 가장 큰 조각은 무조건 남긴다. */
const MIN_RING_AREA_M2 = 5e6;
/** 산출물 viewBox 가로 크기. 세로는 실제 종횡비로 정한다. */
const VIEWBOX_WIDTH = 800;

type Point = [number, number];

async function download(extension: string) {
  const cacheDir = join(tmpdir(), "icuh-fire-map");
  mkdirSync(cacheDir, { recursive: true });
  const cached = join(cacheDir, `TL_SCCO_SIG.${extension}`);
  if (existsSync(cached)) {
    console.log(`캐시 사용  ${cached}`);
    return readFileSync(cached);
  }
  const url = `${SOURCE}.${extension}`;
  console.log(`내려받는 중  ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(cached, buffer);
  return buffer;
}

/** shapefile 의 폴리곤 레코드만 읽는다. 링 목록을 레코드 순서대로 돌려준다. */
function readShp(buffer: Buffer): Point[][][] {
  const shapes: Point[][][] = [];
  let offset = 100; // 파일 헤더
  while (offset < buffer.length) {
    const contentLength = buffer.readInt32BE(offset + 4);
    const next = offset + 8 + contentLength * 2;
    const shapeType = buffer.readInt32LE(offset + 8);
    if (shapeType === 5) {
      const partCount = buffer.readInt32LE(offset + 44);
      const pointCount = buffer.readInt32LE(offset + 48);
      const partsAt = offset + 52;
      const pointsAt = partsAt + partCount * 4;
      const parts: number[] = [];
      for (let i = 0; i < partCount; i++) parts.push(buffer.readInt32LE(partsAt + i * 4));
      const rings: Point[][] = [];
      for (let i = 0; i < partCount; i++) {
        const start = parts[i];
        const end = i + 1 < partCount ? parts[i + 1] : pointCount;
        const ring: Point[] = [];
        for (let j = start; j < end; j++) {
          ring.push([buffer.readDoubleLE(pointsAt + j * 16), buffer.readDoubleLE(pointsAt + j * 16 + 8)]);
        }
        rings.push(ring);
      }
      shapes.push(rings);
    } else {
      shapes.push([]);
    }
    offset = next;
  }
  return shapes;
}

/** dBASE III 속성 테이블. 필요한 건 SIG_CD 와 SIG_KOR_NM 뿐이다. */
function readDbf(buffer: Buffer): Record<string, string>[] {
  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields: { name: string; length: number }[] = [];
  for (let at = 32; buffer[at] !== 0x0d; at += 32) {
    fields.push({
      name: buffer.subarray(at, at + 11).toString("latin1").replace(/\0.*$/, ""),
      length: buffer[at + 16]
    });
  }
  const decoder = new TextDecoder("euc-kr");
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < recordCount; i++) {
    let at = headerLength + i * recordLength + 1; // 첫 바이트는 삭제 표시
    const row: Record<string, string> = {};
    for (const field of fields) {
      row[field.name] = decoder.decode(buffer.subarray(at, at + field.length)).trim();
      at += field.length;
    }
    rows.push(row);
  }
  return rows;
}

function ringArea(ring: Point[]) {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function simplify(ring: Point[], tolerance: number): Point[] {
  if (ring.length < 3) return ring;
  const keep = new Array<boolean>(ring.length).fill(false);
  keep[0] = true;
  keep[ring.length - 1] = true;
  const stack: [number, number][] = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    const [x1, y1] = ring[start];
    const [x2, y2] = ring[end];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    let farthest = -1;
    let farthestAt = -1;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = ring[i];
      let distance: number;
      if (lengthSquared === 0) {
        distance = Math.hypot(px - x1, py - y1);
      } else {
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        distance = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
      }
      if (distance > farthest) {
        farthest = distance;
        farthestAt = i;
      }
    }
    if (farthest > tolerance) {
      keep[farthestAt] = true;
      stack.push([start, farthestAt], [farthestAt, end]);
    }
  }
  return ring.filter((_, index) => keep[index]);
}

/** '수원시 장안구' -> '수원시'. 일반구를 시로 합칠 때 이름도 함께 올린다. */
function cityNameOf(districtName: string) {
  const at = districtName.indexOf("시");
  return at > 0 ? districtName.slice(0, at + 1) : districtName;
}

const [shpBuffer, dbfBuffer] = await Promise.all([download("shp"), download("dbf")]);
const shapes = readShp(shpBuffer);
const rows = readDbf(dbfBuffer);
if (shapes.length !== rows.length) throw new Error(`도형 ${shapes.length} 개와 속성 ${rows.length} 건이 맞지 않는다`);

const units = new Map<string, { name: string; rings: Point[][] }>();
for (let i = 0; i < rows.length; i++) {
  const sigCode = rows[i].SIG_CD;
  const sigName = rows[i].SIG_KOR_NM;
  const code = canonicalRegionCode(sigCode);
  // 개편으로 이름이 바뀐 곳(인천 제물포구 등)은 경계 데이터의 옛 이름을 쓰면 안 된다.
  const name = RENAMED_REGION_NAMES[code] ?? (parentCityCode(sigCode) ? cityNameOf(sigName) : sigName);
  const unit = units.get(code);
  if (unit) unit.rings.push(...shapes[i]);
  else units.set(code, { name, rings: [...shapes[i]] });
}

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const unit of units.values()) {
  for (const ring of unit.rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
const height = (VIEWBOX_WIDTH * (maxY - minY)) / (maxX - minX);
// EPSG:5179 는 북쪽이 +y, SVG 는 아래가 +y 라 세로만 뒤집는다.
const project = ([x, y]: Point): Point => [
  ((x - minX) / (maxX - minX)) * VIEWBOX_WIDTH,
  height - ((y - minY) / (maxY - minY)) * height
];

const paths: Record<string, string> = {};
const names: Record<string, string> = {};
let droppedRings = 0;
for (const [code, unit] of [...units.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const largest = unit.rings.reduce((best, ring) => (ringArea(ring) > ringArea(best) ? ring : best), unit.rings[0]);
  const drawn: string[] = [];
  for (const ring of unit.rings) {
    if (ring !== largest && ringArea(ring) < MIN_RING_AREA_M2) {
      droppedRings++;
      continue;
    }
    const simplified = simplify(ring, TOLERANCE_M);
    if (simplified.length < 4) continue;
    const points = simplified.map(project).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`);
    drawn.push(`M${points.join("L")}Z`);
  }
  if (drawn.length === 0) continue;
  paths[code] = drawn.join("");
  names[code] = unit.name;
}

writeFileSync(
  "public/korea-sigungu.json",
  JSON.stringify({ width: VIEWBOX_WIDTH, height: Number(height.toFixed(1)), paths })
);

const nameEntries = Object.entries(names)
  .map(([code, name]) => `  "${code}": "${name}"`)
  .join(",\n");
writeFileSync(
  "lib/fire-region-names.ts",
  `// scripts/build-fire-map.mts 가 생성한다. 직접 고치지 말 것.\n` +
    `// 국가공간정보포털 시군구 경계(TL_SCCO_SIG)의 SIG_KOR_NM 을 그대로 옮겼다.\n\n` +
    `export const FIRE_REGION_NAMES: Record<string, string> = {\n${nameEntries}\n};\n`
);

const bytes = readFileSync("public/korea-sigungu.json").length;
console.log(
  `\n시군구 ${Object.keys(paths).length} 개  ` +
    `viewBox ${VIEWBOX_WIDTH}x${height.toFixed(0)}  ` +
    `${(bytes / 1024).toFixed(0)}KB  (작은 섬 ${droppedRings} 개 제외)`
);
console.log("public/korea-sigungu.json, lib/fire-region-names.ts 갱신됨");
