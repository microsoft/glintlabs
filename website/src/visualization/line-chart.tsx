import type { CSSProperties } from "react";
import { lineChartValue, type LineChartBlock } from "./line-chart-model";
import styles from "./line-chart.module.css";

const patterns = [
  { dash: undefined, symbol: "●", name: "Solid line, circle markers" },
  { dash: "8 5", symbol: "■", name: "Dashed line, square markers" },
  { dash: "2 4", symbol: "▲", name: "Dotted line, triangle markers" },
];

function linePlotY(value: number) { return 320 - value * 2.2; }

function linePointLabelPositions(block: LineChartBlock) {
  return block.periods.map((_, periodIndex) => {
    const points = block.series.map((series, seriesIndex) => ({
      seriesIndex, y: linePlotY(series.values[periodIndex]),
    }));
    const obstacles = points.map(point => ({ top: point.y - 7, bottom: point.y + 7 }));
    const positions: number[] = [];
    for (const point of [...points].sort((a, b) => b.y - a.y)) {
      let top = point.y - 34;
      // Move close labels above both neighboring labels and every point marker.
      for (;;) {
        const collisions = obstacles.filter(obstacle => top < obstacle.bottom + 4 && top + 22 > obstacle.top - 4);
        if (!collisions.length) break;
        top = Math.min(...collisions.map(obstacle => obstacle.top - 26));
      }
      positions[point.seriesIndex] = top;
      obstacles.push({ top, bottom: top + 22 });
    }
    return positions;
  });
}

function SharedLinePlot({ block }: { block: LineChartBlock }) {
  const count = block.periods.length;
  const labelPositions = linePointLabelPositions(block);
  const pointWidth = Math.max(96, ...block.series.flatMap((_, seriesIndex) =>
    block.periods.map((_, periodIndex) => lineChartValue(block, periodIndex, seriesIndex).length * 9 + 44)));
  const x = (index: number) => (index + .5) * 100 / count;
  return <div className={styles.shared} data-trend-layout="shared">
    <ul className={styles.legend} aria-label="Trend series">
      {block.series.map((series, seriesIndex) => <li key={series.id} className={styles.seriesInk} data-series={seriesIndex}>
        <strong><span aria-hidden="true">{patterns[seriesIndex].symbol}</span> {series.label}</strong>
        <span className={styles.pattern}>{patterns[seriesIndex].name}</span>
      </li>)}
    </ul>
    <div className={styles.scroll} tabIndex={0} role="region" aria-label="All series: shared percentage trend and point labels">
      <div className={styles.sharedCanvas} style={{
        "--plot-width": `${40 + count * pointWidth}px`, "--period-count": count,
      } as CSSProperties}>
        <div className={styles.sharedAxis} aria-hidden="true">
          {[0, 25, 50, 75, 100].map(value => <span key={value} style={{ top: linePlotY(value) }}>{value}%</span>)}
        </div>
        <div className={styles.sharedGraph}>
          <svg data-shared-lines viewBox="0 0 1000 360" preserveAspectRatio="none" width="100%" height="360" aria-hidden="true">
            {[0, 25, 50, 75, 100].map(value =>
              <line key={value} x1={0} y1={linePlotY(value)} x2={1000} y2={linePlotY(value)} className={styles.grid} />)}
            {block.series.map((series, seriesIndex) => <polyline key={series.id}
              className={styles.seriesInk} data-series={seriesIndex}
              points={series.values.map((value, index) => `${x(index) * 10},${linePlotY(value)}`).join(" ")}
              fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke"
              strokeDasharray={patterns[seriesIndex].dash} />)}
          </svg>
          <svg width="100%" height="360" aria-hidden="true">
            {block.series.map((series, seriesIndex) => <g key={series.id} className={styles.seriesInk} data-series={seriesIndex}>
              {series.values.map((value, periodIndex) => <g key={block.periods[periodIndex].id}>
                <line x1={`${x(periodIndex)}%`} x2={`${x(periodIndex)}%`}
                  y1={linePlotY(value)} y2={labelPositions[periodIndex][seriesIndex] + 22}
                  stroke="currentColor" strokeWidth="1" opacity=".45" />
                {seriesIndex === 0 ? <circle cx={`${x(periodIndex)}%`} cy={linePlotY(value)} r="5" fill="currentColor" />
                  : seriesIndex === 1 ? <rect x={`${x(periodIndex)}%`} y={linePlotY(value) - 5}
                    transform="translate(-5 0)" width="10" height="10" fill="currentColor" />
                  : <svg x={`${x(periodIndex)}%`} y={linePlotY(value) - 6} width="12" height="12" overflow="visible">
                    <path d="M0 0l6 11h-12z" fill="currentColor" />
                  </svg>}
              </g>)}
            </g>)}
          </svg>
          {block.series.map((series, seriesIndex) => block.periods.map((period, periodIndex) =>
            <span key={`${series.id}-${period.id}`} className={`${styles.sharedValue} ${styles.seriesInk}`}
              data-series={seriesIndex} data-period={periodIndex}
              style={{ left: `${x(periodIndex)}%`, top: labelPositions[periodIndex][seriesIndex] }}>
              <span className={styles.screenReaderOnly}>{series.label}, {period.label}: </span>
              <span aria-hidden="true">{patterns[seriesIndex].symbol} </span>
              <strong>{lineChartValue(block, periodIndex, seriesIndex)}</strong>
            </span>))}
        </div>
        <ol className={styles.sharedPeriods}>{block.periods.map(period => <li key={period.id}>{period.label}</li>)}</ol>
      </div>
    </div>
  </div>;
}

export function LineChart({ block }: { block: LineChartBlock }) {
  const title = block.presentation?.title ?? block.title;
  const subtitle = block.presentation?.subtitle ?? block.subtitle;
  return <div className={styles.scope} data-line-chart>
    <figure className={styles.chart} data-palette={block.presentation?.palette ?? "brand"} aria-label={title}>
      <header className={styles.header}>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      {block.verifiedSource?.synthetic ? <p className={styles.scale}>Synthetic example. Not research findings.</p> : null}
      <p className={styles.scale}>Percentage · shared scale 0–100% · periods in source order</p>
      <SharedLinePlot block={block} />
      <div className={styles.series} data-trend-layout="small-multiples">
        {block.series.map((series, seriesIndex) => {
          const pattern = patterns[seriesIndex];
          const count = block.periods.length;
          const width = Math.max(240, count * 80);
          const x = (index: number) => (index + .5) * width / count;
          const y = (value: number) => 124 - value;
          return <section key={series.id} className={styles.panel} data-series={seriesIndex}>
            <h4><span aria-hidden="true">{pattern.symbol}</span> {series.label}</h4>
            <p className={styles.pattern}>{pattern.name}</p>
            <div className={styles.scroll} tabIndex={0} role="region" aria-label={`${series.label}: trend and point labels`}>
              <div className={styles.plot} style={{ "--plot-width": `${width}px`, "--period-count": count } as CSSProperties}>
                <svg viewBox={`0 0 ${width} 148`} width={width} height="148" aria-hidden="true">
                  {[0, 25, 50, 75, 100].map(value =>
                    <line key={value} x1={0} y1={y(value)} x2={width} y2={y(value)} className={styles.grid} />)}
                  <polyline points={series.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
                    fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={pattern.dash} />
                  {series.values.map((value, index) => <g key={block.periods[index].id}>
                    {seriesIndex === 0 ? <circle cx={x(index)} cy={y(value)} r="5" fill="currentColor" />
                      : seriesIndex === 1 ? <rect x={x(index) - 5} y={y(value) - 5} width="10" height="10" fill="currentColor" />
                      : <path d={`M${x(index)} ${y(value) - 6}l6 11h-12z`} fill="currentColor" />}
                  </g>)}
                </svg>
                <ol className={styles.points}>
                  {block.periods.map((period, periodIndex) => <li key={period.id}>
                    <strong>{lineChartValue(block, periodIndex, seriesIndex)}</strong>
                    <span>{period.label}</span>
                  </li>)}
                </ol>
              </div>
            </div>
          </section>;
        })}
      </div>
      {block.periods.some(period => period.supportingText) ? <dl className={styles.samples}>
        {block.periods.map(period => period.supportingText ? <div key={period.id}>
          <dt>{period.label}</dt><dd>{period.supportingText}</dd>
        </div> : null)}
      </dl> : null}
      {block.presentation?.note ? <p className={styles.note}>{block.presentation.note}</p> : null}
      {block.sourceNote ? <figcaption className={styles.note}>{block.sourceNote}</figcaption> : null}
      <details className={styles.details}>
        <summary>View chart data</summary>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${title}: data table`}>
          <table>
            <caption>{title} — percentages, source order</caption>
            <thead><tr><th scope="col">Period</th>{block.series.map(series =>
              <th scope="col" key={series.id}>{series.label}</th>)}<th scope="col">Sample / context</th></tr></thead>
            <tbody>{block.periods.map((period, periodIndex) => <tr key={period.id}>
              <th scope="row">{period.label}</th>{block.series.map((series, seriesIndex) =>
                <td key={series.id}>{lineChartValue(block, periodIndex, seriesIndex)}</td>)}
              <td>{period.supportingText ?? "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  </div>;
}
