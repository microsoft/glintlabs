/* eslint-disable @next/next/no-img-element */
import styles from "./canonical-report-diagrams.module.css";

export function ActionTakingParadox() {
  return (
    <section className={`${styles.statCard} ${styles.paradoxCard}`} aria-labelledby="action-paradox-title" data-node-id="1655:43018">
      <h3 id="action-paradox-title">The action-taking paradox</h3>
      <div className={styles.statGroup}>
        <h4>In the last six months, only...</h4>
        <div className={styles.statPair}>
          <p><strong>38%</strong> of managers reported holding a meeting to discuss their <span className={styles.paradoxNoWrap}>team&apos;s feedback</span></p>
          <p><strong>29%</strong> of managers reported creating an action plan</p>
        </div>
      </div>
      <div className={`${styles.statGroup} ${styles.contrastStats}`}>
        <h4>Yet...</h4>
        <div className={styles.statPair}>
          <p><strong>80%</strong> of managers said their organization holds them accountable for <span className={styles.paradoxNoWrap}>follow-through</span></p>
          <p><strong>75%</strong> of employees reported seeing meaningful organizational changes resulting from employee feedback</p>
        </div>
      </div>
      <p className={styles.note}>Manager percentages reflect the proportion of managers that reported conducting the stated behavior in the previous six months (n = 250)<sup>2</sup>. Employee percentages reflect the employee favorability score on the statement provided (n = 500)<sup>2</sup>.</p>
    </section>
  );
}

export function AiOpportunity() {
  return (
    <section className={`${styles.statCard} ${styles.aiCard}`} aria-labelledby="ai-opportunity-title" data-node-id="1655:43151">
      <h3 id="ai-opportunity-title">The opportunity for AI is clearer than where to place the bet</h3>
      <div className={styles.statPair}>
        <div className={styles.statGroup}>
          <h4>While...</h4>
          <p><strong>83%</strong> of employee listening leaders reported that AI will fundamentally change how organizations act<br />on insights</p>
        </div>
        <div className={`${styles.statGroup} ${styles.contrastStats}`}>
          <h4>Only...</h4>
          <p><strong>43%</strong> reported that their organization has a clear point of view on which AI-enabled listening use cases to prioritize and why</p>
        </div>
      </div>
      <p className={styles.note}>Percentages reflect listening leader<sup>1</sup> favorability scores (agree + strongly agree) on the statements provided.</p>
    </section>
  );
}

const principles = [
  ["trustworthy", "Trustworthy", "Do employees understand what is collected, why, and how they are protected?"],
  ["intelligent", "Intelligent", "Does the evidence provide valid, contextual, decision-relevant understanding?"],
  ["outcome", "Outcome-driven", "Is listening connected to the moments and workflows where decisions happen?"],
  ["responsive", "Responsive", "Does the signal reach someone able and accountable to respond?"],
  ["embedded", "Embedded", "Can the organization determine whether the response made a difference?"],
] as const;

export function RightFitPrinciples() {
  return (
    <section className={styles.principles} aria-labelledby="right-fit-title" data-node-id="1674:8421">
      <h3 id="right-fit-title">Five principles to consider for right-fit listening</h3>
      <div className={styles.diagram}>
        <div className={styles.center}>
          <h4>Right-fit</h4>
          <p>The goal is not maximum listening. It is enough credible understanding to support a consequential choice.</p>
        </div>
        {principles.map(([position, title, description]) => (
          <div className={`${styles.principle} ${styles[position]}`} key={position}>
            <h4>{title}</h4>
            <p>{description}</p>
          </div>
        ))}
        <img className={styles.connectorLeft} src="/figma/annual-canonical/principle-link-left.svg" alt="" />
        <img className={styles.connectorRight} src="/figma/annual-canonical/principle-link-right.svg" alt="" />
        <img className={styles.connectorBottom} src="/figma/annual-canonical/principle-link-vertical.svg" alt="" />
        <img className={styles.connectorOutcome} src="/figma/annual-canonical/principle-link-horizontal.svg" alt="" />
        <img className={styles.connectorResponsive} src="/figma/annual-canonical/principle-link-horizontal.svg" alt="" />
      </div>
      <p className={styles.note}>These principles are offered as a framework for consideration and are not intended to replace applicable organizational, legal, privacy, employment, or Responsible AI requirements.</p>
    </section>
  );
}
