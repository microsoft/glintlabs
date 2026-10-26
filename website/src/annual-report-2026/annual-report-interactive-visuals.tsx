"use client";

import { Dismiss16Regular } from "@fluentui/react-icons/svg/dismiss";
import Image from "next/image";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  listeningApproaches,
  listeningTopics,
  responseCategories,
} from "./annual-report-data";
import styles from "./annual-report-components.module.css";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function WorkPaceWave() {
  const peaks = [16, 1, 10, 24, 8, 16, 1, 12];

  return (
    <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 668 42">
      {peaks.map((peak, index) => {
        const start = index * 83.5;
        const midpoint = start + 41.75;
        const end = start + 83.5;

        return (
          <path
            d={`M${start} 40C${start + 22.3376} 40 ${start + 27.3901} ${peak} ${midpoint} ${peak}C${start + 56.1099} ${peak} ${start + 61.1624} 40 ${end} 40`}
            key={`${peak}-${index}`}
          />
        );
      })}
    </svg>
  );
}

function FormIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M6.5 10a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M7 13.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M3 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm2.5-1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zM8 9.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m0 4a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m1-4a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 0-1h-5a.5.5 0 0 0-.5.5m.5 3.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z"
        fill="currentColor"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M7.37 3.553c1.14-2.074 4.12-2.074 5.259 0l5.496 10.005c1.098 1.999-.349 4.444-2.63 4.444H4.504c-2.281 0-3.727-2.445-2.629-4.444zm4.383.482c-.76-1.383-2.746-1.383-3.506 0L2.751 14.039c-.732 1.333.232 2.963 1.753 2.963h10.991c1.52 0 2.485-1.63 1.753-2.963zM10 12.748a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5m0-6.25a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5"
        fill="currentColor"
      />
    </svg>
  );
}

function ThumbLikeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M10.053 2.29c.34-.978 1.632-1.428 2.431-.591.163.17.325.355.435.519.32.48.454 1.113.504 1.73.05.628.016 1.302-.048 1.912a18 18 0 0 1-.252 1.635h.884c1.872 0 3.287 1.695 2.952 3.537l-.684 3.761c-.472 2.596-3.066 4.23-5.612 3.536l-5.6-1.526a2.5 2.5 0 0 1-1.793-1.922l-.353-1.765c-.278-1.389.784-2.559 1.913-3.005.323-.127.614-.289.841-.49 1.706-1.513 2.324-2.723 3.384-4.849.354-.71.718-1.676.998-2.483m1.965 5.584.01-.04c.007-.028.016-.07.028-.124.025-.108.059-.265.097-.46.076-.388.167-.92.228-1.495.06-.577.088-1.185.045-1.728-.045-.555-.16-.985-.34-1.255a3 3 0 0 0-.326-.383c-.199-.208-.628-.16-.762.228-.283.814-.664 1.83-1.048 2.6-1.067 2.141-1.756 3.502-3.616 5.152-.34.302-.744.517-1.136.672-.881.348-1.447 1.148-1.301 1.879l.353 1.765c.111.557.528 1.003 1.076 1.153l5.6 1.527c1.98.54 3.997-.732 4.364-2.751l.685-3.761c.223-1.228-.72-2.358-1.968-2.358h-1.504a.5.5 0 0 1-.485-.622"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowForwardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M12.646 3.646a.5.5 0 0 0 0 .708L16.293 8H9.5A7.5 7.5 0 0 0 2 15.5a.5.5 0 0 0 1 0A6.5 6.5 0 0 1 9.5 9h6.793l-3.647 3.646a.5.5 0 0 0 .708.708l4.5-4.5a.5.5 0 0 0 0-.708l-4.5-4.5a.5.5 0 0 0-.708 0"
        fill="currentColor"
      />
    </svg>
  );
}

const listeningFitStates = [
  {
    id: "minimum",
    markerCount: 1,
    zone: "Insufficient signal",
    title: "Important changes may be going unheard",
    description:
      "With few listening moments, shifts can go undetected until decisions are underway or conditions have already changed.",
    action:
      "Start with the highest-priority business questions and add a timely listening channel.",
    positive: false,
  },
  {
    id: "low",
    markerCount: 3,
    zone: "Insufficient signal",
    title: "Your listening approach may leave important signal gaps",
    description:
      "Current business questions can remain unanswered while understanding becomes outdated between listening moments.",
    action:
      "Add or diversify listening where decisions lack timely, relevant evidence.",
    positive: false,
  },
  {
    id: "balanced",
    markerCount: 5,
    zone: "Right-fit listening",
    title: "Signal and synthesis are in balance",
    description:
      "Listening is frequent enough to keep understanding current without outpacing the organization’s ability to interpret and act.",
    action:
      "What change in priorities or pace would require reassessing this balance?",
    positive: true,
  },
  {
    id: "high",
    markerCount: 10,
    zone: "Synthesis overload",
    title: "Feedback may be arriving faster than it can be used",
    description:
      "More collection can create synthesis backlog, delay action, and ask employees for input without a visible response.",
    action:
      "Prioritize key questions, sequence collection, or increase synthesis capacity.",
    positive: false,
  },
  {
    id: "overload",
    markerCount: 16,
    zone: "Synthesis overload",
    title: "Listening volume is outpacing synthesis capacity",
    description:
      "A growing backlog can make feedback stale, obscure priorities, and weaken trust when employees do not see a visible response.",
    action:
      "Pause lower-priority collection, clear the synthesis backlog, and close the loop before adding new listening.",
    positive: false,
  },
] as const;

export function ListeningSpeedGap() {
  const [selectedIndex, setSelectedIndex] = useState(2);
  const titleId = useId();
  const selectedState = listeningFitStates[selectedIndex];

  return (
    <section
      aria-labelledby={titleId}
      className={`${styles.component} ${styles.dataVisual} ${styles.speedGap}`}
    >
      <p className={styles.eyebrow}>Right-fit listening signal</p>
      <div className={styles.visualHeading}>
        <div>
          <h3 id={titleId}>
            Match listening to the questions, decisions, and pace of work
          </h3>
          <p>
            The goal is not maximum collection. It is enough timely signal to
            understand what is changing without overwhelming the ability to
            synthesize and act.
          </p>
        </div>
      </div>
      <div className={styles.speedDivider} />
      <div className={styles.speedVisual}>
        <p className={styles.speedVisualTitle}>
          Pace of work relative to listening density
        </p>
        <div className={styles.speedSignal}>
          <div className={styles.speedWave}>
            <WorkPaceWave />
          </div>
          <div
            aria-label={`${selectedState.markerCount} listening moments at the ${selectedState.zone.toLowerCase()} position`}
            className={`${styles.speedDensity} ${
              selectedState.markerCount === 1 ? styles.speedDensitySingle : ""
            }`}
            role="img"
          >
            {Array.from({ length: selectedState.markerCount }, (_, index) => (
              <span aria-hidden="true" className={styles.speedMarker} key={index}>
                <FormIcon />
              </span>
            ))}
          </div>
        </div>
        <label className={styles.speedPrompt} htmlFor={`${titleId}-fit`}>
          Drag to explore your listening fit
        </label>
        <div className={styles.speedRangeWrap}>
          <div aria-hidden="true" className={styles.speedRangeTrack} />
          <span aria-hidden="true" className={styles.speedRangeTicks}>
            <i />
            <i />
            <i />
          </span>
          <input
            aria-valuetext={`${selectedState.zone}. ${selectedState.title}.`}
            id={`${titleId}-fit`}
            max={listeningFitStates.length - 1}
            min={0}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            step={1}
            type="range"
            value={selectedIndex}
          />
        </div>
        <div aria-hidden="true" className={styles.speedScale}>
          <span>Insufficient signal</span>
          <i />
          <span>Right-fit listening</span>
          <i />
          <span>Synthesis overload</span>
        </div>
      </div>
      <div
        aria-live="polite"
        className={`${styles.speedResult} ${
          selectedState.positive ? styles.speedResultPositive : ""
        }`}
      >
        <div className={styles.speedResultColumn}>
          <span className={styles.speedResultIcon}>
            {selectedState.positive ? <ThumbLikeIcon /> : <WarningIcon />}
          </span>
          <p className={styles.speedResultTitle}>{selectedState.title}</p>
          <p className={styles.speedResultCopy}>{selectedState.description}</p>
        </div>
        <span aria-hidden="true" className={styles.speedResultDivider} />
        <div className={styles.speedResultColumn}>
          <span className={styles.speedResultIcon}>
            <ArrowForwardIcon />
          </span>
          <p className={styles.speedResultActionTitle}>Consider next</p>
          <p className={styles.speedResultCopy}>{selectedState.action}</p>
        </div>
      </div>
      <table className={styles.visuallyHidden}>
        <caption>Listening fit states and recommended actions</caption>
        <thead>
          <tr>
            <th>State</th>
            <th>Listening moments</th>
            <th>Interpretation</th>
            <th>Consider next</th>
          </tr>
        </thead>
        <tbody>
          {listeningFitStates.map((state) => (
            <tr key={state.id}>
              <th>{state.zone}</th>
              <td>{state.markerCount}</td>
              <td>{state.description}</td>
              <td>{state.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const momentumPlotWidth = 684;
const momentumPlotHeight = 491;
const combinedMomentumIndexes = [7, 13] as const;
const combinedMomentumIndexSet = new Set<number>(combinedMomentumIndexes);
const momentumMarkerPositions = [
  [296, 42],
  [262, 112],
  [176, 252],
  [323, 80],
  [170, 85],
  [339, 183],
  [216, 386],
  [547, 366],
  [655, 240],
  [473, 167],
  [386, 205],
  [425, 205],
  [388, 127],
  [547, 366],
  [333, 257],
] as const;
const momentumKeyWidths = [
  240, 173, 239, 189, 156,
  182, 176, 183, 204, 197,
  203, 204, 163, 210, 198,
] as const;

function approachMetrics(index: number) {
  const approach = listeningApproaches[index];
  const [notUsing, scalingBack, , expanding] = approach.values;

  return {
    adoption: 100 - notUsing,
    momentum: expanding - scalingBack,
  };
}

const momentumPositions = listeningApproaches.map((_, index) => {
  const [x, y] = momentumMarkerPositions[index];
  return {
    ...approachMetrics(index),
    x,
    y,
  };
});

function detailCardPlacement(
  point: (typeof momentumPositions)[number],
  cardHeight: number,
  markerHalfWidth = 20,
) {
  const cardWidth = 300;
  const gap = 8;
  const plotPadding = 8;
  const placeOnRight =
    point.x + markerHalfWidth + gap + cardWidth <=
    momentumPlotWidth - plotPadding;
  const markerTop = point.y - 20;
  const markerBottom = point.y + 20;
  let cardTop: number;

  if (markerTop + cardHeight <= momentumPlotHeight - plotPadding) {
    cardTop = markerTop;
  } else if (markerBottom - cardHeight >= plotPadding) {
    cardTop = markerBottom - cardHeight;
  } else {
    cardTop = clamp(
      point.y - cardHeight / 2,
      plotPadding,
      momentumPlotHeight - cardHeight - plotPadding,
    );
  }

  return {
    left: `${(point.x / momentumPlotWidth) * 100}%`,
    top: `${(cardTop / momentumPlotHeight) * 100}%`,
    transform: placeOnRight
      ? `translateX(${markerHalfWidth + gap}px)`
      : `translateX(calc(-100% - ${markerHalfWidth + gap}px))`,
  };
}

export function ListeningMomentumMap() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(334);
  const plotRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const tooltipId = useId();
  const activeIndex = selectedIndex;
  const activeApproach =
    activeIndex === null ? null : listeningApproaches[activeIndex];
  const activePosition =
    activeIndex === null ? null : momentumPositions[activeIndex];
  const activeMomentumPrefix =
    activePosition && activePosition.momentum >= 0 ? "+" : "";

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) {
      return;
    }

    const updateHeight = () => {
      setTooltipHeight(tooltip.offsetHeight);
    };
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(tooltip);
    return () => {
      observer.disconnect();
    };
  }, [activeIndex]);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    const dismissOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        !(target instanceof Element)
        || tooltipRef.current?.contains(target)
        || target.closest("[data-momentum-trigger]")
      ) {
        return;
      }

      setSelectedIndex(null);
    };

    document.addEventListener("pointerdown", dismissOnOutsidePointerDown);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointerDown);
    };
  }, [selectedIndex]);

  function selectFromKey(index: number) {
    setSelectedIndex(index);
    requestAnimationFrame(() => {
      plotRef.current?.scrollIntoView({ block: "center" });
    });
  }

  return (
    <section className={`${styles.component} ${styles.dataVisual} ${styles.momentumVisual}`}>
      <p className={styles.eyebrow}>Listening focus</p>
      <div className={styles.visualHeading}>
        <div>
          <h3 id={titleId}>Where listening practices are gaining momentum</h3>
          <p>Current adoption × net momentum. Select a numbered point for details.</p>
        </div>
      </div>

      <div
        aria-labelledby={titleId}
        className={styles.momentumPlot}
        ref={plotRef}
        role="group"
      >
        <span className={`${styles.quadrantLabel} ${styles.established}`}>Established</span>
        <span className={`${styles.quadrantLabel} ${styles.momentum}`}>Momentum</span>
        <span className={`${styles.quadrantLabel} ${styles.atRisk}`}>At risk</span>
        <span className={`${styles.quadrantLabel} ${styles.emerging}`}>Emerging</span>
        {listeningApproaches.map((approach, index) => {
          if (combinedMomentumIndexSet.has(index)) {
            return null;
          }

          const point = momentumPositions[index];
          const activePoint = index === activeIndex;

          return (
            <button
              aria-label={`${index + 1}. ${approach.full}. ${point.adoption}% current adoption and ${point.momentum >= 0 ? "plus " : "minus "}${Math.abs(point.momentum)} net momentum points.`}
              aria-describedby={activePoint ? tooltipId : undefined}
              aria-pressed={activePoint}
              className={styles.momentumPoint}
              data-active={activePoint}
              data-momentum-trigger
              key={approach.short}
              onClick={() =>
                setSelectedIndex((currentIndex) =>
                  currentIndex === index ? null : index,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSelectedIndex(null);
                }
              }}
              style={{
                left: `${(point.x / momentumPlotWidth) * 100}%`,
                top: `${(point.y / momentumPlotHeight) * 100}%`,
              }}
              type="button"
            >
              <span>{index + 1}</span>
            </button>
          );
        })}
        <div
          className={styles.momentumCombinedPoint}
          style={{
            left: `${(momentumPositions[combinedMomentumIndexes[0]].x / momentumPlotWidth) * 100}%`,
            top: `${(momentumPositions[combinedMomentumIndexes[0]].y / momentumPlotHeight) * 100}%`,
          }}
        >
          {combinedMomentumIndexes.map((index) => {
            const approach = listeningApproaches[index];
            const point = momentumPositions[index];
            const activePoint = index === activeIndex;

            return (
              <button
                aria-label={`${index + 1}. ${approach.full}. ${point.adoption}% current adoption and ${point.momentum >= 0 ? "plus " : "minus "}${Math.abs(point.momentum)} net momentum points.`}
                aria-describedby={activePoint ? tooltipId : undefined}
                aria-pressed={activePoint}
                data-active={activePoint}
                data-momentum-trigger
                key={approach.short}
                onClick={() =>
                  setSelectedIndex((currentIndex) =>
                    currentIndex === index ? null : index,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSelectedIndex(null);
                  }
                }}
                type="button"
              >
                <span>{index + 1}</span>
              </button>
            );
          })}
        </div>
        {activeApproach && activePosition && activeIndex !== null ? (
          <div
            aria-label={`${activeApproach.short} details`}
            className={styles.momentumTooltip}
            id={tooltipId}
            ref={tooltipRef}
            role="dialog"
            style={detailCardPlacement(
              activePosition,
              tooltipHeight,
              combinedMomentumIndexSet.has(activeIndex) ? 41 : 20,
            )}
          >
            <div className={styles.momentumTooltipHeader}>
              <h4 className={styles.momentumTooltipTitle}>
                {activeApproach.short}
              </h4>
              <button
                aria-label="Dismiss details"
                className={styles.momentumTooltipDismiss}
                onClick={() => setSelectedIndex(null)}
                type="button"
              >
                <Dismiss16Regular />
              </button>
            </div>
            <div className={styles.momentumTooltipSummary}>
              <div>
                <strong>{activePosition.adoption}%</strong>
                <span>Current adoption</span>
              </div>
              <div>
                <strong>
                  {activeMomentumPrefix}
                  {activePosition.momentum} points
                </strong>
                <span>Net momentum</span>
              </div>
            </div>
            <div className={styles.momentumTooltipMeasures}>
              {responseCategories.map((category, index) => (
                <div key={category.label}>
                  <div>
                    <span>{category.label}</span>
                    <strong>{activeApproach.values[index]}%</strong>
                  </div>
                  <span
                    aria-hidden="true"
                    className={styles.momentumTooltipTrack}
                    style={{ borderColor: category.color }}
                  >
                    <span
                      style={{
                        backgroundColor: category.color,
                        width: `${activeApproach.values[index]}%`,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div aria-hidden="true" className={styles.momentumAxisRow}>
        <span>
          <svg viewBox="0 0 12 12">
            <path
              d="M2 6h8M7 3l3 3-3 3"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Current adoption</span>
        </span>
        <span>
          <span>Net momentum</span>
          <svg viewBox="0 0 12 12">
            <path
              d="M2 6h8M7 3l3 3-3 3"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <div aria-label="Listening approaches" className={styles.momentumKey}>
        {listeningApproaches.map((approach, index) => {
          const activePoint = index === activeIndex;

          return (
            <button
              aria-controls={activePoint ? tooltipId : undefined}
              aria-expanded={activePoint}
              aria-label={`Show details for ${approach.short}`}
              aria-pressed={activePoint}
              className={styles.momentumKeyItem}
              data-momentum-trigger
              key={approach.short}
              onClick={() => selectFromKey(index)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSelectedIndex(null);
                }
              }}
              style={{ width: momentumKeyWidths[index] }}
              type="button"
            >
              <span>{index + 1}</span>
              <span>{approach.short}</span>
            </button>
          );
        })}
      </div>

      <table
        aria-label="Listening approach adoption and momentum source data"
        className={styles.visuallyHidden}
      >
        <thead>
          <tr>
            <th scope="col">Approach</th>
            {responseCategories.map((category) => (
              <th key={category.label} scope="col">{category.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {listeningApproaches.map((approach) => (
            <tr key={approach.short}>
              <th scope="row">{approach.full}</th>
              {approach.values.map((value, index) => (
                <td key={responseCategories[index].label}>{value}%</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

type PriorityFilter = "top" | "all" | "rise" | "fall" | "steady";

const priorityFilters: ReadonlyArray<{
  label: string;
  value: PriorityFilter;
}> = [
  { label: "All topics", value: "all" },
  { label: "Moving up", value: "rise" },
  { label: "Moving down", value: "fall" },
  { label: "No change", value: "steady" },
];

const canonicalPriorityFilters: typeof priorityFilters = [
  { label: "Top five upcoming priorities", value: "top" },
  { label: "Moving up", value: "rise" },
  { label: "Moving down", value: "fall" },
  { label: "All topics", value: "all" },
];

const listeningTopicsByMovement = [...listeningTopics].sort((a, b) => {
  const movementDifference =
    Math.abs(b.past - b.future) - Math.abs(a.past - a.future);

  return movementDifference || a.future - b.future;
});

function priorityMovement(change: number): "rise" | "fall" | "steady" {
  if (change > 0) {
    return "rise";
  }

  if (change < 0) {
    return "fall";
  }

  return "steady";
}

function RankChangeIcon({ movement }: {
  movement: "rise" | "fall";
}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      {movement === "rise" ? (
        <path
          d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"
          fill="currentColor"
        />
      ) : (
        <path
          d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function RankJourneyArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12">
      <path
        d="M1.5 6a.5.5 0 0 1 .5-.5h6.793L6.146 2.854a.5.5 0 1 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L8.793 6.5H2a.5.5 0 0 1-.5-.5"
        fill="currentColor"
      />
    </svg>
  );
}

export function ListeningPriorityShift({ canonical = false }: { canonical?: boolean } = {}) {
  const [filter, setFilter] = useState<PriorityFilter>(canonical ? "top" : "all");
  const visibleTopics = listeningTopicsByMovement.filter((topic) => {
    if (filter === "top") return topic.future <= 5;
    const movement = priorityMovement(topic.past - topic.future);
    return filter === "all" || movement === filter;
  });
  if (canonical && (filter === "top" || filter === "all")) {
    visibleTopics.sort((a, b) => a.future - b.future);
  }

  return (
    <section data-canonical-priorities={canonical || undefined} className={`${styles.component} ${styles.dataVisual} ${styles.priorityVisual}`}>
      <header className={styles.priorityHeader}>
        {canonical ? null : <p className={styles.eyebrow}>Selected topic</p>}
        <div>
          <h3 className={styles.priorityTitle}>
            {canonical ? "More than 80% of listening topics are shifting in priority" : "Listening priorities are shifting toward AI and transformation"}
          </h3>
          <p className={styles.prioritySummary}>
            {canonical
              ? "Choose a category to see how priorities are changing."
              : "AI adoption and organizational transformation show the largest increases in planned listening priority."}
          </p>
        </div>
      </header>

      <div aria-label="Filter priority movement" className={styles.priorityFilters}>
        {(canonical ? canonicalPriorityFilters : priorityFilters).map((option) => (
          <button
            aria-pressed={filter === option.value}
            key={option.value}
            onClick={() => setFilter(option.value)}
            type="button"
          >
            {canonical ? <Image src={`/figma/annual-canonical/priority-${({top: "flag", rise: "up", fall: "down", all: "all", steady: "all"}[option.value])}.svg`} width={20} height={20} loading="eager" alt="" /> : null}
            {option.label}
          </button>
        ))}
      </div>

      <div className={styles.priorityTable}>
        <div aria-hidden="true" className={styles.priorityTableHeader}>
          <span>{canonical ? "Topic / rank" : "Listening topic"}</span>
          {canonical ? <div className={styles.canonicalPriorityAxis}>Priority rank shift&nbsp; / &nbsp;last year vs the next 12-18 months</div> : <div>
            <span>Lower planned priority</span>
            <span>Higher planned priority</span>
          </div>}
          {canonical ? null : <span>Rank shift</span>}
        </div>
        <div aria-live="polite" className={styles.priorityRows}>
          {visibleTopics.map((topic) => {
            const change = topic.past - topic.future;
            const movement = priorityMovement(change);
            const width = `${Math.abs(change) / 13 * 50}%`;

            return (
              <div
                className={styles.priorityRow}
                data-movement={movement}
                key={topic.name}
              >
                <span className={styles.priorityTopic}>
                  {canonical ? <>
                    <span className={styles.canonicalPriorityRank} aria-label={`Upcoming priority rank ${topic.future}`}>{topic.future}</span>
                    <span className={styles.priorityTopicLabel}>{topic.name.startsWith("Diversity, equity,") ? topic.name : topic.name.replace("AI and technology", "AI technology").replaceAll(" and ", " & ")}</span>
                  </> : topic.name}
                </span>
                <span aria-hidden="true" className={styles.priorityTrack}>
                  <span
                    className={styles.priorityMovement}
                    style={{ width: movement === "steady" ? "8px" : width }}
                  />
                </span>
                <span className={styles.priorityChange}>
                  <span className={styles.priorityBadge}>
                    {movement !== "steady" ? (
                      <RankChangeIcon movement={movement} />
                    ) : canonical ? <RankChangeIcon movement="rise" /> : null}
                    <span>{Math.abs(change)}</span>
                  </span>
                  <span className={styles.priorityJourney}>
                    <span>{topic.past}</span>
                    <RankJourneyArrow />
                    <span>{topic.future}</span>
                  </span>
                  <span className={styles.visuallyHidden}>
                    {change === 0
                      ? `No rank change; remained at ${topic.past}.`
                      : `${change > 0 ? "Moved up" : "Moved down"} ${Math.abs(change)} ${Math.abs(change) === 1 ? "place" : "places"}, from rank ${topic.past} to rank ${topic.future}.`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <table
        aria-label="Listening priority rank changes"
        className={styles.visuallyHidden}
      >
        <thead>
          <tr>
            <th scope="col">Listening topic</th>
            <th scope="col">Last year rank</th>
            <th scope="col">Planned rank</th>
            <th scope="col">Rank change</th>
          </tr>
        </thead>
        <tbody>
          {listeningTopicsByMovement.map((topic) => (
            <tr key={topic.name}>
              <th scope="row">{topic.name}</th>
              <td>{topic.past}</td>
              <td>{topic.future}</td>
              <td>{topic.past - topic.future}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={canonical ? styles.prioritySourceNote : styles.visuallyHidden}>
        {canonical
          ? "Current topics reflect what organizations asked employees about within the last year. Future priorities reflect the topics listening leaders selected among their top five most important to ask about over the next 12–18 months."
          : "Ranks compare differently structured questions: last year was select-all; next 12–18 months was select-five. Interpret rank movement, not percentage-point change."}
      </p>
    </section>
  );
}
