"use client";

import type { CanonicalVisualBlock } from "../../visualization/canonical-report-blocks";
import styles from "./canonical-visual-editor.module.css";

type EditorProps = {
  block: CanonicalVisualBlock;
  onChange: (block: CanonicalVisualBlock) => void;
};

function TextField({
  label,
  multiline = false,
  onChange,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          value={value}
        />
      ) : (
        <input
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={value}
        />
      )}
    </label>
  );
}

function PercentageField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.percentage}>
        <input
          max="100"
          min="0"
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={value}
        />
        <span aria-hidden="true">%</span>
      </div>
    </label>
  );
}

function FieldGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <fieldset className={styles.group}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

export function CanonicalVisualEditor({ block, onChange }: EditorProps) {
  switch (block.type) {
    case "listening-approach-continuum":
      return (
        <div className={styles.fields}>
          <TextField
            label="Eyebrow"
            onChange={(eyebrow) => onChange({ ...block, eyebrow })}
            value={block.eyebrow}
          />
          <TextField
            label="Title"
            multiline
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          <TextField
            label="Description"
            multiline
            onChange={(description) => onChange({ ...block, description })}
            value={block.description}
          />
          {block.rows.map((row, index) => (
            <FieldGroup key={row.id} title={`Approach ${index + 1}`}>
              <TextField
                label="Label"
                onChange={(label) =>
                  onChange({
                    ...block,
                    rows: block.rows.map((item) =>
                      item.id === row.id ? { ...item, label } : item,
                    ) as typeof block.rows,
                  })
                }
                value={row.label}
              />
              <TextField
                label="Description"
                multiline
                onChange={(description) =>
                  onChange({
                    ...block,
                    rows: block.rows.map((item) =>
                      item.id === row.id ? { ...item, description } : item,
                    ) as typeof block.rows,
                  })
                }
                value={row.description}
              />
              <TextField
                label="Marker positions (0–100)"
                onChange={(value) =>
                  onChange({
                    ...block,
                    rows: block.rows.map((item) =>
                      item.id === row.id
                        ? {
                            ...item,
                            positions: value
                              .split(",")
                              .map(Number)
                              .filter(Number.isFinite)
                              .slice(0, 7),
                          }
                        : item,
                    ) as typeof block.rows,
                  })
                }
                value={row.positions.join(", ")}
              />
            </FieldGroup>
          ))}
        </div>
      );
    case "featured-statistic":
      return (
        <div className={styles.fields}>
          <TextField
            label="Title"
            multiline
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          <TextField
            label="Statistic"
            onChange={(statistic) => onChange({ ...block, statistic })}
            value={block.statistic}
          />
          <TextField
            label="Description"
            multiline
            onChange={(description) => onChange({ ...block, description })}
            value={block.description}
          />
          <TextField
            label="Source note"
            multiline
            onChange={(sourceNote) => onChange({ ...block, sourceNote })}
            value={block.sourceNote}
          />
        </div>
      );
    case "data-callout":
      if (block.title && block.paragraphs) {
        return (
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Initial state</span>
              <select
                onChange={(event) =>
                  onChange({
                    ...block,
                    variant: event.target.value as typeof block.variant,
                  })
                }
                value={block.variant}
              >
                <option value="compact">Collapsed</option>
                <option value="detailed">Expanded</option>
              </select>
            </label>
            <TextField
              label="Callout title"
              onChange={(title) => onChange({ ...block, title })}
              value={block.title}
            />
            {block.paragraphs.map((paragraph, index) => (
              <TextField
                key={`${block.id}-paragraph-${index}`}
                label={`Paragraph ${index + 1}`}
                multiline
                onChange={(value) =>
                  onChange({
                    ...block,
                    paragraphs: block.paragraphs?.map((item, itemIndex) =>
                      itemIndex === index ? value : item,
                    ),
                  })
                }
                value={paragraph}
              />
            ))}
          </div>
        );
      }
      return (
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Variant</span>
            <select
              onChange={(event) =>
                onChange({
                  ...block,
                  variant: event.target.value as typeof block.variant,
                })
              }
              value={block.variant}
            >
              <option value="compact">Compact</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
          <TextField
            label="Eyebrow"
            onChange={(eyebrow) => onChange({ ...block, eyebrow })}
            value={block.eyebrow ?? ""}
          />
          <TextField
            label="Statistic"
            onChange={(statistic) => onChange({ ...block, statistic })}
            value={block.statistic ?? ""}
          />
          <TextField
            label="Description"
            multiline
            onChange={(description) =>
              onChange({
                ...block,
                description: description || undefined,
              })
            }
            value={block.description ?? ""}
          />
          <TextField
            label="Source note"
            multiline
            onChange={(sourceNote) =>
              onChange({
                ...block,
                sourceNote: sourceNote || undefined,
              })
            }
            value={block.sourceNote ?? ""}
          />
        </div>
      );
    case "references":
      return (
        <div className={styles.fields}>
          <TextField
            label="Title"
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          <TextField
            label="Introduction"
            multiline
            onChange={(intro) =>
              onChange({ ...block, intro: intro || undefined })
            }
            value={block.intro ?? ""}
          />
          {block.references.map((reference, index) => (
            <FieldGroup key={reference.id} title={`Reference ${index + 1}`}>
              <TextField
                label="Title"
                onChange={(title) =>
                  onChange({
                    ...block,
                    references: block.references.map((item) =>
                      item.id === reference.id ? { ...item, title } : item,
                    ) as typeof block.references,
                  })
                }
                value={reference.title}
              />
              <TextField
                label="Citation"
                multiline
                onChange={(citation) =>
                  onChange({
                    ...block,
                    references: block.references.map((item) =>
                      item.id === reference.id
                        ? { ...item, citation: citation || undefined }
                        : item,
                    ) as typeof block.references,
                  })
                }
                value={reference.citation ?? ""}
              />
            </FieldGroup>
          ))}
        </div>
      );
    case "listening-methods-comparison":
      return (
        <div className={styles.fields}>
          <TextField
            label="Eyebrow"
            onChange={(eyebrow) => onChange({ ...block, eyebrow })}
            value={block.eyebrow}
          />
          {block.methods.map((method, index) => (
            <FieldGroup key={method.id} title={`Method ${index + 1}`}>
              <TextField
                label="Label"
                onChange={(label) =>
                  onChange({
                    ...block,
                    methods: block.methods.map((item) =>
                      item.id === method.id ? { ...item, label } : item,
                    ) as typeof block.methods,
                  })
                }
                value={method.label}
              />
              <PercentageField
                label="Value"
                onChange={(value) =>
                  onChange({
                    ...block,
                    methods: block.methods.map((item) =>
                      item.id === method.id ? { ...item, value } : item,
                    ) as typeof block.methods,
                  })
                }
                value={method.value}
              />
              <TextField
                label="Badge"
                onChange={(badge) =>
                  onChange({
                    ...block,
                    methods: block.methods.map((item) =>
                      item.id === method.id ? { ...item, badge } : item,
                    ) as typeof block.methods,
                  })
                }
                value={method.badge}
              />
            </FieldGroup>
          ))}
          <FieldGroup title="Benchmark">
            <TextField
              label="Label"
              onChange={(label) =>
                onChange({
                  ...block,
                  benchmark: { ...block.benchmark, label },
                })
              }
              value={block.benchmark.label}
            />
            <TextField
              label="Description"
              multiline
              onChange={(description) =>
                onChange({
                  ...block,
                  benchmark: { ...block.benchmark, description },
                })
              }
              value={block.benchmark.description}
            />
            <PercentageField
              label="Value"
              onChange={(value) =>
                onChange({
                  ...block,
                  benchmark: { ...block.benchmark, value },
                })
              }
              value={block.benchmark.value}
            />
          </FieldGroup>
        </div>
      );
    case "pull-quote":
      return (
        <TextField
          label="Quote"
          multiline
          onChange={(quote) => onChange({ ...block, quote })}
          value={block.quote}
        />
      );
    case "percentage-ring-group":
      return (
        <div className={styles.fields}>
          <TextField
            label="Takeaway"
            multiline
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          {block.metrics.map((metric, index) => (
            <FieldGroup key={metric.id} title={`Metric ${index + 1}`}>
              <PercentageField
                label="Value"
                onChange={(value) =>
                  onChange({
                    ...block,
                    metrics: block.metrics.map((item) =>
                      item.id === metric.id ? { ...item, value } : item,
                    ) as typeof block.metrics,
                  })
                }
                value={metric.value}
              />
              <TextField
                label="Description"
                multiline
                onChange={(description) =>
                  onChange({
                    ...block,
                    metrics: block.metrics.map((item) =>
                      item.id === metric.id ? { ...item, description } : item,
                    ) as typeof block.metrics,
                  })
                }
                value={metric.description}
              />
            </FieldGroup>
          ))}
          <TextField
            label="Source note"
            multiline
            onChange={(footnote) => onChange({ ...block, footnote })}
            value={block.footnote}
          />
        </div>
      );
    case "horizontal-bar-chart":
      return (
        <div className={styles.fields}>
          <TextField
            label="Title"
            multiline
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          {block.items.map((item, index) => (
            <FieldGroup key={item.id} title={`Bar ${index + 1}`}>
              <TextField
                label="Label"
                multiline
                onChange={(label) =>
                  onChange({
                    ...block,
                    items: block.items.map((current) =>
                      current.id === item.id ? { ...current, label } : current,
                    ),
                  })
                }
                value={item.label}
              />
              <PercentageField
                label="Value"
                onChange={(value) =>
                  onChange({
                    ...block,
                    items: block.items.map((current) =>
                      current.id === item.id ? { ...current, value } : current,
                    ),
                  })
                }
                value={item.value}
              />
              {block.items.length > 2 ? (
                <button
                  className={styles.remove}
                  onClick={() =>
                    onChange({
                      ...block,
                      items: block.items.filter(
                        (current) => current.id !== item.id,
                      ),
                    })
                  }
                  type="button"
                >
                  Remove bar
                </button>
              ) : null}
            </FieldGroup>
          ))}
          {block.items.length < 12 ? (
            <button
              className={styles.add}
              onClick={() =>
                onChange({
                  ...block,
                  items: [
                    ...block.items,
                    {
                      id: `${block.id}-item-${crypto.randomUUID()}`,
                      label: "New category",
                      value: 50,
                    },
                  ],
                })
              }
              type="button"
            >
              + Add bar
            </button>
          ) : null}
          <TextField
            label="Legend"
            onChange={(legend) => onChange({ ...block, legend })}
            value={block.legend}
          />
          <TextField
            label="Source note"
            multiline
            onChange={(sourceNote) => onChange({ ...block, sourceNote })}
            value={block.sourceNote}
          />
        </div>
      );
    case "grouped-column-comparison":
      return (
        <div className={styles.fields}>
          <TextField
            label="Title"
            multiline
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          <TextField
            label="Subtitle"
            onChange={(subtitle) => onChange({ ...block, subtitle })}
            value={block.subtitle}
          />
          <FieldGroup title="Legend">
            {block.series.map((series, index) => (
              <TextField
                key={index}
                label={`Series ${index + 1}`}
                onChange={(value) => {
                  const next = [...block.series] as [string, string];
                  next[index] = value;
                  onChange({ ...block, series: next });
                }}
                value={series}
              />
            ))}
          </FieldGroup>
          {block.groups.map((group, groupIndex) => (
            <FieldGroup key={group.id} title={`Group ${groupIndex + 1}`}>
              <TextField
                label="Label"
                onChange={(label) =>
                  onChange({
                    ...block,
                    groups: block.groups.map((item) =>
                      item.id === group.id ? { ...item, label } : item,
                    ) as typeof block.groups,
                  })
                }
                value={group.label}
              />
              {group.values.map((value, seriesIndex) => (
                <PercentageField
                  key={seriesIndex}
                  label={block.series[seriesIndex]}
                  onChange={(nextValue) =>
                    onChange({
                      ...block,
                      groups: block.groups.map((item) => {
                        if (item.id !== group.id) return item;
                        const values = [...item.values] as [number, number];
                        values[seriesIndex] = nextValue;
                        return { ...item, values };
                      }) as typeof block.groups,
                    })
                  }
                  value={value}
                />
              ))}
            </FieldGroup>
          ))}
          <TextField
            label="Source note"
            multiline
            onChange={(sourceNote) => onChange({ ...block, sourceNote })}
            value={block.sourceNote}
          />
        </div>
      );
    case "before-after-comparison":
      return (
        <div className={styles.fields}>
          <TextField
            label="Title"
            multiline
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          {block.sections.map((section, index) => (
            <FieldGroup key={section.id} title={`Section ${index + 1}`}>
              {(
                [
                  ["Label", "label", false],
                  ["Before title", "beforeTitle", false],
                  ["Before description", "beforeDescription", true],
                  ["After title", "afterTitle", false],
                  ["After description", "afterDescription", true],
                  ["Summary", "summary", true],
                ] as const
              ).map(([label, key, multiline]) => (
                <TextField
                  key={key}
                  label={label}
                  multiline={multiline}
                  onChange={(value) =>
                    onChange({
                      ...block,
                      sections: block.sections.map((item) =>
                        item.id === section.id
                          ? { ...item, [key]: value }
                          : item,
                      ) as typeof block.sections,
                    })
                  }
                  value={section[key]}
                />
              ))}
            </FieldGroup>
          ))}
        </div>
      );
    case "impact-metrics":
      return (
        <div className={styles.fields}>
          <TextField
            label="Title"
            onChange={(title) => onChange({ ...block, title })}
            value={block.title}
          />
          <TextField
            label="Introduction"
            multiline
            onChange={(intro) =>
              onChange({ ...block, intro: intro || undefined })
            }
            value={block.intro ?? ""}
          />
          {block.metrics.map((metric, index) => (
            <FieldGroup key={metric.id} title={`Bullet ${index + 1}`}>
              <TextField
                label="Text"
                onChange={(text) =>
                  onChange({
                    ...block,
                    metrics: block.metrics.map((item) =>
                      item.id === metric.id ? { ...item, text } : item,
                    ) as typeof block.metrics,
                  })
                }
                value={metric.text}
              />
              {block.metrics.length > 2 ? (
                <button
                  className={styles.remove}
                  onClick={() =>
                    onChange({
                      ...block,
                      metrics: block.metrics.filter(
                        (item) => item.id !== metric.id,
                      ),
                    })
                  }
                  type="button"
                >
                  Remove bullet
                </button>
              ) : null}
            </FieldGroup>
          ))}
          {block.metrics.length < 3 ? (
            <button
              className={styles.add}
              onClick={() =>
                onChange({
                  ...block,
                  metrics: [
                    ...block.metrics,
                    {
                      id: `${block.id}-metric-${crypto.randomUUID()}`,
                      text: "New evidence statement",
                    },
                  ],
                })
              }
              type="button"
            >
              + Add bullet
            </button>
          ) : null}
        </div>
      );
    case "two-column-insight":
      return (
        <div className={styles.fields}>
          <TextField
            label="Eyebrow"
            onChange={(eyebrow) => onChange({ ...block, eyebrow })}
            value={block.eyebrow}
          />
          <TextField
            label="Lead"
            multiline
            onChange={(lead) => onChange({ ...block, lead })}
            value={block.lead}
          />
          {block.insights.map((insight, index) => (
            <FieldGroup key={insight.id} title={`Insight ${index + 1}`}>
              <TextField
                label="Title"
                onChange={(title) =>
                  onChange({
                    ...block,
                    insights: block.insights.map((item) =>
                      item.id === insight.id ? { ...item, title } : item,
                    ) as typeof block.insights,
                  })
                }
                value={insight.title}
              />
              <TextField
                label="Description"
                multiline
                onChange={(description) =>
                  onChange({
                    ...block,
                    insights: block.insights.map((item) =>
                      item.id === insight.id ? { ...item, description } : item,
                    ) as typeof block.insights,
                  })
                }
                value={insight.description}
              />
            </FieldGroup>
          ))}
        </div>
      );
  }
}
