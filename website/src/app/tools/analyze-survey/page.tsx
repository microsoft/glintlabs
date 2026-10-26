import type { Metadata } from "next";

import { AnalyzeSurveyDetails } from "./analyze-survey-details";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Analyze Survey | Glint Labs",
  description:
    "Analyze employee survey exports with a repeatable workflow that produces documented results, an interactive report, and controlled sharing outputs.",
};

export default function AnalyzeSurveyPage() {
  return (
    <main className={styles.main}>
      <AnalyzeSurveyDetails />
    </main>
  );
}
