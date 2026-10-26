"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";

import styles from "./annual-report-components.module.css";

const methods = [
  {
    value: 91,
    title: "Core surveys",
    color: "#c4e7ff",
    selectedBackground: "#20262a",
    selectedBorder: "#647e91",
    description: "Representative employee voice at scale",
    examples: [
      "Annual engagement survey",
      "Pulse survey",
      "Lifecycle survey",
      "Post-event survey",
    ],
  },
  {
    value: 78,
    title: "Facilitated dialogue",
    color: "#7fbce7",
    selectedBackground: "#0c1821",
    selectedBorder: "#47718e",
    description: "Qualitative depth",
    examples: [
      "Focus groups",
      "Listening sessions",
      "Employee roundtables",
      "Leader Q&A follow-ups",
    ],
  },
  {
    value: 74,
    title: "Open and ongoing",
    color: "#38cce8",
    selectedBackground: "#06181b",
    selectedBorder: "#1d7c8e",
    description: "Outside scheduled cycles",
    examples: [
      "Always-on feedback",
      "Digital suggestion box",
      "Open-text intake",
      "Ask-me-anything themes",
    ],
  },
  {
    value: 71,
    title: "Ambient or passive",
    color: "#9299f7",
    selectedBackground: "#06181b",
    selectedBorder: "#40436c",
    description: "Behavioral patterns",
    examples: [
      "Collaboration signals",
      "Support themes",
      "Work-pattern signals",
      "Service-desk trends",
    ],
  },
  {
    value: 48,
    title: "Embedded and frontline",
    color: "#626ad5",
    selectedBackground: "#111325",
    selectedBorder: "#373d8b",
    description: "Close to work",
    examples: [
      "Shift huddles",
      "QR-code check-ins",
      "Safety stand-ups",
      "Team retrospectives",
    ],
  },
] as const;

function formatExamples(examples: readonly string[]) {
  if (examples.length < 2) {
    return examples[0] ?? "";
  }

  if (examples.length === 2) {
    return `${examples[0]} and ${examples[1]}`;
  }

  return `${examples.slice(0, -1).join(", ")}, and ${examples.at(-1)}`;
}

function ChannelChevron() {
  return (
    <svg
      aria-hidden="true"
      className={styles.methodChevron}
      focusable="false"
      viewBox="0 0 16 16"
    >
      <path
        d="M5.646 3.146a.5.5 0 0 0 0 .708L9.793 8l-4.147 4.146a.5.5 0 0 0 .708.708l4.5-4.5a.5.5 0 0 0 0-.708l-4.5-4.5a.5.5 0 0 0-.708 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChannelPortfolio() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const detailGroupId = useId();

  function selectMethod(index: number) {
    setSelectedIndex(index);
  }

  return (
    <section
      className={`${styles.component} ${styles.darkPanel} ${styles.listeningMethodsPanel}`}
    >
      <header className={styles.methodHeader}>
        <p className={styles.eyebrow}>Channel portfolio</p>
        <h3>Adoption is broad—but uneven</h3>
        <p>
          Share of listening leaders currently using each approach. Click each
          row to view details.
        </p>
      </header>
      <div className={styles.methodBars}>
        {methods.map(
          ({
            value,
            title,
            color,
            selectedBackground,
            selectedBorder,
            description,
            examples,
          }, index) => (
            <div
              className={styles.methodRow}
              data-active={selectedIndex === index}
              key={title}
              style={{
                "--method-color": color,
                "--method-width": `${(value / 91) * 100}%`,
                "--method-selected-background": selectedBackground,
                "--method-selected-border": selectedBorder,
              } as CSSProperties}
            >
              <button
                aria-controls={
                  selectedIndex === index
                    ? `${detailGroupId}-${index}`
                    : undefined
                }
                aria-expanded={selectedIndex === index}
                onClick={() => selectMethod(index)}
                type="button"
              >
                <strong>
                  <span>{title}</span>
                  <ChannelChevron />
                </strong>
                <span className={styles.methodMeasure}>
                  <span className={styles.methodBarScale} aria-hidden="true">
                    <span />
                  </span>
                  <span className={styles.methodValue}>{value}%</span>
                </span>
              </button>
              {selectedIndex === index ? (
                <div
                  aria-label={`${title} details`}
                  className={styles.methodRowDetail}
                  id={`${detailGroupId}-${index}`}
                  role="group"
                >
                  <span className={styles.methodDescription}>
                    {description}
                  </span>
                  <p className={styles.methodExamples}>
                    Examples include {formatExamples(examples)}.
                  </p>
                </div>
              ) : null}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
