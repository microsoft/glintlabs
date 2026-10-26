import { ArrowRight20Regular } from "@fluentui/react-icons";

import type { CanonicalVisualBlock } from "./canonical-report-blocks";
import { PercentageRingGroup } from "./percentage-ring-group";
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

function HorizontalBarChart({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "horizontal-bar-chart" }>;
}) {
  const maximumValue = Math.max(...block.items.map((item) => item.value), 1);

  return (
    <figure className={`${styles.card} ${styles.horizontalChart}`}>
      <h3>{block.title}</h3>
      <div className={styles.rule} />
      <div className={styles.horizontalRows}>
        {block.items.map((item) => (
          <div className={styles.horizontalRow} key={item.id}>
            <span>{item.label}</span>
            <div className={styles.horizontalValue}>
              <div className={styles.horizontalBarTrack}>
                <i style={{ width: `${(item.value / maximumValue) * 100}%` }} />
              </div>
              <strong>{item.value}%</strong>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.chartLegend}>
        <i />
        <span>{block.legend}</span>
      </div>
      <SourceNote>{block.sourceNote}</SourceNote>
    </figure>
  );
}

function GroupedColumnComparison({
  block,
}: {
  block: Extract<CanonicalVisualBlock, { type: "grouped-column-comparison" }>;
}) {
  return (
    <figure className={`${styles.card} ${styles.groupedColumns}`}>
      <h3>{block.title}</h3>
      <p>{block.subtitle}</p>
      <div className={styles.rule} />
      <div className={styles.columnGroups}>
        {block.groups.map((group) => (
          <div className={styles.columnGroup} key={group.id}>
            <div className={styles.columns}>
              {group.values.map((value, index) => (
                <div className={styles.column} key={`${group.id}-${index}`}>
                  <strong>{value}%</strong>
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
      <SourceNote>{block.sourceNote}</SourceNote>
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
}: {
  block: CanonicalVisualBlock;
}) {
  switch (block.type) {
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
    case "horizontal-bar-chart":
      return <HorizontalBarChart block={block} />;
    case "grouped-column-comparison":
      return <GroupedColumnComparison block={block} />;
    case "before-after-comparison":
      return <BeforeAfterComparison block={block} />;
    case "impact-metrics":
      return <ImpactMetrics block={block} />;
    case "two-column-insight":
      return <TwoColumnInsight block={block} />;
  }
}
