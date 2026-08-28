"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FireRegionMap } from "@/lib/fire-region";
import { FIRE_REGION_NAMES } from "@/lib/fire-region-names";
import type { FireRiskMapView } from "@/lib/api-client";
import { Blocks, Sparkline } from "@/components/charts";

/**
 * 산불위험지수 전국 시군구 지도.
 *
 * 경계는 빌드 스크립트가 미리 투영해 둔 SVG path 라서 여기서는 색만 칠하면 된다.
 * 지도 파일(160KB)은 JS 번들에 넣지 않고 필요할 때 public 에서 받아온다.
 */

const MAP_URL = "/korea-sigungu.json";

/**
 * 등급 경계는 산림청 기준(40/65/80)을 따른다.
 * 등급 안에서는 옅은 쪽 -> 짙은 쪽으로 이어 칠해, 같은 등급이어도 지역차가 보이게 한다.
 * 색은 팔레트의 --r1~--r4 에서 뽑았다. 등급이 바뀌지 않는 한 색 계열도 바뀌지 않는다.
 */
const GRADE_BANDS = [
  { label: "낮음", className: "lv1", min: 0, max: 40, from: "#e4efec", to: "#7ba79d" },
  { label: "보통", className: "lv2", min: 40, max: 65, from: "#fbf1d6", to: "#dcb85c" },
  { label: "높음", className: "lv3", min: 65, max: 80, from: "#f7e1c8", to: "#cf8a3f" },
  { label: "매우높음", className: "lv4", min: 80, max: 101, from: "#f4d8d3", to: "#bd5c4c" }
] as const;

function bandOf(value: number) {
  return GRADE_BANDS.find((band) => value < band.max) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

function blockCount(value: number) {
  return GRADE_BANDS.findIndex((band) => band === bandOf(value)) + 1;
}

function mix(from: string, to: string, ratio: number) {
  const channel = (at: number) => {
    const a = parseInt(from.slice(at, at + 2), 16);
    const b = parseInt(to.slice(at, at + 2), 16);
    return Math.round(a + (b - a) * ratio);
  };
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
}

function fillOf(value: number | null | undefined) {
  if (value === null || value === undefined) return "url(#fire-map-nodata)";
  const band = bandOf(value);
  const ratio = Math.max(0, Math.min(1, (value - band.min) / (band.max - band.min)));
  return mix(band.from, band.to, ratio);
}

/** '2026-08-30' -> '8/30 (일)' */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
function dayLabel(baseDate: string, offset: number) {
  const [year, month, date] = baseDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, date).getDay()];
  const relative = offset === 0 ? "오늘" : offset === 1 ? "내일" : offset === 2 ? "모레" : `+${offset}일`;
  return { relative, date: `${month}/${date} (${weekday})` };
}

type Hovered = { code: string; x: number; y: number; flip: boolean };

export function FireRiskMap({ view }: { view: FireRiskMapView }) {
  const [geo, setGeo] = useState<FireRegionMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(MAP_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<FireRegionMap>;
      })
      .then(setGeo)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, []);

  // 예보일이 줄어들면 선택이 범위를 벗어날 수 있다.
  const day = view.days[dayIndex] ?? view.days[0];
  const activeIndex = view.days[dayIndex] ? dayIndex : 0;

  const ranked = useMemo(() => {
    return Object.entries(view.regions)
      .map(([code, region]) => ({ code, region, value: region.values[activeIndex] }))
      .filter((entry): entry is typeof entry & { value: number } => typeof entry.value === "number")
      .sort((a, b) => b.value - a.value);
  }, [view.regions, activeIndex]);

  const highest = ranked[0];
  const average = ranked.length > 0 ? ranked.reduce((sum, entry) => sum + entry.value, 0) / ranked.length : 0;

  const hoveredRegion = hovered ? view.regions[hovered.code] : null;
  const hoveredName = hovered ? hoveredRegion?.name ?? FIRE_REGION_NAMES[hovered.code] ?? hovered.code : "";
  const hoveredValue = hoveredRegion?.values[activeIndex] ?? null;

  function trackPointer(event: React.MouseEvent<SVGPathElement>, code: string) {
    const bounds = frameRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = event.clientX - bounds.left;
    // 오른쪽 끝에서는 툴팁이 카드 밖으로 나가므로 커서 왼쪽에 붙인다.
    setHovered({ code, x, y: event.clientY - bounds.top, flip: x > bounds.width * 0.62 });
  }

  const activeLabel = day ? dayLabel(day.baseDate, activeIndex).relative : "";

  return (
    <div className="fire-panel">
      <div className="fire-map">
      <div className="fire-map-days" role="tablist" aria-label="예보일">
        {view.days.map((entry, index) => {
          const label = dayLabel(entry.baseDate, index);
          return (
            <button
              key={entry.baseDate}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className="fire-map-day"
              onClick={() => setDayIndex(index)}
            >
              <b>{label.relative}</b>
              <small>{label.date}</small>
            </button>
          );
        })}
        <div className="fire-map-summary">
          <span>전국 평균</span>
          <b>{average.toFixed(1)}</b>
          {highest && (
            <small>
              최고 {highest.value} · {highest.region.sido} {highest.region.name}
            </small>
          )}
        </div>
      </div>

      <div className="fire-map-frame" ref={frameRef} onMouseLeave={() => setHovered(null)}>
        {!geo && !failed && <p className="fire-map-note">지도를 불러오는 중입니다…</p>}
        {failed && <p className="fire-map-note">지도를 불러오지 못했습니다. 아래 목록으로 확인해 주세요.</p>}
        {geo && (
          <svg
            viewBox={`0 0 ${geo.width} ${geo.height}`}
            className="fire-map-svg"
            role="img"
            aria-label={`${day?.baseDate ?? ""} 기준 전국 시군구 산불위험지수 분포`}
          >
            <defs>
              <pattern id="fire-map-nodata" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--nodata)" />
                <line x1="0" y1="0" x2="0" y2="5" stroke="var(--line-2)" strokeWidth="1.2" />
              </pattern>
            </defs>
            {Object.entries(geo.paths).map(([code, d]) => {
              const region = view.regions[code];
              const value = region?.values[activeIndex] ?? null;
              return (
                <path
                  key={code}
                  d={d}
                  fill={fillOf(value)}
                  className={`fire-map-area${hovered?.code === code ? " is-hovered" : ""}${region ? "" : " is-nodata"}`}
                  onMouseMove={(event) => trackPointer(event, code)}
                >
                  <title>
                    {`${FIRE_REGION_NAMES[code] ?? code} ${value === null ? "미제공" : `${value} · ${bandOf(value).label}`}`}
                  </title>
                </path>
              );
            })}
          </svg>
        )}

        {hovered && hoveredRegion && (
          <div
            className={`fire-map-tip${hovered.flip ? " flip" : ""}`}
            style={{ left: hovered.x, top: hovered.y }}
          >
            <b>
              {hoveredRegion.sido} {hoveredName}
            </b>
            {hoveredValue === null ? (
              <span className="fire-map-tip-none">해당일 값 없음</span>
            ) : (
              <span className={`badge ${bandOf(hoveredValue).className}`}>
                {hoveredValue} · {bandOf(hoveredValue).label}
              </span>
            )}
            <div className="fire-map-tip-days">
              {view.days.map((entry, index) => {
                const value = hoveredRegion.values[index];
                return (
                  <span key={entry.baseDate} className={index === activeIndex ? "is-active" : ""}>
                    <small>{dayLabel(entry.baseDate, index).relative}</small>
                    <b>{value ?? "–"}</b>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fire-map-legend">
        {GRADE_BANDS.map((band) => (
          <span key={band.label}>
            <i style={{ background: mix(band.from, band.to, 0.75) }} />
            {band.label}
          </span>
        ))}
        <span>
          <i className="is-nodata" />
          미제공 (광주·전남·전북)
        </span>
      </div>
      </div>

      <div className="fire-top">
        <div className="fire-top-hd">
          <h4>{activeLabel} 위험 상위 지역</h4>
          <small>선은 3일 예보 추이</small>
        </div>
        {ranked.slice(0, 5).map((entry) => {
          const band = bandOf(entry.value);
          const series = entry.region.values.filter((value): value is number => value !== null);
          return (
            <div className="fire-row" key={entry.code}>
              <span className="fire-name">
                <b>{entry.region.name}</b>
                <small>{entry.region.sido}</small>
              </span>
              <Sparkline
                data={series.length > 1 ? series : [entry.value, entry.value]}
                className="fire-spark"
                color={band.className === "lv1" ? "var(--brand)" : "var(--r3-dot)"}
              />
              <b className="fire-value">{entry.value}</b>
              <span className={`badge ${band.className}`}>
                <Blocks count={blockCount(entry.value)} />
                {band.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
