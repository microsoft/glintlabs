import { Flash16Regular } from "@fluentui/react-icons/svg/flash";
import { Rocket20Regular } from "@fluentui/react-icons/svg/rocket";
import Image from "next/image";

import { AnalyzeSurveyModalTrigger } from "./analyze-survey/analyze-survey-modal-trigger";
import styles from "./tools-catalog.module.css";

export function ToolsCatalog() {
  return (
    <section className={styles.catalog} aria-labelledby="tools-library-title">
      <header className={styles.catalogIntro}>
        <h2 id="tools-library-title">Put insights to work</h2>
        <p>Use prompts, skills, and analysis resources created to help People Science and HR teams explore questions, work with evidence, and move from insight to action.</p>
      </header>
        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardVisual}>
              <Image src="/figma/illustrations/blue/report.png" alt="" aria-hidden="true" width={170} height={170} unoptimized />
            </div>
            <div className={styles.cardContent}>
              <div>
                <div className={styles.titleRow}>
                  <h3>Analyze Survey</h3>
                  <span className={styles.skillBadge}><Flash16Regular aria-hidden="true" />Skill</span>
                </div>
                <p className={styles.byline}>By Microsoft People Science</p>
                <p className={styles.description}>Turn employee survey data into advanced analysis with an AI-guided, no-code workflow. Explore inter-item correlations, factor analysis, attrition analysis, and comparisons across surveys in an interactive report you can filter, export, and share.</p>
              </div>
              <AnalyzeSurveyModalTrigger className={styles.primaryAction}>
                <Rocket20Regular aria-hidden="true" />Start using
              </AnalyzeSurveyModalTrigger>
            </div>
          </article>
        </div>
    </section>
  );
}
