import {
  DataInsightCard,
  OutcomeFocusCard,
  PullQuote,
  RightFitGuardrails,
  SkillPriorityStack,
} from "@glint-labs/data-visuals";
import { ChatMultiple24Regular } from "@fluentui/react-icons/svg/chat-multiple";
import { Chess24Regular } from "@fluentui/react-icons/svg/chess";
import { CoinMultiple24Regular } from "@fluentui/react-icons/svg/coin-multiple";
import { Connected24Regular } from "@fluentui/react-icons/svg/connected";
import { Flow24Regular } from "@fluentui/react-icons/svg/flow";
import { LightbulbFilament24Regular } from "@fluentui/react-icons/svg/lightbulb-filament";
import { PulseSquare24Regular } from "@fluentui/react-icons/svg/pulse-square";
import Image from "next/image";

import type { ReportBlock } from "../manifest/report-manifest";
import { ListeningMaturityScorecard } from "../visualization/listening-maturity-scorecard";
import { ChannelPortfolio } from "./channel-portfolio";
import styles from "./annual-report-components.module.css";

export function OpeningIntro() {
  return (
    <div className={styles.openingIntro}>
      <blockquote>
        As organizations redesign how work gets done, listening has a meaningful
        role in shaping what that next experience becomes for employees.
      </blockquote>
    </div>
  );
}

export function OutcomeFocusGrid() {
  return (
    <div className={`${styles.component} ${styles.grid} ${styles.threeColumns}`}>
      <OutcomeFocusCard
        illustration="growth"
        label="Improving engagement, retention, wellbeing, or other talent outcomes"
      />
      <OutcomeFocusCard
        illustration="action"
        label="Enabling more focused action and follow-through on employee feedback"
      />
      <OutcomeFocusCard
        illustration="trust"
        label="Strengthening trust between employees and leaders"
      />
    </div>
  );
}

export function TrustBalance() {
  return (
    <div className={`${styles.component} ${styles.trustBalance}`}>
      <DataInsightCard
        title="The tenuous balance of trust"
        statement="Even though listening leaders rank strengthening trust as one of their top three value adds, they also place losing that trust as their number one challenge."
      />
      <PullQuote
        quote="It’s a fine balance: how do you encourage employees and create that space? If participation becomes a compliance exercise, we see comments saying, ‘I was forced to do it’, ‘I didn’t want to do it.’"
        attribution="Katie"
        role="Head of People at Microsoft"
      />
    </div>
  );
}

export function ListeningMethods() {
  return <ChannelPortfolio />;
}

export function ContinuousListeningDefinitions() {
  const definitions = [
    {
      value: "55%",
      title: "Ongoing rather than episodic",
      description:
        "Listening throughout the year, not solely through an annual survey",
      icon: Flow24Regular,
    },
    {
      value: "48%",
      title: "Connected to action",
      description:
        "Feedback should lead to improvement, decisions, or visible change",
      icon: Connected24Regular,
    },
    {
      value: "37%",
      title: "A way to maintain an organizational pulse",
      description:
        "Continually understanding employee sentiment and emerging experience",
      icon: PulseSquare24Regular,
    },
    {
      value: "31%",
      title: "Multichannel",
      description:
        "Combining surveys with conversations, focus groups, lifecycle feedback, and other signals",
      icon: CoinMultiple24Regular,
    },
    {
      value: "29%",
      title: "Strategically useful",
      description:
        "Informing culture, priorities, and organizational decisions",
      icon: Chess24Regular,
    },
    {
      value: "26%",
      title: "Conversational and accessible",
      description:
        "Giving employees regular or on-demand opportunities to speak",
      icon: ChatMultiple24Regular,
    },
  ] as const;

  return (
    <section className={`${styles.component} ${styles.definitionGrid}`}>
      {definitions.map((definition, index) => {
        const Icon = definition.icon;

        return (
          <article className={styles.definitionCard} key={definition.title}>
            <div className={styles.definitionContent}>
              <Icon aria-hidden="true" />
              <Image className={styles.canonicalDefinitionIcon} src={`/figma/annual-canonical/interaction-${["flow", "connected", "pulse", "pulse", "chess", "chat"][index]}.svg`} width={20} height={20} alt="" />
              <div>
                <h3>{definition.title}<span className={styles.canonicalDefinitionCount} data-definition-count> • Mentioned by {[57, 49, 38, 32, 30, 27][index]} / 103 ({definition.value}) of leaders</span></h3>
                <p>{definition.description}</p>
              </div>
            </div>
            <strong>{definition.value}</strong>
          </article>
        );
      })}
    </section>
  );
}

export function WorkforceIntelligenceCallout() {
  return (
    <div className={styles.component}>
      <DataInsightCard
        interpretation="Together with employee feedback and rollout context, these signals may indicate unclear workflows rather than resistance to AI. That interpretation directs a specific response: clarify expectations, redesign workflows, and evaluate whether collaboration improves."
        statement="During an AI rollout, collaboration declines, workload concerns rise, and support questions increase."
        title="Information versus intelligence"
      />
    </div>
  );
}

export function MaturityScorecard() {
  const block: Extract<ReportBlock, { type: "listening-maturity-scorecard" }> = {
    id: "annual-report-maturity",
    source: { index: 51, part: "word/document.xml" },
    type: "listening-maturity-scorecard",
    title: "What does your listening system look like?",
    intro:
      "Choose one statement in each area. Your reflection updates as you go.",
    categories: [
      {
        id: "participation",
        title: "Inclusive participation and access",
        criteria: [
          "Easy to provide feedback",
          "Representative employee reach",
          "Listening data is easy to access and use",
        ],
      },
      {
        id: "accountability",
        title: "Action and accountability",
        criteria: [
          "Communicate what changed",
          "Equip managers to act promptly",
          "Hold leaders and managers accountable",
        ],
      },
      {
        id: "impact",
        title: "Strategic impact",
        criteria: [
          "Influence senior and business decisions",
          "Connect listening to outcomes",
          "Measure the impact of actions",
        ],
      },
      {
        id: "intelligence",
        title: "Adaptive intelligence",
        criteria: [
          "Listen outside formal survey cycles",
          "Identify emerging risks and friction",
          "Inform AI-adoption decisions",
        ],
      },
    ],
  };

  return (
    <div className={styles.component}>
      <ListeningMaturityScorecard block={block} />
    </div>
  );
}

export function AdaptivePortfolio() {
  return (
    <section className={`${styles.component} ${styles.darkPanel}`}>
      <p className={styles.eyebrow}>Adaptive listening portfolio</p>
      <div className={styles.portfolio}>
        <article className={styles.portfolioLayer}>
          <h3>Responsive priorities</h3>
          <p>
            AI adoption, organizational transformation, new ways of working,
            policy changes, and emerging risks enter and leave as conditions change.
          </p>
        </article>
        <article className={styles.portfolioLayer}>
          <h3>Enduring foundation</h3>
          <p>Trust, growth, wellbeing, leadership, belonging, and agency.</p>
        </article>
        <article className={styles.portfolioLayer}>
          <h3>Method decision pathway</h3>
          <p>
            What decision created the need? Whose perspective is needed? How
            quickly could the answer change? Which method fits?
          </p>
          <div className={styles.pathway}>
            {["Stable measure", "Time-bound pulse", "Conversation", "Ambient signal", "No new collection"].map(
              (label) => <span key={label}>{label}</span>,
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

export function EmployeeAiReadiness() {
  const metrics = [
    {
      label: "Trust",
      value: "Two in three",
      description: "trust AI tools with their feedback",
      percentage: 67,
      detail: "Confidential · Fair · Accurate",
      tone: "trust",
    },
    {
      label: "Openness",
      value: "70%",
      description: "are open to expanding AI in employee listening",
      percentage: 70,
      detail: "Permission to test — safely",
      tone: "openness",
    },
    {
      label: "Shadow AI",
      value: "59%",
      description: "already use outside AI tools to support feedback",
      percentage: 59,
      detail: "Practice is ahead of policy",
      tone: "shadow",
    },
  ] as const;

  return (
    <section className={`${styles.component} ${styles.aiReadinessPanel}`}>
      <header className={styles.aiReadinessHeader}>
        <h3>Employee behavior is already moving</h3>
        <p>
          Trust and openness coexist with widespread self-directed AI use in
          feedback.
        </p>
      </header>

      <div className={styles.aiReadinessCards}>
        {metrics.map((metric) => (
          <article
            className={styles.aiReadinessCard}
            data-tone={metric.tone}
            key={metric.label}
          >
            <div className={styles.aiReadinessCardCopy}>
              <span className={styles.aiReadinessBadge}>{metric.label}</span>
              <div className={styles.aiReadinessMetric}>
                <strong>{metric.value}</strong>
                <p>{metric.description}</p>
              </div>
            </div>
            <div className={styles.aiReadinessMeasure}>
              <div
                aria-label={`${metric.percentage}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={metric.percentage}
                className={styles.aiReadinessTrack}
                role="meter"
              >
                <span style={{ width: `${metric.percentage}%` }} />
              </div>
              <p>{metric.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.aiReadinessInsight}>
        <LightbulbFilament24Regular aria-hidden="true" />
        <p>
          Moving slowly can push experimentation outside organizational
          safeguards.
        </p>
      </div>
    </section>
  );
}

export function SafeLearningSpectrum() {
  const stages = [
    {
      number: "01",
      title: "Simulate and evaluate",
      exposure: "None · synthetic data",
      description:
        "Use synthetic or historical data, human review, and quality, bias, and safety checks.",
      tone: "simulation",
    },
    {
      number: "02",
      title: "Controlled pilot",
      exposure: "Very limited · opt-in",
      description:
        "Use real-world data with active oversight, clear success criteria, and stop conditions.",
      tone: "controlled",
    },
    {
      number: "03",
      title: "Expanded pilot",
      exposure: "Limited · select groups",
      description:
        "Broaden participation while monitoring differential impacts, value, risk, and guardrails.",
      tone: "expanded",
    },
    {
      number: "04",
      title: "Staged release",
      exposure: "Growing · multiple groups",
      description:
        "Expand incrementally with feedback loops, responsible AI validation, and rollback readiness.",
      tone: "staged",
    },
    {
      number: "05",
      title: "Scale and evolve",
      exposure: "Broad · all employees",
      description:
        "Provide organization-wide access with continuous evaluation, learning, and governance.",
      tone: "scale",
    },
  ] as const;
  const gateCriteria = [
    "Evidence of value is credible",
    "Safeguards hold as exposure grows",
    "A clear stop or rollback path remains",
  ] as const;
  const outcomes = [
    {
      label: "Advance",
      description: "Evidence supports the next level of exposure.",
      tone: "advance",
    },
    {
      label: "Strengthen",
      description: "Address gaps, then test the stage again.",
      tone: "strengthen",
    },
    {
      label: "Pause or roll back",
      description: "Reduce exposure when risk exceeds confidence.",
      tone: "pause",
    },
  ] as const;

  return (
    <section
      aria-labelledby="safe-learning-title"
      className={`${styles.component} ${styles.safeLearningPanel}`}
    >
      <header className={styles.safeLearningHeader}>
        <p className={styles.eyebrow}>Safe-learning pathway</p>
        <h3 id="safe-learning-title">A safe path from learning to impact</h3>
        <p>
          Increase employee exposure only as evidence grows, safeguards hold,
          and the ability to pause or reverse course remains clear.
        </p>
      </header>

      <div className={styles.safeLearningVisual}>
        <div className={styles.safeLearningStages}>
          <span className={styles.safeLearningColumnLabel}>
            Progressive exposure
          </span>
          <ol>
            {stages.map((stage) => (
              <li data-tone={stage.tone} key={stage.number}>
                <span className={styles.safeLearningStageNumber}>
                  {stage.number}
                </span>
                <div>
                  <div className={styles.safeLearningStageHeading}>
                    <h4>{stage.title}</h4>
                    <span>{stage.exposure}</span>
                  </div>
                  <p>{stage.description}</p>
                </div>
                <span
                  aria-hidden="true"
                  className={styles.safeLearningFlowLine}
                />
              </li>
            ))}
          </ol>
          <div className={styles.safeLearningExposure} aria-hidden="true">
            <span>Lower exposure</span>
            <span />
            <span>Higher exposure</span>
          </div>
        </div>

        <div className={styles.safeLearningGate}>
          <div className={styles.safeLearningGateBars} aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className={styles.safeLearningGateContent}>
            <span>Evidence gate</span>
            <strong>Advance only when</strong>
            <ul>
              {gateCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.safeLearningOutcomes}>
          <span className={styles.safeLearningColumnLabel}>
            Decision at every stage
          </span>
          <div>
            {outcomes.map((outcome) => (
              <article data-tone={outcome.tone} key={outcome.label}>
                <span aria-hidden="true" />
                <div>
                  <strong>{outcome.label}</strong>
                  <p>{outcome.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <footer className={styles.safeLearningPrinciple}>
        <span aria-hidden="true">✓</span>
        <p>
          <strong>Guiding principle</strong>
          Move forward because evidence supports the next stage—not because
          enough time has passed.
        </p>
      </footer>
    </section>
  );
}

export function ActionTakingParadox() {
  return (
    <section className={`${styles.component} ${styles.actionParadoxPanel}`}>
      <header className={styles.actionParadoxHeader}>
        <h3>The action-taking paradox</h3>
        <p>
          Traditional manager activity is low, while enablement,
          accountability, and perceived organizational response remain high.
        </p>
      </header>

      <div className={styles.actionParadoxGrid}>
        <article className={styles.actionParadoxCard} data-tone="manager">
          <div className={styles.actionParadoxMetric}>
            <strong>38%</strong>
            <p>of managers held a meeting to discuss team feedback.</p>
          </div>
          <div className={styles.actionParadoxMetric}>
            <strong>29%</strong>
            <p>created an action plan.</p>
          </div>
        </article>

        <article className={styles.actionParadoxCard} data-tone="bridge">
          <div className={styles.actionParadoxBridge}>
            <strong>Not a contradiction</strong>
            <p>
              Response may happen through organizational decisions—not only
              manager meetings or plans.
            </p>
          </div>
        </article>

        <article className={styles.actionParadoxCard} data-tone="response">
          <div className={styles.actionParadoxMetric}>
            <strong>79%</strong>
            <p>say their organization provides adequate resources to act.</p>
          </div>
          <div className={styles.actionParadoxMetric}>
            <strong>80%</strong>
            <p>say they are held accountable for follow-through.</p>
          </div>
          <div className={styles.actionParadoxMetric}>
            <strong>75%</strong>
            <p>
              of employees have seen meaningful organizational change from
              feedback.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

export function ResponsibilityRouting() {
  const rows = [
    {
      topic: "Compensation and benefits",
      influence: {
        individual: "low",
        team: "none",
        manager: "low",
        leadership: "high",
      },
    },
    {
      topic: "Career growth and development",
      influence: {
        individual: "high",
        team: "low",
        manager: "medium",
        leadership: "medium",
      },
    },
    {
      topic: "Workload and burnout",
      influence: {
        individual: "medium",
        team: "medium",
        manager: "medium",
        leadership: "low",
      },
    },
  ] as const;
  const levels = ["individual", "team", "manager", "leadership"] as const;
  const labels = {
    individual: "Individual",
    team: "Team",
    manager: "Manager",
    leadership: "Leadership",
  } as const;

  return (
    <section
      aria-labelledby="responsibility-routing-title"
      className={`${styles.component} ${styles.responsibilityPanel}`}
    >
      <header className={styles.responsibilityHeader}>
        <p className={styles.eyebrow}>Top employee listening priorities</p>
        <h3 id="responsibility-routing-title">
          Influence sits at different levels
        </h3>
        <p>
          Employees most want organizations to ask about these three topics.
          The heat map shows where each experience can be shaped.
        </p>
      </header>

      <div className={styles.responsibilityAxis} aria-hidden="true">
        <span>Closest to the lived experience</span>
        <span />
        <span>Controls systems and investment</span>
      </div>

      <div className={styles.responsibilityScroller}>
        <table
          aria-label="Qualitative influence by employee topic and organizational level"
          className={styles.responsibilityHeatmap}
        >
          <thead>
            <tr>
              <th scope="col">Employee topic</th>
              {levels.map((level) => (
                <th key={level} scope="col">
                  {labels[level]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.topic}>
                <th scope="row">{row.topic}</th>
                {levels.map((level) => {
                  const influence = row.influence[level];
                  return (
                    <td data-level={influence} key={level}>
                      <span>{influence}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.responsibilityLegend} aria-label="Influence scale">
        <span>Influence</span>
        {(["none", "low", "medium", "high"] as const).map((level) => (
          <span data-level={level} key={level}>
            <i aria-hidden="true" />
            {level}
          </span>
        ))}
      </div>

      <p className={styles.responsibilityNote}>
        Routing feedback only to a manager can miss the level with authority to
        act.
      </p>
    </section>
  );
}

export function FollowThroughTable() {
  const rows = [
    ["Act", "A policy, process, resource allocation, workflow, or leadership practice changed."],
    ["Investigate", "A follow-up study, employee conversation, root-cause analysis, or evidence review was commissioned and completed."],
    ["Escalate", "The issue reached the person or governance body with authority, and that owner acknowledged responsibility for a decision."],
    ["Integrate", "Employee evidence was documented in a business case, workforce plan, product decision, risk review, or organizational-change strategy."],
    ["Explain", "The accountable decision-maker communicated what was considered, why change would not occur, and what conditions might reopen the decision."],
  ] as const;

  return (
    <figure className={`${styles.component} ${styles.darkPanel}`}>
      <figcaption className={styles.componentTableCaption}>What follow-through looks like beyond an action plan</figcaption>
      <table className={styles.table}>
        <thead>
          <tr><th>Response</th><th>Observable behavior to measure</th></tr>
        </thead>
        <tbody>
          {rows.map(([response, behavior]) => (
            <tr key={response}><td>{response}</td><td>{behavior}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function RightFitSpectrum() {
  const states = [
    ["Flying blind / Underfit", ["The loudest voices stand in for the workforce.", "A score moves, but no one understands why.", "Evidence arrives after the decision.", "Leaders discover problems through exits or operational failures."]],
    ["Enough to decide / Right-fit", ["Every signal has a defined job.", "Evidence is credible enough to support a consequential choice.", "The recipient has authority to respond.", "Collection stops when the information need has been met."]],
    ["Drowning in signal / Overfit", ["Employees answer the same question through multiple channels.", "Every new priority earns a measure, but nothing leaves.", "Dashboards multiply faster than decisions.", "Insights accumulate while response capacity remains unchanged."]],
  ] as const;

  return (
    <section className={`${styles.component} ${styles.darkPanel}`}>
      <p className={styles.eyebrow}>The goal is enough understanding to make a better decision</p>
      <div className={styles.fitSpectrum}>
        {states.map(([title, items]) => (
          <article key={title}>
            <h3>{title}</h3>
            <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Guardrails() {
  return (
    <div className={styles.component}>
      <RightFitGuardrails
        centerConstraint="Enough credible understanding to support a consequential choice."
        centerLabel="Right-fit listening"
        centerStatement="The goal is not maximum listening."
        description="Five standards help determine whether a listening system is calibrated to the need."
        embedded={{ label: "Embedded", question: "Is listening connected to the moments and workflows where decisions happen?" }}
        footer="Reassess as topics, conditions, capacity, and employee expectations change."
        intelligent={{ label: "Intelligent", question: "Does the evidence provide valid, contextual, decision-relevant understanding?" }}
        outcomeDriven={{ label: "Outcome-driven", question: "Can the organization determine whether the response made a difference?" }}
        responsive={{ label: "Responsive", question: "Does the signal reach someone able and accountable to respond?" }}
        title="Five guardrails for right-fit listening"
        trustworthy={{ label: "Trustworthy", question: "Do employees understand what is collected, why, and how they are protected?" }}
      />
    </div>
  );
}

export function RightFitCheck() {
  return (
    <aside className={`${styles.component} ${styles.rightFitCheck}`}>
      <h3>Run a right-fit check</h3>
      <ol>
        <li>What decision or uncertainty is driving the need?</li>
        <li>What evidence is missing?</li>
        <li>Whose voice or which signal is required?</li>
        <li>Which method fits?</li>
        <li>What response is realistically possible?</li>
      </ol>
    </aside>
  );
}

export function AiStrategyGap() {
  return (
    <section className={`${styles.component} ${styles.darkPanel}`}>
      <p className={styles.eyebrow}>Expectation exceeds strategy</p>
      <div className={`${styles.grid} ${styles.twoColumns}`}>
        <article className={styles.card}><strong className={styles.metric}>83%</strong><p>believe AI will fundamentally change how organizations act on insights.</p></article>
        <article className={styles.card}><strong className={styles.metric}>43%</strong><p>say their organization has a clear point of view on which AI-enabled listening use cases to prioritize and why.</p></article>
      </div>
      <p className={styles.gapCallout}><strong>40-point gap</strong> The question is shifting from whether AI matters to where it should be used.</p>
    </section>
  );
}

export function AiAdoptionByPhase() {
  const phases = [
    ["Strategy, planning, and design", 27],
    ["Listening", 30],
    ["Analysis", 43],
    ["Action taking", 25],
  ] as const;

  return (
    <section className={`${styles.component} ${styles.darkPanel}`}>
      <p className={styles.eyebrow}>AI capabilities piloted or deployed</p>
      <div className={styles.phaseBars}>
        {phases.map(([label, value]) => (
          <div className={styles.phaseRow} key={label}>
            <span>{label}</span>
            <div className={styles.phaseTrack} aria-hidden="true"><span style={{ width: `${value}%` }} /></div>
            <strong>{value}%</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AiListeningPhases() {
  const phases = [
    {
      phase: "Phase 1",
      title: "Strategy, planning, and design",
      outcome: "Focus the listening agenda",
      description:
        "AI can identify emerging information needs, connect listening priorities to workforce and business conditions, recommend topics, support conversational authoring, and identify the employees closest to an experience.",
    },
    {
      phase: "Phase 2",
      title: "Listening",
      outcome: "Expand participation and access",
      description:
        "Conversational feedback, adaptive experiences, accessibility support, translation, and AI-assisted drafting can create new ways for employees to participate while increasing the need for transparency and agency.",
    },
    {
      phase: "Phase 3",
      title: "Analysis",
      outcome: "Turn more signals into usable understanding",
      description:
        "Summarization, conversational querying, pattern detection, and automated reporting can reduce manual effort. The larger opportunity is connecting signals, testing interpretations, and identifying missing context.",
    },
    {
      phase: "Phase 4",
      title: "Action taking",
      outcome: "Move insight closer to accountable response",
      description:
        "AI can prepare leader briefings, provide in-context coaching, recommend possible responses, route insights, and monitor follow-through without replacing authority, accountability, capacity, or judgment.",
    },
  ] as const;

  return (
    <section className={`${styles.component} ${styles.dataVisual} ${styles.phaseSystem}`}>
      <div className={styles.visualHeading}>
        <div>
          <h3>Each phase changes a different part of the listening system</h3>
          <p>The opportunity and the conditions for meaningful value change across the listening cycle.</p>
        </div>
      </div>
      <div className={styles.phaseSystemRows}>
        {phases.map((phase) => (
          <article key={phase.phase}>
            <div>
              <span>{phase.phase}</span>
              <h4>{phase.title}</h4>
              <strong>{phase.outcome}</strong>
            </div>
            <p>{phase.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function QualityEvaluation() {
  const steps = [
    ["01", "Define quality", "Name the behaviors that matter: clarity, coverage, probing, understanding, and safe handling."],
    ["02", "Evaluate in layers", "Use human judges to establish the framework, then test repeatable checks with model-based evaluation."],
    ["03", "Test the experience", "Use human judges to establish whether the interaction is helpful, usable, representative, and safe."],
  ] as const;

  return (
    <section className={`${styles.component} ${styles.dataVisual} ${styles.qualityEvaluation}`}>
      <p className={styles.eyebrow}>Evaluation in practice</p>
      <div className={styles.visualHeading}>
        <div>
          <h3>Quality has to be defined before it can be tested</h3>
          <p>For employee-experience agents, a correct response can still be unhelpful, unsafe, or damaging to trust.</p>
        </div>
      </div>
      <div className={`${styles.grid} ${styles.threeColumns}`}>
        {steps.map(([number, title, description]) => (
          <article className={styles.evaluationStep} key={number}>
            <span>{number}</span>
            <h4>{title}</h4>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <div className={styles.evaluationResult}>
        <span>Employee feedback agent</span>
        <strong>Human evaluation found what accuracy missed.</strong>
        <p>
          Private-preview sessions revealed conversation-quality issues, including
          dwelling on the first issue, repeating prompts, overdoing empathy, and
          ending without confirmation or a clear next step.
        </p>
      </div>
    </section>
  );
}

export function ListeningEvolution() {
  const rows = [
    ["Trustworthy", "Trust through confidentiality", "Trust through transparency, agency, and access"],
    ["Intelligent", "Reports, dashboards, and scores", "Root-cause, multi-source workforce intelligence"],
    ["Responsive", "Point-in-time action plans", "Guided and personalized response"],
    ["Embedded", "Periodic survey programs", "Continuous, conversational listening in the flow of work"],
    ["Outcome-driven", "Engagement metrics", "Connected employee, workforce, and business outcomes"],
  ] as const;

  return (
    <section className={`${styles.component} ${styles.darkPanel}`}>
      <p className={styles.eyebrow}>Listening today → listening in the age of AI</p>
      <div className={styles.evolution}>
        {rows.map(([principle, before, after]) => (
          <article className={styles.evolutionRow} key={principle}>
            <strong>{principle}</strong><p>{before}</p><span className={styles.evolutionArrow}>→</span><p>{after}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SkillStack() {
  return (
    <div className={styles.component}>
      <SkillPriorityStack
        description="Listening leaders need enough technical understanding to recognize where AI fits and how it can fail, plus the judgment to connect evidence to consequential decisions."
        eyebrow="Priority capabilities"
        layers={[
          { badge: "#1", percentage: 41, skill: "AI and automation literacy", summary: "Understand where AI fits and how it can fail", details: ["Recognize capabilities and limitations.", "Identify risks involving bias, privacy, representation, and data quality.", "Distinguish useful applications from automation for its own sake.", "Test what evidence supports an output."] },
          { badge: "#2", percentage: 39, skill: "Consultative and advisory skills", summary: "Connect evidence to decisions and value", details: ["Define the organizational question.", "Translate findings into choices and tradeoffs.", "Identify accountable decision-makers.", "Challenge uses that are possible but not appropriate."] },
          { badge: "#3", percentage: 38, skill: "Advanced AI skills", summary: "Design and evaluate sophisticated applications", details: ["Orchestrate workflows, agents, and data sources.", "Build evaluation criteria and test cases.", "Monitor performance across populations and use cases.", "Define guardrails, escalation points, and stop conditions."] },
        ]}
        title="Employee listening skill stack for the AI era"
      />
    </div>
  );
}
