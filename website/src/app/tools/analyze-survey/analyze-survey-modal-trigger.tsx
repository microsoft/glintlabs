"use client";

import type { ReactNode } from "react";

import { SkillModalTrigger } from "../skill-modal-trigger";
import { AnalyzeSurveyDetails } from "./analyze-survey-details";

export function AnalyzeSurveyModalTrigger({ children, className }: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SkillModalTrigger title="Analyze Survey" Details={AnalyzeSurveyDetails} telemetryEvent="analyze_survey_click" className={className}>
      {children}
    </SkillModalTrigger>
  );
}
