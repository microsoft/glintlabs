"use client";

import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { responseCategories } from "./annual-report-data";
import { aiListeningPhases, capabilityRatings, listeningCapabilities, listeningPortfolio, sampleDemographics } from "./canonical-report-data";
import styles from "./canonical-interactions.module.css";
import reportStyles from "./canonical-report.module.css";

const asset = (name: string) => `/figma/annual-canonical/interaction-${name}.svg`;
const capabilityColors = ["#c49c8f", "#dec98f", "#a79bcc", "#7eaba7", "#5f82f2"];
const sampleIcons = ["sample-form", "sample-people", "sample-feedback"];

function trapDialogFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([tabindex='-1']), a[href], input, select, textarea, [tabindex='0']"))
    .filter((control) => control.getClientRects().length > 0);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

function dismissDialogBackdrop(event: ReactMouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
    event.currentTarget.close();
  }
}

function formatPercentage(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function CapabilityRatings() {
  const [selections, setSelections] = useState<(number | null)[]>([null, null, null, null]);
  const prefix = useId();

  return (
    <section className={`${styles.panel} ${styles.ratingsPanel}`} aria-labelledby={`${prefix}-title`} data-node-id="1591:2722">
      <h3 id={`${prefix}-title`}>How developed is our listening system across the capabilities we will need for what comes next?</h3>
      {listeningCapabilities.map((capability, index) => (
        <fieldset className={styles.capability} key={capability.name}>
          <legend className={styles.visuallyHidden}>{capability.name}</legend>
          <div className={styles.capabilityIntro}>
            <div className={styles.capabilityHeading} aria-hidden="true">{capability.name}</div>
            <ul>{capability.criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>
          </div>
          <div className={styles.capabilityResponse}>
            <div className={styles.ratingColumns}>
              {capabilityRatings.map((rating, ratingIndex) => (
                <div key={rating} className={styles.ratingColumn}>
                  <label className={styles.rating}>
                    <input
                      type="radio"
                      name={`${prefix}-${index}`}
                      value={rating}
                      checked={selections[index] === ratingIndex}
                      aria-describedby={`${prefix}-${index}-result`}
                      onChange={() => setSelections((current) => current.map((value, row) => row === index ? ratingIndex : value))}
                    />
                    <span>{rating}</span>
                  </label>
                  {selections[index] !== null ? (
                    <div className={styles.distributionMetric} aria-hidden="true">
                      <div className={styles.distributionLabel}>
                        <span>{rating}</span>
                        <span>{formatPercentage(capability.percentages[ratingIndex])}</span>
                      </div>
                      <div className={styles.distributionTrack}>
                        <span
                          data-selected={selections[index] === ratingIndex || undefined}
                          style={{
                            width: `${capability.percentages[ratingIndex]}%`,
                            background: capabilityColors[ratingIndex],
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {selections[index] !== null ? (
              <div className={styles.sampleDistribution}>
                <div className={styles.sampleAudience} aria-hidden="true"><span>Sampled audience</span></div>
              </div>
            ) : null}
            <p id={`${prefix}-${index}-result`} className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
              {selections[index] !== null
                ? `${formatPercentage(capability.percentages[selections[index]])} of listening leaders rated their listening system ${capabilityRatings[selections[index]].toLowerCase()} in ${capability.name.toLowerCase()}.`
                : null}
            </p>
          </div>
        </fieldset>
      ))}
      <p className={styles.note}>Sample percentages are calculated by taking each listening leader’s<sup>1</sup> average score across the three items within a category and grouping the result into the nearest whole-number band: 1.00–1.49, 1.50–2.49, 2.50–3.49, 3.50–4.49, or 4.50–5.00.<span className={styles.visuallyHidden}> Select a rating to compare it with the listening leader sample, not a score for your organization. Percentages may not total 100% due to rounding.</span></p>
    </section>
  );
}

export function ContinuousListeningTrigger({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);

  return (
    <>
      <button className={styles.inlineTrigger} ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
        continuous listening
      </button>
      {open ? createPortal(<dialog
        className={`${reportStyles.report} ${styles.dialog} ${styles.continuousListeningDialog}`}
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-node-id="1725:34279"
        onKeyDown={trapDialogFocus}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onClick={dismissDialogBackdrop}
      >
        <div className={styles.dialogHeading}>
          <h2 id={titleId}>Continuous listening</h2>
          <button type="button" aria-label="Close continuous listening" onClick={() => dialog.current?.close()}><Image src={asset("dismiss")} width={24} height={24} alt="" /></button>
          <p id={descriptionId} className={styles.dialogSubtext}>
            When asked to define &quot;continuous listening&quot;, listening
            leaders provided descriptions that ranged the <br className={styles.dialogDescriptionBreak} />
            following topics.<sup>1</sup>
          </p>
        </div>
        {children}
      </dialog>, document.body) : null}
    </>
  );
}

// Preserve the point centers in Figma's 605 × 491 plot, rather than inferring a numeric scale.
const momentumPositions = [[228, 99], [120, 139], [97, 279], [272, 127], [32, 127], [288, 208], [89, 378], [499, 364]] as const;
const momentumUseTicks = [100, 90, 80, 70] as const;
const momentumExpansionTicks = [0, 10, 20, 30, 40, 50, 60] as const;
const momentumResponseColors = [1, 2, 3, 4].map((index) => `var(--annual-response-${index})`);

export function CanonicalMomentumMap() {
  const [selected, setSelected] = useState<number | null>(null);
  const chart = useRef<HTMLElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const circles = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = useId();
  const detailsId = useId();
  const points = listeningPortfolio;

  useLayoutEffect(() => {
    if (selected === null) return;
    const card = details.current;
    const circle = circles.current[selected];
    const container = plot.current;
    if (!card || !circle || !container) return;

    const viewport = window.visualViewport;
    const position = () => {
      const gap = 8;
      const leftEdge = (viewport?.offsetLeft ?? 0) + gap;
      const topEdge = (viewport?.offsetTop ?? 0) + gap;
      const rightEdge = leftEdge + (viewport?.width ?? document.documentElement.clientWidth) - gap * 2;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - gap * 2;
      card.style.maxWidth = `${rightEdge - leftEdge}px`;
      card.style.maxHeight = `${bottomEdge - topEdge}px`;
      const anchor = circle.getBoundingClientRect();
      const bounds = card.getBoundingClientRect();
      const containerBounds = container.getBoundingClientRect();
      const preferredLeft = anchor.left - gap - bounds.width;
      const left = preferredLeft >= leftEdge ? preferredLeft : anchor.right + gap;
      card.style.left = `${Math.max(leftEdge, Math.min(left, rightEdge - bounds.width)) - containerBounds.left - container.clientLeft}px`;
      card.style.top = `${Math.max(topEdge, Math.min(anchor.top, bottomEdge - bounds.height)) - containerBounds.top - container.clientTop}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(card);
    observer.observe(circle);
    if (chart.current) observer.observe(chart.current);
    window.addEventListener("resize", position);
    viewport?.addEventListener("resize", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      viewport?.removeEventListener("resize", position);
    };
  }, [selected]);

  useEffect(() => {
    if (selected === null) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (details.current?.contains(event.target)) return;
      if (chart.current?.contains(event.target) && event.target.closest("[data-momentum-trigger]")) return;
      setSelected(null);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (details.current?.contains(document.activeElement)) trigger.current?.focus();
      setSelected(null);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [selected]);

  return (
    <section ref={chart} className={`${styles.panel} ${styles.momentumPanel}`} aria-labelledby={titleId} data-node-id="1732:40598">
      <header className={styles.momentumHeading}><h3 id={titleId}>The listening portfolio is being rebalanced</h3>
      <p>Each number identifies a listening approach. Higher points mean wider use; farther right means higher net expansion. The highlighted point marks the selected example.<span className={styles.visuallyHidden}> Select a number to explore its details.</span></p></header>
      <div className={styles.momentumChart}>
        <div className={styles.momentumYAxis} aria-hidden="true">
          <span className={styles.momentumYTitle}>Current use</span>
          {momentumUseTicks.map((value, index) => <span key={value} className={styles.momentumYTick} style={{ top: `${(103 + index * (269 / 3)) / 491 * 100}%` }}>{value}%</span>)}
        </div>
        <div ref={plot} className={styles.momentumPlot}>
          <div className={styles.quadrants} aria-hidden="true">
            <span>High effort with<br />practical limits</span><span>Foundational, expanding touchpoints</span>
            <span>Unstructured signals<br />yet to scale</span><span>Technology-driven innovation</span>
          </div>
          {points.map((point, index) => (
            <button
              type="button"
              className={styles.point}
              key={point.name}
              ref={(element) => { circles.current[index] = element; }}
              data-momentum-trigger
              style={{ left: `${(momentumPositions[index][0] - 1) / 603 * 100}%`, top: `${(momentumPositions[index][1] - 1) / 489 * 100}%` }}
              aria-label={`${index + 1}. ${point.name}. Current use ${point.use.toFixed(1)}%. Net expansion ${point.netExpansion.toFixed(1)} percentage points.`}
              aria-pressed={selected === index}
              aria-expanded={selected === index}
              aria-controls={selected === index ? detailsId : undefined}
              onClick={(event) => { trigger.current = event.currentTarget; setSelected(selected === index ? null : index); }}
            >{index + 1}</button>
          ))}
          {selected !== null ? (
            <div ref={details} id={detailsId} className={styles.pointDetails} role="region" aria-label={`${points[selected].name} details`}>
              <div className={styles.pointDetailsIntro}>
                <div className={styles.pointDetailsHeading}>
                  <h4>{points[selected].name}</h4>
                  <button className={styles.pointClose} type="button" aria-label="Close listening approach details" onClick={() => { trigger.current?.focus(); setSelected(null); }}><Image src={asset("momentum-dismiss")} width={16} height={16} alt="" /></button>
                </div>
                <p className={styles.pointExample}>{points[selected].description}</p>
              </div>
              <dl className={styles.pointSummary}>
                <div><dt>Use</dt><dd>{formatPercentage(points[selected].use)}</dd></div>
                <div><dt><span aria-hidden="true">Net expansion</span><span className={styles.visuallyHidden}>Net expansion (percentage points)</span></dt><dd>{points[selected].netExpansion > 0 ? <><Image src={asset("momentum-add")} width={16} height={16} alt="" /><span className={styles.visuallyHidden}>+ </span></> : null}{points[selected].netExpansion.toFixed(1)}</dd></div>
              </dl>
              <dl className={styles.metrics}>
                {responseCategories.map(({ label }, index) => <div key={label}><dt>{label}</dt><dd>{formatPercentage(points[selected].percentages[index])}<span className={styles.visuallyHidden}> ({points[selected].counts[index]} of 103 respondents)</span></dd><span aria-hidden="true" className={styles.metricTrack}><span style={{ width: `${points[selected].percentages[index]}%`, background: momentumResponseColors[index] }} /></span></div>)}
              </dl>
            </div>
          ) : null}
        </div>
        <div className={styles.momentumXTicks} aria-hidden="true">{momentumExpansionTicks.map((value) => <span key={value}>{value}</span>)}</div>
        <div className={styles.momentumXTitle} aria-hidden="true">Net expansion (percentage points)</div>
      </div>
      <div className={styles.momentumKey}>
        {points.map((point, index) => (
          <button key={point.name} type="button" data-momentum-trigger aria-pressed={selected === index} aria-expanded={selected === index} aria-controls={selected === index ? detailsId : undefined} onClick={(event) => { trigger.current = event.currentTarget; setSelected(selected === index ? null : index); }}>
            <span className={styles.keyNumber} aria-hidden="true">{index + 1}.</span><span><span className={styles.visuallyHidden}>{index + 1}. </span>{point.name}</span>
          </button>
        ))}
      </div>
      <p className={styles.momentumFooter}>Current use represents the percentage of listening leaders<sup>1</sup> whose organizations are expanding, maintaining, or scaling back each approach. Net expansion represents the percentage expanding minus the percentage scaling back. Quadrants are based on the medians across the eight approaches: 91.7% current use and +17.5 percentage points net expansion. Lower net expansion does not indicate decline.</p>
      <div className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">{selected !== null ? `${points[selected].name}. Current use ${points[selected].use.toFixed(1)}%. Net expansion ${points[selected].netExpansion.toFixed(1)} percentage points.` : ""}</div>
    </section>
  );
}

export function AiPhaseDisclosures() {
  const titleId = useId();
  return (
    <section className={`${styles.panel} ${styles.aiPanel}`} aria-labelledby={titleId}>
      <h3 id={titleId}>AI-enabled capabilities gain traction, predominately in the analysis phase</h3>
      <div className={styles.phases}>
      {aiListeningPhases.map((phase, index) => (
        <details key={phase.name} className={styles.phase} data-phase={index}>
          <summary>
            <span className={styles.phaseLabel}>{phase.name}<Image src={asset("chevron")} width={16} height={16} alt="" /></span>
            <span className={styles.barRow}><span aria-hidden="true" className={styles.bar} style={{ width: `${({ "Strategy, planning, & design": 409, Listening: 429, Analysis: 629, "Action taking": 378 }[phase.name]) / 670 * 100}%`, background: phase.color }} /><b>{phase.percentage}%</b></span>
          </summary>
          <ul>{phase.capabilities.map(([label, value]) => <li key={label}>{label}: {value}%</li>)}</ul>
        </details>
      ))}
      </div>
      <p className={styles.note}>Percentages reflect the proportion of listening leaders<sup>1</sup> that reported they were &quot;piloting / testing&quot; or were &quot;deployed &amp; operationalized&quot; for each AI-enabled capability. Categorical results average these percentages across the capabilities in each category<sup>1</sup>.</p>
    </section>
  );
}

const ParticipantDetailsContext = createContext<((index: number, trigger: HTMLButtonElement) => void) | null>(null);

export function ParticipantDetailsTrigger({ sampleIndex = 0, className, children }: { sampleIndex?: 0 | 1 | 2; className?: string; children: ReactNode }) {
  const openDetails = useContext(ParticipantDetailsContext);
  if (!openDetails) throw new Error("Participant details triggers require ParticipantDetailsProvider");
  return <button className={className} type="button" aria-haspopup="dialog" onClick={(event) => openDetails(sampleIndex, event.currentTarget)}>{children}</button>;
}

export function ParticipantDetailsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [canScrollMore, setCanScrollMore] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const prefix = useId();

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);

  useLayoutEffect(() => {
    const scroller = dialog.current;
    if (!open || !scroller) return;
    scroller.scrollTo(0, 0);
    const updateScrollCue = () => {
      setCanScrollMore(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 1);
    };
    updateScrollCue();
    scroller.addEventListener("scroll", updateScrollCue, { passive: true });
    const observer = new ResizeObserver(updateScrollCue);
    observer.observe(scroller);
    const panel = scroller.querySelector('[role="tabpanel"]:not([hidden])');
    if (panel) observer.observe(panel);
    return () => {
      scroller.removeEventListener("scroll", updateScrollCue);
      observer.disconnect();
    };
  }, [open, selected]);

  function selectTab(index: number) {
    setSelected(index);
    tabs.current[index]?.focus();
  }

  return (
    <ParticipantDetailsContext.Provider value={(index, button) => { trigger.current = button; setSelected(index); setOpen(true); }}>
      {children}
      {open ? createPortal(
        <dialog
          className={`${reportStyles.report} ${styles.dialog} ${styles.demographicsDialog}`}
          ref={dialog}
          aria-labelledby={`${prefix}-title`}
          data-node-id={["1754:42944", "1754:43120", "1754:43263"][selected]}
          data-scroll-more={canScrollMore || undefined}
          onKeyDown={trapDialogFocus}
          onClick={dismissDialogBackdrop}
          onClose={() => { setOpen(false); trigger.current?.focus(); }}
        >
          <div className={styles.demographicsHeader}>
            <div className={styles.dialogHeading}>
              <div className={styles.dialogHeadingCopy}>
                <h2 id={`${prefix}-title`}>Who participated</h2>
              </div>
              <button type="button" aria-label="Close participant details" onClick={() => dialog.current?.close()}><Image src={asset("dismiss")} width={24} height={24} alt="" /></button>
            </div>
            <div
              className={styles.sampleTabs}
              role="tablist"
              aria-label="Research sample"
              onKeyDown={(event) => {
                const index = event.key === "ArrowRight" ? (selected + 1) % sampleDemographics.length
                  : event.key === "ArrowLeft" ? (selected + sampleDemographics.length - 1) % sampleDemographics.length
                    : event.key === "Home" ? 0 : event.key === "End" ? sampleDemographics.length - 1 : undefined;
                if (index === undefined) return;
                event.preventDefault();
                selectTab(index);
              }}
            >
              {sampleDemographics.map((sample, index) => {
                return (
                  <button
                    key={sample.name}
                    ref={(element) => { tabs.current[index] = element; }}
                    type="button"
                    role="tab"
                    id={`${prefix}-tab-${index}`}
                    aria-selected={selected === index}
                    aria-controls={`${prefix}-panel-${index}`}
                    tabIndex={selected === index ? 0 : -1}
                    onClick={() => selectTab(index)}
                  >
                    <Image src={asset(sampleIcons[index])} width={20} height={20} alt="" />{sample.name}
                  </button>
                );
              })}
            </div>
            <h3 className={styles.sampleSummary}>{sampleDemographics[selected].sample}</h3>
          </div>
          {sampleDemographics.map((sample, index) => (
            <div
              key={sample.name}
              id={`${prefix}-panel-${index}`}
              className={styles.demographicsPanel}
              role="tabpanel"
              aria-labelledby={`${prefix}-tab-${index}`}
              hidden={selected !== index}
            >
              <div className={styles.tableScroller} tabIndex={0} role="region" aria-label={`${sample.name} demographic tables`}>
                {sample.tables.map((table, tableIndex) => (
                  <table key={table.title} data-series={tableIndex} data-count-label={sample.countLabel}>
                    <caption>{table.title}</caption>
                    <thead><tr><th scope="col">Category</th><th scope="col">Share / 0-100%</th><th scope="col">{sample.countLabel}</th><th scope="col">%</th></tr></thead>
                    <tbody>{table.rows.map(([label, count, percentage]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td><meter min={0} max={100} value={percentage} aria-label={`${label} share`}>{percentage.toFixed(1)}%</meter></td>
                        <td>{count}</td><td>{percentage.toFixed(1)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ))}
              </div>
            </div>
          ))}
        </dialog>,
        document.body,
      ) : null}
    </ParticipantDetailsContext.Provider>
  );
}

export function ReportAppendices() {
  return (
    <div className={styles.appendices}>
      <section className={styles.referencesDisclosure} aria-labelledby="annual-references-title">
        <h3 id="annual-references-title">References</h3>
        <ol className={styles.references}>
          <li>Microsoft People Science Next Generation of Employee Listening: Listening Leader Survey, n = 103 employee listening leaders from organizations with 1,000 or more employees across eight countries; July 2026.</li>
          <li>Microsoft People Science Next Generation of Employee Listening: Employee and People Manager Survey, n = 500 full-time, English-speaking employees in the United States from organizations with 1,000 or more employees; June 2026.</li>
          <li>Microsoft People Science Next Generation of Employee Listening: Qualitative Interviews, 18 interview sessions with 29 employee listening practitioners, partners, customers, and Microsoft&apos;s internal Employee Listening team across 18 organizations; April–July 2026.</li>
        </ol>
        <p className={styles.note}>The Next Generation of Employee Listening Study was conducted by the Microsoft People Science team using three complementary data sources: two online surveys commissioned by Microsoft and qualitative interviews with employee listening practitioners, partners, and Viva Glint customers. The listening leader survey included 103 employee listening leaders across the United States, United Kingdom, India, Germany, Spain, France, Italy, and China, and was fielded between July 6 and July 15, 2026. The employee and people manager survey included 500 full-time, English-speaking employees in the United States, and was fielded between May 20 and June 12, 2026. Global or overall survey results have been aggregated across all eligible responses to provide a total or average. The listening leader sample included specific parameters on company size (organizations with 1,000 or more employees) and job level (senior managers through C-level executives with responsibility for employee listening). The employee and people manager sample included organizations with 1,000 or more employees and both employees and people managers. The qualitative research included 18 interview sessions with 29 participants across 18 organizations, including interviews commissioned by Microsoft via a paid expert network, as well as interviews with Viva Glint customers, Viva Glint partners, and Microsoft&apos;s internal Employee Listening team, conducted between April 16 and July 13, 2026. Findings represent aggregated responses and may not reflect all organizations or industries. The practices and frameworks discussed in this report are offered for consideration and do not represent formal Microsoft policy or compliance guidance. Organizations should evaluate AI and employee-data uses based on their particular circumstances and applicable requirements.</p>
        <p className={styles.note}>© 2026 Microsoft Corporation. All rights reserved. This document is provided &quot;as-is.&quot; Information and views expressed in this document, including URL and other internet website references, may change without notice. You bear the risk of using it. This document does not provide you with any legal rights to any intellectual property in any Microsoft product. You may copy and use this document for your internal reference purpose.</p>
      </section>
      <ParticipantDetailsTrigger className={styles.demographicsTrigger}>
        <Image src={asset("globe")} width={20} height={20} alt="" />Who participated
      </ParticipantDetailsTrigger>
    </div>
  );
}
