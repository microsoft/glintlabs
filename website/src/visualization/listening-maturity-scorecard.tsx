"use client";

import { useState, type CSSProperties } from "react";

import type { ReportBlock } from "../manifest/report-manifest.ts";
import styles from "./listening-maturity-scorecard.module.css";

type ScorecardBlock = Extract<
  ReportBlock,
  { type: "listening-maturity-scorecard" }
>;

type ReflectionPattern = "constrained" | "uneven" | "embedded";

type CapabilityDefinition = {
  key: "participation" | "accountability" | "impact" | "intelligence";
  aliases: readonly string[];
  color: string;
  fallbackTitle: string;
  question: string;
  options: ReadonlyArray<{
    pattern: ReflectionPattern;
    label: string;
  }>;
  next: string;
};

const capabilityDefinitions: readonly CapabilityDefinition[] = [
  {
    key: "participation",
    aliases: ["participation", "inclusive"],
    color: "#c4e7ff",
    fallbackTitle: "Inclusive participation and access",
    question: "Who can the system reliably hear?",
    options: [
      {
        pattern: "constrained",
        label: "We rely on one or two familiar channels.",
      },
      {
        pattern: "uneven",
        label: "We use several channels, but some groups remain harder to hear.",
      },
      {
        pattern: "embedded",
        label:
          "We design different ways for different employees to participate.",
      },
    ],
    next:
      "Ask which employee group is still easiest to miss, then identify one participation route that better fits their work.",
  },
  {
    key: "accountability",
    aliases: ["accountability", "action"],
    color: "#7fbce7",
    fallbackTitle: "Action and accountability",
    question: "What happens after the organization hears?",
    options: [
      {
        pattern: "constrained",
        label: "Insights often stop at the readout.",
      },
      {
        pattern: "uneven",
        label: "Follow-through depends on the leader or team.",
      },
      {
        pattern: "embedded",
        label: "Ownership, decisions, and updates are built into the cycle.",
      },
    ],
    next:
      "Trace one insight from readout to decision and identify where ownership became unclear.",
  },
  {
    key: "impact",
    aliases: ["impact", "strategic"],
    color: "#38cce8",
    fallbackTitle: "Strategic impact",
    question: "Where does employee evidence shape decisions?",
    options: [
      {
        pattern: "constrained",
        label: "Listening mainly informs HR programs.",
      },
      {
        pattern: "uneven",
        label: "Employee evidence sometimes shapes business decisions.",
      },
      {
        pattern: "embedded",
        label:
          "Employee evidence regularly changes priorities or investments.",
      },
    ],
    next:
      "Choose one upcoming decision that should include employee evidence before direction is set.",
  },
  {
    key: "intelligence",
    aliases: ["intelligence", "adaptive"],
    color: "#9299f7",
    fallbackTitle: "Adaptive intelligence",
    question: "How does listening respond to change?",
    options: [
      {
        pattern: "constrained",
        label: "Listening follows a fixed calendar.",
      },
      {
        pattern: "uneven",
        label: "We add follow-up when a significant issue appears.",
      },
      {
        pattern: "embedded",
        label: "Emerging signals reshape what and how we ask.",
      },
    ],
    next:
      "Name one emerging signal that should trigger a response before the next survey.",
  },
];

function readableList(items: readonly string[]) {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function capabilityTitle(
  block: ScorecardBlock,
  definition: CapabilityDefinition,
  index: number,
) {
  return (
    block.categories.find((category) =>
      definition.aliases.includes(category.id.toLowerCase()),
    )?.title
    ?? block.categories[index]?.title
    ?? definition.fallbackTitle
  );
}

function HintIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path
        d="M13.28 1.26a13 13 0 0 1 3.09 1.3 1 1 0 0 1-1.08 1.69 11 11 0 0 0-2.47-1.04 1 1 0 1 1 .46-1.95ZM18.12 5.4a1 1 0 0 1 1.38.33 12 12 0 0 1 1.39 3.77 11.4 11.4 0 0 0-2 .19 10 10 0 0 0-1.1-2.91 1 1 0 0 1 .33-1.38ZM9.69 18.89a11 11 0 0 1-3-1.14 1 1 0 1 0-1.07 1.69 13 13 0 0 0 3.88 1.45c.01-.68.07-1.35.19-2ZM10.02 1.99a1 1 0 0 1-.76 1.2 10 10 0 0 0-2.48 1.01 1 1 0 1 1-1.05-1.7 12 12 0 0 1 3.1-1.26 1 1 0 0 1 1.19.75ZM3.94 5.32a1 1 0 0 1 .31 1.38 10 10 0 0 0-1.04 2.47 1 1 0 1 1-1.95-.46 12 12 0 0 1 1.3-3.08 1 1 0 0 1 1.38-.31ZM1.99 11.97a1 1 0 0 1 1.2.76 10 10 0 0 0 1.01 2.48 1 1 0 1 1-1.7 1.05 12 12 0 0 1-1.26-3.1 1 1 0 0 1 .75-1.19Zm24.22 7.24a1 1 0 0 0-1.42-1.42L20 22.58l-2.29-2.29a1 1 0 1 0-1.42 1.42l3 3a1 1 0 0 0 1.42 0l5.5-5.5ZM21 31a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-2a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AsteriskIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M10.5 2.5a.5.5 0 0 0-1 0v6.29L5.05 4.34a.5.5 0 0 0-.71.71L8.79 9.5H2.5a.5.5 0 0 0 0 1h6.29l-4.45 4.45a.5.5 0 0 0 .71.71l4.45-4.45v6.29a.5.5 0 0 0 1 0v-6.29l4.45 4.45a.5.5 0 0 0 .71-.71l-4.45-4.45h6.29a.5.5 0 0 0 0-1h-6.29l4.45-4.45a.5.5 0 0 0-.71-.71L10.5 8.79V2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M12.65 3.65a.5.5 0 0 0 0 .7L16.29 8H9.5A7.5 7.5 0 0 0 2 15.5a.5.5 0 0 0 1 0A6.5 6.5 0 0 1 9.5 9h6.79l-3.64 3.65a.5.5 0 0 0 .7.7l4.5-4.5a.5.5 0 0 0 0-.7l-4.5-4.5a.5.5 0 0 0-.7 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ListeningMaturityScorecard({
  block,
}: {
  block: ScorecardBlock;
}) {
  const [selections, setSelections] = useState<
    Partial<Record<CapabilityDefinition["key"], ReflectionPattern>>
  >({});
  const selectedEntries = capabilityDefinitions.flatMap((definition) => {
    const pattern = selections[definition.key];
    return pattern ? [{ definition, pattern }] : [];
  });
  const embedded = selectedEntries
    .filter(({ pattern }) => pattern === "embedded")
    .map(({ definition }) => definition.fallbackTitle.toLowerCase());
  const uneven = selectedEntries
    .filter(({ pattern }) => pattern === "uneven")
    .map(({ definition }) => definition.fallbackTitle.toLowerCase());
  const constrained = selectedEntries
    .filter(({ pattern }) => pattern === "constrained")
    .map(({ definition }) => definition.fallbackTitle.toLowerCase());
  const hasSelection = selectedEntries.length > 0;

  let resultTitle = "Listening maturity is developing unevenly.";
  let resultSummary =
    "Some practices are taking hold; others still vary by team or moment.";

  if (embedded.length === capabilityDefinitions.length) {
    resultTitle = "Listening is embedded in how the organization works.";
    resultSummary =
      "The system can hear broadly, act visibly, influence decisions, and adapt.";
  } else if (constrained.length >= 2) {
    resultTitle = "The system has intent, but its foundations are fragile.";
    resultSummary =
      "Listening activity exists, but the path from participation to decisions and learning still depends on individual effort.";
  } else if (embedded.length >= 2 && constrained.length === 0) {
    resultTitle = "A connected listening system is taking shape.";
    resultSummary =
      "Several capabilities are becoming standard practice. The opportunity is consistency.";
  }

  const standsOut =
    embedded.length > 0
      ? `The clearest strength is ${readableList(embedded)}.`
      : uneven.length > 0
        ? `Promising practices are emerging in ${readableList(uneven)}, but they are not yet consistent.`
        : "The current choices do not yet show an embedded capability. Start by naming what already works in isolated teams.";
  const nextDefinition =
    selectedEntries.find(({ pattern }) => pattern === "constrained")?.definition
    ?? selectedEntries.find(({ pattern }) => pattern === "uneven")?.definition
    ?? capabilityDefinitions[0];

  return (
    <section className={styles.scorecard} aria-labelledby={`${block.id}-title`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Listening maturity</p>
        <div>
          <h2 id={`${block.id}-title`}>
            What does your listening system look like?
          </h2>
          <p className={styles.intro}>
            Choose one statement in each area. Your reflection updates as you
            go.
          </p>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.categories}>
          {capabilityDefinitions.map((definition, index) => (
            <fieldset
              className={styles.category}
              key={definition.key}
              style={{ "--accent": definition.color } as CSSProperties}
            >
              <legend>
                {capabilityTitle(block, definition, index)}
              </legend>
              <p>{definition.question}</p>
              <div className={styles.options}>
                {definition.options.map((option) => (
                  <label className={styles.option} key={option.pattern}>
                    <input
                      checked={selections[definition.key] === option.pattern}
                      name={`${block.id}-${definition.key}`}
                      onChange={() =>
                        setSelections((current) => ({
                          ...current,
                          [definition.key]: option.pattern,
                        }))
                      }
                      type="radio"
                      value={option.pattern}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <aside className={styles.result} aria-live="polite">
          {!hasSelection ? (
            <div className={styles.resultEmpty}>
              <HintIcon />
              <strong>Start by choosing a statement</strong>
            </div>
          ) : (
            <>
              <span className={styles.resultBadge}>Your listening system</span>
              <div className={styles.resultIntroduction}>
                <h3>{resultTitle}</h3>
                <p>{resultSummary}</p>
              </div>
              <div className={styles.resultSection}>
                <h4>
                  <AsteriskIcon />
                  <span>What stands out</span>
                </h4>
                <p>{standsOut}</p>
              </div>
              <div className={styles.resultSection}>
                <h4>
                  <ArrowIcon />
                  <span>Consider next</span>
                </h4>
                <p>{nextDefinition.next}</p>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
