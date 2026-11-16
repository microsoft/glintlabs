import { ArrowRight20Regular, ChevronDown16Regular } from "@fluentui/react-icons";

import type { CanonicalVisualBlock } from "./canonical-report-blocks";
import { PercentageRingGroup } from "./percentage-ring-group";
import { IllustratedStatistics } from "./illustrated-statistics";
import { QuadrantScatterPlot } from "./quadrant-scatter-plot";
import { CoefficientHeatmap } from "./coefficient-heatmap";
import { ResearchVisual } from "./research-visual";
import { ComparisonChart } from "./comparison-charts";
import { LineChart } from "./line-chart";
import { sortChartItems } from "./chart-order";
import styles from "./canonical-report-components.module.css";

function SourceNote({ children }: { children: string }) {
  return <figcaption className={styles.sourceNote}>{children}</figcaption>;
}

function ListeningApproachContinuum({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "listening-approach-continuum" }>;
}) {
  return (
    <figure className={`${styles.card} ${styles.continuum}`}>
      <figcaption className={styles.eyebrow}>{block.eyebrow}</figcaption>
      <div className={styles.continuumHeading}>
        <h3>{block.title}</h3>
        <p>{block.description}</p>
      </div>
      <div className={styles.continuumRows}>
        {block.rows.map((row) => (
          <div className={styles.continuumRow} key={row.id}>
            <div>
              <strong>{row.label}</strong>
              <span>{row.description}</span>
            </div>
            <div className={styles.continuumTrack} aria-hidden="true">
              {row.positions.map((position, index) => (
                <span
                  className={styles.continuumPoint}
                  key={`${row.id}-${index}`}
                  style={{ left: `${position}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

function FeaturedStatistic({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "featured-statistic" }>;
}) {
  return (
    <figure className={`${styles.card} ${styles.featuredStatistic}`}>
      <p className={styles.featuredEyebrow}>{block.title}</p>
      <h3>{block.statistic}</h3>
      <blockquote className={styles.statisticPanel}>
        <p>{block.description}</p>
        <footer>{block.sourceNote}</footer>
      </blockquote>
    </figure>
  );
}

function DataCallout({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "data-callout" }>;
}) {
  if (block.title && block.paragraphs) {
    return (
      <details
        className={`${styles.card} ${styles.dataDisclosure}`}
        open={block.variant === "detailed" ? true : undefined}
      >
        <summary className={styles.dataDisclosureSummary}>
          <span className={styles.dataDisclosureHeading}>
            <span>Report summary</span>
            <svg
              aria-hidden="true"
              className={styles.dataDisclosureChevron}
              viewBox="0 0 16 16"
            >
              <path d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z" />
            </svg>
          </span>
          <span aria-hidden="true" className={styles.dataDisclosurePreview}>
            {block.paragraphs[0]}
          </span>
        </summary>
        <div className={styles.dataDisclosureBody}>
          {block.paragraphs.map((paragraph, index) => (
            <p key={`${block.id}-paragraph-${index}`}>{paragraph}</p>
          ))}
        </div>
      </details>
    );
  }

  return (
    <figure
      className={`${styles.card} ${styles.legacyDataCallout} ${
        block.variant === "compact"
          ? styles.legacyDataCalloutCompact
          : styles.legacyDataCalloutDetailed
      }`}
    >
      <figcaption>{block.eyebrow}</figcaption>
      <strong>{block.statistic}</strong>
      {block.description ? <p>{block.description}</p> : null}
      {block.sourceNote ? <SourceNote>{block.sourceNote}</SourceNote> : null}
    </figure>
  );
}

function References({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "references" }>;
}) {
  const featuredReference = block.intro ? undefined : block.references[0];
  const remainingReferences = featuredReference
    ? block.references.slice(1)
    : block.references;

  return (
    <section className={`${styles.card} ${styles.references}`}>
      <h3>{block.title}</h3>
      <div className={styles.referencesLayout}>
        <div className={styles.featuredReference}>
          {block.intro ? <p>{block.intro}</p> : null}
          {featuredReference ? (
            <>
              <p>
                {featuredReference.href ? (
                  <a href={featuredReference.href}>
                    {featuredReference.title}
                  </a>
                ) : (
                  featuredReference.title
                )}
              </p>
              {featuredReference.citation ? (
                <span>{featuredReference.citation}</span>
              ) : null}
            </>
          ) : null}
        </div>
        <ol>
          {remainingReferences.map((reference) => (
            <li key={reference.id}>
              <strong>
                {reference.href ? (
                  <a href={reference.href}>{reference.title}</a>
                ) : (
                  reference.title
                )}
              </strong>
              {reference.citation ? <span>{reference.citation}</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ListeningMethodsComparison({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "listening-methods-comparison" }>;
}) {
  const values = block.methods.map((method) => method.value);
  const minimumValue = Math.min(...values);
  const maximumValue = Math.max(...values);
  const valueRange = Math.max(maximumValue - minimumValue, 1);

  return (
    <figure className={`${styles.card} ${styles.methodsComparison}`}>
      <figcaption className={styles.methodsEyebrow}>{block.eyebrow}</figcaption>
      <div className={styles.methodColumns}>
        {block.methods.map((method) => (
          <div className={styles.method} key={method.id}>
            <strong>{method.value}%</strong>
            <span>{method.label}</span>
            <small>{method.badge}</small>
            <div className={styles.methodBarTrack} aria-hidden="true">
              <span
                style={{
                  height: `${59 + ((method.value - minimumValue) / valueRange) * 84}px`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.benchmark}>
        <div>
          <strong>{block.benchmark.label}</strong>
          <span>{block.benchmark.description}</span>
        </div>
        <b>{block.benchmark.value}%</b>
      </div>
    </figure>
  );
}

function PullQuote({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "pull-quote" }>;
}) {
  return (
    <blockquote className={styles.pullQuote}>
      <span aria-hidden="true" />
      <p>{block.quote}</p>
    </blockquote>
  );
}

export function PercentageComparisonGrid({
  title, leadIns, findings, note, sourceNote, palette, synthetic, draft,
}: {
  title: string;
  leadIns?: [string, string];
  findings: { id: string; value: string; description: string; valueMissing?: boolean; descriptionMissing?: boolean }[];
  note?: string;
  sourceNote?: string;
  palette?: string;
  synthetic?: boolean;
  draft?: boolean;
}) {
  return <figure className={`${styles.card} ${styles.pairedComparison} ${styles.comparisonGrid}`}
    data-palette={palette} data-chart-draft={draft ? "percentage-comparison-grid" : undefined}
    aria-label={draft ? "Draft chart preview with missing-value placeholders" : undefined}>
    {synthetic ? <p className={styles.chartSynthetic}>Synthetic example · Not research findings</p> : null}
    <h3>{title}</h3>
    {[0, 1].map(row => <section key={row} className={styles.comparisonGridRow}
      aria-label={leadIns?.[row] || (row === 0 ? "First row" : "Second row")}>
      {leadIns?.[row]?.trim() ? <p className={styles.pairedLeadIn}>{leadIns[row]}</p> : null}
      <div className={styles.comparisonGridFindings}>
        {findings.slice(row * 2, row * 2 + 2).map(finding =>
          <div className={styles.pairedFinding} data-percentage-finding key={finding.id}>
            <strong data-chart-placeholder={draft && finding.valueMissing || undefined}>{finding.value}</strong>
            <p data-chart-placeholder={draft && finding.descriptionMissing || undefined}>{finding.description}</p>
          </div>)}
      </div>
    </section>)}
    {note?.trim() || sourceNote ? <figcaption className={styles.pairedFootnote}>
      {note?.trim() ? <p>{note}</p> : null}
      {sourceNote ? <p>{sourceNote}</p> : null}
    </figcaption> : null}
  </figure>;
}

function PairedPercentageComparison({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "paired-percentage-comparison" }>;
}) {
  const presentation = block.presentation;
  return (
    <figure className={`${styles.card} ${styles.pairedComparison}`} data-palette={presentation?.palette}>
      {block.verifiedSource?.synthetic ? <p className={styles.chartSynthetic}>Synthetic example · Not research findings</p> : null}
      <h3>{presentation?.title ?? block.title}</h3>
      <div className={styles.pairedMetrics}>
        {block.metrics.map((metric, index) => {
          const raw = block.verifiedSource?.rows.find(row => row.id === metric.id)?.cells[1]?.replace(/%\s*$/, "").trim();
          const leadIn = presentation?.leadIns[index];
          return <div className={styles.pairedMetric} key={metric.id}>
            {leadIn ? <p className={styles.pairedLeadIn}>{leadIn}</p> : null}
            <div className={styles.pairedFinding}>
              <strong>{raw && Number(raw) === metric.value ? raw : metric.value}%</strong>
              <p>{metric.description}</p>
            </div>
          </div>;
        })}
      </div>
      {block.source.part !== "studio" || presentation?.note?.trim() ? <>
        <div className={styles.pairedRule} aria-hidden="true" />
        <figcaption className={styles.pairedFootnote}>
          {presentation?.note ? <p>{presentation.note}</p> : null}
          {block.source.part !== "studio" ? <p>{block.footnote}</p> : null}
        </figcaption>
      </> : null}
    </figure>
  );
}

function HorizontalBarChart({
  block,
  expandSupportingBullets,
  editingOrder,
}: {
  block: Extract<CanonicalVisualBlock, { type: "horizontal-bar-chart" }>;
  expandSupportingBullets?: boolean;
  editingOrder?: string[];
}) {
  const presentation = block.presentation;
  const sortedItems = sortChartItems(block.items, presentation?.sort);
  const items = editingOrder ? [
    ...editingOrder.flatMap(id => sortedItems.filter(item => item.id === id)),
    ...sortedItems.filter(item => !editingOrder.includes(item.id)),
  ] : sortedItems;
  const isNumber = block.verifiedSource?.unit === "number";
  const minimum = isNumber ? Math.min(0, ...items.map(item => item.value)) : 0;
  const maximum = isNumber ? Math.max(0, ...items.map(item => item.value)) || (minimum === 0 ? 1 : 0) : 100;
  const magnitude = Math.max(Math.abs(minimum), maximum) || 1;
  const span = (maximum / magnitude - minimum / magnitude) || 1;
  const position = (value: number) => (value / magnitude - minimum / magnitude) / span * 100;
  const colors = presentation?.palette === "teal" ? ["teal"] : presentation?.palette === "blue"
    ? ["blue"] : ["blue", "teal", "lavender", "mauve"];
  const displayValue = (id: string, value: number) => {
    const raw = block.verifiedSource?.rows.find(row => row.id === id)?.cells[1]?.replace(/%\s*$/, "").trim();
    return `${raw && Number(raw) === value ? raw : value}${isNumber ? "" : "%"}`;
  };
  const displayBreakdownValue = (rowId: string, id: string, value: number) => {
    const raw = block.verifiedSource?.rows.find(row => row.id === rowId)?.breakdown
      ?.find(detail => detail.id === id)?.value.replace(/%\s*$/, "").trim();
    return `${raw && Number(raw) === value ? raw : value}${isNumber ? "" : "%"}`;
  };

  return (
    <figure className={`${styles.card} ${styles.horizontalChart}`} data-density={presentation?.density}>
      {block.verifiedSource?.synthetic ? <p className={styles.chartSynthetic}>Synthetic example · Not research findings</p> : null}
      <h3>{presentation?.title ?? block.title}</h3>
      {presentation?.subtitle ? <p className={styles.chartSubtitle}>{presentation.subtitle}</p> : null}
      <div className={styles.rule} />
      <div className={styles.horizontalRows}>
        {items.map((item) => {
          const bullets = item.supportingText?.split(/\r\n?|\n/).map(line => line.trim()).filter(Boolean)
            ?? item.breakdown?.map(detail => `${detail.label}: ${displayBreakdownValue(item.id, detail.id, detail.value)}`) ?? [];
          const expandable = bullets.length > 0;
          const Row = expandable ? "summary" : "div";
          const Value = expandable ? "span" : "div";
          const row = <Row className={styles.horizontalRow} key={item.id}>
            <span className={expandable ? styles.horizontalDisclosureLabel : undefined}>
              {item.label}{expandable ? <ChevronDown16Regular aria-hidden="true" /> : null}
            </span>
            <Value className={styles.horizontalValue}>
              <Value className={styles.horizontalBarTrack} aria-hidden="true">
                <i style={{
                  width: `${isNumber ? Math.abs(position(item.value) - position(0)) : item.value}%`,
                  marginLeft: isNumber ? `${position(Math.min(0, item.value))}%` : undefined,
                  background: `var(--chart-${colors[block.items.indexOf(item) % colors.length]})`,
                }} />
                {isNumber && minimum < 0 ? <b className={styles.chartZero} style={{ left: `${position(0)}%` }} /> : null}
              </Value>
              <strong>{displayValue(item.id, item.value)}</strong>
            </Value>
          </Row>;
          return expandable ? <details className={styles.horizontalDisclosure} key={item.id}
            open={expandSupportingBullets || undefined}>
            {row}
            <ul className={styles.horizontalSupportingText}>
              {bullets.map((text, index) => <li key={index}>{text}</li>)}
            </ul>
          </details> : row;
        })}
      </div>
      {isNumber ? <p className={styles.chartScale}>Number scale: {minimum} to {maximum}</p> : null}
      {presentation?.note ? <>
        <div className={styles.rule} />
        <p className={styles.chartNote}>{presentation.note}</p>
      </> : null}
      <div className={styles.chartDataTable}>
        <table><caption>{presentation?.title ?? block.title} · Source order · {isNumber ? "Number" : "Percentage"} values</caption>
          <thead><tr><th scope="col">Category</th><th scope="col">{isNumber ? block.legend.replace(/\s*\(%\)\s*$/, "") : block.legend}</th></tr></thead>
          <tbody>{block.items.flatMap(item => [
            <tr key={item.id}><th scope="row">{item.label}</th><td>{displayValue(item.id, item.value)}</td></tr>,
            ...item.breakdown?.map(detail => <tr key={`${item.id}-${detail.id}`}>
              <th scope="row">{item.label}: {detail.label}</th><td>{displayBreakdownValue(item.id, detail.id, detail.value)}</td>
            </tr>) ?? [],
          ])}</tbody>
        </table>
      </div>
    </figure>
  );
}

function GroupedColumnComparison({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "grouped-column-comparison" }>;
}) {
  function displayValue(id: string, column: number, value: number) {
    const raw = block.verifiedSource?.rows.find(row => row.id === id)?.cells[column]?.replace(/%\s*$/, "").trim();
    return `${raw && Number(raw) === value ? raw : value}%`;
  }
  return (
    <figure className={`${styles.card} ${styles.groupedColumns}`}>
      <h3>{block.presentation?.title ?? block.title}</h3>
      {(block.presentation?.subtitle ?? block.subtitle) ? <p>{block.presentation?.subtitle ?? block.subtitle}</p> : null}
      <div className={styles.rule} />
      <div className={styles.columnGroups}>
        {block.groups.map((group) => (
          <div className={styles.columnGroup} key={group.id}>
            <div className={styles.columns}>
              {group.values.map((value, index) => (
                <div className={styles.column} key={`${group.id}-${index}`}>
                  <strong>{displayValue(group.id, index + 1, value)}</strong>
                  <i
                    className={index === 0 ? styles.columnPrimary : styles.columnSecondary}
                    style={{ height: `${value * 2.15}px` }}
                  />
                </div>
              ))}
            </div>
            <span>{group.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.seriesLegend}>
        {block.series.map((series, index) => (
          <span key={series}>
            <i className={index === 0 ? styles.columnPrimary : styles.columnSecondary} />
            {series}
          </span>
        ))}
      </div>
      {block.presentation?.note ? <p className={styles.chartNote}>{block.presentation.note}</p> : null}
      {block.source.part !== "studio" ? <>
        <SourceNote>{block.sourceNote}</SourceNote>
      </> : block.verifiedSource?.synthetic ? <p className={styles.chartSynthetic}>Synthetic example · Not research findings</p> : null}
      <div className={styles.chartDataTable}>
        <table><caption>{block.presentation?.title ?? block.title} · Percentage values in source order</caption>
          <thead><tr><th scope="col">Category</th>{block.series.map((series, index) =>
            <th key={index} scope="col">{series}</th>)}</tr></thead>
          <tbody>{block.groups.map(group => <tr key={group.id}>
            <th scope="row">{group.label}</th>{group.values.map((value, index) =>
              <td key={index}>{displayValue(group.id, index + 1, value)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </figure>
  );
}

function BeforeAfterComparison({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "before-after-comparison" }>;
}) {
  return (
    <figure className={`${styles.card} ${styles.beforeAfter}`}>
      <h3>{block.title}</h3>
      <div className={styles.roleSections}>
        {block.sections.map((section) => (
          <section className={styles.shiftSection} key={section.id}>
            <h4>{section.label}</h4>
            <div className={styles.shiftContent}>
            <div className={styles.shiftPair}>
              <div className={styles.shiftColumn}>
                <strong className={styles.shiftColumnLabel}>
                  Traditional management
                </strong>
                <div className={styles.shiftCard}>
                  <strong>{section.beforeTitle}</strong>
                  <p>{section.beforeDescription}</p>
                </div>
              </div>
              <ArrowRight20Regular
                aria-hidden="true"
                className={styles.shiftArrow}
              />
              <div className={styles.shiftColumn}>
                <strong className={styles.shiftColumnLabel}>
                  Management in the era of AI
                </strong>
                <div className={styles.shiftCard}>
                  <strong>{section.afterTitle}</strong>
                  <p>{section.afterDescription}</p>
                </div>
              </div>
            </div>
            <div className={styles.shiftSummary}>
              <strong>Getting there</strong>
              <p>{section.summary}</p>
            </div>
            </div>
          </section>
        ))}
      </div>
    </figure>
  );
}

function ImpactMetrics({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "impact-metrics" }>;
}) {
  return (
    <figure className={`${styles.card} ${styles.impactMetrics}`}>
      <figcaption>
        <strong>{block.title}</strong>
        {block.intro ? <span>{block.intro}</span> : null}
      </figcaption>
      <div>
        {block.metrics.map((metric) => (
          <p key={metric.id}>{metric.text}</p>
        ))}
      </div>
    </figure>
  );
}

function TwoColumnInsight({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "two-column-insight" }>;
}) {
  return (
    <figure className={`${styles.card} ${styles.twoColumnInsight}`}>
      <figcaption className={styles.eyebrow}>{block.eyebrow}</figcaption>
      <div className={styles.insightColumns}>
        <p>{block.lead}</p>
        <div>
          {block.insights.map((insight) => (
            <section key={insight.id}>
              <h3>{insight.title}</h3>
              <p>{insight.description}</p>
            </section>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function CanonicalReportComponent({
  block,
  expandSupportingBullets,
  editingOrder,
}: {
  block: CanonicalVisualBlock;
  expandSupportingBullets?: boolean;
  editingOrder?: string[];
}) {
  const reconstructionNotice = "Reconstructed from printed values in an image and reviewed in Studio.";
  const sourceCitation = (note: string) => note.split(/\r?\n/).filter(line => line.trim() !== reconstructionNotice).join("\n");
  if ("sourceNote" in block && block.sourceNote?.includes(reconstructionNotice)) {
    block = { ...block, sourceNote: sourceCitation(block.sourceNote) };
  }
  if ("footnote" in block && block.footnote?.includes(reconstructionNotice)) {
    block = { ...block, footnote: sourceCitation(block.footnote) };
  }
  switch (block.type) {
    case "research-visual":
      return <ResearchVisual block={block} />;
    case "listening-approach-continuum":
      return <ListeningApproachContinuum block={block} />;
    case "featured-statistic":
      return <FeaturedStatistic block={block} />;
    case "data-callout":
      return <DataCallout block={block} key={`${block.id}-${block.variant}`} />;
    case "references":
      return <References block={block} />;
    case "listening-methods-comparison":
      return <ListeningMethodsComparison block={block} />;
    case "pull-quote":
      return <PullQuote block={block} />;
    case "percentage-ring-group":
      return <PercentageRingGroup block={block} />;
    case "illustrated-statistics":
      return <IllustratedStatistics id={block.id} title={block.presentation?.title ?? block.title}
        illustrations={block.presentation?.illustrations} valueLabel={block.presentation?.valueLabel}
        note={block.presentation?.note} synthetic={block.verifiedSource?.synthetic}
        sourceNote={block.source.part !== "studio" ? block.footnote : undefined}
        findings={block.metrics.map(metric => {
          const raw = block.verifiedSource?.rows.find(row => row.id === metric.id)?.cells[1]?.replace(/%\s*$/, "").trim();
          return { id: metric.id, description: metric.description,
            value: `${raw && Number(raw) === metric.value ? raw : metric.value}%` };
        })} />;
    case "quadrant-scatter-plot":
      return <QuadrantScatterPlot block={block} />;
    case "paired-percentage-comparison":
      return <PairedPercentageComparison block={block} />;
    case "percentage-comparison-grid":
      return <PercentageComparisonGrid title={block.presentation?.title ?? block.title}
        leadIns={block.presentation?.leadIns} palette={block.presentation?.palette}
        note={block.presentation?.note} synthetic={block.verifiedSource?.synthetic}
        sourceNote={block.source.part !== "studio" ? block.footnote : undefined}
        findings={block.metrics.map(metric => {
          const raw = block.verifiedSource?.rows.find(row => row.id === metric.id)?.cells[1]?.replace(/%\s*$/, "").trim();
          return {
            id: metric.id, description: metric.description,
            value: `${raw && Number(raw) === metric.value ? raw : metric.value}%`,
          };
        })} />;
    case "horizontal-bar-chart":
      return <HorizontalBarChart block={block} expandSupportingBullets={expandSupportingBullets} editingOrder={editingOrder} />;
    case "line-chart":
      return <LineChart block={block} />;
    case "grouped-column-comparison":
      return block.groups.length === 4 && block.series.length === 2 && !block.presentation?.showDifference &&
        (!block.presentation?.palette || block.presentation.palette === "brand")
        ? <GroupedColumnComparison block={block} /> : <ComparisonChart block={block} />;
    case "grouped-bar-comparison":
    case "comparison-panel-group":
      return <ComparisonChart block={block} />;
    case "coefficient-heatmap":
      return <CoefficientHeatmap block={block} />;
    case "before-after-comparison":
      return <BeforeAfterComparison block={block} />;
    case "impact-metrics":
      return <ImpactMetrics block={block} />;
    case "two-column-insight":
      return <TwoColumnInsight block={block} />;
  }
}
